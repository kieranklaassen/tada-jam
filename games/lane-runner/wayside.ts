import type { Figure } from './figures'
import type { Lap, LapEvent } from './lap'
import { watch, type Sight } from './motion'
import { Now, Pose, Spell, Spring, TAU, arc, clamp } from './pose'
import { BIRD_AT, BIRD_BY_TIER, CAP_NAMES, KEBAB_AT, NEIGHBOURS, OBSTACLE_FIGURES, SKIN_AT, thornLane, type Fixed, type Neighbour } from './props'
import { laneX } from './trail'

// What stands on the trail and beside it, and how each of them moves: the
// five obstacles that are not the goose, and the seven who live between
// them. Each obstacle is large and already funny at rest, makes itself known
// with a motion of its own when the fox is three steps off, and shows what a
// lap has left on it. Each neighbour has one move of its own and looks at a
// fox that goes by; none of them is in the way and none answers a finger.

export abstract class Standing {
  abstract readonly figure: Figure
  abstract readonly pose: Pose
  /** What the lap just did. */
  on(_event: LapEvent): void {}
  abstract update(seconds: number, t: number, lap: Lap, sight: Sight): Pose
}

// --- The stream: reeds, and a fish that jumps ------------------------------------

class StreamMotion extends Standing {
  readonly figure = OBSTACLE_FIGURES.stream
  readonly pose = new Pose(this.figure)
  private readonly leap = new Spell()
  private readonly sail = new Spell()
  private readonly reeds = new Spring(40, 3)
  private readonly idle = new Now(101, 5, 9)
  private boatFrom = 0

  override on(event: LapEvent): void {
    if (event.type === 'near' && event.obstacle === 'stream') this.leap.start(0.8)
    if (event.type !== 'gag' || event.obstacle !== 'stream') return
    this.reeds.kick(3)
    if (event.gag === 'sail') {
      // The tier goes off downstream like a boat, and is gone.
      this.boatFrom = laneX(event.lane)
      this.sail.start(2.6)
    }
  }

  update(seconds: number, t: number): Pose {
    const pose = this.pose, parts = pose.parts
    pose.clear()
    const reeds = this.reeds.step(seconds)
    parts.reedsLeft.turn = 0.05 * Math.sin(t * 1.1) + reeds * 0.05
    parts.reedsRight.turn = 0.05 * Math.sin(t * 1.3 + 2) - reeds * 0.05
    if (!this.leap.on && this.idle.due(t)) this.leap.start(0.8)
    const leap = this.leap.step(seconds)
    parts.fish.show = leap >= 0
    if (leap >= 0) {
      // Out of the water in an arc, nose first, and back in.
      parts.fish.dx = -10 * leap
      parts.fish.dy = arc(leap) * 12
      parts.fish.turn = 0.9 - leap * 1.8
    }
    const sail = this.sail.step(seconds)
    parts.boat.show = sail >= 0
    if (sail >= 0) {
      parts.boat.dx = this.boatFrom + sail * 70
      parts.boat.dy = 0.6 * Math.sin(sail * TAU * 3)
      parts.boat.turn = 0.12 * Math.sin(sail * TAU * 2)
    }
    return pose
  }
}

// --- The low branch: leaves, and the bird that lives on it -----------------------

class BranchMotion extends Standing {
  readonly figure = OBSTACLE_FIGURES.branch
  readonly pose = new Pose(this.figure)
  private readonly shake = new Spring(180, 8)
  private readonly hop = new Spring(300, 14)
  private readonly peck = new Now(111, 2.5, 5)
  private readonly pecking = new Spell()

  override on(event: LapEvent): void {
    if (event.type === 'near' && event.obstacle === 'branch') {
      // The bird sees the fox coming: it hops, and the leaves shake under it.
      this.hop.kick(40)
      this.shake.kick(7)
    }
    if (event.type === 'gag' && event.obstacle === 'branch') {
      this.shake.kick(event.gag === 'bonk' || event.gag === 'snag' || event.gag === 'clang' ? 9 : 5)
      this.hop.kick(event.gag === 'birdTier' ? 20 : 50)
    }
    if (event.type === 'cue' && (event.act === 'snag' || event.act === 'catch')) this.shake.kick(3)
  }

  update(seconds: number, t: number, lap: Lap, sight: Sight): Pose {
    const pose = this.pose, parts = pose.parts
    pose.clear()
    const shake = this.shake.step(seconds)
    parts.leaves.dy = clamp(shake * 0.25, -1.5, 1.5) + 0.3 * Math.sin(t * 1.2)
    parts.leaves.dx = 0.4 * Math.sin(t * 0.9)
    parts.limb.dy = clamp(shake * 0.12, -0.8, 0.8)
    parts.crown.turn = 0.012 * Math.sin(t * 0.8) + shake * 0.004
    // A tier that stayed on the branch lies over the lane it was lost in, and is the bird's: it sits by it and eats.
    const left = lap.trail.leftovers.find((one) => one.obstacle === 'branch')
    const tier = left !== undefined
    parts.tierOn.show = tier
    parts.tierOn.dx = left ? laneX(left.lane) : 0
    parts.tierOn.dy = parts.limb.dy
    if (this.peck.due(t)) this.pecking.start(tier ? 0.9 : 0.4)
    const peck = this.pecking.step(seconds)
    parts.bird.dx = left ? laneX(left.lane) + BIRD_BY_TIER - BIRD_AT : 0
    parts.bird.dy = Math.max(0, this.hop.step(seconds) * 0.1) + parts.limb.dy
    parts.bird.turn = peck >= 0 ? 0.5 * Math.abs(Math.sin(peck * TAU * (tier ? 3 : 1))) : sight.right < -10 ? 0.15 : 0
    return pose
  }
}

// --- The mud: bubbles, and the pig that lies in it --------------------------------

class MudMotion extends Standing {
  readonly figure = OBSTACLE_FIGURES.mud
  readonly pose = new Pose(this.figure)
  private readonly start = new Spring(240, 12)
  private readonly bubbling = [new Spell(), new Spell(), new Spell()]
  private readonly idle = new Now(121, 1.2, 2.6)
  private readonly blink = new Now(122, 3, 6)
  private readonly shutFor = new Spell()

  override on(event: LapEvent): void {
    if (event.type === 'near' && event.obstacle === 'mud') {
      for (const bubble of this.bubbling) bubble.start(0.6)
      this.start.kick(14)
    }
    if (event.type === 'gag' && event.obstacle === 'mud' && (event.gag === 'flop' || event.gag === 'mudpie' || event.gag === 'puddle')) this.start.kick(40)
  }

  update(seconds: number, t: number, _lap: Lap, sight: Sight): Pose {
    const pose = this.pose, parts = pose.parts
    pose.clear()
    // The pig breathes, flicks its tail, and is lifted clean off the mud when something lands in it.
    const start = this.start.step(seconds)
    parts.pig.dy = Math.max(0, start * 0.12) + 0.4 * Math.sin(t * 1.4)
    parts.tail.dy = parts.pig.dy
    parts.tail.turn = 0.5 * Math.sin(t * 6) * clamp(Math.sin(t * 0.7) * 2, 0, 1)
    if (this.idle.due(t)) this.bubbling[Math.floor(this.idle.roll() * 3)].start(0.6)
    this.bubbling.forEach((bubble, i) => {
      const p = bubble.step(seconds)
      const part = parts[`bubble${i + 1}`]
      part.show = p >= 0
      // It swells out of the mud and is gone.
      if (p >= 0) part.dy = arc(p) * 1.5
    })
    watch(pose, { right: sight.right - 54, ahead: sight.ahead, up: sight.up })
    if (this.blink.due(t)) this.shutFor.start(0.3)
    pose.shut = this.shutFor.step(seconds) >= 0
    return pose
  }
}

// --- The brambles: two arches that scowl -------------------------------------------

class BrambleMotion extends Standing {
  readonly figure = OBSTACLE_FIGURES.brambles
  readonly pose = new Pose(this.figure)
  private readonly shiver = new Spring(260, 9)
  private readonly rear = new Spring(180, 11)
  private readonly blink = new Now(141, 2.4, 5)
  private readonly glance = new Now(142, 3, 6)
  private readonly shutFor = new Spell()
  private readonly glanceFor = new Spell()
  private readonly ring = [new Spring(300, 12), new Spring(300, 12)]
  private glanceTo = 1

  override on(event: LapEvent): void {
    // Each chime of the run opens the blossom a little further, one arch and then the other.
    if (event.type === 'chime' || (event.type === 'gag' && event.gag === 'flowers')) {
      this.ring[(event.type === 'chime' ? event.index : 0) % 2].kick(16)
      this.shiver.kick(2)
    }
    if (event.type === 'near' && event.obstacle === 'brambles') {
      // They see the fox coming: both rear up off the board and bristle.
      this.shiver.kick(8)
      this.rear.kick(5)
    }
    if (event.type === 'gag' && event.obstacle === 'brambles') this.shiver.kick(event.gag === 'floomp' || event.gag === 'flowers' ? 4 : 8)
  }

  update(seconds: number, t: number, lap: Lap, sight: Sight): Pose {
    const pose = this.pose, parts = pose.parts
    pose.clear()
    const shiver = clamp(this.shiver.step(seconds) * 0.25, -1, 1)
    // The two bristle out of step with each other, never by more than the tunnel has room to spare.
    parts.arch0.dx = shiver * 0.6
    parts.arch1.dx = -shiver * 0.6
    // Rearing lifts them off the board and never presses them into it: the tunnels only get higher.
    const rear = Math.min(2.5, Math.abs(this.rear.step(seconds)))
    parts.arch0.dy = rear
    parts.arch1.dy = rear * 0.7
    // The thicket they grow from heaves with them, slower, and breathes when nobody is near.
    parts.thicket.dx = shiver * 0.3
    parts.thicket.turn = -rear * 0.02 + 0.015 * Math.sin(t * 1.1)
    // In flower they are soft, and shut their eyes.
    const flowers = lap.trail.flowers
    parts.bloom0.show = parts.bloom1.show = flowers
    parts.bloom0.dy = 0.3 * Math.sin(t * 1.4) + Math.max(0, this.ring[0].step(seconds) * 0.1)
    parts.bloom1.dy = 0.3 * Math.sin(t * 1.4 + 1.5) + Math.max(0, this.ring[1].step(seconds) * 0.1)
    parts.bloom0.dx = parts.arch0.dx
    parts.bloom1.dx = parts.arch1.dx
    // What a lap leaves in the thorns, each thing at the lane it was left in: the skins of balloons, on a thorn
    // each, or a tier of cake. A balloon that has yet to pop has left no skin yet.
    const left = lap.trail.leftovers.filter((one) => one.obstacle === 'brambles')
    const cake = lap.load === 'cake'
    parts.kebab.show = cake && left.length > 0
    if (left.length > 0) parts.kebab.dx = KEBAB_AT[thornLane(left[0].lane)]
    for (let i = 1; i <= 3; i++) {
      const skin = parts[`skin${i}`]
      skin.show = !cake && i <= left.length - lap.popping
      skin.turn = 0.2 * Math.sin(t * 2 + i)
      if (i > left.length) continue
      const [x, y] = SKIN_AT[thornLane(left[i - 1].lane)][i - 1]
      skin.dx = x
      skin.dy = y
    }
    watch(pose, sight)
    pose.lookY = 0
    // With nobody near they scowl about them by themselves, and blink.
    if (this.glance.due(t)) {
      this.glanceTo = this.glance.roll() < 0.5 ? -1 : 1
      this.glanceFor.start(0.9)
    }
    if (this.glanceFor.step(seconds) >= 0) pose.lookX = this.glanceTo
    if (this.blink.due(t)) this.shutFor.start(0.16)
    pose.shut = flowers || this.shutFor.step(seconds) >= 0
    return pose
  }
}

// --- The log: a squirrel lives at its end -------------------------------------------

class LogMotion extends Standing {
  readonly figure = OBSTACLE_FIGURES.log
  readonly pose = new Pose(this.figure)
  private readonly thump = new Spring(300, 12)
  private readonly drum = new Spell()
  private readonly flick = new Now(131, 1.5, 4)
  private readonly flicking = new Spell()
  private readonly blink = new Now(132, 2, 5)
  private readonly shutFor = new Spell()
  private readonly sprout = [new Spring(200, 9), new Spring(200, 9), new Spring(200, 9)]
  private had = false
  /** How many of the three mushrooms are up. */
  private up = 0

  override on(event: LapEvent): void {
    if (event.type === 'near' && event.obstacle === 'log') this.drum.start(0.6)
    if (event.type === 'gag' && event.obstacle === 'log') this.thump.kick(event.gag === 'trip' || event.gag === 'vault' ? 30 : 14)
    // Each bloop is one mushroom coming up: the first as the water lands, then the next along the log.
    const cap = event.type === 'gag' && event.gag === 'mushrooms' ? 0 : event.type === 'bloop' ? event.index : -1
    if (cap >= 0 && cap < this.sprout.length) {
      this.up = cap + 1
      this.sprout[cap].kick(20)
    }
  }

  update(seconds: number, t: number, lap: Lap, sight: Sight): Pose {
    const pose = this.pose, parts = pose.parts
    pose.clear()
    const thump = this.thump.step(seconds)
    // The squirrel is thrown up by whatever hits the log, and drums on it when something is coming.
    const drum = this.drum.step(seconds)
    parts.squirrel.dy = Math.max(0, thump * 0.12) + (drum >= 0 ? Math.abs(Math.sin(drum * TAU * 3)) * 2 : 0)
    if (this.flick.due(t)) this.flicking.start(0.4)
    const flick = this.flicking.step(seconds)
    parts.tail.turn = (flick >= 0 ? 0.5 * Math.sin(flick * TAU * 2) : 0.06 * Math.sin(t * 2)) + (drum >= 0 ? -0.4 : 0)
    parts.tail.dy = parts.squirrel.dy * 0.6
    // Mushrooms come up along it when water has been slopped on it, and stay.
    const mushrooms = lap.trail.mushrooms
    // Found there, all three are up; nobody saw them come.
    if (!mushrooms) this.up = 0
    else if (!this.had && this.up === 0) this.up = CAP_NAMES.length
    this.had = mushrooms
    CAP_NAMES.forEach((name, i) => {
      parts[name].show = i < this.up
      parts[name].dy = Math.max(0, this.sprout[i].step(seconds) * 0.1)
    })
    // A tier that flew off in a jump sits on the log in the lane it flew off in.
    const tier = lap.trail.leftovers.find((one) => one.obstacle === 'log')
    parts.tierOn.show = tier !== undefined
    parts.tierOn.dx = tier ? laneX(tier.lane) : 0
    watch(pose, { right: sight.right - 45, ahead: sight.ahead, up: sight.up })
    if (this.blink.due(t)) this.shutFor.start(0.12)
    pose.shut = this.shutFor.step(seconds) >= 0
    return pose
  }
}

export function makeObstacles(): Record<Fixed, Standing> {
  return { stream: new StreamMotion(), branch: new BranchMotion(), mud: new MudMotion(), brambles: new BrambleMotion(), log: new LogMotion() }
}

// --- Those who live beside the trail ---------------------------------------------------

/** How near, in pegs along the trail, a fox is noticed. */
const NOTICES = 70

class NeighbourMotion extends Standing {
  readonly figure: Figure
  readonly pose: Pose
  private readonly who: Neighbour
  private readonly pop = new Spring(260, 11)
  private readonly now: Now
  private readonly spell = new Spell()
  private readonly blink: Now
  private readonly shutFor = new Spell()
  private up = false

  constructor(who: Neighbour, seed: number) {
    super()
    this.who = who
    this.figure = NEIGHBOURS[who].figure
    this.pose = new Pose(this.figure)
    this.now = new Now(seed, 2.5, 6)
    this.blink = new Now(seed + 1, 2, 5)
  }

  update(seconds: number, t: number, _lap: Lap, sight: Sight): Pose {
    const pose = this.pose, parts = pose.parts
    pose.clear()
    const near = Math.abs(sight.ahead) < NOTICES
    if (this.now.due(t)) this.spell.start(1.2)
    const spell = this.spell.step(seconds)
    const pop = this.pop.step(seconds, near ? 1 : 0)
    switch (this.who) {
      case 'snail':
        // It creeps so slowly that only its eyes seem to move, and goes into its shell when a fox comes by.
        pose.x = 3 * Math.sin(t * 0.15)
        parts.body.dx = -4 * clamp(pop, 0, 1)
        parts.shell.turn = 0.05 * Math.sin(t * 0.9)
        break
      case 'rabbit':
        // Down its hole, and bolt upright behind its mound with its ears up when something comes, or just to look.
        parts.rabbit.show = near || spell >= 0
        parts.rabbit.dy = Math.max(0, (pop - 1) * 6) + (spell >= 0 ? arc(spell) * 1.5 : 0)
        parts.rabbit.turn = spell >= 0 ? 0.08 * Math.sin(spell * TAU * 3) : 0
        break
      case 'ducklings':
        // Three in a row, each a beat behind the one in front, all turning to look.
        for (let i = 1; i <= 3; i++) {
          parts[`duck${i}`].dy = Math.abs(Math.sin(t * 3 - i * 0.7)) * 1.4
          parts[`duck${i}`].turn = 0.14 * Math.sin(t * 3 - i * 0.7) + (near ? -0.2 : 0)
          parts[`duck${i}`].dx = 4 * Math.sin(t * 0.4)
        }
        break
      case 'bees':
        // Round and round the hive, faster when the fox is near.
        for (let i = 1; i <= 3; i++) {
          const a = t * (near ? 5 : 2.2) + i * 2.1
          parts[`bee${i}`].dx = Math.cos(a) * (5 + i)
          parts[`bee${i}`].dy = Math.sin(a * 1.3) * 3
        }
        parts.hive.turn = 0.03 * Math.sin(t * 1.1)
        break
      case 'tortoise':
        // Its head comes out a little at a time, and is gone at once.
        parts.head.dx = near ? 6 : -1.5 * clamp(Math.sin(t * 0.5) * 2, 0, 1)
        parts.head.turn = spell >= 0 ? 0.2 * Math.sin(spell * TAU) : 0
        break
      case 'sheep':
        // It chews, round and round, and stops with its mouth full to stare.
        parts.head.turn = near ? 0.25 : 0.1 * Math.sin(t * 5)
        parts.head.dy = near ? 0 : 0.5 * Math.sin(t * 5)
        pose.sy = 1 + 0.02 * Math.sin(t * 1.5)
        break
      case 'caterpillar':
        // A wave goes down it from head to tail, over and over.
        for (let i = 1; i <= 4; i++) parts[`seg${i}`].dy = Math.max(0, Math.sin(t * 3 - i * 0.9)) * 2
        parts.head.dy = Math.max(0, Math.sin(t * 3)) * 2 + (near ? 2 : 0)
        break
    }
    if (near !== this.up) {
      this.up = near
      this.pop.kick(near ? 6 : 0)
    }
    watch(pose, sight)
    if (this.blink.due(t)) this.shutFor.start(0.15)
    pose.shut = this.shutFor.step(seconds) >= 0
    return pose
  }
}

export function makeNeighbours(): Record<Neighbour, Standing> {
  const all = {} as Record<Neighbour, Standing>
  ;(Object.keys(NEIGHBOURS) as Neighbour[]).forEach((who, i) => { all[who] = new NeighbourMotion(who, 200 + i * 7) })
  return all
}
