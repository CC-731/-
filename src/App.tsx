/**
 * 黑马记账 — 应用根组件
 *
 * 通俗解释：这是整个 App 的"骨架"，左侧是导航菜单，右侧是对应的页面内容。
 * 就像一本书的目录和正文一样：左边点导航，右边显示对应页面。
 *
 * 包含 5 个页面：
 *   - 账单列表（首页）— 查看所有记账记录
 *   - 记一笔 — 添加新账单
 *   - 统计 — 按分类查看支出汇总
 *   - 分类管理 — 添加/修改/删除自定义分类
 *   - 贪吃蛇 — 小游戏彩蛋
 */
import { useState } from 'react'
import { Layout, Menu } from 'antd'
import {
  PlusCircleOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import AddBill from './pages/AddBill'
import BillList from './pages/BillList'
import Stats from './pages/Stats'
import CategoryManage from './pages/CategoryManage'
import SnakeGame from './pages/SnakeGame'

const { Header, Content, Sider } = Layout

type Page = 'add' | 'list' | 'stats' | 'categories' | 'game'

/** 应用根组件 — 左侧菜单 + 右侧内容区的布局容器 */
export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('list')

  const menuItems = [
    { key: 'list', icon: <UnorderedListOutlined />, label: '账单列表' },
    { key: 'add', icon: <PlusCircleOutlined />, label: '记一笔' },
    { key: 'stats', icon: <PieChartOutlined />, label: '统计' },
    { key: 'categories', icon: <AppstoreOutlined />, label: '分类管理' },
    { key: 'game', icon: <span>🐍</span>, label: '贪吃蛇' },
  ]

  const renderPage = () => {
    switch (currentPage) {
      case 'add':
        return <AddBill onSuccess={() => setCurrentPage('list')} />
      case 'list':
        return <BillList />
      case 'stats':
        return <Stats />
      case 'categories':
        return <CategoryManage />
      case 'game':
        return <SnakeGame />
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 'bold',
          color: '#00B96B',
          borderBottom: '1px solid #f0f0f0',
        }}>
          🐎 黑马记账
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          onClick={({ key }) => setCurrentPage(key as Page)}
          items={menuItems}
          style={{ marginTop: 8, borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          fontSize: 16,
          fontWeight: 500,
        }}>
          {menuItems.find((m) => m.key === currentPage)?.label}
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  )
}
