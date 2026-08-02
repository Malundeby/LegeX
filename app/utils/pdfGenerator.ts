import { jsPDF } from 'jspdf';
import {
  madrsInstructionText,
  madrsPatientInfoFields,
  madrsScoring,
  madrsSignatures,
  madrsTemplate,
  templateRegistry
} from './pdfTemplates';

// Brand colors for ToppenLS
const COLORS = {
  primary: '#0891b2',      // Cyan
  primaryDark: '#0e7490',
  secondary: '#06b6d4',
  text: '#1f2937',
  textLight: '#6b7280',
  background: '#f9fafb',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
};

interface PDFConfig {
  title: string;
  subtitle?: string;
  footer?: string;
  brandName?: string;
}

interface Section {
  type: 'header' | 'text' | 'question' | 'table' | 'box' | 'signature' | 'scoring';
  content: any;
}

export class ToppenLSPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number = 210;
  private pageHeight: number = 297;
  private margin: number = 15;
  private contentWidth: number;
  private currentY: number = 20;
  
  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.contentWidth = this.pageWidth - 2 * this.margin;
  }

  // Helper: Convert hex to RGB
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  }

  // Add branded header
  addBrandedHeader(title: string, subtitle?: string) {
    const [r, g, b] = this.hexToRgb(COLORS.primary);
    
    // Header bar
    this.doc.setFillColor(r, g, b);
    this.doc.rect(0, 0, this.pageWidth, 12, 'F');
    
    // Brand name
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ToppenLS', this.margin, 7);
    
    // Main title
    this.currentY = 20;
    this.doc.setTextColor(...this.hexToRgb(COLORS.text));
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;
    
    // Subtitle
    if (subtitle) {
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...this.hexToRgb(COLORS.textLight));
      this.doc.text(subtitle, this.pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 6;
    }
    
    // Separator line
    const [lr, lg, lb] = this.hexToRgb(COLORS.border);
    this.doc.setDrawColor(lr, lg, lb);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;
  }

  // Add patient info section
  addPatientInfo(fields: { label: string; value?: string }[]) {
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.hexToRgb(COLORS.text));
    
    const fieldWidth = this.contentWidth / fields.length;
    fields.forEach((field, i) => {
      const x = this.margin + i * fieldWidth;
      this.doc.text(`${field.label}:`, x, this.currentY);
      this.doc.line(x + 25, this.currentY + 1, x + fieldWidth - 5, this.currentY + 1);
      if (field.value) {
        this.doc.text(field.value, x + 25, this.currentY);
      }
    });
    this.currentY += 8;
  }

  // Add instruction box
  addInstructionBox(text: string) {
    const [br, bg, bb] = this.hexToRgb(COLORS.background);
    const [pr, pg, pb] = this.hexToRgb(COLORS.primary);
    
    const padding = 4;
    const boxHeight = 12;
    
    this.doc.setFillColor(br, bg, bb);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, boxHeight, 2, 2, 'F');
    
    this.doc.setFontSize(8.5);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(pr, pg, pb);
    this.doc.text('Instruksjon:', this.margin + padding, this.currentY + padding + 2);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.hexToRgb(COLORS.text));
    
    const lines = this.doc.splitTextToSize(text, this.contentWidth - 40);
    this.doc.text(lines, this.margin + 30, this.currentY + padding + 2);
    
    this.currentY += boxHeight + 6;
  }

  // Add question grid (2 columns)
  addQuestionGrid(questions: {
    num: number;
    title: string;
    options: { score: number; label: string }[];
  }[]) {
    const colWidth = (this.contentWidth - 4) / 2;
    const questionHeight = 28;
    const [bgr, bgg, bgb] = this.hexToRgb(COLORS.background);
    const [br, bg, bb] = this.hexToRgb(COLORS.border);
    const [pr, pg, pb] = this.hexToRgb(COLORS.primary);
    
    questions.forEach((q, idx) => {
      // Check if we need a new page
      if (this.currentY + questionHeight > this.pageHeight - this.margin) {
        this.doc.addPage();
        this.currentY = this.margin;
      }
      
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = this.margin + col * (colWidth + 4);
      const qY = this.currentY + (idx % 2 === 0 ? 0 : row > 0 ? 0 : 0);
      
      if (col === 0 && idx > 0 && idx % 2 === 0) {
        this.currentY += questionHeight + 3;
      }
      
      // Question box
      this.doc.setDrawColor(br, bg, bb);
      this.doc.setFillColor(bgr, bgg, bgb);
      this.doc.roundedRect(x, qY, colWidth, questionHeight, 2, 2, 'FD');
      
      // Question number circle
      this.doc.setFillColor(pr, pg, pb);
      this.doc.circle(x + 5, qY + 4.5, 3.5, 'F');
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(q.num.toString(), x + 5, qY + 5.5, { align: 'center' });
      
      // Question title
      this.doc.setTextColor(...this.hexToRgb(COLORS.text));
      this.doc.setFontSize(9);
      const titleLines = this.doc.splitTextToSize(q.title, colWidth - 20);
      this.doc.text(titleLines, x + 11, qY + 5.5);
      
      // Options
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      let optY = qY + 11;
      q.options.forEach((opt) => {
        // Checkbox
        this.doc.setDrawColor(0, 0, 0);
        this.doc.setLineWidth(0.3);
        this.doc.rect(x + 3, optY - 1.5, 2.5, 2.5);
        
        // Score badge
        this.doc.setFillColor(230, 230, 230);
        this.doc.roundedRect(x + 7, optY - 1.5, 5, 2.5, 0.5, 0.5, 'F');
        this.doc.setTextColor(0, 0, 0);
        this.doc.text(opt.score.toString(), x + 9.5, optY + 0.5, { align: 'center' });
        
        // Label
        if (opt.label) {
          this.doc.setTextColor(...this.hexToRgb(COLORS.textLight));
          const labelLines = this.doc.splitTextToSize(opt.label, colWidth - 18);
          this.doc.text(labelLines, x + 14, optY + 0.5);
        }
        optY += 2.5;
      });
    });
    
    this.currentY += Math.ceil(questions.length / 2) * (questionHeight + 3) + 6;
  }

  // Add scoring section
  addScoringSection(interpretations: {
    range: string;
    label: string;
    color: string;
  }[]) {
    const [br, bg, bb] = this.hexToRgb(COLORS.border);
    
    // Separator line
    this.doc.setDrawColor(br, bg, bb);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 6;
    
    // Total score box
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.5);
    this.doc.rect(this.margin, this.currentY, 35, 22);
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.hexToRgb(COLORS.text));
    this.doc.text('TOTALSUM', this.margin + 17.5, this.currentY + 5, { align: 'center' });
    this.doc.line(this.margin + 8, this.currentY + 15, this.margin + 27, this.currentY + 15);
    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'normal');
    const maxScore = interpretations[interpretations.length - 1].range.split('-')[1] || '60';
    this.doc.text(`(maks ${maxScore})`, this.margin + 17.5, this.currentY + 19, { align: 'center' });
    
    // Interpretation boxes
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Tolkning av totalskår:', this.margin + 40, this.currentY + 4);
    
    const interpX = this.margin + 40;
    const interpBoxWidth = (this.contentWidth - 45) / interpretations.length;
    const interpY = this.currentY + 7;
    
    interpretations.forEach((interp, i) => {
      const bx = interpX + i * interpBoxWidth;
      const [ir, ig, ib] = this.hexToRgb(interp.color);
      
      this.doc.setFillColor(ir, ig, ib);
      this.doc.roundedRect(bx, interpY, interpBoxWidth - 2, 12, 1, 1, 'F');
      
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...this.hexToRgb(COLORS.text));
      this.doc.text(interp.range, bx + (interpBoxWidth - 2) / 2, interpY + 5, { align: 'center' });
      
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'normal');
      const labelLines = this.doc.splitTextToSize(interp.label, interpBoxWidth - 4);
      this.doc.text(labelLines, bx + (interpBoxWidth - 2) / 2, interpY + 9, { align: 'center' });
    });
    
    this.currentY += 28;
  }

  // Add signature section
  addSignatureSection(signatures: { label: string; width?: number }[]) {
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.hexToRgb(COLORS.text));
    
    const sigWidth = this.contentWidth / signatures.length;
    signatures.forEach((sig, i) => {
      const x = this.margin + i * sigWidth;
      this.doc.text(sig.label, x, this.currentY);
      this.doc.line(x + 2, this.currentY + 6, x + (sig.width || sigWidth - 10), this.currentY + 6);
    });
    
    this.currentY += 12;
  }

  // Add footer
  addFooter(text?: string) {
    const [pr, pg, pb] = this.hexToRgb(COLORS.primary);
    const [tr, tg, tb] = this.hexToRgb(COLORS.textLight);
    
    const footerY = this.pageHeight - 10;
    
    if (text) {
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(tr, tg, tb);
      this.doc.text(text, this.pageWidth / 2, footerY, { align: 'center' });
    }
    
    // Page number
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(pr, pg, pb);
    this.doc.text(
      `Side ${this.doc.getCurrentPageInfo().pageNumber}`,
      this.pageWidth - this.margin,
      footerY,
      { align: 'right' }
    );
    
    // ToppenLS branding
    this.doc.text('ToppenLS', this.margin, footerY);
  }

  // Save PDF
  save(filename: string) {
    this.addFooter('Generert av ToppenLS - Kliniske verktøy for helsepersonell');
    this.doc.save(filename);
  }

  // Get blob for preview
  getBlob(): Blob {
    this.addFooter('Generert av ToppenLS - Kliniske verktøy for helsepersonell');
    return this.doc.output('blob');
  }
}

// Generate MADRS patient form
export function generateMADRSPatientPDF() {
  const madrsRegistryEntry = templateRegistry.madrs;

  const generator = new ToppenLSPDFGenerator();
  
  generator.addBrandedHeader(
    madrsRegistryEntry.title,
    madrsRegistryEntry.subtitle
  );
  
  generator.addPatientInfo(madrsPatientInfoFields);
  
  generator.addInstructionBox(madrsInstructionText);
  generator.addQuestionGrid(madrsTemplate);
  generator.addScoringSection(madrsScoring);
  generator.addSignatureSection(madrsSignatures);
  
  generator.save('madrs-pasientskjema.pdf');
}

// Fetch and generate PDF from external source
export async function generatePDFFromSource(sourceUrl: string, template: string) {
  try {
    const response = await fetch(sourceUrl);
    await response.json();

    const resolvedTemplate = templateRegistry[template];
    if (!resolvedTemplate) {
      console.error(`Unknown PDF template: ${template}`);
      return;
    }
    
    if (template === 'madrs') {
      generateMADRSPatientPDF();
      return;
    }

    const generator = new ToppenLSPDFGenerator();
    generator.addBrandedHeader(resolvedTemplate.title, resolvedTemplate.subtitle);
    generator.addPatientInfo(madrsPatientInfoFields);
    generator.addInstructionBox(madrsInstructionText);
    generator.addQuestionGrid(resolvedTemplate.questions);
    generator.addScoringSection(resolvedTemplate.scoring);
    generator.addSignatureSection(madrsSignatures);
    generator.save(`${template}-pasientskjema.pdf`);
    
  } catch (error) {
    console.error('Error generating PDF from source:', error);
  }
}
