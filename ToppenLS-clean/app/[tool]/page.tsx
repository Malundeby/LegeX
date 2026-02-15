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
  // Calculators
  bmi: { id: "bmi", type: "calc" },
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
      <ToolHub initialTool={toolInfo.id} initialTab={toolInfo.type === "score" ? "scores" : "calculators"} />
      <p className="footer-note">
        Ingen persondata lagres. Resultater kan kopieres direkte inn i journal.
      </p>
    </main>
  );
}
