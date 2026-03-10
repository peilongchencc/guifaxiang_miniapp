// wechat-modal.ts
// 微信联系弹窗组件

Component({
  properties: {
    // 是否显示弹窗
    visible: {
      type: Boolean,
      value: false
    },
    // 微信号
    wechatId: {
      type: String,
      value: 'ccx13895617366'
    },
    // 微信二维码图片地址
    qrcode: {
      type: String,
      value: 'https://funeral-supplies.oss-cn-beijing.aliyuncs.com/wechat/wechat-qrcode.png'
    }
  },

  methods: {
    /**
     * 点击遮罩层关闭
     */
    onMaskTap() {
      this.triggerEvent('close')
    },

    /**
     * 点击关闭按钮
     */
    onClose() {
      this.triggerEvent('close')
    },

    /**
     * 复制微信号
     */
    onCopyWechat() {
      wx.setClipboardData({
        data: this.properties.wechatId,
        fail: () => {
          wx.showToast({ title: '复制失败', icon: 'none' })
        }
      })
    }
  }
})
