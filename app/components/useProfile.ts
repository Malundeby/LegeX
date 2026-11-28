"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { PROFILE_EVENT, cleanPrefs, profileName, storePrefs } from "@/lib/profile";

/**
 * The signed-in user (undefined while loading, null when signed out) and
 * their name. Display preferences saved on the account are applied on sign-in.
 */
export function useProfile() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u?.user_metadata?.prefs) storePrefs(cleanPrefs(u.user_metadata.prefs));
    });
    const onProfile = (e: Event) => {
      const next = (e as CustomEvent<User>).detail;
      if (next) setUser(next);
    };
    window.addEventListener(PROFILE_EVENT, onProfile);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener(PROFILE_EVENT, onProfile);
    };
  }, []);

  return { user, name: profileName(user) };
}

/** Tell other components on the page that the profile changed. */
export function announceProfile(user: User) {
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: user }));
}
