# ToppenLS PDF Generator

Fleksibel PDF-generator for ToppenLS som kan generere profesjonelle kliniske dokumenter med konsistent branding.

## Funksjoner

### ✨ Dynamisk PDF-generering
- Genererer PDFer direkte i nettleseren (ingen server-side prosessering nødvendig)
- Fungerer offline når nettstedet er lastet ned
- Konsistent design med ToppenLS branding

### 🎨 Branded Design
- ToppenLS fargepalett og stil
- Profesjonell layout optimalisert for A4
- Responsive design som tilpasser seg innhold

### 📋 Template System
- Gjenbrukbare templates for ulike dokumenttyper
- Enkelt å legge til nye templates
- Kan hente data fra JSON-filer, APIs eller andre kilder
- MADRS-data (tittel, spørsmål, scoring) har én kilde i `pdfTemplates.ts`

## Bruk

### Grunnleggende bruk i komponenter

```tsx
import { generateMADRSPatientPDF } from '@/app/utils/pdfGenerator';

// I en komponent
<button onClick={() => generateMADRSPatientPDF()}>
  Generer MADRS PDF
</button>
```

### Bruk PDFGeneratorButton-komponenten

```tsx
import PDFGeneratorButton from '@/app/components/PDFGeneratorButton';

<PDFGeneratorButton 
  templateType="madrs" 
  label="📄 Last ned pasientskjema"
/>
```

### Lage egne templates

```tsx
import { ToppenLSPDFGenerator } from '@/app/utils/pdfGenerator';

function generateCustomPDF() {
  const generator = new ToppenLSPDFGenerator();
  
  // Legg til header
  generator.addBrandedHeader(
    'Tittel på dokument',
    'Undertittel (valgfri)'
  );
  
  // Legg til pasientinfo
  generator.addPatientInfo([
    { label: 'Navn' },
    { label: 'Dato' }
  ]);
  
  // Legg til instruksjoner
  generator.addInstructionBox('Viktig informasjon her...');
  
  // Legg til spørsmål
  generator.addQuestionGrid([
    {
      num: 1,
      title: 'Spørsmålstittel',
      options: [
        { score: 0, label: 'Alternativ 1' },
        { score: 1, label: 'Alternativ 2' }
      ]
    }
  ]);
  
  // Legg til skåringsseksjon
  generator.addScoringSection([
    { range: '0-5', label: 'Normal', color: '#d4edda' },
    { range: '6-10', label: 'Forhøyet', color: '#fff3cd' }
  ]);
  
  // Lagre PDF
  generator.save('mitt-dokument.pdf');
}
```

## Tilgjengelige metoder

### ToppenLSPDFGenerator

#### `addBrandedHeader(title: string, subtitle?: string)`
Legger til ToppenLS-branded header med tittel og valgfri undertittel.

#### `addPatientInfo(fields: { label: string; value?: string }[])`
Legger til felt for pasientinformasjon.

#### `addInstructionBox(text: string)`
Legger til en fremhevet instruksjonsboks.

#### `addQuestionGrid(questions: QuestionTemplate[])`
Legger til et 2-kolonners grid med spørsmål og svaralternativer.

#### `addScoringSection(interpretations: ScoringTemplate[])`
Legger til en skåringsseksjon med tolkning av resultater.

#### `addSignatureSection(signatures: { label: string; width?: number }[])`
Legger til signaturfelt.

#### `save(filename: string)`
Lagrer PDF-filen med gitt filnavn.

#### `getBlob(): Blob`
Returnerer PDF som Blob for forhåndsvisning eller annen bruk.

## Hente data fra eksterne kilder

```tsx
// Eksempel: Hente spørsmål fra API
async function generatePDFFromAPI() {
  const response = await fetch('/api/questions/madrs');
  const data = await response.json();
  
  const generator = new ToppenLSPDFGenerator();
  generator.addBrandedHeader(data.title, data.subtitle);
  generator.addQuestionGrid(data.questions);
  generator.addScoringSection(data.scoring);
  generator.save('generated-form.pdf');
}
```

## Fargepalett

```typescript
const COLORS = {
  primary: '#0891b2',      // Cyan - hovedfarge
  primaryDark: '#0e7490',  // Mørkere cyan
  secondary: '#06b6d4',    // Lysere cyan
  text: '#1f2937',         // Mørk grå
  textLight: '#6b7280',    // Lys grå
  background: '#f9fafb',   // Lysgrå bakgrunn
  border: '#e5e7eb',       // Border grå
  success: '#10b981',      // Grønn
  warning: '#f59e0b',      // Oransje
  error: '#ef4444'         // Rød
};
```

## Implementerte templates

- ✅ **MADRS** - Montgomery-Åsberg Depression Rating Scale
- 🔜 **GAD-7** - Generalized Anxiety Disorder Scale
- 🔜 **PHQ-9** - Patient Health Questionnaire
- 🔜 **Informasjonsark** - Pasientinformasjon
- 🔜 **Samtykkeskjema** - Informert samtykke

## Å legge til nye templates

1. Opprett template-data i `pdfTemplates.ts`
2. Legg til generator-funksjon i `pdfGenerator.ts`
3. Registrer template i `templateRegistry`
4. Oppdater `PDFGeneratorButton` for ny template-type

## Arkitekturstatus

- `generateMADRSPatientPDF()` leser nå spørsmål/skåring direkte fra `templateRegistry`.
- Dobbeltdefinisjoner i `pdfGenerator.ts` er fjernet for MADRS-flyten.
- Legacy-filen `generateMADRSPDF.ts` finnes fortsatt, men den aktive app-flyten bruker `pdfGenerator.ts`.

## Eksempel: Komplett MADRS-implementasjon

Se `generateMADRSPatientPDF()` i `pdfGenerator.ts` for et fullstendig eksempel på hvordan alle metodene brukes sammen.

## Tips

- **Responsive design**: PDF-generatoren håndterer automatisk sidebrudd
- **Offline-støtte**: Fungerer med Service Worker når siden er cachet
- **Branding**: Alle PDFer får automatisk ToppenLS branding i header og footer
- **Tilpasning**: Enkelt å tilpasse farger og stil via COLORS-objektet

## Teknisk stack

- **jsPDF** - PDF-generering i nettleseren
- **TypeScript** - Type-sikkerhet
- **React** - Komponent-integrasjon
- **Next.js** - Framework-støtte
