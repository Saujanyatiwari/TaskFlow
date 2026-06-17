# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js + Turbopack)
npm run build    # Production build (Turbopack)
npm run lint     # Run ESLint
npm start        # Start production server
```

No test suite is configured yet.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Clerk** (`@clerk/nextjs`) — authentication and session management
- **Supabase** — PostgreSQL database with SSR client (`@supabase/ssr`)
- **TailwindCSS v4** + **shadcn/ui** (Radix Nova style, Lucide icons)
- **@dnd-kit** — drag-and-drop for kanban (dependencies installed, UI partially implemented)

## Architecture

### Data flow

```
Page/Component → Custom Hook → Service Layer → Supabase Client
```

- **`lib/services.ts`** — all Supabase CRUD, grouped into `boardService`, `columnService`, `taskService`, `boardDataService`. `boardDataService.createBoardWithDefaultColumns()` creates a board plus 4 default columns (To Do, In Progress, Review, Done).
- **`lib/hooks/`** — `useBoards` (board list) and `useBoard` (single board with columns + tasks). These are the primary data-access layer for components.
- **`lib/supabase/`** — Supabase client setup. `provider.tsx` holds `SupabaseProvider`, which injects the Clerk session token into the Supabase client for authenticated requests. `server.ts` creates the SSR client using Next.js cookies.

### Auth

Clerk handles auth end-to-end. `middleware.ts` protects routes via Clerk's middleware. Inside components, use `useUser()` from Clerk. For Supabase queries that need the authenticated user's identity, the `SupabaseProvider` wires the Clerk session token into the Supabase client automatically — no manual token passing needed.

### Routing

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/dashboard` | Lists the current user's boards |
| `/boards/[id]` | Kanban view for a single board |

### Database models

Defined in `lib/supabase/models.ts`:

- `Board` — `id, title, description, color, user_id, created_at, updated_at`
- `Column` — `id, board_id, title, sort_order, user_id, created_at`
- `Task` — `id, column_id, title, description, assignee, due_date, priority ("low"|"medium"|"high"), sort_order, created_at`

### Path alias

`@/*` maps to the project root (e.g., `@/lib/services`, `@/components/ui/button`).

## Active development notes

- Drag-and-drop UI is not yet fully wired — `@dnd-kit` is installed and some dropzone code exists but is commented out in the board page.
- `lib/contexts/` contains a duplicate of `useBoards`; the canonical version is in `lib/hooks/`.
- Environment variables (Clerk keys, Supabase URL/anon key) live in `.env` — there is no `.env.example`.
