import { describe, expect, it } from "vitest";
import {
  LEGACY_NOTES_STORAGE_KEY,
  LEGACY_TODOS_STORAGE_KEY,
  LEGACY_WIDGET_LAYOUT_STORAGE_KEY,
  MODERN_WIDGET_STORAGE_KEY,
  loadDashboardWidgets,
  migrateLegacyDashboardToWidgets,
  type StorageLike
} from "./widgetStorage";

function createStorage(initialState: Record<string, string>): StorageLike & { data: Record<string, string> } {
  const data = { ...initialState };

  return {
    data,
    getItem(key: string) {
      return key in data ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    }
  };
}

describe("widgetStorage", () => {
  it("migrates legacy widget layout into the modern dashboard shape", () => {
    const migrated = migrateLegacyDashboardToWidgets(
      [
        { id: "todo_2", type: "todo", position: 1 },
        { id: "note_1", type: "note", position: 0 }
      ],
      {
        note_1: {
          id: "note_1",
          title: "Viktig notat",
          content: "Husk dette",
          color: "yellow",
          width: 320,
          height: 280,
          pinned: true,
          createdAt: "2026-01-01T10:00:00.000Z"
        }
      },
      {
        todo_2: {
          id: "todo_2",
          title: "Oppgaver",
          createdAt: "2026-01-01T12:00:00.000Z",
          items: [
            { id: "item_1", text: "Ring pasient", completed: false },
            { id: "item_2", text: "Signer epikrise", completed: true }
          ]
        }
      }
    );

    expect(migrated).toEqual([
      {
        id: "note_1",
        type: "note",
        title: "Viktig notat",
        color: "yellow",
        pinned: true,
        position: 0,
        createdAt: "2026-01-01T10:00:00.000Z",
        content: "Husk dette",
        width: 320,
        height: 280
      },
      {
        id: "todo_2",
        type: "todo",
        title: "Oppgaver",
        color: "default",
        pinned: false,
        position: 1,
        createdAt: "2026-01-01T12:00:00.000Z",
        items: [
          { id: "item_1", text: "Ring pasient", completed: false },
          { id: "item_2", text: "Signer epikrise", completed: true }
        ]
      }
    ]);
  });

  it("loads and persists a migrated legacy dashboard when modern storage is missing", () => {
    const storage = createStorage({
      [LEGACY_WIDGET_LAYOUT_STORAGE_KEY]: JSON.stringify([{ id: "note_1", type: "note", position: 0 }]),
      [LEGACY_NOTES_STORAGE_KEY]: JSON.stringify({
        note_1: {
          id: "note_1",
          title: "Migrert notat",
          content: "Migrert innhold",
          color: "blue",
          width: 400,
          height: 300,
          pinned: false,
          createdAt: "2026-02-01T10:00:00.000Z"
        }
      }),
      [LEGACY_TODOS_STORAGE_KEY]: JSON.stringify({})
    });

    const result = loadDashboardWidgets(storage);

    expect(result.source).toBe("legacy");
    expect(result.widgets).toHaveLength(1);
    expect(JSON.parse(storage.data[MODERN_WIDGET_STORAGE_KEY])).toEqual(result.widgets);
  });

  it("prefers modern storage when it already exists", () => {
    const storage = createStorage({
      [MODERN_WIDGET_STORAGE_KEY]: JSON.stringify([
        {
          id: "widget_1",
          type: "bookmark",
          title: "Lenker",
          color: "default",
          pinned: false,
          position: 0,
          createdAt: "2026-03-01T10:00:00.000Z",
          links: []
        }
      ])
    });

    const result = loadDashboardWidgets(storage);

    expect(result.source).toBe("modern");
    expect(result.widgets).toHaveLength(1);
  });
});