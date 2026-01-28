# UI Design Patterns & Guidelines

## Color Token System

### Valid Color Tokens

Use these semantic color tokens (defined in CSS variables):

| Token | Use Case |
|-------|----------|
| `bg-background` | Page background |
| `bg-secondary` | Input fields, selectors, secondary surfaces |
| `bg-accent` | Highlighted areas, hover states |
| `bg-brand` | Primary action buttons (NEW CHAT, Send) |
| `bg-card` | Card backgrounds |
| `bg-destructive` | Error/danger backgrounds |
| `bg-positive` | Success indicators |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary/subdued text |
| `text-white` | Text on brand backgrounds |
| `border-border` | Standard borders |
| `border-primary/15` | Subtle borders with transparency |

### Invalid/Undefined Tokens (DO NOT USE)

These tokens were found to be undefined and cause invisible text:

- ~~`bg-primaryAccent`~~ → Use `bg-secondary`
- ~~`text-primaryAccent`~~ → Use `text-foreground` or `text-white`
- ~~`text-muted`~~ (low contrast) → Use `text-muted-foreground`

### WCAG Contrast Requirements

- Normal text: 4.5:1 minimum contrast ratio
- Large text (18px+): 3:1 minimum contrast ratio
- `text-muted-foreground` on `bg-accent`: ~5:1 ✓
- `text-foreground` on `bg-secondary`: ~8:1 ✓

## Button Patterns

### Primary Action Buttons

```tsx
// NEW CHAT button, Send button, other CTAs
<Button className="bg-brand hover:bg-brand/90 active:bg-brand/80 text-white">
  Action
</Button>
```

### Icon-Only Buttons

```tsx
<Button variant="ghost" size="icon" className="hover:bg-transparent">
  <Icon type="refresh" size="xs" />
</Button>
```

## Hydration-Safe Components

For components that render differently on server vs client, use the `isMounted` pattern:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

function MyComponent() {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Server and initial client render show skeleton
  if (!isMounted) {
    return <Skeleton className="h-10 w-full" />
  }
  
  // Client-only content after hydration
  return <div>Client content</div>
}
```

**When to use:**
- Components using `localStorage` or browser APIs
- Components with auth-dependent rendering
- Components using `next-themes` or similar client-only state

## Flex Layout Patterns

### Scrollable Content with Fixed Header/Footer

```tsx
// Container
<div className="flex h-full flex-col">
  {/* Fixed header */}
  <div className="shrink-0">Header</div>
  
  {/* Scrollable content - KEY: min-h-0 + flex-1 */}
  <div className="min-h-0 flex-1 overflow-y-auto">
    Scrollable content
  </div>
  
  {/* Fixed footer pushed to bottom */}
  <div className="mt-auto shrink-0">Footer</div>
</div>
```

**Important:** `min-h-0` is required for flex children to respect `overflow-y-auto`. Without it, the content will overflow instead of scroll.

### Sidebar Footer Pattern

```tsx
<div className="flex h-full flex-col">
  {/* Main content */}
  <div className="min-h-0 flex-1">{/* Sessions, etc. */}</div>
  
  {/* Footer sections pushed to bottom */}
  <div className="border-border mt-auto border-t pt-3">
    <span>Theme</span>
    <ThemeToggle />
  </div>
  <div className="pt-2">
    <UserProfile />
  </div>
</div>
```

## Icon System

### Adding New Icons

1. Add import in `src/components/ui/icon/constants.tsx`:
```tsx
import { Settings, LogOut } from 'lucide-react'
```

2. Add to ICONS object:
```tsx
export const ICONS = {
  // ... existing icons
  settings: Settings,
  logout: LogOut
}
```

3. Add to IconType union in `src/components/ui/icon/types.ts`:
```tsx
export type IconType = 
  | 'settings'
  | 'logout'
  // ... other types
```

### Usage
```tsx
<Icon type="settings" size="xs" />
<Icon type="logout" size="xs" className="text-destructive" />
```

## Dropdown Menu Pattern

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="hover:bg-secondary flex w-full items-center gap-3 rounded-xl p-2">
      {/* Trigger content */}
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56">
    <DropdownMenuItem onClick={action} className="gap-2">
      <Icon type="icon-name" size="xs" />
      Menu Item
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive focus:text-destructive gap-2">
      <Icon type="logout" size="xs" />
      Destructive Action
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Components Reference

### SidebarUserProfile

User avatar dropdown in sidebar footer.

**Location:** `src/components/chat/Sidebar/SidebarUserProfile.tsx`

**Features:**
- Hydration-safe with skeleton loading
- User avatar with fallback initials
- Dropdown menu with Profile, Admin, Sign Out options
- Conditional rendering when not authenticated

### ThemeToggle

Theme switcher dropdown (Light/Dark/System).

**Location:** `src/components/ui/theme-toggle.tsx`

**Integration in Sidebar:**
```tsx
import { ThemeToggle } from '@/components/ui/theme-toggle'

// In sidebar footer
<div className="border-border mt-auto flex items-center justify-between border-t pt-3">
  <span className="text-muted-foreground text-xs font-medium uppercase">Theme</span>
  <ThemeToggle />
</div>
```
