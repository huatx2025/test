<template>
  <div class="browser-toolbar">
    <div class="nav-controls">
      <!-- 后退按钮 -->
      <button
        class="nav-btn"
        :disabled="!canGoBack"
        title="后退"
        @click="$emit('go-back')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- 前进按钮 -->
      <button
        class="nav-btn"
        :disabled="!canGoForward"
        title="前进"
        @click="$emit('go-forward')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- 刷新按钮 -->
      <button
        class="nav-btn"
        :class="{ 'is-loading': isLoading }"
        title="刷新"
        @click="$emit('reload')"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          :class="{ 'spin': isLoading }"
        >
          <path
            d="M13.5 2.5V6H10M2.5 13.5V10H6M13.2 10.2A5.5 5.5 0 0 1 3.3 11.5M2.8 5.8A5.5 5.5 0 0 1 12.7 4.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <!-- 地址栏 -->
    <div class="url-bar">
      <input
        type="text"
        class="url-input"
        :value="url"
        placeholder="输入网址或搜索..."
        @input="handleUrlInput"
        @keydown.enter="handleUrlEnter"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  // 是否可以后退
  canGoBack: {
    type: Boolean,
    default: false
  },
  // 是否可以前进
  canGoForward: {
    type: Boolean,
    default: false
  },
  // 是否正在加载
  isLoading: {
    type: Boolean,
    default: false
  },
  // 当前 URL
  url: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['go-back', 'go-forward', 'reload', 'url-change', 'navigate'])

// 内部维护输入的 URL
const inputUrl = ref(props.url)

// 处理 URL 输入
const handleUrlInput = (e) => {
  inputUrl.value = e.target.value
  emit('url-change', e.target.value)
}

// 处理回车导航
const handleUrlEnter = (e) => {
  const url = e.target.value.trim()
  if (!url) return
  
  let targetUrl = url
  // 确保 URL 格式正确
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // 如果包含点号且没有空格，认为是域名
    if (url.includes('.') && !url.includes(' ')) {
      targetUrl = 'https://' + url
    } else {
      // 否则作为搜索查询
      targetUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(url)}`
    }
  }
  
  emit('navigate', targetUrl)
}
</script>

<style scoped lang="scss">
.browser-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #595959;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f5f5f5;
    color: #262626;
  }

  &:active:not(:disabled) {
    background: #e8e8e8;
  }

  &:disabled {
    color: #bfbfbf;
    cursor: not-allowed;
  }

  svg {
    display: block;
  }
}

.spin {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.url-bar {
  flex: 1;
  min-width: 0;
}

.url-input {
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 13px;
  color: #262626;
  background: #fafafa;
  outline: none;
  transition: all 0.2s;

  &::placeholder {
    color: #bfbfbf;
  }

  &:hover {
    border-color: #b3b3b3;
  }

  &:focus {
    border-color: var(--color-primary, #6666ff);
    background: #ffffff;
    box-shadow: 0 0 0 2px rgba(102, 102, 255, 0.1);
  }
}
</style>

