# LegionMind Schema Reference

完整的三文件 Schema 定义和格式规范。

---

## Table of Contents

1. [config.json Schema](#configjson-schema)
2. [plan.md Schema](#planmd-schema)
3. [context.md Schema](#contextmd-schema)
4. [tasks.md Schema](#tasksmd-schema)
5. [Format Rules](#format-rules)
6. [Validation & Auto-Fix](#validation--auto-fix)

---

## config.json Schema

全局配置文件，管理任务列表和当前状态。

### Structure

```json
{
  "$schema": "./config.schema.json",
  "version": "1.0.0",
  "currentTask": "task-id-here",
  "settings": {
    "autoRemind": true,
    "remindBeforeReset": true
  },
  "tasks": [
    {
      "id": "task-id",
      "name": "任务显示名",
      "status": "active",
      "createdAt": "2025-12-12T10:00:00Z",
      "updatedAt": "2025-12-12T14:30:00Z"
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Schema version ("1.0.0") |
| `currentTask` | string \| null | No | Active task ID; `null` = no active task |
| `settings.autoRemind` | boolean | Yes | Remind on .legion detection |
| `settings.remindBeforeReset` | boolean | Yes | Remind before session end |
| `tasks` | array | Yes | Task list |
| `tasks[].id` | string | Yes | Task ID (directory name) |
| `tasks[].name` | string | Yes | Display name (supports Chinese) |
| `tasks[].status` | enum | Yes | `active`/`paused`/`completed`/`archived` |
| `tasks[].createdAt` | ISO8601 | Yes | Creation timestamp |
| `tasks[].updatedAt` | ISO8601 | Yes | Last update timestamp |

### Status Rules

- 同一时刻最多一个任务为 `active`
- `active` 任务的 `id` 必须等于 `currentTask`
- `currentTask = null` 时，所有任务状态不得为 `active`

---

## plan.md Schema

任务计划文件，用于 Review 和理解任务全貌。

### Structure

```markdown
# {任务显示名}

## 目标

一句话说清楚要做什么，不超过 2-3 句。

## 要点

- **关键词1**: 描述
- **关键词2**: 描述
- **关键词3**: 描述

## 范围

将改动以下文件/模块：

- `path/to/file1.ts` - 作用说明
- `path/to/dir/` - 目录作用说明

## 阶段概览

1. **阶段名1** - 简要描述
2. **阶段名2** - 简要描述
3. **阶段名3** - 简要描述

---

*创建于: YYYY-MM-DD | 最后更新: YYYY-MM-DD*
```

### Section Reference

| Section | Required | Format | Notes |
|---------|----------|--------|-------|
| 标题 | Yes | `# {任务名}` | 使用任务显示名 |
| 目标 | Yes | `## 目标` | 不超过 3 句话 |
| 要点 | Yes | `## 要点` | Bullet list, 每项 `**关键词**: 描述` |
| 范围 | Yes | `## 范围` | 文件/目录列表带说明 |
| 阶段概览 | Yes | `## 阶段概览` | Numbered list, `**阶段名** - 描述` |
| 元信息 | Yes | `---\n*创建于...*` | 日期格式 YYYY-MM-DD |

### Format Rules

1. **要点部分**：不超过 7 个要点
2. **范围部分**：使用 code 格式标记文件路径
3. **阶段概览**：使用有序列表，粗体阶段名

---

## context.md Schema

工作上下文文件，用于交接和恢复。

### Structure

```markdown
# {任务显示名} - 上下文

## 会话进展 (YYYY-MM-DD)

### ✅ 已完成

- 完成项描述
- 完成项描述

### 🟡 进行中

- 当前工作描述
- 文件: `path/to/file.ts`

### ⚠️ 阻塞/待定

- 阻塞原因或待确认事项

---

## 关键文件

**`path/to/file1.ts`** [状态]
- 作用：文件作用描述
- 注意：注意事项

**`path/to/file2.ts`** [状态]
- 作用：文件作用描述
- 注意：注意事项

---

## 关键决策

| 决策 | 原因 | 替代方案 | 日期 |
|------|------|----------|------|
| 决策内容 | 原因说明 | 考虑过的替代方案 | YYYY-MM-DD |

---

## 技术约束

- 约束条件 1
- 约束条件 2

---

## 相关链接

- 链接描述: `path/or/url`

---

## 快速交接

**下次继续从这里开始：**

1. 具体步骤 1
2. 具体步骤 2
3. 具体步骤 3

**注意事项：**

- 注意点 1
- 注意点 2

---

*最后更新: YYYY-MM-DD HH:mm by {author}*
```

### Section Reference

| Section | Required | Update Frequency | Notes |
|---------|----------|------------------|-------|
| 标题 | Yes | Never | `# {任务名} - 上下文` |
| 会话进展 | Yes | Every session | 三个子节: ✅/🟡/⚠️ |
| 关键文件 | Yes | When files change | 每文件含作用和注意 |
| 关键决策 | Yes | When decisions made | 表格格式必须 |
| 技术约束 | Optional | When discovered | Bullet list |
| 相关链接 | Optional | As needed | 文档/URL 链接 |
| 快速交接 | Yes | Every session end | 必须包含具体步骤 |
| 元信息 | Yes | Auto-update | 包含更新者 |

### File Status Values

| Status | Display | Meaning |
|--------|---------|---------|
| 已完成 | `[已完成]` | File modification complete |
| 进行中 | `[进行中]` | Currently working on |
| 待修改 | `[待修改]` | Planned modification |
| 已删除 | `[已删除]` | File was deleted |

---

## tasks.md Schema

任务清单文件，严格格式，用于进度跟踪。

### Structure

```markdown
# {任务显示名} - 任务清单

## 快速恢复

**当前阶段**: 阶段 N - 阶段名
**当前任务**: 当前任务描述
**进度**: X/Y 任务完成

---

## 阶段 1: 阶段名 ✅ COMPLETE

- [x] 任务描述 | 验收: 验收标准
- [x] 任务描述 | 验收: 验收标准

---

## 阶段 2: 阶段名 🟡 IN PROGRESS

- [x] 任务描述 | 验收: 验收标准
- [ ] 任务描述 | 验收: 验收标准 ← CURRENT
- [ ] 任务描述 | 验收: 验收标准

---

## 阶段 3: 阶段名 ⏳ NOT STARTED

- [ ] 任务描述 | 验收: 验收标准
- [ ] 任务描述 | 验收: 验收标准

---

## 发现的新任务

- [ ] 任务描述 | 来源: 来源说明

---

*最后更新: YYYY-MM-DD HH:mm*
```

### Section Reference

| Section | Required | Format |
|---------|----------|--------|
| 标题 | Yes | `# {任务名} - 任务清单` |
| 快速恢复 | Yes | 三个字段必须存在 |
| 阶段列表 | Yes | 格式见下方 |
| 发现的新任务 | Optional | 格式: `- [ ] 描述 \| 来源: xxx` |
| 元信息 | Yes | `*最后更新: ...*` |

### Phase Format

```
## 阶段 {N}: {阶段名} {状态emoji} {状态文字}
```

| Status | Emoji | Text | Condition |
|--------|-------|------|-----------|
| 未开始 | ⏳ | NOT STARTED | 无任务开始 |
| 进行中 | 🟡 | IN PROGRESS | 有任务进行中 |
| 已完成 | ✅ | COMPLETE | 所有任务完成 |

### Task Format

```
- [{x/ }] {任务描述} | 验收: {验收标准}
```

- `[x]` = 已完成
- `[ ]` = 未完成
- `← CURRENT` 标记当前任务

### Quick Recovery Fields

| Field | Format | Example |
|-------|--------|---------|
| 当前阶段 | `**当前阶段**: 阶段 N - {名称}` | `阶段 2 - 核心实现` |
| 当前任务 | `**当前任务**: {描述}` | `实现 token 刷新逻辑` |
| 进度 | `**进度**: X/Y 任务完成` | `5/12 任务完成` |

---

## Format Rules

### Date/Time Formats

| Type | Format | Example |
|------|--------|---------|
| 日期 | YYYY-MM-DD | 2025-12-12 |
| 时间 | HH:mm | 14:30 |
| 完整 | YYYY-MM-DD HH:mm | 2025-12-12 14:30 |
| ISO8601 | Full ISO format | 2025-12-12T14:30:00Z |

### Task ID Generation

从显示名生成 task ID：

1. Slugify：小写、空格/标点转 `-`、去除非法字符
2. 若冲突或为空：使用 `task-{shortHash}`

| Display Name | Generated ID |
|--------------|--------------|
| 实现用户认证模块 | `shi-xian-yong-hu-ren-zheng-mo-kuai` |
| Refactor DB layer | `refactor-db-layer` |
| 123!@# | `task-a1b2c3` |

### Markdown Conventions

- 文件路径使用 backtick: `` `path/to/file.ts` ``
- 状态使用方括号: `[状态]`
- 分隔线使用三个短横: `---`
- 表格必须有表头分隔行

---

## Validation & Auto-Fix

MCP 工具会自动校验和修复格式问题。

### Validation Rules

| Rule | Severity | Auto-Fix |
|------|----------|----------|
| 缺少必需 section | Error | 添加空 section |
| Section 顺序错误 | Warning | 提示但不修改 |
| 任务缺少验收标准 | Warning | 添加 `(待补充)` |
| 阶段状态不一致 | Error | 根据 checkbox 计算 |
| 日期格式错误 | Warning | 尝试标准化 |
| 进度统计错误 | Error | 重新计算 |

### Auto-Fix Example

**Input (incorrect format):**
```markdown
## 阶段 1
- [x] 完成任务1
- [ ] 未完成任务2
```

**Output (auto-fixed):**
```markdown
## 阶段 1: 未命名阶段 🟡 IN PROGRESS

- [x] 完成任务1 | 验收: (待补充)
- [ ] 未完成任务2 | 验收: (待补充) ← CURRENT
```

### Warning Response

```json
{
  "success": true,
  "warnings": [
    "阶段缺少名称，已添加占位符",
    "任务缺少验收标准，已添加占位符"
  ],
  "autoFixed": [
    "自动计算阶段状态: IN PROGRESS",
    "自动标记当前任务"
  ]
}
```

---

## Related Files

- [SKILL.md](./SKILL.md) - 主技能文件
- [EXAMPLES.md](./EXAMPLES.md) - 完整示例
- [MCP_TOOLS.md](./MCP_TOOLS.md) - MCP 工具接口
