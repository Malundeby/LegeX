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

## Innlogging (valgfri)

- Hele appen kan brukes uten innlogging.
- Med konto (/signup, e-postbekreftelse) lagres lenkesiden i Supabase-tabellen `user_dashboards` (se [sql/0005_user_dashboards.sql](sql/0005_user_dashboards.sql)), slik at den følger brukeren på alle enheter. Uten konto lagres den i nettleseren.
- /glemt-passord sender lenke via `/auth/callback?next=/nytt-passord`. Legg `<domene>/auth/callback**` inn under Redirect URLs i Supabase.

## Administrasjonspanel (/admin)

- Dra PDF-er rett inn på en fane (Verktøy, Pasientinformasjon, Oversikter). Tittel foreslås fra filnavnet, og kategori velges for alle eller per fil. Filene lastes direkte til Supabase Storage (bøtta `files`, mappe per fane) via signert opplastingslenke fra [app/api/admin/upload-url/route.ts](app/api/admin/upload-url/route.ts), så store filer går ikke gjennom Vercel.
- Rekkefølge: dra i ⠿ (også mellom kategorier), eller bruk pilene. Kategorier flyttes med pilene ved kategorinavnet. Alt lagres samlet med «Lagre rekkefølge» via [app/api/admin/content/reorder/route.ts](app/api/admin/content/reorder/route.ts).
- Forhåndsvisning: 👁 viser PDF-en (også før opplasting), og «Slik ser brukerne det» viser fanen slik den publiseres.

## Arkitekturstatus

- Rute- og registerlogikk for verktøy er sentralisert i [app/utils/toolRegistry.ts](app/utils/toolRegistry.ts)
- `/widgets` bruker nå samme moderne dashboard som hovedappen via [app/components/ModernWidgetDashboard.tsx](app/components/ModernWidgetDashboard.tsx)
- Eldre widget-layout (`legex_widget_dashboard`) migreres automatisk til moderne format (`legex_modern_widgets_v2`) via [app/utils/widgetStorage.ts](app/utils/widgetStorage.ts)

## Videre arbeid

- Legg til flere skjemaer ved å utvide JSON-filer.
- Juster layout og farger i [app/globals.css](app/globals.css).
- Se [docs/WIDGETS_QUICKSTART.md](docs/WIDGETS_QUICKSTART.md) for å bruke widget-systemet.
- Se [docs/DEBUG_SMOKE_CHECKLIST.md](docs/DEBUG_SMOKE_CHECKLIST.md) for rask regresjonssjekk etter endringer.