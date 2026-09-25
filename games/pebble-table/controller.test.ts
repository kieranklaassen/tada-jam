import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { silentSound, TableController, yardSpots, type Projector } from './controller'
import { IDLE_BEFORE_HINT } from './guidance'
import { albumSlot, BAG, DOOR, FEEDING, MAT_KEYS, SCALE, shelfTile } from './layout'
import { JARS, PART_COUNTS } from './parts'
import { STOOL_REACH } from './partShape'
import { physicsReady, stoneRadius3, to3, toWorld2, UNIT } from './physics3d'
import { Quat, V3 } from './vec'
import { stoneRest } from './stoneShape'
import { feedingFloor } from './surfaces'
import { panOf } from './scale'
import { GUEST_ARM, GUEST_RADIUS, GUEST_REACH, guestArms, GUEST_TOP, plateOf } from './feeding'
import { SEAT_SPECIES } from './motion'
import { accountedTotal, defaultTable, type Piece } from './state'
import { doorwayGap, GATE, HINGE, houseGap } from './visitors'
import { chooserGeometry, CHOOSER_SCALE } from './view/models'
import { cameraProjector, placeCamera } from './view/stage'

await physicsReady()

// A straight-down orthographic "camera": screen pixels are world units.
const topDown: Projector = {
  toScreen: (v) => toWorld2(v),
  toPlane: (screen) => screen,
}

function makeTable(age: number | null = 4) {
  const save = vi.fn()
  const table = new TableController(defaultTable(age), { save })
  table.setProjector(topDown)
  return { table, save }
}

const run = (table: TableController, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) table.step(1 / 60)
}

/** A seeded random stream whose draws are spread evenly from the first (mulberry32): consecutive seeds give unrelated spills. */
function spread(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let clock = 0
const tap = (table: TableController, at: { x: number; y: number }) => {
  table.pointerDown(1, at, (clock += 10))
  table.pointerUp(1, at, (clock += 80))
}
const drag = (table: TableController, from: { x: number; y: number }, to: { x: number; y: number }) => {
  table.pointerDown(2, from, (clock += 10))
  for (let i = 1; i <= 10; i++) {
    table.pointerMove(2, { x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 }, (clock += 16))
    table.step(1 / 60)
  }
  run(table, 0.2)
  table.pointerUp(2, to, (clock += 150))
}

describe('TableController', () => {
  it('tapping the bag spills every stone onto the table, conserving the total', () => {
    const { table, save } = makeTable()
    tap(table, { x: BAG.x, y: BAG.y })
    expect(table.state.bag).toBe(0)
    expect(table.state.pieces).toHaveLength(10)
    run(table, 3)
    expect(accountedTotal(table.state)).toBe(40)
    expect(new Set([...table.physics.stoneIds(), ...table.flightViews().map((flight) => flight.id)]).size).toBe(10)
    expect(save).toHaveBeenCalled()
  })

  it('keeps every spilled stone on the table across many random spills', () => {
    // Seeded spills, so one that throws a stone off the table names its seed
    // and can be replayed: unseeded, a rare escape could not be traced.
    // A stone that leaves the table is flown home to the bag within about
    // 1.4 s, so after 3 s it is neither on the table nor in flight.
    const off: number[] = []
    for (let seed = 1; seed <= 120; seed++) {
      const table = new TableController(defaultTable(4), { save: () => {}, random: spread(seed) })
      table.setProjector(topDown)
      tap(table, { x: BAG.x, y: BAG.y })
      run(table, 3)
      if (new Set([...table.physics.stoneIds(), ...table.flightViews().map((flight) => flight.id)]).size < 10) off.push(seed)
    }
    expect(off, 'seeds whose spill threw a stone off the table').toEqual([])
  }, 60_000)

  it('invites on an empty scale with one stone on a pan, and a stone on the other pan levels it', () => {
    const { table } = makeTable(6)
    run(table, 2.5)
    expect(table.state.pieces.filter((piece) => panOf(piece) === 0)).toHaveLength(1)
    expect(table.beam.angle).toBeLessThan(-0.05)
    drag(table, { x: BAG.x, y: BAG.y }, SCALE.pans[1])
    run(table, 3)
    expect(table.state.pieces.filter((piece) => panOf(piece) === 1)).toHaveLength(1)
    expect(Math.abs(table.beam.angle)).toBeLessThan(0.02)
  })

  it('lets go of a stone after a long still press', () => {
    const { table } = makeTable(6)
    drag(table, { x: BAG.x, y: BAG.y }, { x: 700, y: 850 })
    run(table, 1.5)
    const [piece] = table.state.pieces
    table.pointerDown(3, piece, (clock += 10))
    run(table, 0.8)
    table.pointerUp(3, piece, (clock += 800))
    expect(table.isHeld(piece.id)).toBe(false)
  })

  it('shows a ghost hand only after the child has been idle, and a touch hides it', () => {
    const { table } = makeTable()
    tap(table, { x: 1000, y: 900 })
    run(table, IDLE_BEFORE_HINT + 1)
    expect(table.guidance.hand).not.toBeNull()
    expect(table.guidance.hint?.kind).toBe('tapBag')
    table.pointerDown(4, { x: 1000, y: 900 }, (clock += 10))
    table.step(1 / 60)
    expect(table.guidance.hand).toBeNull()
    expect(table.guidance.glow).toBe(0)
  })

  it('wiggles the bag on first open when nobody is seated yet, and stops after the first touch', () => {
    const save = vi.fn()
    const table = new TableController({ ...defaultTable(4), seats: [false, false, false, false, false] }, { save })
    table.setProjector(topDown)
    run(table, 1.6)
    expect(table.guidance.peek).not.toBeNull()
    tap(table, { x: 1000, y: 900 })
    run(table, 6.5)
    expect(table.guidance.peek).toBeNull()
  })
})

describe('first open story beat', () => {
  it('rolls one stone out toward the hungry guest and the ghost hand carries it to that plate', () => {
    const { table } = makeTable()
    const hungry = table.wanting
    expect(hungry).not.toBeNull()
    run(table, 3)
    expect(table.guidance.hand).not.toBeNull()
    run(table, 3)
    expect(table.state.pieces).toHaveLength(1)
    expect(plateOf(table.state.pieces[0])).toBe(hungry)
    expect(table.state.bag).toBe(table.state.total - 4)
    expect(table.wanting).not.toBe(hungry)
  })

  it('ends at once when the child touches, and the stone lands where it was going', () => {
    const { table } = makeTable()
    run(table, 1.6)
    table.pointerDown(5, { x: 1000, y: 900 }, (clock += 10))
    table.step(1 / 60)
    expect(table.guidance.hand).toBeNull()
    expect(table.state.pieces).toHaveLength(1)
    expect(table.physics.stoneIds()).toHaveLength(1)
  })

  it('plays only on a brand-new table', () => {
    const { table } = makeTable()
    tap(table, { x: BAG.x, y: BAG.y })
    run(table, 6)
    expect(table.state.pieces).toHaveLength(10)
  })
})

describe('one obvious want', () => {
  it('has exactly one guest asking, and it faces the child', () => {
    const { table } = makeTable()
    tap(table, { x: 1000, y: 900 })
    run(table, 0.5)
    const asking = [0, 1, 2, 3, 4].filter((seat) => table.asking(seat) > 0)
    expect(asking).toEqual([table.wanting])
  })

  it('rumbles the hungry tummy while the child is idle, backing off, at most three times', () => {
    const { table } = makeTable()
    tap(table, { x: 1000, y: 900 })
    run(table, 2)
    expect(table.rumbles.size).toBe(0)
    run(table, 60)
    expect(table.rumbles.size).toBe(1)
  })

  it('keeps empty stools hidden until the first shared meal', () => {
    const { table } = makeTable()
    expect(table.stoolsShown).toBe(false)
    tap(table, { x: 1000, y: 900 })
    for (const seat of [1, 4]) {
      drag(table, { x: BAG.x, y: BAG.y }, FEEDING.seats[seat].plate)
      run(table, 1)
    }
    run(table, 3)
    expect(table.stoolsShown).toBe(true)
  })

  it('hops a stone left standing against a seated guest\'s arm out of its reach, or back down on its plate, and leaves the ones lying flat there', () => {
    const { table } = makeTable()
    tap(table, { x: 1000, y: 900 })
    const seated = [1, 4]
    const r = stoneRadius3(4) / UNIT
    const floor = (at: { x: number; y: number }) => feedingFloor(at, GUEST_RADIUS * UNIT)
    const near = (p: { x: number; y: number }) => seated.some((seat) => Math.hypot(p.x - FEEDING.seats[seat].guest.x, p.y - FEEDING.seats[seat].guest.y) < GUEST_REACH / UNIT + r)
    const tall = (p: Piece) => table.physics.stoneTop(p.id)! - floor(FEEDING.seats[seated[0]].guest) > GUEST_ARM.low
    const pieceOf = (id: number) => table.state.pieces.find((p) => p.id === id)
    const offArms = (p: { x: number; y: number }) => seated.every((seat) => guestArms(seat).every((arm) => Math.hypot(p.x - arm.x, p.y - arm.y) >= GUEST_ARM.r / UNIT + r))
    const drop = (at: { x: number; y: number }) => {
      drag(table, { x: BAG.x, y: BAG.y }, at)
      run(table, 1)
      return table.state.pieces[table.state.pieces.length - 1]
    }
    // Lying flat beside each guest, clear of its arms and as far from its plate as can be.
    const flat = seated.map((seat) => {
      const { guest, plate } = FEEDING.seats[seat]
      const spot = Array.from({ length: 24 }, (_, i) => (i * Math.PI) / 12)
        .map((angle) => ({ x: guest.x + Math.cos(angle) * (GUEST_RADIUS + r + 12), y: guest.y + Math.sin(angle) * (GUEST_RADIUS + r + 12) }))
        .filter((at) => guestArms(seat).every((arm) => Math.hypot(at.x - arm.x, at.y - arm.y) > GUEST_ARM.r / UNIT + r + 10))
        .reduce((best, at) => (Math.hypot(at.x - plate.x, at.y - plate.y) > Math.hypot(best.x - plate.x, best.y - plate.y) ? at : best))
      return { spot, id: drop(spot).id }
    })
    // Stood on its edge against each arm in turn, its top tipped toward the guest.
    const hopped = { plate: 0, floor: 0 }
    for (const seat of seated) {
      const { guest } = FEEDING.seats[seat]
      for (const arm of guestArms(seat)) {
        const d = Math.hypot(guest.x - arm.x, guest.y - arm.y)
        const u = { x: (guest.x - arm.x) / d, y: (guest.y - arm.y) / d }
        const back = (GUEST_ARM.r + stoneRadius3(4) * 0.55 + 0.5) / UNIT
        const spot = { x: arm.x - u.x * back, y: arm.y - u.y * back }
        const piece = drop({ x: spot.x - u.x * 40, y: spot.y - u.y * 40 })
        const body = table.physics.body(piece.id)!
        body.place(new V3((spot.x - 800) * UNIT, floor(spot) + stoneRadius3(4) + 0.2, (spot.y - 500) * UNIT), new Quat().setFromAxisAngle(new V3(-u.y, 0, u.x), (70 * Math.PI) / 180))
        body.halt()
        body.wakeUp()
        let leaning: number | null = null
        for (let t = 0; t < 3; t += 0.05) {
          const at = pieceOf(piece.id)!
          if (leaning === null && table.flightViews().some((flight) => flight.id === piece.id)) leaning = plateOf(at) ?? -1
          run(table, 0.05)
        }
        const now = pieceOf(piece.id)!
        expect(near(now) && tall(now), `seat ${seat}: a stone left standing within reach`).toBe(false)
        if (leaning === null) continue
        if (leaning === -1) {
          expect(near(now)).toBe(false)
          hopped.floor++
        } else {
          expect(plateOf(now)).toBe(leaning)
          expect(offArms(now)).toBe(true)
          hopped.plate++
        }
      }
    }
    expect(hopped.floor, 'stones hopped out of reach').toBeGreaterThan(0)
    expect(hopped.plate, 'stones hopped back down on their plate').toBeGreaterThan(0)
    expect(table.state.pieces).toHaveLength(6)
    expect(table.physics.stoneIds()).toHaveLength(6)
    for (const { spot, id } of flat) {
      const now = pieceOf(id)!
      expect(Math.hypot(now.x - spot.x, now.y - spot.y)).toBeLessThan(r)
      expect(near(now)).toBe(true)
    }
  })

  it('hops a stone lying where a stool pops up out beside it, clear of the stool, the plates and the other stones', () => {
    const { table } = makeTable()
    tap(table, { x: 1000, y: 900 })
    const stools = [0, 2, 3].map((seat) => FEEDING.seats[seat].guest)
    const r = stoneRadius3(4) / UNIT
    const inStool = (p: { x: number; y: number }) => stools.some((at) => Math.hypot(p.x - at.x, p.y - at.y) < (STOOL_REACH / UNIT) * 1.12 + r)
    for (const at of [...stools, { x: stools[2].x + 25, y: stools[2].y - 15 }]) {
      drag(table, { x: BAG.x, y: BAG.y }, at)
      run(table, 1)
    }
    expect(table.state.pieces.filter(inStool)).toHaveLength(4)
    for (const seat of [1, 4]) {
      drag(table, { x: BAG.x, y: BAG.y }, FEEDING.seats[seat].plate)
      run(table, 1)
    }
    run(table, 3)
    expect(table.stoolsShown).toBe(true)
    expect(table.state.pieces).toHaveLength(6)
    expect(table.state.pieces.filter(inStool)).toEqual([])
    expect(table.physics.stoneIds()).toHaveLength(6)
    expect(table.feeding.plates).toEqual([0, 4, 0, 0, 4])
    const pieces = table.state.pieces
    for (const [i, a] of pieces.entries()) for (const b of pieces.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(r * 1.9)
  })
})

describe('Knock-Knock', () => {
  const doorTable = () => {
    const table = new TableController({ ...defaultTable(4), liveMat: 'door', shelf: ['door', 'feeding', 'scale'] }, { save: vi.fn() })
    table.setProjector(topDown)
    return table
  }
  const knock = (table: TableController, times: number) => {
    for (let i = 0; i < times; i++) {
      tap(table, DOOR.door)
      run(table, 0.3)
    }
  }
  const out = (table: TableController) => table.door.visitors.filter((v) => v.leaveAt === null)

  it('answers three knocks with three visitors standing in groups in the yard', () => {
    const table = doorTable()
    knock(table, 3)
    run(table, 4)
    expect(out(table)).toHaveLength(3)
    knock(table, 5)
    run(table, 6)
    const sizes = [0, 1].map((g) => out(table).filter((v) => v.group === g).length)
    expect(sizes).toEqual([3, 2])
    const spots = out(table).map((v) => `${v.home.x},${v.home.y}`)
    expect(new Set(spots).size).toBe(5)
    expect(table.door.openAt).not.toBeNull()
  })

  it('sends the visitors home when the child knocks again, then answers the new count', () => {
    const table = doorTable()
    knock(table, 2)
    run(table, 4)
    knock(table, 5)
    run(table, 6)
    expect(out(table)).toHaveLength(5)
  })

  it('hops every stone lying where the door swings or the visitors walk out of their way, as they come out and as they go home', () => {
    const table = doorTable()
    const r = stoneRadius3(4) / UNIT
    const homes = yardSpots([[0, 1, 2]])
    const far = { x: 300, y: 250 }
    for (const at of [{ x: HINGE.x + 60, y: HINGE.y + 45 }, GATE, homes[2], far]) {
      drag(table, { x: BAG.x, y: BAG.y }, at)
      run(table, 1)
    }
    const inWay = (list: readonly { x: number; y: number }[]) => table.state.pieces.filter((piece) => doorwayGap(piece, list) < r)
    expect(inWay(homes)).toHaveLength(3)
    const [away] = table.state.pieces.filter((piece) => doorwayGap(piece, homes) > 300).map((piece) => ({ x: piece.x, y: piece.y }))
    expect(away).toBeDefined()
    const clear = () => {
      const pieces = table.state.pieces
      expect(pieces).toHaveLength(4)
      expect(table.physics.stoneIds()).toHaveLength(4)
      for (const [i, a] of pieces.entries()) for (const b of pieces.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(r * 1.9)
      for (const piece of pieces) expect(houseGap(piece)).toBeGreaterThan(r)
    }
    knock(table, 3)
    for (let t = 0; t < 4 && table.door.openAt === null; t += 1 / 60) table.step(1 / 60)
    expect(table.door.openAt).not.toBeNull()
    expect(table.flightViews()).toEqual([])
    expect(inWay(homes)).toEqual([])
    run(table, 5)
    expect(out(table)).toHaveLength(3)
    expect(table.state.pieces.some((piece) => piece.x === away.x && piece.y === away.y)).toBe(true)
    clear()
    drag(table, { x: BAG.x, y: BAG.y }, homes[0])
    run(table, 1)
    expect(inWay(homes)).toHaveLength(1)
    knock(table, 1)
    run(table, 1)
    expect(inWay(homes)).toEqual([])
  })

  it('never lets more than ten out', () => {
    const table = doorTable()
    knock(table, 14)
    run(table, 8)
    expect(out(table)).toHaveLength(DOOR.maxVisitors)
  })

  it('peeks from the window while nobody is out, at most three times per idle stretch', () => {
    const table = doorTable()
    let peeks = 0
    let was = false
    for (let t = 0; t < 90; t += 1 / 30) {
      table.step(1 / 30)
      const now = table.doorPeek() !== null
      if (now && !was) peeks += 1
      was = now
    }
    expect(peeks).toBe(3)
  })
})

describe('jars of loose parts', () => {
  const scaleTable = () => {
    const state = { ...defaultTable(6), bag: 40, total: 40 }
    const table = new TableController(state, { save: vi.fn() })
    table.setProjector(topDown)
    tap(table, { x: 1000, y: 950 })
    run(table, 2)
    return table
  }

  it('tips everything out of a jar and an empty jar only wobbles', () => {
    const table = scaleTable()
    tap(table, JARS.acorn)
    run(table, 2)
    expect(table.state.parts.filter((p) => p.kind === 'acorn')).toHaveLength(PART_COUNTS.acorn)
    tap(table, JARS.acorn)
    run(table, 1)
    expect(table.state.parts.filter((p) => p.kind === 'acorn')).toHaveLength(PART_COUNTS.acorn)
  })

  it('weighs the boulder honestly: it balances three stones', () => {
    const table = scaleTable()
    for (const piece of [...table.state.pieces]) drag(table, piece, { x: 700, y: 880 })
    drag(table, JARS.boulder, SCALE.pans[0])
    for (let i = 0; i < 3; i++) {
      drag(table, { x: BAG.x, y: BAG.y }, { x: SCALE.pans[1].x - 30 + i * 30, y: SCALE.pans[1].y })
      run(table, 0.6)
    }
    run(table, 4)
    expect(Math.abs(table.beam.angle)).toBeLessThan(0.02)
  })

  it('weighs nothing lying on the table under a pan rim, so the beam never rocks it', () => {
    const table = scaleTable()
    for (const piece of [...table.state.pieces]) drag(table, piece, { x: 700, y: 880 })
    const pan = SCALE.pans[0]
    drag(table, { x: BAG.x, y: BAG.y }, { x: pan.x - pan.r - 40, y: pan.y })
    run(table, 1)
    const [stone] = table.state.pieces.filter((piece) => piece.y < 880 - 60)
    const body = table.physics.body(stone.id)!
    body.place({ x: (pan.x - pan.r * 0.998 - 800) * UNIT, y: body.position.y, z: (pan.y - 500) * UNIT })
    run(table, 3)
    expect(Math.hypot(stone.x - pan.x, stone.y - pan.y)).toBeLessThan(pan.r)
    expect(table.beam.angle).toBe(0)
  })

  it('lets every tipped-out part come to rest, so physics goes quiet', () => {
    for (let trial = 0; trial < 4; trial++) {
      const table = scaleTable()
      for (const kind of Object.keys(JARS) as (keyof typeof JARS)[]) tap(table, JARS[kind])
      run(table, 10)
      const awake = table.state.parts.filter((part) => !table.physics.body(part.id)?.asleep)
      expect(awake.map((part) => part.kind)).toEqual([])
    }
  }, 30_000)

  it('sends every part home when the scale is put away', () => {
    const table = scaleTable()
    tap(table, JARS.shell)
    run(table, 2)
    expect(table.state.parts.length).toBeGreaterThan(0)
    tap(table, shelfTile(0))
    run(table, 1)
    expect(table.state.liveMat).not.toBe('scale')
    expect(table.state.parts).toHaveLength(0)
  })
})

describe('the shelf', () => {
  it("brings out the chooser tapped anywhere on it, seen at the table's angle, never the one behind it", () => {
    const view = { width: 1180, height: 820 }
    const camera = new THREE.PerspectiveCamera()
    placeCamera(camera, view.width / view.height)
    const projector = cameraProjector(camera, view)
    let taps = 0
    for (const live of MAT_KEYS) {
      const shelf = MAT_KEYS.filter((mat) => mat !== live)
      shelf.forEach((mat, i) => {
        const tile = shelfTile(i)
        const top = new THREE.Box3().setFromBufferAttribute(chooserGeometry(mat).getAttribute('position') as THREE.BufferAttribute).max.y * CHOOSER_SCALE
        for (let k = 0; k <= 4; k++) {
          const table = new TableController({ ...defaultTable(4), liveMat: live, shelf: [live, ...shelf] }, { save: () => {} })
          table.setProjector(projector)
          tap(table, projector.toScreen(to3(tile, tile.height + (top * k) / 4))!)
          run(table, 1)
          expect(table.state.liveMat, `${mat} tapped ${k}/4 up it, ${live} out`).toBe(mat)
          taps++
        }
      })
    }
    expect(taps).toBe(30)
  }, 30_000)
})

describe('album of past tables', () => {
  it('keeps an arrangement when the child tips the bag again, and sets it back when the album is tapped', () => {
    const { table } = makeTable()
    tap(table, { x: 1000, y: 950 })
    const spots = [0, 1, 4].map((seat) => FEEDING.seats[seat].plate)
    for (const spot of spots) {
      drag(table, { x: BAG.x, y: BAG.y }, spot)
      run(table, 0.8)
    }
    run(table, 1)
    tap(table, { x: BAG.x, y: BAG.y })
    run(table, 3)
    expect(table.state.album).toHaveLength(1)
    tap(table, albumSlot())
    run(table, 3)
    expect(table.state.pieces).toHaveLength(3)
    const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) < 40
    for (const piece of table.state.pieces) expect(spots.some((spot) => near(piece, spot))).toBe(true)
    expect(table.state.album).toHaveLength(1)
  })

  it('sets the page back exactly when the album is tapped while a stone is still hopping', () => {
    let seed = 7
    const random = vi.spyOn(Math, 'random').mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)
    try {
      const { table } = makeTable()
      tap(table, { x: 1000, y: 950 })
      const spots = [0, 1, 4].map((seat) => FEEDING.seats[seat].plate)
      for (const spot of spots) {
        drag(table, { x: BAG.x, y: BAG.y }, spot)
        run(table, 0.8)
      }
      run(table, 1)
      tap(table, { x: BAG.x, y: BAG.y })
      run(table, 3)
      const loose = table.state.pieces.find((piece) => plateOf(piece) === null && Math.hypot(piece.x - FEEDING.bowl.x, piece.y - FEEDING.bowl.y) > FEEDING.bowl.r + 40)!
      drag(table, loose, FEEDING.bowl)
      run(table, 0.8)
      tap(table, FEEDING.bowl)
      expect(table.flightViews().filter((flight) => flight.id === loose.id)).toHaveLength(1)
      tap(table, albumSlot())
      run(table, 3)
      expect(table.state.pieces).toHaveLength(3)
      expect(accountedTotal(table.state)).toBe(40)
    } finally {
      random.mockRestore()
    }
  })
})

describe('hidden delights', () => {
  const withSounds = () => {
    const sound = { ...silentSound, ding: vi.fn(), sigh: vi.fn(), squeak: vi.fn() }
    const table = new TableController(defaultTable(4), { save: vi.fn(), sound })
    table.setProjector(topDown)
    return { table, sound }
  }
  const knockOff = (table: TableController, id: number) => {
    const body = table.physics.body(id)
    if (!body) throw new Error('no body')
    body.place({ x: body.position.x, y: -20, z: body.position.z })
    table.step(1 / 60)
  }

  it('sends every other fallen stone home on a scurrying mouse, and nothing is lost', () => {
    const { table, sound } = withSounds()
    tap(table, { x: BAG.x, y: BAG.y })
    run(table, 3)
    const [first, second] = table.physics.stoneIds()
    knockOff(table, first)
    expect(table.flightViews().filter((f) => f.mouse)).toHaveLength(0)
    knockOff(table, second)
    const carried = table.flightViews().filter((f) => f.mouse)
    expect(carried).toHaveLength(1)
    expect(sound.squeak).toHaveBeenCalled()
    run(table, 5)
    expect(table.flightViews()).toHaveLength(0)
    expect(table.state.bag).toBe(8)
    expect(accountedTotal(table.state)).toBe(40)
  })

  it('chimes and wobbles the empty bowl when tapped', () => {
    const { table, sound } = withSounds()
    tap(table, FEEDING.bowl)
    expect(sound.ding).toHaveBeenCalledTimes(1)
    expect(table.bowlDingAt).not.toBeNull()
  })

  it('sighs when the empty bag is tapped', () => {
    const { table, sound } = withSounds()
    tap(table, { x: BAG.x, y: BAG.y })
    run(table, 3)
    tap(table, { x: BAG.x, y: BAG.y })
    expect(sound.sigh).toHaveBeenCalledTimes(1)
  })
})

describe('forgiving drops', () => {
  it('lets the asking guest catch a stone dropped just short of its plate', () => {
    const { table } = makeTable()
    tap(table, { x: 1000, y: 950 })
    run(table, 1)
    const seat = table.wanting
    expect(seat).not.toBeNull()
    const plate = FEEDING.seats[seat!].plate
    const away = Math.hypot(plate.x - 780, plate.y - 470)
    const short = { x: plate.x + ((plate.x - 780) / away) * FEEDING.plateRadius * 1.35, y: plate.y + ((plate.y - 470) / away) * FEEDING.plateRadius * 1.35 }
    expect(plateOf(short)).toBeNull()
    drag(table, { x: BAG.x, y: BAG.y }, short)
    run(table, 2)
    expect(table.state.pieces.filter((piece) => plateOf(piece) === seat)).toHaveLength(1)
  })

  it('carries a stone over a seated guest rather than through it, and the guest catches it if it is let go over its head', () => {
    for (const seat of [1, 4]) {
      const { table } = makeTable()
      tap(table, { x: 1000, y: 900 })
      run(table, 1)
      const guest = FEEDING.seats[seat].guest
      const [from, to] = [{ x: guest.x - 240, y: guest.y + 40 }, { x: guest.x + 240, y: guest.y - 40 }]
      table.pointerDown(2, BAG, (clock += 10))
      const move = (at: { x: number; y: number }) => {
        table.pointerMove(2, at, (clock += 16))
        table.step(1 / 60)
      }
      for (let i = 1; i <= 30; i++) move({ x: BAG.x + ((from.x - BAG.x) * i) / 30, y: BAG.y + ((from.y - BAG.y) * i) / 30 })
      const piece = table.state.pieces[table.state.pieces.length - 1]
      // Across the guest and back at 30 cm a second, a brisk small hand's pace.
      let over = false
      for (const [a, b] of [[from, to], [to, guest]]) {
        const steps = Math.ceil((Math.hypot(b.x - a.x, b.y - a.y) * UNIT) / 30 * 60)
        for (let i = 1; i <= steps; i++) {
          move({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps })
          over = rideOver(table, piece.id, seat, over)
        }
      }
      run(table, 0.3)
      table.pointerUp(2, guest, (clock += 150))
      run(table, 2)
      expect(plateOf(table.state.pieces.find((p) => p.id === piece.id)!), `seat ${seat}`).toBe(seat)
    }
  })

  it('brings a stone carried over a guest\'s head down only once clear of its face, and it still lands on the plate it is let go over', () => {
    for (const seat of [1, 4]) {
      const { table } = makeTable()
      tap(table, { x: 1000, y: 900 })
      run(table, 1)
      const { guest, plate } = FEEDING.seats[seat]
      // From beside the guest, away from its plate, over its head, and on to the middle of its plate.
      const away = { x: guest.x - (plate.y - guest.y) * 1.4, y: guest.y + (plate.x - guest.x) * 1.4 }
      table.pointerDown(2, BAG, (clock += 10))
      const move = (at: { x: number; y: number }) => {
        table.pointerMove(2, at, (clock += 16))
        table.step(1 / 60)
      }
      for (let i = 1; i <= 30; i++) move({ x: BAG.x + ((away.x - BAG.x) * i) / 30, y: BAG.y + ((away.y - BAG.y) * i) / 30 })
      const piece = table.state.pieces[table.state.pieces.length - 1]
      let over = false
      for (const [a, b] of [[away, guest], [guest, plate]]) {
        const steps = Math.ceil((Math.hypot(b.x - a.x, b.y - a.y) * UNIT) / 30 * 60)
        for (let i = 1; i <= steps; i++) {
          move({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps })
          over = rideOver(table, piece.id, seat, over)
        }
      }
      expect(over, `seat ${seat}: it rode over the guest`).toBe(true)
      run(table, 0.3)
      table.pointerUp(2, plate, (clock += 150))
      run(table, 3)
      expect(plateOf(table.state.pieces.find((p) => p.id === piece.id)!), `seat ${seat}`).toBe(seat)
    }
  })
})

/**
 * Checks a carried stone against the guest at `seat`: over its body it rides
 * at the guest's top, and once it has ridden over (`over`) it stays there
 * until its edge is clear of all the guest's reach, head and nose included.
 * Returns whether it is still riding over.
 */
function rideOver(table: TableController, id: number, seat: number, over: boolean): boolean {
  const piece = table.state.pieces.find((p) => p.id === id)!
  const body = table.physics.body(id)!
  const { guest } = FEEDING.seats[seat]
  const off = Math.hypot(toWorld2(body.position).x - guest.x, toWorld2(body.position).y - guest.y) * UNIT
  const r = stoneRadius3(piece.q)
  const riding = off < GUEST_RADIUS * UNIT + r || (over && off < GUEST_REACH + r)
  if (riding) expect(body.position.y - stoneRest(piece.q), `seat ${seat}, ${off.toFixed(1)} cm from its middle`).toBeGreaterThanOrEqual(GUEST_TOP[SEAT_SPECIES[seat]])
  return riding
}
