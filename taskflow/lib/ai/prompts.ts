import { BoardPayload } from "./types";

export const PROMPT_VERSION = "v2";

export function buildHealthReportPrompt(payload: BoardPayload): string {
  const totalTasks = payload.columns.reduce((sum, c) => sum + c.taskCount, 0);
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

  return `You are a senior project manager doing a board review. Analyze the Kanban board below and produce a health report as JSON.

Board: "${payload.boardTitle}"
Total tasks: ${totalTasks}
Today's date: ${new Date().toISOString().split("T")[0]}

${columnsText}

IMPORTANT — your job is to go BEYOND surface numbers. Do NOT simply restate what the data shows (e.g. do not write "there are overdue tasks" as a risk). Instead:
- Identify WHY problems exist (causal analysis, not observation)
- Spot workload imbalance by assignee — who is overloaded, who is idle
- Assess deadline trajectory — at the current pace, will this project finish on time?
- Find cross-column patterns — are tasks piling up in one stage? why?
- Recommend SPECIFIC decisions the project owner should make TODAY
- Name owners in nextActions whenever assignee data is available

Return ONLY a single valid JSON object — no markdown, no code fences, no explanation. Use exactly this shape:

{
  "projectStatus": {
    "label": "On Track" | "At Risk" | "Critical" | "Needs Attention",
    "summary": "One sentence with a specific, causal diagnosis — not a generic observation.",
    "score": <integer 0-100>
  },
  "projectSummary": "2-3 sentences covering: workload distribution across columns, assignee load balance, and deadline trajectory. Be specific — reference actual task titles, assignees, or due dates where relevant.",
  "risks": [
    { "title": "string", "description": "Specific causal risk with named tasks or assignees where possible. Explain the consequence if unaddressed.", "severity": "low" | "medium" | "high" }
  ],
  "bottlenecks": [
    { "title": "string", "description": "Name the specific column or person causing the blockage and explain why it is a bottleneck, not just that it exists." }
  ],
  "recommendations": [
    { "title": "string", "description": "A concrete, actionable recommendation — specify who should do what. Avoid generic advice like 'prioritize tasks'.", "priority": "low" | "medium" | "high" }
  ],
  "nextActions": [
    { "action": "Specific action with a verb — e.g. 'Reassign X task from John to Sarah' not 'reassign tasks'", "owner": "name if available, else role", "urgency": "immediate" | "soon" | "eventually" }
  ]
}

Rules:
- risks, bottlenecks, recommendations, nextActions may be empty arrays [] if none apply.
- score 90-100 = On Track, 70-89 = Needs Attention, 50-69 = At Risk, 0-49 = Critical.
- Every field must be specific to THIS board's data. Generic project management advice is not acceptable.`;
}
