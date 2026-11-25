"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const HIDDEN_ON = ["/login", "/signup", "/glemt-passord", "/nytt-passord"];

/** Small "logged in as … / Logg ut" bar shown on every page behind login. */
export default function AccountBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!email || HIDDEN_ON.includes(pathname)) return null;

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();

    // Pages cached by the service worker for offline use must not stay
    // readable on a shared computer after logout.
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="account-bar">
      <span className="account-email" title={email}>
        {email}
      </span>
      <Link href="/nytt-passord">Endre passord</Link>
      <button type="button" onClick={handleSignOut} disabled={signingOut}>
        {signingOut ? "Logger ut …" : "Logg ut"}
      </button>
    </div>
  );
}
