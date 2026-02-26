/**
 * 认证数据同步辅助工具
 * 实现增量同步逻辑
 */

import { syncAccountAuth } from '@/api/account'
import { getCookies } from './partitionHelper'
import { useAccountStoreHook } from '@/store/modules/account'

/**
 * 从 URL 提取主域名（顶级域名 + 二级域名）
 * @param {string} url - URL 字符串
 * @returns {string|null} 主域名
 * @example
 *   https://mp.weixin.qq.com/xxx → qq.com
 *   https://creator.douyin.com/xxx → douyin.com
 *   https://www.bilibili.com/xxx → bilibili.com
 */
export const extractMainDomain = (url) => {
  try {
    const hostname = new URL(url).hostname
    const parts = hostname.split('.')
    // 取最后两部分作为主域名
    if (parts.length >= 2) {
      return parts.slice(-2).join('.')
    }
    return hostname
  } catch {
    return null
  }
}

/**
 * 获取账号对应域名的 cookies
 * @param {string} partition - session partition
 * @param {string} accountUrl - 账号的 URL
 * @returns {Promise<Array>} cookies 数组
 */
export const getAccountCookies = async (partition, accountUrl) => {
  const allCookies = await getCookies(partition)
  
  const domain = extractMainDomain(accountUrl)
  if (!domain) {
    // 无法解析域名，返回所有 cookies
    return allCookies
  }
  
  // 过滤属于该域名的 cookies
  return allCookies.filter((cookie) => {
    const cookieDomain = cookie.domain.startsWith('.')
      ? cookie.domain.substring(1)
      : cookie.domain
    
    // 完全匹配或 cookie domain 以目标 domain 结尾
    return (
      cookieDomain === domain ||
      cookieDomain.endsWith(`.${domain}`)
    )
  })
}

/**
 * 检查当前 URL 是否属于目标账号的域名
 * @param {string} currentUrl - 当前页面 URL
 * @param {string} accountUrl - 账号配置的 URL
 * @returns {boolean} 是否属于同一域名
 */
export const isUrlMatchingAccountDomain = (currentUrl, accountUrl) => {
  const currentDomain = extractMainDomain(currentUrl)
  const accountDomain = extractMainDomain(accountUrl)
  
  if (!currentDomain || !accountDomain) {
    return false
  }
  
  return currentDomain === accountDomain
}

/**
 * 获取 webview 内部的 localStorage（只保留认证相关字段）
 * @param {HTMLElement} webviewEl - webview 元素
 * @returns {Promise<object>} localStorage 数据（仅包含认证相关字段）
 */
export const getWebviewLocalStorage = async (webviewEl) => {
  if (!webviewEl) {
    throw new Error('webview element is required')
  }

  try {
    return await webviewEl.executeJavaScript(`
      (function() {
        // 认证相关的关键词
        const authKeywords = ['token', 'session', 'auth', 'user', 'jwt', 'login', 'passport', 'sso', 'csrf', 'ticket', 'credential'];
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const keyLower = key.toLowerCase();
          // 只保留 key 中包含认证相关关键词的字段
          if (authKeywords.some(kw => keyLower.includes(kw))) {
            data[key] = localStorage.getItem(key);
          }
        }
        return data;
      })();
    `)
  } catch (error) {
    console.error('获取 webview localStorage 失败:', error)
    return {}
  }
}

/**
 * 捕获当前认证数据
 * @param {HTMLElement} webviewEl - webview 元素
 * @param {string} partition - session partition
 * @param {string} accountUrl - 账号的 URL（用于过滤 cookies）
 * @returns {Promise<object>} 认证数据 { cookies, localStorage }
 */
export const captureAuthData = async (webviewEl, partition, accountUrl) => {
  // 获取 cookies（通过 Electron session API，按域名过滤）
  const cookies = await getAccountCookies(partition, accountUrl)
  
  // 获取 localStorage（通过 executeJavaScript）
  const localStorage = await getWebviewLocalStorage(webviewEl)
  
  return { cookies, localStorage: localStorage || {} }
}

/**
 * 计算 cookie 唯一键
 * @param {object} cookie - cookie 对象
 * @returns {string} 唯一键
 */
export const getCookieKey = (cookie) => {
  return `${cookie.domain || ''}|${cookie.path || '/'}|${cookie.name || ''}`
}

/**
 * 比对 cookies 差异
 * @param {Array} current - 当前 cookies
 * @param {Array} cached - 缓存的 cookies
 * @returns {object} 差异 { added, modified, removed }
 */
export const diffCookies = (current, cached) => {
  const diff = {
    added: [],
    modified: [],
    removed: []
  }
  
  const currentMap = new Map(current.map(c => [getCookieKey(c), c]))
  const cachedMap = new Map((cached || []).map(c => [getCookieKey(c), c]))
  
  // 检查新增和修改
  for (const [key, cookie] of currentMap) {
    if (!cachedMap.has(key)) {
      diff.added.push(cookie)
    } else {
      const cachedCookie = cachedMap.get(key)
      // 比较值和过期时间
      if (cookie.value !== cachedCookie.value || 
          cookie.expirationDate !== cachedCookie.expirationDate) {
        diff.modified.push(cookie)
      }
    }
  }
  
  // 检查删除
  for (const [key, cookie] of cachedMap) {
    if (!currentMap.has(key)) {
      diff.removed.push({
        domain: cookie.domain,
        path: cookie.path || '/',
        name: cookie.name
      })
    }
  }
  
  return diff
}

/**
 * 比对 localStorage 差异
 * @param {object} current - 当前 localStorage
 * @param {object} cached - 缓存的 localStorage
 * @returns {object} 差异 { added, modified, removed }
 */
export const diffLocalStorage = (current, cached) => {
  const diff = {
    added: {},
    modified: {},
    removed: []
  }
  
  const currentData = current || {}
  const cachedData = cached || {}
  
  // 检查新增和修改
  for (const [key, value] of Object.entries(currentData)) {
    if (!(key in cachedData)) {
      diff.added[key] = value
    } else if (cachedData[key] !== value) {
      diff.modified[key] = value
    }
  }
  
  // 检查删除
  for (const key of Object.keys(cachedData)) {
    if (!(key in currentData)) {
      diff.removed.push(key)
    }
  }
  
  return diff
}

/**
 * 计算完整增量
 * @param {object} current - 当前认证数据 { cookies, localStorage }
 * @param {object} cached - 缓存的认证数据
 * @returns {object} 增量数据
 */
export const diffAuthData = (current, cached) => {
  return {
    cookies: diffCookies(current.cookies, cached?.cookies),
    localStorage: diffLocalStorage(current.localStorage, cached?.localStorage)
  }
}

/**
 * 判断是否有变化
 * @param {object} diff - 增量数据
 * @returns {boolean} 是否有变化
 */
export const hasChanges = (diff) => {
  const { cookies, localStorage } = diff
  
  return (
    cookies.added.length > 0 ||
    cookies.modified.length > 0 ||
    cookies.removed.length > 0 ||
    Object.keys(localStorage.added).length > 0 ||
    Object.keys(localStorage.modified).length > 0 ||
    localStorage.removed.length > 0
  )
}

/**
 * 从 store 中解析账号的认证数据（用作增量同步的基线）
 * @param {number} accountId - 账号 ID
 * @returns {object|null} 认证数据 { cookies, localStorage }
 */
export const getAuthDataFromStore = (accountId) => {
  const accountStore = useAccountStoreHook()
  const account = accountStore.getAccountById(accountId)
  
  if (!account?.auth_data) {
    return null
  }
  
  try {
    // auth_data 结构为 {"partition": "{\"version\":1,\"cookies\":[...],\"localStorage\":{...}}"}
    const authData = JSON.parse(account.auth_data)
    if (authData.partition) {
      const partitionData = JSON.parse(authData.partition)
      return {
        cookies: partitionData.cookies || [],
        localStorage: partitionData.localStorage || {}
      }
    }
    return null
  } catch (error) {
    console.error('解析 auth_data 失败:', error)
    return null
  }
}

/**
 * 更新 store 中账号的 auth_data
 * @param {number} accountId - 账号 ID
 * @param {object} currentData - 当前认证数据 { cookies, localStorage }
 */
export const updateAuthDataInStore = (accountId, currentData) => {
  const accountStore = useAccountStoreHook()
  const account = accountStore.getAccountById(accountId)
  
  // 保留原有的 token 字段
  let token = ''
  if (account?.auth_data) {
    try {
      const existingAuthData = JSON.parse(account.auth_data)
      token = existingAuthData.token || ''
    } catch {
      // ignore
    }
  }
  
  // 构建新的 auth_data
  const partitionStr = JSON.stringify({
    version: 1,
    cookies: currentData.cookies || [],
    localStorage: currentData.localStorage || {}
  })
  
  const authDataStr = JSON.stringify({
    partition: partitionStr,
    token
  })
  
  accountStore.updateAccountAuthData(accountId, authDataStr)
}

/**
 * 同步认证数据到后端
 * @param {number} accountId - 账号 ID
 * @param {object} currentData - 当前认证数据 { cookies, localStorage }
 * @returns {Promise<boolean>} 是否同步成功
 */
export const syncAuthDataToBackend = async (accountId, currentData) => {
  // 从 store 获取缓存的认证数据作为基线
  const cached = getAuthDataFromStore(accountId)
  const diff = diffAuthData(currentData, cached)
  
  if (!hasChanges(diff)) {
    console.log(`[authSync] 账号 ${accountId} 无变化，跳过同步`)
    return true
  }
  
  console.log(`[authSync] 账号 ${accountId} 同步增量:`, {
    cookies: {
      added: diff.cookies.added.length,
      modified: diff.cookies.modified.length,
      removed: diff.cookies.removed.length
    },
    localStorage: {
      added: Object.keys(diff.localStorage.added).length,
      modified: Object.keys(diff.localStorage.modified).length,
      removed: diff.localStorage.removed.length
    }
  })
  
  try {
    await syncAccountAuth(accountId, diff)
    // 同步成功后更新 store 中的 auth_data
    updateAuthDataInStore(accountId, currentData)
    console.log(`[authSync] 账号 ${accountId} 同步成功`)
    return true
  } catch (error) {
    console.error(`[authSync] 账号 ${accountId} 同步失败:`, error)
    return false
  }
}

/**
 * 创建防抖同步处理器
 * @param {number} delay - 防抖延迟（毫秒），默认 2000ms
 * @returns {object} { schedule, cancel }
 */
export const createDebouncedSyncHandler = (delay = 2000) => {
  const timers = new Map()
  
  return {
    /**
     * 调度同步任务
     * @param {string} key - 唯一标识（如 accountId 或 tabKey）
     * @param {Function} syncFn - 同步函数
     */
    schedule: (key, syncFn) => {
      // 清除之前的定时器
      if (timers.has(key)) {
        clearTimeout(timers.get(key))
      }
      
      // 设置新的定时器
      const timer = setTimeout(async () => {
        timers.delete(key)
        try {
          await syncFn()
        } catch (error) {
          console.error(`[authSync] 防抖同步失败 (${key}):`, error)
        }
      }, delay)
      
      timers.set(key, timer)
    },
    
    /**
     * 取消指定的同步任务
     * @param {string} key - 唯一标识
     */
    cancel: (key) => {
      if (timers.has(key)) {
        clearTimeout(timers.get(key))
        timers.delete(key)
      }
    },
    
    /**
     * 取消所有同步任务
     */
    cancelAll: () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }
}

