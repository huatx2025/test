/**
 * 微信公众号认证辅助工具
 */

import { hasRequiredCookies } from '../cookieHelper'
import { getCookies } from '../partitionHelper'
import { serializePartition } from '../partitionHelper'
import { getWechatUserInfo } from '@/.thidparty_api/wechat'
import { useAccountStore } from '@/store/modules/account'


// 必需的 cookies
const REQUIRED_COOKIES = ['slave_user', 'slave_sid', 'data_ticket', 'data_bizuin']

/**
 * 从 URL 中提取 token
 * @param {string} url - URL 地址
 * @returns {string|null} token 值
 */
export function extractToken(url) {
  try {
    return new URL(url).searchParams.get('token')
  } catch {
    const match = url.match(/[?&]token=([^&]+)/)
    return match ? match[1] : null
  }
}

/**
 * 获取微信公众号账号数据
 * @param {string} url - 登录成功的 URL（包含 token）
 * @param {string} partition - session partition
 * @returns {Promise<Object>} 返回账号数据 { token, platformId, nickname, avatar, serializedPartition, extraData }
 * @throws {Error} 如果处理失败则抛出错误
 */
export async function getWechatAccountData(url, partition) {
  // 提取 token
  const token = extractToken(url)
  if (!token) {
    throw new Error('未获取到 token')
  }

  // 获取 cookies
  const cookies = await getCookies(partition)
  console.log('[微信认证] 获取到 cookies:', cookies.length, '个')

  // 验证 cookies
  if (!hasRequiredCookies(cookies, REQUIRED_COOKIES)) {
    throw new Error('缺少必需的 cookies')
  }

  // 获取用户信息
  const userInfoData = await getWechatUserInfo(token, cookies)
  if (!userInfoData?.user_info) {
    throw new Error('获取用户信息失败')
  }

  const { user_acl, base_resp, operator_author_info, user_info, ...extraData } = userInfoData
  
  // 序列化 partition
  const serializedPartition = await serializePartition(partition, "mp.weixin.qq.com")
  
  // 返回统一的原始数据格式
  return {
    token,
    platformId: base_resp.master_ticket_id,
    nickname: user_info.nick_name,
    avatar: user_info.head_img,
    serializedPartition,
    extraData   // 用户信息接口返回的一些信息
  }
}

/**
 * 保存微信公众号账号到 store
 * @param {string} url - 登录成功的 URL（包含 token）
 * @param {string} partition - session partition
 * @returns {Promise<Object>} 返回保存结果 { success, isUpdate, message, data }
 * @throws {Error} 如果处理失败则抛出错误
 */
export async function saveWechatAccount(url, partition) {
  // 获取账号 store
  const accountStore = useAccountStore()
  
  // 获取微信账号数据
  const authData = await getWechatAccountData(url, partition)
  
  // 创建或更新账号
  const result = await accountStore.createOrUpdateAccountAction({
    platform_type: 'wechat',
    platform_id: authData.platformId,
    name: authData.nickname,
    avatar: authData.avatar,
    url: 'https://mp.weixin.qq.com',
    auth_data: JSON.stringify({
      partition: authData.serializedPartition,
      token: authData.token
    }),
    is_expired: false,
    extra_data: JSON.stringify(authData.extraData || {})
  })
  
  return result
}


