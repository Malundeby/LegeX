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
- PDF-ressurser med åpne / last ned / skriv ut, styrt fra /admin (Supabase)
- PWA (manifest + service worker)
- **Lenkesiden** - widget-dashboard for bokmerker, notater og huskelister ([app/components/ModernWidgetDashboard.tsx](app/components/ModernWidgetDashboard.tsx)), også på [/widgets](app/widgets/page.tsx)

- **Frasekatalog** - ferdigskrevne fraser i en kategoritre med fleksibel dybde, på fanen Fraser og på [/fraser](app/fraser/page.tsx). I Chrome, Edge, Brave og Vivaldi kan katalogen åpnes som et flytende vindu (Document Picture-in-Picture) som ligger over journalsystemet. Se [app/components/fraser](app/components/fraser).

## Frasekatalog

- Kjør [sql/0007_frasekatalog.sql](sql/0007_frasekatalog.sql) og eventuelt testinnholdet i [sql/0008_frasekatalog_testdata.sql](sql/0008_frasekatalog_testdata.sql) i Supabase SQL Editor. Testinnhold er merket (T) og slettes med spørringen øverst i filen.
- Alle kan lese og kopiere fraser uten innlogging. Innloggede brukere kan lagre favoritter og egne fraser.
- Admin (ADMIN_EMAIL) redigerer innhold og rekkefølge direkte i katalogen. Sortering er alfabetisk til admin flytter noe.
- Andre kan foreslå endringer og nye fraser. Forslag havner på /admin/fraser og varsles på e-post.
- E-post (forslag og tilbakemeldingsknappen) sendes via Resend: sett `RESEND_API_KEY` og eventuelt `EMAIL_FROM` på Vercel.

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
- Se [docs/DEBUG_SMOKE_CHECKLIST.md](docs/DEBUG_SMOKE_CHECKLIST.md) for rask regresjonssjekk etter endringer.