"use client";

import { useParams, notFound } from "next/navigation";
import { useMemo } from "react";
import ToolHub from "../components/ToolHub";
import { resolveToolSlug, toolAliasExists } from "@/app/utils/toolRegistry";

export default function ToolPage() {
  const params = useParams();
  const toolSlug = (params.tool as string)?.toLowerCase();

  const toolInfo = useMemo(() => {
    return resolveToolSlug(toolSlug);
  }, [toolSlug]);

  const toolExists = useMemo(() => {
    return toolInfo ? toolAliasExists(toolInfo) : false;
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
