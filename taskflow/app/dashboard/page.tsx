"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBoard, useBoards } from "@/lib/hooks/useBoards";
import { useUser, useClerk, UserButton } from "@clerk/nextjs";
import {
    Activity, AlertTriangle, ArrowRight, ArrowUpDown, BarChart2, BarChart3,
    Calendar, CalendarDays, Check, CheckSquare, Download, Filter, Grid3X3,
    Kanban, LayoutDashboard, LayoutGrid, List, Loader2, Lock, LogOut, Menu,
    MoreHorizontal, Pencil, Plus, Rocket, Search, Settings, Sparkles, Trash2, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Dialog as RadixDialog } from "radix-ui";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { useFeatureAccess } from "@/lib/hooks/useFeatureAccess";
import { FeatureName } from "@/lib/config/featureMatrix";
import { LockedFeatureCard, FeatureUpgradeModal } from "@/components/feature-gate";
import { Board } from "@/lib/supabase/models";
import { exportBoardToCsv } from "@/lib/utils/exportCsv";

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useUser();
    const { signOut } = useClerk();
    const { createBoard, boards, loading, error, updateBoard, deleteBoard } = useBoards();

    // ── legacy state (kept for dialogs + sidebar board list) ──
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "updated" | "az">("newest");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [lockedFeature, setLockedFeature] = useState<FeatureName | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingBoard, setEditingBoard] = useState<Board | null>(null);
    const [editBoardTitle, setEditBoardTitle] = useState("");
    const [editBoardColor, setEditBoardColor] = useState("");
    const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
    const [isBoardActionSaving, setIsBoardActionSaving] = useState(false);

    // ── sidebar state ──
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [activeNav, setActiveNav] = useState("Overview");

    // ── main panel state ──
    const [taskSearchQuery, setTaskSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    // ── resize refs ──
    const isResizingRef = useRef(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(280);

    const { isAllowed } = useFeatureAccess();
    const { plan, limit, isAtLimit, isUnlimited } = usePlanLimits(boards.length);

    // Sync activeBoardId to first board once boards load
    useEffect(() => {
        if (activeBoardId === null && boards.length > 0) {
            setActiveBoardId(boards[0].id);
        }
    }, [boards, activeBoardId]);

    // Resolve selected board
    const selectedBoardId = activeBoardId ?? boards[0]?.id ?? "";
    const selectedBoard = boards.find((b) => b.id === selectedBoardId) ?? null;

    // Fetch full data for selected board (columns + tasks)
    const { columns } = useBoard(selectedBoardId);

    // ── stat computations ──
    const allTasksFlat = useMemo(() => columns.flatMap((c) => c.tasks), [columns]);

    const totalTasks = allTasksFlat.length;
    const highPriorityTasks = allTasksFlat.filter((t) => t.priority === "high").length;

    const dueThisWeek = useMemo(() => {
        const now = new Date();
        const dow = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return allTasksFlat.filter((t) => {
            if (!t.due_date) return false;
            const d = new Date(t.due_date);
            return d >= monday && d <= sunday;
        }).length;
    }, [allTasksFlat]);

    const lastColumn = columns.length > 0 ? columns[columns.length - 1] : null;
    const allTasksWithColumn = useMemo(
        () => columns.flatMap((col) => col.tasks.map((task) => ({ task, column: col }))),
        [columns],
    );
    const filteredSortedTasks = useMemo(() => {
        const q = taskSearchQuery.toLowerCase();
        const filtered = q
            ? allTasksWithColumn.filter(({ task }) => task.title.toLowerCase().includes(q))
            : allTasksWithColumn;
        return [...filtered].sort((a, b) =>
            sortOrder === "asc"
                ? a.task.title.localeCompare(b.task.title)
                : b.task.title.localeCompare(a.task.title),
        );
    }, [allTasksWithColumn, taskSearchQuery, sortOrder]);

    // ── legacy board filtering (kept for sort dialog) ──
    const filteredBoards = useMemo(() => {
        let result = [...boards];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (b) =>
                    b.title.toLowerCase().includes(q) ||
                    (b.description ?? "").toLowerCase().includes(q),
            );
        }
        switch (sortBy) {
            case "oldest":  result.sort((a, b) => a.created_at.localeCompare(b.created_at)); break;
            case "updated": result.sort((a, b) => b.updated_at.localeCompare(a.updated_at)); break;
            case "az":      result.sort((a, b) => a.title.localeCompare(b.title)); break;
            default:        result.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
        }
        return result;
    }, [boards, searchQuery, sortBy]);

    // ── handlers ──
    const handleCreateBoard = () => {
        if (isAtLimit) { setShowUpgradeModal(true); return; }
        setNewBoardTitle("");
        setIsCreateBoardOpen(true);
    };

    const handleSubmitCreateBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBoardTitle.trim()) return;
        await createBoard({ title: newBoardTitle.trim() });
        setNewBoardTitle("");
        setIsCreateBoardOpen(false);
    };

    async function handleEditBoardSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingBoard || !editBoardTitle.trim()) return;
        setIsBoardActionSaving(true);
        try {
            await updateBoard(editingBoard.id, { title: editBoardTitle.trim(), color: editBoardColor || editingBoard.color });
            setEditingBoard(null);
        } finally { setIsBoardActionSaving(false); }
    }

    async function handleDeleteBoardConfirm() {
        if (!deletingBoardId) return;
        setIsBoardActionSaving(true);
        try {
            await deleteBoard(deletingBoardId);
            setDeletingBoardId(null);
        } finally { setIsBoardActionSaving(false); }
    }

    // ── resize ──
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return;
            const next = Math.min(320, Math.max(180, startWidthRef.current + (e.clientX - startXRef.current)));
            setSidebarWidth(next);
        };
        const onMouseUp = () => { isResizingRef.current = false; };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    // ── derived display ──
    const initials = user
        ? (user.firstName && user.lastName
            ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
            : (user.emailAddresses[0]?.emailAddress ?? "U").slice(0, 2).toUpperCase())
        : "U";

    const navItems: { id: string; icon: React.ElementType; label: string; locked?: boolean }[] = [
        { id: "Overview",  icon: LayoutDashboard, label: "Overview" },
        { id: "Tasks",     icon: CheckSquare,     label: "Tasks" },
        { id: "Analytics", icon: BarChart2,        label: "Analytics", locked: plan === "free" },
        { id: "Settings",  icon: Settings,         label: "Settings" },
    ];

    // ── loading / error guards ──
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="text-sm">Loading your boards…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg font-semibold text-gray-800 mb-1">Failed to load boards</p>
                    <p className="text-sm text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    // ── sidebar inner (untouched) ──
    const sidebarInner = (
        <>
            {/* Logo row */}
            <div className="px-5 pt-6 pb-6 flex items-center justify-between">
                <span className="text-2xl font-semibold text-[#1A1816]">TaskFlow</span>
                {sidebarOpen && (
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden p-1 text-[#7A7872] hover:text-[#1A1816] transition-colors"
                        aria-label="Close sidebar"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Nav items */}
            <nav className="flex flex-col">
                {navItems.map(({ id, icon: Icon, label, locked }) => (
                    <button
                        key={id}
                        onClick={() => {
                            if (locked) { setShowUpgradeModal(true); return; }
                            setActiveNav(id);
                        }}
                        className={`flex items-center gap-3 px-5 py-2.5 text-lg w-full transition-colors ${
                            activeNav === id
                                ? "font-medium text-[#1A1816]"
                                : "text-[#7A7872] hover:text-[#1A1816]"
                        }`}
                    >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">{label}</span>
                        {locked && <Lock className="h-3 w-3 text-[#B0ADA6]" />}
                    </button>
                ))}
            </nav>

            {/* Boards section label */}
            <div className="px-5 pt-5 pb-2 text-md font-bold tracking-normal uppercase text-[#B0ADA6]">
                Boards
            </div>

            {/* Board list — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                {boards.map((board, idx) => {
                    const isActive = activeBoardId ? activeBoardId === board.id : idx === 0;
                    return (
                        <button
                            key={board.id}
                            onClick={() => setActiveBoardId(board.id)}
                            className={`flex items-center py-2 w-full mx-0 transition-colors ${
                                isActive ? "bg-[#F5F0E8]" : ""
                            }`}
                        >
                            <div className={`flex items-center gap-3 px-5 w-full text-base ${
                                isActive
                                    ? "font-medium text-[#1A1816]"
                                    : "text-[#7A7872] hover:text-[#1A1816]"
                            }`}>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${board.color}`} />
                                <span className="truncate text-left">{board.title}</span>
                            </div>
                        </button>
                    );
                })}

                <button
                    onClick={handleCreateBoard}
                    className="flex items-center gap-2 px-5 py-2 text-base font-semibold text-[#7F77DD] hover:text-[#6960C4] transition-colors w-full"
                >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span>New board</span>
                </button>
            </div>

            {/* Log out — sits just above the boards count footer */}
            <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="flex items-center gap-3 px-5 py-3 w-full text-sm text-[#7A7872] hover:text-[#1A1816] transition-colors border-t border-[#F0EBE2]"
            >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Log out</span>
            </button>

            {/* Footer — pinned */}
            <div className="border-t border-[#F0EBE2] px-5 pt-4 pb-5">
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
                        <Button
                            size="sm"
                            onClick={() => setShowUpgradeModal(true)}
                            className="w-full bg-[#7F77DD] hover:bg-[#6960C4] text-white text-sm font-medium"
                        >
                            Upgrade to Pro
                        </Button>
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
        </>
    );

    return (
        <>
            {/* Mobile backdrop — always in DOM, fades in/out so it doesn't flash */}
            <div
                className={`fixed inset-0 z-40 bg-black/30 md:hidden transition-opacity duration-200 ${
                    sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setSidebarOpen(false)}
            />

            <div className="flex h-screen overflow-hidden">
                {/* ── Sidebar (untouched) ── */}
                <aside
                    className={`flex flex-col bg-white border-r border-[#F0EBE2] h-full
                        fixed md:relative
                        inset-y-0 left-0
                        z-50 md:z-auto
                        shadow-xl md:shadow-none
                        md:flex-shrink-0
                        transition-transform duration-200
                        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
                    style={{ width: sidebarWidth }}
                >
                    {sidebarInner}

                    {/* Resize drag handle */}
                    <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hidden md:block hover:bg-[#E8E2D8] transition-colors"
                        onMouseDown={(e) => {
                            isResizingRef.current = true;
                            startXRef.current = e.clientX;
                            startWidthRef.current = sidebarWidth;
                            e.preventDefault();
                        }}
                    />
                </aside>

                {/* ── Main content area ── */}
                <div className="flex-1 overflow-y-auto bg-[#F5F0E8]">

                    {/* Topbar */}
                    <div className="px-6 pt-6 pb-0 flex items-center gap-3 justify-between">
                        {/* Hamburger — left side on mobile only */}
                        <button
                            className="md:hidden shrink-0"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open sidebar"
                        >
                            <Menu className="h-5 w-5 text-[#1A1816]" />
                        </button>
                        {/* Title + subtitle */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-semibold text-[#1A1816] tracking-tight truncate">
                                {selectedBoard?.title ?? "No board selected"}
                            </h1>
                            <p className="text-[12.5px] text-[#9C9890] mt-0.5">
                                Overview of your selected board
                            </p>
                        </div>
                        {/* Avatar — right side */}
                        <UserButton />
                    </div>

                    {/* Toolbar */}
                    <div className="px-6 pt-4 flex items-center justify-between">
                        {/* Search */}
                        <div className="flex items-center gap-2 bg-[#EDE9E0] rounded-[9px] px-3 py-2 flex-1 md:flex-none md:w-[380px] border border-transparent hover:border-[#C0B3E1] focus-within:border-[#C0B3E1] focus-within:bg-white transition-colors duration-150">
                            <Search className="h-3.5 w-3.5 text-[#9C9890] shrink-0" />
                            <input
                                type="text"
                                placeholder="Search tasks…"
                                value={taskSearchQuery}
                                onChange={(e) => setTaskSearchQuery(e.target.value)}
                                className="bg-transparent outline-none border-none text-[12.5px] text-[#9C9890] placeholder:text-[#9C9890] w-full"
                            />
                        </div>
                        {/* Sort + view toggle */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSortOrder((o) => o === "asc" ? "desc" : "asc")}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[12px] border transition-colors duration-150 hover:bg-[#EDE9E0] hover:text-[#1A1816] active:bg-[#E4DFD8] ${
                                    sortOrder !== "none"
                                        ? "bg-[#EEEDFE] text-[#5A4A8B] border-[#C0B3E1]"
                                        : "bg-[#EDE9E0] text-[#6B6860] border-transparent"
                                }`}
                            >
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">{sortOrder === "asc" ? "Sort A→Z" : "Sort Z→A"}</span>
                            </button>
                            <div className="flex bg-[#EDE9E0] rounded-[9px] p-0.5 gap-0.5">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-1.5 rounded-[7px] transition-colors duration-150 ${
                                        viewMode === "grid" ? "bg-white text-[#1A1816] shadow-sm" : "text-[#9C9890] hover:bg-[#EDE9E0]"
                                    }`}
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-1.5 rounded-[7px] transition-colors duration-150 ${
                                        viewMode === "list" ? "bg-white text-[#1A1816] shadow-sm" : "text-[#9C9890] hover:bg-[#EDE9E0]"
                                    }`}
                                >
                                    <List className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="px-6 pt-4 grid grid-cols-3 gap-3">
                        {/* Green — total tasks */}
                        <div className="rounded-2xl p-5 bg-[#A9C2AA]">
                            <div className="w-8 h-8 rounded-[9px] bg-[#4A7A4C] flex items-center justify-center mb-2.5">
                                <Kanban className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-[11px] font-semibold text-[#1A1816] opacity-65 mb-1.5">Total tasks</div>
                            <div className="flex items-baseline">
                                <span className="text-[26px] font-bold text-[#1A1816] tracking-tight">{totalTasks}</span>
                                <span className="text-[11px] text-[#1A1816] opacity-50 ml-1">in this board</span>
                            </div>
                        </div>

                        {/* Rose — high priority */}
                        <div className="rounded-2xl p-5 bg-[#D18B8B]">
                            <div className="w-8 h-8 rounded-[9px] bg-[#8B3A3A] flex items-center justify-center mb-2.5">
                                <AlertTriangle className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-[11px] font-semibold text-[#1A1816] opacity-65 mb-1.5">High priority</div>
                            <div className="flex items-baseline">
                                <span className="text-[26px] font-bold text-[#1A1816] tracking-tight">{highPriorityTasks}</span>
                                <span className="text-[11px] text-[#1A1816] opacity-50 ml-1">tasks</span>
                            </div>
                        </div>

                        {/* Lavender — due this week */}
                        <div className="rounded-2xl p-5 bg-[#C0B3E1]">
                            <div className="w-8 h-8 rounded-[9px] bg-[#5A4A8B] flex items-center justify-center mb-2.5">
                                <CalendarDays className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-[11px] font-semibold text-[#1A1816] opacity-65 mb-1.5">Due this week</div>
                            <div className="flex items-baseline">
                                <span className="text-[26px] font-bold text-[#1A1816] tracking-tight">{dueThisWeek}</span>
                                <span className="text-[11px] text-[#1A1816] opacity-50 ml-1">tasks</span>
                            </div>
                        </div>
                    </div>

                    {/* Task list */}
                    <div className="px-6 pt-4 pb-6">
                        {/* Section header */}
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[13px] font-semibold text-[#1A1816]">Tasks</span>
                            <span className="text-[12px] text-[#9C9890] flex items-center gap-1">
                                <Kanban className="h-3 w-3" />
                                {selectedBoard?.title ?? "—"} · {columns.length} column{columns.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        {allTasksWithColumn.length === 0 ? (
                            /* Empty state — board has no tasks */
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Kanban className="h-8 w-8 text-[#D4CFC6] mb-3" />
                                <p className="text-[13px] text-[#9C9890]">No tasks yet</p>
                                <p className="text-[11.5px] text-[#B0ADA6] mt-1">
                                    Open the board to add your first task
                                </p>
                            </div>
                        ) : filteredSortedTasks.length === 0 ? (
                            /* Empty state — search returned nothing */
                            <p className="text-[12.5px] text-[#9C9890] text-center py-4">
                                No tasks match your search
                            </p>
                        ) : viewMode === "grid" ? (
                            /* Grid view */
                            <div className="grid grid-cols-2 gap-3">
                                {filteredSortedTasks.map(({ task, column }) => (
                                    <div
                                        key={task.id}
                                        className="bg-white rounded-xl border border-[#E8E2D5] p-4 cursor-pointer hover:border-[#CFC9BE] transition-colors"
                                    >
                                        <p className="text-[13px] font-medium text-[#1A1816] mb-2 truncate">
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10.5px] text-[#9C9890] bg-[#F5F0E8] px-2 py-0.5 rounded-md">
                                                {column.title}
                                            </span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                task.priority === "high"
                                                    ? "bg-[#FDEAEA] text-[#A32D2D]"
                                                    : task.priority === "medium"
                                                    ? "bg-[#FDF0E0] text-[#8A4A00]"
                                                    : "bg-[#E8F5EE] text-[#1B5E3B]"
                                            }`}>
                                                {task.priority}
                                            </span>
                                            <span className={`text-[11px] flex items-center gap-1 ${
                                                task.due_date ? "text-[#B0ADA6]" : "text-[#D4CFC6]"
                                            }`}>
                                                <Calendar className="h-3 w-3" />
                                                {task.due_date
                                                    ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                                    : "No date"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* List view */
                            filteredSortedTasks.map(({ task, column }) => (
                                <div
                                    key={task.id}
                                    className="bg-white rounded-xl border border-[#E8E2D5] px-4 py-3 flex items-center gap-3 mb-2 cursor-pointer hover:border-[#CFC9BE] transition-colors"
                                >
                                    <span className="text-[13px] font-medium text-[#1A1816] flex-1 truncate">
                                        {task.title}
                                    </span>
                                    <span className="text-[10.5px] text-[#9C9890] bg-[#F5F0E8] px-2 py-0.5 rounded-md shrink-0">
                                        {column.title}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                        task.priority === "high"
                                            ? "bg-[#FDEAEA] text-[#A32D2D]"
                                            : task.priority === "medium"
                                            ? "bg-[#FDF0E0] text-[#8A4A00]"
                                            : "bg-[#E8F5EE] text-[#1B5E3B]"
                                    }`}>
                                        {task.priority}
                                    </span>
                                    <span className={`text-[11px] flex items-center gap-1 shrink-0 ${
                                        task.due_date ? "text-[#B0ADA6]" : "text-[#D4CFC6]"
                                    }`}>
                                        <Calendar className="h-3 w-3" />
                                        {task.due_date
                                            ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                            : "No date"}
                                    </span>
                                </div>
                            ))
                        )}

                        {/* Bottom action buttons */}
                        <div className="flex gap-2.5 mt-3">
                            <button
                                onClick={() => selectedBoard && router.push(`/boards/${selectedBoard.id}`)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-[#2D2926] text-white text-[12.5px] font-medium cursor-pointer hover:bg-[#1F1C19] transition-colors duration-150"
                            >
                                <Kanban className="h-4 w-4" />
                                Open full board
                            </button>

                            {(plan === "pro" || plan === "enterprise") && selectedBoard && (
                                <button
                                    onClick={() => exportBoardToCsv(selectedBoard.title, columns)}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#EDE9E0] text-[#1A1816] text-[12.5px] font-medium cursor-pointer hover:bg-[#E0DBD0] transition-colors"
                                >
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Dialogs (unchanged) ── */}

            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="w-[95vw] max-w-sm mx-auto">
                    <DialogHeader><DialogTitle>Sort Boards</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-2 mt-1">
                        {([
                            { value: "newest",  label: "Newest first" },
                            { value: "oldest",  label: "Oldest first" },
                            { value: "updated", label: "Recently updated" },
                            { value: "az",      label: "A → Z" },
                        ] as const).map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { setSortBy(opt.value); setIsFilterOpen(false); }}
                                className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                                    sortBy === opt.value
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                {opt.label}
                                {sortBy === opt.value && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                            </button>
                        ))}
                    </div>
                    {sortBy !== "newest" && (
                        <button
                            onClick={() => { setSortBy("newest"); setIsFilterOpen(false); }}
                            className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline text-center w-full"
                        >
                            Reset to default
                        </button>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
                <DialogContent className="w-[95vw] max-w-sm mx-auto">
                    <DialogHeader><DialogTitle>New Board</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmitCreateBoard} className="flex flex-col gap-4 mt-2">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="board-title">Board name</Label>
                            <Input
                                id="board-title"
                                placeholder="e.g. Marketing Sprint"
                                value={newBoardTitle}
                                onChange={(e) => setNewBoardTitle(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsCreateBoardOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={!newBoardTitle.trim()}>Create Board</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogPortal>
                    <DialogOverlay className="!bg-black/40 backdrop-blur-sm" />
                    <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-xl border border-[#EDE9E0] p-6 text-center outline-none">
                        <DialogClose className="absolute top-4 right-4 text-[#9C9890] hover:text-[#1A1816] transition-colors">
                            <X className="w-4 h-4" />
                            <span className="sr-only">Close</span>
                        </DialogClose>
                        <div className="w-12 h-12 rounded-full bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-5 h-5 text-[#5A4A8B]" />
                        </div>
                        <DialogTitle className="text-[18px] font-semibold text-[#1A1816] mb-2">Upgrade to Pro</DialogTitle>
                        <p className="text-[13px] text-[#9C9890] leading-relaxed mb-1">
                            You&apos;ve reached your Free plan limit of <strong>{limit} boards</strong>.
                        </p>
                        <p className="text-[13px] text-[#9C9890] leading-relaxed mb-5">
                            Upgrade to Pro for unlimited boards, analytics, CSV export, and more.
                        </p>
                        <Link
                            href="/pricing"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            View Plans
                        </Link>
                        <button onClick={() => setShowUpgradeModal(false)} className="w-full mt-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0] transition-colors">
                            Maybe Later
                        </button>
                    </RadixDialog.Content>
                </DialogPortal>
            </Dialog>

            <FeatureUpgradeModal feature={lockedFeature} onClose={() => setLockedFeature(null)} />

            <Dialog open={!!editingBoard} onOpenChange={(open) => { if (!open) setEditingBoard(null); }}>
                <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
                    <DialogHeader><DialogTitle>Edit Board</DialogTitle></DialogHeader>
                    <form className="space-y-4" onSubmit={handleEditBoardSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="editBoardTitle">Board Title</Label>
                            <Input
                                id="editBoardTitle"
                                value={editBoardTitle}
                                onChange={(e) => setEditBoardTitle(e.target.value)}
                                placeholder="Enter board title..."
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Board Color</Label>
                            <div className="grid grid-cols-6 gap-2">
                                {[
                                    "bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-yellow-400",
                                    "bg-lime-400", "bg-emerald-400", "bg-teal-400", "bg-sky-400",
                                    "bg-indigo-400", "bg-purple-400", "bg-fuchsia-400", "bg-pink-400",
                                ].map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`w-8 h-8 rounded-full ${color} ${editBoardColor === color ? "ring-2 ring-offset-2 ring-gray-900" : ""}`}
                                        onClick={() => setEditBoardColor(color)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setEditingBoard(null)}>Cancel</Button>
                            <Button type="submit" disabled={isBoardActionSaving}>
                                {isBoardActionSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deletingBoardId} onOpenChange={(open) => { if (!open) setDeletingBoardId(null); }}>
                <DialogContent className="w-[95vw] max-w-sm mx-auto text-center">
                    <DialogHeader>
                        <div className="flex justify-center mb-3">
                            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="h-6 w-6 text-red-500" />
                            </div>
                        </div>
                        <DialogTitle className="text-xl">Delete Board?</DialogTitle>
                        <p className="text-sm text-gray-600 mt-1">
                            This will permanently delete the board and all its columns and tasks. This action cannot be undone.
                        </p>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 mt-4">
                        <Button
                            variant="destructive"
                            className="w-full font-semibold"
                            disabled={isBoardActionSaving}
                            onClick={handleDeleteBoardConfirm}
                        >
                            {isBoardActionSaving ? "Deleting..." : "Delete Board"}
                        </Button>
                        <Button variant="ghost" className="w-full" onClick={() => setDeletingBoardId(null)}>
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
