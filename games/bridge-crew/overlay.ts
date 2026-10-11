// template: cartridge/overlay.ts v2

// The grown-up performance overlay. It is no part of the game a child plays:
// it shows only after three quick taps in the top right corner, or with
// `?fps=1` in the address, and three more taps hide it again. It reads what
// the Mount already measures and changes nothing, in the game or in a save.
// Its readout is the only text in the game. The wordless check accepts text
// in a file with this name alone, behind the comment the readout carries, so
// the overlay stays in this file and nothing meant for the child goes into it.
// Plain DOM, so it sits over a canvas 2D surface and a three.js one alike.

/** The side of the corner that takes the taps, in the surface's own pixels. Keep backdrop under it, where nothing answers a touch, so a child does not open it by playing. */
export const CORNER = 72
/** Three taps count when the first and the last are no further apart than this. */
export const WITHIN_MS = 700
/** The numbers are refreshed this often, so they can be read. */
export const EVERY_MS = 400

export class Overlay {
  private readonly box: HTMLDivElement
  private taps: number[] = []
  private shown = false
  private frames = 0
  private sumMs = 0
  private worstMs = 0
  private workMs = 0
  private since = 0

  /** `root` is the Mount's own element; `search` is the address's query string. */
  constructor(root: HTMLElement, search: string) {
    this.box = root.ownerDocument.createElement('div')
    this.box.setAttribute('data-perf-overlay', '')
    // It never takes a touch from the game: the taps that open it are passed in by the Mount.
    Object.assign(this.box.style, { position: 'absolute', top: '8px', right: '8px', zIndex: '3', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.6)', color: '#fff', font: '500 12px ui-monospace, Menlo, monospace', whiteSpace: 'pre', pointerEvents: 'none', display: 'none' })
    root.appendChild(this.box)
    if (new URLSearchParams(search).get('fps') === '1') this.toggle()
  }

  /** Every touch-down on the surface, where it landed and how wide the surface is. Three in the corner in quick succession show or hide the numbers; one anywhere else starts the count again. */
  press(x: number, y: number, width: number, timeMs: number): void {
    // A surface that has not been measured yet has no corner.
    if (width <= 0 || x < width - CORNER || y > CORNER) {
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

  /**
   * One frame of the loop: its timestamp, the interval the display gave, the game's own work in it, the tier,
   * and what the renderer drew (a canvas 2D game passes the sprites and figures it drew as `drawCalls`, and 0
   * triangles). Costs nothing while hidden.
   */
  frame(nowMs: number, intervalMs: number, workMs: number, tier: number, drawCalls: number, triangles: number): void {
    if (!this.shown || intervalMs <= 0) return
    this.frames += 1
    this.sumMs += intervalMs
    this.worstMs = Math.max(this.worstMs, intervalMs)
    this.workMs += workMs
    if (nowMs - this.since < EVERY_MS) return
    this.since = nowMs
    const fps = this.frames / (this.sumMs / 1000)
    // wordless-ok: grown-up performance overlay, reached only by three quick taps in the corner or by fps=1 in the address
    this.box.textContent = `${fps.toFixed(0)} fps  worst ${this.worstMs.toFixed(0)} ms\nwork ${(this.workMs / this.frames).toFixed(1)} ms  tier ${tier}\n${drawCalls} calls  ${triangles} tris`
    this.reset()
  }

  dispose(): void {
    this.box.remove()
  }

  private toggle(): void {
    this.shown = !this.shown
    this.box.style.display = this.shown ? 'block' : 'none'
    this.reset()
  }

  /** The readout covers the frames since it was last written. */
  private reset(): void {
    this.frames = 0
    this.sumMs = 0
    this.worstMs = 0
    this.workMs = 0
  }
}
