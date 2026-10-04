// template: cartridge/overlay.ts v2

// The grown-up performance overlay. It is no part of the game a child plays:
// it shows only after one finger is held for a second in the top right corner
// and lifted there, and then taps three times in that corner within three
// seconds; or with `?fps=1` in the address. The same gesture hides it again.
// A child drumming on the corner opens nothing, because no tap counts until
// the corner has been held; and a hand laid or slapped on it is no hold and
// no tap, since a touch-down counts only while no other finger is on the
// surface and a moment after the last one. It reads what
// the Mount already measures and changes nothing, in the game or in a save.
// Its readout is the only text in the game. The wordless check accepts text
// in a file with this name alone, behind the comment the readout carries, so
// the overlay stays in this file and nothing meant for the child goes into it.
// Plain DOM, so it sits over a canvas 2D surface and a three.js one alike.

/** The side of the corner that takes the gesture, in the surface's own pixels. Keep backdrop under it, where nothing answers a touch, so a child does not open it by playing. */
export const CORNER = 72
/** The corner must first be held this long by one finger, and the finger lifted inside it. */
export const HOLD_MS = 1000
/** After that lift, three taps count when the last lands no later than this. */
export const WITHIN_MS = 3000
/** Two touch-downs closer together than this are the fingers of one hand coming down, not two taps. */
export const APART_MS = 80
/** The numbers are refreshed this often, so they can be read. */
export const EVERY_MS = 400

export class Overlay {
  private readonly box: HTMLDivElement
  private taps: number[] = []
  /** When the finger now in the corner came down, or null. */
  private downAt: number | null = null
  /** When a held finger was lifted in the corner: the three taps count from here. */
  private armedAt: number | null = null
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

  /**
   * Every touch-down on the surface: where it landed, how wide the surface is, and how many fingers are on the
   * surface with it. In the corner, by one finger, it begins a hold; once a hold has been lifted there, it is a
   * tap, and the third tap in time shows or hides the numbers. One anywhere else, a second finger down at the
   * same time, or two touch-downs too close together to be taps start the whole gesture again.
   */
  press(x: number, y: number, width: number, timeMs: number, fingersDown = 1): void {
    const armed = this.armedAt !== null && timeMs - this.armedAt <= WITHIN_MS
    const last = this.taps[this.taps.length - 1] ?? this.downAt
    this.downAt = null
    if (!this.inCorner(x, y, width) || fingersDown > 1 || (last !== null && timeMs - last < APART_MS)) {
      this.forget()
      return
    }
    this.downAt = timeMs
    if (!armed) {
      this.forget()
      this.downAt = timeMs
      return
    }
    this.taps.push(timeMs)
    if (this.taps.length >= 3) {
      this.forget()
      this.toggle()
    }
  }

  /** Every lift: where the finger left the surface. A finger that held the corner long enough and leaves inside it arms the three taps. */
  lift(x: number, y: number, width: number, timeMs: number): void {
    const downAt = this.downAt
    this.downAt = null
    if (downAt === null) return
    if (!this.inCorner(x, y, width)) {
      this.forget()
      return
    }
    // A tap of the three is short and leaves the count as it is; only a hold arms it.
    if (this.armedAt !== null && timeMs - this.armedAt <= WITHIN_MS) return
    if (timeMs - downAt >= HOLD_MS) {
      this.taps.length = 0
      this.armedAt = timeMs
    } else this.forget()
  }

  /** A touch the browser took away is no hold and no tap. */
  cancel(): void {
    this.forget()
  }

  private inCorner(x: number, y: number, width: number): boolean {
    // A surface that has not been measured yet has no corner.
    return width > 0 && x >= width - CORNER && y <= CORNER
  }

  private forget(): void {
    this.taps.length = 0
    this.armedAt = null
    this.downAt = null
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
    // wordless-ok: grown-up performance overlay, reached only by a hold and three taps in the corner or by fps=1 in the address
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
