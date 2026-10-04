// template: cartridge/overlay.ts v2

// The grown-up performance overlay. It is no part of the game a child plays:
// it shows only after a finger is held for a second in the top right corner
// and lifted there, and three taps then follow there within three seconds;
// or with `?fps=1` in the address. The same gesture hides it again. A child
// drumming on the corner opens nothing: no run of quick taps, however long,
// has the hold in it. It reads what the Mount already measures and changes
// nothing, in the game or in a save. Its readout is the only text in the
// game. The wordless check accepts text in a file with this name alone,
// behind the comment the readout carries, so the overlay stays in this file
// and nothing meant for the child goes into it. Plain DOM, so it sits over a
// canvas 2D surface and a three.js one alike.

/** The side of the corner that takes the gesture, in the surface's own pixels. Keep backdrop under it, where nothing answers a touch, so a child does not open it by playing. */
export const CORNER = 72
/** How long the first finger must be held in the corner before it lifts there. */
export const HOLD_MS = 1000
/** After that lift, three taps in the corner count when the third lands within this. */
export const WITHIN_MS = 3000
/** The numbers are refreshed this often, so they can be read. */
export const EVERY_MS = 400

export class Overlay {
  private readonly box: HTMLDivElement
  /** When the finger that is down in the corner landed, or null when none is. */
  private heldSince: number | null = null
  /** When a held finger was lifted in the corner: the three taps are counted from here. Null until then. */
  private armedAt: number | null = null
  private taps = 0
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

  /** Whether a point is in the corner of a surface this wide. A surface that has not been measured yet has no corner. */
  private inCorner(x: number, y: number, width: number): boolean {
    return width > 0 && x >= width - CORNER && y <= CORNER
  }

  /**
   * Every touch-down on the surface, where it landed and how wide the surface
   * is. In the corner it starts a hold, or, once a hold has been lifted there,
   * counts as one of the three taps that show or hide the numbers. One
   * anywhere else starts everything again.
   */
  press(x: number, y: number, width: number, timeMs: number): void {
    if (!this.inCorner(x, y, width)) {
      this.heldSince = null
      this.armedAt = null
      this.taps = 0
      return
    }
    this.heldSince = timeMs
    if (this.armedAt === null) return
    if (timeMs - this.armedAt > WITHIN_MS) {
      // Too late: this touch may be the start of a new hold, and no more.
      this.armedAt = null
      this.taps = 0
      return
    }
    this.taps += 1
    if (this.taps >= 3) {
      this.armedAt = null
      this.taps = 0
      this.heldSince = null
      this.toggle()
    }
  }

  /** Every lift, and every touch the browser takes away, where it was. A finger held in the corner for a second and lifted there arms the three taps; a quick lift, or a lift anywhere else, arms nothing. */
  release(x: number, y: number, width: number, timeMs: number): void {
    const since = this.heldSince
    this.heldSince = null
    if (since === null || this.armedAt !== null) return
    if (this.inCorner(x, y, width) && timeMs - since >= HOLD_MS) {
      this.armedAt = timeMs
      this.taps = 0
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
    // wordless-ok: grown-up performance overlay, reached only by a held finger and three taps in the corner or by fps=1 in the address
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
