---
name: legionmind
description: Cross-session context management for Claude Code. Use when starting complex tasks, resuming work after session reset, tracking progress across sessions, recording decisions, or needing to hand off work. Covers .legion/ directory structure, three-file pattern (plan.md, context.md, tasks.md), task lifecycle, and MCP tools for state management.
---

# LegionMind - 跨会话上下文管理

## Purpose

帮助在多次会话之间保持工作上下文。当会话重置或切换 Agent 时，不再需要重新探索代码库——所有进展、决策、任务状态都被持久化到 `.legion/` 目录中。

## When to Use This Skill

Automatically activates when you mention:
- 开始复杂任务 / starting complex task
- 恢复工作 / resume work / pick up
- 跨会话 / cross-session / session reset
- 记录进展 / track progress
- 任务交接 / handoff / handover
- .legion 目录
- 上下文管理 / context management

---

## Quick Start

### 1. 初始化（首次使用）

当在新目录开始复杂工作时：

```
1. 调用 legion_init 初始化 .legion 目录
2. 调用 legion_create_task 创建任务
   - name: 任务显示名（支持中文）
   - goal: 一句话描述目标
   - phases: 实施阶段列表
```

### 2. 恢复上下文（会话开始时）

当开始新会话或接手任务时：

```
1. 调用 legion_get_status 查看当前状态
2. 若 currentTask = null → 提醒用户无活跃任务
3. 若有活跃任务 → 调用 legion_read_context
4. 输出快速恢复摘要（1-2行）：
   "当前阶段: xxx | 当前任务: xxx | 下一步: xxx"
5. 根据"快速交接"部分继续工作
```

### 3. 记录进展（工作过程中）

完成重要工作后：

```
1. 调用 legion_update_tasks 标记完成的任务
2. 调用 legion_update_context 更新进展和决策
```

### 4. 保存状态（会话结束前）

会话即将结束时：

```
1. 确保所有完成的任务已标记
2. 更新 context.md 的"快速交接"部分
3. 记录任何未完成的工作和阻塞项
```

---

## Directory Structure

```
.legion/
├── config.json              # 全局配置 + 当前任务指针
└── tasks/
    └── {task-id}/           # 自动生成的任务 ID（目录名）
        ├── plan.md          # 任务计划（Review 用）
        ├── context.md       # 工作上下文（交接用）
        └── tasks.md         # 任务清单（进度跟踪）
```

### Task Naming

任务支持中文等任意自然语言命名：

| 类型 | 说明 | 示例 |
|------|------|------|
| **显示名 (name)** | 人类可读，用于标题 | `实现用户认证模块` |
| **任务 ID (id)** | 自动生成，用于目录 | `shi-xian-yong-hu-ren-zheng-mo-kuai` |

---

## Three-File Pattern

### plan.md - 任务计划

**用途**：让人或 Agent 快速理解任务全貌，用于 Review

**核心内容**：
- 目标（一句话）
- 要点（关键约束、技术选型、风险）
- 范围（会改动的文件/模块）
- 阶段概览

**更新频率**：低（仅计划变更时）

### context.md - 工作上下文

**用途**：工作日志和交接文档

**核心内容**：
- 会话进展（✅已完成 / 🟡进行中 / ⚠️阻塞）
- 关键文件（路径、作用、状态）
- 关键决策（决策、原因、替代方案）
- 技术约束
- 快速交接（下一步从哪开始）

**更新频率**：高（每次重要进展后）

### tasks.md - 任务清单

**用途**：进度跟踪，可视化完成状态

**核心内容**：
- 快速恢复（当前阶段、当前任务、进度 X/Y）
- 分阶段任务列表（checkbox 格式）
- 验收标准
- 发现的新任务

**更新频率**：高（完成任务时立即更新）

---

## MCP Tools Reference

### Initialization

| Tool | Purpose |
|------|---------|
| `legion_init` | Initialize .legion directory |
| `legion_create_task` | Create new task with three files |

### Query

| Tool | Purpose |
|------|---------|
| `legion_get_status` | Get current status summary |
| `legion_list_tasks` | List all tasks |
| `legion_read_context` | Read full context |

### Update

| Tool | Purpose |
|------|---------|
| `legion_update_plan` | Update plan.md |
| `legion_update_context` | Update context.md |
| `legion_update_tasks` | Update tasks.md (mark complete, add tasks) |

### Task Management

| Tool | Purpose |
|------|---------|
| `legion_switch_task` | Switch active task |
| `legion_archive_task` | Archive completed task |

---

## When to Update

| Event | What to Update |
|-------|----------------|
| 完成一个任务 | `tasks.md` (标记完成) + `context.md` (添加到已完成) |
| 做出重要决策 | `context.md` (添加决策记录) |
| 发现新任务 | `tasks.md` (添加到"发现的新任务") |
| 遇到阻塞 | `context.md` (添加到阻塞项) |
| 会话即将结束 | `context.md` (更新快速交接) |
| 计划变更 | `plan.md` (更新相关部分) |

---

## Task States

### Task Status

| Status | Meaning |
|--------|---------|
| `active` | 当前活跃任务（同时只能有一个） |
| `paused` | 暂停中（切换任务时自动设置） |
| `completed` | 已完成（待归档） |
| `archived` | 已归档 |

### Phase Status

| Status | Display | Condition |
|--------|---------|-----------|
| NOT STARTED | `⏳ NOT STARTED` | 无任务开始 |
| IN PROGRESS | `🟡 IN PROGRESS` | 有任务进行中 |
| COMPLETE | `✅ COMPLETE` | 所有任务完成 |

---

## Common Scenarios

### Starting a New Complex Task

```
User: 帮我实现用户认证功能

Agent:
1. legion_init (if .legion doesn't exist)
2. legion_create_task({
     name: "实现用户认证功能",
     goal: "实现基于 JWT 的用户认证系统",
     phases: [...]
   })
3. Begin work, periodically update progress
```

### Resuming After Session Reset

```
Agent (at session start):
1. legion_get_status()
2. Output: "当前阶段: 核心实现 | 当前任务: 实现 token 刷新 | 进度: 5/12"
3. legion_read_context() for details
4. Continue from "快速交接" section
```

### Switching Between Tasks

```
User: 先暂停认证，去处理那个性能问题

Agent:
1. legion_update_context({ handoff: {...} }) // 保存当前状态
2. legion_switch_task({ taskId: "performance-issue" })
3. legion_read_context() // 读取新任务上下文
```

---

## Integration Notes

### Relationship with dev/active

LegionMind 使用 `.legion/` 作为**唯一持久化来源**。

- 如果项目中存在 `dev/active/`，`legion_init` 会提示但**不会自动迁移**
- 两个系统可以共存，但建议新任务使用 LegionMind

### Schema Validation

MCP 工具会自动：
- 校验文件格式
- 尝试修复常见问题
- 返回警告信息

人类手动编辑文件不会导致系统崩溃。

---

## Reference Files

For detailed information:

- **[SCHEMA.md](./SCHEMA.md)** - 三文件的完整 Schema 定义
- **[EXAMPLES.md](./EXAMPLES.md)** - 完整的文件示例
- **[MCP_TOOLS.md](./MCP_TOOLS.md)** - MCP 工具详细接口

设计文档：[design/legionmind-mvp-design.md](../../../design/legionmind-mvp-design.md)

---

## Quick Reference

### Create Task Flow
```
legion_init → legion_create_task → work → legion_update_tasks/context
```

### Resume Task Flow
```
legion_get_status → legion_read_context → continue work
```

### End Session Flow
```
legion_update_tasks (mark completed) → legion_update_context (handoff)
```

---

**Skill Status**: MVP Implementation
**Line Count**: < 300 (following 500-line rule)
**Progressive Disclosure**: Reference files for detailed schemas and examples
