# LegionMind MCP Tools Reference

MCP 工具的完整接口定义和使用说明。

---

## Table of Contents

1. [Initialization Tools](#initialization-tools)
2. [Query Tools](#query-tools)
3. [Update Tools](#update-tools)
4. [Task Management Tools](#task-management-tools)
5. [Error Handling](#error-handling)

---

## Initialization Tools

### legion_init

初始化 `.legion/` 目录结构。

**Parameters:**
```typescript
interface LegionInitParams {
  workingDirectory?: string;  // 默认: 当前工作目录
}
```

**Response:**
```typescript
interface LegionInitResult {
  success: boolean;
  path: string;              // .legion 目录路径
  message: string;
  warnings?: string[];       // 如检测到 dev/active 存在
}
```

**Behavior:**
- 创建 `.legion/` 目录
- 创建 `.legion/config.json` 初始配置
- 创建 `.legion/tasks/` 目录
- 如果已存在，返回警告但不覆盖
- 若检测到 `dev/active/` 存在，返回提示（不自动迁移）

**Example:**
```json
// Request
{ "workingDirectory": "/path/to/project" }

// Response
{
  "success": true,
  "path": "/path/to/project/.legion",
  "message": "LegionMind initialized successfully",
  "warnings": ["Detected existing dev/active/ directory. LegionMind uses .legion/ as the single source of truth."]
}
```

---

### legion_create_task

创建新任务，生成三文件结构。

**Parameters:**
```typescript
interface LegionCreateTaskParams {
  name: string;              // 任务显示名（支持中文）
  goal: string;              // 任务目标（用于 plan.md）
  points?: string[];         // 要点列表（用于 plan.md）
  scope?: string[];          // 范围列表（用于 plan.md）
  phases?: Phase[];          // 阶段列表
}

interface Phase {
  name: string;
  tasks: Task[];
}

interface Task {
  description: string;
  acceptance: string;
}
```

**Response:**
```typescript
interface LegionCreateTaskResult {
  success: boolean;
  taskId: string;            // 自动生成的任务 ID（目录名）
  taskPath: string;          // 任务目录路径
  files: string[];           // 创建的文件列表
  message: string;
}
```

**Behavior:**
- 生成稳定的 `taskId`（slugify 或 hash）
- 创建 `.legion/tasks/{taskId}/` 目录
- 生成 plan.md、context.md、tasks.md 初始内容
- 更新 config.json 的任务列表
- 设置为当前活跃任务（必要时暂停上一个 active）

**Example:**
```json
// Request
{
  "name": "实现用户认证模块",
  "goal": "实现基于 JWT 的用户认证系统",
  "points": ["技术选型: JWT + RS256", "必须兼容 Keycloak"],
  "phases": [
    {
      "name": "基础设施",
      "tasks": [
        { "description": "创建 JWT 工具模块", "acceptance": "jwt.ts 包含 sign/verify 方法" }
      ]
    }
  ]
}

// Response
{
  "success": true,
  "taskId": "shi-xian-yong-hu-ren-zheng-mo-kuai",
  "taskPath": "/path/to/.legion/tasks/shi-xian-yong-hu-ren-zheng-mo-kuai",
  "files": ["plan.md", "context.md", "tasks.md"],
  "message": "Task '实现用户认证模块' created successfully"
}
```

---

## Query Tools

### legion_get_status

获取当前状态摘要。

**Parameters:**
```typescript
interface LegionGetStatusParams {
  taskId?: string;           // 指定任务 ID，默认为 currentTask
}
```

**Response:**
```typescript
interface LegionGetStatusResult {
  currentTask: string | null;
  taskName: string | null;   // 显示名
  taskStatus: {
    phase: string;
    currentTaskDescription: string;
    progress: {
      completed: number;
      total: number;
    };
  } | null;
  recentProgress: string[];  // 最近完成的 3 项
  blockers: string[];        // 当前阻塞项
}
```

**Example:**
```json
// Response
{
  "currentTask": "shi-xian-yong-hu-ren-zheng",
  "taskName": "实现用户认证模块",
  "taskStatus": {
    "phase": "阶段 2 - 核心实现",
    "currentTaskDescription": "实现 token 刷新逻辑",
    "progress": { "completed": 5, "total": 12 }
  },
  "recentProgress": [
    "实现登录接口",
    "添加基础单元测试",
    "创建认证中间件"
  ],
  "blockers": ["需要确认刷新 token 过期时间"]
}
```

---

### legion_list_tasks

列出所有任务。

**Parameters:** None

**Response:**
```typescript
interface LegionListTasksResult {
  tasks: {
    id: string;
    name: string;
    status: 'active' | 'paused' | 'completed' | 'archived';
    progress: string;        // 如 "5/12"
    updatedAt: string;
  }[];
  currentTask: string | null;
}
```

**Example:**
```json
{
  "tasks": [
    { "id": "shi-xian-yong-hu-ren-zheng", "name": "实现用户认证模块", "status": "active", "progress": "5/12", "updatedAt": "2025-12-12T14:30:00Z" },
    { "id": "xing-neng-pai-cha", "name": "性能问题排查", "status": "paused", "progress": "2/8", "updatedAt": "2025-12-11T18:00:00Z" }
  ],
  "currentTask": "shi-xian-yong-hu-ren-zheng"
}
```

---

### legion_read_context

读取完整上下文。

**Parameters:**
```typescript
interface LegionReadContextParams {
  taskId?: string;           // 指定任务 ID，默认为 currentTask
  section?: 'all' | 'progress' | 'decisions' | 'files' | 'handoff';
}
```

**Response:**
```typescript
interface LegionReadContextResult {
  taskId: string;
  taskName: string;          // 显示名
  content: string;           // Markdown 内容
  parsed: {                  // 解析后的结构化数据
    sessionProgress: {
      completed: string[];
      inProgress: string[];
      blocked: string[];
    };
    keyFiles: KeyFile[];
    decisions: Decision[];
    handoff: {
      nextSteps: string[];
      notes: string[];
    };
  };
  warnings: string[];        // 解析警告
}

interface KeyFile {
  path: string;
  status: string;
  purpose: string;
  notes?: string;
}

interface Decision {
  decision: string;
  reason: string;
  alternatives?: string;
  date: string;
}
```

---

## Update Tools

### legion_update_plan

更新 plan.md。

**Parameters:**
```typescript
interface LegionUpdatePlanParams {
  taskId?: string;
  goal?: string;
  points?: string[];
  scope?: string[];
  phases?: string[];
}
```

**Response:**
```typescript
interface LegionUpdatePlanResult {
  success: boolean;
  warnings: string[];        // Schema 校验警告
  autoFixed: string[];       // 自动修复的问题
}
```

---

### legion_update_context

更新 context.md。

**Parameters:**
```typescript
interface LegionUpdateContextParams {
  taskId?: string;

  // 更新会话进展
  progress?: {
    completed?: string[];    // 添加到已完成
    inProgress?: string[];   // 设置进行中（替换）
    blocked?: string[];      // 设置阻塞项（替换）
  };

  // 添加关键文件
  addFile?: {
    path: string;
    purpose: string;
    status: 'completed' | 'in_progress' | 'pending' | 'deleted';
    notes?: string;
  };

  // 添加决策
  addDecision?: {
    decision: string;
    reason: string;
    alternatives?: string;
    date?: string;           // 默认今天
  };

  // 添加技术约束
  addConstraint?: string;

  // 更新快速交接
  handoff?: {
    nextSteps: string[];
    notes: string[];
  };
}
```

**Response:**
```typescript
interface LegionUpdateContextResult {
  success: boolean;
  warnings: string[];
  autoFixed: string[];
}
```

**Example:**
```json
// Request - 完成任务后更新
{
  "progress": {
    "completed": ["实现 token 刷新逻辑"],
    "inProgress": ["添加 RefreshToken 数据模型"]
  },
  "addDecision": {
    "decision": "使用数据库事务处理并发刷新",
    "reason": "防止竞态条件导致 token 重复生成",
    "alternatives": "乐观锁 + 重试"
  }
}
```

---

### legion_update_tasks

更新 tasks.md。

**Parameters:**
```typescript
interface LegionUpdateTasksParams {
  taskId?: string;

  // 完成任务
  completeTask?: {
    phase: number | string;          // 阶段索引或名称
    taskIndex?: number;              // 任务索引（可选）
    taskDescription?: string;        // 任务描述（优先用于定位）
  };

  // 设置当前任务
  setCurrentTask?: {
    phase: number | string;
    taskIndex?: number;
    taskDescription?: string;
  };

  // 添加新任务到阶段
  addTask?: {
    phase: number | string;
    description: string;
    acceptance: string;
  };

  // 添加发现的新任务
  addDiscoveredTask?: {
    description: string;
    source: string;
  };

  // 更新阶段状态（通常自动计算）
  updatePhaseStatus?: {
    phase: number | string;
    status: 'not_started' | 'in_progress' | 'complete';
  };
}
```

**Response:**
```typescript
interface LegionUpdateTasksResult {
  success: boolean;
  newProgress: {
    completed: number;
    total: number;
  };
  warnings: string[];
  autoFixed: string[];
}
```

**Behavior Notes:**
- `completeTask` / `setCurrentTask` 若同时提供 `taskDescription` 与 `taskIndex`，优先使用 `taskDescription`
- 当人类手动调整任务顺序时，以"描述最近一次出现的位置"为准，避免 index 漂移

**Example:**
```json
// Request - 标记任务完成
{
  "completeTask": {
    "phase": "核心实现",
    "taskDescription": "实现 token 刷新逻辑"
  },
  "setCurrentTask": {
    "phase": "核心实现",
    "taskDescription": "添加 RefreshToken 数据模型"
  }
}

// Response
{
  "success": true,
  "newProgress": { "completed": 6, "total": 12 },
  "warnings": [],
  "autoFixed": ["自动更新阶段状态: IN PROGRESS"]
}
```

---

## Task Management Tools

### legion_switch_task

切换当前活跃任务。

**Parameters:**
```typescript
interface LegionSwitchTaskParams {
  taskId: string;            // 目标任务 ID
}
```

**Response:**
```typescript
interface LegionSwitchTaskResult {
  success: boolean;
  previousTask: string | null;
  currentTask: string;
  taskStatus: {
    phase: string;
    progress: string;
  };
}
```

**Behavior:**
- 将当前 `active` 任务设为 `paused`
- 将目标任务设为 `active`
- 更新 `currentTask`

---

### legion_archive_task

归档已完成的任务。

**Parameters:**
```typescript
interface LegionArchiveTaskParams {
  taskId: string;
}
```

**Response:**
```typescript
interface LegionArchiveTaskResult {
  success: boolean;
  archivedPath: string;
}
```

**Behavior:**
- 将任务状态设为 `archived`
- 任务目录保留（不移动或删除）
- 如果归档的是当前任务，`currentTask` 设为 `null`

---

## Error Handling

### Error Response Format

```typescript
interface LegionErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_INITIALIZED` | .legion 目录不存在 |
| `TASK_NOT_FOUND` | 指定的任务不存在 |
| `NO_ACTIVE_TASK` | 没有活跃任务且未指定 taskId |
| `INVALID_PARAMS` | 参数验证失败 |
| `SCHEMA_ERROR` | Schema 校验失败（无法自动修复） |
| `FILE_ERROR` | 文件读写错误 |

### Schema Validation

MCP 工具会自动校验和修复格式问题：

```typescript
interface ValidationResult {
  valid: boolean;
  warnings: string[];        // 可继续但需注意
  autoFixed: string[];       // 已自动修复
  errors: string[];          // 无法继续
}
```

**Auto-fix behavior:**
- 缺少必需 section → 添加空 section
- 阶段状态不一致 → 根据 checkbox 计算
- 进度统计错误 → 重新计算
- 日期格式错误 → 尝试标准化

**Warning-only (no auto-fix):**
- Section 顺序错误
- 任务缺少验收标准（添加占位符）

---

## Related Files

- [SKILL.md](./SKILL.md) - 主技能文件
- [SCHEMA.md](./SCHEMA.md) - Schema 定义
- [EXAMPLES.md](./EXAMPLES.md) - 完整示例
