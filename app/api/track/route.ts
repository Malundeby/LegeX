import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

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
  let body: {
    contentId?: string;
    slug?: string;
    path?: string;
    eventType?: string;
    referrer?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.eventType ?? "open";
  if (!VALID_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "unknown";
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
    path: body.path ?? null,
    event_type: eventType,
    visitor_hash_daily: visitorHashDaily,
    visitor_hash_monthly: visitorHashMonthly,
    referrer: body.referrer ?? null,
    user_agent: userAgent,
  });

  if (error) {
    console.error("track insert failed", error);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
