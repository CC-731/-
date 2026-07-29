import { useState, useEffect } from 'react'
import { Select, Space, Tag } from 'antd'
import { categories as presetCategories, getMergedCategories, refreshMergedCategories } from '../data/categories'
import type { Category } from '../data/categories'

interface CategoryPickerProps {
  /** 当前选中的分类（一级 + 二级），受控组件的值 */
  value?: { category_l1: string; category_l2: string }
  /** 选中分类变化时的回调，传出新的一级+二级分类 */
  onChange?: (value: { category_l1: string; category_l2: string }) => void
  /** 可选：外部传入的合并分类列表（预设 + 用户自定义），不传则组件自动加载 */
  categories?: Category[]
}

/**
 * 两级分类联动选择器
 *
 * 通俗解释：两个下拉框连在一起 —— 选了"餐饮"后第二个框自动显示"午餐、晚餐..."。
 * 第一个框选一级分类（如：餐饮、交通），第二个框跟随显示二级分类（如：午餐、地铁）。
 *
 * 使用方式：
 *   <CategoryPicker
 *     value={{ category_l1: '餐饮', category_l2: '午餐' }}
 *     onChange={(val) => console.log(val.category_l1, val.category_l2)}
 *   />
 */
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

/**
 * 分类标签（只读展示）
 *
 * 通俗解释：在账单列表中显示"🍽️ 餐饮 / 午餐"这样的绿色标签，
 * 只是展示分类信息，不能点击修改。和上面的 CategoryPicker（可选择）是配套的。
 */
export function CategoryTag({
  category_l1,
  category_l2,
}: {
  /** 一级分类名 */
  category_l1: string
  /** 二级分类名 */
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
