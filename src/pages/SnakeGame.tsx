import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, Button, Select, Space, Tag, Divider } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, TrophyOutlined } from '@ant-design/icons'

// ====== 游戏配置 ======
const COLS = 20        // 列数
const ROWS = 20        // 行数
const CELL = 20        // 每格像素
const WIDTH = COLS * CELL
const HEIGHT = ROWS * CELL
const TOTAL_CELLS = COLS * ROWS

// 难度对应的速度（毫秒/步）
const SPEED_MAP: Record<string, number> = {
  easy: 150,
  normal: 100,
  hard: 60,
}

// 方向对应的坐标偏移
const DIR_MAP: Record<string, { dx: number; dy: number }> = {
  ArrowUp:    { dx: 0, dy: -1 },
  ArrowDown:  { dx: 0, dy: 1 },
  ArrowLeft:  { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
}

type Point = { x: number; y: number }
type GameStatus = 'idle' | 'playing' | 'paused' | 'over'

// 初始蛇的位置（从中间开始）
const INIT_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
]

// 随机生成食物，避开蛇身
function spawnFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`))
  const freeCount = TOTAL_CELLS - snake.length

  // 如果只剩少量空位，直接收集空闲格子而不是随机重试
  if (freeCount < TOTAL_CELLS / 4) {
    const free: Point[] = []
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (!occupied.has(`${x},${y}`)) {
          free.push({ x, y })
        }
      }
    }
    if (free.length > 0) {
      return free[Math.floor(Math.random() * free.length)]
    }
    // 棋盘满了，理论上不会到这里
    return { x: 0, y: 0 }
  }

  // 正常情况：随机生成
  let food: Point
  let attempts = 0
  const maxAttempts = 1000
  do {
    food = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    }
    attempts++
  } while (occupied.has(`${food.x},${food.y}`) && attempts < maxAttempts)

  return food
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const snakeRef = useRef<Point[]>(INIT_SNAKE)
  const foodRef = useRef<Point>(spawnFood(INIT_SNAKE))
  const dirRef = useRef<{ dx: number; dy: number }>({ dx: 1, dy: 0 })
  const nextDirRef = useRef<{ dx: number; dy: number }>({ dx: 1, dy: 0 })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 用 ref 保存最高分，避免过期闭包问题
  const highScoreRef = useRef(0)

  const [status, setStatus] = useState<GameStatus>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    try {
      const val = localStorage.getItem('snake_high')
      if (val === null) return 0
      const num = parseInt(val, 10)
      return isNaN(num) ? 0 : num
    } catch {
      return 0
    }
  })

  // 同步 highScore 到 ref，确保 gameOver 能读到最新值
  useEffect(() => {
    highScoreRef.current = highScore
  }, [highScore])

  const [difficulty, setDifficulty] = useState('normal')

  // ====== 定时器 ======
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  // ====== 游戏结束 ======
  const gameOver = useCallback(() => {
    stopTimer()
    setStatus('over')
    // 从 ref 读取最新最高分，避免过期闭包
    const currentHigh = highScoreRef.current
    // 从蛇的长度计算当前分数
    const currentScore = (snakeRef.current.length - INIT_SNAKE.length) * 10
    setScore(currentScore)
    if (currentScore > currentHigh) {
      setHighScore(currentScore)
      highScoreRef.current = currentScore
      try { localStorage.setItem('snake_high', String(currentScore)) } catch { /* ignore */ }
    }
  }, [stopTimer])

  // ====== 画蛇 ======
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const snake = snakeRef.current
    const food = foodRef.current

    // 清空画布
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // 画网格线（淡色）
    ctx.strokeStyle = '#16213e'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, HEIGHT); ctx.stroke()
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(WIDTH, i * CELL); ctx.stroke()
    }

    // 画食物（红色圆形）—— 使用 save/restore 隔离阴影效果
    ctx.save()
    ctx.fillStyle = '#ff4757'
    ctx.shadowColor = '#ff4757'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 画蛇
    snake.forEach((p, i) => {
      const alpha = 1 - i / (snake.length + 5)
      ctx.fillStyle = i === 0 ? '#2ed573' : `rgba(46, 213, 115, ${alpha.toFixed(2)})`
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2)

      // 蛇头画眼睛
      if (i === 0) {
        ctx.fillStyle = '#fff'
        const cx = p.x * CELL + CELL / 2
        const cy = p.y * CELL + CELL / 2
        const d = dirRef.current
        const ex = cx + d.dx * 4
        const ey = cy + d.dy * 4
        ctx.beginPath()
        ctx.arc(ex - d.dy * 3, ey - d.dx * 3, 3, 0, Math.PI * 2)
        ctx.arc(ex + d.dy * 3, ey + d.dx * 3, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }, [])

  // ====== 移动一步 ======
  const step = useCallback(() => {
    const snake = snakeRef.current
    const dir = nextDirRef.current
    dirRef.current = dir

    const head = snake[0]
    const newHead: Point = { x: head.x + dir.dx, y: head.y + dir.dy }

    // 检测撞墙
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      gameOver()
      return
    }

    // 检测撞自己：新头部不能和蛇身（不含尾巴，因为尾巴会移走）重叠
    const tail = snake[snake.length - 1]
    const tailWillMove = newHead.x !== tail.x || newHead.y !== tail.y
    if (tailWillMove && snake.slice(0, -1).some((p) => p.x === newHead.x && p.y === newHead.y)) {
      gameOver()
      return
    }

    // 移动
    const newSnake = [newHead, ...snake]
    const ate = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y

    if (ate) {
      snakeRef.current = newSnake
      foodRef.current = spawnFood(newSnake)
      // 从蛇的长度计算分数
      setScore((newSnake.length - INIT_SNAKE.length) * 10)
    } else {
      newSnake.pop()
      snakeRef.current = newSnake
    }

    draw()
  }, [draw, gameOver])

  const startTimer = useCallback(() => {
    // 先清除旧定时器，避免重复
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    timerRef.current = setInterval(step, SPEED_MAP[difficulty] || 100)
  }, [difficulty, step])

  // ====== 键盘 ======
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dir = DIR_MAP[e.key]
      if (!dir) return

      // 阻止页面滚动
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }

      const current = dirRef.current
      // 禁止反向（不能直接掉头）
      if (dir.dx === -current.dx && dir.dy === -current.dy) return

      nextDirRef.current = dir
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ====== 按钮操作 ======
  const startGame = () => {
    stopTimer()
    // 重置
    snakeRef.current = INIT_SNAKE.map((p) => ({ ...p }))
    foodRef.current = spawnFood(INIT_SNAKE)
    dirRef.current = { dx: 1, dy: 0 }
    nextDirRef.current = { dx: 1, dy: 0 }
    setScore(0)
    setStatus('playing')
    draw()
    startTimer()
  }

  const pauseGame = () => {
    stopTimer()
    setStatus('paused')
  }

  const resumeGame = () => {
    setStatus('playing')
    startTimer()
  }

  const restartGame = () => {
    startGame()
  }

  // ====== 清理 ======
  useEffect(() => {
    return () => stopTimer()
  }, [stopTimer])

  // ====== 初始绘制 ======
  useEffect(() => {
    draw()
  }, [draw])

  // 状态对应的控制按钮
  const statusButtons: Record<GameStatus, React.ReactNode> = {
    idle: (
      <Button type="primary" icon={<PlayCircleOutlined />} onClick={startGame} block>
        开始游戏
      </Button>
    ),
    playing: (
      <Button icon={<PauseCircleOutlined />} onClick={pauseGame} block>
        暂停
      </Button>
    ),
    paused: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={resumeGame} block>
          继续
        </Button>
        <Button icon={<ReloadOutlined />} onClick={restartGame} block>
          重新开始
        </Button>
      </Space>
    ),
    over: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', color: '#ff4757', fontSize: 16, fontWeight: 'bold' }}>
          💀 游戏结束
        </div>
        <Button type="primary" icon={<ReloadOutlined />} onClick={restartGame} block>
          再来一局
        </Button>
      </Space>
    ),
  }

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* 游戏画布 */}
      <Card
        size="small"
        title="🎮 贪吃蛇"
        style={{ borderRadius: 8 }}
      >
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{
            display: 'block',
            borderRadius: 6,
            border: '2px solid #2ed573',
            background: '#1a1a2e',
          }}
        />
      </Card>

      {/* 控制面板 */}
      <Card
        size="small"
        title="控制面板"
        style={{ width: 220, borderRadius: 8 }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 分数 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#888' }}>当前分数</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2ed573' }}>{score}</div>
          </div>

          {/* 最高分 */}
          <div style={{ textAlign: 'center' }}>
            <Tag icon={<TrophyOutlined />} color="gold" style={{ fontSize: 13, padding: '2px 12px' }}>
              最高分：{highScore}
            </Tag>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* 难度选择 */}
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>难度</div>
            <Select
              value={difficulty}
              onChange={setDifficulty}
              disabled={status === 'playing'}
              style={{ width: '100%' }}
              options={[
                { value: 'easy', label: '🐢 简单' },
                { value: 'normal', label: '🐎 普通' },
                { value: 'hard', label: '⚡ 困难' },
              ]}
            />
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* 操作按钮 */}
          <div style={{ textAlign: 'center' }}>
            {statusButtons[status]}
          </div>
        </Space>
      </Card>

      {/* 操作说明 */}
      <Card size="small" title="操作说明" style={{ width: 200, borderRadius: 8 }}>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 2 }}>
          <div>⬆️⬇️⬅️➡️ 方向键</div>
          <div>或 W A S D 控制方向</div>
          <Divider style={{ margin: '8px 0' }} />
          <div>🟢 绿色方块 = 蛇</div>
          <div>🔴 红色圆点 = 食物</div>
          <div>🏁 碰到墙壁 / 自己 = 结束</div>
        </div>
      </Card>
    </div>
  )
}
