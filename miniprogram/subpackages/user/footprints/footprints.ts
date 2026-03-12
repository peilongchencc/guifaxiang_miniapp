// footprints.ts
// 我的足迹页面
import { showToast } from '../../../utils/toast'

import { fetchFootprints, removeFootprintApi, clearFootprintsApi } from '../../../utils/footprint-api'

const footprintApp = getApp<IAppOption>()

// 足迹项类型（带格式化时间）
interface FootprintDisplayItem {
  id: string
  name: string
  image: string
  viewTime: number
  viewTimeText: string
}

/**
 * 格式化时间显示
 */
function formatViewTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  
  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`
  } else {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

Component({
  data: {
    footprintList: [] as FootprintDisplayItem[],
    loading: false,
    total: 0,
    offset: 0,
    limit: 20
  },

  lifetimes: {
    attached() {
      this.loadFootprints()
    }
  },

  pageLifetimes: {
    show() {
      this.loadFootprints()
    }
  },

  methods: {
    /**
     * 加载足迹列表
     */
    async loadFootprints() {
      if (!footprintApp.globalData.isLoggedIn) {
        showToast({ title: '请先登录', type: 'none' })
        return
      }

      this.setData({ loading: true, offset: 0 })
      
      const { items, total } = await fetchFootprints(this.data.limit, 0)
      
      const formattedItems: FootprintDisplayItem[] = items.map(item => ({
        ...item,
        viewTimeText: formatViewTime(item.viewTime)
      }))
      
      this.setData({
        footprintList: formattedItems,
        total,
        offset: items.length,
        loading: false
      })
    },

    /**
     * 加载更多
     */
    async loadMore() {
      if (this.data.loading || this.data.footprintList.length >= this.data.total) {
        return
      }

      this.setData({ loading: true })
      
      const { items } = await fetchFootprints(this.data.limit, this.data.offset)
      
      const formattedItems: FootprintDisplayItem[] = items.map(item => ({
        ...item,
        viewTimeText: formatViewTime(item.viewTime)
      }))
      
      this.setData({
        footprintList: [...this.data.footprintList, ...formattedItems],
        offset: this.data.offset + items.length,
        loading: false
      })
    },

    /**
     * 跳转商品详情
     */
    goToDetail(e: WechatMiniprogram.TouchEvent) {
      const { item } = e.currentTarget.dataset
      wx.navigateTo({ 
        url: `/subpackages/user/product-detail/product-detail?id=${item.id}` 
      })
    },

    /**
     * 加入购物车
     */
    addToCart(e: WechatMiniprogram.TouchEvent) {
      const { item } = e.currentTarget.dataset
      footprintApp.addToCart({
        id: item.id,
        name: item.name,
        image: item.image,
        quantity: 1
      })
      showToast({ title: '已加入购物车' })
    },

    /**
     * 删除单条足迹
     */
    removeFootprint(e: WechatMiniprogram.TouchEvent) {
      const { id } = e.currentTarget.dataset
      wx.showModal({
        title: '提示',
        content: '确定删除该浏览记录吗？',
        success: async (res) => {
          if (res.confirm) {
            const success = await removeFootprintApi(id)
            if (success) {
              // 从列表中移除
              const newList = this.data.footprintList.filter(item => item.id !== id)
              this.setData({
                footprintList: newList,
                total: this.data.total - 1
              })
              showToast({ title: '已删除', type: 'none' })
            }
          }
        }
      })
    },

    /**
     * 清空所有足迹
     */
    clearAll() {
      wx.showModal({
        title: '提示',
        content: '确定清空所有浏览记录吗？',
        success: async (res) => {
          if (res.confirm) {
            const success = await clearFootprintsApi()
            if (success) {
              this.setData({
                footprintList: [],
                total: 0,
                offset: 0
              })
              showToast({ title: '已清空', type: 'none' })
            }
          }
        }
      })
    },

    /**
     * 去逛逛
     */
    goShopping() {
      wx.switchTab({ url: '/pages/home/home' })
    }
  }
})
