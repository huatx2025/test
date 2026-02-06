import { ipcMain } from 'electron'
import { net } from 'electron'

class ArticleExtractService {
  constructor() {
    this.parseApiUrl = process.env.PARSE_API_URL || 'http://47.96.22.8:8091'
    this.parseApiKey = process.env.PARSE_API_KEY || 'du&cgIYuosQcaSm6'
  }

  /**
   * 注册 IPC 处理器
   */
  registerIpcHandlers() {
    // 使用 handle 方式，支持渲染进程通过 invoke 直接调用并获取返回值
    ipcMain.handle('article:extract', async (event, url) => {
      try {
        console.log('[ArticleExtractService] 开始提取文章:', url)
        
        // Step 1: 规范化链接
        const normalizedUrl = await this.normalizeWechatUrl(url)
        console.log('[ArticleExtractService] 规范化链接:', normalizedUrl)
        
        // Step 2: 获取HTML内容
        const html = await this.fetchArticleHtml(normalizedUrl)
        console.log('[ArticleExtractService] HTML内容长度:', html.length)
        
        // Step 3: 调用解析服务，返回原始数据
        const rawData = await this.parseHtmlToJson(html)
        console.log('[ArticleExtractService] 解析成功')
        
        // 直接返回结果给调用方
        return {
          code: 0,
          data: rawData.data || rawData,
          message: 'success'
        }
      } catch (error) {
        console.error('[ArticleExtractService] 提取失败:', error)
        // 返回错误信息
        return {
          code: -1,
          message: error.message || '提取失败',
          data: null
        }
      }
    })
  }

  /**
   * 规范化微信链接
   * 支持三种格式：
   * - 短链接: https://mp.weixin.qq.com/s/xxx (22位)
   * - 长链接: https://mp.weixin.qq.com/s?__biz=xxx&mid=xxx&idx=xxx&sn=xxx
   * - 临时链接: 包含tempkey参数的链接（暂不支持转换）
   */
  async normalizeWechatUrl(url) {
    const urlType = this.detectUrlType(url)
    
    // 短链接和长链接都可以直接使用
    if (urlType === 'short' || urlType === 'long') {
      return url
    }
    
    // 临时链接暂不支持转换
    if (urlType === 'temp') {
      throw new Error('暂不支持临时链接，请使用永久链接')
    }
    
    throw new Error('不支持的链接格式')
  }

  /**
   * 检测链接类型
   */
  detectUrlType(url) {
    try {
      const urlObj = new URL(url)
      
      // 检查是否是微信公众号域名
      if (!urlObj.hostname.includes('mp.weixin.qq.com')) {
        throw new Error('不是有效的微信公众号文章链接')
      }
      
      // 短链接格式: /s/xxx (22位字符)
      if (urlObj.pathname.match(/^\/s\/[A-Za-z0-9_-]{22}$/)) {
        return 'short'
      }
      
      // 临时链接: 包含 tempkey 参数
      if (urlObj.searchParams.has('tempkey')) {
        return 'temp'
      }
      
      // 长链接: 包含 __biz, mid, sn 参数
      if (urlObj.searchParams.has('__biz') && 
          urlObj.searchParams.has('mid') && 
          urlObj.searchParams.has('sn')) {
        return 'long'
      }
      
      throw new Error('无效的微信文章链接格式')
    } catch (error) {
      throw new Error(`链接解析失败: ${error.message}`)
    }
  }

  /**
   * 获取文章HTML内容
   */
  fetchArticleHtml(url, timeout = 60000) {
    return new Promise((resolve, reject) => {
      try {
        console.log("url",url);

        const urlObj = new URL(url)        
        const request = net.request({
          method: 'GET',
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://mp.weixin.qq.com',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
          }
        })
        
        // 设置超时
        const timer = setTimeout(() => {
          request.abort()
          reject(new Error(`请求超时: ${timeout}ms`))
        }, timeout)
        
        request.on('response', (response) => {
          let html = ''
          
          // 检查响应状态码
          if (response.statusCode !== 200) {
            clearTimeout(timer)
            reject(new Error(`HTTP错误: ${response.statusCode}`))
            return
          }
          
          response.setEncoding('utf8')
          response.on('data', (chunk) => {
            html += chunk
          })
          
          response.on('end', () => {
            clearTimeout(timer)
            if (html.length === 0) {
              reject(new Error('获取到的HTML内容为空'))
            } else {
              resolve(html)
            }
          })
          
          response.on('error', (error) => {
            clearTimeout(timer)
            reject(new Error(`响应错误: ${error.message}`))
          })
        })
        
        request.on('error', (error) => {
          clearTimeout(timer)
          reject(new Error(`请求错误: ${error.message}`))
        })
        
        request.end()
      } catch (error) {
        reject(new Error(`请求失败: ${error.message}`))
      }
    })
  }

  /**
   * 调用解析API将HTML转换为JSON
   */
  async parseHtmlToJson(html) {
    try {
      const apiUrl = `${this.parseApiUrl}/prase_html_to_json?api_key=${encodeURIComponent(this.parseApiKey)}`
      console.log('[ArticleExtractService] 解析API地址:', apiUrl)
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ html })
      })
      
      if (!response.ok) {
        throw new Error(`解析服务HTTP错误: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.code !== 0) {
        throw new Error(result.message || '解析失败')
      }
      
      return result
    } catch (error) {
      throw new Error(`HTML解析失败: ${error.message}`)
    }
  }

}

export default new ArticleExtractService()

