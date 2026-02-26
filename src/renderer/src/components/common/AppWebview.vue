<template>
  <div class="webview-container">
    <webview
      ref="webviewRef"
      v-bind="$attrs"
      :src="src"
      :partition="partition"
      :preload="preload || undefined"
      :useragent="DEFAULT_USER_AGENT"
      allowpopups
      class="app-webview"
    ></webview>
    
    <!-- 控制台按钮 -->
    <!-- <button 
      class="console-button" 
      @click="openDevTools"
      title="打开控制台"
    >
      >_
    </button> -->
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

// ============ 默认配置 ============
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// ============ Props ============
const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  partition: {
    type: String,
    default: ''
  },
  preload: {
    type: String,
    default: ''
  }
})

// ============ Emits ============
const emit = defineEmits([
  'ready',           // dom-ready 事件
  'navigate',        // 导航事件 (url)
  'start-loading',   // 开始加载
  'stop-loading',    // 停止加载
  'finish-load',     // 加载完成
  'fail-load',       // 加载失败 (errorCode, errorDescription)
  'nav-state-change', // 导航状态变化 { canGoBack, canGoForward, isLoading, currentUrl }
  'ipc-message'      // IPC 消息事件
])

// ============ Refs ============
const webviewRef = ref(null)
const isReady = ref(false)

// 导航状态
const navState = ref({
  canGoBack: false,
  canGoForward: false,
  isLoading: false,
  currentUrl: props.src || ''
})

// ============ 事件处理函数（保存引用以便移除） ============
let handlers = {}

const createHandlers = () => {
  const webviewEl = webviewRef.value
  if (!webviewEl) return

  handlers = {
    handleDomReady: () => {
      isReady.value = true
      updateNavState()
      emit('ready')
    },

    handleDidStartLoading: () => {
      navState.value.isLoading = true
      emit('start-loading')
      emitNavStateChange()
    },

    handleDidStopLoading: () => {
      navState.value.isLoading = false
      updateNavState()
      emit('stop-loading')
    },

    handleDidNavigate: (event) => {
      const newUrl = event.url || webviewEl.src
      navState.value.currentUrl = newUrl
      updateNavState()
      emit('navigate', newUrl)
    },

    handleDidFinishLoad: () => {
      navState.value.currentUrl = webviewEl.src
      navState.value.isLoading = false
      updateNavState()
      emit('finish-load')
    },

    handleDidFailLoad: (event) => {
      // 忽略一些正常的错误（如 -3 是用户取消）
      if (event.errorCode === -3) return
      emit('fail-load', event.errorCode, event.errorDescription)
    },

    handleIpcMessage: (event) => {
      // 转发 IPC 消息给父组件
      emit('ipc-message', event.channel, event.args)
    }
  }
}

// ============ 更新导航状态 ============
const updateNavState = () => {
  const webviewEl = webviewRef.value
  if (!webviewEl || !isReady.value) return

  try {
    navState.value.canGoBack = webviewEl.canGoBack()
    navState.value.canGoForward = webviewEl.canGoForward()
    emitNavStateChange()
  } catch (e) {
    // webview 可能还没完全准备好
  }
}

const emitNavStateChange = () => {
  emit('nav-state-change', { ...navState.value })
}

// ============ 设置监听器 ============
const setupListeners = () => {
  const webviewEl = webviewRef.value
  if (!webviewEl) return

  createHandlers()

  webviewEl.addEventListener('dom-ready', handlers.handleDomReady)
  webviewEl.addEventListener('did-start-loading', handlers.handleDidStartLoading)
  webviewEl.addEventListener('did-stop-loading', handlers.handleDidStopLoading)
  webviewEl.addEventListener('did-navigate', handlers.handleDidNavigate)
  webviewEl.addEventListener('did-navigate-in-page', handlers.handleDidNavigate)
  webviewEl.addEventListener('did-finish-load', handlers.handleDidFinishLoad)
  webviewEl.addEventListener('did-fail-load', handlers.handleDidFailLoad)
  webviewEl.addEventListener('ipc-message', handlers.handleIpcMessage)
}

// ============ 清理监听器 ============
const removeListeners = () => {
  const webviewEl = webviewRef.value
  if (!webviewEl || !handlers.handleDomReady) return

  webviewEl.removeEventListener('dom-ready', handlers.handleDomReady)
  webviewEl.removeEventListener('did-start-loading', handlers.handleDidStartLoading)
  webviewEl.removeEventListener('did-stop-loading', handlers.handleDidStopLoading)
  webviewEl.removeEventListener('did-navigate', handlers.handleDidNavigate)
  webviewEl.removeEventListener('did-navigate-in-page', handlers.handleDidNavigate)
  webviewEl.removeEventListener('did-finish-load', handlers.handleDidFinishLoad)
  webviewEl.removeEventListener('did-fail-load', handlers.handleDidFailLoad)
  webviewEl.removeEventListener('ipc-message', handlers.handleIpcMessage)

  handlers = {}
}

// ============ 暴露的方法 ============

// 后退
const goBack = () => {
  const webviewEl = webviewRef.value
  if (webviewEl && webviewEl.canGoBack()) {
    webviewEl.goBack()
  }
}

// 前进
const goForward = () => {
  const webviewEl = webviewRef.value
  if (webviewEl && webviewEl.canGoForward()) {
    webviewEl.goForward()
  }
}

// 刷新
const reload = () => {
  const webviewEl = webviewRef.value
  if (webviewEl) {
    webviewEl.reload()
  }
}

// 停止加载
const stop = () => {
  const webviewEl = webviewRef.value
  if (webviewEl) {
    webviewEl.stop()
  }
}

// 导航到指定 URL
const loadURL = (url) => {
  const webviewEl = webviewRef.value
  if (webviewEl && url) {
    webviewEl.src = url
    navState.value.currentUrl = url
  }
}

// 获取当前 URL
const getCurrentUrl = () => {
  const webviewEl = webviewRef.value
  return webviewEl?.src || navState.value.currentUrl
}

// 是否可以后退
const canGoBack = () => {
  const webviewEl = webviewRef.value
  return webviewEl?.canGoBack() ?? false
}

// 是否可以前进
const canGoForward = () => {
  const webviewEl = webviewRef.value
  return webviewEl?.canGoForward() ?? false
}

// 是否正在加载
const isLoading = () => navState.value.isLoading

// 获取原生 webview 元素（谨慎使用）
const getWebviewElement = () => webviewRef.value

// 打开开发者工具
const openDevTools = () => {
  const webviewEl = webviewRef.value
  if (webviewEl) {
    webviewEl.openDevTools()
  }
}

// 执行 JavaScript 代码
const executeJavaScript = (code) => {
  const webviewEl = webviewRef.value
  if (webviewEl) {
    return webviewEl.executeJavaScript(code)
  }
  return Promise.reject(new Error('Webview not ready'))
}

// ============ 生命周期 ============
onMounted(() => {
  nextTick(() => {
    setupListeners()
  })
})

onBeforeUnmount(() => {
  removeListeners()
})

// 监听 src 变化，更新 currentUrl
watch(
  () => props.src,
  (newSrc) => {
    if (newSrc) {
      navState.value.currentUrl = newSrc
    }
  }
)

// ============ 暴露给父组件 ============
defineExpose({
  goBack,
  goForward,
  reload,
  stop,
  loadURL,
  getCurrentUrl,
  canGoBack,
  canGoForward,
  isLoading,
  getWebviewElement,
  openDevTools,
  executeJavaScript,
  navState
})
</script>

<style scoped>
.webview-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.app-webview {
  width: 100%;
  height: 100%;
  border: none;
}

.console-button {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  z-index: 1000;
}

.console-button:hover {
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.console-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
</style>
