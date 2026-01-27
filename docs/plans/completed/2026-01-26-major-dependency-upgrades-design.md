# Major Dependency Upgrades Design

**Date:** 2026-01-26
**Status:** Completed (PR #1)
**Completed:** 2026-01-26

## Overview

This document outlines the breaking changes and required remediations for upgrading 8 major dependencies in the agent-ui project.

## Package Versions

| Package | Current | Target |
|---------|---------|--------|
| @types/node | ^20 | ^25 |
| eslint-config-next | 15.2.3 | 16.1.4 |
| next | 15.2.8 | 16.1.4 |
| react | ^18.3.1 | ^19.2.3 |
| react-dom | ^18.3.1 | ^19.2.3 |
| react-markdown | ^9.0.3 | ^10.1.0 |
| sonner | ^1.7.4 | ^2.0.7 |
| tailwindcss | ^3.4.1 | ^4.1.18 |

## Dependency Graph

```mermaid
React 19 ◄─── react-markdown@10
    │     ◄─── sonner@2
    │
    ▼
Next.js 16 ◄─── eslint-config-next@16
    │
    ▼
Tailwind v4 (independent)
    │
    ▼
@types/node (independent)
```

---

## Phase 1+2: React 19 + Next.js 16

### React 18 → 19 Breaking Changes

| Change | Codebase Impact | Action |
|--------|-----------------|--------|
| `ReactDOM.render()` removed | Not used (Next.js handles) | None |
| `forwardRef` now optional | 5 components use it | Optional simplification |
| `useRef()` requires argument | Some refs may need typing | Run typecheck |
| PropTypes removed | Not used (TypeScript) | None |
| String refs removed | Not used | None |

**Affected Files:**

- `src/components/ui/button.tsx` - forwardRef (works, optionally simplify)
- `src/components/ui/textarea.tsx` - forwardRef + custom ref handling
- `src/components/ui/dialog.tsx` - forwardRef
- `src/components/ui/select.tsx` - forwardRef
- `src/components/ui/tooltip.tsx` - forwardRef

### Next.js 15 → 16 Breaking Changes

| Change | Codebase Impact | Action |
|--------|-----------------|--------|
| Requires React 19 | Upgrade React first | Phase together |
| Config format | Already `.ts` | None |
| App Router default | Already using | None |
| Image alt enforcement | MarkdownRenderer | Verify |

**Dependencies to Verify:**

- `nuqs@2.8.6` - URL state library
- `next-themes@0.4.6` - Theme provider

### react-markdown 9 → 10

| Change | Codebase Impact | Action |
|--------|-----------------|--------|
| React 19 peer dep | Upgrade React first | Phase together |
| Component prop changes | Custom mappings | Test thoroughly |
| Plugin API | remark-gfm, rehype-raw, rehype-sanitize | Verify compatibility |

**Affected Files:**

- `src/components/ui/typography/MarkdownRenderer/MarkdownRenderer.tsx`
- `src/components/ui/typography/MarkdownRenderer/components.tsx`
- `src/components/ui/typography/MarkdownRenderer/inlineComponents.tsx`

### Sonner 1 → 2

| Change | Codebase Impact | Action |
|--------|-----------------|--------|
| Style injection changed | May break toast display | Test thoroughly |
| Multiple Toaster support | Single Toaster used | None |
| classNames API | Custom Tailwind classes | Verify |

**Affected Files:**

- `src/components/ui/sonner.tsx`

**Risk:** Users reported toasts stopped showing after v2 upgrade.

---

## Phase 3: Tailwind CSS v3 → v4

This is the highest-effort upgrade with architectural changes.

### Configuration Changes

**globals.css** - Complete rewrite required:

```css
/* BEFORE (v3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* AFTER (v4) */
@import "tailwindcss";
@config "../../tailwind.config.ts";
```

**postcss.config.mjs** - Plugin change:

```js
// BEFORE (v3)
export default {
  plugins: {
    tailwindcss: {},
  }
}

// AFTER (v4)
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  }
}
```

### New Package Required

```bash
pnpm add -D @tailwindcss/postcss
```

### Utility Class Renames

| v3 Class | v4 Class | Files Using |
|----------|----------|-------------|
| `shadow-sm` | `shadow-xs` | textarea.tsx, multiple UI components |
| `shadow` | `shadow-sm` | Various components |
| `rounded-sm` | `rounded-xs` | Multiple components |
| `rounded` | `rounded-sm` | Multiple components |
| `blur-sm` | `blur-xs` | If used |
| `outline-none` | `outline-hidden` | Focus states |

### Default Value Changes

| Property | v3 Default | v4 Default | Action |
|----------|------------|------------|--------|
| Border color | `gray-200` | `currentColor` | Add explicit colors |
| Ring color | `blue-500` | `currentColor` | Add explicit colors |
| Ring width | `3px` | `1px` | Use `ring-3` for old behavior |

### CSS Variable Syntax

```html
<!-- BEFORE (v3) -->
<div class="bg-[--brand-color]"></div>

<!-- AFTER (v4) -->
<div class="bg-(--brand-color)"></div>
```

### Important Modifier Position

```html
<!-- BEFORE (v3) -->
<div class="!flex hover:!bg-red-500">

<!-- AFTER (v4) -->
<div class="flex! hover:bg-red-500!">
```

---

## Phase 4: @types/node v20 → v25

Low-risk upgrade tracking Node.js API type changes.

**Action:**

1. Update package
2. Run `pnpm typecheck`
3. Fix any new type errors

---

## Implementation Strategy

### Recommended Order

1. **Create upgrade branch** using git worktree for isolation
2. **Phase 1+2** - React 19 + Next.js 16 + react-markdown + sonner (one PR)
3. **Phase 3** - Tailwind v4 (separate PR, high effort)
4. **Phase 4** - @types/node (can be done anytime)

### Testing Checklist

- [x] `pnpm build` succeeds
- [x] `pnpm validate` passes (lint + format + typecheck)
- [ ] Application renders without console errors
- [ ] Toast notifications display correctly
- [ ] Markdown rendering works (code blocks, tables, images)
- [ ] Dark mode toggle works
- [ ] All Tailwind classes render correctly
- [ ] Responsive layouts intact

### Rollback Plan

Each phase in separate PR allows independent rollback if issues discovered in production.

---

## Sources

- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React 18 to 19 Codemods](https://docs.codemod.com/guides/migrations/react-18-19)
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Sonner GitHub Releases](https://github.com/emilkowalski/sonner/releases)
