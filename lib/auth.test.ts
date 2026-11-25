import { describe, expect, it } from "vitest";
import { safeNextPath } from "./auth";
import { authRedirect } from "./supabase/middleware";

describe("safeNextPath", () => {
  it("keeps internal paths", () => {
    expect(safeNextPath("/nytt-passord")).toBe("/nytt-passord");
    expect(safeNextPath("/phq-9?x=1")).toBe("/phq-9?x=1");
  });

  it("blocks external and protocol-relative targets", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});

describe("authRedirect", () => {
  it("lets anonymous visitors use the whole app", () => {
    for (const p of ["/", "/phq-9", "/widgets", "/pdfs/TBR-PHQ-9.pdf", "/login", "/signup"]) {
      expect(authRedirect(p, false), p).toBeNull();
    }
  });

  it("only guards the auth pages", () => {
    expect(authRedirect("/nytt-passord", false)).toBe("/login");
    expect(authRedirect("/login", true)).toBe("/");
    expect(authRedirect("/signup", true)).toBe("/");
    expect(authRedirect("/nytt-passord", true)).toBeNull();
  });
});
