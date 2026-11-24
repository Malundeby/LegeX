"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { titleFromFilename } from "@/app/utils/slugify";
import PdfHoverPreview from "@/app/components/PdfHoverPreview";

export interface ContentItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  description: string | null;
  url: string | null;
  category_id: string | null;
  sort_order: number;
  published_at: string | null;
  archived_at: string | null;
  open_count: number;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

type GroupKey = string; // category id, or NONE for items without category
const NONE = "__none__";

interface Group {
  key: GroupKey;
  ids: string[];
}

interface QueuedFile {
  key: string;
  file: File;
  title: string;
  groupKey: GroupKey;
  status: "klar" | "laster" | "ferdig" | "feil";
  error?: string;
  previewUrl: string;
}

interface PreviewTarget {
  title: string;
  url: string;
  isPdf?: boolean;
}

const NO_CONTENT_TYPES = new Set(["tool", "calculator", "quiz"]);
const FILE_SECTIONS = new Set(["Verktøy", "Pasientinformasjon", "Oversikter"]);
const TYPE_LABEL: Record<string, string> = {
  document: "PDF/dokument",
  link: "Lenke",
  tool: "Verktøy",
  calculator: "Kalkulator",
  quiz: "Quiz",
};

function buildGroups(items: ContentItem[], categories: Category[]): Group[] {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "nb"));
  const groups: Group[] = categories.map((c) => ({
    key: c.id,
    ids: sorted.filter((i) => i.category_id === c.id).map((i) => i.id),
  }));
  const known = new Set(categories.map((c) => c.id));
  groups.push({ key: NONE, ids: sorted.filter((i) => !i.category_id || !known.has(i.category_id)).map((i) => i.id) });
  return groups;
}

function isPdfLike(url: string) {
  return /\.pdf($|\?)/i.test(url) || url.includes("/storage/v1/object/public/");
}

export default function ContentManager({
  section,
  initialItems,
  categories: initialCategories,
}: {
  section: string;
  initialItems: ContentItem[];
  categories: Category[];
}) {
  const [itemsById, setItemsById] = useState<Record<string, ContentItem>>(() =>
    Object.fromEntries(initialItems.map((i) => [i.id, i]))
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    [...initialCategories].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [groups, setGroups] = useState<Group[]>(() => buildGroups(initialItems, initialCategories));
  const [savedGroups, setSavedGroups] = useState<Group[]>(groups);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [showPublicPreview, setShowPublicPreview] = useState(false);
  const [filter, setFilter] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const catName = (key: GroupKey) =>
    key === NONE ? "Uten kategori" : categories.find((c) => c.id === key)?.name ?? "Ukjent kategori";

  // Keep group list in the same order as categories, adding/removing as needed.
  useEffect(() => {
    setGroups((prev) => {
      const byKey = new Map(prev.map((g) => [g.key, g]));
      const next = categories.map((c) => byKey.get(c.id) ?? { key: c.id, ids: [] });
      next.push(byKey.get(NONE) ?? { key: NONE, ids: [] });
      return next;
    });
  }, [categories]);

  // Warn before leaving with unsaved ordering.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function flash(kind: "ok" | "error", text: string) {
    setMessage({ kind, text });
    if (kind === "ok") window.setTimeout(() => setMessage((m) => (m?.text === text ? null : m)), 3500);
  }

  // ---------- ordering ----------

  function moveItem(id: string, toKey: GroupKey, toIndex: number) {
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, ids: g.ids.filter((x) => x !== id) }));
      const target = next.find((g) => g.key === toKey);
      if (!target) return prev;
      const fromGroup = prev.find((g) => g.ids.includes(id));
      let index = toIndex;
      // Adjust when moving down within the same group.
      if (fromGroup?.key === toKey) {
        const oldIndex = fromGroup.ids.indexOf(id);
        if (oldIndex < toIndex) index -= 1;
      }
      index = Math.max(0, Math.min(index, target.ids.length));
      target.ids.splice(index, 0, id);
      return next;
    });
    setDirty(true);
  }

  function nudge(id: string, delta: -1 | 1) {
    const g = groups.find((x) => x.ids.includes(id));
    if (!g) return;
    const i = g.ids.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= g.ids.length) {
      // Jump to the neighbouring category (end of previous / start of next).
      const gi = groups.findIndex((x) => x.key === g.key);
      const neighbour = groups[gi + delta];
      if (!neighbour) return;
      moveItem(id, neighbour.key, delta < 0 ? neighbour.ids.length : 0);
      return;
    }
    moveItem(id, g.key, delta > 0 ? j + 1 : j);
  }

  function nudgeCategory(key: GroupKey, delta: -1 | 1) {
    setCategories((prev) => {
      const i = prev.findIndex((c) => c.id === key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  }

  function sortGroupAlphabetically(key: GroupKey) {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === key
          ? { ...g, ids: [...g.ids].sort((a, b) => itemsById[a].title.localeCompare(itemsById[b].title, "nb")) }
          : g
      )
    );
    setDirty(true);
  }

  async function saveOrder() {
    setSaving(true);
    const items = groups.flatMap((g) =>
      g.ids.map((id, index) => ({ id, category_id: g.key === NONE ? null : g.key, sort_order: index }))
    );
    const cats = categories.map((c, index) => ({ id: c.id, sort_order: index }));
    const res = await fetch("/api/admin/content/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, categories: cats }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      flash("error", `Kunne ikke lagre rekkefølgen: ${body.error ?? res.status}`);
      return;
    }
    setItemsById((prev) => {
      const next = { ...prev };
      for (const it of items) next[it.id] = { ...next[it.id], category_id: it.category_id, sort_order: it.sort_order };
      return next;
    });
    setCategories((prev) => prev.map((c, i) => ({ ...c, sort_order: i })));
    setSavedGroups(groups);
    setDirty(false);
    flash("ok", "Rekkefølgen er lagret og vises nå på siden.");
  }

  function undoOrder() {
    setGroups(savedGroups);
    setCategories((prev) => [...prev].sort((a, b) => a.sort_order - b.sort_order));
    setDirty(false);
  }

  // ---------- drag and drop (desktop) ----------

  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ key: GroupKey; index: number } | null>(null);

  function onRowDragOver(e: React.DragEvent, key: GroupKey, index: number) {
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    const target = { key, index: after ? index + 1 : index };
    if (!dropAt || dropAt.key !== target.key || dropAt.index !== target.index) setDropAt(target);
  }

  function onGroupDragOver(e: React.DragEvent, key: GroupKey, length: number) {
    if (!dragId) return;
    e.preventDefault();
    if (!dropAt || dropAt.key !== key) setDropAt({ key, index: length });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (dragId && dropAt) moveItem(dragId, dropAt.key, dropAt.index);
    setDragId(null);
    setDropAt(null);
  }

  // ---------- item actions ----------

  async function patchItem(id: string, fields: Record<string, unknown>) {
    const res = await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Oppdatering feilet");
    }
    const { item } = await res.json();
    setItemsById((prev) => ({ ...prev, [id]: { ...prev[id], ...item } }));
    return item as ContentItem;
  }

  async function togglePublished(item: ContentItem) {
    try {
      await patchItem(item.id, { published: !item.published_at });
    } catch (err) {
      flash("error", (err as Error).message);
    }
  }

  async function deleteItem(item: ContentItem) {
    if (!confirm(`Slette «${item.title}» permanent?\n\nVil du bare skjule det, bruk «Skjult» i stedet.`)) return;
    const res = await fetch(`/api/admin/content?id=${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      flash("error", "Sletting feilet");
      return;
    }
    setGroups((prev) => prev.map((g) => ({ ...g, ids: g.ids.filter((x) => x !== item.id) })));
    setSavedGroups((prev) => prev.map((g) => ({ ...g, ids: g.ids.filter((x) => x !== item.id) })));
    setItemsById((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    flash("ok", `«${item.title}» er slettet.`);
  }

  function addCreatedItem(item: ContentItem, key: GroupKey) {
    setItemsById((prev) => ({ ...prev, [item.id]: { ...item, open_count: 0 } }));
    const append = (gs: Group[]) => gs.map((g) => (g.key === key ? { ...g, ids: [...g.ids, item.id] } : g));
    setGroups(append);
    setSavedGroups(append);
  }

  async function createCategory(name: string): Promise<GroupKey | null> {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, name, sort_order: categories.length }),
    });
    if (!res.ok) {
      flash("error", "Kunne ikke opprette kategori");
      return null;
    }
    const { category } = await res.json();
    setCategories((prev) => [...prev, category]);
    const add = (gs: Group[]) => {
      const none = gs.find((g) => g.key === NONE);
      const rest = gs.filter((g) => g.key !== NONE);
      return [...rest, { key: category.id, ids: [] }, ...(none ? [none] : [])];
    };
    setGroups(add);
    setSavedGroups(add);
    return category.id;
  }

  // ---------- rendering ----------

  const q = filter.trim().toLowerCase();
  const matches = (id: string) => !q || itemsById[id]?.title.toLowerCase().includes(q);
  const totalCount = Object.keys(itemsById).length;
  const hiddenCount = Object.values(itemsById).filter((i) => !i.published_at || i.archived_at).length;

  return (
    <div className="adm">
      {message && (
        <div className={`adm-flash ${message.kind}`} role="status">
          {message.text}
          <button type="button" onClick={() => setMessage(null)} aria-label="Lukk">
            ×
          </button>
        </div>
      )}

      {FILE_SECTIONS.has(section) && (
        <UploadPanel
          section={section}
          categories={categories}
          onCreateCategory={createCategory}
          onCreated={addCreatedItem}
          onPreview={setPreview}
          flash={flash}
        />
      )}

      <div className="adm-toolbar">
        <input
          className="calc-input adm-search"
          placeholder={`Søk i ${totalCount} elementer…`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="tool-action" onClick={() => setAddingLink((v) => !v)}>
          + Lenke
        </button>
        <button
          type="button"
          className="tool-action"
          onClick={async () => {
            const name = prompt("Navn på ny kategori:");
            if (name?.trim()) await createCategory(name.trim());
          }}
        >
          + Kategori
        </button>
        <button
          type="button"
          className={`tool-action${showPublicPreview ? " active" : ""}`}
          onClick={() => setShowPublicPreview((v) => !v)}
        >
          {showPublicPreview ? "Tilbake til redigering" : "👁 Slik ser brukerne det"}
        </button>
      </div>

      {addingLink && (
        <LinkForm
          section={section}
          categories={categories}
          onCancel={() => setAddingLink(false)}
          onCreated={(item, key) => {
            addCreatedItem(item, key);
            setAddingLink(false);
            flash("ok", `«${item.title}» er lagt til.`);
          }}
        />
      )}

      {showPublicPreview ? (
        <PublicPreview groups={groups} itemsById={itemsById} catName={catName} dirty={dirty} onOpen={setPreview} />
      ) : (
        <>
          <p className="adm-hint">
            Dra i ⠿ for å flytte, også mellom kategorier. På mobil bruker du pilene. Endringer i rekkefølge lagres
            først når du trykker «Lagre rekkefølge».
            {hiddenCount > 0 && ` ${hiddenCount} elementer er skjult for brukerne.`}
          </p>

          {groups.map((g, gi) => {
            if (g.key === NONE && g.ids.length === 0) return null;
            const visibleIds = g.ids.filter(matches);
            if (q && visibleIds.length === 0) return null;
            const catIndex = categories.findIndex((c) => c.id === g.key);
            return (
              <section
                key={g.key}
                className={`adm-group${dropAt?.key === g.key ? " drop-target" : ""}`}
                onDragOver={(e) => onGroupDragOver(e, g.key, g.ids.length)}
                onDrop={onDrop}
              >
                <div className="adm-group-head">
                  <h3>
                    {catName(g.key)} <span className="adm-count">{g.ids.length}</span>
                  </h3>
                  <div className="adm-group-actions">
                    {g.key !== NONE && (
                      <>
                        <button
                          type="button"
                          className="adm-icon"
                          title="Flytt kategorien opp"
                          disabled={catIndex <= 0}
                          onClick={() => nudgeCategory(g.key, -1)}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="adm-icon"
                          title="Flytt kategorien ned"
                          disabled={catIndex === categories.length - 1}
                          onClick={() => nudgeCategory(g.key, 1)}
                        >
                          ▼
                        </button>
                      </>
                    )}
                    {g.ids.length > 1 && (
                      <button type="button" className="adm-link" onClick={() => sortGroupAlphabetically(g.key)}>
                        Sorter A–Å
                      </button>
                    )}
                  </div>
                </div>

                {g.ids.length === 0 && <div className="adm-empty">Tom. Dra elementer hit.</div>}

                <ol className="adm-list">
                  {g.ids.map((id, index) => {
                    const item = itemsById[id];
                    if (!item || !matches(id)) return null;
                    const hidden = !item.published_at || Boolean(item.archived_at);
                    const showLineBefore = dropAt?.key === g.key && dropAt.index === index && dragId !== id;
                    return (
                      <li key={id}>
                        {showLineBefore && <div className="adm-drop-line" />}
                        <div
                          className={`adm-row${hidden ? " is-hidden" : ""}${dragId === id ? " is-dragging" : ""}`}
                          draggable={editingId !== id}
                          onDragStart={(e) => {
                            setDragId(id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", id);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setDropAt(null);
                          }}
                          onDragOver={(e) => onRowDragOver(e, g.key, index)}
                          onDrop={onDrop}
                        >
                          <span className="adm-handle" title="Dra for å flytte" aria-hidden>
                            ⠿
                          </span>
                          <span className="adm-pos">{index + 1}</span>
                          <div className="adm-main">
                            <div className="adm-title">{item.title}</div>
                            <div className="adm-meta">
                              <span>{TYPE_LABEL[item.type] ?? item.type}</span>
                              {item.open_count > 0 && <span>{item.open_count} åpninger</span>}
                              {item.description && <span className="adm-desc">{item.description}</span>}
                            </div>
                          </div>
                          <div className="adm-actions">
                            <button
                              type="button"
                              className={`adm-pill${hidden ? " off" : " on"}`}
                              onClick={() => togglePublished(item)}
                              title={hidden ? "Skjult for brukerne. Trykk for å vise." : "Synlig for brukerne. Trykk for å skjule."}
                            >
                              {item.archived_at ? "Arkivert" : hidden ? "Skjult" : "Synlig"}
                            </button>
                            {item.url && (
                              <button
                                type="button"
                                className="adm-icon"
                                title="Forhåndsvis"
                                onClick={() => setPreview({ title: item.title, url: item.url! })}
                              >
                                👁
                              </button>
                            )}
                            <button
                              type="button"
                              className="adm-icon"
                              title="Flytt opp"
                              disabled={gi === 0 && index === 0}
                              onClick={() => nudge(id, -1)}
                            >
                              ▲
                            </button>
                            <button type="button" className="adm-icon" title="Flytt ned" onClick={() => nudge(id, 1)}>
                              ▼
                            </button>
                            <button
                              type="button"
                              className="adm-icon"
                              title="Rediger"
                              onClick={() => setEditingId(editingId === id ? null : id)}
                            >
                              ✎
                            </button>
                          </div>
                        </div>
                        {editingId === id && (
                          <EditForm
                            section={section}
                            item={item}
                            categories={categories}
                            currentKey={g.key}
                            onCancel={() => setEditingId(null)}
                            onDelete={() => deleteItem(item)}
                            onPreview={setPreview}
                            onSave={async (fields, newKey) => {
                              await patchItem(id, fields);
                              if (newKey !== g.key) {
                                const target = groups.find((x) => x.key === newKey);
                                const move = (gs: Group[]) =>
                                  gs.map((x) =>
                                    x.key === g.key
                                      ? { ...x, ids: x.ids.filter((y) => y !== id) }
                                      : x.key === newKey
                                        ? { ...x, ids: [...x.ids, id] }
                                        : x
                                  );
                                setGroups(move);
                                setSavedGroups(move);
                                if (target) {
                                  await patchItem(id, { sort_order: target.ids.length });
                                }
                              }
                              setEditingId(null);
                              flash("ok", "Endringene er lagret.");
                            }}
                          />
                        )}
                      </li>
                    );
                  })}
                  {dropAt?.key === g.key && dropAt.index === g.ids.length && g.ids.length > 0 && (
                    <li>
                      <div className="adm-drop-line" />
                    </li>
                  )}
                </ol>
              </section>
            );
          })}
        </>
      )}

      {dirty && (
        <div className="adm-savebar">
          <span>Du har endret rekkefølgen.</span>
          <button type="button" className="button" onClick={undoOrder} disabled={saving}>
            Angre
          </button>
          <button type="button" className="button primary" onClick={saveOrder} disabled={saving}>
            {saving ? "Lagrer…" : "Lagre rekkefølge"}
          </button>
        </div>
      )}

      {preview && (
        <PreviewModal title={preview.title} url={preview.url} isPdf={preview.isPdf} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

// ======================================================================
// Upload panel: drag files in, adjust titles/category, upload all at once.
// ======================================================================

function UploadPanel({
  section,
  categories,
  onCreateCategory,
  onCreated,
  onPreview,
  flash,
}: {
  section: string;
  categories: Category[];
  onCreateCategory: (name: string) => Promise<GroupKey | null>;
  onCreated: (item: ContentItem, key: GroupKey) => void;
  onPreview: (p: PreviewTarget) => void;
  flash: (kind: "ok" | "error", text: string) => void;
}) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [defaultKey, setDefaultKey] = useState<GroupKey>(categories[0]?.id ?? NONE);
  const [publish, setPublish] = useState(true);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => queue.forEach((q) => URL.revokeObjectURL(q.previewUrl)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0) return;
    setQueue((prev) => [
      ...prev,
      ...files.map((file) => ({
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        title: titleFromFilename(file.name),
        groupKey: defaultKey,
        status: "klar" as const,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function update(key: string, fields: Partial<QueuedFile>) {
    setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, ...fields } : q)));
  }

  function remove(key: string) {
    setQueue((prev) => {
      const item = prev.find((q) => q.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((q) => q.key !== key);
    });
  }

  async function uploadOne(q: QueuedFile) {
    update(q.key, { status: "laster", error: undefined });
    try {
      const signRes = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, filename: q.file.name }),
      });
      if (!signRes.ok) throw new Error((await signRes.json().catch(() => ({}))).error ?? "Fikk ikke opplastingslenke");
      const { bucket, path, token, publicUrl } = await signRes.json();

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, q.file, { contentType: q.file.type || "application/octet-stream" });
      if (upErr) throw new Error(upErr.message);

      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          category_id: q.groupKey === NONE ? null : q.groupKey,
          type: "document",
          title: q.title.trim() || titleFromFilename(q.file.name),
          url: publicUrl,
          published: publish,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Kunne ikke lagre elementet");
      const { item } = await res.json();
      onCreated(item, q.groupKey);
      update(q.key, { status: "ferdig" });
      return true;
    } catch (err) {
      update(q.key, { status: "feil", error: (err as Error).message });
      return false;
    }
  }

  async function uploadAll() {
    setBusy(true);
    const pending = queue.filter((q) => q.status === "klar" || q.status === "feil");
    let ok = 0;
    for (const q of pending) if (await uploadOne(q)) ok++;
    setBusy(false);
    if (ok > 0) flash("ok", `${ok} ${ok === 1 ? "fil er" : "filer er"} lastet opp${publish ? " og publisert" : " (skjult)"}.`);
    // Clear finished rows after a short moment so the user sees the ✓.
    window.setTimeout(() => setQueue((prev) => prev.filter((x) => x.status !== "ferdig")), 1500);
  }

  async function handleCategoryChange(value: string, apply: (key: GroupKey) => void) {
    if (value === "__new__") {
      const name = prompt("Navn på ny kategori:");
      if (!name?.trim()) return;
      const key = await onCreateCategory(name.trim());
      if (key) apply(key);
      return;
    }
    apply(value);
  }

  const pendingCount = queue.filter((q) => q.status === "klar" || q.status === "feil").length;

  const categoryOptions = (
    <>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
      <option value={NONE}>Uten kategori</option>
      <option value="__new__">+ Ny kategori…</option>
    </>
  );

  return (
    <div className="adm-upload calc-card">
      <div
        className={`adm-dropzone${over ? " over" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files?.length) return;
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      >
        <div className="adm-dropzone-icon">📄</div>
        <strong>Slipp PDF-er her</strong>
        <span>eller trykk for å velge filer. Du kan velge flere samtidig.</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf,.doc,.docx,image/*"
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <>
          <div className="adm-upload-defaults">
            <label>
              Legg alle i
              <select
                className="calc-select"
                value={defaultKey}
                onChange={(e) =>
                  handleCategoryChange(e.target.value, (key) => {
                    setDefaultKey(key);
                    setQueue((prev) => prev.map((q) => (q.status === "ferdig" ? q : { ...q, groupKey: key })));
                  })
                }
              >
                {categoryOptions}
              </select>
            </label>
            <label className="adm-check">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              Vis for brukerne med en gang
            </label>
          </div>

          <ul className="adm-queue">
            {queue.map((q) => (
              <li key={q.key} className={`status-${q.status}`}>
                <button
                  type="button"
                  className="adm-icon"
                  title="Forhåndsvis filen"
                  onClick={() =>
                    onPreview({
                      title: q.title,
                      url: q.previewUrl,
                      isPdf: q.file.type === "application/pdf" || /\.pdf$/i.test(q.file.name),
                    })
                  }
                >
                  👁
                </button>
                <input
                  className="calc-input"
                  value={q.title}
                  onChange={(e) => update(q.key, { title: e.target.value })}
                  disabled={q.status === "laster" || q.status === "ferdig"}
                  aria-label="Tittel"
                />
                <select
                  className="calc-select"
                  value={q.groupKey}
                  onChange={(e) => handleCategoryChange(e.target.value, (key) => update(q.key, { groupKey: key }))}
                  disabled={q.status === "laster" || q.status === "ferdig"}
                  aria-label="Kategori"
                >
                  {categoryOptions}
                </select>
                <span className="adm-qstatus" title={q.error}>
                  {q.status === "klar" && `${(q.file.size / 1024 / 1024).toFixed(1)} MB`}
                  {q.status === "laster" && "Laster opp…"}
                  {q.status === "ferdig" && "✓ Ferdig"}
                  {q.status === "feil" && `Feil: ${q.error}`}
                </span>
                {q.status !== "laster" && q.status !== "ferdig" && (
                  <button type="button" className="adm-icon" title="Fjern" onClick={() => remove(q.key)}>
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="adm-upload-actions">
            <button type="button" className="button" onClick={() => setQueue([])} disabled={busy}>
              Tøm
            </button>
            <button
              type="button"
              className="button primary"
              onClick={uploadAll}
              disabled={busy || pendingCount === 0}
            >
              {busy ? "Laster opp…" : `Last opp ${pendingCount} ${pendingCount === 1 ? "fil" : "filer"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ======================================================================
// Edit form (inline under a row)
// ======================================================================

function EditForm({
  section,
  item,
  categories,
  currentKey,
  onCancel,
  onSave,
  onDelete,
  onPreview,
}: {
  section: string;
  item: ContentItem;
  categories: Category[];
  currentKey: GroupKey;
  onCancel: () => void;
  onSave: (fields: Record<string, unknown>, newKey: GroupKey) => Promise<void>;
  onDelete: () => void;
  onPreview: (p: PreviewTarget) => void;
}) {
  const fixedType = NO_CONTENT_TYPES.has(item.type);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [url, setUrl] = useState(item.url ?? "");
  const [key, setKey] = useState<GroupKey>(currentKey);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function replaceFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const signRes = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, filename: file.name }),
      });
      if (!signRes.ok) throw new Error("Fikk ikke opplastingslenke");
      const { bucket, path, token, publicUrl } = await signRes.json();
      const { error: upErr } = await createClient()
        .storage.from(bucket)
        .uploadToSignedUrl(path, token, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) throw new Error(upErr.message);
      setUrl(publicUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fields: Record<string, unknown> = { title, category_id: key === NONE ? null : key };
      if (!fixedType) {
        fields.description = description || null;
        fields.url = url || null;
      }
      await onSave(fields, key);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form className="adm-edit" onSubmit={submit}>
      {error && <p className="adm-error">{error}</p>}
      <label>
        Tittel
        <input className="calc-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Kategori
        <select className="calc-select" value={key} onChange={(e) => setKey(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NONE}>Uten kategori</option>
        </select>
      </label>
      {!fixedType && (
        <>
          <label>
            Beskrivelse (valgfri)
            <input className="calc-input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            Fil eller lenke
            <div className="adm-url-row">
              <input className="calc-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              <button type="button" className="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Laster opp…" : "Bytt fil…"}
              </button>
              {url && (
                <button type="button" className="button" onClick={() => onPreview({ title, url })}>
                  Forhåndsvis
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="application/pdf,.pdf,.doc,.docx,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) replaceFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </>
      )}
      <div className="adm-edit-actions">
        <button type="button" className="adm-danger" onClick={onDelete}>
          Slett
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" className="button" onClick={onCancel}>
          Avbryt
        </button>
        <button type="submit" className="button primary" disabled={saving || uploading}>
          {saving ? "Lagrer…" : "Lagre"}
        </button>
      </div>
    </form>
  );
}

// ======================================================================
// New link form
// ======================================================================

function LinkForm({
  section,
  categories,
  onCancel,
  onCreated,
}: {
  section: string;
  categories: Category[];
  onCancel: () => void;
  onCreated: (item: ContentItem, key: GroupKey) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [key, setKey] = useState<GroupKey>(categories[0]?.id ?? NONE);
  const [publish, setPublish] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section,
        category_id: key === NONE ? null : key,
        type: isPdfLike(url) ? "document" : "link",
        title,
        url,
        description,
        published: publish,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Lagring feilet");
      return;
    }
    const { item } = await res.json();
    onCreated(item, key);
  }

  return (
    <form className="adm-edit calc-card" onSubmit={submit}>
      <h3 style={{ margin: 0 }}>Ny lenke</h3>
      {error && <p className="adm-error">{error}</p>}
      <label>
        Tittel
        <input className="calc-input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </label>
      <label>
        Adresse
        <input className="calc-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" required />
      </label>
      <label>
        Beskrivelse (valgfri)
        <input className="calc-input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        Kategori
        <select className="calc-select" value={key} onChange={(e) => setKey(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NONE}>Uten kategori</option>
        </select>
      </label>
      <label className="adm-check">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        Vis for brukerne med en gang
      </label>
      <div className="adm-edit-actions">
        <span style={{ flex: 1 }} />
        <button type="button" className="button" onClick={onCancel}>
          Avbryt
        </button>
        <button type="submit" className="button primary" disabled={saving}>
          {saving ? "Lagrer…" : "Legg til"}
        </button>
      </div>
    </form>
  );
}

// ======================================================================
// Previews
// ======================================================================

function PublicPreview({
  groups,
  itemsById,
  catName,
  dirty,
  onOpen,
}: {
  groups: Group[];
  itemsById: Record<string, ContentItem>;
  catName: (key: GroupKey) => string;
  dirty: boolean;
  onOpen: (p: PreviewTarget) => void;
}) {
  const visible = useMemo(
    () =>
      groups
        .map((g) => ({
          key: g.key,
          items: g.ids.map((id) => itemsById[id]).filter((i) => i && i.published_at && !i.archived_at),
        }))
        .filter((g) => g.items.length > 0),
    [groups, itemsById]
  );

  return (
    <div className="adm-public">
      <p className="adm-hint">
        Bare synlige elementer, i rekkefølgen brukerne får dem.
        {dirty && " Viser også ulagrede endringer i rekkefølgen."}
      </p>
      {visible.length === 0 && <p>Ingenting er synlig i denne fanen ennå.</p>}
      {visible.map((g) => (
        <div key={g.key} className="adm-public-group">
          <h4>{g.key === NONE ? "" : catName(g.key)}</h4>
          <div className="adm-public-grid">
            {g.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="adm-public-card"
                onClick={() => item.url && onOpen({ title: item.title, url: item.url })}
              >
                <span className="adm-public-badge">{item.url && isPdfLike(item.url) ? "PDF" : TYPE_LABEL[item.type] ?? ""}</span>
                <strong>{item.title}</strong>
                {item.description && <span>{item.description}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewModal({
  title,
  url,
  isPdf,
  onClose,
}: {
  title: string;
  url: string;
  isPdf?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pdf = isPdf ?? isPdfLike(url);
  const external = /^https?:\/\//.test(url) && !pdf;

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Forhåndsvisning: ${title}`}>
        <div className="adm-modal-head">
          <strong>{title}</strong>
          <a href={url} target="_blank" rel="noopener noreferrer" className="adm-link">
            Åpne i ny fane ↗
          </a>
          <button type="button" className="adm-icon" onClick={onClose} aria-label="Lukk">
            ×
          </button>
        </div>
        {external && (
          <p className="adm-hint" style={{ margin: "8px 12px" }}>
            Noen nettsider tillater ikke visning her. Er feltet under tomt, bruk «Åpne i ny fane».
          </p>
        )}
        {pdf ? (
          <div className="adm-modal-body">
            <PdfHoverPreview url={url} maxPages={10} />
          </div>
        ) : (
          <iframe src={url} title={title} />
        )}
      </div>
    </div>
  );
}
