# Legeassistent

En enkel PWA for kliniske verktøy (MVP). Bygget med Next.js og React.

## Kom i gang

1. Installer avhengigheter:
	- `npm install`
2. Start lokalt:
	- `npm run dev`

Appen kjører på http://localhost:3001

## Funksjoner i MVP

- Skåringsverktøy definert i JSON (se [data/scoring-tools.json](data/scoring-tools.json))
- Automatisk skåring og oppsummering
- Kopier oppsummering til journal
- PDF-ressurser med åpne / last ned / skriv ut (se [data/pdf-resources.json](data/pdf-resources.json))
- PWA (manifest + service worker)
- **Widget-system** - Moderne widget-dashboard for bokmerker, notater og huskelister (se [/widgets](app/widgets/page.tsx))
  - NotesWidget: Rich text-redigering, fargevalg, pin-funksjon
  - TodoListWidget: Oppgaver med checkboxes og progress tracking

## Arkitekturstatus

- Rute- og registerlogikk for verktøy er sentralisert i [app/utils/toolRegistry.ts](app/utils/toolRegistry.ts)
- `/widgets` bruker nå samme moderne dashboard som hovedappen via [app/components/ModernWidgetDashboard.tsx](app/components/ModernWidgetDashboard.tsx)
- Eldre widget-layout (`legex_widget_dashboard`) migreres automatisk til moderne format (`legex_modern_widgets_v2`) via [app/utils/widgetStorage.ts](app/utils/widgetStorage.ts)

## Videre arbeid

- Legg til flere skjemaer ved å utvide JSON-filer.
- Juster layout og farger i [app/globals.css](app/globals.css).
- Se [docs/WIDGETS_QUICKSTART.md](docs/WIDGETS_QUICKSTART.md) for å bruke widget-systemet.
- Se [docs/DEBUG_SMOKE_CHECKLIST.md](docs/DEBUG_SMOKE_CHECKLIST.md) for rask regresjonssjekk etter endringer.