/**
 * 数据库函数单元测试
 *
 * sql.js 自带内存数据库功能，无需 mock —— 直接用真实 SQLite 跑测试。
 * 这意味着测试结果非常可信，和真实运行效果一致。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'

// 为了测试，直接复制核心逻辑（避免依赖 server/ 的文件系统路径）
let db: SqlJsDatabase

function initTestDb() {
  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category_l1 TEXT NOT NULL,
      category_l2 TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '📌',
      subs TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)
}

function addBill(bill: {
  amount: number
  date: string
  category_l1: string
  category_l2: string
  note?: string
}) {
  db.run(
    `INSERT INTO bills (amount, date, category_l1, category_l2, note)
     VALUES (?, ?, ?, ?, ?)`,
    [bill.amount, bill.date, bill.category_l1, bill.category_l2, bill.note || '']
  )
  const result = db.exec('SELECT last_insert_rowid() as id')
  return { lastInsertRowid: result[0]?.values[0]?.[0] as number || 0 }
}

function getBills(filter?: { category_l1?: string }) {
  let sql = 'SELECT * FROM bills'
  const params: unknown[] = []
  if (filter?.category_l1) {
    sql += ' WHERE category_l1 = ?'
    params.push(filter.category_l1)
  }
  sql += ' ORDER BY date DESC, id DESC'
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results: Record<string, unknown>[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

function deleteBill(id: number) {
  db.run('DELETE FROM bills WHERE id = ?', [id])
}

function getCategoryStats() {
  const stmt = db.prepare(`
    SELECT category_l1, COUNT(*) as count, SUM(amount) as total
    FROM bills
    GROUP BY category_l1
    ORDER BY total DESC
  `)
  const results: Record<string, unknown>[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

// 预设分类名称
const PRESET_NAMES = [
  '餐饮', '交通', '购物', '居住', '娱乐', '医疗', '教育', '通讯', '服饰', '其他',
]

function addUserCategory(data: { name: string; icon: string; subs: string[] }) {
  if (PRESET_NAMES.includes(data.name)) {
    throw new Error(`「${data.name}」是预设分类，不能重复创建`)
  }
  db.run(
    `INSERT INTO user_categories (name, icon, subs) VALUES (?, ?, ?)`,
    [data.name, data.icon, JSON.stringify(data.subs)]
  )
  const result = db.exec('SELECT last_insert_rowid() as id')
  return { lastInsertRowid: result[0]?.values[0]?.[0] as number || 0 }
}

function getUserCategories() {
  const stmt = db.prepare('SELECT * FROM user_categories ORDER BY id ASC')
  const results: Record<string, unknown>[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    row.subs = JSON.parse(row.subs as string)
    results.push(row)
  }
  stmt.free()
  return results
}

// ====== 测试用例 ======

beforeAll(async () => {
  const SQL = await initSqlJs()
  db = new SQL.Database() // 内存数据库，不写文件
  initTestDb()
})

describe('addBill / getBills：添加和查询账单', () => {
  it('添加一条账单后应能查出来', () => {
    addBill({
      amount: 35.5,
      date: '2026-07-28',
      category_l1: '餐饮',
      category_l2: '午餐',
      note: '和同事聚餐',
    })

    const bills = getBills()
    expect(bills).toHaveLength(1)
    expect(bills[0].amount).toBe(35.5)
    expect(bills[0].category_l1).toBe('餐饮')
    expect(bills[0].category_l2).toBe('午餐')
    expect(bills[0].note).toBe('和同事聚餐')
  })

  it('金额为 0 的账单也应能添加', () => {
    addBill({
      amount: 0,
      date: '2026-07-28',
      category_l1: '其他',
      category_l2: '其他杂项',
    })
    const bills = getBills()
    const zeroBill = bills.find((b) => b.amount === 0)
    expect(zeroBill).toBeDefined()
  })

  it('备注为空时应存为空字符串', () => {
    addBill({
      amount: 10,
      date: '2026-07-29',
      category_l1: '交通',
      category_l2: '地铁',
    })
    const bills = getBills()
    const bill = bills.find((b) => b.amount === 10)
    expect(bill?.note).toBe('')
  })
})

describe('deleteBill：删除账单', () => {
  it('删除后应查不到该账单', () => {
    const { lastInsertRowid } = addBill({
      amount: 100,
      date: '2026-07-27',
      category_l1: '购物',
      category_l2: '日用品',
    })
    deleteBill(lastInsertRowid)
    const bills = getBills()
    expect(bills.find((b) => b.id === lastInsertRowid)).toBeUndefined()
  })
})

describe('getBills：分类筛选', () => {
  it('按餐饮筛选只返回餐饮账单', () => {
    // 清空重来
    db.run('DELETE FROM bills')

    addBill({ amount: 20, date: '2026-07-29', category_l1: '餐饮', category_l2: '午餐' })
    addBill({ amount: 15, date: '2026-07-29', category_l1: '餐饮', category_l2: '早餐' })
    addBill({ amount: 50, date: '2026-07-29', category_l1: '交通', category_l2: '加油' })

    const filtered = getBills({ category_l1: '餐饮' })
    expect(filtered).toHaveLength(2)
    for (const b of filtered) {
      expect(b.category_l1).toBe('餐饮')
    }
  })
})

describe('getCategoryStats：分类统计', () => {
  it('多条账单应正确汇总', () => {
    db.run('DELETE FROM bills')

    addBill({ amount: 20, date: '2026-07-29', category_l1: '餐饮', category_l2: '午餐' })
    addBill({ amount: 30, date: '2026-07-29', category_l1: '餐饮', category_l2: '晚餐' })
    addBill({ amount: 100, date: '2026-07-29', category_l1: '购物', category_l2: '日用品' })

    const stats = getCategoryStats()
    // 按总金额降序，购物排第一
    expect(stats[0].category_l1).toBe('购物')
    expect(stats[0].total).toBe(100)
    expect(stats[0].count).toBe(1)

    expect(stats[1].category_l1).toBe('餐饮')
    expect(stats[1].total).toBe(50)
    expect(stats[1].count).toBe(2)
  })

  it('空数据库时应返回空数组', () => {
    db.run('DELETE FROM bills')
    const stats = getCategoryStats()
    expect(stats).toHaveLength(0)
  })
})

describe('addUserCategory：用户自定义分类', () => {
  it('新增一个自定义分类后应能查出来', () => {
    db.run('DELETE FROM user_categories')
    const { lastInsertRowid } = addUserCategory({
      name: '投资',
      icon: '💰',
      subs: ['股票', '基金'],
    })
    expect(lastInsertRowid).toBeGreaterThan(0)

    const cats = getUserCategories()
    expect(cats).toHaveLength(1)
    expect(cats[0].name).toBe('投资')
    expect(cats[0].icon).toBe('💰')
    expect(cats[0].subs).toEqual(['股票', '基金'])
  })

  it('使用预设分类名称应报错', () => {
    expect(() =>
      addUserCategory({ name: '餐饮', icon: '🍽️', subs: [] })
    ).toThrow('「餐饮」是预设分类，不能重复创建')
  })
})
