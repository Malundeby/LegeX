/**
 * PDF Template Definitions
 * Define templates for different types of documents
 */

export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  dataSource?: string; // URL or path to data source
  generator: (data?: any) => void;
}

export interface QuestionTemplate {
  num: number;
  title: string;
  options: { score: number; label: string }[];
}

export interface ScoringTemplate {
  range: string;
  label: string;
  color: string;
}

export interface PatientInfoFieldTemplate {
  label: string;
  value?: string;
}

export interface SignatureTemplate {
  label: string;
  width?: number;
}

// MADRS Template Data
export const madrsTemplate: QuestionTemplate[] = [
  {
    num: 1,
    title: 'Synlig tristhet',
    options: [
      { score: 0, label: 'Ingen synlig tristhet' },
      { score: 1, label: '' },
      { score: 2, label: 'Ser trist og nedstemt ut' },
      { score: 3, label: '' },
      { score: 4, label: 'Ser konstant ulykkelig ut' },
      { score: 5, label: '' },
      { score: 6, label: 'Ekstrem tristhet' }
    ]
  },
  {
    num: 2,
    title: 'Rapportert tristhet',
    options: [
      { score: 0, label: 'Kun sporadisk tristhet' },
      { score: 1, label: '' },
      { score: 2, label: 'Trist, men kan muntre opp' },
      { score: 3, label: '' },
      { score: 4, label: 'Gjennomgående nedstemthet' },
      { score: 5, label: '' },
      { score: 6, label: 'Uutholdelig tristhet' }
    ]
  },
  {
    num: 3,
    title: 'Indre spenning',
    options: [
      { score: 0, label: 'Avslappet, rolig' },
      { score: 1, label: '' },
      { score: 2, label: 'Periodisk indre uro' },
      { score: 3, label: '' },
      { score: 4, label: 'Vedvarende indre spenning' },
      { score: 5, label: '' },
      { score: 6, label: 'Uutholdelig angst/panikk' }
    ]
  },
  {
    num: 4,
    title: 'Redusert nattesøvn',
    options: [
      { score: 0, label: 'Sover som vanlig' },
      { score: 1, label: '' },
      { score: 2, label: 'Lett vansker m/søvn' },
      { score: 3, label: '' },
      { score: 4, label: 'Redusert med 2+ timer' },
      { score: 5, label: '' },
      { score: 6, label: 'Under 2-3 timer søvn' }
    ]
  },
  {
    num: 5,
    title: 'Svekket appetitt',
    options: [
      { score: 0, label: 'Normal/økt appetitt' },
      { score: 1, label: '' },
      { score: 2, label: 'Noe redusert appetitt' },
      { score: 3, label: '' },
      { score: 4, label: 'Ingen matlyst' },
      { score: 5, label: '' },
      { score: 6, label: 'Må overtales til å spise' }
    ]
  },
  {
    num: 6,
    title: 'Konsentrasjonsvansker',
    options: [
      { score: 0, label: 'Ingen vansker' },
      { score: 1, label: '' },
      { score: 2, label: 'Vanskelig å samle tankene' },
      { score: 3, label: '' },
      { score: 4, label: 'Vanskelig å konsentrere seg' },
      { score: 5, label: '' },
      { score: 6, label: 'Kan ikke lese/samtale' }
    ]
  },
  {
    num: 7,
    title: 'Initiativløshet',
    options: [
      { score: 0, label: 'Ingen vansker å starte' },
      { score: 1, label: '' },
      { score: 2, label: 'Noe vansker å starte' },
      { score: 3, label: '' },
      { score: 4, label: 'Vansker med rutiner' },
      { score: 5, label: '' },
      { score: 6, label: 'Helt uten initiativ' }
    ]
  },
  {
    num: 8,
    title: 'Svekkede følelser',
    options: [
      { score: 0, label: 'Normal interesse' },
      { score: 1, label: '' },
      { score: 2, label: 'Redusert glede' },
      { score: 3, label: '' },
      { score: 4, label: 'Tap av interesse' },
      { score: 5, label: '' },
      { score: 6, label: 'Følelsesmessig lammelse' }
    ]
  },
  {
    num: 9,
    title: 'Pessimistiske tanker',
    options: [
      { score: 0, label: 'Ingen pessimisme' },
      { score: 1, label: '' },
      { score: 2, label: 'Tanker om feil/skyld' },
      { score: 3, label: '' },
      { score: 4, label: 'Vedvarende selvbebreidelser' },
      { score: 5, label: '' },
      { score: 6, label: 'Vrangforestillinger' }
    ]
  },
  {
    num: 10,
    title: 'Selvmordstanker',
    options: [
      { score: 0, label: 'Ingen tanker' },
      { score: 1, label: '' },
      { score: 2, label: 'Livet ikke verdt å leve' },
      { score: 3, label: '' },
      { score: 4, label: 'Tanker, men ingen plan' },
      { score: 5, label: '' },
      { score: 6, label: 'Eksplisitte planer' }
    ]
  }
];

export const madrsScoring: ScoringTemplate[] = [
  { range: '0-6', label: 'Ingen/minimal', color: '#d4edda' },
  { range: '7-19', label: 'Lett depresjon', color: '#fff3cd' },
  { range: '20-34', label: 'Moderat depresjon', color: '#ffe0b2' },
  { range: '35-60', label: 'Alvorlig depresjon', color: '#f8d7da' }
];

export const madrsPatientInfoFields: PatientInfoFieldTemplate[] = [
  { label: 'Navn' },
  { label: 'Fødselsdato' },
  { label: 'Dato' }
];

export const madrsInstructionText =
  'Sett ett kryss ved det alternativet som best beskriver hvordan du har hatt det den siste uken. Hvert spørsmål har 7 nivåer (0-6). Velg det tallet som passer best – også mellomverdier.';

export const madrsSignatures: SignatureTemplate[] = [
  { label: 'Pasientens signatur:', width: 70 },
  { label: 'Gjennomgått av helsepersonell:', width: 80 }
];

// Template registry for easy access
export const templateRegistry: Record<string, {
  questions: QuestionTemplate[];
  scoring: ScoringTemplate[];
  title: string;
  subtitle: string;
}> = {
  madrs: {
    title: 'MADRS – Depresjonsskala',
    subtitle: 'Montgomery-Åsberg Depression Rating Scale – Pasientutfylling',
    questions: madrsTemplate,
    scoring: madrsScoring
  }
  // Add more templates: gad7, phq9, etc.
};
