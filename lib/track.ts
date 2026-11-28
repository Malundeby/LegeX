/**
 * Validation for the anonymous statistics endpoint (/api/track). Anyone can
 * call it, so every field is checked and trimmed before it is stored.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/i;

export const MAX_PATH = 300;
export const MAX_USER_AGENT = 300;

export interface TrackInput {
  contentId: string | null;
  slug: string | null;
  path: string | null;
  referrer: string | null;
}

export function cleanTrackInput(body: Record<string, unknown>): TrackInput {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const contentId = str(body.contentId);
  const slug = str(body.slug).toLowerCase();
  const path = str(body.path);
  return {
    contentId: UUID.test(contentId) ? contentId.toLowerCase() : null,
    slug: SLUG.test(slug) ? slug : null,
    path: path.startsWith("/") && !path.startsWith("//") ? path.slice(0, MAX_PATH) : null,
    referrer: referrerOrigin(str(body.referrer))
  };
}

/** Only the site the visitor came from, never the full address (it can contain personal details). */
export function referrerOrigin(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin.slice(0, 200) : null;
  } catch {
    return null;
  }
}

/** Browsers say where a request came from; posts from other sites are ignored. */
export function isCrossSite(headers: Headers, ownOrigin: string): boolean {
  const site = headers.get("sec-fetch-site");
  if (site) return site === "cross-site";
  const origin = headers.get("origin");
  return Boolean(origin && origin !== ownOrigin);
}
