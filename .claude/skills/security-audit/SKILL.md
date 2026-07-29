---
name: security-audit
description: 代码安全审计 — 检查密码泄露、SQL注入、明文敏感信息等安全隐患
argument-hint: "[文件或目录路径]"
---

# 代码安全审计

全面扫描代码中的安全隐患，输出风险分级报告。

## 用户参数

`$ARGUMENTS` 是用户指定的检查范围：
- **不填**：扫描 `src/`、`server/` 以及所有配置文件（`*.json`、`*.env`、`*.yaml`）
- **填文件名**：只检查那个文件
- **填目录**：检查整个目录

---

## 第一步：确定扫描范围

用 Glob 找到目标文件，跳过：
- `node_modules/`、`dist/`、`.git/`
- `*.test.ts`、`*.test.tsx`
- `package-lock.json`

---

## 第二步：六大维度安全扫描

### 🔴 维度一：硬编码敏感信息

**重点**：密码、密钥、Token 直接写在代码里

搜索关键词：`password`、`passwd`、`secret`、`api_key`、`apikey`、`token`、`private_key`、`access_key`

```bash
# 搜索命令
grep -rnE "(password|passwd|secret|api[_-]?key|token|private[_-]?key|access[_-]?key)\s*[=:]\s*['\"]" <目标文件> --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json"
```

**判定标准**：

| ❌ 危险 | ✅ 安全 |
|--------|--------|
| `const PASSWORD = 'admin123'` | `const PASSWORD = process.env.DB_PASSWORD` |
| `apiKey = 'sk-abc123xyz'` | `apiKey = process.env.API_KEY` |
| `secret: 'my-secret-key'` | `secret: process.env.JWT_SECRET` |

**关注文件**：`server/database.ts`、`server/server.ts`、`*.config.ts`、`*.env`、`settings.json`

---

### 🔴 维度二：SQL 注入风险

**重点**：拼接字符串构造 SQL 语句

**危险模式识别**：

```typescript
// ❌ 危险 —— 字符串拼接
const sql = `SELECT * FROM users WHERE name = '${userInput}'`
const sql = "SELECT * FROM bills WHERE id = " + id

// ✅ 安全 —— 参数化查询
const stmt = db.prepare('SELECT * FROM bills WHERE id = ?')
stmt.bind([id])
```

**检查对象**：`server/database.ts` 中所有 SQL 语句、任何使用 `db.run()`、`db.exec()` 的地方

**判定**：
- 使用参数化查询（`?` 占位符 + `stmt.bind()`）→ ✅ 安全
- 用字符串模板或 `+` 拼接用户输入 → ❌ 高危
- 用户输入没有经过校验直接拼入 SQL → ❌ 高危

---

### 🔴 维度三：配置文件明文敏感信息

**重点**：`.env`、`.json`、`.yaml` 配置文件中是否直接写了密码

**检查文件**：`.env`、`.env.local`、`.env.production`、`settings.json`、`settings.local.json`、`*.config.ts`

**检查内容**：
- 数据库密码
- API 密钥
- JWT 签名密钥
- 第三方服务凭证

**判定**：
- 配置文件中出现 `password: "123456"` → ❌ 高危
- `.env` 未加入 `.gitignore` → 🟡 中危
- 示例配置文件中有真实密码 → ❌ 高危

---

### 🟡 维度四：输入校验缺失

**重点**：用户输入的数据有没有"安检"

**检查项**：

| 检查点 | 说明 | 示例 |
|--------|------|------|
| API 参数校验 | Express 接口对请求体做了校验吗？ | `req.body.amount` 有没有检查是数字？ |
| 金额校验 | 金额允许负数吗？允许超大值吗？ | `amount: -99999` 应该被拦截 |
| 字符串长度 | 备注/名称有没有长度限制？ | `note` 传入 10000 个字符会怎样？ |
| 特殊字符 | 输入特殊字符会不会出错？ | `<script>alert('xss')</script>` |

**关注文件**：`server/server.ts` 中的路由处理函数

---

### 🟡 维度五：信息泄露

**重点**：错误信息有没有把系统内部细节暴露出去

**检查项**：

| ❌ 危险 | ✅ 安全 |
|--------|--------|
| 错误信息包含数据库路径 | `res.status(500).json({ error: '加载失败' })` |
| 错误信息包含表结构 | 不暴露内部错误细节 |
| 错误信息包含堆栈跟踪 | 只返回用户友好的提示 |

---

### 🟢 维度六：依赖安全

**重点**：检查是否有已知漏洞的依赖

**操作**：运行 `npm audit` 查看依赖安全报告

---

## 第三步：输出审计报告

```
🔒 安全审计报告 — 2026-XX-XX

┌─────────────────────────────────────────────┐
│  📊 风险总览                                 │
│  🔴 高危：X 个                               │
│  🟡 中危：X 个                               │
│  🟢 低危：X 个                               │
│  安全评分：XX / 100                          │
└─────────────────────────────────────────────┘

🔴 高危（立即修复）：
  • [文件:行号] 问题：xxx
    风险：xxx
    修复：xxx

🟡 中危（建议修复）：
  • [文件:行号] 问题：xxx
    风险：xxx
    修复：xxx

🟢 低危（可选修复）：
  • [文件:行号] 建议：xxx
```

**风险等级定义**：

| 等级 | 标准 | 例子 |
|------|------|------|
| 🔴 高危 | 可直接导致数据泄露或被攻击 | 数据库密码写在代码里、SQL 注入 |
| 🟡 中危 | 可能间接导致安全问题 | 输入没校验、错误信息暴露路径 |
| 🟢 低危 | 不良实践，暂无直接危害 | 依赖有已知漏洞但当前未受影响 |

---

## 注意事项

- 用中文输出报告，每一项问题都要解释**攻击者可能怎么做**（帮助小白理解为什么要修）
- 每个发现都要附带具体的**修复代码**，不要只写"建议修复"
- 不要把 `node_modules/` 里的问题报告给用户
- `npm audit` 的结果要筛选，只报告高危和中危的依赖问题
