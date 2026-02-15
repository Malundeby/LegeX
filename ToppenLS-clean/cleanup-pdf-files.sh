#!/bin/bash

# Slett alle PDF-relaterte filer som ble opprettet
echo "Sletter PDF-relaterte filer..."

rm -f app/utils/pdfGenerator.ts
rm -f app/components/PDFGeneratorButton.tsx
rm -f app/utils/pdfTemplates.ts
rm -f app/utils/generateMADRSPDF.ts
rm -f docs/PDF_GENERATOR.md
rm -f scripts/generate-madrs-pdf.js
rm -f scripts/generate-madrs-pdf-jspdf.js
rm -f public/pdfs/madrs-pasient.html

echo "✅ Alle PDF-filer er slettet!"
echo "Nettsiden er nå tilbake til opprinnelig tilstand."
