"use client";

import { useMemo, useState } from "react";
import scoringTools from "@/data/scoring-tools.json";
import calculators from "@/data/calculators.json";
import pdfResources from "@/data/pdf-resources.json";
import ComboBox from "./ComboBox";

interface ToolOption { label: string; score: number; }
interface ToolQuestion { id: string; text: string; options: ToolOption[]; part?: string; }
interface ToolThreshold { minScore: number; label: string; }
interface ScoringTool { id: string; name: string; description: string; questions: ToolQuestion[]; thresholds: ToolThreshold[]; }
interface CalcField { id: string; label: string; type: "number" | "select"; min?: number; max?: number; step?: number; options?: string[]; part?: string; }
interface CalcThreshold { max: number; label: string; color: string; }
interface Calculator { id: string; name: string; description: string; fields: CalcField[]; thresholds: CalcThreshold[]; layout?: "horizontal" | "vertical-select"; }
interface PdfResource { id: string; title: string; description: string; url: string; }
interface GuideResource { id: string; title: string; description: string; url: string; }

type TabKey = "tools" | "pdfs" | "guides" | "patientinfo";
const tabs: Record<TabKey, string> = { tools: "Verktøy", pdfs: "PDF-ressurser", guides: "Nyttige veiledere", patientinfo: "Pasientinformasjon" };

export default function ToolHub({ initialTool, initialTab }: { initialTool?: string; initialTab?: TabKey } = {}) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? "tools");
  const [activeToolId, setActiveToolId] = useState(initialTool ?? "");
  const [activeCalcId, setActiveCalcId] = useState("");
  const [answers, setAnswers] = useState<Record<string, { score: number; optionIndex: number }>>({});
  const [calcInputs, setCalcInputs] = useState<Record<string, string | number>>({});
  const [copyState, setCopyState] = useState("");
  const [psykiatriExpanded, setPsykiatriExpanded] = useState(false);
  const [somatikkExpanded, setSomatikkExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const sortedTools = useMemo(() => 
    [...(scoringTools as ScoringTool[])],
    []
  );
  
  const sortedCalcs = useMemo(() => 
    [...(calculators as Calculator[])],
    []
  );

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return sortedTools;
    const q = searchQuery.toLowerCase();
    return sortedTools.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q)
    );
  }, [sortedTools, searchQuery]);

  const filteredCalcs = useMemo(() => {
    if (!searchQuery.trim()) return sortedCalcs;
    const q = searchQuery.toLowerCase();
    return sortedCalcs.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.description.toLowerCase().includes(q)
    );
  }, [sortedCalcs, searchQuery]);

  const cleanName = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, '').trim();

  const guideResources: GuideResource[] = [
    { id: "g1", title: "Legemiddelhåndboka", description: "Norsk legemiddelhåndbok.", url: "https://www.legemiddelhandboka.no/" },
    { id: "g2", title: "Helsebiblioteket", description: "Fagprosedyrer og retningslinjer.", url: "https://www.helsebiblioteket.no/" },
    { id: "g3", title: "Felleskatalogen", description: "Legemiddelinformasjon.", url: "https://www.felleskatalogen.no/" },
  ];

  const activeTool = useMemo(() => sortedTools.find(t => t.id === activeToolId), [activeToolId, sortedTools]);
  const activeCalc = useMemo(() => sortedCalcs.find(c => c.id === activeCalcId), [activeCalcId, sortedCalcs]);

  const scoreSummary = useMemo(() => {
    if (!activeTool) return null;
    const totalScore = activeTool.questions.reduce((s, q) => s + (answers[q.id]?.score ?? 0), 0);
    const maxScore = activeTool.questions.reduce((s, q) => s + Math.max(...q.options.map(o => o.score)), 0);
    const threshold = [...activeTool.thresholds].sort((a, b) => b.minScore - a.minScore).find(t => totalScore >= t.minScore);
    const thresholdColor = threshold?.color ?? "#666";
    return { totalScore, maxScore, thresholdLabel: threshold?.label ?? "Uklassifisert", thresholdColor };
  }, [activeTool, answers]);

  const summaryText = activeTool && scoreSummary ? `${activeTool.name}: ${scoreSummary.totalScore}/${scoreSummary.maxScore} (${scoreSummary.thresholdLabel})` : "";
  const detailedSummaryText = activeTool && scoreSummary
    ? activeTool.questions.map((q, i) => `${i + 1}. ${q.text} — ${answers[q.id] ? q.options[answers[q.id].optionIndex]?.label : "Ikke besvart"}`).join("\n") + `\n\nTotal: ${scoreSummary.totalScore}/${scoreSummary.maxScore} (${scoreSummary.thresholdLabel})`
    : "";

  const calcResult = useMemo(() => {
    if (!activeCalc) return null;
    
    // BMI calculator
    if (activeCalc.id === "bmi") {
      const h = Number(calcInputs["height"]) / 100, w = Number(calcInputs["weight"]);
      if (!h || !w || h <= 0) return null;
      const bmi = w / (h * h);
      const t = activeCalc.thresholds.find(th => bmi <= th.max);
      const heightCm = Number(calcInputs["height"]);
      const detailedText = `BMI: ${bmi.toFixed(1)} (${t?.label ?? "Ukjent"})\nHøyde: ${heightCm} cm\nVekt: ${w} kg`;
      return { value: bmi.toFixed(1), label: t?.label ?? "Ukjent", color: t?.color ?? "#666", text: `BMI: ${bmi.toFixed(1)} (${t?.label ?? "Ukjent"})`, score: bmi, maxScore: 50, detailedText: detailedText, guideText: undefined };
    }
    
    // FIB-4 calculator
    if (activeCalc.id === "fib4") {
      const age = Number(calcInputs["age"]);
      const ast = Number(calcInputs["ast"]);
      const alt = Number(calcInputs["alt"]);
      const platelets = Number(calcInputs["platelets"]);
      
      if (!age || !ast || !alt || !platelets) return null;
      
      // FIB-4 = (Age × AST) / (Platelets × √ALT)
      const fib4 = (age * ast) / (platelets * Math.sqrt(alt));
      
      // Age-based interpretation
      let interpretation = "";
      let guideText = "";
      
      if (age < 35) {
        interpretation = fib4 < 2.0 ? "Lav risiko for avansert fibrose" : "Høy risiko for avansert fibrose";
        guideText = "Veiledning for alder <35 år:\n• <2.0: Lav risiko\n• ≥2.0: Høy risiko";
      } else if (age <= 65) {
        if (fib4 < 1.3) {
          interpretation = "Lav risiko for avansert fibrose";
        } else if (fib4 <= 2.67) {
          interpretation = "Ubestemt – vurder videre utredning";
        } else {
          interpretation = "Høy risiko for avansert fibrose";
        }
        guideText = "Veiledning for alder 35-65 år:\n• <1.3: Lav risiko\n• 1.3-2.67: Ubestemt\n• >2.67: Høy risiko";
      } else {
        interpretation = fib4 < 2.0 ? "Lav risiko for avansert fibrose" : "Høy risiko for avansert fibrose";
        guideText = "Veiledning for alder >65 år:\n• <2.0: Lav risiko\n• ≥2.0: Høy risiko";
      }
      
      const detailedText = `FIB-4: ${fib4.toFixed(2)}\nAlder: ${age} år\nAST: ${ast} U/L\nALT: ${alt} U/L\nTrombocytter: ${platelets} × 10⁹/L\n\n${interpretation}`;
      
      return { 
        value: fib4.toFixed(2), 
        label: interpretation, 
        color: "#666", 
        text: `FIB-4: ${fib4.toFixed(2)} (${interpretation})`,
        score: fib4,
        maxScore: 10,
        detailedText: detailedText,
        guideText: guideText
      };
    }
    
    // Generic scoring calculators (ACT, CAT, IPSS, Wells, etc.)
    if (activeCalc.thresholds && activeCalc.thresholds.length > 0) {
      let totalScore = 0;
      let maxScore = 0;
      let hasAllValues = true;
      
      for (const field of activeCalc.fields) {
        const value = calcInputs[field.id];
        if (field.type === "select" && field.options) {
          if (!value) {
            hasAllValues = false;
            break;
          }
          
          // Find the index of the selected option
          const selectedIndex = field.options.indexOf(String(value));
          
          // Extract numeric score from option string (e.g., "0 – Text" or "5")
          const match = String(value).match(/^(\d+)/);
          let score = 0;
          
          if (match) {
            // Option starts with a number
            score = parseInt(match[1]);
          } else if (String(value) === "Ja") {
            // Special case for Yes/No questions - "Ja" counts as 1
            score = 1;
          } else if (String(value) === "Nei") {
            // "Nei" counts as 0
            score = 0;
          } else if (selectedIndex >= 0) {
            // Option doesn't start with a number (e.g., "Klasse I – ...")
            // Use index + 1 as the score (1-based indexing for classes)
            score = selectedIndex + 1;
          }
          
          totalScore += score;
          
          // Calculate max possible score for this field
          const maxOption = field.options.reduce((max, opt, idx) => {
            const m = opt.match(/^(\d+)/);
            if (m) {
              return Math.max(max, parseInt(m[1]));
            } else if (opt === "Ja") {
              // Max for Yes/No is 1
              return Math.max(max, 1);
            } else if (opt === "Nei") {
              return max; // "Nei" doesn't increase max
            } else {
              // Use index + 1 for non-numeric options
              return Math.max(max, idx + 1);
            }
          }, 0);
          maxScore += maxOption;
        }
      }
      
      if (!hasAllValues) return null;
      
      // Find matching threshold
      const t = activeCalc.thresholds.find(th => totalScore <= th.max);
      
      // Create detailed text for specific calculators
      let detailedText: string | undefined = undefined;
      
      if (activeCalc.id === 'ipss') {
        const questionLabels = [
          "Ufullstendig tømming",
          "Hyppig vannlating (<2t)",
          "Avbrutt vannlating",
          "Vannlatingstrang",
          "Svak stråle",
          "Må presse for å starte",
          "Nocturi (ganger per natt)"
        ];
        
        detailedText = activeCalc.fields.map((field, idx) => {
          const value = calcInputs[field.id];
          const match = String(value).match(/^(\d+)/);
          const score = match ? parseInt(match[1]) : 0;
          return `${idx + 1}. ${questionLabels[idx]}: ${score}`;
        }).join("\n") + `\n\nSymptomskår: ${totalScore}/${maxScore} (${t?.label ?? "Ukjent"})`;
      } else if (activeCalc.id === 'cat') {
        const questionLabels = [
          "Hoste",
          "Slim",
          "Trykk i brystet",
          "Tungpust ved trapper",
          "Aktivitetsbegrensning",
          "Trygghet ved å gå ut",
          "Søvnkvalitet",
          "Energinivå"
        ];
        
        detailedText = activeCalc.fields.map((field, idx) => {
          const value = calcInputs[field.id];
          const match = String(value).match(/^(\d+)/);
          const score = match ? parseInt(match[1]) : 0;
          return `${idx + 1}. ${questionLabels[idx]}: ${score}`;
        }).join("\n") + `\n\nSymptomskår: ${totalScore}/${maxScore} (${t?.label ?? "Ukjent"})`;
      } else if (activeCalc.id === 'nyha' || activeCalc.id === 'ccs' || activeCalc.id === 'mmrc') {
        // For NYHA, CCS, mMRC: include the full description
        const field = activeCalc.fields[0];
        const value = calcInputs[field.id];
        
        // Extract description after the "–" separator
        const description = String(value).split(' – ')[1] || String(value);
        
        // Create label with score/maxScore format
        let labelWithScore = '';
        if (activeCalc.id === 'nyha') {
          labelWithScore = `NYHA ${totalScore}/${maxScore}`;
        } else if (activeCalc.id === 'ccs') {
          labelWithScore = `CCS ${totalScore}/${maxScore}`;
        } else if (activeCalc.id === 'mmrc') {
          labelWithScore = `mMRC ${totalScore}/${maxScore}`;
        }
        
        detailedText = `${labelWithScore}: ${description}`;
      }
      
      // Remove emojis from the calculator name for copy text
      let cleanName = activeCalc.name.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      
      // Customize names for specific calculators
      let copyText = '';
      if (activeCalc.id === 'nyha') {
        copyText = `NYHA (hjertesvikt): ${totalScore}/${maxScore}`;
      } else if (activeCalc.id === 'ccs') {
        copyText = `CCS (angina): ${totalScore}/${maxScore}`;
      } else if (activeCalc.id === 'mmrc') {
        copyText = `mMRC (dyspne): ${totalScore}/${maxScore}`;
      } else {
        copyText = `${cleanName}: ${totalScore}/${maxScore} (${t?.label ?? "Ukjent"})`;
      }
      
      return { 
        value: totalScore.toString(), 
        label: t?.label ?? "Ukjent", 
        color: t?.color ?? "#666", 
        text: copyText,
        score: totalScore,
        maxScore: maxScore,
        detailedText: detailedText,
        guideText: undefined
      };
    }
    
    return null;
  }, [activeCalc, calcInputs]);

  const handleAnswerChange = (qid: string, score: number, idx: number) => setAnswers(p => ({ ...p, [qid]: { score, optionIndex: idx } }));
  const handleToolChange = (id: string) => { setActiveToolId(id); setActiveCalcId(""); setAnswers({}); };
  const handleCalcChange = (id: string) => { 
    setActiveCalcId(id); 
    setActiveToolId(""); 
    // Initialize inputs with default values for select fields
    const calc = sortedCalcs.find(c => c.id === id);
    if (calc) {
      const initialInputs: Record<string, string | number> = {};
      calc.fields.forEach(field => {
        if (field.type === "select" && field.options) {
          const isYesNo = field.options.length === 2 && 
                          field.options[0] === "Nei" && 
                          field.options[1] === "Ja";
          const isHorizontalOrVertical = calc.layout === "horizontal" || calc.layout === "vertical-select";
          
          if (isYesNo) {
            // Default Yes/No fields to "Nei" (0 points)
            initialInputs[field.id] = "Nei";
          } else if (isHorizontalOrVertical && field.options[0]) {
            // Default horizontal/vertical-select fields to first option (usually 0)
            initialInputs[field.id] = field.options[0];
          }
        }
      });
      setCalcInputs(initialInputs);
    } else {
      setCalcInputs({});
    }
  };
  const handleInputChange = (fid: string, v: string | number) => setCalcInputs(p => ({ ...p, [fid]: v }));
  const handleCopy = async (t: string) => { try { await navigator.clipboard.writeText(t); setCopyState("Kopiert!"); setTimeout(() => setCopyState(""), 2000); } catch { setCopyState("Feilet"); } };
  const handlePrint = (url: string) => { const w = window.open(url, "_blank"); if (w) w.onload = () => { w.focus(); w.print(); }; };

  // Determine if higher score is better based on thresholds color pattern
  const isHigherScoreBetter = (thresholds: CalcThreshold[] | ToolThreshold[]) => {
    if (thresholds.length < 2) return false;
    // Check if first threshold has red color (indicating low score is bad)
    const firstColor = thresholds[0].color;
    return firstColor === "#f44336" || firstColor === "#ef5350";
  };

  return (
    <section className="section">
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid rgba(0,0,0,0.1)',
            background: sidebarCollapsed ? '#f0f0f0' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          type="button"
          title={sidebarCollapsed ? "Vis meny" : "Skjul meny"}
        >
          <span>{sidebarCollapsed ? "»" : "«"}</span>
          <span>{sidebarCollapsed ? "Vis meny" : "Skjul meny"}</span>
        </button>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid rgba(0,0,0,0.1)',
            background: showSearch ? '#f0f0f0' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
          onClick={() => setShowSearch(!showSearch)}
          type="button"
          title="Søk"
        >
          <span>🔍</span>
          <span>Søk</span>
        </button>
      </div>
      {showSearch && (
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Søk etter verktøy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.2)',
              fontSize: 14
            }}
            autoFocus
          />
        </div>
      )}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="tabbar" role="tablist">
          {Object.entries(tabs).map(([k, l]) => (
            <button key={k} type="button" className={`tab ${activeTab === k ? "active" : ""}`} onClick={() => setActiveTab(k as TabKey)} role="tab" aria-selected={activeTab === k}>{l}</button>
          ))}
        </div>
        <span className="badge">MVP · Offline-støtte</span>
      </div>

      {activeTab === "tools" && (
        <div className="grid" style={{ marginTop: 20, gridTemplateColumns: sidebarCollapsed ? '0px 1fr' : '300px 1fr' }}>
          <div className="list" style={{ width: sidebarCollapsed ? '0px' : '100%', overflow: 'hidden', transition: 'width 0.3s ease' }}>
            {!sidebarCollapsed && (<>
            <button 
              className="section" 
              style={{ padding: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
              onClick={() => setSomatikkExpanded(!somatikkExpanded)}
              type="button"
            >
              <div style={{ fontWeight: 700 }}>Somatikk</div>
              <span style={{ fontSize: 18 }}>{somatikkExpanded ? "▼" : "▶"}</span>
            </button>
            {(somatikkExpanded || (searchQuery && filteredCalcs.length > 0)) && filteredCalcs.map(calc => (
              <button key={calc.id} className={`button ${calc.id === activeCalcId ? "primary" : ""}`} onClick={() => handleCalcChange(calc.id)}>
                <div style={{ fontWeight: 700 }}>{cleanName(calc.name)}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{calc.description}</div>
              </button>
            ))}
            <button 
              className="section" 
              style={{ padding: 8, marginTop: 12, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
              onClick={() => setPsykiatriExpanded(!psykiatriExpanded)}
              type="button"
            >
              <div style={{ fontWeight: 700 }}>Psykiatri</div>
              <span style={{ fontSize: 18 }}>{psykiatriExpanded ? "▼" : "▶"}</span>
            </button>
            {(psykiatriExpanded || (searchQuery && filteredTools.length > 0)) && filteredTools.map(tool => (
              <button key={tool.id} className={`button ${tool.id === activeToolId ? "primary" : ""}`} onClick={() => handleToolChange(tool.id)}>
                <div style={{ fontWeight: 700 }}>{cleanName(tool.name)}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{tool.description}</div>
              </button>
            ))}
            </>) }
          </div>

          <div className="form-section">
            {activeTool ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <h2 style={{ margin: 0 }}>{activeTool.name}</h2>
                  {activeTool.pdfUrl && (
                    <>
                      <a
                        href={activeTool.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '6px 12px',
                          background: '#0891b2',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#06b6d4'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#0891b2'}
                      >
                        📄 PDF
                      </a>
                      <button
                        type="button"
                        onClick={() => handlePrint(activeTool.pdfUrl!)}
                        style={{
                          padding: '6px 12px',
                          background: '#059669',
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
                        onMouseOver={(e) => e.currentTarget.style.background = '#10b981'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#059669'}
                      >
                        🖶️ Skriv ut
                      </button>
                    </>
                  )}
                </div>
                <p>{activeTool.description}</p>
                <div 
                  style={{ 
                    marginTop: 12,
                    display: 'grid',
                    gridTemplateColumns: sidebarCollapsed ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                    gap: 16
                  }}
                >
                  {activeTool.questions.map((q, i) => (
                    <div key={q.id} className="question">
                      <strong>{i + 1}. {q.text}</strong>
                      <div className="options">
                        {q.options.map((o, oi) => (
                          <label key={o.label}><input type="radio" name={q.id} checked={answers[q.id]?.optionIndex === oi} onChange={() => handleAnswerChange(q.id, o.score, oi)} /> {o.label}</label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Visual score indicator - always show for scoring tools */}
                {activeTool && (
                  <div style={{ margin: '20px 0' }}>
                    <div style={{
                      width: '100%',
                      height: '32px',
                      background: isHigherScoreBetter(activeTool.thresholds)
                        ? 'linear-gradient(to right, #f44336 0%, #ff9800 50%, #4caf50 100%)'
                        : 'linear-gradient(to right, #4caf50 0%, #ff9800 50%, #f44336 100%)',
                      borderRadius: '16px',
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: `${scoreSummary ? (scoreSummary.totalScore / scoreSummary.maxScore) * 100 : 0}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: `4px solid ${scoreSummary?.thresholdColor ?? '#9ca3af'}`,
                        boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                        zIndex: 2,
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginTop: '8px',
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: 500
                    }}>
                      <span>0</span>
                      <span style={{ fontWeight: 600, color: '#374151' }}>
                        {scoreSummary ? `${scoreSummary.totalScore} / ${scoreSummary.maxScore}` : '0 / 0'}
                      </span>
                      <span>{scoreSummary?.maxScore ?? 0}</span>
                    </div>
                  </div>
                )}
                
                {scoreSummary && activeTool && (
                  <div className="summary" style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 700 }}>Oppsummering</div>
                    
                    {/* Visual score indicator */}
                    <div style={{ margin: '16px 0', display: 'none' }}>
                      <div style={{
                        width: '100%',
                        height: '32px',
                        background: isHigherScoreBetter(activeTool.thresholds)
                          ? 'linear-gradient(to right, #f44336 0%, #ff9800 50%, #4caf50 100%)'
                          : 'linear-gradient(to right, #4caf50 0%, #ff9800 50%, #f44336 100%)',
                        borderRadius: '16px',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: `${(scoreSummary.totalScore / scoreSummary.maxScore) * 100}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          border: `4px solid ${scoreSummary.thresholdColor}`,
                          boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                          zIndex: 2,
                          transition: 'all 0.3s ease'
                        }} />
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginTop: '8px',
                        fontSize: '13px',
                        color: '#6b7280',
                        fontWeight: 500
                      }}>
                        <span>0</span>
                        <span style={{ fontWeight: 600, color: '#374151' }}>
                          {scoreSummary.totalScore} / {scoreSummary.maxScore}
                        </span>
                        <span>{scoreSummary.maxScore}</span>
                      </div>
                    </div>

                    <p>{summaryText}</p>
                    <div className="row" style={{ marginTop: 12 }}>
                      <button type="button" className="button primary" onClick={() => handleCopy(summaryText)}>Kopier totalskår</button>
                      <button type="button" className="button primary" onClick={() => handleCopy(detailedSummaryText)}>Kopier svar og totalskår</button>
                    </div>
                    <span className="badge" style={{ marginTop: 8 }}>{copyState || "Klar til kopiering"}</span>
                  </div>
                )}
              </div>
            ) : activeCalc ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <h2 style={{ margin: 0 }}>{activeCalc.name}</h2>
                  {activeCalc.pdfUrl && (
                    <>
                      <a
                        href={activeCalc.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '6px 12px',
                          background: '#0891b2',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#06b6d4'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#0891b2'}
                      >
                        📄 PDF
                      </a>
                      <button
                        type="button"
                        onClick={() => handlePrint(activeCalc.pdfUrl!)}
                        style={{
                          padding: '6px 12px',
                          background: '#059669',
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
                        onMouseOver={(e) => e.currentTarget.style.background = '#10b981'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#059669'}
                      >
                        🖶️ Skriv ut
                      </button>
                    </>
                  )}
                </div>
                <p>{activeCalc.description}</p>
                <div style={{ maxWidth: activeCalc.layout === "horizontal" ? 900 : 700, margin: '20px 0' }}>
                {activeCalc.fields.map((f, idx) => {
                  const isYesNo = f.options?.length === 2 && f.options[0] === "Nei" && f.options[1] === "Ja";
                  const isVerticalSelect = activeCalc.layout === "vertical-select";
                  const isHorizontalLayout = activeCalc.layout === "horizontal";
                  const prevPart = idx > 0 ? activeCalc.fields[idx - 1].part : undefined;
                  const showPartHeader = f.part && f.part !== prevPart;
                  
                  return (
                    <div key={f.id}>
                      {showPartHeader && (
                        <div style={{ 
                          marginTop: idx > 0 ? 30 : 10,
                          marginBottom: 16,
                          paddingBottom: 8,
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          <h3 style={{ 
                            fontSize: 16, 
                            fontWeight: 600, 
                            color: '#0891b2',
                            margin: 0
                          }}>{f.part}</h3>
                        </div>
                      )}
                      <div className="calc-field-row" style={isVerticalSelect || isHorizontalLayout ? { flexDirection: 'column', alignItems: 'flex-start', gap: 12, paddingBottom: 20 } : {}}>
                      <label style={{ fontWeight: 500, fontSize: 15 }}>{f.label}</label>
                      {f.type === "number" ? (
                        <input type="number" min={f.min} max={f.max} step={f.step ?? 1} value={calcInputs[f.id] ?? ""} onChange={e => handleInputChange(f.id, e.target.value)} />
                      ) : isVerticalSelect ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                          {f.options?.map((option, idx) => {
                            const isActive = calcInputs[f.id] === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleInputChange(f.id, option)}
                                style={{
                                  padding: '12px 16px',
                                  border: isActive ? '2px solid #0891b2' : '1px solid #e0e0e0',
                                  background: isActive ? '#ecfeff' : '#ffffff',
                                  color: '#000000',
                                  fontWeight: isActive ? 600 : 400,
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  textAlign: 'left',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isActive ? '0 2px 8px rgba(8, 145, 178, 0.15)' : 'none'
                                }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      ) : isHorizontalLayout ? (
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap',
                          gap: 8, 
                          width: '100%' 
                        }}>
                          {f.options?.map((option, idx) => {
                            const isActive = calcInputs[f.id] === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleInputChange(f.id, option)}
                                style={{
                                  padding: '10px 14px',
                                  border: isActive ? '2px solid #0891b2' : '1px solid #d0d0d0',
                                  background: isActive ? '#0891b2' : '#ffffff',
                                  color: isActive ? '#ffffff' : '#333333',
                                  fontWeight: isActive ? 600 : 400,
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  textAlign: 'center',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isActive ? '0 2px 8px rgba(8, 145, 178, 0.25)' : 'none',
                                  flex: '1 1 auto',
                                  minWidth: 'fit-content',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      ) : isYesNo ? (
                        <div style={{
                          display: 'inline-flex',
                          backgroundColor: '#e8e8ed',
                          borderRadius: 9,
                          padding: 2,
                          position: 'relative'
                        }}>
                          {f.options.map(option => {
                            const currentValue = calcInputs[f.id] || "Nei";
                            const isActive = currentValue === option;
                            const isYes = option === "Ja";
                            const activeColor = isYes ? '#4caf50' : '#ef5350';
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleInputChange(f.id, option)}
                                style={{
                                  padding: '6px 16px',
                                  border: 'none',
                                  background: isActive ? activeColor : 'transparent',
                                  color: isActive ? '#ffffff' : '#3c3c43',
                                  fontWeight: isActive ? 600 : 400,
                                  borderRadius: 7,
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  transition: 'all 0.2s ease',
                                  boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)' : 'none',
                                  minWidth: 60
                                }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <ComboBox 
                          value={calcInputs[f.id] ?? ""}
                          options={f.options || []}
                          onChange={(val) => handleInputChange(f.id, val)}
                          placeholder="Velg eller skriv..."
                        />
                      )}
                    </div>
                    </div>
                  );
                })}
                </div>
                
                {/* Visual score indicator for calculators - always show when thresholds exist (except BMI and FIB-4) */}
                {activeCalc && activeCalc.thresholds && activeCalc.thresholds.length > 0 && activeCalc.id !== 'bmi' && activeCalc.id !== 'fib4' && (
                  <div style={{ margin: '20px 0', maxWidth: 700 }}>
                    <div style={{
                      width: '100%',
                      height: '32px',
                      background: isHigherScoreBetter(activeCalc.thresholds)
                        ? 'linear-gradient(to right, #f44336 0%, #ff9800 50%, #4caf50 100%)'
                        : 'linear-gradient(to right, #4caf50 0%, #ff9800 50%, #f44336 100%)',
                      borderRadius: '16px',
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: `${calcResult && calcResult.maxScore ? (calcResult.score / calcResult.maxScore) * 100 : 0}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: `4px solid ${calcResult?.color ?? '#9ca3af'}`,
                        boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                        zIndex: 2,
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginTop: '8px',
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: 500
                    }}>
                      <span>0</span>
                      <span style={{ fontWeight: 600, color: '#374151' }}>
                        {calcResult && calcResult.maxScore ? `${calcResult.score} / ${calcResult.maxScore}` : '0 / 0'}
                      </span>
                      <span>{calcResult?.maxScore ?? 0}</span>
                    </div>
                  </div>
                )}
                
                {calcResult && activeCalc && (
                  <div className="summary" style={{ borderColor: calcResult.color, marginTop: 20, maxWidth: 700 }}>
                    <div style={{ fontWeight: 700, color: calcResult.color }}>Resultat</div>
                    
                    {/* Visual score indicator for calculators */}
                    {calcResult.maxScore && (
                      <div style={{ margin: '16px 0', display: 'none' }}>
                        <div style={{
                          width: '100%',
                          height: '32px',
                          background: isHigherScoreBetter(activeCalc.thresholds)
                            ? 'linear-gradient(to right, #f44336 0%, #ff9800 50%, #4caf50 100%)'
                            : 'linear-gradient(to right, #4caf50 0%, #ff9800 50%, #f44336 100%)',
                          borderRadius: '16px',
                          position: 'relative',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{
                            position: 'absolute',
                            left: `${(calcResult.score / calcResult.maxScore) * 100}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            border: `4px solid ${calcResult.color}`,
                            boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                            zIndex: 2,
                            transition: 'all 0.3s ease'
                          }} />
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#6b7280',
                          fontWeight: 500
                        }}>
                          <span>0</span>
                          <span style={{ fontWeight: 600, color: '#374151' }}>
                            {calcResult.score} / {calcResult.maxScore}
                          </span>
                          <span>{calcResult.maxScore}</span>
                        </div>
                      </div>
                    )}
                    
                    <p style={{ fontSize: 20, fontWeight: 700 }}>{calcResult.value} <span style={{ fontWeight: 400, fontSize: 16 }}>({calcResult.label})</span></p>
                    
                    {/* Guide text for FIB-4 */}
                    {calcResult.guideText && (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#f3f4f6',
                        borderRadius: 8,
                        fontSize: 14,
                        whiteSpace: 'pre-line',
                        color: '#374151',
                        lineHeight: 1.6
                      }}>
                        {calcResult.guideText}
                      </div>
                    )}
                    
                    <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                      {activeCalc.id === 'bmi' ? (
                        <>
                          <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier BMI</button>
                          {calcResult.detailedText && (
                            <button type="button" className="button primary" onClick={() => handleCopy(calcResult.detailedText!)}>Kopier BMI, høyde og vekt</button>
                          )}
                        </>
                      ) : activeCalc.id === 'fib4' ? (
                        <>
                          <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier FIB-4</button>
                          {calcResult.detailedText && (
                            <button type="button" className="button primary" onClick={() => handleCopy(calcResult.detailedText!)}>Kopier FIB-4 med verdier</button>
                          )}
                        </>
                      ) : (activeCalc.id === 'ipss' || activeCalc.id === 'cat') ? (
                        <>
                          <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier totalskår</button>
                          {calcResult.detailedText && (
                            <button type="button" className="button primary" onClick={() => handleCopy(calcResult.detailedText!)}>Kopier totalskår med symptomskåring</button>
                          )}
                        </>
                      ) : (activeCalc.id === 'nyha' || activeCalc.id === 'ccs' || activeCalc.id === 'mmrc') ? (
                        <>
                          <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier skår</button>
                          {calcResult.detailedText && (
                            <button type="button" className="button primary" onClick={() => handleCopy(calcResult.detailedText!)}>Kopier skår og funksjonsbeskrivelse</button>
                          )}
                        </>
                      ) : (
                        <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier til journal</button>
                      )}
                      <span className="badge">{copyState || "Klar til kopiering"}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : <div style={{ padding: 16 }}>Velg et verktøy fra venstre kolonne.</div>}
          </div>
        </div>
      )}

      {activeTab === "pdfs" && (
        <div style={{ marginTop: 20 }} className="form-section">
          {(pdfResources as PdfResource[]).map(r => (
            <div key={r.id} className="section" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700 }}>{r.title}</div>
              <p>{r.description}</p>
              <div className="row">
                <a className="button" href={r.url} target="_blank" rel="noreferrer">Åpne PDF</a>
                <a className="button" href={r.url} download>Last ned</a>
                <button className="button" type="button" onClick={() => handlePrint(r.url)}>Skriv ut</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "guides" && (
        <div style={{ marginTop: 20 }} className="form-section">
          {guideResources.map(g => (
            <div key={g.id} className="section" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700 }}>{g.title}</div>
              <p>{g.description}</p>
              <a className="button" href={g.url} target="_blank" rel="noreferrer">Åpne</a>
            </div>
          ))}
        </div>
      )}

      {activeTab === "patientinfo" && <div style={{ marginTop: 20, padding: 24, textAlign: "center" }}><p>Pasientinformasjon kommer snart.</p></div>}
    </section>
  );
}
