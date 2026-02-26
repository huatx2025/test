<template>
  <a-modal
    v-model:open="visible"
    title="微信公众号登录（可连续添加多个账号）"
    width="500px"
    :footer="null"
    :maskClosable="false"
    @cancel="handleCancel"
  >
    <div class="qrcode-container">
      <!-- 二维码显示区域 -->
      <div v-if="qrcodeImageUrl" class="qrcode-image-wrapper">
        <img :src="qrcodeImageUrl" alt="二维码" class="qrcode-image" />
        <!-- 扫码成功后的蒙版 -->
        <div v-if="isScanned" class="qrcode-mask">
          <div class="mask-content">
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#07c160"/>
              <path d="M7 12L10 15L17 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p class="mask-text">已扫码</p>
          </div>
        </div>
      </div>
      <div v-else class="qrcode-loading">
        <a-spin size="large" />
        <p>正在生成二维码...</p>
      </div>

      <!-- 扫码状态 -->
      <div class="scan-status" :style="{ color: scanStatusColor }">
        {{ scanStatus }}
        <span v-if="countdown > 0" class="countdown-text">（{{ countdown }}s）</span>
      </div>

    </div>
  </a-modal>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { message } from 'ant-design-vue'
import { useAccountStore } from '@/store/modules/account'
import { createOrUpdateAccount } from '@/api/account'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open', 'success', 'cancel'])

const accountStore = useAccountStore()

// ============ 响应式数据 ============
const visible = ref(props.open)
const qrcodeImageUrl = ref('')
const scanStatus = ref('等待扫码...')
const scanStatusColor = ref('#666')
const addedAccounts = ref([])
const showAccountList = ref(true)
const countdown = ref(0) // 倒计时
const isScanned = ref(false) // 是否已扫码

let checkScanInterval = null
let countdownInterval = null

// ============ 保存账号 ============
const saveAccount = async (accountData) => {
  try {
    const result = await accountStore.createOrUpdateAccountAction({
      platform_type: 'wechat',
      platform_id: accountData.token, // 使用 token 作为唯一标识
      name: accountData.name,
      avatar: accountData.avatar,
      auth_data: JSON.stringify({
        token: accountData.token,
        cookies: accountData.cookies
      })
    })
    
    return result
  } catch (error) {
    throw error
  }
}

// ============ 监听 open 变化 ============
watch(() => props.open, (newVal) => {
  visible.value = newVal
  if (newVal) {
    initLogin()
  } else {
    cleanup()
  }
})

watch(visible, (newVal) => {
  emit('update:open', newVal)
})

// ============ 开始倒计时 ============
const startCountdown = () => {
  // 清除旧的倒计时
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  
  // 设置倒计时为 300 秒（5 分钟）
  countdown.value = 300
  
  countdownInterval = setInterval(() => {
    countdown.value--
    
    if (countdown.value <= 0) {
      clearInterval(countdownInterval)
      countdownInterval = null
      scanStatus.value = '二维码已过期，正在刷新...'
      scanStatusColor.value = '#ff4d4f'
      
      // 2秒后重新生成二维码
      setTimeout(() => {
        initLogin()
      }, 2000)
    } else if (countdown.value <= 30) {
      // 最后30秒提示即将过期
      scanStatusColor.value = '#ff4d4f'
    }
  }, 1000)
}

// ============ 初始化登录 ============
const initLogin = async () => {
  // 重置状态
  qrcodeImageUrl.value = ''
  scanStatus.value = '正在生成二维码...'
  scanStatusColor.value = '#666'
  countdown.value = 0
  isScanned.value = false // 重置扫码状态
  
  // 清除倒计时
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  
  // 通知主进程创建登录视图
  if (window.ipcRenderer) {
    window.ipcRenderer.send('toMain', {
      tag: 'wechat:createLoginViewInDialog'
    })
  }
}

// ============ 监听主进程消息 ============
onMounted(() => {
  if (window.ipcRenderer) {
    // 先移除旧的监听器（如果存在）
    window.ipcRenderer.removeAllListeners('fromMain')
    // 注册新的监听器
    window.ipcRenderer.receive('fromMain', handleMainMessage)
  }
})

onBeforeUnmount(() => {
  cleanup()
  // 移除监听器
  if (window.ipcRenderer) {
    window.ipcRenderer.removeAllListeners('fromMain')
  }
})

const handleMainMessage = async (data) => {
  if (typeof data === 'object' && data.tag) {
    switch (data.tag) {
      case 'wechat:qrcodeReady':
        // 收到二维码数据
        qrcodeImageUrl.value = data.data.qrcode
        scanStatus.value = '请使用微信扫描二维码登录'
        scanStatusColor.value = '#07c160'
        // 开始倒计时
        startCountdown()
        break
        
      case 'wechat:statusUpdate':
        // 收到状态更新
        if (!visible.value) {
          break
        }
        
        scanStatus.value = data.data.status
        
        // 根据状态文本设置颜色
        if (data.data.status.includes('成功') || data.data.status.includes('✅')) {
          scanStatusColor.value = '#07c160'
        } else if (data.data.status.includes('失败') || data.data.status.includes('❌') || data.data.status.includes('过期')) {
          scanStatusColor.value = 'red'
        } else if (data.data.status.includes('扫码') || data.data.status.includes('确认') || data.data.status.includes('密码')) {
          scanStatusColor.value = '#07c160'
        } else {
          scanStatusColor.value = '#666'
        }
        break
        
      case 'wechat:scanSuccess':
        // 扫码成功，等待确认
        scanStatus.value = '✅ 扫码成功！请在手机上确认登录'
        scanStatusColor.value = '#07c160'
        isScanned.value = true // 显示蒙版
        // 停止倒计时
        if (countdownInterval) {
          clearInterval(countdownInterval)
          countdownInterval = null
        }
        countdown.value = 0
        break
        
      case 'wechat:loginSuccess':
        // 登录成功
        // 停止倒计时
        if (countdownInterval) {
          clearInterval(countdownInterval)
          countdownInterval = null
        }
        countdown.value = 0
        
        // 保存账号到数据库
        await saveAccount(data.data)
        
        // 添加到已添加列表
        addedAccounts.value.push({
          name: data.data.name,
          avatar: data.data.avatar || '',
          isUpdate: data.data.isUpdate || false
        })
        
        // 显示成功通知
        message.success(`${data.data.name} 登录成功！`)
        
        // 刷新账号列表
        accountStore.fetchGroups()
        
        // 不要触发 success 事件，保持弹框打开以便连续添加账号
        // emit('success')
        
        // 更新状态文字，但保留二维码显示（无感刷新）
        scanStatus.value = `✅ ${data.data.name} 登录成功！`
        scanStatusColor.value = '#07c160'
        
        // 1秒后更新状态为"正在生成新的二维码"
        setTimeout(() => {
          if (visible.value) {
            scanStatus.value = '正在生成新的二维码...'
            scanStatusColor.value = '#666'
          }
        }, 1000)
        break
        
      case 'wechat:loginFailed':
        // 登录失败
        scanStatus.value = '❌ 登录失败: ' + data.data.error
        scanStatusColor.value = 'red'
        message.error('登录失败: ' + data.data.error)
        break
    }
  }
}

// ============ 切换账号列表显示 ============
const toggleAccountList = () => {
  showAccountList.value = !showAccountList.value
}

// ============ 取消 ============
const handleCancel = () => {
  cleanup()
  emit('cancel')
  visible.value = false
}

// ============ 清理 ============
const cleanup = () => {
  // 清除轮询
  if (checkScanInterval) {
    clearInterval(checkScanInterval)
    checkScanInterval = null
  }
  
  // 清除倒计时
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  
  // 通知主进程清理
  if (window.ipcRenderer) {
    window.ipcRenderer.send('toMain', {
      tag: 'wechat:cleanupCountdown'
    })
  }
  
  // 重置状态
  qrcodeImageUrl.value = ''
  scanStatus.value = '等待扫码...'
  scanStatusColor.value = '#666'
  countdown.value = 0
}
</script>

<style scoped lang="scss">
.qrcode-container {
  text-align: center;
  padding: 20px;
}

.qrcode-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 16px;
  
  p {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
}

.qrcode-image-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.qrcode-image {
  width: 300px;
  height: 300px;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qrcode-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-in-out;
}

.mask-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.check-icon {
  width: 60px;
  height: 60px;
  animation: scaleIn 0.3s ease-in-out;
}

.mask-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

.scan-status {
  margin-top: 16px;
  font-size: 14px;
  font-weight: 500;
  min-height: 22px;
  
  .countdown-text {
    font-size: 13px;
    color: #666;
    font-weight: normal;
    margin-left: 4px;
  }
}

.added-account-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.2s;
  
  &:hover {
    background: #f5f5f5;
  }
  
  &:not(:last-child) {
    margin-bottom: 4px;
  }
}

.account-name {
  flex: 1;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  max-height: 150px;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>

