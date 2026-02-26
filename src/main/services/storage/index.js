import { ipcMain, session } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'

/**
 * Storage 服务
 * 提供 localStorage 等存储相关的操作
 */
class StorageService {
  constructor() {
    // localStorage 缓存：用于 webview preload 脚本注入
    // Map<partition, { data: object, timestamp: number }>
    this.localStorageCache = new Map()
  }
  /**
   * 获取指定 partition 的 session
   */
  getSession(partition) {
    return partition ? session.fromPartition(partition) : session.defaultSession
  }

  /**
   * 执行 JavaScript 代码获取 localStorage
   * 注意：需要在有 webContents 的情况下使用
   * @param {string} partition - session partition
   * @param {object} webContents - Electron webContents 实例
   */
  async getLocalStorage(partition, webContents) {
    if (!webContents) {
      throw new Error('需要 webContents 实例来访问 localStorage')
    }

    const script = `
      (function() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }
        return data;
      })();
    `

    try {
      return await webContents.executeJavaScript(script)
    } catch (error) {
      console.error('获取 localStorage 失败:', error)
      return {}
    }
  }

  /**
   * 设置 localStorage
   * @param {string} partition - session partition
   * @param {object} data - 键值对数据
   * @param {object} webContents - Electron webContents 实例
   */
  async setLocalStorage(partition, data, webContents) {
    if (!webContents) {
      throw new Error('需要 webContents 实例来访问 localStorage')
    }

    const script = `
      (function() {
        const data = ${JSON.stringify(data)};
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, value);
        }
      })();
    `

    try {
      await webContents.executeJavaScript(script)
    } catch (error) {
      console.error('设置 localStorage 失败:', error)
      throw error
    }
  }

  /**
   * 清除 localStorage
   * @param {string} partition - session partition
   * @param {object} webContents - Electron webContents 实例
   */
  async clearLocalStorage(partition, webContents) {
    if (!webContents) {
      throw new Error('需要 webContents 实例来访问 localStorage')
    }

    const script = 'localStorage.clear();'

    try {
      await webContents.executeJavaScript(script)
    } catch (error) {
      console.error('清除 localStorage 失败:', error)
      throw error
    }
  }

  /**
   * 清除 partition 的所有存储数据
   * @param {string} partition - session partition
   */
  async clearAllStorage(partition) {
    const ses = this.getSession(partition)
    await ses.clearStorageData()
  }

  /**
   * 准备 localStorage 数据缓存，供 webview preload 脚本使用
   * @param {string} partition - session partition
   * @param {object} data - localStorage 数据
   */
  prepareLocalStorage(partition, data) {
    if (!partition) {
      throw new Error('partition is required')
    }
    this.localStorageCache.set(partition, {
      data: data || {},
      timestamp: Date.now()
    })
    console.log('prepareLocalStorage，this.localStorageCache',this.localStorageCache);
    
  }

  /**
   * 获取并清除缓存的 localStorage 数据
   * @param {string} partition - session partition
   * @returns {object|null} localStorage 数据
   */
  getLocalStorageCache(partition) {
    if (!partition) {
      return null
    }
    const cached = this.localStorageCache.get(partition)
    if (cached) {
      // 获取后清除缓存，避免内存泄漏
      this.localStorageCache.delete(partition)
      return cached.data
    }
    return null
  }

  /**
   * 获取 webview auth preload 脚本路径
   * @returns {string} preload 脚本的 file:// URL
   */
  getWebviewAuthPreloadPath() {
    const filePath = join(__dirname, '../preload/webview-auth-preload.js')
    return pathToFileURL(filePath).href
  }

  /**
   * 注册 IPC 处理器
   */
  registerIpcHandlers() {
    // 获取 localStorage（从渲染进程调用时，使用调用者的 webContents）
    ipcMain.handle('storage:getLocalStorage', async (event) => {
      return await this.getLocalStorage(null, event.sender)
    })

    // 设置 localStorage
    ipcMain.handle('storage:setLocalStorage', async (event, data) => {
      return await this.setLocalStorage(null, data, event.sender)
    })

    // 清除 localStorage
    ipcMain.handle('storage:clearLocalStorage', async (event) => {
      return await this.clearLocalStorage(null, event.sender)
    })

    // 清除所有存储数据
    ipcMain.handle('storage:clearAll', async (event, partition) => {
      return await this.clearAllStorage(partition)
    })

    // 准备 localStorage 缓存（用于 webview preload 注入）
    ipcMain.handle('storage:prepareLocalStorage', (event, partition, data) => {
      this.prepareLocalStorage(partition, data)
      return true
    })

    // 获取缓存的 localStorage（同步调用，供 webview preload 使用，通过显式传入 partition）
    ipcMain.on('storage:getLocalStorageCache', (event, partition) => {
      const data = this.getLocalStorageCache(partition)
      event.returnValue = data
    })

    // 根据请求的 session 自动识别 partition 并获取缓存的 localStorage（供 webview preload 使用）
    ipcMain.on('storage:getLocalStorageBySession', (event) => {
      try {
        // 从发送请求的 webContents 的 session 获取 partition
        const senderSession = event.sender.session
        // session.partition 格式如 "temp:account_123" 或空字符串（默认 session）
        const partition = senderSession?.partition || ''
        
        // 调试信息
        console.log('[storage:getLocalStorageBySession] sender.id:', event.sender.id)
        console.log('[storage:getLocalStorageBySession] sender.getType():', event.sender.getType())
        console.log('[storage:getLocalStorageBySession] session:', senderSession)
        console.log('[storage:getLocalStorageBySession] session.partition:', partition)
        console.log('[storage:getLocalStorageBySession] 缓存的 keys:', [...this.localStorageCache.keys()])
        
        if (partition) {
          const data = this.getLocalStorageCache(partition)
          console.log('[storage:getLocalStorageBySession] 返回数据:', data ? '有数据' : 'null')
          event.returnValue = data
        } else {
          console.log('[storage:getLocalStorageBySession] partition 为空，返回 null')
          event.returnValue = null
        }
      } catch (error) {
        console.error('获取 session localStorage 缓存失败:', error)
        event.returnValue = null
      }
    })

    // 获取 webview auth preload 脚本路径
    ipcMain.handle('storage:getWebviewAuthPreloadPath', () => {
      return this.getWebviewAuthPreloadPath()
    })
  }
}

export default new StorageService()


