<template>
  <AModal
    v-model:open="visible"
    title="添加微信公众号"
    width="900px"
    :footer="null"
    @cancel="handleCancel"
  >
    <div class="login-container">
      <!-- Webview 容器 -->
      <div class="webview-container">
        <AppWebview
          v-if="visible"
          ref="loginWebviewRef"
          :src="loginUrl"
          :partition="partition"
          class="login-webview"
          @navigate="handleNavigate"
          @fail-load="handleFailLoad"
        />
      </div>
    </div>
  </AModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Modal as AModal, message } from 'ant-design-vue'
import AppWebview from '@/components/common/AppWebview.vue'
import { saveWechatAccount } from '@/utils/wechat'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open', 'success', 'cancel'])

// ============ 配置常量 ============
const LOGIN_URL = 'https://mp.weixin.qq.com/'
const SUCCESS_URL_PATTERN = /mp\.weixin\.qq\.com\/cgi-bin\/home\?.*token=/

// URL 状态映射
const STATUS_URL_MAP = {
  '/acct/ban': { type: 'banned', message: '该公众号已被封禁' },
  '/acct/contractorpage': { type: 'incomplete', message: '公众号注册未完成' },
  '/cgi-bin/acctclose': { type: 'frozen', message: '该公众号已被冻结' },
  '/wticketcontractorverify': { type: 'admin_unbound', message: '管理员已解绑，请先绑定管理员' }
}

// ============ 响应式数据 ============
const visible = ref(props.open)
const loginWebviewRef = ref(null)
const partition = ref('')
const loginUrl = ref(LOGIN_URL)
const statusMessage = ref('')
const statusType = ref('info') // info, success, error

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

// ============ 初始化登录 ============
const initLogin = () => {
  // 生成临时 partition
  partition.value = `temp:wechat_login_${Date.now()}`
  loginUrl.value = LOGIN_URL
}

// ============ 事件处理器 ============
const handleNavigate = async (url) => {
  console.log('[微信登录] URL 变化:', url)

  try {
    // 检查异常状态
    const errorStatus = detectErrorStatus(url)
    if (errorStatus) {
      handleLoginError(errorStatus.message)
      return
    }

    // 检查是否登录成功
    if (SUCCESS_URL_PATTERN.test(url)) {
      await handleLoginSuccess(url)
    }
  } catch (error) {
    console.error('[微信登录] 处理导航失败:', error)
  }
}

const handleFailLoad = (errorCode, errorDescription) => {
  console.error('[微信登录] 加载失败:', errorCode, errorDescription)
  handleLoginError('页面加载失败，请检查网络连接')
}

// ============ 检测错误状态 ============
const detectErrorStatus = (url) => {
  for (const [pattern, status] of Object.entries(STATUS_URL_MAP)) {
    if (url.includes(pattern)) {
      return status
    }
  }
  return null
}

// ============ 处理登录成功 ============
const handleLoginSuccess = async (url) => {
  try {
    // 保存微信账号
    const result = await saveWechatAccount(url, partition.value)
    
    console.log('[微信登录] 登录成功，账号信息:', result.account.name)
    
    if (result.success) {
      if (result.isUpdate) {
        message.success(`${result.account.name}已存在，已为您更新`)
      } else {
        message.success(`${result.account.name}添加成功`)
      }
      
      // 通知外部刷新
      emit('success')
      visible.value = false
    } else {
      handleLoginError(result.message || '保存账号失败')
    }

  } catch (error) {
    console.error('[微信登录] 处理登录成功失败:', error)
    handleLoginError(error.message || '获取用户信息失败，请重试')
  }
}

// ============ 处理错误 ============
const handleLoginError = (errorMessage) => {
  message.error(errorMessage)
}

// ============ 取消 ============
const handleCancel = () => {
  cleanup()
  emit('cancel')
  visible.value = false
}

// ============ 清理 ============
const cleanup = () => {
  // 清理临时 session 的 cookies
  if (partition.value && partition.value.startsWith('temp:')) {
    window.electronAPI.cookie.clear(partition.value).catch(err => {
      console.error('清理临时 cookies 失败:', err)
    })
  }
}
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  flex-direction: column;
}

.webview-container {
  position: relative;
  width: 100%;
  height: 600px;
  border-radius: 8px;
  overflow: hidden;
  background: #FFFFFF;
  border: 1px solid #e5e7eb;
}

.login-webview {
  width: 100%;
  height: 100%;
  border: none;
}
</style>

