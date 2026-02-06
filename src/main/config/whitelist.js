/**
 * HTTP 请求白名单配置
 * 只有在此列表中的域名才允许通过 HTTP Service 发起请求
 */

// 白名单域名列表
export const HTTP_WHITELIST = [
  // 微信公众平台相关
  'mp.weixin.qq.com',          // 微信公众平台
  'api.weixin.qq.com',         // 微信API
  'weixin.qq.com',             // 微信主域名
  'mmbiz.qpic.cn',             // 微信图片CDN
  'mmbiz.qlogo.cn',            // 微信图片CDN
  'mmecoa.qpic.cn',            // 微信图片CDN（新版）

  // 小红书相关
  'xiaohongshu.com',           // 小红书主域名
  'www.xiaohongshu.com',       // 小红书官网
  'creator.xiaohongshu.com',   // 小红书创作中心

  // 本地开发
  'localhost',                 // 本地开发
  '127.0.0.1',                 // 本地开发
  '192.168.1.10',              // 本地开发

  // 可在此添加更多平台域名...
]

/**
 * 检查URL是否在白名单中
 * @param {string} url - 请求URL
 * @returns {boolean} 是否允许访问
 */
export function isUrlInWhitelist(url) {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname

    // 检查是否匹配白名单
    return HTTP_WHITELIST.some(domain => {
      // 完全匹配或子域名匹配
      return hostname === domain || hostname.endsWith('.' + domain)
    })
  } catch (error) {
    console.error('[Whitelist] URL 解析失败:', error)
    return false
  }
}

