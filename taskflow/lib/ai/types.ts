import { z } from "zod";

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

export type RawBoardHealthReport = z.infer<typeof RawBoardHealthReportSchema>;

export type BoardHealthReport = RawBoardHealthReport & {
  generatedAt: string;
  provider: string;
  model: string;
  promptVersion: string;
};

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
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generateHealthReport(payload: BoardPayload): Promise<BoardHealthReport>;
}
