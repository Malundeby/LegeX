import { describe, expect, it } from "vitest";
import { TELEFONRAD, TELEFONRAD_CATEGORIES } from "./telefonrad";
import { KASUISTIKKER, KASUISTIKK_SECTIONS } from "./kasuistikker";
import { TAKSTER } from "./takstkartotek";

const codes = new Set(TAKSTER.map((t) => t.code));

describe("telefonråd og kasuistikker", () => {
  it("bruker bare takster som finnes i takstkartoteket", () => {
    for (const rad of TELEFONRAD) {
      if (rad.takst) expect(codes.has(rad.takst), rad.id).toBe(true);
    }
    for (const kasus of KASUISTIKKER) {
      for (const code of kasus.takster ?? []) expect(codes.has(code), `${kasus.id} ${code}`).toBe(true);
    }
  });

  it("har unike id-er og gyldige kategorier og seksjoner", () => {
    const ids = [...TELEFONRAD.map((r) => r.id), ...KASUISTIKKER.map((k) => k.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const rad of TELEFONRAD) expect(TELEFONRAD_CATEGORIES).toContain(rad.category);
    const sections = KASUISTIKK_SECTIONS.map((s) => s.id);
    for (const kasus of KASUISTIKKER) expect(sections).toContain(kasus.section);
  });

  it("har taksttekst som nevner taksten når det tas takst", () => {
    for (const rad of TELEFONRAD) {
      if (rad.takst) expect(rad.taksttekst, rad.id).toContain(`Takst ${rad.takst}`);
    }
  });
});
