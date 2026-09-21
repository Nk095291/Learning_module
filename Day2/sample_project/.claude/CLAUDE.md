---
description: Central workspace configuration for the entire team
---

# Team AI Workspace Configuration

This file defines how Claude Code agents work across our entire repository.

## Subagents Available to This Team

- **code-reviewer**: For pull request reviews and code quality checks

## Shared Standards

All agents must follow our team's coding standards defined in `.claude/skills/team-standards.md`.

## Key Principles

1. **Read-only by default** — Code reviewers and analyzers cannot modify files
2. **Clear feedback** — All findings must include location, severity, and suggestions
3. **No auto-fixes** — Agents flag issues; humans decide on fixes
4. **Team consistency** — All team members use the same agent configurations

## How Agents Are Invoked

- Mention the agent name explicitly: "Use the code-reviewer agent to..."
- Or let Claude automatically match tasks to agents based on their descriptions


## Claude.md

The difference between a frustrating Claude Code session and a productive one often comes down to context — and the CLAUDE.md file is how you provide that context. Start with your stack, your preferences, and your commands, then build from there as you go.

it get load with each command,

type : 
project level : for your team , stays in root folder
user    level : for you only , it stays in your configuration directory

TIP : 
Save corrections to memory. If you find yourself correcting Claude repeatedly — like telling it to always use server actions instead of API routes — explicitly ask Claude to save that rule to memory. Next time you open the project, it'll know.

run /init to generate one for you . 


## Subagent

at high level , they are the sub-agent that does some work and give the work summary back to claude. 

NOTE : will need to learn more about this : https://anthropic.skilljar.com/introduction-to-subagents

## Model Context Protocol (MCP) 

an open standard that lets Claude Code connect to external tools and data sources. like database, internal tools, productivity apps etc. 


to add MCP : claude mcp add --transport [type] [mcp name] [path]

-- http server : for remote mcps
-- stdio       : for local mcps

Scope : 

Local : for your current project. 
User  : for all your projects. 
Project : for your current project ( with git) and your team.

Content Cost : 
Mcp servers add tool difinitions in the context window, which eats away the context. so make sure to disable MCPs you don't use regularly. 

Difference b/w SKILL ? : initially it only load name and description into context and claude only load full skill context when it determines it need to use it. 

NOTE : If your MCP tools exceed 10% of your context window, Claude Code automatically switches to tool search mode, which discovers the right tools on demand — though this may not work as reliably.



## Hooks

Hooks give you deterministic control over Claude Code's behavior. 

PreToolUse — runs before a tool call
PostToolUse — runs after a tool call completes
UserPromptSubmit — runs when you submit a prompt, before Claude processes it
Stop — runs when Claude finishes responding
Notification — runs when Claude sends a notification

directory : 
/.claude/settings.json <- add when to use hook here
/.claude/hooks/        <- add your hooks in this folder. 

PreToolUse hooks can block tool calls before they execute. Your hook receives the tool name and input as JSON on stdin. The exit code determines the behavior:

Exit code 0 — proceed normally.
Exit code 2 — block the action. The stderr message gets fed back to Claude as feedback so it knows why it was blocked and can adjust.
Any other exit code — a non-blocking error that gets shown to you but doesn't stop anything.

NOTE :  Use the CLAUDE_PROJECT_DIR environment variable in your commands to reference scripts stored in your project, so they work regardless of Claude's current working directory.