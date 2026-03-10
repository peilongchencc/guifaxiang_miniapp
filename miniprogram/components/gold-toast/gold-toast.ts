// gold-toast.ts
// 品牌风格操作反馈提示组件，与整体深色导航 + 金色主调保持一致

/** 提示类型 */
type ToastType = 'success' | 'error' | 'none'

/** show 方法参数 */
interface ShowOptions {
  /** 提示文字 */
  title: string
  /** 图标类型：success=金色对勾, error=红色叉号, none=纯文字 */
  type?: ToastType
  /** 显示时长（ms），默认 1500 */
  duration?: number
}

Component({
  data: {
    visible: false,
    title: '',
    type: 'success' as ToastType,
  },

  methods: {
    /**
     * 显示 Toast 提示
     *
     * Args:
     *   options: 提示配置项
     */
    show(options: ShowOptions) {
      const { title, type = 'success', duration = 1500 } = options

      if (this._hideTimer) {
        clearTimeout(this._hideTimer)
        this._hideTimer = null
      }

      this.setData({ visible: true, title, type })

      this._hideTimer = setTimeout(() => {
        this.setData({ visible: false })
        this._hideTimer = null
      }, duration)
    },

    /**
     * 手动隐藏 Toast（一般无需手动调用）
     */
    hide() {
      if (this._hideTimer) {
        clearTimeout(this._hideTimer)
        this._hideTimer = null
      }
      this.setData({ visible: false })
    },
  },
})
