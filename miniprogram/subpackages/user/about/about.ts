/**
 * 关于我们页面
 */
Component({
  data: {
    contact: {
      phone: '13895617366',
      phoneBackup: '13389582060',
      wechat: 'ccx13895617366',
      wechatQrcode: 'https://funeral-supplies.oss-cn-beijing.aliyuncs.com/wechat/wechat-qrcode.png',
      address: '宁夏银川市兴庆区立达国际建材城39号楼2层203室'
    },
    showWechatModal: false
  },

  methods: {
    // 拨打服务热线
    callPhone() {
      wx.makePhoneCall({
        phoneNumber: this.data.contact.phone,
        fail: () => {
          showToast({ title: '拨打失败', type: 'none' })
        }
      })
    },

    // 拨打备用热线
    callBackupPhone() {
      wx.makePhoneCall({
        phoneNumber: this.data.contact.phoneBackup,
        fail: () => {
          showToast({ title: '拨打失败', type: 'none' })
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
          showToast({ title: '打开地图失败', type: 'none' })
        }
      })
    },

    // 返回
    goBack() {
      wx.navigateBack()
    }
  }
})
