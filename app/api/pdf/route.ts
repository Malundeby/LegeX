import { NextResponse, type NextRequest } from "next/server";
import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Fetches a public PDF from another site so the form filler (/skjema) can
 * open it in the browser. Only the blank form passes through here; what the
 * user fills in never leaves the browser. Nothing is stored.
 */

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a === "::1" || a === "::") return true;
    if (a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80")) return true;
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

async function assertPublicHttps(url: URL) {
  if (url.protocol !== "https:") throw new Error("Bare https-lenker kan åpnes.");
  if (url.username || url.password) throw new Error("Ugyldig lenke.");
  if (url.port && url.port !== "443") throw new Error("Ugyldig lenke.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Lenken peker ikke til en offentlig nettside.");
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Mangler url" }, { status: 400 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Ugyldig url" }, { status: 400 });
  }

  try {
    let response: Response | null = null;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      await assertPublicHttps(url);
      response = await fetch(url, {
        redirect: "manual",
        headers: { Accept: "application/pdf,*/*;q=0.5", "User-Agent": "Legeassistent PDF" },
        signal: AbortSignal.timeout(15000),
        cache: "no-store"
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        url = new URL(location, url);
        continue;
      }
      break;
    }
    if (!response || !response.ok || !response.body) {
      return NextResponse.json({ error: `Kunne ikke hente PDF (${response?.status ?? "ukjent"})` }, { status: 502 });
    }
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) return NextResponse.json({ error: "PDF-en er for stor" }, { status: 413 });

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "PDF-en er for stor" }, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.byteLength;
    }
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
    if (!head.includes("%PDF-")) {
      return NextResponse.json({ error: "Lenken er ikke en PDF" }, { status: 415 });
    }

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline"
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
