import type { Metadata } from "next";
import { preload } from "react-dom";
import { version as pdfjsVersion } from "pdfjs-dist/package.json";
import PdfUtfyller from "@/app/components/skjema/PdfUtfyller";
import { pdfFetchUrl, pdfWorkerSrc } from "@/app/utils/pdfSkjema";

export const metadata: Metadata = {
  title: "Fyll ut skjema · Legeassistent",
  robots: { index: false }
};

export default async function SkjemaPage({
  searchParams
}: {
  searchParams: Promise<{ url?: string | string[]; tittel?: string | string[] }>;
}) {
  const params = await searchParams;
  const url = Array.isArray(params.url) ? params.url[0] : params.url;
  const title = Array.isArray(params.tittel) ? params.tittel[0] : params.tittel;

  if (!url) {
    return (
      <main style={{ padding: 24 }}>
        <p>Ingen PDF valgt.</p>
      </main>
    );
  }

  // Start fetching the PDF while the page's JavaScript is still loading.
  const source = pdfFetchUrl(url, "");
  if (source) preload(source, { as: "fetch", crossOrigin: "anonymous" });

  return <PdfUtfyller key={url} url={url} title={title} workerSrc={pdfWorkerSrc(pdfjsVersion)} />;
}
