import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db: SqlJsDatabase
let dbPath: string

function saveDatabase() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

export async function initDatabase() {
  const userDataDir = path.join(__dirname, '..', 'data')
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true })
  }
  dbPath = path.join(userDataDir, 'heimaa-accounting.db')

  const SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

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

  db.run(`CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_bills_category_l1 ON bills(category_l1)`)

  // 用户自定义分类表
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

  saveDatabase()
}

export function getBills(filter?: { category_l1?: string }) {
  let sql = 'SELECT * FROM bills'
  const params: any[] = []

  if (filter?.category_l1) {
    sql += ' WHERE category_l1 = ?'
    params.push(filter.category_l1)
  }

  sql += ' ORDER BY date DESC, id DESC'

  const stmt = db.prepare(sql)
  stmt.bind(params)

  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()

  return results
}

export function addBill(bill: {
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
  const lastInsertRowid = result[0]?.values[0]?.[0] as number || 0

  saveDatabase()
  return { lastInsertRowid }
}

export function deleteBill(id: number) {
  db.run('DELETE FROM bills WHERE id = ?', [id])
  saveDatabase()
  return { changes: 1 }
}

export function getCategoryStats() {
  const stmt = db.prepare(`
    SELECT category_l1, COUNT(*) as count, SUM(amount) as total
    FROM bills
    GROUP BY category_l1
    ORDER BY total DESC
  `)

  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()

  return results
}

// 预设分类名称（用于校验，防止用户分类与预设分类重名）
const PRESET_CATEGORY_NAMES = [
  '餐饮', '交通', '购物', '居住', '娱乐', '医疗', '教育', '通讯', '服饰', '其他',
]

// 获取所有用户自定义分类
export function getUserCategories() {
  const stmt = db.prepare('SELECT * FROM user_categories ORDER BY id ASC')
  const results: any[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    // subs 字段在数据库中是 JSON 字符串，解析为数组
    row.subs = JSON.parse(row.subs as string)
    results.push(row)
  }
  stmt.free()
  return results
}

// 新增用户自定义分类
export function addUserCategory(data: {
  name: string
  icon: string
  subs: string[]
}) {
  // 校验：不能与预设分类重名
  if (PRESET_CATEGORY_NAMES.includes(data.name)) {
    throw new Error(`「${data.name}」是预设分类，不能重复创建`)
  }

  db.run(
    `INSERT INTO user_categories (name, icon, subs)
     VALUES (?, ?, ?)`,
    [data.name, data.icon, JSON.stringify(data.subs)]
  )

  const result = db.exec('SELECT last_insert_rowid() as id')
  const lastInsertRowid = result[0]?.values[0]?.[0] as number || 0

  saveDatabase()
  return { lastInsertRowid }
}

// 更新用户自定义分类（含改名）
export function updateUserCategory(
  id: number,
  data: { name: string; icon: string; subs: string[]; oldName: string }
) {
  // 如果改了名字，校验新名不能与预设分类重名
  if (data.name !== data.oldName && PRESET_CATEGORY_NAMES.includes(data.name)) {
    throw new Error(`「${data.name}」是预设分类，不能使用此名称`)
  }

  // 如果改了名字，同步更新所有账单中的分类名（方案 A）
  if (data.name !== data.oldName) {
    db.run('UPDATE bills SET category_l1 = ? WHERE category_l1 = ?', [
      data.name,
      data.oldName,
    ])
  }

  db.run(
    `UPDATE user_categories
     SET name = ?, icon = ?, subs = ?, updated_at = datetime('now', 'localtime')
     WHERE id = ?`,
    [data.name, data.icon, JSON.stringify(data.subs), id]
  )

  saveDatabase()
  return { changes: 1 }
}

// 删除用户自定义分类
export function deleteUserCategory(id: number) {
  // 先查出该分类的名称
  const stmt = db.prepare('SELECT name FROM user_categories WHERE id = ?')
  stmt.bind([id])
  let categoryName = ''
  if (stmt.step()) {
    categoryName = (stmt.getAsObject() as any).name as string
  }
  stmt.free()

  if (!categoryName) {
    throw new Error('分类不存在')
  }

  // 将该分类下的账单迁移到「其他」（方案 B）
  db.run(
    `UPDATE bills SET category_l1 = '其他', category_l2 = '其他杂项'
     WHERE category_l1 = ?`,
    [categoryName]
  )

  // 删除该分类
  db.run('DELETE FROM user_categories WHERE id = ?', [id])

  saveDatabase()
  return { changes: 1 }
}
