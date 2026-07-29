---
name: rebuild-app
description: 重新构建黑马记账应用 — 运行 vite build 编译前端，然后重启服务器
---

# 重新打包黑马记账应用

## 背景

本项目的前端代码在 `src/` 目录，通过 Vite 构建后输出到 `dist/` 目录。
服务器（Express）从 `dist/` 目录加载静态文件提供给浏览器。

## 步骤

1. **构建前端**：在项目根目录运行 `npm run build`（即 `vite build`），将 React 代码编译打包到 `dist/` 目录
2. **重启服务器**：
   - 先杀掉占用 3456 端口的旧进程（`cmd //c "netstat -ano | findstr :3456"` 找到 PID，然后 `cmd //c "taskkill /PID <pid> /F"`）
   - 然后运行 `npm start` 在后台重新启动
3. **验证**：用 curl 请求 `http://localhost:3456/api/bills` 确认服务器正常响应

## 注意事项

- 命令需要在项目根目录 `d:\黑马记账app` 下执行
- 使用 `cmd //c` 前缀执行 Windows 命令
- npm start 放在后台运行，避免阻塞
- 如果端口未被占用，跳过杀进程步骤
