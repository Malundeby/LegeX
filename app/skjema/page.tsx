import type { Metadata } from "next";
import PdfUtfyller from "@/app/components/skjema/PdfUtfyller";

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

  return <PdfUtfyller key={url} url={url} title={title} />;
}
