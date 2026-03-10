/**
 * 常见问题页面
 */
interface FaqItem {
  id: number
  question: string
  answer: string
  expanded: boolean
}

Component({
  data: {
    contact: {
      phone: '13895617366',
      phoneBackup: '13389582060',
      wechat: 'ccx13895617366',
      wechatQrcode: 'https://funeral-supplies.oss-cn-beijing.aliyuncs.com/wechat/wechat-qrcode.png'
    },
    showWechatModal: false,
    faqList: [
      {
        id: 1,
        question: '如何下单购买商品？',
        answer: '浏览商品后，将需要的商品加入购物车，然后提交订货清单。我们的客服会在收到订单后第一时间与您联系确认价格和配送事宜。',
        expanded: false
      },
      {
        id: 2,
        question: '为什么商品没有显示价格？',
        answer: '由于殡葬用品的特殊性，价格会根据具体规格、材质和数量有所不同。我们会在您提交订单后，由专业客服为您提供详细报价。',
        expanded: false
      },
      {
        id: 3,
        question: '配送范围和时间是怎样的？',
        answer: '我们提供全城免费配送服务，24小时响应。紧急情况下可优先安排配送，请在订单备注中说明。',
        expanded: false
      },
      {
        id: 4,
        question: '如何取消或修改订单？',
        answer: '在订单确认前，您可以在"我的订单"中取消订单。如需修改订单内容，请直接联系客服处理。',
        expanded: false
      },
      {
        id: 5,
        question: '支持哪些付款方式？',
        answer: '目前支持微信支付。订单确认后，客服会发送付款链接或收款码给您。',
        expanded: false
      },
      {
        id: 6,
        question: '商品可以退换吗？',
        answer: '由于商品的特殊性，一般情况下不支持退换。如有质量问题，请在收货时当场提出，我们会及时处理。',
        expanded: false
      }
    ] as FaqItem[]
  },

  methods: {
    // 展开/收起问题
    toggleFaq(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id
      const faqList = this.data.faqList.map(item => ({
        ...item,
        expanded: item.id === id ? !item.expanded : false
      }))
      this.setData({ faqList })
    },

    // 联系客服：弹出操作菜单，支持电话或微信联系
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

    // 弹出号码选择菜单（主号 / 备用号）
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

    // 关闭微信弹窗
    onCloseWechatModal() {
      this.setData({ showWechatModal: false })
    },

    // 返回
    goBack() {
      wx.navigateBack()
    }
  }
})
