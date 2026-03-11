// mine.ts
import { showToast } from '../../utils/toast'
import { miniappLogin, phoneAuth, logout } from '../../utils/auth'

const defaultAvatarUrl = 'https://funeral-supplies.oss-cn-beijing.aliyuncs.com/miniapp/brand-images/default-avatar.png'

// 随机昵称列表
const nicknameList = [
  "清怀远士", "念恩之客", "素心雅人", "守望之士",
  "慎思远人", "传德之客", "敬先之人", "仁怀之客",
  "承志之人", "慕义之士", "怀远之人", "知恩常念",
  "景行之客", "明德守正", "慎终如初"
]

function getRandomNickname() {
  const randomIndex = Math.floor(Math.random() * nicknameList.length)
  return nicknameList[randomIndex]
}

/**
 * 手机号脱敏处理
 * @param phone 完整手机号
 * @returns 脱敏后的手机号，如 138****8888
 */
function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return phone.substring(0, 3) + '****' + phone.substring(7)
}

const appInstance = getApp<IAppOption>()

Component({
  data: {
    isLoggedIn: false,
    showLoginPopup: false,
    showPrivacyPopup: false,
    agreedPrivacy: false,
    openid: '',  // 存储 openid 用于手机号授权
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
      phoneNumber: '',
    },
    nicknameHighlight: false,
    avatarHighlight: false,
    contact: {
      phone: '13895617366',
      phoneBackup: '13389582060',
      wechat: 'ccx13895617366',
      wechatQrcode: 'https://funeral-supplies.oss-cn-beijing.aliyuncs.com/wechat/wechat-qrcode.png'
    },
    showWechatModal: false,
  },

  lifetimes: {
    attached() {
      this.checkLoginStatus()
    }
  },

  pageLifetimes: {
    show() {
      this.checkLoginStatus()
    }
  },

  methods: {
    // 显示登录弹窗
    showLoginPopup() {
      this.setData({ showLoginPopup: true })
    },

    // 隐藏登录弹窗
    hideLoginPopup() {
      this.setData({ showLoginPopup: false })
    },

    // 切换隐私协议勾选状态
    togglePrivacyAgreement() {
      this.setData({ agreedPrivacy: !this.data.agreedPrivacy })
    },

    // 未勾选协议时点击登录按钮
    onLoginBtnTap() {
      if (!this.data.agreedPrivacy) {
        showToast({ title: '请先阅读并同意用户隐私协议', type: 'none' })
      }
    },

    // 查看隐私协议
    viewPrivacyPolicy() {
      this.setData({ showPrivacyPopup: true })
    },

    // 隐藏隐私协议弹窗
    hidePrivacyPopup() {
      this.setData({ showPrivacyPopup: false })
    },

    // 确认已阅读隐私协议
    confirmPrivacyPolicy() {
      this.setData({ 
        showPrivacyPopup: false,
        agreedPrivacy: true
      })
    },

    // 检查登录状态
    checkLoginStatus() {
      const isLoggedIn = appInstance.globalData.isLoggedIn
      const userInfo = appInstance.globalData.userInfo
      if (isLoggedIn && userInfo) {
        this.setData({ 
          isLoggedIn: true, 
          userInfo: {
            avatarUrl: userInfo.avatarUrl,
            nickName: userInfo.nickName,
            phoneNumber: userInfo.phoneNumber || ''
          }
        })
      } else {
        this.setData({
          isLoggedIn: false,
          userInfo: { avatarUrl: defaultAvatarUrl, nickName: '', phoneNumber: '' }
        })
      }
    },

    // 手机号快速验证回调（新版 code 方式）
    async onGetPhoneNumber(e: WechatMiniprogram.CustomEvent) {
      const { code, errMsg } = e.detail

      if (errMsg === 'getPhoneNumber:fail user deny' || !code) {
        showToast({ title: '需要授权手机号才能登录', type: 'none' })
        return
      }

      wx.showLoading({ title: '登录中...' })

      try {
        // 第一步：调用 wx.login 获取 openid
        const loginData = await miniappLogin()
        
        if (loginData.need_phone && loginData.openid) {
          // 第二步：使用 code 进行手机号授权
          const authData = await phoneAuth(loginData.openid, code)
          this.handleLoginSuccess(authData.user_info)
        } else if (!loginData.need_phone && loginData.user_info) {
          // 已有用户，直接登录成功
          this.handleLoginSuccess(loginData.user_info)
        }
      } catch (err) {
        wx.hideLoading()
        console.error('登录失败:', err)
        showToast({ title: '登录失败，请重试', type: 'none' })
      }
    },

    /**
     * 处理登录成功
     */
    handleLoginSuccess(serverUserInfo: { 
      id: number
      phone_number: string
      user_name: string | null
      avatar_oss: string | null 
    }) {
      wx.hideLoading()

      const userInfo = {
        avatarUrl: serverUserInfo.avatar_oss || defaultAvatarUrl,
        nickName: serverUserInfo.user_name || getRandomNickname(),
        phoneNumber: maskPhoneNumber(serverUserInfo.phone_number),
      }

      this.setData({ isLoggedIn: true, showLoginPopup: false, userInfo })
      
      const globalUserInfo: IUserInfo = {
        avatarUrl: userInfo.avatarUrl,
        nickName: userInfo.nickName,
        phoneNumber: userInfo.phoneNumber,
      }
      
      appInstance.globalData.isLoggedIn = true
      appInstance.globalData.userInfo = globalUserInfo
      wx.setStorageSync('isLoggedIn', true)
      wx.setStorageSync('userInfo', globalUserInfo)
      
      showToast({ title: '登录成功' })
      this.playLoginHighlightAnimation()
      
      // 登录成功后同步云端数据
      this.syncDataAfterLogin()
    },

    /**
     * 登录后同步云端数据（购物车、收藏）
     */
    async syncDataAfterLogin() {
      try {
        // 并行同步购物车和收藏数据
        await Promise.all([
          appInstance.syncCartAfterLogin(),
          appInstance.syncFavoritesAfterLogin()
        ])
      } catch (err) {
        console.error('数据同步失败:', err)
      }
    },

    // 选择头像
    onChooseAvatar(e: WechatMiniprogram.CustomEvent) {
      const { avatarUrl } = e.detail
      this.setData({ "userInfo.avatarUrl": avatarUrl })
      this.saveUserInfo()
      showToast({ title: '头像已更新' })
    },

    // 输入昵称
    onInputChange(e: WechatMiniprogram.CustomEvent) {
      const nickName = e.detail.value
      if (nickName && nickName.trim()) {
        this.setData({ "userInfo.nickName": nickName })
        this.saveUserInfo()
      }
    },

    // 保存用户信息
    saveUserInfo() {
      appInstance.globalData.userInfo = this.data.userInfo
      wx.setStorageSync('userInfo', this.data.userInfo)
    },

    // 退出登录
    handleLogout() {
      wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            logout()
            this.setData({
              isLoggedIn: false,
              userInfo: { avatarUrl: defaultAvatarUrl, nickName: '', phoneNumber: '' }
            })
            appInstance.globalData.isLoggedIn = false
            appInstance.globalData.userInfo = null
            showToast({ title: '已退出登录' })
          }
        }
      })
    },

    // 我的订单（全部）
    goToOrders() {
      wx.navigateTo({ url: '/pages/orders/orders' })
    },

    // 跳转至指定状态的订单列表
    goToOrdersByStatus(e: WechatMiniprogram.CustomEvent) {
      const status = e.currentTarget.dataset.status as string
      wx.navigateTo({ url: `/pages/orders/orders?status=${status}` })
    },

    // 我的收藏
    goToFavorites() {
      wx.navigateTo({ url: '/pages/favorites/favorites' })
    },

    // 我的足迹
    goToFootprints() {
      if (!appInstance.globalData.isLoggedIn) {
        showToast({ title: '请先登录', type: 'none' })
        return
      }
      wx.navigateTo({ url: '/pages/footprints/footprints' })
    },

    // 收货地址
    goToAddress() {
      wx.navigateTo({ url: '/pages/address/address' })
    },

    // 常见问题
    goToFAQ() {
      wx.navigateTo({ url: '/pages/faq/faq' })
    },

    // 关于我们
    goToAbout() {
      wx.navigateTo({ url: '/pages/about/about' })
    },

    /**
     * 联系客服：弹出操作菜单，支持电话或微信联系
     */
    contactService() {
      wx.showActionSheet({
        itemList: ['拨打电话', '微信联系'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.showPhoneChoice()
          } else if (res.tapIndex === 1) {
            this.setData({ showWechatModal: true })
          }
        }
      })
    },

    /** 弹出号码选择菜单（主号 / 备用号） */
    showPhoneChoice() {
      const { phone, phoneBackup } = this.data.contact
      wx.showActionSheet({
        itemList: [`${phone}（主号）`, `${phoneBackup}（备用）`],
        success: (res) => {
          const phoneNumber = res.tapIndex === 0 ? phone : phoneBackup
          wx.makePhoneCall({
            phoneNumber,
            fail: () => showToast({ title: '拨打电话失败', type: 'none' })
          })
        }
      })
    },

    /** 关闭微信弹窗 */
    onCloseWechatModal() {
      this.setData({ showWechatModal: false })
    },

    /**
     * 播放登录成功高亮动画
     */
    playLoginHighlightAnimation() {
      this.setData({ nicknameHighlight: true })
      
      setTimeout(() => {
        this.setData({ nicknameHighlight: false, avatarHighlight: true })
        
        setTimeout(() => {
          this.setData({ avatarHighlight: false })
        }, 1600)
      }, 1600)
    }
  },
})
