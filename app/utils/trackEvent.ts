/**
 * Fire-and-forget client-side tracking. No cookies, no raw IP handling here
 * — this just POSTs to the server, which does the hashing (see
 * app/api/track/route.ts). Never store PII in the payload.
 */

export type TrackEventType = "page_view" | "open" | "click" | "download";

interface TrackTarget {
  contentId?: string;
  slug?: string;
  path?: string;
}

function track(target: TrackTarget, eventType: TrackEventType) {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...target,
        eventType,
        referrer: document.referrer || undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking must never break the page.
  }
}

export function trackOpen(target: TrackTarget) {
  track(target, "open");
}

export function trackPageView(path: string) {
  track({ path }, "page_view");
}
