// Config types
export interface Config {
  version: string;
  currentTask: string | null;
  settings: {
    autoRemind: boolean;
    remindBeforeReset: boolean;
  };
  tasks: TaskEntry[];
}

export interface TaskEntry {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}

// Tool parameter types
export interface LegionInitParams {
  workingDirectory?: string;
}

export interface LegionCreateTaskParams {
  name: string;
  goal: string;
  points?: string[];
  scope?: string[];
  phases?: Phase[];
}

export interface Phase {
  name: string;
  tasks: TaskItem[];
}

export interface TaskItem {
  description: string;
  acceptance: string;
}

export interface LegionGetStatusParams {
  taskId?: string;
}

export interface LegionReadContextParams {
  taskId?: string;
  section?: "all" | "progress" | "decisions" | "files" | "handoff";
}

export interface LegionUpdatePlanParams {
  taskId?: string;
  goal?: string;
  points?: string[];
  scope?: string[];
  phases?: string[];
}

export interface LegionUpdateContextParams {
  taskId?: string;
  progress?: {
    completed?: string[];
    inProgress?: string[];
    blocked?: string[];
  };
  addFile?: {
    path: string;
    purpose: string;
    status: "completed" | "in_progress" | "pending" | "deleted";
    notes?: string;
  };
  addDecision?: {
    decision: string;
    reason: string;
    alternatives?: string;
    date?: string;
  };
  addConstraint?: string;
  handoff?: {
    nextSteps: string[];
    notes: string[];
  };
}

export interface LegionUpdateTasksParams {
  taskId?: string;
  completeTask?: {
    phase: number | string;
    taskIndex?: number;
    taskDescription?: string;
  };
  setCurrentTask?: {
    phase: number | string;
    taskIndex?: number;
    taskDescription?: string;
  };
  addTask?: {
    phase: number | string;
    description: string;
    acceptance: string;
  };
  addDiscoveredTask?: {
    description: string;
    source: string;
  };
  updatePhaseStatus?: {
    phase: number | string;
    status: "not_started" | "in_progress" | "complete";
  };
}

export interface LegionSwitchTaskParams {
  taskId: string;
}

export interface LegionArchiveTaskParams {
  taskId: string;
}

// Response types
export interface KeyFile {
  path: string;
  status: string;
  purpose: string;
  notes?: string;
}

export interface Decision {
  decision: string;
  reason: string;
  alternatives?: string;
  date: string;
}

export interface ParsedContext {
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
}
