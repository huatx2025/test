import { ipcMain } from 'electron'
import axios from 'axios'
import { isUrlInWhitelist } from '../../config/whitelist.js'

class HttpService {
  constructor() {
    // 存储进行中的请求，用于支持中止
    this.pendingRequests = new Map()
  }

  registerIpcHandlers() {
    ipcMain.handle('http:fetch', async (event, url, options = {}) => {
      if (!isUrlInWhitelist(url)) {
        throw new Error(`请求被拒绝：域名不在白名单中 (${new URL(url).hostname})`)
      }
      return await this.fetch(url, options)
    })

    // 图片代理接口
    ipcMain.handle('http:fetchImage', async (event, url, options = {}) => {
      if (!isUrlInWhitelist(url)) {
        throw new Error(`请求被拒绝：域名不在白名单中 (${new URL(url).hostname})`)
      }
      return await this.fetchImage(url, options)
    })

    // 中止请求接口
    ipcMain.handle('http:abort', async (event, requestId) => {
      return this.abortRequest(requestId)
    })

    // 记录导入统计接口（绕过 CORS）
    ipcMain.handle('http:recordStats', async (event, articleCount) => {
      return await this.recordImportStats(articleCount)
    })

    // 记录保存草稿统计接口（绕过 CORS）
    ipcMain.handle('http:recordSaveStats', async (event) => {
      return await this.recordSaveStats()
    })

    // 记录同步统计接口（绕过 CORS）
    ipcMain.handle('http:recordSyncStats', async (event) => {
      return await this.recordSyncStats()
    })

    // 记录发表统计接口（绕过 CORS）
    ipcMain.handle('http:recordPublishStats', async (event) => {
      return await this.recordPublishStats()
    })
  }

  async fetch(url, options = {}) {
    // 创建 AbortController 用于中止请求
    const controller = new AbortController()
    const requestId = options.requestId || `req_${Date.now()}_${Math.random()}`

    // 如果提供了 requestId，保存到 pendingRequests 中
    if (options.requestId) {
      this.pendingRequests.set(requestId, controller)
    }

    try {
      const response = await axios({
        method: options.method || 'GET',
        url,
        headers: options.headers || {},
        data: options.body,
        validateStatus: () => true,
        signal: controller.signal
      })

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      }
    } catch (error) {
      // 如果是中止错误，返回特殊状态
      if (axios.isCancel(error) || error.name === 'CanceledError') {
        return {
          ok: false,
          status: 0,
          statusText: 'Request Aborted',
          aborted: true,
          error: '请求已中止'
        }
      }
      throw error
    } finally {
      // 清理
      if (options.requestId) {
        this.pendingRequests.delete(requestId)
      }
    }
  }

  /**
   * 中止指定的请求
   * @param {string} requestId - 请求ID
   * @returns {boolean} 是否成功中止
   */
  abortRequest(requestId) {
    const controller = this.pendingRequests.get(requestId)
    if (controller) {
      controller.abort()
      this.pendingRequests.delete(requestId)
      return true
    }
    return false
  }

  async fetchImage(url, options = {}) {
    try {
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        headers: {
          'Referer': 'https://mp.weixin.qq.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          ...options.headers
        },
        timeout: 30000,
        validateStatus: () => true
      })

      if (response.status >= 200 && response.status < 300) {
        // 将图片数据转换为 base64
        const base64 = Buffer.from(response.data, 'binary').toString('base64')
        const contentType = response.headers['content-type'] || 'image/jpeg'
        
        return {
          ok: true,
          status: response.status,
          data: `data:${contentType};base64,${base64}`,
          contentType
        }
      } else {
        return {
          ok: false,
          status: response.status,
          data: null,
          error: `图片加载失败: ${response.status}`
        }
      }
    } catch (error) {
      console.error('[HttpService] 图片加载失败:', error)
      return {
        ok: false,
        status: 500,
        data: null,
        error: error.message
      }
    }
  }

  /**
   * 记录导入统计（绕过 CORS）
   * @param {number} articleCount - 导入的文章数量
   */
  async recordImportStats(articleCount) {
    const API_URL = 'http://47.111.132.55:8000/api/set_redis_key'
    const API_PWD = 'nKoehQVxmVMc2Jgg'

    try {
      // 生成今天的日期格式：YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0]
      const keyName = `bqs:import:${today}`

      const response = await axios({
        method: 'POST',
        url: API_URL,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: {
          pwd: API_PWD,
          mode: 2,
          key_name: keyName,
          incr_by: articleCount,
          expire: 691200
        },
        timeout: 10000,
        validateStatus: () => true
      })

      if (response.status >= 200 && response.status < 300) {
        console.log('[HttpService] 导入统计记录成功:', response.data)
        return {
          ok: true,
          status: response.status,
          data: response.data
        }
      } else {
        console.error('[HttpService] 导入统计记录失败:', response.status, response.data)
        return {
          ok: false,
          status: response.status,
          error: `统计记录失败: ${response.status}`
        }
      }
    } catch (error) {
      console.error('[HttpService] 导入统计记录异常:', error)
      return {
        ok: false,
        status: 500,
        error: error.message
      }
    }
  }

  /**
   * 记录保存草稿统计（绕过 CORS）
   */
  async recordSaveStats() {
    const API_URL = 'http://47.111.132.55:8000/api/set_redis_key'
    const API_PWD = 'nKoehQVxmVMc2Jgg'

    try {
      // 生成今天的日期格式：YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0]
      const keyName = `bqs:save:${today}`

      const response = await axios({
        method: 'POST',
        url: API_URL,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: {
          pwd: API_PWD,
          mode: 2,
          key_name: keyName,
          incr_by: 1,
          expire: 691200
        },
        timeout: 10000,
        validateStatus: () => true
      })

      if (response.status >= 200 && response.status < 300) {
        console.log('[HttpService] 保存草稿统计记录成功:', response.data)
        return {
          ok: true,
          status: response.status,
          data: response.data
        }
      } else {
        console.error('[HttpService] 保存草稿统计记录失败:', response.status, response.data)
        return {
          ok: false,
          status: response.status,
          error: `统计记录失败: ${response.status}`
        }
      }
    } catch (error) {
      console.error('[HttpService] 保存草稿统计记录异常:', error)
      return {
        ok: false,
        status: 500,
        error: error.message
      }
    }
  }

  /**
   * 记录同步统计（绕过 CORS）
   */
  async recordSyncStats() {
    const API_URL = 'http://47.111.132.55:8000/api/set_redis_key'
    const API_PWD = 'nKoehQVxmVMc2Jgg'

    try {
      // 生成今天的日期格式：YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0]
      const keyName = `bqs:sync:${today}`

      const response = await axios({
        method: 'POST',
        url: API_URL,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: {
          pwd: API_PWD,
          mode: 2,
          key_name: keyName,
          incr_by: 1,
          expire: 691200
        },
        timeout: 10000,
        validateStatus: () => true
      })

      if (response.status >= 200 && response.status < 300) {
        console.log('[HttpService] 同步统计记录成功:', response.data)
        return {
          ok: true,
          status: response.status,
          data: response.data
        }
      } else {
        console.error('[HttpService] 同步统计记录失败:', response.status, response.data)
        return {
          ok: false,
          status: response.status,
          error: `统计记录失败: ${response.status}`
        }
      }
    } catch (error) {
      console.error('[HttpService] 同步统计记录异常:', error)
      return {
        ok: false,
        status: 500,
        error: error.message
      }
    }
  }

  /**
   * 记录发表统计（绕过 CORS）
   */
  async recordPublishStats() {
    const API_URL = 'http://47.111.132.55:8000/api/set_redis_key'
    const API_PWD = 'nKoehQVxmVMc2Jgg'

    try {
      // 生成今天的日期格式：YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0]
      const keyName = `bqs:publish:${today}`

      const response = await axios({
        method: 'POST',
        url: API_URL,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: {
          pwd: API_PWD,
          mode: 2,
          key_name: keyName,
          incr_by: 1,
          expire: 691200
        },
        timeout: 10000,
        validateStatus: () => true
      })

      if (response.status >= 200 && response.status < 300) {
        console.log('[HttpService] 发表统计记录成功:', response.data)
        return {
          ok: true,
          status: response.status,
          data: response.data
        }
      } else {
        console.error('[HttpService] 发表统计记录失败:', response.status, response.data)
        return {
          ok: false,
          status: response.status,
          error: `统计记录失败: ${response.status}`
        }
      }
    } catch (error) {
      console.error('[HttpService] 发表统计记录异常:', error)
      return {
        ok: false,
        status: 500,
        error: error.message
      }
    }
  }
}

export default new HttpService()


