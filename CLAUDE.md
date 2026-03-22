# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A CLI tool that provides an interactive REPL for chatting with Claude API. It supports tool execution (bash, read, write, glob) and MCP server integration.

## Common Commands

```bash
# Build the project
pnpm build

# Run in development mode (tsx)
pnpm dev

# Run compiled code
pnpm start

# Required environment variable
export ANTHROPIC_API_KEY=your_api_key
```

## Architecture

- **src/index.ts**: Main entry point - REPL interface with history navigation (up/down arrows)
- **src/api/client.ts**: Claude API client - handles HTTP requests and tool use loop
- **src/tools/**: Built-in tools (bash, read, write, glob) - executed when Claude calls them
- **src/types/**: TypeScript type definitions for API requests/responses
- **src/repl/**: REPL utilities (history, parser)
- **src/mcp/**: MCP server client and registry (not fully integrated yet)

The tool execution flow: user input → API call → if tool_use response → execute tool → continue conversation until text response.