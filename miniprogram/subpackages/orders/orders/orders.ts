// orders.ts
import { showToast } from '../../../utils/toast'
import { formatTime } from '../../../utils/util'

const app = getApp<IAppOption>()

// 格式化后的订单类型（createTime 为字符串）
interface FormattedOrder extends Omit<IOrder, 'createTime'> {
  createTime: string
}

type StatusKey = 'all' | 'pending' | 'confirmed' | 'shipped' | 'completed'

interface OrdersInstance {
  _loadedByOnLoad: boolean
}

const STATUS_MAP: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  shipped: '配送中',
  completed: '已完成',
}

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'shipped', label: '配送中' },
  { key: 'completed', label: '已完成' },
]

Component<OrdersInstance>({
  data: {
    orderList: [] as FormattedOrder[],
    filteredList: [] as FormattedOrder[],
    loading: false,
    activeTab: 'all' as StatusKey,
    tabs: TABS,
    statusMap: STATUS_MAP,
  },

  lifetimes: {
    attached() {
      this._loadedByOnLoad = false
    }
  },

  pageLifetimes: {
    show() {
      // onLoad 已触发加载时跳过首次 show，之后（如从详情页返回）正常刷新
      if (this._loadedByOnLoad) {
        this._loadedByOnLoad = false
        return
      }
      this.loadOrders()
    }
  },

  methods: {
    /**
     * 接收页面参数（来自"我的"页快捷入口的 status 过滤）
     */
    onLoad(options: Record<string, string>) {
      const status = (options.status || 'all') as StatusKey
      const validKeys: StatusKey[] = ['all', 'pending', 'confirmed', 'shipped', 'completed']
      const activeTab = validKeys.includes(status) ? status : 'all'
      this.setData({ activeTab })
      this._loadedByOnLoad = true
      this.loadOrders()
    },

    // 加载订单列表
    async loadOrders() {
      this.setData({ loading: true })

      if (app.globalData.isLoggedIn) {
        await app.refreshOrdersFromCloud()
      }

      const orderHistory = app.globalData.orderHistory || []
      const formattedOrders: FormattedOrder[] = orderHistory.map(order => ({
        ...order,
        createTime: formatTime(new Date(order.createTime))
      }))

      this.setData({ orderList: formattedOrders, loading: false })
      this.applyFilter()
    },

    /**
     * 根据当前激活的 Tab 过滤订单列表
     */
    applyFilter() {
      const { orderList, activeTab } = this.data
      const filteredList = activeTab === 'all'
        ? orderList
        : orderList.filter(o => o.status === activeTab)
      this.setData({ filteredList })
    },

    // 切换状态 Tab
    onTabChange(e: WechatMiniprogram.TouchEvent) {
      const key = e.currentTarget.dataset.key as StatusKey
      this.setData({ activeTab: key })
      this.applyFilter()
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
      wx.navigateTo({ url: `/subpackages/orders/order-detail/order-detail?id=${orderId}` })
    },

    // 返回上一页
    goBack() {
      wx.navigateBack()
    }
  }
})

export {}