<template>
  <div class="account-center">
    <div class="account-center-content">
      <!-- 内容区域 -->
      <div class="content-area">
        <ATabs type="editable-card" hide-add :active-key="activeTabKey"
          @change="handleTabChange" @edit="handleTabEdit">
          <!-- 固定主页 tab -->
          <ATabPane key="home" :closable="false">
            <template #tab>
              <div class="tab-title">
                <HomeOutlined class="tab-home-icon" />
                <span>主页</span>
              </div>
            </template>
            <HomePage @feature-click="handleFeatureClick" />
          </ATabPane>
          <!-- 动态账号 tabs -->
          <ATabPane v-for="tab in contentTabs" :key="tab.key" :closable="true">
            <template #tab>
              <div class="tab-title">
                <img v-if="tab.avatar" :src="tab.avatar" class="tab-avatar" />
                <span>{{ tab.title }}</span>
              </div>
            </template>
            <div class="browser-container">
              <!-- 导航栏 -->
              <BrowserToolbar :can-go-back="tab.navState?.canGoBack" :can-go-forward="tab.navState?.canGoForward"
                :is-loading="tab.navState?.isLoading" :url="tab.navState?.currentUrl" @go-back="handleGoBack(tab.key)"
                @go-forward="handleGoForward(tab.key)" @reload="handleReload(tab.key)"
                @navigate="handleNavigate(tab.key, $event)" />
              <!-- Webview -->
              <div class="browser-wrapper">
                <AppWebview :ref="(el) => setWebviewRef(tab.key, el)" :src="tab.url" :partition="tab.partition"
                  :preload="tab.preload" class="browser-view" @navigate="handleWebviewNavigate(tab.key, $event)"
                  @finish-load="handleWebviewFinishLoad(tab.key)"
                  @nav-state-change="handleNavStateChange(tab.key, $event)" />
              </div>
            </div>
          </ATabPane>
        </ATabs>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Tabs as ATabs, message } from 'ant-design-vue'
import { HomeOutlined } from '@ant-design/icons-vue'
import AppWebview from '@/components/common/AppWebview.vue'
import BrowserToolbar from './components/BrowserToolbar.vue'
import HomePage from './components/HomePage.vue'
import { deserializePartition } from '@/utils/partitionHelper'
import { getWechatSysNotify } from '@/.thidparty_api/wechat'
import { saveWechatAccount } from '@/utils/wechat'
import { useAccountStore } from '@/store/modules/account'
import {
  captureAuthData,
  syncAuthDataToBackend,
  createDebouncedSyncHandler,
  isUrlMatchingAccountDomain
} from '@/utils/authSyncHelper'

const route = useRoute()

const ATabPane = ATabs.TabPane

// 内容区域 tab 数据
const contentTabs = ref([])
const activeTabKey = ref('home') // 默认选中主页 tab
// 存储每个 tab 的 webview 组件引用
const webviewRefs = ref({})

// 账号管理store
const accountStore = useAccountStore()

// 认证数据同步防抖处理器（2秒防抖）
const authSyncHandler = createDebouncedSyncHandler(2000)

// webview auth preload 脚本路径
const authPreloadPath = window.electronAPI.getWebviewAuthPreloadPath()

// 设置 webview 组件引用
const setWebviewRef = (tabKey, el) => {
  if (el) {
    webviewRefs.value[tabKey] = el
  }
}

// 处理导航状态变化
const handleNavStateChange = (tabKey, state) => {
  // URL 变化时触发认证数据同步（防抖），仅通用平台
  const tab = contentTabs.value.find(t => t.key === tabKey)
  if (tab) {
    const prevUrl = tab.navState?.currentUrl
    tab.navState = { ...state }
    if (tab.platform_type === 'general') {
      if (prevUrl !== state.currentUrl) {
        authSyncHandler.schedule(tabKey, async () => {
          await triggerAuthSync(tabKey)
        })
      }
    }
  }
}

// 触发通用平台认证数据同步
const triggerAuthSync = async (tabKey) => {
  const tab = contentTabs.value.find(t => t.key === tabKey)
  if (!tab || !tab.accountId) return

  const webviewRef = webviewRefs.value[tabKey]
  const webviewEl = webviewRef?.getWebviewElement()

  if (!webviewEl) {
    console.warn('[authSync] webview 元素不存在，跳过同步')
    return
  }

  const account = accountStore.getAccountById(tab.accountId)
  if (!account) {
    console.warn('[authSync] 账号不存在，跳过同步')
    return
  }

  // 检查当前页面是否属于账号域名，不属于则跳过同步
  const currentUrl = tab.navState?.currentUrl
  if (!isUrlMatchingAccountDomain(currentUrl, account.url)) {
    console.log(`[authSync] 当前页面 ${currentUrl} 不属于账号域名 ${account.url}，跳过同步`)
    return
  }

  try {
    // 捕获当前认证数据
    const currentData = await captureAuthData(webviewEl, tab.partition, account.url)

    // 同步到后端
    await syncAuthDataToBackend(tab.accountId, currentData)
  } catch (error) {
    console.error('[authSync] 同步失败:', error)
  }
}

// 检查URL是否匹配公众号登录页
const isWechatMpLoginPage = (url) => {
  if (!url) return false
  try {
    const urlObj = new URL(url)
    // 匹配 https://mp.weixin.qq.com/ 或 https://mp.weixin.qq.com 或带任何参数的情况
    return urlObj.hostname === 'mp.weixin.qq.com' && urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// 检查URL是否匹配公众号home页面
const isWechatMpHomePage = (url) => {
  if (!url) return false
  try {
    const urlObj = new URL(url)
    // 匹配 https://mp.weixin.qq.com/cgi-bin/home?t=home/index&lang=zh_CN&token=xxx
    return urlObj.hostname === 'mp.weixin.qq.com' &&
      urlObj.protocol === 'https:' &&
      urlObj.pathname === '/cgi-bin/home' &&
      urlObj.searchParams.get('t') === 'home/index'
  } catch {
    return false
  }
}

// 处理 webview 内部导航
const handleWebviewNavigate = async (tabKey, url) => {
  const tab = contentTabs.value.find(t => t.key === tabKey)
  if (tab) {
    if (tab.platform_type === 'wechat') {
      // 微信公众号
      if (isWechatMpLoginPage(url) && !tab.cookiesCleared) {
        // 公众号登录页处理逻辑
        try {
          // 检测cookies失效情况
          await getWechatSysNotify(tab.accountId, {
            begin: 0,
            count: 1
          })
        } catch (error) {
          console.log('[账号认证] cookies失效，重置账号认证信息')
          // 清空对应账号的cookies和localStorage
          await window.electronAPI.storage.clearAll(tab.partition)
          // 通过store更新账号状态
          await accountStore.invalidateAccountAction(tab.accountId)
          // 标记已清理，避免循环刷新
          tab.cookiesCleared = true
          // 刷新页面以应用清理后的状态
          handleReload(tabKey)
        }
      }
    } else {
      // 通用平台
    }
  }
}

// 处理 webview 加载完成
const handleWebviewFinishLoad = async (tabKey) => {
  const tab = contentTabs.value.find(t => t.key === tabKey)
  if (tab.platform_type === 'wechat') {
    // 微信公众号
    const webview = webviewRefs.value[tabKey]

    const currentUrl = webview.getCurrentUrl()

    const account = accountStore.getAccountById(tab.accountId)

    // 检测是否是以cookies失效的状态跳转到主页的
    if (account.is_expired && isWechatMpHomePage(currentUrl)) {
      console.log('[账号认证] 开始更新账号认证信息:', account.name)
      try {
        // 保存微信账号
        const result = await saveWechatAccount(currentUrl, tab.partition)

        console.log('[账号认证] 更新结果:', result)
        if (result.success) {
          handleAccountSelect(account)
          if (result.isUpdate) {
            if (result.account.platfrom_id === account.platfrom_id) {
              message.success(`登录成功`)
            } else {
              message.success(`账户信息不匹配，已为您切换登录账号`)
            }
          } else {
            message.success(`账户信息不匹配，为您添加新账号：${result.account.name}`)
          }
        } else {
          message.error(result.message || '保存账号失败')
        }
      } catch (error) {
        console.error('[账号认证] 更新失败:', error)
        message.error(error.message || '更新账号认证信息失败')
      }
    }
  } else {
    // 通用平台
  }
}

// 处理账号选择
const handleAccountSelect = async (account) => {
  const targetKey = account.id
  if (!contentTabs.value.find(tab => tab.key === targetKey)) {
    const initialUrl = account.url
    const partition = `temp:${new Date().getTime()}`
    let webviewUrl = initialUrl
    let preload = undefined

    console.log(`[账号选择] 检查账号状态: platform_type=${account.platform_type}, is_expired=${account.is_expired}, has_auth_data=${!!account.auth_data}, partition=${partition}`)

    if (account.platform_type === 'wechat') {
      // 微信公众号平台
      if (!account.is_expired && account.auth_data) {
        try {
          const authWrapper = JSON.parse(account.auth_data)
          const partitionData = authWrapper.partition ? JSON.parse(authWrapper.partition) : null

          if (partitionData) {
            // 恢复 cookies 到 session
            await deserializePartition(authWrapper.partition, partition)
          }
          console.log(`[账号选择/微信] 已恢复账号 ${account.name} 的认证数据`)
        } catch (error) {
          console.error(`[账号选择/微信] 恢复认证数据失败:`, error)
        }
      } else {
        console.log(`[账号选择/微信] 账号已过期或无认证数据，跳过恢复`)
      }
    } else if (account.platform_type === 'general') {
      // 通用平台
      preload = authPreloadPath

      if (account.auth_data) {
        try {
          const authWrapper = JSON.parse(account.auth_data)
          const partitionData = authWrapper.partition ? JSON.parse(authWrapper.partition) : null
          console.log(`[账号选择/通用] partitionData:`, partitionData)

          if (partitionData) {
            // 恢复 cookies 到 session
            await deserializePartition(authWrapper.partition, partition)
            // 缓存 localStorage 数据到主进程，供 webview preload 注入
            if (partitionData.localStorage && Object.keys(partitionData.localStorage).length > 0) {
              await window.electronAPI.storage.prepareLocalStorage(partition, partitionData.localStorage)
            }
          }
          console.log(`[账号选择/通用] 已恢复账号 ${account.name} 的认证数据`)
        } catch (error) {
          console.error(`[账号选择/通用] 恢复认证数据失败:`, error)
        }

        // 通用平台添加 partition hash 参数 方便preload获取partition的名称
        const url = new URL(initialUrl)
        const hashParams = new URLSearchParams(url.hash.substring(1))
        hashParams.set('__ed_partition', partition)
        url.hash = hashParams.toString()
        webviewUrl = url.toString()
      }
    }

    contentTabs.value.push({
      key: targetKey,
      title: account.name,
      avatar: account.avatar,
      platform_type: account.platform_type,
      accountId: account.id,
      url: webviewUrl,
      partition: partition,
      preload: preload,
      cookiesCleared: account.is_expired,     //如果账号已过期，说明cookies不会注入，所以标明已清理，避免刷新
      navState: {
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        currentUrl: webviewUrl
      }
    })
  }
  activeTabKey.value = targetKey
}

// 切换 tab
const handleTabChange = (key) => {
  activeTabKey.value = key
  // 同步更新左侧账号列表的选中状态
  if (key === 'home') {
    // 主页 tab 不需要同步账号选中状态
    return
  }
  const tab = contentTabs.value.find(t => t.key === key)
  if (tab) {
    const account = accountStore.getAccountById(tab.accountId)
    accountStore.selectMultiPanelAccount(account)
  }
}

// 处理主页功能点击
const handleFeatureClick = (featureKey) => {
  console.log('[主页] 功能点击:', featureKey)
  // TODO: 实现具体功能逻辑
}

// 关闭 tab
const handleTabEdit = (targetKey, action) => {
  if (action === 'remove') {
    const targetIndex = contentTabs.value.findIndex(tab => tab.key === targetKey)
    if (targetIndex === -1) return

    const isActive = activeTabKey.value === targetKey

    // 取消待执行的同步任务
    authSyncHandler.cancel(targetKey)

    contentTabs.value.splice(targetIndex, 1)

    // 清理 webview 引用
    delete webviewRefs.value[targetKey]

    if (isActive) {
      const fallbackTab = contentTabs.value[targetIndex] || contentTabs.value[targetIndex - 1]
      activeTabKey.value = fallbackTab ? fallbackTab.key : 'home'
      // 同步更新选中的账号
      if (fallbackTab) {
        const account = accountStore.getAccountById(fallbackTab.accountId)
        accountStore.selectMultiPanelAccount(account)
      } else {
        accountStore.clearMultiPanelSelection()
      }
    }
  }
}

// 组件卸载时清理
onUnmounted(() => {
  // 取消所有待执行的同步任务
  authSyncHandler.cancelAll()
})

// 后退
const handleGoBack = (tabKey) => {
  const webview = webviewRefs.value[tabKey]
  if (webview) {
    webview.goBack()
  }
}

// 前进
const handleGoForward = (tabKey) => {
  const webview = webviewRefs.value[tabKey]
  if (webview) {
    webview.goForward()
  }
}

// 刷新
const handleReload = (tabKey) => {
  const webview = webviewRefs.value[tabKey]
  if (webview) {
    webview.reload()
  }
}

// 导航到指定 URL
const handleNavigate = (tabKey, targetUrl) => {
  const webview = webviewRefs.value[tabKey]
  if (webview && targetUrl) {
    webview.loadURL(targetUrl)
  }
}

// 监听 store 中多开面板选中账号的变化
watch(
  () => accountStore.multiPanelSelectedAccountId,
  (newAccountId) => {
    if (newAccountId) {   // && route.name === 'MultiAccountPanel' 从其他页面切换回来时自动打开账号
      const account = accountStore.getAccountById(newAccountId)
      if (account) {
        handleAccountSelect(account)
      }
    }
  }
)
// 监听路由变化，切换回多开面板页面时检查是否有选中的账号需要打开
// watch(
//   () => route.name,
//   (newRouteName) => {
//     if (newRouteName === 'MultiAccountPanel' && accountStore.selectedAccountId) {
//       const account = accountStore.getAccountById(accountStore.selectedAccountId)
//       if (account) {
//         handleAccountSelect(account)
//       }
//     }
//   }
// )
</script>

<style scoped lang="scss">
.account-center {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background: #f5f5f5;
}

.account-center-content {
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

  // 去除 tabs 图标的默认 margin
  :deep(.ant-tabs-tab .anticon) {
    margin-right: 0;
  }
}

.browser-container {
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.browser-wrapper {
  width: 100%;
  flex: 1;
  position: relative;
  display: flex;
  overflow: hidden;
  background: #ffffff;
  min-height: 0;
}

.browser-view {
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
}

.tab-home-icon {
  font-size: 16px;
  color: var(--color-primary);
}

.tab-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
