/**
 * SERVER-ONLY. Sends notification e-mail to the admin via Resend's HTTP API.
 *
 * Env:
 *   RESEND_API_KEY  required, from resend.com → API Keys
 *   ADMIN_EMAIL     recipient (same variable that grants admin rights)
 *   EMAIL_FROM      optional sender, e.g. "Legeassistent <varsel@ditt-domene.no>".
 *                   Defaults to Resend's test sender, which can only deliver to
 *                   the e-mail address that owns the Resend account.
 */

export interface AdminEmail {
  subject: string;
  text: string;
  replyTo?: string;
}

export type EmailResult = { ok: true } | { ok: false; reason: "not_configured" | "failed"; detail?: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL);
}

export async function sendAdminEmail({ subject, text, replyTo }: AdminEmail): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!apiKey || !to) return { ok: false, reason: "not_configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Legeassistent <onboarding@resend.dev>",
        to: [to],
        subject: subject.slice(0, 200),
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Resend feilet", res.status, detail);
      return { ok: false, reason: "failed", detail: `${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("Resend feilet", err);
    return { ok: false, reason: "failed" };
  }
}

/** Origin of the request, for links in e-mails. */
export function siteUrl(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

/**
 * Best-effort throttle per client within one server instance. Serverless
 * instances are short-lived, so this only stops bursts, not determined abuse.
 */
const hits = new Map<string, number[]>();
export function throttle(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return true;
}

export function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
