import * as fs from "fs/promises";
import * as path from "path";
import { generateTaskId, formatDate, formatDateTime } from "./utils.js";
import {
  Config,
  TaskEntry,
  LegionInitParams,
  LegionCreateTaskParams,
  LegionGetStatusParams,
  LegionReadContextParams,
  LegionUpdatePlanParams,
  LegionUpdateContextParams,
  LegionUpdateTasksParams,
  LegionSwitchTaskParams,
  LegionArchiveTaskParams,
} from "./types.js";

export class LegionMindService {
  private workingDirectory: string;

  constructor() {
    this.workingDirectory = process.cwd();
  }

  private getLegionDir(): string {
    return path.join(this.workingDirectory, ".legion");
  }

  private getConfigPath(): string {
    return path.join(this.getLegionDir(), "config.json");
  }

  private getTaskDir(taskId: string): string {
    return path.join(this.getLegionDir(), "tasks", taskId);
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async readConfig(): Promise<Config> {
    const configPath = this.getConfigPath();
    const content = await fs.readFile(configPath, "utf-8");
    return JSON.parse(content);
  }

  private async writeConfig(config: Config): Promise<void> {
    const configPath = this.getConfigPath();
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  private response(data: any) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }

  // ============ Initialization Tools ============

  async init(params: LegionInitParams) {
    if (params.workingDirectory) {
      this.workingDirectory = params.workingDirectory;
    }

    const legionDir = this.getLegionDir();
    const tasksDir = path.join(legionDir, "tasks");
    const configPath = this.getConfigPath();

    const warnings: string[] = [];

    // Check if already exists
    if (await this.exists(legionDir)) {
      return this.response({
        success: true,
        path: legionDir,
        message: "LegionMind already initialized",
        warnings: ["Directory already exists, no changes made"],
      });
    }

    // Check for dev/active
    const devActivePath = path.join(this.workingDirectory, "dev", "active");
    if (await this.exists(devActivePath)) {
      warnings.push(
        "Detected existing dev/active/ directory. LegionMind uses .legion/ as the single source of truth."
      );
    }

    // Create directories
    await fs.mkdir(tasksDir, { recursive: true });

    // Create initial config
    const config: Config = {
      version: "1.0.0",
      currentTask: null,
      settings: {
        autoRemind: true,
        remindBeforeReset: true,
      },
      tasks: [],
    };
    await this.writeConfig(config);

    return this.response({
      success: true,
      path: legionDir,
      message: "LegionMind initialized successfully",
      warnings,
    });
  }

  async createTask(params: LegionCreateTaskParams) {
    const legionDir = this.getLegionDir();
    if (!(await this.exists(legionDir))) {
      return this.response({
        success: false,
        error: { code: "NOT_INITIALIZED", message: ".legion directory not found. Run legion_init first." },
      });
    }

    const taskId = generateTaskId(params.name);
    const taskDir = this.getTaskDir(taskId);
    const today = formatDate(new Date());
    const now = new Date().toISOString();

    // Create task directory
    await fs.mkdir(taskDir, { recursive: true });

    // Generate plan.md
    const planContent = this.generatePlanContent(params, today);
    await fs.writeFile(path.join(taskDir, "plan.md"), planContent, "utf-8");

    // Generate context.md
    const contextContent = this.generateContextContent(params.name, today);
    await fs.writeFile(path.join(taskDir, "context.md"), contextContent, "utf-8");

    // Generate tasks.md
    const tasksContent = this.generateTasksContent(params.name, params.phases || []);
    await fs.writeFile(path.join(taskDir, "tasks.md"), tasksContent, "utf-8");

    // Update config
    const config = await this.readConfig();

    // Pause current active task
    if (config.currentTask) {
      const currentTaskEntry = config.tasks.find((t) => t.id === config.currentTask);
      if (currentTaskEntry) {
        currentTaskEntry.status = "paused";
        currentTaskEntry.updatedAt = now;
      }
    }

    // Add new task
    const newTask: TaskEntry = {
      id: taskId,
      name: params.name,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    config.tasks.push(newTask);
    config.currentTask = taskId;
    await this.writeConfig(config);

    return this.response({
      success: true,
      taskId,
      taskPath: taskDir,
      files: ["plan.md", "context.md", "tasks.md"],
      message: `Task '${params.name}' created successfully`,
    });
  }

  // ============ Query Tools ============

  async getStatus(params: LegionGetStatusParams) {
    const legionDir = this.getLegionDir();
    if (!(await this.exists(legionDir))) {
      return this.response({
        success: false,
        error: { code: "NOT_INITIALIZED", message: ".legion directory not found" },
      });
    }

    const config = await this.readConfig();
    const taskId = params.taskId || config.currentTask;

    if (!taskId) {
      return this.response({
        currentTask: null,
        taskName: null,
        taskStatus: null,
        recentProgress: [],
        blockers: [],
      });
    }

    const taskEntry = config.tasks.find((t) => t.id === taskId);
    if (!taskEntry) {
      return this.response({
        success: false,
        error: { code: "TASK_NOT_FOUND", message: `Task '${taskId}' not found` },
      });
    }

    // Parse tasks.md for progress
    const tasksPath = path.join(this.getTaskDir(taskId), "tasks.md");
    let taskStatus = null;
    let recentProgress: string[] = [];
    let blockers: string[] = [];

    if (await this.exists(tasksPath)) {
      const content = await fs.readFile(tasksPath, "utf-8");
      const parsed = this.parseTasksFile(content);
      taskStatus = parsed.status;
      recentProgress = parsed.recentCompleted.slice(0, 3);
    }

    // Parse context.md for blockers
    const contextPath = path.join(this.getTaskDir(taskId), "context.md");
    if (await this.exists(contextPath)) {
      const content = await fs.readFile(contextPath, "utf-8");
      blockers = this.parseBlockers(content);
    }

    return this.response({
      currentTask: taskId,
      taskName: taskEntry.name,
      taskStatus,
      recentProgress,
      blockers,
    });
  }

  async listTasks() {
    const legionDir = this.getLegionDir();
    if (!(await this.exists(legionDir))) {
      return this.response({
        success: false,
        error: { code: "NOT_INITIALIZED", message: ".legion directory not found" },
      });
    }

    const config = await this.readConfig();
    const tasks = await Promise.all(
      config.tasks.map(async (t) => {
        const tasksPath = path.join(this.getTaskDir(t.id), "tasks.md");
        let progress = "0/0";
        if (await this.exists(tasksPath)) {
          const content = await fs.readFile(tasksPath, "utf-8");
          const parsed = this.parseTasksFile(content);
          progress = `${parsed.status?.progress.completed || 0}/${parsed.status?.progress.total || 0}`;
        }
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          progress,
          updatedAt: t.updatedAt,
        };
      })
    );

    return this.response({
      tasks,
      currentTask: config.currentTask,
    });
  }

  async readContext(params: LegionReadContextParams) {
    const legionDir = this.getLegionDir();
    if (!(await this.exists(legionDir))) {
      return this.response({
        success: false,
        error: { code: "NOT_INITIALIZED", message: ".legion directory not found" },
      });
    }

    const config = await this.readConfig();
    const taskId = params.taskId || config.currentTask;

    if (!taskId) {
      return this.response({
        success: false,
        error: { code: "NO_ACTIVE_TASK", message: "No active task and no taskId specified" },
      });
    }

    const taskEntry = config.tasks.find((t) => t.id === taskId);
    if (!taskEntry) {
      return this.response({
        success: false,
        error: { code: "TASK_NOT_FOUND", message: `Task '${taskId}' not found` },
      });
    }

    const contextPath = path.join(this.getTaskDir(taskId), "context.md");
    if (!(await this.exists(contextPath))) {
      return this.response({
        success: false,
        error: { code: "FILE_ERROR", message: "context.md not found" },
      });
    }

    const content = await fs.readFile(contextPath, "utf-8");
    const parsed = this.parseContextFile(content);

    return this.response({
      taskId,
      taskName: taskEntry.name,
      content,
      parsed,
      warnings: [],
    });
  }

  // ============ Update Tools ============

  async updatePlan(params: LegionUpdatePlanParams) {
    const config = await this.readConfig();
    const taskId = params.taskId || config.currentTask;

    if (!taskId) {
      return this.response({
        success: false,
        error: { code: "NO_ACTIVE_TASK", message: "No active task and no taskId specified" },
      });
    }

    const planPath = path.join(this.getTaskDir(taskId), "plan.md");
    if (!(await this.exists(planPath))) {
      return this.response({
        success: false,
        error: { code: "FILE_ERROR", message: "plan.md not found" },
      });
    }

    let content = await fs.readFile(planPath, "utf-8");
    const warnings: string[] = [];
    const autoFixed: string[] = [];

    // Update goal
    if (params.goal) {
      content = content.replace(
        /## 目标\n\n[\s\S]*?(?=\n## )/,
        `## 目标\n\n${params.goal}\n\n`
      );
    }

    // Update points
    if (params.points) {
      const pointsStr = params.points.map((p) => `- ${p}`).join("\n");
      content = content.replace(
        /## 要点\n\n[\s\S]*?(?=\n## )/,
        `## 要点\n\n${pointsStr}\n\n`
      );
    }

    // Update last modified date
    const today = formatDate(new Date());
    content = content.replace(
      /最后更新: \d{4}-\d{2}-\d{2}/,
      `最后更新: ${today}`
    );

    await fs.writeFile(planPath, content, "utf-8");

    // Update config timestamp
    const taskEntry = config.tasks.find((t) => t.id === taskId);
    if (taskEntry) {
      taskEntry.updatedAt = new Date().toISOString();
      await this.writeConfig(config);
    }

    return this.response({ success: true, warnings, autoFixed });
  }

  async updateContext(params: LegionUpdateContextParams) {
    const config = await this.readConfig();
    const taskId = params.taskId || config.currentTask;

    if (!taskId) {
      return this.response({
        success: false,
        error: { code: "NO_ACTIVE_TASK", message: "No active task and no taskId specified" },
      });
    }

    const contextPath = path.join(this.getTaskDir(taskId), "context.md");
    if (!(await this.exists(contextPath))) {
      return this.response({
        success: false,
        error: { code: "FILE_ERROR", message: "context.md not found" },
      });
    }

    let content = await fs.readFile(contextPath, "utf-8");
    const warnings: string[] = [];
    const autoFixed: string[] = [];
    const today = formatDate(new Date());

    // Update progress section
    if (params.progress) {
      const { completed, inProgress, blocked } = params.progress;

      if (completed) {
        // Add to completed section
        const completedMatch = content.match(/### ✅ 已完成\n\n([\s\S]*?)(?=\n### |---)/);
        if (completedMatch) {
          const existingCompleted = completedMatch[1].trim();
          const newCompleted = completed.map((c) => `- ${c}`).join("\n");
          const updated = existingCompleted === "(暂无)"
            ? newCompleted
            : `${existingCompleted}\n${newCompleted}`;
          content = content.replace(
            /### ✅ 已完成\n\n[\s\S]*?(?=\n### |---)/,
            `### ✅ 已完成\n\n${updated}\n\n`
          );
        }
      }

      if (inProgress) {
        const inProgressStr = inProgress.map((i) => `- ${i}`).join("\n");
        content = content.replace(
          /### 🟡 进行中\n\n[\s\S]*?(?=\n### |---)/,
          `### 🟡 进行中\n\n${inProgressStr || "(暂无)"}\n\n`
        );
      }

      if (blocked) {
        const blockedStr = blocked.map((b) => `- ${b}`).join("\n");
        content = content.replace(
          /### ⚠️ 阻塞\/待定\n\n[\s\S]*?(?=\n---)/,
          `### ⚠️ 阻塞/待定\n\n${blockedStr || "(暂无)"}\n\n`
        );
      }
    }

    // Add decision
    if (params.addDecision) {
      const { decision, reason, alternatives, date } = params.addDecision;
      const decisionDate = date || today;
      const newRow = `| ${decision} | ${reason} | ${alternatives || "-"} | ${decisionDate} |`;

      const tableMatch = content.match(/## 关键决策\n\n\| 决策 \| 原因 \| 替代方案 \| 日期 \|\n\|---.*?\|\n([\s\S]*?)(?=\n---)/);
      if (tableMatch) {
        const existingRows = tableMatch[1].trim();
        const updatedRows = existingRows ? `${existingRows}\n${newRow}` : newRow;
        content = content.replace(
          /## 关键决策\n\n\| 决策 \| 原因 \| 替代方案 \| 日期 \|\n\|---.*?\|\n[\s\S]*?(?=\n---)/,
          `## 关键决策\n\n| 决策 | 原因 | 替代方案 | 日期 |\n|------|------|----------|------|\n${updatedRows}\n`
        );
      }
    }

    // Update handoff
    if (params.handoff) {
      const { nextSteps, notes } = params.handoff;
      const stepsStr = nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      const notesStr = notes.map((n) => `- ${n}`).join("\n");

      content = content.replace(
        /## 快速交接\n\n\*\*下次继续从这里开始：\*\*\n\n[\s\S]*?\n\n\*\*注意事项：\*\*\n\n[\s\S]*?(?=\n---)/,
        `## 快速交接\n\n**下次继续从这里开始：**\n\n${stepsStr}\n\n**注意事项：**\n\n${notesStr}\n`
      );
    }

    // Update timestamp
    const dateTime = formatDateTime(new Date());
    content = content.replace(
      /\*最后更新: .*?\*/,
      `*最后更新: ${dateTime} by Claude*`
    );

    await fs.writeFile(contextPath, content, "utf-8");

    // Update config timestamp
    const taskEntry = config.tasks.find((t) => t.id === taskId);
    if (taskEntry) {
      taskEntry.updatedAt = new Date().toISOString();
      await this.writeConfig(config);
    }

    return this.response({ success: true, warnings, autoFixed });
  }

  async updateTasks(params: LegionUpdateTasksParams) {
    const config = await this.readConfig();
    const taskId = params.taskId || config.currentTask;

    if (!taskId) {
      return this.response({
        success: false,
        error: { code: "NO_ACTIVE_TASK", message: "No active task and no taskId specified" },
      });
    }

    const tasksPath = path.join(this.getTaskDir(taskId), "tasks.md");
    if (!(await this.exists(tasksPath))) {
      return this.response({
        success: false,
        error: { code: "FILE_ERROR", message: "tasks.md not found" },
      });
    }

    let content = await fs.readFile(tasksPath, "utf-8");
    const warnings: string[] = [];
    const autoFixed: string[] = [];

    // Complete task
    if (params.completeTask) {
      const { phase, taskDescription, taskIndex } = params.completeTask;
      const desc = taskDescription || "";

      // Find and check the task
      const taskPattern = new RegExp(
        `- \\[ \\] ${desc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "g"
      );
      content = content.replace(taskPattern, `- [x] ${desc}`);

      // Remove CURRENT marker from this task
      content = content.replace(
        new RegExp(`- \\[x\\] ${desc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ← CURRENT`),
        `- [x] ${desc}`
      );
    }

    // Set current task
    if (params.setCurrentTask) {
      const { taskDescription } = params.setCurrentTask;
      if (taskDescription) {
        // Remove existing CURRENT markers
        content = content.replace(/ ← CURRENT/g, "");

        // Add new CURRENT marker
        const taskPattern = new RegExp(
          `(- \\[ \\] ${taskDescription.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\n]*)`,
          "g"
        );
        content = content.replace(taskPattern, "$1 ← CURRENT");
      }
    }

    // Add discovered task
    if (params.addDiscoveredTask) {
      const { description, source } = params.addDiscoveredTask;
      const newTask = `- [ ] ${description} | 来源: ${source}`;

      const discoveredSection = content.match(/## 发现的新任务\n\n([\s\S]*?)(?=\n---|\n\*最后更新)/);
      if (discoveredSection) {
        const existing = discoveredSection[1].trim();
        const updated = existing ? `${existing}\n${newTask}` : newTask;
        content = content.replace(
          /## 发现的新任务\n\n[\s\S]*?(?=\n---|\n\*最后更新)/,
          `## 发现的新任务\n\n${updated}\n\n`
        );
      }
    }

    // Recalculate progress and phase status
    const { totalCompleted, totalTasks, currentPhase, currentTask } = this.calculateProgress(content);

    // Update quick recovery section
    content = content.replace(
      /\*\*当前阶段\*\*: .*/,
      `**当前阶段**: ${currentPhase}`
    );
    content = content.replace(
      /\*\*当前任务\*\*: .*/,
      `**当前任务**: ${currentTask}`
    );
    content = content.replace(
      /\*\*进度\*\*: .*/,
      `**进度**: ${totalCompleted}/${totalTasks} 任务完成`
    );

    // Update phase status based on completion
    content = this.updatePhaseStatuses(content);

    // Update timestamp
    const dateTime = formatDateTime(new Date());
    content = content.replace(
      /\*最后更新: .*?\*/,
      `*最后更新: ${dateTime}*`
    );

    await fs.writeFile(tasksPath, content, "utf-8");

    // Update config timestamp
    const taskEntry = config.tasks.find((t) => t.id === taskId);
    if (taskEntry) {
      taskEntry.updatedAt = new Date().toISOString();
      await this.writeConfig(config);
    }

    return this.response({
      success: true,
      newProgress: { completed: totalCompleted, total: totalTasks },
      warnings,
      autoFixed,
    });
  }

  // ============ Task Management Tools ============

  async switchTask(params: LegionSwitchTaskParams) {
    const config = await this.readConfig();
    const { taskId } = params;

    const targetTask = config.tasks.find((t) => t.id === taskId);
    if (!targetTask) {
      return this.response({
        success: false,
        error: { code: "TASK_NOT_FOUND", message: `Task '${taskId}' not found` },
      });
    }

    const previousTask = config.currentTask;
    const now = new Date().toISOString();

    // Pause current task
    if (config.currentTask) {
      const currentTaskEntry = config.tasks.find((t) => t.id === config.currentTask);
      if (currentTaskEntry && currentTaskEntry.status === "active") {
        currentTaskEntry.status = "paused";
        currentTaskEntry.updatedAt = now;
      }
    }

    // Activate target task
    targetTask.status = "active";
    targetTask.updatedAt = now;
    config.currentTask = taskId;

    await this.writeConfig(config);

    // Get task status
    const tasksPath = path.join(this.getTaskDir(taskId), "tasks.md");
    let taskStatus = { phase: "(unknown)", progress: "0/0" };
    if (await this.exists(tasksPath)) {
      const content = await fs.readFile(tasksPath, "utf-8");
      const parsed = this.parseTasksFile(content);
      if (parsed.status) {
        taskStatus = {
          phase: parsed.status.phase,
          progress: `${parsed.status.progress.completed}/${parsed.status.progress.total}`,
        };
      }
    }

    return this.response({
      success: true,
      previousTask,
      currentTask: taskId,
      taskStatus,
    });
  }

  async archiveTask(params: LegionArchiveTaskParams) {
    const config = await this.readConfig();
    const { taskId } = params;

    const taskEntry = config.tasks.find((t) => t.id === taskId);
    if (!taskEntry) {
      return this.response({
        success: false,
        error: { code: "TASK_NOT_FOUND", message: `Task '${taskId}' not found` },
      });
    }

    taskEntry.status = "archived";
    taskEntry.updatedAt = new Date().toISOString();

    // Clear currentTask if archiving the active task
    if (config.currentTask === taskId) {
      config.currentTask = null;
    }

    await this.writeConfig(config);

    return this.response({
      success: true,
      archivedPath: this.getTaskDir(taskId),
    });
  }

  // ============ Helper Methods ============

  private generatePlanContent(params: LegionCreateTaskParams, today: string): string {
    const points = params.points?.map((p) => `- ${p}`).join("\n") || "- (待填写)";
    const scope = params.scope?.map((s) => `- ${s}`).join("\n") || "- (待填写)";
    const phases = params.phases?.map((p, i) => `${i + 1}. **${p.name}** - ${p.tasks.length} 个任务`).join("\n") || "1. (待填写)";

    return `# ${params.name}

## 目标

${params.goal}

## 要点

${points}

## 范围

${scope}

## 阶段概览

${phases}

---

*创建于: ${today} | 最后更新: ${today}*
`;
  }

  private generateContextContent(taskName: string, today: string): string {
    return `# ${taskName} - 上下文

## 会话进展 (${today})

### ✅ 已完成

(暂无)

### 🟡 进行中

(暂无)

### ⚠️ 阻塞/待定

(暂无)

---

## 关键文件

(暂无)

---

## 关键决策

| 决策 | 原因 | 替代方案 | 日期 |
|------|------|----------|------|

---

## 快速交接

**下次继续从这里开始：**

1. (待填写)

**注意事项：**

- (待填写)

---

*最后更新: ${today} 10:00 by Claude*
`;
  }

  private generateTasksContent(taskName: string, phases: { name: string; tasks: { description: string; acceptance: string }[] }[]): string {
    let totalTasks = 0;
    let phasesContent = "";

    if (phases.length === 0) {
      phasesContent = `## 阶段 1: (待命名) ⏳ NOT STARTED

- [ ] (待添加任务) | 验收: (待填写)

---`;
    } else {
      phasesContent = phases
        .map((phase, i) => {
          totalTasks += phase.tasks.length;
          const tasks = phase.tasks
            .map((t, j) => {
              const marker = i === 0 && j === 0 ? " ← CURRENT" : "";
              return `- [ ] ${t.description} | 验收: ${t.acceptance}${marker}`;
            })
            .join("\n");
          return `## 阶段 ${i + 1}: ${phase.name} ⏳ NOT STARTED

${tasks}

---`;
        })
        .join("\n\n");
    }

    const firstPhase = phases.length > 0 ? `阶段 1 - ${phases[0].name}` : "(未开始)";
    const firstTask = phases.length > 0 && phases[0].tasks.length > 0
      ? phases[0].tasks[0].description
      : "(未开始)";

    return `# ${taskName} - 任务清单

## 快速恢复

**当前阶段**: ${firstPhase}
**当前任务**: ${firstTask}
**进度**: 0/${totalTasks} 任务完成

---

${phasesContent}

## 发现的新任务

(暂无)

---

*最后更新: ${formatDateTime(new Date())}*
`;
  }

  private parseTasksFile(content: string) {
    const lines = content.split("\n");
    let completed = 0;
    let total = 0;
    let currentPhase = "";
    let currentTask = "";
    const recentCompleted: string[] = [];

    for (const line of lines) {
      // Parse phase header
      const phaseMatch = line.match(/^## 阶段 \d+: (.+?) [✅🟡⏳]/);
      if (phaseMatch) {
        currentPhase = phaseMatch[1];
      }

      // Parse tasks
      const taskMatch = line.match(/^- \[([ x])\] (.+?) \| 验收:/);
      if (taskMatch) {
        total++;
        if (taskMatch[1] === "x") {
          completed++;
          recentCompleted.unshift(taskMatch[2]);
        }
      }

      // Parse current task
      if (line.includes("← CURRENT")) {
        const currentMatch = line.match(/^- \[ \] (.+?) \| 验收:/);
        if (currentMatch) {
          currentTask = currentMatch[1];
        }
      }
    }

    return {
      status: {
        phase: currentPhase || "(unknown)",
        currentTaskDescription: currentTask || "(none)",
        progress: { completed, total },
      },
      recentCompleted,
    };
  }

  private parseBlockers(content: string): string[] {
    const blockers: string[] = [];
    const blockerSection = content.match(/### ⚠️ 阻塞\/待定\n\n([\s\S]*?)(?=\n---)/);
    if (blockerSection) {
      const lines = blockerSection[1].split("\n");
      for (const line of lines) {
        if (line.startsWith("- ") && line !== "- (暂无)") {
          blockers.push(line.substring(2));
        }
      }
    }
    return blockers;
  }

  private parseContextFile(content: string) {
    const sessionProgress = {
      completed: [] as string[],
      inProgress: [] as string[],
      blocked: [] as string[],
    };

    // Parse completed
    const completedMatch = content.match(/### ✅ 已完成\n\n([\s\S]*?)(?=\n### )/);
    if (completedMatch) {
      sessionProgress.completed = completedMatch[1]
        .split("\n")
        .filter((l) => l.startsWith("- "))
        .map((l) => l.substring(2));
    }

    // Parse in progress
    const inProgressMatch = content.match(/### 🟡 进行中\n\n([\s\S]*?)(?=\n### )/);
    if (inProgressMatch) {
      sessionProgress.inProgress = inProgressMatch[1]
        .split("\n")
        .filter((l) => l.startsWith("- "))
        .map((l) => l.substring(2));
    }

    // Parse blocked
    const blockedMatch = content.match(/### ⚠️ 阻塞\/待定\n\n([\s\S]*?)(?=\n---)/);
    if (blockedMatch) {
      sessionProgress.blocked = blockedMatch[1]
        .split("\n")
        .filter((l) => l.startsWith("- ") && l !== "- (暂无)")
        .map((l) => l.substring(2));
    }

    return {
      sessionProgress,
      keyFiles: [],
      decisions: [],
      handoff: { nextSteps: [], notes: [] },
    };
  }

  private calculateProgress(content: string) {
    let totalCompleted = 0;
    let totalTasks = 0;
    let currentPhase = "(unknown)";
    let currentTask = "(none)";

    const lines = content.split("\n");
    let lastPhase = "";

    for (const line of lines) {
      const phaseMatch = line.match(/^## 阶段 \d+: (.+?) [✅🟡⏳]/);
      if (phaseMatch) {
        lastPhase = phaseMatch[1];
      }

      const taskMatch = line.match(/^- \[([ x])\] (.+?) \| 验收:/);
      if (taskMatch) {
        totalTasks++;
        if (taskMatch[1] === "x") {
          totalCompleted++;
        }
      }

      if (line.includes("← CURRENT")) {
        currentPhase = lastPhase;
        const currentMatch = line.match(/^- \[ \] (.+?) \| 验收:/);
        if (currentMatch) {
          currentTask = currentMatch[1];
        }
      }
    }

    return { totalCompleted, totalTasks, currentPhase, currentTask };
  }

  private updatePhaseStatuses(content: string): string {
    const phaseRegex = /## (阶段 \d+: .+?) ([✅🟡⏳]) (COMPLETE|IN PROGRESS|NOT STARTED)/g;

    return content.replace(phaseRegex, (match, phaseName, _emoji, _status) => {
      // Find tasks for this phase
      const phaseStart = content.indexOf(match);
      const nextPhaseMatch = content.slice(phaseStart + match.length).match(/\n## 阶段 \d+:/);
      const phaseEnd = nextPhaseMatch
        ? phaseStart + match.length + (nextPhaseMatch.index || 0)
        : content.length;

      const phaseContent = content.slice(phaseStart, phaseEnd);
      const completedCount = (phaseContent.match(/- \[x\]/g) || []).length;
      const incompleteCount = (phaseContent.match(/- \[ \]/g) || []).length;
      const totalCount = completedCount + incompleteCount;

      if (totalCount === 0) {
        return `## ${phaseName} ⏳ NOT STARTED`;
      } else if (completedCount === totalCount) {
        return `## ${phaseName} ✅ COMPLETE`;
      } else {
        return `## ${phaseName} 🟡 IN PROGRESS`;
      }
    });
  }
}
