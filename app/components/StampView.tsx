import { inkHex, type Ink } from "@/lib/drawing";

/** Font size, line height and padding of a stamp, in PDF points at normal size. */
export const STAMP = { size: 9, line: 1.25, pad: 4, border: 1.2 };

/**
 * A doctor's stamp: a framed block of centred lines, the first in bold. Used on
 * the profile page as a preview and on PDF forms. `pxPerPt` scales it.
 */
export default function StampView({ text, ink, pxPerPt = 96 / 72, scale = 1 }: { text: string; ink: Ink; pxPerPt?: number; scale?: number }) {
  const lines = text.split("\n");
  const color = inkHex(ink);
  const k = pxPerPt * scale;
  return (
    <div
      className="stamp-view"
      style={{
        color,
        borderColor: color,
        borderWidth: `${Math.max(1, STAMP.border * k)}px`,
        padding: `${STAMP.pad * k}px`,
        fontSize: `${STAMP.size * k}px`,
        lineHeight: `${STAMP.size * STAMP.line * k}px`
      }}
    >
      {lines.map((l, i) => (
        <div key={i} className={i === 0 ? "stamp-first" : undefined}>
          {l || " "}
        </div>
      ))}
    </div>
  );
}

export const STAMP_CSS = `
.stamp-view{box-sizing:border-box;display:inline-block;border-style:solid;border-radius:2px;font-family:Helvetica,Arial,sans-serif;text-align:center;white-space:pre;background:transparent}
.stamp-first{font-weight:700}
`;
