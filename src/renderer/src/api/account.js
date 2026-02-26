import request from './index'

// ============ 分组相关 ============

/**
 * 获取所有分组（含账号）
 */
export function getGroups() {
  return request.get('/accounts/groups')
}

/**
 * 创建分组
 * @param {Object} data - 分组信息
 * @param {string} data.name - 分组名称
 * @param {boolean} [data.expanded] - 是否展开
 */
export function createGroup(data) {
  return request.post('/accounts/groups', data)
}

/**
 * 更新分组
 * @param {number} groupId - 分组ID
 * @param {Object} data - 更新信息
 */
export function updateGroup(groupId, data) {
  return request.put(`/accounts/groups/${groupId}`, data)
}

/**
 * 删除分组
 * @param {number} groupId - 分组ID
 */
export function deleteGroup(groupId) {
  return request.delete(`/accounts/groups/${groupId}`)
}

/**
 * 分组排序
 * @param {Array} items - 排序项 [{id, sort_order}, ...]
 */
export function sortGroups(items) {
  return request.post('/accounts/groups/sort', { items })
}

// ============ 账号相关 ============

/**
 * 获取所有账号
 */
export function getAccounts() {
  return request.get('/accounts/')
}

/**
 * 获取单个账号
 * @param {number} accountId - 账号ID
 */
export function getAccount(accountId) {
  return request.get(`/accounts/${accountId}`)
}

/**
 * 创建或更新账号（如果platform_id相同则更新）
 * @param {Object} data - 账号信息
 * @param {number} [data.group_id] - 分组ID（可选，不传则不分组）
 * @param {string} data.platform_type - 平台类型
 * @param {string} data.name - 账号名称
 * @param {string} [data.platform_id] - 平台唯一标识（如果已存在则更新该账号）
 * @param {string} [data.avatar] - 头像URL
 * @param {string} [data.url] - 平台URL
 * @param {string} [data.auth_data] - 认证数据JSON
 * @param {string} [data.extra_data] - 额外数据JSON
 */
export function createOrUpdateAccount(data) {
  return request.post('/accounts/create_or_update', data)
}

/**
 * 更新账号
 * @param {number} accountId - 账号ID
 * @param {Object} data - 更新信息
 */
export function updateAccount(accountId, data) {
  return request.put(`/accounts/${accountId}`, data)
}

/**
 * 删除账号
 * @param {number} accountId - 账号ID
 */
export function deleteAccount(accountId) {
  return request.delete(`/accounts/${accountId}`)
}

/**
 * 账号排序
 * @param {Array} items - 排序项 [{id, sort_order}, ...]
 */
export function sortAccounts(items) {
  return request.post('/accounts/sort', { items })
}

/**
 * 移动账号到分组
 * @param {number} accountId - 账号ID
 * @param {number} groupId - 目标分组ID
 */
export function moveAccountToGroup(accountId, groupId) {
  return request.post(`/accounts/${accountId}/move`, null, {
    params: { group_id: groupId }
  })
}

/**
 * 使账号失效
 * @param {number} accountId - 账号ID
 * @returns {Promise} 返回更新后的账号信息
 */
export function invalidateAccount(accountId) {
  return request.post(`/accounts/${accountId}/invalidate`)
}

/**
 * 增量同步账号认证数据
 * @param {number} accountId - 账号ID
 * @param {Object} diff - 增量数据
 * @param {Object} diff.cookies - cookies 增量 { added, modified, removed }
 * @param {Object} diff.localStorage - localStorage 增量 { added, modified, removed }
 * @returns {Promise} 返回同步统计信息
 */
export function syncAccountAuth(accountId, diff) {
  return request.patch(`/accounts/${accountId}/auth`, diff)
}


