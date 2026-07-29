/**
 * 黑马记账 — 数据库操作模块
 *
 * 基于 sql.js（SQLite 的 JavaScript 实现），所有数据存储在本地文件。
 * 包含账单的增删查、分类统计、用户自定义分类的完整 CRUD 操作。
 *
 * 每次写操作后都会调用 saveDatabase() 将内存数据库持久化到磁盘，
 * 确保数据不会因进程重启而丢失。
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db: SqlJsDatabase
let dbPath: string

/**
 * 将内存中的数据库完整导出并写入磁盘文件。
 * 每次写操作（增/删/改）后调用，保证数据持久化。
 */
function saveDatabase() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

/**
 * 初始化数据库连接。
 *
 * 如果本地已有数据库文件则读取，否则创建新的空数据库。
 * 自动创建 bills 和 user_categories 两张表（如果不存在），
 * 以及日期和分类的查询索引。
 *
 * 通俗理解：就像打开一个记账本，如果之前有就翻开继续写，
 * 没有就买一本新的并画好表格。
 */
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

/**
 * 查询账单列表。
 *
 * @param filter - 可选的筛选条件，支持按一级分类过滤
 * @returns 按日期倒序排列的账单数组（最新的在前）
 *
 * 通俗理解：翻看记账本，可以只看某一类（如"餐饮"），也可以看全部。
 */
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

/**
 * 新增一笔账单记录。
 *
 * @param bill - 账单信息对象，包含金额、日期、两级分类和可选备注
 * @returns 包含新账单自增 ID 的对象 `{ lastInsertRowid }`
 *
 * 通俗理解：在记账本上写下一笔新的开销。
 */
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

/**
 * 根据 ID 删除一笔账单。
 *
 * @param id - 要删除的账单主键 ID
 * @returns `{ changes: 1 }` 表示已删除
 *
 * 通俗理解：用橡皮擦掉记账本上的一条记录。
 */
export function deleteBill(id: number) {
  db.run('DELETE FROM bills WHERE id = ?', [id])
  saveDatabase()
  return { changes: 1 }
}

/**
 * 按一级分类汇总统计支出。
 *
 * @returns 每个一级分类的账单笔数、总金额，按总金额降序排列
 *
 * 通俗理解：把记账本按类别分组，看看"餐饮花了多少、交通花了多少"。
 */
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

/**
 * 获取所有用户自定义分类。
 *
 * @returns 用户分类数组，每条记录的 subs 字段已从 JSON 字符串解析为数组
 *
 * 通俗理解：读取你自己添加的那些"个性化分类"列表。
 */
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

/**
 * 新增一个用户自定义分类。
 *
 * @param data - 分类信息：名称（唯一）、图标 emoji、二级小类列表
 * @returns 包含新分类自增 ID 的对象
 * @throws 如果分类名与预设分类（餐饮、交通等 10 个）重名，抛出错误
 *
 * 通俗理解：在记账本的分类表里加一个你自己命名的类别。
 */
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

/**
 * 更新用户自定义分类（含改名功能）。
 *
 * 如果改了分类名，会自动把所有账单中旧的分类名替换为新名（方案 A：同步更新）。
 *
 * @param id - 要更新的分类主键 ID
 * @param data - 新数据：名称、图标、小类列表、旧名称
 * @returns `{ changes: 1 }` 表示已更新
 * @throws 如果新名称与预设分类重名，抛出错误
 *
 * 通俗理解：修改你自己创建的类别，比如把"健身"改成"运动"，
 * 之前记在"健身"下的账单会自动跟着改过去。
 */
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

/**
 * 删除用户自定义分类，并将该分类下的所有账单迁移到「其他 → 其他杂项」。
 *
 * 这样设计是为了避免删除分类后，历史账单的分类字段变成空白（方案 B：兜底迁移）。
 *
 * @param id - 要删除的分类主键 ID
 * @returns `{ changes: 1 }` 表示已删除
 * @throws 如果分类不存在，抛出错误
 *
 * 通俗理解：你删掉了一个自定义类别后，原来归在这个类别下的账单
 * 不会丢失，而是自动归到"其他"里面去。
 */
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
