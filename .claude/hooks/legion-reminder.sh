#!/bin/bash

# LegionMind Session End Reminder Hook
# Type: UserPromptSubmit
# Purpose: Remind to update .legion/ before session ends
# Behavior: Non-blocking, only shows reminder

# Check if .legion directory exists
LEGION_DIR=".legion"
if [ ! -d "$LEGION_DIR" ]; then
    exit 0
fi

# Read user prompt from stdin
read -r INPUT
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)

if [ -z "$PROMPT" ]; then
    exit 0
fi

# Check for session end signals (case insensitive)
PROMPT_LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

# End signals in English and Chinese
END_SIGNALS="done|finish|bye|exit|reset|compact|结束|完成|退出|重置|压缩"

if echo "$PROMPT_LOWER" | grep -qiE "($END_SIGNALS)"; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "💡 LEGIONMIND REMINDER"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Detected .legion/ directory. Before ending:"
    echo ""
    echo "1. Update tasks.md - mark completed tasks"
    echo "2. Update context.md - update 快速交接 section"
    echo "3. Record any blockers or pending items"
    echo ""
    echo "Use legion_update_tasks and legion_update_context"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

exit 0
