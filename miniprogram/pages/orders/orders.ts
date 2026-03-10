// orders.ts
import { showToast } from '../../utils/toast'
import { formatTime } from '../../utils/util'

const app = getApp<IAppOption>()

// 格式化后的订单类型（createTime 为字符串）
interface FormattedOrder extends Omit<IOrder, 'createTime'> {
  createTime: string
}

Component({
  data: {
    orderList: [] as FormattedOrder[],
    loading: false,
    statusMap: {
      pending: '待确认',
      confirmed: '已确认',
      shipped: '配送中',
      completed: '已完成'
    } as Record<string, string>
  },

  lifetimes: {
    attached() {
      this.loadOrders()
    }
  },

  pageLifetimes: {
    show() {
      this.loadOrders()
    }
  },

  methods: {
    // 加载订单列表
    async loadOrders() {
      this.setData({ loading: true })
      
      // 已登录则从云端获取
      if (app.globalData.isLoggedIn) {
        await app.refreshOrdersFromCloud()
      }
      
      const orderHistory = app.globalData.orderHistory || []
      // 格式化订单时间
      const formattedOrders: FormattedOrder[] = orderHistory.map(order => ({
        ...order,
        createTime: formatTime(new Date(order.createTime))
      }))
      this.setData({ orderList: formattedOrders, loading: false })
    },

    // 快捷复购
    handleReorder(e: WechatMiniprogram.TouchEvent) {
      const targetOrderId = e.currentTarget.dataset.id as string
      const success = app.reorder(targetOrderId)
      
      if (success) {
        wx.showModal({
          title: '复购成功',
          content: '商品已加入购物车，是否立即查看？',
          confirmText: '去购物车',
          cancelText: '继续浏览',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({ url: '/pages/cart/cart' })
            }
          }
        })
      } else {
        showToast({ title: '复购失败', type: 'error' })
      }
    },

    // 跳转订单详情
    goToDetail(e: WechatMiniprogram.TouchEvent) {
      const orderId = e.currentTarget.dataset.id as string
      wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` })
    },

    // 返回上一页
    goBack() {
      wx.navigateBack()
    }
  }
})

export {}