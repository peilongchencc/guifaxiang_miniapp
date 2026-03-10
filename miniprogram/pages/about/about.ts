/**
 * 关于我们页面
 */
Component({
  data: {
    contact: {
      phone: '13895617366',
      wechat: 'ccx13895617366',
      wechatQrcode: 'https://funeral-supplies.oss-cn-beijing.aliyuncs.com/wechat/wechat-qrcode.png',
      address: '宁夏银川市兴庆区立达国际建材城39号楼2层203室'
    },
    showWechatModal: false
  },

  methods: {
    // 拨打电话
    callPhone() {
      wx.makePhoneCall({
        phoneNumber: this.data.contact.phone,
        fail: () => {
          wx.showToast({ title: '拨打失败', icon: 'none' })
        }
      })
    },

    // 打开微信联系弹窗
    openWechatModal() {
      this.setData({ showWechatModal: true })
    },

    // 关闭微信联系弹窗
    onCloseWechatModal() {
      this.setData({ showWechatModal: false })
    },

    // 打开地图
    openLocation() {
      wx.openLocation({
        latitude: 38.428080,
        longitude: 106.303552,
        name: '立达国际建材城39号楼',
        address: this.data.contact.address,
        scale: 16,
        fail: () => {
          wx.showToast({ title: '打开地图失败', icon: 'none' })
        }
      })
    },

    // 返回
    goBack() {
      wx.navigateBack()
    }
  }
})
