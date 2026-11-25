"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MIN_PASSWORD_LENGTH, authErrorMessage } from "@/lib/auth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus("error");
      setErrorMsg(`Passordet må være minst ${MIN_PASSWORD_LENGTH} tegn.`);
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setErrorMsg("Passordene er ikke like.");
      return;
    }

    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(authErrorMessage(error.message));
      return;
    }

    // With e-mail confirmation on, Supabase answers the same way for an
    // address that is already registered, so this message stays neutral.
    setStatus("sent");
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Opprett konto</h1>

        {status === "sent" ? (
          <p className="auth-info" role="status">
            Vi har sendt en bekreftelseslenke til <strong>{email.trim()}</strong>. Åpne lenken for å
            aktivere kontoen. Finner du den ikke, sjekk søppelpost.
          </p>
        ) : (
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
            <label className="auth-field">
              <span>Passord (minst {MIN_PASSWORD_LENGTH} tegn)</span>
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>Gjenta passord</span>
              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <button type="submit" className="auth-button" disabled={status === "sending"}>
              {status === "sending" ? "Oppretter …" : "Opprett konto"}
            </button>
            {status === "error" && (
              <p className="auth-error" role="alert">
                {errorMsg}
              </p>
            )}
          </form>
        )}

        <div className="auth-links">
          <span>
            Har du allerede konto? <Link href="/login">Logg inn</Link>
          </span>
        </div>
      </div>
    </main>
  );
}
