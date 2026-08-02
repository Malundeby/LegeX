# LegeX Widgets - Quick Start Guide

## 🎯 Hva er laget?

To komplette React-widgets for LegeX-dashboard:

### 1. **NotesWidget** (Notat-widget)
- ✅ Rich text-redigering (bold, kursiv, lister)
- ✅ 5 fargevalg (standard, rød, gul, grønn, blå)
- ✅ Pin-funksjon (fest til toppen)
- ✅ Justerbar størrelse
- ✅ Fullskjerm-editor
- ✅ LocalStorage-lagring
- ✅ Drag & drop support

### 2. **TodoListWidget** (Huskeliste-widget)
- ✅ Legg til / slett oppgaver
- ✅ Marker som ferdig (checkbox + strikethrough)
- ✅ Redigering (dobbeltklikk)
- ✅ Progress bar
- ✅ Auto-sortering (ferdige nederst)
- ✅ Fjern alle ferdige oppgaver
- ✅ LocalStorage-lagring
- ✅ Drag & drop support

---

## 🚀 Kom i gang

### Trinn 1: Start serveren

```bash
npm run dev
```

### Trinn 2: Åpne widgets

Naviger til:
```
http://localhost:3001/widgets
```

### Trinn 3: Legg til widgets

Klikk på **+**-knappen i en ledig celle og velg widgettype:
- **Notat** - Legg til notat-widget
- **Huskeliste** - Legg til huskeliste-widget
- **Bokmerke** - Legg til bokmerke-widget

---

## 📝 NotesWidget - Bruk

### Grunnleggende bruk

1. **Endre tittel**: Klikk på tittelen og skriv
2. **Rediger innhold**: Klikk i innholdsområdet og skriv
3. **Velg farge**: Klikk på 🎨 og velg farge
4. **Pin til toppen**: Klikk på 📌 
5. **Fullskjerm**: Klikk på ⛶ for større editor
6. **Endre størrelse**: Dra nederst til høyre hjørne
7. **Slett**: Klikk på ✕

### Rich text formatting

I fullskjerm-editor:
- **Bold**: Klikk "B" eller Ctrl+B
- **Kursiv**: Klikk "I" eller Ctrl+I
- **Punktliste**: Klikk "•"
- **Fjern formatering**: Klikk "✕" i toolbar

### Farger og kategorisering

- 🔘 **Standard (grå)**: Generelle notater
- 🔴 **Rød**: Viktige/presserende notater
- 🟡 **Gul**: Påminnelser/varsler
- 🟢 **Grønn**: Ferdige/godkjente notater
- 🔵 **Blå**: Informasjon/referanser

---

## ✅ TodoListWidget - Bruk

### Legge til oppgaver

1. Skriv i input-feltet
2. Trykk **Enter** eller klikk **"+ Legg til"**

### Håndtere oppgaver

- **Marker ferdig**: Klikk på checkbox
- **Rediger**: Dobbeltklikk på oppgaveteksten
  - Trykk Enter for å lagre
  - Trykk Escape for å avbryte
- **Slett enkelt**: Klikk × ved siden av oppgaven
- **Fjern alle ferdige**: Klikk "✓ Fjern (X)" i header

### Progress tracking

- Grønn progress bar viser fremgang
- "X av Y ferdig" viser antall
- Ferdige oppgaver flyttes automatisk nederst

---

## 📁 Filstruktur

```
app/
├── components/
│   ├── NotesWidget.tsx          # Notat-komponent
│   ├── NotesWidget.css          # Notat-styling
│   ├── TodoListWidget.tsx       # Huskeliste-komponent
│   ├── TodoListWidget.css       # Huskeliste-styling
│   ├── ModernWidgetDashboard.tsx  # Moderne dashboard
│   └── ModernWidgetDashboard.css  # Dashboard styling
├── utils/
│   └── widgetStorage.ts         # Lasting/migrering av widget-data
├── widgets/
│   └── page.tsx                 # Widgets-side
docs/
└── WIDGETS_QUICKSTART.md        # Denne guiden
```

---

## 💾 Data-lagring

Dashboard og widgets bruker localStorage:

- `legex_notes` - Alle notater med innhold, farge og størrelse
- `legex_todos` - Alle huskelister med oppgaver
- `legex_modern_widgets_v2` - Moderne dashboard-layout og widgetinnhold

Ved første åpning migreres eldre layout (`legex_widget_dashboard`) automatisk til moderne format.

### Se lagret data

DevTools → Application → Local Storage → http://localhost:3001

### Eksporter data (backup)

```javascript
// I browser console:
const data = {
  notes: localStorage.getItem('legex_notes'),
  todos: localStorage.getItem('legex_todos'),
  dashboardModern: localStorage.getItem('legex_modern_widgets_v2'),
  dashboardLegacy: localStorage.getItem('legex_widget_dashboard')
};
console.log(JSON.stringify(data, null, 2));
// Kopier output og lagre som backup
```

### Importer data (restore)

```javascript
// I browser console:
const backupData = { /* din backup-data */ };
if (backupData.notes) localStorage.setItem('legex_notes', backupData.notes);
if (backupData.todos) localStorage.setItem('legex_todos', backupData.todos);
if (backupData.dashboardModern) localStorage.setItem('legex_modern_widgets_v2', backupData.dashboardModern);
if (backupData.dashboardLegacy) localStorage.setItem('legex_widget_dashboard', backupData.dashboardLegacy);
location.reload();
```

### Slett all data

```javascript
// I browser console:
localStorage.removeItem('legex_notes');
localStorage.removeItem('legex_todos');
localStorage.removeItem('legex_modern_widgets_v2');
localStorage.removeItem('legex_widget_dashboard');
location.reload();
```

---

## 🎨 Bruk som standalone komponenter

### NotesWidget

```tsx
import NotesWidget from "@/app/components/NotesWidget";

function MyPage() {
  return (
    <div>
      <NotesWidget 
        noteId="my_note_1"
        onDelete={(id) => console.log("Deleted:", id)}
      />
    </div>
  );
}
```

### TodoListWidget

```tsx
import TodoListWidget from "@/app/components/TodoListWidget";

function MyPage() {
  return (
    <div>
      <TodoListWidget 
        listId="my_todo_1"
        onDelete={(id) => console.log("Deleted:", id)}
      />
    </div>
  );
}
```

### Begge sammen

```tsx
import NotesWidget from "@/app/components/NotesWidget";
import TodoListWidget from "@/app/components/TodoListWidget";

function MyDashboard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
      <NotesWidget noteId="note_1" />
      <TodoListWidget listId="todo_1" />
      <NotesWidget noteId="note_2" />
    </div>
  );
}
```

---

## 🔌 Integrer i ToolHub

Legg til widgets-tab i eksisterende ToolHub:

### 1. Importer komponenter

```tsx
import WidgetDashboard from "./WidgetDashboard";
```

### 2. Legg til "widgets" tab

```tsx
type TabKey = "tools" | "chatgpt" | "guides" | "patientinfo" | "medications" | "calendar" | "widgets";

const tabs: Record<TabKey, string> = {
  // ... existing tabs
  widgets: "Widgets"
};

const tabOrder: TabKey[] = ["guides", "chatgpt", "calendar", "tools", "patientinfo", "medications", "widgets"];
```

### 3. Legg til i render

```tsx
{activeTab === "widgets" && <WidgetDashboard />}
```

---

## 📊 Data-strukturer

### NotesWidget data

```typescript
// LocalStorage nøkkel: "legex_notes"
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

### TodoListWidget data

```typescript
// LocalStorage nøkkel: "legex_todos"
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
      }
    ],
    "createdAt": "2026-02-22T09:00:00Z",
    "updatedAt": "2026-02-22T11:00:00Z"
  }
}
```

---

## 🛠️ Fremtidige utvidelser

Begge widgets er forberedt for:

**NotesWidget:**
- Tags (#diabetes, #akutt, #les)
- Søk i notater
- Eksporter til PDF
- Del notater med team
- Synkronisering med backend

**TodoListWidget:**
- Tags (#viktig, #les, #akutt)
- Deadlines med varsler
- Subtasks (nested checkboxes)
- Prioritering (høy/middels/lav)
- Filtrering og søk
- Gjentakende oppgaver
- Synkronisering med backend

---

## 🐛 Feilsøking

### Problem: "Widgets vises ikke"
**Løsning:** 
- Sjekk at CSS-filer er importert
- Åpne DevTools console for feilmeldinger
- Verifiser at du er på `/widgets`-siden

### Problem: "Drag & drop fungerer ikke"
**Løsning:**
- Widgets må ha `draggable` prop
- Sjekk at drag handlers er koblet til
- Verifiser at `e.preventDefault()` kalles

### Problem: "Data forsvinner ved refresh"
**Løsning:**
- Sjekk at localStorage er aktivert
- Se i DevTools → Application → Local Storage
- Sjekk console for JSON-parsing-feil

### Problem: "Rich text fungerer ikke"
**Løsning:**
- Bruk fullskjerm-editor (⛶) for rich text
- Sjekk at `contentEditable` er aktivt
- Verifiser at `document.execCommand` støttes

---

## ✅ Sjekkliste

- ✅ NotesWidget.tsx - Rich text notat-komponent
- ✅ NotesWidget.css - Styling for notater
- ✅ TodoListWidget.tsx - Huskeliste-komponent
- ✅ TodoListWidget.css - Styling for huskelister
- ✅ WidgetDashboard.tsx - Dashboard for begge
- ✅ WidgetDashboard.css - Dashboard styling
- ✅ /widgets/page.tsx - Demo-side
- ✅ Dokumentasjon og quick-start

**Neste steg:** Åpne http://localhost:3001/widgets og test! 🚀

- ✅ Legg til / slett oppgaver
- ✅ Marker som ferdig (checkbox + strikethrough)
- ✅ Redigering (dobbeltklikk)
- ✅ Progress bar
- ✅ Auto-sortering (ferdige nederst)
- ✅ Fjern alle ferdige oppgaver
- ✅ LocalStorage-lagring
- ✅ Drag & drop support
- ✅ Minimalistisk design

---

## 🚀 Kom i gang

### Trinn 1: Start serveren

```bash
npm run dev
```

### Trinn 2: Åpne huskelister

Naviger til:
```
http://localhost:3001/widgets
```

### Trinn 3: Legg til huskeliste

Klikk på **"+ Ny Huskeliste"** i headeren

### Trinn 4: Test funksjonalitet

1. **Legg til oppgave**: Skriv i input-feltet og trykk Enter (eller klikk "+ Legg til")
2. **Marker som ferdig**: Klikk på checkbox ved siden av oppgaven
3. **Rediger oppgave**: Dobbeltklikk på oppgaveteksten
4. **Slett oppgave**: Klikk på × til høyre for oppgaven
5. **Fjern ferdige**: Klikk "✓ Fjern (X)" i header når du har ferdige oppgaver
6. **Endre rekkefølge**: Dra huskelisten for å flytte den

---

## 📁 Filstruktur

```
app/
├── components/
│   ├── TodoListWidget.tsx       # Huskeliste-komponent
│   ├── TodoListWidget.css       # Styling
│   ├── WidgetDashboard.tsx      # Dashboard for å håndtere flere lister
│   └── WidgetDashboard.css      # Dashboard styling
├── widgets/
│   └── page.tsx                 # Huskeliste-side
```

---

## 💾 Data-lagring

Huskelister lagres i localStorage med følgende nøkler:

- `legex_todos` - Alle huskelister og oppgaver
- `legex_widget_dashboard` - Layout og rekkefølge

### Se lagret data

Åpne DevTools → Application → Local Storage → http://localhost:3001

### Eksporter data (for backup)

```javascript
// I browser console:
const data = {
  todos: localStorage.getItem('legex_todos'),
  dashboard: localStorage.getItem('legex_widget_dashboard')
};
console.log(JSON.stringify(data, null, 2));
```

### Slett all data

```javascript
// I browser console:
localStorage.removeItem('legex_todos');
localStorage.removeItem('legex_widget_dashboard');
location.reload();
```

---

## 🎨 Bruk som standalone komponent

```tsx
import TodoListWidget from "@/app/components/TodoListWidget";

function MyPage() {
  return (
    <div>
      <h1>Mine Oppgaver</h1>
      <TodoListWidget 
        listId="my_list_1"
        onDelete={(id) => console.log("Deleted:", id)}
      />
    </div>
  );
}
```

---

## 📊 Data-struktur

```typescript
// LocalStorage nøkkel: "legex_todos"
{
  "todo_123": {
    "id": "todo_123",
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
        "tags": [],
        "createdAt": "2026-02-22T09:00:00Z"
      }
    ],
    "createdAt": "2026-02-22T09:00:00Z",
    "updatedAt": "2026-02-22T11:00:00Z"
  }
}
```

---

## 🔌 Integrer i ToolHub

For å legge til huskeliste-tab i eksisterende ToolHub:

### 1. Importer komponenten

```tsx
import WidgetDashboard from "./WidgetDashboard";
```

### 2. Legg til "huskelister" tab

```tsx
type TabKey = "tools" | "chatgpt" | "guides" | "patientinfo" | "medications" | "calendar" | "huskelister";

const tabs: Record<TabKey, string> = {
  // ... existing tabs
  huskelister: "Huskelister"
};

const tabOrder: TabKey[] = ["guides", "chatgpt", "calendar", "tools", "patientinfo", "medications", "huskelister"];
```

### 3. Legg til i render

```tsx
{activeTab === "huskelister" && <WidgetDashboard />}
```

---

## ✨ Features i detalj

### Progress bar
Viser visuell fremgang:
- Grønn bar som vokser når oppgaver blir ferdig
- "X av Y ferdig" tekst

### Auto-sortering
- Uferdige oppgaver vises øverst
- Ferdige oppgaver flyttes automatisk nederst
- Gråtonet stil på ferdige oppgaver

### Redigering
- Dobbeltklikk på oppgave for å redigere
- Trykk Enter for å lagre
- Trykk Escape for å avbryte
- Slett tom tekst for å fjerne oppgaven

### Smart lagring
- Lagres automatisk ved enhver endring
- Ingen "Lagre"-knapp nødvendig
- Persistent mellom sideoppdateringer

---

## 🛠️ Fremtidige utvidelser

Forberedt i datastrukturen:

- **Tags**: #viktig, #les, #akutt
- **Deadlines**: Med visuelle indikatorer
- **Subtasks**: Nested checkboxes
- **Prioritering**: Høy/middels/lav
- **Filtrering**: Etter status eller tag
- **Gjentakende oppgaver**: Daglig/ukentlig/månedlig
- **Synkronisering**: Backend-integrasjon

---

## 🐛 Feilsøking

### Problem: "Widget vises ikke"
**Løsning:** 
- Sjekk at CSS-filen er importert
- Åpne DevTools console for feilmeldinger
- Verifiser at du er på `/widgets`-siden

### Problem: "Drag & drop fungerer ikke"
**Løsning:**
- Sjekk at `draggable` prop er true
- Verifiser at drag handlers er koblet til
- Pass på at `e.preventDefault()` kalles

### Problem: "Data forsvinner"
**Løsning:**
- Sjekk at localStorage er aktivert
- Se i DevTools → Application → Local Storage
- Sjekk console for parsing-feil

---

## ✅ Klar til bruk!

Kjør `npm run dev` og åpne http://localhost:3001/widgets for å teste! 🚀

### 1. **NotesWidget** (Notat-widget)
- ✅ Rich text-redigering (bold, kursiv, lister)
- ✅ 5 fargevalg for kategorisering
- ✅ Pin-funksjon (fest til toppen)
- ✅ Justerbar størrelse
- ✅ Fullskjerm-editor
- ✅ LocalStorage-lagring
- ✅ Drag & drop support

### 2. **TodoListWidget** (Huskeliste-widget)
- ✅ Legg til / slett oppgaver
- ✅ Marker som ferdig (checkbox + strikethrough)
- ✅ Redigering (dobbeltklikk)
- ✅ Progress bar
- ✅ Auto-sortering (ferdige nederst)
- ✅ LocalStorage-lagring
- ✅ Drag & drop support

### 3. **WidgetDashboard** (Dashboard-komponent)
- ✅ Håndterer flere widgets
- ✅ Legg til nye widgets
- ✅ Drag & drop reordering
- ✅ Persistent layout

---

## 🚀 Kom i gang

### Trinn 1: Se widgets i aksjon

Åpne utviklingsserver og naviger til:
```
http://localhost:3001/widgets
```

### Trinn 2: Legg til widgets

Klikk på knappene i headeren:
- **"+ Nytt Notat"** - Legg til notat-widget
- **"+ Ny Huskeliste"** - Legg til huskeliste-widget

### Trinn 3: Test funksjonalitet

**For NotesWidget:**
1. Klikk på tittelen og endre den
2. Klikk på innholdsområdet og skriv
3. Klikk på 🎨 for å velge farge
4. Klikk på 📌 for å pinne til toppen
5. Klikk på ⛶ for fullskjerm-editor
6. Dra nederst til høyre for å endre størrelse
7. Dra widget for å flytte den

**For TodoListWidget:**
1. Skriv tekst i input-feltet og trykk Enter
2. Klikk på checkbox for å markere som ferdig
3. Dobbeltklikk på oppgave for å redigere
4. Klikk × for å slette oppgave
5. Klikk "✓ Fjern (X)" for å fjerne alle ferdige

---

## 📁 Filstruktur

```
app/
├── components/
│   ├── NotesWidget.tsx          # Notat-widget komponent
│   ├── NotesWidget.css          # Styling for notater
│   ├── TodoListWidget.tsx       # Huskeliste-widget komponent
│   ├── TodoListWidget.css       # Styling for huskelister
│   ├── WidgetDashboard.tsx      # Dashboard-komponent
│   └── WidgetDashboard.css      # Dashboard styling
├── widgets/
│   └── page.tsx                 # Widgets-side
docs/
└── WIDGETS.md                   # Komplett dokumentasjon
```

---

## 💾 Data-lagring

Widgets bruker localStorage med følgende nøkler:

- `legex_notes` - Alle notater
- `legex_todos` - Alle huskelister
- `legex_widget_dashboard` - Dashboard layout

### Se lagret data

Åpne DevTools → Application → Local Storage → http://localhost:3001

### Eksporter data (for backup)

```javascript
// I browser console:
const data = {
  notes: localStorage.getItem('legex_notes'),
  todos: localStorage.getItem('legex_todos'),
  dashboard: localStorage.getItem('legex_widget_dashboard')
};
console.log(JSON.stringify(data, null, 2));
```

### Slett all data

```javascript
// I browser console:
localStorage.removeItem('legex_notes');
localStorage.removeItem('legex_todos');
localStorage.removeItem('legex_widget_dashboard');
location.reload();
```

---

## 🎨 Tilpass styling

Alle komponenter bruker CSS-variabler fra `globals.css`:

```css
:root {
  --primary: #0f766e;        /* Hovedfarge */
  --primary-light: #14b8a6;  /* Lysere variant */
  --primary-bg: #e7f7f4;     /* Bakgrunn */
  --text: #0f172a;           /* Tekst */
  --muted: #5b6b7a;          /* Dempet tekst */
  --border: #dde3ee;         /* Kantlinjer */
}
```

Endre i respektive CSS-filer for å tilpasse utseende.

---

## 🔌 Integrer i eksisterende system

### Alternativ 1: Legg til ny tab i ToolHub

Rediger `/app/components/ToolHub.tsx`:

```tsx
// 1. Importer komponenter
import WidgetDashboard from "./WidgetDashboard";

// 2. Legg til "widgets" i TabKey
type TabKey = "tools" | "chatgpt" | "guides" | "patientinfo" | "medications" | "calendar" | "widgets";

// 3. Legg til i tabs-objekt
const tabs: Record<TabKey, string> = {
  // ... existing tabs
  widgets: "Widgets"
};

// 4. Legg til i tabOrder
const tabOrder: TabKey[] = ["guides", "chatgpt", "calendar", "tools", "patientinfo", "medications", "widgets"];

// 5. Legg til i render (før siste </section>)
{activeTab === "widgets" && <WidgetDashboard />}
```

### Alternativ 2: Bruk som standalone widgets

```tsx
import NotesWidget from "@/app/components/NotesWidget";
import TodoListWidget from "@/app/components/TodoListWidget";

function MyCoolPage() {
  return (
    <div className="page">
      <NotesWidget noteId="my_note_1" />
      <TodoListWidget listId="my_todo_1" />
    </div>
  );
}
```

---

## 🛠️ Utvidelsesmuligheter

### Fremtidige features (allerede forberedt i datastrukturen):

**NotesWidget:**
- Tags (#diabetes, #akutt, #les)
- Søk i notater
- Eksporter til PDF
- Del notater
- Synkronisering med backend

**TodoListWidget:**
- Tags (#viktig, #les, #akutt)
- Deadlines med visuell indikator
- Subtasks / nested checkboxes
- Prioritering (høy/middels/lav)
- Filtrering etter status/tag
- Gjentakende oppgaver
- Synkronisering med backend

**Dashboard:**
- Flere widget-typer (kalender, timer, etc.)
- Favoritter/stjernemerking
- Kolonner og seksjoner
- Eksporter/importer layout
- Mal-system (templates)

---

## 🐛 Feilsøking

### Problem: "Widgets vises ikke"
**Løsning:** 
- Sjekk at CSS-filer er importert
- Åpne DevTools console og se etter feilmeldinger
- Verifiser at du er på `/widgets`-siden

### Problem: "Drag & drop fungerer ikke"
**Løsning:**
- Widgets må ha `draggable` prop
- Sjekk at drag handlers er koblet til
- Verifiser at `e.preventDefault()` kalles i `onDragOver`

### Problem: "Data forsvinner ved refresh"
**Løsning:**
- Sjekk at localStorage er aktivert i nettleseren
- Se i DevTools → Application → Local Storage
- Sjekk for JSON-parsing-feil i console

### Problem: "TypeScript-feil"
**Løsning:**
- Kjør `npm install` for å sikre alle dependencies
- Restart VS Code TypeScript server (Cmd+Shift+P → "Restart TS Server")

---

## 📚 Les mer

Se [WIDGETS.md](/docs/WIDGETS.md) for fullstendig dokumentasjon inkludert:
- Detaljert API-referanse
- localStorage datastrukturer
- Backend-integrasjonsguide
- Avanserte brukseksempler

---

## 🤝 Bidra

For å legge til nye features:

1. Opprett en branch
2. Legg til funksjonalitet
3. Test grundig
4. Oppdater dokumentasjon
5. Lag pull request

---

## ✅ Sjekkliste: Alt er klart!

- ✅ **NotesWidget.tsx** - Notat-komponent med rich text
- ✅ **NotesWidget.css** - Styling for notater
- ✅ **TodoListWidget.tsx** - Huskeliste-komponent
- ✅ **TodoListWidget.css** - Styling for huskelister
- ✅ **WidgetDashboard.tsx** - Dashboard som håndterer widgets
- ✅ **WidgetDashboard.css** - Dashboard styling
- ✅ **page.tsx** - Widgets-side (`/widgets`)
- ✅ **WIDGETS.md** - Fullstendig dokumentasjon
- ✅ **WIDGETS_QUICKSTART.md** - Denne guiden

**Neste steg:** Åpne http://localhost:3001/widgets og test! 🚀
