'use client';

import { generateMADRSPatientPDF } from '../utils/pdfGenerator';

interface PDFGeneratorButtonProps {
  templateType: 'madrs' | 'gad7' | 'phq9' | 'custom';
  label?: string;
  data?: any;
}

export default function PDFGeneratorButton({ 
  templateType, 
  label = '📄 Generer PDF',
  data 
}: PDFGeneratorButtonProps) {
  
  const handleGeneratePDF = () => {
    switch (templateType) {
      case 'madrs':
        generateMADRSPatientPDF();
        break;
      // Add more cases for other templates
      default:
        console.warn('Unknown template type:', templateType);
    }
  };

  return (
    <button
      onClick={handleGeneratePDF}
      style={{
        padding: '6px 12px',
        background: '#0891b2',
        color: 'white',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = '#06b6d4'}
      onMouseOut={(e) => e.currentTarget.style.background = '#0891b2'}
      type="button"
    >
      {label}
    </button>
  );
}
