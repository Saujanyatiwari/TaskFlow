import { Task } from "@/lib/supabase/models";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const priorityPill: Record<Task["priority"], { bg: string; text: string; label: string }> = {
  high:   { bg: "bg-[#FFD4D4]", text: "text-[#B94040]", label: "High" },
  medium: { bg: "bg-[#FFE8CC]", text: "text-[#9A5B00]", label: "Medium" },
  low:    { bg: "bg-[#D4EDDF]", text: "text-[#1B5E3B]", label: "Low" },
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
  const pill = priorityPill[task.priority];

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#EEEAE3] p-4 relative group hover:shadow-sm transition-shadow duration-150 mb-2">
        {/* Hover action buttons */}
        {(onEdit || onDelete) && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
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

        {/* Priority pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${pill.bg} ${pill.text}`}>
            {pill.label}
          </span>
        </div>

        {/* Title */}
        <p className="text-[14px] font-semibold text-[#1A1816] leading-snug my-2 pr-8">{task.title}</p>

        {/* Description */}
        {task.description && (
          <p className="text-[12px] text-[#9C9890] leading-snug mb-3">{task.description}</p>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center">
            {task.due_date && (
              <>
                <Calendar className="w-[13px] h-[13px] text-[#C8C4BC]" />
                <span className="text-[11.5px] text-[#B0ADA6] ml-1">{formatDueDate(task.due_date)}</span>
              </>
            )}
          </div>
          <div>
            {task.assignee && (
              <div className="w-7 h-7 rounded-full bg-[#D6D3F2] text-[#3C3489] text-[10px] font-semibold flex items-center justify-center">
                {task.assignee.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

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
