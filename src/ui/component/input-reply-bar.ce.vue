<template>
  <div class="replay-bar">
    <div class="content">
      <div class="message-desc">
        <div class="username">{{ reply }}</div>
        <div class="desc">{{ desc }}</div>
      </div>
      <img class="thumbnail" v-show="thumbnail" :src="thumbnail" alt="Thumbnail Image">
    </div>
    <div class="cancel-btn" @click="emit('cancel')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin: auto" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12.9233 1.01899L12.9232 1.01911L7.72589 6.22571L2.52856 1.01911L2.52844 1.01899C2.15952 0.649919 1.55393 0.649919 1.18501 1.01899L1.18501 1.01899L1.15677 1.04724C0.779123 1.41647 0.779123 2.02389 1.15677 2.39312L6.35328 7.5918L1.15568 12.7916C0.786819 13.1606 0.786819 13.7662 1.15568 14.1353L1.18501 14.1646C1.55393 14.5337 2.15952 14.5337 2.52844 14.1646L7.72589 8.96498L12.9233 14.1646C13.2923 14.5337 13.8979 14.5337 14.2668 14.1646L14.2961 14.1353C14.665 13.7662 14.665 13.1606 14.2961 12.7916L9.09851 7.5918L14.2961 2.39203C14.665 2.02301 14.665 1.41735 14.2961 1.04833L14.2668 1.01899C13.8979 0.649919 13.2923 0.649919 12.9233 1.01899Z"
          fill="#BDC8E4" stroke="#BDC8E4" stroke-width="0.5" />
      </svg>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '../i18n-vue';

const props = defineProps({
  /** 用户名 */
  username: { type: String, required: true },
  /** 消息描述 */
  desc: { type: String, required: true },
  /** 缩略图 */
  thumbnail: String,
});

const emit = defineEmits<{
  (e: string, ...item: any[]): void,
}>();

const reply = computed(() => {
  return $t('input.reply.prefix').value + props.username;
});

</script>
<style>
.replay-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  border-radius: 8px;
  height: 44px;
  padding: 8px 0;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.content {
  border-left: 6px solid #0099ff;
  margin-left: 16px;
  box-sizing: border-box;
  width: calc(100% - 50px - 16px);
  flex: 1;
  display: flex;
  height: 100%;
  background-color: #e9f0fb;
  border-radius: 6px;
  font-size: 12px;
}

.message-desc {
  flex: 1;
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  width: calc(100% - 120px);
  margin-left: 10px;
  padding-right: 10px;
  overflow: hidden;
}

.username {
  color: #0099ff;
  margin-bottom: 2px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc {
  color: #7f8aa8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.thumbnail {
  flex-direction: column;
  justify-content: center;
  height: 40px;
  max-width: 100px;
  border: none;
  padding: 2px 8px;
  box-sizing: border-box;
}

.cancel-btn {
  display: flex;
  width: 32px;
  margin: 0 9px;
  flex-direction: column;
  justify-content: center;
  vertical-align: middle;
  cursor: pointer;
}
</style>
