---
name: team-standards
description: Coding standards and best practices for this team
---

# Our Team's Coding Standards

## Security
- No hardcoded credentials or secrets
- Validate all user inputs
- Use parameterized queries for database access

## Performance
- Avoid N+1 query patterns
- Cache appropriately
- Profile before optimizing

## Code Quality
- Function complexity under 10 lines average
- Meaningful variable names (no single letters except loops)
- No dead code or commented-out sections