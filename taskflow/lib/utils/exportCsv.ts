import type { ColumnWithTasks } from "@/lib/supabase/models";

function escapeCell(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportBoardToCsv(boardName: string, columns: ColumnWithTasks[]): void {
  const headers = ["Task Title", "Description", "Priority", "Assignee", "Due Date", "Column Name"];

  const rows: string[][] = [];
  for (const column of columns) {
    for (const task of column.tasks) {
      rows.push([
        task.title,
        task.description ?? "",
        task.priority,
        task.assignee ?? "",
        task.due_date ?? "",
        column.title,
      ]);
    }
  }

  const csv = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const slug = boardName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `${slug || "board"}-${today}.csv`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
