import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientKey, throttle } from "@/lib/email";
import { MAX_USER_AGENT, cleanTrackInput, isCrossSite } from "@/lib/track";

/**
 * Personvern (jf. 3.7): ingen cookies brukes til sporing. Ingen rå
 * IP-adresser lagres noe sted — IP leses inn i en lokal variabel og brukes
 * KUN til å bygge hash-strengen nedenfor, i samme funksjonskall. Anonyme
 * besøkende identifiseres kun via en daglig/månedlig roterende hash.
 * Innlogging kreves ikke for noe innhold.
 */

const VALID_EVENT_TYPES = new Set(["page_view", "open", "click", "download"]);

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function hashVisitor(ip: string, userAgent: string, period: string): string {
  return createHash("sha256").update(`${ip}|${userAgent}|${period}`).digest("hex");
}

export async function POST(request: NextRequest) {
  // Statistics only come from our own pages, and in moderate amounts.
  if (isCrossSite(request.headers, request.nextUrl.origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 4096) {
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  }
  if (!throttle(`tr:${clientKey(request)}`, 60, 60 * 1000)) {
    return new NextResponse(null, { status: 204 });
  }

  let raw: Record<string, unknown>;
  try {
    const parsed = await request.json();
    raw = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const body = cleanTrackInput(raw);

  const eventType = typeof raw.eventType === "string" ? raw.eventType : "open";
  if (!VALID_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const userAgent = (request.headers.get("user-agent") ?? "unknown").slice(0, MAX_USER_AGENT);
  const now = new Date();
  const dailyPeriod = now.toISOString().slice(0, 10);
  const monthlyPeriod = now.toISOString().slice(0, 7);

  const visitorHashDaily = hashVisitor(ip, userAgent, dailyPeriod);
  const visitorHashMonthly = hashVisitor(ip, userAgent, monthlyPeriod);

  const admin = createAdminClient();

  let contentId = body.contentId ?? null;
  if (!contentId && body.slug) {
    const { data } = await admin
      .from("content_items")
      .select("id")
      .eq("slug", body.slug)
      .maybeSingle();
    contentId = data?.id ?? null;
  }

  const { error } = await admin.from("content_events").insert({
    content_id: contentId,
    path: body.path,
    event_type: eventType,
    visitor_hash_daily: visitorHashDaily,
    visitor_hash_monthly: visitorHashMonthly,
    referrer: body.referrer,
    user_agent: userAgent,
  });

  if (error) {
    console.error("track insert failed", error);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
