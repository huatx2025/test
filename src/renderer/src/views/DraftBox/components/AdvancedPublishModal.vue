<template>
  <AModal
    v-model:open="visible"
    title="高级群发"
    :width="720"
    :mask-closable="false"
    :keyboard="false"
    :closable="!publishing && !syncing"
    class="advanced-publish-modal"
    @cancel="handleCancel"
  >
    <ASpin :spinning="dialogLoading || syncing" :tip="syncing ? syncTip : '加载中...'">
      <div class="modal-content">
        <!-- 账户选择区域 -->
        <div class="section-card account-section">
          <div class="section-header">
            <div class="section-title">
              <span>发布到账号</span>
            </div>
            <AButton type="link" size="small" class="select-more-btn" @click="handleSelectMore">
              <template #icon>
                <PlusOutlined />
              </template>
              选择更多
            </AButton>
          </div>
          
          <div class="selected-accounts">
            <div v-if="selectedAccounts.length > 0" class="accounts-list">
              <div 
                v-for="account in selectedAccounts" 
                :key="account.id" 
                class="account-tag"
              >
                <AAvatar :src="account.avatar" :size="24">
                  {{ account.name?.charAt(0) || '账' }}
                </AAvatar>
                <span class="account-name">{{ account.name }}</span>
                <CloseOutlined class="remove-icon" @click="removeAccount(account.id)" />
              </div>
            </div>
            <div class="accounts-summary">
              当前已选择 <span class="count">{{ selectedAccounts.length }}</span> 个账号
            </div>
          </div>
        </div>

        <!-- 发布参数设置 -->
        <div class="section-card settings-section">
          <div class="section-header">
            <div class="section-title">
              <span>发布参数</span>
            </div>
          </div>
          
          <!-- 群发通知 -->
          <div class="publish-option">
            <div class="option-header">
              <div class="option-title">
                <span>群发通知</span>
                <ATooltip title="开启群发通知，内容将展示在公众号主页，并有可能获得平台推荐。">
                  <QuestionCircleOutlined class="help-icon" />
                </ATooltip>
              </div>
              <ASwitch v-model:checked="hasNotify" />
            </div>
            <div class="option-desc">
              开启后将消耗各账号的群发通知次数
            </div>
          </div>

          <!-- 定时发表 -->
          <div class="publish-option">
            <div class="option-header">
              <div class="option-title">
                <span>定时发表</span>
                <ATooltip title="你可以选择5分钟后至7天内任意时间定时发表">
                  <QuestionCircleOutlined class="help-icon" />
                </ATooltip>
              </div>
              <ASwitch v-model:checked="timingEnabled" />
            </div>
            
            <div v-if="timingEnabled" class="timing-selectors">
              <ASelect v-model:value="selectedDate" class="date-select">
                <ASelectOption v-for="item in dateOptions" :key="item.id" :value="item.id">
                  {{ item.name }}
                </ASelectOption>
              </ASelect>
              <ATimePicker
                v-model:value="selectedTime"
                format="HH:mm"
                :minute-step="1"
                :disabled-hours="disabledHours"
                :disabled-minutes="disabledMinutes"
                class="time-picker"
              />
            </div>
          </div>
        </div>
      </div>
    </ASpin>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="modal-footer">
        <AButton @click="handleCancel" :disabled="publishing || syncing">取消</AButton>
        <AButton 
          type="primary" 
          :loading="publishing"
          :disabled="selectedAccounts.length === 0 || selectedDrafts.length === 0"
          @click="handleStartPublish"
        >
          {{ publishing ? '准备中...' : '开始群发' }}
        </AButton>
      </div>
    </template>
  </AModal>

  <!-- 账号选择弹窗 -->
  <AccountSelector
    v-model:visible="accountSelectorVisible"
    :exclude-account-ids="excludeAccountIds"
    ok-text="确认选择"
    @confirm="handleAccountSelectorConfirm"
    @cancel="handleAccountSelectorCancel"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { 
  Modal as AModal, 
  Button as AButton, 
  Switch as ASwitch, 
  Select as ASelect, 
  SelectOption as ASelectOption,
  TimePicker as ATimePicker,
  Tooltip as ATooltip,
  Spin as ASpin,
  Avatar as AAvatar,
  message 
} from 'ant-design-vue'
import { QuestionCircleOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import AccountSelector from '@/components/common/AccountSelector.vue'
import { getDraftDetail, operateWechatDraft, getMasssendInfo, publishAppmsg } from '@/.thidparty_api/wechat'
import { convertAppMsgInfoToParams } from '@/utils/wechat/appmsg'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  // 选中的草稿列表 [{ draft, accountId, accountName, accountAvatar }]
  selectedDrafts: {
    type: Array,
    default: () => []
  },
  // 当前选中的账户
  currentAccount: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:open', 'success', 'cancel'])

// 本地显示状态
const visible = ref(props.open)

// 加载状态
const dialogLoading = ref(false)
const publishing = ref(false)

// 同步状态
const syncing = ref(false)
const syncTip = ref('')
const syncProgress = ref({ current: 0, total: 0 })

// 账号选择弹窗
const accountSelectorVisible = ref(false)

// 选中的目标账号列表
const selectedAccounts = ref([])

// 排除的账号ID（草稿所属的账号）
const excludeAccountIds = computed(() => {
  // 不再排除，允许发布到任何账号
  return []
})

// 群发通知
const hasNotify = ref(true)

// 定时发表
const timingEnabled = ref(false)
const selectedDate = ref('')
const selectedTime = ref(null)
const dateOptions = ref([])

// 初始化日期选项
const initDateOptions = () => {
  const today = new Date()
  dateOptions.value = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    return {
      id: dateStr,
      name: i === 0 ? '今天' : i === 1 ? '明天' : `${date.getMonth() + 1}月${date.getDate()}日`
    }
  })
  selectedDate.value = dateOptions.value[0].id
  
  // 设置默认时间（当前时间+5分钟）
  const defaultTime = dayjs().add(5, 'minute')
  selectedTime.value = defaultTime
}

// 禁用的小时
const disabledHours = () => {
  if (selectedDate.value === dateOptions.value[0]?.id) {
    const currentHour = dayjs().hour()
    return Array.from({ length: currentHour }, (_, i) => i)
  }
  return []
}

// 禁用的分钟
const disabledMinutes = (selectedHour) => {
  if (selectedDate.value === dateOptions.value[0]?.id) {
    const currentHour = dayjs().hour()
    const currentMinute = dayjs().minute()
    if (selectedHour === currentHour) {
      return Array.from({ length: currentMinute + 5 }, (_, i) => i)
    }
  }
  return []
}

// 监听 props.open 变化
watch(
  () => props.open,
  async (newVal) => {
    visible.value = newVal
    if (newVal) {
      await initDialog()
    }
  }
)

// 监听 visible 变化
watch(visible, (newVal) => {
  emit('update:open', newVal)
})

// 初始化对话框
const initDialog = async () => {
  // 重置状态
  hasNotify.value = true
  timingEnabled.value = false
  publishing.value = false
  dialogLoading.value = false
  
  // 默认添加当前选中的账户
  if (props.currentAccount) {
    selectedAccounts.value = [props.currentAccount]
  } else {
    selectedAccounts.value = []
  }
  
  // 初始化日期选项
  initDateOptions()
}

// 选择更多账号
const handleSelectMore = () => {
  accountSelectorVisible.value = true
}

// 确认选择账号
const handleAccountSelectorConfirm = (accounts) => {
  // 合并选择的账号，避免重复
  const existingIds = new Set(selectedAccounts.value.map(a => a.id))
  const newAccounts = accounts.filter(a => !existingIds.has(a.id))
  selectedAccounts.value = [...selectedAccounts.value, ...newAccounts]
  accountSelectorVisible.value = false
}

// 取消选择账号
const handleAccountSelectorCancel = () => {
  accountSelectorVisible.value = false
}

// 移除账号
const removeAccount = (accountId) => {
  selectedAccounts.value = selectedAccounts.value.filter(a => a.id !== accountId)
}

// 发布任务列表
// 结构: [{ draftItem, accountId, accountName, appmsgid, operationSeq, status }]
const publishTasks = ref([])

// 开始群发
const handleStartPublish = async () => {
  if (selectedAccounts.value.length === 0) {
    message.warning('请先选择要发布的账号')
    return
  }
  
  if (props.selectedDrafts.length === 0) {
    message.warning('没有可发布的草稿')
    return
  }
  
  publishing.value = true
  
  try {
    // 第一步：同步草稿到目标账号，收集发布任务
    const syncResults = await syncDraftsToAccounts()
    
    // 第二步：执行批量发布
    await executeBatchPublish(syncResults)
    
    message.success('批量发布完成')
    
    // 关闭弹窗
    visible.value = false
    emit('success')
    
  } catch (error) {
    console.error('群发失败:', error)
    message.error(error.message || '群发失败')
  } finally {
    publishing.value = false
    syncing.value = false
  }
}

// 同步草稿到目标账号
const syncDraftsToAccounts = async () => {
  syncing.value = true
  
  // 收集所有发布任务
  // 包括：草稿所属账号（无需同步，直接使用原 appmsgid）+ 其他账号（需要同步）
  const allPublishTasks = []
  
  for (const draftItem of props.selectedDrafts) {
    const draftTitle = draftItem.draft.multi_item?.[0]?.title || '无标题'
    
    for (const account of selectedAccounts.value) {
      if (account.id === draftItem.accountId) {
        // 草稿所属账号，无需同步，直接添加发布任务
        allPublishTasks.push({
          draftItem,
          draftTitle,
          accountId: account.id,
          accountName: account.name,
          appmsgid: draftItem.draft.app_id,
          needSync: false,
          syncSuccess: true
        })
      } else {
        // 其他账号，需要同步
        allPublishTasks.push({
          draftItem,
          draftTitle,
          accountId: account.id,
          accountName: account.name,
          appmsgid: null,
          needSync: true,
          syncSuccess: false
        })
      }
    }
  }
  
  // 过滤需要同步的任务
  const syncTasks = allPublishTasks.filter(t => t.needSync)
  
  if (syncTasks.length === 0) {
    syncTip.value = '无需同步'
    return allPublishTasks
  }
  
  // 按草稿分组，避免重复获取草稿详情
  const draftDetailsCache = new Map()
  
  syncProgress.value = { current: 0, total: syncTasks.length }
  let currentProgress = 0
  
  // 逐个同步
  for (const task of syncTasks) {
    currentProgress++
    syncProgress.value.current = currentProgress
    syncTip.value = `正在同步《${task.draftTitle}》到《${task.accountName}》(${currentProgress}/${syncTasks.length})`
    
    // 获取草稿详情（使用缓存）
    const cacheKey = `${task.draftItem.accountId}_${task.draftItem.draft.app_id}`
    let draftDetail = draftDetailsCache.get(cacheKey)
    
    if (!draftDetail) {
      try {
        syncTip.value = `正在获取《${task.draftTitle}》详情...`
        const detailResult = await getDraftDetail(task.draftItem.accountId, task.draftItem.draft.app_id)
        if (!detailResult.success) {
          throw new Error('获取草稿详情失败')
        }
        draftDetail = detailResult.app_msg_info
        draftDetailsCache.set(cacheKey, draftDetail)
      } catch (error) {
        console.error('获取草稿详情失败:', error)
        task.syncSuccess = false
        task.error = '获取草稿详情失败'
        continue
      }
    }
    
    // 执行同步
    syncTip.value = `正在同步《${task.draftTitle}》到《${task.accountName}》(${currentProgress}/${syncTasks.length})`
    
    try {
      const params = convertAppMsgInfoToParams(draftDetail)
      const result = await operateWechatDraft(task.accountId, 'create', params)
      
      task.appmsgid = result.appmsgid
      task.syncSuccess = true
    } catch (error) {
      console.error(`同步到《${task.accountName}》失败:`, error)
      task.syncSuccess = false
      task.error = error.message
    }
    
    // 延迟
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // 统计结果
  const successCount = syncTasks.filter(t => t.syncSuccess).length
  const failedCount = syncTasks.filter(t => !t.syncSuccess).length
  
  syncTip.value = `同步完成：成功 ${successCount} 个，失败 ${failedCount} 个`
  
  return allPublishTasks
}

// 执行批量发布
const executeBatchPublish = async (publishTasks) => {
  // 过滤出可以发布的任务（同步成功的）
  const tasksToPublish = publishTasks.filter(t => t.syncSuccess && t.appmsgid)
  
  if (tasksToPublish.length === 0) {
    throw new Error('没有可发布的任务')
  }
  
  syncing.value = true
  syncProgress.value = { current: 0, total: tasksToPublish.length }
  
  // 计算发布时间
  let sendTime = 0
  if (timingEnabled.value && selectedTime.value) {
    const dateStr = selectedDate.value
    const timeStr = selectedTime.value.format('HH:mm')
    const dateTimeStr = `${dateStr} ${timeStr}:00`
    sendTime = Math.floor(new Date(dateTimeStr).getTime() / 1000)
  }
  
  // 发布结果统计
  let successCount = 0
  let failedCount = 0
  const failedItems = []
  
  // 逐个发布
  for (let i = 0; i < tasksToPublish.length; i++) {
    const task = tasksToPublish[i]
    
    syncProgress.value.current = i + 1
    syncTip.value = `正在发布《${task.draftTitle}》到《${task.accountName}》(${i + 1}/${tasksToPublish.length})`
    
    try {
      // 获取群发信息
      const masssendInfo = await getMasssendInfo(task.accountId, task.appmsgid)
      
      // 检查是否需要扫码（暂时跳过需要扫码的账号）
      if (masssendInfo.needScanQrcode) {
        console.log(`账号《${task.accountName}》需要扫码验证，暂时跳过`)
        failedCount++
        failedItems.push({
          ...task,
          error: '需要扫码验证'
        })
        continue
      }
      
      // 执行发布
      const publishResult = await publishAppmsg(task.accountId, {
        appmsgid: task.appmsgid,
        sendTime,
        hasNotify: hasNotify.value,
        isFreePublish: !hasNotify.value,
        operationSeq: masssendInfo.operationSeq,
        appmsgItemCount: task.draftItem.draft.multi_item?.length || 1
      })
      
      if (publishResult.success) {
        successCount++
        console.log(`发布到《${task.accountName}》成功`)
      } else {
        throw new Error(publishResult.msg || '发布失败')
      }
      
    } catch (error) {
      console.error(`发布到《${task.accountName}》失败:`, error)
      failedCount++
      failedItems.push({
        ...task,
        error: error.message
      })
    }
    
    // 延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 显示结果
  syncTip.value = `发布完成：成功 ${successCount} 个，失败 ${failedCount} 个`
  
  if (failedCount > 0) {
    console.log('发布失败的项目:', failedItems)
    message.warning(`${failedCount} 个账号发布失败，请查看控制台`)
  }
  
  return { successCount, failedCount, failedItems }
}

// 取消
const handleCancel = () => {
  if (publishing.value || syncing.value) return
  emit('cancel')
  visible.value = false
}
</script>

<style scoped lang="scss">
.advanced-publish-modal {
  :deep(.ant-modal-body) {
    padding: 16px 24px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 500;
  color: #262626;
}

.help-icon {
  color: #8c8c8c;
  font-size: 14px;
  cursor: help;
}

.select-more-btn {
  padding: 0;
  height: auto;
  font-size: 13px;
}

/* 账户选择区域 */
.account-section {
  .accounts-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .account-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px 4px 4px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 16px;
    font-size: 13px;
    user-select: none;
    
    .account-name {
      color: #262626;
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .remove-icon {
      color: #ff4d4f;
      font-size: 12px;
      cursor: pointer;
      padding: 2px;
      opacity: 0.7;
      
      &:hover {
        opacity: 1;
      }
    }
  }
  
  .accounts-summary {
    font-size: 12px;
    color: #8c8c8c;
    
    .count {
      color: #1890ff;
      font-weight: 500;
    }
  }
}

/* 发布参数区域 */
.settings-section {
  .publish-option {
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    &:first-of-type {
      padding-top: 0;
    }
  }
  
  .option-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .option-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #262626;
  }
  
  .option-desc {
    margin-top: 4px;
    font-size: 12px;
    color: #8c8c8c;
  }
  
  .timing-selectors {
    display: flex;
    gap: 12px;
    margin-top: 12px;
  }
  
  .date-select {
    width: 140px;
  }
  
  .time-picker {
    width: 120px;
  }
}

.modal-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
