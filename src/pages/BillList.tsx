import { useState, useEffect, useCallback } from 'react'
import { Table, Tag, Button, Popconfirm, message, Select, Space, Card } from 'antd'
import { DeleteOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import type { ColumnsType } from 'antd/es/table'
import { Bill } from '../types'
import { getMergedCategories, refreshMergedCategories } from '../data/categories'
import type { Category } from '../data/categories'
import { CategoryTag } from '../components/CategoryPicker'
import { getBills, deleteBill } from '../api'

export default function BillList() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(false)
  const [mergedCategories, setMergedCategories] = useState<Category[]>([])
  const [filterCategory, setFilterCategory] = useState<string | undefined>()

  useEffect(() => {
    refreshMergedCategories().then(setMergedCategories)
  }, [])

  const loadBills = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBills(
        filterCategory ? { category_l1: filterCategory } : undefined
      )
      setBills(data)
    } catch (err) {
      message.error('加载账单失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterCategory])

  useEffect(() => {
    loadBills()
  }, [loadBills])

  const handleDelete = async (id: number) => {
    try {
      await deleteBill(id)
      message.success('删除成功')
      loadBills()
    } catch (err) {
      message.error('删除失败')
    }
  }

  // 计算总金额
  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0)

  // 导出 Excel
  const handleExport = () => {
    if (bills.length === 0) {
      message.warning('没有数据可以导出')
      return
    }

    const exportData = bills.map((bill) => ({
      '日期': bill.date,
      '一级分类': bill.category_l1,
      '二级分类': bill.category_l2,
      '金额（元）': bill.amount,
      '备注': bill.note || '',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    // 设置列宽
    ws['!cols'] = [
      { wch: 14 },  // 日期
      { wch: 10 },  // 一级分类
      { wch: 10 },  // 二级分类
      { wch: 12 },  // 金额
      { wch: 30 },  // 备注
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '账单明细')

    const fileName = `黑马记账_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    message.success('导出成功！')
  }

  const columns: ColumnsType<Bill> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend',
      render: (date: string) => <span style={{ whiteSpace: 'nowrap' }}>{date}</span>,
    },
    {
      title: '分类',
      key: 'category',
      width: 200,
      render: (_: unknown, record: Bill) => (
        <CategoryTag category_l1={record.category_l1} category_l2={record.category_l2} />
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number) => (
        <span className="amount-text">¥{amount.toFixed(2)}</span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      render: (note: string) => note || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: Bill) => (
        <Popconfirm
          title="确定删除这条记录？"
          description="删除后无法恢复"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      {/* 顶部操作栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <Space>
          <Select
            placeholder="按大类筛选"
            value={filterCategory}
            onChange={setFilterCategory}
            allowClear
            style={{ width: 180 }}
            options={mergedCategories.map((c) => ({
              label: `${c.icon} ${c.name}`,
              value: c.name,
            }))}
          />
          <Button icon={<ReloadOutlined />} onClick={loadBills}>
            刷新
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport} type="primary" ghost>
            导出 Excel
          </Button>
        </Space>

        <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <span style={{ color: '#52c41a', fontWeight: 500 }}>
            共 {bills.length} 条记录，合计{' '}
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#ff4d4f' }}>
            ¥{totalAmount.toFixed(2)}
          </span>
        </Card>
      </div>

      {/* 账单表格 */}
      <Table
        columns={columns}
        dataSource={bills}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: '还没有账单记录，快去记一笔吧！' }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50'],
          defaultPageSize: 20,
        }}
        size="middle"
      />
    </div>
  )
}
