import { describe, expect, it } from "vitest";
import { safeNextPath } from "./auth";
import { isPublicPath } from "./supabase/middleware";

describe("safeNextPath", () => {
  it("keeps internal paths", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("/phq-9?x=1")).toBe("/phq-9?x=1");
  });

  it("blocks external and protocol-relative targets", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});

describe("isPublicPath", () => {
  it("allows the auth pages and PWA files", () => {
    for (const p of ["/login", "/signup", "/glemt-passord", "/auth/callback", "/sw.js", "/manifest.webmanifest", "/icon", "/icons/icon-192.svg", "/api/track"]) {
      expect(isPublicPath(p), p).toBe(true);
    }
  });

  it("protects everything else", () => {
    for (const p of ["/", "/admin", "/nytt-passord", "/pdfs/TBR-PHQ-9.pdf", "/widgets", "/api/admin/users", "/loginx", "/iconsx"]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });
});
