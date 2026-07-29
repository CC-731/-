/**
 * 账单数据类型
 *
 * 注意：字段名使用 snake_case（如 category_l1、created_at）是为了与数据库列名
 * 保持一致，避免前后端字段名映射混淆。这是有意为之的设计决策，而非疏忽。
 */
export interface Bill {
  /** 账单唯一 ID（数据库自动生成） */
  id: number
  /** 金额（人民币元） */
  amount: number
  /** 日期，格式 YYYY-MM-DD */
  date: string
  /** 一级分类名，如"餐饮"、"交通" */
  category_l1: string
  /** 二级分类名，如"午餐"、"地铁" */
  category_l2: string
  /** 备注（可选，最长 200 字） */
  note: string
  /** 创建时间，数据库自动填充 */
  created_at: string
}

// 分类统计类型
export interface CategoryStat {
  category_l1: string
  count: number
  total: number
}

// 用户自定义分类类型
export interface UserCategory {
  id: number
  name: string
  icon: string
  subs: string[]
  created_at: string
  updated_at: string
}

/**
 * Electron API 类型声明
 *
 * ⚠️ 暂未启用：Electron 桌面打包因国内网络限制暂时搁置。
 * 详见 CLAUDE.md 开发日志（2026-07-24），保留此声明以便未来恢复时快速接入。
 *
 * 当前项目以浏览器 + Express 服务器模式运行，不需要此类型。
 */
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

// 扩展 Window 接口（仅 Electron 模式使用）
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
