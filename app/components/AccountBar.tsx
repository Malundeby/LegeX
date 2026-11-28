"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "./useProfile";

const HIDDEN_ON = ["/login", "/signup", "/glemt-passord", "/nytt-passord"];

/** "Logg inn" for visitors; a link to the profile page and "Logg ut" for users. */
export default function AccountBar() {
  const pathname = usePathname();
  // undefined until we know, so the bar doesn't flicker between states.
  const { user, name } = useProfile();

  if (user === undefined || HIDDEN_ON.includes(pathname)) return null;

  if (!user) {
    return (
      <div className="account-bar">
        <Link href="/login">Logg inn</Link>
      </div>
    );
  }

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    // Full reload so the link page switches back to the anonymous version.
    window.location.assign("/");
  }

  const label = name || user.email || "Profil";

  return (
    <div className="account-bar">
      <Link href="/profil" className="account-profile" title="Profil og innstillinger">
        <span className="account-avatar" aria-hidden="true">
          {label.trim().charAt(0).toUpperCase()}
        </span>
        <span className="account-email">{label}</span>
      </Link>
      <button type="button" onClick={handleSignOut}>
        Logg ut
      </button>
    </div>
  );
}
