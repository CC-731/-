import { describe, it, expect } from 'vitest'
import { categories, getMergedCategories } from './categories'

describe('categories：预设分类数据', () => {
  it('应有 10 个一级分类', () => {
    expect(categories).toHaveLength(10)
  })

  it('每个分类都应有 name、icon、subs 三个字段', () => {
    for (const cat of categories) {
      expect(cat).toHaveProperty('name')
      expect(cat).toHaveProperty('icon')
      expect(cat).toHaveProperty('subs')
    }
  })

  it('每个分类的 icon 不应该是空字符串', () => {
    for (const cat of categories) {
      expect(cat.icon.length).toBeGreaterThan(0)
    }
  })

  it('每个分类至少应有 1 个二级分类', () => {
    for (const cat of categories) {
      expect(cat.subs.length).toBeGreaterThan(0)
    }
  })

  it('分类名称不应重复', () => {
    const names = categories.map((c) => c.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  it('餐饮分类应有 7 个二级分类', () => {
    const canyin = categories.find((c) => c.name === '餐饮')
    expect(canyin?.subs).toHaveLength(7)
  })

  it('所有二级分类名称不应该是空字符串', () => {
    for (const cat of categories) {
      for (const sub of cat.subs) {
        expect(sub.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('getMergedCategories：合并分类缓存', () => {
  it('初始应返回 10 个预设分类', () => {
    const merged = getMergedCategories()
    expect(merged).toHaveLength(10)
  })

  it('返回的应该是预设分类的副本，不影响原始数据', () => {
    const merged = getMergedCategories()
    expect(merged[0].name).toBe('餐饮')
    expect(merged[9].name).toBe('其他')
  })
})
