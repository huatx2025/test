import { BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

// 私有状态
let windowInstance = null

// 主窗口管理器
const mainWindow = {
  /**
   * 创建主窗口
   * @returns {BrowserWindow} 创建的主窗口实例
   */
  createMainWindow() {
    // 如果窗口已存在，直接返回
    if (windowInstance && !windowInstance.isDestroyed()) {
      return windowInstance
    }

    // 创建浏览器窗口
    windowInstance = new BrowserWindow({
      width: 1400,
      height: 800,
      // minWidth: 1500,
      // minHeight: 800,
      show: false, // 创建时不显示窗口
      frame: false, // 隐藏默认titlebar
      // roundedCorners: true,
      backgroundColor: '#f0f4f8', // 设置窗口背景色，避免圆角处露白
      // transparent: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        webviewTag: true
      }
    })

    // 当窗口准备好显示时再显示
    windowInstance.once('ready-to-show', () => {
      windowInstance.show()
    })

    // 设置窗口打开外部链接的处理
    windowInstance.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // 加载应用内容
    this.loadContent()

    // 设置窗口事件监听器
    this.setupWindowEvents()

    return windowInstance
  },

  /**
   * 加载应用内容
   */
  loadContent() {
    if (!windowInstance) return

    // 基于 electron-vite cli 的渲染进程热模块替换。
    // 开发环境加载远程 URL，生产环境加载本地 html 文件。
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      windowInstance.loadURL(process.env['ELECTRON_RENDERER_URL'])
      // 开发环境下打开开发者工具
      windowInstance.webContents.openDevTools()
    } else {
      windowInstance.loadFile(join(__dirname, '../renderer/index.html'))
    }
  },

  /**
   * 获取窗口实例
   * @returns {BrowserWindow|null} 窗口实例
   */
  getWindow() {
    return windowInstance
  },

  /**
   * 检查窗口是否存在且未被销毁
   * @returns {boolean}
   */
  isWindowAvailable() {
    return windowInstance && !windowInstance.isDestroyed()
  },

  /**
   * 关闭窗口
   */
  closeWindow() {
    if (windowInstance && !windowInstance.isDestroyed()) {
      windowInstance.close()
    }
  },

  /**
   * 设置窗口事件监听器
   */
  setupWindowEvents() {
    if (!windowInstance) return

    windowInstance.on('maximize', () => {
      windowInstance.webContents.send('window:maximized', true)
    })

    windowInstance.on('unmaximize', () => {
      windowInstance.webContents.send('window:maximized', false)
    })

    windowInstance.on('closed', () => {
      windowInstance = null
    })
  },

  /**
   * 注册IPC处理程序
   */
  registerIpcHandlers() {
    // 最小化窗口
    ipcMain.handle('window:minimize', () => {
      if (windowInstance && !windowInstance.isDestroyed()) {
        windowInstance.minimize()
      }
    })

    // 最大化/还原窗口
    ipcMain.handle('window:maximize', () => {
      if (windowInstance && !windowInstance.isDestroyed()) {
        if (windowInstance.isMaximized()) {
          windowInstance.restore()
        } else {
          windowInstance.maximize()
        }
        return windowInstance.isMaximized()
      }
      return false
    })

    // 关闭窗口
    ipcMain.handle('window:close', () => {
      if (windowInstance && !windowInstance.isDestroyed()) {
        windowInstance.close()
      }
    })

    // 获取窗口状态
    ipcMain.handle('window:isMaximized', () => {
      return windowInstance && !windowInstance.isDestroyed()
        ? windowInstance.isMaximized()
        : false
    })
  }
}

export default mainWindow
