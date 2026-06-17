"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Lock,
  BarChart2,
  Settings,
  LayoutDashboard,
  CheckSquare,
  Plus,
  LogOut,
  Sparkles,
  Menu,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import { useBoards } from "@/lib/hooks/useBoards";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { FeatureName } from "@/lib/config/featureMatrix";
import { FeatureUpgradeModal } from "@/components/feature-gate";

export default function AnalyticsPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();
  const { boards, loading: boardsLoading } = useBoards();
  const { analytics, loading: analyticsLoading } = useAnalytics();
  const { plan, limit, isUnlimited } = usePlanLimits(boards.length);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<FeatureName | null>(null);

  const loading = analyticsLoading || boardsLoading;

  const initials = user
    ? user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user.emailAddresses[0]?.emailAddress ?? "U").slice(0, 2).toUpperCase()
    : "U";

  const navItems = [
    { id: "Overview",  icon: LayoutDashboard, label: "Overview",  href: "/dashboard",           locked: false },
    { id: "Tasks",     icon: CheckSquare,     label: "Tasks",     href: "/dashboard/tasks",     locked: false },
    { id: "Analytics", icon: BarChart2,       label: "Analytics", href: "/dashboard/analytics", locked: false },
    { id: "Settings",  icon: Settings,        label: "Settings",  href: "/dashboard/settings",  locked: false },
  ];

  // ── Derived scalar values ──
  const totalTasks      = analytics?.overview.totalTasks     ?? 0;
  const completedTasks  = analytics?.overview.completedTasks ?? 0;
  const completionRate  = analytics?.overview.completionRate  ?? 0;
  const boardCount      = analytics?.overview.totalBoards    ?? 0;
  const overdueCount    = analytics?.dueDates.overdue        ?? 0;
  const dueThisWeek     = analytics?.dueDates.dueThisWeek    ?? 0;
  const dueUpcoming     = analytics?.dueDates.upcoming       ?? 0;
  const inProgressCount = analytics?.statusCounts["In Progress"] ?? 0;

  // ── Status breakdown bars ──
  const statusBars = useMemo(() => {
    const raw = analytics?.statusCounts ?? {};
    const known = [
      { title: "To Do",       count: raw["To Do"]       ?? 0, color: "#7F77DD" },
      { title: "In Progress", count: raw["In Progress"] ?? 0, color: "#378ADD" },
      { title: "Review",      count: raw["Review"]      ?? 0, color: "#EF9F27" },
      { title: "Done",        count: raw["Done"]        ?? 0, color: "#639922" },
    ];
    const knownSet = new Set(["To Do", "In Progress", "Review", "Done", "Other"]);
    const extras = Object.entries(raw)
      .filter(([k]) => !knownSet.has(k))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, count]) => ({ title, count, color: "#888780" }));
    if ((raw["Other"] ?? 0) > 0) {
      extras.push({ title: "Other", count: raw["Other"] ?? 0, color: "#888780" });
    }
    return [...known, ...extras];
  }, [analytics]);

  const maxStatusCount = useMemo(
    () => Math.max(1, ...statusBars.map((b) => b.count)),
    [statusBars]
  );

  // ── Priority distribution bars ──
  const priorityBars = useMemo(
    () => [
      { label: "High",   count: analytics?.priorityCounts.high   ?? 0, color: "#E24B4A" },
      { label: "Medium", count: analytics?.priorityCounts.medium ?? 0, color: "#EF9F27" },
      { label: "Low",    count: analytics?.priorityCounts.low    ?? 0, color: "#639922" },
    ],
    [analytics]
  );

  const maxPriorityCount = useMemo(
    () => Math.max(1, ...priorityBars.map((b) => b.count)),
    [priorityBars]
  );

  // ── Tasks per board bars ──
  const boardBars = useMemo(() => {
    if (!analytics?.allTasks) return [];
    const counts = new Map<string, number>();
    for (const task of analytics.allTasks) {
      counts.set(task.board_id, (counts.get(task.board_id) ?? 0) + 1);
    }
    return boards
      .map((board) => ({ board, count: counts.get(board.id) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [analytics?.allTasks, boards]);

  const maxBoardCount = useMemo(
    () => Math.max(1, ...boardBars.map((b) => b.count)),
    [boardBars]
  );

  // ── Monthly sparkline — last 12 months, oldest → newest ──
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString("en-US", { month: "short" }), count: 0 });
    }
    if (analytics?.allTasks) {
      for (const task of analytics.allTasks) {
        const d = new Date(task.created_at);
        const ago =
          (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (ago >= 0 && ago < 12) months[11 - ago].count++;
      }
    }
    return months;
  }, [analytics?.allTasks]);

  const maxMonthCount = useMemo(
    () => Math.max(1, ...monthlyData.map((m) => m.count)),
    [monthlyData]
  );

  function sparklineColor(ratio: number): string {
    if (ratio <= 0.25) return "#CECBF6";
    if (ratio <= 0.5)  return "#AFA9EC";
    if (ratio <= 0.75) return "#7F77DD";
    return "#534AB7";
  }

  const sidebarInner = (
    <>
      {/* Logo + toggle */}
      <div className={`flex items-center px-5 pt-6 pb-6 ${isCollapsed ? "md:justify-center md:px-0" : "justify-between"}`}>
        <span className={`text-2xl font-semibold text-[#1A1816] ${isCollapsed ? "md:hidden" : ""}`}>TaskFlow</span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-[#7A7872] hover:text-[#1A1816] hover:bg-[#F0EBE2] transition-colors shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1 text-[#7A7872] hover:text-[#1A1816] transition-colors"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <nav className="flex flex-col">
        {navItems.map(({ id, icon: Icon, label, href, locked }) => (
          <Link
            key={id}
            href={locked ? "#" : href}
            title={isCollapsed ? label : undefined}
            onClick={(e) => {
              if (locked) {
                e.preventDefault();
                if (id === "Analytics") setLockedFeature("analytics");
              }
              setSidebarOpen(false);
            }}
            className={`flex items-center w-full transition-colors text-lg
              ${isCollapsed ? "gap-3 px-5 py-2.5 md:justify-center md:py-3 md:px-0 md:gap-0" : "gap-3 px-5 py-2.5"}
              ${id === "Analytics" ? "font-medium text-[#1A1816]" : "text-[#7A7872] hover:text-[#1A1816]"}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={`flex-1 text-left ${isCollapsed ? "md:hidden" : ""}`}>{label}</span>
          </Link>
        ))}
      </nav>

      <div className={`px-5 pt-5 pb-2 text-md font-bold tracking-normal uppercase text-[#B0ADA6] ${isCollapsed ? "md:hidden" : ""}`}>
        Boards
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        <div className={isCollapsed ? "md:hidden" : ""}>
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/dashboard?board=${board.id}`}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-5 py-2 text-base text-[#7A7872] hover:text-[#1A1816] transition-colors"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${board.color}`} />
              <span className="truncate text-left">{board.title}</span>
            </Link>
          ))}
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-5 py-2 text-base font-semibold text-[#7F77DD] hover:text-[#6960C4] transition-colors"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>New board</span>
          </Link>
        </div>
      </div>

      <button
        onClick={() => signOut({ redirectUrl: "/" })}
        className={`flex items-center w-full text-sm text-[#7A7872] hover:text-[#1A1816] transition-colors border-t border-[#F0EBE2]
          ${isCollapsed ? "gap-3 px-5 py-3 md:justify-center md:px-0 md:gap-0" : "gap-3 px-5 py-3"}`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span className={isCollapsed ? "md:hidden" : ""}>Log out</span>
      </button>

      <div className={`border-t border-[#F0EBE2] ${isCollapsed ? "md:py-4" : "px-5 pt-4 pb-5"}`}>
        <div className={`justify-center ${isCollapsed ? "hidden md:flex" : "hidden"}`}>
          <div className="w-8 h-8 rounded-full bg-[#7F77DD] text-white flex items-center justify-center text-sm font-medium shrink-0">
            {initials}
          </div>
        </div>
        <div className={isCollapsed ? "md:hidden px-5 pt-4 pb-5" : ""}>
          {plan === "free" ? (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#7A7872] mb-1.5">
                  <span>Boards</span>
                  <span>{boards.length}/{isUnlimited ? "∞" : limit}</span>
                </div>
                <div className="h-1.5 bg-[#F0EBE2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7F77DD] rounded-full transition-all duration-300"
                    style={{
                      width: `${isUnlimited ? 0 : Math.min(100, (boards.length / (limit as number)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <Link
                href="/pricing"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#7F77DD] hover:bg-[#6960C4] text-white text-sm font-medium transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade to Pro
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#7F77DD] text-white flex items-center justify-center text-sm font-medium shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1816] truncate leading-tight">
                  {user?.fullName ?? user?.emailAddresses[0]?.emailAddress}
                </p>
                <span className="inline-flex items-center text-[10px] font-semibold bg-[#E8E6FC] text-[#4A46A8] px-2 py-0.5 rounded-full mt-0.5">
                  Pro plan
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

    </>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 md:hidden transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="flex h-screen overflow-hidden">
        {/* ── Sidebar ── */}
        <aside
          className={`flex flex-col bg-white border-r border-[#F0EBE2] h-full
            fixed md:relative inset-y-0 left-0
            z-50 md:z-auto flex-shrink-0
            shadow-xl md:shadow-none
            overflow-hidden
            transition-[width,transform] duration-200
            w-[280px] ${isCollapsed ? "md:w-16" : "md:w-[280px]"}
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        >
          {sidebarInner}
        </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-y-auto bg-[#F0EDE6]">
        {!userLoaded ? (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-8 w-48" />
          </div>
        ) : plan === "free" ? (
          /* ── Locked state ── */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="md:hidden absolute top-4 left-4 min-h-[44px] min-w-[44px] flex items-center justify-start"
            >
              <Menu className="h-5 w-5 text-[#1A1816]" />
            </button>
            <Lock className="h-10 w-10 text-[#CBD5E1] mb-4" />
            <h2 className="text-[18px] font-bold text-[#1A1A18] mb-2">Analytics is a Pro feature</h2>
            <p className="text-[14px] text-[#6B6B68] mb-6 max-w-sm">
              Upgrade to Pro to unlock insights across all your boards
            </p>
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#7C5CFC] text-white text-[14px] font-medium hover:bg-[#5B3FD4] transition-colors min-h-[44px]"
            >
              Upgrade to Pro
            </Link>
          </div>
        ) : (
          /* ── Analytics content ── */
          <div className="px-4 py-5 md:px-8 md:py-8">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open sidebar"
                  className="md:hidden shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-start"
                >
                  <Menu className="h-5 w-5 text-[#1A1816]" />
                </button>
                <div>
                  <h1 className="text-[18px] md:text-[22px] font-bold text-[#1A1A18] leading-tight">Analytics</h1>
                  <p className="text-[14px] text-[#6B6B68] mt-1">How your work is moving across all boards</p>
                </div>
              </div>
              <span className="shrink-0 ml-4 text-[11px] font-medium text-[#534AB7] bg-[#EDE9FF] px-[12px] py-[4px] rounded-[20px]">
                Pro plan
              </span>
            </div>

            {/* Section 1 — Metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[88px] rounded-[8px]" />
                ))
              ) : (
                <>
                  <div className="bg-[#F5F4F0] rounded-[8px] p-4">
                    <div className="text-[12px] text-[#6B6B68] mb-1.5">Total tasks</div>
                    <div className="text-[20px] sm:text-[24px] font-medium text-[#1A1A18] mb-0.5">{totalTasks}</div>
                    <div className="text-[12px] text-[#6B6B68]">across {boardCount} boards</div>
                  </div>
                  <div className="bg-[#F5F4F0] rounded-[8px] p-4">
                    <div className="text-[12px] text-[#6B6B68] mb-1.5">Completed</div>
                    <div className="text-[20px] sm:text-[24px] font-medium text-[#1A1A18] mb-0.5">{completedTasks}</div>
                    <div className="text-[12px] text-[#6B6B68]">{completionRate}% completion rate</div>
                  </div>
                  <div className="bg-[#F5F4F0] rounded-[8px] p-4">
                    <div className="text-[12px] text-[#6B6B68] mb-1.5">Overdue</div>
                    <div className="text-[20px] sm:text-[24px] font-medium text-[#1A1A18] mb-0.5">{overdueCount}</div>
                    <div className={`text-[12px] ${overdueCount > 0 ? "text-[#A32D2D]" : "text-[#6B6B68]"}`}>
                      {overdueCount > 0 ? "needs attention" : "all on track"}
                    </div>
                  </div>
                  <div className="bg-[#F5F4F0] rounded-[8px] p-4">
                    <div className="text-[12px] text-[#6B6B68] mb-1.5">In progress</div>
                    <div className="text-[20px] sm:text-[24px] font-medium text-[#1A1A18] mb-0.5">{inProgressCount}</div>
                    <div className="text-[12px] text-[#6B6B68]">actively being worked</div>
                  </div>
                </>
              )}
            </div>

            {/* Section 2 — Status breakdown + Priority distribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 md:p-5">
                <div className="text-[14px] font-medium text-[#1A1A18] mb-1">Task status breakdown</div>
                <div className="text-[12px] text-[#6B6B68] mb-5">Where your tasks currently sit</div>
                {loading ? (
                  <Skeleton className="h-[120px] w-full rounded-lg" />
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {statusBars.map((bar) => (
                      <div key={bar.title} className="flex items-center gap-2">
                        <span className="text-[12px] text-[#6B6B68] text-right shrink-0 w-[72px]">{bar.title}</span>
                        <div className="flex-1 h-5 bg-[#F5F4F0] rounded-[4px] overflow-hidden">
                          <div
                            className="h-full rounded-[4px] transition-all duration-500"
                            style={{
                              width: `${(bar.count / maxStatusCount) * 100}%`,
                              backgroundColor: bar.color,
                            }}
                          />
                        </div>
                        <span className="text-[12px] text-[#6B6B68] shrink-0 w-7 text-right">{bar.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 md:p-5">
                <div className="text-[14px] font-medium text-[#1A1A18] mb-1">Priority distribution</div>
                <div className="text-[12px] text-[#6B6B68] mb-5">Breakdown of task urgency</div>
                {loading ? (
                  <Skeleton className="h-[120px] w-full rounded-lg" />
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {priorityBars.map((bar) => (
                      <div key={bar.label} className="flex items-center gap-2">
                        <span className="text-[12px] text-[#6B6B68] text-right shrink-0 w-[72px]">{bar.label}</span>
                        <div className="flex-1 h-5 bg-[#F5F4F0] rounded-[4px] overflow-hidden">
                          <div
                            className="h-full rounded-[4px] transition-all duration-500"
                            style={{
                              width: `${(bar.count / maxPriorityCount) * 100}%`,
                              backgroundColor: bar.color,
                            }}
                          />
                        </div>
                        <span className="text-[12px] text-[#6B6B68] shrink-0 w-7 text-right">{bar.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3 — Tasks per board + Due date overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 md:p-5">
                <div className="text-[14px] font-medium text-[#1A1A18] mb-1">Tasks per board</div>
                <div className="text-[12px] text-[#6B6B68] mb-5">Volume distribution across your boards</div>
                {loading ? (
                  <Skeleton className="h-[120px] w-full rounded-lg" />
                ) : boardBars.length === 0 ? (
                  <p className="text-[13px] text-[#6B6B68] text-center py-6">No boards yet</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {boardBars.map(({ board, count }) => (
                      <div key={board.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 shrink-0 w-20 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${board.color}`} />
                          <span className="text-[12px] text-[#1A1A18] truncate">{board.title}</span>
                        </div>
                        <div className="flex-1 h-4 bg-[#F5F4F0] rounded-[4px] overflow-hidden">
                          <div
                            className="h-full rounded-[4px] transition-all duration-500"
                            style={{
                              width: `${(count / maxBoardCount) * 100}%`,
                              backgroundColor: "rgba(127,119,221,0.7)",
                            }}
                          />
                        </div>
                        <span className="text-[12px] text-[#6B6B68] shrink-0 w-5 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 md:p-5">
                <div className="text-[14px] font-medium text-[#1A1A18] mb-1">Due date overview</div>
                <div className="text-[12px] text-[#6B6B68] mb-5">Tasks by when they need to be done</div>
                {loading ? (
                  <Skeleton className="h-[120px] w-full rounded-lg" />
                ) : (
                  <div className="grid grid-cols-1 min-[900px]:grid-cols-3 gap-2.5">
                    <div className="rounded-[8px] p-3.5 bg-[#FCEBEB]">
                      <div className="text-[11px] font-medium mb-2 text-[#791F1F]">Overdue</div>
                      <div className="text-[28px] font-medium mb-1 text-[#A32D2D]">{overdueCount}</div>
                      <div className="text-[11px] text-[#A32D2D]">past due date</div>
                    </div>
                    <div className="rounded-[8px] p-3.5 bg-[#FAEEDA]">
                      <div className="text-[11px] font-medium mb-2 text-[#633806]">This week</div>
                      <div className="text-[28px] font-medium mb-1 text-[#854F0B]">{dueThisWeek}</div>
                      <div className="text-[11px] text-[#854F0B]">due in 7 days</div>
                    </div>
                    <div className="rounded-[8px] p-3.5 bg-[#EAF3DE]">
                      <div className="text-[11px] font-medium mb-2 text-[#27500A]">Later</div>
                      <div className="text-[28px] font-medium mb-1 text-[#3B6D11]">{dueUpcoming}</div>
                      <div className="text-[11px] text-[#3B6D11]">no rush yet</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4 — Tasks over time sparkline */}
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 md:p-5">
              <div className="text-[14px] font-medium text-[#1A1A18] mb-1">Tasks created over time</div>
              <div className="text-[12px] text-[#6B6B68] mb-5">How many tasks were added each month</div>
              {loading ? (
                <Skeleton className="h-[100px] w-full rounded-lg" />
              ) : (
                <>
                  {/* Desktop — last 12 months */}
                  <div className="hidden sm:block">
                    <div className="h-20 flex items-end gap-1.5">
                      {monthlyData.map((m, i) => {
                        const ratio = m.count / maxMonthCount;
                        return (
                          <div key={i} className="flex-1 flex items-end h-full">
                            <div
                              className="w-full rounded-t-[4px]"
                              style={{
                                height: `${Math.max(2.5, ratio * 100)}%`,
                                backgroundColor: sparklineColor(ratio),
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      {monthlyData.map((m, i) => (
                        <div key={i} className="flex-1 text-center text-[10px] text-[#6B6B68]">
                          {m.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile — last 6 months */}
                  <div className="sm:hidden">
                    <div className="h-20 flex items-end gap-1.5">
                      {monthlyData.slice(6).map((m, i) => {
                        const ratio = m.count / maxMonthCount;
                        return (
                          <div key={i} className="flex-1 flex items-end h-full">
                            <div
                              className="w-full rounded-t-[4px]"
                              style={{
                                height: `${Math.max(2.5, ratio * 100)}%`,
                                backgroundColor: sparklineColor(ratio),
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      {monthlyData.slice(6).map((m, i) => (
                        <div key={i} className="flex-1 text-center text-[10px] text-[#6B6B68]">
                          {m.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
      <FeatureUpgradeModal feature={lockedFeature} onClose={() => setLockedFeature(null)} />
    </>
  );
}
