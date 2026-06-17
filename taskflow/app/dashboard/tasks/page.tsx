"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Search,
  ArrowUpDown,
  Filter,
  Calendar,
  ClipboardList,
  SearchX,
  LayoutDashboard,
  CheckSquare,
  BarChart2,
  Settings,
  Plus,
  Lock,
  Sparkles,
  LogOut,
  LayoutGrid,
  Menu,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import { useBoards } from "@/lib/hooks/useBoards";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { FeatureName } from "@/lib/config/featureMatrix";
import { FeatureUpgradeModal } from "@/components/feature-gate";

type EnrichedTask = {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  created_at: string;
  column_id: string;
  columnTitle: string;
  boardId: string;
  boardTitle: string;
  boardColor: string;
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function TasksPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { boards, loading: boardsLoading } = useBoards();
  const { analytics, loading: analyticsLoading } = useAnalytics();
  const { plan, limit, isUnlimited } = usePlanLimits(boards.length);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");
  const [boardFilter, setBoardFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<FeatureName | null>(null);

  const loading = analyticsLoading || boardsLoading;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const enrichedTasks = useMemo((): EnrichedTask[] => {
    if (!analytics?.allTasks) return [];
    const boardMap = new Map(boards.map((b) => [b.id, b]));
    return analytics.allTasks.map((t) => {
      const board = boardMap.get(t.board_id);
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        assignee: t.assignee,
        due_date: t.due_date,
        priority: t.priority,
        created_at: t.created_at,
        column_id: t.column_id,
        columnTitle: t.column_title,
        boardId: t.board_id,
        boardTitle: board?.title ?? "Unknown board",
        boardColor: board?.color ?? "bg-gray-400",
      };
    });
  }, [analytics?.allTasks, boards]);

  const filteredTasks = useMemo((): EnrichedTask[] => {
    let result = enrichedTasks;

    if (boardFilter !== "all") {
      result = result.filter((t) => t.boardId === boardFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "created_asc":
          return a.created_at.localeCompare(b.created_at);
        case "due_asc":
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        case "due_desc":
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return b.due_date.localeCompare(a.due_date);
        case "priority_high":
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        case "priority_low":
          return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "title_desc":
          return b.title.localeCompare(a.title);
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [enrichedTasks, boardFilter, search, sortBy]);

  const initials = user
    ? user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user.emailAddresses[0]?.emailAddress ?? "U").slice(0, 2).toUpperCase()
    : "U";

  const navItems = [
    { id: "Overview",  icon: LayoutDashboard, label: "Overview",   href: "/dashboard",       locked: false },
    { id: "Tasks",     icon: CheckSquare,     label: "Tasks",      href: "/dashboard/tasks", locked: false },
    { id: "Analytics", icon: BarChart2,       label: "Analytics",  href: "/dashboard/analytics", locked: plan === "free" },
    { id: "Settings",  icon: Settings,        label: "Settings",   href: "/dashboard/settings", locked: false },
  ];

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
              ${id === "Tasks" ? "font-medium text-[#1A1816]" : "text-[#7A7872] hover:text-[#1A1816]"}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={`flex-1 text-left ${isCollapsed ? "md:hidden" : ""}`}>{label}</span>
            {locked && <Lock className={`h-3 w-3 text-[#B0ADA6] ${isCollapsed ? "md:hidden" : ""}`} />}
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
        <div className="px-4 py-5 md:px-8 md:py-8">

          {/* 1. Page header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="md:hidden shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-start"
              >
                <Menu className="h-5 w-5 text-[#1A1816]" />
              </button>
              <h1 className="text-[18px] md:text-[22px] font-bold text-[#1A1A18] leading-tight">Tasks</h1>
            </div>
            {!loading && (
              <span className="shrink-0 ml-4 text-[12px] font-semibold text-[#7C5CFC] bg-[#EDE9FF] px-[10px] py-[3px] rounded-[20px]">
                {enrichedTasks.length} tasks
              </span>
            )}
          </div>

          {/* 2. Controls */}
          {loading ? (
            <div className="flex flex-wrap gap-2.5 mb-5">
              <Skeleton className="h-11 w-full sm:flex-1 rounded-[10px]" />
              <Skeleton className="h-11 w-[160px] rounded-[10px]" />
              <Skeleton className="h-11 w-[160px] rounded-[10px]" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5 mb-5">
              {/* Search — full width on mobile, flex-1 on desktop */}
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B6B68] pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-[10px] pl-9 pr-3 py-2.5 text-[14px] text-[#1A1A18] placeholder:text-[#6B6B68] outline-none focus:border-[#7C5CFC] transition-colors min-h-[44px]"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[10px] h-auto min-h-[44px] px-3.5 py-2.5 text-[14px] text-[#1A1A18] w-auto min-w-[160px] shadow-none focus:ring-0 focus:ring-offset-0">
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#6B6B68] shrink-0" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">Newest first</SelectItem>
                  <SelectItem value="created_asc">Oldest first</SelectItem>
                  <SelectItem value="due_asc">Due date (earliest)</SelectItem>
                  <SelectItem value="due_desc">Due date (latest)</SelectItem>
                  <SelectItem value="priority_high">Priority (high first)</SelectItem>
                  <SelectItem value="priority_low">Priority (low first)</SelectItem>
                  <SelectItem value="title_asc">Title A → Z</SelectItem>
                  <SelectItem value="title_desc">Title Z → A</SelectItem>
                </SelectContent>
              </Select>

              {/* Board filter */}
              <Select value={boardFilter} onValueChange={setBoardFilter}>
                <SelectTrigger className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[10px] h-auto min-h-[44px] px-3.5 py-2.5 text-[14px] text-[#1A1A18] w-auto min-w-[160px] shadow-none focus:ring-0 focus:ring-offset-0">
                  <span className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-[#6B6B68] shrink-0" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All boards</SelectItem>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Live count — desktop only */}
              <span className="hidden md:flex items-center text-[13px] text-[#6B6B68] whitespace-nowrap">
                Showing {filteredTasks.length} of {enrichedTasks.length} tasks
              </span>
            </div>
          )}

          {/* 3. Task list */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex flex-col">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)] last:border-0">
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            ) : boards.length === 0 ? (
              /* No boards */
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <LayoutGrid className="h-10 w-10 text-[#CBD5E1]" />
                <p className="text-[16px] font-semibold text-[#1A1A18] mt-4">No boards yet</p>
                <p className="text-[14px] text-[#6B6B68] mt-1">
                  Create a board first, then add tasks to it
                </p>
                <Link
                  href="/dashboard"
                  className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#7C5CFC] text-white text-[13px] font-medium hover:bg-[#5B3FD4] transition-colors min-h-[44px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New board
                </Link>
              </div>
            ) : enrichedTasks.length === 0 ? (
              /* Boards exist but no tasks */
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <ClipboardList className="h-10 w-10 text-[#CBD5E1]" />
                <p className="text-[16px] font-semibold text-[#1A1A18] mt-4">No tasks yet</p>
                <p className="text-[14px] text-[#6B6B68] mt-1">
                  Add tasks to your boards and they&apos;ll appear here
                </p>
              </div>
            ) : filteredTasks.length === 0 ? (
              /* Search/filter returned nothing */
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <SearchX className="h-10 w-10 text-[#CBD5E1]" />
                <p className="text-[16px] font-semibold text-[#1A1A18] mt-4">
                  No tasks match your search
                </p>
                <p className="text-[14px] text-[#6B6B68] mt-1">
                  Try a different search term or clear your filters
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setSortBy("created_desc");
                    setBoardFilter("all");
                  }}
                  className="mt-4 px-5 py-2.5 rounded-full bg-[#7C5CFC] text-white text-[13px] font-medium hover:bg-[#5B3FD4] transition-colors min-h-[44px]"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredTasks.map((task, idx) => {
                  const isOverdue =
                    task.due_date ? new Date(task.due_date) < today : false;

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 px-5 py-4 hover:bg-[#FAFAFA] transition-colors duration-150 ${
                        idx < filteredTasks.length - 1
                          ? "border-b border-[rgba(0,0,0,0.05)]"
                          : ""
                      }`}
                    >
                      {/* Priority badge */}
                      <span
                        className={`shrink-0 min-w-[60px] text-center text-[11px] font-semibold rounded-[6px] py-[3px] px-2 capitalize ${
                          task.priority === "high"
                            ? "bg-[#FEE2E2] text-[#991B1B]"
                            : task.priority === "medium"
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : "bg-[#D1FAE5] text-[#065F46]"
                        }`}
                      >
                        {task.priority}
                      </span>

                      {/* Title */}
                      <span className="flex-1 min-w-0 text-[14px] font-medium text-[#1A1A18] truncate whitespace-nowrap overflow-hidden">
                        {task.title}
                      </span>

                      {/* Board chip */}
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[#6B6B68] bg-[#F0EDE6] rounded-[6px] px-2 py-0.5 whitespace-nowrap">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.boardColor}`} />
                        {task.boardTitle}
                      </span>

                      {/* Due date — hidden < 480px */}
                      <span
                        className={`hidden min-[480px]:inline-flex shrink-0 items-center gap-1 text-[12px] whitespace-nowrap ${
                          isOverdue ? "text-[#991B1B]" : "text-[#6B6B68]"
                        }`}
                      >
                        <Calendar className="h-3 w-3 shrink-0" />
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "No date"}
                      </span>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      <FeatureUpgradeModal feature={lockedFeature} onClose={() => setLockedFeature(null)} />
    </>
  );
}
