// product-detail.ts
// 商品详情页 - 从API获取数据
import { showToast } from '../../utils/toast'

import { get } from '../../utils/request'
import { addFootprintApi } from '../../utils/footprint-api'
import { checkFavoriteApi, addFavoriteApi, removeFavoriteApi } from '../../utils/favorite-api'

const app = getApp<IAppOption>()

/** 商品规格类型 */
interface ProductSpec {
  id: string
  name: string
  values: SpecValue[]
}

/** 规格值类型 */
interface SpecValue {
  id: string
  name: string
  selected?: boolean
}

/** 商品详情类型 */
interface ProductDetail {
  id: string
  name: string
  image: string
  images: string[]
  soldCount: number
  stock: number
  categoryId: string
  subCategoryId: string
  description: string
  specs: ProductSpec[]
  details: string[]
  services: string[]
}

/** API响应数据类型 */
interface ProductDetailResponse {
  product: ProductDetail
}

Component({
  properties: {
    id: { type: String, value: '' },
    name: { type: String, value: '' },
    image: { type: String, value: '' }
  },

  data: {
    product: null as ProductDetail | null,
    isLoggedIn: false,
    navBarHeight: 0,
    currentImageIndex: 0,
    quantity: 1,
    selectedSpecText: '请选择规格',
    showSpecPopup: false,
    isAddingToCart: false,
    isFavorite: false,
    isLoading: true,
    contact: {
      phone: '13895617366',
      wechat: 'ccx13895617366',
      wechatQrcode: 'https://funeral-supplies.oss-cn-beijing.aliyuncs.com/wechat/wechat-qrcode.png'
    },
    showWechatModal: false
  },

  lifetimes: {
    attached() {
      this.initNavBarHeight()
      this.checkLoginStatus()
      this.loadProductDetail()
    }
  },

  pageLifetimes: {
    show() {
      this.checkFavoriteStatus()
    }
  },

  methods: {
    /** 初始化导航栏高度 */
    initNavBarHeight() {
      const rect = wx.getMenuButtonBoundingClientRect()
      const systemInfo = wx.getSystemInfoSync()
      const navBarHeight = systemInfo.statusBarHeight! + rect.height + (rect.top - systemInfo.statusBarHeight!) * 2
      this.setData({ navBarHeight })
    },

    /** 检查用户登录状态 */
    checkLoginStatus() {
      const isLoggedIn = wx.getStorageSync('isLoggedIn') || false
      this.setData({ isLoggedIn })
    },

    /** 从API加载商品详情 */
    async loadProductDetail() {
      const id = this.properties.id

      if (!id) {
        showToast({ title: '商品ID不存在', type: 'none' })
        this.setData({ isLoading: false })
        return
      }

      this.setData({ isLoading: true })

      try {
        const res = await get<ProductDetailResponse>(`/product/detail/${id}`)
        
        if (res.code === 200 && res.data?.product) {
          const product = res.data.product
          // 处理规格数据，设置默认选中
          if (product.specs && product.specs.length > 0) {
            product.specs = product.specs.map(spec => ({
              ...spec,
              values: spec.values.map((v, i) => ({ ...v, selected: i === 0 }))
            }))
          }
          
          this.setData({
            product,
            selectedSpecText: this.getSelectedSpecText(product.specs || []),
            isLoading: false
          })
          this.checkFavoriteStatus()
          this.recordFootprint(product.id)
        } else {
          throw new Error(res.message || '获取商品详情失败')
        }
      } catch (error) {
        console.error('加载商品详情失败:', error)
        showToast({ title: '加载失败', type: 'none' })
        this.setData({ isLoading: false })
      }
    },

    /** 获取已选规格文本 */
    getSelectedSpecText(specs: ProductSpec[]): string {
      if (!specs || specs.length === 0) return '默认规格'
      const selected = specs.map(spec => {
        const selectedValue = spec.values.find(v => v.selected)
        return selectedValue ? selectedValue.name : ''
      }).filter(Boolean)
      return selected.length > 0 ? selected.join('，') : '请选择规格'
    },

    /** 轮播图切换 */
    onSwiperChange(e: WechatMiniprogram.SwiperChange) {
      this.setData({ currentImageIndex: e.detail.current })
    },

    /** 预览图片 */
    previewImage(e: WechatMiniprogram.TouchEvent) {
      const { index } = e.currentTarget.dataset
      const { product } = this.data
      if (!product) return
      wx.previewImage({
        current: product.images[index],
        urls: product.images
      })
    },

    /** 显示规格弹窗 */
    showSpecSelector() {
      this.setData({ showSpecPopup: true })
    },

    /** 隐藏规格弹窗 */
    hideSpecPopup() {
      this.setData({ showSpecPopup: false })
    },

    /** 选择规格 */
    selectSpec(e: WechatMiniprogram.TouchEvent) {
      const { specId, valueId } = e.currentTarget.dataset
      const { product } = this.data
      if (!product) return

      const newSpecs = product.specs.map(spec => {
        if (spec.id === specId) {
          return {
            ...spec,
            values: spec.values.map(v => ({ ...v, selected: v.id === valueId }))
          }
        }
        return spec
      })

      this.setData({
        'product.specs': newSpecs,
        selectedSpecText: this.getSelectedSpecText(newSpecs)
      })
    },

    /** 减少数量 */
    decreaseQuantity() {
      if (this.data.quantity > 1) {
        this.setData({ quantity: this.data.quantity - 1 })
      }
    },

    /** 增加数量 */
    increaseQuantity() {
      const { product, quantity } = this.data
      if (product && quantity < product.stock) {
        this.setData({ quantity: quantity + 1 })
      }
    },

    /** 输入数量 */
    onQuantityInput(e: WechatMiniprogram.Input) {
      const { product } = this.data
      let value = parseInt(e.detail.value) || 1
      if (value < 1) value = 1
      if (product && value > product.stock) value = product.stock
      this.setData({ quantity: value })
    },

    /** 检查收藏状态 */
    async checkFavoriteStatus() {
      const { product, isLoggedIn } = this.data
      if (!product) return

      if (isLoggedIn) {
        // 已登录，从云端获取收藏状态
        const isFavorite = await checkFavoriteApi(product.id)
        this.setData({ isFavorite })
      } else {
        // 未登录，使用本地状态
        const isFavorite = app.isFavorite(product.id)
        this.setData({ isFavorite })
      }
    },

    /** 切换收藏状态 */
    async toggleFavorite() {
      const { product, isFavorite, isLoggedIn } = this.data
      if (!product) return

      if (isFavorite) {
        // 取消收藏
        if (isLoggedIn) {
          await removeFavoriteApi(product.id)
        }
        app.removeFavorite(product.id)
        this.setData({ isFavorite: false })
        showToast({ title: '已取消收藏', type: 'none' })
      } else {
        // 添加收藏
        if (isLoggedIn) {
          await addFavoriteApi(product.id)
        }
        app.addFavorite({
          id: product.id,
          name: product.name,
          image: product.images[0] || product.image
        })
        this.setData({ isFavorite: true })
        showToast({ title: '已收藏' })
      }
    },

    /** 加入购物车 */
    addToCart() {
      const { product, quantity, isAddingToCart, isLoggedIn } = this.data
      if (!product || isAddingToCart) return

      if (!isLoggedIn) {
        wx.showModal({
          title: '提示',
          content: '请先登录后再操作',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) wx.switchTab({ url: '/pages/mine/mine' })
          }
        })
        return
      }

      this.setData({ isAddingToCart: true })

      app.addToCart({
        id: product.id,
        name: product.name,
        image: product.images[0] || product.image,
        quantity: quantity
      })

      showToast({ title: '已加入购物车', duration: 800 })

      setTimeout(() => {
        this.setData({ isAddingToCart: false, showSpecPopup: false })
      }, 800)
    },

    /** 立即购买 */
    buyNow() {
      const { product, quantity, isLoggedIn } = this.data
      if (!product) return

      if (!isLoggedIn) {
        wx.showModal({
          title: '提示',
          content: '请先登录后再操作',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) wx.switchTab({ url: '/pages/mine/mine' })
          }
        })
        return
      }

      app.addToCart({
        id: product.id,
        name: product.name,
        image: product.images[0] || product.image,
        quantity: quantity
      })

      wx.switchTab({ url: '/pages/cart/cart' })
    },

    /** 联系客服：弹出操作菜单，支持电话或微信联系 */
    contactService() {
      wx.showActionSheet({
        itemList: ['拨打电话', '微信联系'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.makePhoneCall({
              phoneNumber: this.data.contact.phone,
              fail: () => showToast({ title: '拨打电话失败', type: 'none' })
            })
          } else if (res.tapIndex === 1) {
            this.setData({ showWechatModal: true })
          }
        }
      })
    },

    /** 关闭微信弹窗 */
    onCloseWechatModal() {
      this.setData({ showWechatModal: false })
    },

    /** 分享商品 */
    shareProduct() {
      showToast({ title: '分享功能开发中', type: 'none' })
    },

    /** 返回上一页 */
    goBack() {
      wx.navigateBack()
    },

    /** 记录浏览足迹 */
    recordFootprint(productId: string) {
      // 已登录才记录足迹
      if (app.globalData.isLoggedIn) {
        addFootprintApi(productId)
      }
    }
  }
})
