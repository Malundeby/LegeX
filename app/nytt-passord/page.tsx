"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MIN_PASSWORD_LENGTH, authErrorMessage } from "@/lib/auth";

/**
 * Reached from the password reset e-mail via /auth/callback, which has
 * already turned the link into a session. Also works for a logged-in user
 * who just wants to change password.
 */
export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMsg(authErrorMessage(error.message));
      return;
    }

    // Sign out everywhere so the new password is required on every device.
    await supabase.auth.signOut({ scope: "global" });
    router.replace("/login?melding=passord-endret");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Nytt passord</h1>
        <form onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Nytt passord (minst {MIN_PASSWORD_LENGTH} tegn)</span>
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
            {status === "sending" ? "Lagrer …" : "Lagre nytt passord"}
          </button>
          {status === "error" && (
            <p className="auth-error" role="alert">
              {errorMsg}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
