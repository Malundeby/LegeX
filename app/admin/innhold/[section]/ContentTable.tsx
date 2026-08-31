"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ContentItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  description: string | null;
  url: string | null;
  category_id: string | null;
  category_name: string | null;
  sort_order: number;
  published_at: string | null;
  archived_at: string | null;
  open_count: number;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

const NO_CONTENT_TYPES = new Set(["tool", "calculator", "quiz"]);

export default function ContentTable({
  section,
  initialItems,
  categories,
}: {
  section: string;
  initialItems: ContentItem[];
  categories: Category[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette dette elementet permanent?")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/content?id=${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Sletting feilet");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleTogglePublished(item: ContentItem) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, published: !item.published_at }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Oppdatering feilet");
      return;
    }
    const { item: updated } = await res.json();
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, published_at: updated.published_at } : i)));
  }

  return (
    <div style={{ marginTop: 16 }}>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      <button type="button" className="tool-action" onClick={() => setCreating(true)} disabled={creating}>
        + Legg til
      </button>

      {creating && (
        <ContentForm
          section={section}
          categories={categories}
          onCancel={() => setCreating(false)}
          onSaved={(item) => {
            setItems((prev) => [...prev, { ...item, category_name: null, open_count: 0 }]);
            setCreating(false);
            refresh();
          }}
        />
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid var(--border)" }}>
            <th style={{ padding: 8 }}>Tittel</th>
            <th style={{ padding: 8 }}>Kategori</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Åpninger</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) =>
            editingId === item.id ? (
              <tr key={item.id}>
                <td colSpan={5}>
                  <ContentForm
                    section={section}
                    categories={categories}
                    item={item}
                    onCancel={() => setEditingId(null)}
                    onSaved={(updated) => {
                      setItems((prev) =>
                        prev.map((i) =>
                          i.id === item.id
                            ? {
                                ...i,
                                ...updated,
                                category_name:
                                  categories.find((c) => c.id === updated.category_id)?.name ?? null,
                              }
                            : i
                        )
                      );
                      setEditingId(null);
                      refresh();
                    }}
                  />
                </td>
              </tr>
            ) : (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ padding: 8 }}>{item.title}</td>
                <td style={{ padding: 8 }}>{item.category_name ?? "—"}</td>
                <td style={{ padding: 8 }}>
                  <button
                    type="button"
                    className="tool-view-button"
                    onClick={() => handleTogglePublished(item)}
                    disabled={busy}
                  >
                    {item.published_at ? "Publisert" : "Upublisert"}
                  </button>
                </td>
                <td style={{ padding: 8 }}>{item.open_count}</td>
                <td style={{ padding: 8, display: "flex", gap: 8 }}>
                  <button type="button" className="tool-view-button" onClick={() => setEditingId(item.id)}>
                    Rediger
                  </button>
                  <button
                    type="button"
                    className="tool-view-button"
                    onClick={() => handleDelete(item.id)}
                    disabled={busy}
                  >
                    Slett
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function ContentForm({
  section,
  categories,
  item,
  onCancel,
  onSaved,
}: {
  section: string;
  categories: Category[];
  item?: ContentItem;
  onCancel: () => void;
  onSaved: (item: any) => void;
}) {
  const isNoContentType = item ? NO_CONTENT_TYPES.has(item.type) : false;
  const [title, setTitle] = useState(item?.title ?? "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? "");
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0);
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [type, setType] = useState(item?.type ?? "link");
  const [published, setPublished] = useState(item ? Boolean(item.published_at) : true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = item
      ? {
          id: item.id,
          title,
          category_id: categoryId || null,
          sort_order: Number(sortOrder),
          published,
          ...(isNoContentType ? {} : { description, url }),
        }
      : {
          section,
          category_id: categoryId || null,
          type,
          slug,
          title,
          description,
          url,
          sort_order: Number(sortOrder),
          published,
        };

    const res = await fetch("/api/admin/content", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFormError(body.error ?? "Lagring feilet");
      return;
    }
    const { item: saved } = await res.json();
    onSaved(saved);
  }

  return (
    <form onSubmit={handleSubmit} className="calc-card" style={{ marginTop: 12, display: "grid", gap: 10 }}>
      {formError && <p style={{ color: "#b91c1c" }}>{formError}</p>}
      <label>
        Tittel
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="calc-input" />
      </label>

      {!item && (
        <>
          <label>
            Slug
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="calc-input" />
          </label>
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value)} className="calc-select">
              <option value="link">Lenke</option>
              <option value="document">Dokument</option>
              <option value="tool">Verktøy</option>
              <option value="calculator">Kalkulator</option>
              <option value="quiz">Quiz</option>
            </select>
          </label>
        </>
      )}

      <label>
        Kategori
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="calc-select">
          <option value="">Ingen</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Rekkefølge
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="calc-input"
        />
      </label>

      {!isNoContentType && (
        <>
          <label>
            Beskrivelse
            <input value={description ?? ""} onChange={(e) => setDescription(e.target.value)} className="calc-input" />
          </label>
          <label>
            URL
            <input value={url ?? ""} onChange={(e) => setUrl(e.target.value)} className="calc-input" />
          </label>
        </>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Publisert
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="button primary" disabled={saving}>
          {saving ? "Lagrer…" : "Lagre"}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Avbryt
        </button>
      </div>
    </form>
  );
}
