// template: cartridge/overlay.ts v3

// The grown-up performance overlay. It is no part of the game a child plays:
// it shows only after a finger rests for a second in the top right corner,
// never leaving it, and lifts there, and three taps then follow there within
// three seconds; or with `?fps=1` in the address. The same gesture hides it again. A child who
// drums on the corner opens nothing: no run of quick taps, however long, has
// the hold in it. It reads what the Mount already measures and changes
// nothing, in the game or in a save.
// Its readout is the only text in the game. The wordless check accepts text
// in a file with this name alone, behind the comment the readout carries, so
// the overlay stays in this file and nothing meant for the child goes into it.
// Plain DOM, so it sits over a canvas 2D surface and a three.js one alike.

/**
 * The side of the corner that takes the gesture, in the surface's own pixels. Keep backdrop under it where the
 * layout can. A stage fitted into the surface shrinks with it and the corner does not, so on a small surface
 * the corner lies over things that answer a touch: it is the gesture, not the scenery, that keeps a child out.
 */
export const CORNER = 72
/** The finger that comes before the taps rests in the corner at least this long, never leaves it, and lifts there. */
export const HOLD_MS = 1000
/** The three taps count when the third lands no later than this after the held finger lifted. */
export const WITHIN_MS = 3000
/** The numbers are refreshed this often, so they can be read. */
export const EVERY_MS = 400

/** Whether a point of the surface is in that corner. A surface that has not been measured yet has no corner. */
export function inCorner(x: number, y: number, width: number): boolean {
  return width > 0 && x >= width - CORNER && y <= CORNER
}

export class Overlay {
  private readonly box: HTMLDivElement
  /** When the finger that is down in the corner landed, or null when none is. */
  private downAt: number | null = null
  /** When a held finger lifted in the corner: the three taps are counted from here. Null until then. */
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
    // It never takes a touch from the game: the touches that open it are passed in by the Mount.
    Object.assign(this.box.style, { position: 'absolute', top: '8px', right: '8px', zIndex: '3', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.6)', color: '#fff', font: '500 12px ui-monospace, Menlo, monospace', whiteSpace: 'pre', pointerEvents: 'none', display: 'none' })
    root.appendChild(this.box)
    if (new URLSearchParams(search).get('fps') === '1') this.toggle()
  }

  /**
   * The working finger's touch-down: where it landed, how wide the surface is, and when. The Mount passes that
   * finger alone, so a palm or a second finger landing neither counts as a tap nor undoes the first. In the
   * corner it starts a hold, or, once a hold has been lifted there, counts as one of the three taps that show
   * or hide the numbers. One anywhere else starts the gesture again.
   */
  press(x: number, y: number, width: number, timeMs: number): void {
    if (!inCorner(x, y, width)) {
      this.forget()
      return
    }
    this.downAt = timeMs
    // No held finger came first: this may be the held finger itself, and is no tap.
    if (this.armedAt === null) return
    if (timeMs - this.armedAt > WITHIN_MS) {
      // Too late: this touch may be the start of a new hold, and no more.
      this.armedAt = null
      this.taps = 0
      return
    }
    this.taps += 1
    if (this.taps >= 3) {
      this.forget()
      this.toggle()
    }
  }

  /**
   * The working finger moved. A hold stays in the corner, and so does a tap: a finger that leaves the corner
   * starts the gesture again, so one that lands there, plays over the game for a second and comes back to lift
   * has held nothing.
   */
  move(x: number, y: number, width: number): void {
    if (this.downAt !== null && !inCorner(x, y, width)) this.forget()
  }

  /**
   * The working finger's lift, where it left the surface. Held in the corner for a second and lifted there, it
   * arms the three taps. A quick lift arms nothing, and a finger that lifts outside the corner starts the
   * gesture again.
   */
  lift(x: number, y: number, width: number, timeMs: number): void {
    const downAt = this.downAt
    this.downAt = null
    if (downAt === null) return
    if (!inCorner(x, y, width)) {
      this.forget()
      return
    }
    // One of the three taps lifting: the count stands as it is.
    if (this.armedAt !== null) return
    if (timeMs - downAt >= HOLD_MS) this.armedAt = timeMs
  }

  /** A touch that never lifted (the surface was parked, or the browser took the finger) is no hold and no tap: the gesture starts again. */
  forget(): void {
    this.downAt = null
    this.armedAt = null
    this.taps = 0
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
    // wordless-ok: grown-up performance overlay, reached only by a held finger and then three taps in the corner or by fps=1 in the address
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
