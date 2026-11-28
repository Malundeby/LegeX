import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, cleanPrefs, fillSignature, profileName } from "./profile";

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
});
