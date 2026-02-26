<template>
  <div class="selected-drafts-list-wrapper">
    <div class="popover-header">
      <span class="popover-title">已选择草稿 ({{ selectedDrafts.length }})</span>
      <AButton 
        v-if="selectedDrafts.length > 0" 
        type="link" 
        size="small" 
        @click="handleClearSelection"
      >
        清空
      </AButton>
    </div>
    <div v-if="selectedDrafts.length === 0" class="empty-selection">
      未选择任何草稿
    </div>
    <div v-else class="selected-drafts-list">
      <!-- 按账号分组显示 -->
      <div 
        v-for="(group, accountId) in groupedDrafts" 
        :key="accountId"
        class="account-group"
      >
        <div class="account-group-header" @click="toggleGroupCollapse(accountId)">
          <!-- 账号头像 -->
          <div class="account-avatar">
            <img
              v-if="group.accountAvatar"
              :src="group.accountAvatar"
              :alt="group.accountName"
            />
            <div v-else class="avatar-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          </div>
          
          <div class="account-header-info">
            <span class="account-group-name">{{ group.accountName }}</span>
            <span class="account-group-count">({{ group.drafts.length }})</span>
          </div>
          
          <!-- 折叠图标 -->
          <UpOutlined v-if="!collapsedGroups[accountId]" class="collapse-icon" />
          <DownOutlined v-else class="collapse-icon" />
        </div>
        
        <!-- 可折叠的草稿列表 -->
        <transition name="collapse">
          <div v-show="!collapsedGroups[accountId]" class="account-group-items">
            <div 
              v-for="item in group.drafts" 
              :key="item.draft.data_seq"
              class="selected-draft-item"
            >
              <div class="draft-info">
                <div class="draft-title">{{ getDraftTitle(item.draft) }}</div>
              </div>
              <AButton 
                type="text" 
                size="small" 
                danger
                @click.stop="handleRemoveDraft(item.draft, item.accountId)"
              >
                移除
              </AButton>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Button as AButton, message } from 'ant-design-vue'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'

// Props
const props = defineProps({
  selectedDrafts: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['remove', 'clear'])

// 折叠状态：记录哪些账号分组被折叠了
const collapsedGroups = ref({})

// 按账号分组已选择的草稿
const groupedDrafts = computed(() => {
  const groups = {}
  
  props.selectedDrafts.forEach(item => {
    const accountId = item.accountId
    
    if (!groups[accountId]) {
      groups[accountId] = {
        accountId,
        accountName: item.accountName,
        accountAvatar: item.accountAvatar,
        drafts: []
      }
    }
    
    groups[accountId].drafts.push(item)
  })
  
  return groups
})

// 切换分组折叠状态
const toggleGroupCollapse = (accountId) => {
  collapsedGroups.value[accountId] = !collapsedGroups.value[accountId]
}

// 获取草稿标题
const getDraftTitle = (draft) => {
  const firstArticle = draft.multi_item?.[0]
  if (!firstArticle) return '无标题'
  
  // 移除HTML标签
  const title = firstArticle.title || '无标题'
  const div = document.createElement('div')
  div.innerHTML = title
  return div.textContent || div.innerText || '无标题'
}

// 从选中列表中移除草稿
const handleRemoveDraft = (draft, accountId) => {
  emit('remove', draft, accountId)
}

// 清空选中列表
const handleClearSelection = () => {
  emit('clear')
  message.success('已清空选中列表')
}
</script>

<style scoped lang="scss">
.selected-drafts-list-wrapper {
  width: 350px;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.popover-title {
  font-weight: 500;
  color: #262626;
  font-size: 14px;
}

.empty-selection {
  padding: 20px;
  text-align: center;
  color: #8c8c8c;
  font-size: 13px;
}

.selected-drafts-list {
  max-height: 400px;
  overflow-y: auto;
  
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

.account-group {
  & + & {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }
}

.account-group-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
  
  &:hover {
    background-color: #f5f5f5;
  }
}

.account-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #e5e7eb;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  
  svg {
    width: 14px;
    height: 14px;
  }
}

.account-header-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.account-group-name {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-group-count {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: normal;
  flex-shrink: 0;
}

.collapse-icon {
  font-size: 12px;
  color: #8c8c8c;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.account-group-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-draft-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #fafafa;
  }
}

.draft-info {
  flex: 1;
  min-width: 0;
}

.draft-title {
  font-size: 13px;
  color: #262626;
  font-weight: 500;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
  margin-bottom: 4px;
}

/* 折叠展开过渡效果 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
