/**
 * 黑马记账 - 启动脚本
 *
 * 工作流程：
 * 1. 启动 Node.js 服务器（处理数据库和 API）
 * 2. 在系统默认浏览器中打开应用
 */
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { startServer } from './server/server.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SERVER_URL = 'http://localhost:3456'

// 根据操作系统选择打开浏览器的命令
function getOpenCommand(): { cmd: string; args: string[] } {
  if (process.platform === 'win32') {
    return { cmd: 'cmd', args: ['/c', 'start', SERVER_URL] }
  } else if (process.platform === 'darwin') {
    return { cmd: 'open', args: [SERVER_URL] }
  } else {
    return { cmd: 'xdg-open', args: [SERVER_URL] }
  }
}

async function main() {
  console.log('🐎 黑马记账 启动中...\n')

  // 1. 启动服务器
  console.log('[1/2] 启动数据服务器...')
  await startServer()

  // 2. 在浏览器中打开
  console.log('[2/2] 打开浏览器...')
  const { cmd, args } = getOpenCommand()
  spawn(cmd, args, {
    stdio: 'ignore',
    detached: true,
  }).unref()

  console.log(`\n✅ 黑马记账已启动: ${SERVER_URL}`)
  console.log('   浏览器应该已自动打开')
  console.log('   关闭此窗口即可停止服务器\n')
  console.log('   按 Ctrl+C 停止\n')

  // 保持服务器运行
  process.on('SIGINT', () => {
    console.log('\n服务器已停止。')
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('启动失败:', err)
  process.exit(1)
})
