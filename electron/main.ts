import { app, BrowserWindow, dialog, shell } from 'electron'
import type { Server } from 'http'
import path from 'path'

const APP_URL = 'http://127.0.0.1:3456'

let mainWindow: BrowserWindow | null = null
let localServer: Server | null = null
let isQuitting = false

// 记账界面不依赖 3D 渲染。关闭硬件加速可避免部分 Windows
// 显卡驱动或精简系统缺少 GPU 运行库时导致整个应用退出。
app.disableHardwareAcceleration()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    title: '黑马记账',
    autoHideMenuBar: true,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  void mainWindow.loadURL(APP_URL)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function startDesktopApp() {
  // 安装目录通常不可写，因此账本必须保存到当前 Windows 用户的数据目录。
  process.env.HEIMAA_DATA_DIR ||= path.join(app.getPath('userData'), 'data')
  process.env.HEIMAA_DIST_DIR ||= path.join(app.getAppPath(), 'dist')

  const { startServer } = await import('../server/server.js')
  localServer = await startServer()
  createWindow()
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(startDesktopApp).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox(
      '黑马记账启动失败',
      `本地服务未能启动：${message}\n\n如果 3456 端口被其他程序占用，请先关闭该程序后重试。`,
    )
    app.quit()
  })
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && localServer) {
    createWindow()
  }
})

app.on('before-quit', () => {
  if (isQuitting) return
  isQuitting = true
  localServer?.close()
})
