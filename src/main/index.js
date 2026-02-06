import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import mainWindowService from './services/window/index.js'
import cookieService from './services/cookie/index.js'
import httpService from './services/http/index.js'
import storageService from './services/storage/index.js'
import articleService from './services/article/index.js'
import updaterService from './services/updater/index.js'

// 拦截所有 webview 中的新窗口打开请求
app.on('web-contents-created', (event, contents) => {
  // 只处理 webview 类型的 webContents
  if (contents.getType() === 'webview') {
    // 禁用 webview 的 CSP，允许加载外部资源
    contents.session.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders || {}
      // 移除 CSP 相关的响应头
      delete headers['content-security-policy']
      delete headers['content-security-policy-report-only']
      delete headers['x-content-security-policy']
      delete headers['x-webkit-csp']
      
      callback({ responseHeaders: headers })
    })

    // 拦截新窗口打开，改为在当前 webview 中导航
    contents.setWindowOpenHandler(({ url }) => {
      // 在当前 webview 中加载 URL
      contents.loadURL(url)
      // 阻止新窗口打开
      return { action: 'deny' }
    })

    // 同时处理 will-navigate 事件（某些情况下的跳转）
    contents.on('will-navigate', (event, url) => {
      // 允许正常导航，不做拦截
    })

  }
})

// 当 Electron 完成初始化并准备好创建浏览器窗口时，将调用此方法。
// 某些 API 只能在此事件发生后使用。
app.whenReady().then(() => {
  // 为 Windows 设置应用用户模型 ID
  electronApp.setAppUserModelId('com.jzl.easydraft')

  // 开发环境默认使用 F12 打开或关闭 DevTools，
  // 生产环境忽略 CommandOrControl + R。
  // 参见 https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册窗口控制 IPC 处理器
  mainWindowService.registerIpcHandlers()

  // 注册 Cookie 服务 IPC 处理器
  cookieService.registerIpcHandlers()

  // 注册 HTTP 服务 IPC 处理器
  httpService.registerIpcHandlers()

  // 注册 Storage 服务 IPC 处理器
  storageService.registerIpcHandlers()

  // 注册文章提取服务 IPC 处理器
  articleService.registerIpcHandlers()

  // 创建主窗口
  mainWindowService.createMainWindow()

  // 初始化自动更新服务
  updaterService.init()

  app.on('activate', function () {
    // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，
    // 通常会在应用中重新创建一个窗口。
    if (!mainWindowService.isWindowAvailable()) {
      mainWindowService.createMainWindow()
    }
  })
})

// 当所有窗口关闭时退出，macOS 除外。在 macOS 上，应用及其菜单栏
// 通常会保持活动状态，直到用户使用 Cmd + Q 明确退出。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在此文件中，你可以包含应用特定的其余主进程代码。
// 你也可以将它们放在单独的文件中，并在此处引入它们。
