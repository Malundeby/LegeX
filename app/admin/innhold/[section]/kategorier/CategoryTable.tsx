"use client";

import { useState } from "react";

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export default function CategoryTable({
  section,
  initialCategories,
}: {
  section: string;
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRename(id: string, name: string) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Omdøping feilet");
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  async function handleReorder(id: string, sort_order: number) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sort_order }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Endring av rekkefølge feilet");
      return;
    }
    setCategories((prev) =>
      [...prev.map((c) => (c.id === id ? { ...c, sort_order } : c))].sort((a, b) => a.sort_order - b.sort_order)
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette kategorien? Innhold i kategorien blir stående uten kategori.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Sletting feilet");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, name: newName.trim(), sort_order: categories.length }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Oppretting feilet");
      return;
    }
    const { category } = await res.json();
    setCategories((prev) => [...prev, category]);
    setNewName("");
  }

  return (
    <div style={{ marginTop: 16 }}>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid var(--border)" }}>
            <th style={{ padding: 8 }}>Navn</th>
            <th style={{ padding: 8 }}>Rekkefølge</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <td style={{ padding: 8 }}>
                <input
                  defaultValue={c.name}
                  className="calc-input"
                  disabled={busy}
                  onBlur={(e) => e.target.value !== c.name && handleRename(c.id, e.target.value)}
                />
              </td>
              <td style={{ padding: 8 }}>
                <input
                  type="number"
                  defaultValue={c.sort_order}
                  className="calc-input"
                  style={{ width: 80 }}
                  disabled={busy}
                  onBlur={(e) => Number(e.target.value) !== c.sort_order && handleReorder(c.id, Number(e.target.value))}
                />
              </td>
              <td style={{ padding: 8 }}>
                <button type="button" className="tool-view-button" onClick={() => handleDelete(c.id)} disabled={busy}>
                  Slett
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={handleCreate} style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ny kategori"
          className="calc-input"
        />
        <button type="submit" className="button primary" disabled={busy}>
          Legg til
        </button>
      </form>
    </div>
  );
}
