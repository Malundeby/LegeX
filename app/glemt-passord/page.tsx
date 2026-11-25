"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/nytt-passord`,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(authErrorMessage(error.message));
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Glemt passord</h1>

        {status === "sent" ? (
          <p className="auth-info" role="status">
            Finnes det en konto for <strong>{email.trim()}</strong>, har vi sendt en lenke for å
            lage nytt passord. Lenken virker i kort tid.
          </p>
        ) : (
          <>
            <p className="auth-lead">Skriv inn e-posten din, så sender vi en lenke for å lage nytt passord.</p>
            <form onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>E-post</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  placeholder="din@epost.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button type="submit" className="auth-button" disabled={status === "sending"}>
                {status === "sending" ? "Sender …" : "Send lenke"}
              </button>
              {status === "error" && (
                <p className="auth-error" role="alert">
                  {errorMsg}
                </p>
              )}
            </form>
          </>
        )}

        <div className="auth-links">
          <Link href="/login">Tilbake til innlogging</Link>
        </div>
      </div>
    </main>
  );
}
