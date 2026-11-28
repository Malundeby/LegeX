import { NextResponse, type NextRequest } from "next/server";
import { lookup, type LookupAddress } from "dns";
import { request as httpsRequest } from "https";
import { isIP } from "net";
import type { IncomingMessage } from "http";
import { isPrivateAddress } from "@/lib/netGuard";

/**
 * Fetches a public PDF from another site so the form filler (/skjema) can
 * open it in the browser. Only the blank form passes through here; what the
 * user fills in never leaves the browser. Nothing is stored.
 */

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function assertPublicHttps(url: URL) {
  if (url.protocol !== "https:") throw new Error("Bare https-lenker kan åpnes.");
  if (url.username || url.password) throw new Error("Ugyldig lenke.");
  if (url.port && url.port !== "443") throw new Error("Ugyldig lenke.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isPrivateAddress(host)) throw new Error("Lenken peker ikke til en offentlig nettside.");
}

/**
 * DNS lookup used for the connection itself. Checking the addresses here, rather
 * than in a separate lookup first, means the name cannot point somewhere else
 * between the check and the download (DNS rebinding).
 */
function publicLookup(
  hostname: string,
  options: { all?: boolean } | number,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void
) {
  lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      return callback(Object.assign(new Error("Lenken peker ikke til en offentlig nettside."), { code: "EPRIVATE" }), "");
    }
    if (typeof options === "object" && options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

function get(url: URL): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: "GET",
        lookup: publicLookup as never,
        headers: { Accept: "application/pdf,*/*;q=0.5", "User-Agent": "Legeassistent PDF" },
        timeout: 15000
      },
      resolve
    );
    req.on("timeout", () => req.destroy(new Error("Tidsavbrudd ved henting av PDF.")));
    req.on("error", reject);
    req.end();
  });
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
    let response: IncomingMessage | null = null;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      assertPublicHttps(url);
      response = await get(url);
      const location = response.headers.location;
      const status = response.statusCode ?? 0;
      if (status >= 300 && status < 400 && location) {
        response.resume();
        url = new URL(location, url);
        continue;
      }
      break;
    }
    const status = response?.statusCode ?? 0;
    if (!response || status < 200 || status >= 300) {
      response?.resume();
      return NextResponse.json({ error: `Kunne ikke hente PDF (${status || "ukjent"})` }, { status: 502 });
    }
    const length = Number(response.headers["content-length"] ?? 0);
    if (length > MAX_BYTES) {
      response.destroy();
      return NextResponse.json({ error: "PDF-en er for stor" }, { status: 413 });
    }

    const chunks: Buffer[] = [];
    let total = 0;
    const deadline = AbortSignal.timeout(30000);
    for await (const chunk of response as AsyncIterable<Buffer>) {
      total += chunk.byteLength;
      if (total > MAX_BYTES || deadline.aborted) {
        response.destroy();
        return NextResponse.json({ error: deadline.aborted ? "Tidsavbrudd ved henting av PDF." : "PDF-en er for stor" }, { status: 413 });
      }
      chunks.push(chunk);
    }
    const bytes = new Uint8Array(Buffer.concat(chunks));
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
    const code = (e as NodeJS.ErrnoException)?.code;
    const message =
      code === "ENOTFOUND" || code === "EAI_AGAIN"
        ? "Fant ikke nettstedet."
        : code === "ECONNREFUSED" || code === "ECONNRESET" || code === "CERT_HAS_EXPIRED" || code?.startsWith("ERR_TLS")
          ? "Kunne ikke koble til nettstedet."
          : e instanceof Error
            ? e.message
            : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
