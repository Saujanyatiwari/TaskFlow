# Enterprise AI Health Report — Design Spec

**Date:** 2026-06-10
**Feature:** AI Project Health Report (Enterprise)
**Status:** Approved — ready for implementation

---

## Overview

Add a "✨ AI Insights" button to the board toolbar, gated behind the Enterprise plan. Clicking it opens a right-side Sheet panel that generates a structured AI Project Health Report for the currently viewed board using Gemini. The report is generated on demand, cached while the panel is mounted, and never stored in Supabase.

---

## Scope

### In scope
- `lib/ai/` service layer (types, prompts, provider interface, Gemini implementation)
- `lib/utils/planCheck.ts` — reusable server-side plan helper
- `lib/utils/rateLimit.ts` — rate-limit stub
- `app/api/ai/health-report/route.ts` — secure POST endpoint
- `components/ai/BoardHealthButton.tsx` — toolbar button + Sheet wrapper
- `components/ai/BoardHealthPanel.tsx` — display component
- `components/ai/ReportSection.tsx` — reusable labeled section card
- Fix `lib/hooks/usePlanLimits.ts` to read plan from Clerk `publicMetadata`
- New dependencies: `zod`, `@google/generative-ai`

### Out of scope
- Supabase storage of reports
- Auto-fetch on panel open
- AI chat, sidebar, recommendations page, analytics integration
- Additional AI features beyond the health report
- Rate-limit enforcement (stub only)

---

## New Dependencies

| Package | Purpose |
|---|---|
| `zod` | Runtime validation of AI responses and request bodies |
| `@google/generative-ai` | Official Gemini SDK |

Install: `npm install zod @google/generative-ai`

---

## Environment Variables

Added to `.env` (already gitignored, never exposed to client):

```
GEMINI_API_KEY=         # Required — Gemini API key from Google AI Studio
GEMINI_MODEL=           # Optional — defaults to "gemini-1.5-flash"
AI_PROVIDER=gemini      # Optional — defaults to "gemini"; enables future provider swap
```

---

## Architecture

### Directory layout

```
lib/
  ai/
    types.ts          ← Zod schemas + TypeScript contracts
    prompts.ts        ← Prompt builder + PROMPT_VERSION constant
    provider.ts       ← AIProvider interface + createAIProvider() factory
    gemini.ts         ← GeminiProvider (all Gemini code stays here)
  utils/
    planCheck.ts      ← Server-side Clerk plan helper (reusable)
    rateLimit.ts      ← Rate-limit stub (always allows; replace with Redis later)
app/
  api/
    ai/
      health-report/
        route.ts      ← POST handler
components/
  ai/
    BoardHealthButton.tsx   ← Toolbar button + Sheet wrapper + fetch state
    BoardHealthPanel.tsx    ← Pure display (receives report | null, loading, error)
    ReportSection.tsx       ← Reusable labeled section card
```

---

## Data Contracts

### `BoardPayload` — sent to the AI provider

```typescript
interface BoardTaskPayload {
  title: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assignee: string | null;
  description: string | null;
}

interface BoardColumnPayload {
  title: string;
  taskCount: number;
  tasks: BoardTaskPayload[];
}

interface BoardPayload {
  boardId: string;
  boardTitle: string;
  columns: BoardColumnPayload[];
  totalTasks: number;
}
```

No internal `sort_order` values or database IDs are included — keeps the prompt clean and prevents leaking schema details to the AI.

### `BoardHealthReport` — returned to the client

The raw AI output is validated with Zod before use. Metadata fields are added by the service layer after a successful call.

```typescript
// Raw AI output shape (Zod-validated)
interface RawReportFromAI {
  projectStatus: {
    label: "On Track" | "At Risk" | "Critical" | "Needs Attention";
    summary: string;
    score: number; // 0–100
  };
  projectSummary: string; // 2–3 sentence overview
  risks: Array<{
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
  bottlenecks: Array<{
    title: string;
    description: string;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
  }>;
  nextActions: Array<{
    action: string;
    owner?: string;
    urgency: "immediate" | "soon" | "eventually";
  }>;
}

// Final type returned by provider (raw + metadata)
interface BoardHealthReport extends RawReportFromAI {
  generatedAt: string;   // ISO timestamp
  provider: string;      // e.g. "gemini"
  model: string;         // e.g. "gemini-1.5-flash"
  promptVersion: string; // e.g. "v1" — from PROMPT_VERSION constant in prompts.ts
}
```

### `AIProvider` interface

```typescript
interface AIProvider {
  readonly name: string;
  readonly model: string;
  generateHealthReport(payload: BoardPayload): Promise<BoardHealthReport>;
}
```

---

## AI Service Layer

### `lib/ai/types.ts`
- All Zod schemas (`RiskSchema`, `BottleneckSchema`, etc.)
- `BoardHealthReportSchema` — the full raw AI output shape
- Derived TypeScript types via `z.infer<>`
- `BoardPayload`, `BoardHealthReport` (with metadata), `AIProvider` interface

### `lib/ai/prompts.ts`
- `PROMPT_VERSION = "v1"` constant — bump when the prompt template changes
- `buildHealthReportPrompt(payload: BoardPayload): string`
  - Instructs the model to respond with **only** valid JSON matching `BoardHealthReportSchema`
  - Includes board title, column names, task counts, task details
  - Explicitly states output format to reduce parse failures

### `lib/ai/gemini.ts`
- `GeminiProvider implements AIProvider`
- Constructor reads `GEMINI_API_KEY` and `GEMINI_MODEL` (default: `"gemini-1.5-flash"`)
- Throws `503` if `GEMINI_API_KEY` is missing at construction time
- Uses `@google/generative-ai` SDK — `generateContent()` with JSON mode or explicit JSON instruction
- Strips markdown code fences from response before JSON parse (Gemini often wraps output in ```json)
- Validates parsed JSON with `BoardHealthReportSchema.parse()` — throws on mismatch
- Appends metadata (`generatedAt`, `provider`, `model`, `promptVersion`) before returning

### `lib/ai/provider.ts`
- `createAIProvider(): AIProvider`
- Reads `process.env.AI_PROVIDER` (default: `"gemini"`)
- Switch: `case "gemini"` → returns `new GeminiProvider()`
- Adding a future provider (OpenAI, Claude) requires only a new `case` here

---

## API Route — `POST /api/ai/health-report`

### Request body (Zod-validated)
```json
{ "boardId": "uuid" }
```

### Steps

1. **Auth** — `auth()` from `@clerk/nextjs/server`. Return `401` if no session.
2. **Plan check** — `checkPlan(auth)` from `lib/utils/planCheck.ts`. Return `403` if not enterprise.
3. **Rate limit** — `checkRateLimit(userId)` from `lib/utils/rateLimit.ts`. Return `429` if over limit (stub: always passes).
4. **Validate body** — Zod parse `{ boardId }`. Return `400` if invalid.
5. **Fetch board** — `boardDataService.getBoardWithColumns(supabase, boardId, userId)`. Return `404` if not found or belongs to another user.
6. **Serialize** — Map `ColumnWithTasks[]` → `BoardPayload`. Strip IDs.
7. **AI call** — `createAIProvider().generateHealthReport(payload)`. Errors bubble to handler.
8. **Return** — `200` with `BoardHealthReport` JSON.

### Error response shape
```json
{ "error": "Human-readable message" }
```

### Error table

| Scenario | HTTP | Message |
|---|---|---|
| Not authenticated | 401 | "Authentication required" |
| Not Enterprise plan | 403 | "AI features require an Enterprise plan" |
| Rate limit exceeded | 429 | "Too many requests, please try again later" |
| Invalid request body | 400 | "Invalid request" |
| Board not found / wrong owner | 404 | "Board not found" |
| `GEMINI_API_KEY` missing | 503 | "AI service is not configured" |
| Gemini API failure | 502 | "AI service request failed" |
| Zod parse failure on AI output | 502 | "AI returned an unexpected response format" |

---

## Plan Gating

### `lib/utils/planCheck.ts` (server-side, reusable)

```typescript
type PlanCheckResult =
  | { ok: true; userId: string; plan: string }
  | { ok: false; status: 401 | 403; message: string };

function checkPlan(
  auth: { userId: string | null; sessionClaims: Record<string, unknown> | null },
  requiredPlan: "pro" | "enterprise"
): PlanCheckResult
```

Reads `sessionClaims.publicMetadata.plan`. Validates it is one of the known plan strings before comparing. Returns a discriminated union — callers destructure `ok` before proceeding.

### `lib/hooks/usePlanLimits.ts` (fix)

Change:
```typescript
const plan = "free" as Plan; // hardcoded
```
To:
```typescript
const { user } = useUser();
const rawPlan = user?.publicMetadata?.plan;
const plan = (["free", "pro", "enterprise"].includes(rawPlan as string)
  ? rawPlan
  : "free") as Plan;
```

This fixes enterprise/pro gating everywhere in the app (analytics, CSV export, AI button) without touching `useFeatureAccess`.

---

## UI Components

### `components/ai/BoardHealthButton.tsx`
- Renders the "✨ AI Insights" button in the board toolbar, gated by `useFeatureAccess().isAllowed('aiFeatures')`
- If not allowed: renders a dimmed button with tooltip "Upgrade to Enterprise"
- If allowed: opens the shadcn `Sheet` (right side, `sm:max-w-[480px]`, `w-full` on mobile)
- Owns: `report`, `loading`, `error`, `hasFetched` state
- `handleGenerate()` — calls `POST /api/ai/health-report`, sets state
- Report is **cached** in component state while the Sheet is mounted; `hasFetched` prevents re-fetch on re-open
- Explicit "Regenerate" button resets `hasFetched` and calls `handleGenerate()` again

### `components/ai/BoardHealthPanel.tsx`
- Pure display — receives `{ report, loading, error, onRegenerate, boardTitle }`
- **Idle state** (no report, not loading): "Generate Report" CTA button
- **Loading state**: skeleton cards for each section
- **Error state**: error message card + "Retry" button (calls `onRegenerate`)
- **Success state**: full report layout
  - Header: board title, "AI Health Report" label, Regenerate button, Copy Report button
  - Metadata row: `provider` · `model` · `promptVersion` · relative "Generated X ago" time
  - Status card: colored badge (On Track=green, Needs Attention=yellow, At Risk=orange, Critical=red) + score chip + summary text
  - Project Summary: prose paragraph
  - Four `ReportSection` components: Risks, Bottlenecks, Recommendations, Next Actions

### `components/ai/ReportSection.tsx`
- Props: `title`, `items`, `emptyMessage`
- Each item renders: bold title, description text, optional chip (severity/priority/urgency) with color coding
- Collapsible? No — keep it simple; all sections visible by default

### Board page integration (`app/boards/[id]/page.tsx`)
- Import `BoardHealthButton` and place it in the existing toolbar alongside other toolbar actions
- Pass `boardId` as prop

---

## Caching & Regeneration

- Report lives in React state inside `BoardHealthButton`
- Cache lifetime: component mount lifetime (panel close → state reset if Sheet unmounts; Sheet uses `keepMounted={false}` default so re-opening re-shows "Generate Report")
- Explicit Regenerate always re-fetches regardless of cached state
- No localStorage, no Supabase, no server cache

---

## Copy Report

- Serializes `BoardHealthReport` to a plain-text Markdown string
- Uses `navigator.clipboard.writeText()` 
- Button shows "Copied!" for 2 seconds then reverts
- Falls back silently if clipboard API unavailable

---

## Mobile Behaviour

- Sheet uses `className="w-full sm:max-w-[480px]"` — full width on small screens
- All section cards stack vertically — no horizontal layouts inside the panel

---

## Verification Checklist (post-implementation)

1. Enterprise gating: button hidden when `plan !== "enterprise"` (hardcode plan in Clerk dashboard to test)
2. Gemini connectivity: real API call succeeds with valid `GEMINI_API_KEY`
3. Health report generation: all five sections populate with real data
4. Loading state: skeleton visible during generation
5. Error state: set invalid API key → 502 error displayed cleanly
6. Mobile sheet: panel spans full width on narrow viewport
7. Regenerate: re-fetches and updates report
8. Copy Report: clipboard receives formatted text
9. No API key in browser network tab or client bundle

---

## Out of Scope (do not implement)

- Supabase persistence of reports
- Report history
- AI chat, sidebar, or recommendations page
- Any additional AI features
- Real rate-limit enforcement
- Commit or push after implementation
