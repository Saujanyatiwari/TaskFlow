import { Board, Column, Task } from "./supabase/models";
import { SupabaseClient } from "@supabase/supabase-js";

export const boardService = {
  async getBoard(supabase: SupabaseClient, boardId: string, userId?: string): Promise<Board> {
    let query = supabase.from("boards").select("*").eq("id", boardId);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  },

  async getBoards(supabase: SupabaseClient, userId: string): Promise<Board[]> {
    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createBoard(
    supabase: SupabaseClient,
    board: Omit<Board, "id" | "created_at" | "updated_at">
  ): Promise<Board> {
    const { data, error } = await supabase
      .from("boards")
      .insert(board)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBoard(
    supabase: SupabaseClient,
    boardId: string,
    updates: Partial<Board>
  ): Promise<Board> {
    const { data, error } = await supabase
      .from("boards")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", boardId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteBoard(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("boards").delete().eq("id", id);
    if (error) throw error;
  },
};

export const columnService = {
  async getColumns(supabase: SupabaseClient, boardId: string): Promise<Column[]> {
    const { data, error } = await supabase
      .from("columns")
      .select("*")
      .eq("board_id", boardId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createColumn(
    supabase: SupabaseClient,
    column: Omit<Column, "id" | "created_at">
  ): Promise<Column> {
    const { data, error } = await supabase
      .from("columns")
      .insert(column)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateColumnTitle(
    supabase: SupabaseClient,
    columnId: string,
    title: string
  ): Promise<Column> {
    const { data, error } = await supabase
      .from("columns")
      .update({ title })
      .eq("id", columnId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteColumn(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("columns").delete().eq("id", id);
    if (error) throw error;
  },
};

export const taskService = {
  async getTasksByBoard(supabase: SupabaseClient, boardId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, column_id, title, description, assignee, due_date, priority, sort_order, created_at, columns!inner(board_id)")
      .eq("columns.board_id", boardId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    // Strip the joined `columns` field — it's only used for filtering
    return (data || []).map(({ columns: _col, ...task }) => task as unknown as Task);
  },

  async createTask(
    supabase: SupabaseClient,
    task: Omit<Task, "id" | "created_at">
  ): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .insert(task)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async moveTask(
    supabase: SupabaseClient,
    taskId: string,
    newColumnId: string,
    newSortOrder: number
  ) {
    const { error } = await supabase
      .from("tasks")
      .update({ column_id: newColumnId, sort_order: newSortOrder })
      .eq("id", taskId);
    if (error) throw error;
  },

  async updateTask(supabase: SupabaseClient, id: string, data: Partial<Task>): Promise<Task> {
    const { data: task, error } = await supabase
      .from("tasks")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return task;
  },

  async deleteTask(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  },
};

export const boardDataService = {
  async getBoardWithColumns(supabase: SupabaseClient, boardId: string, userId?: string) {
    const [board, columns] = await Promise.all([
      boardService.getBoard(supabase, boardId, userId),
      columnService.getColumns(supabase, boardId),
    ]);

    if (!board) throw new Error("Board not found");

    const tasks = await taskService.getTasksByBoard(supabase, boardId);

    const columnsWithTasks = columns.map((column) => ({
      ...column,
      tasks: tasks.filter((task) => task.column_id === column.id),
    }));

    return { board, columnsWithTasks };
  },

  async createBoardWithDefaultColumns(
    supabase: SupabaseClient,
    boardData: { title: string; description?: string; color?: string; userId: string }
  ) {
    const board = await boardService.createBoard(supabase, {
      title: boardData.title,
      description: boardData.description || null,
      color: boardData.color || "bg-blue-500",
      user_id: boardData.userId,
    });

    const defaultColumns = [
      { title: "To Do", sort_order: 0 },
      { title: "In Progress", sort_order: 1 },
      { title: "Review", sort_order: 2 },
      { title: "Done", sort_order: 3 },
    ];

    await Promise.all(
      defaultColumns.map((column) =>
        columnService.createColumn(supabase, {
          ...column,
          board_id: board.id,
          user_id: boardData.userId,
        })
      )
    );

    return board;
  },
};
