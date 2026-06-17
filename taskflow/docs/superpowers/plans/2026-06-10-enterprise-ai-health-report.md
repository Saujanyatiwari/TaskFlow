# Enterprise AI Health Report — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "✨ AI Insights" button to the board toolbar that opens an enterprise-gated slide-out panel generating a Gemini-powered health report (status, risks, bottlenecks, recommendations, next actions) for the currently viewed board.

**Architecture:** `lib/ai/` defines an `AIProvider` interface + `GeminiProvider` implementation. `app/api/ai/health-report/route.ts` handles auth via Clerk, enterprise plan check, server-side board fetch using the Clerk JWT injected into Supabase (same pattern as `SupabaseProvider`), and Gemini invocation. Three UI components (`BoardHealthButton`, `BoardHealthPanel`, `ReportSection`) render the slide-out panel inside a shadcn Sheet.

**Tech Stack:** Next.js 15 App Router, TypeScript, `zod` (new), `@google/generative-ai` (new), `@clerk/nextjs` v7 (`auth()` from `/server`), `@supabase/supabase-js`, shadcn Sheet + Skeleton (new), TailwindCSS v4.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/ai/types.ts` | Zod schemas + all TypeScript contracts |
| Create | `lib/ai/prompts.ts` | `PROMPT_VERSION` + `buildHealthReportPrompt()` |
| Create | `lib/ai/gemini.ts` | `GeminiProvider` — all Gemini code lives here |
| Create | `lib/ai/provider.ts` | `createAIProvider()` factory |
| Create | `lib/utils/planCheck.ts` | Server-side Clerk plan verification (reusable) |
| Create | `lib/utils/rateLimit.ts` | Rate-limit stub |
| Modify | `lib/hooks/usePlanLimits.ts` | Read plan from Clerk `publicMetadata` instead of hardcode |
| Modify | `.env` | Add `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_PROVIDER` |
| Create | `app/api/ai/health-report/route.ts` | POST handler |
| Create | `components/ui/sheet.tsx` | shadcn Sheet (via CLI) |
| Create | `components/ui/skeleton.tsx` | shadcn Skeleton (via CLI) |
| Create | `components/ai/ReportSection.tsx` | Reusable section card with chips |
| Create | `components/ai/BoardHealthPanel.tsx` | Pure display (idle/loading/error/success) |
| Create | `components/ai/BoardHealthButton.tsx` | Toolbar button + Sheet wrapper + fetch state |
| Modify | `app/boards/[id]/page.tsx` | Add `BoardHealthButton` to toolbar |

---

## Task 1: Install dependencies and shadcn components

**Files:**
- Modify: `package.json` (via npm)
- Create: `components/ui/sheet.tsx` (via shadcn CLI)
- Create: `components/ui/skeleton.tsx` (via shadcn CLI)

- [ ] **Step 1: Install npm packages**

Run from `taskflow/` directory:
```bash
npm install zod @google/generative-ai
```
Expected: both packages added to `node_modules/` and `package.json` dependencies.

- [ ] **Step 2: Add shadcn Sheet component**

```bash
npx shadcn@latest add sheet
```
Expected: `components/ui/sheet.tsx` created.

- [ ] **Step 3: Add shadcn Skeleton component**

```bash
npx shadcn@latest add skeleton
```
Expected: `components/ui/skeleton.tsx` created.

- [ ] **Step 4: Verify imports resolve**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors about missing `zod` or `@google/generative-ai` modules.

---

## Task 2: Create `lib/ai/types.ts`

**Files:**
- Create: `lib/ai/types.ts`

- [ ] **Step 1: Create the file**

Create `lib/ai/types.ts` with this exact content:

```typescript
import { z } from "zod";

// ─── Zod schemas (validate raw AI output) ─────────────────────────────────

export const RiskSchema = z.object({
  title: z.string(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});

export const BottleneckSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const RecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high"]),
});

export const NextActionSchema = z.object({
  action: z.string(),
  owner: z.string().optional(),
  urgency: z.enum(["immediate", "soon", "eventually"]),
});

export const ProjectStatusSchema = z.object({
  label: z.enum(["On Track", "At Risk", "Critical", "Needs Attention"]),
  summary: z.string(),
  score: z.number().min(0).max(100),
});

export const RawBoardHealthReportSchema = z.object({
  projectStatus: ProjectStatusSchema,
  projectSummary: z.string(),
  risks: z.array(RiskSchema),
  bottlenecks: z.array(BottleneckSchema),
  recommendations: z.array(RecommendationSchema),
  nextActions: z.array(NextActionSchema),
});

// ─── TypeScript types ──────────────────────────────────────────────────────

export type RawBoardHealthReport = z.infer<typeof RawBoardHealthReportSchema>;

export type BoardHealthReport = RawBoardHealthReport & {
  generatedAt: string;   // ISO 8601 timestamp
  provider: string;      // e.g. "gemini"
  model: string;         // e.g. "gemini-1.5-flash"
  promptVersion: string; // e.g. "v1"
};

// ─── Board payload (sent to AI provider) ─────────────────────────────────

export interface BoardTaskPayload {
  title: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assignee: string | null;
  description: string | null;
}

export interface BoardColumnPayload {
  title: string;
  taskCount: number;
  tasks: BoardTaskPayload[];
}

export interface BoardPayload {
  boardId: string;
  boardTitle: string;
  columns: BoardColumnPayload[];
  totalTasks: number;
}

// ─── Provider interface ───────────────────────────────────────────────────

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generateHealthReport(payload: BoardPayload): Promise<BoardHealthReport>;
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep "lib/ai/types"
```
Expected: no output (no errors in this file).

---

## Task 3: Create `lib/ai/prompts.ts`

**Files:**
- Create: `lib/ai/prompts.ts`

- [ ] **Step 1: Create the file**

Create `lib/ai/prompts.ts`:

```typescript
import { BoardPayload } from "./types";

export const PROMPT_VERSION = "v1";

export function buildHealthReportPrompt(payload: BoardPayload): string {
  const columnsText = payload.columns
    .map((col) => {
      const tasks =
        col.tasks.length === 0
          ? "  (no tasks)"
          : col.tasks
              .map((t) => {
                const parts = [`  - "${t.title}" [priority: ${t.priority}]`];
                if (t.dueDate) parts.push(`due: ${t.dueDate}`);
                if (t.assignee) parts.push(`assignee: ${t.assignee}`);
                if (t.description) parts.push(`note: ${t.description}`);
                return parts.join(", ");
              })
              .join("\n");
      return `Column "${col.title}" (${col.taskCount} task${col.taskCount === 1 ? "" : "s"}):\n${tasks}`;
    })
    .join("\n\n");

  return `You are a senior project health analyst. Analyze the following Kanban board data and return a structured health report as JSON.

Board: ${payload.boardTitle}
Total tasks: ${payload.totalTasks}

${columnsText}

Return ONLY a single valid JSON object — no markdown, no code fences, no explanation. Use exactly this shape:

{
  "projectStatus": {
    "label": "On Track" | "At Risk" | "Critical" | "Needs Attention",
    "summary": "One sentence describing overall project health.",
    "score": <integer 0-100>
  },
  "projectSummary": "2-3 sentences summarizing the project state, workload distribution, and key concerns.",
  "risks": [
    { "title": "string", "description": "string", "severity": "low" | "medium" | "high" }
  ],
  "bottlenecks": [
    { "title": "string", "description": "string" }
  ],
  "recommendations": [
    { "title": "string", "description": "string", "priority": "low" | "medium" | "high" }
  ],
  "nextActions": [
    { "action": "string", "owner": "string (optional)", "urgency": "immediate" | "soon" | "eventually" }
  ]
}

Rules:
- risks, bottlenecks, recommendations, nextActions may be empty arrays [] if none apply.
- score 90-100 = On Track, 70-89 = Needs Attention, 50-69 = At Risk, 0-49 = Critical.
- Be concise, practical, and specific to the actual task data provided.`;
}
```

---

## Task 4: Create `lib/ai/gemini.ts`

**Files:**
- Create: `lib/ai/gemini.ts`

- [ ] **Step 1: Create the file**

Create `lib/ai/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIProvider,
  BoardHealthReport,
  BoardPayload,
  RawBoardHealthReportSchema,
} from "./types";
import { buildHealthReportPrompt, PROMPT_VERSION } from "./prompts";

const DEFAULT_MODEL = "gemini-1.5-flash";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly model: string;
  private readonly genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    this.model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateHealthReport(payload: BoardPayload): Promise<BoardHealthReport> {
    const model = this.genAI.getGenerativeModel({ model: this.model });
    const prompt = buildHealthReportPrompt(payload);

    let rawText: string;
    try {
      const result = await model.generateContent(prompt);
      rawText = result.response.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Gemini API call failed: ${msg}`);
    }

    // Gemini sometimes wraps output in ```json ... ``` — strip it
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned non-JSON response");
    }

    let validated: ReturnType<typeof RawBoardHealthReportSchema.parse>;
    try {
      validated = RawBoardHealthReportSchema.parse(parsed);
    } catch {
      throw new Error("AI returned unexpected response format");
    }

    return {
      ...validated,
      generatedAt: new Date().toISOString(),
      provider: this.name,
      model: this.model,
      promptVersion: PROMPT_VERSION,
    };
  }
}
```

---

## Task 5: Create `lib/ai/provider.ts`

**Files:**
- Create: `lib/ai/provider.ts`

- [ ] **Step 1: Create the file**

Create `lib/ai/provider.ts`:

```typescript
import { AIProvider } from "./types";
import { GeminiProvider } from "./gemini";

export function createAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER ?? "gemini";

  switch (providerName) {
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(
        `Unknown AI_PROVIDER value: "${providerName}". Supported: "gemini".`
      );
  }
}
```

- [ ] **Step 2: Verify the AI layer compiles**

```bash
npx tsc --noEmit 2>&1 | grep "lib/ai"
```
Expected: no output.

---

## Task 6: Create `lib/utils/planCheck.ts` and `lib/utils/rateLimit.ts`

**Files:**
- Create: `lib/utils/planCheck.ts`
- Create: `lib/utils/rateLimit.ts`

- [ ] **Step 1: Create `lib/utils/planCheck.ts`**

```typescript
import { auth } from "@clerk/nextjs/server";

const KNOWN_PLANS = ["free", "pro", "enterprise"] as const;
type KnownPlan = (typeof KNOWN_PLANS)[number];

const PLAN_RANK: Record<KnownPlan, number> = { free: 0, pro: 1, enterprise: 2 };

function normalizePlan(raw: unknown): KnownPlan {
  if (typeof raw === "string" && (KNOWN_PLANS as readonly string[]).includes(raw)) {
    return raw as KnownPlan;
  }
  return "free";
}

type PlanCheckSuccess = {
  ok: true;
  userId: string;
  plan: KnownPlan;
  getToken: () => Promise<string | null>;
};

type PlanCheckFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export type PlanCheckResult = PlanCheckSuccess | PlanCheckFailure;

export async function checkPlanAccess(
  requiredPlan: "pro" | "enterprise"
): Promise<PlanCheckResult> {
  const { userId, sessionClaims, getToken } = await auth();

  if (!userId) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  const plan = normalizePlan(metadata?.plan);

  if (PLAN_RANK[plan] < PLAN_RANK[requiredPlan]) {
    const label = requiredPlan === "enterprise" ? "Enterprise" : "Pro";
    return {
      ok: false,
      status: 403,
      error: `AI features require an ${label} plan`,
    };
  }

  return { ok: true, userId, plan, getToken };
}
```

- [ ] **Step 2: Create `lib/utils/rateLimit.ts`**

```typescript
// Stub — always permits. Replace body with Redis/Upstash logic when ready.
export async function checkRateLimit(
  _userId: string
): Promise<{ allowed: boolean }> {
  return { allowed: true };
}
```

---

## Task 7: Fix `lib/hooks/usePlanLimits.ts` and add env vars

**Files:**
- Modify: `lib/hooks/usePlanLimits.ts`
- Modify: `.env`

- [ ] **Step 1: Update `usePlanLimits` to read from Clerk `publicMetadata`**

Replace the entire content of `lib/hooks/usePlanLimits.ts` with:

```typescript
"use client";

import { useUser } from "@clerk/nextjs";

export const FREE_BOARD_LIMIT = 3;
export const PRO_BOARD_LIMIT = 20;

export type Plan = "free" | "pro" | "enterprise";

const KNOWN_PLANS: Plan[] = ["free", "pro", "enterprise"];

export function usePlanLimits(boardCount: number) {
  const { user } = useUser();

  const rawPlan = user?.publicMetadata?.plan;
  const plan: Plan = KNOWN_PLANS.includes(rawPlan as Plan)
    ? (rawPlan as Plan)
    : "free";

  const limit =
    plan === "free" ? FREE_BOARD_LIMIT :
    plan === "pro"  ? PRO_BOARD_LIMIT  :
    Infinity;

  const isAtLimit = limit === Infinity ? false : boardCount >= limit;
  const isUnlimited = limit === Infinity;

  return { plan, limit, boardCount, isAtLimit, isUnlimited };
}
```

- [ ] **Step 2: Add env vars to `.env`**

Append these three lines to the existing `.env` file (do not overwrite existing keys):

```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
AI_PROVIDER=gemini
```

Replace `your_gemini_api_key_here` with the actual key from Google AI Studio (https://aistudio.google.com/app/apikey).

---

## Task 8: Create `app/api/ai/health-report/route.ts`

**Files:**
- Create: `app/api/ai/health-report/route.ts`

Note on Supabase auth: The client-side `SupabaseProvider` injects the Clerk JWT via `accessToken: async () => session.getToken()`. The API route must do the same — create a Supabase client with the Clerk JWT as the `accessToken`, NOT the SSR cookie client from `lib/supabase/server.ts`.

- [ ] **Step 1: Create the route handler**

Create `app/api/ai/health-report/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkPlanAccess } from "@/lib/utils/planCheck";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { boardDataService } from "@/lib/services";
import { createAIProvider } from "@/lib/ai/provider";
import type { BoardPayload } from "@/lib/ai/types";

const RequestBodySchema = z.object({
  boardId: z.string().uuid("boardId must be a valid UUID"),
});

export async function POST(req: NextRequest) {
  // 1. Auth + enterprise plan check
  const planResult = await checkPlanAccess("enterprise");
  if (!planResult.ok) {
    return NextResponse.json({ error: planResult.error }, { status: planResult.status });
  }
  const { userId, getToken } = planResult;

  // 2. Rate limit
  const { allowed } = await checkRateLimit(userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please try again later" },
      { status: 429 }
    );
  }

  // 3. Validate request body
  let boardId: string;
  try {
    const body = await req.json();
    ({ boardId } = RequestBodySchema.parse(body));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 4. Build Supabase client authenticated with the Clerk JWT
  //    (mirrors SupabaseProvider's accessToken pattern for RLS compatibility)
  const clerkToken = await getToken();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => clerkToken ?? null,
    }
  );

  // 5. Fetch board data server-side (userId enforces ownership)
  let boardPayload: BoardPayload;
  try {
    const { board, columnsWithTasks } = await boardDataService.getBoardWithColumns(
      supabase,
      boardId,
      userId
    );

    boardPayload = {
      boardId: board.id,
      boardTitle: board.title,
      totalTasks: columnsWithTasks.reduce((sum, col) => sum + col.tasks.length, 0),
      columns: columnsWithTasks.map((col) => ({
        title: col.title,
        taskCount: col.tasks.length,
        tasks: col.tasks.map((task) => ({
          title: task.title,
          priority: task.priority,
          dueDate: task.due_date,
          assignee: task.assignee,
          description: task.description,
        })),
      })),
    };
  } catch {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // 6. Generate AI health report
  try {
    const provider = createAIProvider();
    const report = await provider.generateHealthReport(boardPayload);
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("not configured") || message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 503 }
      );
    }
    if (
      message.includes("unexpected response format") ||
      message.includes("non-JSON")
    ) {
      return NextResponse.json(
        { error: "AI returned an unexpected response format" },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "AI service request failed" },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 2: Verify route compiles**

```bash
npx tsc --noEmit 2>&1 | grep "api/ai"
```
Expected: no output.

---

## Task 9: Create `components/ai/ReportSection.tsx`

**Files:**
- Create: `components/ai/ReportSection.tsx`

- [ ] **Step 1: Create the file**

Create `components/ai/ReportSection.tsx`:

```tsx
"use client";

type Severity = "low" | "medium" | "high";
type Urgency = "immediate" | "soon" | "eventually";

export interface ReportItem {
  title?: string;
  description?: string;
  action?: string;
  severity?: Severity;
  priority?: Severity;
  urgency?: Urgency;
  owner?: string;
}

interface ReportSectionProps {
  title: string;
  items: ReportItem[];
  emptyMessage?: string;
}

const severityClasses: Record<Severity, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const urgencyClasses: Record<Urgency, string> = {
  immediate: "bg-red-100 text-red-700",
  soon: "bg-amber-100 text-amber-700",
  eventually: "bg-emerald-100 text-emerald-700",
};

export function ReportSection({
  title,
  items,
  emptyMessage = "None identified.",
}: ReportSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic px-1">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const chipLabel = item.severity ?? item.priority ?? item.urgency ?? null;
            const chipClass = item.severity
              ? severityClasses[item.severity]
              : item.priority
              ? severityClasses[item.priority]
              : item.urgency
              ? urgencyClasses[item.urgency]
              : "";

            return (
              <div
                key={i}
                className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-800 leading-snug">
                    {item.title ?? item.action}
                  </p>
                  {chipLabel && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${chipClass}`}
                    >
                      {chipLabel}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    {item.description}
                  </p>
                )}
                {item.owner && (
                  <p className="mt-1.5 text-[10px] text-gray-400">
                    → {item.owner}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## Task 10: Create `components/ai/BoardHealthPanel.tsx`

**Files:**
- Create: `components/ai/BoardHealthPanel.tsx`

- [ ] **Step 1: Create the file**

Create `components/ai/BoardHealthPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportSection } from "./ReportSection";
import type { BoardHealthReport } from "@/lib/ai/types";
import { AlertCircle, RefreshCw, Copy, Check, Sparkles } from "lucide-react";

const statusConfig = {
  "On Track": { color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  "Needs Attention": { color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  "At Risk": { color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  "Critical": { color: "bg-red-500", text: "text-red-700", bg: "bg-red-50 border-red-200" },
} as const;

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function reportToMarkdown(report: BoardHealthReport): string {
  const lines: string[] = [
    `# AI Health Report`,
    ``,
    `**Status:** ${report.projectStatus.label} (Score: ${report.projectStatus.score}/100)`,
    `${report.projectStatus.summary}`,
    ``,
    `## Summary`,
    report.projectSummary,
    ``,
    `## Risks`,
    ...report.risks.map((r) => `- **${r.title}** [${r.severity}]: ${r.description}`),
    report.risks.length === 0 ? "_None identified._" : "",
    ``,
    `## Bottlenecks`,
    ...report.bottlenecks.map((b) => `- **${b.title}**: ${b.description}`),
    report.bottlenecks.length === 0 ? "_None identified._" : "",
    ``,
    `## Recommendations`,
    ...report.recommendations.map((r) => `- **${r.title}** [${r.priority}]: ${r.description}`),
    report.recommendations.length === 0 ? "_None._" : "",
    ``,
    `## Next Actions`,
    ...report.nextActions.map((a) => `- ${a.action}${a.owner ? ` (${a.owner})` : ""} [${a.urgency}]`),
    report.nextActions.length === 0 ? "_None._" : "",
    ``,
    `---`,
    `Generated ${formatRelativeTime(report.generatedAt)} · ${report.provider} ${report.model} · prompt ${report.promptVersion}`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

interface BoardHealthPanelProps {
  report: BoardHealthReport | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  onRegenerate: () => void;
  hasFetched: boolean;
}

export function BoardHealthPanel({
  report,
  loading,
  error,
  onGenerate,
  onRegenerate,
  hasFetched,
}: BoardHealthPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportToMarkdown(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }

  // ── Idle state ─────────────────────────────────────────────────────────
  if (!hasFetched && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">AI Project Health Report</p>
          <p className="text-xs text-gray-500 mt-1">
            Analyze risks, bottlenecks, and get actionable recommendations.
          </p>
        </div>
        <Button
          onClick={onGenerate}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-5 space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Report failed</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────
  if (!report) return null;

  const cfg = statusConfig[report.projectStatus.label];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Action bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="capitalize">{report.provider}</span>
          <span>·</span>
          <span>{report.model}</span>
          <span>·</span>
          <span>prompt {report.promptVersion}</span>
          <span>·</span>
          <span>{formatRelativeTime(report.generatedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
            {copied ? (
              <><Check className="h-3 w-3 mr-1 text-emerald-500" />Copied</>
            ) : (
              <><Copy className="h-3 w-3 mr-1" />Copy</>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRegenerate}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Report content */}
      <div className="p-5 space-y-5">
        {/* Status card */}
        <div className={`rounded-xl border p-4 ${cfg.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} />
              <span className={`text-sm font-bold ${cfg.text}`}>
                {report.projectStatus.label}
              </span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border`}>
              {report.projectStatus.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {report.projectStatus.summary}
          </p>
        </div>

        {/* Project summary */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Summary
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">{report.projectSummary}</p>
        </div>

        {/* Sections */}
        <ReportSection
          title="Risks"
          items={report.risks}
          emptyMessage="No significant risks identified."
        />
        <ReportSection
          title="Bottlenecks"
          items={report.bottlenecks}
          emptyMessage="No bottlenecks identified."
        />
        <ReportSection
          title="Recommendations"
          items={report.recommendations}
          emptyMessage="No specific recommendations."
        />
        <ReportSection
          title="Next Actions"
          items={report.nextActions}
          emptyMessage="No immediate actions required."
        />
      </div>
    </div>
  );
}
```

---

## Task 11: Create `components/ai/BoardHealthButton.tsx`

**Files:**
- Create: `components/ai/BoardHealthButton.tsx`

- [ ] **Step 1: Create the file**

Create `components/ai/BoardHealthButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BoardHealthPanel } from "./BoardHealthPanel";
import { LockedButton, FeatureUpgradeModal } from "@/components/feature-gate";
import { useFeatureAccess } from "@/lib/hooks/useFeatureAccess";
import type { BoardHealthReport } from "@/lib/ai/types";
import { Sparkles } from "lucide-react";

interface BoardHealthButtonProps {
  boardId: string;
}

export function BoardHealthButton({ boardId }: BoardHealthButtonProps) {
  const { isAllowed } = useFeatureAccess();
  const canUseAI = isAllowed("aiFeatures");

  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<BoardHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/health-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate report");
      }
      setReport(data as BoardHealthReport);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }

  function handleRegenerate() {
    setReport(null);
    setHasFetched(false);
    fetchReport();
  }

  function handleSheetOpenChange(next: boolean) {
    setOpen(next);
    // Reset state when panel closes so re-opening shows the idle state
    if (!next) {
      setReport(null);
      setError(null);
      setHasFetched(false);
    }
  }

  return (
    <>
      {canUseAI ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          AI Insights
        </Button>
      ) : (
        <LockedButton
          label="AI Insights"
          requiredPlan="Enterprise"
          size="sm"
          onClick={() => setShowUpgrade(true)}
        />
      )}

      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[480px] p-0 flex flex-col"
        >
          <SheetHeader className="px-5 py-4 border-b bg-gradient-to-r from-violet-600 to-indigo-600 shrink-0">
            <SheetTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Health Report
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <BoardHealthPanel
              report={report}
              loading={loading}
              error={error}
              hasFetched={hasFetched}
              onGenerate={fetchReport}
              onRegenerate={handleRegenerate}
            />
          </div>
        </SheetContent>
      </Sheet>

      <FeatureUpgradeModal
        feature={showUpgrade ? "aiFeatures" : null}
        onClose={() => setShowUpgrade(false)}
      />
    </>
  );
}
```

---

## Task 12: Integrate `BoardHealthButton` into the board page

**Files:**
- Modify: `app/boards/[id]/page.tsx`

- [ ] **Step 1: Add the import**

At the top of `app/boards/[id]/page.tsx`, add this import after the existing imports:

```typescript
import { BoardHealthButton } from "@/components/ai/BoardHealthButton";
```

- [ ] **Step 2: Add the button to the toolbar**

Find the toolbar section in `app/boards/[id]/page.tsx` (around line 632–652) where the Export button is rendered:

```tsx
<div className="flex items-center gap-2">
  {/* Export button */}
  {isAllowed("export") ? (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportBoardToCsv(board?.title ?? "board", filteredColumns)}
    >
      <Download className="h-4 w-4 mr-1" />
      Export
    </Button>
  ) : (
    <LockedButton
      label="Export"
      requiredPlan="Pro"
      size="sm"
      onClick={() => setLockedFeature("export")}
    />
  )}
```

Add `<BoardHealthButton boardId={id} />` immediately after the closing of the export block and before the "Add Task" Dialog:

```tsx
<div className="flex items-center gap-2">
  {/* Export button */}
  {isAllowed("export") ? (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportBoardToCsv(board?.title ?? "board", filteredColumns)}
    >
      <Download className="h-4 w-4 mr-1" />
      Export
    </Button>
  ) : (
    <LockedButton
      label="Export"
      requiredPlan="Pro"
      size="sm"
      onClick={() => setLockedFeature("export")}
    />
  )}

  {/* AI Insights button */}
  <BoardHealthButton boardId={id} />

  {/* Add task dialog */}
  <Dialog>
```

- [ ] **Step 3: Verify the board page compiles**

```bash
npx tsc --noEmit 2>&1 | grep "boards"
```
Expected: no output.

---

## Task 13: Verify locally

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```
Expected: server starts on `http://localhost:3000` with no TypeScript errors.

- [ ] **Step 2: Set your Clerk account to Enterprise plan for testing**

In the Clerk dashboard → Users → select your user → Metadata → Public metadata, set:
```json
{ "plan": "enterprise" }
```
This makes the AI Insights button visible.

- [ ] **Step 3: Verify Enterprise gating**

Navigate to a board page. Confirm:
- With `plan: "enterprise"` in Clerk metadata → violet "✨ AI Insights" button is visible in the toolbar.
- With `plan: "free"` or unset → a locked/dimmed "AI Insights" button appears with an upgrade tooltip.

- [ ] **Step 4: Verify report generation**

With Enterprise plan set:
1. Click "✨ AI Insights"
2. Click "Generate Report" in the idle panel
3. Confirm the loading skeleton appears
4. Confirm the report populates with all five sections: status badge, summary, risks, bottlenecks, recommendations, next actions

- [ ] **Step 5: Verify error state**

Temporarily set `GEMINI_API_KEY=invalid_key` in `.env`, restart the dev server, generate a report. Confirm:
- Error state shows with a red icon and a readable error message
- "Retry" button re-triggers the request

Restore the real API key and restart.

- [ ] **Step 6: Verify regenerate**

After a successful report, click "Regenerate". Confirm the skeleton reappears and a fresh report loads.

- [ ] **Step 7: Verify Copy Report**

After a successful report, click "Copy". Confirm "Copied!" appears for 2 seconds. Paste into a text editor and confirm Markdown-formatted report is present.

- [ ] **Step 8: Verify mobile sheet**

Resize browser to < 640px (or use DevTools mobile emulation). Open the AI panel. Confirm it spans the full width of the screen.

- [ ] **Step 9: Confirm API key is not exposed to the client**

Open browser DevTools → Network tab → find the `POST /api/ai/health-report` request. Confirm:
- Request payload contains only `{ "boardId": "..." }` — no API key.
- Response contains the report JSON — no API key.

- [ ] **Step 10: Stop — do not commit**

Feature is complete and verified. Stop and wait for user review.
