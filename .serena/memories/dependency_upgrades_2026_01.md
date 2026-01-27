# Dependency Upgrades (January 2026)

## Major Versions

| Package | From | To |
|---------|------|-----|
| Next.js | 15.x | 16.1.4 |
| React | 18.x | 19.2.x |
| Tailwind CSS | 3.x | 4.1.x |
| react-markdown | 9.x | 10.x |
| sonner | 1.x | 2.x |

## Breaking Changes & Fixes

### Tailwind CSS v4

**CSS syntax change**:
```css
/* Old (v3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* New (v4) */
@import 'tailwindcss';
@config '../../tailwind.config.ts';
```

**PostCSS plugin**: `tailwindcss` → `@tailwindcss/postcss`

**darkMode format**: `['class']` (array) → `'class'` (string)

**Utility renames**:
- `shadow-sm` → `shadow-xs`
- `rounded-sm` → `rounded-xs`
- `blur-sm` → `blur-xs`
- `outline-none` → `outline-hidden`
- `flex-shrink-0` → `shrink-0`

### Next.js 16

- `next lint` removed → use `eslint .` directly
- ESLint flat config required (`eslint.config.mjs`)

### react-markdown v10

- `className` prop removed from `<ReactMarkdown>`
- Fix: Wrap in `<div className="...">` instead

### ESLint Flat Config

```javascript
// eslint.config.mjs
import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  // ...
)
```

## Config Files Changed

| File | Change |
|------|--------|
| `globals.css` | `@import 'tailwindcss'` syntax |
| `postcss.config.mjs` | `@tailwindcss/postcss` plugin |
| `tailwind.config.ts` | `darkMode: 'class'` (string) |
| `eslint.config.mjs` | Flat config format |
| `package.json` | `"type": "module"`, Node 22+ |
