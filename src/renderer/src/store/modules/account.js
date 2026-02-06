import { defineStore } from 'pinia'
import { store } from '../index'
import {
  getGroups,
  getAccounts,
  createGroup,
  updateGroup,
  deleteGroup,
  sortGroups,
  createOrUpdateAccount,
  updateAccount,
  deleteAccount,
  sortAccounts,
  invalidateAccount
} from '@/api/account'

export const useAccountStore = defineStore('account', {
  state: () => ({
    // 分组列表（含账号）
    groups: [],
    // 未分组的账号列表
    ungroupedAccounts: [],
    // 草稿箱选中的账号ID
    draftBoxSelectedAccountId: null,
    // 多开面板选中的账号ID
    multiPanelSelectedAccountId: null,
    // 加载状态
    loading: false,
    // 是否已初始化
    initialized: false
  }),

  getters: {
    // 获取所有分组
    getGroups: (state) => state.groups,

    // 获取未分组的账号
    getUngroupedAccounts: (state) => state.ungroupedAccounts,

    // 获取草稿箱选中的账号
    getDraftBoxSelectedAccount(state) {
      if (!state.draftBoxSelectedAccountId) return null
      return this.getAccountById(state.draftBoxSelectedAccountId)
    },

    // 获取多开面板选中的账号
    getMultiPanelSelectedAccount(state) {
      if (!state.multiPanelSelectedAccountId) return null
      return this.getAccountById(state.multiPanelSelectedAccountId)
    },

    // 获取所有账号（扁平化）
    getAllAccounts: (state) => {
      const accounts = [...state.ungroupedAccounts]
      state.groups.forEach(group => {
        if (group.accounts) {
          accounts.push(...group.accounts)
        }
      })
      return accounts
    },

    // 根据ID获取账号
    getAccountById: (state) => (accountId) => {
      // 先从未分组账号中查找
      const ungrouped = state.ungroupedAccounts.find(a => a.id === accountId)
      if (ungrouped) {
        return ungrouped
      }
      // 再从分组中查找
      for (const group of state.groups) {
        const account = group.accounts?.find(a => a.id === accountId)
        if (account) {
          return account
        }
      }
      return null
    },

    // 根据ID获取分组
    getGroupById: (state) => (groupId) => {
      return state.groups.find(g => g.id === groupId)
    }
  },

  actions: {
    /**
     * 内部辅助方法：在未分组和分组中查找账号
     * @param {number} accountId - 账号ID
     * @returns {Object|null} { location: 'ungrouped'|'group', index: number, group?: Object }
     */
    _findAccountLocation(accountId) {
      // 先从未分组中查找
      const ungroupedIndex = this.ungroupedAccounts.findIndex(a => a.id === accountId)
      if (ungroupedIndex > -1) {
        return { location: 'ungrouped', index: ungroupedIndex }
      }
      
      // 再从分组中查找
      for (const group of this.groups) {
        const index = group.accounts?.findIndex(a => a.id === accountId)
        if (index > -1) {
          return { location: 'group', index, group }
        }
      }
      
      return null
    },

    /**
     * 内部辅助方法：更新账号数据
     * @param {number} accountId - 账号ID
     * @param {Object} accountData - 新的账号数据
     * @returns {boolean} 是否更新成功
     */
    _updateAccountInStore(accountId, accountData) {
      const location = this._findAccountLocation(accountId)
      if (!location) return false

      if (location.location === 'ungrouped') {
        this.ungroupedAccounts[location.index] = accountData
      } else {
        location.group.accounts[location.index] = accountData
      }

      return true
    },

    /**
     * 内部辅助方法：删除账号
     * @param {number} accountId - 账号ID
     * @returns {boolean} 是否删除成功
     */
    _removeAccountFromStore(accountId) {
      const location = this._findAccountLocation(accountId)
      if (!location) return false

      if (location.location === 'ungrouped') {
        this.ungroupedAccounts.splice(location.index, 1)
      } else {
        location.group.accounts.splice(location.index, 1)
      }

      // 如果删除的是当前选中的账号，清除对应的选中状态
      if (this.draftBoxSelectedAccountId === accountId) {
        this.draftBoxSelectedAccountId = null
      }
      if (this.multiPanelSelectedAccountId === accountId) {
        this.multiPanelSelectedAccountId = null
      }

      return true
    },

    /**
     * 加载分组和账号数据
     */
    async fetchGroups() {
      this.loading = true
      try {
        // 同时获取分组和所有账号
        const [groupsRes, accountsRes] = await Promise.all([
          getGroups(),
          getAccounts()
        ])
        
        if (groupsRes.code === 0) {
          this.groups = groupsRes.data || []
        }
        
        if (accountsRes.code === 0) {
          // 筛选出未分组的账号
          const allAccounts = accountsRes.data || []
          this.ungroupedAccounts = allAccounts.filter(a => !a.group_id)
        }
        
        this.initialized = true
        return { success: true }
      } catch (error) {
        const message = error.response?.data?.detail || '加载账号数据失败'
        return { success: false, message }
      } finally {
        this.loading = false
      }
    },

    /**
     * 创建分组
     * @param {Object} groupData - 分组数据
     */
    async createGroupAction(groupData) {
      try {
        const res = await createGroup(groupData)
        if (res.code === 0) {
          this.groups.push(res.data)
          return { success: true, group: res.data }
        }
        return { success: false, message: res.message || '创建失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '创建分组失败'
        return { success: false, message }
      }
    },

    /**
     * 更新分组
     * @param {number} groupId - 分组ID
     * @param {Object} groupData - 更新数据
     */
    async updateGroupAction(groupId, groupData) {
      try {
        const res = await updateGroup(groupId, groupData)
        if (res.code === 0) {
          const index = this.groups.findIndex(g => g.id === groupId)
          if (index > -1) {
            this.groups[index] = res.data
          }
          return { success: true, group: res.data }
        }
        return { success: false, message: res.message || '更新失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '更新分组失败'
        return { success: false, message }
      }
    },

    /**
     * 删除分组
     * @param {number} groupId - 分组ID
     */
    async deleteGroupAction(groupId) {
      try {
        const res = await deleteGroup(groupId)
        if (res.code === 0) {
          const index = this.groups.findIndex(g => g.id === groupId)
          if (index > -1) {
            this.groups.splice(index, 1)
          }
          return { success: true }
        }
        return { success: false, message: res.message || '删除失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '删除分组失败'
        return { success: false, message }
      }
    },

    /**
     * 更新分组排序
     * @param {Array} items - 排序项
     */
    async sortGroupsAction(items) {
      try {
        const res = await sortGroups(items)
        if (res.code === 0) {
          // 更新本地排序
          items.forEach(item => {
            const group = this.groups.find(g => g.id === item.id)
            if (group) {
              group.sort_order = item.sort_order
            }
          })
          this.groups.sort((a, b) => a.sort_order - b.sort_order)
          return { success: true }
        }
        return { success: false, message: res.message || '排序失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '排序失败'
        return { success: false, message }
      }
    },

    /**
     * 切换分组展开状态
     * @param {number} groupId - 分组ID
     */
    async toggleGroupExpanded(groupId) {
      const group = this.groups.find(g => g.id === groupId)
      if (group) {
        const newExpanded = !group.expanded
        group.expanded = newExpanded
        // 同步到后端
        await updateGroup(groupId, { expanded: newExpanded }).catch(() => {
          // 恢复状态
          group.expanded = !newExpanded
        })
      }
    },

    /**
     * 创建或更新账号（如果platform_id相同则更新）
     * @param {Object} accountData - 账号数据
     */
    async createOrUpdateAccountAction(accountData) {
      try {
        const res = await createOrUpdateAccount(accountData)
        if (res.code === 0) {
          
          const isUpdate = res.message && res.message.includes('更新')

          const account = res.data
          
          if (isUpdate) {
            // 更新现有账号
            this._updateAccountInStore(account.id, account)
          } else {
            // 添加新账号
            if (account.group_id) {
              // 有分组的账号
              const group = this.groups.find(g => g.id === account.group_id)
              if (group) {
                if (!group.accounts) {
                  group.accounts = []
                }
                group.accounts.push(account)
              }
            } else {
              // 无分组的账号
              this.ungroupedAccounts.push(account)
            }
          }
          return { 
            success: true, 
            account: account, 
            message: res.message,
            isUpdate 
          }
        }
        return { success: false, message: res.message || '操作失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '操作失败'
        return { success: false, message }
      }
    },

    /**
     * 更新账号
     * @param {number} accountId - 账号ID
     * @param {Object} accountData - 更新数据
     */
    async updateAccountAction(accountId, accountData) {
      try {
        const res = await updateAccount(accountId, accountData)
        if (res.code === 0) {
          // 更新本地数据
          this._updateAccountInStore(accountId, res.data)
          return { success: true, account: res.data }
        }
        return { success: false, message: res.message || '更新失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '更新账号失败'
        return { success: false, message }
      }
    },

    /**
     * 修改账号分组
     * @param {number} accountId - 账号ID
     * @param {number|null} newGroupId - 新分组ID（null表示未分组）
     */
    async changeAccountGroup(accountId, newGroupId) {
      try {
        // 获取当前账号信息
        const currentAccount = this.getAccountById(accountId)
        if (!currentAccount) {
          return { success: false, message: '账号不存在' }
        }

        // 如果分组没有变化，直接返回
        if (currentAccount.group_id === newGroupId) {
          return { success: true, message: '分组未变化' }
        }

        // 调用API更新账号分组
        const res = await updateAccount(accountId, {
          group_id: newGroupId
        })

        if (res.code === 0) {
          const updatedAccount = res.data
          
          // 从原位置移除账号
          this._removeAccountFromStore(accountId)
          
          // 添加到新位置
          if (updatedAccount.group_id) {
            // 添加到分组
            const group = this.groups.find(g => g.id === updatedAccount.group_id)
            if (group) {
              if (!group.accounts) {
                group.accounts = []
              }
              group.accounts.push(updatedAccount)
            }
          } else {
            // 添加到未分组
            this.ungroupedAccounts.push(updatedAccount)
          }

          return { success: true, account: updatedAccount }
        }
        
        return { success: false, message: res.message || '修改分组失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '修改分组失败'
        return { success: false, message }
      }
    },

    /**
     * 删除账号
     * @param {number} accountId - 账号ID
     */
    async deleteAccountAction(accountId) {
      try {
        const res = await deleteAccount(accountId)
        if (res.code === 0) {
          // 从本地数据中删除
          this._removeAccountFromStore(accountId)
          return { success: true }
        }
        return { success: false, message: res.message || '删除失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '删除账号失败'
        return { success: false, message }
      }
    },

    /**
     * 更新账号排序
     * @param {number|null} groupId - 分组ID（null表示未分组账号）
     * @param {Array} items - 排序项
     */
    async sortAccountsAction(groupId, items) {
      try {
        const res = await sortAccounts(items)
        if (res.code === 0) {
          if (groupId === null) {
            // 更新未分组账号的本地排序
            items.forEach(item => {
              const account = this.ungroupedAccounts.find(a => a.id === item.id)
              if (account) {
                account.sort_order = item.sort_order
              }
            })
            this.ungroupedAccounts.sort((a, b) => a.sort_order - b.sort_order)
          } else {
            // 更新分组内账号的本地排序
            const group = this.groups.find(g => g.id === groupId)
            if (group && group.accounts) {
              items.forEach(item => {
                const account = group.accounts.find(a => a.id === item.id)
                if (account) {
                  account.sort_order = item.sort_order
                }
              })
              group.accounts.sort((a, b) => a.sort_order - b.sort_order)
            }
          }
          return { success: true }
        }
        return { success: false, message: res.message || '排序失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '排序失败'
        return { success: false, message }
      }
    },

    /**
     * 使账号失效（清空认证数据，设置状态为失效）
     * @param {number} accountId - 账号ID
     */
    async invalidateAccountAction(accountId) {
      try {
        const res = await invalidateAccount(accountId)
        if (res.code === 0) {
          // 更新本地数据
          this._updateAccountInStore(accountId, res.data)
          return { success: true, account: res.data }
        }
        return { success: false, message: res.message || '操作失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '使账号失效失败'
        return { success: false, message }
      }
    },

    /**
     * 选择账号（草稿箱）
     * @param {Object} account - 账号对象
     */
    selectDraftBoxAccount(account) {
      this.draftBoxSelectedAccountId = account?.id || null
    },

    /**
     * 选择账号（多开面板）
     * @param {Object} account - 账号对象
     */
    selectMultiPanelAccount(account) {
      this.multiPanelSelectedAccountId = account?.id || null
    },

    /**
     * 清除草稿箱选中
     */
    clearDraftBoxSelection() {
      this.draftBoxSelectedAccountId = null
    },

    /**
     * 清除多开面板选中
     */
    clearMultiPanelSelection() {
      this.multiPanelSelectedAccountId = null
    },

    /**
     * 更新账号的 auth_data（本地更新，不调用后端）
     * 用于增量同步后更新本地状态
     * @param {number} accountId - 账号ID
     * @param {string} authData - 新的 auth_data JSON 字符串
     * @returns {boolean} 是否更新成功
     */
    updateAccountAuthData(accountId, authData) {
      const location = this._findAccountLocation(accountId)
      if (!location) return false

      if (location.location === 'ungrouped') {
        this.ungroupedAccounts[location.index].auth_data = authData
        this.ungroupedAccounts[location.index].is_expired = false
      } else {
        location.group.accounts[location.index].auth_data = authData
        location.group.accounts[location.index].is_expired = false
      }

      return true
    },

    /**
     * 重置状态
     */
    resetState() {
      this.groups = []
      this.ungroupedAccounts = []
      this.draftBoxSelectedAccountId = null
      this.multiPanelSelectedAccountId = null
      this.loading = false
      this.initialized = false
    }
  }
})

export function useAccountStoreHook() {
  return useAccountStore(store)
}

