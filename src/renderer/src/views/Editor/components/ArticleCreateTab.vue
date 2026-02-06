<template>
  <div class="article-create-tab">
    <!-- 账户选择界面（始终显示） -->
    <div class="account-selector">
      <div class="content-wrapper">
        <!-- 标题 -->
        <h1 class="page-title">创建文章</h1>

        <!-- 分组选择 tab -->
        <div class="group-tabs">
          <div
            class="group-tab"
            :class="{ active: activeGroupId === null }"
            @click="activeGroupId = null"
          >
            全部
          </div>
          <div
            v-for="group in accountStore.groups"
            :key="group.id"
            class="group-tab"
            :class="{ active: activeGroupId === group.id }"
            @click="activeGroupId = group.id"
          >
            {{ group.name }}
          </div>
          <div
            v-if="accountStore.ungroupedAccounts.length > 0"
            class="group-tab"
            :class="{ active: activeGroupId === 'ungrouped' }"
            @click="activeGroupId = 'ungrouped'"
          >
            未分组
          </div>
        </div>

        <!-- 胶囊搜索框 -->
        <div class="search-box">
          <a-input
            v-model:value="searchKeyword"
            placeholder="搜索账号"
            allow-clear
            class="search-input"
          >
            <template #prefix>
              <SearchOutlined class="search-icon" />
            </template>
          </a-input>
        </div>

        <!-- 账户列表 -->
        <div class="account-list">
          <WechatCreateMenu
            v-for="account in filteredAccounts"
            :key="account.id"
            :trigger="['hover']"
            placement="rightTop"
            :disabled="account.is_expired || account.platform_type !== 'wechat'"
            @action="(actionInfo) => handleAction(actionInfo, account)"
          >
            <div
              class="account-card"
              :class="{ expired: account.is_expired }"
            >
              <div class="account-avatar-wrapper">
                <img 
                  v-if="account.avatar" 
                  :src="account.avatar" 
                  class="account-avatar"
                  :class="{ expired: account.is_expired }"
                />
                <div 
                  v-else 
                  class="account-avatar-placeholder"
                  :class="{ expired: account.is_expired }"
                >
                  <UserOutlined />
                </div>
                <img 
                  :src="getPlatformIcon(account.platform_type)" 
                  class="platform-icon" 
                  alt="平台图标"
                />
              </div>
              <div 
                class="account-nickname"
                :class="{ expired: account.is_expired }"
              >
                {{ account.name }}
              </div>
            </div>
          </WechatCreateMenu>

          <!-- 空状态 -->
          <div v-if="filteredAccounts.length === 0" class="empty-state">
            <InboxOutlined class="empty-icon" />
            <div class="empty-text">暂无账号</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { message } from 'ant-design-vue'
import { 
  SearchOutlined, 
  UserOutlined, 
  InboxOutlined
} from '@ant-design/icons-vue'
import { useAccountStore } from '@/store/modules/account'
import WechatCreateMenu from '@/components/common/WechatCreateMenu.vue'

// 导入平台图标
import gzhIcon from '@/assets/platform-icon/gzh.png'
import redNoteIcon from '@/assets/platform-icon/red-note.png'
import tongyongIcon from '@/assets/platform-icon/tongyong.png'

// 账号管理 store
const accountStore = useAccountStore()

// 搜索关键词
const searchKeyword = ref('')

// 当前选中的分组ID（null 表示全部）
const activeGroupId = ref(null)

// 注入父组件提供的打开编辑器方法
const openEditor = inject('openEditor')

// 平台图标映射
const platformIconMap = {
  wechat: gzhIcon,
  xiaohongshu: redNoteIcon,
  default: tongyongIcon
}

// 获取平台图标
const getPlatformIcon = (platformType) => {
  return platformIconMap[platformType] || platformIconMap.default
}

// 过滤后的账户列表
const filteredAccounts = computed(() => {
  let accounts = []

  // 根据分组筛选
  if (activeGroupId.value === null) {
    // 全部账号
    accounts = accountStore.getAllAccounts
  } else if (activeGroupId.value === 'ungrouped') {
    // 未分组账号
    accounts = accountStore.ungroupedAccounts
  } else {
    // 指定分组的账号
    const group = accountStore.groups.find(g => g.id === activeGroupId.value)
    accounts = group?.accounts || []
  }

  // 只显示微信公众号
  accounts = accounts.filter(account => account.platform_type === 'wechat')

  // 根据搜索关键词筛选
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    accounts = accounts.filter(account =>
      account.name?.toLowerCase().includes(keyword)
    )
  }

  return accounts
})

// 处理操作
const handleAction = (actionInfo, account) => {
  if (!account) {
    message.error('请先选择一个账号')
    return
  }

  if (account.platform_type !== 'wechat') {
    message.warning('暂只支持微信公众号编辑器')
    return
  }

  if (account.is_expired) {
    message.error('账号认证已过期，请先在多开面板重新登录')
    return
  }

  // 解析 token
  let token = ''
  try {
    if (account.auth_data) {
      const authData = JSON.parse(account.auth_data)
      token = authData.token || ''
    }
  } catch (error) {
    console.error('[微信编辑器] 解析认证数据失败:', error)
    message.error('账号认证数据异常')
    return
  }

  if (!token) {
    message.error('账号缺少必要的认证信息')
    return
  }

  // 使用组件提供的 buildUrl 方法构建URL
  const url = actionInfo.buildUrl(token)

  // 调用父组件方法打开编辑器
  openEditor({
    url,
    accountId: account.id,
    title: actionInfo.title
  })
}
</script>

<style scoped lang="scss">
.article-create-tab {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

// 账户选择器样式
.account-selector {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

// 内容包裹器
.content-wrapper {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 35px;
}

// 页面标题
.page-title {
  font-size: 32px;
  font-weight: 600;
  color: #1f2937;
  text-align: center;
  margin: 0 0 8px 0;
}

// 胶囊搜索框
.search-box {
  flex-shrink: 0;
  display: flex;
  justify-content: center;

  .search-input {
    width: 100%;
    max-width: 400px;
    height: 44px;
    font-size: 14px;
    border-radius: 22px;
    
    :deep(.ant-input-affix-wrapper) {
      
      padding: 0 16px;
      background: #f9f9f9;
      border: 1px solid #e5e7eb;

      &:hover {
        border-color: var(--color-primary);
        background: #fff;
      }

      &:focus,
      &.ant-input-affix-wrapper-focused {
        border-color: var(--color-primary);
        background: #fff;
      }
    }
  }

  .search-icon {
    color: #9ca3af;
    font-size: 16px;
  }
}

// 分组 tabs
.group-tabs {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 0 8px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
}

.group-tab {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  color: #6b7280;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:hover {
    color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.1);
    border-color: rgba(var(--color-primary-rgb), 0.3);
  }

  &.active {
    color: #fff;
    background: var(--color-primary);
    border-color: var(--color-primary);
  }
}

// 账户列表
.account-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
  padding: 8px;
  overflow-y: auto;
  max-height: 280px;
  width: 100%;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
}

.account-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--color-primary);
    background: #f0f9ff;
  }

  &.expired {
    cursor: not-allowed;
    opacity: 0.6;

    &:hover {
      transform: none;
      box-shadow: none;
      border-color: transparent;
      background: transparent;
    }
  }
}

.account-avatar-wrapper {
  position: relative;
}

.account-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;

  &.expired {
    filter: grayscale(100%);
    opacity: 0.5;
  }
}

.account-avatar-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 24px;

  &.expired {
    opacity: 0.5;
  }
}

.platform-icon {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
}

.account-nickname {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.expired {
    color: #9ca3af;
  }
}

// 空状态
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: #9ca3af;
  width: 100%;
}

.empty-icon {
  font-size: 48px;
}

.empty-text {
  font-size: 14px;
}

</style>
