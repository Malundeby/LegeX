"use client";

import { useEffect, useRef } from "react";
import { DRAW_H, DRAW_W, PEN_WIDTH, cleanDrawing, drawingPath, inkHex, type Drawing, type Ink } from "@/lib/drawing";

/**
 * Drawing area for a handwritten signature. Works with mouse, trackpad, pen and
 * touch (pointer events). The drawing is reported when each stroke ends.
 */
export default function SignaturePad({
  value,
  ink,
  onChange,
  label = "Tegn signaturen din her"
}: {
  value: Drawing | null;
  ink: Ink;
  onChange: (d: Drawing | null) => void;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<number[][]>(value?.strokes ?? []);
  const currentRef = useRef<number[] | null>(null);
  const inkRef = useRef(ink);
  inkRef.current = ink;

  // Follow the value from outside (loading a saved drawing, clearing).
  useEffect(() => {
    if (!currentRef.current) strokesRef.current = value?.strokes.map((s) => [...s]) ?? [];
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ink]);

  // Keep the bitmap sharp on high-resolution screens and when the layout changes size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        redraw();
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function redraw() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(canvas.width / DRAW_W, 0, 0, canvas.height / DRAW_H, 0, 0);
    const all = currentRef.current ? [...strokesRef.current, currentRef.current] : strokesRef.current;
    if (all.length === 0) return;
    ctx.strokeStyle = inkHex(inkRef.current);
    ctx.lineWidth = PEN_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(drawingPath({ v: 1, ink: inkRef.current, strokes: all })));
  }

  const toPoint = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * DRAW_W, ((e.clientY - r.top) / r.height) * DRAW_H];
  };

  const add = (x: number, y: number) => {
    const s = currentRef.current;
    if (!s) return;
    const lx = s[s.length - 2];
    const ly = s[s.length - 1];
    // Skip points too close to the last one; keeps the stored drawing small.
    if (s.length >= 2 && Math.hypot(x - lx, y - ly) < 1.5) return;
    s.push(Math.round(x), Math.round(y));
  };

  const finish = () => {
    const s = currentRef.current;
    currentRef.current = null;
    if (s && s.length >= 2) strokesRef.current = [...strokesRef.current, s];
    redraw();
    onChange(cleanDrawing({ ink: inkRef.current, strokes: strokesRef.current }));
  };

  return (
    <div className="sigpad">
      <canvas
        ref={canvasRef}
        className="sigpad-canvas"
        role="img"
        aria-label={label}
        onPointerDown={(e) => {
          if (e.button !== 0 && e.pointerType === "mouse") return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          currentRef.current = [];
          const [x, y] = toPoint(e);
          currentRef.current.push(Math.round(x), Math.round(y));
          redraw();
        }}
        onPointerMove={(e) => {
          if (!currentRef.current) return;
          const events = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [];
          for (const ev of events.length ? events : [e.nativeEvent]) add(...toPoint(ev));
          redraw();
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <span className="sigpad-line" aria-hidden="true" />
      {strokesRef.current.length === 0 && !currentRef.current && (
        <span className="sigpad-hint" aria-hidden="true">
          {label}
        </span>
      )}
    </div>
  );
}

/** CSS for the drawing area; added once by the pages that use it. */
export const SIGPAD_CSS = `
.sigpad{position:relative;width:100%;max-width:520px;aspect-ratio:3/1;border:1px solid var(--border);border-radius:10px;background:#fff;overflow:hidden}
.sigpad-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}
.sigpad-line{position:absolute;left:8%;right:8%;bottom:24%;border-bottom:1px dashed var(--border);pointer-events:none}
.sigpad-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--faint);font-size:14px;pointer-events:none}
.ink-row{display:flex;gap:6px;align-items:center}
.ink-btn{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;box-shadow:inset 0 0 0 3px #fff}
.ink-btn[aria-checked="true"]{border-color:var(--primary)}
`;

export function InkPicker({ value, onChange, inks }: { value: Ink; onChange: (i: Ink) => void; inks: { value: Ink; label: string; hex: string }[] }) {
  return (
    <span className="ink-row" role="radiogroup" aria-label="Farge">
      {inks.map((i) => (
        <button
          key={i.value}
          type="button"
          role="radio"
          aria-checked={value === i.value}
          aria-label={i.label}
          title={i.label}
          className="ink-btn"
          style={{ background: i.hex }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(i.value)}
        />
      ))}
    </span>
  );
}
