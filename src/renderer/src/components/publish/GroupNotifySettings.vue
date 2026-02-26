<template>
  <div class="group-notify-settings">
    <div class="group-notify-header">
      <span class="group-notify-title">分组通知</span>
      <ASwitch v-model:checked="enabledLocal" />
    </div>
    
    <div v-if="enabledLocal" class="group-notify-selectors">
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
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { 
  Switch as ASwitch, 
  Select as ASelect, 
  SelectOption as ASelectOption,
  Cascader as ACascader 
} from 'ant-design-vue'
import { getRegions } from '@/.thidparty_api/wechat'

const props = defineProps({
  // 是否启用分组通知
  enabled: {
    type: Boolean,
    default: false
  },
  // 分组通知参数
  params: {
    type: Object,
    default: () => ({
      groupid: -1,
      sex: -1,
      country: '',
      province: '',
      city: ''
    })
  },
  // 账号ID（用于获取地区数据）
  accountId: {
    type: [String, Number],
    default: null
  },
  // 用户标签列表
  contactGroupList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:enabled', 'update:params'])

// 内部状态
const enabledLocal = ref(props.enabled)
const selectedArea = ref([])
const selectedSex = ref(-1)
const selectedGroupId = ref(-1)
const selectedTagPath = ref(['all'])
const starGroupId = ref(null)

// 地区选项
const areaOptions = ref([])
const areaCascaderRef = ref(null)

// 标签级联选项
const tagCascaderOptions = computed(() => {
  const tagChildren = []
  
  props.contactGroupList.forEach(group => {
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
  emitParams()
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

// 输出参数
const emitParams = () => {
  // 解析地区
  let country = ''
  let province = ''
  let city = ''
  if (selectedArea.value && selectedArea.value.length > 0) {
    country = selectedArea.value[0] || ''
    province = selectedArea.value[1] || ''
    city = selectedArea.value[2] || ''
  }
  
  emit('update:params', {
    groupid: selectedGroupId.value,
    sex: selectedSex.value,
    country,
    province,
    city
  })
}

// 监听启用状态
watch(enabledLocal, (val) => {
  emit('update:enabled', val)
  if (val && areaOptions.value.length === 0) {
    initAreaOptions()
  }
})

// 监听外部启用状态
watch(() => props.enabled, (val) => {
  enabledLocal.value = val
})

// 监听选择变化
watch([selectedArea, selectedSex], () => {
  emitParams()
}, { deep: true })

// 初始化时加载地区选项
if (props.enabled && props.accountId) {
  initAreaOptions()
}
</script>

<style scoped lang="scss">
.group-notify-settings {
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

.group-notify-selectors {
  .selector-row {
    display: flex;
    gap: 12px;
  }
  
  .selector-item {
    flex: 1;
  }
}

.area-cascader,
.sex-select,
.tag-cascader {
  width: 100%;
}
</style>
