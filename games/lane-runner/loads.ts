import { LADDER, LADDER_MUD, type Figure } from './figures'
import { ACTS, type Lap, type LapEvent } from './lap'
import { LOADS, TAKEN_WITH, noMarks, type Load, type Marks } from './lapState'
import { sizeOf } from './placing'
import { Pose, Spell, Spring, TAU, arc, clamp } from './pose'
import { LADDER_LEANS, LOAD_FIGURES, SHELF_BEFORE, SHELF_HEIGHT, SHELF_SLOTS } from './props'
import { CLEAR, LENGTH, PLACES, ZONES, laneX, zoneAt } from './trail'

// Where each of the five loads is and how it looks: on the shelf, over the
// fox's head, laid on the trail, lying where a tumble threw it, or in the
// hands of the one who wanted it. Whatever has happened to a load shows on
// it. Nothing here draws, and nothing here decides: the lap says what the
// load is and what is left of it.

export type LoadName = Exclude<Load, 'none'>

/** The ladder lying on the board: laid over the stream, laid on the mud, dragged behind a rolling fox. */
export const LADDER_FLAT: Figure = {
  name: 'ladder-laid',
  parts: [
    { name: 'ladder', plaque: LADDER, pivot: [4, 10.5], at: [0, 0.42, 0], flat: true },
    { name: 'mud', plaque: LADDER_MUD, pivot: [4, 0], at: [0, 0.48, 0], flat: true, hidden: true, loose: true },
  ],
}

/** How far towards the child a carried load is from the fox: beyond the fox's own layers, so it is never in the fox. */
export const CARRIED_IN_FRONT = 5.53
/** How far a feather out of place stands out for each time the owlet was woken, as a turn in radians. */
export const RUFFLE_SPLAYS = 0.25
/** A load that has changed hands is held this far in front of whoever took it: in front of the fox too, which stands beside them. */
const KEPT_IN_FRONT = 9.51
/** A load that lies where a tumble threw it lies this far in front of the obstacle: nearer the child than everything of it. */
const LIES_IN_FRONT = 3.61
/** How far in front of the ball a fox has rolled into the load it hugs lies. */
const ON_THE_BALL = 0.355
/** How far in front of the shelf's board a load stands. */
const ON_SHELF_IN_FRONT = 1
/** How far behind a rolling fox the ladder drags. */
const DRAGS_BEHIND = 16
/** Where the owl holds on along the branch: pegs right of the trail's middle, and how high. */
export const ON_BRANCH = { x: -10, y: CLEAR.branchUnder + 4 }

export type Where = { figure: Figure; pose: Pose; x: number; y: number; s: number; z: number; shown: boolean }

/** What the hand-over does with the load: who has it, and how much of it they still hold. */
export type Kept = { x: number; y: number; s: number; left: number } | 'gone' | null

export class LoadMotion {
  readonly load: LoadName
  private readonly figure: Figure
  private readonly pose: Pose
  private readonly laid = new Pose(LADDER_FLAT)
  private readonly sway = new Spring(60, 5)
  private readonly bounce = new Spring(300, 14)
  private readonly thrown = new Spell()
  private readonly turning = new Spell()
  private readonly from = { x: 0, y: 0, s: 0 }
  private readonly out: Where

  constructor(load: LoadName) {
    this.load = load
    this.figure = LOAD_FIGURES[load]
    this.pose = new Pose(this.figure)
    this.out = { figure: this.figure, pose: this.pose, x: 0, y: 0, s: 0, z: 0, shown: true }
  }

  /** What the lap just did with this load. */
  on(event: LapEvent, lap: Lap, foxY: number): void {
    switch (event.type) {
      case 'throw':
        // It leaves the fox's hands where they were.
        this.from.x = lap.x
        this.from.y = foxY + CLEAR.fox
        this.from.s = lap.s
        this.thrown.start(0.5)
        break
      case 'take':
      case 'pickup':
      case 'catch':
        this.bounce.kick(30)
        break
      case 'lane':
        this.sway.kick(-event.dir * 2.4)
        break
      case 'land':
        this.bounce.kick(-24)
        break
      case 'stop':
        this.sway.kick(1.2)
        break
      case 'gag':
        if (event.gag === 'sway') this.sway.kick(5)
        else if (event.gag === 'turnover') this.turning.start(0.7)
        else if (event.gag === 'cradle') this.sway.kick(3)
        break
      case 'step':
        // On the stones a tall cake rocks with every hop, and wading rocks the owl.
        if (event.surface === 'stone' || event.surface === 'mud') this.sway.kick(event.foot === 0 ? 1.4 : -1.4)
        break
      default:
        break
    }
  }

  /**
   * Where the load is now. `fox` is the fox's pose this frame; `kept` is set while the hand-over has the load;
   * `hint` is 0 to 1, how hard the idle glow shows on a load that can be taken.
   */
  update(seconds: number, t: number, lap: Lap, fox: Pose, kept: Kept, hint: number): Where {
    const out = this.out, pose = this.pose
    pose.clear()
    out.figure = this.figure
    out.pose = pose
    out.shown = true
    const mine = lap.load === this.load
    const sway = this.sway.step(seconds), bounce = this.bounce.step(seconds), thrown = this.thrown.step(seconds), turning = this.turning.step(seconds)
    const marks: Marks = mine ? lap.marks : noMarks()
    let left = mine ? lap.left : TAKEN_WITH[this.load]

    if (!mine) {
      // On the shelf, whole, with a small life of its own; it beckons when the idle ladder says a load can be taken.
      out.x = SHELF_SLOTS[this.load]
      out.y = SHELF_HEIGHT
      out.s = PLACES.shelf - SHELF_BEFORE
      // Each a little further forward than the one before, so that no two of them share a plane.
      out.z = ON_SHELF_IN_FRONT + LOADS.indexOf(this.load) * 0.3
      pose.y = hint * Math.abs(Math.sin(t * 4 + out.x)) * 2
      pose.tilt = (this.load === 'ladder' ? LADDER_LEANS : 0) + 0.03 * Math.sin(t * 1.3 + out.x)
    } else if (kept === 'gone') {
      out.shown = false
    } else if (kept) {
      out.x = kept.x
      out.y = kept.y
      out.s = kept.s
      out.z = KEPT_IN_FRONT
      left = kept.left
      // In the paws of whoever took it the ladder leans as it did on the shelf: it stands upright nowhere.
      pose.tilt = this.load === 'ladder' ? LADDER_LEANS + clamp(sway * 0.03, -0.06, 0.06) : clamp(sway * 0.03, -0.2, 0.2)
    } else if (lap.carrying) this.carried(lap, fox, t, sway, bounce, turning)
    else if (lap.lies === 'branch') {
      // Asleep on the branch, holding on.
      out.x = ON_BRANCH.x
      out.y = ON_BRANCH.y
      out.s = ZONES.branch.mid
      out.z = 3
      pose.tilt = 0.08 * Math.sin(t * 1.6)
    } else if (lap.lies) {
      // Where the tumble threw it, on its side a little.
      const to = { x: laneX(lap.lies.lane), y: 0, s: lap.lies.at }
      const k = thrown >= 0 ? thrown : 1
      let ds = to.s - this.from.s
      if (ds > LENGTH / 2) ds -= LENGTH
      if (ds < -LENGTH / 2) ds += LENGTH
      out.x = thrown >= 0 ? this.from.x + (to.x - this.from.x) * k : to.x
      out.y = thrown >= 0 ? this.from.y * (1 - k) + arc(k) * 18 : 0
      out.s = thrown >= 0 ? this.from.s + ds * k : to.s
      out.z = LIES_IN_FRONT
      pose.tilt = thrown >= 0 ? k * TAU : 0.22
    } else out.shown = false

    this.dress(left, marks, lap, mine, t)
    return out
  }

  /** In the fox's hands, over its head, and what each cell of the grid does to it there. */
  private carried(lap: Lap, fox: Pose, t: number, sway: number, bounce: number, turning: number): void {
    const out = this.out, pose = this.pose
    const act = lap.act
    const p = act ? act.t / ACTS[act.kind].seconds : 0
    const rolled = lap.roll > 0 && !act
    const top = fox.y + (rolled ? CLEAR.ball : CLEAR.fox) * fox.sy
    out.x = fox.x
    out.y = top + 1 + Math.max(-1, bounce * 0.03)
    // Wherever the fox is drawn, its load is with it.
    out.s = lap.s + fox.s
    out.z = CARRIED_IN_FRONT
    pose.tilt = clamp(sway * 0.05 - lap.vx * 0.002, -0.3, 0.3)
    if (rolled && this.load !== 'ladder') {
      // A fox rolled into a ball hugs its load in front of it, pressed as low as the ball is: whatever the ball
      // passes under, the load passes under with it. This is the cake that comes out flat.
      const size = sizeOf(this.figure)
      out.y = fox.y + 1
      // It lies on the ball, in the ball's own plane: where the ball has room, the load has.
      out.z = ON_THE_BALL
      pose.tilt = 0
      pose.sy = Math.min(1, (CLEAR.ball * fox.sy - 2) / size.tall)
      pose.sx = Math.min(1, (CLEAR.ball * fox.sx - 2) / (size.half * 2))
      return
    }
    switch (this.load) {
      case 'cake':
        break
      case 'ladder': {
        const zone = zoneAt(lap.s)
        if (lap.mode === 'bridge' || lap.mode === 'duckboard' || rolled) {
          // Laid on the board: across the stream as a bridge, on the mud as a duckboard that is taken up and laid again, or dragged behind a ball.
          out.figure = LADDER_FLAT
          out.pose = this.laid
          this.laid.clear()
          this.laid.parts.mud.show = lap.marks.muddy
          out.x = laneX(lap.lane)
          out.y = 0
          out.z = 0
          if (rolled) out.s = lap.s - DRAGS_BEHIND
          else if (zone === 'stream') out.s = ZONES.stream.mid
          else out.s = ZONES.mud.from + (Math.floor((lap.s - ZONES.mud.from) / 20) + 0.5) * 20
          return
        }
        if (act?.kind === 'climb' && p < 0.6) {
          // Propped against the thicket, at its near edge.
          out.x = laneX(lap.lane)
          out.y = 0
          out.s = act.from - 1
          pose.tilt = -0.2
          return
        }
        if (act?.kind === 'vault' && p < 0.9) {
          // Planted before the log: it bends over as the fox goes.
          out.x = laneX(lap.lane)
          out.y = 0
          out.s = act.from - 1
          pose.tilt = (0.5 - p) * 0.9
          return
        }
        // Carried level over its head, as long as a lane is wide.
        pose.parts.ladder.turn = pose.parts.mud.turn = Math.PI / 2
        out.x += 10.5
        out.y += 4
        if (act?.kind === 'snag') pose.tilt = 0.12 * Math.sin(p * TAU * 2)
        break
      }
      case 'balloons':
        // The strings are in one hand and the balloons pull up and back.
        out.x += 5
        out.y = fox.y + 20 * fox.sy
        pose.tilt = clamp(sway * 0.06 + lap.speed * 0.002, -0.4, 0.4)
        if (act?.kind === 'catch') {
          // Caught under the branch: pressed flat against it, squeaking along.
          out.y = 3
          pose.sy = 0.62
          pose.tilt = 0.1 * Math.sin(t * 40)
        }
        break
      case 'owl':
        if (act?.kind === 'flight') {
          // Awake and flapping, with the fox by the ears.
          out.y = top + 3
          pose.tilt = 0.3 * Math.sin(t * 22)
        } else if (turning >= 0) {
          // A somersault in its sleep, nest and all.
          pose.tilt = turning * TAU
          out.y += arc(turning) * 8
        }
        break
      case 'bucket':
        if (act?.kind === 'blind') {
          // Upside down over the fox's head, down to its shoulders: lower than the branch it runs under.
          pose.tilt = Math.PI
          out.y = top - 12
        }
        break
    }
  }

  /** What shows of the load: how much is left, and what the lap has put on it. */
  private dress(left: number, marks: Marks, lap: Lap, mine: boolean, t: number): void {
    const parts = this.pose.parts
    const tossed = mine && lap.tossed && lap.carrying
    // What a jump tossed is above the load for as long as the fox is in the air.
    const flung = tossed ? Math.max(0, lap.y) * 0.5 + 2 : 0
    switch (this.load) {
      case 'cake': {
        const tiers = ['tier1', 'tier2', 'tier3'] as const
        tiers.forEach((name, i) => {
          parts[name].show = i < left
          parts[name].dy = i === left - 1 ? flung : 0
        })
        // A tier that went into the mud is the top one, brown.
        const muddy = marks.muddy && left > 0
        parts.mud.show = muddy
        if (muddy) {
          parts[tiers[left - 1]].show = false
          parts.mud.dy = (left - 3) * 5 + flung
        }
        parts.cherry.show = left === 3 && !muddy
        parts.cherry.dy = flung
        parts.berries.show = marks.berries && left > 0
        parts.drops.show = marks.wet
        parts.drops.dy = -((t * 4) % 2)
        break
      }
      case 'ladder':
        parts.mud.show = marks.muddy
        break
      case 'balloons':
        // A balloon that is still to pop on a thorn is still there.
        const there = left + (mine ? lap.popping : 0)
        for (let i = 1; i <= 4; i++) {
          parts[`balloon${i}`].show = i <= there
          parts[`string${i}`].show = i <= there || there === 0
          parts[`balloon${i}`].dy = Math.sin(t * 1.7 + i) * 0.6
        }
        break
      case 'owl': {
        const awake = mine && lap.act?.kind === 'flight'
        parts.asleep.show = !awake
        parts.awake.show = awake
        // Asleep it breathes, slowly.
        parts.asleep.dy = 0.4 * Math.sin(t * 1.9)
        // Ruffled is two feathers out of place at once and a third from the second waking; after that they only
        // stand further out. Nothing on the owlet can be counted for how often it woke.
        parts.ruffle1.show = parts.ruffle2.show = marks.ruffles >= 1
        parts.ruffle3.show = marks.ruffles >= 2
        parts.ruffle1.turn = -RUFFLE_SPLAYS * marks.ruffles
        parts.ruffle2.turn = RUFFLE_SPLAYS * marks.ruffles
        parts.drops.show = marks.wet
        parts.mud.show = marks.muddy
        break
      }
      case 'bucket':
        for (let i = 1; i <= 3; i++) parts[`water${i}`].show = i <= left - (tossed ? 1 : 0)
        // The slop that a jump tossed, above the pail.
        parts.wave.show = tossed || left > 0
        parts.wave.dy = tossed ? 8 + flung : left * 2 - 1 + 0.3 * Math.sin(t * 6)
        break
    }
  }
}
