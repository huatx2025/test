<template>
  <a-modal
    v-model:open="visible"
    title="修改分组"
    :width="400"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div style="padding: 20px 0;">
      <a-select
        v-model:value="selectedGroupId"
        placeholder="请选择分组"
        style="width: 100%"
        :options="groupOptions"
      />
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAccountStore } from '@/store/modules/account'

const props = defineProps({
  // 控制弹窗显示
  open: {
    type: Boolean,
    default: false
  },
  // 当前账号对象
  account: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

// 使用 Store
const accountStore = useAccountStore()

// 本地显示状态
const visible = ref(props.open)

// 选中的分组ID
const selectedGroupId = ref(null)

// 分组选项
const groupOptions = computed(() => {
  const options = [
    {
      label: '不分组',
      value: null
    }
  ]
  
  // 添加所有分组
  accountStore.groups.forEach(group => {
    options.push({
      label: group.name,
      value: group.id
    })
  })
  
  return options
})

// 监听 props.open 变化
watch(
  () => props.open,
  (newVal) => {
    visible.value = newVal
    if (newVal && props.account) {
      // 打开时设置当前账号的分组
      selectedGroupId.value = props.account.group_id || null
    }
  }
)

// 监听 visible 变化
watch(visible, (newVal) => {
  emit('update:open', newVal)
})

// 确认选择
const handleOk = () => {
  if (!props.account) {
    return
  }
  
  emit('confirm', {
    account: props.account,
    groupId: selectedGroupId.value
  })
  
  visible.value = false
}

// 取消选择
const handleCancel = () => {
  emit('cancel')
  visible.value = false
}
</script>

<style scoped lang="scss">
// 无需额外样式，使用 ant-design 默认样式
</style>

