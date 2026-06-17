"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabase } from "@/lib/supabase/SupabaseProvider";
import { Board, Column } from "@/lib/supabase/models";
import { boardService } from "@/lib/services";

export type TaskRow = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  sort_order: number;
  created_at: string;
  column_title: string;
  board_id: string;
};

export type ActivityItem = {
  type: "Task created" | "Column created" | "Board created";
  title: string;
  created_at: string;
};

export type RecentTask = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  created_at: string;
  board_id: string;
  board_title: string;
};

export type AnalyticsData = {
  overview: {
    totalBoards: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  statusCounts: Record<string, number>;
  priorityCounts: { low: number; medium: number; high: number };
  dueDates: { overdue: number; dueThisWeek: number; upcoming: number };
  trends: {
    createdThisWeek: number;
    createdThisMonth: number;
    avgTasksPerBoard: number;
  };
  activity: ActivityItem[];
  recentTasks: RecentTask[];
  allTasks: TaskRow[];
};

export function useAnalytics() {
  const { user } = useUser();
  const { supabase } = useSupabase();

  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !supabase) return;
    load();
  }, [user?.id, supabase]);

  async function load() {
    if (!user || !supabase) return;
    try {
      setLoading(true);
      setError(null);

      const [boardsData, colsResult, tasksResult] = await Promise.all([
        boardService.getBoards(supabase, user.id),
        supabase
          .from("columns")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("tasks")
          .select(
            "id, column_id, title, description, assignee, due_date, priority, sort_order, created_at, columns!inner(board_id, title, user_id)"
          )
          .eq("columns.user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      setBoards(boardsData);
      setColumns(colsResult.data ?? []);

      type RawResult = TaskRow & { columns: { board_id: string; title: string; user_id: string } | null };
      const mapped: TaskRow[] = ((tasksResult.data ?? []) as unknown as RawResult[]).map((t) => ({
        id: t.id,
        column_id: t.column_id,
        title: t.title,
        description: t.description,
        assignee: t.assignee,
        due_date: t.due_date,
        priority: t.priority,
        sort_order: t.sort_order,
        created_at: t.created_at,
        column_title: t.columns?.title ?? "",
        board_id: t.columns?.board_id ?? "",
      }));
      setTasks(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  const analytics = useMemo((): AnalyticsData | null => {
    if (loading) return null;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekFromNow = new Date(todayStart);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const startOfWeek = new Date(todayStart);
    startOfWeek.setDate(startOfWeek.getDate() - todayStart.getDay());

    const startOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const totalBoards = boards.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.column_title.toLowerCase() === "done"
    ).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const knownStatuses = ["To Do", "In Progress", "Review", "Done"];
    const statusCounts: Record<string, number> = {};
    for (const s of knownStatuses) {
      statusCounts[s] = tasks.filter((t) => t.column_title === s).length;
    }
    const accountedFor = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const otherCount = totalTasks - accountedFor;
    if (otherCount > 0) statusCounts["Other"] = otherCount;

    const priorityCounts = {
      low: tasks.filter((t) => t.priority === "low").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      high: tasks.filter((t) => t.priority === "high").length,
    };

    const tasksWithDue = tasks.filter((t) => t.due_date);
    const overdue = tasksWithDue.filter((t) => {
      const d = new Date(t.due_date!);
      return d < todayStart && t.column_title.toLowerCase() !== "done";
    }).length;
    const dueThisWeek = tasksWithDue.filter((t) => {
      const d = new Date(t.due_date!);
      return d >= todayStart && d <= weekFromNow;
    }).length;
    const upcoming = tasksWithDue.filter(
      (t) => new Date(t.due_date!) > weekFromNow
    ).length;

    const createdThisWeek = tasks.filter(
      (t) => new Date(t.created_at) >= startOfWeek
    ).length;
    const createdThisMonth = tasks.filter(
      (t) => new Date(t.created_at) >= startOfMonth
    ).length;
    const avgTasksPerBoard =
      totalBoards > 0 ? Math.round(totalTasks / totalBoards) : 0;

    const activity: ActivityItem[] = [
      ...tasks.map((t) => ({
        type: "Task created" as const,
        title: t.title,
        created_at: t.created_at,
      })),
      ...columns.map((c) => ({
        type: "Column created" as const,
        title: c.title,
        created_at: c.created_at,
      })),
      ...boards.map((b) => ({
        type: "Board created" as const,
        title: b.title,
        created_at: b.created_at,
      })),
    ]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20);

    const boardMap = new Map(boards.map((b) => [b.id, b.title]));
    const recentTasks: RecentTask[] = tasks.slice(0, 10).map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      created_at: t.created_at,
      board_id: t.board_id,
      board_title: boardMap.get(t.board_id) ?? "Unknown board",
    }));

    return {
      overview: { totalBoards, totalTasks, completedTasks, completionRate },
      statusCounts,
      priorityCounts,
      dueDates: { overdue, dueThisWeek, upcoming },
      trends: { createdThisWeek, createdThisMonth, avgTasksPerBoard },
      activity,
      recentTasks,
      allTasks: tasks,
    };
  }, [boards, columns, tasks, loading]);

  return { analytics, loading, error };
}
