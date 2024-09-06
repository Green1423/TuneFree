<!-- 歌曲下载 -->
<template>
  <n-modal
    v-model:show="downloadSongShow"
    :bordered="false"
    :close-on-esc="false"
    :auto-focus="false"
    :mask-closable="!downloadStatus"
    :on-after-leave="closeDownloadModal"
    class="downloadManager"
    preset="card"
    title="下载管理"
  >
    <Transition name="fade" mode="out-in">
      <div v-if="downloadData">
        <n-card
          v-for="(item, index) in data.slice(
            (pageNumber - 1) * loadSize,
            (pageNumber - 1) * loadSize + loadSize,
          )"
          :id="'song-list-' + index"
          :key="index"
          :content-style="{
            padding: '16px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }"
          :class="Number(music.getPlaySongData?.id) === Number(item?.id) ? 'songs play' : 'songs'"
          hoverable
          @click="checkCanClick(data, item, songsIndex + index)"
          @dblclick.stop="playSong(data, item, songsIndex + index)"
          @contextmenu="
            songListDropdownRef?.openDropdown(
              $event,
              data,
              item,
              songsIndex + index,
              sourceId,
              type,
            )
          "
        >
          <!-- 序号 -->
          <n-text v-if="music.getPlaySongData?.id !== item?.id" class="num" depth="3">
            {{ songsIndex + index + 1 }}
          </n-text>
          <n-icon v-else class="num" size="22">
            <SvgIcon icon="music-note" />
          </n-icon>
          <!-- 封面 -->
          <div v-if="item.cover && showCover" class="cover">
            <n-image
              :src="item.coverSize.s"
              class="cover-img"
              preview-disabled
              lazy
              @load="
                (e) => {
                  e.target.style.opacity = 1;
                }
              "
            >
              <template #placeholder>
                <div class="cover-loading">
                  <img class="loading-img" src="/images/pic/song.jpg?assest" alt="song" />
                </div>
              </template>
            </n-image>
          </div>
          <!-- 信息 -->
          <div class="info">
            <div class="title">
              <!-- 名称 -->
              <!-- @click.stop="type !== 'dj' && !item.path ? router.push(`/song?id=${item.id}`) : null" -->
              <n-text class="name" depth="2">
                {{ item?.name || "未知曲目" }}
              </n-text>
              <!-- 特权 -->
              <n-tag
                v-if="showPrivilege && item.fee === 1 && userData.detail?.profile?.vipType !== 11"
                :bordered="false"
                type="error"
                size="small"
                round
              >
                VIP
              </n-tag>
              <n-tag
                v-if="showPrivilege && item.fee === 4"
                :bordered="false"
                type="error"
                size="small"
                round
              >
                EP
              </n-tag>
              <!-- 云盘 -->
              <n-tag
                v-if="showPrivilege && item.pc"
                :bordered="false"
                class="cloud"
                type="info"
                size="small"
                round
              >
                <template #icon>
                  <n-icon>
                    <SvgIcon icon="cloud" />
                  </n-icon>
                </template>
              </n-tag>
              <!-- MV -->
              <n-tag
                v-if="item?.mv"
                :bordered="false"
                class="mv"
                type="warning"
                size="small"
                round
                @click.stop="router.push(`/videos-player?id=${item.mv}`)"
              >
                MV
              </n-tag>
            </div>
            <!-- 歌手 -->
            <div v-if="Array.isArray(item.artists)" class="artist">
              <n-text
                v-for="ar in item.artists"
                :key="ar.id"
                class="ar"
                @click.stop="router.push(`/artist?id=${ar.id}`)"
                @dblclick.stop
              >
                {{ ar.name }}
              </n-text>
            </div>
            <div v-else-if="type === 'dj'" class="artist">
              <n-text class="ar" @dblclick.stop> 电台节目</n-text>
            </div>
            <div v-else class="artist">
              <n-text class="ar" @dblclick.stop> {{ item.artists || "未知艺术家" }}</n-text>
            </div>
            <!-- 别名 -->
            <n-text v-if="item.alia" class="alia" depth="3">{{ item.alia }}</n-text>
          </div>
          <!-- 专辑 -->
          <template v-if="showAlbum && type !== 'dj'">
            <n-text
              v-if="item.album"
              class="album hidden"
              @click.stop="
                typeof item.album === 'object' ? router.push(`/album?id=${item.album.id}`) : null
              "
              @dblclick.stop
            >
              {{ typeof item.album === "object" ? item.album?.name || "未知专辑" : item.album }}
            </n-text>
            <n-text v-else class="album hidden">未知专辑</n-text>
          </template>
          <!-- 操作 -->
          <div v-if="type !== 'dj'" class="action">
            <!-- 喜欢歌曲 -->
            <n-icon
              :depth="dataStore.getSongIsLike(item?.id) ? 0 : 3"
              class="favorite"
              size="20"
              @click.stop="
                dataStore.changeLikeList(item?.id, !dataStore.getSongIsLike(item?.id), item?.path)
              "
              @dblclick.stop
            >
              <SvgIcon
                :icon="
                  dataStore.getSongIsLike(item?.id)
                    ? 'favorite-rounded'
                    : 'favorite-outline-rounded'
                "
              />
            </n-icon>
            <!-- 更多操作 -->
            <n-icon
              class="more mobile"
              depth="3"
              size="20"
              @click.stop="
                songListDrawerRef?.drawerOpen(data, item, songsIndex + index, sourceId, type)
              "
              @dblclick.stop
            >
              <SvgIcon icon="more" />
            </n-icon>
          </div>
        </n-card>
      </div>
      <n-text v-else>歌曲信息获取中</n-text>
    </Transition>
    <template #footer>
      <n-flex justify="end" :class="{ setting: true }">
        <div class="name">以文件形式保存歌词</div>
        <n-switch v-model:value="downloadLyricsToFile" :round="false" />
        <div class="name">以文件形式保存封面</div>
        <n-switch v-model:value="downloadCoverToFile" :round="false" />
        <n-button @click="closeDownloadModal"> 关闭</n-button>
        <n-button
          :disabled="!downloadChoose"
          :loading="downloadStatus"
          :focusable="false"
          type="primary"
          @click="toSongDownload(songData, lyricData, downloadChoose)"
        >
          下载
        </n-button>
      </n-flex>
    </template>
  </n-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { isLogin } from "@/utils/auth";
import { useRouter } from "vue-router";
import { siteData, siteSettings } from "@/stores";
import { getSongDetail, getSongDownload, getSongLyric } from "@/api/song";
import { downloadFile, checkPlatform } from "@/utils/helper";
import formatData from "@/utils/formatData";

const router = useRouter();
const data = siteData();
const settings = siteSettings();
const { userData } = storeToRefs(data);
const {
  downloadPath,
  downloadMeta,
  downloadCover,
  downloadLyrics,
  downloadLyricsToFile,
  downloadCoverToFile,
} = storeToRefs(settings);

// 歌曲下载数据
const songId = ref(null);
const songData = ref(null);
const lyricData = ref(null);
const downloadStatus = ref(false);
const downloadSongShow = ref(false);
const downloadChoose = ref(null);
const downloadLevel = ref(null);

// 获取歌曲详情
const getMusicDetailData = async (id) => {
  try {
    const songResult = await getSongDetail(id);
    const lyricResult = await getSongLyric(id);
    // 获取歌曲详情
    songData.value = formatData(songResult?.songs?.[0], "song")[0];
    lyricData.value = lyricResult?.lrc?.lyric || null;
    // 生成音质列表
    generateLists(songResult);
  } catch (error) {
    closeDownloadModal();
    console.error("歌曲信息获取失败：", error);
  }
};

// 歌曲下载
const toSongDownload = async (song, lyric, br) => {
  try {
    console.log(song, lyric, br);
    downloadStatus.value = true;
    // 获取下载数据
    const result = await getSongDownload(song?.id, br);
    // 开始下载
    if (!downloadPath.value && checkPlatform.electron()) {
      $notification["warning"]({
        content: "缺少配置",
        meta: "请前往设置页配置默认下载目录",
        duration: 3000,
      });
    }
    if (!result.data?.url) {
      downloadStatus.value = false;
      return $message.error("下载失败，请重试");
    }
    // 获取下载结果
    const isDownloaded = await downloadFile(result.data, song, lyric, {
      path: downloadPath.value,
      downloadMeta: downloadMeta.value,
      downloadCover: downloadCover.value,
      downloadLyrics: downloadLyrics.value,
      downloadCoverToFile: downloadCoverToFile.value,
      downloadLyricsToFile: downloadLyricsToFile.value,
    });
    console.log(lyric);
    if (isDownloaded) {
      $message.success("下载完成");
      closeDownloadModal();
    } else {
      downloadStatus.value = false;
      $message.error("下载失败，请重试");
    }
  } catch (error) {
    console.error("歌曲下载出错：", error);
    $message.error("歌曲下载失败，请重试");
  }
};

// 生成可下载列表
const generateLists = (data) => {
  const br = data.privileges[0].downloadMaxbr;
  downloadLevel.value = [
    {
      value: "128000",
      label: "标准音质",
      disabled: br >= 128000 ? false : true,
      size: getSongSize(data, "l"),
    },
    {
      value: "192000",
      label: "较高音质",
      disabled: br >= 192000 ? false : true,
      size: getSongSize(data, "m"),
    },
    {
      value: "320000",
      label: "极高音质",
      disabled: br >= 320000 ? false : true,
      size: getSongSize(data, "h"),
    },
    {
      value: "420000",
      label: "无损音质",
      disabled: [128000, 192000, 320000].includes(parseInt(br)),
      size: getSongSize(data, "sq"),
    },
    {
      value: "999000",
      label: "Hi-Res",
      disabled: br >= 999000 ? false : true,
      size: getSongSize(data, "hr"),
    },
  ];
  console.log(downloadLevel.value);
};

// 获取下载大小
const getSongSize = (data, type) => {
  let fileSize = 0;
  // 转换文件大小
  const convertSize = (num) => {
    if (!num) return 0;
    return (num / (1024 * 1024)).toFixed(2);
  };
  if (type === "l") {
    fileSize = convertSize(data.songs[0]?.l?.size);
  } else if (type === "m") {
    fileSize = convertSize(data.songs[0]?.m?.size);
  } else if (type === "h") {
    fileSize = convertSize(data.songs[0]?.h?.size);
  } else if (type === "sq") {
    fileSize = convertSize(data.songs[0]?.sq?.size);
  } else if (type === "hr") {
    fileSize = convertSize(data.songs[0]?.hr?.size);
  }
  return fileSize;
};

// 开启歌曲下载
const openDownloadModal = (data) => {
  console.log(data);
  // 执行下载
  const toDownload = () => {
    songId.value = data.id.toString();
    downloadSongShow.value = true;
    getMusicDetailData(songId.value);
  };
  if (isLogin()) {
    // 普通歌曲或为云盘歌曲
    if (
      router.currentRoute.value.name === "cloud" ||
      data?.fee === 0 ||
      data?.pc ||
      userData.value.detail?.profile?.vipType !== 0
    ) {
      return toDownload();
    }
    // 权限不足
    if (data?.fee !== 0 && userData.value.detail?.profile?.vipType !== 11 && !data?.pc) {
      return toDownload();
    }
    return toDownload();
  } else {
    return toDownload();
  }
};

// 关闭歌曲下载
const closeDownloadModal = () => {
  songId.value = null;
  songData.value = null;
  downloadStatus.value = false;
  downloadSongShow.value = false;
  downloadChoose.value = null;
};

// 暴露方法
defineExpose({
  openDownloadModal,
});
</script>

<style lang="scss" scoped>
.downloadManager {
  .tip {
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .download-group {
    .song-data {
      .size {
        font-size: 13px;
      }
    }
  }
}
</style>
