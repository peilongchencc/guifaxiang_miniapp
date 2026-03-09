// home.ts
// 首页 - 包含搜索、轮播、分类、推荐商品、服务特色、联系方式
import { get } from '../../utils/request'

/** 热销商品类型 */
interface HotProduct {
  id: string
  name: string
  image: string
  sales?: number
}

Component({
  data: {
    // 用户登录状态
    isLoggedIn: false,
    
    // 搜索关键词
    searchKeyword: '',
    
    // 轮播图数据（link 为点击后跳转路径，linkType: 'tab' 用 switchTab，'navigate' 用 navigateTo）
    banners: [
      { id: 1, image: '/images/banner-1.png', link: '/pages/about/about', linkType: 'navigate' },
      { id: 2, image: '/images/banner-2.png', link: '/pages/category/category', linkType: 'tab' },
      { id: 3, image: '/images/banner-3.png', link: '/pages/category/category', linkType: 'tab' }
    ],
    currentBanner: 0,
    
    // 商品分类入口
    categories: [
      { id: 1, name: '寿衣', emoji: '👔' },
      { id: 2, name: '骨灰盒', emoji: '🏺' },
      { id: 3, name: '花圈', emoji: '💐' },
      { id: 4, name: '祭祀用品', emoji: '🕯️' },
      { id: 5, name: '丧葬服务', emoji: '🙏' },
      { id: 6, name: '纸扎用品', emoji: '📜' },
      { id: 7, name: '香烛', emoji: '🪔' },
      { id: 8, name: '更多', emoji: '📋' }
    ],
    
    // 热销/推荐商品
    hotProducts: [
      { id: '1', name: '高档真丝寿衣七件套', image: '/images/default-product.png', sales: 328 },
      { id: '2', name: '天然玉石骨灰盒', image: '/images/default-product.png', sales: 256 },
      { id: '3', name: '鲜花花圈精选款', image: '/images/default-product.png', sales: 512 },
      { id: '4', name: '祭祀用品套装', image: '/images/default-product.png', sales: 892 }
    ] as HotProduct[],
    
    // 服务特色
    services: [
      { id: 1, icon: '🕐', title: '24小时服务', desc: '全天候响应' },
      { id: 2, icon: '🚚', title: '免费配送', desc: '全城免运费' },
      { id: 3, icon: '👨‍💼', title: '专业指导', desc: '一对一咨询' },
      { id: 4, icon: '✅', title: '品质保证', desc: '正品保障' }
    ],
    
    // 联系信息（修改电话号码在此处）
    contact: {
      phone: '13895617366',  // 服务热线号码，点击后会调用 wx.makePhoneCall
      wechat: 'peilongchencc',  // 微信号
      wechatQrcode: 'https://funeral-supplies.oss-cn-beijing.aliyuncs.com/wechat/wechat-qrcode.png',  // 微信二维码图片
      workTime: '24小时服务',
      address: '宁夏回族自治区银川市兴庆区立达国际建材城39号楼2层203室'
    },
    
    // 微信二维码弹窗显示状态
    showWechatModal: false
  },

  lifetimes: {
    attached() {
      this.checkLoginStatus()
      this.loadHotProducts()
    }
  },

  pageLifetimes: {
    show() {
      // 每次显示页面时检查登录状态（可能从登录页返回）
      this.checkLoginStatus()
    }
  },

  methods: {
    /**
     * 检查用户登录状态
     */
    checkLoginStatus() {
      const isLoggedIn = wx.getStorageSync('isLoggedIn') || false
      this.setData({ isLoggedIn })
    },

    /**
     * 加载热销商品
     * 从后端获取热销/推荐商品列表
     */
    async loadHotProducts() {
      try {
        const res = await get<{ products: HotProduct[] }>('/product/hot')
        if (res.code === 200 && res.data?.products) {
          this.setData({ hotProducts: res.data.products })
        }
      } catch (err) {
        console.error('加载热销商品失败:', err)
        // 失败时使用默认数据
        this.setData({
          hotProducts: [
            { id: '1', name: '高档真丝寿衣七件套', image: '/images/default-product.png', sales: 328 },
            { id: '2', name: '天然玉石骨灰盒', image: '/images/default-product.png', sales: 256 },
            { id: '3', name: '鲜花花圈精选款', image: '/images/default-product.png', sales: 512 },
            { id: '4', name: '祭祀用品套装', image: '/images/default-product.png', sales: 892 }
          ]
        })
      }
    },

    // 搜索输入
    onSearchInput(e: WechatMiniprogram.Input) {
      this.setData({ searchKeyword: e.detail.value })
    },

    // 执行搜索 - 跳转到分类页进行搜索
    onSearch() {
      const keyword = this.data.searchKeyword.trim()
      if (!keyword) {
        wx.showToast({ title: '请输入搜索内容', icon: 'none' })
        return
      }
      // 设置全局搜索关键词，跳转到分类页
      const app = getApp<IAppOption>()
      app.globalData.searchKeyword = keyword
      wx.switchTab({ url: '/pages/category/category' })
    },

    // 轮播图切换
    onBannerChange(e: WechatMiniprogram.SwiperChange) {
      this.setData({ currentBanner: e.detail.current })
    },

    /**
     * 点击轮播图
     *
     * 根据 banner 配置的 linkType 跳转到对应页面：
     * - tab 页面使用 switchTab
     * - 普通页面使用 navigateTo
     */
    onBannerTap(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id as number
      const banner = this.data.banners.find(b => b.id === id)
      if (!banner?.link) return

      if (banner.linkType === 'tab') {
        wx.switchTab({ url: banner.link })
      } else {
        wx.navigateTo({ url: banner.link })
      }
    },

    // 点击分类
    onCategoryTap() {
      wx.switchTab({ url: '/pages/category/category' })
    },

    // 查看更多热销商品
    onViewMoreHot() {
      // 设置全局状态，让分类页知道要跳转到热销推荐
      const app = getApp<IAppOption>()
      app.globalData.targetCategoryId = 'hot'
      wx.switchTab({ url: '/pages/category/category' })
    },

    // 点击商品
    onProductTap(e: WechatMiniprogram.TouchEvent) {
      const { id, name, image } = e.currentTarget.dataset
      wx.navigateTo({
        url: `/pages/product-detail/product-detail?id=${id}&name=${encodeURIComponent(name)}&image=${encodeURIComponent(image)}`
      })
    },

    /**
     * 拨打服务热线
     * 
     * 使用 wx.makePhoneCall 调起系统拨号界面
     * 注意：弹窗文案 "拨打xxx?" 是系统原生弹窗，无法自定义
     * 开发者工具中显示 "【仅为模拟】"，真机上会直接调起拨号
     */
    onCallPhone() {
      wx.makePhoneCall({
        phoneNumber: this.data.contact.phone.replace(/-/g, ''),
        fail: () => {
          wx.showToast({ title: '拨打电话失败', icon: 'none' })
        }
      })
    },

    /**
     * 微信联系
     * 
     * 显示微信二维码弹窗，用户可长按识别或复制微信号
     */
    onContactWechat() {
      this.setData({ showWechatModal: true })
    },

    /**
     * 关闭微信二维码弹窗
     */
    onCloseWechatModal() {
      this.setData({ showWechatModal: false })
    },

    /**
     * 点击"微信询价"标签
     */
    onInquiryTap() {
      this.setData({ showWechatModal: true })
    },

    /**
     * 查看门店地址
     * 
     * 使用 wx.openLocation 打开微信内置地图
     * 用户可点击"导航"按钮跳转到腾讯地图/高德地图等进行导航
     */
    onViewAddress() {
      wx.openLocation({
        latitude: 38.428080,
        longitude: 106.303552,
        name: '立达国际建材城39号楼',
        address: '宁夏银川市兴庆区立达国际建材城39号楼2层203室',
        scale: 16,
        fail: () => {
          wx.showToast({ title: '打开地图失败', icon: 'none' })
        }
      })
    },

    /**
     * 加入购物车
     * 
     * 未登录时弹出登录提示，已登录时直接加入购物车
     */
    onAddToCart(e: WechatMiniprogram.TouchEvent) {
      const { id, name, image } = e.currentTarget.dataset
      
      // 检查登录状态
      if (!this.data.isLoggedIn) {
        wx.showModal({
          title: '提示',
          content: '请先登录后再加入购物车',
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
      
      // 加入购物车
      const app = getApp<IAppOption>()
      const cartItem: ICartItem = {
        id: String(id),
        name,
        image,
        quantity: 1
      }
      app.addToCart(cartItem)
      
      wx.showToast({
        title: '已加入购物车',
        icon: 'success',
        duration: 800
      })
    }
  }
})
