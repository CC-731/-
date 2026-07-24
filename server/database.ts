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
