import { describe, expect, it } from 'vitest'
import {
  CLAY, CLAY_SLICK, CLAY_WET, COLS, EARTH, HOT, MOSS, MOSS_FULL, MOSS_GROWN, OPEN, ROCK, ROCK_WET, ROOT, ROWS, SEED, SPROUT, STEAM, TIP_LEFT, TIP_RIGHT, WATER, boxCells, inBox, isClay, isHot, isLoose, isMoss,
  isRock, isRoot, isSand, isWet, sand,
} from './cells'
import { CLOUD_BOTTOM, CLOUD_FROM, FLOATS_FROM, Ground, PLENTY_BATHS, RUB_RADIUS, SWELL, WATER_FROM } from './ground'
import { layHill } from './hills'

// The hill's own rules, one ground at a time, on small stages cut out of a
// laid hill: what the finger does to each ground, what water does on it, and
// what happens when it is dug out from under.

const on = (id: string, variant = 0): Ground => { const hill = layHill(id, variant); return new Ground(hill.layout, hill.cells) }
const steps = (ground: Ground, count: number): void => { for (let i = 0; i < count; i++) ground.step() }
const count = (ground: Ground, fits: (code: number) => boolean): number => ground.cells.reduce((sum, code) => sum + (fits(code) ? 1 : 0), 0)
/** A patch of sand deep in the left of the dune, far from rooms: columns 60 to 100, rows 60 to 85. */
const AT = { col: 80, row: 72 }
/** Lays a block of one ground into the hill. */
const lay = (ground: Ground, col0: number, row0: number, col1: number, row1: number, code: number): void => { for (let row = row0; row <= row1; row++) for (let col = col0; col <= col1; col++) ground.put(row * COLS + col, code) }

describe('sand', () => {
  it('a rub takes a round tunnel out of it and loosens a rim, and packed sand keeps its arch over the tunnel', () => {
    const ground = on('dune')
    const dug = ground.rub(AT.col, AT.row, AT.col + 12, AT.row)
    expect(dug.dry.reduce((sum, n) => sum + n, 0)).toBeGreaterThan(80)
    expect(dug.loosened).toBeGreaterThan(20)
    expect(ground.at(AT.col + 6, AT.row)).toBe(OPEN)
    steps(ground, 120)
    // The roof above the rim is packed and has not come down; the loose rim has slid to the tunnel's floor.
    expect(isSand(ground.at(AT.col + 6, AT.row - Math.ceil(RUB_RADIUS) - 3))).toBe(true)
    expect(isLoose(ground.at(AT.col + 6, AT.row - Math.ceil(RUB_RADIUS) - 3))).toBe(false)
    expect(ground.at(AT.col + 6, AT.row - 2)).toBe(OPEN)
    expect(count(ground, isLoose)).toBeGreaterThan(0)
  })

  it('water falls down a shaft, darkens the sand it comes to rest on, and lies at the bottom', () => {
    const ground = on('dune')
    ground.rub(AT.col, AT.row - 12, AT.col, AT.row)
    steps(ground, 60)
    const before = ground.water
    lay(ground, AT.col - 2, AT.row - 14, AT.col + 2, AT.row - 13, WATER)
    steps(ground, 200)
    expect(count(ground, isWet)).toBeGreaterThan(count(on('dune'), isWet) + 10)
    expect(ground.water).toBeLessThanOrEqual(before + 10)
    expect(ground.water).toBeGreaterThan(before)
    // It lies at the bottom of the shaft.
    let lowest = 0
    for (let row = 0; row < ROWS; row++) for (let col = AT.col - 8; col <= AT.col + 8; col++) if (ground.at(col, row) === WATER && row > 40) lowest = Math.max(lowest, row)
    // The loosened rim has slid down the shaft too: the water lies on it, near the bottom.
    expect(lowest).toBeGreaterThanOrEqual(AT.row - 4)
  })
})

describe('clay', () => {
  const shelf = (): Ground => { const ground = on('dune'); lay(ground, AT.col - 10, AT.row, AT.col + 10, AT.row + 3, CLAY); return ground }

  it('holds a pool for as long as you like, and shines where the water lies', () => {
    const ground = shelf()
    lay(ground, AT.col - 6, AT.row - 4, AT.col + 6, AT.row - 1, OPEN)
    lay(ground, AT.col - 6, AT.row - 1, AT.col + 6, AT.row - 1, WATER)
    const before = ground.water
    steps(ground, 600)
    expect(ground.water).toBeGreaterThanOrEqual(before - 2)
    expect(ground.at(AT.col, AT.row)).toBe(CLAY_WET)
    expect(ground.at(AT.col, AT.row - 1)).toBe(WATER)
  })

  it('peels only in a narrow groove, takes a thumbprint, and wet clay under a rub is polished to a chute', () => {
    const ground = shelf()
    const dug = ground.rub(AT.col - 4, AT.row + 1.5, AT.col + 4, AT.row + 1.5)
    expect(dug.clay).toBeGreaterThan(0)
    expect(dug.clay).toBeLessThan(40)
    expect(isClay(ground.at(AT.col, AT.row + 3))).toBe(true)
    const dented = shelf()
    expect(dented.dent(AT.col + 0.5, AT.row + 0.5)).toBeGreaterThan(0)
    expect(dented.at(AT.col, AT.row)).toBe(OPEN)
    const wet = shelf()
    lay(wet, AT.col - 10, AT.row, AT.col + 10, AT.row, CLAY_WET)
    // On wet clay the finger skids: it polishes and peels nothing, however hard it rubs into the shelf.
    const clay = count(wet, isClay)
    const skid = wet.rub(AT.col - 4, AT.row - 1.6, AT.col + 4, AT.row - 1.6)
    expect(skid.slick).toBeGreaterThan(0)
    expect(count(wet, (code) => code === CLAY_SLICK)).toBeGreaterThan(0)
    expect(wet.rub(AT.col - 4, AT.row + 0.5, AT.col + 4, AT.row + 0.5).clay).toBe(0)
    expect(count(wet, isClay)).toBe(clay)
  })

  it('stays as a shelf when the sand is dug out from under it, and says so once the sand under it goes', () => {
    const ground = shelf()
    const dug = ground.rub(AT.col - 6, AT.row + 8.5, AT.col + 6, AT.row + 8.5)
    expect(dug.shelf).toBeGreaterThan(0)
    steps(ground, 200)
    for (let col = AT.col - 10; col <= AT.col + 10; col++) expect(ground.at(col, AT.row + 3)).toBe(CLAY)
    expect(ground.at(AT.col, AT.row + 5)).toBe(OPEN)
  })
})

describe('rock', () => {
  it('is not dug, glistens when wet, and drops whole when it is dug out from under, with one thud where it lands', () => {
    const ground = on('dune')
    lay(ground, AT.col - 3, AT.row, AT.col + 3, AT.row + 2, ROCK)
    const scraped = ground.rub(AT.col - 3, AT.row + 1.5, AT.col + 3, AT.row + 1.5)
    expect(scraped.rock).toBeGreaterThan(0)
    expect(count(ground, isRock)).toBe(21)
    lay(ground, AT.col - 1, AT.row - 2, AT.col + 1, AT.row - 2, OPEN)
    lay(ground, AT.col - 1, AT.row - 1, AT.col + 1, AT.row - 1, WATER)
    steps(ground, 30)
    expect(count(ground, (code) => code === ROCK_WET)).toBeGreaterThan(0)
    ground.rub(AT.col - 8, AT.row + 8, AT.col + 8, AT.row + 8)
    let thuds = 0, landed = -1
    for (let i = 0; i < 240; i++) { const moved = ground.step(); if (moved.thud) { thuds++; landed = moved.thud.row; expect(moved.thud.hot).toBe(false); expect(moved.thud.cells).toBe(21) } }
    expect(thuds).toBe(1)
    expect(landed).toBeGreaterThan(AT.row + 5)
    expect(count(ground, isRock)).toBe(21)
    expect(isRock(ground.at(AT.col, AT.row))).toBe(false)
  })
})

describe('moss', () => {
  it('drinks the water that touches it, swells into the open space it came from by no more than its reach, and closes the tunnel', () => {
    const ground = on('dune')
    lay(ground, AT.col - 14, AT.row - 3, AT.col + 6, AT.row + 3, OPEN)
    lay(ground, AT.col + 7, AT.row - 3, AT.col + 8, AT.row + 3, MOSS)
    lay(ground, AT.col + 4, AT.row + 3, AT.col + 6, AT.row + 3, WATER)
    let drunk = 0
    for (let i = 0; i < 200; i++) drunk += ground.step().drunk
    expect(drunk).toBeGreaterThan(0)
    const grown = count(ground, (code) => code === MOSS_GROWN)
    expect(grown).toBeGreaterThan(0)
    expect(grown).toBeLessThanOrEqual(SWELL * 7)
    expect(ground.at(AT.col + 6, AT.row + 3)).toBe(MOSS_GROWN)
  })

  it('squeezed, swollen moss gives water back and shrinks away; torn dry, it is gone', () => {
    const ground = on('dune')
    lay(ground, AT.col - 4, AT.row - 2, AT.col + 4, AT.row + 2, MOSS_GROWN)
    const before = ground.water
    const dug = ground.rub(AT.col, AT.row, AT.col, AT.row)
    expect(dug.squeezed).toBeGreaterThan(0)
    expect(ground.water).toBeGreaterThan(before)
    const dry = on('dune')
    lay(dry, AT.col - 4, AT.row - 2, AT.col + 4, AT.row + 2, MOSS)
    const torn = dry.rub(AT.col + 0.5, AT.row + 0.5, AT.col + 0.5, AT.row + 0.5).moss
    expect(torn).toBeGreaterThan(30)
    expect(count(dry, isMoss)).toBe(45 - torn)
  })

  it('hangs over a gap as a beard and drips: each drop leaves that cell of moss dry again', () => {
    const ground = on('dune')
    lay(ground, AT.col - 3, AT.row, AT.col + 3, AT.row, MOSS_FULL)
    lay(ground, AT.col - 3, AT.row + 1, AT.col + 3, AT.row + 6, OPEN)
    let dripped = 0
    for (let i = 0; i < 400; i++) dripped += ground.step().dripped
    expect(dripped).toBe(7)
    expect(count(ground, (code) => code === MOSS_FULL)).toBe(0)
    expect(count(ground, (code) => code === MOSS)).toBe(7)
  })

  it('never swells into a room where a resident and its things stand', () => {
    for (let variant = 0; variant < 3; variant++) {
      const ground = on('fen', variant), { kept, wormRoom } = ground.layout
      // Water let into the top of the worm's room, under the moss in its roof.
      for (let col = wormRoom.col0 + 2; col <= wormRoom.col1 - 2; col++) for (let row = wormRoom.row0 + 2; row <= wormRoom.row0 + 4; row++) if (ground.at(col, row) === OPEN) ground.put(row * COLS + col, WATER)
      steps(ground, 300)
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) if (ground.at(col, row) === MOSS_GROWN) expect(kept.some((box) => inBox(box, col, row)), `layout ${variant}: moss at ${col},${row}`).toBe(false)
    }
  })
})

describe('the hot stone', () => {
  it('turns the water that lands on it to steam; a wisp of it rises, drifts with the wind and rains at the near end of the drying ground, where the sand soaks it up', () => {
    // One layout for each way the wind blows.
    for (let variant = 0; variant < 2; variant++) {
      const ground = on('hot-spring', variant), { rain, wind, drying } = ground.layout
      const stone = ground.layout.spots.hot!, near = wind > 0 ? rain.col0 : rain.col1
      expect(isHot(ground.at(stone.col, stone.row + 2))).toBe(true)
      const before = ground.water
      lay(ground, stone.col - 1, stone.row - 3, stone.col + 1, stone.row - 3, WATER)
      let steamed = 0, rained = 0, highest = ROWS
      const fell: number[] = []
      for (let i = 0; i < 500; i++) {
        const moved = ground.step()
        steamed += moved.steamed; rained += moved.rained
        if (moved.rainAt >= 0) fell.push(moved.rainAt % COLS)
        if (i % 5 === 0) for (let row = 0; row <= CLOUD_BOTTOM; row++) for (let col = 0; col < COLS; col++) if (ground.at(col, row) === STEAM) highest = Math.min(highest, row)
      }
      expect(steamed).toBe(3)
      expect(highest).toBeLessThanOrEqual(CLOUD_BOTTOM)
      // The cloud is gone: every cell of steam came down as a drop, over the near end of the drying ground and nowhere along the line.
      expect(rained).toBe(3)
      expect(count(ground, (code) => code === STEAM)).toBe(0)
      for (const col of fell) expect(Math.abs(col - near), `layout ${variant}: a drop at ${col}`).toBeLessThanOrEqual(2)
      // The sand drank it: no water stands there, and the ground is dark where it fell.
      expect(ground.water).toBe(before)
      expect(isWet(ground.at(fell[0], drying.row))).toBe(true)
    }
  })

  it('a cloud carries on along the line and rains a drop here and a drop there; rain on anything but sand lands as water', () => {
    for (let variant = 0; variant < 2; variant++) {
      const ground = on('dune', variant), { rain, wind } = ground.layout
      const from = wind > 0 ? rain.col0 - 14 : rain.col1 + 5
      lay(ground, from, 3, from + 9, 5, STEAM)
      expect(count(ground, (code) => code === STEAM)).toBeGreaterThanOrEqual(CLOUD_FROM)
      // A tin tray under the far half of the line: what falls on it is water in the hill again.
      const tray = wind > 0 ? rain.col1 - 20 : rain.col0
      lay(ground, tray, 20, tray + 20, 20, 2)
      const before = ground.water
      const fell = new Set<number>()
      for (let i = 0; i < 500; i++) { const moved = ground.step(); if (moved.rainAt >= 0) fell.add(moved.rainAt % COLS) }
      expect(count(ground, (code) => code === STEAM)).toBe(0)
      expect(Math.max(...fell) - Math.min(...fell), `layout ${variant}`).toBeGreaterThan(15)
      for (const col of fell) expect(col >= rain.col0 && col <= rain.col1).toBe(true)
      expect(ground.water).toBeGreaterThan(before)
    }
  })

  it('a pool that stands on it boils away as steam faster than the spring could fill it; in the bath it only boils', () => {
    const ground = on('dune'), { bath } = ground.layout
    lay(ground, AT.col - 4, AT.row, AT.col + 4, AT.row + 1, HOT)
    lay(ground, AT.col - 4, AT.row - 5, AT.col + 4, AT.row - 1, WATER)
    lay(ground, bath.col0 + 12, bath.row1 - 1, bath.col0 + 16, bath.row1, HOT)
    lay(ground, bath.col0, bath.row0 + 4, bath.col1, bath.row1 - 2, WATER)
    const inBath = ground.count(bath, WATER), pool = { col0: AT.col - 4, row0: AT.row - 5, col1: AT.col + 4, row1: AT.row - 1 }
    // The spring gives two cells a tick. The pool of 45 is seen to go down from the first second and is gone within three.
    let steamed = 0, boiling = 0
    for (let i = 0; i < 12; i++) steamed += ground.step().steamed
    expect(steamed).toBeGreaterThan(12 * 2)
    for (let i = 0; i < 168; i++) { const moved = ground.step(); steamed += moved.steamed; boiling += moved.boiling }
    expect(ground.count(pool, WATER)).toBe(0)
    expect(boiling).toBeGreaterThan(0)
    expect(ground.count(bath, WATER)).toBe(inBath)
  })

  it('in a bath that is not yet deep it makes no steam either: every cell that runs onto it stays water', () => {
    const ground = on('dune'), { bath } = ground.layout, mid = (bath.col0 + bath.col1) >> 1
    lay(ground, mid - 2, bath.row1 - 4, mid + 2, bath.row1, HOT)
    // Water let in a cell at a time from the top of the bath, onto the stone and beside it, as a stream brings it.
    let steamed = 0, poured = 0
    for (let i = 0; i < 120; i++) {
      for (const col of [mid, mid + 6]) if (ground.at(col, bath.row0) === OPEN) { ground.put(bath.row0 * COLS + col, WATER); poured++ }
      steamed += ground.step().steamed
    }
    expect(steamed).toBe(0)
    expect(count(ground, (code) => code === STEAM)).toBe(0)
    expect(ground.count(bath, WATER)).toBe(poured)
    expect(ground.bathState().floats).toBe(true)
  })

  it('is not dug, drops with a thud of its own when dug out from under, and boils the pool it lies in', () => {
    const ground = on('dune')
    lay(ground, AT.col - 2, AT.row, AT.col + 2, AT.row + 1, HOT)
    expect(ground.rub(AT.col - 2, AT.row + 1, AT.col + 2, AT.row + 1).hot).toBeGreaterThan(0)
    expect(count(ground, isHot)).toBe(10)
    ground.rub(AT.col - 7, AT.row + 7, AT.col + 7, AT.row + 7)
    let hot = false
    for (let i = 0; i < 200; i++) { const moved = ground.step(); if (moved.thud) hot = moved.thud.hot }
    expect(hot).toBe(true)
    // A pool poured round it where it lies: it boils and the water stays.
    const at = { col: 0, row: 0 }
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) if (isHot(ground.at(col, row)) && at.row === 0) { at.col = col; at.row = row }
    lay(ground, at.col - 3, at.row - 3, at.col + 8, at.row - 1, WATER)
    let boiling = 0
    for (let i = 0; i < 120; i++) boiling += ground.step().boiling
    expect(boiling).toBeGreaterThan(0)
  })
})

describe('seed earth', () => {
  it('a wet seed puts out a root that grows level, both ways, through open space until it meets ground', () => {
    const ground = on('dune')
    lay(ground, AT.col - 12, AT.row - 6, AT.col + 12, AT.row, OPEN)
    lay(ground, AT.col - 1, AT.row - 1, AT.col + 1, AT.row, EARTH)
    ground.put((AT.row - 2) * COLS + AT.col, SEED)
    ground.put((AT.row - 3) * COLS + AT.col, WATER)
    let sprouted = 0
    for (let i = 0; i < 600; i++) sprouted += ground.step().sprouted
    expect(sprouted).toBe(1)
    expect(ground.at(AT.col, AT.row - 2)).toBe(SPROUT)
    for (let col = AT.col - 12; col <= AT.col + 12; col++) if (col !== AT.col) expect(ground.at(col, AT.row - 2), `column ${col}`).toBe(ROOT)
    expect(isSand(ground.at(AT.col - 13, AT.row - 2))).toBe(true)
    expect(count(ground, (code) => code === TIP_LEFT || code === TIP_RIGHT)).toBe(0)
    // Water stands on the root as on a floor.
    lay(ground, AT.col + 4, AT.row - 4, AT.col + 6, AT.row - 4, WATER)
    steps(ground, 120)
    expect(ground.at(AT.col + 5, AT.row - 3)).toBe(WATER)
  })

  it('a root is plucked by a rub and snapped by a hard one, and never grows into a resident\'s room', () => {
    const ground = on('dune')
    lay(ground, AT.col - 6, AT.row, AT.col + 6, AT.row, ROOT)
    expect(ground.rub(AT.col, AT.row, AT.col, AT.row).roots).toBeGreaterThan(0)
    expect(count(ground, isRoot)).toBe(13)
    expect(ground.rub(AT.col, AT.row, AT.col, AT.row, true).snapped).toBeGreaterThan(0)
    expect(count(ground, isRoot)).toBeLessThan(13)
    for (let variant = 0; variant < 3; variant++) {
      const orchard = on('orchard', variant), { kept } = orchard.layout, seed = orchard.layout.spots.earth!
      orchard.put((seed.row - 1) * COLS + seed.col, WATER)
      steps(orchard, 420)
      expect(count(orchard, isRoot)).toBeGreaterThan(1)
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) if (isRoot(orchard.at(col, row))) expect(kept.some((box) => inBox(box, col, row)), `layout ${variant}: root at ${col},${row}`).toBe(false)
    }
  })

  it('a seed pops out once, when a rub takes the last of the earth that held it, and a rub over a seed lying loose pops nothing', () => {
    const ground = on('dune')
    lay(ground, AT.col - 3, AT.row, AT.col + 3, AT.row + 1, EARTH)
    ground.put((AT.row - 1) * COLS + AT.col, SEED)
    lay(ground, AT.col - 3, AT.row - 3, AT.col + 3, AT.row - 2, OPEN)
    // The seed lies on its earth: a rub over it leaves it be, and a rub through the earth under it frees it once.
    let popped = 0
    for (let pass = 0; pass < 3; pass++) popped += ground.rub(AT.col - 8, AT.row + 0.5, AT.col + 8, AT.row + 0.5).seeds
    expect(popped).toBe(1)
    steps(ground, 120)
    const seed = { col: 0, row: 0 }
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) if (ground.at(col, row) === SEED) { seed.col = col; seed.row = row }
    expect(seed.row).toBeGreaterThan(AT.row)
    expect(ground.rub(seed.col - 2, seed.row - 6, seed.col + 2, seed.row - 6).seeds).toBe(0)
  })

  it('falls away when it is dug out from under, and its seeds drop and land lower down', () => {
    const ground = on('dune')
    lay(ground, AT.col - 3, AT.row, AT.col + 3, AT.row + 1, EARTH)
    ground.put(AT.row * COLS + AT.col, SEED)
    ground.rub(AT.col - 6, AT.row + 7, AT.col + 6, AT.row + 7)
    let fell = 0, landed = 0
    for (let i = 0; i < 240; i++) { const moved = ground.step(); fell += moved.earthFell; landed += moved.seedsLanded }
    expect(fell).toBeGreaterThan(0)
    expect(landed).toBeGreaterThan(0)
    expect(ground.at(AT.col, AT.row)).not.toBe(SEED)
    expect(count(ground, (code) => code === SEED)).toBe(1)
  })
})

describe('the pond, the spring and the bath', () => {
  it('the spring runs while the pond is short; once the duck floats it stops when the hill holds plenty', () => {
    const ground = on('dune'), { pond, bath } = ground.layout
    expect(ground.springing).toBe(false)
    // A hole under the pond: it runs out, the spring runs, and what it gives is water in the hill.
    const before = ground.water
    ground.rub(pond.col, pond.brim + pond.depth + 2, pond.col, pond.brim + pond.depth + 14)
    steps(ground, 240)
    expect(ground.springing).toBe(true)
    expect(ground.water).toBeGreaterThan(before)
    // With plenty in the hill it runs on until the duck floats, and then stops, however empty the pond is.
    lay(ground, 20, 4, 120, 4 + Math.ceil((PLENTY_BATHS * boxCells(bath)) / 101), WATER)
    expect(ground.springing).toBe(true)
    lay(ground, bath.col0, bath.row0, bath.col1, bath.row1, WATER)
    steps(ground, 1)
    expect(ground.springing).toBe(false)
  })

  it('the bath floats the duck at three fifths full with at least a fifth of water, counting whatever lies under the surface', () => {
    const ground = on('dune'), { bath } = ground.layout
    const rows = bath.row1 - bath.row0 + 1
    const fill = (from: number, to: number, code: number): void => { for (let n = from; n < to; n++) lay(ground, bath.col0, bath.row1 - n, bath.col1, bath.row1 - n, code) }
    // The bath's own count of its water is taken once a tick.
    const state = (): ReturnType<Ground['bathState']> => { ground.step(); return ground.bathState() }
    fill(0, Math.ceil(rows * FLOATS_FROM) - 1, WATER)
    expect(state().floats).toBe(false)
    fill(0, Math.ceil(rows * FLOATS_FROM), WATER)
    expect(state()).toMatchObject({ floats: true })
    // Half of it sand under the water: as full, and still afloat.
    fill(0, Math.floor(rows * (FLOATS_FROM - WATER_FROM)), sand(1, true, true))
    expect(state().floats).toBe(true)
    expect(state().water).toBeGreaterThanOrEqual(WATER_FROM)
    // Nearly all sand: full enough, but not a bath.
    fill(0, Math.ceil(rows * FLOATS_FROM) - 1, sand(1, true, true))
    expect(state().fill).toBeGreaterThanOrEqual(FLOATS_FROM)
    expect(state().floats).toBe(false)
    // The plug lets the water out by the floor.
    expect(ground.drain(5)).toBeGreaterThan(0)
  })
})
