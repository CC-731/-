import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, getBills, addBill, deleteBill, getCategoryStats } from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3456

app.use(cors())
app.use(express.json())

// 提供前端静态文件
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// ====== REST API ======

// 获取所有账单
app.get('/api/bills', (req, res) => {
  try {
    const category = req.query.category_l1 as string | undefined
    const bills = getBills(category ? { category_l1: category } : undefined)
    res.json(bills)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '加载账单失败' })
  }
})

// 添加账单
app.post('/api/bills', (req, res) => {
  try {
    const { amount, date, category_l1, category_l2, note } = req.body
    if (!amount || !date || !category_l1 || !category_l2) {
      return res.status(400).json({ error: '请填写完整信息' })
    }
    const result = addBill({ amount, date, category_l1, category_l2, note })
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '添加账单失败' })
  }
})

// 删除账单
app.delete('/api/bills/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const result = deleteBill(id)
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '删除账单失败' })
  }
})

// 获取分类统计
app.get('/api/stats', (_req, res) => {
  try {
    const stats = getCategoryStats()
    res.json(stats)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '加载统计失败' })
  }
})

// SPA 回退
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// 启动服务器
export async function startServer() {
  await initDatabase()
  return new Promise<void>((resolve) => {
    app.listen(PORT, () => {
      console.log(`黑马记账服务器已启动: http://localhost:${PORT}`)
      resolve()
    })
  })
}

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
