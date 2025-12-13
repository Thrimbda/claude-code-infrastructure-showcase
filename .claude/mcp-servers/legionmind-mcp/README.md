# LegionMind MCP Server

MCP server for LegionMind cross-session context management system.

## Installation

```bash
cd .claude/mcp-servers/legionmind-mcp
npm install
```

## Development

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

## Configuration

Already configured in `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "legionmind": {
      "command": "npx",
      "args": ["tsx", ".claude/mcp-servers/legionmind-mcp/src/index.ts"],
      "env": {}
    }
  }
}
```

## Tools Provided

### Initialization
- `legion_init` - Initialize .legion directory
- `legion_create_task` - Create new task with three-file structure

### Query
- `legion_get_status` - Get current task status
- `legion_list_tasks` - List all tasks
- `legion_read_context` - Read full context

### Update
- `legion_update_plan` - Update plan.md
- `legion_update_context` - Update context.md
- `legion_update_tasks` - Update tasks.md

### Task Management
- `legion_switch_task` - Switch active task
- `legion_archive_task` - Archive completed task

## Testing

You can test the server manually:

```bash
# Run the server
npm run dev

# In another terminal, send a request via stdio
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run dev
```
