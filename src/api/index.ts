/**
 * API 客户端 — 前端与后端服务器通信的桥梁
 *
 * 通俗解释：这些函数就像"邮递员"，
 * 负责把前端的请求送到后端服务器，再把服务器返回的数据带回来。
 *
 * 服务器地址：http://localhost:3456/api
 */
const API_BASE = 'http://localhost:3456/api'

import type { Bill, CategoryStat, UserCategory } from '../types'

/**
 * 获取账单列表
 *
 * 通俗解释：从"数据仓库"里把之前记的所有花销拿出来。
 *
 * @param filter - 可选的筛选条件
 *   - category_l1: 按一级分类（如"餐饮"）筛选，不传则返回全部账单
 * @returns 账单数组，每条包含金额、日期、分类、备注等
 * @throws 服务器连接失败时抛出异常
 *
 * 使用示例：
 *   const 全部 = await getBills()                        // 获取全部账单
 *   const 餐饮 = await getBills({ category_l1: '餐饮' })  // 只看餐饮类
 */
export async function getBills(filter?: { category_l1?: string }): Promise<Bill[]> {
  const params = filter?.category_l1
    ? `?category_l1=${encodeURIComponent(filter.category_l1)}`
    : ''
  const res = await fetch(`${API_BASE}/bills${params}`)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

/**
 * 添加一笔新账单
 *
 * 通俗解释：把一笔花销"登记"到数据库里。
 *
 * @param bill - 账单信息
 *   - amount: 金额（元），必须 > 0
 *   - date: 日期，格式 YYYY-MM-DD
 *   - category_l1: 一级分类名
 *   - category_l2: 二级分类名
 *   - note: 备注（可选）
 * @returns 返回新账单的 ID
 * @throws 添加失败时抛出异常
 */
export async function addBill(bill: {
  amount: number
  date: string
  category_l1: string
  category_l2: string
  note?: string
}): Promise<{ lastInsertRowid: number }> {
  const res = await fetch(`${API_BASE}/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '添加失败')
  }
  return res.json()
}

/**
 * 删除一条账单记录
 *
 * 通俗解释：删掉一笔记错的或不需要的花销。
 *
 * @param id - 账单的唯一编号（不是数组下标，是创建时返回的那个 ID）
 * @throws 删除失败时抛出异常
 */
export async function deleteBill(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/bills/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除失败')
}

/**
 * 获取分类统计数据
 *
 * 通俗解释：把账单按分类汇总，返回"餐饮花了多少、交通花了多少"这样的统计结果。
 *
 * @returns 每个一级分类的笔数、总金额，按金额从高到低排序
 */
export async function getStats(): Promise<CategoryStat[]> {
  const res = await fetch(`${API_BASE}/stats`)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

// ====== 用户自定义分类管理 API ======
// 除了 10 个预设分类，用户可以添加自己的分类（如"投资"、"宠物"）

/**
 * 获取所有用户自定义分类
 *
 * 通俗解释：从数据库拉取用户自己添加的分类列表（不含预设的 10 个）。
 *
 * @returns 用户自定义分类数组
 */
export async function getUserCategories(): Promise<UserCategory[]> {
  const res = await fetch(`${API_BASE}/user-categories`)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

/**
 * 新增一个用户自定义分类
 *
 * 通俗解释：创建一个新的支出分类（如"投资"），包含图标和二级小类列表。
 *
 * @param data - 分类定义
 *   - name: 分类名称，不能与预设分类重名
 *   - icon: 图标（Emoji），如"💰"
 *   - subs: 二级小类名称数组，如 ["股票", "基金"]
 * @returns 返回新分类的 ID
 * @throws 与预设分类重名时抛出异常
 */
export async function addUserCategory(data: {
  name: string
  icon: string
  subs: string[]
}): Promise<{ lastInsertRowid: number }> {
  const res = await fetch(`${API_BASE}/user-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '新增失败')
  }
  return res.json()
}

/**
 * 更新用户自定义分类
 *
 * 通俗解释：修改一个之前创建的分类（改名、改图标、增减小类）。
 *
 * @param id - 要修改的分类 ID
 * @param data
 *   - name: 新的分类名称
 *   - icon: 新的图标
 *   - subs: 新的二级小类列表
 *   - oldName: 原来的分类名称（用于数据库中同步改名）
 * @throws 新名与预设分类重名时抛出异常
 */
export async function updateUserCategory(
  id: number,
  data: { name: string; icon: string; subs: string[]; oldName: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/user-categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '更新失败')
  }
}

/**
 * 删除一个用户自定义分类
 *
 * 通俗解释：删掉用户自己添加的分类。该分类下的账单会自动迁移到"其他"分类。
 *
 * @param id - 要删除的分类 ID
 * @throws 分类不存在时抛出异常
 */
export async function deleteUserCategory(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/user-categories/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '删除失败')
  }
}
