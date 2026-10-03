import type { Ctx, MakeSheet, Sheet } from './wash'

// A 2D context that keeps where each fill, stroke and stamp lands instead of
// drawing it, for the tests that measure what a child would see. It follows
// the transform as a real context does, so a recorded shape is in device
// pixels of the surface it was drawn on. Not used by the game itself.

export type P = { x: number; y: number }
export type Shape = { kind: 'fill' | 'stroke'; style: string; alpha: number; points: P[] }
export type Stamp = { image: unknown; alpha: number; corners: P[] }
export type Recording = { shapes: Shape[]; stamps: Stamp[]; texts: number }

/** The box that holds some points. */
export function bounds(points: readonly P[]): { x: number; y: number; w: number; h: number } {
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y)
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/** A sheet whose context records. `into` collects what is drawn on it; without it the sheet only keeps its size. */
export function recordingSheet(width: number, height: number, into?: Recording): Sheet {
  let m = [1, 0, 0, 1, 0, 0], path: P[] = []
  const stack: { m: number[]; alpha: number }[] = []
  const at = (x: number, y: number): P => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] })
  const apply = (a: number, b: number, c: number, d: number, e: number, f: number): void => {
    m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]
  }
  const oval = (x: number, y: number, rx: number, ry: number): void => { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; path.push(at(x + Math.cos(a) * rx, y + Math.sin(a) * ry)) } }
  const canvas = { width, height }
  const g = {
    fillStyle: '' as unknown, strokeStyle: '' as unknown, lineWidth: 1, globalAlpha: 1, globalCompositeOperation: 'source-over', lineCap: 'butt', lineJoin: 'miter',
    save() { stack.push({ m, alpha: g.globalAlpha }) },
    restore() { const top = stack.pop(); if (top) { m = top.m; g.globalAlpha = top.alpha } },
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number) { m = [a, b, c, d, e, f] },
    transform(a: number, b: number, c: number, d: number, e: number, f: number) { apply(a, b, c, d, e, f) },
    translate(x: number, y: number) { apply(1, 0, 0, 1, x, y) },
    scale(x: number, y: number) { apply(x, 0, 0, y, 0, 0) },
    rotate(angle: number) { const c = Math.cos(angle), s = Math.sin(angle); apply(c, s, -s, c, 0, 0) },
    beginPath() { path = [] }, closePath() {}, clip() {},
    moveTo(x: number, y: number) { path.push(at(x, y)) },
    lineTo(x: number, y: number) { path.push(at(x, y)) },
    quadraticCurveTo(cx: number, cy: number, x: number, y: number) { path.push(at(cx, cy), at(x, y)) },
    rect(x: number, y: number, w: number, h: number) { path.push(at(x, y), at(x + w, y), at(x + w, y + h), at(x, y + h)) },
    arc(x: number, y: number, r: number, from = 0, to = Math.PI * 2) { for (let i = 0; i <= 8; i++) { const a = from + ((to - from) * i) / 8; path.push(at(x + Math.cos(a) * r, y + Math.sin(a) * r)) } },
    ellipse(x: number, y: number, rx: number, ry: number) { oval(x, y, rx, ry) },
    fill() { into?.shapes.push({ kind: 'fill', style: String(g.fillStyle), alpha: g.globalAlpha, points: path.slice() }) },
    stroke() { into?.shapes.push({ kind: 'stroke', style: String(g.strokeStyle), alpha: g.globalAlpha, points: path.slice() }) },
    fillRect(x: number, y: number, w: number, h: number) { into?.shapes.push({ kind: 'fill', style: String(g.fillStyle), alpha: g.globalAlpha, points: [at(x, y), at(x + w, y), at(x + w, y + h), at(x, y + h)] }) },
    strokeRect() {},
    drawImage(image: unknown, ...rest: number[]) {
      const [x, y, w, h] = rest.length >= 8 ? rest.slice(4, 8) : rest.length >= 4 ? rest : [rest[0] ?? 0, rest[1] ?? 0, (image as { width: number }).width, (image as { height: number }).height]
      into?.stamps.push({ image, alpha: g.globalAlpha, corners: [at(x, y), at(x + w, y), at(x + w, y + h), at(x, y + h)] })
    },
    createRadialGradient() { return { addColorStop() {} } },
    createPattern() { return {} },
    fillText() { if (into) into.texts++ },
    strokeText() { if (into) into.texts++ },
    measureText() { if (into) into.texts++; return { width: 0 } },
  }
  return { canvas, g: g as unknown as Ctx } as unknown as Sheet
}

/** Sheets that only keep their size: what the painter needs when nothing it paints is looked at. */
export const blankSheets: MakeSheet = (width, height) => recordingSheet(width, height)
