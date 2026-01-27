# Task Completion Checklist

## Before Committing

1. **Validate** (required):
   ```bash
   mise validate
   ```

2. **If validation fails**:
   ```bash
   mise lint:fix     # Fix lint errors
   mise format:fix   # Fix formatting
   # TypeScript errors: fix manually
   ```

3. **Test locally**:
   ```bash
   mise dev
   # Open http://localhost:3000
   ```

4. **Build check** (for production changes):
   ```bash
   mise build
   ```

## Quality Standards

- No TypeScript errors (strict mode)
- No ESLint warnings/errors
- Prettier formatting applied
- No unused imports/variables
- Tailwind classes sorted

## Quick Reference

| Check | Command |
|-------|---------|
| All checks | `mise validate` |
| Lint only | `mise lint` |
| Format only | `mise format` |
| Types only | `mise typecheck` |
| Unit tests | `mise test` |
| E2E tests | `mise test:e2e` |

> **Code style details**: `docs/DEVELOPER_GUIDE.md`
