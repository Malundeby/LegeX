# Widget System - Dokumentasjon

## Oversikt

Dette er et komplett widget-system for LegeX-dashboard med moderne dashboard og to hovedkomponenter:

1. **NotesWidget** - Notater med rich text-redigering
2. **TodoListWidget** - Huskeliste/oppgaveliste

Begge widgets støtter:
- ✅ Drag & drop
- ✅ LocalStorage persistence
- ✅ Redigerbar tittel
- ✅ Slett-funksjonalitet
- ✅ Responsiv design
- ✅ Kompatibel med moderne dashboard-layout

Dashboardet i produksjon er [app/components/ModernWidgetDashboard.tsx](app/components/ModernWidgetDashboard.tsx), og vises både i ToolHub og på [app/widgets/page.tsx](app/widgets/page.tsx).

---

## NotesWidget

### Funksjoner

- **Rich text-redigering**: Bold, kursiv, punktlister
- **Fargevalg**: 5 farger (standard, rød, gul, grønn, blå)
- **Pin-funksjon**: Fest notater til toppen
- **Fullskjerm-editor**: Stor editor for lengre notater
- **Justerbar størrelse**: Dra nederst til høyre for å endre størrelse
- **LocalStorage**: Automatisk lagring av alt innhold

### Bruk

```tsx
import NotesWidget from "@/app/components/NotesWidget";

<NotesWidget
  noteId="unique_note_id"
  onDelete={(id) => console.log("Deleted:", id)}
  isDragging={false}
  onDragStart={(e) => handleDragStart(e)}
  onDragEnd={(e) => handleDragEnd(e)}
/>
```

### Props

| Prop | Type | Beskrivelse |
|------|------|-------------|
| `noteId` | `string` | Unik ID for notatet (brukes som localStorage-nøkkel) |
| `onDelete` | `(id: string) => void` | Callback når notat slettes |
| `isDragging` | `boolean` | Om notatet dras akkurat nå |
| `onDragStart` | `(e: DragEvent) => void` | Drag start handler |
| `onDragEnd` | `(e: DragEvent) => void` | Drag end handler |

### LocalStorage Structure

```typescript
// Key: "legex_notes"
{
  "note_123": {
    "id": "note_123",
    "title": "Viktige notater",
    "content": "Lorem ipsum...",
    "color": "yellow",
    "width": 320,
    "height": 280,
    "pinned": false,
    "position": "normal",
    "tags": [],
    "createdAt": "2026-02-22T10:00:00Z",
    "updatedAt": "2026-02-22T11:30:00Z"
  }
}
```

### Farger

- **default**: Grå bakgrunn (#f5f5f5)
- **red**: Rød (#ffe5e5) - For viktige notater
- **yellow**: Gul (#fffacd) - For påminnelser
- **green**: Grønn (#e5f5e5) - For fullførte oppgaver
- **blue**: Blå (#e5f0ff) - For informasjon

### Planlagte utvidelser

- Tags (#diabetes, #akutt)
- Søk i notater
- Eksporter til PDF
- Del notater

---

## TodoListWidget

### Funksjoner

- **Legg til oppgaver**: Enkel input-felt
- **Marker som ferdig**: Checkbox med strikethrough
- **Slett oppgaver**: Individuelt eller alle ferdige
- **Redigering**: Dobbeltklikk for å redigere tekst
- **Progress bar**: Visuell fremgang
- **Auto-sortering**: Ferdige oppgaver flyttes nederst
- **LocalStorage**: Automatisk lagring

### Bruk

```tsx
import TodoListWidget from "@/app/components/TodoListWidget";

<TodoListWidget
  listId="unique_list_id"
  onDelete={(id) => console.log("Deleted:", id)}
  isDragging={false}
  onDragStart={(e) => handleDragStart(e)}
  onDragEnd={(e) => handleDragEnd(e)}
/>
```

### Props

| Prop | Type | Beskrivelse |
|------|------|-------------|
| `listId` | `string` | Unik ID for listen |
| `onDelete` | `(id: string) => void` | Callback når liste slettes |
| `isDragging` | `boolean` | Om listen dras akkurat nå |
| `onDragStart` | `(e: DragEvent) => void` | Drag start handler |
| `onDragEnd` | `(e: DragEvent) => void` | Drag end handler |

### LocalStorage Structure

```typescript
// Key: "legex_todos"
{
  "todo_456": {
    "id": "todo_456",
    "title": "Huskeliste",
    "items": [
      {
        "id": "item_1",
        "text": "Sjekk labsvar",
        "completed": false,
        "tags": [],
        "createdAt": "2026-02-22T10:00:00Z"
      },
      {
        "id": "item_2",
        "text": "Ring pasient",
        "completed": true,
        "tags": ["#viktig"],
        "deadline": "2026-02-23",
        "createdAt": "2026-02-22T09:00:00Z"
      }
    ],
    "createdAt": "2026-02-22T09:00:00Z",
    "updatedAt": "2026-02-22T11:00:00Z"
  }
}
```

### Interaksjon

- **Legg til**: Skriv tekst og klikk "+ Legg til" eller trykk Enter
- **Marker ferdig**: Klikk på checkbox
- **Rediger**: Dobbeltklikk på oppgavetekst
- **Slett**: Klikk på × ved siden av oppgaven
- **Fjern ferdige**: Klikk "✓ Fjern (X)" i header

### Planlagte utvidelser

- Tags (#viktig, #les, #akutt)
- Deadlines med visuelle indikatorer
- Subtasks / checkboxes
- Prioritering
- Filtrering

---

## ModernWidgetDashboard

Dashboard som håndterer bokmerker, notater og huskelister med grid/flytende layout, kontekstmeny og localStorage-persistens.

### Bruk

```tsx
import ModernWidgetDashboard from "@/app/components/ModernWidgetDashboard";

export default function DashboardPage() {
  return <ModernWidgetDashboard />;
}
```

### Features

- Legg til nye widgets (bokmerker, notater eller huskelister)
- Drag & drop for å endre plassering
- Kontekstmeny for navn, farge, pin og slett
- Persistent layout i localStorage

### LocalStorage nøkler

- `legex_modern_widgets_v2` - Moderne dashboardmodellen
- `legex_notes` - Legacy note-innhold brukt av eldre komponenter
- `legex_todos` - Legacy todo-innhold brukt av eldre komponenter
- `legex_widget_dashboard` - Legacy layout (migreres automatisk)

---

## Integrasjon med eksisterende ToolHub

For å integrere widgets i eksisterende ToolHub.tsx:

### 1. Legg til ny tab

```tsx
type TabKey = "tools" | "chatgpt" | "guides" | "patientinfo" | "medications" | "calendar" | "widgets";

const tabs: Record<TabKey, string> = { 
  // ... existing tabs
  widgets: "Mine Widgets" 
};
```

### 2. Importer komponenter

```tsx
import NotesWidget from "./NotesWidget";
import TodoListWidget from "./TodoListWidget";
```

### 3. Legg til state for widgets

```tsx
const [widgets, setWidgets] = useState<Array<{id: string; type: 'note' | 'todo'}>>([]);
```

### 4. Legg til widget-tab i render

```tsx
{activeTab === "widgets" && (
  <div className="widget-container">
    <div className="widget-actions">
      <button onClick={() => addWidget('note')}>+ Nytt Notat</button>
      <button onClick={() => addWidget('todo')}>+ Ny Huskeliste</button>
    </div>
    
    <div className="widget-grid">
      {widgets.map(widget => 
        widget.type === 'note' ? (
          <NotesWidget key={widget.id} noteId={widget.id} />
        ) : (
          <TodoListWidget key={widget.id} listId={widget.id} />
        )
      )}
    </div>
  </div>
)}
```

---

## Styling & Tilpasning

Alle komponenter bruker CSS-variabler fra `globals.css`:

- `--primary`: Hovedfarge (teal)
- `--primary-light`: Lysere variant
- `--primary-bg`: Bakgrunnsfarge
- `--text`: Tekstfarge
- `--muted`: Dempet tekstfarge
- `--border`: Kantlinje-farge
- `--bg`: Bakgrunnsfarge

For å tilpasse farger, endre CSS-filene:
- `NotesWidget.css`
- `TodoListWidget.css`
- `WidgetDashboard.css`

---

## LocalStorage Management

### Eksporter data

```typescript
const exportWidgets = () => {
  const notes = localStorage.getItem('legex_notes');
  const todos = localStorage.getItem('legex_todos');
  const dashboard = localStorage.getItem('legex_widget_dashboard');
  
  return {
    notes: JSON.parse(notes || '{}'),
    todos: JSON.parse(todos || '{}'),
    dashboard: JSON.parse(dashboard || '[]')
  };
};
```

### Importer data

```typescript
const importWidgets = (data: any) => {
  if (data.notes) localStorage.setItem('legex_notes', JSON.stringify(data.notes));
  if (data.todos) localStorage.setItem('legex_todos', JSON.stringify(data.todos));
  if (data.dashboard) localStorage.setItem('legex_widget_dashboard', JSON.stringify(data.dashboard));
  
  window.location.reload();
};
```

### Slett all data

```typescript
const clearAllWidgets = () => {
  if (confirm('Slett alle widgets og data?')) {
    localStorage.removeItem('legex_notes');
    localStorage.removeItem('legex_todos');
    localStorage.removeItem('legex_widget_dashboard');
    window.location.reload();
  }
};
```

---

## Backend-integrasjon (fremtidig)

Når backend er klar, erstatt localStorage-kall med API-kall:

```typescript
// Før (localStorage):
const saveNote = (note: Note) => {
  const notes = JSON.parse(localStorage.getItem('legex_notes') || '{}');
  notes[note.id] = note;
  localStorage.setItem('legex_notes', JSON.stringify(notes));
};

// Etter (API):
const saveNote = async (note: Note) => {
  const response = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
  });
  return response.json();
};
```

---

## Testing

For å teste widgets:

1. **Start dev server**: `npm run dev`
2. **Åpne dashboard**: http://localhost:3001
3. **Test NotesWidget**:
   - Legg til notat
   - Endre farge
   - Skriv innhold
   - Pin notat
   - Endre størrelse
   - Slett notat
4. **Test TodoListWidget**:
   - Legg til oppgaver
   - Marker som ferdig
   - Rediger oppgaver
   - Slett oppgaver
   - Fjern ferdige
5. **Test drag & drop**:
   - Dra widgets for å endre rekkefølge

---

## Feilsøking

### Widgets vises ikke
- Sjekk at CSS-filer er importert
- Sjekk console for feilmeldinger
- Verifiser at localStorage er aktivert

### Drag & drop fungerer ikke
- Sjekk at `draggable` prop er satt
- Verifiser drag handlers er koblet til
- Sjekk at `e.preventDefault()` kalles i `onDragOver`

### Data lagres ikke
- Sjekk localStorage i DevTools (Application → Local Storage)
- Verifiser at nøkkel-navn matcher konstanter
- Sjekk for JSON-parsing-feil i console

---

## Lisens

Samme lisens som resten av LegeX-prosjektet.
