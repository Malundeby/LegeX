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
  }
  // ... add all 10 questions
];

export const madrsScoring: ScoringTemplate[] = [
  { range: '0-6', label: 'Ingen/minimal', color: '#d4edda' },
  { range: '7-19', label: 'Lett depresjon', color: '#fff3cd' },
  { range: '20-34', label: 'Moderat depresjon', color: '#ffe0b2' },
  { range: '35-60', label: 'Alvorlig depresjon', color: '#f8d7da' }
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
