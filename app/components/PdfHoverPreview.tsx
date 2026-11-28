"use client";

import { useEffect, useRef, useState } from "react";
import { pdfWorkerSrc } from "@/app/utils/pdfSkjema";

export default function PdfHoverPreview({ url, maxPages = 1 }: { url: string; maxPages?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";
      setLoading(true);
      setError("");

      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        // Same self-hosted worker as /skjema, so hovering also warms the cache for opening the form.
        if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc(pdfjs.version);

        const loadingTask = pdfjs.getDocument({ url });

        const pdf = await loadingTask.promise;
        if (cancelled) {
          loadingTask.destroy();
          return;
        }

        const pageCount = Math.min(Math.max(1, maxPages), pdf.numPages);
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) {
            return;
          }

          const availableWidth = Math.min(Math.max((container.clientWidth || 480) - 24, 240), 860);
          const initialViewport = page.getViewport({ scale: 1 });
          const scale = availableWidth / initialViewport.width;
          const viewport = page.getViewport({ scale });
          const outputScale = window.devicePixelRatio || 1;

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            setError("Kunne ikke vise PDF-forhåndsvisning.");
            setLoading(false);
            return;
          }

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.display = "block";
          canvas.style.margin = "12px auto";
          canvas.style.borderRadius = "10px";
          canvas.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.12)";
          canvas.style.background = "#ffffff";

          container.appendChild(canvas);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined
          }).promise;

          if (pageNumber === 1 && !cancelled) {
            setLoading(false);
          }
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Kunne ikke laste PDF-forhåndsvisning.");
          setLoading(false);
        }
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
    };
  }, [url, maxPages]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "auto", background: "#f8fafc" }}>
      {loading && !error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#475569",
            fontSize: 14,
            background: "rgba(248, 250, 252, 0.92)",
            zIndex: 1
          }}
        >
          Laster forhåndsvisning...
        </div>
      )}
      {error ? (
        <div
          style={{
            padding: 20,
            color: "#b91c1c",
            fontSize: 14
          }}
        >
          {error}
        </div>
      ) : (
        <div ref={containerRef} style={{ padding: 12, minHeight: "100%" }} />
      )}
    </div>
  );
}