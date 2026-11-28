import { describe, expect, it } from "vitest";
import { autoThreshold, inkMask, inkStrength } from "./signatureImage";

/** A grey-ish paper photo, darker on the right (a shadow), with a dark line and some specks. */
function photo(width: number, height: number) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 235 - (x / width) * 90; // shadow: 235 → 145
      if (y >= 40 && y < 46 && x >= 30 && x < 170) v *= 0.3; // the pen line
      if ((x === 10 && y === 10) || (x === 180 && y === 90)) v *= 0.3; // dust
      if (x + (height - y) < 30) v = 60; // dark table corner, bottom left
      const o = (y * width + x) * 4;
      rgba[o] = rgba[o + 1] = rgba[o + 2] = v;
      rgba[o + 3] = 255;
    }
  }
  return rgba;
}

describe("signature photo", () => {
  const w = 200;
  const h = 100;
  const ink = inkStrength(photo(w, h), w, h);

  it("sees ink, not the shadow", () => {
    expect(ink[43 * w + 100]).toBeGreaterThan(0.8);
    expect(ink[80 * w + 190]).toBeLessThan(0.1); // in the shadow, but paper
    expect(ink[80 * w + 10]).toBeLessThan(0.1);
  });

  it("finds a threshold and crops to the line, without the specks", () => {
    const t = autoThreshold(ink);
    expect(t).toBeGreaterThanOrEqual(0.12);
    expect(t).toBeLessThanOrEqual(0.5);
    const mask = inkMask(ink, w, h, t)!;
    expect(mask.width).toBeGreaterThan(135);
    expect(mask.width).toBeLessThan(160);
    expect(mask.height).toBeLessThan(20); // the table corner is not included
    const solid = Array.from(mask.alpha).filter((a) => a > 200).length;
    expect(solid).toBeGreaterThan(140 * 5);
  });

  it("returns null for an empty page", () => {
    const blank = new Uint8ClampedArray(w * h * 4).fill(230);
    const e = inkStrength(blank, w, h);
    expect(inkMask(e, w, h, autoThreshold(e))).toBeNull();
  });
});
