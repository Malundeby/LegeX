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

### 3. WidgetDashboard
**Filer:** `WidgetDashboard.tsx` + `WidgetDashboard.css`

Dashboard som håndterer begge widget-typer med drag & drop.

```tsx
import WidgetDashboard from "./WidgetDashboard";

<WidgetDashboard />
```

## LocalStorage Keys

- `legex_notes` - Alle notater
- `legex_todos` - Alle huskelister  
- `legex_widget_dashboard` - Dashboard layout

## Dokumentasjon

Se `/docs/WIDGETS_QUICKSTART.md` for quick start guide.

## Demo

Åpne `/widgets` for å se begge widgets i aksjon.
