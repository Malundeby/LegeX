import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, cleanPhone, cleanStamp, suggestStamp, cleanPrefs, cleanSignature, fillSignature, profileName, profilePhone, profileSignature } from "./profile";

describe("profile", () => {
  it("keeps only known preference values", () => {
    expect(cleanPrefs({ menu: "vertikal", font: "klassisk", farge: "blaa" })).toEqual({ menu: "vertikal", font: "klassisk", farge: "blaa" });
    expect(cleanPrefs({ menu: "diagonal", farge: 3 })).toEqual(DEFAULT_PREFS);
    expect(cleanPrefs(null)).toEqual(DEFAULT_PREFS);
  });

  it("reads the name from the user profile", () => {
    expect(profileName({ user_metadata: { full_name: " Kari Lege " } })).toBe("Kari Lege");
    expect(profileName(null)).toBe("");
  });

  it("fills in signature placeholders", () => {
    expect(fillSignature("Hilsen\n{signatur}", "Kari Lege")).toBe("Hilsen\nKari Lege");
    expect(fillSignature("Mvh [Legens navn]", "Kari Lege")).toBe("Mvh Kari Lege");
    expect(fillSignature("Hilsen\n{signatur}", "")).toBe("Hilsen\n{signatur}");
  });

  it("uses the signature block for {signatur} and the name elsewhere", () => {
    const sig = "Kari Lege\nLege\nLegesenter A";
    expect(fillSignature("Hilsen\n{signatur}", "Kari Lege", sig)).toBe(`Hilsen\n${sig}`);
    expect(fillSignature("Mvh {navn}", "Kari Lege", sig)).toBe("Mvh Kari Lege");
    expect(fillSignature("{signatur}", "", sig)).toBe(sig);
    expect(fillSignature("{navn}", "", sig)).toBe("{navn}");
  });

  it("cleans the signature", () => {
    expect(cleanSignature("\n  Kari Lege \r\n Lege\n\n")).toBe("Kari Lege\nLege");
    expect(cleanSignature("1\n2\n3\n4\n5\n6\n7")).toBe("1\n2\n3\n4\n5\n6");
    expect(profileSignature({ user_metadata: { signature: " A \n B " } })).toBe("A\nB");
    expect(profileSignature({ user_metadata: { signature: 3 } })).toBe("");
    expect(profileSignature(null)).toBe("");
  });

  it("cleans the phone number", () => {
    expect(cleanPhone("  +47  22 33 44 55 ")).toBe("+47 22 33 44 55");
    expect(cleanPhone("tlf. 22-33-44-55")).toBe("22-33-44-55");
    expect(profilePhone({ user_metadata: { phone: "22 33 44 55" } })).toBe("22 33 44 55");
    expect(profilePhone(null)).toBe("");
  });

  it("suggests and cleans a stamp", () => {
    expect(suggestStamp("Kari Lege", "Kari Lege\nLege\nLegesenter A", "22 33 44 55")).toBe("Kari Lege\nLege\nHPR-nr.\nLegesenter A\nTlf. 22 33 44 55");
    expect(suggestStamp("Kari Lege", "", "")).toBe("Kari Lege\nHPR-nr.");
    expect(cleanStamp("a".repeat(80))).toHaveLength(60);
  });
});
