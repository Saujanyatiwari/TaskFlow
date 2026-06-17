"use client";

import { Button } from "@/components/ui/button";
import { Dialog as RadixDialog } from "radix-ui";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useBoard } from "@/lib/hooks/useBoards";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowUpDown, Download, Filter, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ColumnWithTasks, Task } from "@/lib/supabase/models";
import { TaskCard, SortableTaskCard } from "@/components/kanban/TaskCard";
import { TaskEditModal } from "@/components/kanban/TaskEditModal";
import { useFeatureAccess } from "@/lib/hooks/useFeatureAccess";
import { FeatureName } from "@/lib/config/featureMatrix";
import { FeatureUpgradeModal } from "@/components/feature-gate";
import { exportBoardToCsv } from "@/lib/utils/exportCsv";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

type TaskFormData = {
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
};

function Column({
  column,
  children,
  taskIds,
  onCreateTask,
  onEditColumn,
  onDeleteColumn,
}: {
  column: ColumnWithTasks;
  children: React.ReactNode;
  taskIds: string[];
  onCreateTask: (columnId: string, taskData: TaskFormData) => Promise<void>;
  onEditColumn: (column: ColumnWithTasks) => void;
  onDeleteColumn: (column: ColumnWithTasks) => void;
}) {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="w-full md:min-w-[280px] md:max-w-[280px] md:flex-shrink-0">
      <div className="bg-white rounded-lg shadow-sm border">

        {/* Column Header */}
        <div className="p-3 sm:p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                {column.title}
              </h3>
              <Badge variant="secondary" className="text-xs shrink-0">
                {column.tasks.length}
              </Badge>
            </div>
            <div className="relative shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen((open) => !open)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg border py-1 min-w-[160px]">
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      onClick={() => { setIsMenuOpen(false); onEditColumn(column); }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-500" /> Rename column
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                      onClick={() => { setIsMenuOpen(false); onDeleteColumn(column); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete column
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* column content */}
        <div className="p-2">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div
              ref={setNodeRef}
              className={`min-h-[2px] rounded transition-colors ${isOver ? "bg-blue-50" : ""}`}
            >
              {children}
            </div>
          </SortableContext>
          <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <Button
                variant="ghost"
                className="w-full mt-3 text-gray-500 hover:text-gray-700"
                onClick={() => setIsAddTaskOpen(true)}
              >
                <Plus />
                Add Task
              </Button>
          <DialogPortal>
            <DialogOverlay className="!bg-black/40 backdrop-blur-sm" />
            <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-2xl shadow-xl border border-[#EDE9E0] p-6 outline-none">
              <DialogClose className="absolute top-4 right-4 text-[#9C9890] hover:text-[#1A1816] transition-colors">
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
              <DialogTitle className="text-[17px] font-semibold text-[#1A1816] mb-1">Create New Task</DialogTitle>
              <p className="text-[12.5px] text-[#9C9890] mb-5">Task will be added to this column</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSaving(true);
                  try {
                    const formData = new FormData(e.currentTarget);
                    await onCreateTask(column.id, {
                      title: formData.get("title") as string,
                      description:
                        (formData.get("description") as string) || undefined,
                      assignee:
                        (formData.get("assignee") as string) || undefined,
                      dueDate:
                        (formData.get("dueDate") as string) || undefined,
                      priority:
                        (formData.get("priority") as
                          | "low"
                          | "medium"
                          | "high") || "medium",
                    });
                    setIsAddTaskOpen(false);
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Title *</label>
                  <input
                    name="title"
                    placeholder="Enter task title"
                    required
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Description</label>
                  <textarea
                    name="description"
                    placeholder="Enter task description"
                    rows={3}
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors resize-none"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Assignee</label>
                  <input
                    name="assignee"
                    placeholder="Who should do this?"
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Priority</label>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] outline-none focus:border-[#C0B3E1] transition-colors appearance-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] outline-none focus:border-[#C0B3E1] transition-colors"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsAddTaskOpen(false)} className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0]">Cancel</button>
                  <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors disabled:opacity-70">
                    {isSaving ? "Saving..." : "Create Task"}
                  </button>
                </div>
              </form>
            </RadixDialog.Content>
          </DialogPortal>
          </Dialog>
        </div>
      </div>
    </div>
  );
}


export default function BoardPage(){
    const { id } = useParams<{id:string}>();
    const { board, columns, loading, error, createRealTask, moveTask, reloadBoard, createColumn, updateColumnTitle, deleteColumn, updateTask, deleteTask } = useBoard(id);

    const [localColumns, setLocalColumns] = useState(columns);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState("");
    const [editingColumn, setEditingColumn] = useState<ColumnWithTasks | null>(null);
    const [editColumnTitle, setEditColumnTitle] = useState("");
    const [deletingColumn, setDeletingColumn] = useState<ColumnWithTasks | null>(null);
    const [isColumnDeleting, setIsColumnDeleting] = useState(false);
    const [lockedFeature, setLockedFeature] = useState<FeatureName | null>(null);

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isToolbarAddTaskOpen, setIsToolbarAddTaskOpen] = useState(false);
    const [isToolbarSaving, setIsToolbarSaving] = useState(false);
    const [toolbarPriority, setToolbarPriority] = useState<"low" | "medium" | "high">("medium");

    const { plan } = useFeatureAccess();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");

    useEffect(() => {
      setLocalColumns(columns);
    }, [columns]);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragStart(event: DragStartEvent) {
      setActiveTaskId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event;
      setActiveTaskId(null);

      if (!over || active.id === over.id) return;

      setSortOrder("none");

      const activeId = active.id as string;
      const overId = over.id as string;

      const sourceCol = localColumns.find(col => col.tasks.some(t => t.id === activeId));
      if (!sourceCol) return;

      const targetCol = localColumns.find(col =>
        col.id === overId || col.tasks.some(t => t.id === overId)
      );
      if (!targetCol) return;

      if (sourceCol.id === targetCol.id) {
        const tasks = sourceCol.tasks;
        const oldIdx = tasks.findIndex(t => t.id === activeId);
        const newIdx = tasks.findIndex(t => t.id === overId);
        if (oldIdx === newIdx || newIdx === -1) return;
        setLocalColumns(prev => prev.map(c =>
          c.id === sourceCol.id ? { ...c, tasks: arrayMove([...c.tasks], oldIdx, newIdx) } : c
        ));
        moveTask(activeId, sourceCol.id, newIdx).catch(() => reloadBoard());
      } else {
        const task = sourceCol.tasks.find(t => t.id === activeId);
        if (!task) return;
        const overTaskIdx = targetCol.tasks.findIndex(t => t.id === overId);
        const insertIdx = overTaskIdx >= 0 ? overTaskIdx : targetCol.tasks.length;
        setLocalColumns(prev => prev.map(c => {
          if (c.id === sourceCol.id) return { ...c, tasks: c.tasks.filter(t => t.id !== activeId) };
          if (c.id === targetCol.id) {
            const newTasks = [...c.tasks];
            newTasks.splice(insertIdx, 0, { ...task, column_id: targetCol.id });
            return { ...c, tasks: newTasks };
          }
          return c;
        }));
        moveTask(activeId, targetCol.id, insertIdx).catch(() => reloadBoard());
      }
    }

    const activeTask = useMemo(
      () => activeTaskId ? localColumns.flatMap(c => c.tasks).find(t => t.id === activeTaskId) ?? null : null,
      [activeTaskId, localColumns]
    );

    const filteredColumns = useMemo(() => localColumns.map(col => {
      const filtered = col.tasks.filter(task => {
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
        if ((dateFrom || dateTo) && !task.due_date) return false;
        if (dateFrom && task.due_date && task.due_date < dateFrom) return false;
        if (dateTo && task.due_date && task.due_date > dateTo) return false;
        return true;
      });
      if (sortOrder === "asc") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortOrder === "desc") {
        filtered.sort((a, b) => b.title.localeCompare(a.title));
      }
      return { ...col, tasks: filtered };
    }), [localColumns, searchQuery, priorityFilter, dateFrom, dateTo, sortOrder]);

    const activeFilterCount =
      (searchQuery ? 1 : 0) +
      (priorityFilter !== "all" ? 1 : 0) +
      (dateFrom || dateTo ? 1 : 0);

    function clearFilters() {
      setSearchQuery("");
      setPriorityFilter("all");
      setDateFrom("");
      setDateTo("");
    }

    if (loading) {
      return (
        <div className="min-h-screen bg-[#F5F0E8]">
          <div className="bg-white border-b h-14 animate-pulse" />
          <div className="container mx-auto px-4 py-6">
            <div className="flex gap-6 overflow-x-auto pb-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-80">
                  <div className="bg-white rounded-lg shadow-sm border p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-20 bg-gray-100 rounded mb-2" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800 mb-1">Failed to load board</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      );
    }

    async function handleCreateColumn(e: React.FormEvent) {
      e.preventDefault();
      if (!newColumnTitle.trim()) return;
      await createColumn(newColumnTitle.trim());
      setNewColumnTitle("");
      setIsAddColumnOpen(false);
    }

    async function handleUpdateColumnTitle(e: React.FormEvent) {
      e.preventDefault();
      if (!editingColumn || !editColumnTitle.trim()) return;
      await updateColumnTitle(editingColumn.id, editColumnTitle.trim());
      setEditingColumn(null);
    }

    async function handleDeleteColumn() {
      if (!deletingColumn) return;
      setIsColumnDeleting(true);
      try {
        await deleteColumn(deletingColumn.id);
        setDeletingColumn(null);
      } finally {
        setIsColumnDeleting(false);
      }
    }

    async function createTask(columnId: string, taskData: TaskFormData) {
      await createRealTask(columnId, taskData);
    }

    async function handleTaskSave(data: Partial<Task>) {
      if (!editingTask) return;
      const updated = await updateTask(editingTask.id, data);
      if (updated) {
        setLocalColumns(prev => prev.map(col => ({
          ...col,
          tasks: col.tasks.map(t => t.id === updated.id ? updated : t)
        })));
      }
      setEditingTask(null);
    }

    async function handleTaskDelete(taskId: string) {
      await deleteTask(taskId);
    }

    function openToolbarAddTask() {
      setToolbarPriority("medium");
      setIsToolbarAddTaskOpen(true);
    }

    return (
        <div className="min-h-screen bg-[#F5F0E8]">
            {/* Navbar */}
            <div className="flex items-center justify-between px-3 py-3 bg-white border-b border-[#F0EBE2]">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg bg-[#F5F0E8] text-[#5A5753] flex items-center justify-center cursor-pointer flex-shrink-0"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: board?.color ?? "#ccc" }} />
                  <span className="text-[14px] font-semibold text-[#1A1816] truncate max-w-[160px]">{board?.title}</span>
                </div>
              </div>
            </div>
            {/* Toolbar — mobile (below md) */}
            <div className="md:hidden flex items-center justify-between px-3 py-2 bg-white border-b border-[#EDE9E0] w-full">
              <div className="flex items-center gap-1.5 bg-[#F5F0E8] border border-[#EDE9E0] rounded-[9px] px-3 py-1.5 flex-1 min-w-0 mr-2">
                <Search className="w-3.5 h-3.5 text-[#3A3835] flex-shrink-0" />
                <input
                  className="bg-transparent text-[12px] text-[#3A3835] w-full min-w-0 outline-none placeholder:text-[#3A3835]/50"
                  placeholder="Search tasks…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F0E8] text-[#5A5753] cursor-pointer hover:bg-[#EDE9E0]"
                  onClick={() => setIsFilterOpen(true)}
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F0E8] text-[#5A5753] cursor-pointer hover:bg-[#EDE9E0]"
                  onClick={() => setSortOrder(s => s === "none" ? "asc" : s === "asc" ? "desc" : "none")}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F0E8] text-[#5A5753] cursor-pointer hover:bg-[#EDE9E0]"
                  onClick={() => setIsAddColumnOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {plan !== "free" && (
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F0E8] text-[#5A5753] cursor-pointer hover:bg-[#EDE9E0]"
                    onClick={() => exportBoardToCsv(board?.title ?? "board", filteredColumns)}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                className="ml-1 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#5A4A8B] text-white text-[12px] font-medium flex-shrink-0 cursor-pointer hover:bg-[#4A3A7B]"
                onClick={openToolbarAddTask}
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {/* Toolbar — desktop (md and above) */}
            <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-white border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#F5F0E8] border border-[#EDE9E0] rounded-[9px] px-3 py-1.5">
                  <Search className="w-3.5 h-3.5 text-[#3A3835]" />
                  <input
                    className="bg-transparent text-[12px] text-[#3A3835] w-[200px] outline-none placeholder:text-[#3A3835]/50"
                    placeholder="Search tasks…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12px] font-medium text-[#3A3835] bg-[#F5F0E8] border border-[#EDE9E0] cursor-pointer hover:bg-[#EDE9E0]"
                  onClick={() => setIsFilterOpen(true)}
                >
                  <Filter className="w-3.5 h-3.5" /> Filter
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12px] font-medium text-[#3A3835] bg-[#F5F0E8] border border-[#EDE9E0] cursor-pointer hover:bg-[#EDE9E0]"
                  onClick={() => setSortOrder(s => s === "none" ? "asc" : s === "asc" ? "desc" : "none")}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {sortOrder === "asc" ? "A → Z" : sortOrder === "desc" ? "Z → A" : "Sort"}
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12px] font-medium text-[#3A3835] bg-[#F5F0E8] border border-[#EDE9E0] cursor-pointer hover:bg-[#EDE9E0]"
                  onClick={() => setIsAddColumnOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Column
                </button>
              </div>
              <div className="flex items-center gap-2">
                {plan !== "free" && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12px] font-medium text-[#3A3835] bg-[#F5F0E8] border border-[#EDE9E0] cursor-pointer hover:bg-[#EDE9E0]"
                    onClick={() => exportBoardToCsv(board?.title ?? "board", filteredColumns)}
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                )}
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12px] font-medium text-white bg-[#5A4A8B] cursor-pointer hover:bg-[#4A3A7B]"
                  onClick={openToolbarAddTask}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>
            </div>

        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogPortal>
            <DialogOverlay className="!bg-black/40 backdrop-blur-sm" />
            <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[300px] bg-white rounded-2xl shadow-xl border border-[#EDE9E0] p-5 outline-none">
              <DialogClose className="absolute top-4 right-4 text-[#9C9890] hover:text-[#1A1816] transition-colors">
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
              <DialogTitle className="text-[17px] font-semibold text-[#1A1816] mb-1">Filters</DialogTitle>
              <div className="mb-4">
                <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Priority</label>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "low", "medium", "high"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriorityFilter(p)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                        priorityFilter === p
                          ? "bg-[#5A4A8B] text-white border-[#5A4A8B]"
                          : "bg-[#F5F0E8] text-[#5A5753] border-[#EDE9E0] hover:bg-[#EDE9E0]"
                      }`}
                    >
                      {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Due Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2 text-[13px] text-[#1A1816] outline-none focus:border-[#C0B3E1] transition-colors"
                />
              </div>
              <div className="mb-4">
                <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Due Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2 text-[13px] text-[#1A1816] outline-none focus:border-[#C0B3E1] transition-colors"
                />
              </div>
              <div className="flex items-center justify-between mt-6">
                <button
                  type="button"
                  onClick={() => { clearFilters(); setIsFilterOpen(false); }}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors"
                >
                  Done
                </button>
              </div>
            </RadixDialog.Content>
          </DialogPortal>
        </Dialog>


        {/* Edit Column Dialog */}
        <Dialog open={!!editingColumn} onOpenChange={(open) => { if (!open) setEditingColumn(null); }}>
          <DialogPortal>
            <DialogOverlay className="!bg-black/40 backdrop-blur-sm" />
            <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-2xl shadow-xl border border-[#EDE9E0] p-6 outline-none">
              <DialogClose className="absolute top-4 right-4 text-[#9C9890] hover:text-[#1A1816] transition-colors">
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
              <DialogTitle className="text-[17px] font-semibold text-[#1A1816] mb-1">Rename Column</DialogTitle>
              <form onSubmit={handleUpdateColumnTitle}>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Column Title</label>
                  <input
                    id="editColumnTitle"
                    value={editColumnTitle}
                    onChange={(e) => setEditColumnTitle(e.target.value)}
                    placeholder="Enter column title..."
                    required
                    autoFocus
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setEditingColumn(null)} className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0]">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors">Save</button>
                </div>
              </form>
            </RadixDialog.Content>
          </DialogPortal>
        </Dialog>

        {/* Delete Column Dialog */}
        <Dialog open={!!deletingColumn} onOpenChange={(open) => { if (!open) setDeletingColumn(null); }}>
          <DialogContent className="w-[95vw] max-w-sm mx-auto text-center">
            <DialogHeader>
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
              </div>
              <DialogTitle>Delete this column?</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                All tasks inside it will also be deleted. This cannot be undone.
              </p>
            </DialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              <Button
                variant="destructive"
                className="w-full"
                disabled={isColumnDeleting}
                onClick={handleDeleteColumn}
              >
                {isColumnDeleting ? "Deleting..." : "Delete"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setDeletingColumn(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Column Dialog */}
        <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
          <DialogPortal>
            <DialogOverlay className="!bg-black/40 backdrop-blur-sm" />
            <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-2xl shadow-xl border border-[#EDE9E0] p-6 outline-none">
              <DialogClose className="absolute top-4 right-4 text-[#9C9890] hover:text-[#1A1816] transition-colors">
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
              <DialogTitle className="text-[17px] font-semibold text-[#1A1816] mb-1">Add Column</DialogTitle>
              <form onSubmit={handleCreateColumn}>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Column Title</label>
                  <input
                    id="newColumnTitle"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="e.g. Backlog"
                    required
                    autoFocus
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsAddColumnOpen(false)} className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0]">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors">Add Column</button>
                </div>
              </form>
            </RadixDialog.Content>
          </DialogPortal>
        </Dialog>

        {/* Toolbar Add Task Dialog */}
        <Dialog open={isToolbarAddTaskOpen} onOpenChange={setIsToolbarAddTaskOpen}>
          <DialogPortal>
            <DialogOverlay className="!bg-black/40 backdrop-blur-sm" />
            <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-2xl shadow-xl border border-[#EDE9E0] p-6 outline-none">
              <DialogClose className="absolute top-4 right-4 text-[#9C9890] hover:text-[#1A1816] transition-colors">
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </DialogClose>

              <DialogTitle className="text-[17px] font-semibold text-[#1A1816] mb-1">Create New Task</DialogTitle>
              <p className="text-[12.5px] text-[#9C9890] mb-5">Task will be added to the first column</p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const colId = localColumns[0]?.id;
                  if (!colId) return;
                  setIsToolbarSaving(true);
                  try {
                    const formData = new FormData(e.currentTarget);
                    await createRealTask(colId, {
                      title: formData.get("title") as string,
                      description: (formData.get("description") as string) || undefined,
                      assignee: (formData.get("assignee") as string) || undefined,
                      dueDate: (formData.get("dueDate") as string) || undefined,
                      priority: toolbarPriority,
                    });
                    setToolbarPriority("medium");
                    setIsToolbarAddTaskOpen(false);
                  } finally {
                    setIsToolbarSaving(false);
                  }
                }}
              >
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Title *</label>
                  <input
                    name="title"
                    placeholder="Enter task title"
                    required
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Description</label>
                  <textarea
                    name="description"
                    placeholder="Enter task description"
                    rows={3}
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors resize-none"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Assignee</label>
                  <input
                    name="assignee"
                    placeholder="Person responsible for the task"
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Priority</label>
                  <select
                    value={toolbarPriority}
                    onChange={(e) => setToolbarPriority(e.target.value as "low" | "medium" | "high")}
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] outline-none focus:border-[#C0B3E1] transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] outline-none focus:border-[#C0B3E1] transition-colors"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsToolbarAddTaskOpen(false)}
                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isToolbarSaving}
                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors disabled:opacity-70"
                  >
                    {isToolbarSaving ? "Saving..." : "Create Task"}
                  </button>
                </div>
              </form>
            </RadixDialog.Content>
          </DialogPortal>
        </Dialog>

        {/* Board Content */}
        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-gray-500">{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>
              {priorityFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  Priority: {priorityFilter}
                  <button onClick={() => setPriorityFilter("all")}><X className="h-3 w-3" /></button>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  Date range
                  <button onClick={() => { setDateFrom(""); setDateTo(""); }}><X className="h-3 w-3" /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-xs text-gray-500 underline hover:text-gray-700">
                Clear all
              </button>
            </div>
          )}

          {/* Board Columns */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col gap-4 px-3 py-4 md:flex-row md:overflow-x-auto md:px-6">
              {filteredColumns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  taskIds={column.tasks.map(t => t.id)}
                  onCreateTask={createTask}
                  onEditColumn={(col) => {
                    setEditingColumn(col);
                    setEditColumnTitle(col.title);
                  }}
                  onDeleteColumn={(col) => setDeletingColumn(col)}
                >
                  <div>
                    {column.tasks.length === 0 && activeFilterCount > 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No tasks found</p>
                    ) : (
                      column.tasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onEdit={setEditingTask}
                          onDelete={handleTaskDelete}
                        />
                      ))
                    )}
                  </div>
                </Column>
              ))}


            </div>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
          </main>

          <TaskEditModal
            task={editingTask}
            open={!!editingTask}
            onClose={() => setEditingTask(null)}
            onSave={handleTaskSave}
          />

          <FeatureUpgradeModal feature={lockedFeature} onClose={() => setLockedFeature(null)} />
        </div>
      );
    }
