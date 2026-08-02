import { describe, expect, it } from 'vitest';
import {
  madrsScoring,
  madrsTemplate,
  templateRegistry
} from './pdfTemplates';

describe('pdfTemplates', () => {
  it('contains a complete MADRS template in the registry', () => {
    const madrs = templateRegistry.madrs;

    expect(madrs).toBeDefined();
    expect(madrs.questions).toHaveLength(10);
    expect(madrs.questions[0].title).toBe('Synlig tristhet');
    expect(madrs.questions[9].title).toBe('Selvmordstanker');
    expect(madrs.scoring).toEqual(madrsScoring);
  });

  it('keeps a consistent option scale for all MADRS questions', () => {
    madrsTemplate.forEach((question) => {
      expect(question.options).toHaveLength(7);
      expect(question.options[0].score).toBe(0);
      expect(question.options[6].score).toBe(6);
    });
  });
});