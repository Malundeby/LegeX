"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const HIDDEN_ON = ["/login", "/signup", "/glemt-passord", "/nytt-passord"];

/** "Logg inn" for visitors, "e-post · Endre passord · Logg ut" for users. */
export default function AccountBar() {
  const pathname = usePathname();
  // undefined until we know, so the bar doesn't flicker between states.
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (email === undefined || HIDDEN_ON.includes(pathname)) return null;

  if (!email) {
    return (
      <div className="account-bar">
        <Link href="/login">Logg inn</Link>
      </div>
    );
  }

  async function handleSignOut() {
    await createClient().auth.signOut();
    // Full reload so the link page switches back to the anonymous version.
    window.location.assign("/");
  }

  return (
    <div className="account-bar">
      <span className="account-email" title={email}>
        {email}
      </span>
      <Link href="/nytt-passord">Endre passord</Link>
      <button type="button" onClick={handleSignOut}>
        Logg ut
      </button>
    </div>
  );
}
