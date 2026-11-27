import { describe, expect, it } from "vitest";
import {
  buildIndex,
  categoryPath,
  descendantIds,
  looksLikePersonalId,
  moveInList,
  searchPhrases,
  type Phrase,
  type PhraseCategory,
} from "./fraser";

const cats: PhraseCategory[] = [
  { id: "u", parent_id: null, name: "Undersøkelse", sort_order: null },
  { id: "a", parent_id: null, name: "Anamnese", sort_order: null },
  { id: "x", parent_id: null, name: "Øvrig", sort_order: null },
  { id: "cp", parent_id: "u", name: "Cor og pulm", sort_order: null },
  { id: "ab", parent_id: "u", name: "Abdomen", sort_order: null },
  { id: "cpn", parent_id: "cp", name: "Normal", sort_order: null },
  { id: "orphan", parent_id: "missing", name: "Foreldreløs", sort_order: null },
];
const phrases: Phrase[] = [
  { id: "p1", category_id: "cpn", title: "Cor normal", body: "Regelmessig aksjon, ingen bilyder.", sort_order: null },
  { id: "p2", category_id: "cp", title: "Systolisk bilyd", body: "Systolisk bilyd over aortaostiet.", sort_order: null },
  { id: "p3", category_id: "ab", title: "Abdomen normal", body: "Bløt og uøm.", sort_order: null },
  { id: "p4", category_id: "gone", title: "Uten kategori", body: "x", sort_order: null },
];

describe("frasekatalog", () => {
  it("sorterer alfabetisk med norsk rekkefølge når sort_order mangler", () => {
    const idx = buildIndex(cats, phrases);
    expect(idx.children.get(null)!.map((c) => c.name)).toEqual(["Anamnese", "Foreldreløs", "Undersøkelse", "Øvrig"]);
  });

  it("legger eksplisitt rekkefølge foran alfabetisk", () => {
    const idx = buildIndex(
      cats.map((c) => (c.id === "x" ? { ...c, sort_order: 0 } : c)),
      phrases
    );
    expect(idx.children.get(null)![0].name).toBe("Øvrig");
  });

  it("teller fraser rekursivt og hopper over fraser uten kategori", () => {
    const idx = buildIndex(cats, phrases);
    expect(idx.counts.get("u")).toBe(3);
    expect(idx.counts.get("cp")).toBe(2);
    expect(idx.phraseById.size).toBe(4);
    expect(searchPhrases(idx, "kategori")).toEqual([]);
  });

  it("finner sti og etterkommere", () => {
    const idx = buildIndex(cats, phrases);
    expect(categoryPath(idx, "cpn")).toEqual(["Undersøkelse", "Cor og pulm", "Normal"]);
    expect(descendantIds(idx, "u").sort()).toEqual(["ab", "cp", "cpn", "u"]);
  });

  it("søker på tvers av tittel, tekst og kategori, med titteltreff først", () => {
    const idx = buildIndex(cats, phrases);
    expect(searchPhrases(idx, "bilyd").map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(searchPhrases(idx, "undersøkelse normal").map((p) => p.id).sort()).toEqual(["p1", "p3"]);
    expect(searchPhrases(idx, "   ")).toEqual([]);
  });

  it("flytter elementer opp og ned", () => {
    expect(moveInList(["a", "b", "c"], "c", -1)).toEqual([
      { id: "a", sort_order: 0 },
      { id: "c", sort_order: 1 },
      { id: "b", sort_order: 2 },
    ]);
    expect(moveInList(["a", "b"], "a", -1)).toBeNull();
  });

  it("kjenner igjen fødselsnummer", () => {
    expect(looksLikePersonalId("pasient 01019912345 har")).toBe(true);
    expect(looksLikePersonalId("010199 12345")).toBe(true);
    expect(looksLikePersonalId("BT 135/85, puls 72")).toBe(false);
  });
});
