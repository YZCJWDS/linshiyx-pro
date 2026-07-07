<template>
  <div
    class="sender-avatar"
    :class="{ 'sender-avatar--image': showImage }"
    :style="avatarStyle"
    :title="source"
  >
    <img
      v-if="currentUrl"
      :src="currentUrl"
      alt=""
      class="sender-avatar-img"
      loading="lazy"
      referrerpolicy="no-referrer"
      @load="handleLoad"
      @error="handleError"
    />
    <span v-if="!showImage" class="sender-avatar-initial">{{ initial }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getSenderAvatarUrls, stringToColor, getInitial } from '@/utils/helpers'

const props = withDefaults(
  defineProps<{
    source: string
    // 头像边长（像素），列表用默认 38，详情等场景可传更大值
    size?: number
    // 圆角，默认与尺寸成比例的方形圆角，可传 '50%' 做成圆形
    radius?: string
  }>(),
  {
    size: 38,
    radius: ''
  }
)

// 候选头像 URL（按可靠度排序，逐个降级）
const candidateUrls = computed(() => getSenderAvatarUrls(props.source))
const fallbackColor = computed(() => stringToColor(props.source || '?'))
const initial = computed(() => getInitial(props.source || '?'))

// 根据尺寸动态计算样式（未加载出图片时叠加兜底底色）
const avatarStyle = computed(() => {
  const style: Record<string, string> = {
    width: `${props.size}px`,
    height: `${props.size}px`,
    fontSize: `${Math.round(props.size * 0.42)}px`,
    borderRadius: props.radius || `${Math.max(8, Math.round(props.size * 0.3))}px`
  }
  if (!showImage.value) {
    style.background = fallbackColor.value
  }
  return style
})

// 当前尝试的候选索引与加载成功标记
const urlIndex = ref(0)
const loaded = ref(false)

const currentUrl = computed<string | null>(() => {
  const urls = candidateUrls.value
  if (urlIndex.value >= urls.length) return null
  return urls[urlIndex.value] || null
})

// 只有真正加载成功时才展示图片，否则显示首字母
const showImage = computed(() => Boolean(currentUrl.value) && loaded.value)

function handleLoad() {
  loaded.value = true
}

function handleError() {
  loaded.value = false
  // 尝试下一个候选（如 QQ 失败后回退 Gravatar），全部失败则显示首字母
  if (urlIndex.value < candidateUrls.value.length) {
    urlIndex.value += 1
  }
}

// 发件人变化时重置尝试状态
watch(
  () => props.source,
  () => {
    urlIndex.value = 0
    loaded.value = false
  }
)
</script>

<style scoped>
.sender-avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #fff;
  font-weight: 700;
  line-height: 1;
  user-select: none;
  box-shadow: 0 2px 6px rgba(33, 55, 76, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.28) inset;
}

.sender-avatar--image {
  background: var(--card-color, #fff);
}

.sender-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.sender-avatar-initial {
  display: block;
}

[data-theme='dark'] .sender-avatar {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.36), 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
}
</style>
