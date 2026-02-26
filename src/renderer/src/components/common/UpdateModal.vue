<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    :closable="false"
    :mask-closable="false"
    :footer="null"
    width="480px"
  >
    <div class="update-modal">
      <div v-if="status === 'checking'" class="update-status">
        <a-spin size="large" />
        <p class="status-text">正在检查更新...</p>
      </div>

      <div v-else-if="status === 'downloading'" class="update-status">
        <a-progress :percent="downloadProgress" :status="downloadStatus" />
        <p class="status-text">正在下载更新 ({{ downloadProgress }}%)</p>
      </div>

      <div v-else-if="status === 'available'" class="update-available">
        <div class="update-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V16" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 12H16" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="update-info">
          <h3>发现新版本 {{ updateInfo?.version }}</h3>
          <p class="version-info">当前版本: {{ currentVersion }}</p>
          <p class="release-notes">{{ releaseNotes }}</p>
        </div>
        <div class="update-actions">
          <a-button @click="handleLater">稍后提醒</a-button>
          <a-button type="primary" @click="handleDownload" :loading="downloading">
            立即下载
          </a-button>
        </div>
      </div>

      <div v-else-if="status === 'downloaded'" class="update-downloaded">
        <div class="update-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="#52c41a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="update-info">
          <h3>更新已下载完成</h3>
          <p>新版本 {{ updateInfo?.version }} 已准备就绪</p>
        </div>
        <div class="update-actions">
          <a-button @click="handleLater">稍后重启</a-button>
          <a-button type="primary" @click="handleInstall">
            立即重启
          </a-button>
        </div>
      </div>

      <div v-else-if="status === 'not-available'" class="update-not-available">
        <div class="update-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#52c41a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 12H16" stroke="#52c41a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="update-info">
          <h3>已是最新版本</h3>
          <p class="version-info">当前版本: {{ currentVersion }}</p>
        </div>
        <div class="update-actions">
          <a-button type="primary" @click="handleClose">确定</a-button>
        </div>
      </div>

      <div v-else-if="status === 'error'" class="update-error">
        <div class="update-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ff4d4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 8V12" stroke="#ff4d4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 16H12.01" stroke="#ff4d4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="update-info">
          <h3>更新失败</h3>
          <p class="error-message">{{ errorMessage }}</p>
        </div>
        <div class="update-actions">
          <a-button @click="handleClose">关闭</a-button>
          <a-button type="primary" @click="handleRetry">重试</a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  open: Boolean
})

const emit = defineEmits(['update:open'])

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const status = ref('idle')
const updateInfo = ref(null)
const currentVersion = ref('')
const downloadProgress = ref(0)
const downloading = ref(false)
const errorMessage = ref('')

const modalTitle = computed(() => {
  const titles = {
    checking: '检查更新',
    downloading: '下载更新',
    available: '发现新版本',
    downloaded: '更新就绪',
    'not-available': '检查更新',
    error: '更新失败'
  }
  return titles[status.value] || '更新'
})

const downloadStatus = computed(() => {
  if (downloadProgress.value >= 100) return 'success'
  return 'active'
})

const releaseNotes = computed(() => {
  if (!updateInfo.value?.releaseNotes) return ''
  if (typeof updateInfo.value.releaseNotes === 'string') {
    return updateInfo.value.releaseNotes
  }
  return '新版本包含改进和修复'
})

const checkForUpdates = async () => {
  try {
    status.value = 'checking'
    const result = await window.electronAPI?.updater?.check()
    
    if (result?.success) {
      currentVersion.value = await window.electronAPI?.updater?.getVersion()
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    status.value = 'error'
    errorMessage.value = error.message || '检查更新失败'
  }
}

const handleDownload = async () => {
  try {
    downloading.value = true
    const result = await window.electronAPI?.updater?.download()
    
    if (!result?.success) {
      throw new Error(result.error || '下载失败')
    }
  } catch (error) {
    console.error('下载更新失败:', error)
    message.error('下载更新失败: ' + error.message)
    downloading.value = false
  }
}

const handleInstall = () => {
  window.electronAPI?.updater?.install()
}

const handleLater = () => {
  visible.value = false
  setTimeout(() => {
    status.value = 'idle'
  }, 300)
}

const handleClose = () => {
  visible.value = false
  setTimeout(() => {
    status.value = 'idle'
  }, 300)
}

const handleRetry = () => {
  checkForUpdates()
}

const setupEventListeners = () => {
  const updater = window.electronAPI?.updater
  if (!updater) return

  updater.onCheckingForUpdate(() => {
    status.value = 'checking'
  })

  updater.onUpdateAvailable((info) => {
    updateInfo.value = info
    status.value = 'available'
    downloading.value = false
  })

  updater.onUpdateNotAvailable((info) => {
    currentVersion.value = info.version
    status.value = 'not-available'
  })

  updater.onDownloadProgress((progress) => {
    status.value = 'downloading'
    downloadProgress.value = Math.round(progress.percent || 0)
  })

  updater.onUpdateDownloaded((info) => {
    updateInfo.value = info
    status.value = 'downloaded'
    downloading.value = false
  })

  updater.onUpdateError((error) => {
    status.value = 'error'
    errorMessage.value = error || '更新失败'
    downloading.value = false
  })
}

const removeEventListeners = () => {
  const updater = window.electronAPI?.updater
  if (!updater) return

  updater.onCheckingForUpdate = null
  updater.onUpdateAvailable = null
  updater.onUpdateNotAvailable = null
  updater.onDownloadProgress = null
  updater.onUpdateDownloaded = null
  updater.onUpdateError = null
}

onMounted(() => {
  setupEventListeners()
})

onUnmounted(() => {
  removeEventListeners()
})

defineExpose({
  checkForUpdates
})
</script>

<style scoped lang="scss">
.update-modal {
  padding: 20px 0;
}

.update-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;

  .status-text {
    margin-top: 20px;
    font-size: 16px;
    color: #4a5568;
  }
}

.update-available,
.update-downloaded,
.update-not-available,
.update-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.update-icon {
  margin-bottom: 20px;

  svg {
    display: block;
  }
}

.update-info {
  width: 100%;
  margin-bottom: 30px;

  h3 {
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 12px 0;
  }

  .version-info {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 12px 0;
  }

  .release-notes {
    font-size: 14px;
    color: #4a5568;
    margin: 0;
    padding: 12px;
    background: #f9fafb;
    border-radius: 6px;
    text-align: left;
  }

  .error-message {
    font-size: 14px;
    color: #dc2626;
    margin: 0;
    padding: 12px;
    background: #fef2f2;
    border-radius: 6px;
  }
}

.update-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  justify-content: center;
}
</style>
