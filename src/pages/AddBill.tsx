import { useState } from 'react'
import { Form, Input, InputNumber, DatePicker, Button, message, Card } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import CategoryPicker from '../components/CategoryPicker'
import { addBill as apiAddBill } from '../api'
import dayjs from 'dayjs'

// 简单日期格式化（不依赖外部库）
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface AddBillProps {
  onSuccess?: () => void
}

export default function AddBill({ onSuccess }: AddBillProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categoryValue, setCategoryValue] = useState<{
    category_l1: string
    category_l2: string
  }>({ category_l1: '', category_l2: '' })

  const handleSubmit = async (values: {
    amount: number
    date: any
    note?: string
  }) => {
    if (!categoryValue.category_l1 || !categoryValue.category_l2) {
      message.warning('请选择支出分类')
      return
    }

    setLoading(true)
    try {
      const dateStr = values.date
        ? formatDate(values.date.toDate())
        : formatDate(new Date())

      await apiAddBill({
        amount: values.amount,
        date: dateStr,
        category_l1: categoryValue.category_l1,
        category_l2: categoryValue.category_l2,
        note: values.note || '',
      })

      message.success('记账成功！')
      form.resetFields()
      setCategoryValue({ category_l1: '', category_l2: '' })
      onSuccess?.()
    } catch (err) {
      message.error('记账失败，请重试')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ maxWidth: 500, margin: '0 auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          date: dayjs(),
          amount: undefined,
          note: '',
        }}
      >
        <Form.Item
          label="💰 金额（元）"
          name="amount"
          rules={[
            { required: true, message: '请输入金额' },
            { type: 'number', min: 0.01, message: '金额必须大于0' },
          ]}
        >
          <InputNumber
            placeholder="花了多少钱？"
            style={{ width: '100%' }}
            precision={2}
            min={0.01}
            max={999999.99}
            size="large"
            prefix="¥"
          />
        </Form.Item>

        <Form.Item
          label="📅 日期"
          name="date"
          rules={[{ required: true, message: '请选择日期' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            size="large"
            placeholder="选择日期"
          />
        </Form.Item>

        <Form.Item
          label="📂 分类"
          required
        >
          <CategoryPicker
            value={categoryValue}
            onChange={(val) => setCategoryValue(val)}
          />
        </Form.Item>

        <Form.Item
          label="📝 备注（可选）"
          name="note"
        >
          <Input.TextArea
            placeholder="备注信息，比如买了什么..."
            rows={2}
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
            size="large"
            block
          >
            记录这笔花销
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
