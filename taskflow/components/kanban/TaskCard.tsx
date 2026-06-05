import { Task } from "@/lib/supabase/models";
import { Card, CardContent } from "@/components/ui/card";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Card className="mb-2 transition-shadow hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-1">
          <span
            className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${priorityDotColor[task.priority]}`}
          />
          <p className="font-semibold text-sm leading-snug">{task.title}</p>
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
  );
}

export function SortableTaskCard({ task }: TaskCardProps) {
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
      <TaskCard task={task} />
    </div>
  );
}
