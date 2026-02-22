# Legeassistent

En enkel PWA for kliniske verktøy (MVP). Bygget med Next.js og React.

## Kom i gang

1. Installer avhengigheter:
	- `npm install`
2. Start lokalt:
	- `npm run dev`

Appen kjører på http://localhost:3000

## Funksjoner i MVP

- Skåringsverktøy definert i JSON (se [data/scoring-tools.json](data/scoring-tools.json))
- Automatisk skåring og oppsummering
- Kopier oppsummering til journal
- PDF-ressurser med åpne / last ned / skriv ut (se [data/pdf-resources.json](data/pdf-resources.json))
- PWA (manifest + service worker)
- **Widget-system** - Notater og huskelister med drag & drop (se [/widgets](app/widgets/page.tsx))
  - NotesWidget: Rich text-redigering, fargevalg, pin-funksjon
  - TodoListWidget: Oppgaver med checkboxes og progress tracking

## Videre arbeid

- Legg til flere skjemaer ved å utvide JSON-filer.
- Juster layout og farger i [app/globals.css](app/globals.css).
- Se [docs/WIDGETS_QUICKSTART.md](docs/WIDGETS_QUICKSTART.md) for å bruke widget-systemet.