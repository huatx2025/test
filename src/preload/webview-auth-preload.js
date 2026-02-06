/**
 * Webview Auth Preload Script
 * 在 webview 页面加载前注入 localStorage 数据
 *
 * 工作流程：
 * 1. 前端调用 electronAPI.storage.prepareLocalStorage(partition, data) 缓存数据到主进程
 * 2. webview 加载页面，此 preload 脚本执行
 * 3. 向主进程发送同步请求，主进程根据请求的 session 自动识别 partition
 * 4. 在页面脚本执行前注入 localStorage
 */

const { ipcRenderer } = require('electron')

/**
 * 从 URL hash 中提取 partition
 * 格式: #__ed_partition=persist:xxx 或 #__ed_partition=persist:xxx&其他参数
 */
const getPartitionFromHash = () => {
  try {
    const hash = window.location.hash
    if (!hash) return null

    // 移除开头的 #
    const hashContent = hash.substring(1)

    // 查找 __ed_partition 参数
    const params = new URLSearchParams(hashContent.replace(/&/g, '&'))
    const partition = params.get('__ed_partition')

    console.log('[webview-auth-preload] hash:', hash, 'partition:', partition)
    return partition
  } catch (error) {
    console.error('[webview-auth-preload] 解析 hash 失败:', error)
    return null
  }
}

/**
 * 清理 URL hash 中的 __ed_partition 参数
 * 在注入完成后调用，避免影响网页的 hash 路由或锚点功能
 */
const cleanupPartitionHash = () => {
  try {
    const hash = window.location.hash
    if (!hash || !hash.includes('__ed_partition')) return

    const hashContent = hash.substring(1)
    const params = new URLSearchParams(hashContent)
    params.delete('__ed_partition')

    const newHash = params.toString()
    // 使用 replaceState 避免产生历史记录
    if (newHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${newHash}`)
    } else {
      // 如果没有其他 hash 参数，完全移除 hash
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
    console.log('[webview-auth-preload] 已清理 URL hash 中的 partition 参数')
  } catch (error) {
    console.error('[webview-auth-preload] 清理 hash 失败:', error)
  }
}

/**
 * 从主进程获取缓存的 localStorage 数据
 * 通过 URL hash 中的 partition 参数来获取
 */
const getLocalStorageData = () => {
  try {
    // 从 URL hash 获取 partition
    const partition = getPartitionFromHash()
    if (!partition) {
      console.log('[webview-auth-preload] 未找到 partition 参数')
      return null
    }

    // 使用同步 IPC 调用，显式传递 partition
    const result = ipcRenderer.sendSync('storage:getLocalStorageCache', partition)
    console.log('[webview-auth-preload] getLocalStorageData result', result)
    return result
  } catch (error) {
    console.error('[webview-auth-preload] 获取 localStorage 数据失败:', error)
    return null
  }
}

/**
 * 注入 localStorage 数据
 */
const injectLocalStorage = (data) => {
  if (!data || typeof data !== 'object') {
    return false
  }

  try {
    const keys = Object.keys(data)
    for (const key of keys) {
      const value = data[key]
      if (value !== null && value !== undefined) {
        localStorage.setItem(key, String(value))
      }
    }
    console.log('[webview-auth-preload] localStorage 注入完成，共', keys.length, '项')
    return true
  } catch (error) {
    console.error('[webview-auth-preload] localStorage 注入失败:', error)
    return false
  }
}

/**
 * 初始化：获取并注入 localStorage
 */
const init = () => {
  try {
    const data = getLocalStorageData()
    if (data) {
      injectLocalStorage(data)

    }
    // 完成后清理 URL hash，避免影响网页
    cleanupPartitionHash()
  } catch (error) {
    console.error('[webview-auth-preload] init 执行出错:', error)
  }
}

// 立即执行初始化
init()
