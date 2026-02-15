'use client';

import { jsPDF } from 'jspdf';

export function generateMADRSPDF(): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;
  let y = 15;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MADRS – Depresjonsskala', pageWidth / 2, y, { align: 'center' });
  y += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Montgomery-Åsberg Depression Rating Scale – Pasientutfylling', pageWidth / 2, y, { align: 'center' });
  y += 4;
  
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Patient info
  doc.setFontSize(9);
  doc.text('Navn: _______________________', margin, y);
  doc.text('Fødselsdato: _______________', margin + 70, y);
  doc.text('Dato: _______________', margin + 140, y);
  y += 8;

  // Instructions
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 3, contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Instruksjon: ', margin + 2, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text('Sett ett kryss ved alternativet som best beskriver hvordan du har hatt det den siste uken.', margin + 22, y + 2);
  doc.text('Hvert spørsmål har 7 nivåer (0-6). Velg det tallet som passer best – også mellomverdier.', margin + 2, y + 6);
  y += 14;

  // Questions
  const questions = [
    {
      num: 1,
      title: 'Synlig tristhet',
      options: ['Ingen synlig tristhet', '', 'Ser trist og nedstemt ut', '', 'Ser konstant ulykkelig ut', '', 'Ekstrem tristhet']
    },
    {
      num: 2,
      title: 'Rapportert tristhet',
      options: ['Kun sporadisk tristhet', '', 'Trist, men kan muntre opp', '', 'Gjennomgående nedstemthet', '', 'Uutholdelig tristhet']
    },
    {
      num: 3,
      title: 'Indre spenning',
      options: ['Avslappet, rolig', '', 'Periodisk indre uro', '', 'Vedvarende indre spenning', '', 'Uutholdelig angst/panikk']
    },
    {
      num: 4,
      title: 'Redusert nattesøvn',
      options: ['Sover som vanlig', '', 'Lett vansker m/søvn', '', 'Redusert med 2+ timer', '', 'Under 2-3 timer søvn']
    },
    {
      num: 5,
      title: 'Svekket appetitt',
      options: ['Normal/økt appetitt', '', 'Noe redusert appetitt', '', 'Ingen matlyst', '', 'Må overtales til å spise']
    },
    {
      num: 6,
      title: 'Konsentrasjonsvansker',
      options: ['Ingen vansker', '', 'Vanskelig å samle tankene', '', 'Vanskelig å konsentrere seg', '', 'Kan ikke lese/samtale']
    },
    {
      num: 7,
      title: 'Initiativløshet',
      options: ['Ingen vansker å starte', '', 'Noe vansker å starte', '', 'Vansker med rutiner', '', 'Helt uten initiativ']
    },
    {
      num: 8,
      title: 'Svekkede følelser',
      options: ['Normal interesse', '', 'Redusert glede', '', 'Tap av interesse', '', 'Følelsesmessig lammelse']
    },
    {
      num: 9,
      title: 'Pessimistiske tanker',
      options: ['Ingen pessimisme', '', 'Tanker om feil/skyld', '', 'Vedvarende selvbebreidelser', '', 'Vrangforestillinger']
    },
    {
      num: 10,
      title: 'Selvmordstanker',
      options: ['Ingen tanker', '', 'Livet ikke verdt å leve', '', 'Tanker, men ingen plan', '', 'Eksplisitte planer']
    }
  ];

  const colWidth = contentWidth / 2 - 2;
  const questionHeight = 25;
  
  questions.forEach((q, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = margin + col * (colWidth + 4);
    const qY = y + row * (questionHeight + 2);
    
    // Question box
    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(250, 250, 250);
    doc.rect(x, qY, colWidth, questionHeight, 'FD');
    
    // Question number circle
    doc.setFillColor(50, 50, 50);
    doc.circle(x + 5, qY + 4, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(q.num.toString(), x + 5, qY + 5, { align: 'center' });
    
    // Question title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(q.title, x + 10, qY + 5);
    
    // Options
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    let optY = qY + 9;
    q.options.forEach((opt, i) => {
      // Checkbox
      doc.setDrawColor(0, 0, 0);
      doc.rect(x + 2, optY - 1.5, 2.5, 2.5);
      // Score
      doc.setFillColor(230, 230, 230);
      doc.rect(x + 6, optY - 1.5, 4, 2.5, 'F');
      doc.text(i.toString(), x + 8, optY + 0.5, { align: 'center' });
      // Label
      if (opt) {
        doc.text(opt, x + 12, optY + 0.5);
      }
      optY += 2.3;
    });
  });

  y += 5 * (questionHeight + 2) + 6;

  // Footer - Scoring section
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Total score box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, 30, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTALSUM', margin + 15, y + 4, { align: 'center' });
  doc.line(margin + 5, y + 14, margin + 25, y + 14);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('(maks 60)', margin + 15, y + 18, { align: 'center' });

  // Interpretation
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Tolkning av totalskår:', margin + 35, y + 3);
  
  const interpX = margin + 35;
  const interpBoxWidth = 38;
  const interpY = y + 6;
  
  // Interpretation boxes
  const interpretations = [
    { range: '0-6', label: 'Ingen/minimal', color: [212, 237, 218] as [number, number, number] },
    { range: '7-19', label: 'Lett depresjon', color: [255, 243, 205] as [number, number, number] },
    { range: '20-34', label: 'Moderat depresjon', color: [255, 224, 178] as [number, number, number] },
    { range: '35-60', label: 'Alvorlig depresjon', color: [248, 215, 218] as [number, number, number] }
  ];
  
  interpretations.forEach((interp, i) => {
    const bx = interpX + i * (interpBoxWidth + 2);
    doc.setFillColor(...interp.color);
    doc.rect(bx, interpY, interpBoxWidth, 10, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(interp.range, bx + interpBoxWidth / 2, interpY + 4, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(interp.label, bx + interpBoxWidth / 2, interpY + 8, { align: 'center' });
  });

  y += 24;

  // Signatures
  doc.setFontSize(8);
  doc.text('Pasientens signatur: ______________________', margin, y);
  doc.text('Gjennomgått av helsepersonell: ______________________', margin + 90, y);

  // Download
  doc.save('madrs-pasientskjema.pdf');
}
