<template>
  <div class="main-layout" :class="{ 'is-maximized': isMaximized }">
    <!-- 顶部导航栏 -->
    <header class="navbar">
      <div class="navbar-content">
        <!-- 左侧：Logo -->
        <div class="navbar-left">
          <div class="logo-section" @click="goToHome">
            <img src="@/assets/gqslogo.png" alt="Logo" class="logo-img" draggable="false" />
          </div>
        </div>
        <!-- 中间：导航链接 -->
        <nav class="navbar-center">
          <RouterLink to="/" class="nav-item" :class="{ 'nav-item-active': route.name === 'MultiAccountPanel' }" draggable="false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>多开面板</span>
          </RouterLink>
          <RouterLink to="/draft-box" class="nav-item" :class="{ 'nav-item-active': route.name === 'DraftBox' }" draggable="false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>草稿箱</span>
          </RouterLink>
          <RouterLink to="/editor" class="nav-item" :class="{ 'nav-item-active': route.name === 'Editor' }" draggable="false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 8H18M6 12H18M6 16H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>编辑器</span>
          </RouterLink>
        </nav>

        <!-- 右侧：用户头像和窗口控制 -->
        <div class="navbar-right">
          <!-- 任务中心 -->
          <TaskPopover 
            :tasks="taskList"
            @retry="handleRetryTask"
            @remove="handleRemoveTask"
            @clearCompleted="handleClearCompleted"
            @pause="handlePauseTask"
            @resume="handleResumeTask"
            @cancel="handleCancelTask"
          />
          
          <a-dropdown :trigger="['click']">
            <div class="user-section">
              <div class="user-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <span class="username-display">{{ userStore.getUsername || '用户' }}</span>
            </div>
            <template #overlay>
              <a-menu>
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined />
                  <span style="margin-left: 8px;">退出登录</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          
          <!-- 分割线 -->
          <div class="divider"></div>
          
          <!-- 窗口控制按钮 -->
          <div class="window-controls">
            <button class="window-btn" @click="minimizeWindow" title="最小化">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="window-btn" @click="maximizeWindow" :title="isMaximized ? '还原' : '最大化'">
              <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- 后面的窗口（只露出右上角） -->
                <path d="M4 4V2H10V8H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- 前面的窗口 -->
                <rect x="2" y="4" width="6" height="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="window-btn window-btn-close" @click="closeWindow" title="关闭">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 内容区域 -->
    <main class="layout-content">
      <div class="page-with-sidebar">
        <!-- 左侧：账号列表 -->
        <div v-show="route.name === 'MultiAccountPanel' || route.name === 'DraftBox'" class="account-list-wrapper">
          <AccountList ref="accountListRef" @manager-click="handleAccountManagerClick" />
        </div>
        
        <!-- 右侧：页面内容 -->
        <div class="page-content">
          <!-- 使用 v-show 保持 webview 状态，避免页面切换时 webview 刷新 -->
          <div v-show="route.name === 'MultiAccountPanel'" class="content-wrapper">
            <MultiAccountPanel />
          </div>
          <div v-show="route.name === 'DraftBox'" class="content-wrapper">
            <DraftBox />
          </div>
          <div v-show="route.name === 'Editor'" class="content-wrapper">
            <Editor />
          </div>
        </div>
      </div>
    </main>

    <!-- 账号管理器弹窗 -->
    <AccountManagerModal 
      v-model:open="showAccountManagerModal"
      @refresh="handleAccountManagerRefresh"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogoutOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useUserStoreHook } from '@/store/modules/user'
import { useTaskManager } from '@/composables/useTaskManager'
import { useAccountStore } from '@/store/modules/account'
import MultiAccountPanel from '@/views/MultiAccountPanel/index.vue'
import DraftBox from '@/views/DraftBox/index.vue'
import Editor from '@/views/Editor/index.vue'
import TaskPopover from '@/components/common/TaskPopover.vue'
import AccountList from '@/components/business/AccountList.vue'
import AccountManagerModal from '@/components/business/AccountManagerModal.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStoreHook()
const accountStore = useAccountStore()

// 任务管理
const { taskList, removeTask, clearCompleted, pauseTask, resumeTask, cancelTask } = useTaskManager()

// 窗口状态
const isMaximized = ref(false)

// AccountList 组件引用
const accountListRef = ref(null)

// 账号管理器弹窗
const showAccountManagerModal = ref(false)

// 窗口控制方法
const minimizeWindow = () => {
  if (window.electronAPI?.window) {
    window.electronAPI.window.minimize()
  }
}

const maximizeWindow = () => {
  if (window.electronAPI?.window) {
    window.electronAPI.window.maximize()
  }
}

const closeWindow = () => {
  if (window.electronAPI?.window) {
    window.electronAPI.window.close()
  }
}

// 返回主页
const goToHome = () => {
  router.push('/')
}

// 退出登录
const handleLogout = async () => {
  await userStore.logoutAction()
  message.success('已退出登录')
  router.push('/login')
}

// 任务操作
const handleRetryTask = (task) => {
  message.info('重试功能待实现')
  console.log('重试任务:', task)
}

const handleRemoveTask = (task) => {
  removeTask(task.id)
}

const handleClearCompleted = () => {
  clearCompleted()
  message.success('已清空已完成任务')
}

const handlePauseTask = (task) => {
  pauseTask(task.id)
  message.info('任务已暂停')
}

const handleResumeTask = (task) => {
  resumeTask(task.id)
  message.info('任务已恢复')
}

const handleCancelTask = (task) => {
  cancelTask(task.id)
  message.warning('任务已中止')
}

// 打开账号管理器
const handleAccountManagerClick = () => {
  showAccountManagerModal.value = true
}

// 账号管理器刷新回调
const handleAccountManagerRefresh = () => {
  // 刷新账号列表
  accountStore.fetchGroups()
}

// 检查窗口状态
const checkWindowState = async () => {
  if (window.electronAPI?.window) {
    try {
      isMaximized.value = await window.electronAPI.window.isMaximized()
    } catch (error) {
      console.error('获取窗口状态失败:', error)
    }
  }
}

// 监听窗口状态变化
const handleMaximizedChanged = (maximized) => {
  isMaximized.value = maximized
}

onMounted(() => {
  // 初始化检查窗口状态
  checkWindowState()
  // 监听窗口状态变化
  if (window.electronAPI?.window?.onMaximizedChanged) {
    window.electronAPI.window.onMaximizedChanged(handleMaximizedChanged)
  }
})

onUnmounted(() => {
  // 移除监听
  if (window.electronAPI?.window?.offMaximizedChanged) {
    window.electronAPI.window.offMaximizedChanged()
  }
})
</script>

<style scoped lang="scss">
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.navbar {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  -webkit-app-region: drag;
  user-select: none;
}

.navbar-content {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  max-width: 100%;
  position: relative;
}

// 左侧：搜索和Logo
.navbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: flex-start;
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  -webkit-app-region: no-drag;

  &:hover {
    background: #f3f4f6;
    color: #1f2937;
  }
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: opacity 0.2s;
  height: 31px;
  width: 110px;
  
  &:hover {
    opacity: 0.8;
  }
}

.logo-img {
  width: 110px;
  height: 31px;
  object-fit: contain;
  -webkit-user-drag: none;
  pointer-events: none;
}

.logo-text {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.logo-number {
  color: #1677ff;
}

.logo-name {
  color: #52c41a;
}

// 中间：导航链接
.navbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  padding: 0 24px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  color: #4a5568;
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.2s;
  white-space: nowrap;
  text-decoration: none;
  -webkit-app-region: no-drag;
  user-select: none;
  -webkit-user-drag: none;

  svg {
    flex-shrink: 0;
    color: #4a5568;
  }

  &:hover {
    background: #f3f4f6;
    color: #1f2937;
    
    svg {
      color: #1f2937;
    }
  }

  &.nav-item-active {
    background: rgba(var(--color-primary-rgb), 0.1);
    color: var(--color-primary);
    font-weight: 500;
    
    svg {
      color: var(--color-primary);
    }
    
    &:hover {
      background: rgba(var(--color-primary-rgb), 0.15);
    }
  }

  &.active {
    background: rgba(var(--color-primary-rgb), 0.1);
    color: var(--color-primary);
    font-weight: 500;
    
    svg {
      color: var(--color-primary);
    }
    
    &:hover {
      background: rgba(var(--color-primary-rgb), 0.15);
    }
  }
}

// 右侧：用户头像和窗口控制
.navbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 5px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
  margin-right: 10px;
  
  &:hover {
    background: #f5f5f5;
  }
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f0f0f0;
  border-radius: 50%;
  color: #8b92a0;
  transition: all 0.2s;
  flex-shrink: 0;
  
  .user-section:hover & {
    background: #e5e7eb;
    color: #6b7280;
  }
}

.username-display {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
}

.menu-username {
  font-weight: 500;
  color: #1f2937;
}

// 分割线
.divider {
  width: 1px;
  height: 18px;
  background: #e5e7eb;
  -webkit-app-region: no-drag;
}

// 窗口控制按钮
.window-controls {
  display: flex;
  align-items: center;
  gap: 0;
  margin-right: -10px;
}

.window-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 32px;
  border-radius: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
  position: relative;

  svg {
    pointer-events: none;
    position: relative;
    z-index: 1;
  }

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: transparent;
    transition: all 0.2s;
    pointer-events: none;
    z-index: 0;
  }

  &:hover {
    color: #1f2937;
    
    &::before {
      background: #f3f4f6;
    }
  }

  &:active {
    &::before {
      background: #e5e7eb;
    }
  }

  &.window-btn-close {
    &:hover {
      color: #ffffff;
      
      &::before {
        background: #ef4444;
      }
    }

    &:active {
      &::before {
        background: #dc2626;
      }
    }
  }
}

// 内容区域
.layout-content {
  flex: 1;
  overflow: auto;
  background: #f5f5f5;
}

// 页面布局
.page-with-sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  background: #ffffff;
  border-radius: 8px;
}

.account-list-wrapper {
  width: 280px;
  min-width: 280px;
  height: 100%;
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
}

.page-content {
  flex: 1;
  overflow: hidden;
  background: #f5f5f5;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
