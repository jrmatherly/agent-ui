# Component Reference

## Overview

Agent UI uses a component architecture with three layers:

1. **UI Primitives** (`components/ui/`) - Reusable, styled base components
2. **Feature Components** (`components/chat/`, `components/auth/`, `components/dashboard/`) - Domain-specific compositions
3. **Enterprise Components** (`components/enterprise/`, `components/knowledge/`) - Enterprise features

---

## UI Primitives

### Button

Variant-based button component using `class-variance-authority`.

**Location:** `src/components/ui/button.tsx`

**Variants:**

| Variant | Description |
|---------|-------------|
| `default` | Primary action button |
| `destructive` | Delete/danger actions |
| `outline` | Secondary bordered button |
| `secondary` | Less prominent actions |
| `ghost` | Minimal, icon-only style |
| `link` | Text link appearance |

**Sizes:** `default`, `sm`, `lg`, `icon`

**Usage:**

```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="sm">
  Click me
</Button>

<Button variant="ghost" size="icon">
  <Icon type="plus-icon" />
</Button>
```

---

### Dialog

Modal dialog using Radix UI primitives.

**Location:** `src/components/ui/dialog.tsx`

**Exports:**

- `Dialog` - Root container
- `DialogTrigger` - Open trigger
- `DialogContent` - Modal content
- `DialogHeader` - Header section
- `DialogFooter` - Footer section
- `DialogTitle` - Title text
- `DialogDescription` - Description text

**Usage:**

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <p>Dialog content here</p>
  </DialogContent>
</Dialog>
```

---

### Select

Dropdown select using Radix UI primitives.

**Location:** `src/components/ui/select.tsx`

**Exports:**

- `Select` - Root container
- `SelectTrigger` - Dropdown trigger
- `SelectValue` - Selected value display
- `SelectContent` - Options container
- `SelectItem` - Individual option
- `SelectGroup` - Option grouping
- `SelectLabel` - Group label

**Usage:**

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

<Select value={selected} onValueChange={setSelected}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

---

### Skeleton

Loading placeholder component.

**Location:** `src/components/ui/skeleton.tsx`

**Usage:**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

// Loading state
<Skeleton className="h-4 w-[200px]" />
<Skeleton className="h-4 w-[150px]" />

// Custom shapes
<Skeleton className="h-12 w-12 rounded-full" />
```

---

### Textarea

Text input area component.

**Location:** `src/components/ui/textarea.tsx`

**Usage:**

```tsx
import { Textarea } from '@/components/ui/textarea'

<Textarea
  placeholder="Type your message..."
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  rows={3}
/>
```

---

### Sonner (Toast)

Toast notification system using Sonner library.

**Location:** `src/components/ui/sonner.tsx`

**Usage:**

```tsx
import { toast } from 'sonner'

// Success toast
toast.success('Message sent!')

// Error toast
toast.error('Failed to connect')

// Custom toast
toast('Custom message', {
  description: 'Additional details'
})
```

---

### Icon

Custom icon system with provider-specific icons.

**Location:** `src/components/ui/icon/`

**Available Icons:**

| Type | Description |
|------|-------------|
| `agent` | Agent icon |
| `agno` | Agno logo |
| `anthropic` | Anthropic/Claude |
| `open-ai` | OpenAI |
| `gemini` | Google Gemini |
| `aws` | AWS Bedrock |
| `azure` | Azure OpenAI |
| `groq` | Groq |
| `mistral` | Mistral AI |
| `cohere` | Cohere |
| `deepseek` | DeepSeek |
| `ollama` | Ollama |
| `xai` | xAI |
| `send` | Send message |
| `trash` | Delete |
| `edit` | Edit |
| `plus-icon` | Add new |
| `refresh` | Refresh |
| ... | More in constants.tsx |

**Usage:**

```tsx
import { Icon } from '@/components/ui/icon'

<Icon type="open-ai" size={24} />
<Icon type="send" className="text-primary" />
```

---

### Tooltip

Hover tooltip using Radix UI.

**Location:** `src/components/ui/tooltip/`

**Exports:**

- `Tooltip` - Root
- `TooltipTrigger` - Trigger element
- `TooltipContent` - Tooltip content
- `TooltipProvider` - Context provider
- `CustomTooltip` - Pre-configured wrapper

**Usage:**

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

<Tooltip>
  <TooltipTrigger asChild>
    <Button>Hover me</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Tooltip text</p>
  </TooltipContent>
</Tooltip>
```

---

### Typography

Text components with consistent styling.

**Location:** `src/components/ui/typography/`

#### Heading

```tsx
import { Heading } from '@/components/ui/typography/Heading'

<Heading level={1}>Page Title</Heading>
<Heading level={2}>Section Title</Heading>
```

#### Paragraph

```tsx
import { Paragraph } from '@/components/ui/typography/Paragraph'

<Paragraph size="sm">Small text</Paragraph>
<Paragraph size="base">Normal text</Paragraph>
```

#### MarkdownRenderer

Renders markdown content with syntax highlighting.

```tsx
import { MarkdownRenderer } from '@/components/ui/typography/MarkdownRenderer'

<MarkdownRenderer content="# Hello **World**" />
```

**Features:**

- GitHub Flavored Markdown
- Code syntax highlighting
- Sanitized HTML output
- Custom styling for inline/block elements

---

## Auth Components

Authentication-related components for login and SSO.

**Location:** `src/components/auth/`

### LoginPage

Main login page UI with SSO buttons and admin fallback.

**Location:** `src/components/auth/LoginPage.tsx`

**Features:**

- Dynamic SSO provider buttons
- Admin login toggle
- Redirect preservation via query param

**Usage:**

```tsx
import { LoginPage } from '@/components/auth'

// Used in src/app/login/page.tsx
<LoginPage />
```

---

### SSOButtons

Renders SSO provider buttons fetched from `/api/auth/sso/providers`.

**Location:** `src/components/auth/SSOButtons.tsx`

**Props:**

```typescript
interface SSOButtonsProps {
  callbackURL: string  // Redirect URL after successful login
}
```

**Usage:**

```tsx
import { SSOButtons } from '@/components/auth'

<SSOButtons callbackURL="/dashboard" />
```

---

### AdminLoginForm

Email/password form for admin login (hidden by default on login page).

**Location:** `src/components/auth/AdminLoginForm.tsx`

**Props:**

```typescript
interface AdminLoginFormProps {
  callbackURL: string  // Redirect URL after successful login
}
```

**Usage:**

```tsx
import { AdminLoginForm } from '@/components/auth'

<AdminLoginForm callbackURL="/" />
```

---

## Dashboard Components

Dashboard widgets for the landing page.

**Location:** `src/components/dashboard/`

### Dashboard

Main dashboard container with tabbed navigation.

**Location:** `src/components/dashboard/Dashboard.tsx`

**Features:**

- Welcome message with user name
- Tab navigation (Overview, Admin for admins)
- Role-adaptive content

**Usage:**

```tsx
import { Dashboard } from '@/components/dashboard'

<Dashboard />
```

---

### UsageStats

Displays usage statistics in a card layout.

**Location:** `src/components/dashboard/UsageStats.tsx`

**Displays:**

- Total sessions
- Active agents
- Messages this week
- Average response time

---

### QuickActions

Action buttons for common tasks.

**Location:** `src/components/dashboard/QuickActions.tsx`

**Actions:**

- New Chat → `/chat`
- Knowledge Base → `/knowledge`
- Settings → `/profile`

---

### PinnedAgents

Grid of favorite/pinned agents.

**Location:** `src/components/dashboard/PinnedAgents.tsx`

**Features:**

- Agent avatar and name
- Click to start chat with agent
- Empty state when no pins

---

### RecentSessions

List of recent chat sessions with resume links.

**Location:** `src/components/dashboard/RecentSessions.tsx`

**Features:**

- Session name and relative time
- Click to resume session
- View all link

---

### TeamActivityFeed

Activity stream showing team member actions.

**Location:** `src/components/dashboard/TeamActivityFeed.tsx`

**Displays:**

- User avatar and name
- Action description
- Relative timestamp

---

### AdminMetrics

Admin-only metrics panel (shown in Admin tab).

**Location:** `src/components/dashboard/AdminMetrics.tsx`

**Displays:**

- Total users
- Active users (24h)
- Total agents
- Total sessions
- Average session duration
- Error rate

---

## Chat Components

### Sidebar

Left navigation panel containing entity selection and sessions.

**Location:** `src/components/chat/Sidebar/`

**Sub-components:**

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Container layout |
| `EntitySelector` | Agent/Team dropdown |
| `ModeSelector` | Agent vs Team toggle |
| `AuthToken` | API token configuration |
| `NewChatButton` | Clear chat action |
| `Sessions` | Session list container |
| `SessionItem` | Individual session |
| `SessionBlankState` | Empty sessions state |
| `DeleteSessionModal` | Deletion confirmation |

---

### ChatArea

Main chat interface area.

**Location:** `src/components/chat/ChatArea/`

**Sub-components:**

| Component | Purpose |
|-----------|---------|
| `ChatArea` | Container layout |
| `MessageArea` | Scrollable message container |
| `Messages` | Message list renderer |
| `MessageItem` | Individual message display |
| `ChatInput` | Message input form |
| `ScrollToBottom` | Auto-scroll button |
| `ChatBlankState` | Empty chat state |
| `AgentThinkingLoader` | Streaming indicator |

---

### MessageItem

Renders individual chat messages with all content types.

**Location:** `src/components/chat/ChatArea/Messages/MessageItem.tsx`

**Features:**

- User vs Assistant styling
- Markdown content rendering
- Tool call visualization
- Reasoning steps display
- Media attachments (images, videos, audio)
- Timestamps
- Streaming state

**Props:**

```typescript
interface MessageItemProps {
  message: ChatMessage
  isStreaming?: boolean
}
```

---

### Multimedia Components

Handle media content in messages.

**Location:** `src/components/chat/ChatArea/Messages/Multimedia/`

#### Images

```tsx
import { Images } from '@/components/chat/ChatArea/Messages/Multimedia/Images'

<Images images={message.images} />
```

#### Videos

```tsx
import { Videos } from '@/components/chat/ChatArea/Messages/Multimedia/Videos'

<Videos videos={message.videos} />
```

#### Audios

```tsx
import { Audios } from '@/components/chat/ChatArea/Messages/Multimedia/Audios'

<Audios audios={message.audio} />
```

---

## Component Patterns

### 1. Index Exports

Each component folder has an `index.ts` for clean imports:

```tsx
// src/components/chat/Sidebar/index.ts
export { default as Sidebar } from './Sidebar'
export * from './Sessions'
```

### 2. Default Exports

Components use default exports:

```tsx
// Sidebar.tsx
const Sidebar = () => { ... }
export default Sidebar

// Usage
import Sidebar from '@/components/chat/Sidebar'
```

### 3. Styling with cn()

All components use the `cn()` utility for conditional classes:

```tsx
import { cn } from '@/lib/utils'

<div className={cn(
  'base-styles',
  isActive && 'active-styles',
  className
)}>
```

### 4. Client Components

Interactive components use `'use client'` directive:

```tsx
'use client'

import { useState } from 'react'

const InteractiveComponent = () => {
  const [state, setState] = useState()
  // ...
}
```

### 5. Store Integration

Components access global state via `useStore`:

```tsx
import { useStore } from '@/store'

const Component = () => {
  const messages = useStore((state) => state.messages)
  const setMessages = useStore((state) => state.setMessages)
  // ...
}
```

---

## Styling Guidelines

### Tailwind Classes

Use semantic color classes:

```tsx
// Good
<div className="bg-background text-foreground">

// Avoid hard-coded colors
<div className="bg-white text-black">
```

### Dark Mode

Colors automatically adapt via CSS variables:

```tsx
// Works in both light and dark modes
<div className="bg-card text-card-foreground">
```

### Responsive Design

Use Tailwind breakpoints:

```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
```

### Animation

Use Framer Motion for complex animations:

```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
```
