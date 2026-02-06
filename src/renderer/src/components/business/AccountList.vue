<template>
  <div class="account-list">
    <!-- 搜索框 -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          v-model="searchKeyword"
          type="text"
          class="search-input"
          placeholder="搜索账号"
          @input="handleSearch"
        />
      </div>
      <button class="add-button" @click="handleAdd">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>

    <!-- 账号管理器按钮 -->
    <div class="account-manager-btn" @click="handleAccountManager">
      <svg class="manager-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
      <span class="manager-text">账号管理器</span>
    </div>

    <!-- 加载状态 -->
    <div v-if="accountStore.loading" class="loading-container">
      <a-spin />
    </div>

    <!-- 空数据状态 -->
    <div v-else-if="filteredGroups.length === 0 && filteredUngroupedAccounts.length === 0" class="empty-container">
      <a-empty description="暂无账号数据" :image-style="{ height: '75px' }">
      </a-empty>
    </div>

    <!-- 分组列表 -->
    <div v-else class="groups-container" ref="groupsContainer">
      <!-- 没有分组时，未分组账号直接显示 -->
      <div v-if="filteredUngroupedAccounts.length > 0 && filteredGroups.length === 0" class="ungrouped-accounts" data-group-id="ungrouped">
        <a-dropdown
          v-for="account in filteredUngroupedAccounts"
          :key="account.id"
          :trigger="['contextmenu']"
        >
          <div
            class="account-item"
            :class="{ 
              'account-selected': selectedAccountId === account.id,
              'account-expired': account.is_expired
            }"
            :data-account-id="account.id"
            @click="selectAccount(account)"
          >
            <!-- 账号头像 -->
            <div class="account-avatar">
              <img
                v-if="account.avatar"
                :src="account.avatar"
                :alt="account.name"
              />
              <div v-else class="avatar-placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>

            <!-- 账号信息 -->
            <div class="account-info">
              <div class="account-name">{{ account.name }}</div>
            </div>

            <!-- 平台图标 -->
            <img 
              class="platform-icon" 
              :src="getPlatformIcon(account.platform_type)" 
              :alt="account.platform_type"
            />
          </div>
          <template #overlay>
            <a-menu @click="(e) => handleContextMenu(e, account)">
              <a-menu-item key="changeGroup">
                <span>修改分组</span>
              </a-menu-item>
              <a-menu-item key="delete" style="color: #ff4d4f;">
                <span>删除账号</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>

      <!-- 有分组时，未分组账号放到"未分组"分组里（显示在第一位） -->
      <div
        v-if="filteredUngroupedAccounts.length > 0 && filteredGroups.length > 0"
        class="group-item"
      >
        <!-- 未分组头部 -->
        <div class="group-header" @click="toggleUngroupedExpanded">
          <span class="group-name">未分组</span>
          <svg
            class="chevron-icon"
            :class="{ 'chevron-expanded': ungroupedExpanded }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <!-- 未分组账号列表 -->
        <div
          v-show="ungroupedExpanded"
          class="accounts-list"
          data-group-id="ungrouped"
        >
          <a-dropdown
            v-for="account in filteredUngroupedAccounts"
            :key="account.id"
            :trigger="['contextmenu']"
          >
            <div
              class="account-item"
              :class="{ 
                'account-selected': selectedAccountId === account.id,
                'account-expired': account.is_expired
              }"
              :data-account-id="account.id"
              @click="selectAccount(account)"
            >
              <!-- 账号头像 -->
              <div class="account-avatar">
                <img
                  v-if="account.avatar"
                  :src="account.avatar"
                  :alt="account.name"
                />
                <div v-else class="avatar-placeholder">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>

              <!-- 账号信息 -->
              <div class="account-info">
                <div class="account-name">{{ account.name }}</div>
              </div>

              <!-- 平台图标 -->
              <img 
                class="platform-icon" 
                :src="getPlatformIcon(account.platform_type)" 
                :alt="account.platform_type"
              />
            </div>
            <template #overlay>
              <a-menu @click="(e) => handleContextMenu(e, account)">
                <a-menu-item key="changeGroup">
                  <span>修改分组</span>
                </a-menu-item>
                <a-menu-item key="delete" style="color: #ff4d4f;">
                  <span>删除账号</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>

      <!-- 分组 -->
      <div
        v-for="group in filteredGroups"
        :key="group.id"
        class="group-item"
      >
        <!-- 分组头部 -->
        <a-dropdown :trigger="['contextmenu']">
          <div class="group-header" @click="toggleGroup(group.id)">
            <span class="group-name">{{ group.name }}</span>
            <svg
              class="chevron-icon"
              :class="{ 'chevron-expanded': group.expanded }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <template #overlay>
            <a-menu @click="(e) => handleGroupContextMenu(e, group)">
              <a-menu-item key="rename">
                <span>修改分组名称</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>

        <!-- 账号列表 -->
        <div
          v-show="group.expanded"
          class="accounts-list"
          :data-group-id="group.id"
        >
          <a-dropdown
            v-for="account in group.accounts"
            :key="account.id"
            :trigger="['contextmenu']"
          >
            <div
              class="account-item"
              :class="{ 
                'account-selected': selectedAccountId === account.id,
                'account-expired': account.is_expired
              }"
              :data-account-id="account.id"
              @click="selectAccount(account)"
            >
              <!-- 账号头像 -->
              <div class="account-avatar">
                <img
                  v-if="account.avatar"
                  :src="account.avatar"
                  :alt="account.name"
                />
                <div v-else class="avatar-placeholder">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>

              <!-- 账号信息 -->
              <div class="account-info">
                <div class="account-name">{{ account.name }}</div>
              </div>

              <!-- 平台图标 -->
              <img 
                class="platform-icon" 
                :src="getPlatformIcon(account.platform_type)" 
                :alt="account.platform_type"
              />
            </div>
            <template #overlay>
              <a-menu @click="(e) => handleContextMenu(e, account)">
                <a-menu-item key="changeGroup">
                  <span>修改分组</span>
                </a-menu-item>
                <a-menu-item key="delete" style="color: #ff4d4f;">
                  <span>删除账号</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </div>

    <!-- 添加账号弹窗 -->
    <PlatformSelectModal
      v-model:open="showAddModal"
      @select="handlePlatformSelect"
    />

    <!-- 微信登录弹窗 -->
    <WeChatLoginModal
      v-model:open="showWechatLogin"
      @success="handleWechatLoginSuccess"
      @cancel="handleWechatLoginCancel"
    />

    <!-- 修改分组弹窗 -->
    <GroupSelectModal
      v-model:open="showGroupSelectModal"
      :account="currentEditAccount"
      @confirm="handleGroupSelectConfirm"
      @cancel="handleGroupSelectCancel"
    />

    <!-- 修改分组名称弹窗 -->
    <a-modal
      v-model:open="showRenameGroupModal"
      title="修改分组名称"
      :okText="'确定'"
      :cancelText="'取消'"
      @ok="handleRenameGroupConfirm"
      @cancel="handleRenameGroupCancel"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="分组名称">
          <a-input
            v-model:value="editGroupName"
            placeholder="请输入分组名称"
            @pressEnter="handleRenameGroupConfirm"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 通用平台创建弹窗 -->
    <GeneralPlatformModal
      v-model:open="showGeneralPlatformModal"
      @success="handleGeneralPlatformSuccess"
      @cancel="handleGeneralPlatformCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import Sortable from 'sortablejs'
import PlatformSelectModal from './PlatformSelectModal.vue'
import WeChatLoginModal from './WeChatLoginModal.vue'
import GroupSelectModal from './GroupSelectModal.vue'
import GeneralPlatformModal from './GeneralPlatformModal.vue'
import { useAccountStore } from '@/store/modules/account'
import { useUserStore } from '@/store/modules/user'

// 平台图标
import gzhIcon from '@/assets/platform-icon/gzh.png'
import douyinIcon from '@/assets/platform-icon/douyin.png'
import bilibiliIcon from '@/assets/platform-icon/bilibili.png'
import redNoteIcon from '@/assets/platform-icon/red-note.png'
import tongyongIcon from '@/assets/platform-icon/tongyong.png'

// 平台图标映射
const platformIconMap = {
  wechat: gzhIcon,
  douyin: douyinIcon,
  bilibili: bilibiliIcon,
  xiaohongshu: redNoteIcon,
  rednote: redNoteIcon,
  general: tongyongIcon
}

// 获取平台图标
const getPlatformIcon = (platformType) => {
  return platformIconMap[platformType] || tongyongIcon
}

const emit = defineEmits(['account-select', 'add-click', 'manager-click'])

// 使用 Store
const accountStore = useAccountStore()
const userStore = useUserStore()
const route = useRoute()

// 搜索关键词
const searchKeyword = ref('')

// 判断当前是否在多开面板页面
const isMultiPanelPage = computed(() => route.name === 'MultiAccountPanel')

// 选中的账号ID - 根据当前页面使用对应的状态
const selectedAccountId = computed(() => {
  return isMultiPanelPage.value 
    ? accountStore.multiPanelSelectedAccountId 
    : accountStore.draftBoxSelectedAccountId
})

// 分组容器引用
const groupsContainer = ref(null)

// 存储每个分组的 Sortable 实例
const sortableInstances = ref({})

// 弹窗显示状态
const showAddModal = ref(false)
const showWechatLogin = ref(false)
const showGroupSelectModal = ref(false)
const showRenameGroupModal = ref(false)
const showGeneralPlatformModal = ref(false)

// 分组选择相关
const currentEditAccount = ref(null)

// 分组重命名相关
const currentEditGroup = ref(null)
const editGroupName = ref('')

// 未分组展开状态
const ungroupedExpanded = ref(true)

// 过滤后的分组（根据搜索关键词，草稿箱页面只显示微信账号）
const filteredGroups = computed(() => {
  const keyword = searchKeyword.value.toLowerCase().trim()
  
  return accountStore.groups
    .map(group => {
      let accounts = group.accounts || []
      
      // 草稿箱页面只显示微信账号
      if (!isMultiPanelPage.value) {
        accounts = accounts.filter(account => account.platform_type === 'wechat')
      }
      
      // 搜索过滤
      if (keyword) {
        accounts = accounts.filter(account =>
          account.name.toLowerCase().includes(keyword)
        )
      }
      
      return {
        ...group,
        accounts
      }
    })
    .filter(group => group.accounts.length > 0)
})

// 过滤后的未分组账号（草稿箱页面只显示微信账号）
const filteredUngroupedAccounts = computed(() => {
  let accounts = accountStore.ungroupedAccounts
  
  // 草稿箱页面只显示微信账号
  if (!isMultiPanelPage.value) {
    accounts = accounts.filter(account => account.platform_type === 'wechat')
  }
  
  // 搜索过滤
  const keyword = searchKeyword.value.toLowerCase().trim()
  if (keyword) {
    accounts = accounts.filter(account =>
      account.name.toLowerCase().includes(keyword)
    )
  }
  
  return accounts
})

// 加载账号数据
const loadAccounts = async () => {
  // 只有登录状态才加载
  if (!userStore.isLoggedIn) {
    return
  }
  
  const result = await accountStore.fetchGroups()
  if (!result.success) {
    message.error(result.message || '加载账号失败')
  }
}

// 切换分组展开/收起
const toggleGroup = async (groupId) => {
  await accountStore.toggleGroupExpanded(groupId)
}

// 切换未分组展开/收起
const toggleUngroupedExpanded = () => {
  ungroupedExpanded.value = !ungroupedExpanded.value
}

// 选择账号
const selectAccount = (account) => {
  if (isMultiPanelPage.value) {
    accountStore.selectMultiPanelAccount(account)
  } else {
    accountStore.selectDraftBoxAccount(account)
  }
  emit('account-select', account)
}

// 处理搜索
const handleSearch = () => {
  // 搜索时自动展开有结果的分组
  filteredGroups.value.forEach(group => {
    if (group.accounts.length > 0) {
      group.expanded = true
    }
  })
}

// 处理添加按钮点击
const handleAdd = () => {
  showAddModal.value = true
  emit('add-click')
}

// 处理账号管理器按钮点击
const handleAccountManager = () => {
  emit('manager-click')
}

// 处理平台选择
const handlePlatformSelect = (platform) => {
  console.log('选择平台:', platform)
  
  // 根据平台类型打开对应的登录流程
  if (platform.key === 'wechat') {
    // 打开微信登录弹窗
    showWechatLogin.value = true
  } else if (platform.key === 'general') {
    // 打开通用平台创建弹窗
    showGeneralPlatformModal.value = true
  } else {
    // 其他平台后续实现
    message.info(`${platform.name} 登录功能开发中...`)
  }
}

// 获取或创建分组
const getOrCreateGroup = async (groupName) => {
  // 查找是否已存在
  let group = accountStore.groups.find(g => g.name === groupName)
  if (group) {
    return group
  }
  
  // 创建新分组
  const result = await accountStore.createGroupAction({
    name: groupName,
    expanded: true
  })
  
  if (result.success) {
    return result.data
  }
  
  return null
}

// 处理微信登录成功
const handleWechatLoginSuccess = () => {
  showWechatLogin.value = false
}

// 处理微信登录取消
const handleWechatLoginCancel = () => {
  showWechatLogin.value = false
}

// 处理通用平台创建成功
const handleGeneralPlatformSuccess = (account) => {
  console.log('通用平台账号创建成功:', account)
  showGeneralPlatformModal.value = false
}

// 处理通用平台创建取消
const handleGeneralPlatformCancel = () => {
  showGeneralPlatformModal.value = false
}

// 处理右键菜单点击
const handleContextMenu = (e, account) => {
  if (e.key === 'changeGroup') {
    currentEditAccount.value = account
    showGroupSelectModal.value = true
  } else if (e.key === 'delete') {
    Modal.confirm({
      title: '确定要删除该账号吗？',
      content: `账号名称：${account.name}`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        const result = await accountStore.deleteAccountAction(account.id)
        
        if (result.success) {
          message.success('删除账号成功')
        } else {
          message.error(result.message || '删除账号失败')
        }
      }
    })
  }
}

// 处理分组选择确认
const handleGroupSelectConfirm = async ({ account, groupId }) => {
  const result = await accountStore.changeAccountGroup(account.id, groupId)

  if (result.success) {
    message.success('修改分组成功')
  } else {
    message.error(result.message || '修改分组失败')
  }

  currentEditAccount.value = null
}

// 处理分组选择取消
const handleGroupSelectCancel = () => {
  currentEditAccount.value = null
}

// 处理分组右键菜单点击
const handleGroupContextMenu = (e, group) => {
  if (e.key === 'rename') {
    currentEditGroup.value = group
    editGroupName.value = group.name
    showRenameGroupModal.value = true
  }
}

// 处理修改分组名称确认
const handleRenameGroupConfirm = async () => {
  if (!editGroupName.value.trim()) {
    message.warning('请输入分组名称')
    return
  }

  if (editGroupName.value === currentEditGroup.value.name) {
    showRenameGroupModal.value = false
    return
  }

  const result = await accountStore.updateGroupAction(currentEditGroup.value.id, {
    name: editGroupName.value.trim()
  })

  if (result.success) {
    message.success('修改分组名称成功')
    showRenameGroupModal.value = false
    currentEditGroup.value = null
    editGroupName.value = ''
  } else {
    message.error(result.message || '修改分组名称失败')
  }
}

// 处理修改分组名称取消
const handleRenameGroupCancel = () => {
  showRenameGroupModal.value = false
  currentEditGroup.value = null
  editGroupName.value = ''
}

// 销毁所有 Sortable 实例
const destroySortable = () => {
  Object.values(sortableInstances.value).forEach(instance => {
    if (instance && typeof instance.destroy === 'function') {
      instance.destroy()
    }
  })
  sortableInstances.value = {}
}

// 初始化拖拽排序
const initSortable = () => {
  nextTick(() => {
    // 先销毁旧的实例，避免指向已销毁的 DOM 元素
    destroySortable()
    
    // 为未分组账号列表初始化拖拽
    const ungroupedList = document.querySelector('[data-group-id="ungrouped"]')
    if (ungroupedList) {
      sortableInstances.value['ungrouped'] = Sortable.create(ungroupedList, {
        animation: 150,
        handle: '.account-item',
        ghostClass: 'account-ghost',
        chosenClass: 'account-chosen',
        dragClass: 'account-drag',
        onEnd: async (evt) => {
          const { oldIndex, newIndex } = evt
          if (oldIndex !== newIndex) {
            const accounts = [...accountStore.ungroupedAccounts]
            const [removed] = accounts.splice(oldIndex, 1)
            accounts.splice(newIndex, 0, removed)
            
            // 生成新的排序项
            const sortItems = accounts.map((account, index) => ({
              id: account.id,
              sort_order: index
            }))
            
            // 更新到后端（未分组的groupId为null）
            await accountStore.sortAccountsAction(null, sortItems)
          }
        }
      })
    }
    
    // 为每个分组的账号列表初始化拖拽
    filteredGroups.value.forEach(group => {
      const groupId = group.id
      const accountsList = document.querySelector(`[data-group-id="${groupId}"]`)
      
      if (accountsList) {
        sortableInstances.value[groupId] = Sortable.create(accountsList, {
          animation: 150,
          handle: '.account-item',
          ghostClass: 'account-ghost',
          chosenClass: 'account-chosen',
          dragClass: 'account-drag',
          onEnd: async (evt) => {
            const { oldIndex, newIndex } = evt
            if (oldIndex !== newIndex) {
              const group = accountStore.groups.find(g => g.id === groupId)
              if (group && group.accounts) {
                // 本地更新顺序
                const accounts = [...group.accounts]
                const [removed] = accounts.splice(oldIndex, 1)
                accounts.splice(newIndex, 0, removed)
                
                // 生成新的排序项
                const sortItems = accounts.map((account, index) => ({
                  id: account.id,
                  sort_order: index
                }))
                
                // 更新到后端
                await accountStore.sortAccountsAction(groupId, sortItems)
              }
            }
          }
        })
      }
    })
  })
}

// 监听分组和未分组账号变化，重新初始化拖拽
watch(
  [() => filteredGroups.value, () => filteredUngroupedAccounts.value],
  () => {
    initSortable()
  },
  { deep: true }
)




// 生命周期
onMounted(() => {
  console.log("AccountList onMounted");
  
  loadAccounts()
})

// 组件卸载时清理 Sortable 实例
onBeforeUnmount(() => {
  destroySortable()
})

</script>

<style scoped lang="scss">
.account-list {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-bar {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-width: 0;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #eeeeee;
  border-radius: 8px;
  padding: 4px 12px;
  flex: 1;
  min-width: 0;
}

.search-icon {
  width: 18px;
  height: 18px;
  color: #9ca3af;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1f2937;
  
  &::placeholder {
    color: #9ca3af;
  }
}

.add-button {
  width: 36px;
  height: 36px;
  min-width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-sizing: border-box;
  
  &:hover {
    background-color: rgba(102, 102, 255, 0.85);
    transform: scale(1.05);
  }
  
  &:active {
    background-color: rgba(102, 102, 255, 0.75);
    transform: scale(0.95);
  }
  
  svg {
    width: 18px;
    height: 18px;
    color: #ffffff;
    flex-shrink: 0;
  }
}

.account-manager-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 12px 12px;
  padding: 8px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #ebebeb;
    border-color: #d9d9d9;
  }
  
  &:active {
    background: #e0e0e0;
  }
}

.manager-icon {
  width: 16px;
  height: 16px;
  color: #666;
  margin-right: 6px;
  flex-shrink: 0;
}

.manager-text {
  font-size: 13px;
  color: #333;
}

.loading-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

:deep(.ant-empty-description) {
  font-size: 13px;
  color: #4a5568;
}

.groups-container {
  flex: 1;
  overflow-y: scroll;
  padding: 0 12px 12px;
}

.ungrouped-accounts {
  margin-bottom: 12px;
}

.group-item {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 1;
  background: #fff;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  cursor: pointer;
  user-select: none;
}

.chevron-icon {
  width: 16px;
  height: 16px;
  color: #6b7280;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.chevron-expanded {
  transform: rotate(180deg);
}

.group-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.accounts-list {
}

.account-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
  
  &.account-selected {
    background-color: rgba(102, 102, 255, 0.12);
    border-color: rgba(102, 102, 255, 0.3);
    box-shadow: 0 1px 3px rgba(102, 102, 255, 0.1);
    
    .account-name {
      color: #6666ff;
      font-weight: 500;
    }
  }

  &.account-expired {
    opacity: 0.5;
    
    .account-name {
      color: #9ca3af;
    }
  }
}

.account-ghost {
  opacity: 0.4;
}

.account-chosen {
  background-color: rgba(0, 0, 0, 0.05);
}

.account-drag {
  opacity: 0.8;
}

.account-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
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
    width: 20px;
    height: 20px;
  }
}

.account-info {
  flex: 1;
  min-width: 0;
}

.account-name {
  font-size: 14px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.platform-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-left: 8px;
  opacity: 0.8;
  object-fit: contain;
}

/* 滚动条样式 */
.groups-container::-webkit-scrollbar {
  width: 6px;
}

.groups-container::-webkit-scrollbar-track {
  background: transparent;
}

.groups-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.groups-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
