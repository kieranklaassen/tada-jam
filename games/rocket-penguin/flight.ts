import { BALLOON, BASKET, BERG, CATAPULT, FLOORS, IGLOO, OFF_PAGE, PENGUIN, SEALS, SEAL_BALL, SEAL_NOSES, SEA_Y, SHELF, SHELF_EDGE, SPOUT, WHALE, inCloud, inDrift, inSpout, DRIFT_TAKES, type Box, type Circle, type Floor, type Part } from './world'

// The flight: one model, the same for every pull and every load. The penguin
// is a round body under its own weight and the air's drag, each part bolted
// to it is a force, and the landscape of world.ts is what it meets. Nothing
// here is scripted and nothing is drawn: a flight is stepped at a fixed rate
// and says what happened in each step, and the toy (toy.ts) turns that into
// pictures and sounds. No clock is read and no chance is drawn, so the same
// pull with the same load gives the same flight on every machine.
// Units are stage units and seconds, y down.

/** The model's step. A frame plays as many whole steps as its time holds. */
export const STEP = 1 / 120

/** Weight, as an acceleration. */
export const GRAVITY = 620
/** The air: drag is this times the square of the speed, as an acceleration. */
export const DRAG = 0.00022
/** Inside the thin cloud the air is this many times as thick. */
export const CLOUD_DRAG = 4
/** The speed a bare penguin leaves the pouch with at the longest stretch. A heavier one leaves slower by the square root of its weight. */
export const TOP_SPEED = 640

/** What each part weighs, with the bare penguin as 1. */
export const WEIGHT: Record<Part, number> = { rocket: 0.5, wings: 0.2, umbrella: 0.15, balloon: 0.05, springs: 0.3, fish: 0.2 }

/** The rocket: its push as an acceleration on a bare penguin's weight, and how long one tank burns. */
export const THRUST = 1250
export const TANK = 1.5
/** The wings: lift for each unit of speed squared, what the canvas holds, the drag they add, and how much of the lift is left when they are soaked. */
export const WING = { lift: 0.0021, holds: 900, drag: 0.00012, soaked: 1 / 3 } as const
/** The umbrella, open: its drag on the fall, for each unit of falling speed squared. */
export const UMBRELLA_DRAG = 0.021
/** How much of that drag the open umbrella has sideways. */
const UMBRELLA_SIDE = 0.08
/** The balloon: its pull as a share of the bare penguin's weight, dry and dewy, and the drag it adds. */
export const BALLOON_PULL = { dry: 0.8, dewy: 0.4, drag: 0.00018 } as const
/** The spring feet keep this share of the speed at each bounce off ice, and stand still below the second speed. */
export const SPRING = { keeps: 0.75, stops: 120 } as const
/** The whale's water takes hold of a spread wing and an open umbrella harder than of a bare penguin. */
const SPOUT_HOLD = { wings: 5, umbrella: 1.35 } as const

/** A seal sends things on with this share of their speed, and never slower than its own toss. */
export const SEAL_KEEPS = 0.9
export const SEAL_TOSS = 300
/** How long a seal balances an open umbrella on its nose before it tips it on. */
export const SEAL_HOLDS = 0.6
/** The balloon is nosed up at this share of the speed any other load keeps: slower, and never slower than the toss. */
export const BALLOON_NOSED = 0.8
/** On a seal's nose the umbrella is a bowl with its point on the nose, and the penguin's middle is this far above the nose. */
export const NOSE_BOWL = 76

/** Where a body sits that a seal balances on its nose: over the nose, in its umbrella, and clear of the seal's belly. */
export function onNose(which: number): { x: number; y: number } {
  const nose = SEAL_NOSES[which], seal = SEALS[which]
  const reach = seal.r + PENGUIN.r, dx = nose.x - seal.x
  return { x: nose.x, y: Math.min(nose.y - NOSE_BOWL, seal.y - Math.sqrt(reach * reach - dx * dx) - 1) }
}
/** How much of the speed into each solid thing comes back out of it, and how much of the speed along it is kept. */
const SOLID = {
  igloo: { bounce: 0.25, slide: 0.86 },
  whale: { bounce: 0.2, slide: 0.97 },
  balloon: { bounce: 0.7, slide: 0.95 },
  berg: { bounce: 0.2, slide: 0.9 },
  basket: { bounce: 0.3, slide: 0.8 },
  shelf: { bounce: 0.2, slide: 0.9 },
} as const
export type Solid = keyof typeof SOLID

/** On ice: how much comes back up from a shallow landing, and the skid's friction as a share of the weight. */
const ICE = { bounce: 0.22, friction: 0.42 } as const
/** A landing steeper than this many units down for each unit along sticks in by the beak, if it is fast enough to stick. With wings it takes a dive. */
const STEEP = 1.5
const STEEP_WINGED = 4
const STICK_SPEED = 400
/** An open umbrella that comes down faster than this turns inside out. */
export const FWOP = 330
/** A skid slower than this has stopped. */
const STOPPED = 7
/** No flight lasts longer than this; one that would is set down where it is. */
const LONGEST = 40

/** A body that meets the side of the basket slower than this holds on to it. */
export const BASKET_HOLDS = 400

/** A meeting slower than this is a body resting on a thing, not striking it: it loses nothing along the surface, and slides. */
const RESTING = 30

/** The snowdrift: what is left of the speed of a rocket that melts through it and the least it comes out with, and the hop the spring feet push back out with. */
const DRIFT_MELT = { keeps: 0.5, least: 150 } as const
const DRIFT_HOP = { back: 190, up: 340 } as const

/** The fish on the rod, as it is. */
export type Fish = 'fresh' | 'wet' | 'frozen'
/** What the penguin is flung with: the parts bolted on, and the state of the fish if the rod is one of them. */
export type Load = { parts: readonly Part[]; fish: Fish }
export const BARE: Load = { parts: [], fish: 'fresh' }

/** Where a flight ended: stuck by the beak, on its belly, standing on its feet, in the drift, in the sea, holding on to the basket, or off the paper. */
export type End = 'beak' | 'belly' | 'feet' | 'drift' | 'sea' | 'basket' | 'off'

/** What happened in a step, for the toy to show and sound in the same frame. `speed` is the speed of the meeting. */
export type Happening =
  | { kind: 'seal'; which: number; speed: number }
  /** A seal has caught the open umbrella on its nose, and will tip it on. */
  | { kind: 'caught'; which: number }
  /** A seal took the fish off the rod in passing. */
  | { kind: 'eaten'; which: number }
  | { kind: 'bump'; what: Solid; speed: number }
  /** A floor was touched. `hop` when the spring feet or the balloon take the body up again. */
  | { kind: 'ice'; on: Floor['of']; speed: number; hop: boolean }
  | { kind: 'spout' }
  | { kind: 'cloudIn' }
  | { kind: 'cloudOut' }
  /** The rocket punched through the cloud. */
  | { kind: 'hole' }
  /** The flame came on, or went out: let go of, burnt out, or put out by the whale's water. */
  | { kind: 'flame'; on: boolean; why: 'held' | 'let' | 'empty' | 'water' }
  | { kind: 'umbrella'; how: 'open' | 'shut' | 'flip' }
  /** The wings took more than the canvas holds, and flutter. */
  | { kind: 'flutter' }
  /** The cloud soaked the wings, or hung dew on the balloon. */
  | { kind: 'soaked'; what: 'wings' | 'balloon' }
  /** The fish changed: wet from the water or the cloud, frozen in the drift. */
  | { kind: 'fish'; now: Fish }
  /** The snowdrift: a burning rocket melts through it, and the spring feet are pushed back out. */
  | { kind: 'melt' }
  | { kind: 'sprung' }
  | { kind: 'end'; how: End; on: Floor['of'] | null; speed: number }

export type Body = {
  x: number
  y: number
  vx: number
  vy: number
  /** How far the body has turned over, in radians, and how fast it is turning. */
  turn: number
  spin: number
  /** Seconds in the air so far. */
  age: number
  /** Skidding along ice or the iceberg's top. */
  skidding: boolean
  inCloud: boolean
  inSpout: boolean
  /** The cloud left a beard of mist on it. */
  misted: boolean
  /** How the flight ended, or null while it flies. */
  ended: End | null

  /** The penguin and everything bolted to it, with the bare penguin as 1. */
  weight: number
  rocket: boolean
  wings: boolean
  umbrella: boolean
  balloon: boolean
  springs: boolean
  /** The fish on the rod: as it is, `eaten` when a seal took it, null with no rod. */
  fish: Fish | 'eaten' | null
  /** Seconds of burning left, and whether the rocket burns in this step. */
  fuel: number
  burning: boolean
  /** The rocket has made its hole in the cloud it is in. */
  holing: boolean
  /** The umbrella is open (the body is falling), and has been turned inside out. */
  open: boolean
  flipped: boolean
  fluttering: boolean
  /** The wings are soaked, the balloon hangs with dew, the springs are full of the whale's water, the rocket has left soot. */
  wet: boolean
  dewy: boolean
  filled: boolean
  sooty: boolean
  /** Seconds left balanced on a seal's nose, which seal, the speed it came with and the way it was going. */
  held: number
  heldBy: number
  heldSpeed: number
  heldWay: number
  /** Which seals have balanced it already, as bits: a seal does that once in a flight, and bounces it after. */
  balanced: number
  /** Going through the drift: 1 melting through, 2 sprung back out. The drift takes no hold until the body is out of it. */
  through: 0 | 1 | 2
  /** Where the paper ends for this flight: a body whose middle is past either has left it. On a surface wider than the stage the paper goes on, and so does the flight. */
  left: number
  right: number
}

/** The edges of the paper a flight leaves by. */
export type Page = { left: number; right: number }

export type Pull = { x: number; y: number }

/** How far the bands are stretched with the pouch at `pouch`: nothing until the slack is taken up. */
export function stretchOf(pouch: Pull): number {
  return Math.max(0, Math.hypot(CATAPULT.fork.x - pouch.x, CATAPULT.fork.y - pouch.y) - CATAPULT.slack)
}

/** The longest stretch there is. */
export const FULL_STRETCH = CATAPULT.reach - CATAPULT.slack

/** The pull stops where the near seal begins: the seated penguin, as tall as it is drawn and whichever way it leans, comes no nearer the seal's round than this, and no nearer the ball on the seal's nose, which its toes could reach. */
export const POUCH_CLEAR = SEALS[0].r + PENGUIN.height / 2 + 2
export const BALL_CLEAR = SEAL_BALL.r + PENGUIN.height / 2 + 24

/** Where the pouch may be: within the bands' reach of the fork, above the ice, on the page, and out of the near seal and its ball. */
export function clampPouch(at: Pull): Pull {
  let x = at.x, y = at.y
  // The seal lies down and to the right of the fork: pushed out of it, the pouch is nearer the fork and higher. Three passes settle it where two of these meet.
  for (let pass = 0; pass < 3; pass++) {
    const dx = x - CATAPULT.fork.x, dy = y - CATAPULT.fork.y
    const far = Math.hypot(dx, dy)
    if (far > CATAPULT.reach) {
      x = CATAPULT.fork.x + (dx * CATAPULT.reach) / far
      y = CATAPULT.fork.y + (dy * CATAPULT.reach) / far
    }
    x = Math.max(CATAPULT.wall, x)
    y = Math.min(CATAPULT.floor, y)
    for (const [round, clear] of [[SEALS[0], POUCH_CLEAR], [SEAL_BALL, BALL_CLEAR]] as const) {
      const sx = x - round.x, sy = y - round.y, near = Math.hypot(sx, sy)
      if (near < clear && near > 0) {
        x = round.x + (sx / near) * clear
        y = round.y + (sy / near) * clear
      }
    }
  }
  return { x, y }
}

/** What a load weighs, with the bare penguin as 1. */
export function weightOf(load: Load): number {
  let weight = 1
  for (const part of load.parts) weight += WEIGHT[part]
  return weight
}

/**
 * The body as it leaves the fork after the pouch was let go at `pouch`: along the line from the pouch to the
 * fork, at a speed that follows the stretch and is less for a heavier load.
 */
export function launch(pouch: Pull, load: Load = BARE, page: Page = OFF_PAGE): Body {
  const dx = CATAPULT.fork.x - pouch.x, dy = CATAPULT.fork.y - pouch.y
  const far = Math.hypot(dx, dy) || 1
  const weight = weightOf(load)
  const speed = (TOP_SPEED * stretchOf(pouch)) / FULL_STRETCH / Math.sqrt(weight)
  const vx = (dx / far) * speed, vy = (dy / far) * speed
  const has = (part: Part): boolean => load.parts.includes(part)
  return {
    x: CATAPULT.fork.x, y: CATAPULT.fork.y, vx, vy,
    turn: Math.atan2(dy, dx), spin: (vx >= 0 ? 1 : -1) * (1.2 + (3.4 * speed) / TOP_SPEED),
    age: 0, skidding: false, inCloud: false, inSpout: false, misted: false, ended: null,
    weight, rocket: has('rocket'), wings: has('wings'), umbrella: has('umbrella'), balloon: has('balloon'), springs: has('springs'),
    fish: has('fish') ? load.fish : null,
    fuel: has('rocket') ? TANK : 0, burning: false, holing: false, open: false, flipped: false, fluttering: false,
    wet: false, dewy: false, filled: false, sooty: false,
    held: 0, heldBy: 0, heldSpeed: 0, heldWay: 1, balanced: 0, through: 0,
    left: page.left, right: page.right,
  }
}

function end(body: Body, how: End, out: Happening[], on: Floor['of'] | null = null): void {
  if (body.burning) {
    body.burning = false
    out.push({ kind: 'flame', on: false, why: 'let' })
  }
  out.push({ kind: 'end', how, on, speed: Math.hypot(body.vx, body.vy) })
  body.ended = how
  body.vx = 0
  body.vy = 0
  body.spin = 0
  body.skidding = false
}

/** Pushes the body out of a round thing it has gone into. Returns the outward direction and the speed into the thing, or null when they do not touch or are parting. */
function meetCircle(body: Body, c: Circle): { nx: number; ny: number; into: number } | null {
  const dx = body.x - c.x, dy = body.y - c.y
  const reach = c.r + PENGUIN.r
  const far = Math.hypot(dx, dy)
  if (far >= reach || far === 0) return null
  const nx = dx / far, ny = dy / far
  body.x = c.x + nx * reach
  body.y = c.y + ny * reach
  const into = -(body.vx * nx + body.vy * ny)
  return into > 0 ? { nx, ny, into } : null
}

/** A solid thing: what comes back along the normal, and what is kept along the surface. */
function rebound(body: Body, nx: number, ny: number, into: number, what: Solid, out: Happening[]): void {
  const { bounce, slide } = SOLID[what]
  const tx = -ny, ty = nx
  const along = body.vx * tx + body.vy * ty
  if (into < RESTING) {
    body.vx = tx * along
    body.vy = ty * along
    return
  }
  body.vx = tx * along * slide + nx * into * bounce
  body.vy = ty * along * slide + ny * into * bounce
  body.spin = (along / PENGUIN.r) * 0.6
  out.push({ kind: 'bump', what, speed: into })
}

/** The nearest point of a box to the body, and the push out of it. Returns the outward direction and the speed into the box, or null. */
function meetBox(body: Body, b: Box): { nx: number; ny: number; into: number } | null {
  const px = Math.max(b.x0, Math.min(b.x1, body.x)), py = Math.max(b.y0, Math.min(b.y1, body.y))
  let dx = body.x - px, dy = body.y - py
  let far = Math.hypot(dx, dy)
  if (far >= PENGUIN.r) return null
  if (far === 0) {
    // The centre is inside: leave by the nearest face.
    const faces = [body.x - b.x0, b.x1 - body.x, body.y - b.y0, b.y1 - body.y]
    const least = Math.min(...faces)
    if (least === faces[2]) { dx = 0; dy = -1; body.y = b.y0 - PENGUIN.r }
    else if (least === faces[0]) { dx = -1; dy = 0; body.x = b.x0 - PENGUIN.r }
    else if (least === faces[1]) { dx = 1; dy = 0; body.x = b.x1 + PENGUIN.r }
    else { dx = 0; dy = 1; body.y = b.y1 + PENGUIN.r }
    far = 1
  } else {
    body.x = px + (dx / far) * PENGUIN.r
    body.y = py + (dy / far) * PENGUIN.r
  }
  const nx = dx / far, ny = dy / far
  const into = -(body.vx * nx + body.vy * ny)
  return into > 0 ? { nx, ny, into } : null
}

/**
 * A flat top. The spring feet bounce on, the balloon hops on tiptoe, the open umbrella sets the penguin on its
 * feet; otherwise a steep, fast arrival sticks by the beak and a shallow one skids. Returns true when the
 * flight ended.
 */
function meetFloor(body: Body, floor: Floor, out: Happening[]): boolean {
  if (body.y + PENGUIN.r < floor.top) return false
  body.y = floor.top - PENGUIN.r
  const speed = Math.hypot(body.vx, body.vy)
  if (!body.skidding) {
    const falling = body.vy > 0
    if (falling && body.springs) {
      if (speed * SPRING.keeps < SPRING.stops) {
        end(body, 'feet', out, floor.of)
        return true
      }
      out.push({ kind: 'ice', on: floor.of, speed, hop: true })
      body.vx *= SPRING.keeps
      body.vy = -body.vy * SPRING.keeps
      return false
    }
    if (falling && body.balloon) {
      // On tiptoe, and on in slow hops, each a little shorter.
      if (body.vy < 70) {
        end(body, 'feet', out, floor.of)
        return true
      }
      out.push({ kind: 'ice', on: floor.of, speed, hop: true })
      body.vx *= 0.8
      body.vy = -body.vy * 0.55
      return false
    }
    if (falling && body.umbrella && !body.flipped) {
      if (speed < FWOP) {
        end(body, 'feet', out, floor.of)
        return true
      }
      body.flipped = true
      body.open = false
      out.push({ kind: 'umbrella', how: 'flip' })
    }
    // A rocket still burning ploughs along like a sledge and sticks in nowhere.
    const ploughs = body.rocket && body.burning
    if (!ploughs && falling && body.vy >= Math.abs(body.vx) * (body.wings ? STEEP_WINGED : STEEP) && speed >= STICK_SPEED) {
      end(body, 'beak', out, floor.of)
      return true
    }
    if (falling) out.push({ kind: 'ice', on: floor.of, speed, hop: false })
    if (body.vy > 90 && !ploughs) {
      body.vy = -body.vy * ICE.bounce
      return false
    }
    body.skidding = true
  }
  body.vy = 0
  // The wings carry some of the weight, and the run is long and low.
  const slow = ICE.friction * (body.wings ? 0.45 : 1) * GRAVITY * STEP
  if (Math.abs(body.vx) <= Math.max(slow, STOPPED) && !body.burning) {
    end(body, 'belly', out, floor.of)
    return true
  }
  body.vx -= Math.sign(body.vx) * Math.min(Math.abs(body.vx), slow)
  // A skid lies flat: the body turns to its belly and stops turning over.
  body.spin = 0
  body.turn += (levelTurn(body) - body.turn) * 0.2
  return false
}

/** The floor under the body's middle, if it is down on one or above it. Over the crate, its lid is the floor. */
function floorUnder(body: Body): Floor | null {
  for (const floor of FLOORS) if (body.x >= floor.x0 && body.x <= floor.x1 && body.y < floor.top) return floor
  return null
}

/** The turn at which the body lies on its belly, head first the way it slides, nearest the turn it has. */
function levelTurn(body: Body): number {
  const level = body.vx >= 0 ? 0 : Math.PI
  return nearest(level, body.turn)
}

/** The angle equal to `angle` that is nearest `to`. */
function nearest(angle: number, to: number): number {
  return angle + Math.round((to - angle) / (2 * Math.PI)) * 2 * Math.PI
}

/** A seal sends the body on: upwards, never back the way it came, and never slower than its toss. */
function sendOn(body: Body, which: number, before: number, ox: number, oy: number, way: number, out: Happening[]): void {
  // The spring feet lose nothing to a seal; the balloon is nosed up slower, and nothing leaves slower than the toss.
  const keeps = (body.springs ? 1 : SEAL_KEEPS) * (body.balloon ? BALLOON_NOSED : 1)
  const after = Math.max(before * keeps, SEAL_TOSS)
  let far = Math.hypot(ox, oy) || 1
  ox /= far
  oy /= far
  // Away from the belly means up: a body that struck the seal's side is tossed up and over, not along the ice.
  // The wings make a long flat hop of it; the balloon and the spring feet go nearly straight up.
  const up = body.wings ? 0.36 : body.balloon || body.springs ? 0.9 : 0.62
  if (oy > -up || body.wings) {
    oy = -up
    ox = Math.sign(ox || way || 1) * Math.sqrt(1 - oy * oy)
    far = 1
  }
  // And on means on: never straight up to come down on the same seal for ever, and never back the way it came.
  const along = body.balloon || body.springs ? 0.3 : 0.5
  if (Math.abs(ox) < along) {
    ox = Math.sign(ox || way || 1) * along
    oy = -Math.sqrt(1 - ox * ox)
  }
  if (way !== 0 && ox * way < 0) ox = -ox
  body.vx = ox * after
  body.vy = oy * after
  body.spin = (ox >= 0 ? 1 : -1) * (2 + after / 160)
  body.skidding = false
  out.push({ kind: 'seal', which, speed: before })
}

/** The rocket burns while a finger is held, fuel lasts, and no water is on it. */
function burn(body: Body, hold: boolean, out: Happening[]): void {
  const burns = body.rocket && hold && body.fuel > 0 && !body.inSpout
  if (burns !== body.burning) {
    out.push({ kind: 'flame', on: burns, why: burns ? 'held' : body.inSpout ? 'water' : body.fuel <= 0 ? 'empty' : 'let' })
    body.burning = burns
  }
  if (burns) body.fuel -= STEP
}

/**
 * One step of the model. `hold` is whether a finger is held on the page, which is what burns the rocket. What
 * happened in the step is added to `out`, in order. A body whose flight has ended is left as it is.
 */
export function step(body: Body, out: Happening[], hold = false): void {
  if (body.ended) return
  body.age += STEP

  // Balanced on a seal's nose, on the open umbrella: nothing moves until the seal tips it on.
  if (body.held > 0) {
    // The finger is what burns the rocket, on a nose as anywhere: a lift cuts the flame there too.
    burn(body, hold, out)
    body.held -= STEP
    if (body.held <= 0) sendOn(body, body.heldBy, body.heldSpeed, body.heldWay * 0.45, -0.89, body.heldWay, out)
    return
  }

  // The whale's water, which also puts the flame out.
  const wasInSpout = body.inSpout
  body.inSpout = inSpout(body.x, body.y)
  if (body.inSpout && !wasInSpout) {
    out.push({ kind: 'spout' })
    if (body.springs) body.filled = true
    if (body.fish && body.fish !== 'eaten' && body.fish !== 'wet') {
      body.fish = 'wet'
      out.push({ kind: 'fish', now: 'wet' })
    }
  }

  burn(body, hold, out)

  // The cloud: thin, wet air. The umbrella keeps everything under it dry, and a burning rocket goes through a hole of its own.
  const wasInCloud = body.inCloud
  body.inCloud = inCloud(body.x, body.y)
  if (body.inCloud && !wasInCloud) out.push({ kind: 'cloudIn' })
  else if (!body.inCloud && wasInCloud) {
    body.holing = false
    out.push({ kind: 'cloudOut' })
  }
  const holed = body.inCloud && body.burning
  if (holed && !body.holing) {
    body.holing = true
    out.push({ kind: 'hole' })
  }
  const damp = body.inCloud && !holed
  if (damp && !(body.umbrella && !body.flipped)) {
    body.misted = true
    if (body.wings && !body.wet) {
      body.wet = true
      out.push({ kind: 'soaked', what: 'wings' })
    }
    if (body.balloon && !body.dewy) {
      body.dewy = true
      out.push({ kind: 'soaked', what: 'balloon' })
    }
    if (body.fish && body.fish !== 'eaten' && body.fish !== 'wet') {
      body.fish = 'wet'
      out.push({ kind: 'fish', now: 'wet' })
    }
  }

  // Forces: weight, the air, and whatever each part adds.
  const speed = Math.hypot(body.vx, body.vy)
  const drag = (DRAG * (damp ? CLOUD_DRAG : 1) + (body.wings ? WING.drag : 0) + (body.balloon ? BALLOON_PULL.drag : 0)) * speed
  let ax = -drag * body.vx, ay = GRAVITY - drag * body.vy
  if (body.inSpout) {
    // The water drags whatever is in it towards its own speed.
    // It is fastest at the blowhole and spent at the top, so a thing rides at the height where the water just carries it.
    const hold = SPOUT.grip * (body.wings ? SPOUT_HOLD.wings : body.umbrella && !body.flipped ? SPOUT_HOLD.umbrella : 1)
    const up = (SPOUT.up * (body.y - SPOUT.top)) / (SPOUT.bottom - SPOUT.top)
    // The spread wing and the open umbrella are taken hold of from below: upwards, not sideways.
    ax += SPOUT.grip * (SPOUT.lean - body.vx)
    ay += hold * (-up - body.vy)
  }
  if (body.burning) {
    ax += (Math.cos(body.turn) * THRUST) / body.weight
    ay += (Math.sin(body.turn) * THRUST) / body.weight
  }
  if (body.wings && speed > 1 && !body.inSpout) {
    // Lift at right angles to the flight, on its upper side. In the whale's water the wings are a kite, and the water has them.
    const want = WING.lift * speed * speed * (body.wet ? WING.soaked : 1)
    const lift = Math.min(want, WING.holds)
    if (want > WING.holds && !body.fluttering) out.push({ kind: 'flutter' })
    body.fluttering = want > WING.holds
    const side = body.vx >= 0 ? 1 : -1
    ax += (lift * side * body.vy) / speed
    ay -= (lift * Math.abs(body.vx)) / speed
  }
  if (body.balloon) ay -= ((body.dewy ? BALLOON_PULL.dewy : BALLOON_PULL.dry) * GRAVITY) / body.weight
  if (body.umbrella && !body.flipped) {
    // Open when it falls, and in the whale's water, which comes at it from below and catches it open.
    const open = (body.vy > 0 || body.inSpout) && !body.skidding
    if (open !== body.open && body.age > 0.05) {
      body.open = open
      out.push({ kind: 'umbrella', how: open ? 'open' : 'shut' })
    }
    // Its drag is on the fall only.
    if (body.open && body.vy > 0) {
      ay -= UMBRELLA_DRAG * body.vy * body.vy
      ax -= UMBRELLA_DRAG * UMBRELLA_SIDE * Math.abs(body.vx) * body.vx
    }
  }
  body.vx += ax * STEP
  body.vy += ay * STEP
  body.x += body.vx * STEP
  body.y += body.vy * STEP

  // How it holds itself: head first with the rocket or the wings, upright under the balloon, the open umbrella and on the spring feet, and otherwise it tumbles.
  if (body.skidding) body.spin = 0
  else if (body.rocket || body.wings) {
    if (speed > 30) body.turn += (nearest(Math.atan2(body.vy, body.vx), body.turn) - body.turn) * Math.min(1, 10 * STEP)
    body.spin = 0
  } else if (body.inSpout && body.balloon) body.turn += 14 * STEP
  else if (body.balloon || body.springs || body.open) {
    body.turn += (nearest(-Math.PI / 2, body.turn) - body.turn) * Math.min(1, 8 * STEP)
    body.spin = 0
  } else body.turn += body.spin * STEP

  // A skid that runs off the end of its floor is a fall.
  if (body.skidding) {
    const under = floorUnder(body)
    if (!under || body.y + PENGUIN.r < under.top - 1) body.skidding = false
  }

  // The snowdrift stops everything dead but two: a rocket still burning melts through, and the spring feet are pushed back out.
  if (!inDrift(body.x, body.y, DRIFT_TAKES)) body.through = 0
  else if (body.through === 0) {
    if (body.fish && body.fish !== 'eaten' && body.fish !== 'frozen') {
      body.fish = 'frozen'
      out.push({ kind: 'fish', now: 'frozen' })
    }
    if (body.rocket && body.burning) {
      body.through = 1
      body.sooty = true
      body.vx *= DRIFT_MELT.keeps
      body.vy *= DRIFT_MELT.keeps
      out.push({ kind: 'melt' })
    } else if (body.springs) {
      body.through = 2
      body.vx = (body.vx >= 0 ? -1 : 1) * DRIFT_HOP.back
      body.vy = -DRIFT_HOP.up
      out.push({ kind: 'sprung' })
    } else return end(body, 'drift', out)
  }
  if (body.through === 1 && Math.abs(body.vx) < DRIFT_MELT.least) body.vx = (body.vx >= 0 ? 1 : -1) * DRIFT_MELT.least

  // The seals: on with nine tenths of the speed, never less than the toss, upwards, and never back the way it came.
  for (let which = 0; which < SEALS.length; which++) {
    const met = meetCircle(body, SEALS[which])
    if (!met) continue
    const before = Math.hypot(body.vx, body.vy)
    const way = Math.abs(body.vx) > 1 ? Math.sign(body.vx) : 0
    if (body.fish && body.fish !== 'eaten') {
      body.fish = 'eaten'
      out.push({ kind: 'eaten', which })
    }
    if (body.open && !(body.balanced & (1 << which))) {
      // The seal has the umbrella on its nose. It does so once in a flight: tipped on, a body that comes down on
      // the same seal again is bounced like any other, and so always gets past it.
      body.balanced |= 1 << which
      body.held = SEAL_HOLDS
      body.heldBy = which
      body.heldSpeed = before
      body.heldWay = way || (met.nx >= 0 ? 1 : -1)
      body.vx = 0
      body.vy = 0
      body.spin = 0
      // It sits over the nose, upright, in the umbrella that stands on it.
      const sits = onNose(which)
      body.x = sits.x
      body.y = sits.y
      body.turn = nearest(-Math.PI / 2, body.turn)
      out.push({ kind: 'caught', which })
      return
    }
    sendOn(body, which, before, body.vx + 2 * met.into * met.nx, body.vy + 2 * met.into * met.ny, way, out)
  }

  // The round solids.
  const rounds: readonly [Circle, Solid][] = [[IGLOO, 'igloo'], [WHALE, 'whale'], [BALLOON, 'balloon']]
  for (const [circle, what] of rounds) {
    const met = meetCircle(body, circle)
    if (met) rebound(body, met.nx, met.ny, met.into, what, out)
  }

  // The basket hangs right under the balloon, so nothing comes down onto it: a body that meets its side
  // gently enough has arrived and holds on there, and a harder one comes off it again.
  const onBasket = meetBox(body, BASKET)
  if (onBasket) {
    if (Math.abs(onBasket.nx) > 0.7 && onBasket.into < BASKET_HOLDS) return end(body, 'basket', out)
    rebound(body, onBasket.nx, onBasket.ny, onBasket.into, 'basket', out)
    // The basket hangs close under the balloon: pushed out of the one, the body is not left in the other.
    const skin = meetCircle(body, BALLOON)
    if (skin) rebound(body, skin.nx, skin.ny, skin.into, 'balloon', out)
  }

  // The flat tops: the shelf, the iceberg and the crate's lid.
  const floor = floorUnder(body)
  if (floor && meetFloor(body, floor, out)) return
  // Beside its top, the iceberg is a wall.
  if (body.x < BERG.x0) {
    const met = meetBox(body, BERG)
    if (met) rebound(body, met.nx, met.ny, met.into, 'berg', out)
  }
  // Past the edge of the shelf, its corner and its face.
  if (body.x > SHELF_EDGE) {
    const met = meetBox(body, SHELF)
    if (met) rebound(body, met.nx, met.ny, met.into, 'shelf', out)
  }
  // Open water: the flight ends when the body touches it.
  if (!floor && body.x > SHELF_EDGE && body.x < BERG.x0 && body.y + PENGUIN.r >= SEA_Y - 4) return end(body, 'sea', out)

  if (body.x < body.left || body.x > body.right) return end(body, 'off', out)
  if (body.age > LONGEST) end(body, 'belly', out)
}

/**
 * A whole flight from a pull, for tests and for anything that wants to know where a pull leads: every happening
 * with the step it fell in, and the body at the end. `hold` says, step by step, whether a finger is held.
 */
export function fly(pouch: Pull, load: Load = BARE, hold: (body: Body) => boolean = () => false, page: Page = OFF_PAGE): { body: Body; happened: { at: number; what: Happening }[]; path: { x: number; y: number }[] } {
  const body = launch(pouch, load, page)
  const happened: { at: number; what: Happening }[] = []
  const path: { x: number; y: number }[] = [{ x: body.x, y: body.y }]
  const out: Happening[] = []
  for (let n = 0; !body.ended && n < LONGEST / STEP + 2; n++) {
    out.length = 0
    step(body, out, hold(body))
    for (const what of out) happened.push({ at: n, what })
    path.push({ x: body.x, y: body.y })
  }
  return { body, happened, path }
}
