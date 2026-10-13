import { GROUND, HOLLOW, inEllipse, ontoGround } from './clearing'
import { POKES, facing, leading, look, only, stepFace, type Creature, type Poke } from './creatures'
import { WAYS, stride, type StrideSound } from './gait'
import { wantOf, type World } from './meet'
import { KINDS, wrap, type Kind } from './parts'
import { spanOf } from './posed'
import { keepIn } from './reach'
import { count, radius, type Way } from './things'
import { STAGE } from './stage'
import type { VoiceKey } from './voices'

// One creature, one step: its poke, its tumble, its leap, its habits, and
// its travelling toward what it wants, in the way its parts give it. Every
// sound is asked for in the step in which the motion it belongs to happens.

export type Ask = (key: VoiceKey, pitch?: number, level?: number) => void

/** How fast each way of going can turn to face where it is going, in radians a second. */
const TURNING: Record<Way, number> = { twig: 9, maple: 5, willow: 3, round: 2.2, feather: 3.2, seed: 2.6, cap: 3.6 }
const STRIDE_VOICE: Record<StrideSound, VoiceKey> = { foot: 'foot', beat: 'beat', land: 'land', curve: 'curve', turn: 'turn', fan: 'fan', sniff: 'sniff', rock: 'rock' }
/** How far from where it may stand a creature is before it slides there and does nothing else, and how fast it slides. */
export const SLIDE_FROM = 8
export const SLIDE_SPEED = 300
/** How fast a creature that is walking off goes once another has begun to walk off after it. */
export const BOLT_SPEED = 1400
/** A creature that walks off is out of the frame within this many seconds, whatever its way of going. */
export const LEAVE_WITHIN = 8
/** Seconds a bolting leaver has to spare when it sets off for the trees. */
const BOLT_SPARE = 0.15
/** The most its own way of going is quickened to get it there. */
const MOST_HASTE = 12

/** How fast each way of going covers ground left to itself, in stage units a second, stops and all. */
function paceOf(way: Way, n: number): number {
  switch (way) {
    case 'twig': return (WAYS.twig.speed(n) * WAYS.twig.burst) / (WAYS.twig.burst + WAYS.twig.pause)
    case 'maple': return WAYS.maple.reach(n) / (WAYS.maple.crouch + WAYS.maple.air + WAYS.maple.rest)
    case 'willow': return WAYS.willow.speed(n) * 0.9
    case 'round': return WAYS.round.top(n) * 0.8
    case 'feather': { const walk = WAYS.feather.step * WAYS.feather.steps; return (WAYS.feather.speed * walk) / (walk + WAYS.feather.show(n)) }
    case 'seed': return WAYS.seed.speed * 0.85
    default: return WAYS.cap.speed * 0.95
  }
}

/**
 * How much a creature that is walking off quickens its own way of going: every stride, hop, curve and stop of it
 * runs that much faster, with each sound still in the step of its motion, so that it is past the trees a second
 * before `LEAVE_WITHIN` is up. A quick one is not quickened at all.
 */
export function hasteOf(creature: Creature, way: Way, n: number, far: number): number {
  if (!creature.leaving && !creature.entering) return 1
  const left = Math.max(0.4, LEAVE_WITHIN - 1 - creature.gone)
  return Math.max(1, Math.min(MOST_HASTE, far / left / paceOf(way, n)))
}

/** How far up the page a creature that walks off leaves the stage. */
export const EXIT_Y = 300
const spot = { x: 0, y: 0 }

/** Whether a creature that is walking off has left the stage: all of it is past the edge. */
export function offStage(creature: Creature): boolean {
  const past = radius(creature.thing) + 40
  return creature.thing.x < -past || creature.thing.x > STAGE.width + past
}

/** How near a creature stops to one it is showing itself to. */
export const SHOW_AT = 150
/** How often a wrong use plays: a trip every third burst, a landing on the back every second hop, a tip every second fan, a sneeze every fourth sniff. */
export const EVERY: Partial<Record<Way, number>> = { twig: 3, maple: 2, feather: 2, seed: 4 }
/** How long each spill lasts. */
export const SPILL: Partial<Record<Way, number>> = { twig: 0.6, maple: 1.1, feather: 0.9, seed: 0.25 }
/** How long each habit lasts; a feather's stop grows with the number of feathers. */
export const HABIT: Record<Kind, number> = { twig: 0.4, maple: 0.45, willow: 0.7, round: 0.5, feather: 0.6, seed: 0.7, cap: 0 }

/** More parts of a kind make its sound a little deeper; feet alternate between two pitches. */
function stridePitch(sound: StrideSound, creature: Creature, n: number): number {
  if (sound === 'foot') return Math.floor(creature.body.legs) % 2 === 0 ? 1 : 1.14
  if (sound === 'rock') return Math.floor(creature.body.phase * 2 + 0.5) % 2 === 0 ? 1 : 0.88
  return Math.max(0.7, 1.08 - 0.04 * n)
}

function stepPoke(creature: Creature, p: Poke, dt: number, ask: Ask): void {
  const { thing, body } = creature, spec = POKES[p.kind]
  const before = p.t
  // No sound without sight: a poke that had to wait is heard as it is seen.
  if (!p.said) { p.said = true; ask(`poke-${p.kind}`) }
  p.t += dt
  const u = Math.min(1, p.t / spec.lasts)
  if (spec.second && !p.fired && before < spec.second.at && p.t >= spec.second.at) { p.fired = true; ask(spec.second.key) }
  switch (p.kind) {
    case 'twig':
      // It leaps aside, away from the finger.
      body.lift = 34 * Math.sin(u * Math.PI)
      thing.x += p.awayX * 130 * dt; thing.y += p.awayY * 130 * dt
      break
    case 'maple':
      body.beat = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3
      break
    case 'willow':
      body.squash = u < 0.52 ? -0.3 * (u / 0.52) : 0.3 * Math.cos((u - 0.52) * 26) * (1 - u)
      break
    case 'round':
      // Two whole turns on the spot, then it sways.
      if (u < 0.7) thing.turn = wrap(thing.turn + ((Math.PI * 4) / (0.7 * spec.lasts)) * dt * Math.sin(Math.min(1, u / 0.7) * Math.PI) * 1.57)
      else body.sway = 0.22 * Math.sin((u - 0.7) * 30) * (1 - u)
      creature.dizzy = Math.max(creature.dizzy, 0.3)
      break
    case 'feather':
      body.fan += (1 - body.fan) * Math.min(1, dt * 16)
      break
    case 'seed':
      if (p.t < 0.4) body.squash = 0.28 * (p.t / 0.4)
      else {
        body.squash = -0.3 * Math.max(0, 1 - (p.t - 0.4) / 0.3)
        // The sneeze blows it backwards.
        if (p.t < 0.6) { const back = facing(creature) + Math.PI; thing.x += Math.cos(back) * 330 * dt; thing.y += Math.sin(back) * 330 * dt }
      }
      break
    case 'cap':
      break
  }
  if (p.t >= spec.lasts) creature.poke = null
}

/** A trip, a landing on the back, a tip backwards or a sneeze: what the wrong use of a kind does every few strides. */
function stepSpill(creature: Creature, way: Way, dt: number, ask: Ask): void {
  const { thing, body } = creature, lasts = SPILL[way] ?? 0.5
  const before = 1 - creature.spill / lasts
  creature.spill = Math.max(0, creature.spill - dt)
  const u = 1 - creature.spill / lasts
  const heading = facing(creature)
  if (way === 'twig') {
    // Over its own legs: nose down, sliding on.
    body.roll = 0.9 * Math.sin(u * Math.PI); body.squash = -0.25 * Math.sin(u * Math.PI)
    thing.x += Math.cos(heading) * 70 * dt; thing.y += Math.sin(heading) * 70 * dt
  } else if (way === 'maple') {
    // On its back, flapping itself over.
    body.flip = u < 0.7 ? Math.min(1, u * 6) : 1 - (u - 0.7) / 0.3
    body.beat = Math.abs(Math.sin(u * Math.PI * 3))
    if ((before < 0.25 && u >= 0.25) || (before < 0.55 && u >= 0.55)) ask('beat', 1.2, 0.8)
  } else if (way === 'feather') {
    // So proud that it tips over backwards.
    body.roll = -1.25 * Math.sin(u * Math.PI); body.fan = 1
    if (before < 0.5 && u >= 0.5) ask('land', 1.2, 0.7)
  } else if (way === 'seed') {
    // The sneeze sends it along.
    body.squash = -0.3 * (1 - u)
    thing.x += Math.cos(heading) * 190 * dt; thing.y += Math.sin(heading) * 190 * dt
  }
  if (creature.spill === 0) { body.roll = 0; body.flip = 0 }
}

/** The habit of a kind that does not lead: a hop, a tumble, a sway, a burst of pattering, a stop to fan, a stop to sniff. Returns whether the creature stops for it. */
function stepHabit(creature: Creature, dt: number, ask: Ask): boolean {
  const { body } = creature, habit = creature.habit!
  const before = habit.t / habit.lasts
  habit.t += dt
  const u = Math.min(1, habit.t / habit.lasts)
  let stops = false
  switch (habit.kind) {
    case 'maple':
      body.lift = 44 * 4 * u * (1 - u); body.beat = Math.abs(Math.sin(u * Math.PI * 2))
      if (habit.fired === 0) { habit.fired = 1; ask('beat') }
      if (u >= 1) { body.lift = 0; body.beat = 0; ask('land', 1.1, 0.8) }
      break
    case 'round':
      body.roll = u >= 1 ? 0 : Math.PI * 2 * u
      if (habit.fired === 0) { habit.fired = 1; ask('turn') }
      break
    case 'willow':
      body.sway += 0.5 * Math.sin(u * Math.PI * 2)
      if (habit.fired === 0) { habit.fired = 1; ask('curve') }
      break
    case 'twig': {
      // Five quick feet.
      const feet = Math.min(5, 1 + Math.floor(u * 5))
      body.legs += dt * 20
      if (feet > habit.fired) { habit.fired = feet; ask('foot', feet % 2 === 0 ? 1.14 : 1, 0.8) }
      break
    }
    case 'feather':
      stops = true
      body.fan += (1 - body.fan) * Math.min(1, dt * 14)
      if (habit.fired === 0) { habit.fired = 1; ask('fan') }
      break
    case 'seed':
      stops = true
      body.squash = -0.16 * Math.sin(u * Math.PI)
      if (habit.fired === 0 || (habit.fired === 1 && before < 0.5 && u >= 0.5)) { habit.fired++; ask('sniff') }
      break
    case 'cap':
      break
  }
  if (u >= 1) creature.habit = null
  return stops
}

/** Picks the habit that is next in turn among the kinds that do not lead. */
function nextHabit(creature: Creature, way: Way): void {
  const kinds = KINDS.filter((kind) => kind !== 'cap' && kind !== way && count(creature.thing, kind) > 0)
  if (kinds.length === 0) return
  const kind = kinds[creature.habitTurn++ % kinds.length]
  const lasts = kind === 'feather' ? Math.min(1.6, HABIT.feather + 0.25 * count(creature.thing, 'feather')) : HABIT[kind]
  creature.habit = { kind, t: 0, lasts, fired: 0 }
}

/** How long a feathered creature that was bowled over is cross, and how many times it smooths its feathers in that time. */
export const CROSS = 2.2
export const SMOOTHS = 3

/** Steps one creature by `dt`. Returns false once a creature that is leaving has left the stage. */
export function stepCreature(creature: Creature, dt: number, world: World, ask: Ask): boolean {
  const { thing, body } = creature
  const startX = thing.x, startY = thing.y, startTurn = thing.turn, wasOnGround = inEllipse(thing.x, thing.y, GROUND, -17)
  stepFace(creature, dt, world.chance)
  const span = spanOf(creature)
  // On its way to bed a scene carries it; asleep it lies in its bed. Anywhere else it stands only where no part of
  // it can come under the home control or into the corner, however it turns.
  const carried = thing.bedded || (creature.inScene && creature.sceneEnd !== null && inEllipse(creature.sceneEnd.x, creature.sceneEnd.y, HOLLOW))
  const grounded = !creature.leaving && !creature.entering && wasOnGround
  if (!carried) {
    keepIn(thing.x, thing.y, span, grounded, spot)
    const off = Math.hypot(spot.x - thing.x, spot.y - thing.y)
    if (off > SLIDE_FROM) {
      // It has grown, or woken, where it cannot stand: it slides to where it can, without turning, and does nothing else until it is there.
      const go = Math.min(1, (SLIDE_SPEED * dt) / off)
      thing.x += (spot.x - thing.x) * go; thing.y += (spot.y - thing.y) * go
      creature.sliding = true; creature.moved = true
      look(creature, world.lookAt, dt)
      return true
    }
  }
  creature.sliding = false
  if (creature.inScene) {
    // A scene has it. It still strides as itself: on the spot while the scene carries it, or forward for its first move.
    const { way, n } = leading(thing)
    const went = stride(body, way, n, dt, creature.acting !== 'none', (sound) => ask(STRIDE_VOICE[sound], stridePitch(sound, creature, n), 0.8))
    if (creature.acting === 'forward' && went > 0) {
      const heading = facing(creature) + body.sway, to = ontoGround(thing.x + Math.cos(heading) * went, thing.y + Math.sin(heading) * went, 18)
      thing.x = to.x; thing.y = to.y
    }
    if (!carried) { keepIn(thing.x, thing.y, span, grounded, spot); thing.x = spot.x; thing.y = spot.y }
    look(creature, world.lookAt, dt); creature.moved = true
    return true
  }
  if (thing.bedded) { body.curl += (1 - body.curl) * Math.min(1, dt * 4); creature.moved = false; return true }
  const { way, n } = leading(thing)

  if (creature.tumble) {
    // Bowled over: thrown along with its parts flapping, slower and slower, and up again where it stops.
    const t = creature.tumble, before = t.t / t.lasts
    t.t += dt
    const u = Math.min(1, t.t / t.lasts), slow = 1 - (before + u) / 2
    thing.x += t.vx * slow * dt; thing.y += t.vy * slow * dt
    keepIn(thing.x, thing.y, span, true, spot)
    thing.x = spot.x; thing.y = spot.y
    body.roll = t.spin * (1 - (1 - u) * (1 - u)); body.beat = Math.abs(Math.sin(u * 9)); body.lift = 18 * Math.sin(u * Math.PI)
    if (u >= 1) {
      creature.tumble = null; body.roll = 0; body.beat = 0; body.lift = 0
      creature.dizzy = 1.4; creature.rest = 1.2
      // A vain one is cross about it: it smooths itself with its back turned.
      if (count(thing, 'feather') > 0) { creature.cross = CROSS; creature.twirl = Math.PI; ask('fan', 0.8, 0.8) }
    }
    look(creature, world.lookAt, dt)
    creature.moved = true
    return true
  }
  if (creature.leap) {
    // Over a crawler and down behind it.
    const leap = creature.leap, before = leap.t / leap.lasts
    leap.t += dt
    const u = Math.min(1, leap.t / leap.lasts), e = u * u * (3 - 2 * u)
    keepIn(leap.fromX + (leap.toX - leap.fromX) * e, leap.fromY + (leap.toY - leap.fromY) * e, span, true, spot)
    thing.x = spot.x; thing.y = spot.y
    body.lift = leap.high * 4 * u * (1 - u); body.beat = Math.abs(Math.sin(u * Math.PI * 2)); body.squash = 0.2 * Math.sin(u * Math.PI)
    if (leap.beats === 0 || (leap.beats === 1 && before < 0.5 && u >= 0.5)) { leap.beats++; ask('beat', Math.max(0.7, 1.08 - 0.04 * n), 0.9) }
    if (u >= 1) { creature.leap = null; body.lift = 0; body.beat = 0; body.squash = -0.3; body.phase = WAYS.maple.crouch + WAYS.maple.air; ask('land') }
    look(creature, world.lookAt, dt)
    creature.moved = true
    return true
  }
  if (creature.poke) stepPoke(creature, creature.poke, dt, ask)
  if (creature.spill > 0) stepSpill(creature, way, dt, ask)
  if (creature.twirl !== 0) {
    const turn = Math.max(-7 * dt, Math.min(7 * dt, creature.twirl))
    thing.turn = wrap(thing.turn + turn)
    creature.twirl = Math.abs(creature.twirl - turn) < 0.001 ? 0 : creature.twirl - turn
  }
  const busy = creature.poke !== null || creature.spill > 0 || creature.twirl !== 0 || creature.held >= 0 || creature.cross > 0
  if (creature.held >= 0) body.squash += (0.1 - body.squash) * Math.min(1, dt * 10)
  if (creature.entering) {
    // Back from behind the trees: it comes on to the ground before it wants anything else.
    creature.want = { what: 'roam' }
    creature.target = creature.entering
    if (wasOnGround) { creature.entering = null; creature.target = null; creature.rest = 0.6 }
  } else if (!busy) {
    creature.want = creature.leaving ? { what: 'roam' } : wantOf(creature, world)
    const want = creature.want
    switch (want.what) {
      case 'finger': creature.target = want; break
      case 'tease': case 'bowl': case 'show': creature.target = { x: want.whom.thing.x, y: want.whom.thing.y }; break
      case 'dig': case 'push': creature.target = want; break
      case 'flee': {
        const dx = thing.x - want.from.thing.x, dy = thing.y - want.from.thing.y, far = Math.hypot(dx, dy) || 1
        creature.target = ontoGround(thing.x + (dx / far) * 160, thing.y + (dy / far) * 160, 30)
        break
      }
      case 'hide': creature.target = world.hideAt; break
      // Each lies down at a place of its own beside the sleeper.
      case 'curl': creature.target = ontoGround(want.beside.thing.x - 40, want.beside.thing.y + ((thing.id % 3) - 1) * 64, 40); break
      case 'still': creature.target = null; break
      case 'roam':
        if (!creature.target) {
          creature.rest -= dt
          if (creature.rest <= 0) {
            // Nobody calls: it wanders to somewhere on the ground that is free.
            for (let tries = 0; tries < 6 && !creature.target; tries++) {
              const angle = world.chance() * Math.PI * 2, reach = Math.sqrt(world.chance()) * 0.86
              const spot = { x: GROUND.x + Math.cos(angle) * GROUND.rx * reach, y: GROUND.y + Math.sin(angle) * GROUND.ry * reach }
              if (tries === 5 || world.free(spot.x, spot.y, creature)) creature.target = spot
            }
          }
        }
        break
    }
  }

  // Where it is going, brought to the nearest place it may stand: it never strides at somewhere it cannot reach.
  const target = creature.target ? keepIn(creature.target.x, creature.target.y, span, !creature.leaving, spot) : null
  let go = false, haste = 1
  if (creature.entering && target) {
    // Back from behind the trees it comes on as fast as a leaver goes.
    creature.gone += dt
    haste = hasteOf(creature, way, n, Math.hypot(target.x - thing.x, target.y - thing.y))
  }
  if (creature.leaving) {
    creature.gone += dt
    // Whatever held it up, a finger pressed on it too, it is off in time: it bolts while the bolt can still take it past the trees before its time is up.
    if (creature.gone > LEAVE_WITHIN - BOLT_SPARE - (creature.target ? Math.hypot(creature.target.x - thing.x, creature.target.y - thing.y) / BOLT_SPEED : 0)) creature.bolt = true
    if (target) haste = hasteOf(creature, way, n, Math.max(0, Math.hypot(target.x - thing.x, target.y - thing.y) - 80))
  }
  const stops = creature.habit ? stepHabit(creature, dt, ask) : false
  if (target && !busy && !stops) {
    const dx = target.x - thing.x, dy = target.y - thing.y, far = Math.hypot(dx, dy)
    // A roller cannot turn on the spot: it has arrived when it rolls past near enough, or it would circle its goal for ever.
    const near = creature.want.what === 'show' ? SHOW_AT : creature.want.what === 'tease' || creature.want.what === 'bowl' ? 0 : way === 'round' ? 52 : 14
    if (far < near) {
      if (creature.want.what === 'show') {
        // Near enough to be looked at: it stands and fans.
        body.fan += (1 - body.fan) * Math.min(1, dt * 14)
        if (creature.again <= 0) { creature.again = 3; ask('fan') }
      } else if (creature.want.what === 'roam' && !creature.leaving && !world.free(thing.x, thing.y, creature)) {
        // Something lies where it meant to stop: it stops beside it instead.
        creature.target = null; creature.rest = 0
      } else {
        creature.target = null
        creature.rest = way === 'twig' ? 0.3 + world.chance() * 0.8 : 1.4 + world.chance() * 2.8
      }
    } else {
      const off = wrap(Math.atan2(dy, dx) - facing(creature))
      const turn = Math.max(-TURNING[way] * dt * haste, Math.min(TURNING[way] * dt * haste, off))
      thing.turn = wrap(thing.turn + turn)
      // It sets off once it more or less faces the way: the eyes lead.
      go = Math.abs(off) < 1.3
    }
  }
  const phaseBefore = body.phase, speedBefore = body.speed
  let counts = false
  const went = stride(body, way, n, dt * haste, go, (sound) => {
    ask(STRIDE_VOICE[sound], stridePitch(sound, creature, n), 0.8)
    if ((sound === 'land' && way === 'maple') || (sound === 'sniff' && way === 'seed')) counts = true
  })
  // A burst that ends and a fan that ends are counted too.
  if (way === 'twig' && go && phaseBefore < WAYS.twig.burst && body.phase >= WAYS.twig.burst) counts = true
  if (way === 'feather' && go && body.phase < phaseBefore) counts = true
  if (counts && !creature.leaving && only(thing, way) && creature.spill === 0 && ++creature.counted % (EVERY[way] ?? 1e9) === 0) {
    creature.spill = SPILL[way] ?? 0
    if (way === 'twig') ask('trip')
    if (way === 'seed') ask('sneeze')
  }
  // One round leaf with its eyes on it stops dizzy.
  if (way === 'round' && n === 1 && only(thing, 'round') && speedBefore >= 12 && body.speed < 12) creature.dizzy = 1.8
  if (went > 0) {
    const heading = facing(creature) + body.sway
    thing.x += Math.cos(heading) * went
    thing.y += Math.sin(heading) * went
    creature.nextHabit -= dt
    if (creature.nextHabit <= 0 && !creature.habit) { creature.nextHabit = 2.4 + world.chance() * 1.6; nextHabit(creature, way) }
    thing.drowsy = false
  }
  if (creature.cross > 0 && count(thing, 'feather') > 0) {
    // Cross: with its back turned it draws its feathers in flat and lets them out again, one stroke after another, each one heard.
    const p = (1 - creature.cross / CROSS) * SMOOTHS, before = (1 - (creature.cross + dt) / CROSS) * SMOOTHS
    body.fan = -0.7 * Math.sin((p % 1) * Math.PI)
    if (Math.floor(p) > Math.floor(Math.max(0, before)) && p < SMOOTHS) ask('fan', 1.3, 0.5)
  } else if (body.fan < 0) body.fan = 0
  // Half curled up beside a sleeper, once it has come to rest there.
  body.curl += ((creature.want.what === 'curl' && !creature.target ? 0.5 : 0) - body.curl) * Math.min(1, dt * 4)
  if (creature.leaving && creature.bolt && creature.target) {
    // Another walks off after it: it bolts for the trees.
    const dx = creature.target.x - thing.x, dy = creature.target.y - thing.y, far = Math.hypot(dx, dy) || 1, by = Math.min(far, BOLT_SPEED * dt)
    thing.x += (dx / far) * by; thing.y += (dy / far) * by
  }
  keepIn(thing.x, thing.y, span, grounded, spot)
  thing.x = spot.x; thing.y = spot.y
  creature.moved = Math.hypot(thing.x - startX, thing.y - startY) > 0.01 || thing.turn !== startTurn || body.lift > 0.5 || busy || creature.habit !== null
  look(creature, creature.dizzy > 0 ? null : world.lookAt ?? lookedAt(creature), dt)
  return !(creature.leaving && offStage(creature))
}

/** Where a creature's want puts its eyes: on the one it is after, on the acorn's place, or on where it is going. */
export function lookedAt(creature: Creature): { x: number; y: number } | null {
  const want = creature.want
  switch (want.what) {
    case 'finger': case 'dig': case 'push': return want
    case 'tease': case 'bowl': case 'show': return want.whom.thing
    case 'flee': return want.from.thing
    case 'curl': return want.beside.thing
    default: return creature.target
  }
}
