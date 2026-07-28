// API 客户端 - 与后端服务器通信
const API_BASE = 'http://localhost:3456/api'

import type { Bill, CategoryStat, UserCategory } from '../types'

export async function getBills(filter?: { category_l1?: string }): Promise<Bill[]> {
  const params = filter?.category_l1
    ? `?category_l1=${encodeURIComponent(filter.category_l1)}`
    : ''
  const res = await fetch(`${API_BASE}/bills${params}`)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

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

export async function deleteBill(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/bills/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除失败')
}

export async function getStats(): Promise<CategoryStat[]> {
  const res = await fetch(`${API_BASE}/stats`)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

// ====== 用户分类管理 ======

export async function getUserCategories(): Promise<UserCategory[]> {
  const res = await fetch(`${API_BASE}/user-categories`)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

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

export async function deleteUserCategory(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/user-categories/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '删除失败')
  }
}
