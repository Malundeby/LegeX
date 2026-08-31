"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function BrukerePage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const { users } = await res.json();
      setUsers(users);
    } else {
      setError("Kunne ikke hente brukere");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setCreating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Oppretting feilet");
      return;
    }
    setEmail("");
    setPassword("");
    loadUsers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette brukeren?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Sletting feilet");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div>
      <h2>Brukere</h2>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      <form onSubmit={handleCreate} className="calc-card" style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="calc-input"
        />
        <input
          type="password"
          placeholder="Passord (min. 6 tegn)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          className="calc-input"
        />
        <button type="submit" className="button primary" disabled={creating}>
          {creating ? "Oppretter…" : "Opprett bruker"}
        </button>
      </form>

      {loading ? (
        <p>Laster…</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--border)" }}>
              <th style={{ padding: 8 }}>E-post</th>
              <th style={{ padding: 8 }}>Opprettet</th>
              <th style={{ padding: 8 }}>Sist innlogget</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ padding: 8 }}>{u.email}</td>
                <td style={{ padding: 8 }}>{new Date(u.created_at).toLocaleDateString("nb-NO")}</td>
                <td style={{ padding: 8 }}>
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("nb-NO") : "Aldri"}
                </td>
                <td style={{ padding: 8 }}>
                  <button type="button" className="tool-view-button" onClick={() => handleDelete(u.id)}>
                    Slett
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
