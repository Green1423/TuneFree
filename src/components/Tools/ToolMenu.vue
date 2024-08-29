<script setup>
import { NIcon } from "naive-ui";
import SvgIcon from "../Global/SvgIcon.vue";
import { storeToRefs } from "pinia";
import { siteSettings } from "../../stores/index.js";

const settings = siteSettings();
const { themeType } = storeToRefs(settings);
const toolMenuShow = ref(false);

const renderIcon = (icon) => {
  return () => h(NIcon, null, () => h(SvgIcon, { icon }));
};

let toolMenuOptions = [
  {
    label: themeType.value === "dark" ? "浅色模式" : "深色模式",
    key: "darkOrlight",
    icon: renderIcon(themeType.value === "dark" ? "round-wb-sunny" : "round-dark-mode"),
  },
];

const toolMenuSelect = (key) => {
  console.log(key);
  toolMenuShow.value = false;
  switch (key) {
    // 明暗切换
    case "darkOrlight":
      settings.setThemeType(themeType.value === "light" ? "dark" : "light");
      break;
    default:
      break;
  }
};
</script>

<template>
  <n-dropdown
    :show-arrow="true"
    :show="toolMenuShow"
    :options="toolMenuOptions"
    placement="bottom-end"
    @select="toolMenuSelect"
    @clickoutside="toolMenuShow = false"
  >
    <div
      class="tool"
      :style="{ pointerEvents: toolMenuShow ? 'none' : 'auto' }"
      @click="toolMenuShow = !toolMenuShow"
    >
      <div class="avatar">
        <n-avatar round>
          <n-icon depth="3">
            <SvgIcon icon="menu" />
          </n-icon>
        </n-avatar>
      </div>
    </div>
  </n-dropdown>
  <n-divider vertical />
</template>

<style lang="scss" scoped>
.tool {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 34px;
  margin-left: auto;
  cursor: pointer;
  -webkit-app-region: no-drag;
  .avatar {
    display: flex;
    align-items: center;
    height: 38px;
    width: 38px;
    min-width: 38px;
    margin-right: 8px;
    .n-avatar {
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      :deep(img) {
        width: 80%;
        height: 80%;
        border-radius: 50%;
      }
    }
  }
  @media (max-width: 700px) {
    padding: 0;
    .avatar {
      margin: 0;
    }
  }
}
.n-divider {
  margin-right: 16px;
}
</style>

<style lang="scss">
.nav-tool-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  .nav-tool-num {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    cursor: pointer;
    .tool-pl {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0px 8px;
      min-width: 30px;
      font-size: 16px;
      .n-text {
        font-size: 12px;
      }
    }
  }
  .nav-tool-silder {
    text-align: center;
    width: 100%;
    margin-top: 12px;
    .n-button {
      font-size: 13px;
    }
  }
}
</style>
