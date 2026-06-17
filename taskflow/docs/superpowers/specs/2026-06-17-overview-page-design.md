# Overview Page — Design Spec
**Date:** 2026-06-17  
**File:** `app/dashboard/page.tsx` (right panel only)

---

## Goal

Add an Overview content panel that renders in the right area of the existing two-panel dashboard when the "Overview" nav item is active. The left sidebar and the board-selected view are unchanged.

---

## Design Constraints

- No new files, no new dependencies, no new API routes
- `"use client"` component using existing hooks
- Must pass `tsc --noEmit` strict mode
- No `any` types; use interfaces from `lib/supabase/models.ts`
- Icons: `lucide-react` only; loading states: shadcn `<Skeleton>`
- Navigation: `next/link`; no `style={{}}` except `board.color` dot bg

---

## Color & Visual Tokens

| Token | Value |
|---|---|
| Page background | `#F0EDE6` (warm cream) |
| Surface/cards | `#FFFFFF` |
| Primary purple | `#7C5CFC` |
| Purple hover | `#5B3FD4` |
| Text primary | `#1A1A18` |
| Text muted | `#6B6B68` |
| Border | `rgba(0,0,0,0.08)` |
| Stats card 1 bg | `#C8D5B9` (sage green) |
| Stats card 2 bg | `#C9A49A` (terracotta) |
| Stats card 3 bg | `#A8A4C8` (lavender) |
| Priority high | bg `#FEE2E2` / text `#991B1B` |
| Priority medium | bg `#FEF3C7` / text `#92400E` |
| Priority low | bg `#D1FAE5` / text `#065F46` |
| Card radius | `16px` |

---

## Conditional Rendering Logic (in `page.tsx`)

The right panel switches based on `activeNav`:

```
activeNav === "Overview"  →  <OverviewPanel />
activeNav !== "Overview"  →  existing board-selected view (unchanged)
```

**Sidebar board click behaviour (minimal invisible change):**  
Currently: `onClick={() => setActiveBoardId(board.id)}`  
After:     `onClick={() => { setActiveBoardId(board.id); setActiveNav(""); }}`  
This exits Overview mode when a board is selected. No visual change to the sidebar.

---

## Hook Changes — `useAnalytics`

The existing hook internally holds `tasks: TaskRow[]` (ordered newest-first from Supabase) and `boards: Board[]`, but doesn't expose raw tasks. The Overview needs recent tasks with priority + board title.

**Addition to `AnalyticsData` type:**

```ts
recentTasks: Array<{
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  created_at: string;
  board_id: string;
  board_title: string;
}>;
```

**Implementation in the existing `useMemo`:**

```ts
const boardMap = new Map(boards.map((b) => [b.id, b.title]));
const recentTasks = tasks.slice(0, 10).map((t) => ({
  id: t.id,
  title: t.title,
  priority: t.priority,
  created_at: t.created_at,
  board_id: t.board_id,
  board_title: boardMap.get(t.board_id) ?? "Unknown board",
}));
// Include in returned AnalyticsData object
```

`tasks` is already ordered `created_at DESC` from the Supabase query, so `.slice(0, 10)` is the 10 most recent.

---

## Overview Panel — Layout (top to bottom)

### 1. Page Header

```
"Overview"                          — 22px, 700, #1A1A18
"Here's what's happening across..."  — 14px, #6B6B68
```

`mb-6`

---

### 2. Stats Cards Row

3-column grid (1-col on mobile `< 640px`), `gap-3`.

| # | Label | Icon | Bg | Icon container bg | Value source |
|---|---|---|---|---|---|
| 1 | Total tasks | `LayoutList` | `#C8D5B9` | `#7A9E6E` | `analytics.overview.totalTasks` |
| 2 | High priority | `AlertTriangle` | `#C9A49A` | `#A0584A` | `analytics.priorityCounts.high` |
| 3 | Due this week | `CalendarDays` | `#A8A4C8` | `#6B65A8` | `analytics.dueDates.dueThisWeek` |

Each card: `border-radius 16px`, `padding 1.5rem`, no border, no shadow.  
Layout: icon (36×36, radius 10px, white icon) top-left → label (13px muted, above value) → value (28px bold) → subtext (12px muted).  
Loading: `<Skeleton>` matching card dimensions.

---

### 3. Your Boards Grid

Section header: "Your Boards" (16px 600) left + "View all →" (13px `#7C5CFC`) right, linking to `/dashboard`.  
`mt-8 mb-3.5`

Grid: `grid-cols-[repeat(auto-fill,minmax(200px,1fr))]` on desktop, `minmax(150px,1fr)` on mobile.  
Show max **6 boards**.

**Each board card** — white bg, `border 1px solid rgba(0,0,0,0.08)`, radius 16px, `p-5`, full card is `<Link href="/boards/[id]">`:
- Top row: `8px` colored dot (`board.color` inline style) + title (14px 600 truncated)
- Middle: "X tasks" (13px `#6B6B68`, `mt-1.5`)
- Bottom: "Open board →" (12px `#7C5CFC` 500, `mt-3.5`)
- Hover: bg `#FAFAFA`, 150ms ease

**Ghost card** (if `boards.length > 6`):  
`1px dashed rgba(0,0,0,0.15)`, same size, centered "+ X more" in muted color, `<Link href="/dashboard">`.

**Empty state** (zero boards):  
Centered within grid area: "No boards yet" + "Create your first board to get started" + `+ New board` purple pill button that calls `handleCreateBoard()`.

Loading: 3 skeleton cards.

---

### 4. Recent Activity

Section header: "Recent Activity" (16px 600), `mt-8 mb-3.5`.

Source: `analytics.recentTasks` (10 items, newest first).  
Container: white bg, `border 1px solid rgba(0,0,0,0.08)`, radius 16px, `overflow-hidden`.

**Each row** — `px-5 py-3.5`, `border-bottom 1px solid rgba(0,0,0,0.05)` (last row no border), flex, `gap-3`:

| Element | Detail | Visibility |
|---|---|---|
| Priority badge | `min-w-[56px]` pill, 10px 600, radius 6px, `py-0.5 px-1.75`, using priority colors | always |
| Task title | 14px 500 `#1A1A18`, `flex-1`, truncate | always |
| Board chip | 11px `#6B6B68`, bg `#F0EDE6`, radius 6px, `px-2 py-0.5` | hide `< 480px` |
| Date | 12px `#6B6B68`, nowrap, format "Jun 10" | hide `< 380px` |

**Empty state:** "No tasks yet — add tasks to your boards to see activity here", centered 13px muted, `py-8`.  
Loading: 5 skeleton rows.

---

## Mobile Responsiveness

| Breakpoint | Change |
|---|---|
| `< 640px` | Stats grid → 1 column |
| `< 640px` | Section titles → 14px |
| `< 640px` | Right panel padding → `p-5` (vs `p-8` desktop) |
| `< 480px` | Recent activity: hide board chip |
| `< 380px` | Recent activity: hide date |
| All widths | Boards grid: `minmax(150px)` — 2 cols minimum |
| Min viewport | 320px — no horizontal scroll |
| Tap targets | All ≥ 44×44px |

---

## Files Changed

| File | Change |
|---|---|
| `lib/hooks/useAnalytics.ts` | Add `recentTasks` to `AnalyticsData` type + populate in `useMemo` |
| `app/dashboard/page.tsx` | Conditional render in right panel; sidebar board click exits Overview; inline Overview panel JSX |

---

## What Does NOT Change

- Left sidebar component (visual and layout)
- Board-selected view (stats cards, search bar, sort, task grid, open full board button)
- Any routing outside `/dashboard`
- Analytics, Settings, Tasks nav panels
- All dialogs and modals
