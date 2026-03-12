// favorites.ts
// 我的收藏页面
import { showToast } from '/utils/toast'

const favApp = getApp<IAppOption>()

Component({
  data: {
    favoriteList: [] as IFavoriteItem[],
    loading: false
  },

  lifetimes: {
    attached() {
      this.loadFavorites()
    }
  },

  pageLifetimes: {
    show() {
      this.loadFavorites()
    }
  },

  methods: {
    /**
     * 加载收藏列表
     */
    async loadFavorites() {
      // 已登录则从云端刷新
      if (favApp.globalData.isLoggedIn) {
        this.setData({ loading: true })
        await favApp.refreshFavoritesFromCloud()
        this.setData({ loading: false })
      }
      
      const favorites = favApp.globalData.favorites || []
      this.setData({ favoriteList: favorites })
    },

    /**
     * 跳转商品详情
     */
    goToDetail(e: WechatMiniprogram.TouchEvent) {
      const { item } = e.currentTarget.dataset
      const params = `id=${item.id}&name=${encodeURIComponent(item.name)}&image=${encodeURIComponent(item.image)}`
      wx.navigateTo({ url: `/subpackages/user/product-detail/product-detail?${params}` })
    },

    /**
     * 加入购物车
     */
    addToCart(e: WechatMiniprogram.TouchEvent) {
      const { item } = e.currentTarget.dataset
      favApp.addToCart({
        id: item.id,
        name: item.name,
        image: item.image,
        quantity: 1
      })
      showToast({ title: '已加入购物车' })
    },

    /**
     * 取消收藏
     */
    removeFavorite(e: WechatMiniprogram.TouchEvent) {
      const { id } = e.currentTarget.dataset
      wx.showModal({
        title: '提示',
        content: '确定取消收藏该商品吗？',
        success: (res) => {
          if (res.confirm) {
            favApp.removeFavorite(id)
            this.loadFavorites()
            showToast({ title: '已取消收藏', type: 'none' })
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
