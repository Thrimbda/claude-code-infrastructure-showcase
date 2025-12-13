#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { LegionMindService } from "./service.js";
import { tools } from "./tools.js";

const server = new Server(
  {
    name: "legionmind-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const service = new LegionMindService();

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "legion_init":
        return await service.init(args as any);

      case "legion_create_task":
        return await service.createTask(args as any);

      case "legion_get_status":
        return await service.getStatus(args as any);

      case "legion_list_tasks":
        return await service.listTasks();

      case "legion_read_context":
        return await service.readContext(args as any);

      case "legion_update_plan":
        return await service.updatePlan(args as any);

      case "legion_update_context":
        return await service.updateContext(args as any);

      case "legion_update_tasks":
        return await service.updateTasks(args as any);

      case "legion_switch_task":
        return await service.switchTask(args as any);

      case "legion_archive_task":
        return await service.archiveTask(args as any);

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: { code: "UNKNOWN_TOOL", message: `Unknown tool: ${name}` } }),
            },
          ],
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message } }),
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LegionMind MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
