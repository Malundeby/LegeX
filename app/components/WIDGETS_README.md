# Widget Components

To komplette widgets for LegeX-dashboard.

## Komponenter

### 1. NotesWidget
**Filer:** `NotesWidget.tsx` + `NotesWidget.css`

Notat-widget med rich text-redigering og fargevalg.

```tsx
import NotesWidget from "./NotesWidget";

<NotesWidget 
  noteId="unique_id"
  onDelete={(id) => handleDelete(id)}
/>
```

### 2. TodoListWidget  
**Filer:** `TodoListWidget.tsx` + `TodoListWidget.css`

Huskeliste-widget med oppgaver og checkboxes.

```tsx
import TodoListWidget from "./TodoListWidget";

<TodoListWidget 
  listId="unique_id"
  onDelete={(id) => handleDelete(id)}
/>
```

### 3. ModernWidgetDashboard
**Filer:** `ModernWidgetDashboard.tsx` + `ModernWidgetDashboard.css`

Dashboard som håndterer bokmerker, notater og huskelister med drag & drop.

```tsx
import ModernWidgetDashboard from "./ModernWidgetDashboard";

<ModernWidgetDashboard />
```

## LocalStorage Keys

- `legex_modern_widgets_v2` - Moderne dashboardmodell
- `legex_notes` - Notater brukt av legacy-widgetformat
- `legex_todos` - Huskelister brukt av legacy-widgetformat
- `legex_widget_dashboard` - Legacy dashboard-layout (migreres)

## Dokumentasjon

Se `/docs/WIDGETS_QUICKSTART.md` for quick start guide.

## Demo

Åpne `/widgets` for å se moderne dashboard i aksjon.
