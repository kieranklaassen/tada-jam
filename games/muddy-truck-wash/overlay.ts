// The grown-up frame-rate overlay. It is not part of the game a child plays:
// it shows only after two quick taps in the top left corner and a third press
// held there for a second, all with one finger, or with `?fps=1` in the
// address, and the same taps and hold hide it again. It reads what the Mount already measures and
// changes nothing.

/**
 * The corner that takes the taps, in logical pixels. Only bare wall is drawn under it. A tap there gets the knock
 * that any tap on nothing gets, so a child may well tap it; what a child does not do by playing is tap twice with
 * one finger and then hold it still for a second on a patch of wall, and that is what opens it: a hold that slides is a rub. A second finger or
 * a palm on the glass at any moment of it spoils it: nothing counts again until every finger is off.
 */
const CORNER = 72
/** The two taps and the start of the hold must come within this long. */
const WITHIN_MS = 700
/** No other tap in the corner for this long before the two taps. */
const QUIET_MS = 1000
/** The third press must stay down at least this long. */
const HOLD_MS = 1000
/** The held finger may wander this far, in logical pixels, and no further. */
const STILL = 20
/** Each of the two taps must lift again within this long. */
const TAP_MS = 350
/** The numbers are refreshed this often, so they can be read. */
const EVERY_MS = 400

export class Overlay {
  private readonly box: HTMLDivElement
  private taps: number[] = []
  /** When the press that may be the hold went down, or null. */
  private held: number | null = null
  /** How many fingers are on the surface, and whether more than one has been since it was last bare. */
  private down = 0
  private spoiled = false
  private pressedAt = 0
  private heldAt = { x: 0, y: 0 }
  private shown = false
  private frames = 0
  private sumMs = 0
  private worstMs = 0
  private since = 0

  constructor(root: HTMLElement, search: string) {
    this.box = root.ownerDocument.createElement('div')
    this.box.setAttribute('data-perf-overlay', '')
    Object.assign(this.box.style, { position: 'absolute', top: '8px', left: '8px', zIndex: '3', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.6)', color: '#fff', font: '500 12px ui-monospace, Menlo, monospace', whiteSpace: 'pre', pointerEvents: 'none', display: 'none' })
    root.appendChild(this.box)
    if (new URLSearchParams(search).get('fps') === '1') this.toggle()
  }

  /** A press on the surface. Two quick ones in the corner arm it; the third, if it stays down, shows or hides the numbers when it lifts. */
  press(x: number, y: number, timeMs: number): void {
    this.down += 1
    this.held = null
    this.pressedAt = timeMs
    // More than one finger on the glass is a hand, not the gesture.
    if (this.down > 1) this.spoiled = true
    if (this.spoiled) {
      this.taps.length = 0
      return
    }
    if (x > CORNER || y > CORNER) {
      this.taps.length = 0
      return
    }
    // Two taps and this press, close together, with quiet before them: a run of taps drummed in the corner is not the gesture, however it ends.
    const taps = this.taps
    taps.push(timeMs)
    if (taps.length > 4) taps.shift()
    const n = taps.length
    const close = n >= 3 && timeMs - taps[n - 3] <= WITHIN_MS
    const quietBefore = n < 4 || taps[n - 3] - taps[n - 4] > QUIET_MS
    if (close && quietBefore) {
      this.held = timeMs
      this.heldAt = { x, y }
    }
  }

  /** The surface went to rest with fingers on it: their lifts will not come, so the count starts again. */
  rest(): void {
    this.down = 0
    this.spoiled = false
    this.held = null
    this.taps.length = 0
  }

  /** A finger moves. A hold that slides away from where it went down, or out of the corner, is a rub and not the hold. */
  move(x: number, y: number): void {
    if (this.held === null) return
    if (x > CORNER || y > CORNER || Math.hypot(x - this.heldAt.x, y - this.heldAt.y) > STILL) {
      this.held = null
      this.taps.length = 0
    }
  }

  /** The finger lifts, or the touch is taken away (`cancelled`). A third press that stayed down long enough shows or hides the numbers. */
  lift(timeMs: number, cancelled = false): void {
    this.down = Math.max(0, this.down - 1)
    const since = this.held
    this.held = null
    if (this.spoiled) {
      this.taps.length = 0
      if (this.down === 0) this.spoiled = false
      return
    }
    if (since === null) {
      // One of the two taps: it counts only if it was a tap, quickly down and up.
      if (cancelled || timeMs - this.pressedAt > TAP_MS) this.taps.length = 0
      return
    }
    if (cancelled) return
    if (timeMs - since >= HOLD_MS) {
      this.taps.length = 0
      this.toggle()
    }
    // A third quick tap that did not stay down counts for nothing: the count starts again.
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
    // wordless-ok: grown-up frame-rate overlay, reached only by two taps and a held press in the corner or by fps=1 in the address
    this.box.textContent = `${fps.toFixed(0)} fps  worst ${this.worstMs.toFixed(0)} ms\nwork ${workMs.toFixed(1)} ms  tier ${tier}\n${drawCalls} calls  ${triangles} tris`
    this.frames = 0
    this.sumMs = 0
    this.worstMs = 0
  }

  dispose(): void {
    this.box.remove()
  }
}
