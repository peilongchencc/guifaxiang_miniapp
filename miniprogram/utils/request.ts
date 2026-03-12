/**
 * HTTP 请求封装模块
 * 统一处理 API 请求、Token 管理、错误处理、自动刷新 Token
 */

// API 基础地址
const BASE_URL = 'https://api.guifaxiang.vip'

// 通用响应格式
interface ApiResponse<T = unknown> {
  code: number
  message: string
  request_id: string
  data: T
}

// 请求配置
interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  header?: Record<string, string>
  needToken?: boolean
}

// Token 刷新状态
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

/**
 * 获取存储的 Access Token
 */
export function getToken(): string {
  return wx.getStorageSync('access_token') || ''
}

/**
 * 保存 Access Token
 */
export function setToken(token: string): void {
  wx.setStorageSync('access_token', token)
}

/**
 * 获取 Refresh Token
 */
export function getRefreshToken(): string {
  return wx.getStorageSync('refresh_token') || ''
}

/**
 * 保存 Refresh Token
 */
export function setRefreshToken(token: string): void {
  wx.setStorageSync('refresh_token', token)
}

/**
 * 清除所有 Token
 */
export function clearToken(): void {
  wx.removeStorageSync('access_token')
  wx.removeStorageSync('refresh_token')
}

/**
 * 清除所有登录状态（Storage + globalData），Token 失效时统一调用
 */
function clearLoginState(): void {
  clearToken()
  wx.removeStorageSync('isLoggedIn')
  wx.removeStorageSync('userInfo')
  const appInstance = getApp<IAppOption>()
  if (appInstance) {
    appInstance.globalData.isLoggedIn = false
    appInstance.globalData.userInfo = null
  }
}

/**
 * 订阅 Token 刷新完成事件
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback)
}

/**
 * 通知所有订阅者 Token 已刷新
 */
function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

/**
 * 刷新 Token
 */
async function refreshToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) {
    return null
  }

  return new Promise((resolve) => {
    wx.request({
      url: `${BASE_URL}/auth/miniapp/refresh`,
      method: 'POST',
      data: { refresh_token: refresh },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        const response = res.data as ApiResponse<{
          access_token: string
          refresh_token: string
        }>
        
        if (response.code === 200 && response.data?.access_token) {
          setToken(response.data.access_token)
          setRefreshToken(response.data.refresh_token)
          resolve(response.data.access_token)
        } else {
          clearLoginState()
          resolve(null)
        }
      },
      fail: () => {
        clearLoginState()
        resolve(null)
      }
    })
  })
}

/**
 * 处理 401 错误，尝试刷新 Token
 */
async function handle401<T>(options: RequestOptions): Promise<ApiResponse<T> | null> {
  if (!getRefreshToken()) {
    return null
  }

  if (isRefreshing) {
    // 正在刷新中，等待刷新完成后重试
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        if (newToken) {
          options.header = options.header || {}
          options.header['Authorization'] = `Bearer ${newToken}`
          request<T>(options).then(resolve).catch(() => resolve(null as unknown as ApiResponse<T>))
        } else {
          resolve(null as unknown as ApiResponse<T>)
        }
      })
    })
  }

  isRefreshing = true
  const newToken = await refreshToken()
  isRefreshing = false

  if (newToken) {
    onTokenRefreshed(newToken)
    // 使用新 Token 重试请求
    options.header = options.header || {}
    options.header['Authorization'] = `Bearer ${newToken}`
    return request<T>(options)
  }

  onTokenRefreshed('')
  return null
}


/**
 * 统一请求方法
 */
export function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data, header = {}, needToken = false } = options

  // 添加 Token
  if (needToken) {
    const token = getToken()
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
  }

  // 设置 Content-Type
  if (!header['Content-Type']) {
    header['Content-Type'] = 'application/json'
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
      success: async (res) => {
        const response = res.data as ApiResponse<T>
        
        if (response.code === 200) {
          resolve(response)
        } else if (response.code === 401 && needToken) {
          // Token 过期，尝试刷新
          const retryResult = await handle401<T>(options)
          if (retryResult) {
            resolve(retryResult)
          } else {
            clearLoginState()
            reject(new Error(response.message || '登录已过期，请重新登录'))
          }
        } else {
          reject(new Error(response.message || '请求失败'))
        }
      },
      fail: (err) => {
        console.error('请求失败:', err)
        reject(new Error('网络请求失败'))
      }
    })
  })
}

/**
 * GET 请求
 */
export function get<T = unknown>(url: string, needToken = false): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'GET', needToken })
}

/**
 * 带参数的 GET 请求（自动处理 URL 编码）
 */
export function getWithParams<T = unknown>(
  url: string,
  params?: Record<string, string | number | boolean>,
  needToken = false
): Promise<ApiResponse<T>> {
  let fullUrl = url
  if (params && Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')
    fullUrl = `${url}?${queryString}`
  }
  return request<T>({ url: fullUrl, method: 'GET', needToken })
}

/**
 * POST 请求
 */
export function post<T = unknown>(
  url: string, 
  data?: Record<string, unknown>, 
  needToken = false
): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'POST', data, needToken })
}

/**
 * PUT 请求
 */
export function put<T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  needToken = false
): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'PUT', data, needToken })
}

/**
 * DELETE 请求
 */
export function del<T = unknown>(url: string, needToken = false): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'DELETE', needToken })
}
