import { defineStore } from 'pinia'
import { store } from '../index'
import { login, register, getCurrentUser, logout, refreshToken } from '@/api/auth'
import { setToken, removeToken, getToken } from '@/api/index'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() || '',
    userInfo: null,
    isLoggedIn: !!getToken()
  }),

  getters: {
    // 获取用户信息
    getUser: (state) => state.userInfo,
    // 是否已登录
    getIsLoggedIn: (state) => state.isLoggedIn,
    // 获取用户名
    getUsername: (state) => state.userInfo?.username || ''
  },

  actions: {
    /**
     * 用户登录
     * @param {Object} loginData - 登录信息
     */
    async loginAction(loginData) {
      try {
        const res = await login(loginData)
        if (res.code === 0) {
          const { access_token, user } = res.data
          // 保存 token
          this.token = access_token
          setToken(access_token)
          // 保存用户信息
          this.userInfo = user
          this.isLoggedIn = true
          return { success: true, message: '登录成功' }
        }
        return { success: false, message: res.message || '登录失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '登录失败'
        return { success: false, message }
      }
    },

    /**
     * 用户注册
     * @param {Object} registerData - 注册信息
     */
    async registerAction(registerData) {
      try {
        const res = await register(registerData)
        if (res.code === 0) {
          return { success: true, message: '注册成功' }
        }
        return { success: false, message: res.message || '注册失败' }
      } catch (error) {
        const message = error.response?.data?.detail || '注册失败'
        return { success: false, message }
      }
    },

    /**
     * 获取当前用户信息
     */
    async fetchUserInfo() {
      try {
        const res = await getCurrentUser()
        if (res.code === 0) {
          this.userInfo = res.data
          this.isLoggedIn = true
          return { success: true }
        }
        return { success: false }
      } catch (error) {
        this.resetUser()
        return { success: false }
      }
    },

    /**
     * 用户登出
     */
    async logoutAction() {
      try {
        await logout()
      } catch (error) {
        // 即使请求失败也要清除本地状态
        console.error('登出请求失败:', error)
      } finally {
        this.resetUser()
      }
    },

    /**
     * 刷新Token（每次打开软件时调用）
     */
    async refreshTokenAction() {
      // 如果没有token，不需要刷新
      if (!getToken()) {
        return { success: false }
      }
      
      try {
        const res = await refreshToken()
        if (res.code === 0) {
          const { access_token, user } = res.data
          // 更新 token
          this.token = access_token
          setToken(access_token)
          // 更新用户信息
          this.userInfo = user
          this.isLoggedIn = true
          return { success: true }
        }
        // 刷新失败，清除登录状态
        this.resetUser()
        return { success: false }
      } catch (error) {
        // Token 无效或过期，清除登录状态（不显示错误提示，让路由守卫处理跳转）
        console.warn('Token刷新失败，需要重新登录:', error.message)
        this.resetUser()
        return { success: false }
      }
    },

    /**
     * 重置用户状态
     */
    resetUser() {
      this.token = ''
      this.userInfo = null
      this.isLoggedIn = false
      removeToken()
    }
  }
})

export function useUserStoreHook() {
  return useUserStore(store)
}
