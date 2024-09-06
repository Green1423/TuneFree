import path from "path";
import fs from "fs/promises";
import sqlite3 from "sqlite3";
import mitt from "mitt";
import https from "node:https";
import fileSystem from "fs";

export default class MainDownloadManager {
  constructor(appPath) {
    this.filePath = path.join(path.dirname(appPath), "download.db");
    fs.access(this.filePath, fs.constants.F_OK)
      .catch(async (err) => {
        await fs.writeFile(this.filePath, "");
      })
      .finally(() => {
        this.fileDB = new sqlite3.Database(this.filePath);
        this.fileDB.serialize();
        this.fileDB.run(
          "CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL,icon BLOB,time TEXT NOT NULL,url TEXT,subObjects TEXT,display INTEGER NOT NULL);",
        );
        this.recordFile = this.fileDB.prepare(
          "INSERT INTO files (id, name, path, icon, time, url, subObjects, display) VALUES (?,?,?,?,?,?,?,?)",
        );
      });
    this.setMaxThread(2);
    this.downloadEventBus = mitt();
    this.loadEvents();
    this.downloadList = [];
    this.currentThread = 0;
    this.maxThread = 2;
  }

  loadEvents() {
    this.downloadEventBus.on("next", async (event) => {
      await this.downloadFile(event.downloaderId);
    });
  }

  setMaxThread(count) {
    let maxThread = this.maxThread;
    this.maxThread = count;
    if (count > this.maxThread) {
      for (
        let i = maxThread + 1;
        i <= this.downloadList.length < this.maxThread ? this.downloadList.length : this.maxThread;
        i++
      ) {
        this.downloadEventBus.emit("next", { downloaderId: i });
      }
    }
  }

  addDownloadFile(id, filename, downloadPath, url, display, subjects = null, icon = null) {
    this.downloadList.push({
      id: id,
      filename: filename,
      downloadPath: downloadPath,
      icon: icon,
      url: url,
      subjects: subjects,
      display: display,
    });
    if (this.currentThread < this.maxThread) {
      this.currentThread++;
      this.downloadEventBus.emit("next", { downloaderId: this.currentThread });
    }
  }

  download(url, options) {
    let flag = true;
    console.log(url);
    let request = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        },
      },
      (res) => {
        const fileStream = fileSystem.createWriteStream(
          path.join(options.directory, options.filename),
        );
        res.pipe(fileStream);
        options.onStarted({
          startTime: Date.now(),
        });
        res.on("end", () => {
          fileStream.close();
        });
        res.on("error", (err) => {
          if (err) {
            flag = false;
          }
        });
      },
    );
    request.end();
    return flag;
  }

  downloadFile(downloaderId) {
    if (this.downloadList.length === 0 || downloaderId > this.maxThread) {
      this.currentThread--;
      return;
    }
    const { id, filename, downloadPath, icon, url, subjects, display } = this.downloadList.shift();
    // console.log(id, filename, downloadPath, icon, url, subjects, display);
    const request = this.download(url, {
      directory: downloadPath,
      filename: filename,
      onStarted: (downloadItem) => {
        this.recordFile.run(
          id,
          filename,
          downloadPath,
          icon,
          downloadItem.startTime,
          url,
          subjects,
          display,
        );
      },
    });
    if (!request) {
      console.log(`Download failed`);
    }
    this.downloadEventBus.emit("next", { downloaderId: downloaderId });
  }
}
