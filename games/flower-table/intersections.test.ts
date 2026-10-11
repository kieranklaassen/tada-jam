import { describe, expect, it } from 'vitest'
import { Garden, potBox, type Actor, type Target } from './garden'
import { CAT, HIVE, HOME, HOME_CONTROL, PATH, PATH_CLEAR, PATH_HOLDS, ROBIN, SILL, TABLE, VASE, VISITOR, WAITING, WALL } from './layout'
import { EARTH, SLOTS, UPRIGHT_REACH, clearOfBed, isUpright } from './place'
import { BED, PLANTS, SOIL_Y, fullOf } from './plants'
import { makeRng } from './rng'
import { deserialize, type OnPath, type Saved } from './save'
import { STAGE, fit, toStage } from './stage'
import { useCanvases } from './paint'
import { recordingCanvas } from './recording'
import { View } from './view'

// The overlap test of a game drawn on a 2D canvas, where no audit can look for
// one body inside another: what answers a finger is asked of the model, point
// by point, through the same fit a touch goes through, at the two sizes the
// sheet names. It holds the sheet's "Nothing the game sets down covers a
// target" and the placing rule in place.ts.

const SURFACES = [{ width: 1180, height: 820 }, { width: 820, height: 1180 }] as const
type Surface = (typeof SURFACES)[number]
type Box = { left: number; right: number; top: number; bottom: number }

/** What answers a finger at each point of a grid over `box` (stage units), asked in the surface's own pixels, `step` pixels apart. */
function answers(garden: Garden, surface: Surface, box: Box, step: number): { x: number; y: number; target: Target }[] {
  const by = fit(surface.width, surface.height)
  const found: { x: number; y: number; target: Target }[] = []
  for (let py = box.top * by.scale + by.y; py <= box.bottom * by.scale + by.y; py += step) {
    for (let px = box.left * by.scale + by.x; px <= box.right * by.scale + by.x; px += step) {
      const at = toStage({ x: px, y: py }, by)
      found.push({ ...at, target: garden.targetAt(at.x, at.y) })
    }
  }
  return found
}

const top = (stem: number, len: number) => ({ stem, base: fullOf(stem) - len, len, head: true, spent: false })
const open = (more: Partial<Saved> = {}, seed = 1): Garden => new Garden({ ...deserialize(null, null), ...more }, seed)
const settle = (garden: Garden, seconds = 4): void => { for (let t = 0; t < seconds; t += 0.05) garden.step(0.05) }

/** A thistle stuck upright in every place between two stems that can hold one, and the rest of the path full of pieces lying flat. */
function crowdedPath(): OnPath[] {
  const upright = SLOTS.map((x, index) => ({ ...top(6 + (index % 2), 200), x, y: EARTH.top + (index % 3) * 4, rot: index % 2 ? 0.02 : -0.02 }))
  const flat = Array.from({ length: PATH_HOLDS - upright.length }, (_, index) => ({ ...top(index % 2, 140), x: 60 + index * 180, y: 772 + (index % 2) * 11, rot: 1.57 }))
  return [...upright, ...flat]
}
/** The garden with the most in it: the tallest heads in the vase, the path full, every stem at its full height. */
const crowded = (position: string, more: Partial<Saved> = {}): Garden => {
  const garden = open({ position, path: crowdedPath(), vase: [0, 1, 0, 1, 4, 5, 8].map((stem, index) => ({ ...top(stem, fullOf(stem) - 20), at: index % 2 ? 9 : -9 })), ...more })
  settle(garden, 1)
  return garden
}

describe('the placing rule', () => {
  it('has a place for an upright thistle only between two stems that leave each a finger of room', () => {
    expect(SLOTS.length).toBeGreaterThan(0)
    for (const slot of SLOTS) {
      const gaps = BED.map((spot) => Math.abs(spot.x - slot))
      // Each neighbour keeps the half of the gap that is not the thistle's.
      expect(Math.min(...gaps) - UPRIGHT_REACH).toBeGreaterThanOrEqual(10)
    }
    expect(crowdedPath()).toHaveLength(PATH_HOLDS)
  })

  it('lets every stem be touched in the garden with the most in it, at both sizes', () => {
    for (const surface of SURFACES) {
      const scale = fit(surface.width, surface.height).scale
      for (const position of ['goat-boot', 'bride-vase']) {
        const garden = crowded(position)
        expect(garden.path).toHaveLength(PATH_HOLDS)
        for (const stem of garden.stems) {
          // Along the stalk, between two thistles where it has them; and at the flower, which only the shortest plants have that low.
          for (const up of [60, stem.full - 20]) {
            const least = up < 210 ? 20 : 34
            const row = answers(garden, surface, { left: stem.x - 70, right: stem.x + 70, top: SOIL_Y - up, bottom: SOIL_Y - up }, 1)
            const mine = row.filter((each) => each.target.on === 'stem' && each.target.stem === stem)
            expect(mine.length / scale, `stem ${stem.index} at ${up}, ${surface.width} wide`).toBeGreaterThanOrEqual(least)
            // Its own stalk is always its own.
            expect(garden.targetAt(stem.x, SOIL_Y - up)).toMatchObject({ on: 'stem', stem })
          }
        }
      }
    }
  })

  it('gives each stem of an empty path a zone at least 34 wide the whole way up', () => {
    const garden = open()
    for (const stem of garden.stems) {
      for (const up of [10, 60, stem.full / 2, stem.full - 10]) {
        const row = answers(garden, SURFACES[0], { left: stem.x - 70, right: stem.x + 70, top: SOIL_Y - up, bottom: SOIL_Y - up }, 1)
        expect(row.filter((each) => each.target.on === 'stem' && each.target.stem === stem).length, `stem ${stem.index} at ${up}`).toBeGreaterThanOrEqual(34)
      }
    }
  })

  it('takes a piece on the path only on the path, and an upright thistle only by its own stalk', () => {
    for (const surface of SURFACES) {
      const garden = crowded('goat-boot')
      const above = answers(garden, surface, { left: 0, right: STAGE.width, top: 0, bottom: PATH_CLEAR - 1 }, 6)
      for (const each of above) {
        if (each.target.on !== 'onPath') continue
        const piece = each.target.piece
        expect(isUpright(piece.rot)).toBe(true)
        expect(Math.abs(each.x - piece.x)).toBeLessThanOrEqual(UPRIGHT_REACH + 1e-6)
      }
      // Every piece can be picked up from the path itself.
      for (const piece of garden.path) {
        const x = isUpright(piece.rot) ? piece.x : piece.x + Math.sin(piece.rot) * piece.len * 0.5
        const y = isUpright(piece.rot) ? piece.y - 40 : piece.y
        expect(garden.targetAt(x, y)).toMatchObject({ on: 'onPath', piece })
      }
    }
  })
})

describe('what the game sets down', () => {
  /** Flat, inside the band of the path, inside the frame, with its flower below the earth of the bed. */
  const liesClear = (garden: Garden, label: string): void => {
    for (const piece of garden.path) {
      expect(isUpright(piece.rot), label).toBe(false)
      const end = piece.x + Math.sin(piece.rot) * piece.len
      expect(Math.min(piece.x, end), label).toBeGreaterThanOrEqual(PATH.left - 0.5)
      expect(Math.max(piece.x, end), label).toBeLessThanOrEqual(PATH.right + 0.5)
      expect(piece.y, label).toBeLessThanOrEqual(PATH.bottom)
      expect(piece.y - Math.abs(Math.cos(piece.rot)) * piece.len, label).toBeGreaterThanOrEqual(PATH_CLEAR)
      expect(clearOfBed(piece.kind, piece.scale, piece.head, piece.y), label).toBe(true)
    }
  }
  const nothingAbove = (garden: Garden, label: string): void => {
    for (const surface of SURFACES) {
      for (const each of answers(garden, surface, { left: 0, right: STAGE.width, top: 0, bottom: PATH_CLEAR - 1 }, 8)) expect(each.target.on, label).not.toBe('onPath')
    }
  }

  it('lays a piece that springs off a full vase flat on the path, a thistle too', () => {
    const garden = open({ vase: [0, 1, 2, 3, 4, 5, 8].map((stem) => ({ ...top(stem, 120), at: 0 })) })
    for (const stem of [6, 7]) {
      garden.press(BED[stem].x, SOIL_Y - 60)
      garden.move(VASE.boot.x, VASE.boot.mouthY - 60)
      garden.lift(VASE.boot.x, VASE.boot.mouthY - 60)
      settle(garden)
    }
    expect(garden.path).toHaveLength(2)
    liesClear(garden, 'sprung off')
    nothingAbove(garden, 'sprung off')
  })

  it('lays everything a vase spills flat on the path, clear of the table and the visitor', () => {
    const garden = open({ position: 'bride-vase', vase: [{ ...top(6, 280), at: 8 }, { ...top(0, 340), at: 8 }] })
    garden.press(BED[7].x, SOIL_Y - 30)
    garden.move(VASE.vase.x + 16, VASE.vase.mouthY - 60)
    garden.lift(VASE.vase.x + 16, VASE.vase.mouthY - 60)
    expect(garden.playing).toBe(true)
    settle(garden, 6)
    expect(garden.inPot).toHaveLength(0)
    expect(garden.path).toHaveLength(3)
    liesClear(garden, 'spilled')
    nothingAbove(garden, 'spilled')
    // The vase and the visitor answer over their whole shapes again.
    for (const each of answers(garden, SURFACES[0], potBox(garden.vaseDef), 6)) expect(each.target.on).toBe('pot')
  })

  it('lays what a visitor lets fall, and a piece saved from the hand, flat on the path', () => {
    for (const stem of [0, 6, 10]) {
      const garden = open({}, stem + 1)
      garden.press(BED[stem].x, SOIL_Y - 60)
      garden.move(VISITOR.x, VISITOR.y)
      garden.lift(VISITOR.x, VISITOR.y)
      settle(garden, 6)
      expect(garden.path).toHaveLength(1)
      liesClear(garden, `let fall by the visitor, stem ${stem}`)

      const held = open({}, stem + 1)
      held.press(BED[stem].x, SOIL_Y - 60)
      held.move(500, 300)
      const again = new Garden(deserialize(JSON.parse(JSON.stringify(held.toSave())), null), 9)
      expect(again.path).toHaveLength(1)
      liesClear(again, `saved from the hand, stem ${stem}`)
    }
  })

  it('never covers the bed, the vase or a visitor through any play, whatever the child does', () => {
    for (const seed of [11, 12, 13]) {
      const chance = makeRng(seed)
      const garden = open({ position: seed === 12 ? 'bride-jar' : 'goat-boot' }, seed)
      const somewhere = (): [number, number] => [20 + chance.next() * 1140, 150 + chance.next() * 650]
      for (let turn = 0; turn < 300; turn++) {
        const act = chance.next()
        if (act < 0.3) garden.press(...somewhere())
        else if (act < 0.55) garden.move(...somewhere())
        else if (act < 0.85) garden.lift(...somewhere())
        else garden.step(chance.next() * 0.6)
        for (const piece of garden.path) {
          if (isUpright(piece.rot)) {
            // Only a thistle, only in a place between two stems, one to a place.
            expect(piece.kind).toBe('thistle')
            expect(SLOTS).toContain(piece.x)
            expect(garden.path.filter((other) => isUpright(other.rot) && other.x === piece.x)).toHaveLength(1)
          } else {
            expect(piece.y - Math.abs(Math.cos(piece.rot)) * piece.len).toBeGreaterThanOrEqual(PATH_CLEAR)
            expect(piece.y).toBeLessThanOrEqual(PATH.bottom)
          }
        }
      }
      garden.lift(600, 760)
      settle(garden, 12)
      for (const stem of garden.stems) expect(garden.targetAt(stem.x, SOIL_Y - 20)).toMatchObject({ on: 'stem', stem })
    }
  })
})

describe('the vase, the visitors and the creatures', () => {
  it('keeps the whole of the vase for the vase, whatever stands in it or lies about', () => {
    for (const surface of SURFACES) {
      for (const position of ['goat-boot', 'beekeeper-jar', 'bride-vase']) {
        const garden = crowded(position)
        const box = potBox(garden.vaseDef)
        for (const each of answers(garden, surface, box, 4)) expect(each.target.on, position).toBe('pot')
        // Wide enough for a finger at both sizes.
        expect((box.right - box.left) * fit(surface.width, surface.height).scale).toBeGreaterThanOrEqual(40)
        expect(box.bottom - box.top).toBeGreaterThanOrEqual(48)
      }
    }
  })

  it('leaves the visitor at the table a finger can reach beside the fullest bouquet, and the whole of it when the vase is bare', () => {
    for (const surface of SURFACES) {
      const scale = fit(surface.width, surface.height).scale
      const oval: Box = { left: VISITOR.x - VISITOR.rx, right: VISITOR.x + VISITOR.rx, top: VISITOR.y - VISITOR.ry, bottom: VISITOR.y + VISITOR.ry }
      for (const position of ['goat-boot', 'beekeeper-jar', 'bride-vase']) {
        // The vase stands in front of the visitor's near side: where the two meet, the finger is on the vase.
        const box = potBox(VASE[position.split('-')[1] as keyof typeof VASE])
        const inOval = (each: { x: number; y: number }): boolean => ((each.x - VISITOR.x) / VISITOR.rx) ** 2 + ((each.y - VISITOR.y) / VISITOR.ry) ** 2 <= 1 && !(each.x <= box.right + 0.5 && each.y >= box.top - 0.5)
        const full = answers(crowded(position), surface, oval, 4).filter(inOval)
        // Nothing but the visitor and the heads that lean over from the vase answers there.
        for (const each of full) expect(['visitor', 'inVase'], position).toContain(each.target.on)
        const free = full.filter((each) => each.target.on === 'visitor').length * 16
        expect(free, `${position}, ${surface.width} wide`).toBeGreaterThanOrEqual(96 * 96)
        // In the boot seven of the tallest stand straight up in front of it, and half of it is still free.
        expect(free / full.length / 16, position).toBeGreaterThanOrEqual(0.5)
        for (const each of answers(crowded(position, { vase: [] }), surface, oval, 4).filter(inOval)) expect(each.target.on).toBe('visitor')
      }
      // The oval itself is a finger wide many times over.
      expect(VISITOR.rx * 2 * scale).toBeGreaterThanOrEqual(96)
    }
  })

  it('stands the one who waits in the gateway clear of the bed, the path, the table and the visitor at the table', () => {
    expect(WAITING.left).toBeGreaterThan(TABLE.right)
    expect(WAITING.left).toBeGreaterThan(VISITOR.x + VISITOR.rx)
    expect(WAITING.bottom).toBeLessThan(PATH_CLEAR)
    expect(WAITING.left).toBeGreaterThan(BED[BED.length - 1].x + PLANTS.sunflower.headR)
    for (const surface of SURFACES) {
      for (const finished of [true, false]) {
        const garden = crowded('goat-boot', finished ? { finished: true, vase: [] } : {})
        // A hair inside its edges, since a touch comes back through the fit as a fraction.
        for (const each of answers(garden, surface, { left: WAITING.left + 1, right: WAITING.right - 1, top: WAITING.top + 1, bottom: WAITING.bottom - 1 }, 4)) expect(each.target.on).toBe('gate')
      }
    }
  })

  it('paints one that leaves, and the vase and arms it carries, behind the one who waits in the gateway, the whole way out', () => {
    // Asked of the real view: the order in which it paints the two visitors and what the leaving one carries.
    useCanvases(() => recordingCanvas(null))
    const view = new View(recordingCanvas(null, 2360, 1640))
    view.resize(1180, 820, 2)
    const order: string[] = []
    const painter = view as unknown as Record<string, (...given: unknown[]) => unknown>
    for (const part of ['visitor', 'waiting', 'pot', 'arms']) {
      const paint = painter[part]!.bind(view)
      painter[part] = (...given: unknown[]) => {
        const actor = given.find((each): each is Actor => typeof each === 'object' && each !== null && 'who' in each && 'where' in each)
        order.push(part === 'pot' ? 'pot' : `${part}:${actor!.who}`)
        return paint(...given)
      }
    }
    for (const position of ['goat-boot', 'beekeeper-jar', 'bride-vase', 'aunt-boot']) {
      const garden = open({ position, vase: [{ ...top(1, 120), at: 0 }, { ...top(4, 110), at: 4 }] })
      settle(garden, 1)
      const leaver = garden.turn.visitor, waits = garden.next.visitor
      // At rest the one in the gateway is the farther, and is painted first.
      order.length = 0
      view.draw(garden, null)
      expect(order.indexOf(`visitor:${waits}`), position).toBeLessThan(order.indexOf(`visitor:${leaver}`))
      garden.press(VISITOR.x + 30, VISITOR.y + 60)
      expect(garden.playing, position).toBe(true)
      let leaving = 0, inGateway = 0
      for (let frames = 0; garden.playing && frames < 600; frames++) {
        garden.step(0.05)
        const actor = garden.actors[leaver]
        if (actor.act?.name !== 'leave') continue
        leaving++
        if (actor.x > WAITING.left) inGateway++
        order.length = 0
        view.draw(garden, null)
        const gate = order.indexOf(`visitor:${waits}`)
        expect(gate, position).toBeGreaterThan(-1)
        expect(order.indexOf(`visitor:${leaver}`), position).toBeLessThan(gate)
        expect(order.indexOf(`arms:${leaver}`), position).toBeLessThan(gate)
        if (garden.pot.on) expect(order.indexOf('pot'), position).toBeLessThan(gate)
        expect(order.indexOf(`waiting:${waits}`), position).toBeGreaterThan(gate)
      }
      // The walk was seen, and it did reach the gateway where the other stands.
      expect(leaving, position).toBeGreaterThan(5)
      expect(inGateway, position).toBeGreaterThan(0)
    }
  })

  it('sits the cat and the robin clear of every stem and every piece', () => {
    for (const surface of SURFACES) {
      const garden = crowded('goat-boot')
      for (const each of answers(garden, surface, { left: CAT.x - CAT.rx, right: CAT.x + CAT.rx, top: CAT.y - CAT.ry, bottom: CAT.y + CAT.ry }, 3)) {
        if (((each.x - CAT.x) / CAT.rx) ** 2 + ((each.y - CAT.y) / CAT.ry) ** 2 <= 1) expect(each.target.on).toBe('cat')
      }
      for (const each of answers(garden, surface, { left: ROBIN.x - ROBIN.r, right: ROBIN.x + ROBIN.r, top: ROBIN.y - ROBIN.r, bottom: ROBIN.y + ROBIN.r }, 2)) {
        if (Math.hypot(each.x - ROBIN.x, each.y - ROBIN.y) <= ROBIN.r) expect(each.target.on).toBe('robin')
      }
    }
  })

  it('stands the visitors and the bouquets out in the street beside one another, above the wall and between its ends', () => {
    const places = [...Object.values(HOME).map((at) => at.x), HIVE.x, SILL.x].sort((a, b) => a - b)
    for (let i = 1; i < places.length; i++) expect(places[i] - places[i - 1]).toBeGreaterThanOrEqual(70)
    expect(places[0] - 50).toBeGreaterThanOrEqual(WALL.left)
    expect(places[places.length - 1] + 50).toBeLessThanOrEqual(WALL.right)
    for (const at of Object.values(HOME)) expect(at.y).toBeLessThan(WALL.top - 30)
    expect(HIVE.top).toBeLessThan(WALL.top)
    expect(SILL.top).toBeLessThan(WALL.top)
    // The street ends where the gateway begins, so nobody in it stands behind the one who waits there.
    expect(WALL.right).toBeLessThan(WAITING.left)
  })
})

describe('the corners that are not the game\'s', () => {
  it('puts nothing a child must touch under the home control or in the grown-up corner, at both sizes', () => {
    for (const surface of SURFACES) {
      const by = fit(surface.width, surface.height)
      // The home control, with a finger's slop about it; and the top right 72 by 72.
      const slop = 8
      const control = { left: surface.width / 2 - HOME_CONTROL.size / 2 - slop, right: surface.width / 2 + HOME_CONTROL.size / 2 + slop, top: 0, bottom: HOME_CONTROL.fromTop + HOME_CONTROL.size + slop }
      const corner = { left: surface.width - 72, right: surface.width, top: 0, bottom: 72 }
      for (const garden of [open(), crowded('goat-boot'), crowded('bride-vase'), crowded('aunt-jar', { finished: true, vase: [] })]) {
        for (const area of [control, corner]) {
          for (let py = area.top; py <= area.bottom; py += 4) {
            for (let px = area.left; px <= area.right; px += 4) {
              const at = toStage({ x: px, y: py }, by)
              expect(garden.targetAt(at.x, at.y).on, `${surface.width} wide at ${px}, ${py}`).toBe('air')
            }
          }
        }
      }
    }
  })
})
