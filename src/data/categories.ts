// 支出两级分类数据
export interface SubCategory {
  name: string
}

export interface Category {
  name: string
  icon: string
  subs: string[]
}

export const categories: Category[] = [
  {
    name: '餐饮',
    icon: '🍽️',
    subs: ['早餐', '午餐', '晚餐', '零食', '饮品', '外卖', '聚餐'],
  },
  {
    name: '交通',
    icon: '🚗',
    subs: ['公交', '地铁', '打车', '加油', '停车', '火车/高铁', '飞机'],
  },
  {
    name: '购物',
    icon: '🛒',
    subs: ['日用品', '数码产品', '家居用品', '书籍', '美妆护肤'],
  },
  {
    name: '居住',
    icon: '🏠',
    subs: ['房租', '水电', '物业', '维修', '日用品'],
  },
  {
    name: '娱乐',
    icon: '🎮',
    subs: ['电影', '游戏', '旅游', '运动健身', 'KTV/酒吧'],
  },
  {
    name: '医疗',
    icon: '🏥',
    subs: ['门诊', '药品', '体检', '住院'],
  },
  {
    name: '教育',
    icon: '📚',
    subs: ['培训', '书籍', '考试报名', '学费'],
  },
  {
    name: '通讯',
    icon: '📱',
    subs: ['话费', '网费', '快递'],
  },
  {
    name: '服饰',
    icon: '👗',
    subs: ['衣服', '鞋子', '包包', '配饰'],
  },
  {
    name: '其他',
    icon: '📦',
    subs: ['人情往来', '宠物', '投资理财', '其他杂项'],
  },
]

// ====== 分类合并：预设 + 用户自定义 ======

import { getUserCategories } from '../api'

// 合并缓存，初始只包含预设分类
let mergedCache: Category[] = [...categories]

// 获取合并后的分类（同步，返回缓存值）
export function getMergedCategories(): Category[] {
  return mergedCache
}

// 刷新合并分类缓存（异步，从数据库拉取用户分类并与预设合并）
export async function refreshMergedCategories(): Promise<Category[]> {
  try {
    const userCategories = await getUserCategories()
    const userConverted: Category[] = userCategories.map((uc) => ({
      name: uc.name,
      icon: uc.icon,
      subs: uc.subs,
    }))
    mergedCache = [...categories, ...userConverted]
  } catch {
    // 加载失败时保留预设分类
    mergedCache = [...categories]
  }
  return mergedCache
}

// 直接获取合并分类（异步，不依赖缓存）
export async function getAllCategories(): Promise<Category[]> {
  try {
    const userCategories = await getUserCategories()
    const userConverted: Category[] = userCategories.map((uc) => ({
      name: uc.name,
      icon: uc.icon,
      subs: uc.subs,
    }))
    return [...categories, ...userConverted]
  } catch {
    return [...categories]
  }
}
