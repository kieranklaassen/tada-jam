// The grown-up frame-rate overlay. It is not part of the game a child plays:
// it shows only after three quick taps in the top right corner, or with
// `?fps=1` in the address, and a fourth run of three taps hides it again. It
// reads what the Mount already measures and changes nothing.

/** The corner that takes the taps, in logical pixels, and how close together three taps must be. */
const CORNER = 72
const WITHIN_MS = 1200
/** The numbers are refreshed this often, so they can be read. */
const EVERY_MS = 400

export class Overlay {
  private readonly box: HTMLDivElement
  private taps: number[] = []
  private shown = false
  private frames = 0
  private sumMs = 0
  private worstMs = 0
  private since = 0

  constructor(root: HTMLElement, search: string) {
    this.box = root.ownerDocument.createElement('div')
    this.box.setAttribute('data-perf-overlay', '')
    Object.assign(this.box.style, { position: 'absolute', top: '8px', right: '8px', zIndex: '3', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.6)', color: '#fff', font: '500 12px ui-monospace, Menlo, monospace', whiteSpace: 'pre', pointerEvents: 'none', display: 'none' })
    root.appendChild(this.box)
    if (new URLSearchParams(search).get('fps') === '1') this.toggle()
  }

  /** A press on the surface. Three in the corner within a moment show or hide the numbers. */
  press(x: number, y: number, width: number, timeMs: number): void {
    if (x < width - CORNER || y > CORNER) {
      this.taps.length = 0
      return
    }
    this.taps = this.taps.filter((t) => timeMs - t <= WITHIN_MS)
    this.taps.push(timeMs)
    if (this.taps.length >= 3) {
      this.taps.length = 0
      this.toggle()
    }
  }

  private toggle(): void {
    this.shown = !this.shown
    this.box.style.display = this.shown ? 'block' : 'none'
    this.frames = 0
    this.sumMs = 0
    this.worstMs = 0
  }

  /** One frame: the interval the display gave, the game's own work, and what the renderer drew. */
  frame(nowMs: number, intervalMs: number, workMs: number, tier: number, drawCalls: number, triangles: number): void {
    if (!this.shown || intervalMs <= 0) return
    this.frames += 1
    this.sumMs += intervalMs
    this.worstMs = Math.max(this.worstMs, intervalMs)
    if (nowMs - this.since < EVERY_MS) return
    this.since = nowMs
    const fps = this.frames / (this.sumMs / 1000)
    // wordless-ok: grown-up frame-rate overlay, reached only by a triple tap in the corner or by fps=1 in the address
    this.box.textContent = `${fps.toFixed(0)} fps  worst ${this.worstMs.toFixed(0)} ms\nwork ${workMs.toFixed(1)} ms  tier ${tier}\n${drawCalls} calls  ${triangles} tris`
    this.frames = 0
    this.sumMs = 0
    this.worstMs = 0
  }

  dispose(): void {
    this.box.remove()
  }
}
