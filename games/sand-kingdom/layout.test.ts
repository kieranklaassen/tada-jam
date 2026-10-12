import { describe, expect, it } from 'vitest'
import { HORIZON_Z, cameraFor, horizonY, project } from './camera'
import { SEA, base, dent, makeField } from './field'
import { Folk } from './folk'
import { CLOUDS, CORNER, type Drawn, EEL_HOLES, FOLK_REACH, LOG, STAR_HOME, SUN, homeControlBox, targetAt } from './layout'
import { makeRng } from './rng'

/** The surfaces the sheet names: a tablet held wide, at two sizes. */
const SURFACES = [[1180, 820], [1024, 768]] as const

const ground = (_x: number, z: number) => base(z)

/** The things a finger picks up, put where none of these touches falls: far off the bottom of the frame. */
const AWAY: Drawn = { bucket: { x: 0, y: 3, z: 40 }, shells: [], wood: [], sun: { x: 60, y: 40 } }

describe('what a touch is on', () => {
  const camera = cameraFor(1180, 820)
  const field = makeField()
  const spots = new Folk(makeRng(1)).spots(ground)
  const at = (x: number, y: number, z: number) => project(camera, x, y, z)

  it('is the sand, at the point of the beach under the finger', () => {
    const p = at(1, base(3), 3)
    const target = targetAt(camera, p.x, p.y, field, spots, SEA, AWAY)
    expect(target.kind).toBe('sand')
    if (target.kind === 'sand') {
      expect(target.x).toBeCloseTo(1, 1)
      expect(target.z).toBeCloseTo(3, 1)
    }
  })

  it('is the water out in the sea, and in a groove dug down to it', () => {
    const sea = at(0, SEA, -8)
    expect(targetAt(camera, sea.x, sea.y, field, spots, SEA, AWAY).kind).toBe('water')
    const dug = makeField()
    const p = at(0, SEA, -2)
    expect(targetAt(camera, p.x, p.y, dug, spots, SEA, AWAY).kind).toBe('sand')
    dent(dug, 0, -2)
    expect(targetAt(camera, p.x, p.y, dug, spots, SEA, AWAY).kind).toBe('water')
  })

  it('is each of the folk where it stands', () => {
    const crab = at(spots.crab.x, spots.crab.y, spots.crab.z)
    expect(targetAt(camera, crab.x, crab.y, field, spots, SEA, AWAY)).toEqual({ kind: 'folk', who: 'crab', index: 0 })
    const star = at(spots.starfish.x, spots.starfish.y, spots.starfish.z)
    expect(targetAt(camera, star.x, star.y, field, spots, SEA, AWAY)).toEqual({ kind: 'folk', who: 'starfish', index: 0 })
    spots.gulls.forEach((gull, index) => {
      const p = at(gull.x, gull.y, gull.z)
      expect(targetAt(camera, p.x, p.y, field, spots, SEA, AWAY)).toEqual({ kind: 'folk', who: 'gull', index })
    })
  })

  it('is the eel only while its head is out, and its rock otherwise', () => {
    const p = at(EEL_HOLES[0].x, EEL_HOLES[0].y + 0.1, EEL_HOLES[0].z + 0.5)
    const out = { ...spots, eel: { x: EEL_HOLES[0].x, y: EEL_HOLES[0].y + 0.1, z: EEL_HOLES[0].z + 0.5, out: true } }
    expect(targetAt(camera, p.x, p.y, field, out, SEA, AWAY)).toEqual({ kind: 'folk', who: 'eel', index: 0 })
    expect(targetAt(camera, p.x, p.y, field, { ...out, eel: { ...out.eel, out: false } }, SEA, AWAY).kind).toBe('rock')
  })

  it('is a cloud on a cloud, and the sky beside it', () => {
    const cloud = at(CLOUDS[1].x, CLOUDS[1].y, HORIZON_Z)
    expect(targetAt(camera, cloud.x, cloud.y, field, spots, SEA, AWAY)).toEqual({ kind: 'cloud', index: 1 })
    const sky = targetAt(camera, 590, 30, field, spots, SEA, AWAY)
    expect(sky.kind).toBe('sky')
    if (sky.kind === 'sky') expect(Math.abs(sky.x)).toBeLessThan(0.5)
  })
})

describe('the frame', () => {
  it.each(SURFACES)('keeps everything a finger can find clear of the home control and of the grown-up corner, at %i by %i', (width, height) => {
    const camera = cameraFor(width, height)
    const home = homeControlBox(camera)
    const spots = new Folk(makeRng(1)).spots(ground)
    /** Each thing as a box on the surface: its name, its middle, and its half size in pixels. */
    const things: { name: string; x: number; y: number; halfX: number; halfY: number }[] = []
    const add = (name: string, x: number, y: number, z: number, reachX: number, reachY: number) => {
      const p = project(camera, x, y, z), side = project(camera, x + reachX, y + reachY, z)
      things.push({ name, x: p.x, y: p.y, halfX: side.x - p.x, halfY: p.y - side.y })
    }
    add('the sun', SUN.x, SUN.y, HORIZON_Z, SUN.radius, SUN.radius)
    CLOUDS.forEach((cloud, index) => add(`cloud ${index}`, cloud.x, cloud.y, HORIZON_Z, cloud.w, cloud.h * 1.6))
    add('the crab', spots.crab.x, spots.crab.y, spots.crab.z, FOLK_REACH.crab, FOLK_REACH.crab)
    add('the starfish', STAR_HOME.x, spots.starfish.y, STAR_HOME.z, FOLK_REACH.starfish, FOLK_REACH.starfish)
    spots.gulls.forEach((gull, index) => add(`gull ${index}`, gull.x, gull.y, gull.z, FOLK_REACH.gull, FOLK_REACH.gull))
    add('the log', (LOG.x0 + LOG.x1) / 2, LOG.top, LOG.z, (LOG.x1 - LOG.x0) / 2, 0.5)
    for (const thing of things) {
      const overHome = thing.x + thing.halfX > home.left && thing.x - thing.halfX < home.right && thing.y - thing.halfY < home.bottom
      expect(overHome, `${thing.name} under the home control`).toBe(false)
      const inCorner = thing.x + thing.halfX > width - CORNER && thing.y - thing.halfY < CORNER
      expect(inCorner, `${thing.name} in the grown-up corner`).toBe(false)
      // And each is on the surface: its middle is inside the frame.
      expect(thing.x, `${thing.name} across`).toBeGreaterThan(0)
      expect(thing.x, `${thing.name} across`).toBeLessThan(width)
      expect(thing.y, `${thing.name} down`).toBeGreaterThan(0)
      expect(thing.y, `${thing.name} down`).toBeLessThan(height)
    }
  })

  it.each(SURFACES)('gives the sky about a fifth of the frame and the beach more than half, at %i by %i', (width, height) => {
    const camera = cameraFor(width, height)
    const horizon = horizonY(camera) / height
    expect(horizon).toBeGreaterThan(0.15)
    expect(horizon).toBeLessThan(0.3)
    const waterline = project(camera, 0, SEA, -3).y / height
    expect(1 - waterline).toBeGreaterThan(0.55)
  })
})
