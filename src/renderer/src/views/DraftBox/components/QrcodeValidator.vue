<template>
  <AModal
    v-model:open="visible"
    title="手机扫码验证"
    :width="360"
    :mask-closable="false"
    :keyboard="true"
    :closable="true"
    :footer="null"
    class="qrcode-validator-modal"
    @cancel="handleCancel"
  >
    <div class="qrcode-content">
      <!-- 二维码图片 -->
      <div class="qrcode-image-container">
        <img v-if="qrcodeImage" :src="qrcodeImage" class="qrcode-image" alt="扫码验证" />
        <div v-else class="qrcode-loading">
          <LoadingOutlined spin style="font-size: 32px; color: #1890ff;" />
          <span>加载中...</span>
        </div>
      </div>
      
      <!-- 扫码状态 -->
      <div class="qrcode-status">
        <div class="status-text" :class="statusClass">
          {{ statusText }}
        </div>
        
        <!-- 刷新按钮（超时或取消时显示） -->
        <AButton 
          v-if="showRefreshBtn" 
          type="primary"
          size="small"
          @click="handleRefresh"
        >
          <template #icon><ReloadOutlined /></template>
          刷新二维码
        </AButton>
      </div>
      
      <!-- 提示信息 -->
      <div class="qrcode-tip">
        <p>{{ tip || '请使用绑定的管理员微信扫描二维码' }}</p>
      </div>
    </div>
  </AModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Modal as AModal, Button as AButton, message } from 'ant-design-vue'
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { getQrcodeTicket, getQrcodeUuid, getQrcodeImage, pollQrcodeStatus } from '@/.thidparty_api/wechat'

const props = defineProps({
  // 账号ID
  accountId: {
    type: [String, Number],
    required: true
  },
  // 图文消息ID
  appmsgId: {
    type: [String, Number],
    default: ''
  },
  // 操作序列号
  operationSeq: {
    type: String,
    default: ''
  },
  // 是否有群发通知
  hasNotify: {
    type: Boolean,
    default: false
  },
  // 提示文字
  tip: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['success', 'cancel', 'error'])

// 弹窗可见性
const visible = ref(false)

// 二维码图片
const qrcodeImage = ref('')

// 二维码UUID
const qrcodeUuid = ref('')

// 扫码状态：waiting, scanned, confirmed, cancelled, timeout
const qrcodeStatus = ref('waiting')

// 状态文字
const statusText = ref('等待扫码')

// 是否正在轮询
const polling = ref(false)

// 是否显示刷新按钮
const showRefreshBtn = ref(false)

// 是否已中止
const aborted = ref(false)

// Promise resolve函数，用于返回验证结果
let resolveValidation = null

// 扫码状态样式类
const statusClass = computed(() => {
  switch (qrcodeStatus.value) {
    case 'confirmed':
      return 'status-success'
    case 'cancelled':
    case 'timeout':
      return 'status-error'
    case 'scanned':
      return 'status-scanned'
    default:
      return 'status-waiting'
  }
})

// 重置状态
const resetState = () => {
  visible.value = false
  qrcodeImage.value = ''
  qrcodeUuid.value = ''
  qrcodeStatus.value = 'waiting'
  statusText.value = '等待扫码'
  polling.value = false
  showRefreshBtn.value = false
  aborted.value = false
}

// 开始验证（对外暴露的方法）
const startValidation = async () => {
  return new Promise((resolve) => {
    resolveValidation = resolve
    doStartValidation()
  })
}

// 内部执行验证流程
const doStartValidation = async () => {
  try {
    resetState()
    visible.value = true
    
    // 1. 先获取 ticket
    console.log('[扫码验证] 开始获取ticket, accountId:', props.accountId, 'appmsgid:', props.appmsgId)
    const ticketResult = await getQrcodeTicket(props.accountId, props.appmsgId)
    console.log('[扫码验证] ticket结果:', ticketResult)
    if (!ticketResult.success || !ticketResult.ticket) {
      const errorMsg = ticketResult.error || '获取验证ticket失败'
      console.error('[扫码验证] 获取ticket失败:', errorMsg, ticketResult)
      throw new Error(errorMsg)
    }
    const ticket = ticketResult.ticket
    
    // 2. 用 ticket 获取 UUID
    console.log('[扫码验证] 开始获取UUID, ticket:', ticket)
    const uuidResult = await getQrcodeUuid(props.accountId, ticket)
    console.log('[扫码验证] UUID结果:', uuidResult)
    if (!uuidResult.success || !uuidResult.uuid) {
      const errorMsg = uuidResult.error || '获取验证UUID失败'
      console.error('[扫码验证] 获取UUID失败:', errorMsg, uuidResult)
      throw new Error(errorMsg)
    }
    qrcodeUuid.value = uuidResult.uuid
    
    // 3. 获取二维码图片
    const imageResult = await getQrcodeImage(props.accountId, {
      ticket: ticket,
      uuid: qrcodeUuid.value,
      msgid: props.operationSeq,
      hasNotify: props.hasNotify
    })
    if (!imageResult.success || !imageResult.imageData) {
      throw new Error('获取验证二维码失败')
    }
    qrcodeImage.value = imageResult.imageData
    statusText.value = '请扫码验证'
    
    // 4. 开始轮询扫码状态
    polling.value = true
    const pollResult = await pollQrcodeStatus(props.accountId, {
      uuid: qrcodeUuid.value,
      appmsgid: props.appmsgId,
      timeout: 60,
      interval: 1000,
      onStatusChange: (result) => {
        qrcodeStatus.value = result.status
        statusText.value = result.msg
      },
      getAbortSignal: () => aborted.value
    })
    
    polling.value = false
    
    // 5. 处理结果
    if (pollResult.status === 'confirmed') {
      statusText.value = '验证成功'
      // 短暂延迟后关闭弹窗
      await new Promise(resolve => setTimeout(resolve, 500))
      visible.value = false
      const result = { success: true, uuid: qrcodeUuid.value }
      emit('success', result)
      resolveValidation?.(result)
      return result
    } else if (pollResult.status === 'timeout') {
      statusText.value = '超时，请点击刷新重试'
      showRefreshBtn.value = true
      const result = { success: false, reason: 'timeout' }
      return result
    } else if (pollResult.status === 'cancelled') {
      statusText.value = '已取消验证'
      showRefreshBtn.value = true
      const result = { success: false, reason: 'cancelled' }
      return result
    } else if (pollResult.status === 'aborted') {
      const result = { success: false, reason: 'aborted' }
      resolveValidation?.(result)
      return result
    }
    
    const result = { success: false, reason: 'unknown' }
    return result
  } catch (error) {
    console.error('扫码验证失败:', error)
    message.error(error.message || '扫码验证失败')
    polling.value = false
    showRefreshBtn.value = true
    statusText.value = '验证失败，请重试'
    const result = { success: false, reason: 'error', error }
    emit('error', result)
    return result
  }
}

// 刷新二维码
const handleRefresh = async () => {
  showRefreshBtn.value = false
  qrcodeImage.value = ''
  qrcodeStatus.value = 'waiting'
  statusText.value = '加载中...'
  
  // 重新开始验证流程
  const result = await doStartValidation()
  if (result.success) {
    // 验证成功，会自动触发事件
  }
}

// 取消验证
const handleCancel = () => {
  if (polling.value) {
    aborted.value = true
  }
  visible.value = false
  const result = { success: false, reason: 'cancelled' }
  emit('cancel', result)
  resolveValidation?.(result)
  resetState()
}

// 关闭弹窗（对外暴露）
const close = () => {
  handleCancel()
}

// 暴露方法给父组件
defineExpose({
  startValidation,
  close
})
</script>

<style scoped lang="scss">
.qrcode-validator-modal {
  :deep(.ant-modal-body) {
    padding: 24px;
  }
}

.qrcode-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qrcode-image-container {
  width: 240px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fafafa;
}

.qrcode-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.qrcode-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #8c8c8c;
  font-size: 14px;
}

.qrcode-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.status-text {
  font-size: 15px;
  font-weight: 500;
  
  &.status-waiting {
    color: #8c8c8c;
  }
  
  &.status-scanned {
    color: #1890ff;
  }
  
  &.status-success {
    color: #52c41a;
  }
  
  &.status-error {
    color: #ff4d4f;
  }
}

.qrcode-tip {
  text-align: center;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 1.6;
  
  p {
    margin: 0;
  }
}
</style>
