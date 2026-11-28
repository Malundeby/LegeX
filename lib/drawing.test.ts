import { describe, expect, it } from "vitest";
import { DRAW_H, DRAW_W, cleanDrawing, cleanSaved, cleanSignatureImage, drawingBounds, drawingPath, inkHex, isImageSignature, signatureAspect } from "./drawing";

describe("drawing", () => {
  it("cleans strokes and drops what is not a drawing", () => {
    expect(cleanDrawing(null)).toBeNull();
    expect(cleanDrawing({ strokes: [] })).toBeNull();
    expect(cleanDrawing({ strokes: [[1]] })).toBeNull();
    const d = cleanDrawing({ ink: "rod", strokes: [[10.4, 20.6, -5, 999, "x", 3], "nope", [1, 2]] })!;
    expect(d).toEqual({ v: 1, ink: "rod", strokes: [[10, 21, 0, DRAW_H], [1, 2]] });
    expect(cleanDrawing({ ink: "gronn", strokes: [[1, 2, 3, 4]] })!.ink).toBe("sort");
    expect(cleanDrawing({ strokes: [[DRAW_W + 50, 5, 1, 1]] })!.strokes[0][0]).toBe(DRAW_W);
  });

  it("caps the number of points", () => {
    const big = Array.from({ length: 20 }, () => Array.from({ length: 1000 }, (_, i) => i % 100));
    const d = cleanDrawing({ strokes: big })!;
    expect(d.strokes.reduce((a, s) => a + s.length / 2, 0)).toBeLessThanOrEqual(6000);
  });

  it("builds a path and bounds", () => {
    const d = cleanDrawing({ strokes: [[10, 10, 20, 20, 30, 10], [50, 50]] })!;
    const path = drawingPath(d, 10, 10);
    expect(path.startsWith("M0 0Q10 10 15 5L20 0")).toBe(true);
    expect(path).toContain("M40 40L40.1 40");
    const b = drawingBounds(d);
    expect(b.x).toBeLessThan(10);
    expect(b.w).toBeGreaterThan(40);
    expect(inkHex("blaa")).toBe("#1a3fb0");
  });

  it("accepts only clean PNG images", () => {
    const ok = { kind: "image", ink: "blaa", src: "data:image/png;base64,iVBORw0KGgo=", w: 400, h: 100 };
    expect(cleanSignatureImage(ok)).toEqual({ v: 1, ...ok });
    expect(cleanSignatureImage({ ...ok, src: "data:image/svg+xml;base64,PHN2Zz4=" })).toBeNull();
    expect(cleanSignatureImage({ ...ok, src: "data:image/png;base64,abc<script>" })).toBeNull();
    expect(cleanSignatureImage({ ...ok, w: 0 })).toBeNull();
    expect(cleanSignatureImage({ ...ok, src: "data:image/png;base64," + "A".repeat(400_000) })).toBeNull();
    const saved = cleanSaved(ok)!;
    expect(isImageSignature(saved)).toBe(true);
    expect(signatureAspect(saved)).toBe(4);
    expect(isImageSignature(cleanSaved({ strokes: [[1, 2, 3, 4]] }))).toBe(false);
  });
});
