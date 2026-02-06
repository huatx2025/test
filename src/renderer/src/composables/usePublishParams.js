import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'

/**
 * 发布参数管理 composable
 * 用于单账号发布和批量发布共用
 * @param {Object} options - 配置选项
 * @param {Array} options.quotaItemList - 通知次数列表
 */
export function usePublishParams(options = {}) {
  // 群发通知
  const hasNotify = ref(true)
  const quotaItemList = ref(options.quotaItemList || [])
  
  // 分组通知
  const groupNotifyEnabled = ref(false)
  const groupNotifyParams = ref({
    groupid: -1,
    sex: -1,
    country: '',
    province: '',
    city: ''
  })
  
  // 定时发表
  const timingEnabled = ref(false)
  const selectedDate = ref('')
  const selectedTime = ref(null)
  
  // 日期选项
  const dateOptions = ref([])
  
  /**
   * 初始化日期选项（7天内）
   */
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
  
  /**
   * 计算指定日期的通知剩余次数
   * @param {string} dateStr - 日期字符串，格式：YYYY-MM-DD
   * @returns {number} 通知次数
   */
  const getQuotaForDate = (dateStr) => {
    const targetDateStr = dateStr.replace(/-/g, '')
    const quotaItem = quotaItemList.value.find(item => item.str_date === targetDateStr)
    return quotaItem?.quota || 0
  }
  
  /**
   * 当前选择日期的通知剩余次数
   */
  const currentQuota = computed(() => {
    let targetDateStr = ''
    if (timingEnabled.value && selectedDate.value) {
      targetDateStr = selectedDate.value
    } else {
      const today = new Date()
      targetDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    }
    return getQuotaForDate(targetDateStr)
  })
  
  /**
   * 通知次数提示文字
   */
  const notificationHint = computed(() => {
    const quota = currentQuota.value
    
    // 确定要查询的日期
    let targetDateStr = ''
    if (timingEnabled.value && selectedDate.value) {
      targetDateStr = selectedDate.value.replace(/-/g, '')
    } else {
      const today = new Date()
      targetDateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    }
    
    const month = parseInt(targetDateStr.substring(4, 6))
    const day = parseInt(targetDateStr.substring(6, 8))
    
    // 判断是否是今天或明天
    const today = new Date()
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')}`
    
    let dateLabel = ''
    if (targetDateStr === todayStr) {
      dateLabel = '今天'
    } else if (targetDateStr === tomorrowStr) {
      dateLabel = '明天'
    } else {
      dateLabel = `${month}月${day}日`
    }
    
    if (quota <= 0) {
      return `${dateLabel}通知次数已用完`
    }
    return `${dateLabel}还有${quota}次通知次数`
  })
  
  /**
   * 计算发布时间戳
   * @returns {number} Unix时间戳（秒），0表示立即发布
   */
  const calculateSendTime = () => {
    if (!timingEnabled.value || !selectedTime.value) return 0
    const dateStr = selectedDate.value
    const timeStr = selectedTime.value.format('HH:mm')
    const dateTimeStr = `${dateStr} ${timeStr}:00`
    return Math.floor(new Date(dateTimeStr).getTime() / 1000)
  }
  
  /**
   * 禁用的小时（定时发表用）
   */
  const getDisabledHours = () => {
    if (selectedDate.value === dateOptions.value[0]?.id) {
      // 今天：禁用过去的小时
      const currentHour = dayjs().hour()
      return Array.from({ length: currentHour }, (_, i) => i)
    }
    return []
  }
  
  /**
   * 禁用的分钟（定时发表用）
   */
  const getDisabledMinutes = (selectedHour) => {
    if (selectedDate.value === dateOptions.value[0]?.id) {
      const currentHour = dayjs().hour()
      const currentMinute = dayjs().minute()
      if (selectedHour === currentHour) {
        // 当前小时：禁用过去的分钟 + 5分钟缓冲
        return Array.from({ length: currentMinute + 5 }, (_, i) => i)
      }
    }
    return []
  }
  
  /**
   * 构建发布参数
   * @param {Object} extraParams - 额外参数
   * @returns {Object} 发布参数
   */
  const buildParams = (extraParams = {}) => {
    const params = {
      sendTime: calculateSendTime(),
      hasNotify: hasNotify.value,
      isFreePublish: !hasNotify.value,
      ...extraParams
    }
    
    // 分组通知参数
    if (groupNotifyEnabled.value) {
      params.groupid = groupNotifyParams.value.groupid
      params.sex = groupNotifyParams.value.sex
      params.country = groupNotifyParams.value.country
      params.province = groupNotifyParams.value.province
      params.city = groupNotifyParams.value.city
    }
    
    return params
  }
  
  /**
   * 构建原创问题的 reprint_info
   * @param {Array} copyrightList - 原创列表
   * @param {Array} guideWords - 编者寄语数组
   * @returns {Object|null} reprint_info 对象
   */
  const buildReprintInfo = (copyrightList, guideWords = []) => {
    if (!copyrightList || copyrightList.length === 0) return null
    
    return {
      item_list: copyrightList.map((_, index) => ({
        idx: index + 1,
        reprint_type: 'EN_REPRINT_TYPE_SHARE',
        guide_words: guideWords[index] || ''
      }))
    }
  }
  
  /**
   * 重置状态
   */
  const reset = () => {
    hasNotify.value = true
    groupNotifyEnabled.value = false
    groupNotifyParams.value = { groupid: -1, sex: -1, country: '', province: '', city: '' }
    timingEnabled.value = false
    selectedDate.value = ''
    selectedTime.value = null
  }
  
  /**
   * 更新通知次数列表
   * @param {Array} list - 通知次数列表
   */
  const setQuotaItemList = (list) => {
    quotaItemList.value = list || []
    // 自动判断是否开启通知
    hasNotify.value = currentQuota.value > 0
  }
  
  // 监听定时发表状态，自动初始化日期选项
  watch(timingEnabled, (enabled) => {
    if (enabled && dateOptions.value.length === 0) {
      initDateOptions()
    }
  })
  
  return {
    // 状态
    hasNotify,
    quotaItemList,
    groupNotifyEnabled,
    groupNotifyParams,
    timingEnabled,
    selectedDate,
    selectedTime,
    dateOptions,
    
    // 计算属性
    currentQuota,
    notificationHint,
    
    // 方法
    initDateOptions,
    getQuotaForDate,
    calculateSendTime,
    getDisabledHours,
    getDisabledMinutes,
    buildParams,
    buildReprintInfo,
    reset,
    setQuotaItemList
  }
}
