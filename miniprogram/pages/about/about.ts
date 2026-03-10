/**
 * 关于我们页面
 */
Component({
  data: {
    contact: {
      phone: '13895617366',
      wechat: 'ccx13895617366',
      address: '宁夏银川市兴庆区立达国际建材城39号楼2层203室'
    }
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

    // 复制微信号
    copyWechat() {
      wx.setClipboardData({
        data: this.data.contact.wechat,
        success: () => {
          wx.showToast({ title: '微信号已复制', icon: 'success' })
        }
      })
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
