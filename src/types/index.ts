// 账单数据类型
export interface Bill {
  id: number
  amount: number
  date: string
  category_l1: string
  category_l2: string
  note: string
  created_at: string
}

// 分类统计类型
export interface CategoryStat {
  category_l1: string
  count: number
  total: number
}

// Electron API 类型声明
export interface ElectronAPI {
  getBills: (filter?: { category_l1?: string }) => Promise<Bill[]>
  addBill: (bill: {
    amount: number
    date: string
    category_l1: string
    category_l2: string
    note?: string
  }) => Promise<{ lastInsertRowid: number }>
  deleteBill: (id: number) => Promise<{ changes: number }>
  getStats: () => Promise<CategoryStat[]>
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
