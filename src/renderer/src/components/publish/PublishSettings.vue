<template>
  <div class="publish-settings">
    <!-- 群发通知 -->
    <div class="publish-option-card">
      <div class="option-header">
        <div class="option-title">
          <span>群发通知</span>
          <ATooltip title="开启群发通知，内容将展示在公众号主页，并有可能获得平台推荐。">
            <QuestionCircleOutlined class="help-icon" />
          </ATooltip>
        </div>
        <ASwitch v-model:checked="hasNotifyLocal" :disabled="hasQuotaData && notifyRemain <= 0" />
      </div>
      <div class="option-desc">
        {{ notificationHintText }}
      </div>
      
      <!-- 分组通知 -->
      <GroupNotifySettings
        v-if="hasNotifyLocal"
        v-model:enabled="groupNotifyEnabled"
        v-model:params="groupNotifyParams"
        :account-id="accountId"
        :contact-group-list="contactGroupList"
      />
    </div>

    <!-- 定时发表 -->
    <TimingSettings
      v-model:enabled="timingEnabled"
      v-model:date="selectedDateLocal"
      v-model:time="selectedTimeLocal"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Switch as ASwitch, Tooltip as ATooltip } from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import GroupNotifySettings from './GroupNotifySettings.vue'
import TimingSettings from './TimingSettings.vue'

const props = defineProps({
  // 当前账号ID（用于获取地区数据，批量模式传主账号）
  accountId: {
    type: [String, Number],
    default: null
  },
  // 通知次数列表
  quotaItemList: {
    type: Array,
    default: () => []
  },
  // 用户标签列表
  contactGroupList: {
    type: Array,
    default: () => []
  },
  // 已选择的日期（v-model）
  selectedDate: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:params', 'update:selectedDate'])

// 内部状态
const hasNotifyLocal = ref(true)
const groupNotifyEnabled = ref(false)
const groupNotifyParams = ref({ groupid: -1, sex: -1, country: '', province: '', city: '' })
const timingEnabled = ref(false)
const selectedDateLocal = ref(props.selectedDate)
const selectedTimeLocal = ref(null)

// 根据选择的日期获取对应的通知次数
const currentQuotaInfo = computed(() => {
  // 确定要查询的日期
  let targetDateStr = ''
  if (timingEnabled.value && selectedDateLocal.value) {
    targetDateStr = selectedDateLocal.value.replace(/-/g, '')
  } else {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    targetDateStr = `${year}${month}${day}`
  }
  
  // 从 quotaItemList 中找到对应日期的次数
  const quotaItem = props.quotaItemList.find(item => item.str_date === targetDateStr)
  
  return {
    quota: quotaItem?.quota || 0,
    dateStr: targetDateStr
  }
})

// 当前选择日期的通知剩余次数
const notifyRemain = computed(() => currentQuotaInfo.value.quota)

// 是否有通知次数数据
const hasQuotaData = computed(() => props.quotaItemList && props.quotaItemList.length > 0)

// 格式化通知次数提示文字
const notificationHintText = computed(() => {
  // 没有通知次数数据时，显示通用提示
  if (!hasQuotaData.value) {
    return '开启后用户将收到通知'
  }
  
  const quota = currentQuotaInfo.value.quota
  const dateStr = currentQuotaInfo.value.dateStr
  
  const month = parseInt(dateStr.substring(4, 6))
  const day = parseInt(dateStr.substring(6, 8))
  
  // 判断是否是今天或明天
  const today = new Date()
  const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')}`
  
  let dateLabel = ''
  if (dateStr === todayStr) {
    dateLabel = '今天'
  } else if (dateStr === tomorrowStr) {
    dateLabel = '明天'
  } else {
    dateLabel = `${month}月${day}日`
  }
  
  if (quota <= 0) {
    return `${dateLabel}通知次数已用完`
  }
  return `${dateLabel}还有${quota}次通知次数`
})

// 监听通知次数变化，自动开关群发通知（只在有通知次数数据时生效）
watch([notifyRemain, hasQuotaData], ([remain, hasData]) => {
  if (hasData) {
    hasNotifyLocal.value = remain > 0
  }
}, { immediate: true })

// 计算发布时间戳
const calculateSendTime = () => {
  if (!timingEnabled.value || !selectedTimeLocal.value) return 0
  const dateStr = selectedDateLocal.value
  const timeStr = selectedTimeLocal.value.format('HH:mm')
  const dateTimeStr = `${dateStr} ${timeStr}:00`
  return Math.floor(new Date(dateTimeStr).getTime() / 1000)
}

// 构建并输出参数
const buildAndEmitParams = () => {
  const params = {
    hasNotify: hasNotifyLocal.value,
    isFreePublish: !hasNotifyLocal.value,
    sendTime: calculateSendTime(),
    groupNotify: groupNotifyEnabled.value 
      ? { enabled: true, ...groupNotifyParams.value } 
      : { enabled: false }
  }
  emit('update:params', params)
}

// 监听变化，输出参数
watch([hasNotifyLocal, groupNotifyEnabled, groupNotifyParams, timingEnabled, selectedDateLocal, selectedTimeLocal], () => {
  buildAndEmitParams()
}, { deep: true })

// 同步外部 selectedDate
watch(() => props.selectedDate, (val) => {
  selectedDateLocal.value = val
})

watch(selectedDateLocal, (val) => {
  emit('update:selectedDate', val)
})

// 暴露方法供父组件调用
defineExpose({
  getParams: () => ({
    hasNotify: hasNotifyLocal.value,
    isFreePublish: !hasNotifyLocal.value,
    sendTime: calculateSendTime(),
    groupNotifyEnabled: groupNotifyEnabled.value,
    groupNotifyParams: groupNotifyParams.value,
    timingEnabled: timingEnabled.value
  }),
  reset: () => {
    hasNotifyLocal.value = true
    groupNotifyEnabled.value = false
    groupNotifyParams.value = { groupid: -1, sex: -1, country: '', province: '', city: '' }
    timingEnabled.value = false
    selectedDateLocal.value = ''
    selectedTimeLocal.value = null
  }
})
</script>

<style scoped lang="scss">
.publish-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.publish-option-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px 20px;
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
  font-size: 15px;
  font-weight: 500;
  color: #262626;
}

.help-icon {
  color: #8c8c8c;
  font-size: 14px;
  cursor: help;
}

.option-desc {
  margin-top: 4px;
  font-size: 13px;
  color: #8c8c8c;
}
</style>
