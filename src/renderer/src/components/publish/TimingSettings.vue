<template>
  <div class="timing-settings">
    <div class="option-header">
      <div class="option-title">
        <span>定时发表</span>
        <ATooltip title="你可以选择5分钟后至7天内任意时间定时发表，设置后不可修改但可以取消。取消定时不占用通知次数，发表内容也将恢复至草稿箱。">
          <QuestionCircleOutlined class="help-icon" />
        </ATooltip>
      </div>
      <ASwitch v-model:checked="enabledLocal" />
    </div>
    
    <div v-if="enabledLocal" class="timing-selectors">
      <ASelect v-model:value="dateLocal" class="date-select">
        <ASelectOption v-for="item in dateOptions" :key="item.id" :value="item.id">
          {{ item.name }}
        </ASelectOption>
      </ASelect>
      <ATimePicker
        v-model:value="timeLocal"
        format="HH:mm"
        :minute-step="1"
        :disabled-hours="disabledHours"
        :disabled-minutes="disabledMinutes"
        class="time-picker"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { 
  Switch as ASwitch, 
  Select as ASelect, 
  SelectOption as ASelectOption,
  TimePicker as ATimePicker,
  Tooltip as ATooltip 
} from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const props = defineProps({
  // 是否启用定时发表
  enabled: {
    type: Boolean,
    default: false
  },
  // 选中的日期
  date: {
    type: String,
    default: ''
  },
  // 选中的时间
  time: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:enabled', 'update:date', 'update:time'])

// 内部状态
const enabledLocal = ref(props.enabled)
const dateLocal = ref(props.date)
const timeLocal = ref(props.time)

// 日期选项
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
  
  // 设置默认值
  if (!dateLocal.value) {
    dateLocal.value = dateOptions.value[0].id
    emit('update:date', dateLocal.value)
  }
  
  // 设置默认时间（当前时间+5分钟）
  if (!timeLocal.value) {
    const defaultTime = dayjs().add(5, 'minute')
    timeLocal.value = defaultTime
    emit('update:time', defaultTime)
  }
}

// 禁用的小时
const disabledHours = () => {
  if (dateLocal.value === dateOptions.value[0]?.id) {
    // 今天：禁用过去的小时
    const currentHour = dayjs().hour()
    return Array.from({ length: currentHour }, (_, i) => i)
  }
  return []
}

// 禁用的分钟
const disabledMinutes = (selectedHour) => {
  if (dateLocal.value === dateOptions.value[0]?.id) {
    const currentHour = dayjs().hour()
    const currentMinute = dayjs().minute()
    if (selectedHour === currentHour) {
      // 当前小时：禁用过去的分钟 + 5分钟缓冲
      return Array.from({ length: currentMinute + 5 }, (_, i) => i)
    }
  }
  return []
}

// 监听启用状态
watch(enabledLocal, (val) => {
  emit('update:enabled', val)
  if (val) {
    // 每次启用时都重新初始化日期和时间
    initDateOptions()
  }
})

// 监听外部状态
watch(() => props.enabled, (val) => {
  enabledLocal.value = val
})

watch(() => props.date, (val) => {
  dateLocal.value = val
})

watch(() => props.time, (val) => {
  timeLocal.value = val
})

// 监听内部变化
watch(dateLocal, (val) => {
  emit('update:date', val)
})

watch(timeLocal, (val) => {
  emit('update:time', val)
})

// 初始化
onMounted(() => {
  if (props.enabled) {
    initDateOptions()
  }
})
</script>

<style scoped lang="scss">
.timing-settings {
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
</style>
