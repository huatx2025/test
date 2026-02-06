import { ipcMain, session, BrowserWindow } from 'electron'

/**
 * Cookie 服务
 * 只提供渲染进程无法直接访问的 Session API 封装
 */
class CookieService {
  constructor() {
    // 存储活跃的监听器 { partition: { listener, webContentsId } }
    this.watchers = new Map()
  }

  /**
   * 获取指定 partition 的 session
   */
  getSession(partition) {
    return partition ? session.fromPartition(partition) : session.defaultSession
  }

  /**
   * 获取 cookies
   * @param {string} partition - session partition
   * @param {object} filter - 过滤条件，如 { url, name, domain }
   */
  async getCookies(partition, filter = {}) {
    const ses = this.getSession(partition)
    return await ses.cookies.get(filter)
  }

  /**
   * 设置 cookie
   * @param {string} partition - session partition
   * @param {object} cookie - cookie 对象
   */
  async setCookie(partition, cookie) {
    const ses = this.getSession(partition)
    return await ses.cookies.set(cookie)
  }

  /**
   * 删除 cookie
   * @param {string} partition - session partition
   * @param {string} url - cookie 的 URL
   * @param {string} name - cookie 名称
   */
  async removeCookie(partition, url, name) {
    const ses = this.getSession(partition)
    await ses.cookies.remove(url, name)
  }

  /**
   * 清除所有 cookies
   * @param {string} partition - session partition
   */
  async clearAllCookies(partition) {
    const ses = this.getSession(partition)
    await ses.clearStorageData({ storages: ['cookies'] })
  }

  /**
   * 开始监听指定 partition 的 cookies 变化
   * @param {string} partition - session partition
   * @param {number} webContentsId - 发起请求的 webContents ID，用于推送事件
   */
  startWatching(partition, webContentsId) {
    // 如果已有监听器，先停止
    if (this.watchers.has(partition)) {
      this.stopWatching(partition)
    }

    const ses = this.getSession(partition)
    
    // 创建监听器
    const listener = (event, cookie, cause, removed) => {
      // 获取目标 webContents
      const allWindows = BrowserWindow.getAllWindows()
      for (const win of allWindows) {
        if (win.webContents.id === webContentsId) {
          // 推送 cookie 变化事件到渲染进程
          win.webContents.send('cookie:changed', {
            partition,
            cookie,
            cause,
            removed
          })
          break
        }
      }
    }

    // 注册监听器
    ses.cookies.on('changed', listener)

    // 保存监听器引用
    this.watchers.set(partition, { listener, webContentsId })
    
    console.log(`[CookieService] Started watching partition: ${partition}`)
  }

  /**
   * 停止监听指定 partition 的 cookies 变化
   * @param {string} partition - session partition
   */
  stopWatching(partition) {
    const watcher = this.watchers.get(partition)
    if (!watcher) {
      return
    }

    const ses = this.getSession(partition)
    ses.cookies.removeListener('changed', watcher.listener)
    this.watchers.delete(partition)
    
    console.log(`[CookieService] Stopped watching partition: ${partition}`)
  }

  /**
   * 注册 IPC 处理器
   */
  registerIpcHandlers() {
    // 获取 cookies
    ipcMain.handle('cookie:get', async (event, partition, filter) => {
      return await this.getCookies(partition, filter)
    })

    // 设置 cookie
    ipcMain.handle('cookie:set', async (event, partition, cookie) => {
      return await this.setCookie(partition, cookie)
    })

    // 删除 cookie
    ipcMain.handle('cookie:remove', async (event, partition, url, name) => {
      return await this.removeCookie(partition, url, name)
    })

    // 清除所有 cookies
    ipcMain.handle('cookie:clear', async (event, partition) => {
      return await this.clearAllCookies(partition)
    })
  }
}

export default new CookieService()

