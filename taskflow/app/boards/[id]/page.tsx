"use client";

import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBoard } from "@/lib/hooks/useBoards";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Download, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ColumnWithTasks } from "@/lib/supabase/models";
import { TaskCard, SortableTaskCard } from "@/components/kanban/TaskCard";
import { useFeatureAccess } from "@/lib/hooks/useFeatureAccess";
import { FeatureName } from "@/lib/config/featureMatrix";
import { LockedButton, FeatureUpgradeModal } from "@/components/feature-gate";
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



function Column({
  column,
  children,
  taskIds,
  onCreateTask,
  onEditColumn,
}: {
  column: ColumnWithTasks;
  children: React.ReactNode;
  taskIds: string[];
  onCreateTask: (columnId: string, taskData: any) => Promise<void>;
  onEditColumn: (column: ColumnWithTasks) => void;
}) {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="w-full lg:shrink-0 lg:w-80">
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
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => onEditColumn(column)}
            >
              <MoreHorizontal />
            </Button>
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
            <DialogContent className="w-[95vw] max-w-106.25 mx-auto">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <p className="text-sm text-gray-600">Add a task to the board</p>
              </DialogHeader>

              <form
                className="space-y-4"
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
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Enter task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Input
                    id="assignee"
                    name="assignee"
                    placeholder="Who should do this?"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["low", "medium", "high"].map((priority, key) => (
                        <SelectItem key={key} value={priority}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" id="dueDate" name="dueDate" />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}


export default function BoardPage(){
    const { id } = useParams<{id:string}>();
    const { board, updateBoard, columns, loading, error, createRealTask, moveTask, reloadBoard, createColumn, updateColumnTitle } = useBoard(id);

    const [localColumns, setLocalColumns] = useState(columns);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    const [isEditingTitle , setIsEditingTitle] = useState(false);
    const [newTitle , setNewTitle] = useState("");
    const [newColor , setNewColor] = useState("");

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState("");
    const [editingColumn, setEditingColumn] = useState<ColumnWithTasks | null>(null);
    const [editColumnTitle, setEditColumnTitle] = useState("");
    const [lockedFeature, setLockedFeature] = useState<FeatureName | null>(null);

    const { isAllowed } = useFeatureAccess();

    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

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

    const filteredColumns = useMemo(() => localColumns.map(col => ({
      ...col,
      tasks: col.tasks.filter(task => {
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
        if ((dateFrom || dateTo) && !task.due_date) return false;
        if (dateFrom && task.due_date && task.due_date < dateFrom) return false;
        if (dateTo && task.due_date && task.due_date > dateTo) return false;
        return true;
      }),
    })), [localColumns, searchQuery, priorityFilter, dateFrom, dateTo]);

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
        <div className="min-h-screen bg-gray-50">
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800 mb-1">Failed to load board</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      );
    }

    async function handleUpdateBoard(e: React.FormEvent) {
    e.preventDefault();

    if (!newTitle.trim() || !board) return;

    try {
        await updateBoard(board.id, {
        title: newTitle.trim(),
        color: newColor || board.color,
        });

        setIsEditingTitle(false);
        } catch {}
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

      async function createTask(
        columnId: string,
        taskData: {
          title: string;
          description?: string;
          assignee?: string;
          dueDate?: string;
          priority: "low" | "medium" | "high";
        }
      ) {
        await createRealTask(columnId, taskData);
      }


    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar  boardTitle={board?.title}
            onEditBoard={() => {
                setNewTitle(board?.title ?? "");
                setNewColor(board?.color ?? "");
                setIsEditingTitle(true);
            }}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={activeFilterCount}
            />

           <Dialog open={isEditingTitle} onOpenChange={setIsEditingTitle}>
          <DialogContent className="w-[95vw] max-w-106.25 mx-auto">
            <DialogHeader>
              <DialogTitle>Edit Board</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleUpdateBoard}>
              <div className="space-y-2">
                <Label htmlFor="boardTitle">Board Title</Label>
                <Input
                  id="boardTitle"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter board title..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Board Color</Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {[
                    "bg-rose-400",
                    "bg-orange-400",
                    "bg-amber-400",
                    "bg-yellow-400",
                    "bg-lime-400",
                    "bg-emerald-400",
                    "bg-teal-400",
                    "bg-sky-400",
                    "bg-indigo-400",
                    "bg-purple-400",
                    "bg-fuchsia-400",
                    "bg-pink-400"
                    ].map((color, key) => (
                    <button
                      key={key}
                      type="button"
                      className={`w-8 h-8 rounded-full ${color} ${
                        color === newColor
                          ? "ring-2 ring-offset-2 ring-gray-900"
                          : ""
                      } `}
                      onClick={() => setNewColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingTitle(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Filter Tasks</DialogTitle>
              <p className="text-sm text-gray-600">Filters apply instantly across all columns</p>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Priority</Label>
                <div className="flex gap-2">
                  {(["all", "low", "medium", "high"] as const).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={priorityFilter === p ? "default" : "outline"}
                      onClick={() => setPriorityFilter(p)}
                      className="capitalize"
                    >
                      {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date Range</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-gray-400 text-sm shrink-0">to</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { clearFilters(); setIsFilterOpen(false); }}
                >
                  Clear Filters
                </Button>
                <Button type="button" onClick={() => setIsFilterOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        {/* Edit Column Dialog */}
        <Dialog open={!!editingColumn} onOpenChange={(open) => { if (!open) setEditingColumn(null); }}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Rename Column</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleUpdateColumnTitle}>
              <div className="space-y-2">
                <Label htmlFor="editColumnTitle">Column Title</Label>
                <Input
                  id="editColumnTitle"
                  value={editColumnTitle}
                  onChange={(e) => setEditColumnTitle(e.target.value)}
                  placeholder="Enter column title..."
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingColumn(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Column Dialog */}
        <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Add Column</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateColumn}>
              <div className="space-y-2">
                <Label htmlFor="newColumnTitle">Column Title</Label>
                <Input
                  id="newColumnTitle"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="e.g. Backlog"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddColumnOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Column</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Board Content */}
        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          {/* Search bar */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
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

          {/* Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total Tasks: </span>
                {localColumns.reduce((sum, col) => sum + col.tasks.length, 0)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Export button */}
              {isAllowed("export") ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportBoardToCsv(board?.title ?? "board", filteredColumns)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              ) : (
                <LockedButton
                  label="Export"
                  requiredPlan="Pro"
                  size="sm"
                  onClick={() => setLockedFeature("export")}
                />
              )}

            {/* Add task dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-106.25 mx-auto">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <p className="text-sm text-gray-600">
                    Add a task to the board
                  </p>
                </DialogHeader>

                <form className="space-y-4" onSubmit={(e) => {
                   e.preventDefault();
                   }}>
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Enter task title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter task description"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Input
                      id="assignee"
                      name="assignee"
                      placeholder="Person responsible for the task"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["low", "medium", "high"].map((priority, key) => (
                          <SelectItem key={key} value={priority}>
                            {priority.charAt(0).toUpperCase() +
                              priority.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" id="dueDate" name="dueDate" />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="submit">Create Task</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>{/* end toolbar flex */}
          </div>

          {/* Board Columns */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div
              className="flex flex-col lg:flex-row lg:space-x-6 lg:overflow-x-auto
            lg:pb-6 lg:px-2 lg:-mx-2 lg:[&::-webkit-scrollbar]:h-2
            lg:[&::-webkit-scrollbar-track]:bg-gray-100
            lg:[&::-webkit-scrollbar-thumb]:bg-gray-300 lg:[&::-webkit-scrollbar-thumb]:rounded-full
            space-y-4 lg:space-y-0"
            >
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
                >
                  <div>
                    {column.tasks.length === 0 && activeFilterCount > 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No tasks found</p>
                    ) : (
                      column.tasks.map((task) => (
                        <SortableTaskCard key={task.id} task={task} />
                      ))
                    )}
                  </div>
                </Column>
              ))}

              {/* Add Column button */}
              <div className="w-full lg:shrink-0 lg:w-80">
                <button
                  onClick={() => setIsAddColumnOpen(true)}
                  className="w-full h-12 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Column
                </button>
              </div>
            </div>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
          </main>

          <FeatureUpgradeModal feature={lockedFeature} onClose={() => setLockedFeature(null)} />
        </div>
      );
    }