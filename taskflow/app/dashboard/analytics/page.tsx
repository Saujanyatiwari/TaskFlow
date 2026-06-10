"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFeatureAccess } from "@/lib/hooks/useFeatureAccess";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  ListTodo,
  Loader2,
  TrendingUp,
} from "lucide-react";

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

const STATUS_CONFIG = [
  { label: "To Do",       color: "bg-slate-400",   text: "text-slate-600"   },
  { label: "In Progress", color: "bg-blue-500",    text: "text-blue-600"    },
  { label: "Review",      color: "bg-amber-400",   text: "text-amber-600"   },
  { label: "Done",        color: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Other",       color: "bg-purple-400",  text: "text-purple-600"  },
];

const PRIORITY_CONFIG = [
  { label: "High",   key: "high"   as const, color: "bg-red-500",     text: "text-red-600"     },
  { label: "Medium", key: "medium" as const, color: "bg-amber-400",   text: "text-amber-600"   },
  { label: "Low",    key: "low"    as const, color: "bg-emerald-500", text: "text-emerald-600" },
];

const ACTIVITY_BADGE: Record<string, string> = {
  "Task created":   "bg-blue-100 text-blue-700",
  "Column created": "bg-purple-100 text-purple-700",
  "Board created":  "bg-emerald-100 text-emerald-700",
};

const ACTIVITY_DOT: Record<string, string> = {
  "Task created":   "bg-blue-500",
  "Column created": "bg-purple-500",
  "Board created":  "bg-emerald-500",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAllowed } = useFeatureAccess();
  const { analytics, loading, error } = useAnalytics();

  useEffect(() => {
    if (!isAllowed("analytics")) {
      router.replace("/pricing");
    }
  }, [isAllowed, router]);

  if (!isAllowed("analytics")) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="text-sm">Loading analytics…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800 mb-1">Failed to load analytics</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || (analytics.overview.totalBoards === 0 && analytics.overview.totalTasks === 0)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-5">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No data yet</h3>
            <p className="text-gray-500 max-w-sm mb-6">
              Create some boards and tasks to see your analytics here.
            </p>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { overview, statusCounts, priorityCounts, dueDates, trends, activity } = analytics;
  const safeTotal = overview.totalTasks || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-8">

        {/* Page header */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-500">Overview of your boards and tasks</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">

          {/* Section 1 — Overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Boards",    value: overview.totalBoards,    icon: LayoutDashboard, bg: "bg-blue-100",    ic: "text-blue-600"    },
              { label: "Total Tasks",     value: overview.totalTasks,     icon: ListTodo,        bg: "bg-purple-100",  ic: "text-purple-600"  },
              { label: "Completed",       value: overview.completedTasks, icon: CheckCircle2,    bg: "bg-emerald-100", ic: "text-emerald-600" },
              { label: "Completion Rate", value: `${overview.completionRate}%`, icon: TrendingUp, bg: "bg-amber-100",  ic: "text-amber-600"   },
            ].map(({ label, value, icon: Icon, bg, ic }) => (
              <Card key={label}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">{label}</p>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
                    </div>
                    <div className={`h-10 w-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${ic}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Section 2 & 3 — Status + Priority */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Task Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {STATUS_CONFIG.map(({ label, color, text }) => {
                  const count = statusCounts[label] ?? 0;
                  if (count === 0 && label === "Other") return null;
                  const pct = Math.round((count / safeTotal) * 100);
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-sm font-medium ${text}`}>{label}</span>
                        <span className="text-sm text-gray-500">
                          {count} <span className="text-xs text-gray-400">({pct}%)</span>
                        </span>
                      </div>
                      <ProgressBar value={pct} color={color} />
                    </div>
                  );
                })}
                {overview.totalTasks === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No tasks yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {PRIORITY_CONFIG.map(({ label, key, color, text }) => {
                  const count = priorityCounts[key];
                  const pct = Math.round((count / safeTotal) * 100);
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-sm font-medium ${text}`}>{label} Priority</span>
                        <span className="text-sm text-gray-500">
                          {count} <span className="text-xs text-gray-400">({pct}%)</span>
                        </span>
                      </div>
                      <ProgressBar value={pct} color={color} />
                    </div>
                  );
                })}
                {overview.totalTasks === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No tasks yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 4 & 5 — Due Dates + Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Due Date Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{dueDates.overdue}</p>
                    <p className="text-xs text-red-500 mt-1">Overdue</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
                    <Clock className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-amber-600">{dueDates.dueThisWeek}</p>
                    <p className="text-xs text-amber-500 mt-1">Due This Week</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                    <Calendar className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{dueDates.upcoming}</p>
                    <p className="text-xs text-blue-500 mt-1">Upcoming</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Productivity Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Created This Week",  value: trends.createdThisWeek,  bg: "bg-blue-50 border-blue-100",     text: "text-blue-600"    },
                    { label: "Created This Month", value: trends.createdThisMonth, bg: "bg-purple-50 border-purple-100", text: "text-purple-600"  },
                    { label: "Avg Tasks / Board",  value: trends.avgTasksPerBoard, bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-600" },
                    { label: "Completion Rate",    value: `${overview.completionRate}%`, bg: "bg-amber-50 border-amber-100", text: "text-amber-600" },
                  ].map(({ label, value, bg, text }) => (
                    <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                      <p className={`text-2xl font-bold ${text}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 6 — Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <p className="text-sm text-gray-500">Latest created items across all boards</p>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No activity yet</p>
              ) : (
                <div className="space-y-0">
                  {activity.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2.5 border-b last:border-0"
                    >
                      <div className={`h-2 w-2 rounded-full shrink-0 ${ACTIVITY_DOT[item.type]}`} />
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ACTIVITY_BADGE[item.type]}`}
                      >
                        {item.type}
                      </span>
                      <span className="text-sm text-gray-700 truncate flex-1">{item.title}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
