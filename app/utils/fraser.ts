/**
 * Frasekatalog: pure helpers for the category tree, sorting and search.
 * Categories form a tree of any depth; phrases hang on any category.
 */

export interface PhraseCategory {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number | null;
}

export interface Phrase {
  id: string;
  category_id: string;
  title: string;
  body: string;
  sort_order: number | null;
}

export interface UserPhrase {
  id: string;
  title: string;
  body: string;
}

/** Explicit sort_order first (ascending), then alphabetically (Norwegian collation). */
export function compareOrdered(
  a: { sort_order: number | null },
  b: { sort_order: number | null },
  nameA: string,
  nameB: string
): number {
  const ao = a.sort_order;
  const bo = b.sort_order;
  if (ao !== null && bo !== null && ao !== bo) return ao - bo;
  if (ao !== null && bo === null) return -1;
  if (ao === null && bo !== null) return 1;
  return nameA.localeCompare(nameB, "nb", { sensitivity: "base", numeric: true });
}

export interface PhraseIndex {
  categories: Map<string, PhraseCategory>;
  children: Map<string | null, PhraseCategory[]>;
  phrases: Map<string, Phrase[]>;
  phraseById: Map<string, Phrase>;
  counts: Map<string, number>;
}

export function buildIndex(categories: PhraseCategory[], phrases: Phrase[]): PhraseIndex {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const children = new Map<string | null, PhraseCategory[]>();
  for (const c of categories) {
    // Orphans (parent missing) are shown at the top level rather than lost.
    const parent = c.parent_id && catMap.has(c.parent_id) ? c.parent_id : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(c);
  }
  children.forEach((list) => list.sort((a, b) => compareOrdered(a, b, a.name, b.name)));

  const byCat = new Map<string, Phrase[]>();
  for (const p of phrases) {
    if (!catMap.has(p.category_id)) continue;
    if (!byCat.has(p.category_id)) byCat.set(p.category_id, []);
    byCat.get(p.category_id)!.push(p);
  }
  byCat.forEach((list) => list.sort((a, b) => compareOrdered(a, b, a.title, b.title)));

  const counts = new Map<string, number>();
  const visiting = new Set<string>();
  const count = (id: string): number => {
    if (counts.has(id)) return counts.get(id)!;
    if (visiting.has(id)) return 0; // guards against accidental cycles
    visiting.add(id);
    let n = byCat.get(id)?.length ?? 0;
    for (const child of children.get(id) ?? []) n += count(child.id);
    visiting.delete(id);
    counts.set(id, n);
    return n;
  };
  categories.forEach((c) => count(c.id));

  return {
    categories: catMap,
    children,
    phrases: byCat,
    phraseById: new Map(phrases.map((p) => [p.id, p])),
    counts,
  };
}

/** Names from the root down to (and including) the given category. */
export function categoryPath(index: PhraseIndex, id: string | null): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  let cur = id ? index.categories.get(id) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    names.unshift(cur.name);
    cur = cur.parent_id ? index.categories.get(cur.parent_id) : undefined;
  }
  return names;
}

/** All descendant category ids, including the category itself. */
export function descendantIds(index: PhraseIndex, id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (out.includes(cur)) continue;
    out.push(cur);
    for (const c of index.children.get(cur) ?? []) stack.push(c.id);
  }
  return out;
}

export function normalize(text: string): string {
  return text.toLocaleLowerCase("nb").normalize("NFC");
}

/** Every word must appear in title, body or category path. Title hits rank first. */
export function searchPhrases(index: PhraseIndex, query: string, limit = 80): Phrase[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: { p: Phrase; score: number }[] = [];
  index.phraseById.forEach((p) => {
    if (!index.categories.has(p.category_id)) return;
    const title = normalize(p.title);
    const hay = `${title} ${normalize(p.body)} ${normalize(categoryPath(index, p.category_id).join(" "))}`;
    if (!words.every((w) => hay.includes(w))) return;
    const score = words.filter((w) => title.includes(w)).length;
    hits.push({ p, score });
  });
  hits.sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title, "nb"));
  return hits.slice(0, limit).map((h) => h.p);
}

/**
 * Moves one item up or down among its siblings and returns the full new
 * order as explicit sort_order values (0..n-1), ready to save.
 */
export function moveInList(ids: string[], id: string, dir: -1 | 1): { id: string; sort_order: number }[] | null {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next.map((x, n) => ({ id: x, sort_order: n }));
}

/** Rough check for things that look like patient identifiers (11-digit fødselsnummer). */
export function looksLikePersonalId(text: string): boolean {
  return /(?<!\d)\d{6}\s?\d{5}(?!\d)/.test(text);
}
