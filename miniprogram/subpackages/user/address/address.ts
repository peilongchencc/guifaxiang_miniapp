/**
 * 收货地址页面
 * 支持云端同步和本地缓存
 */
import { 
  fetchAddressList, 
  addAddressApi, 
  deleteAddressApi, 
  setDefaultAddressApi,
  type AddressData 
} from '../../../utils/address-api'

Component({
  data: {
    addressList: [] as AddressData[],
    loading: false,
    isLoggedIn: false
  },

  lifetimes: {
    attached() {
      this.checkLoginAndLoad()
    }
  },

  pageLifetimes: {
    show() {
      this.checkLoginAndLoad()
    }
  },

  methods: {
    /**
     * 检查登录状态并加载地址
     */
    checkLoginAndLoad() {
      const isLoggedIn = wx.getStorageSync('isLoggedIn') || false
      this.setData({ isLoggedIn })
      
      if (isLoggedIn) {
        this.loadAddressListFromApi()
      } else {
        this.loadAddressListFromLocal()
      }
    },

    /**
     * 从云端加载地址列表
     */
    async loadAddressListFromApi() {
      this.setData({ loading: true })
      try {
        const addresses = await fetchAddressList()
        this.setData({ addressList: addresses })
        // 同步到本地缓存
        wx.setStorageSync('addressList', addresses)
      } catch (err) {
        console.error('加载地址失败:', err)
        // 失败时使用本地缓存
        this.loadAddressListFromLocal()
      } finally {
        this.setData({ loading: false })
      }
    },

    /**
     * 从本地加载地址列表
     */
    loadAddressListFromLocal() {
      const addressList = wx.getStorageSync('addressList') || []
      this.setData({ addressList })
    },

    /**
     * 通过微信原生界面新增地址
     */
    addAddressFromWx() {
      wx.chooseAddress({
        success: async (res) => {
          const newAddress: Omit<AddressData, 'id'> = {
            userName: res.userName,
            telNumber: res.telNumber,
            provinceName: res.provinceName,
            cityName: res.cityName,
            countyName: res.countyName,
            detailInfo: res.detailInfo,
            postalCode: res.postalCode || '',
            isDefault: this.data.addressList.length === 0
          }
          
          if (this.data.isLoggedIn) {
            // 已登录，保存到云端
            wx.showLoading({ title: '保存中...' })
            const result = await addAddressApi(newAddress)
            wx.hideLoading()
            
            if (result) {
              this.loadAddressListFromApi()
              showToast({ title: '添加成功' })
            } else {
              showToast({ title: '添加失败', type: 'error' })
            }
          } else {
            // 未登录，保存到本地
            const localAddress: AddressData = {
              ...newAddress,
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 11)
            }
            const newList = [...this.data.addressList, localAddress]
            this.setData({ addressList: newList })
            wx.setStorageSync('addressList', newList)
            showToast({ title: '添加成功' })
          }
        },
        fail: (err) => {
          if (err.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '提示',
              content: '需要授权地址权限才能使用此功能，是否前往设置？',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting()
                }
              }
            })
          }
        }
      })
    },

    /**
     * 编辑地址
     * 由于微信 chooseAddress 不支持预填数据，采用删除旧地址+添加新地址的方式
     */
    editAddress(e: WechatMiniprogram.CustomEvent) {
      const id = e.currentTarget.dataset.id
      const address = this.data.addressList.find(item => item.id === id)
      if (!address) return

      wx.showModal({
        title: '编辑地址',
        content: '将通过微信地址选择器重新填写地址信息，原地址将被替换',
        confirmText: '继续',
        success: (res) => {
          if (res.confirm) {
            this.editAddressWithReplace(id, address.isDefault)
          }
        }
      })
    },

    /**
     * 替换编辑地址
     */
    async editAddressWithReplace(oldId: string, wasDefault: boolean) {
      wx.chooseAddress({
        success: async (res) => {
          const newAddress: Omit<AddressData, 'id'> = {
            userName: res.userName,
            telNumber: res.telNumber,
            provinceName: res.provinceName,
            cityName: res.cityName,
            countyName: res.countyName,
            detailInfo: res.detailInfo,
            postalCode: res.postalCode || '',
            isDefault: wasDefault
          }

          if (this.data.isLoggedIn) {
            wx.showLoading({ title: '保存中...' })
            // 先更新地址
            const { updateAddressApi } = require('../../utils/address-api')
            const success = await updateAddressApi(oldId, newAddress)
            wx.hideLoading()

            if (success) {
              this.loadAddressListFromApi()
              showToast({ title: '修改成功' })
            } else {
              showToast({ title: '修改失败', type: 'error' })
            }
          } else {
            // 本地更新
            const newList = this.data.addressList.map(item => 
              item.id === oldId ? { ...newAddress, id: oldId } : item
            )
            this.setData({ addressList: newList })
            wx.setStorageSync('addressList', newList)
            showToast({ title: '修改成功' })
          }
        },
        fail: (err) => {
          if (err.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '提示',
              content: '需要授权地址权限才能使用此功能',
              showCancel: false
            })
          }
        }
      })
    },

    /**
     * 设为默认地址
     */
    async setDefault(e: WechatMiniprogram.CustomEvent) {
      const id = e.currentTarget.dataset.id
      
      if (this.data.isLoggedIn) {
        wx.showLoading({ title: '设置中...' })
        const success = await setDefaultAddressApi(id)
        wx.hideLoading()
        
        if (success) {
          this.loadAddressListFromApi()
          showToast({ title: '已设为默认' })
        } else {
          showToast({ title: '设置失败', type: 'error' })
        }
      } else {
        // 本地设置默认
        const newList = this.data.addressList.map(item => ({
          ...item,
          isDefault: item.id === id
        }))
        this.setData({ addressList: newList })
        wx.setStorageSync('addressList', newList)
        showToast({ title: '已设为默认' })
      }
    },

    /**
     * 删除地址
     */
    deleteAddress(e: WechatMiniprogram.CustomEvent) {
      const id = e.currentTarget.dataset.id
      wx.showModal({
        title: '提示',
        content: '确定要删除这个地址吗？',
        success: async (res) => {
          if (res.confirm) {
            if (this.data.isLoggedIn) {
              wx.showLoading({ title: '删除中...' })
              const success = await deleteAddressApi(id)
              wx.hideLoading()
              
              if (success) {
                this.loadAddressListFromApi()
                showToast({ title: '已删除' })
              } else {
                showToast({ title: '删除失败', type: 'error' })
              }
            } else {
              const newList = this.data.addressList.filter(item => item.id !== id)
              this.setData({ addressList: newList })
              wx.setStorageSync('addressList', newList)
              showToast({ title: '已删除' })
            }
          }
        }
      })
    },

    /**
     * 选择地址（供其他页面调用）
     */
    selectAddress(e: WechatMiniprogram.CustomEvent) {
      const id = e.currentTarget.dataset.id
      const address = this.data.addressList.find(item => item.id === id)
      
      const pages = getCurrentPages()
      if (pages.length > 1 && address) {
        const prevPage = pages[pages.length - 2] as Record<string, unknown>
        if (typeof prevPage.onAddressSelected === 'function') {
          prevPage.onAddressSelected(address)
          wx.navigateBack()
        }
      }
    }
  }
})
