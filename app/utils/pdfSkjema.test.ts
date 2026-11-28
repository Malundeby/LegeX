import { describe, expect, it } from "vitest";
import { findLabels, formatNorwegianDate, isDateFieldName, isPdfUrl, isSignerFieldName, pdfFetchUrl, skjemaHref } from "./pdfSkjema";

describe("pdfSkjema", () => {
  it("recognises pdf links", () => {
    expect(isPdfUrl("/pdfs/Utredningsskjema-KOLS-(CAT).pdf")).toBe(true);
    expect(isPdfUrl("https://x.no/a.PDF?v=2")).toBe(true);
    expect(isPdfUrl("https://x.no/side")).toBe(false);
    expect(skjemaHref("https://x.no/side")).toBe("https://x.no/side");
    expect(skjemaHref("/pdfs/a b.pdf", "A")).toBe("/skjema?url=%2Fpdfs%2Fa+b.pdf&tittel=A");
  });

  it("fetches local files directly and others through the proxy", () => {
    const o = "https://legeassistent.no";
    expect(pdfFetchUrl("/pdfs/a b.pdf", o)).toBe("/pdfs/a%20b.pdf");
    expect(pdfFetchUrl("/pdfs/START-øvelser legg, ankel, fot.pdf", o)).toBe("/pdfs/START-%C3%B8velser%20legg%2C%20ankel%2C%20fot.pdf");
    expect(pdfFetchUrl("/pdfs/a%20b.pdf", o)).toBe("/pdfs/a%20b.pdf");
    expect(pdfFetchUrl("https://legeassistent.no/pdfs/a.pdf", o)).toBe("/pdfs/a.pdf");
    expect(pdfFetchUrl("https://innlandstrafikk.no/x.pdf", o)).toBe("/api/pdf?url=https%3A%2F%2Finnlandstrafikk.no%2Fx.pdf");
    expect(pdfFetchUrl("http://x.no/a.pdf", o)).toBeNull();
    expect(pdfFetchUrl("//evil.no/a.pdf", o)).toBeNull();
    expect(pdfFetchUrl("javascript:alert(1)", o)).toBeNull();
  });

  it("formats dates the Norwegian way", () => {
    expect(formatNorwegianDate(new Date(2026, 10, 3))).toBe("03.11.2026");
  });

  it("finds date fields but not birth dates", () => {
    for (const n of ["Dato", "dato", "Sted og dato", "Utfyllingsdato", "Date"]) expect(isDateFieldName(n)).toBe(true);
    for (const n of ["f-dato", "Fødselsdato", "Født", "Navn", "Pasient-navn"]) expect(isDateFieldName(n)).toBe(false);
  });

  it("finds fields for the doctor's name", () => {
    for (const n of ["Legeunderskrift", "Legens navn", "Signatur", "Underskrift"]) expect(isSignerFieldName(n)).toBe(true);
    for (const n of ["Lege-telefon", "Pasient-navn", "Navn", "Sted og dato", "HPR-nummer lege"]) expect(isSignerFieldName(n)).toBe(false);
  });

  it("finds printed labels in flat PDFs", () => {
    const line = "Navn / f.dato: ___________ Dato: ________";
    const hits = findLabels(line);
    expect(hits).toEqual([{ kind: "date", index: line.indexOf("Dato: ") + 6 }]);
    expect(findLabels("Dato:")).toEqual([{ kind: "date", index: 5 }]);
    expect(findLabels("Dato: 12.03")).toEqual([]);
    expect(findLabels("Fødselsår/dato: ______")).toEqual([]);
    expect(findLabels("Sted/dato: ______")[0].kind).toBe("date");
    expect(findLabels("Behandler:")[0].kind).toBe("signer");
    expect(findLabels("Underskrift lege: ______")[0].kind).toBe("signer");
  });
});

describe("signer fields", () => {
  it("ignores long sentences that only mention a doctor", () => {
    expect(isSignerFieldName("Medikamentell behandling Ta dine faste medisiner som foreskrevet avtalt med lege")).toBe(false);
    expect(isSignerFieldName("Hva gjør du  Ta det med ro  Må kontakte lege legevakt")).toBe(false);
    expect(isSignerFieldName("Navn lege")).toBe(true);
    expect(isSignerFieldName("Lege")).toBe(true);
    expect(isSignerFieldName("Navn på fastlege")).toBe(true);
  });
});

describe("standalone labels", () => {
  it("finds labels printed under a blank space", async () => {
    const { standaloneLabel } = await import("./pdfSkjema");
    expect(standaloneLabel("Dato ")).toBe("date");
    expect(standaloneLabel("Legens underskrift og stempel ")).toBe("signer");
    expect(standaloneLabel("Telefon")).toBeNull();
    expect(standaloneLabel("Dato for neste kontroll")).toBeNull();
  });
});
