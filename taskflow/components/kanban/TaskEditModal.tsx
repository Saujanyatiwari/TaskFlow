"use client";

import { Task } from "@/lib/supabase/models";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

interface TaskEditModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Task>) => Promise<void>;
}

export function TaskEditModal({ task, open, onClose, onSave }: TaskEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task?.priority ?? "medium");

  useEffect(() => {
    if (task) setPriority(task.priority);
  }, [task?.id]);

  if (!task) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      await onSave({
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        assignee: (formData.get("assignee") as string) || null,
        due_date: (formData.get("dueDate") as string) || null,
        priority,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} key={task.id}>
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input name="title" defaultValue={task.title} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea name="description" defaultValue={task.description ?? ""} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Input name="assignee" defaultValue={task.assignee ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["low", "medium", "high"] as const).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="date" name="dueDate" defaultValue={task.due_date ?? ""} />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
