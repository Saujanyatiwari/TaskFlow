"use client";

import { useUser } from "@clerk/nextjs";
import { boardDataService, boardService, columnService, taskService } from "../services";
import { useEffect, useState } from "react";
import { Board, Column, Task } from "../supabase/models";
import { useSupabase } from "../supabase/SupabaseProvider";

type ColumnWithTasks = Column & { tasks: Task[] };

export function useBoards() {
  const { user } = useUser();
  const { supabase } = useSupabase();

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user || !supabase) return;
    loadBoards();
  }, [user, supabase]);

  async function loadBoards() {
    if (!user || !supabase) return;
    try {
      setLoading(true);
      setError(null);
      const data = await boardService.getBoards(supabase, user.id);
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load boards");
    } finally {
      setLoading(false);
    }
  }

  async function createBoard(boardData: { title: string; description?: string; color?: string }) {
    if (!user || !supabase) throw new Error("User not authenticated");
    try {
      const newBoard = await boardDataService.createBoardWithDefaultColumns(supabase, {
        ...boardData,
        userId: user.id,
      });
      setBoards((prev) => [newBoard, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    }
  }

  async function updateBoard(boardId: string, updates: Partial<Board>) {
    if (!supabase) throw new Error("Not authenticated");
    const updated = await boardService.updateBoard(supabase, boardId, updates);
    setBoards((prev) => prev.map((b) => (b.id === boardId ? updated : b)));
    return updated;
  }

  async function deleteBoard(boardId: string) {
    if (!supabase) throw new Error("Not authenticated");
    await boardService.deleteBoard(supabase, boardId);
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  }

  return { boards, loading, error, createBoard, updateBoard, deleteBoard };
}

export function useBoard(boardId: string) {
  const { user } = useUser();
  const { supabase } = useSupabase();

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!boardId || !supabase) return;
    loadBoard();
  }, [boardId, supabase]);

  async function loadBoard() {
    if (!boardId || !supabase) return;
    try {
      setLoading(true);
      setError(null);
      const data = await boardDataService.getBoardWithColumns(supabase, boardId, user?.id);
      setBoard(data.board);
      setColumns(data.columnsWithTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board");
    } finally {
      setLoading(false);
    }
  }

  async function updateBoard(boardId: string, updates: Partial<Board>) {
    if (!supabase) throw new Error("Supabase client not available");
    try {
      const updatedBoard = await boardService.updateBoard(supabase, boardId, updates);
      setBoard(updatedBoard);
      return updatedBoard;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update board");
      throw err;
    }
  }

  async function createRealTask(
    columnId: string,
    taskData: {
      title: string;
      description?: string;
      assignee?: string;
      dueDate?: string;
      priority?: "low" | "medium" | "high";
    }
  ) {
    try {
      const newTask = await taskService.createTask(supabase!, {
        title: taskData.title,
        description: taskData.description || null,
        assignee: taskData.assignee || null,
        due_date: taskData.dueDate || null,
        column_id: columnId,
        sort_order: columns.find((col) => col.id === columnId)?.tasks.length || 0,
        priority: taskData.priority || "medium",
      });
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col
        )
      );
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  }

  async function moveTask(taskId: string, newColumnId: string, newSortOrder: number) {
    if (!supabase) return;
    try {
      await taskService.moveTask(supabase, taskId, newColumnId, newSortOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move task");
      throw err;
    }
  }

  async function updateTask(taskId: string, data: Partial<Task>) {
    if (!supabase) return;
    return await taskService.updateTask(supabase, taskId, data);
  }

  async function deleteTask(taskId: string) {
    if (!supabase) return;
    await taskService.deleteTask(supabase, taskId);
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }))
    );
  }

  async function createColumn(title: string) {
    if (!supabase || !board) throw new Error("Board not ready");
    const newColumn = await columnService.createColumn(supabase, {
      board_id: board.id,
      title,
      sort_order: columns.length,
      user_id: board.user_id,
    });
    setColumns((prev) => [...prev, { ...newColumn, tasks: [] }]);
    return newColumn;
  }

  async function updateColumnTitle(columnId: string, title: string) {
    if (!supabase) throw new Error("Supabase not ready");
    const updated = await columnService.updateColumnTitle(supabase, columnId, title);
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, title: updated.title } : col))
    );
    return updated;
  }

  async function deleteColumn(columnId: string) {
    if (!supabase) return;
    await columnService.deleteColumn(supabase, columnId);
    setColumns((prev) => prev.filter((col) => col.id !== columnId));
  }

  return {
    board,
    columns,
    loading,
    error,
    updateBoard,
    reloadBoard: loadBoard,
    createRealTask,
    moveTask,
    updateTask,
    deleteTask,
    createColumn,
    updateColumnTitle,
    deleteColumn,
  };
}
