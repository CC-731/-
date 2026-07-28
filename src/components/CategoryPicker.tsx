import { useState, useEffect } from 'react'
import { Select, Space, Tag } from 'antd'
import { categories as presetCategories, getMergedCategories, refreshMergedCategories } from '../data/categories'
import type { Category } from '../data/categories'

interface CategoryPickerProps {
  value?: { category_l1: string; category_l2: string }
  onChange?: (value: { category_l1: string; category_l2: string }) => void
  categories?: Category[]  // 可选：外部传入的合并分类
}

export default function CategoryPicker({ value, onChange, categories }: CategoryPickerProps) {
  const [selectedL1, setSelectedL1] = useState<string>(value?.category_l1 || '')
  const [selectedL2, setSelectedL2] = useState<string>(value?.category_l2 || '')
  const [merged, setMerged] = useState<Category[]>(categories || getMergedCategories())

  // 如果外部传入了 categories，使用外部数据；否则自己加载
  useEffect(() => {
    if (categories) {
      setMerged(categories)
    } else {
      refreshMergedCategories().then(setMerged)
    }
  }, [categories])

  // 当外部 value 变化时同步内部状态
  useEffect(() => {
    setSelectedL1(value?.category_l1 || '')
    setSelectedL2(value?.category_l2 || '')
  }, [value])

  const currentCategory = merged.find((c) => c.name === selectedL1)

  const handleL1Change = (l1: string) => {
    setSelectedL1(l1)
    setSelectedL2('')
    onChange?.({ category_l1: l1, category_l2: '' })
  }

  const handleL2Change = (l2: string) => {
    setSelectedL2(l2)
    onChange?.({ category_l1: selectedL1, category_l2: l2 })
  }

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        placeholder="选择大类"
        value={selectedL1 || undefined}
        onChange={handleL1Change}
        style={{ width: 200 }}
        options={merged.map((c) => ({
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
export function CategoryTag({
  category_l1,
  category_l2,
}: {
  category_l1: string
  category_l2: string
}) {
  const merged = getMergedCategories()
  const icon = merged.find((c) => c.name === category_l1)?.icon || ''
  return (
    <Tag color="green" className="category-tag">
      {icon} {category_l1} / {category_l2}
    </Tag>
  )
}
