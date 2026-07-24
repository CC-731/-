import { useState } from 'react'
import { Select, Space, Tag } from 'antd'
import { categories } from '../data/categories'

interface CategoryPickerProps {
  value?: { category_l1: string; category_l2: string }
  onChange?: (value: { category_l1: string; category_l2: string }) => void
}

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const [selectedL1, setSelectedL1] = useState<string>(value?.category_l1 || '')
  const [selectedL2, setSelectedL2] = useState<string>(value?.category_l2 || '')

  const currentCategory = categories.find((c) => c.name === selectedL1)

  const handleL1Change = (l1: string) => {
    setSelectedL1(l1)
    setSelectedL2('')
    onChange?.({ category_l1: l1, category_l2: '' })
  }

  const handleL2Change = (l2: string) => {
    setSelectedL2(l2)
    onChange?.({ category_l1: selectedL1, category_l2: l2 })
  }

  const getCategoryIcon = (name: string) => {
    return categories.find((c) => c.name === name)?.icon || ''
  }

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        placeholder="选择大类"
        value={selectedL1 || undefined}
        onChange={handleL1Change}
        style={{ width: 200 }}
        options={categories.map((c) => ({
          label: `${c.icon} ${c.name}`,
          value: c.name,
        }))}
      />
      <Select
        placeholder="选择小类"
        value={selectedL2 || undefined}
        onChange={handleL2Change}
        disabled={!selectedL1}
        style={{ width: 200 }}
        options={
          currentCategory?.subs.map((sub) => ({
            label: sub,
            value: sub,
          })) || []
        }
      />
    </Space.Compact>
  )
}

// 用于展示的分类标签（只读模式）
export function CategoryTag({ category_l1, category_l2 }: { category_l1: string; category_l2: string }) {
  const icon = categories.find((c) => c.name === category_l1)?.icon || ''
  return (
    <Tag color="green" className="category-tag">
      {icon} {category_l1} / {category_l2}
    </Tag>
  )
}
