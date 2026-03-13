// category.ts
// 分类页面 - 二级分类结构，数据从API获取
import { showToast } from '../../utils/toast'

import { get } from '../../utils/request'

// 二级分类数据类型
interface SubCategory {
  id: string
  name: string
  parentId: string
}

// 一级分类数据类型
interface Category {
  id: string
  name: string
}

// 商品数据类型
interface Product {
  id: string
  name: string
  image: string
  categoryId: string
  subCategoryId: string
}

// 分组后的商品数据类型
interface GroupedProducts {
  id: string
  subCategory: SubCategory
  products: Product[]
  total: number
  expanded: boolean
}

// API响应数据类型
interface ProductAllData {
  categories: Category[]
  subCategories: SubCategory[]
  products: Product[]
}

Component({
  data: {
    // 胶囊按钮和状态栏信息
    statusBarHeight: 0,
    menuButtonHeight: 0,
    menuButtonTop: 0,
    menuButtonRight: 0,
    menuButtonWidth: 0,
    
    // 搜索关键词
    searchKeyword: '',
    
    // 左侧一级分类列表
    categories: [] as Category[],

    // 二级分类列表
    subCategories: [] as SubCategory[],
    
    // 当前选中的分类ID
    currentCategoryId: 'hot',
    
    // 所有商品列表
    allProducts: [] as Product[],

    // 搜索结果完整列表（用于搜索模式下的展开/收起）
    searchResults: [] as Product[],
    
    // 当前显示的分组商品列表
    groupedProducts: [] as GroupedProducts[],

    // 是否为搜索模式
    isSearchMode: false,

    // 数据加载状态
    isLoading: true,

    // 各二级分类的展开状态
    expandedSubCategories: {} as Record<string, boolean>
  },
  
  lifetimes: {
    attached() {
      // 获取系统信息和胶囊按钮信息
      const systemInfo = wx.getSystemInfoSync()
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
      
      this.setData({
        statusBarHeight: systemInfo.statusBarHeight || 0,
        menuButtonHeight: menuButtonInfo.height,
        menuButtonTop: menuButtonInfo.top,
        menuButtonRight: systemInfo.windowWidth - menuButtonInfo.right,
        menuButtonWidth: menuButtonInfo.width
      })
      
      // 从API加载数据
      this.loadProductData()
    }
  },

  pageLifetimes: {
    show() {
      const app = getApp<IAppOption>()
      
      // 检查是否有搜索关键词（从首页传来）
      if (app.globalData.searchKeyword) {
        const keyword = app.globalData.searchKeyword
        app.globalData.searchKeyword = undefined
        this.setData({ searchKeyword: keyword })
        this.performSearch(keyword)
        return
      }
      
      // 检查是否有目标分类需要跳转
      if (app.globalData.targetCategoryId) {
        const targetId = app.globalData.targetCategoryId
        app.globalData.targetCategoryId = undefined
        this.setData({ currentCategoryId: targetId })
        this.filterProducts(targetId)
      }
    }
  },
  
  methods: {
    /**
     * 从API加载商品数据
     */
    async loadProductData() {
      this.setData({ isLoading: true })
      
      try {
        const res = await get<ProductAllData>('/product/all')
        
        if (res.code === 200 && res.data) {
          this.setData({
            categories: res.data.categories,
            subCategories: res.data.subCategories,
            allProducts: res.data.products,
            isLoading: false
          })
          
          // 初始化显示第一个分类的商品
          this.filterProducts(this.data.currentCategoryId)
        }
      } catch (error) {
        console.error('加载商品数据失败:', error)
        showToast({ title: '加载失败，请重试', type: 'none' })
        this.setData({ isLoading: false })
      }
    },

    // 搜索输入
    onSearchInput(e: WechatMiniprogram.CustomEvent) {
      const keyword = e.detail.value
      this.setData({ searchKeyword: keyword })
      this.performSearch(keyword)
    },
    
    // 搜索确认
    onSearchConfirm(e: WechatMiniprogram.CustomEvent) {
      const keyword = e.detail.value
      this.performSearch(keyword)
    },
    
    // 清除搜索
    onClearSearch() {
      this.setData({
        searchKeyword: '',
        isSearchMode: false
      })
      this.filterProducts(this.data.currentCategoryId)
    },
    
    // 执行搜索 - 调用后端API
    async performSearch(keyword: string) {
      if (!keyword.trim()) {
        this.setData({ isSearchMode: false })
        this.filterProducts(this.data.currentCategoryId)
        return
      }
      
      this.setData({ isSearchMode: true, isLoading: true })
      
      try {
        const res = await get<{ products: Product[] }>(
          `/product/search?keyword=${encodeURIComponent(keyword)}`
        )
        
        if (res.code === 200 && res.data) {
          const searchResults = res.data.products
          const grouped = this.groupProductsBySubCategory(searchResults)
          this.setData({ searchResults, groupedProducts: grouped, isLoading: false })
          
          if (searchResults.length === 0) {
            showToast({ title: '未找到相关商品', type: 'none', duration: 2000 })
          }
        }
      } catch (error) {
        console.error('搜索失败:', error)
        showToast({ title: '搜索失败，请重试', type: 'none' })
        this.setData({ isLoading: false })
      }
    },
    
    // 点击左侧分类
    onCategoryTap(e: WechatMiniprogram.CustomEvent) {
      const categoryId = e.currentTarget.dataset.id
      this.setData({
        currentCategoryId: categoryId,
        searchKeyword: '',
        isSearchMode: false,
        expandedSubCategories: {}
      })
      this.filterProducts(categoryId)
    },
    
    // 根据分类ID筛选商品并按二级分类分组
    filterProducts(categoryId: string) {
      const products = this.data.allProducts.filter(
        (product: Product) => product.categoryId === categoryId
      )
      const grouped = this.groupProductsBySubCategory(products)
      this.setData({ groupedProducts: grouped })
    },

    // 将商品按二级分类分组
    groupProductsBySubCategory(products: Product[]): GroupedProducts[] {
      const FOLD_THRESHOLD = 9
      const subCategoryMap = new Map<string, Product[]>()
      
      products.forEach(product => {
        const existing = subCategoryMap.get(product.subCategoryId) || []
        existing.push(product)
        subCategoryMap.set(product.subCategoryId, existing)
      })
      
      const result: GroupedProducts[] = []
      subCategoryMap.forEach((prods, subCategoryId) => {
        const subCategory = this.data.subCategories.find(
          (sc: SubCategory) => sc.id === subCategoryId
        )
        if (subCategory) {
          const expanded = this.data.expandedSubCategories[subCategoryId] || false
          result.push({
            id: subCategoryId,
            subCategory,
            products: expanded ? prods : prods.slice(0, FOLD_THRESHOLD),
            total: prods.length,
            expanded
          })
        }
      })
      
      return result
    },

    // 展开/收起二级分类商品
    onToggleExpand(e: WechatMiniprogram.CustomEvent) {
      const subCategoryId = e.currentTarget.dataset.id as string
      const expandedMap = { ...this.data.expandedSubCategories }
      expandedMap[subCategoryId] = !expandedMap[subCategoryId]
      this.setData({ expandedSubCategories: expandedMap })

      if (this.data.isSearchMode) {
        const grouped = this.groupProductsBySubCategory(this.data.searchResults)
        this.setData({ groupedProducts: grouped })
      } else {
        this.filterProducts(this.data.currentCategoryId)
      }
    },
    
    // 点击商品
    onProductTap(e: WechatMiniprogram.CustomEvent) {
      const { id, name, image } = e.currentTarget.dataset
      wx.navigateTo({
        url: `/subpackages/user/product-detail/product-detail?id=${id}&name=${encodeURIComponent(name)}&image=${encodeURIComponent(image)}`
      })
    },

    /**
     * 加入购物车（无需登录，本地暂存；提交订单时才需要登录）
     */
    onAddToCart(e: WechatMiniprogram.CustomEvent) {
      const { id, name, image } = e.currentTarget.dataset
      const app = getApp<IAppOption>()
      app.addToCart({
        id: String(id),
        name,
        image,
        quantity: 1
      })
      showToast({ title: '已加入购物车', duration: 800 })
    },

  }
})
