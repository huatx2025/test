import { autoUpdater } from 'electron-updater'
import { ipcMain, dialog, BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'

// 配置 autoUpdater
autoUpdater.autoDownload = false // 不自动下载，让用户确认
autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装

/**
 * 自动更新服务
 */
const updaterService = {
  /**
   * 初始化更新服务
   */
  init() {
    // 开发环境跳过更新检查
    if (is.dev) {
      console.log('[Updater] 开发环境，跳过更新检查')
      return
    }

    this.setupEventListeners()
    this.registerIpcHandlers()
    
    // 应用启动后延迟检查更新
    setTimeout(() => {
      this.checkForUpdates()
    }, 3000)
  },

  /**
   * 设置更新事件监听
   */
  setupEventListeners() {
    // 检查更新出错
    autoUpdater.on('error', (error) => {
      console.error('[Updater] 更新出错:', error)
      this.sendToRenderer('update-error', error.message)
    })

    // 正在检查更新
    autoUpdater.on('checking-for-update', () => {
      console.log('[Updater] 正在检查更新...')
      this.sendToRenderer('checking-for-update')
    })

    // 发现新版本
    autoUpdater.on('update-available', (info) => {
      console.log('[Updater] 发现新版本:', info.version)
      this.sendToRenderer('update-available', info)
    })

    // 没有新版本
    autoUpdater.on('update-not-available', (info) => {
      console.log('[Updater] 当前已是最新版本:', info.version)
      this.sendToRenderer('update-not-available', info)
    })

    // 下载进度
    autoUpdater.on('download-progress', (progress) => {
      console.log(`[Updater] 下载进度: ${progress.percent.toFixed(2)}%`)
      this.sendToRenderer('download-progress', progress)
    })

    // 下载完成
    autoUpdater.on('update-downloaded', (info) => {
      console.log('[Updater] 下载完成:', info.version)
      this.sendToRenderer('update-downloaded', info)
    })
  },

  /**
   * 注册 IPC 处理器（允许渲染进程触发更新）
   */
  registerIpcHandlers() {
    // 手动检查更新
    ipcMain.handle('updater:check', async () => {
      try {
        const result = await autoUpdater.checkForUpdates()
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // 下载更新
    ipcMain.handle('updater:download', async () => {
      try {
        await autoUpdater.downloadUpdate()
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // 安装更新并重启
    ipcMain.handle('updater:install', () => {
      autoUpdater.quitAndInstall()
    })

    // 获取当前版本
    ipcMain.handle('updater:getVersion', () => {
      return autoUpdater.currentVersion.version
    })
  },

  /**
   * 检查更新
   */
  async checkForUpdates() {
    try {
      console.log('[Updater] 开始检查更新...')
      await autoUpdater.checkForUpdates()
    } catch (error) {
      console.error('[Updater] 检查更新失败:', error)
    }
  },

  /**
   * 向渲染进程发送消息
   */
  sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    })
  }
}

export default updaterService
