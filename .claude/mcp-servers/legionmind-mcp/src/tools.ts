import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [
  // Initialization Tools
  {
    name: "legion_init",
    description: "Initialize .legion directory structure in the working directory",
    inputSchema: {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "Working directory path (defaults to current directory)",
        },
      },
    },
  },
  {
    name: "legion_create_task",
    description: "Create a new task with three-file structure (plan.md, context.md, tasks.md)",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Task display name (supports Chinese and other languages)",
        },
        goal: {
          type: "string",
          description: "Task goal (one sentence, used in plan.md)",
        },
        points: {
          type: "array",
          items: { type: "string" },
          description: "Key points list (used in plan.md)",
        },
        scope: {
          type: "array",
          items: { type: "string" },
          description: "Scope list - files/modules to be modified",
        },
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    acceptance: { type: "string" },
                  },
                  required: ["description", "acceptance"],
                },
              },
            },
            required: ["name", "tasks"],
          },
          description: "Implementation phases with tasks",
        },
      },
      required: ["name", "goal"],
    },
  },

  // Query Tools
  {
    name: "legion_get_status",
    description: "Get current task status summary",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Task ID (defaults to current task)",
        },
      },
    },
  },
  {
    name: "legion_list_tasks",
    description: "List all tasks",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "legion_read_context",
    description: "Read full context for a task",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Task ID (defaults to current task)",
        },
        section: {
          type: "string",
          enum: ["all", "progress", "decisions", "files", "handoff"],
          description: "Section to read (defaults to 'all')",
        },
      },
    },
  },

  // Update Tools
  {
    name: "legion_update_plan",
    description: "Update plan.md for a task",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        goal: { type: "string" },
        points: { type: "array", items: { type: "string" } },
        scope: { type: "array", items: { type: "string" } },
        phases: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "legion_update_context",
    description: "Update context.md for a task",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        progress: {
          type: "object",
          properties: {
            completed: { type: "array", items: { type: "string" } },
            inProgress: { type: "array", items: { type: "string" } },
            blocked: { type: "array", items: { type: "string" } },
          },
        },
        addFile: {
          type: "object",
          properties: {
            path: { type: "string" },
            purpose: { type: "string" },
            status: { type: "string", enum: ["completed", "in_progress", "pending", "deleted"] },
            notes: { type: "string" },
          },
          required: ["path", "purpose", "status"],
        },
        addDecision: {
          type: "object",
          properties: {
            decision: { type: "string" },
            reason: { type: "string" },
            alternatives: { type: "string" },
            date: { type: "string" },
          },
          required: ["decision", "reason"],
        },
        addConstraint: { type: "string" },
        handoff: {
          type: "object",
          properties: {
            nextSteps: { type: "array", items: { type: "string" } },
            notes: { type: "array", items: { type: "string" } },
          },
          required: ["nextSteps", "notes"],
        },
      },
    },
  },
  {
    name: "legion_update_tasks",
    description: "Update tasks.md for a task",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        completeTask: {
          type: "object",
          properties: {
            phase: { type: ["number", "string"] },
            taskIndex: { type: "number" },
            taskDescription: { type: "string" },
          },
          required: ["phase"],
        },
        setCurrentTask: {
          type: "object",
          properties: {
            phase: { type: ["number", "string"] },
            taskIndex: { type: "number" },
            taskDescription: { type: "string" },
          },
          required: ["phase"],
        },
        addTask: {
          type: "object",
          properties: {
            phase: { type: ["number", "string"] },
            description: { type: "string" },
            acceptance: { type: "string" },
          },
          required: ["phase", "description", "acceptance"],
        },
        addDiscoveredTask: {
          type: "object",
          properties: {
            description: { type: "string" },
            source: { type: "string" },
          },
          required: ["description", "source"],
        },
      },
    },
  },

  // Task Management Tools
  {
    name: "legion_switch_task",
    description: "Switch to a different task",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Target task ID",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "legion_archive_task",
    description: "Archive a completed task",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Task ID to archive",
        },
      },
      required: ["taskId"],
    },
  },
];
