/**
 * 黑马记账 — 前端入口文件
 *
 * 这里是整个 React 应用的"大门"。
 * 做的事：挂载根组件 App，配置 Ant Design 中文环境和全局主题色。
 *
 * 通俗理解：就像开店前的准备工作——挂招牌、调灯光、铺地毯，
 * 然后把顾客（用户）引进来交给 App 这个"大堂经理"接待。
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './styles/global.css'

/**
 * 渲染 React 应用到 DOM。
 *
 * 配置说明：
 * - zhCN：Ant Design 组件显示中文（按钮、日期选择器等）
 * - colorPrimary '#00B96B'：绿色主题（与记账理财的感觉契合）
 * - borderRadius 8：圆角卡片风格
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#00B96B',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
