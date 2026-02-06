<template>
  <AModal
    v-model:open="visible"
    :title="modalTitle"
    :width="600"
    :mask-closable="false"
    :keyboard="false"
    :closable="!publishing && !dialogLoading"
    class="publish-modal"
    @cancel="handleCancel"
  >
    <ASpin :spinning="dialogLoading" tip="加载中...">
      <!-- 步骤条（有原创问题时显示） -->
      <div v-if="publishSteps.length > 0" class="steps-container">
      <ASteps :current="publishStep" size="small">
        <AStep v-for="(item, index) in publishSteps" :key="index" :title="item" />
      </ASteps>
    </div>

    <!-- 步骤0: 设置发表参数 -->
    <div v-show="publishStep === 0" class="step-content">
      <!-- 群发通知 -->
      <div class="publish-option-card">
        <div class="option-header">
          <div class="option-title">
            <span>群发通知</span>
            <ATooltip title="开启群发通知，内容将展示在公众号主页，并有可能获得平台推荐。">
              <QuestionCircleOutlined class="help-icon" />
            </ATooltip>
          </div>
          <ASwitch v-model:checked="bulkSendingNotificationFlag" :disabled="bulkSendingNotificationRemain <= 0" />
        </div>
        <div class="option-desc">
          {{ notificationHint }}
        </div>
        
        <!-- 分组通知（群发通知开启时显示） -->
        <div v-if="bulkSendingNotificationFlag" class="group-notify-section">
          <div class="group-notify-header">
            <span class="group-notify-title">分组通知</span>
            <ASwitch v-model:checked="groupNotifyFlag" />
          </div>
          
          <div v-if="groupNotifyFlag" class="group-notify-selectors">
            <div class="selector-row">
              <!-- 地区选择 -->
              <div class="selector-item">
                <ACascader
                  ref="areaCascaderRef"
                  v-model:value="selectedArea"
                  :options="areaOptions"
                  :load-data="loadAreaData"
                  placeholder="全部"
                  change-on-select
                  :display-render="areaDisplayRender"
                  class="area-cascader"
                />
              </div>
              
              <!-- 性别选择 -->
              <div class="selector-item">
                <ASelect v-model:value="selectedSex" placeholder="全部" class="sex-select">
                  <ASelectOption :value="-1">全部</ASelectOption>
                  <ASelectOption :value="1">男</ASelectOption>
                  <ASelectOption :value="2">女</ASelectOption>
                </ASelect>
              </div>
              
              <!-- 标签选择 -->
              <div class="selector-item">
                <ACascader
                  v-model:value="selectedTagPath"
                  :options="tagCascaderOptions"
                  placeholder="全部标签"
                  :display-render="tagDisplayRender"
                  expand-trigger="hover"
                  class="tag-cascader"
                  @change="handleTagChange"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 定时发表 -->
      <div class="publish-option-card">
        <div class="option-header">
          <div class="option-title">
            <span>定时发表</span>
            <ATooltip title="你可以选择5分钟后至7天内任意时间定时发表，设置后不可修改但可以取消。取消定时不占用通知次数，发表内容也将恢复至草稿箱。">
              <QuestionCircleOutlined class="help-icon" />
            </ATooltip>
          </div>
          <ASwitch v-model:checked="publishTimingFlag" />
        </div>
        
        <div v-if="publishTimingFlag" class="timing-selectors">
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

    <!-- 步骤1: 确认发表方式 -->
    <div v-show="publishStep === 1" class="step-content">
      <div class="warning-text">
        共 {{ publishCopyrightList.length }} 篇内容未通过原创校验逻辑，将按照下列方式进行发表，如有异议可申诉
        <a class="guide-link" href="javascript:;">原创规则指引</a>
      </div>
      <div class="copyright-table-wrapper">
        <table class="copyright-table">
          <thead>
            <tr>
              <th style="width: 75%">未通过原因</th>
              <th style="width: 25%">发表方式</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in publishCopyrightList" :key="item.source_idx">
              <td>
                你的内容《{{ item.article_title }}》与原创内容《{{ item.source_title }}》相似度过高，将以分享方式发表，如有异议可在当前页面申诉。
              </td>
              <td>
                <div class="publish-method">
                  <span>分享</span>
                  <span class="method-appeal">如有异议，可申诉</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 步骤2: 填写编辑寄语 -->
    <div v-show="publishStep === 2" class="step-content">
      <div class="warning-text">
        共 {{ publishCopyrightList.length }} 篇内容未通过原创校验逻辑，将按照下列方式进行发表，如有异议可申诉
        <a class="guide-link" href="javascript:;">原创规则指引</a>
      </div>
      <div class="copyright-table-wrapper">
        <table class="copyright-table guide-table">
          <thead>
            <tr>
              <th style="width: 34%">待群发内容</th>
              <th style="width: 22%">群发方式</th>
              <th style="width: 44%">编者寄语</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in publishCopyrightList" :key="idx">
              <td class="article-title-cell">{{ item.article_title }}</td>
              <td>
                <div class="publish-method-preview">
                  <span>分享</span>
                  <span class="method-preview-text">分享样式，可预览</span>
                </div>
              </td>
              <td>
                <div class="guide-words-input">
                  <ATextarea
                    v-model:value="publishGuideWords[idx]"
                    :maxlength="140"
                    :rows="3"
                    placeholder="分享推荐语，可以不填写"
                    :show-count="true"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </ASpin>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="modal-footer">
        <AButton @click="handleCancel" :disabled="publishing || dialogLoading">取消</AButton>
        <AButton v-if="publishStep > 0 && publishStep < 2" @click="handlePrev" :disabled="dialogLoading">上一步</AButton>
        <AButton 
          v-if="!instantPublish" 
          type="primary" 
          :loading="checkingCopyright"
          :disabled="dialogLoading"
          @click="handleNext"
        >
          {{ publishStep === 0 ? '发表' : '下一步' }}
        </AButton>
        <AButton 
          v-if="instantPublish" 
          type="primary" 
          :loading="publishing"
          :disabled="dialogLoading"
          @click="handlePublish"
        >
          {{ publishing ? '发表中...' : '继续群发' }}
        </AButton>
      </div>
    </template>
  </AModal>

  <!-- 扫码验证组件 -->
  <QrcodeValidator
    v-if="props.accountId"
    ref="qrcodeValidatorRef"
    :account-id="props.accountId"
    :appmsg-id="props.draft?.app_id"
    :operation-seq="operationSeq"
    :has-notify="bulkSendingNotificationFlag"
  />
</template>

<script setup>
import { ref, computed, watch, h, nextTick } from 'vue'
import { 
  Modal as AModal, 
  Button as AButton, 
  Switch as ASwitch, 
  Select as ASelect, 
  SelectOption as ASelectOption,
  Cascader as ACascader,
  TimePicker as ATimePicker,
  Tooltip as ATooltip,
  Steps as ASteps,
  Step as AStep,
  Textarea as ATextarea,
  Spin as ASpin,
  message 
} from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { getMasssendInfo, getRegions, checkAppmsgCopyright, publishAppmsg } from '@/.thidparty_api/wechat'
import QrcodeValidator from './QrcodeValidator.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  accountId: {
    type: [String, Number],
    default: null
  },
  draft: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:open', 'success', 'cancel'])

// 本地显示状态
const visible = ref(props.open)

// 弹窗标题
const modalTitle = computed(() => {
  if (publishStep.value === 0) return '发表'
  return '原创校验'
})

// 群发通知
const bulkSendingNotificationFlag = ref(false)
const quotaItemList = ref([]) // 完整的次数列表

// 弹窗加载状态
const dialogLoading = ref(false)

// 根据选择的日期获取对应的通知次数
const currentQuotaInfo = computed(() => {
  // 确定要查询的日期：如果开启定时发表，使用选择的日期；否则使用今天
  let targetDateStr = ''
  if (publishTimingFlag.value && selectedDate.value) {
    // selectedDate 格式为 "2026-01-05"，需要转换为 "20260105"
    targetDateStr = selectedDate.value.replace(/-/g, '')
  } else {
    // 使用今天的日期
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    targetDateStr = `${year}${month}${day}`
  }
  
  // 从 quotaItemList 中找到对应日期的次数
  const quotaItem = quotaItemList.value.find(item => item.str_date === targetDateStr)
  
  return {
    quota: quotaItem?.quota || 0,
    dateStr: targetDateStr
  }
})

// 当前选择日期的通知剩余次数
const bulkSendingNotificationRemain = computed(() => currentQuotaInfo.value.quota)

// 格式化通知次数提示文字
const notificationHint = computed(() => {
  const quota = currentQuotaInfo.value.quota
  const dateStr = currentQuotaInfo.value.dateStr
  
  if (quota <= 0) {
    // 判断是今天还是其他日期
    if (!publishTimingFlag.value) {
      return '今日通知次数已用完'
    }
    // 定时发表时，显示所选日期
    const month = parseInt(dateStr.substring(4, 6))
    const day = parseInt(dateStr.substring(6, 8))
    
    const today = new Date()
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')}`
    
    if (dateStr === todayStr) {
      return '今日通知次数已用完'
    } else if (dateStr === tomorrowStr) {
      return '明日通知次数已用完'
    } else {
      return `${month}月${day}日通知次数已用完`
    }
  }
  
  // 有次数时的提示
  const month = parseInt(dateStr.substring(4, 6))
  const day = parseInt(dateStr.substring(6, 8))
  
  const today = new Date()
  const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')}`
  
  if (dateStr === todayStr) {
    return `今天还有${quota}次通知次数`
  } else if (dateStr === tomorrowStr) {
    return `明天还有${quota}次通知次数`
  } else {
    return `${month}月${day}日还有${quota}次通知次数`
  }
})

// 分组通知
const groupNotifyFlag = ref(false)
const selectedArea = ref([])
const selectedSex = ref(-1)
const selectedGroupId = ref(-1)
const selectedTagPath = ref(['all'])
const contactGroupList = ref([])
const starGroupId = ref(null)

// 定时发表
const publishTimingFlag = ref(false)
const selectedDate = ref('')
const selectedTime = ref(null)
const dateOptions = ref([])

// 操作序列号
const operationSeq = ref('')

// 是否需要扫码
const needScanQrcode = ref(false)

// 扫码验证组件ref
const qrcodeValidatorRef = ref(null)

// 发表步骤
const publishStep = ref(0)
const publishSteps = ref([])

// 原创检测
const checkingCopyright = ref(false)
const publishCopyrightList = ref([])
const publishCopyrightListRaw = ref('')
const publishGuideWords = ref([])
const instantPublish = ref(false)

// 发表中
const publishing = ref(false)

// 地区选项
const areaOptions = ref([])
const areaCascaderRef = ref(null)

// 标签级联选项
const tagCascaderOptions = computed(() => {
  // 构建子菜单选项
  const tagChildren = []
  
  contactGroupList.value.forEach(group => {
    if (group.group_id === 2) {
      // 星标组
      starGroupId.value = group.group_id
      tagChildren.push({
        label: '星标用户',
        value: group.group_id
      })
    } else if (group.group_id !== 0 && group.group_id !== 1) {
      // 其他标签（排除未分组 group_id=0 和屏蔽组 group_id=1）
      tagChildren.push({
        label: group.group_name,
        value: group.group_id
      })
    }
  })
  
  return [
    { label: '全部标签', value: 'all' },
    {
      label: '按标签选择',
      value: 'byTag',
      children: tagChildren.length > 0 ? tagChildren : [{ label: '暂无标签', value: 'none', disabled: true }]
    }
  ]
})

// 标签显示渲染
const tagDisplayRender = ({ labels }) => {
  if (!labels || labels.length === 0) return '全部标签'
  // 如果是"按标签选择"的子选项，只显示子选项名称
  if (labels.length === 2) {
    return labels[1]
  }
  return labels[labels.length - 1]
}

// 标签选择变化处理
const handleTagChange = (value) => {
  if (!value || value.length === 0 || value[0] === 'all') {
    selectedGroupId.value = -1
  } else if (value.length === 2) {
    selectedGroupId.value = value[1]
  }
}

// 地区显示渲染
const areaDisplayRender = ({ labels }) => {
  if (!labels || labels.length === 0) return '全部'
  return labels.join(' / ')
}

// 加载地区数据
const loadAreaData = async (selectedOptions) => {
  if (!props.accountId) return
  
  const targetOption = selectedOptions[selectedOptions.length - 1]
  targetOption.loading = true
  
  try {
    const result = await getRegions(props.accountId, targetOption.regionId || 0)
    targetOption.loading = false
    
    if (result.hasChildren) {
      targetOption.children = result.regions.map(r => ({
        label: r.name,
        value: r.name,
        regionId: r.id,
        isLeaf: false
      }))
    } else {
      // 没有下一级，标记为叶子节点并自动关闭选择器
      targetOption.isLeaf = true
      nextTick(() => {
        areaCascaderRef.value?.blur?.()
      })
    }
  } catch (error) {
    targetOption.loading = false
    console.error('加载地区数据失败:', error)
  }
}

// 初始化地区选项
const initAreaOptions = async () => {
  if (!props.accountId) return
  
  try {
    const result = await getRegions(props.accountId, 0)
    areaOptions.value = [
      { label: '全部', value: '', isLeaf: true },
      ...result.regions.map(r => ({
        label: r.name,
        value: r.name,
        regionId: r.id,
        isLeaf: false
      }))
    ]
  } catch (error) {
    console.error('初始化地区选项失败:', error)
  }
}

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
    // 今天：禁用过去的小时
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
      // 当前小时：禁用过去的分钟
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
      // 打开时初始化
      await initDialog()
    }
  }
)

// 监听 visible 变化
watch(visible, (newVal) => {
  emit('update:open', newVal)
})

// 监听通知次数变化，自动开关群发通知
watch(bulkSendingNotificationRemain, (newVal) => {
  bulkSendingNotificationFlag.value = newVal > 0
})

// 初始化对话框
const initDialog = async () => {
  // 重置状态
  publishStep.value = 0
  publishSteps.value = []
  publishCopyrightList.value = []
  publishCopyrightListRaw.value = ''
  publishGuideWords.value = []
  instantPublish.value = false
  checkingCopyright.value = false
  publishing.value = false
  groupNotifyFlag.value = false
  selectedArea.value = ['']
  selectedSex.value = -1
  selectedGroupId.value = -1
  selectedTagPath.value = ['all']
  quotaItemList.value = []
  bulkSendingNotificationFlag.value = false
  
  // 如果 accountId 为空，不进行 API 调用
  if (!props.accountId) {
    return
  }
  
  // 初始化日期选项
  initDateOptions()
  
  // 初始化地区选项
  initAreaOptions()
  
  dialogLoading.value = true
  
  try {
    // 获取群发信息
    const result = await getMasssendInfo(props.accountId, props.draft?.app_id)
    console.log("getMasssendInfo返回结果", result);
    
    quotaItemList.value = result.quotaItemList || []
    operationSeq.value = result.operationSeq
    needScanQrcode.value = result.needScanQrcode
    contactGroupList.value = result.contactGroupList
    
  } catch (error) {
    console.error('获取群发信息失败:', error)
    message.error('获取群发信息失败')
  } finally {
    dialogLoading.value = false
  }
}

// 上一步
const handlePrev = () => {
  if (publishStep.value > 0) {
    publishStep.value--
    if (publishStep.value === 0) {
      publishSteps.value = []
    }
  }
}

// 下一步/发表
const handleNext = async () => {
  if (publishStep.value === 0) {
    // 步骤0 → 检测原创
    checkingCopyright.value = true
    
    try {
      const result = await checkAppmsgCopyright(
        props.accountId, 
        props.draft?.app_id,
        (progress) => {
          // 可以在这里更新进度提示
          console.log(`原创检测中 (${progress.retry}/${progress.maxRetries})...`)
        }
      )
      
      if (result.copyright === 1) {
        // 命中原创 → 进入步骤1
        publishCopyrightList.value = result.list
        publishCopyrightListRaw.value = result.listRaw
        publishGuideWords.value = new Array(result.list.length).fill('')
        publishSteps.value = ['确认发表方式', '填写编者推荐语']
        publishStep.value = 1
      } else {
        // 未命中 → 直接发表
        instantPublish.value = true
        await handlePublish()
      }
    } catch (error) {
      console.error('原创检测失败:', error)
      message.error(error.message || '原创检测失败')
    } finally {
      checkingCopyright.value = false
    }
  } else if (publishStep.value === 1) {
    // 步骤1 → 进入步骤2（填写寄语）
    publishStep.value = 2
    instantPublish.value = true
  }
}

// 构建发表参数
const buildPublishParams = () => {
  // 计算发表时间
  let sendTime = 0
  if (publishTimingFlag.value && selectedTime.value) {
    const dateStr = selectedDate.value
    const timeStr = selectedTime.value.format('HH:mm')
    const dateTimeStr = `${dateStr} ${timeStr}:00`
    sendTime = Math.floor(new Date(dateTimeStr).getTime() / 1000)
  }
  
  // 构建 reprint_info
  let reprintInfo = null
  if (publishCopyrightList.value.length > 0) {
    reprintInfo = {
      item_list: publishCopyrightList.value.map((_, index) => ({
        idx: index + 1,
        reprint_type: 'EN_REPRINT_TYPE_SHARE',
        guide_words: publishGuideWords.value[index] || ''
      }))
    }
  }
  
  // 解析地区
  let country = ''
  let province = ''
  let city = ''
  if (selectedArea.value && selectedArea.value.length > 0) {
    country = selectedArea.value[0] || ''
    province = selectedArea.value[1] || ''
    city = selectedArea.value[2] || ''
  }
  
  return {
    appmsgid: props.draft?.app_id,
    sendTime,
    hasNotify: bulkSendingNotificationFlag.value,
    isFreePublish: !bulkSendingNotificationFlag.value,
    operationSeq: operationSeq.value,
    listRaw: publishCopyrightListRaw.value,
    reprintInfo,
    appmsgItemCount: props.draft?.multi_item?.length || 1,
    groupid: groupNotifyFlag.value ? selectedGroupId.value : undefined,
    sex: groupNotifyFlag.value ? selectedSex.value : undefined,
    country: groupNotifyFlag.value ? country : undefined,
    province: groupNotifyFlag.value ? province : undefined,
    city: groupNotifyFlag.value ? city : undefined
  }
}

// 执行发表
const handlePublish = async () => {
  // 检查是否需要扫码
  if (needScanQrcode.value && qrcodeValidatorRef.value) {
    // 启动扫码验证流程
    const qrcodeResult = await qrcodeValidatorRef.value.startValidation()
    
    if (qrcodeResult.success) {
      // 验证成功，继续发表
      await doPublish(qrcodeResult.uuid)
    }
    // 如果验证失败（超时/取消），不执行发表，用户可以刷新重试
    return
  }
  
  // 不需要扫码，直接发表
  await doPublish()
}

// 实际执行发表操作
const doPublish = async (qrcodeCode = '') => {
  publishing.value = true
  
  try {
    const params = buildPublishParams()
    
    // 如果有扫码验证码，添加到参数中
    if (qrcodeCode) {
      params.code = qrcodeCode
    }
    
    console.log('草稿发布参数:', params)
    const result = await publishAppmsg(props.accountId, params)
    
    if (result.success) {
      message.success('发表成功')
      visible.value = false
      emit('success')
    } else {
      message.error(result.msg || '发表失败')
    }
  } catch (error) {
    console.error('发表失败:', error)
    message.error(error.message || '发表失败')
  } finally {
    publishing.value = false
  }
}

// 取消
const handleCancel = () => {
  if (publishing.value) return
  emit('cancel')
  visible.value = false
}
</script>

<style scoped lang="scss">
.publish-modal {
  :deep(.ant-modal-body) {
    padding: 16px 24px;
    max-height: 60vh;
    overflow-y: auto;
  }
}

.steps-container {
  margin-bottom: 24px;
  padding: 0 40px;
}

.step-content {
  min-height: 200px;
}

.publish-option-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
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

.group-notify-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e8e8e8;
}

.group-notify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.group-notify-title {
  font-size: 14px;
  color: #262626;
}


.selector-row {
  display: flex;
  gap: 12px;
}

.selector-item {
  flex: 1;
}

.area-cascader,
.sex-select,
.tag-cascader {
  width: 100%;
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

.warning-text {
  font-size: 14px;
  color: #595959;
  margin-bottom: 16px;
  line-height: 1.6;
}

.guide-link {
  color: #1890ff;
  margin-left: 8px;
  
  &:hover {
    color: #40a9ff;
  }
}

.copyright-table-wrapper {
  overflow-x: auto;
}

.copyright-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  
  th {
    background: #fafafa;
    color: #8c8c8c;
    font-weight: normal;
    text-align: left;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
  }
  
  td {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    color: #262626;
    vertical-align: top;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
}

.guide-table {
  td {
    vertical-align: middle;
  }
}

.article-title-cell {
  word-break: break-all;
}

.publish-method {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.method-appeal {
  font-size: 12px;
  color: #8c8c8c;
}

.publish-method-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.method-preview-text {
  font-size: 12px;
  color: #1890ff;
  cursor: pointer;
}

.guide-words-input {
  :deep(.ant-input-textarea) {
    .ant-input {
      resize: none;
    }
  }
  
  :deep(.ant-input-textarea-show-count::after) {
    font-size: 12px;
    color: #8c8c8c;
  }
}

.modal-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>

