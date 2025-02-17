<template>
  <div ref="scrollbarRef" class="rc-kit-scrollbar">
    <div ref="wrapRef" class="wrap" @scroll="handleScroll">
      <div ref="resizeRef" style="min-height: 100%;">
        <slot></slot>
      </div>
    </div>
    <rc-scrollbar-thumb-provider
      v-if="sizeHeight"
      @handlemove="handleMove"
      :height="sizeHeight"
      :move="moveY"
      :scrollheight="wrapRef?.scrollHeight"
      :ratio="ratioY" ></rc-scrollbar-thumb-provider>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { ctx } from './context'
import { InnerEvent } from '@lib/core/EventDefined';

const context = ctx();
const emit = defineEmits<{
  (e: string, ...item: any[]): void,
}>();

const scrollbarRef = ref<HTMLDivElement>();
const wrapRef = ref<HTMLDivElement>();
const resizeRef = ref<HTMLDivElement>();
const ratioY = ref(1);
const sizeHeight = ref(0);
const moveY = ref(0);

let timer: any = null;

const update = () => {
  if (!wrapRef.value) return
  const offsetHeight = wrapRef.value.offsetHeight;

  const originalHeight = offsetHeight ** 2 / wrapRef.value.scrollHeight;
  const height = Math.max(originalHeight, 20);
  // 滑块高度最小 20 px, 当 originalHeight 小于 20px, 需计算 20px 下滑块移动距离与内容滚动距离的比值
  ratioY.value =
    originalHeight /(offsetHeight - originalHeight) / (height / (offsetHeight - height));

  sizeHeight.value = originalHeight < offsetHeight ? Math.floor(height) : 0;
}

const setScrollTop = (value: number) => {
  if (typeof value !== 'number') {
    console.warn('value must be a number');
    return
  }
  if (!wrapRef?.value) return
  wrapRef.value.scrollTop = value
}

const handleMove = (e: CustomEvent) => {
  if (!wrapRef.value) return
  const thumbPositionPercentage = e.detail[0];
  wrapRef.value.scrollTop = (thumbPositionPercentage * wrapRef.value.scrollHeight) / 100
}

const handleScroll = () => {
  if (!wrapRef.value) return
  const { offsetHeight, scrollHeight, scrollTop } = wrapRef.value
  // 计算滚动距离的百分比
  moveY.value = Math.floor(((scrollTop * 100) / offsetHeight) * ratioY.value);

  let shouldTrigger = scrollHeight /(offsetHeight + scrollTop) <= 1.2

  // 下拉到一定比例，触发加载
  if (shouldTrigger) {
    if (!timer) {
      timer = setTimeout(async () => {
        emit('loading')
        timer = null;
        clearTimeout(timer)
      }, 1000);
    }
  }
}

watch(() => ratioY.value, (data) => {
  if (!wrapRef.value) return
  const { offsetHeight, scrollTop } = wrapRef.value
  moveY.value = Math.floor(((scrollTop * 100) / offsetHeight) * ratioY.value);
})


// 监听容器高度变化，更新滑块
let resizeRefObserver: ResizeObserver | null = null;
let wrapRefObserver: ResizeObserver | null = null;
const useResizeObserver = (el: HTMLElement, callback: ResizeObserverCallback) => {
  let observer: ResizeObserver | null = null;
  if ( window && "ResizeObserver" in window && el) {
    observer = new ResizeObserver(callback);
    observer.observe(el);
  }
  return observer;
}
// 切换用户登入，置顶滚动条
const _onDestroyUserCache = () => {
  setScrollTop(0);
}

onMounted(() => {
  window.addEventListener('resize', update);
  resizeRefObserver = useResizeObserver(resizeRef.value!, update);
  wrapRefObserver = useResizeObserver(wrapRef.value!, update);
  // 切换用户登入
  context.addEventListener(InnerEvent.DESTROY_USER_CACHE, _onDestroyUserCache);
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', update);
  resizeRefObserver?.unobserve(resizeRef.value!);
  wrapRefObserver?.unobserve(wrapRef.value!)
})

</script>
<style>
.rc-kit-scrollbar {
  overflow: hidden;
  position: relative;
  height: 100%;
}
.wrap {
  overflow-y: scroll;
  height: 100%;
  scrollbar-width: none;
}
.wrap::-webkit-scrollbar {
  display: none;
}
</style>
