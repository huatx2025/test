<template>
  <div class="proxy-image-wrapper">
    <!-- 加载中占位符 -->
    <div v-if="loading" class="image-loading">
      <div class="loading-spinner"></div>
    </div>
    
    <!-- 图片 -->
    <img
      v-show="!loading && proxiedSrc"
      :src="proxiedSrc"
      :alt="alt"
      :class="imageClass"
      @load="handleLoad"
      @error="handleError"
      v-bind="$attrs"
    />
    
    <!-- 错误占位符 -->
    <div v-if="hasError && !loading" class="image-error">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: ''
  },
  fallback: {
    type: String,
    default: ''
  },
  imageClass: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['load', 'error'])

// 代理后的图片地址
const proxiedSrc = ref('')
// 加载状态
const loading = ref(false)
// 错误状态
const hasError = ref(false)

// 图片缓存
const imageCache = new Map()

// 判断是否需要代理
const needsProxy = (url) => {
  if (!url) return false
  
  // 如果已经是 base64 或 blob，不需要代理
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return false
  }
  
  // 微信图片域名需要代理
  const wxImageDomains = ['mmbiz.qpic.cn', 'mmbiz.qlogo.cn', 'mmecoa.qpic.cn']
  try {
    const urlObj = new URL(url)
    return wxImageDomains.some(domain => urlObj.hostname.includes(domain))
  } catch (error) {
    return false
  }
}

// 加载图片
const loadImage = async (url) => {
  if (!url) {
    proxiedSrc.value = props.fallback
    return
  }

  // 不需要代理，直接使用原始URL
  if (!needsProxy(url)) {
    proxiedSrc.value = url
    return
  }

  // 检查缓存
  if (imageCache.has(url)) {
    proxiedSrc.value = imageCache.get(url)
    return
  }

  loading.value = true
  hasError.value = false

  try {
    // 通过主进程代理加载图片
    const result = await window.electron.ipcRenderer.invoke('http:fetchImage', url)
    
    if (result.ok && result.data) {
      // 缓存图片
      imageCache.set(url, result.data)
      proxiedSrc.value = result.data
      emit('load')
    } else {
      throw new Error(result.error || '图片加载失败')
    }
  } catch (error) {
    console.error('[ProxyImage] 加载图片失败:', error)
    hasError.value = true
    proxiedSrc.value = props.fallback
    emit('error', error)
  } finally {
    loading.value = false
  }
}

// 处理图片加载成功
const handleLoad = () => {
  loading.value = false
  hasError.value = false
  emit('load')
}

// 处理图片加载错误
const handleError = (event) => {
  loading.value = false
  hasError.value = true
  if (props.fallback && proxiedSrc.value !== props.fallback) {
    proxiedSrc.value = props.fallback
  }
  emit('error', event)
}

// 监听 src 变化
watch(
  () => props.src,
  (newSrc) => {
    if (newSrc) {
      loadImage(newSrc)
    } else {
      proxiedSrc.value = props.fallback
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.proxy-image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  overflow: hidden;
}

img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-loading,
.image-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e8e8e8;
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.image-error {
  color: #d9d9d9;
}

.image-error svg {
  width: 48px;
  height: 48px;
}
</style>

