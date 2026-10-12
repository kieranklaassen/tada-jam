import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BEACHES } from './beaches'
import { SMALL_HALF, SMALL_TALL } from './folk'
import { LOG, LOG_STUB, LUMPS } from './layout'
import { deserializeKingdom } from './kingdom'
import { Play } from './play'
import { CLAW_LOW, CRAB_SHELL, CRAB_TOP, EYE_LEAN, EYE_LOW, type Part, crabRounds, eyeLean, gullSpan, gullTall, highest, shellTop, starParts } from './solid'
import { BEACH, BUCKET_HEIGHT, FIXED, HANDLE_BOW, type Patch, SHELL_RADIUS, woodPatches } from './things'
import { FOLDS_FROM, FolkView } from './view/folkView'
import { placeGeometry } from './view/shoreView'
import { ThingsView } from './view/thingsView'

// The game reckons with plain shapes (solid.ts, things.ts): rounds on the
// sand, the height of a top, lumps for the starfish. Whatever is carried,
// walks or rests keeps clear of those shapes, so they have to hold the meshes
// that are drawn. Here the two views are built as the game builds them and
// every mesh is held, point by point, inside the shape the game has for it,
// through moments that take each body through its poses.

const DT = 1 / 30
/**
 * A point of a mesh may stand this far outside its shape: the crab's shell bulges 0.04 out between two of its
 * rounds. It is less than the 0.06 that anything set down keeps from every round, and than the 0.08 at which a
 * carried thing is already lifted right over.
 */
const SLACK = 0.05

type Point = readonly [number, number, number]

class Drawn {
  readonly scene = new THREE.Scene()
  private readonly folk: FolkView
  private readonly things: ThingsView
  constructor(readonly play: Play) {
    const material = new THREE.MeshBasicMaterial()
    this.folk = new FolkView(material)
    this.things = new ThingsView(material, material)
    this.scene.add(this.folk.group, this.things.group)
  }
  /** Lays the game on the meshes, as the picture does each frame. */
  lay(): void {
    this.folk.update(this.play.folk, (x, z) => this.play.ground(x, z))
    this.things.update(this.play)
    this.scene.updateMatrixWorld(true)
  }
  mesh(name: string): THREE.Mesh {
    const found = this.scene.getObjectByName(name)
    if (!(found instanceof THREE.Mesh)) throw new Error(`no mesh ${name}`)
    return found
  }
  shown(name: string): boolean {
    for (let at: THREE.Object3D | null = this.mesh(name); at; at = at.parent) if (!at.visible) return false
    return true
  }
  /** Every point of a mesh, where it is drawn. */
  points(name: string): Point[] {
    const mesh = this.mesh(name), at = mesh.geometry.getAttribute('position'), out: Point[] = [], v = new THREE.Vector3()
    for (let i = 0; i < at.count; i++) {
      v.fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld)
      out.push([v.x, v.y, v.z])
    }
    return out
  }
}

/** How far a point is outside every one of some rounds, across the sand. */
function outside(point: Point, rounds: readonly Patch[]): number {
  let least = Infinity
  for (const round of rounds) least = Math.min(least, Math.hypot(point[0] - round.x, point[2] - round.z) - round.r)
  return least
}

/** Steps the game and looks at the drawn meshes every few frames. */
function watch(seen: Drawn, seconds: number, look: (t: number) => void, before?: (frame: number) => void, every = 3): void {
  const frames = Math.round(seconds / DT)
  for (let frame = 0; frame < frames; frame++) {
    before?.(frame)
    seen.play.step(DT)
    if (frame % every === 0) {
      seen.lay()
      look(frame * DT)
    }
  }
}

const fresh = (): Drawn => new Drawn(new Play(deserializeKingdom(null, 7), 1))
const evening = (beach: keyof typeof BEACHES): Drawn => {
  const seen = new Drawn(new Play(BEACHES[beach](7), 1))
  if (beach !== 'evening') {
    seen.play.step(DT)
    seen.play.press({ kind: 'sun' })
    seen.play.tap()
  }
  return seen
}

const CRAB = ['crab-body', 'crab-legs-left', 'crab-legs-right', 'crab-claw-left', 'crab-claw-right', 'crab-eye-left', 'crab-eye-right', 'crab-mouth']

describe('the crab as it is drawn', () => {
  /** How far any point of the crab is outside its rounds, and over its top. */
  const worst = (seen: Drawn): { out: number; over: number; what: string } => {
    const crab = seen.play.folk.crab, rounds = crabRounds(crab), top = crab.floor + CRAB_TOP
    let out = -Infinity, over = -Infinity, what = ''
    for (const name of CRAB) for (const point of seen.points(name)) {
      const beyond = outside(point, rounds)
      if (beyond > out) {
        out = beyond
        what = name
      }
      over = Math.max(over, point[1] - top)
    }
    return { out, over, what }
  }

  it('reaches a leg down for lower sand from its hip: the foot goes down by the reach, and the root of the leg stays where it is set in the shell', () => {
    const seen = fresh()
    seen.play.step(DT)
    const crab = seen.play.folk.crab
    // At its place by day it stands square to the child and level: across it is along the beach.
    expect(Math.abs(crab.turn)).toBeLessThan(1e-6)
    for (const [index, name] of [[0, 'crab-legs-left'], [1, 'crab-legs-right']] as const) {
      crab.reach = [0, 0]
      seen.lay()
      const level = seen.points(name)
      crab.reach = index === 0 ? [0.25, 0] : [0, 0.25]
      seen.lay()
      const down = seen.points(name)
      // Its feet are a quarter lower.
      expect(Math.min(...level.map((point) => point[1])) - Math.min(...down.map((point) => point[1]))).toBeCloseTo(0.25, 1)
      // Where the leg leaves the shell, 0.84 from the crab's middle, and inside the shell from there, it has
      // hardly moved: the root turns a little about the hip, and does not swell. Stretched as a whole it moved 0.13.
      let moved = 0, held = 0
      level.forEach((point, at) => {
        if (Math.abs(point[0] - crab.x) > 0.88) return
        held += 1
        moved = Math.max(moved, Math.hypot(down[at][0] - point[0], down[at][1] - point[1], down[at][2] - point[2]))
      })
      expect(held).toBeGreaterThan(10)
      expect(moved, name).toBeLessThan(0.07)
      crab.reach = [0, 0]
    }
  })

  it('stands inside its three rounds and under its top: at home, poked, and sidling away from a finger', { timeout: 60_000 }, () => {
    const seen = fresh()
    let out = -Infinity, over = -Infinity, what = ''
    watch(seen, 30, () => {
      const now = worst(seen)
      if (now.out > out) what = now.what
      out = Math.max(out, now.out)
      over = Math.max(over, now.over)
    }, (frame) => {
      if (frame % 200 === 60) {
        seen.play.press({ kind: 'folk', who: 'crab', index: 0 })
        seen.play.tap()
      }
      // A finger dug in beside it: it runs off sideways and comes back.
      if (frame === 500) seen.play.press({ kind: 'sand', x: -2.6, z: 4.6 })
      if (frame === 503) seen.play.tap()
    })
    expect(out, what).toBeLessThan(SLACK)
    expect(over).toBeLessThan(SLACK)
  })

  it('stands inside them all the way round its moat, and stamping at a gap with a shell on its head', { timeout: 60_000 }, () => {
    for (const beach of ['evening', 'wrong'] as const) {
      const seen = evening(beach)
      let out = -Infinity, over = -Infinity, what = ''
      watch(seen, beach === 'evening' ? 40 : 60, () => {
        const now = worst(seen)
        if (now.out > out) what = now.what
        out = Math.max(out, now.out)
        over = Math.max(over, now.over)
      })
      expect(out, `${beach}: ${what}`).toBeLessThan(SLACK)
      expect(over, beach).toBeLessThan(SLACK)
    }
  })

  it('has the shell the starfish rides on where the game says its back is', () => {
    const seen = fresh()
    seen.lay()
    const crab = seen.play.folk.crab, ground = crab.floor
    // The body's own lump, without the bumps on its back: no point of it is over the shell the game reckons, and its
    // top is the shell's top.
    let high = -Infinity, over = -Infinity
    for (const [x, y, z] of seen.points('crab-body')) {
      const dx = x - crab.x, dz = z - crab.z
      const top = shellTop(dx * Math.cos(crab.turn) - dz * Math.sin(crab.turn), dx * Math.sin(crab.turn) + dz * Math.cos(crab.turn), crab.lift)
      high = Math.max(high, y - ground)
      // The pale bumps stand 0.05 proud of the shell.
      if (top > -Infinity) over = Math.max(over, y - ground - top)
    }
    expect(over).toBeLessThan(0.06)
    expect(high).toBeGreaterThan(CRAB_SHELL.y + CRAB_SHELL.ry - 0.02)
    expect(high).toBeLessThan(CRAB_SHELL.y + CRAB_SHELL.ry + 0.06)
  })
})

describe('the crab\'s eyes on their stalks', () => {
  it('lean far only where there is room: never into each other, and never into the arm of a claw held high', { timeout: 60_000 }, () => {
    const seen = fresh()
    const crab = seen.play.folk.crab
    /** The middle of an eye's white ball, where it is drawn: the ball is 0.2 across its narrow way. */
    const ball = (name: string): THREE.Vector3 => new THREE.Vector3(0, 0.46, 0).applyMatrix4(seen.mesh(name).matrixWorld)
    let close = Infinity, clawNear = Infinity, what = ''
    for (const out of [0, 0.5, 1, 1.4]) for (const left of [-1, 0, 1]) for (const right of [-1, 0, 1]) for (const toward of [-1, 0, 1]) for (const raise of [-0.5, 0, 0.5, 1]) for (const shut of [0, 1]) {
      crab.eyes[0].out = out
      crab.eyes[1].out = out
      crab.eyes[0].across = left
      crab.eyes[1].across = right
      crab.eyes[0].toward = toward
      crab.eyes[1].toward = -toward
      for (const claw of crab.claws) Object.assign(claw, { raise, shut })
      seen.lay()
      const a = ball('crab-eye-left'), b = ball('crab-eye-right')
      close = Math.min(close, a.distanceTo(b))
      for (const [eye, claw] of [[a, 'crab-claw-left'], [b, 'crab-claw-right']] as const) for (const point of seen.points(claw)) {
        const far = eye.distanceTo(new THREE.Vector3(...point))
        if (far < clawNear) {
          clawNear = far
          what = `${claw}: out ${out}, across ${left} and ${right}, toward ${toward}, raise ${raise}, shut ${shut}`
        }
      }
    }
    // Two balls 0.4 across: their middles stay further apart than that, and no point of a claw is inside one.
    expect(close).toBeGreaterThan(0.42)
    expect(clawNear, what).toBeGreaterThan(0.2)
  })

  it('and its claws stand inside the room the crab reckons with under an arm of the starfish: a claw no higher than it is held, an eye no higher than it is out', { timeout: 60_000 }, () => {
    const seen = fresh()
    const crab = seen.play.folk.crab
    crab.turn = 0
    crab.lean = 0
    crab.lift = 0
    const floor = crab.floor
    let worst = -Infinity, what = ''
    const note = (over: number, name: string): void => {
      if (over > worst) {
        worst = over
        what = name
      }
    }
    for (const out of [0, 0.5, 1, 1.4]) for (const across of [-1, 0, 1]) for (const toward of [-1, 0, 1]) for (const raise of [-0.5, 0, 0.5, 0.85, 1]) for (const shut of [0, 1]) {
      for (const eye of crab.eyes) Object.assign(eye, { out, across, toward })
      for (const claw of crab.claws) Object.assign(claw, { raise, shut })
      seen.lay()
      const pose = `out ${out}, across ${across}, toward ${toward}, raise ${raise}, shut ${shut}`
      for (const side of [-1, 1]) {
        for (const [x, y, z] of seen.points(`crab-claw-${side < 0 ? 'left' : 'right'}`)) {
          const flat = x - crab.x, up = y - floor, front = z - crab.z
          // The arm that joins it to the shell is low, and inside of the claw's place; the ball and the fingers are in it.
          if (up < 0.85 + raise * 0.5) continue
          note(Math.abs(flat - side * 1.1) - 0.44, `a claw to the side, ${pose}`)
          note(Math.abs(front - 0.5) - 0.25, `a claw to the front, ${pose}`)
          note(up - (CLAW_LOW + raise * 0.5), `a claw's top, ${pose}`)
        }
        const lean = eyeLean(across, toward, side, 1, raise), tx = Math.sin(lean.side) * 0.64, tz = Math.sin(lean.forward) * 0.64
        for (const [x, y, z] of seen.points(`crab-eye-${side < 0 ? 'left' : 'right'}`)) {
          const px = x - crab.x - side * 0.3, up = y - floor, pz = z - crab.z - 0.22
          const along = tx * tx + tz * tz > 1e-9 ? Math.min(1, Math.max(0, (px * tx + pz * tz) / (tx * tx + tz * tz))) : 0
          note(Math.hypot(px - tx * along, pz - tz * along) - 0.24, `an eye to the side, ${pose}`)
          note(up - (0.9 + 0.66 * (0.12 + 0.88 * out)), `an eye's top, ${pose}`)
        }
      }
    }
    expect(worst, what).toBeLessThan(0.02)
    // An eye pulled right in, and a claw held down, are as high as the game says.
    expect(EYE_LOW).toBeCloseTo(0.9 + 0.66 * 0.12, 2)
  })

  it('lean by the rule the picture reads: a stalk pulled in stands straight, and one beside a raised claw does not lean toward it', () => {
    expect(eyeLean(1, 1, 1, 0, 0)).toEqual({ side: 0, forward: 0 })
    // Toward its own claw, with the claw down and with it up.
    expect(eyeLean(1, 0, 1, 1, 0).side).toBeCloseTo(EYE_LEAN.apart, 6)
    expect(eyeLean(1, 0, 1, 1, 1).side).toBe(0)
    expect(eyeLean(-1, 0, -1, 1, 1).side).toBeCloseTo(0, 9)
    // Toward the other eye, a little; forward far, back a little.
    expect(Math.abs(eyeLean(-1, 0, 1, 1, 0).side)).toBeCloseTo(EYE_LEAN.together, 6)
    expect(eyeLean(0, 1, 1, 1, 0).forward).toBeCloseTo(EYE_LEAN.forward, 6)
    expect(eyeLean(0, -1, 1, 1, 0).forward).toBeCloseTo(-EYE_LEAN.back, 6)
    expect(EYE_LEAN.together).toBeLessThan(EYE_LEAN.apart)
  })
})

describe('the starfish as it is drawn', () => {
  /** Where a point is in a lump's own frame: 1 on its skin. */
  const within = (part: Part, at: Point, foot: Point): number => {
    const m = new THREE.Matrix3().set(part.m[0], part.m[1], part.m[2], part.m[3], part.m[4], part.m[5], part.m[6], part.m[7], part.m[8]).invert()
    return new THREE.Vector3(at[0] - foot[0] - part.cx, at[1] - foot[1] - part.cy, at[2] - foot[2] - part.cz).applyMatrix3(m).length()
  }
  /** How well the drawn arms and middle agree with the lumps the game rests on what is under it. */
  const agree = (seen: Drawn): { beyond: number; short: number } => {
    const star = seen.play.folk.starfish, parts = starParts(star), foot: Point = [star.x, star.y, star.z]
    let beyond = 0, short = 0
    for (let i = 0; i < 5; i++) {
      let far = 0
      for (const point of seen.points(`starfish-arm-${i}`)) far = Math.max(far, within(parts[i], point, foot))
      // A freckle stands a little proud of the skin.
      beyond = Math.max(beyond, far - 1)
      short = Math.max(short, 1 - far)
    }
    // The middle with the whites of its eyes, which stand out in front of it: its back and its edge are the lump's.
    const m = new THREE.Matrix3().set(parts[5].m[0], parts[5].m[1], parts[5].m[2], parts[5].m[3], parts[5].m[4], parts[5].m[5], parts[5].m[6], parts[5].m[7], parts[5].m[8]).invert()
    for (const point of seen.points('starfish-middle')) {
      const own = new THREE.Vector3(point[0] - foot[0] - parts[5].cx, point[1] - foot[1] - parts[5].cy, point[2] - foot[2] - parts[5].cz).applyMatrix3(m)
      if (own.z < 0.2) beyond = Math.max(beyond, own.length() - 1)
    }
    return { beyond, short }
  }

  it('is the five arms and the middle the game rests on the rock: stretching, flopping and poked into a fist', { timeout: 60_000 }, () => {
    const seen = fresh()
    let beyond = 0, short = 0
    watch(seen, 40, () => {
      const now = agree(seen)
      beyond = Math.max(beyond, now.beyond)
      short = Math.max(short, now.short)
    }, (frame) => {
      if (frame % 300 === 150) {
        seen.play.press({ kind: 'folk', who: 'starfish', index: 0 })
        seen.play.tap()
      }
    })
    // Each drawn arm reaches the skin of its lump and no further than a freckle's height past it.
    expect(short).toBeLessThan(0.01)
    expect(beyond).toBeLessThan(0.2)
  })

  it('is the same lumps on its way to the tower and flat on it, on the crab\'s back, and stands inside its rounds and under its top', { timeout: 60_000 }, () => {
    for (const beach of ['kingdom', 'wrong'] as const) {
      const seen = evening(beach)
      let beyond = 0, short = 0, out = -Infinity, over = -Infinity, what = ''
      watch(seen, 60, (t) => {
        const now = agree(seen)
        beyond = Math.max(beyond, now.beyond)
        short = Math.max(short, now.short)
        const star = seen.play.folk.starfish, rounds = star.rounds(), top = star.y + highest(starParts(star))
        for (const name of ['starfish-arm-0', 'starfish-arm-1', 'starfish-arm-2', 'starfish-arm-3', 'starfish-arm-4', 'starfish-middle']) for (const point of seen.points(name)) {
          const beyondRounds = outside(point, rounds)
          if (beyondRounds > out) {
            out = beyondRounds
            what = `${name} at ${t.toFixed(1)}, ${star.move} on ${star.on}, spread ${star.spread.toFixed(2)}`
          }
          // The whites of its eyes stand up out of its middle when it lies on its back.
          over = Math.max(over, point[1] - top)
        }
      }, undefined, 7)
      expect(short, beach).toBeLessThan(0.01)
      expect(beyond, beach).toBeLessThan(0.2)
      expect(out, `${beach}: ${what}`).toBeLessThan(SLACK)
      expect(over, beach).toBeLessThan(0.12)
    }
  })

  it('draws nothing of its face while an arm is folded in over it: its lids come down first, and then eyes, lids and mouth are gone until the arm is out', () => {
    const seen = fresh()
    seen.play.step(1)
    seen.play.press({ kind: 'folk', who: 'starfish', index: 0 })
    seen.play.tap()
    let folded = 0, open = 0, shutFirst = 0
    const frames = Math.round(4 / DT)
    for (let frame = 0; frame < frames; frame++) {
      seen.play.step(DT)
      seen.lay()
      const star = seen.play.folk.starfish, curl = Math.max(...star.arms)
      if (curl > FOLDS_FROM) {
        folded++
        for (const name of ['starfish-whites', 'starfish-pupils', 'starfish-lids', 'starfish-mouth']) expect(seen.shown(name), name).toBe(false)
      } else if (star.blink > 0.5) {
        // Shut, and no arm over it yet, or none any more: the lids are drawn and the eyes under them are not.
        shutFirst++
        expect(seen.shown('starfish-lids')).toBe(true)
        expect(seen.shown('starfish-whites')).toBe(false)
        expect(seen.shown('starfish-pupils')).toBe(false)
      } else {
        open++
        expect(curl).toBeLessThanOrEqual(FOLDS_FROM)
        expect(seen.shown('starfish-whites')).toBe(true)
        expect(seen.shown('starfish-pupils')).toBe(true)
        expect(seen.shown('starfish-mouth')).toBe(true)
      }
    }
    expect(folded).toBeGreaterThan(10)
    expect(shutFirst).toBeGreaterThan(1)
    expect(open).toBeGreaterThan(10)
  })
})

describe('the gulls as they are drawn', () => {
  const PARTS = (index: number): string[] => [`gull-${index}-body`, `gull-${index}-head`, `gull-${index}-jaw`, `gull-${index}-wing-left`, `gull-${index}-wing-right`]
  /** How far any point of a bird is past the reach the game gives it to either side, and over its top. */
  const worst = (seen: Drawn): { side: number; over: number; what: string } => {
    let side = -Infinity, over = -Infinity, what = ''
    seen.play.folk.gulls.birds.forEach((bird, index) => {
      const left = gullSpan(bird, index, -1), right = gullSpan(bird, index, 1), top = bird.y + bird.hop + gullTall(index)
      for (const name of PARTS(index)) for (const [x, y] of seen.points(name)) {
        const beyond = Math.max(bird.x - left - x, x - (bird.x + right))
        if (beyond > side) {
          side = beyond
          what = name
        }
        over = Math.max(over, y - top)
      }
    })
    return { side, over, what }
  }

  it('reach no further to either side than the game keeps between them, and stand under their tops: on the log, poked, ducking', { timeout: 60_000 }, () => {
    const seen = fresh()
    let side = -Infinity, over = -Infinity, what = ''
    watch(seen, 40, () => {
      const now = worst(seen)
      if (now.side > side) what = now.what
      side = Math.max(side, now.side)
      over = Math.max(over, now.over)
    }, (frame) => {
      if (frame % 120 === 40) {
        seen.play.press({ kind: 'folk', who: 'gull', index: Math.floor(frame / 120) % 3 })
        seen.play.tap()
      }
      // A finger on the sand in front of them: they duck.
      if (frame % 400 === 300) seen.play.press({ kind: 'sand', x: 4.6, z: 2.6 })
      if (frame % 400 === 303) seen.play.tap()
    })
    expect(side, what).toBeLessThan(SLACK)
    expect(over).toBeLessThan(SLACK)
  })

  it('keep clear of the stub on their log: poked from end to end of the row, landing beside it squashed down, leaning and with a wing out', { timeout: 60_000 }, () => {
    const seen = fresh()
    // The stub as the picture draws it: a rod about its middle, tipped over toward the child.
    const half = LOG_STUB.length / 2, uy = Math.cos(LOG_STUB.tip), uz = Math.sin(LOG_STUB.tip)
    let nearest = Infinity, what = '', landed = 0
    watch(seen, 30, () => {
      seen.play.folk.gulls.birds.forEach((bird, index) => {
        if (bird.hop === 0 && bird.squash > 0.15 && bird.x > LOG.x1 - 0.8) landed++
        for (const name of PARTS(index)) for (const [x, y, z] of seen.points(name)) {
          const along = Math.max(-half, Math.min(half, (y - LOG_STUB.y) * uy + (z - LOG_STUB.z) * uz))
          const gap = Math.hypot(x - LOG_STUB.x, y - LOG_STUB.y - uy * along, z - LOG_STUB.z - uz * along) - LOG_STUB.radius
          if (gap < nearest) {
            nearest = gap
            what = name
          }
        }
      })
    }, (frame) => {
      if (frame % 75 === 40) {
        seen.play.press({ kind: 'folk', who: 'gull', index: Math.floor(frame / 75) % 3 })
        seen.play.tap()
      }
    })
    // One came down at the stub's end and squashed there, more than once.
    expect(landed).toBeGreaterThan(3)
    expect(nearest, what).toBeGreaterThan(0.03)
  })

  it('the same on a wall at evening, landing in a row and sliding off a lumpy one', { timeout: 60_000 }, () => {
    for (const beach of ['kingdom', 'wrong'] as const) {
      const seen = evening(beach)
      let side = -Infinity, over = -Infinity, what = ''
      watch(seen, 60, () => {
        const now = worst(seen)
        if (now.side > side) what = now.what
        side = Math.max(side, now.side)
        over = Math.max(over, now.over)
      })
      expect(side, `${beach}: ${what}`).toBeLessThan(SLACK)
      expect(over, beach).toBeLessThan(SLACK)
    }
  })
})

describe('the small crabs as they are drawn', () => {
  it('stand inside the round and under the top the game gives each', { timeout: 60_000 }, () => {
    const seen = evening('bare')
    let out = -Infinity, over = -Infinity, came = 0
    watch(seen, 90, () => {
      seen.play.folk.small.crabs.forEach((crab, index) => {
        if (!seen.shown(`small-crab-${index}`)) return
        came++
        const top = seen.play.ground(crab.x, crab.z) + crab.hop + SMALL_TALL * crab.size
        for (const point of seen.points(`small-crab-${index}`)) {
          out = Math.max(out, outside(point, [{ x: crab.x, z: crab.z, r: SMALL_HALF * crab.size }]))
          over = Math.max(over, point[1] - top)
        }
      })
    })
    expect(came).toBeGreaterThan(30)
    expect(out).toBeLessThan(SLACK)
    expect(over).toBeLessThan(SLACK)
  })
})

describe('the things as they are drawn', () => {
  it('the bucket stands inside its round, and its handle is a bow that clears its own rim however it swings', () => {
    const seen = fresh()
    seen.lay()
    const pail = seen.play.bucketPose()
    let wide = 0, rim = 0
    for (const [x, y, z] of seen.points('bucket-pail')) {
      wide = Math.max(wide, Math.hypot(x - pail.x, z - pail.z))
      if (y - pail.y > BUCKET_HEIGHT - 0.1) rim = Math.max(rim, Math.hypot(x - pail.x, z - pail.z))
    }
    let far = 0, near = Infinity
    const handle = seen.mesh('bucket-handle').geometry.getAttribute('position'), v = new THREE.Vector3()
    for (let i = 0; i < handle.count; i++) {
      v.fromBufferAttribute(handle, i)
      // The bow is drawn round the middle of the rim: every point of it is this far from there, however it is swung.
      far = Math.max(far, v.length())
      near = Math.min(near, v.length())
    }
    // What the game holds a carried thing off: the bow and a little more.
    expect(far).toBeLessThan(HANDLE_BOW + 0.05)
    expect(wide).toBeLessThan(HANDLE_BOW + 0.05)
    // Swung right down, the bow lies round the outside of the rim.
    expect(near).toBeGreaterThan(rim + 0.005)
  })

  it('each shell lies inside the round the game gives it, and each bough inside its five, with its stub', () => {
    const seen = fresh()
    seen.lay()
    seen.play.things.shells.forEach((shell, index) => {
      let out = -Infinity
      for (const point of seen.points(`shell-${index}`)) out = Math.max(out, outside(point, [{ x: shell.x, z: shell.z, r: SHELL_RADIUS }]))
      expect(out, `shell ${index}`).toBeLessThan(0)
    })
    seen.play.things.wood.forEach((piece, index) => {
      let out = -Infinity
      for (const point of seen.points(`driftwood-${index}`)) out = Math.max(out, outside(point, woodPatches(piece)))
      expect(out, `wood ${index}`).toBeLessThan(0)
    })
  })

  it('stand inside the pillars the game lifts a carried thing over, as the bucket is filled, hops, and stands again after it is turned out', () => {
    const seen = fresh()
    let over = -Infinity, what = ''
    const look = (t: number): void => {
      const names = ['bucket-pail', 'bucket-handle', ...[0, 1, 2].map((index) => `shell-${index}`), 'driftwood-0', 'driftwood-1']
      const pillars = seen.play.pillars()
      // While the bucket is in the air being turned out, the child's finger is on it and nothing else is in a hand;
      // what it comes down beside is held in every frame by through.test.ts.
      const turning = !seen.play.things.bucket.side && Math.abs(seen.play.bucketPose().turn) > 0.02
      for (const name of names) {
        if (!seen.shown(name) || (turning && name.startsWith('bucket'))) continue
        for (const point of seen.points(name)) {
          // How far it is outside the pillar that holds it best: past its round, or over its top.
          let least = Infinity
          for (const pillar of pillars) least = Math.min(least, Math.max(Math.hypot(point[0] - pillar.x, point[2] - pillar.z) - pillar.r, point[1] - pillar.top))
          if (least > over) {
            over = least
            what = `${name} at ${t.toFixed(2)}`
          }
        }
      }
    }
    watch(seen, 8, look, (frame) => {
      if (frame === 20 || frame === 80 || frame === 140) {
        seen.play.press({ kind: 'bucket' })
        seen.play.tap()
      }
    })
    expect(over, what).toBeLessThan(SLACK)
  })
})

describe('the eel as it is drawn', () => {
  it('is not drawn while it is under the driftwood: the picture reads what the game says, and not only how far it is ducked', () => {
    const seen = evening('evening'), eel = seen.play.folk.eel
    // Until it swims its groove with its head up.
    for (let t = 0; t < 30 && !(eel.where === 'groove' && eel.dip < 0.5 && !eel.under); t += DT) seen.play.step(DT)
    expect(eel.where).toBe('groove')
    seen.lay()
    expect(seen.shown('eel-head')).toBe(true)
    // Under the wood it is out of sight from that frame, before it has ducked any further.
    eel.under = true
    seen.lay()
    expect(eel.dip).toBeLessThan(0.5)
    expect(seen.shown('eel-head')).toBe(false)
    eel.under = false
    seen.lay()
    expect(seen.shown('eel-head')).toBe(true)
  })
})

describe('the rocks, the pebbles and the gulls\' log as they are drawn', () => {
  it('are two meshes, the rock the eel lives in with its hole and everything else, and together they are every point of the place', () => {
    const all = placeGeometry().getAttribute('position'), hole = placeGeometry('hole').getAttribute('position'), rest = placeGeometry('rest').getAttribute('position')
    expect(hole.count).toBeGreaterThan(100)
    expect(hole.count + rest.count).toBe(all.count)
    // Every point of the eel's rock is within its own lump, give or take its lumpiness: none of it is another rock.
    const own = LUMPS.find((rock) => rock.of === 'eel' && rock.big)!
    for (let i = 0; i < hole.count; i++) expect(Math.hypot((hole.getX(i) - own.x) / own.rx, (hole.getY(i) - own.y) / own.ry, (hole.getZ(i) - own.z) / own.rz)).toBeLessThan(1.25)
  })

  it('lie inside the patches nothing is ever set down on, wherever a thing on the beach could reach them', () => {
    const place = placeGeometry(), at = place.getAttribute('position')
    // As far as the long side of a shell reaches past the edge of the beach its middle is kept to.
    const reach = SHELL_RADIUS + 0.1
    let out = -Infinity, where = '', held = 0
    for (let i = 0; i < at.count; i++) {
      const x = at.getX(i), y = at.getY(i), z = at.getZ(i)
      if (x < BEACH.x0 - reach || x > BEACH.x1 + reach || z < BEACH.z0 - reach || z > BEACH.z1 + reach) continue
      // Only what stands out of the sand.
      if (y < 0.1 * (z + 3)) continue
      held += 1
      const beyond = outside([x, y, z], FIXED)
      if (beyond > out) {
        out = beyond
        where = `${x.toFixed(2)}, ${z.toFixed(2)}`
      }
    }
    expect(held).toBeGreaterThan(500)
    expect(out, where).toBeLessThanOrEqual(0)
  })
})

