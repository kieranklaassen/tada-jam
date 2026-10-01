// Tower templates for Slingshot Smash. A spec is plain numbers: x is an offset
// from the tower's centre line, y is the height of the piece's centre above the
// ground. The game turns them into matter-js bodies.

export type Material = 'wood' | 'ice' | 'stone'
export type ShotKind = 'basic' | 'split' | 'mini' | 'bomb' | 'heavy'

export interface BlockSpec {
  x: number
  y: number
  w: number
  h: number
  mat: Material
}

export interface JellySpec {
  x: number
  y: number
}

export interface TowerSpec {
  blocks: BlockSpec[]
  jellies: JellySpec[]
}

// Templates are written at a small scale and blown up so the tower fills its
// half of the field.
const S = 1.2
// Jelly body radius: BASE_JR in template units, JR on the field.
const BASE_JR = 28
export const JR = BASE_JR * S

interface Kit {
  spec: TowerSpec
  // Place a block whose bottom edge is at `bottom`; returns its top.
  b(x: number, bottom: number, w: number, h: number, mat: Material): number
  // Sit a jelly on a surface at height `bottom`.
  j(x: number, bottom: number): void
}

function kit(): Kit {
  const spec: TowerSpec = { blocks: [], jellies: [] }
  return {
    spec,
    b(x, bottom, w, h, mat) {
      spec.blocks.push({ x, y: bottom + h / 2, w, h, mat })
      return bottom + h
    },
    j(x, bottom) {
      spec.jellies.push({ x, y: bottom + BASE_JR })
    },
  }
}

type Rand = () => number
type Template = (r: Rand) => TowerSpec

// One table: the easy first tower. Hit a leg and the top comes down.
const table: Template = () => {
  const t = kit()
  t.b(-84, 0, 30, 112, 'wood')
  t.b(84, 0, 30, 112, 'wood')
  t.b(0, 0, 72, 24, 'wood')
  t.j(0, 24)
  const top = t.b(0, 112, 222, 26, 'wood')
  t.j(0, top)
  return t.spec
}

// A top-heavy T that tips whichever way it is hit.
const wobble: Template = () => {
  const t = kit()
  let y = t.b(0, 0, 64, 64, 'wood')
  y = t.b(0, y, 248, 24, 'wood')
  t.j(-94, y)
  t.j(94, y)
  y = t.b(0, y, 54, 72, 'wood')
  y = t.b(0, y, 190, 24, 'wood')
  t.j(0, y)
  return t.spec
}

// Ice legs under a stone roof: break a leg and the roof lands on everyone.
const iceHouse: Template = () => {
  const t = kit()
  for (const x of [-112, 0, 112]) t.b(x, 0, 28, 120, 'ice')
  t.b(-56, 0, 60, 22, 'wood')
  t.j(-56, 22)
  t.b(56, 0, 60, 22, 'wood')
  t.j(56, 22)
  const roof = t.b(0, 120, 276, 30, 'stone')
  const cube = t.b(0, roof, 56, 56, 'ice')
  t.j(0, cube)
  return t.spec
}

// Two piers and a long bridge, with someone hiding underneath.
const bridge: Template = (r) => {
  const t = kit()
  for (const side of [-1, 1]) {
    const x = side * 118
    let y = t.b(x, 0, 62, 62, 'stone')
    y = t.b(x, y, 62, 62, 'wood')
    t.b(x, y, 62, 62, r() < 0.5 ? 'ice' : 'wood')
  }
  const deck = t.b(0, 186, 326, 24, 'wood')
  t.j(-118, deck)
  t.j(118, deck)
  t.j(0, deck)
  t.b(0, 0, 72, 24, 'wood')
  t.j(0, 24)
  return t.spec
}

const pyramid: Template = () => {
  const t = kit()
  for (const x of [-96, -32, 32, 96]) t.b(x, 0, 62, 62, 'wood')
  for (const x of [-64, 0, 64]) t.b(x, 62, 62, 62, 'ice')
  t.b(0, 124, 62, 62, 'wood')
  t.j(-64, 124)
  t.j(64, 124)
  t.j(0, 186)
  return t.spec
}

// A stone wall in front: lob over it, or bring the heavy one.
const fort: Template = () => {
  const t = kit()
  let y = t.b(-150, 0, 58, 72, 'stone')
  y = t.b(-150, y, 58, 72, 'stone')
  t.j(-150, y)
  t.b(-44, 0, 28, 100, 'wood')
  t.b(104, 0, 28, 100, 'wood')
  t.b(30, 0, 66, 24, 'wood')
  t.j(30, 24)
  const top = t.b(30, 100, 206, 26, 'wood')
  const cube = t.b(30, top, 56, 56, 'ice')
  t.j(30, cube)
  return t.spec
}

// A thin three-storey ice tower with someone on every floor.
const tall: Template = (r) => {
  const t = kit()
  let y = 0
  for (let s = 0; s < 3; s++) {
    const mat: Material = s === 0 ? 'wood' : r() < 0.7 ? 'ice' : 'wood'
    t.b(-50, y, 26, 90, mat)
    t.b(50, y, 26, 90, mat)
    if (s === 0) {
      t.b(0, 0, 56, 20, 'wood')
      t.j(0, 20)
    } else {
      t.j(0, y)
    }
    y = t.b(0, y + 90, 144, 22, 'wood')
  }
  t.j(0, y)
  return t.spec
}

// Two storeys with a stone lid.
const doubleTable: Template = (r) => {
  const t = kit()
  t.b(-90, 0, 30, 112, 'wood')
  t.b(90, 0, 30, 112, 'wood')
  t.b(0, 0, 72, 24, 'wood')
  t.j(0, 24)
  let y = t.b(0, 112, 236, 26, 'wood')
  const mat: Material = r() < 0.5 ? 'ice' : 'wood'
  t.b(-66, y, 28, 96, mat)
  t.b(66, y, 28, 96, mat)
  t.j(0, y)
  y = t.b(0, y + 96, 190, 28, 'stone')
  t.j(0, y)
  return t.spec
}

const ORDER: Template[] = [table, wobble, iceHouse, bridge, pyramid, fort, tall, doubleTable]

export function towerFor(level: number, rand: Rand): TowerSpec {
  const template = level < ORDER.length ? ORDER[level]! : ORDER[1 + Math.floor(rand() * (ORDER.length - 1))]!
  const spec = template(rand)
  for (const b of spec.blocks) {
    b.x *= S
    b.y *= S
    b.w = Math.round(b.w * S)
    b.h = Math.round(b.h * S)
  }
  for (const j of spec.jellies) {
    j.x *= S
    j.y *= S
  }
  // Past the scripted run, half the towers are mirrored so they fall the other way.
  if (level >= ORDER.length && rand() < 0.5) {
    for (const b of spec.blocks) b.x = -b.x
    for (const j of spec.jellies) j.x = -j.x
  }
  return spec
}

// Which creatures wait at the slingshot for a tower. The first in the list is
// the newest, so a new kind is always the first thing flung.
export function ammoFor(level: number, rand: Rand): ShotKind[] {
  if (level === 0) return ['basic']
  if (level === 1) return ['split', 'basic']
  if (level === 2) return ['bomb', 'basic', 'split']
  if (level === 3) return ['heavy', 'split', 'bomb', 'basic']
  const all: ShotKind[] = ['basic', 'split', 'bomb', 'heavy']
  for (let i = all.length - 1; i > 0; i--) {
    const k = Math.floor(rand() * (i + 1))
    const tmp = all[i]!
    all[i] = all[k]!
    all[k] = tmp
  }
  return all
}
