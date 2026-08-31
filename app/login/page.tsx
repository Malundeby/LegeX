"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
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
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Logg inn</h1>

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
          placeholder="Passord"
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
          {status === "sending" ? "Logger inn..." : "Logg inn"}
        </button>
        {status === "error" && (
          <p style={{ color: "red", marginTop: 8 }}>{errorMsg}</p>
        )}
      </form>

      <p style={{ marginTop: 16 }}>
        Ny bruker? <Link href="/signup">Opprett konto</Link>
      </p>
    </div>
  );
}
