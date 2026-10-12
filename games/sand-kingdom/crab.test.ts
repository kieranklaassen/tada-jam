import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BEACHES, MOAT } from './beaches'
import { type Field, base, builtNear, cellAt, decode, encode, groove, heap, heightAt, makeField, tower } from './field'
import { CRAB_DIGS, Crab, SmallCrabs, type World } from './folk'
import { Play, TOPS } from './play'
import { makeRng } from './rng'
import type { CrabPlan } from './plan'
import type { Kingdom } from './kingdom'
import { CRAB_HOME } from './layout'
import { CRAB_FEET, apart, crabRounds } from './solid'
import { STATE_VERSION } from './state'
import { JOURNEY_SECONDS } from './sun'
import { type Patch, bucketPatch, firstThings, woodPatches } from './things'
import { FOLK_COME, TIDE_OUT } from './timeline'
import { FolkView } from './view/folkView'

// The crab on the sand the child has built. Sand is in its way like anything
// else: it goes round a tower where it can, and where it cannot it walks up
// and over on the sand's surface. What the child sets down on its bank it
// steps round. Here it is watched on its ways out, round and home, and the
// meshes that are drawn are held against the height the model has.

const DT = 1 / 60
/** The line the crab walks, as the game has planned it. */
const planOf = (play: Play): CrabPlan => (play as unknown as { plan: { crab: CrabPlan } }).plan.crab
const PARTS = ['crab-body', 'crab-legs-left', 'crab-legs-right', 'crab-claw-left', 'crab-claw-right', 'crab-mouth']
/**
 * How far any part of it may be under the sand's surface. A leg swings a little way into flat sand as it steps
 * (0.15), a leg that reaches down over the edge of a groove dips its knee into the bank (0.25), and the crest of
 * a sharp ridge comes up between the points of its belly that the model samples (0.21): each less than this.
 */
const STEP_IN = 0.3
/** How far off the sand its nearest foot may be: its legs reach down a quarter of its shell's height, and over a steeper drop than that the rest is air. */
const FOOT_OFF = 0.1

class Watched {
  private readonly scene = new THREE.Scene()
  private readonly view = new FolkView(new THREE.MeshBasicMaterial())
  /** How far the lowest point of the crab has been under the sand, how far its nearest foot has stood off it, and how long it stood on built sand. */
  under = 0
  /** Where that was: which part of it, where it stood and when. */
  worst = ''
  off = 0
  onBuilt = 0
  highest = 0
  constructor(readonly play: Play) {
    this.scene.add(this.view.group)
  }
  look(): void {
    const play = this.play, crab = play.folk.crab, v = new THREE.Vector3()
    this.view.update(play.folk, (x, z) => play.ground(x, z))
    this.scene.updateMatrixWorld(true)
    for (const name of PARTS) {
      const mesh = this.scene.getObjectByName(name) as THREE.Mesh, at = mesh.geometry.getAttribute('position')
      for (let i = 0; i < at.count; i++) {
        v.fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld)
        const deep = heightAt(play.field, v.x, v.z) - v.y
        if (deep > this.under) {
          this.under = deep
          this.worst = `${name} at ${crab.x.toFixed(2)}, ${crab.z.toFixed(2)} turned ${crab.turn.toFixed(2)} after ${play.time.toFixed(2)} s`
        }
      }
    }
    // Its six feet as it stands, tipped as the sand tips it: none under the sand, and one at least on it.
    const cos = Math.cos(crab.turn), sin = Math.sin(crab.turn), level = Math.cos(crab.tilt), tip = Math.sin(crab.tilt)
    let nearest = Infinity
    for (const [across, front] of CRAB_FEET) {
      const x = crab.x + across * level * cos + front * sin, z = crab.z - across * level * sin + front * cos
      // Where its belly rides over a mound its legs reach down to the sand: that is where the foot is.
      const over = crab.floor + across * tip - crab.reach[across < 0 ? 0 : 1] - heightAt(play.field, x, z)
      if (-over > this.under) {
        this.under = -over
        this.worst = `foot ${across}, ${front} at ${crab.x.toFixed(2)}, ${crab.z.toFixed(2)} turned ${crab.turn.toFixed(2)} after ${play.time.toFixed(2)} s`
      }
      nearest = Math.min(nearest, over)
    }
    this.off = Math.max(this.off, nearest)
    if (crabRounds(crab).some((round) => builtNear(play.field, round.x, round.z, round.r) !== null)) this.onBuilt += 1
    this.highest = Math.max(this.highest, crab.floor - base(crab.z))
  }
}

const steps = (seen: Watched, seconds: number, each?: () => void): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    seen.play.step(DT)
    seen.look()
    each?.()
  }
}
const tapSun = (play: Play): void => {
  play.press({ kind: 'sun' })
  play.tap()
}
/** How near the crab is to its evening line, or Infinity by day. */
const toLine = (play: Play): number => {
  const plan = planOf(play), crab = play.folk.crab
  return plan.kind === 'home' ? Infinity : Math.min(...plan.path.map((point) => Math.hypot(point.x - crab.x, point.z - crab.z)))
}
const toHome = (play: Play): number => Math.hypot(play.folk.crab.x - CRAB_HOME.x, play.folk.crab.z - CRAB_HOME.z)

/** A beach with more built on it: what `build` adds to the sand of a ready-made one. */
function built(from: Kingdom, build: (field: Field) => void): Kingdom {
  const field = makeField()
  decode(from.sand, field)
  build(field)
  return { ...from, sand: encode(field) }
}

/** A day and a night of it: the sun tapped down, the folk come, `evening` seconds of patrol, the sun tapped up, the tide out, and the walk home. */
function dayAndNight(seen: Watched, evening: number, each?: () => void): { out: number; home: number; plan: CrabPlan; line: { x: number; z: number }[] } {
  const play = seen.play
  steps(seen, 1)
  tapSun(play)
  let out = Infinity
  steps(seen, JOURNEY_SECONDS + FOLK_COME.end + evening, () => {
    out = Math.min(out, toLine(play))
    each?.()
  })
  const plan = planOf(play), line = plan.kind === 'home' ? [] : [...plan.path]
  tapSun(play)
  steps(seen, JOURNEY_SECONDS + TIDE_OUT.back.at + TIDE_OUT.back.lasts + 14)
  return { out, home: toHome(play), plan, line }
}

/** A bare beach with one dry groove on the right of it, far from the crab's place, and whatever `build` adds; the things lie out of the way. */
function grooved(build: (field: Field) => void): Kingdom {
  const field = makeField()
  groove(field, 0.5, 3.6, 3.0, 3.6)
  build(field)
  const things = firstThings(7)
  things.bucket = { x: 6.2, z: 6.9, holds: 'nothing', shell: false, side: false }
  things.wood = [{ x: 5.6, z: 7.9, turn: 0.1 }, { x: -6.2, z: 7.6, turn: 0.2 }]
  things.shells = [{ x: -6.4, z: 2.4, up: true, state: 'lying' }, { x: -5.6, z: 7.9, up: true, state: 'lying' }, { x: 6.6, z: 3.4, up: false, state: 'lying' }]
  return { v: STATE_VERSION, position: 'shore', finished: false, sand: encode(field), dug: [cellAt(0.5, 3.6)], sun: 'up', ...things }
}

describe('sand built in the crab\'s way', () => {
  it('on its bank is stepped round: a tower on the bank of the moat, and the crab walks the whole ring round it, out and home, with no leg over built sand and its feet on the sand', { timeout: 60_000 }, () => {
    // The kingdom, with a tower turned out on the north-west of the bank of its moat, where the beach beyond is clear.
    const seen = new Watched(new Play(built(BEACHES.kingdom(7), (field) => tower(field, MOAT.x - 0.53, MOAT.z + 1.98, 0, 1)), 3))
    const at = new Set<number>()
    const went = dayAndNight(seen, 45, () => {
      const plan = planOf(seen.play)
      if (plan.kind !== 'home') plan.path.forEach((point, index) => { if (Math.hypot(point.x - seen.play.folk.crab.x, point.z - seen.play.folk.crab.z) < 0.5) at.add(index) })
    })
    expect(went.plan.kind).toBe('ring')
    expect(went.plan.kind === 'ring' && went.plan.open).toBe(false)
    // Its line goes out round the tower, and it walked all of it and went home.
    expect(Math.max(...went.line.map((point) => Math.hypot(point.x - MOAT.x, point.z - MOAT.z)))).toBeGreaterThan(MOAT.r + 1.05 + 0.6)
    expect(went.out).toBeLessThan(0.5)
    expect(at.size).toBe(went.line.length)
    expect(went.home).toBeLessThan(1.2)
    // Never over the tower; nothing of it under the sand; and never standing off the sand.
    expect(seen.onBuilt).toBe(0)
    expect(seen.under, seen.worst).toBeLessThan(STEP_IN)
    expect(seen.off).toBeLessThan(FOOT_OFF)
  })

  it('in its way across the beach is gone round: a tower between its place and its groove, and it walks round the tower to the groove, never over it', { timeout: 60_000 }, () => {
    const TOWER = { x: -1.6, z: 4.6 }
    const seen = new Watched(new Play(grooved((field) => tower(field, TOWER.x, TOWER.z, 0, 1)), 3))
    let nearest = Infinity
    const went = dayAndNight(seen, 30, () => {
      nearest = Math.min(nearest, Math.hypot(seen.play.folk.crab.x - TOWER.x, seen.play.folk.crab.z - TOWER.z))
    })
    // The tower stands in the straight way from its place to the near end of its line.
    const from = { x: CRAB_HOME.x, z: CRAB_HOME.z }, to = went.line[0]
    const along = ((TOWER.x - from.x) * (to.x - from.x) + (TOWER.z - from.z) * (to.z - from.z)) / ((to.x - from.x) ** 2 + (to.z - from.z) ** 2)
    expect(along).toBeGreaterThan(0.2)
    expect(along).toBeLessThan(0.8)
    expect(Math.hypot(from.x + (to.x - from.x) * along - TOWER.x, from.z + (to.z - from.z) * along - TOWER.z)).toBeLessThan(0.9)
    // It got to its line and home, round the tower: a body's half length off its middle, and no leg over built sand.
    expect(went.out).toBeLessThan(0.5)
    expect(went.home).toBeLessThan(1.2)
    expect(nearest).toBeGreaterThan(1.0)
    expect(seen.onBuilt).toBe(0)
    expect(seen.under, seen.worst).toBeLessThan(STEP_IN)
    expect(seen.off).toBeLessThan(FOOT_OFF)
  })

  it('is walked up and over where there is no way round: a wall from the sea to the top of the beach between its place and its groove, and it is lifted over the wall on its feet as it crosses', { timeout: 60_000 }, () => {
    const seen = new Watched(new Play(grooved((field) => {
      for (let z = -4; z <= 14; z += 0.3) heap(field, -1.2, z, 0.55, 0.75)
    }), 3))
    const went = dayAndNight(seen, 30)
    // It got out to its line, over the wall, and home again.
    expect(went.out).toBeLessThan(0.5)
    expect(went.home).toBeLessThan(1.2)
    // It stood over built sand as it crossed, lifted by it, with nothing of it under the sand's surface and a foot on it.
    expect(seen.onBuilt).toBeGreaterThan(30)
    expect(seen.highest).toBeGreaterThan(0.25)
    expect(seen.under, seen.worst).toBeLessThan(STEP_IN)
    expect(seen.off).toBeLessThan(FOOT_OFF)
  })
})

describe('a bucket or a bough on the crab\'s bank', () => {
  /** The evening kingdom with a thing dragged to a place and let go, and then two laps of the crab. */
  const lapsWith = (thing: { kind: 'bucket' } | { kind: 'wood'; index: number }, to: readonly [number, number]): { play: Play; nearest: number; reached: Set<number>; raised: number; near: number; stood: number } => {
    const seen = new Watched(new Play(BEACHES.evening(7), 5))
    const play = seen.play, crab = play.folk.crab
    steps(seen, 4)
    const from = thing.kind === 'bucket' ? play.things.bucket : play.things.wood[thing.index], fromX = from.x, fromZ = from.z
    play.press(thing)
    play.dragStart()
    for (let i = 1; i <= 40; i++) {
      play.drag(fromX + ((to[0] - fromX) * i) / 40, fromZ + ((to[1] - fromZ) * i) / 40, 0)
      play.step(DT)
    }
    play.release()
    steps(seen, 0.8)
    play.heard.length = 0
    const reached = new Set<number>()
    let nearest = Infinity, raised = 0, near = 0, stood = 0, since = 0, at = { x: crab.x, z: crab.z }
    steps(seen, 60, () => {
      // How long it has stood in one place: the longest of its stops.
      if (Math.hypot(crab.x - at.x, crab.z - at.z) > 0.05) {
        at = { x: crab.x, z: crab.z }
        since = 0
      } else since += DT
      stood = Math.max(stood, since)
      const plan = planOf(play), rounds = crabRounds(crab)
      const own = thing.kind === 'bucket' ? [bucketPatch(play.things.bucket)] : woodPatches(play.things.wood[thing.index])
      nearest = Math.min(nearest, apart(rounds, own))
      if (plan.kind !== 'home') plan.path.forEach((point, index) => { if (Math.hypot(point.x - crab.x, point.z - crab.z) < 0.45) reached.add(index) })
      // Going by the thing: within a body's length of it.
      if (apart(rounds, own) < 1.2) {
        near += 1
        // A claw held high, and neither one down at the sand as when it taps: under an arm of the starfish it lowers the one that would touch.
        if (Math.max(crab.claws[0].raise, crab.claws[1].raise) > 0.6 && Math.min(crab.claws[0].raise, crab.claws[1].raise) > -0.25) raised += 1
      }
    })
    return { play, nearest, reached, raised, near, stood }
  }

  it('is no gap in the ring: where there is room on the beach beyond it the crab steps round it, further from the water, claws high, all the way round, and never stamps or clacks at it', { timeout: 60_000 }, () => {
    // The bucket on the north-west of the bank, where the beach beyond it is clear.
    const { play, nearest, reached, raised, near, stood } = lapsWith({ kind: 'bucket' }, [MOAT.x - 0.53, MOAT.z + 1.98])
    const plan = planOf(play)
    // Still a ring, and whole: its line goes out round the bucket.
    expect(plan.kind).toBe('ring')
    if (plan.kind !== 'ring') return
    expect(plan.open).toBe(false)
    expect(Math.max(...plan.path.map((point) => Math.hypot(point.x - MOAT.x, point.z - MOAT.z)))).toBeGreaterThan(MOAT.r + 1.05 + 0.9)
    // It walked every point of it, the ones beside the bucket too, and never touched the bucket.
    expect(reached.size).toBe(plan.path.length)
    expect(nearest).toBeGreaterThan(0)
    // Claws high as it went by, and not one stamp at the sand or clack of a claw.
    expect(near).toBeGreaterThan(60)
    expect(raised / near).toBeGreaterThan(0.8)
    expect(play.heard.filter((one) => one.name === 'stamp' || one.name === 'clack')).toHaveLength(0)
    // The starfish has turned a gap between its arms to the bucket, and an arm of it now hangs where the crab
    // swings round to show its face: it brings its claw down and swings on. It never stands there for good.
    expect(stood).toBeLessThan(6)
  })

  it('with no room on the beach beyond it is still no gap: the crab walks the rest of its ring up to it and turns back, claws high, without a stamp or a clack', { timeout: 60_000 }, () => {
    // On the north bank, a crab's depth from the edge of the beach: the bucket, and then a bough lying along the bank.
    for (const [thing, to] of [[{ kind: 'bucket' }, [MOAT.x, MOAT.z + 2.5]], [{ kind: 'wood', index: 0 }, [MOAT.x + 0.2, MOAT.z + 2.3]]] as const) {
      const { play, nearest, reached, raised, near } = lapsWith(thing, to)
      const plan = planOf(play), name = thing.kind
      expect(plan.kind, name).toBe('ring')
      if (plan.kind !== 'ring') continue
      expect(plan.open, name).toBe(true)
      expect(plan.path.length, name).toBeGreaterThan(10)
      // Along the rest of its ring and up to the thing: to the end of its line beside it, or within a step of it.
      expect(reached.size, name).toBeGreaterThanOrEqual(8)
      expect([0, 1, 2, plan.path.length - 3, plan.path.length - 2, plan.path.length - 1].some((index) => reached.has(index)), name).toBe(true)
      expect(nearest, name).toBeGreaterThan(0)
      expect(near, name).toBeGreaterThan(30)
      expect(raised / near, name).toBeGreaterThan(0.8)
      expect(play.heard.filter((one) => one.name === 'stamp' || one.name === 'clack'), name).toHaveLength(0)
    }
  })
})

// A beach told to the folk by hand: flat sand, with what lies on it given as patches.
function told(lying: () => { boughs: readonly Patch[]; other: readonly Patch[] }): World {
  return {
    finger: null,
    ground: (_x, z) => base(z),
    blocked: (x, z, r, _shells, wood = true) => {
      const { boughs, other } = lying()
      for (const patch of [...other, ...(wood ? boughs : [])]) if (Math.hypot(patch.x - x, patch.z - z) < patch.r + r) return patch
      return null
    },
    footing: (x, z) => (lying().boughs.some((patch) => Math.hypot(patch.x - x, patch.z - z) < patch.r) ? base(z) + TOPS.wood : base(z)),
  }
}

describe('the crab swinging round under an arm of the starfish', () => {
  it('is not held there for good: its claw comes down as far as the lowest arm it can be under needs, and it walks on', { timeout: 60_000 }, () => {
    // Two evenings on the built moat, the starfish on the tower beside the bank, and a bough dragged to each of two
    // places on the bank: in both the crab swings round under an arm that hangs low over raised sand.
    for (const [seed, place] of [[6, 6], [10, 2]] as const) {
      const play = new Play(BEACHES.evening(7), seed), crab = play.folk.crab
      let still = 0, longest = 0, last = { x: crab.x, z: crab.z, turn: crab.turn }
      const look = (): void => {
        still = Math.hypot(crab.x - last.x, crab.z - last.z) < 0.002 && Math.abs(crab.turn - last.turn) < 0.002 ? still + DT : 0
        longest = Math.max(longest, still)
        last = { x: crab.x, z: crab.z, turn: crab.turn }
      }
      const run = (seconds: number): void => {
        for (let t = 0; t < seconds; t += DT) {
          play.step(DT)
          look()
        }
      }
      run(6)
      const turn = (place / 8) * Math.PI * 2
      for (const [index, far] of [[0, 2.3], [1, 2.9]] as const) {
        const wood = play.things.wood[index], fromX = wood.x, fromZ = wood.z, toX = MOAT.x + Math.cos(turn + index * 2.4) * far, toZ = MOAT.z + Math.sin(turn + index * 2.4) * far
        play.press({ kind: 'wood', index })
        play.dragStart()
        for (let i = 1; i <= 40; i++) {
          play.drag(fromX + ((toX - fromX) * i) / 40, fromZ + ((toZ - fromZ) * i) / 40, 0)
          play.step(DT)
          look()
        }
        play.release()
        run(30)
      }
      // A dead stop between two runs is a second or two. With its claw stopping a hand higher it stood here to the end.
      expect(longest, `seed ${seed}`).toBeLessThan(6)
    }
  })
})

describe('the crab pocketed on its way home', () => {
  it('has a way out over a bough: shut in by boughs all round and the bucket, it climbs over a bough on its feet and goes home, and never through the bucket', { timeout: 60_000 }, () => {
    // Boughs laid end to end all round where it stands, out on the open sand by day, and the bucket in the ring on the side toward its place.
    const AT = { x: 1.5, z: 4.2 }, ring: Patch[] = []
    for (let i = 0; i < 36; i++) ring.push({ x: AT.x + Math.cos((i / 36) * Math.PI * 2) * 3.3, z: AT.z + Math.sin((i / 36) * Math.PI * 2) * 3.3, r: 0.42 })
    const toward = Math.atan2(CRAB_HOME.z - AT.z, CRAB_HOME.x - AT.x)
    const bucket = { x: AT.x + Math.cos(toward) * 3.3, z: AT.z + Math.sin(toward) * 3.3, r: 0.68 }
    const boughs = ring.filter((patch) => Math.hypot(patch.x - bucket.x, patch.z - bucket.z) > 0.9)
    const world = told(() => ({ boughs, other: [bucket] }))
    const crab = new Crab(makeRng(5))
    crab.x = AT.x
    crab.z = AT.z
    crab.stand(world)
    let highest = 0, inBucket = Infinity, low = Infinity, went = ''
    for (let t = 0; t < 40; t += DT) {
      crab.step(DT, world)
      if (Math.floor(t) !== Math.floor(t - DT)) went += ` ${crab.x.toFixed(1)},${crab.z.toFixed(1)}`
      highest = Math.max(highest, crab.floor - base(crab.z))
      inBucket = Math.min(inBucket, apart(crabRounds(crab), [bucket]))
      // Over a bough its feet are on the bough: it is never lower than what is under its middle.
      low = Math.min(low, crab.floor - (world.footing?.(crab.x, crab.z) ?? 0))
    }
    expect(Math.hypot(crab.x - CRAB_HOME.x, crab.z - CRAB_HOME.z), `it went by${went}`).toBeLessThan(1.2)
    expect(highest).toBeGreaterThan(TOPS.wood * 0.8)
    expect(inBucket).toBeGreaterThan(0)
    expect(low).toBeGreaterThan(-0.3)
    // Home again, it is down on the sand.
    expect(crab.floor - base(crab.z)).toBeLessThan(0.1)
  })
})

describe('the crab cut off from its line by two boughs', () => {
  // Two boughs dragged onto the bank of its moat, with the starfish's tower between it and the rest of its line.
  it.each([[3], [45]])('digs itself in with its eyes out and its sound as it goes down, and comes up to its line when the boughs are moved: seed %i', { timeout: 60_000 }, (seed) => {
    const play = new Play(BEACHES.evening(7), seed), crab = play.folk.crab
    const heard = (name: string): number => play.heard.filter((one) => one.name === name).length
    let idle = 0, longest = 0, lx = crab.x, lz = crab.z, lt = crab.turn
    let watch: (() => void) | undefined
    const run = (seconds: number, each = watch): void => {
      for (let t = 0; t < seconds; t += DT) {
        play.step(DT)
        // Up on the sand and neither walking nor turning: how long at a stretch.
        idle = crab.dug === 0 && Math.hypot(crab.x - lx, crab.z - lz) < 0.002 && Math.abs(crab.turn - lt) < 0.002 ? idle + DT : 0
        longest = Math.max(longest, idle)
        lx = crab.x
        lz = crab.z
        lt = crab.turn
        each?.()
      }
    }
    const carry = (index: number, toX: number, toZ: number): void => {
      const wood = play.things.wood[index], fromX = wood.x, fromZ = wood.z
      play.press({ kind: 'wood', index })
      play.dragStart()
      for (let i = 1; i <= 40; i++) {
        play.drag(fromX + ((toX - fromX) * i) / 40, fromZ + ((toZ - fromZ) * i) / 40, 0)
        run(DT)
      }
      play.release()
    }
    run(6)
    const turn = ((seed % 8) / 8) * Math.PI * 2
    const homes = play.things.wood.map((wood) => [wood.x, wood.z])
    // As it goes down: the sound in the frame it starts, its legs shuffling, and sand in the air.
    let began = -1, strode = 0, grains = 0, stood = 0
    const down = (): void => {
      if (began < 0 && crab.dug > 0) {
        began = play.time
        strode = crab.stride
        stood = crab.floor + crab.dug * CRAB_DIGS.deep
        expect(heard('burrow'), 'the sound comes with the first of the motion').toBe(1)
      }
      if (began >= 0 && play.time < began + 0.3) grains = Math.max(grains, play.grains.length)
    }
    for (const [index, far] of [[0, 2.3], [1, 2.9]] as const) {
      carry(index, MOAT.x + Math.cos(turn + index * 2.4) * far, MOAT.z + Math.sin(turn + index * 2.4) * far)
      run(index === 0 ? 30 : 12, down)
    }
    expect(heard('burrow')).toBe(1)
    expect(crab.dug).toBe(1)
    expect(crab.stride - strode).toBeGreaterThan(1)
    expect(grains).toBeGreaterThan(0)
    // In the sand to the top of its legs: its feet are under, and its eyes are out on their stalks.
    expect(stood - crab.floor).toBeCloseTo(CRAB_DIGS.deep, 2)
    expect(CRAB_DIGS.deep).toBeGreaterThan(0.4)
    // And there it looks about: now and then each eye is drawn in and springs out again.
    const low = [9, 9], high = [0, 0]
    run(18, () => crab.eyes.forEach((eye, i) => {
      low[i] = Math.min(low[i], eye.out)
      high[i] = Math.max(high[i], eye.out)
    }))
    expect(crab.dug).toBe(1)
    // Out is right out, but for an eye that has a bough or an arm over it: that one is out as far as there is room.
    for (const i of [0, 1]) {
      expect(low[i]).toBeLessThan(0.3)
      expect(high[i]).toBeGreaterThan(0.55)
    }
    expect(Math.max(...high)).toBeGreaterThan(0.95)
    // It never stood on the sand doing nothing for longer than it tries before it digs.
    expect(longest).toBeLessThan(CRAB_DIGS.after + 3)
    // The boughs are taken away again: up it comes with a snap, in the same frame, and walks its bank.
    const clacks = heard('clack')
    let rose = -1
    watch = () => {
      if (rose < 0 && crab.dug < 1) {
        rose = play.time
        expect(heard('clack')).toBe(clacks + 1)
      }
    }
    carry(0, homes[0][0], homes[0][1])
    carry(1, homes[1][0], homes[1][1])
    run(1.5)
    expect(rose).toBeGreaterThan(0)
    expect(crab.dug).toBe(0)
    let walked = 0, wasX = crab.x, wasZ = crab.z
    run(25, () => {
      walked += Math.hypot(crab.x - wasX, crab.z - wasZ)
      wasX = crab.x
      wasZ = crab.z
    })
    expect(heard('burrow')).toBe(1)
    expect(crab.dug).toBe(0)
    expect(walked).toBeGreaterThan(10)
  })
})

describe('the small crabs', () => {
  it('do not stand part-way out for ever: with their way up the beach shut by something set down, the ones part-way out go back into the sea, and come out when the way is clear', () => {
    const small = new SmallCrabs(makeRng(4))
    let shut = false
    // A long thing laid right across the wet sand between the first of them and its line.
    const world = told(() => ({ boughs: [], other: [] }))
    const bar: World = { ...world, blocked: (x, z) => (shut && z > 0.8 && z < 1.3 ? { x, z: 1.05, r: 0.25 } : null) }
    small.setBored(true)
    small.settle(bar)
    // Sent back in, and half-way there when the way is shut behind... and then sent out again, with the way up shut.
    small.setBored(false)
    for (let t = 0; t < 0.5; t += DT) small.step(DT, bar)
    const first = small.crabs[0]
    expect(first.shown).toBeGreaterThan(0.2)
    expect(first.shown).toBeLessThan(0.9)
    small.setBored(true)
    shut = true
    for (let t = 0; t < 3; t += DT) small.step(DT, bar)
    expect(first.shown).toBe(0)
    // The thing is taken away: out they come.
    shut = false
    for (let t = 0; t < 4; t += DT) small.step(DT, bar)
    for (const crab of small.crabs) expect(crab.shown).toBe(1)
  })
})
