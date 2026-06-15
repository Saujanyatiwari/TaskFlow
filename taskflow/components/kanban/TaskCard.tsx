import { Task } from "@/lib/supabase/models";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const priorityDotColor: Record<Task["priority"], string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

function formatDueDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <Card className="mb-2 transition-shadow hover:shadow-md group/card">
        <CardContent className="p-3 relative">
          {(onEdit || onDelete) && (
            <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity flex gap-1 z-10">
              {onEdit && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                  className="h-6 w-6 flex items-center justify-center rounded bg-white shadow-sm border hover:bg-gray-50"
                >
                  <Pencil className="h-3 w-3 text-gray-500" />
                </button>
              )}
              {onDelete && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                  className="h-6 w-6 flex items-center justify-center rounded bg-white shadow-sm border hover:bg-red-50 hover:border-red-200"
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 mb-1">
            <span
              className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${priorityDotColor[task.priority]}`}
            />
            <p className="font-semibold text-sm leading-snug pr-12">{task.title}</p>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-5">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {task.assignee ?? "Unassigned"}
            </span>
            {task.due_date && (
              <span className="text-xs text-muted-foreground">
                {formatDueDate(task.due_date)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[95vw] max-w-sm mx-auto text-center">
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">This cannot be undone.</p>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => { onDelete?.(task.id); setShowDeleteConfirm(false); }}
            >
              Delete
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SortableTaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
