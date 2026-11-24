"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { LinkBoard } from "./ModernWidgetDashboard";
import { loadDashboardWidgets, type DashboardWidget } from "@/app/utils/widgetStorage";
import { createDefaultBookmarkWidgets } from "@/app/utils/toolHubLinks";

/**
 * The "Lenker" tab.
 *  - Not logged in: the standard menu (set by admin in /admin/lenker), read-only.
 *  - Logged in: the user's own menu, saved to their account (table link_layouts)
 *    so it follows them between devices. Starts as a copy of the standard menu.
 */

type Status = "loading" | "anon" | "user";
type SaveState = "idle" | "saving" | "saved" | "error";

export async function fetchDefaultLinks(): Promise<DashboardWidget[]> {
  try {
    const { data, error } = await createClient()
      .from("link_defaults")
      .select("widgets")
      .eq("id", "default")
      .maybeSingle();
    if (!error && data && Array.isArray(data.widgets) && data.widgets.length > 0) {
      return data.widgets as DashboardWidget[];
    }
  } catch {
    // fall through to built-in default
  }
  return createDefaultBookmarkWidgets(0);
}

export default function LinkMenu() {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  // Show the built-in menu immediately; replace it when the database answers.
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => createDefaultBookmarkWidgets(0));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [usingDefault, setUsingDefault] = useState(false);
  const loadedRef = useRef(false);
  const skipNextSaveRef = useRef(true);

  const load = useCallback(async (currentUser: User | null) => {
    loadedRef.current = false;
    skipNextSaveRef.current = true;
    const supabase = createClient();
    const defaults = await fetchDefaultLinks();

    if (!currentUser) {
      setUser(null);
      setWidgets(defaults);
      setStatus("anon");
      loadedRef.current = true;
      return;
    }

    setUser(currentUser);
    const { data } = await supabase
      .from("link_layouts")
      .select("widgets")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (data && Array.isArray(data.widgets)) {
      setWidgets(data.widgets as DashboardWidget[]);
      setUsingDefault(false);
    } else {
      // First time: carry over a menu this browser already had, otherwise start from the standard menu.
      let start = defaults;
      try {
        const local = loadDashboardWidgets(localStorage);
        if (local.source !== "none" && local.widgets.length > 0) start = local.widgets;
      } catch {
        // ignore
      }
      setWidgets(start);
      setUsingDefault(true);
    }
    setStatus("user");
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => load(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") load(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  // Save the user's menu (debounced). Visitors' changes (collapse, todo ticks) are never saved.
  useEffect(() => {
    if (status !== "user" || !user || !loadedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    setSaveState("saving");
    const t = window.setTimeout(async () => {
      const { error } = await createClient()
        .from("link_layouts")
        .upsert({ user_id: user.id, widgets, updated_at: new Date().toISOString() });
      setSaveState(error ? "error" : "saved");
      if (!error) setUsingDefault(false);
    }, 700);
    return () => window.clearTimeout(t);
  }, [widgets, status, user]);

  const handleReset = async () => {
    if (!confirm("Erstatte din meny med standardmenyen? Dine egne endringer forsvinner.")) return;
    setWidgets(await fetchDefaultLinks());
  };

  const handleSignOut = async () => {
    await createClient().auth.signOut();
  };

  const footerStart =
    status === "loading" ? null : status === "anon" ? (
      <span className="link-menu-note">
        Dette er standardmenyen. <Link href="/login">Logg inn</Link> eller <Link href="/signup">opprett konto</Link> for å
        lage din egen.
      </span>
    ) : (
      <span className="link-menu-note">
        Din meny{user?.email ? ` (${user.email})` : ""}
        {saveState === "saving" && " · lagrer…"}
        {saveState === "saved" && " · lagret"}
        {saveState === "error" && " · kunne ikke lagre"}
        {usingDefault && saveState === "idle" && " · kopi av standardmenyen"}
        {" · "}
        <button type="button" className="link-menu-inline" onClick={handleSignOut}>
          Logg ut
        </button>
      </span>
    );

  return (
    <LinkBoard
      widgets={widgets}
      setWidgets={setWidgets}
      editable={status === "user"}
      footerStart={footerStart}
      onReset={status === "user" ? handleReset : undefined}
    />
  );
}
