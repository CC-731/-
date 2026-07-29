import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, Popconfirm, message, Tag, Space, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getUserCategories, addUserCategory, updateUserCategory, deleteUserCategory } from '../api'
import { refreshMergedCategories, categories as presetCategories } from '../data/categories'
import type { UserCategory } from '../types'

/**
 * 分类管理页面
 *
 * 通俗解释：除了 10 个预设分类（餐饮、交通...），你可以在这里添加自己的分类。
 * 比如"投资"、"宠物"，每个人都有自己独特的花钱方向。
 *
 * 功能：
 *   - 查看预设分类（带🔒锁图标，不能修改删除）
 *   - 添加自定义分类（选图标、取名字、添加小类）
 *   - 修改/删除自定义分类
 *   - 删除自定义分类后，该分类下的账单自动迁移到"其他"
 */

// 可供选择的 emoji 图标列表
const EMOJI_LIST = [
  '🍽️', '🚗', '🛒', '🏠', '🎮', '🏥', '📚', '📱', '👗', '📦',
  '📌', '💰', '💳', '💡', '🎯', '⭐', '💼', '🎵', '🌟', '🏃',
  '🎁', '🐱', '🐶', '🌱', '☕', '🍕', '🎓', '✈️', '🎸', '🎨',
  '⚽', '🏆', '💊', '🛵', '📸', '🎧', '🌍', '🎪', '🏕️', '💎',
]

export default function CategoryManage() {
  const [userCategories, setUserCategories] = useState<UserCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null)
  const [form] = Form.useForm()
  // 编辑时的小类列表
  const [subs, setSubs] = useState<string[]>([])
  const [subInput, setSubInput] = useState('')
  // 选中的图标
  const [selectedIcon, setSelectedIcon] = useState('📌')

  // 加载用户分类
  const loadUserCategories = async () => {
    setLoading(true)
    try {
      const data = await getUserCategories()
      setUserCategories(data)
    } catch {
      message.error('加载分类失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUserCategories()
  }, [])

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingCategory(null)
    form.resetFields()
    setSubs([])
    setSubInput('')
    setSelectedIcon('📌')
    setModalOpen(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: UserCategory) => {
    setEditingCategory(record)
    form.setFieldsValue({ name: record.name })
    setSubs([...record.subs])
    setSubInput('')
    setSelectedIcon(record.icon)
    setModalOpen(true)
  }

  // 添加小类
  const handleAddSub = () => {
    const trimmed = subInput.trim()
    if (!trimmed) return
    if (subs.includes(trimmed)) {
      message.warning('小类名称不能重复')
      return
    }
    setSubs([...subs, trimmed])
    setSubInput('')
  }

  // 删除小类
  const handleRemoveSub = (index: number) => {
    setSubs(subs.filter((_, i) => i !== index))
  }

  // 提交（新增或编辑）
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (subs.length === 0) {
        message.warning('请至少添加一个小类')
        return
      }

      if (editingCategory) {
        // 编辑模式
        await updateUserCategory(editingCategory.id, {
          name: values.name,
          icon: selectedIcon,
          subs,
          oldName: editingCategory.name,
        })
        message.success('分类已更新')
      } else {
        // 新增模式
        await addUserCategory({
          name: values.name,
          icon: selectedIcon,
          subs,
        })
        message.success('分类已添加')
      }

      setModalOpen(false)
      // 刷新页面数据和全局缓存
      await loadUserCategories()
      await refreshMergedCategories()
    } catch (err: unknown) {
      const saveErrMsg = err instanceof Error ? err.message : '保存分类失败'
      message.error(saveErrMsg)
    }
  }

  // 删除分类
  const handleDelete = async (id: number) => {
    try {
      await deleteUserCategory(id)
      message.success('分类已删除，相关账单已移至「📦 其他」')
      await loadUserCategories()
      await refreshMergedCategories()
    } catch (err: unknown) {
      const delErrMsg = err instanceof Error ? err.message : '删除分类失败'
      message.error(delErrMsg)
    }
  }

  // 表格列定义
  const columns: ColumnsType<UserCategory> = [
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 60,
      render: (icon: string) => <span style={{ fontSize: 24 }}>{icon}</span>,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '二级小类',
      dataIndex: 'subs',
      key: 'subs',
      render: (subs: string[]) => (
        <Space size={4} wrap>
          {subs.map((sub) => (
            <Tag key={sub} color="green">{sub}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: UserCategory) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此分类？"
            description={`「${record.name}」下的所有账单将自动移至「📦 其他」`}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 预设分类 */}
      <Card
        title="📌 预设分类（不可修改）"
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {presetCategories.map((cat) => (
            <Card
              key={cat.name}
              size="small"
              style={{ width: 280, background: '#fafafa', border: '1px solid #e8e8e8' }}
              title={
                <span>
                  {cat.icon} {cat.name}
                  <Tooltip title="预设分类，不可修改">
                    <LockOutlined style={{ marginLeft: 8, color: '#bbb', fontSize: 12 }} />
                  </Tooltip>
                </span>
              }
            >
              <Space size={4} wrap>
                {cat.subs.map((sub) => (
                  <Tag key={sub} color="blue">{sub}</Tag>
                ))}
              </Space>
            </Card>
          ))}
        </div>
      </Card>

      {/* 我的自定义分类 */}
      <Card
        title="📝 我的分类"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增分类
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={userCategories}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: '还没有自定义分类，点击上方按钮新增' }}
          size="middle"
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editingCategory ? '保存修改' : '添加'}
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="分类名称"
            name="name"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 10, message: '分类名称最多 10 个字' },
            ]}
          >
            <Input placeholder="例如：投资、宠物、咖啡..." maxLength={10} />
          </Form.Item>

          {/* 图标选择器 */}
          <Form.Item label="选择图标">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {EMOJI_LIST.map((emoji) => (
                <span
                  key={emoji}
                  onClick={() => setSelectedIcon(emoji)}
                  style={{
                    fontSize: 24,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: 6,
                    border: selectedIcon === emoji ? '2px solid #00B96B' : '2px solid transparent',
                    background: selectedIcon === emoji ? '#f6ffed' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {emoji}
                </span>
              ))}
            </div>
            <div style={{ color: '#888', fontSize: 12 }}>
              当前选中：<span style={{ fontSize: 20 }}>{selectedIcon}</span>
            </div>
          </Form.Item>

          {/* 小类编辑区 */}
          <Form.Item label="二级小类" required>
            {/* 已添加的小类 */}
            <div style={{ marginBottom: 8, minHeight: 32 }}>
              {subs.length === 0 ? (
                <span style={{ color: '#ccc' }}>请在下框输入小类名称，回车添加</span>
              ) : (
                <Space size={4} wrap>
                  {subs.map((sub, index) => (
                    <Tag
                      key={`${sub}-${index}`}
                      closable
                      onClose={() => handleRemoveSub(index)}
                      color="green"
                    >
                      {sub}
                    </Tag>
                  ))}
                </Space>
              )}
            </div>
            {/* 输入框 */}
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onPressEnter={handleAddSub}
                placeholder="输入小类名称，回车添加"
                maxLength={10}
              />
              <Button onClick={handleAddSub} type="primary" ghost>
                添加
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
