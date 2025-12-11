# LegionMind 系统设计

## 概述

LegionMind 是一个为 Claude Code 设计的跨会话多 Agent 协作系统，旨在解决以下核心问题：

1. **状态丢失与重复工作** - Agent 在不同会话中重复探索相同上下文
2. **缺乏统一真相源（SoT）** - 任务状态分散在聊天记录、Issue、第三方任务系统中
3. **监督成本高** - 人类必须频繁阅读长对话来理解 Agent 做了什么
4. **上下文与注意力稀释** - 长篇规则和历史容易被后文淹没

LegionMind 将任务管理直接内嵌在文件系统与 Git 仓库中（File-System Native Task Management），让人类与 AI 使用同一套状态文件与规则文件。

## 设计目标

1. **统一任务与状态模型** - 结构化存储项目状态、任务进度、关键决策
2. **构建项目级"心智"** - 支持多 Agent 在共享心智下协同工作
3. **控制信息密度与上下文加载** - 明确信息层级：核心层（Always-on）与扩展层（On-demand）
4. **降低人类监督成本** - 将监督重心从"逐轮审查对话"转移到"监控一小组结构化指标与仪表盘"

## 系统架构

### 1. 核心组件

```
.claude/
├── skills/
│   └── legionmind/          # LegionMind 技能
├── mcp-servers/
│   └── legionmind-mcp/      # LegionMind MCP 服务器
├── hooks/
│   └── legionmind-hook/     # LegionMind 相关 hooks
└── agents/
    └── legionmind-agent/    # LegionMind 专用代理

legionmind/                  # 项目级状态存储
├── state.json              # 核心状态（Git 跟踪）
├── tasks/                  # 任务目录
│   ├── {task-id}.json     # 单个任务状态
│   └── index.json         # 任务索引
├── agents/                 # Agent 状态
│   ├── {agent-id}.json    # 单个 Agent 状态
│   └── index.json         # Agent 索引
├── decisions/              # 关键决策记录
│   ├── {decision-id}.md   # 决策文档（Markdown）
│   └── index.json         # 决策索引
└── ledger/                # 审计日志
    ├── {date}.json        # 每日活动日志
    └── summary.json       # 汇总统计
```

### 2. LegionMind 技能 (Skill)

**功能**：
- 提供 LegionMind 系统使用指南
- 解释状态文件结构和字段含义
- 提供常用命令和示例
- 与其他技能集成（如 `skill-developer`、`backend-dev-guidelines`）

**技能结构**：
- `SKILL.md` (<500 行) - 概述和核心概念
- `STATE-MANAGEMENT.md` - 状态文件详细说明
- `TASK-WORKFLOW.md` - 任务生命周期管理
- `AGENT-COORDINATION.md` - 多 Agent 协调模式
- `HUMAN-SUPERVISION.md` - 人类监督界面

### 3. LegionMind MCP 服务器

**提供的工具**：

1. **状态读写工具**
   - `read_project_state` - 读取核心状态
   - `update_project_state` - 更新核心状态字段
   - `create_task` - 创建新任务
   - `update_task_status` - 更新任务状态
   - `record_decision` - 记录关键决策

2. **查询工具**
   - `get_active_tasks` - 获取进行中的任务
   - `get_recent_decisions` - 获取最近决策
   - `get_agent_contributions` - 获取 Agent 贡献统计
   - `generate_status_report` - 生成状态报告

3. **协调工具**
   - `assign_task_to_agent` - 分配任务给 Agent
   - `check_agent_availability` - 检查 Agent 可用性
   - `resolve_conflict` - 解决任务冲突

### 4. LegionMind Hooks

**Hook 类型**：

1. **SessionStart Hook** (UserPromptSubmit)
   - 检测到新会话开始时，自动加载 LegionMind 技能
   - 注入项目状态摘要到上下文

2. **TaskCompletion Hook** (PostToolUse)
   - 检测到任务完成时，自动更新状态文件
   - 提示用户确认或修改状态

3. **DecisionRecording Hook** (PreToolUse)
   - 检测到关键决策时，提示记录到决策日志

4. **ContextCompaction Hook** (Stop)
   - 在上下文重置前，自动更新 LegionMind 状态
   - 确保关键信息被持久化

### 5. LegionMind 专用代理

**代理类型**：
1. **legionmind-coordinator** - 任务协调和分配
2. **legionmind-auditor** - 状态审计和一致性检查
3. **legionmind-reporter** - 报告生成和仪表盘更新

## 状态模型

### 1. 核心状态 (`state.json`)

```json
{
  "project": {
    "id": "project-id",
    "name": "项目名称",
    "description": "项目描述",
    "version": "1.0.0",
    "status": "active|paused|completed|archived",
    "createdAt": "2025-12-11T10:30:00Z",
    "updatedAt": "2025-12-11T10:30:00Z"
  },
  "metrics": {
    "totalTasks": 42,
    "completedTasks": 15,
    "inProgressTasks": 8,
    "blockedTasks": 3,
    "totalDecisions": 25,
    "totalAgentSessions": 47
  },
  "settings": {
    "autoRecordDecisions": true,
    "requireHumanApproval": ["critical_tasks", "architectural_decisions"],
    "notificationLevel": "summary|detailed|none"
  }
}
```

### 2. 任务模型 (`tasks/{task-id}.json`)

```json
{
  "id": "task-001",
  "title": "实现用户认证模块",
  "description": "实现基于 JWT 的用户认证系统",
  "type": "feature|bug|refactor|docs|test",
  "priority": "critical|high|medium|low",
  "status": "todo|in_progress|review|blocked|completed",
  "assignedTo": ["agent-id-1", "agent-id-2"],
  "createdBy": "human|agent-id",
  "createdAt": "2025-12-11T10:30:00Z",
  "updatedAt": "2025-12-11T10:30:00Z",
  "estimatedEffort": "3h",
  "actualEffort": "2.5h",
  "dependencies": ["task-002", "task-003"],
  "blocks": ["task-004"],
  "outcome": {
    "result": "success|partial|failed",
    "summary": "任务完成摘要",
    "artifacts": ["/path/to/file1", "/path/to/file2"],
    "learnings": ["关键学习点"]
  }
}
```

### 3. Agent 模型 (`agents/{agent-id}.json`)

```json
{
  "id": "agent-id-1",
  "type": "code-architecture-reviewer|frontend-error-fixer|documentation-architect",
  "capabilities": ["typescript", "react", "nodejs"],
  "currentSession": {
    "sessionId": "session-123",
    "startedAt": "2025-12-11T10:30:00Z",
    "currentTask": "task-001",
    "toolsUsed": ["Edit", "Bash", "Read"]
  },
  "stats": {
    "totalSessions": 15,
    "totalTasksCompleted": 32,
    "averageTaskTime": "45m",
    "preferredTools": ["Edit", "Read"]
  }
}
```

## 工作流程

### 1. 项目初始化
```bash
# 初始化 LegionMind
claude --skill legionmind init
# 或通过 MCP 工具
```

### 2. 任务创建流程
1. 人类或 Agent 创建任务
2. 系统分配唯一 ID 和初始状态
3. 任务添加到索引
4. 通知相关 Agent

### 3. Agent 工作流程
1. Agent 启动时读取项目状态
2. 获取分配给自己的任务
3. 工作时定期更新任务状态
4. 完成任务时记录结果和产出

### 4. 人类监督流程
1. 查看仪表盘获取项目概览
2. 审查关键决策和任务状态
3. 批准或修改任务分配
4. 查看审计日志了解 Agent 活动

## 与现有系统集成

### 1. 与 `/dev-docs` 集成
- LegionMind 状态与 `/dev-docs` 三文件结构同步
- `plan.md` ↔ 任务列表
- `context.md` ↔ 决策记录
- `tasks.md` ↔ 任务检查清单

### 2. 与技能自动激活集成
- 扩展 `skill-rules.json` 包含 LegionMind 触发规则
- 根据任务类型自动激活相关技能

### 3. 与现有代理集成
- 现有代理（如 `code-architecture-reviewer`）通过 MCP 工具与 LegionMind 交互
- 代理完成任务后自动更新 LegionMind 状态

## 实施路线图

### 阶段 1: MVP (核心状态管理)
- LegionMind 技能（基本指南）
- 核心状态文件结构
- 基础 MCP 工具（读/写状态）
- 基础 Hook（会话启动时加载状态）

### 阶段 2: 任务管理
- 完整任务模型
- 任务创建、更新、查询工具
- 任务分配和协调
- 与 `/dev-docs` 集成

### 阶段 3: 多 Agent 协调
- Agent 状态跟踪
- 冲突解决机制
- 负载均衡和任务分配算法

### 阶段 4: 高级功能
- 决策记录系统
- 审计日志和报告
- 人类监督仪表盘
- 预测分析和建议

## 技术考量

### 1. 性能
- 状态文件使用增量更新，避免全量重写
- 大项目使用分片存储（按日期、按模块）
- 缓存频繁访问的数据

### 2. 一致性
- 使用文件锁避免并发写入冲突
- 定期一致性检查（通过 `legionmind-auditor` 代理）
- Git 作为最终一致性保证

### 3. 可扩展性
- 模块化设计，可单独启用/禁用组件
- 支持自定义状态字段和验证规则
- 插件系统扩展功能

## 风险评估与缓解

### 风险 1: 状态文件冲突
**缓解**：使用乐观锁和冲突检测，提供合并工具

### 风险 2: 性能影响
**缓解**：延迟加载、按需读取、定期清理旧数据

### 风险 3: 采用阻力
**缓解**：渐进式采用，与现有工作流集成，提供明显价值

## 成功指标

1. **效率提升** - 任务完成时间减少 X%
2. **上下文加载减少** - 每次会话节省 Y% 的上下文长度
3. **人类监督时间减少** - 监督时间减少 Z%
4. **任务成功率提高** - 任务成功完成率提高 W%

## 后续步骤

1. 创建详细的技术规范
2. 实现 MVP 原型
3. 在示例项目中测试
4. 收集反馈并迭代
5. 推广到更多项目