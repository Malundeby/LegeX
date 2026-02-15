"use client";

import { useParams, notFound } from "next/navigation";
import { useMemo } from "react";
import ToolHub from "../components/ToolHub";
import scoringTools from "@/data/scoring-tools.json";
import calculators from "@/data/calculators.json";

// Map URL slugs to tool IDs
const toolAliases: Record<string, { id: string; type: "score" | "calc" }> = {
  // Scoring tools
  madrs: { id: "madrs", type: "score" },
  "gad-7": { id: "gad-7", type: "score" },
  gad7: { id: "gad-7", type: "score" },
  asrs: { id: "asrs", type: "score" },
  "asrs-v1.1": { id: "asrs", type: "score" },
  audit: { id: "audit", type: "score" },
  "eular-ra-2010": { id: "eular-ra-2010", type: "score" },
  "eular-pmr-2012": { id: "eular-pmr-2012", type: "score" },
  // Calculators
  bmi: { id: "bmi", type: "calc" },
  ccs: { id: "ccs", type: "calc" },
  nyha: { id: "nyha", type: "calc" },
  chadsvasc: { id: "chadsvasc", type: "calc" },
  "cha2ds2-vasc": { id: "chadsvasc", type: "calc" },
  hasbled: { id: "hasbled", type: "calc" },
  mmrc: { id: "mmrc", type: "calc" },
  cat: { id: "cat", type: "calc" },
  crb65: { id: "crb65", type: "calc" },
  act: { id: "act", type: "calc" },
  "act-voksne": { id: "act", type: "calc" },
  "act-barn": { id: "act-child", type: "calc" },
  "act-child": { id: "act-child", type: "calc" },
  fib4: { id: "fib4", type: "calc" },
  "fib-4": { id: "fib4", type: "calc" },
  ipss: { id: "ipss", type: "calc" },
  "wells-dvt": { id: "wells-dvt", type: "calc" },
  "wells-pe": { id: "wells-pe", type: "calc" },
  "doak-dosing": { id: "doak-dosing", type: "calc" },
  "psa-age-adjusted": { id: "psa-age-adjusted", type: "calc" },
  "anemia-assessment": { id: "anemia-assessment", type: "calc" },
  norrisk2: { id: "norrisk2", type: "calc" },
  "norrisk-2": { id: "norrisk2", type: "calc" },
};

export default function ToolPage() {
  const params = useParams();
  const toolSlug = (params.tool as string)?.toLowerCase();

  const toolInfo = useMemo(() => {
    if (!toolSlug) return null;
    return toolAliases[toolSlug] ?? null;
  }, [toolSlug]);

  // Validate that the tool exists
  const toolExists = useMemo(() => {
    if (!toolInfo) return false;
    if (toolInfo.type === "score") {
      return scoringTools.some((t) => t.id === toolInfo.id);
    }
    return calculators.some((c) => c.id === toolInfo.id);
  }, [toolInfo]);

  if (!toolInfo || !toolExists) {
    notFound();
  }

  return (
    <main>
      <header>
        <h1>ToppenLS</h1>
        <p>Rask tilgang til skåringsverktøy og PDF-er – uten ekstra klikk.</p>
      </header>
      <ToolHub
        initialTool={toolInfo.type === "score" ? toolInfo.id : undefined}
        initialCalc={toolInfo.type === "calc" ? toolInfo.id : undefined}
        initialTab="tools"
        noSectionBackground
      />
      <p className="footer-note">
        Ingen persondata lagres. Resultater kan kopieres direkte inn i journal.
      </p>
    </main>
  );
}
