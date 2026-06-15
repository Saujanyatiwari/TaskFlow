import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkPlanAccess } from "@/lib/utils/planCheck";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { boardDataService } from "@/lib/services";
import { createAIProvider } from "@/lib/ai/provider";
import type { BoardPayload } from "@/lib/ai/types";

const RequestBodySchema = z.object({
  boardId: z.string().min(1, "boardId is required"),
});

export async function POST(req: NextRequest) {
  const planResult = await checkPlanAccess("enterprise");
  if (!planResult.ok) {
    return NextResponse.json({ error: planResult.error }, { status: planResult.status });
  }
  const { userId, getToken } = planResult;

  const { allowed } = await checkRateLimit(userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please try again later" },
      { status: 429 }
    );
  }

  let boardId: string;
  try {
    const body = await req.json();
    ({ boardId } = RequestBodySchema.parse(body));
  } catch (err) {
    console.error("[health-report] request body parse failed:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 4. Build Supabase client authenticated with the Clerk JWT
  //    Mirrors SupabaseProvider's accessToken pattern so RLS policies are respected
  const clerkToken = await getToken();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => clerkToken,
    }
  );

  // userId enforces ownership beyond RLS
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
  } catch (err) {
    const pgCode = (err as { code?: string })?.code;
    if (pgCode === "PGRST116") {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    console.error("[health-report] board fetch failed", err);
    return NextResponse.json({ error: "Failed to load board data" }, { status: 500 });
  }

  try {
    const provider = createAIProvider();
    const report = await provider.generateHealthReport(boardPayload);
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[health-report] AI provider error:", message);

    if (message.includes("not configured") || message.includes("Unknown AI_PROVIDER")) {
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
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: `AI service request failed: ${message}` },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "AI service request failed" },
      { status: 502 }
    );
  }
}
