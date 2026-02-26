<template>
  <div class="editor-container">
    <div class="editor-content">
      <!-- 内容区域 -->
      <div class="content-area">
        <ATabs type="editable-card" :active-key="activeTabKey"
          @change="handleTabChange" @edit="handleTabEdit">
          <ATabPane v-for="tab in editorTabs" :key="tab.key" :closable="tab.closable !== false">
            <template #tab>
              <div class="tab-title">
                <img v-if="tab.avatar" :src="tab.avatar" class="tab-avatar" alt="账号头像" />
                <span>{{ tab.title }}</span>
              </div>
            </template>
            <!-- 如果是文章创建 tab -->
            <ArticleCreateTab v-if="tab.type === 'create'" />
            <!-- 如果是 webview tab -->
            <div v-else class="webview-container">
              <!-- Webview -->
              <div class="webview-wrapper">
                <AppWebview :ref="(el) => setWebviewRef(tab.key, el)" :src="tab.url" :partition="tab.partition"
                  class="webview-view" @ready="() => handleWebviewReady(tab.key)" />
              </div>
              <!-- 右侧工具栏 -->
              <div class="editor-toolbar" :class="{ collapsed: toolbarCollapsed }">
                <div class="toolbar-toggle" @click="toggleToolbar">
                  <RightOutlined v-if="!toolbarCollapsed" />
                  <LeftOutlined v-else />
                </div>
                <div class="toolbar-content">
                  <EditorToolbar />
                </div>
              </div>
            </div>
          </ATabPane>
        </ATabs>
      </div>
    </div>
    
    <!-- 公众号选择器 -->
    <AccountSelector
      v-model:visible="accountSelectorVisible"
      :exclude-account-ids="currentSyncInfo ? [currentSyncInfo.accountId] : []"
      ok-text="开始同步"
      @confirm="handleAccountSelectorConfirm"
      @cancel="handleAccountSelectorCancel"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, provide } from 'vue'
import { Tabs as ATabs, message } from 'ant-design-vue'
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { useRoute } from 'vue-router'
import AppWebview from '@/components/common/AppWebview.vue'
import ArticleCreateTab from './components/ArticleCreateTab.vue'
import EditorToolbar from './components/EditorToolbar.vue'
import { useAccountStore } from '@/store/modules/account'
import { deserializePartition } from '@/utils/partitionHelper'

const ATabPane = ATabs.TabPane

// 导入微信编辑器服务
import { initWechatEditorPage, parseSyncMessage, parseSaveDraftMessage, parsePublishMessage } from './services/wechat-editor.js'
import AccountSelector from '@/components/common/AccountSelector.vue'
import { getDraftDetail } from '@/.thidparty_api/wechat'
import { createSyncWechatDraftTask } from '@/utils/wechat'
import { useTaskManager } from '@/composables/useTaskManager'

// 记录保存草稿统计（通过主进程绕过 CORS）
const recordSaveStats = async () => {
  console.log('开始调用 recordSaveStats')
  try {
    const result = await window.electronAPI.http.recordSaveStats()
    if (result.ok) {
      console.log('保存草稿统计记录成功:', result.data)
    } else {
      console.error('保存草稿统计记录失败:', result.error)
    }
  } catch (error) {
    console.error('保存草稿统计记录失败:', error)
    // 统计失败不影响主流程
  }
  console.log('recordSaveStats 调用结束')
}

// 记录同步统计（通过主进程绕过 CORS）
const recordSyncStats = async () => {
  console.log('开始调用 recordSyncStats')
  try {
    const result = await window.electronAPI.http.recordSyncStats()
    if (result.ok) {
      console.log('同步统计记录成功:', result.data)
    } else {
      console.error('同步统计记录失败:', result.error)
    }
  } catch (error) {
    console.error('同步统计记录失败:', error)
    // 统计失败不影响主流程
  }
  console.log('recordSyncStats 调用结束')
}

// 记录发表统计（通过主进程绕过 CORS）
const recordPublishStats = async () => {
  console.log('开始调用 recordPublishStats')
  try {
    const result = await window.electronAPI.http.recordPublishStats()
    if (result.ok) {
      console.log('发表统计记录成功:', result.data)
    } else {
      console.error('发表统计记录失败:', result.error)
    }
  } catch (error) {
    console.error('发表统计记录失败:', error)
    // 统计失败不影响主流程
  }
  console.log('recordPublishStats 调用结束')
}

// 路由
const route = useRoute()

// 编辑器 tab 数据
const editorTabs = ref([])
const activeTabKey = ref('')
// 存储每个 tab 的 webview 组件引用
const webviewRefs = ref({})

// 账号管理store
const accountStore = useAccountStore()

// 使用任务管理器
const { showTaskPopover } = useTaskManager()

// 工具栏收起/展开状态
const toolbarCollapsed = ref(false)

// 公众号选择器显示状态
const accountSelectorVisible = ref(false)

// 当前要同步的草稿信息 { appmsgid, accountId, tabKey }
const currentSyncInfo = ref(null)

// 切换工具栏收起/展开
const toggleToolbar = () => {
  toolbarCollapsed.value = !toolbarCollapsed.value
}

// 设置 webview 组件引用
const setWebviewRef = (tabKey, el) => {
  if (el) {
    webviewRefs.value[tabKey] = el
  }
}

// 处理 webview 加载完成事件，初始化微信编辑器页面
const handleWebviewReady = async (tabKey) => {
  const webview = webviewRefs.value[tabKey]
  if (!webview) {
    console.warn('[编辑器] webview 引用不存在:', tabKey)
    return
  }
  
  // 查找对应的 tab 信息
  const tab = editorTabs.value.find(t => t.key === tabKey)
  if (!tab || tab.platformType !== 'wechat') {
    // 非微信公众号平台，跳过初始化
    return
  }
  
  console.log('[编辑器] webview 加载完成，开始初始化微信编辑器页面:', tabKey)
  
  try {
    await initWechatEditorPage(webview)
    
    // 设置 console-message 监听器，用于接收同步按钮点击事件
    const webviewEl = webview.getWebviewElement()
    if (webviewEl) {
      setupWebviewConsoleListener(webviewEl, tabKey)
    }
  } catch (error) {
    console.error('[编辑器] 初始化微信编辑器页面失败:', error)
  }
}

// 设置 webview console 消息监听器
const setupWebviewConsoleListener = (webviewEl, tabKey) => {
  // 检查是否已经设置过监听器
  if (webviewEl._easydraftConsoleListener) {
    return
  }
  
  const listener = (event) => {
    const msg = event.message
    const syncData = parseSyncMessage(msg)
    const saveDraftData = parseSaveDraftMessage(msg)
    const publishData = parsePublishMessage(msg)
    
    if (syncData && syncData.appmsgid) {
      console.log('[编辑器] 收到同步请求:', syncData)
      
      // 记录同步统计
      recordSyncStats()
      
      // 查找对应的 tab 获取 accountId
      const tab = editorTabs.value.find(t => t.key === tabKey)
      if (tab && tab.accountId) {
        // 保存同步信息
        currentSyncInfo.value = {
          appmsgid: syncData.appmsgid,
          accountId: tab.accountId,
          tabKey
        }
        // 显示公众号选择器
        accountSelectorVisible.value = true
      } else {
        message.error('无法获取当前账号信息')
      }
    } else if (saveDraftData) {
      console.log('[编辑器] 收到保存草稿成功消息:', saveDraftData)
      // 调用保存草稿统计
      recordSaveStats()
    } else if (publishData) {
      console.log('[编辑器] 收到发表成功消息:', publishData)
      // 调用发表统计
      recordPublishStats()
    }
  }
  
  webviewEl.addEventListener('console-message', listener)
  webviewEl._easydraftConsoleListener = listener
}

// 确认选择公众号并开始同步
const handleAccountSelectorConfirm = async (selectedAccounts) => {
  if (!currentSyncInfo.value) {
    return
  }
  
  if (selectedAccounts.length === 0) {
    message.warning('请选择至少一个公众号')
    return
  }
  
  const { appmsgid, accountId } = currentSyncInfo.value
  
  try {
    // 显示加载提示
    const hide = message.loading('正在获取草稿详情...', 0)
    
    // 调用获取草稿详情接口
    const result = await getDraftDetail(accountId, appmsgid)
    
    // 关闭加载提示
    hide()
    
    if (!result.success) {
      message.error('获取草稿详情失败')
      return
    }
    
    console.log('[编辑器] 获取草稿详情成功:', result.app_msg_info)
    
    // 获取草稿标题
    const draftTitle = result.app_msg_info.item?.[0]?.multi_item?.[0]?.title || '无标题'
    
    // 创建同步任务
    createSyncWechatDraftTask(result.app_msg_info, selectedAccounts, {
      taskName: `同步《${draftTitle}》`,
      delayMs: 1000
    }).then(() => {
      console.log('[编辑器] 同步任务完成')
    }).catch(error => {
      console.error('[编辑器] 同步任务失败:', error)
    })
    
    // 打开任务中心弹窗
    showTaskPopover()
    
    // 提示用户任务已开始
    message.success(`已开始同步到 ${selectedAccounts.length} 个公众号`, 2)
    
  } catch (error) {
    console.error('[编辑器] 同步失败:', error)
    message.error(error.message || '同步失败')
  } finally {
    // 清除当前同步信息
    currentSyncInfo.value = null
  }
}

// 取消选择公众号
const handleAccountSelectorCancel = () => {
  currentSyncInfo.value = null
}

// 切换 tab
const handleTabChange = (key) => {
  activeTabKey.value = key
}

// 创建"创建文章"tab
const createArticleTab = () => {
  const tabKey = `create-${Date.now()}`
  editorTabs.value.push({
    key: tabKey,
    title: '创建文章',
    type: 'create',
    closable: true
  })
  activeTabKey.value = tabKey
  return tabKey
}

// 关闭 tab 或添加 tab
const handleTabEdit = (targetKey, action) => {
  if (action === 'remove') {
    const targetIndex = editorTabs.value.findIndex(tab => tab.key === targetKey)
    if (targetIndex === -1) return

    const isActive = activeTabKey.value === targetKey

    editorTabs.value.splice(targetIndex, 1)

    // 清理 webview 引用
    delete webviewRefs.value[targetKey]

    if (isActive) {
      const fallbackTab = editorTabs.value[targetIndex] || editorTabs.value[targetIndex - 1]
      activeTabKey.value = fallbackTab ? fallbackTab.key : ''
    }

    // 如果所有tab都删除完了，自动创建一个新的"创建文章"tab
    if (editorTabs.value.length === 0) {
      createArticleTab()
    }
  } else if (action === 'add') {
    // 点击加号按钮，创建新的文章创建 tab
    createArticleTab()
  }
}

// 处理打开编辑器事件
const handleOpenEditor = async ({ url, accountId, title }) => {
  // 获取账号信息
  const account = accountStore.getAccountById(accountId)
  if (!account) {
    message.error('找不到对应的账号')
    return
  }

  // 创建临时 partition
  const partition = `temp:editor-${new Date().getTime()}`

  // 恢复认证数据到新 partition
  try {
    if (account.auth_data) {
      const authData = JSON.parse(account.auth_data)
      if (authData.partition) {
        await deserializePartition(authData.partition, partition)
        console.log(`[编辑器] 已恢复账号 ${account.name} 的认证数据`)
      }
    }
  } catch (error) {
    console.error('[编辑器] 恢复认证数据失败:', error)
    message.error('恢复账号认证数据失败')
    return
  }

  // 查找当前活动的tab
  const currentTabIndex = editorTabs.value.findIndex(tab => tab.key === activeTabKey.value)
  const currentTab = editorTabs.value[currentTabIndex]

  // 如果当前tab是"创建文章"类型，则替换它
  if (currentTab && currentTab.type === 'create') {
    // 清理当前tab的webview引用（如果有）
    if (webviewRefs.value[currentTab.key]) {
      delete webviewRefs.value[currentTab.key]
    }

    // 替换当前tab
    editorTabs.value[currentTabIndex] = {
      key: currentTab.key, // 保持相同的key
      title,
      accountId,
      platformType: account.platform_type,
      avatar: account.avatar,
      url,
      partition,
      closable: true
    }
  } else {
    // 如果当前tab不是"创建文章"类型，则创建新tab
    const tabKey = `editor-${Date.now()}`
    editorTabs.value.push({
      key: tabKey,
      title,
      accountId,
      platformType: account.platform_type,
      avatar: account.avatar,
      url,
      partition,
      closable: true
    })
    activeTabKey.value = tabKey
  }
}

// 获取当前活动 tab 的 webview 组件
const getActiveWebview = () => {
  const currentTab = editorTabs.value.find(tab => tab.key === activeTabKey.value)
  if (!currentTab || currentTab.type === 'create') {
    return null
  }
  return webviewRefs.value[activeTabKey.value] || null
}

// 通过 provide 向子组件提供打开编辑器的方法和获取webview的方法
provide('openEditor', handleOpenEditor)
provide('getActiveWebview', getActiveWebview)
provide('activeTabKey', activeTabKey)

// 监听路由变化，处理草稿编辑和创建，目前只适配了微信公众号
watch(() => route.query, async (query) => {
  // 处理草稿编辑
  if (query.action === 'edit-draft' && query.accountId && query.appmsgId) {
    const accountId = parseInt(query.accountId)
    const account = accountStore.getAccountById(accountId)
    
    if (!account) {
      message.error('找不到对应的账号')
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
      console.error('[编辑器] 解析认证数据失败:', error)
      message.error('账号认证数据异常')
      return
    }

    if (!token) {
      message.error('账号缺少必要的认证信息')
      return
    }

    // 构建草稿编辑URL
    const url = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${query.appmsgId}&isMul=1&replaceScene=0&isSend=0&isFreePublish=0&token=${token}&lang=zh_CN`
    const title = query.draftTitle || '编辑草稿'

    await handleOpenEditor({
      url,
      accountId,
      title
    })
  }
  
  // 处理草稿创建（从草稿箱传递过来的创建事件）
  if (query.action === 'create' && query.accountId && query.url) {
    const accountId = parseInt(query.accountId)
    const account = accountStore.getAccountById(accountId)
    
    if (!account) {
      message.error('找不到对应的账号')
      return
    }

    const url = query.url
    const title = query.title || '新建文章'

    await handleOpenEditor({
      url,
      accountId,
      title
    })
  }
}, { immediate: true })

// 组件挂载时初始化一个创建文章 tab
onMounted(() => {
  // 默认创建一个文章创建 tab
  createArticleTab()
})

</script>

<style scoped lang="scss">
.editor-container {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background: #f5f5f5;
}

.editor-content {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.content-area {
  flex: 1;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  min-height: 0;

  // 确保 Tabs 组件占满高度
  :deep(.ant-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  // 确保 Tabs 内容区域占满高度
  :deep(.ant-tabs-content-holder) {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.ant-tabs-content) {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.ant-tabs-tabpane) {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  // 去除 tabs-nav 的默认 margin
  :deep(.ant-tabs-nav) {
    margin: 0 !important;
    flex-shrink: 0;
  }

  :deep(.ant-tabs-top > .ant-tabs-nav),
  :deep(.ant-tabs-bottom > .ant-tabs-nav),
  :deep(.ant-tabs-top > div > .ant-tabs-nav),
  :deep(.ant-tabs-bottom > div > .ant-tabs-nav) {
    margin: 0 !important;
  }

  // 添加 tabs-nav-wrap 的内边距
  :deep(.ant-tabs-nav-wrap) {
    padding-top: 8px;
    padding-left: 8px;
  }
}

.webview-container {
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  min-height: 0;
}

.editor-toolbar {
  width: 208px;
  height: 100%;
  background: #ffffff;
  border-left: 1px solid #e5e5e5;
  flex-shrink: 0;
  position: relative;
  transition: width 0.3s ease;
  
  &.collapsed {
    width: 0;
    
    .toolbar-content {
      opacity: 0;
      visibility: hidden;
    }
    
    .toolbar-toggle {
      left: -32px;
    }
  }
}

.toolbar-toggle {
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    background: #f5f5f5;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .anticon {
    font-size: 12px;
    color: #666;
  }
}

.toolbar-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.webview-wrapper {
  width: 100%;
  flex: 1;
  position: relative;
  display: flex;
  overflow: hidden;
  background: #ffffff;
  min-height: 0;
}

.webview-view {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  flex: none;
  border: none;
}

.tab-title {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 150px;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
}

.tab-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.account-info {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.account-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 32px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.account-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #f0f0f0;
}

.account-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.account-name {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.account-platform {
  font-size: 14px;
  color: #6b7280;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24px;
  width: 100%;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);

    .action-icon {
      color: #1890ff;
    }
  }

  &:active {
    transform: translateY(-2px);
  }
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f5f5f5;
  color: #666;
  transition: all 0.3s ease;

  svg {
    width: 32px;
    height: 32px;
  }
}

.action-text {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  text-align: center;
}

.no-account {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.no-account-icon {
  color: #d1d5db;
  
  svg {
    width: 64px;
    height: 64px;
  }
}

.no-account-text {
  margin: 0;
  font-size: 16px;
  color: #9ca3af;
}
</style>

