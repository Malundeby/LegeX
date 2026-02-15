# ToppenLS

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

## Videre arbeid

- Legg til flere skjemaer ved å utvide JSON-filer.
- Juster layout og farger i [app/globals.css](app/globals.css).