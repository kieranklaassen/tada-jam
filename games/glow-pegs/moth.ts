import { BLUE, GREEN, RED, WHITE, YELLOW, centreOf, perchOf, type Colour } from './board'
import { MOTH_HOME, RIM_Y } from './layout'
import type { Cue } from './voices'

// The moth. It is the smallest of the three and the quickest. It flies in a
// wobbling line to the peg lit last and settles on the corner beside it,
// never on a hole (`perchOf` in board.ts). What it does on arriving depends
// on the colour, and never changes. With no light to sit by it clings to its
// own bulb in the marquee. While a beam runs it leaves its perch and chases
// the newest flash, and it is back beside its hole when the lever lifts:
// `perch` is what a save keeps, and a chase never changes it. Pure numbers on
// the game's clock: each sound is given on the frame its motion is seen.

export type MothAct = 'fan' | 'doze' | 'loop' | 'bump' | 'giddy' | 'tumble' | 'leaf' | 'droop'

export const MOTH_TASTE: Record<Colour, MothAct> = { [RED]: 'fan', [BLUE]: 'doze', [YELLOW]: 'loop', [GREEN]: 'bump', [WHITE]: 'giddy' }
export const MOTH_ACT_LENGTH: Record<MothAct, number> = { fan: 1.6, doze: 0.8, loop: 0.9, bump: 0.7, giddy: 1.4, tumble: 1.05, leaf: 3.2, droop: 0.55 }
/** When the bumping moth touches the peg. */
export const BUMP_TOUCHES = [0.175, 0.525] as const
/** How far the drooping moth sinks where it sat, in stage units, before it flies home. */
export const DROOP_SINK = 9
/** The share of the leaf act it spends spinning down; the rest is the climb back to its bulb. */
export const LEAF_DOWN = 0.55

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const smooth = (t: number) => t * t * (3 - 2 * t)

export class Moth {
  x: number
  y: number
  /** The hole it sits beside or is flying to, or null for its bulb. This is what a save keeps. */
  perch: number | null
  /** `away`: sitting at a flash it caught, off its own perch. `ride`: carried by whatever `carry` last said. */
  mode: 'sit' | 'fly' | 'act' | 'away' | 'ride' = 'sit'
  act: MothAct | null = null
  /** Seconds into the flight or the act. */
  t = 0
  /** The way it faces, in radians. */
  heading = -Math.PI / 2
  /** Folded up asleep beside a blue peg, until it next flies. */
  dozing = false
  /** Counts on for the slow opening and shutting of its wings. */
  wing = 0
  private fromX = 0
  private fromY = 0
  private toX = 0
  private toY = 0
  private length = 0
  private taste: Colour | null = null
  /** What the flight under way ends in: at its own perch, or at a flash it chased. */
  private chasing = false

  constructor(perch: number | null) {
    this.perch = perch
    const at = this.restingPlace()
    this.x = at.x
    this.y = at.y
  }

  /** Where it sits when it sits: beside its hole, or at its bulb. */
  restingPlace(): { x: number; y: number } {
    return this.perch === null ? MOTH_HOME : perchOf(this.perch)
  }

  /** Still enough for a touch to find it, where it is drawn. In the air, or in the middle of a caper, it is no target. */
  get resting(): boolean {
    return this.mode === 'sit' || this.mode === 'away' || (this.mode === 'act' && (this.act === 'fan' || this.act === 'doze'))
  }

  /** In the air: its wings beat fast and it is drawn larger. */
  get flying(): boolean {
    return this.mode === 'fly' || this.mode === 'ride' || (this.mode === 'act' && this.act !== 'fan' && this.act !== 'doze' && this.act !== 'droop')
  }

  private launch(x: number, y: number): void {
    this.mode = 'fly'
    this.act = null
    this.dozing = false
    this.t = 0
    this.fromX = this.x
    this.fromY = this.y
    this.toX = x
    this.toY = y
    this.length = Math.max(0.25, Math.min(1, Math.hypot(x - this.x, y - this.y) / 460))
  }

  /** Flies to a hole's perch, or home with null, and sits there from now on. `taste` is the colour of the peg it flies to, for what it does on landing. */
  flyTo(perch: number | null, taste: Colour | null): void {
    this.perch = perch
    this.taste = taste
    this.chasing = false
    const to = this.restingPlace()
    this.launch(to.x, to.y)
  }

  /** Chases a flash: flies to the corner beside that hole and waits there. Its own perch does not change. */
  chase(hole: number): void {
    const to = perchOf(hole)
    if (this.mode === 'away' && this.x === to.x && this.y === to.y) return
    if (this.mode === 'fly' && this.chasing && this.toX === to.x && this.toY === to.y) return
    this.chasing = true
    this.launch(to.x, to.y)
  }

  /** Is carried: it rides whatever is at this point, a step nearer each frame. */
  carry(x: number, y: number): void {
    this.mode = 'ride'
    this.act = null
    this.dozing = false
    this.toX = x
    this.toY = y
  }

  /** Its light is about to go: it gives up its perch for its bulb, and one in the air hangs on where it was going, landing nowhere, until the fall takes it. */
  unperch(): void {
    this.perch = null
    if (this.mode === 'fly') this.carry(this.toX, this.toY)
  }

  /** Away from its perch for a chase or a ride, it flies back to where it belongs. On its perch already, it stays. */
  comeBack(): void {
    if (this.mode === 'away' || this.mode === 'ride' || (this.mode === 'fly' && this.chasing)) this.flyTo(this.perch, null)
  }

  /**
   * Its light is gone. Its perch is its bulb from this moment; sitting, it first droops where it sat, wings
   * shut and head hanging, and then flies home. One already in the air turns for home at once.
   */
  droopHome(): void {
    const sitting = this.mode === 'sit' || (this.mode === 'act' && (this.act === 'fan' || this.act === 'doze'))
    if (!sitting) return this.flyTo(null, null)
    this.perch = null
    this.taste = null
    this.chasing = false
    this.mode = 'act'
    this.act = 'droop'
    this.dozing = false
    this.t = 0
    this.fromX = this.x
    this.fromY = this.y
  }

  /** How far it has drooped, 0 to 1: its wings shut and its head hangs by this much. */
  get droop(): number {
    return this.mode === 'act' && this.act === 'droop' ? smooth(clamp01(this.t / (MOTH_ACT_LENGTH.droop * 0.6))) : 0
  }

  /** Knocked or poked off where it sits: it tumbles and comes back to the same place. */
  tumble(): Cue[] {
    if (this.mode !== 'away') {
      this.toX = this.restingPlace().x
      this.toY = this.restingPlace().y
      this.chasing = false
    }
    this.mode = 'act'
    this.act = 'tumble'
    this.dozing = false
    this.t = 0
    return [{ name: 'squeak' }]
  }

  /** Caught in falling pegs: it spins down like a leaf and climbs back to its bulb. Its perch is its bulb from now on. */
  leaf(): Cue[] {
    this.perch = null
    this.chasing = false
    this.mode = 'act'
    this.act = 'leaf'
    this.dozing = false
    this.t = 0
    this.fromX = this.x
    this.fromY = this.y
    return [{ name: 'leaf', scene: true }]
  }

  /** Where it would be now if it were simply sitting: what a put-away and a scene's end leave. */
  settle(): void {
    const at = this.restingPlace()
    this.x = at.x
    this.y = at.y
    this.mode = 'sit'
    this.act = null
    this.t = 0
    this.dozing = false
    this.chasing = false
    this.heading = -Math.PI / 2
  }

  step(dt: number): Cue[] {
    this.wing += dt
    const cues: Cue[] = []
    if (this.mode === 'ride') {
      const k = 1 - Math.exp(-dt * 14)
      const px = this.x
      this.x += (this.toX - this.x) * k
      this.y += (this.toY - this.y) * k
      if (Math.abs(this.x - px) > 0.2) this.heading = this.x > px ? 0 : Math.PI
      return cues
    }
    if (this.mode === 'fly') {
      this.t += dt
      const u = clamp01(this.t / this.length)
      const s = smooth(u)
      const dx = this.toX - this.fromX, dy = this.toY - this.fromY
      const far = Math.hypot(dx, dy) || 1
      // Its own way of flying: wide wobbles across its line that tighten as it nears the light, none at either end.
      const wobble = 22 * Math.sin(u * Math.PI * 5) * Math.sin(u * Math.PI) * (1 - 0.5 * u)
      const px = this.x, py = this.y
      this.x = this.fromX + dx * s + (-dy / far) * wobble
      this.y = this.fromY + dy * s + (dx / far) * wobble
      if (this.x !== px || this.y !== py) this.heading = Math.atan2(this.y - py, this.x - px)
      if (u >= 1) {
        this.x = this.toX
        this.y = this.toY
        if (this.chasing) {
          // It catches the flash with a dry flutter and waits there for the next.
          cues.push({ name: 'flutter' })
          this.mode = 'away'
          return cues
        }
        // It lands with a pat beside a peg, and bumps the glass of its bulb with a tink.
        cues.push({ name: this.perch === null ? 'tink' : 'pat' })
        if (this.taste !== null && this.perch !== null) {
          this.mode = 'act'
          this.act = MOTH_TASTE[this.taste]
          this.t = 0
          if (this.act !== 'bump') cues.push({ name: 'mothTaste', colour: this.taste })
        } else {
          this.mode = 'sit'
        }
      }
      return cues
    }
    if (this.mode === 'act' && this.act) return this.playAct(dt, cues)
    // Sitting, on its perch or away: it turns to face its light.
    if (this.mode === 'sit') {
      const home = this.restingPlace()
      const peg = this.perch === null ? { x: home.x, y: home.y - 30 } : centreOf(this.perch)
      this.heading = Math.atan2(peg.y - this.y, peg.x - this.x)
    }
    return cues
  }

  private playAct(dt: number, cues: Cue[]): Cue[] {
    const act = this.act!
    const before = this.t
    this.t += dt
    const u = clamp01(this.t / MOTH_ACT_LENGTH[act])
    if (act === 'droop') {
      // It sinks where it sat, head down, and then lets go for home. It lands nowhere, so nothing sounds here.
      this.x = this.fromX
      this.y = this.fromY + DROOP_SINK * this.droop
      this.heading = -Math.PI / 2 + Math.PI * 0.8 * this.droop
      if (u >= 1) this.flyTo(null, null)
      return cues
    }
    // A tumble away from its perch comes back to where it was waiting.
    const away = act === 'tumble' && this.chasing
    const home = away ? { x: this.toX, y: this.toY } : this.restingPlace()
    const peg = this.perch === null || away ? home : centreOf(this.perch)
    let x = home.x, y = home.y
    if (act === 'loop') {
      const turn = u * Math.PI * 2
      x += 20 * Math.sin(turn)
      y -= 20 * (1 - Math.cos(turn))
    } else if (act === 'bump') {
      // Two darts at the peg, the second shorter; it touches on its beats.
      const reach = Math.abs(Math.sin((this.t / 0.175) * (Math.PI / 2))) * (1 - u) * 0.42
      x += (peg.x - home.x) * reach
      y += (peg.y - home.y) * reach
      for (const touch of BUMP_TOUCHES) if (touch > before && touch <= this.t) cues.push({ name: 'mothTaste', colour: GREEN })
    } else if (act === 'giddy') {
      // Twice round the peg, starting and ending on its perch.
      const turn = smooth(u) * Math.PI * 4
      const ax = home.x - peg.x, ay = home.y - peg.y
      x = peg.x + ax * Math.cos(turn) - ay * Math.sin(turn)
      y = peg.y + ax * Math.sin(turn) + ay * Math.cos(turn)
    } else if (act === 'tumble') {
      const out = 36 * Math.sin(u * Math.PI)
      x += out * Math.cos(u * 14)
      y += out * Math.sin(u * 14) - 10 * Math.sin(u * Math.PI)
    } else if (act === 'leaf') {
      // Down to the tray's rim in wide swings, and then a straight climb to its bulb.
      const low = { x: this.fromX, y: RIM_Y - 24 }
      if (u < LEAF_DOWN) {
        const v = u / LEAF_DOWN
        x = this.fromX + (low.x - this.fromX) * v + 46 * Math.sin(v * Math.PI * 3.5) * (1 - 0.4 * v)
        y = this.fromY + (low.y - this.fromY) * v * v
      } else {
        const v = smooth((u - LEAF_DOWN) / (1 - LEAF_DOWN))
        x = low.x + (home.x - low.x) * v
        y = low.y + (home.y - low.y) * v
      }
    }
    if (x !== this.x || y !== this.y) this.heading = act === 'tumble' || (act === 'leaf' && u < LEAF_DOWN) ? u * 30 : Math.atan2(y - this.y, x - this.x)
    this.x = x
    this.y = y
    if (act === 'doze') this.dozing = true
    if (u >= 1) {
      this.x = home.x
      this.y = home.y
      // After a loop it lands a second time; after its fall it bumps its bulb.
      if (act === 'loop') cues.push({ name: 'pat' })
      if (act === 'leaf') cues.push({ name: 'tink', scene: true })
      this.mode = away ? 'away' : 'sit'
      this.act = null
    }
    return cues
  }

  /** 0 shut to 1 wide: fast in the air, slow and wide at a red peg, almost shut asleep, a slow breath otherwise. */
  get wingOpen(): number {
    if (this.act === 'droop' && this.mode === 'act') return 0.6 * (1 - this.droop)
    if (this.flying) return 0.5 + 0.5 * Math.sin(this.wing * 46)
    if (this.act === 'fan') return 0.5 + 0.5 * Math.sin(this.wing * 7.8)
    if (this.dozing) return 0.08
    return 0.62 + 0.3 * Math.sin(this.wing * 2.4)
  }
}
