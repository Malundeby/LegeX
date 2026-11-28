"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "../useProfile";
import { fillSignature } from "@/lib/profile";
import {
  categoryPath,
  descendantIds,
  looksLikePersonalId,
  moveInList,
  normalize,
  searchPhrases,
  type Phrase,
  type PhraseCategory,
  type UserPhrase,
} from "@/app/utils/fraser";
import type { FraserStore } from "./useFraser";

const FAV = "__fav";
const MINE = "__mine";

type Form =
  | { kind: "suggest"; phraseId?: string; categoryId?: string }
  | { kind: "phrase"; id?: string; categoryId: string }
  | { kind: "category"; id?: string; parentId: string | null }
  | { kind: "mine"; id?: string };

interface Props {
  store: FraserStore;
  mode: "page" | "pip";
  collapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
}

export default function FrasePanel({ store, mode, collapsed, onCollapse, onExpand }: Props) {
  const { name: signerName, signature: signerSignature } = useProfile();
  const { index, isAdmin, userId, favorites, userPhrases } = store;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState(800);
  const [path, setPath] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>();

  const win = () => rootRef.current?.ownerDocument.defaultView ?? window;

  // Track our own width (works inside the floating window too).
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const RO = (el.ownerDocument.defaultView as (Window & typeof globalThis) | null)?.ResizeObserver ?? ResizeObserver;
    const ro = new RO(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [collapsed]);

  // "/" jumps to search.
  useEffect(() => {
    const doc = rootRef.current?.ownerDocument;
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
      if (e.key === "/" && !typing && !form) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    doc.addEventListener("keydown", onKey);
    return () => doc.removeEventListener("keydown", onKey);
  }, [form, collapsed]);

  // Drop path entries that no longer exist (after deletes or login changes).
  useEffect(() => {
    setPath((p) => {
      const valid: string[] = [];
      for (const id of p) {
        if (id === FAV || id === MINE ? !userId || valid.length > 0 : !index.categories.has(id)) break;
        valid.push(id);
      }
      return valid.length === p.length ? p : valid;
    });
  }, [index, userId]);

  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    clearTimeout(confirmTimer.current);
  }, []);

  function flash(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1500);
  }

  async function copy(title: string, rawText: string) {
    const text = fillSignature(rawText, signerName, signerSignature);
    const w = win();
    let ok = false;
    try {
      await w.navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const doc = w.document;
      const ta = doc.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      doc.body.appendChild(ta);
      ta.select();
      try {
        ok = doc.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    flash(ok ? `Kopiert: ${title}` : "Kunne ikke kopiere");
  }

  function askConfirm(id: string): boolean {
    if (confirm === id) {
      setConfirm(null);
      return true;
    }
    setConfirm(id);
    clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirm(null), 3000);
    return false;
  }

  async function admin(body: Record<string, unknown>, okMsg?: string) {
    const err = await store.adminAction(body);
    flash(err ?? okMsg ?? "Lagret");
    return err;
  }

  async function move(table: "categories" | "phrases", siblings: string[], id: string, dir: -1 | 1) {
    const order = moveInList(siblings, id, dir);
    if (!order) return;
    store.reorderLocal(table, order);
    await admin({ action: "reorder", table, order }, "Rekkefølge lagret");
  }

  // ---------- derived ----------
  const last = path[path.length - 1] ?? null;
  const lastCat = last && last !== FAV && last !== MINE ? index.categories.get(last) ?? null : null;
  const results = useMemo(() => (q.trim() ? searchPhrases(index, q) : []), [index, q]);
  const mineResults = useMemo(() => {
    const words = normalize(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return userPhrases.filter((p) => {
      const h = normalize(`${p.title} ${p.body}`);
      return words.every((w) => h.includes(w));
    });
  }, [q, userPhrases]);

  const childrenOf = (id: string | null) => index.children.get(id) ?? [];
  const hasChildren = (id: string) => childrenOf(id).length > 0;

  // ---------- pieces ----------
  function catItem(c: PhraseCategory, selected: boolean, onOpen: () => void) {
    const siblings = childrenOf(c.parent_id && index.categories.has(c.parent_id) ? c.parent_id : null).map((x) => x.id);
    return (
      <div key={c.id} className={`fk-item${selected ? " sel" : ""}`} onClick={onOpen} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}>
        <span className="fk-name">{c.name}</span>
        {isAdmin ? (
          <span className="fk-acts" onClick={(e) => e.stopPropagation()}>
            <button className="fk-ic" title="Flytt opp" onClick={() => move("categories", siblings, c.id, -1)}>↑</button>
            <button className="fk-ic" title="Flytt ned" onClick={() => move("categories", siblings, c.id, 1)}>↓</button>
            <button className="fk-ic" title="Endre kategori" onClick={() => setForm({ kind: "category", id: c.id, parentId: c.parent_id })}>✎</button>
            <button
              className={`fk-ic del${confirm === c.id ? " confirm" : ""}`}
              title="Slett kategori med alt innhold"
              onClick={async () => {
                if (askConfirm(c.id)) await admin({ action: "deleteCategory", id: c.id }, "Kategori slettet");
              }}
            >
              {confirm === c.id ? "Slett?" : "✕"}
            </button>
          </span>
        ) : null}
        <span className="fk-n">
          {index.counts.get(c.id) ?? 0}
          {hasChildren(c.id) ? " ›" : ""}
        </span>
      </div>
    );
  }

  function specialItem(id: string, label: string, n: number, selected: boolean, onOpen: () => void) {
    return (
      <div key={id} className={`fk-item special${selected ? " sel" : ""}`} onClick={onOpen} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}>
        <span className="fk-name">{label}</span>
        <span className="fk-n">{n}</span>
      </div>
    );
  }

  function rootItems(selected: string | undefined, open: (id: string) => void) {
    return (
      <>
        {userId && (
          <>
            {specialItem(FAV, "★ Favoritter", favorites.size, selected === FAV, () => open(FAV))}
            {specialItem(MINE, "Mine fraser", userPhrases.length, selected === MINE, () => open(MINE))}
            <div className="fk-sep" />
          </>
        )}
        {childrenOf(null).map((c) => catItem(c, selected === c.id, () => open(c.id)))}
        {isAdmin && (
          <button className="fk-add" onClick={() => setForm({ kind: "category", parentId: null })}>+ Ny kategori</button>
        )}
        {!userId && (
          <p className="fk-hint">
            <a href="/login" target={mode === "pip" ? "_blank" : undefined} rel="noreferrer">Logg inn</a> for favoritter og egne fraser.
          </p>
        )}
      </>
    );
  }

  function phraseItem(p: Phrase, showPath: boolean) {
    const fav = favorites.has(p.id);
    const siblings = (index.phrases.get(p.category_id) ?? []).map((x) => x.id);
    return (
      <div key={p.id} className="fk-ph" onClick={() => copy(p.title, p.body)} title="Klikk for å kopiere">
        {showPath && <div className="fk-ph-p">{categoryPath(index, p.category_id).join(" › ")}</div>}
        <div className="fk-ph-t">
          <span>{p.title}</span>
          <span className="fk-acts" onClick={(e) => e.stopPropagation()}>
            {userId && (
              <button className={`fk-ic${fav ? " on" : ""}`} title={fav ? "Fjern fra favoritter" : "Legg til i favoritter"}
                onClick={() => store.toggleFavorite(p.id)}>
                {fav ? "★" : "☆"}
              </button>
            )}
            {isAdmin ? (
              <>
                {!showPath && (
                  <>
                    <button className="fk-ic" title="Flytt opp" onClick={() => move("phrases", siblings, p.id, -1)}>↑</button>
                    <button className="fk-ic" title="Flytt ned" onClick={() => move("phrases", siblings, p.id, 1)}>↓</button>
                  </>
                )}
                <button className="fk-ic" title="Rediger" onClick={() => setForm({ kind: "phrase", id: p.id, categoryId: p.category_id })}>✎</button>
                <button
                  className={`fk-ic del${confirm === p.id ? " confirm" : ""}`}
                  title="Slett frase"
                  onClick={async () => {
                    if (askConfirm(p.id)) await admin({ action: "deletePhrase", id: p.id }, "Frase slettet");
                  }}
                >
                  {confirm === p.id ? "Slett?" : "✕"}
                </button>
              </>
            ) : (
              <button className="fk-ic" title="Foreslå endring" onClick={() => setForm({ kind: "suggest", phraseId: p.id })}>✎</button>
            )}
          </span>
        </div>
        <div className="fk-ph-x">{p.body}</div>
      </div>
    );
  }

  function mineItem(p: UserPhrase, showLabel: boolean) {
    return (
      <div key={p.id} className="fk-ph" onClick={() => copy(p.title, p.body)} title="Klikk for å kopiere">
        {showLabel && <div className="fk-ph-p">Mine fraser</div>}
        <div className="fk-ph-t">
          <span>{p.title}</span>
          <span className="fk-acts" onClick={(e) => e.stopPropagation()}>
            <button className="fk-ic" title="Rediger" onClick={() => setForm({ kind: "mine", id: p.id })}>✎</button>
            <button
              className={`fk-ic del${confirm === p.id ? " confirm" : ""}`}
              title="Slett"
              onClick={async () => {
                if (askConfirm(p.id)) flash((await store.deleteUserPhrase(p.id)) ?? "Slettet");
              }}
            >
              {confirm === p.id ? "Slett?" : "✕"}
            </button>
          </span>
        </div>
        <div className="fk-ph-x">{p.body}</div>
      </div>
    );
  }

  function phrasePane() {
    if (!last) return <div className="fk-empty">Velg en kategori, eller søk etter en frase.</div>;
    if (last === FAV) {
      const list = [...favorites].map((id) => index.phraseById.get(id)).filter((p): p is Phrase => Boolean(p));
      list.sort((a, b) => a.title.localeCompare(b.title, "nb"));
      return list.length ? (
        <>{list.map((p) => phraseItem(p, true))}</>
      ) : (
        <div className="fk-empty">Ingen favoritter ennå. Trykk ☆ på en frase for å legge den til.</div>
      );
    }
    if (last === MINE) {
      return (
        <>
          {userPhrases.length === 0 && <div className="fk-empty">Du har ingen egne fraser ennå. Bare du ser dem.</div>}
          {userPhrases.map((p) => mineItem(p, false))}
          <button className="fk-add" onClick={() => setForm({ kind: "mine" })}>+ Ny egen frase</button>
        </>
      );
    }
    if (!lastCat) return null;
    const list = index.phrases.get(lastCat.id) ?? [];
    return (
      <>
        {list.length === 0 && (
          <div className="fk-empty">{hasChildren(lastCat.id) ? "Velg en underkategori." : "Ingen fraser her ennå."}</div>
        )}
        {list.map((p) => phraseItem(p, false))}
        {isAdmin ? (
          <>
            <button className="fk-add" onClick={() => setForm({ kind: "phrase", categoryId: lastCat.id })}>+ Ny frase i {lastCat.name}</button>
            <button className="fk-add" onClick={() => setForm({ kind: "category", parentId: lastCat.id })}>+ Ny underkategori</button>
          </>
        ) : list.length > 0 || !hasChildren(lastCat.id) ? (
          <button className="fk-add" onClick={() => setForm({ kind: "suggest", categoryId: lastCat.id })}>Foreslå ny frase her</button>
        ) : null}
      </>
    );
  }

  // ---------- layout ----------
  function body() {
    if (form)
      return (
        <FormView
          key={JSON.stringify(form)}
          form={form}
          store={store}
          onClose={() => setForm(null)}
          onDone={(msg) => {
            setForm(null);
            flash(msg);
          }}
        />
      );
    if (store.loading) return <div className="fk-empty">Laster fraser…</div>;
    if (store.error) return <div className="fk-empty">{store.error}</div>;

    if (q.trim()) {
      const total = results.length + mineResults.length;
      return (
        <div className="fk-col wide">
          {total === 0 && <div className="fk-empty">Ingen treff</div>}
          {mineResults.map((p) => mineItem(p, true))}
          {results.map((p) => phraseItem(p, true))}
        </div>
      );
    }

    // Columns: root, then one per selected category that has children.
    const cols: { parent: string | null; level: number }[] = [{ parent: null, level: 0 }];
    path.forEach((id, i) => {
      if (id !== FAV && id !== MINE && hasChildren(id)) cols.push({ parent: id, level: i + 1 });
    });

    const fit = Math.floor((width - 250) / 165);
    if (fit < 1) {
      // Narrow: one list at a time — children of the current node, then its phrases.
      const open = (id: string) => setPath([...path, id]);
      return (
        <div className="fk-col wide">
          {!last ? (
            rootItems(undefined, open)
          ) : (
            <>
              {lastCat && childrenOf(lastCat.id).map((c) => catItem(c, false, () => open(c.id)))}
              {lastCat && hasChildren(lastCat.id) && (index.phrases.get(lastCat.id)?.length ?? 0) > 0 && <div className="fk-sep" />}
              {phrasePane()}
            </>
          )}
        </div>
      );
    }

    const shown = cols.slice(Math.max(0, cols.length - fit));
    return (
      <>
        {shown.map(({ parent, level }) => {
          const open = (id: string) => setPath([...path.slice(0, level), id]);
          return (
            <div key={parent ?? "root"} className="fk-col">
              {parent === null ? (
                rootItems(path[0], open)
              ) : (
                <>
                  {childrenOf(parent).map((c) => catItem(c, path[level] === c.id, () => open(c.id)))}
                  {isAdmin && (
                    <button className="fk-add" onClick={() => setForm({ kind: "category", parentId: parent })}>+ Ny kategori</button>
                  )}
                </>
              )}
            </div>
          );
        })}
        <div className="fk-col wide">{phrasePane()}</div>
      </>
    );
  }

  function crumbs() {
    if (form) {
      const titles: Record<Form["kind"], string> = {
        suggest: form.kind === "suggest" && form.phraseId ? "Foreslå endring" : "Foreslå ny frase",
        phrase: form.kind === "phrase" && form.id ? "Rediger frase" : "Ny frase",
        category: form.kind === "category" && form.id ? "Endre kategori" : "Ny kategori",
        mine: form.kind === "mine" && form.id ? "Rediger egen frase" : "Ny egen frase",
      };
      return (
        <>
          <button onClick={() => setForm(null)}>‹ Tilbake</button>
          <b>{titles[form.kind]}</b>
        </>
      );
    }
    if (q.trim()) {
      return (
        <>
          <b>Søk</b>
          <span>
            {results.length + mineResults.length} treff · Enter kopierer første
          </span>
        </>
      );
    }
    const label = (id: string) => (id === FAV ? "Favoritter" : id === MINE ? "Mine fraser" : index.categories.get(id)?.name ?? "");
    return (
      <>
        <button onClick={() => setPath([])}>Katalog</button>
        {path.map((id, i) => (
          <span key={id} style={{ display: "contents" }}>
            <span aria-hidden="true">›</span>
            {i === path.length - 1 ? <b>{label(id)}</b> : <button onClick={() => setPath(path.slice(0, i + 1))}>{label(id)}</button>}
          </span>
        ))}
      </>
    );
  }

  if (collapsed) {
    return (
      <div className="fk fk-mini-wrap" ref={rootRef}>
        <button className="fk-round" onClick={onExpand} title="Åpne frasekatalogen" aria-label="Åpne frasekatalogen">
          <span aria-hidden="true">☰</span>
          <small>Fraser</small>
        </button>
      </div>
    );
  }

  return (
    <div className="fk" ref={rootRef}>
      {mode === "pip" && (
        <button type="button" className="fk-titlebar" onClick={onCollapse} title="Minimer til en liten runding (Esc)">
          <span>Fraser</span>
          <span aria-hidden="true">▁</span>
        </button>
      )}
      <div className="fk-top">
        <input
          ref={searchRef}
          className="fk-search"
          placeholder="Søk i alle fraser"
          aria-label="Søk i fraser"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (form) setForm(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const first = mineResults[0] ?? results[0];
              if (first) copy(first.title, first.body);
            }
            if (e.key === "Escape") {
              if (q) setQ("");
              else onCollapse?.();
            }
          }}
        />
      </div>
      <div className="fk-crumb">
        {crumbs()}
        {isAdmin && store.pending > 0 && !form && (
          <>
            <span className="fk-spacer" />
            <a href="/admin/fraser" target={mode === "pip" ? "_blank" : undefined} rel="noreferrer">
              {store.pending} nye forslag
            </a>
          </>
        )}
      </div>
      <div className="fk-body">{body()}</div>
      <div className={`fk-toast${toast ? " show" : ""}`} role="status">{toast}</div>
    </div>
  );
}

function FormView({
  form,
  store,
  onClose,
  onDone,
}: {
  form: Form;
  store: FraserStore;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const { index, userPhrases } = store;
  const phrase = form.kind === "phrase" || form.kind === "suggest" ? index.phraseById.get((form as { id?: string; phraseId?: string }).id ?? (form as { phraseId?: string }).phraseId ?? "") : undefined;
  const mine = form.kind === "mine" && form.id ? userPhrases.find((p) => p.id === form.id) : undefined;
  const cat = form.kind === "category" && form.id ? index.categories.get(form.id) : undefined;

  const [title, setTitle] = useState(phrase?.title ?? mine?.title ?? "");
  const [text, setText] = useState(phrase?.body ?? mine?.body ?? "");
  const [name, setName] = useState(cat?.name ?? "");
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");
  const [categoryId, setCategoryId] = useState(form.kind === "phrase" ? form.categoryId : "");
  const [parentId, setParentId] = useState<string>(form.kind === "category" ? form.parentId ?? "" : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allCats = useMemo(() => {
    const excluded = form.kind === "category" && form.id ? new Set(descendantIds(index, form.id)) : new Set<string>();
    const out: { id: string; label: string }[] = [];
    const walk = (parent: string | null) => {
      for (const c of index.children.get(parent) ?? []) {
        if (excluded.has(c.id)) continue;
        out.push({ id: c.id, label: categoryPath(index, c.id).join(" › ") });
        walk(c.id);
      }
    };
    walk(null);
    return out;
  }, [form, index]);

  const pii = looksLikePersonalId(`${title} ${text} ${comment}`);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    let error: string | null = null;
    setBusy(true);
    if (form.kind === "category") {
      if (!name.trim()) error = "Skriv et navn";
      else
        error = await store.adminAction(
          form.id
            ? { action: "updateCategory", id: form.id, name, parentId: parentId || null }
            : { action: "createCategory", name, parentId: parentId || null }
        );
    } else if (!title.trim() || !text.trim()) {
      error = "Tittel og tekst må fylles ut";
    } else if (form.kind === "phrase") {
      error = await store.adminAction(
        form.id
          ? { action: "updatePhrase", id: form.id, title, body: text, categoryId }
          : { action: "createPhrase", categoryId, title, body: text }
      );
    } else if (form.kind === "mine") {
      error = await store.saveUserPhrase({ id: form.id, title, body: text });
    } else if (pii) {
      error = "Fjern fødselsnummer og andre pasientopplysninger før du sender.";
    } else {
      error = await store.suggest({
        phraseId: form.phraseId ?? null,
        categoryId: form.categoryId ?? null,
        title,
        body: text,
        comment,
        website,
      });
    }
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    onDone(form.kind === "suggest" ? "Forslag sendt til admin" : "Lagret");
  }

  if (form.kind === "category") {
    return (
      <form className="fk-form" onSubmit={submit}>
        <label htmlFor="fk-name">Navn</label>
        <input id="fk-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
        <label htmlFor="fk-parent">Ligger under</label>
        <select id="fk-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Toppnivå</option>
          {allCats.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        {err && <p className="fk-err">{err}</p>}
        <div className="fk-row">
          <button type="button" className="fk-btn" onClick={onClose}>Avbryt</button>
          <button type="submit" className="fk-btn fk-primary" disabled={busy}>{busy ? "Lagrer…" : "Lagre"}</button>
        </div>
      </form>
    );
  }

  const context =
    form.kind === "suggest"
      ? categoryPath(index, phrase?.category_id ?? form.categoryId ?? null).join(" › ")
      : form.kind === "phrase"
        ? null
        : "Bare du ser dine egne fraser.";

  return (
    <form className="fk-form" onSubmit={submit}>
      {context && <p className="fk-ctx">{context}</p>}
      {form.kind === "suggest" && (
        <p className="fk-warn">Ikke skriv pasientopplysninger her. Forslaget sendes til admin for vurdering.</p>
      )}
      <label htmlFor="fk-title">Tittel</label>
      <input id="fk-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} autoFocus={!phrase && !mine} />
      <label htmlFor="fk-text">Tekst</label>
      <textarea id="fk-text" value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={8000} autoFocus={Boolean(phrase || mine)} />
      {form.kind === "phrase" && (
        <>
          <label htmlFor="fk-cat">Kategori</label>
          <select id="fk-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {allCats.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </>
      )}
      {form.kind === "suggest" && (
        <>
          <label htmlFor="fk-comment">Kommentar til admin (valgfri)</label>
          <textarea id="fk-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={2000} />
          <input className="fk-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} />
          {pii && <p className="fk-err">Teksten ser ut til å inneholde et fødselsnummer. Fjern det før du sender.</p>}
        </>
      )}
      {err && <p className="fk-err">{err}</p>}
      <div className="fk-row">
        <button type="button" className="fk-btn" onClick={onClose}>Avbryt</button>
        <button type="submit" className="fk-btn fk-primary" disabled={busy}>
          {busy ? "Sender…" : form.kind === "suggest" ? "Send forslag" : "Lagre"}
        </button>
      </div>
    </form>
  );
}
