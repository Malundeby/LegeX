import { describe, expect, it } from "vitest";
import { fjernFodselsnummer, konflikter, parseKoder, takstgrunnlagTekst, uforenlige } from "./taksthjelp";

describe("taksthjelp", () => {
  it("leser koder fra fritekst og ignorerer ukjente", () => {
    expect(parseKoder("2AD, 2cd x2 tull 701a")).toEqual(["2ad", "2cd", "701a"]);
  });

  it("finner uforenlige takster i begge retninger", () => {
    expect(uforenlige("2ad", "1ad")).toBe(true);
    expect(uforenlige("1ad", "2ad")).toBe(true);
    expect(uforenlige("2ad", "2cd")).toBe(false);
  });

  it("tolker «Alle unntatt» som kun kombinerbar med de listede", () => {
    expect(uforenlige("2akt", "2ck")).toBe(false);
    expect(uforenlige("2akt", "2cd")).toBe(true);
  });

  it("lister konfliktpar", () => {
    expect(konflikter(["2ad", "2ak", "2cd"])).toContainEqual(["2ad", "2ak"]);
  });

  it("fjerner fødselsnummer", () => {
    expect(fjernFodselsnummer("pas 010190 12345 kom")).toBe("pas [fnr fjernet] kom");
    expect(fjernFodselsnummer("01019012345")).toBe("[fnr fjernet]");
  });

  it("lager takstgrunnlag med alle koder", () => {
    const t = takstgrunnlagTekst();
    expect(t).toContain("2ad | Konsultasjon, dagtid");
    expect(t.split("\n").length).toBeGreaterThan(100);
  });
});
