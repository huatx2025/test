import axios from 'axios'
import { message } from 'ant-design-vue'

// Token 存储 key
const TOKEN_KEY = 'easydraft_token'

// 获取 Token
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

// 设置 Token
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

// 移除 Token
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 10000,
  withCredentials: false  // 不携带凭证，使用Token认证
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加 Token
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // 处理错误
    if (error.response) {
      const { status, data, config } = error.response
      
      // 判断是否为认证相关接口（登录/注册），这些接口由调用方处理错误提示
      const isAuthRequest = config.url.includes('/auth/login') || config.url.includes('/auth/register')
      
      if (status === 401) {
        // Token 过期或无效，清除登录状态
        removeToken()
        
        // 如果是refresh接口或登录接口返回401，不显示错误提示
        const isRefreshRequest = config.url.includes('/auth/refresh')
        if (!isRefreshRequest && !isAuthRequest) {
          message.error('登录已过期，请重新登录')
          // 跳转到登录页
          window.location.href = '/#/login'
        }
      } else if (status === 400 || status === 403) {
        // 登录/注册接口的错误由调用方处理，避免重复提示
        if (!isAuthRequest) {
          message.error(data.detail || '请求失败')
        }
      } else {
        // 登录/注册接口的错误由调用方处理
        if (!isAuthRequest) {
          message.error('服务器错误，请稍后重试')
        }
      }
    } else {
      // 网络错误不区分接口类型，统一提示
      message.error('网络连接失败')
    }
    return Promise.reject(error)
  }
)

export default request

// 导出常用的请求方法
export const get = (url, params) => request.get(url, { params })
export const post = (url, data) => request.post(url, data)
export const put = (url, data) => request.put(url, data)
export const del = (url) => request.delete(url)

// 导出 API
export * from './auth'
export * from './account'