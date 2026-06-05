# TaskCard Component Design

**Date:** 2026-06-05  
**Scope:** UI-only — no backend, no drag-and-drop, no Supabase changes

---

## Goal

Build a reusable `TaskCard` component and integrate it into the kanban board's column task list, replacing the current placeholder `<div>{task.title}</div>`.

---

## Component

**File:** `taskflow/components/kanban/TaskCard.tsx`

**Props:**
```ts
interface TaskCardProps {
  task: Task; // from @/lib/supabase/models
}
```

**Approach:** Single flat component — all rendering logic (date formatting, priority color, assignee fallback) lives inline. No helper files extracted.

---

## Visual Structure

```
┌─────────────────────────────────────┐
│ ● Title (bold)                      │
│ Description line 1...               │  ← max 2 lines, ellipsis
│ Description line 2...               │
│ [Assignee pill]        12 Jun       │
└─────────────────────────────────────┘
```

- `●` is a 10px filled circle (priority dot), placed to the left of the title in the same row
- Due date is right-aligned in the footer row; omitted entirely when null

---

## Element Specs

### Card wrapper
- shadcn `<Card>` component
- Hover effect: `transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer`
- Margin between cards: `mb-2`

### Priority dot
- `w-2.5 h-2.5 rounded-full shrink-0` inline with title
- `bg-green-500` for `"low"`
- `bg-yellow-500` for `"medium"`
- `bg-red-500` for `"high"`

### Title
- `font-semibold text-sm` (bold, primary text color)
- Wraps naturally — no truncation

### Description
- Rendered only when `task.description` is non-null
- `text-xs text-muted-foreground line-clamp-2`
- Overflow truncated with ellipsis via Tailwind `line-clamp-2`

### Assignee pill
- Always rendered: shows `task.assignee` or `"Unassigned"` when null
- `rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground`

### Due date
- Rendered only when `task.due_date` is non-null
- Format: `new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })` → "12 Jun"
- `text-xs text-muted-foreground`

---

## Integration

**File:** `taskflow/app/boards/[id]/page.tsx`

Replace the task rendering block inside the `Column` children:

```tsx
// Before
{column.tasks.map((task, key) => (
  <div key={key}>{task.title}</div>
))}

// After
{column.tasks.map((task) => (
  <TaskCard key={task.id} task={task} />
))}
```

Key changes from index → `task.id` for stable identity. No other Column logic is modified.

---

## Constraints

- No drag-and-drop changes
- No Supabase or data layer changes
- No new libraries
- No state management changes
- Column component logic stays entirely intact

---

## Testing Checklist

After `npm run dev`:

- [ ] `/dashboard` loads without error
- [ ] `/boards/[id]` shows TaskCards in each column
- [ ] Title renders bold
- [ ] Long description truncates after 2 lines
- [ ] Priority dot is green/yellow/red per value
- [ ] Assignee pill shows name or "Unassigned"
- [ ] Due date shows as "12 Jun" format (or is absent when null)
- [ ] Hover lifts the card slightly
- [ ] No layout breaks in columns
