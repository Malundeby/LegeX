'use client';

import { useState } from 'react';

const promptCategories = [
  {
    id: 'medisinske-vurderinger',
    label: '1️⃣ Medisinske vurderinger',
    templates: [
      {
        id: 'e-konsultasjon-assistent',
        label: 'E-konsultasjon assistent',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      },
      {
        id: '2-cd-notat',
        label: '2 cd-notat',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      },
      {
        id: '615-notat',
        label: '615-notat',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      },
      {
        id: 'funksjonsvurdering',
        label: 'Funksjonsvurdering',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      },
      {
        id: 'lmg-assistent',
        label: 'LMG-assistent',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      },
      {
        id: 'oppsummering-pasientcase-med-rad',
        label: 'Oppsummering pasientcase med råd',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      }
    ]
  },
  {
    id: 'pasientkommunikasjon',
    label: '2️⃣ Pasientkommunikasjon',
    templates: [
      {
        id: 'melding-til-pasient',
        label: 'Melding til pasient',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      },
      {
        id: 'radiologisvar-til-pasient',
        label: 'Radiologisvar til pasient',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      }
    ]
  },
  {
    id: 'ekstern-kommunikasjon',
    label: '3️⃣ Ekstern kommunikasjon / formelle dokumenter',
    templates: [
      {
        id: 'henvisning-til-rehabilitering',
        label: 'Henvisning til rehabilitering',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      },
      {
        id: 'generisk-henvisning',
        label: 'Generisk henvisning',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      },
      {
        id: 'svar-forsikringsselskap',
        label: 'Svar forsikringsselskap',
        text: '',
        guidance: 'Fremgangsmåte kommer her.'
      }
    ]
  }
];

export default function ChatGPTPrompt() {
  const [userInput, setUserInput] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState(promptCategories[0].templates[0].id);
  const [systemPrompt, setSystemPrompt] = useState(promptCategories[0].templates[0].text);
  const [copyState, setCopyState] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  const handleRun = async () => {
    if (!userInput.trim()) {
      setCopyState('⚠️ Skriv inn tekst først');
      setTimeout(() => setCopyState(''), 2000);
      return;
    }

    const combinedText = systemPrompt + userInput;

    try {
      await navigator.clipboard.writeText(combinedText);
      setCopyState('✓ Kopiert! Åpner KI-assistent...');
      
      // Open KI-assistent in new tab
      window.open('https://chatgpt.com/', '_blank');
      
      setTimeout(() => setCopyState(''), 3000);
    } catch (error) {
      setCopyState('❌ Kunne ikke kopiere');
      setTimeout(() => setCopyState(''), 2000);
    }
  };

  const handleCopyOnly = async () => {
    const combinedText = systemPrompt + userInput;
    try {
      await navigator.clipboard.writeText(combinedText);
      setCopyState('✓ Kopiert til clipboard!');
      setTimeout(() => setCopyState(''), 2000);
    } catch (error) {
      setCopyState('❌ Kunne ikke kopiere');
      setTimeout(() => setCopyState(''), 2000);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    let template = null;
    for (const category of promptCategories) {
      template = category.templates.find(t => t.id === templateId);
      if (template) break;
    }
    if (!template) return;
    setActiveTemplateId(template.id);
    setSystemPrompt(template.text);
  };

    let activeTemplate = null;
    for (const category of promptCategories) {
      activeTemplate = category.templates.find(t => t.id === activeTemplateId);
      if (activeTemplate) break;
    }
    if (!activeTemplate) activeTemplate = promptCategories[0].templates[0];

  const isEConsult = activeTemplate.id === 'e-konsultasjon-assistent';
  const userInputLabel = isEConsult
    ? 'Din tekst limes inn her'
    : 'Lim inn relevante journalnotater, radiologisvar eller annet relevant her. Kom med korte føringer om du ønsker.';
  const userInputPlaceholder = isEConsult
    ? 'Lim inn henvendelsen fra pasienten her. Skriv en kort beskjed om du ønsker for å få et mer presist notat, men det er ikke nødvendig.'
    : 'Lim inn relevante journalnotater, radiologisvar eller annet relevant her. Kom med korte føringer om du ønsker.';

  return (
    <div style={{ marginTop: 20 }} className="form-section">
      <h2 style={{ marginBottom: 16 }}>KI-assistent</h2>
      <p style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
        Skriv inn tekst, så kombineres det med ditt prompt og kopieres til clipboard.
        KI-assistent åpnes automatisk - trykk Ctrl+V for å lime inn.
      </p>

      {/* System Prompt Section */}
      <div style={{ marginBottom: 20 }}>
          {promptCategories.map((category) => (
            <div key={category.id} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1f2937' }}>
                {category.label}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {category.templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateChange(template.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      background: activeTemplateId === template.id ? '#0891b2' : '#e5e7eb',
                      color: activeTemplateId === template.id ? 'white' : '#1f2937',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>
            Fremgangsmåte
          </label>
          <button
            type="button"
            onClick={() => setIsEditingPrompt(!isEditingPrompt)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: isEditingPrompt ? '#0891b2' : '#e5e7eb',
              color: isEditingPrompt ? 'white' : '#1f2937',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {isEditingPrompt ? '✓ Ferdig' : '✏️ Rediger prompt'}
          </button>
        </div>
        
        {isEditingPrompt ? (
          <textarea
            value={systemPrompt}
            onChange={(e) => {
              setSystemPrompt(e.target.value);
              setActiveTemplateId('');
            }}
            placeholder="Skriv ditt faste prompt her..."
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              fontSize: 14,
              borderRadius: 6,
              border: '2px solid #0891b2',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        ) : (
          <div
            style={{
              padding: 12,
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 14,
              whiteSpace: 'pre-wrap',
              color: '#6b7280'
            }}
          >
            {activeTemplate.guidance || 'Fremgangsmåte kommer her.'}
          </div>
        )}
      </div>

      {/* User Input Section */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
          {userInputLabel}
        </label>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={userInputPlaceholder}
          style={{
            width: '100%',
            minHeight: 200,
            padding: 12,
            fontSize: 14,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleRun}
          style={{
            padding: '12px 24px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#10b981')}
        >
          🚀 Kjør (Kopier + Åpne KI-assistent)
        </button>

        <button
          type="button"
          onClick={handleCopyOnly}
          style={{
            padding: '12px 24px',
            background: '#0891b2',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#0e7490')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#0891b2')}
        >
          📋 Kun kopier tekst
        </button>

        <button
          type="button"
          onClick={() => setUserInput('')}
          style={{
            padding: '12px 24px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
        >
          🗑️ Tøm
        </button>

        {copyState && (
          <span
            style={{
              padding: '8px 16px',
              background: copyState.includes('✓') ? '#d1fae5' : '#fee2e2',
              color: copyState.includes('✓') ? '#065f46' : '#991b1b',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {copyState}
          </span>
        )}
      </div>
    </div>
  );
}
