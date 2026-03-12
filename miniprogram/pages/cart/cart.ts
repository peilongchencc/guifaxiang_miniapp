// cart.ts
// 购物车页面 - 展示已选商品，支持修改数量、删除、提交订单
import { showToast } from '../../utils/toast'

const cartApp = getApp<IAppOption>()

interface CartItem {
  id: string
  name: string
  image: string
  quantity: number
  spec?: string
  selected?: boolean
  offsetX?: number  // 左滑偏移量 (rpx)
  swiped?: boolean  // 是否已展开删除按钮
}

// 滑动相关常量
const DELETE_BTN_WIDTH = 160  // 删除按钮宽度 (rpx)
const SWIPE_THRESHOLD = 60   // 触发阈值 (rpx)

// 模块级滑动状态变量（避免在 Component data 中频繁 setData）
let startX = 0
let startOffsetX = 0
let touchIndex = -1

Component({
  data: {
    cartItems: [] as CartItem[],
    hasItems: false,
    emptyImage: '/images/illustrations/cart-empty.svg',
    selectAll: true,
    totalCount: 0,
    remark: '',
    isSubmitting: false  // 提交中状态，防止显示空购物车
  },

  lifetimes: {
    attached() {
      this.loadCartItems()
    }
  },

  pageLifetimes: {
    show() {
      this.loadCartItems()
    }
  },

  methods: {
    // 加载购物车数据
    loadCartItems() {
      const items = cartApp.globalData.cartItems || []
      const cartItems = items.map(item => ({
        ...item,
        selected: true,
        offsetX: 0,
        swiped: false
      }))
      const totalCount = cartItems.reduce((sum, item) => 
        item.selected ? sum + item.quantity : sum, 0
      )
      
      this.setData({
        cartItems,
        hasItems: cartItems.length > 0,
        selectAll: cartItems.length > 0 && cartItems.every(item => item.selected),
        totalCount
      })
    },

    // 切换单个商品选中状态
    toggleSelect(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number
      const key = `cartItems[${index}].selected`
      const newValue = !this.data.cartItems[index].selected
      
      this.setData({ [key]: newValue })
      this.updateSelectAll()
      this.updateTotalCount()
    },

    // 切换全选
    toggleSelectAll() {
      const newSelectAll = !this.data.selectAll
      const cartItems = this.data.cartItems.map(item => ({
        ...item,
        selected: newSelectAll
      }))
      
      this.setData({
        selectAll: newSelectAll,
        cartItems
      })
      this.updateTotalCount()
    },

    // 更新全选状态
    updateSelectAll() {
      const selectAll = this.data.cartItems.every(item => item.selected)
      this.setData({ selectAll })
    },

    // 更新总数量
    updateTotalCount() {
      const totalCount = this.data.cartItems.reduce((sum, item) => 
        item.selected ? sum + item.quantity : sum, 0
      )
      this.setData({ totalCount })
    },

    // 减少数量
    decreaseQuantity(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number
      const item = this.data.cartItems[index]
      
      if (item.quantity > 1) {
        const newQuantity = item.quantity - 1
        const key = `cartItems[${index}].quantity`
        this.setData({ [key]: newQuantity })
        this.updateTotalCount()
        // 使用全局方法同步（自动处理云端）
        cartApp.updateCartQuantity(item.id, newQuantity)
      }
    },

    // 增加数量
    increaseQuantity(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number
      const item = this.data.cartItems[index]
      
      if (item.quantity < 999) {
        const newQuantity = item.quantity + 1
        const key = `cartItems[${index}].quantity`
        this.setData({ [key]: newQuantity })
        this.updateTotalCount()
        // 使用全局方法同步（自动处理云端）
        cartApp.updateCartQuantity(item.id, newQuantity)
      }
    },

    // 输入数量（输入时不强制最小值，允许用户清空后重新输入）
    onQuantityInput(e: WechatMiniprogram.Input) {
      const index = e.currentTarget.dataset.index as number
      const inputValue = e.detail.value
      
      // 允许空值，方便用户清空后输入新数字
      if (inputValue === '') {
        return
      }
      
      let value = parseInt(inputValue)
      if (isNaN(value) || value < 0) {
        return
      }
      if (value > 999) value = 999
      
      const key = `cartItems[${index}].quantity`
      this.setData({ [key]: value })
      this.updateTotalCount()
    },

    // 输入框失焦时校验最小值并同步
    onQuantityBlur(e: WechatMiniprogram.Input) {
      const index = e.currentTarget.dataset.index as number
      const item = this.data.cartItems[index]
      const inputValue = e.detail.value
      let value = parseInt(inputValue)
      
      // 如果为空或小于1，恢复为1
      if (isNaN(value) || value < 1) {
        value = 1
      }
      if (value > 999) value = 999
      
      const key = `cartItems[${index}].quantity`
      this.setData({ [key]: value })
      this.updateTotalCount()
      // 使用全局方法同步（自动处理云端）
      cartApp.updateCartQuantity(item.id, value)
    },

    // 触摸开始
    onTouchStart(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number
      const item = this.data.cartItems[index]
      
      startX = e.touches[0].clientX
      startOffsetX = item.offsetX || 0
      touchIndex = index
      
      // 收起其他已展开的项
      this.resetOtherItems(index)
    },

    // 触摸移动
    onTouchMove(e: WechatMiniprogram.TouchEvent) {
      if (touchIndex < 0) return
      
      const currentX = e.touches[0].clientX
      const diffPx = currentX - startX
      // px 转 rpx (假设屏幕宽度 750rpx)
      const diffRpx = diffPx * (750 / wx.getSystemInfoSync().windowWidth)
      
      let offsetX = startOffsetX + diffRpx
      // 限制滑动范围：最多左滑删除按钮宽度，不能右滑超过0
      offsetX = Math.max(-DELETE_BTN_WIDTH, Math.min(0, offsetX))
      
      this.setData({
        [`cartItems[${touchIndex}].offsetX`]: offsetX
      })
    },

    // 触摸结束
    onTouchEnd() {
      if (touchIndex < 0) return
      
      const item = this.data.cartItems[touchIndex]
      const offsetX = item.offsetX || 0
      
      // 判断是展开还是收起
      const shouldOpen = offsetX < -SWIPE_THRESHOLD
      const targetX = shouldOpen ? -DELETE_BTN_WIDTH : 0
      
      this.setData({
        [`cartItems[${touchIndex}].offsetX`]: targetX,
        [`cartItems[${touchIndex}].swiped`]: shouldOpen
      })
      
      touchIndex = -1
    },

    // 收起其他已展开的项
    resetOtherItems(currentIdx: number) {
      const updates: Record<string, number | boolean> = {}
      this.data.cartItems.forEach((item, idx) => {
        if (idx !== currentIdx && item.offsetX !== 0) {
          updates[`cartItems[${idx}].offsetX`] = 0
          updates[`cartItems[${idx}].swiped`] = false
        }
      })
      if (Object.keys(updates).length > 0) {
        this.setData(updates)
      }
    },

    // 收起所有已展开的删除按钮
    resetAllSwipedItems() {
      const updates: Record<string, number | boolean> = {}
      this.data.cartItems.forEach((item, idx) => {
        if (item.offsetX !== 0) {
          updates[`cartItems[${idx}].offsetX`] = 0
          updates[`cartItems[${idx}].swiped`] = false
        }
      })
      if (Object.keys(updates).length > 0) {
        this.setData(updates)
      }
    },

    // 删除商品
    deleteItem(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number
      const item = this.data.cartItems[index]
      
      wx.showModal({
        title: '确认删除',
        content: `确定要删除"${item.name}"吗？`,
        success: (res) => {
          if (res.confirm) {
            const cartItems = [...this.data.cartItems]
            cartItems.splice(index, 1)
            this.setData({
              cartItems,
              hasItems: cartItems.length > 0
            })
            this.updateSelectAll()
            this.updateTotalCount()
            // 使用全局方法删除（自动处理云端）
            cartApp.removeFromCart(item.id)
          } else {
            // 用户取消删除，收起滑动按钮
            this.setData({
              [`cartItems[${index}].offsetX`]: 0,
              [`cartItems[${index}].swiped`]: false
            })
          }
        }
      })
    },

    // 输入备注
    onRemarkInput(e: WechatMiniprogram.Input) {
      this.setData({ remark: e.detail.value })
    },

    // 提交订单
    submitOrder() {
      if (!cartApp.globalData.isLoggedIn) {
        wx.showModal({
          title: '请先登录',
          content: '提交订单需要登录账号，登录后订单将同步至您的账户',
          confirmText: '去登录',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({ url: '/pages/mine/mine' })
            }
          }
        })
        return
      }

      const selectedItems = this.data.cartItems.filter(item => item.selected)
      
      if (selectedItems.length === 0) {
        showToast({ title: '请选择商品', type: 'none' })
        return
      }

      wx.showModal({
        title: '确认提交订单',
        content: '提交后我们会尽快联系您确认订单详情和价格',
        confirmText: '确认提交',
        success: async (res) => {
          if (res.confirm) {
            // 设置提交中状态，防止显示空购物车
            this.setData({ isSubmitting: true })
            
            // 只提交选中的商品
            const itemsToSubmit = selectedItems.map(({ selected, offsetX, swiped, ...rest }) => rest)
            
            // 临时替换全局购物车为选中商品
            cartApp.globalData.cartItems = itemsToSubmit
            
            const order = await cartApp.submitOrder(this.data.remark)
            
            // 恢复未选中的商品到购物车
            const unselectedItems = this.data.cartItems
              .filter(item => !item.selected)
              .map(({ selected, offsetX, swiped, ...rest }) => rest)
            cartApp.globalData.cartItems = unselectedItems
            wx.setStorageSync('cartItems', unselectedItems)
            
            if (order) {
              // 先跳转，再更新购物车数据（在 pageLifetimes.show 中会自动刷新）
              wx.navigateTo({
                url: `/subpackages/orders/order-detail/order-detail?id=${order.id}&fromSubmit=1`,
                complete: () => {
                  // 跳转完成后重置状态
                  this.setData({ isSubmitting: false })
                }
              })
            } else {
              this.setData({ isSubmitting: false })
              showToast({ title: '提交失败', type: 'error' })
            }
          }
        }
      })
    },

    // 去逛逛
    goToCategory() {
      wx.switchTab({ url: '/pages/category/category' })
    }
  }
})
