// app.ts
// 类型定义已移至 typings/index.d.ts
import { 
  fetchCart, 
  addToCartApi, 
  updateCartApi, 
  removeFromCartApi, 
  clearCartApi,
  syncCartApi 
} from './utils/cart-api'
import { submitOrderApi, fetchOrderList } from './utils/order-api'
import {
  fetchFavorites,
  addFavoriteApi,
  removeFavoriteApi,
  syncFavoritesApi
} from './utils/favorite-api'

App<IAppOption>({
  globalData: {
    isLoggedIn: false,
    userInfo: null,
    cartItems: [] as ICartItem[],
    orderHistory: [] as IOrder[],
    favorites: [] as IFavoriteItem[],
    targetCategoryId: undefined,
    searchKeyword: undefined,
  },

  onLaunch() {
    // 检查本地是否有登录信息
    const userInfo = wx.getStorageSync('userInfo')
    const isLoggedIn = wx.getStorageSync('isLoggedIn')
    if (userInfo && isLoggedIn) {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    }

    // 加载购物车数据
    const cartItems = wx.getStorageSync('cartItems')
    if (cartItems) {
      this.globalData.cartItems = cartItems
    }

    // 加载收藏数据
    const favorites = wx.getStorageSync('favorites')
    if (favorites) {
      this.globalData.favorites = favorites
    }

    // 加载订单历史
    const orderHistory = wx.getStorageSync('orderHistory')
    if (orderHistory && orderHistory.length > 0) {
      this.globalData.orderHistory = orderHistory
    }

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })

    // 初始化购物车角标
    this.updateCartBadge()
  },

  // 添加商品到购物车
  addToCart(item: ICartItem) {
    const existIndex = this.globalData.cartItems.findIndex(i => i.id === item.id)
    if (existIndex > -1) {
      this.globalData.cartItems[existIndex].quantity += item.quantity
    } else {
      this.globalData.cartItems.push(item)
    }
    wx.setStorageSync('cartItems', this.globalData.cartItems)
    this.updateCartBadge()
    
    // 已登录则同步到云端
    if (this.globalData.isLoggedIn) {
      addToCartApi(item.id, item.quantity, item.spec)
    }
  },

  // 更新购物车商品数量
  updateCartQuantity(productId: string, quantity: number) {
    const index = this.globalData.cartItems.findIndex(i => i.id === productId)
    if (index > -1) {
      this.globalData.cartItems[index].quantity = quantity
      wx.setStorageSync('cartItems', this.globalData.cartItems)
      this.updateCartBadge()
      
      // 已登录则同步到云端
      if (this.globalData.isLoggedIn) {
        updateCartApi(productId, quantity)
      }
    }
  },

  // 从购物车删除商品
  removeFromCart(productId: string) {
    this.globalData.cartItems = this.globalData.cartItems.filter(i => i.id !== productId)
    wx.setStorageSync('cartItems', this.globalData.cartItems)
    this.updateCartBadge()
    
    // 已登录则同步到云端
    if (this.globalData.isLoggedIn) {
      removeFromCartApi(productId)
    }
  },

  // 更新购物车角标（显示商品种类数）
  updateCartBadge() {
    const count = this.globalData.cartItems.length
    if (count > 0) {
      wx.setTabBarBadge({
        index: 2,  // 购物车是第3个tab，索引为2
        text: count > 99 ? '99+' : String(count)
      })
    } else {
      wx.removeTabBarBadge({ index: 2 })
    }
  },

  // 清空购物车
  clearCart() {
    this.globalData.cartItems = []
    wx.setStorageSync('cartItems', [])
    this.updateCartBadge()
    
    // 已登录则同步到云端
    if (this.globalData.isLoggedIn) {
      clearCartApi()
    }
  },

  // 登录后同步购物车（合并本地和云端数据）
  async syncCartAfterLogin() {
    if (!this.globalData.isLoggedIn) return
    
    const localItems = this.globalData.cartItems
    if (localItems.length > 0) {
      // 有本地数据，合并到云端
      const mergedItems = await syncCartApi(localItems)
      this.globalData.cartItems = mergedItems
      wx.setStorageSync('cartItems', mergedItems)
    } else {
      // 无本地数据，从云端获取
      const cloudItems = await fetchCart()
      this.globalData.cartItems = cloudItems
      wx.setStorageSync('cartItems', cloudItems)
    }
    this.updateCartBadge()
  },

  // 从云端刷新购物车
  async refreshCartFromCloud() {
    if (!this.globalData.isLoggedIn) return
    
    const items = await fetchCart()
    this.globalData.cartItems = items
    wx.setStorageSync('cartItems', items)
    this.updateCartBadge()
  },

  // 提交订单（将购物车转为订单）
  async submitOrder(remark?: string): Promise<IOrder | null> {
    if (this.globalData.cartItems.length === 0) return null
    
    const items = [...this.globalData.cartItems]
    
    // 已登录则提交到云端
    if (this.globalData.isLoggedIn) {
      const result = await submitOrderApi(items, remark)
      if (result.success && result.orderId) {
        const order: IOrder = {
          id: result.orderId,
          items,
          createTime: Date.now(),
          status: 'pending',
          remark
        }
        this.globalData.orderHistory.unshift(order)
        wx.setStorageSync('orderHistory', this.globalData.orderHistory)
        this.clearCart()
        return order
      }
      return null
    }
    
    // 未登录则本地存储
    const order: IOrder = {
      id: `ORD${Date.now()}`,
      items,
      createTime: Date.now(),
      status: 'pending',
      remark
    }
    this.globalData.orderHistory.unshift(order)
    wx.setStorageSync('orderHistory', this.globalData.orderHistory)
    this.clearCart()
    return order
  },

  // 从云端刷新订单列表
  async refreshOrdersFromCloud() {
    if (!this.globalData.isLoggedIn) return
    
    const orders = await fetchOrderList()
    if (orders.length > 0) {
      this.globalData.orderHistory = orders.map(o => ({
        id: o.id,
        items: o.items,
        createTime: o.createTime,
        status: o.status as IOrder['status'],
        remark: o.remark
      }))
      wx.setStorageSync('orderHistory', this.globalData.orderHistory)
    }
  },

  // 快捷复购 - 将历史订单商品加入购物车
  reorder(orderId: string) {
    const order = this.globalData.orderHistory.find(o => o.id === orderId)
    if (!order) return false
    
    order.items.forEach(item => {
      this.addToCart({ ...item })
    })
    return true
  },

  // 添加收藏
  addFavorite(item: Omit<IFavoriteItem, 'addTime'>) {
    const exists = this.globalData.favorites.some(f => f.id === item.id)
    if (exists) return false
    
    this.globalData.favorites.unshift({
      ...item,
      addTime: Date.now()
    })
    wx.setStorageSync('favorites', this.globalData.favorites)
    
    // 已登录则同步到云端
    if (this.globalData.isLoggedIn) {
      addFavoriteApi(item.id)
    }
    return true
  },

  // 取消收藏
  removeFavorite(id: string) {
    this.globalData.favorites = this.globalData.favorites.filter(f => f.id !== id)
    wx.setStorageSync('favorites', this.globalData.favorites)
    
    // 已登录则同步到云端
    if (this.globalData.isLoggedIn) {
      removeFavoriteApi(id)
    }
  },

  // 检查是否已收藏
  isFavorite(id: string) {
    return this.globalData.favorites.some(f => f.id === id)
  },

  // 登录后同步收藏（合并本地和云端数据）
  async syncFavoritesAfterLogin() {
    if (!this.globalData.isLoggedIn) return
    
    const localItems = this.globalData.favorites
    if (localItems.length > 0) {
      // 有本地数据，合并到云端
      const mergedItems = await syncFavoritesApi(localItems.map(f => ({ id: f.id })))
      this.globalData.favorites = mergedItems
      wx.setStorageSync('favorites', mergedItems)
    } else {
      // 无本地数据，从云端获取
      const cloudItems = await fetchFavorites()
      this.globalData.favorites = cloudItems
      wx.setStorageSync('favorites', cloudItems)
    }
  },

  // 从云端刷新收藏列表
  async refreshFavoritesFromCloud() {
    if (!this.globalData.isLoggedIn) return
    
    const items = await fetchFavorites()
    this.globalData.favorites = items
    wx.setStorageSync('favorites', items)
  },
})