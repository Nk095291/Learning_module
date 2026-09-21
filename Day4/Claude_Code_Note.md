# Claude Code


## Plan Mode

### how to use it effectively ? 

- Define Success Criteria Properly. 
- Add Tools. 
- Include Test Suit ( or mentioned testcaes to cover).

After that : 

- Spawn another subagent as code reviewer and get your changes review. 


## Context Window 

/compact -> to compact the history till now
/clear   -> to start new 
/context -> to get high level view of your context size.
/btw     -> to add notes without affecting the running agents.
/commit-push-pr -> to commit , push and PR creation.
claude --from-pr <PR_NUMBER> : to handle PR comments and build fails from CLI


Tips for Saving Context Space
Be specific. A vague prompt might seem smaller, but it actually costs more context in the long run. Without clear instructions, Claude is forced to explore your codebase more and do its own reasoning — which takes up far more context space than a detailed prompt would.

Manage your MCP servers. MCP servers load all of their available tools into context by default, even when you're not using them. If you have servers configured for things unrelated to the current project, consider turning them off. You can also try "Skills," which work similarly to MCP servers but don't load everything into context upfront. 

Use subagents. Subagents run in parallel with your main agent but have a completely separate context window. For tasks where you only need the answer — like "where are the authentication endpoints located?" — a subagent does the work and returns just a summary to your main agent, keeping your primary context clean.