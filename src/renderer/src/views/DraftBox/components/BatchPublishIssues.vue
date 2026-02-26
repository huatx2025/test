<template>
  <div class="batch-publish-issues">
    <!-- 原创问题 -->
    <div v-if="hasCopyrightIssue" class="issue-section">
      <div class="issue-header" @click="toggleSection('copyright')">
        <div class="issue-title">
          <WarningOutlined class="issue-icon warning" />
          <span>原创问题</span>
        </div>
        <div class="issue-action">
          <span class="issue-count">需要处理</span>
          <DownOutlined :class="{ 'expanded': expandedSections.copyright }" />
        </div>
      </div>
      <div v-show="expandedSections.copyright" class="issue-content">
        <div class="copyright-notice">
          文章命中原创检测，需要以分享方式发表
        </div>
        <div class="copyright-options">
          <ARadioGroup v-model:value="copyrightDecision" @change="handleCopyrightDecisionChange">
            <ARadio value="share">以分享方式发表</ARadio>
            <ARadio value="skip">跳过该文章（所有账号都不发布）</ARadio>
          </ARadioGroup>
          <div v-if="copyrightDecision === 'share'" class="guide-words-section">
            <div class="guide-words-label">编者寄语（可选）：</div>
            <ATextarea
              v-model:value="guideWordsInput"
              :maxlength="140"
              :rows="2"
              placeholder="分享推荐语，可以不填写"
              :show-count="true"
              @change="handleGuideWordsChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 通知次数不足 -->
    <div v-if="quotaIssueAccounts.length > 0" class="issue-section">
      <div class="issue-header" @click="toggleSection('quota')">
        <div class="issue-title">
          <WarningOutlined class="issue-icon warning" />
          <span>通知次数不足（{{ quotaIssueAccounts.length }}个账号）</span>
        </div>
        <div class="issue-action">
          <DownOutlined :class="{ 'expanded': expandedSections.quota }" />
        </div>
      </div>
      <div v-show="expandedSections.quota" class="issue-content">
        <div
          v-for="account in quotaIssueAccounts"
          :key="account.id"
          class="account-issue-item"
        >
          <div class="account-info">
            <AAvatar :src="account.avatar" :size="32">
              {{ account.name?.charAt(0) || '账' }}
            </AAvatar>
            <span class="account-name">{{ account.name }}</span>
            <span class="issue-desc">今日通知次数已用完</span>
          </div>
          <div class="account-actions">
            <ASelect
              :value="account.decisions.skipReason === 'quota_skip' ? 'skip' : 'free'"
              size="small"
              style="width: 150px"
              @change="(val) => handleQuotaDecision(account, val)"
            >
              <ASelectOption value="free">使用免通知发布</ASelectOption>
              <ASelectOption value="skip">跳过该账号</ASelectOption>
            </ASelect>
          </div>
        </div>
      </div>
    </div>

    <!-- 需要扫码验证 -->
    <div v-if="qrcodeIssueAccounts.length > 0" class="issue-section">
      <div class="issue-header" @click="toggleSection('qrcode')">
        <div class="issue-title">
          <LockOutlined class="issue-icon lock" />
          <span>需要扫码验证（{{ qrcodeIssueAccounts.length }}个账号）</span>
        </div>
        <div class="issue-action">
          <span class="issue-count">{{ validatedQrcodeCount }}/{{ qrcodeIssueAccounts.length }} 已验证</span>
          <DownOutlined :class="{ 'expanded': expandedSections.qrcode }" />
        </div>
      </div>
      <div v-show="expandedSections.qrcode" class="issue-content">
        <div
          v-for="account in qrcodeIssueAccounts"
          :key="account.id"
          class="account-issue-item"
        >
          <div class="account-info">
            <AAvatar :src="account.avatar" :size="32">
              {{ account.name?.charAt(0) || '账' }}
            </AAvatar>
            <span class="account-name">{{ account.name }}</span>
          </div>
          <div class="account-actions">
            <template v-if="account.decisions.qrcodeValidated">
              <CheckCircleOutlined class="validated-icon" />
              <span class="validated-text">已验证</span>
            </template>
            <template v-else-if="account.decisions.skipReason">
              <span class="skipped-text">已跳过</span>
            </template>
            <template v-else>
              <AButton
                size="small"
                type="primary"
                :loading="validatingAccountId === account.id"
                @click="handleStartQrcodeValidation(account)"
              >
                点击扫码
              </AButton>
              <AButton
                size="small"
                @click="handleSkipQrcode(account)"
              >
                跳过
              </AButton>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 同步/检测失败的账号 -->
    <div v-if="failedAccounts.length > 0" class="issue-section">
      <div class="issue-header" @click="toggleSection('failed')">
        <div class="issue-title">
          <CloseCircleOutlined class="issue-icon error" />
          <span>失败账号（{{ failedAccounts.length }}个）</span>
        </div>
        <div class="issue-action">
          <DownOutlined :class="{ 'expanded': expandedSections.failed }" />
        </div>
      </div>
      <div v-show="expandedSections.failed" class="issue-content">
        <div
          v-for="account in failedAccounts"
          :key="account.id"
          class="account-issue-item failed"
        >
          <div class="account-info">
            <AAvatar :src="account.avatar" :size="32">
              {{ account.name?.charAt(0) || '账' }}
            </AAvatar>
            <span class="account-name">{{ account.name }}</span>
            <span class="error-msg">{{ account.syncError || account.checkError || '未知错误' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 就绪账号统计 -->
    <div class="ready-summary">
      <CheckCircleOutlined class="ready-icon" />
      <span>就绪账号：{{ readyAccountsCount }}个</span>
      <span v-if="skippedAccountsCount > 0" class="skipped-count">| 跳过：{{ skippedAccountsCount }}个</span>
    </div>

    <!-- 扫码验证组件 -->
    <QrcodeValidator
      v-if="currentValidatingAccount"
      ref="qrcodeValidatorRef"
      :account-id="currentValidatingAccount.id"
      :appmsg-id="currentValidatingAccount.syncedAppmsgid"
      :operation-seq="currentValidatingAccount.checkResult?.operationSeq"
      :has-notify="state?.publishParams?.hasNotify"
      @success="handleQrcodeSuccess"
      @cancel="handleQrcodeCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  Avatar as AAvatar, 
  Button as AButton, 
  Select as ASelect, 
  SelectOption as ASelectOption,
  Radio as ARadio,
  RadioGroup as ARadioGroup,
  Textarea as ATextarea
} from 'ant-design-vue'
import { 
  WarningOutlined, 
  LockOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  DownOutlined 
} from '@ant-design/icons-vue'
import QrcodeValidator from '@/components/common/QrcodeValidator.vue'

const props = defineProps({
  // 批量发布状态
  state: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:state'])

// 展开的区域
const expandedSections = ref({
  copyright: true,
  quota: true,
  qrcode: true,
  failed: false
})

// 原创问题决策
const copyrightDecision = ref('share')
const guideWordsInput = ref('')

// 扫码验证
const qrcodeValidatorRef = ref(null)
const validatingAccountId = ref(null)
const currentValidatingAccount = ref(null)

// 是否有原创问题
const hasCopyrightIssue = computed(() => {
  if (!props.state) return false
  return props.state.sourceDraft?.copyrightResult?.copyright === 1
})

// 通知次数不足的账号
const quotaIssueAccounts = computed(() => {
  if (!props.state?.targetAccounts) return []
  
  // 确定要检查的日期：如果有定时发表时间，使用发布日期；否则使用今天
  let targetDateStr = ''
  const sendTime = props.state.publishParams?.sendTime || 0
  if (sendTime > 0) {
    const sendDate = new Date(sendTime * 1000)
    targetDateStr = `${sendDate.getFullYear()}${String(sendDate.getMonth() + 1).padStart(2, '0')}${String(sendDate.getDate()).padStart(2, '0')}`
  } else {
    const today = new Date()
    targetDateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  }
  
  console.log('[quotaIssueAccounts] 检查通知次数 - 目标日期:', targetDateStr, '发布时间戳:', sendTime, 'hasNotify:', props.state.publishParams?.hasNotify)
  
  return props.state.targetAccounts.filter(account => {
    if (account.syncStatus !== 'synced' || account.checkStatus !== 'checked') return false
    
    const quotaItem = account.checkResult?.quotaInfo?.find(item => item.str_date === targetDateStr)
    const quota = quotaItem?.quota || 0
    
    console.log('[quotaIssueAccounts] 账号:', account.name, 'quotaInfo:', account.checkResult?.quotaInfo, '目标日期quota:', quota)
    
    return quota <= 0 && props.state.publishParams?.hasNotify
  })
})

// 需要扫码验证的账号
const qrcodeIssueAccounts = computed(() => {
  if (!props.state?.targetAccounts) return []
  return props.state.targetAccounts.filter(account => {
    if (account.syncStatus !== 'synced' || account.checkStatus !== 'checked') return false
    return account.checkResult?.needScanQrcode && !account.decisions?.skipReason
  })
})

// 已验证扫码的账号数量
const validatedQrcodeCount = computed(() => {
  return qrcodeIssueAccounts.value.filter(a => a.decisions?.qrcodeValidated).length
})

// 失败的账号
const failedAccounts = computed(() => {
  if (!props.state?.targetAccounts) return []
  return props.state.targetAccounts.filter(account => {
    return account.syncStatus === 'failed' || account.checkStatus === 'failed'
  })
})

// 就绪账号数量
const readyAccountsCount = computed(() => {
  if (!props.state?.targetAccounts) return 0
  return props.state.targetAccounts.filter(account => {
    if (account.syncStatus !== 'synced') return false
    if (account.decisions?.skipReason) return false
    
    // 需要扫码但未验证的不算就绪
    if (account.checkResult?.needScanQrcode && !account.decisions?.qrcodeValidated) {
      return false
    }
    
    return true
  }).length
})

// 跳过的账号数量
const skippedAccountsCount = computed(() => {
  if (!props.state?.targetAccounts) return 0
  return props.state.targetAccounts.filter(account => {
    return account.decisions?.skipReason
  }).length
})

// 切换展开区域
const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section]
}

// 处理原创决策变化
const handleCopyrightDecisionChange = () => {
  if (!props.state?.targetAccounts) return
  
  // 如果选择跳过，标记所有账号
  if (copyrightDecision.value === 'skip') {
    props.state.targetAccounts.forEach(account => {
      account.decisions.skipReason = 'copyright_skip'
    })
  } else {
    // 恢复
    props.state.targetAccounts.forEach(account => {
      if (account.decisions.skipReason === 'copyright_skip') {
        account.decisions.skipReason = null
      }
    })
  }
}

// 处理编者寄语变化
const handleGuideWordsChange = () => {
  if (!props.state?.publishParams) return
  props.state.publishParams.guideWords = [guideWordsInput.value]
}

// 处理通知次数决策
const handleQuotaDecision = (account, value) => {
  console.log('[handleQuotaDecision] 账号:', account.name, '选择:', value)
  if (value === 'skip') {
    account.decisions.skipReason = 'quota_skip'
    account.decisions.useNotify = false
  } else {
    // 选择免通知发布
    account.decisions.skipReason = null
    account.decisions.useNotify = false
  }
  console.log('[handleQuotaDecision] 更新后 decisions:', JSON.stringify(account.decisions))
}

// 开始扫码验证
const handleStartQrcodeValidation = async (account) => {
  validatingAccountId.value = account.id
  currentValidatingAccount.value = account
  
  const result = await qrcodeValidatorRef.value?.startValidation()
  
  validatingAccountId.value = null
  
  if (result?.success) {
    account.decisions.qrcodeValidated = true
    account.decisions.qrcodeUuid = result.uuid
  }
}

// 扫码成功回调
const handleQrcodeSuccess = (result) => {
  if (currentValidatingAccount.value) {
    currentValidatingAccount.value.decisions.qrcodeValidated = true
    currentValidatingAccount.value.decisions.qrcodeUuid = result.uuid
  }
  currentValidatingAccount.value = null
}

// 扫码取消回调
const handleQrcodeCancel = () => {
  validatingAccountId.value = null
  currentValidatingAccount.value = null
}

// 跳过扫码
const handleSkipQrcode = (account) => {
  account.decisions.skipReason = 'qrcode_skip'
}

// 暴露方法
defineExpose({
  // 检查是否所有问题都已处理
  isAllIssuesResolved: () => {
    // 原创问题
    if (hasCopyrightIssue.value && copyrightDecision.value === 'skip') {
      return false // 跳过发布
    }
    
    // 扫码验证
    const unvalidatedQrcode = qrcodeIssueAccounts.value.filter(
      a => !a.decisions?.qrcodeValidated && !a.decisions?.skipReason
    )
    if (unvalidatedQrcode.length > 0) {
      return false
    }
    
    return true
  },
  
  // 获取可发布的账号数量
  getPublishableCount: () => readyAccountsCount.value,
  
  // 获取原创决策
  getCopyrightDecision: () => copyrightDecision.value
})
</script>

<style scoped lang="scss">
.batch-publish-issues {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.issue-section {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.issue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fafafa;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: #f5f5f5;
  }
}

.issue-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #262626;
}

.issue-icon {
  font-size: 16px;
  
  &.warning {
    color: #faad14;
  }
  
  &.lock {
    color: #1890ff;
  }
  
  &.error {
    color: #ff4d4f;
  }
}

.issue-action {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .issue-count {
    font-size: 13px;
    color: #8c8c8c;
  }
  
  .anticon-down {
    transition: transform 0.2s;
    color: #8c8c8c;
    
    &.expanded {
      transform: rotate(180deg);
    }
  }
}

.issue-content {
  padding: 16px;
  border-top: 1px solid #e8e8e8;
}

.copyright-notice {
  margin-bottom: 12px;
  font-size: 14px;
  color: #595959;
}

.copyright-options {
  :deep(.ant-radio-group) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.guide-words-section {
  margin-top: 12px;
  padding-left: 24px;
  
  .guide-words-label {
    margin-bottom: 8px;
    font-size: 13px;
    color: #595959;
  }
}

.account-issue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 6px;
  background: #fafafa;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.failed {
    background: #fff2f0;
  }
}

.account-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.account-name {
  font-weight: 500;
  color: #262626;
}

.issue-desc {
  font-size: 13px;
  color: #8c8c8c;
}

.error-msg {
  font-size: 13px;
  color: #ff4d4f;
}

.account-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.validated-icon {
  color: #52c41a;
  font-size: 16px;
}

.validated-text {
  color: #52c41a;
  font-size: 13px;
}

.skipped-text {
  color: #8c8c8c;
  font-size: 13px;
}

.ready-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  color: #52c41a;
  font-weight: 500;
}

.ready-icon {
  font-size: 16px;
}

.skipped-count {
  color: #8c8c8c;
  font-weight: normal;
}
</style>
