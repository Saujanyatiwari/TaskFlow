"use client";
import Navbar from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBoards } from "@/lib/hooks/useBoards";
import { useUser } from "@clerk/nextjs";
import { Activity, BarChart3, Bot, Download, Filter, Grid3X3, LayoutDashboard, List, Loader2, Plus, Rocket, Search, X, Zap } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { useFeatureAccess } from "@/lib/hooks/useFeatureAccess";
import { FeatureName } from "@/lib/config/featureMatrix";
import { LockedButton, LockedFeatureCard, FeatureUpgradeModal } from "@/components/feature-gate";

export default function DashboardPage() {
    const {user} = useUser();
    const {createBoard , boards , loading , error} = useBoards();
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "updated" | "az">("newest");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [lockedFeature, setLockedFeature] = useState<FeatureName | null>(null);

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
                        {plan === "enterprise" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                                🏢 Enterprise
                            </span>
                        )}
                        {plan === "pro" && (
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
                        Here's what's happening with your boards today.
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
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 capitalize">{plan}</p>
                                </div>
                                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    plan === "enterprise" ? "bg-purple-100" : plan === "pro" ? "bg-yellow-100" : "bg-gray-100"
                                }`}>
                                    {plan === "enterprise"
                                        ? <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                                        : plan === "pro"
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

                            {isAllowed("export") ? (
                                <Button variant="outline">
                                    <Download className="h-4 w-4 mr-1" />
                                    Export
                                </Button>
                            ) : (
                                <LockedButton
                                    label="Export"
                                    requiredPlan="Pro"
                                    onClick={() => setLockedFeature("export")}
                                />
                            )}

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
                        {filteredBoards.map((board, key) => (
                            <Link href={`/boards/${board.id}`} key={key}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                                    <CardHeader className="pb-3 ">
                                        <div className="flex items-center justify-between">
                                            <div className= {`w-4 h-4 ${board.color} rounded`}/>
                                            <Badge className="text-xs" variant="secondary">New</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-6">
                                        <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
                                            {board.title}
                                        </CardTitle>
                                        <CardDescription className="text-sm mb-4">
                                            {board.description}</CardDescription>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
                                            <span>
                                                Created{" "}
                                                {new Date(board.created_at).toLocaleDateString()}   
                                            </span>
                                            <span>
                                                Updated{" "}
                                                {new Date(board.updated_at).toLocaleDateString()}   
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
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
                        {filteredBoards.map((board, key) => (
                            <div key={key} className={key > 0 ? "mt-4" : ""}>
                            <Link href={`/boards/${board.id}`} key={key}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                                    <CardHeader className="pb-3 ">
                                        <div className="flex items-center justify-between">
                                            <div className= {`w-4 h-4 ${board.color} rounded`}/>
                                            <Badge className="text-xs" variant="secondary">New</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-6">
                                        <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
                                            {board.title}
                                        </CardTitle>
                                        <CardDescription className="text-sm mb-4">
                                            {board.description}</CardDescription>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
                                            <span>
                                                Created{" "}
                                                {new Date(board.created_at).toLocaleDateString()}   
                                            </span>
                                            <span>
                                                Updated{" "}
                                                {new Date(board.updated_at).toLocaleDateString()}   
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
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

                {/* Locked Pro/Enterprise feature hints */}
                {(!isAllowed("analytics") || !isAllowed("aiFeatures")) && (
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                            {!isAllowed("aiFeatures") && (
                                <LockedFeatureCard
                                    feature="aiFeatures"
                                    icon={<Bot className="h-4 w-4" />}
                                    description="AI-powered task suggestions and summaries"
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
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${plan === "pro" ? "bg-purple-100" : "bg-yellow-100"}`}>
                                {plan === "pro"
                                    ? <span className="text-2xl">🏢</span>
                                    : <Zap className="h-6 w-6 text-yellow-500" />
                                }
                            </div>
                        </div>
                        <DialogTitle className="text-xl">
                            {plan === "pro" ? "Upgrade to Enterprise" : "Upgrade your plan"}
                        </DialogTitle>
                        <p className="text-sm text-gray-600 mt-1">
                            {plan === "pro"
                                ? "You've reached your Pro limit of 20 boards."
                                : <>You've reached your Free plan limit of <strong>{limit} boards</strong>.</>
                            }
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {plan === "pro"
                                ? "Upgrade to Enterprise for unlimited boards, custom integrations, and dedicated support."
                                : "Upgrade to Pro or Enterprise for more boards, team features, and advanced tools."
                            }
                        </p>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 mt-4">
                        <Link href="/pricing">
                            <Button className={`w-full font-semibold text-white ${plan === "pro" ? "bg-purple-600 hover:bg-purple-500" : "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"}`}>
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
        </div>
    )
}