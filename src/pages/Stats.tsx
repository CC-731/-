import { useState, useEffect } from 'react'
import { Card, Statistic, Row, Col, Table, message } from 'antd'
import { WalletOutlined, FileTextOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { CategoryStat } from '../types'
import { getMergedCategories } from '../data/categories'
import { getStats } from '../api'

export default function Stats() {
  const [stats, setStats] = useState<CategoryStat[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await getStats()
      setStats(data)
    } catch (err) {
      message.error('加载统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = stats.reduce((sum, s) => sum + s.total, 0)
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0)

  const getCategoryIcon = (name: string) => {
    return getMergedCategories().find((c) => c.name === name)?.icon || '📦'
  }

  const columns: ColumnsType<CategoryStat> = [
    {
      title: '分类',
      dataIndex: 'category_l1',
      key: 'category_l1',
      render: (name: string) => (
        <span>{getCategoryIcon(name)} {name}</span>
      ),
    },
    {
      title: '笔数',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: 'descend',
      render: (count: number) => `${count} 笔`,
    },
    {
      title: '总金额',
      dataIndex: 'total',
      key: 'total',
      sorter: (a, b) => a.total - b.total,
      render: (total: number) => (
        <span className="amount-text">¥{total.toFixed(2)}</span>
      ),
    },
    {
      title: '占比',
      key: 'percent',
      render: (_: unknown, record: CategoryStat) => {
        const percent = totalAmount > 0 ? (record.total / totalAmount * 100).toFixed(1) : 0
        return `${percent}%`
      },
    },
  ]

  return (
    <div>
      {/* 概览卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="总支出"
              value={totalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#ff4d4f', fontSize: 28, fontWeight: 700 }}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="总笔数"
              value={totalCount}
              prefix={<FileTextOutlined />}
              valueStyle={{ fontSize: 28, fontWeight: 700 }}
              suffix="笔"
            />
          </Card>
        </Col>
      </Row>

      {/* 分类统计表 */}
      <Card title="支出分类统计">
        <Table
          columns={columns}
          dataSource={stats}
          rowKey="category_l1"
          loading={loading}
          locale={{ emptyText: '暂无数据，快去记一笔吧！' }}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  )
}
