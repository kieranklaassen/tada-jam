import { KIND, Particles, type Landing } from './fx'
import { TruckMotion } from './motion'
import { TOOL_HOME } from './props'
import { react } from './reactions'
import type { VehicleDef } from './roster'
import { GRID_W, dab, type Hand, type Surface, type Tool } from './surface'
import * as voices from './voices'
import type { VoiceSpec } from './voices'

// The game in play, with no renderer and no browser: what is in the bay, what
// is in the hand, and what each touch sets going. The Mount turns a pointer
// into a `Target` and calls in; the view and the speaker read what comes out.

/** What a finger is on, as the view's picker found it. */
export type Target =
  | { kind: 'tool'; tool: Tool }
  /** A patch of the vehicle in the bay, and the point of its side that was touched (vehicle x and y). */
  | { kind: 'truck'; col: number; row: number; x: number; y: number }
  | { kind: 'next' }
  | { kind: 'puddle' }
  | { kind: 'none' }

export type Sound = { spec: VoiceSpec; gain: number }

export type Vehicle = { def: VehicleDef; surface: Surface; motion: TruckMotion }

/** Where the tool in hand is, in the world, and what it is doing. */
export type ToolSpot = { x: number; y: number; z: number; working: boolean }

/** A rub lays a dab each time the finger has crossed this share of a patch, and a held hose sprays again this often. */
const DAB_EVERY = 0.55
const HOSE_EVERY = 0.2
/** Small sounds from things landing and popping are spaced at least this far apart. */
const PLIP_GAP = 0.07
/** Where a tool waits by the vehicle when no finger is down: above the cab, out of the way of the paint. */
const READY: readonly [number, number, number] = [-1.5, 3.25, 1.0]

export class Play {
  hand: Hand = 'finger'
  readonly particles: Particles
  /** Sounds to play this frame. The Mount drains it. */
  readonly sounds: Sound[] = []
  /** Things that reached the floor this frame. The view drains it into the floor's marks. */
  readonly marks: Landing[] = []
  /** Set when something a save holds has changed. The Mount clears it. */
  dirty = false
  readonly tool: ToolSpot = { x: 0, y: 0, z: 0, working: false }
  private seconds = 0
  private pressing: Extract<Target, { kind: 'truck' }> | null = null
  private lastDab = { x: 0, y: 0, at: -1 }
  private slide = 0
  private variant = 0
  private rise = 0
  private lastPlip = -1

  constructor(public bay: Vehicle, seed = 0x77a5) {
    this.particles = new Particles(seed)
    this.rest()
  }

  /** A finger lands. */
  press(target: Target): void {
    if (target.kind === 'tool') return this.take(target.tool)
    if (target.kind !== 'truck') return
    this.pressing = target
    this.rise = 0
    this.slide = 0
    this.touch(target, true)
  }

  /** The finger moves, still down. `speed` is how fast it travels over the vehicle, in units a second. */
  drag(target: Target, speed: number): void {
    if (target.kind === 'tool' && this.hand !== target.tool && !this.pressing) return this.take(target.tool)
    if (target.kind !== 'truck') {
      // Off the vehicle the tool waits at its edge; the press on the body is let go.
      if (this.pressing) this.bay.motion.hold(null)
      this.pressing = null
      this.tool.working = false
      return
    }
    this.slide = speed
    const cell = (this.bay.def.side.x1 - this.bay.def.side.x0) / GRID_W
    const far = Math.hypot(target.x - this.lastDab.x, target.y - this.lastDab.y) >= cell * DAB_EVERY
    const fresh = !this.pressing
    this.pressing = target
    if (fresh || far) this.touch(target, fresh)
    else this.follow(target)
  }

  /** The finger lifts, or the touch is taken away. The tool stays in hand, where it was let go. */
  release(): void {
    this.pressing = null
    this.bay.motion.hold(null)
    this.bay.motion.lookAt = null
    this.tool.working = false
  }

  private take(tool: Tool): void {
    // A tap on the tool in hand hangs it up again.
    if (this.hand === tool) {
      this.hand = 'finger'
      this.sounds.push({ spec: voices.take.back(), gain: 1 })
      return
    }
    this.hand = tool
    this.sounds.push({ spec: voices.take[tool](), gain: 1 })
    this.rest()
  }

  /** Puts the tool spot where a tool waits: by the vehicle when one is in hand. */
  private rest(): void {
    const home = this.hand === 'finger' ? TOOL_HOME.sponge : READY
    this.tool.x = this.hand === 'finger' ? home[0] : this.bay.motion.homeX + home[0]
    this.tool.y = home[1]
    this.tool.z = home[2]
    this.tool.working = false
  }

  private follow(target: Extract<Target, { kind: 'truck' }>): void {
    const motion = this.bay.motion
    this.tool.x = motion.homeX + target.x
    this.tool.y = target.y
    this.tool.z = motion.homeZ + 0.98
    this.tool.working = true
    motion.lookAt = { side: 0.95 + Math.max(-1, Math.min(1, target.x / 2)) * 0.25, up: Math.max(-0.3, Math.min(0.5, (target.y - 1.5) * 0.3)) }
  }

  /** One dab at the target: the surface changes, and the touch is answered for what it met. */
  private touch(target: Extract<Target, { kind: 'truck' }>, landed: boolean): void {
    const bay = this.bay
    const result = dab(bay.surface, this.hand, target.col, target.row)
    if (!result.met.length) return
    if (result.surface !== bay.surface) {
      bay.surface = result.surface
      this.dirty = true
    }
    this.variant = (this.variant + 1 + (this.particles.random() < 0.3 ? 1 : 0)) % 4
    if (this.hand === 'cloth') this.rise = Math.min(1, this.rise + 0.12)
    const reaction = react(this.hand, result.met[0], { speed: Math.min(1, this.slide / 6), variant: this.variant, rise: this.rise })
    for (const spec of reaction.voices) this.sounds.push({ spec, gain: 1 })
    const wx = bay.motion.homeX + target.x, wz = bay.motion.homeZ + 1.0
    for (const b of reaction.bursts) {
      // A glint sits on the paint; everything else is thrown from it.
      if (b.kind === KIND.glint) for (let i = 0; i < b.count; i++) this.particles.emit(b.kind, wx + (this.particles.random() - 0.5) * 0.7, target.y + (this.particles.random() - 0.5) * 0.6, wz + 0.05, 0, 0, 0, b.size, b.life)
      else this.particles.burst(b.kind, b.count, wx, target.y, wz, b.speed, b.up, b.size, b.life)
    }
    bay.motion.hold({ x: target.x, y: target.y, force: reaction.force }, this.slide)
    if (landed) bay.motion.kick(target.x, reaction.kick)
    this.lastDab = { x: target.x, y: target.y, at: this.seconds }
    this.follow(target)
  }

  /** One frame of attended time. */
  step(dt: number): void {
    this.seconds += dt
    // A held hose keeps spraying where it points.
    if (this.pressing && this.hand === 'hose' && this.seconds - this.lastDab.at >= HOSE_EVERY) this.touch(this.pressing, false)
    this.bay.motion.step(dt)
    this.particles.step(dt, (landing) => {
      if (landing.kind !== KIND.bubble) this.marks.push(landing)
      if (this.seconds - this.lastPlip < PLIP_GAP) return
      this.lastPlip = this.seconds
      const size = Math.min(1, landing.size / 0.18)
      this.sounds.push({ spec: landing.kind === KIND.bubble ? voices.pop(size) : voices.plip(size), gain: 0.5 })
    })
  }
}
