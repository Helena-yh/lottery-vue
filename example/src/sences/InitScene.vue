<template>
  <el-main>
    <el-form label-width="160px" width="600px">
      <el-form-item label="历史记录" v-model="formData">
        <el-select style="width: 100%;" v-model="selectValue" placeholder="请选择" @change="userSelect">
          <el-option
            v-for="item in histories"
            :key="item.label"
            :label="item.label"
            :value="item.label">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="Appkey" required>
        <el-input placeholder="Appkey" v-model="formData.appkey"></el-input>
      </el-form-item>
      <el-form-item label="Token" required>
        <el-input placeholder="Token" v-model="formData.token"></el-input>
      </el-form-item>
      <el-form-item label="Navi">
        <el-input placeholder="Navi" v-model="formData.navi"></el-input>
      </el-form-item>
      <el-form-item label="IMLib 日志">
        <el-select style="width: 100%;" v-model="formData.imlibLogLevel" placeholder="请选择">
          <el-option
            v-for="item in logLevelList"
            :key="item.value"
            :label="item.label"
            :value="item.value">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="IMKit 日志">
        <el-select style="width: 100%;" v-model="formData.imkitLogLevel" placeholder="请选择">
          <el-option
            v-for="item in logLevelList"
            :key="item.value"
            :label="item.label"
            :value="item.value">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="允许消息撤回时间">
        <el-input-number v-model="formData.allowedToRecallTime" :min="0" :step="30"/>
        <span style="padding-left: 10px;">单位：秒</span>
      </el-form-item>
      <el-form-item label="允许撤回消息重新编辑时间">
        <el-input-number v-model="formData.allowedToReEditTime" :min="0" :step="30"/>
        <span style="padding-left: 10px;">单位：秒</span>
      </el-form-item>
      <el-form-item label="默认语言">
        <el-select style="width: 100%;" v-model="formData.language" placeholder="请选择">
          <el-option
            v-for="item in languages"
            :key="item"
            :label="item"
            :value="item">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onConfigComplate">初始化</el-button>
      </el-form-item>
    </el-form>
  </el-main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { LogL } from '@rongcloud/imlib-next';
import { ElMessage } from 'element-plus';

import router from '../router'
import { initIMLib } from '../services/imlib';
import { initIMKit } from '../services/imkit';
import { histories } from '../services/auth-history';
import { initData as formData } from '../services/cache';

const logLevelList = [
  { label: 'DEBUG', value: LogL.DEBUG },
  { label: 'INFO', value: LogL.INFO },
  { label: 'WARN', value: LogL.WARN },
  { label: 'ERROR', value: LogL.ERROR },
]

const languages = ['zh_CN', 'en_US']

const selectValue = ref()
const userSelect = () => {
  const { appkey, token, navi } = histories.find(item => item.label === selectValue.value)!;
  formData.value = { ...formData.value, appkey, token, navi }
}

const onConfigComplate = () => {
  // IMLib 初始化
  initIMLib();

  // IMKit 初始化
  const app = initIMKit();
  if (!app) {
    ElMessage({ message: 'IMKit 初始化失败', type: 'error' });
    return;
  }

  router.push('/conf');
}
</script>

<style scoped>
.el-main {
  padding-top: 60px;
}
.el-form {
  width: 60%;
  margin: 0 auto;
}
</style>
