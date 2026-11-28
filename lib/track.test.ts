import { describe, expect, it } from "vitest";
import { cleanTrackInput, isCrossSite, referrerOrigin } from "./track";

describe("track input", () => {
  it("keeps only valid values", () => {
    expect(
      cleanTrackInput({
        contentId: "05A811D6-7A81-4F9F-A044-5A5ACC425464",
        slug: "CHA2DS2-VA",
        path: "/skjema?url=x",
        referrer: "https://www.google.com/search?q=hemmelig"
      })
    ).toEqual({
      contentId: "05a811d6-7a81-4f9f-a044-5a5acc425464",
      slug: "cha2ds2-va",
      path: "/skjema?url=x",
      referrer: "https://www.google.com"
    });
    expect(cleanTrackInput({ contentId: "1; drop", slug: "a b", path: "//evil.example", referrer: "javascript:x" })).toEqual({
      contentId: null,
      slug: null,
      path: null,
      referrer: null
    });
    expect(cleanTrackInput({ path: "/" + "a".repeat(1000) }).path).toHaveLength(300);
    expect(cleanTrackInput({ contentId: 3, path: ["/"] })).toEqual({ contentId: null, slug: null, path: null, referrer: null });
  });

  it("reduces the referrer to its origin", () => {
    expect(referrerOrigin("https://legex.no/profil")).toBe("https://legex.no");
    expect(referrerOrigin("ikke en url")).toBeNull();
  });

  it("detects posts from other sites", () => {
    const h = (o: Record<string, string>) => new Headers(o);
    expect(isCrossSite(h({ "sec-fetch-site": "same-origin" }), "https://a.no")).toBe(false);
    expect(isCrossSite(h({ "sec-fetch-site": "cross-site" }), "https://a.no")).toBe(true);
    expect(isCrossSite(h({ origin: "https://b.no" }), "https://a.no")).toBe(true);
    expect(isCrossSite(h({ origin: "https://a.no" }), "https://a.no")).toBe(false);
    expect(isCrossSite(h({}), "https://a.no")).toBe(false);
  });
});
