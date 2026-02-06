/**
 * Cookie 辅助工具
 * 提供常用的 Cookie 操作封装
 */

/**
 * 检查 cookies 是否包含必需项
 * @param {Array} cookies - cookie 数组
 * @param {Array} requiredNames - 必需的 cookie 名称数组
 * @returns {boolean}
 */
export function hasRequiredCookies(cookies, requiredNames) {
  if (!requiredNames?.length) return true
  return requiredNames.every((name) => cookies.some((c) => c.name === name))
}

/**
 * 检查 cookies 是否过期
 * @param {Array} cookies - cookie 数组
 * @returns {boolean}
 */
export function areCookiesExpired(cookies) {
  const now = Date.now() / 1000
  return cookies.some((cookie) => cookie.expirationDate && cookie.expirationDate < now)
}

/**
 * 将 cookie 数组转换为字符串（用于请求头）
 * @param {Array} cookies - cookie 数组
 * @returns {string}
 */
export function cookiesToString(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

/**
 * 从 cookie 数组中提取指定名称的值
 * @param {Array} cookies - cookie 数组
 * @param {string} name - cookie 名称
 * @returns {string|null}
 */
export function getCookieValue(cookies, name) {
  const cookie = cookies.find((c) => c.name === name)
  return cookie?.value || null
}
