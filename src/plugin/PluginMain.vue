<script setup>
import { siteSettings } from "../stores/index.js";
import { storeToRefs } from "pinia";

const settings = siteSettings();
const { loadPlugins, pluginsPath } = storeToRefs(settings);

const requestLoadPlugins = async () => {
  if (loadPlugins.value) {
    alert("yes");
    await electron.ipcRenderer.invoke("loadPlugins", { pluginsPath: pluginsPath.value });
    return "display: none";
  }
};
</script>

<template>
  <div @load="requestLoadPlugins"></div>
</template>

<style scoped lang="scss"></style>
