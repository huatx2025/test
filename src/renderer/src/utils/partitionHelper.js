/**
 * partition 辅助工具
 * cookies操作
 * 序列化/反序列化
 */

/**
 * 获取指定 partition 的所有 cookies
 * @param {string} partition - session partition
 * @param {object} filter - 过滤条件
 * @returns {Promise<Array>}
 */
export async function getCookies(partition, filter = {}) {
  return await window.electronAPI.cookie.get(partition, filter)
}

/**
 * 设置 cookie
 * @param {string} partition - session partition
 * @param {object} cookie - cookie 对象
 * @returns {Promise<void>}
 */
export async function setCookie(partition, cookie) {
  return await window.electronAPI.cookie.set(partition, cookie)
}

/**
 * 为 partition 批量设置 cookies
 * @param {string} partition - session partition
 * @param {Array} cookies - cookie 数组
 * @returns {Promise<void>}
 */
export async function setCookies(partition, cookies) {
  await Promise.all(cookies.map((cookie) => setCookie(partition, cookie)))
}

/**
 * 删除 cookie
 * @param {string} partition - session partition
 * @param {string} url - cookie 的 URL
 * @param {string} name - cookie 名称
 * @returns {Promise<void>}
 */
export async function removeCookie(partition, url, name) {
  return await window.electronAPI.cookie.remove(partition, url, name)
}

/**
 * 清除所有 cookies
 * @param {string} partition - session partition
 * @returns {Promise<void>}
 */
export async function clearCookies(partition) {
  return await window.electronAPI.cookie.clear(partition)
}

/**
 * 检查指定 partition 的 cookies 是否有效
 * @param {string} partition - session partition
 * @returns {Promise<boolean>}
 */
export async function checkCookiesValid(partition) {
  try {
    const cookies = await getCookies(partition)
    if (!cookies || cookies.length === 0) {
      return false
    }
    return !areCookiesExpired(cookies)
  } catch (error) {
    console.error('检查 cookies 失败:', error)
    return false
  }
}

/**
 * 将 partition 的数据序列化为字符串
 * @param {string} partition - session partition
 * @param {string} [domain] - 可选，只序列化匹配该 domain 的 cookies（支持 .domain.com 格式）
 *                           匹配规则：会匹配该域名及其所有子域的 cookies
 *                           例如：传入 'qq.com' 会匹配：
 *                           - qq.com
 *                           - .qq.com
 *                           - weixin.qq.com
 *                           - mail.qq.com
 *                           - mp.weixin.qq.com
 *                           - 以及所有其他 *.qq.com 的子域
 * @returns {Promise<string>} 序列化后的 partition 字符串
 */
export async function serializePartition(partition, domain = null) {
  try {
    // 获取 cookies
    let cookies = await getCookies(partition)

    // 如果指定了 domain，则过滤 cookies
    if (domain) {
      cookies = cookies.filter((cookie) => {
        // 移除 domain 前面的点进行比较
        const cookieDomain = cookie.domain.startsWith('.')
          ? cookie.domain.substring(1)
          : cookie.domain
        const targetDomain = domain.startsWith('.') ? domain.substring(1) : domain

        // 完全匹配或 cookie domain 是目标 domain 的子域
        return (
          cookieDomain === targetDomain ||
          cookie.domain === domain ||
          cookie.domain === `.${targetDomain}` ||
          cookieDomain.endsWith(`.${targetDomain}`)
        )
      })
    }

    // 获取 localStorage
    // const localStorage = await window.electronAPI.storage.getLocalStorage()

    // 构建存储对象
    const authData = {
      version: '1.0', // 版本号，方便未来升级
      timestamp: Date.now(), // 时间戳
      cookies: cookies,
      // localStorage: localStorage
    }

    // 转为 JSON 字符串
    const partitionString = JSON.stringify(authData)

    // 估算大小（字节）
    const sizeInBytes = new Blob([partitionString]).size
    console.log(`partitionString 数据大小: ${sizeInBytes} bytes (${(sizeInBytes / 1024).toFixed(2)} KB)`)

    return partitionString
  } catch (error) {
    console.error('序列化 partition 失败:', error)
    throw error
  }
}

/**
 * 将 partition 字符串反序列化
 * @param {string} partitionString - 序列化的 auth 字符串
 * @param {string} partition - 目标 session partition
 * @returns {Promise<{localStorage: object}>} 返回 localStorage 数据（需要在 webview ready 后注入）
 */
export async function deserializePartition(partitionString, partition) {
  try {
    // 解析 JSON
    const authData = JSON.parse(partitionString)

    // 验证数据格式
    if (!authData.version || !authData.cookies) {
      throw new Error('无效的 auth 数据格式')
    }

    // 恢复 cookies
    if (authData.cookies && authData.cookies.length > 0) {
      // 为每个 cookie 添加 url 字段（Electron 需要）
      const cookiesWithUrl = authData.cookies.map((cookie) => {
        // 移除 domain 前面的点（如果有），避免生成无效的 URL
        const cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain
        return {
          ...cookie,
          url: `http${cookie.secure ? 's' : ''}://${cleanDomain}${cookie.path}`
        }
      })

      await setCookies(partition, cookiesWithUrl)
    }

    console.log(`partition 反序列化完成，共 ${authData.cookies?.length || 0} 个 cookies`)
  } catch (error) {
    console.error('反序列化 partition 失败:', error)
    throw error
  }
}
