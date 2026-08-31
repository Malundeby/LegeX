"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Opprett konto</h1>

      {status === "sent" ? (
        <p>
          Sjekk e-posten din ({email}) for å bekrefte kontoen, og logg deretter
          inn.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="din@epost.no"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Passord (minst 6 tegn)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={status === "sending"}
            style={{ width: "100%", padding: 10 }}
          >
            {status === "sending" ? "Oppretter..." : "Opprett konto"}
          </button>
          {status === "error" && (
            <p style={{ color: "red", marginTop: 8 }}>{errorMsg}</p>
          )}
        </form>
      )}

      <p style={{ marginTop: 16 }}>
        Har du allerede konto? <Link href="/login">Logg inn</Link>
      </p>
    </div>
  );
}
