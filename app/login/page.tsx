"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, safeNextPath } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const callbackError = searchParams.get("error") === "auth";
  const passwordChanged = searchParams.get("melding") === "passord-endret";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(authErrorMessage(error.message));
    } else {
      router.replace(next);
      router.refresh();
    }
  }

  return (
    <div className="auth-card">
      <h1>Logg inn</h1>
      <p className="auth-lead">Legeverktøy krever innlogging.</p>

      {callbackError && (
        <p className="auth-error" role="alert">
          Lenken er ugyldig eller utløpt. Prøv å logge inn, eller be om en ny lenke.
        </p>
      )}
      {passwordChanged && (
        <p className="auth-info" role="status">
          Passordet er endret. Logg inn med det nye passordet.
        </p>
      )}

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
          <span>Passord</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="auth-button" disabled={status === "sending"}>
          {status === "sending" ? "Logger inn …" : "Logg inn"}
        </button>
        {status === "error" && (
          <p className="auth-error" role="alert">
            {errorMsg}
          </p>
        )}
      </form>

      <div className="auth-links">
        <Link href="/glemt-passord">Glemt passord?</Link>
        <span>
          Ny bruker? <Link href="/signup">Opprett konto</Link>
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Suspense fallback={<div className="auth-card" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
