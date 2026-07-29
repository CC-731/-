import { describe, it, expect, vi, beforeEach } from 'vitest'

// 模拟 fetch 全局函数
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { getBills, addBill, deleteBill, getStats, getUserCategories } from './index'

function mockResponse(data: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(data),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('getBills：获取账单列表', () => {
  it('请求地址应为 /api/bills', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    await getBills()
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3456/api/bills')
  })

  it('传入分类筛选时，地址应包含编码后的分类名', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    await getBills({ category_l1: '餐饮' })
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3456/api/bills?category_l1=%E9%A4%90%E9%A5%AE'
    )
  })

  it('服务器返回错误时应抛出异常', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, false))
    await expect(getBills()).rejects.toThrow('加载失败')
  })
})

describe('addBill：添加账单', () => {
  it('应使用 POST 方法发送 JSON 数据', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ lastInsertRowid: 5 }))
    const bill = {
      amount: 35.5,
      date: '2026-07-28',
      category_l1: '餐饮',
      category_l2: '午餐',
      note: '测试',
    }
    const result = await addBill(bill)

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3456/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bill),
    })
    expect(result.lastInsertRowid).toBe(5)
  })
})

describe('deleteBill：删除账单', () => {
  it('应使用 DELETE 方法', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(undefined))
    await deleteBill(3)
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3456/api/bills/3', {
      method: 'DELETE',
    })
  })

  it('删除失败时应抛出异常', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, false))
    await expect(deleteBill(99)).rejects.toThrow('删除失败')
  })
})

describe('getStats：获取统计数据', () => {
  it('请求地址应为 /api/stats', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    await getStats()
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3456/api/stats')
  })
})

describe('getUserCategories：获取用户自定义分类', () => {
  it('请求地址应为 /api/user-categories', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    await getUserCategories()
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3456/api/user-categories')
  })
})
