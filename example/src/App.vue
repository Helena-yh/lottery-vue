<template>
  <el-container class="main">
    <router-view></router-view>
  </el-container>
</template>

<script setup lang="ts">
</script>

<style>
html {
  min-width: 1440px;
  height: 100%;
}

body, #app {
  padding: 0;
  margin: 0;
}

body, #app, el-container, el-main, .main {
  width: 100%;
  height: 100%;
}
</style>