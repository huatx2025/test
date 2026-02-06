<template>
  <AModal
    :open="visible"
    title="选择公众号"
    :width="700"
    @cancel="handleCancel"
  >
    <template #footer>
      <div class="modal-footer">
        <span class="select-count">已选择 {{ selectedAccountIds.length }} 个公众号</span>
        <div class="footer-buttons">
          <AButton @click="handleCancel">取消</AButton>
          <AButton type="primary" :disabled="selectedAccountIds.length === 0" @click="handleOk">{{ okText }}</AButton>
        </div>
      </div>
    </template>
    <div class="account-selector">
      <!-- 搜索工具栏 -->
      <div class="search-toolbar">
        <AInput
          v-model:value="searchKeyword"
          placeholder="搜索关键词"
          allow-clear
          class="search-input"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </AInput>
        <ACheckbox
          v-if="!single"
          :checked="isAllSelected"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        >
          全选
        </ACheckbox>
        <ASelect
          v-model:value="selectedGroupId"
          placeholder="选择分组"
          allow-clear
          class="group-select"
        >
          <ASelectOption v-for="group in groupOptions" :key="group.id" :value="group.id">
            {{ group.name }}
          </ASelectOption>
        </ASelect>
      </div>

      <!-- 账号列表 -->
      <div class="account-list">
        <AEmpty v-if="filteredAccounts.length === 0" description="没有可用的公众号" class="empty-placeholder" />
        
        <div
          v-for="account in filteredAccounts"
          :key="account.id"
          class="account-item"
          :class="{ 'account-disabled': account.is_expired }"
          @click="handleAccountClick(account)"
        >
          <ACheckbox
            :checked="selectedAccountIds.includes(account.id)"
            :disabled="account.is_expired"
            @click.stop
            @change="(e) => handleAccountChange(account.id, e.target.checked)"
          />
          <div class="account-info">
            <AAvatar :src="account.avatar" :size="48">
              {{ account.name?.charAt(0) || '账' }}
            </AAvatar>
            <div class="account-detail">
              <div class="account-name">{{ account.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Modal as AModal, Input as AInput, Button as AButton, Checkbox as ACheckbox, Avatar as AAvatar, Empty as AEmpty, Select as ASelect, SelectOption as ASelectOption, message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAccountStore } from '@/store/modules/account'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // 排除的账号ID列表（例如当前账号）
  excludeAccountIds: {
    type: Array,
    default: () => []
  },
  // 确认按钮文字
  okText: {
    type: String,
    default: '确定'
  },
  // 是否只允许单选
  single: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel'])

const accountStore = useAccountStore()

// 搜索关键词
const searchKeyword = ref('')

// 选中的分组ID
const selectedGroupId = ref(null)

// 选中的账号ID列表
const selectedAccountIds = ref([])

// 分组选项
const groupOptions = computed(() => {
  return accountStore.getGroups || []
})

// 获取所有可用账号（排除指定账号，只显示公众号类型）
const availableAccounts = computed(() => {
  const allAccounts = accountStore.getAllAccounts
  return allAccounts.filter(account => {
    // 只显示公众号类型
    if (account.platform_type !== 'wechat') {
      return false
    }
    // 排除指定的账号
    if (props.excludeAccountIds.includes(account.id)) {
      return false
    }
    return true
  })
})

// 过滤后的账号列表
const filteredAccounts = computed(() => {
  let accounts = availableAccounts.value
  
  // 按分组过滤
  if (selectedGroupId.value) {
    accounts = accounts.filter(account => account.group_id === selectedGroupId.value)
  }
  
  // 按关键词过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    accounts = accounts.filter(account => {
      return account.name?.toLowerCase().includes(keyword)
    })
  }
  
  return accounts
})

// 可选账号（未失效的）
const selectableAccounts = computed(() => {
  return filteredAccounts.value.filter(account => !account.is_expired)
})

// 是否全选
const isAllSelected = computed(() => {
  if (selectableAccounts.value.length === 0) return false
  return selectableAccounts.value.every(account => selectedAccountIds.value.includes(account.id))
})

// 是否部分选中
const isIndeterminate = computed(() => {
  if (selectableAccounts.value.length === 0) return false
  const selectedCount = selectableAccounts.value.filter(account => selectedAccountIds.value.includes(account.id)).length
  return selectedCount > 0 && selectedCount < selectableAccounts.value.length
})

// 全选/取消全选
const handleSelectAll = (e) => {
  const checked = e.target.checked
  if (checked) {
    // 全选当前过滤后的可选账号
    const currentIds = selectableAccounts.value.map(account => account.id)
    const newIds = [...new Set([...selectedAccountIds.value, ...currentIds])]
    selectedAccountIds.value = newIds
  } else {
    // 取消选中当前过滤后的账号
    const currentIds = selectableAccounts.value.map(account => account.id)
    selectedAccountIds.value = selectedAccountIds.value.filter(id => !currentIds.includes(id))
  }
}

// 点击账号卡片
const handleAccountClick = (account) => {
  if (account.is_expired) {
    message.warning('账号已失效')
    return
  }
  // 切换选中状态
  const isSelected = selectedAccountIds.value.includes(account.id)
  handleAccountChange(account.id, !isSelected)
}

// 处理账号选择变化
const handleAccountChange = (accountId, checked) => {
  if (props.single) {
    // 单选模式
    selectedAccountIds.value = checked ? [accountId] : []
  } else {
    // 多选模式
    if (checked) {
      selectedAccountIds.value.push(accountId)
    } else {
      const index = selectedAccountIds.value.indexOf(accountId)
      if (index > -1) {
        selectedAccountIds.value.splice(index, 1)
      }
    }
  }
}

// 清空选择
const clearSelection = () => {
  selectedAccountIds.value = []
}

// 确认
const handleOk = () => {
  const selectedAccounts = selectedAccountIds.value.map(id => 
    accountStore.getAccountById(id)
  ).filter(Boolean)
  
  emit('confirm', selectedAccounts)
  handleClose()
}

// 取消
const handleCancel = () => {
  emit('cancel')
  handleClose()
}

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false)
  // 延迟重置，避免关闭动画时看到数据变化
  setTimeout(() => {
    searchKeyword.value = ''
    selectedGroupId.value = null
    selectedAccountIds.value = []
  }, 300)
}

// 监听弹窗显示状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // 弹窗关闭时重置状态
    searchKeyword.value = ''
    selectedGroupId.value = null
    selectedAccountIds.value = []
  }
})
</script>

<style scoped lang="scss">
.account-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  flex: 1;
}

.group-select {
  width: 140px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.select-count {
  color: #1890ff;
  font-size: 14px;
}

.footer-buttons {
  display: flex;
  gap: 8px;
}

.account-list {
  height: 400px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: auto;
  gap: 12px;
  align-content: start;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f5f5f5;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 3px;
    
    &:hover {
      background: #bfbfbf;
    }
  }
}

.empty-placeholder {
  grid-column: 1 / -1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.account-item {
  padding: 14px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.2s;
  margin: 0;
  display: flex;
  align-items: center;
  cursor: pointer;
  height: auto;
  align-self: start;
  
  &:hover {
    border-color: #1890ff;
    background: #f0f8ff;
  }
  
  :deep(.ant-checkbox) {
    margin-top: 0;
  }
  
  &.account-disabled {
    background: #f5f5f5;
    border-color: #d9d9d9;
    cursor: not-allowed;
    
    &:hover {
      border-color: #d9d9d9;
      background: #f5f5f5;
    }
    
    .account-info {
      opacity: 0.5;
    }
  }
}

.account-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  flex: 1;
  margin-left: 6px;
}

.account-detail {
  flex: 1;
  min-width: 0;
}

.account-name {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>

