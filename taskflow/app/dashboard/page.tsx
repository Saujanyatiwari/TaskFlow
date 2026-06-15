"use client";
import Navbar from "@/components/navbar";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBoards } from "@/lib/hooks/useBoards";
import { useUser } from "@clerk/nextjs";
import { Activity, ArrowRight, BarChart3, Download, Filter, Grid3X3, LayoutDashboard, List, Loader2, MoreHorizontal, Pencil, Plus, Rocket, Search, Trash2, X, Zap } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { useFeatureAccess } from "@/lib/hooks/useFeatureAccess";
import { FeatureName } from "@/lib/config/featureMatrix";
import { LockedFeatureCard, FeatureUpgradeModal } from "@/components/feature-gate";
import { Board } from "@/lib/supabase/models";

export default function DashboardPage() {
    const {user} = useUser();
    const {createBoard, boards, loading, error, updateBoard, deleteBoard} = useBoards();
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

    const { isAllowed } = useFeatureAccess();

    const { plan, limit, isAtLimit, isUnlimited } = usePlanLimits(boards.length);

    const filteredBoards = useMemo(() => {
        let result = [...boards];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (b) =>
                    b.title.toLowerCase().includes(q) ||
                    (b.description ?? "").toLowerCase().includes(q)
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

    const handleCreateBoard = () => {
        if (isAtLimit) {
            setShowUpgradeModal(true);
            return;
        }
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
        } finally {
            setIsBoardActionSaving(false);
        }
    }

    async function handleDeleteBoardConfirm() {
        if (!deletingBoardId) return;
        setIsBoardActionSaving(true);
        try {
            await deleteBoard(deletingBoardId);
            setDeletingBoardId(null);
        } finally {
            setIsBoardActionSaving(false);
        }
    }

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



    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar/>

            <main className="container mx-auto px-4 py-6 sm:py-8">
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            Welcome back, {user?.firstName ?? user?.emailAddresses[0]?.emailAddress}! 👋
                        </h1>
                        {(plan === "pro" || plan === "enterprise") && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                                <Zap className="h-3 w-3" /> Pro
                            </span>
                        )}
                        {plan === "free" && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                                Free
                            </span>
                        )}
                    </div>
                    <p className="text-gray-600">
                        Here&apos;s what&apos;s happening with your boards today.
                    </p>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Total Boards</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{boards.length}</p>
                                </div>
                                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                                    <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Active This Week</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                                        {boards.filter((b) => {
                                            const oneWeekAgo = new Date();
                                            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                                            return new Date(b.updated_at) > oneWeekAgo;
                                        }).length}
                                    </p>
                                </div>
                                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                                    <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Plan Usage</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                                        {isUnlimited ? `${boards.length}/∞` : `${boards.length}/${limit}`}
                                    </p>
                                </div>
                                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Current Plan</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 capitalize">{plan === "enterprise" ? "Pro" : plan}</p>
                                </div>
                                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    plan === "pro" || plan === "enterprise" ? "bg-yellow-100" : "bg-gray-100"
                                }`}>
                                    {plan === "pro" || plan === "enterprise"
                                        ? <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                                        : <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                                    }
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Boards */}

                <div className=" mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                Your Boards</h2>
                            <p className="text-gray-600">
                                Manage your projects and tasks</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                            <div className="flex items-center gap-1 bg-white border rounded-md p-1">
                                <Button variant={viewMode === "grid" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("grid")}>
                                    <Grid3X3/>
                                </Button>
                                <Button variant={viewMode === "list" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("list")}>
                                    <List/>
                                </Button>
                            </div>

                            <Button variant="outline" onClick={() => setIsFilterOpen(true)} className={sortBy !== "newest" ? "border-blue-400 text-blue-600 bg-blue-50" : ""}>
                                <Filter className="h-4 w-4 mr-1"/>
                                Sort
                                {sortBy !== "newest" && <span className="ml-1 h-2 w-2 rounded-full bg-blue-500 inline-block" />}
                            </Button>

                            <div className="flex flex-col items-start gap-1">
                                <Button onClick={handleCreateBoard}>
                                    <Plus/>
                                    Create Board
                                </Button>
                                <p className={`text-xs ${isAtLimit ? "text-rose-600 font-medium" : "text-gray-400"}`}>
                                    {isUnlimited ? `${boards.length}/∞ boards used` : `${boards.length}/${limit} boards used`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-4 sm:mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                            placeholder="Search boards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-9"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>


                    {/* Boards Grid/List */}

                    {boards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-5">
                                <LayoutDashboard className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No boards yet</h3>
                            <p className="text-gray-500 max-w-sm mb-1">
                                Create your first board to start organizing tasks and tracking your projects.
                            </p>
                            <p className="text-sm text-gray-400 mb-7">
                                Each board comes with 4 default columns: To Do, In Progress, Review, and Done.
                            </p>
                            <Button size="lg" onClick={handleCreateBoard}>
                                <Plus className="h-5 w-5 mr-2" />
                                Create your first board
                            </Button>
                        </div>
                    ) : filteredBoards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Search className="h-10 w-10 text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No boards match your search</p>
                            <button onClick={() => { setSearchQuery(""); setSortBy("newest"); }} className="text-sm text-blue-500 hover:underline mt-1">
                                Clear filters
                            </button>
                        </div>
                    ) : viewMode === "grid" ? (

                        //grid view

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg-grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {filteredBoards.map((board) => (
                            <div key={board.id} className="relative group">
                                <Link href={`/boards/${board.id}`}>
                                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center">
                                                <div className={`w-4 h-4 ${board.color} rounded`} />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 sm:p-6">
                                            <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
                                                {board.title}
                                            </CardTitle>
                                            <CardDescription className="text-sm mb-4">
                                                {board.description}
                                            </CardDescription>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
                                                <span>Created {new Date(board.created_at).toLocaleDateString()}</span>
                                                <span>Updated {new Date(board.updated_at).toLocaleDateString()}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                                {/* Three-dot menu */}
                                <div className="absolute top-3 right-3 z-10">
                                    <button
                                        onClick={(e) => { e.preventDefault(); setOpenMenuId(openMenuId === board.id ? null : board.id); }}
                                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                    {openMenuId === board.id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                            <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg border py-1 min-w-[140px]">
                                                <button
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                                    onClick={() => { setEditingBoard(board); setEditBoardTitle(board.title); setEditBoardColor(board.color); setOpenMenuId(null); }}
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-gray-500" /> Edit
                                                </button>
                                                <button
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                                    onClick={() => { setDeletingBoardId(board.id); setOpenMenuId(null); }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        <Card
                            onClick={handleCreateBoard}
                            className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group"
                        >
                            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[150px]">
                                <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-2"/>
                                <p className="text-sm sm:text-base text-gray-600 group-hover:text-blue-600 font-medium">Create new board</p>
                            </CardContent>
                        </Card>
                    </div>

                    ) : (
                        //list view
                    <div>
                        {filteredBoards.map((board, idx) => (
                            <div key={board.id} className={`relative group ${idx > 0 ? "mt-4" : ""}`}>
                                <Link href={`/boards/${board.id}`}>
                                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center">
                                                <div className={`w-4 h-4 ${board.color} rounded`} />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 sm:p-6">
                                            <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
                                                {board.title}
                                            </CardTitle>
                                            <CardDescription className="text-sm mb-4">
                                                {board.description}
                                            </CardDescription>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
                                                <span>Created {new Date(board.created_at).toLocaleDateString()}</span>
                                                <span>Updated {new Date(board.updated_at).toLocaleDateString()}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                                {/* Three-dot menu */}
                                <div className="absolute top-3 right-3 z-10">
                                    <button
                                        onClick={(e) => { e.preventDefault(); setOpenMenuId(openMenuId === board.id ? null : board.id); }}
                                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                    {openMenuId === board.id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                            <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg border py-1 min-w-[140px]">
                                                <button
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                                    onClick={() => { setEditingBoard(board); setEditBoardTitle(board.title); setEditBoardColor(board.color); setOpenMenuId(null); }}
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-gray-500" /> Edit
                                                </button>
                                                <button
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                                    onClick={() => { setDeletingBoardId(board.id); setOpenMenuId(null); }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        <Card onClick={handleCreateBoard} className="mt-4 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group">
                            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                                <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-2"/>
                                <p className="text-sm sm:text-base text-gray-600 group-hover:text-blue-600 font-medium">Create new board</p>
                            </CardContent>
                        </Card>
                    </div>

                    )}
                </div>

                {/* Analytics shortcut for Pro/Enterprise */}
                {isAllowed("analytics") && (
                    <div className="mb-6">
                        <Link href="/dashboard/analytics">
                            <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                                            <BarChart3 className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">Analytics Dashboard</p>
                                            <p className="text-xs text-gray-500">Track task progress, priorities, and productivity trends</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                )}

                {/* Locked Pro feature hints */}
                {(!isAllowed("analytics") || !isAllowed("export")) && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">Unlock more features</h3>
                                <p className="text-sm text-gray-400 mt-0.5">Upgrade your plan to access powerful tools</p>
                            </div>
                            <Link href="/pricing" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                                View plans →
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {!isAllowed("analytics") && (
                                <LockedFeatureCard
                                    feature="analytics"
                                    icon={<BarChart3 className="h-4 w-4" />}
                                    description="Track board activity and task trends"
                                    onUnlock={setLockedFeature}
                                />
                            )}
                            {!isAllowed("export") && (
                                <LockedFeatureCard
                                    feature="export"
                                    icon={<Download className="h-4 w-4" />}
                                    description="Export your boards and tasks to CSV"
                                    onUnlock={setLockedFeature}
                                />
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Sort / Filter Dialog */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="w-[95vw] max-w-sm mx-auto">
                    <DialogHeader>
                        <DialogTitle>Sort Boards</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 mt-1">
                        {(
                            [
                                { value: "newest",  label: "Newest first" },
                                { value: "oldest",  label: "Oldest first" },
                                { value: "updated", label: "Recently updated" },
                                { value: "az",      label: "A → Z" },
                            ] as const
                        ).map((opt) => (
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

            {/* Create Board Dialog */}
            <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
                <DialogContent className="w-[95vw] max-w-sm mx-auto">
                    <DialogHeader>
                        <DialogTitle>New Board</DialogTitle>
                    </DialogHeader>
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
                            <Button type="button" variant="ghost" onClick={() => setIsCreateBoardOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!newBoardTitle.trim()}>
                                Create Board
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Upgrade Modal */}
            <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogContent className="w-[95vw] max-w-md mx-auto text-center">
                    <DialogHeader>
                        <div className="flex justify-center mb-3">
                            <div className="h-12 w-12 rounded-full flex items-center justify-center bg-yellow-100">
                                <Zap className="h-6 w-6 text-yellow-500" />
                            </div>
                        </div>
                        <DialogTitle className="text-xl">
                            Upgrade to Pro
                        </DialogTitle>
                        <p className="text-sm text-gray-600 mt-1">
                            You&apos;ve reached your Free plan limit of <strong>{limit} boards</strong>.
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Upgrade to Pro for unlimited boards, analytics, CSV export, and more.
                        </p>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 mt-4">
                        <Link href="/pricing">
                            <Button className="w-full font-semibold text-white bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600">
                                <Zap className="h-4 w-4 mr-2" />
                                View Plans
                            </Button>
                        </Link>
                        <Button variant="ghost" className="w-full" onClick={() => setShowUpgradeModal(false)}>
                            Maybe Later
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <FeatureUpgradeModal feature={lockedFeature} onClose={() => setLockedFeature(null)} />

            {/* Edit Board Dialog */}
            <Dialog open={!!editingBoard} onOpenChange={(open) => { if (!open) setEditingBoard(null); }}>
                <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Board</DialogTitle>
                    </DialogHeader>
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
                            <Button type="button" variant="outline" onClick={() => setEditingBoard(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isBoardActionSaving}>
                                {isBoardActionSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Board Confirm Dialog */}
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
        </div>
    )
}