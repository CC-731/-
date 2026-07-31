/**
 * 黑马记账 — Express 服务器
 *
 * 职责：
 *   1. 提供 REST API（账单 CRUD + 分类统计 + 用户自定义分类管理）
 *   2. 托管前端静态文件（Vite 构建产物的 dist/ 目录）
 *   3. SPA 回退路由（所有非 API 请求返回 index.html，由前端 React 处理）
 *
 * 启动命令：npm start（调用 start.ts）或 npm run server（直接启动）
 * 默认端口：3456
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import type { Server } from 'http'
import { fileURLToPath } from 'url'
import { initDatabase, getBills, addBill, deleteBill, getCategoryStats, getUserCategories, addUserCategory, updateUserCategory, deleteUserCategory } from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3456
const HOST = '127.0.0.1'

app.use(cors())
app.use(express.json())

// 提供前端静态文件
const distPath = process.env.HEIMAA_DIST_DIR
  ? path.resolve(process.env.HEIMAA_DIST_DIR)
  : path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// ====== REST API ======

// 获取所有账单
app.get('/api/bills', (req, res) => {
  try {
    const category = req.query.category_l1 as string | undefined
    const bills = getBills(category ? { category_l1: category } : undefined)
    res.json(bills)
  } catch (err: unknown) {
    console.error('加载账单失败:', err instanceof Error ? err.message : String(err))
    res.status(500).json({ error: '加载账单失败' })
  }
})

// 添加账单
app.post('/api/bills', (req, res) => {
  try {
    const { amount, date, category_l1, category_l2, note } = req.body

    // 必填字段检查
    if (!date || !category_l1 || !category_l2) {
      return res.status(400).json({ error: '请填写完整信息' })
    }

    // 金额必须是大於 0 的数字（typeof 检查防止传入字符串）
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: '金额必须是大于 0 的数字' })
    }

    // 金额上限：防止超大值
    if (amount > 999999.99) {
      return res.status(400).json({ error: '金额超出允许范围' })
    }

    // 备注长度限制：防止超大文本（前端限制 200，服务端兜底限制 500）
    if (typeof note === 'string' && note.length > 500) {
      return res.status(400).json({ error: '备注不能超过 500 个字符' })
    }

    const result = addBill({ amount, date, category_l1, category_l2, note })
    res.json(result)
  } catch (err: unknown) {
    console.error('添加账单失败:', err instanceof Error ? err.message : String(err))
    res.status(500).json({ error: '添加账单失败' })
  }
})

// 删除账单
app.delete('/api/bills/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const result = deleteBill(id)
    res.json(result)
  } catch (err: unknown) {
    console.error('删除账单失败:', err instanceof Error ? err.message : String(err))
    res.status(500).json({ error: '删除账单失败' })
  }
})

// 获取分类统计
app.get('/api/stats', (_req, res) => {
  try {
    const stats = getCategoryStats()
    res.json(stats)
  } catch (err: unknown) {
    console.error('加载统计失败:', err instanceof Error ? err.message : String(err))
    res.status(500).json({ error: '加载统计失败' })
  }
})

// ====== 用户分类管理 API ======

// 获取所有用户自定义分类
app.get('/api/user-categories', (_req, res) => {
  try {
    const categories = getUserCategories()
    res.json(categories)
  } catch (err: unknown) {
    console.error('加载分类失败:', err instanceof Error ? err.message : String(err))
    res.status(500).json({ error: '加载分类失败' })
  }
})

// 新增用户自定义分类
app.post('/api/user-categories', (req, res) => {
  try {
    const { name, icon, subs } = req.body
    if (!name || !subs || subs.length === 0) {
      return res.status(400).json({ error: '请填写分类名称和至少一个小类' })
    }
    const result = addUserCategory({ name, icon: icon || '📌', subs })
    res.json(result)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : '新增分类失败'
    console.error('新增分类失败:', errMsg)
    res.status(400).json({ error: errMsg })
  }
})

// 更新用户自定义分类
app.put('/api/user-categories/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { name, icon, subs, oldName } = req.body
    if (!name || !subs || subs.length === 0) {
      return res.status(400).json({ error: '请填写分类名称和至少一个小类' })
    }
    const result = updateUserCategory(id, {
      name,
      icon: icon || '📌',
      subs,
      oldName: oldName || name,
    })
    res.json(result)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : '更新分类失败'
    console.error('更新分类失败:', errMsg)
    res.status(400).json({ error: errMsg })
  }
})

// 删除用户自定义分类
app.delete('/api/user-categories/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const result = deleteUserCategory(id)
    res.json(result)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : '删除分类失败'
    console.error('删除分类失败:', errMsg)
    res.status(400).json({ error: errMsg })
  }
})

// SPA（单页应用，Single Page Application）回退路由
// 通俗解释：当用户在浏览器直接访问某个路径（比如刷新页面），
// 浏览器会向服务器请求这个路径。但服务器上并没有对应的文件，
// 所以把所有请求都"兜底"返回 index.html，由前端 React 来决定显示哪个页面。
// 就像一栋大楼只有一个大门，不管你去几楼，都从这个门进去，再由里面的前台引导你。
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

/**
 * 启动服务器。
 *
 * 先初始化数据库连接，然后监听 3456 端口。
 * 返回一个 Promise，在服务器就绪后 resolve。
 *
 * 通俗理解：打开收银台，准备好记账本，开始接待顾客。
 */
export async function startServer() {
  await initDatabase()
  return new Promise<Server>((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`黑马记账本地服务已启动: http://${HOST}:${PORT}`)
      resolve(server)
    })
    server.once('error', reject)
  })
}

/**
 * 获取服务器端口号。
 *
 * @returns 当前配置的端口号（默认 3456）
 *
 * 通俗理解：告诉你"收银台在几号窗口"。
 */
export function getPort() {
  return PORT
}

// 当直接运行此文件时，启动服务器
const isMainModule = process.argv[1]?.includes('server')
if (isMainModule) {
  startServer().then(() => {
    console.log('按 Ctrl+C 停止服务器')
  }).catch((err) => {
    console.error('服务器启动失败:', err)
    process.exit(1)
  })
}
