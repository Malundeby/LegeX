"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useMemo } from "react";
import ToolHub from "../components/ToolHub";
import Logo from "../components/Logo";
import { resolveToolSlug, toolAliasExists } from "@/app/utils/toolRegistry";
import { trackOpen } from "@/app/utils/trackEvent";

export default function ToolPage() {
  const params = useParams();
  const toolSlug = (params.tool as string)?.toLowerCase();

  const toolInfo = useMemo(() => {
    return resolveToolSlug(toolSlug);
  }, [toolSlug]);

  const toolExists = useMemo(() => {
    return toolInfo ? toolAliasExists(toolInfo) : false;
  }, [toolInfo]);

  useEffect(() => {
    if (toolSlug && toolExists) trackOpen({ slug: toolSlug });
  }, [toolSlug, toolExists]);

  if (!toolInfo || !toolExists) {
    notFound();
  }

  return (
    <main>
      <header>
        <div className="header-title-row">
          <Logo size={36} />
          <h1>Legeassistent</h1>
          <span className="beta-badge">Under utvikling</span>
        </div>
      </header>
      <ToolHub
        initialTool={toolInfo.type === "score" ? toolInfo.id : undefined}
        initialCalc={toolInfo.type === "calc" ? toolInfo.id : undefined}
        initialTab="tools"
        noSectionBackground
      />
      <p className="footer-note">
        Ingen pasientdata lagres. Resultater kan kopieres direkte inn i journal.
      </p>
    </main>
  );
}
