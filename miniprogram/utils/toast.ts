// toast.ts
// 全局 Toast 工具函数，替代原生 wx.showToast，展示品牌风格提示

/** Toast 调用参数 */
interface ToastOptions {
  /** 提示文字 */
  title: string
  /** 图标类型：success=金色对勾, error=红色叉号, none=纯文字 */
  type?: 'success' | 'error' | 'none'
  /** 显示时长（ms），默认 1500 */
  duration?: number
}

/**
 * 显示品牌风格的 Toast 提示。
 *
 * 要求当前页面 WXML 中包含：<gold-toast id="gold-toast" />
 * 若组件未找到则降级为原生 wx.showToast（无图标）。
 *
 * Args:
 *   options: Toast 配置项
 */
export function showToast(options: ToastOptions): void {
  const { title, type = 'success', duration = 1500 } = options

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any

  const toastComp = currentPage?.selectComponent?.('#gold-toast')
  if (toastComp) {
    toastComp.show({ title, type, duration })
    return
  }

  // 降级：组件未挂载时使用原生提示
  wx.showToast({ title, icon: 'none', duration })
}
