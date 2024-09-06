import sqlite3 from "sqlite3";
import path from "path";
import { download } from "electron-dl";
import fs from "fs/promises";
import * as fileSystem from "fs";
import { File, Id3v2Settings, Picture } from "node-taglib-sharp";
import mitt from "mitt";
import https from "node:https";

let downloadEventBus = mitt();
export default class MainDownloadManager {
  constructor(appPath) {
    appPath = "/home/wkr/aaa";
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
    this.downloadThreads = {};
    this.downloadTasks = {};
    this.cookies = "";
    this.setDownloadThreads(2);
    this.loadEvents();
  }

  setDownloadThreads(count) {
    let ks = Object.keys(this.downloadThreads);
    if (count > ks.length) {
      for (let i = 0; i < count; i++) {
        const threadName = "down" + i;
        if (!(threadName in this.downloadThreads)) {
          this.downloadThreads[threadName] = {
            downloadManager: new DownloadManager(this.win, threadName),
            taskCount: 0,
          };
        }
      }
    } else {
      for (let i = ks.length - 1; i > count - 1; i--) {
        const threadName = "down" + i;
        delete this.downloadThreads[threadName];
      }
    }
  }

  loadEvents() {
    downloadEventBus.on("record", (data) => {
      this.recordFile.run(
        data.id,
        data.filename,
        data.downloadPath,
        data.icon,
        data.downloadTime,
        data.url,
        data.subjects,
        data.display,
      );
    });
  }

  downloadManager(id, filename, downloadPath, url, display, subjects = null, icon = null) {
    let minThread = "down0";
    for (let downloadThread in this.downloadThreads) {
      if (
        this.downloadThreads[downloadThread].taskCount < this.downloadThreads[minThread].taskCount
      )
        minThread = downloadThread;
    }
    this.downloadTasks[id] = minThread;
    this.downloadThreads[minThread].downloadManager.addDownloadFile({
      id: id,
      filename: filename,
      downloadPath: downloadPath,
      icon: icon,
      url: url,
      subjects: subjects,
      display: display,
    });
  }

  async downloadLyrics(songData, options) {
    try {
      const { url, data, lyric, name, type } = JSON.parse(songData);
      let {
        path,
        downloadMeta,
        downloadCover,
        downloadLyrics,
        downloadCoverToFile,
        downloadLyricsToFile,
      } = JSON.parse(options);
      if ((downloadCover && downloadCoverToFile) || (downloadLyrics && downloadLyricsToFile)) {
        path = path + `/${name}`;
        fs.mkdir(path);
      }
      if (fs.access(path)) {
        console.info("开始下载：", name, url);
        // 下载歌曲
        const songDownload = await download(this.win, url, {
          directory: path,
          filename: `${name}.${type}`,
        });
        // 若关闭，则不进行元信息写入
        if (!downloadMeta) return true;
        // 下载封面
        const coverDownload = await download(this.win, data.cover, {
          directory: path,
          filename: `${name}.jpg`,
        });
        // 读取歌曲文件
        const songFile = File.createFromPath(songDownload.getSavePath());
        // 生成图片信息
        const songCover = Picture.fromPath(coverDownload.getSavePath());
        // 保存修改后的元数据
        Id3v2Settings.forceDefaultVersion = true;
        Id3v2Settings.defaultVersion = 3;
        songFile.tag.title = data.name || "未知曲目";
        songFile.tag.album = data.album?.name || "未知专辑";
        songFile.tag.performers = data?.artists?.map((ar) => ar.name) || ["未知艺术家"];
        if (downloadLyrics) {
          songFile.tag.lyrics = lyric;
          if (downloadLyricsToFile) {
            fs.writeFile(`${path}/${name}.lrc`, lyric);
          }
        }
        if (downloadCover) songFile.tag.pictures = [songCover];
        // 保存元信息
        songFile.save();
        songFile.dispose();
        // 删除封面
        if (!downloadCoverToFile) await fs.unlink(coverDownload.getSavePath());
        return true;
      } else {
        console.log(`目录不存在：${path}`);
        return false;
      }
    } catch (error) {
      console.error("下载文件时出错：", error);
      return false;
    }
  }

}

class DownloadManager {
  constructor(downloaderId, cookies) {
    this.cookies = cookies;
    this.downloadList = [];
    this.actions = {
      // 切换到下一项目
      next: "next-" + downloaderId,
      // 报告此项已下载完成
      finish: "finish-" + downloaderId,
      // 报告全部下载完成
      complete: "complete-" + downloaderId,
      set: "set-" + downloaderId,
      record: "record",
    };
    this.loadEvents();
    this.on = false;
  }

  loadEvents() {
    downloadEventBus.on(this.actions.next, async () => {
      await this.downloadFile();
    });
  }

  addDownloadFile(data) {
    this.downloadList.push(data);
    if (!this.on) {
      this.on = true;
      downloadEventBus.emit(this.actions.next, {});
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

  downloadFile() {
    if (this.downloadList.length === 0) {
      this.on = false;
      return;
    }
    const { id, filename, downloadPath, icon, url, subjects, display } = this.downloadList.shift();
    // console.log(id, filename, downloadPath, icon, url, subjects, display);
    const request = this.download(url, {
      directory: downloadPath,
      filename: filename,
      onStarted: (downloadItem) => {
        downloadEventBus.emit(this.actions.record, {
          id: id,
          filename: filename,
          downloadPath: downloadPath,
          icon: icon,
          downloadTime: downloadItem.startTime,
          url: url,
          subjects: subjects,
          display: display,
        });
      },
    });
    if (!request) {
      console.log(`Download failed`);
    }
    downloadEventBus.emit(this.actions["next"], {});
  }
}
