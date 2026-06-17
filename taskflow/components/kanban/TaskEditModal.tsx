"use client";

import { Task } from "@/lib/supabase/models";
import { Dialog, DialogPortal, DialogOverlay, DialogClose } from "@/components/ui/dialog";
import { Dialog as RadixDialog } from "radix-ui";
import { X } from "lucide-react";
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
      <DialogPortal>
        <DialogOverlay className="!bg-black/40 backdrop-blur-sm" />
        <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-2xl shadow-xl border border-[#EDE9E0] p-6 outline-none">
          <DialogClose className="absolute top-4 right-4 text-[#9C9890] hover:text-[#1A1816] transition-colors">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <h2 className="text-[17px] font-semibold text-[#1A1816] mb-5">Edit Task</h2>

          <form onSubmit={handleSubmit} key={task.id}>
            <div className="mb-4">
              <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Title *</label>
              <input
                name="title"
                defaultValue={task.title}
                required
                className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors"
              />
            </div>
            <div className="mb-4">
              <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Description</label>
              <textarea
                name="description"
                defaultValue={task.description ?? ""}
                rows={3}
                className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors resize-none"
              />
            </div>
            <div className="mb-4">
              <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Assignee</label>
              <input
                name="assignee"
                defaultValue={task.assignee ?? ""}
                className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#B0ADA6] outline-none focus:border-[#C0B3E1] transition-colors"
              />
            </div>
            <div className="mb-4">
              <label className="text-[12.5px] font-medium text-[#5A5753] mb-1.5 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
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
                defaultValue={task.due_date ?? ""}
                className="w-full bg-[#F5F0E8] border border-[#EDE9E0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1816] outline-none focus:border-[#C0B3E1] transition-colors"
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#5A5753] bg-[#F5F0E8] hover:bg-[#EDE9E0] border border-[#EDE9E0]">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-[#5A4A8B] hover:bg-[#4A3A7B] transition-colors disabled:opacity-70">
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </RadixDialog.Content>
      </DialogPortal>
    </Dialog>
  );
}
