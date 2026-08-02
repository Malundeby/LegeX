export type WidgetColor = "default" | "red" | "yellow" | "green" | "blue";

export interface BaseWidget {
  id: string;
  title: string;
  color: WidgetColor;
  pinned: boolean;
  position: number;
  createdAt: string;
}

export interface BookmarkWidget extends BaseWidget {
  type: "bookmark";
  links: Array<{ id: string; label: string; url: string }>;
}

export interface NoteWidget extends BaseWidget {
  type: "note";
  content: string;
  width: number;
  height: number;
}

export interface TodoWidget extends BaseWidget {
  type: "todo";
  items: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
}

export type DashboardWidget = BookmarkWidget | NoteWidget | TodoWidget;

interface LegacyDashboardWidget {
  id: string;
  type: "note" | "todo";
  position: number;
}

interface LegacyNote {
  id: string;
  title: string;
  content: string;
  color: WidgetColor;
  width: number;
  height: number;
  pinned: boolean;
  createdAt: string;
}

interface LegacyTodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface LegacyTodoList {
  id: string;
  title: string;
  items: LegacyTodoItem[];
  createdAt: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const MODERN_WIDGET_STORAGE_KEY = "legex_modern_widgets_v2";
export const LEGACY_WIDGET_LAYOUT_STORAGE_KEY = "legex_widget_dashboard";
export const LEGACY_NOTES_STORAGE_KEY = "legex_notes";
export const LEGACY_TODOS_STORAGE_KEY = "legex_todos";

export type WidgetLoadSource = "modern" | "legacy" | "none";

export interface WidgetLoadResult {
  source: WidgetLoadSource;
  widgets: DashboardWidget[];
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function migrateLegacyDashboardToWidgets(
  layout: LegacyDashboardWidget[],
  notes: Record<string, LegacyNote>,
  todos: Record<string, LegacyTodoList>
): DashboardWidget[] {
  return [...layout]
    .sort((left, right) => left.position - right.position)
    .map((widget): DashboardWidget | null => {
      if (widget.type === "note") {
        const note = notes[widget.id];
        if (!note) {
          return null;
        }

        return {
          id: note.id,
          type: "note",
          title: note.title,
          color: note.color,
          pinned: note.pinned,
          position: widget.position,
          createdAt: note.createdAt,
          content: note.content,
          width: note.width,
          height: note.height
        };
      }

      const todoList = todos[widget.id];
      if (!todoList) {
        return null;
      }

      return {
        id: todoList.id,
        type: "todo",
        title: todoList.title,
        color: "default",
        pinned: false,
        position: widget.position,
        createdAt: todoList.createdAt,
        items: todoList.items.map((item) => ({
          id: item.id,
          text: item.text,
          completed: item.completed
        }))
      };
    })
    .filter((widget): widget is DashboardWidget => widget !== null);
}

export function loadDashboardWidgets(storage: StorageLike): WidgetLoadResult {
  const modernWidgets = parseJson<DashboardWidget[]>(storage.getItem(MODERN_WIDGET_STORAGE_KEY));
  if (Array.isArray(modernWidgets)) {
    return { source: "modern", widgets: modernWidgets };
  }

  const legacyLayoutRaw = storage.getItem(LEGACY_WIDGET_LAYOUT_STORAGE_KEY);
  if (legacyLayoutRaw === null) {
    return { source: "none", widgets: [] };
  }

  const legacyLayout = parseJson<LegacyDashboardWidget[]>(legacyLayoutRaw);
  if (!Array.isArray(legacyLayout)) {
    return { source: "none", widgets: [] };
  }

  const notes = parseJson<Record<string, LegacyNote>>(storage.getItem(LEGACY_NOTES_STORAGE_KEY)) ?? {};
  const todos = parseJson<Record<string, LegacyTodoList>>(storage.getItem(LEGACY_TODOS_STORAGE_KEY)) ?? {};
  const migratedWidgets = migrateLegacyDashboardToWidgets(legacyLayout, notes, todos);

  storage.setItem(MODERN_WIDGET_STORAGE_KEY, JSON.stringify(migratedWidgets));

  return { source: "legacy", widgets: migratedWidgets };
}