# 贵发祥殡葬礼品微信小程序

基于微信小程序原生框架（TypeScript + SCSS）构建的殡葬礼品电商小程序。

---

## 页面结构

项目采用**主包 + 分包**架构，主包仅保留 TabBar 四个核心页面，其余功能页面按业务域拆入分包，以控制主包体积、提升首屏加载速度。

```
miniprogram/
├── pages/                        # 主包（TabBar 页面）
│   ├── home/                     # 首页
│   ├── category/                 # 分类
│   ├── cart/                     # 购物车
│   └── mine/                     # 我的
│
├── subpackages/
│   ├── orders/                   # 分包 A：订单模块
│   │   ├── orders/               # 订单列表
│   │   └── order-detail/         # 订单详情
│   │
│   └── user/                     # 分包 B：用户中心 & 商品
│       ├── product-detail/       # 商品详情
│       ├── favorites/            # 我的收藏
│       ├── footprints/           # 我的足迹
│       ├── address/              # 收货地址
│       ├── faq/                  # 常见问题
│       └── about/                # 关于我们
│
├── components/                   # 公共组件（主包根目录，所有分包可引用）
│   ├── gold-toast/               # 品牌风格 Toast 提示组件
│   ├── navigation-bar/           # 自定义导航栏组件
│   └── wechat-modal/             # 微信联系弹窗组件
│
├── utils/                        # 工具模块
│   ├── request.ts                # HTTP 请求封装（Token 管理、自动刷新）
│   ├── auth.ts                   # 登录认证（小程序登录、手机号授权）
│   ├── cart-api.ts               # 购物车云端同步 API
│   ├── order-api.ts              # 订单提交与查询 API
│   ├── favorite-api.ts           # 收藏云端同步 API
│   ├── footprint-api.ts          # 浏览足迹云端同步 API
│   ├── address-api.ts            # 收货地址云端同步 API
│   ├── toast.ts                  # 全局 Toast 工具函数
│   └── util.ts                   # 通用工具函数
│
└── images/                       # 静态资源
    └── icons/                    # 图标（SVG + TabBar PNG）
```

---

## 页面说明

### 主包页面

| 页面 | 路径 | 说明 |
|---|---|---|
| 首页 | `pages/home/home` | 搜索、轮播图、商品分类入口、推荐商品、服务特色、联系方式 |
| 分类 | `pages/category/category` | 二级分类结构，商品列表从 API 获取 |
| 购物车 | `pages/cart/cart` | 已选商品展示，支持修改数量、删除、提交订单 |
| 我的 | `pages/mine/mine` | 用户信息、订单入口、收藏/足迹/地址/客服等功能入口 |

### 分包 A：订单模块

| 页面 | 路径 | 说明 |
|---|---|---|
| 订单列表 | `subpackages/orders/orders/orders` | 按状态筛选订单（待确认、待发货、已发货、已完成、已取消） |
| 订单详情 | `subpackages/orders/order-detail/order-detail` | 订单完整信息展示，支持复购、取消等操作 |

### 分包 B：用户中心 & 商品

| 页面 | 路径 | 说明 |
|---|---|---|
| 商品详情 | `subpackages/user/product-detail/product-detail` | 商品图文详情、加入购物车、收藏 |
| 我的收藏 | `subpackages/user/favorites/favorites` | 收藏商品列表，支持跳转详情、加入购物车 |
| 我的足迹 | `subpackages/user/footprints/footprints` | 浏览历史记录，支持跳转详情、清除足迹 |
| 收货地址 | `subpackages/user/address/address` | 地址管理，支持云端同步与本地缓存 |
| 常见问题 | `subpackages/user/faq/faq` | FAQ 展示 |
| 关于我们 | `subpackages/user/about/about` | 品牌介绍 |

---

## 分包预加载策略

在 `app.json` 中配置了 `preloadRule`，利用页面空闲时间提前下载分包，消除首次跳转延迟：

- 进入**首页**时，预加载分包 B（用户中心 & 商品）
- 进入**我的**时，预加载分包 A（订单）+ 分包 B（用户中心 & 商品）
