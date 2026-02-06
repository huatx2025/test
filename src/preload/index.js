import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { join } from 'path'
import { pathToFileURL } from 'url'

// 获取 webview auth preload 脚本路径
const getWebviewAuthPreloadPath = () => {
  const filePath = join(__dirname, '../preload/webview-auth-preload.js')
  return pathToFileURL(filePath).href
}

// 窗口控制 API
const windowAPI = {
  // 最小化窗口
  minimize: () => ipcRenderer.invoke('window:minimize'),

  // 最大化/还原窗口
  maximize: () => ipcRenderer.invoke('window:maximize'),

  // 关闭窗口
  close: () => ipcRenderer.invoke('window:close'),

  // 获取窗口最大化状态
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // 监听窗口最大化状态变化
  onMaximizedChanged: (callback) => {
    ipcRenderer.on('window:maximized', (_, isMaximized) => {
      callback(isMaximized)
    })
  },

  // 移除窗口状态监听
  offMaximizedChanged: () => {
    ipcRenderer.removeAllListeners('window:maximized')
  }
}

// Cookie 管理 API
const cookieAPI = {
  // 获取 cookies
  get: (partition, filter) => ipcRenderer.invoke('cookie:get', partition, filter),

  // 设置 cookie
  set: (partition, cookie) => ipcRenderer.invoke('cookie:set', partition, cookie),

  // 删除 cookie
  remove: (partition, url, name) => ipcRenderer.invoke('cookie:remove', partition, url, name),

  // 清除所有 cookies
  clear: (partition) => ipcRenderer.invoke('cookie:clear', partition)
}

// HTTP 请求 API
const httpAPI = {
  // 发送 HTTP 请求
  fetch: (url, options) => ipcRenderer.invoke('http:fetch', url, options),
  
  // 获取图片（返回 base64）
  fetchImage: (url, options) => ipcRenderer.invoke('http:fetchImage', url, options),
  
  // 中止请求
  abort: (requestId) => ipcRenderer.invoke('http:abort', requestId)
}

// Storage 管理 API
const storageAPI = {
  // 获取 localStorage
  getLocalStorage: () => ipcRenderer.invoke('storage:getLocalStorage'),

  // 设置 localStorage
  setLocalStorage: (data) => ipcRenderer.invoke('storage:setLocalStorage', data),

  // 清除 localStorage
  clearLocalStorage: () => ipcRenderer.invoke('storage:clearLocalStorage'),

  // 清除所有存储数据
  clearAll: (partition) => ipcRenderer.invoke('storage:clearAll', partition),

  // 准备 localStorage 缓存（用于 webview preload 注入）
  prepareLocalStorage: (partition, data) => ipcRenderer.invoke('storage:prepareLocalStorage', partition, data),

  // 获取 webview auth preload 脚本路径
  getWebviewAuthPreloadPath: () => ipcRenderer.invoke('storage:getWebviewAuthPreloadPath')
}

// 文章提取 API
const articleAPI = {
  // 提取文章内容
  extract: (url) => ipcRenderer.invoke('article:extract', url)
}

// 自动更新 API
const updaterAPI = {
  // 检查更新
  check: () => ipcRenderer.invoke('updater:check'),

  // 下载更新
  download: () => ipcRenderer.invoke('updater:download'),

  // 安装更新并重启
  install: () => ipcRenderer.invoke('updater:install'),

  // 获取当前版本
  getVersion: () => ipcRenderer.invoke('updater:getVersion'),

  // 监听更新事件
  onCheckingForUpdate: (callback) => {
    ipcRenderer.on('checking-for-update', () => callback())
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_, info) => callback(info))
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', (_, info) => callback(info))
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info))
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (_, error) => callback(error))
  }
}

// 使用 `contextBridge` API 将 Electron API 暴露给渲染进程
// 仅在启用上下文隔离时使用 contextBridge，否则直接添加到 DOM 全局对象
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', {
      window: windowAPI,
      cookie: cookieAPI,
      http: httpAPI,
      storage: storageAPI,
      article: articleAPI,
      updater: updaterAPI,
      getWebviewAuthPreloadPath
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.electronAPI = {
    window: windowAPI,
    cookie: cookieAPI,
    http: httpAPI,
    storage: storageAPI,
    article: articleAPI,
    updater: updaterAPI,
    getWebviewAuthPreloadPath
  }
}
