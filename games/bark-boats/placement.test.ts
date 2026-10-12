import { beforeAll, describe, expect, it } from 'vitest'
import { ALL_MAKINGS, HULLS, KINDS, MAKINGS, type Making } from './build'
import { carry, launch, run, worldWith } from './drive'
import { dragMove, dragStart, press } from './finger'
import { setUp, type Easel } from './easel'
import { BANK, FROG, KINGFISHER, LAID_OUT, LINE, MARGIN, POND, SEAT, STONE, SUN, WATER } from './layout'
import { openWorld } from './open'
import { STONE_TOP, boxOf, clear, freeSpot, newPiece, overlaps } from './pieces'
import { freshSave } from './save'
import { STAGE } from './stage'
import { step } from './tick'
import { STEP, gnomeSpot, type World } from './world'

// Nothing passes through anything: a 2D game holds that with tests of its
// own model. Whatever lies on the bank lies on a spot of its own, off the
// flat stone and inside the print, however it came there; and in the water
// what is nearer is drawn in front.

/** Everything on the bank is at rest on a spot of its own. Returns what is wrong, as words. */
function untidy(w: World): string[] {
  const wrong: string[] = []
  const lying = w.pieces.filter((piece) => piece.place.on === 'bank')
  for (const piece of lying) {
    if (piece.mode !== 'rest') wrong.push(`${piece.kind} is still ${piece.mode}`)
    const box = boxOf(piece.kind, piece)
    if (box.left < BANK.left || box.right > BANK.right || box.bottom > BANK.bottom) wrong.push(`${piece.kind} is off the bank`)
    if (box.top < WATER.bottom) wrong.push(`${piece.kind} lies in the water`)
    if (overlaps(box, STONE_TOP)) wrong.push(`${piece.kind} lies on the flat stone`)
    for (const other of lying) if (other !== piece && overlaps(box, boxOf(other.kind, other))) wrong.push(`${piece.kind} lies on ${other.kind}`)
  }
  return wrong
}

describe('the bank', () => {
  it('lays a fresh bank out with every making on a clear spot, at either first visit', () => {
    for (const age of [4, 8]) expect(untidy(openWorld(freshSave(age), 1)), String(age)).toEqual([])
    for (const kind of ALL_MAKINGS) expect(clear(LAID_OUT[kind], kind, null, []), kind).toBe(true)
  })

  it('sets a thing dropped onto another down beside it', () => {
    const w = openWorld(freshSave(8), 1)
    run(w, 0.2)
    for (const kind of ['cap', 'berry', 'feather', 'stem', 'stalk', 'twig', 'birch', 'pebble'] as const) {
      carry(w, LAID_OUT[kind], LAID_OUT.maple)
      run(w, 0.6)
      expect(untidy(w), kind).toEqual([])
    }
  })

  it('finds every making a place of its own even when all of them are let go on one spot', () => {
    const lying = [] as ReturnType<typeof newPiece>[]
    for (const kind of ALL_MAKINGS) lying.push(newPiece(kind, { on: 'bank', ...freeSpot({ x: 500, y: 700 }, kind, null, lying) }))
    for (const a of lying) for (const b of lying) if (a !== b) expect(overlaps(boxOf(a.kind, a), boxOf(b.kind, b)), `${a.kind} on ${b.kind}`).toBe(false)
  })

  it('takes back whatever the gnome, the frog, the kingfisher and the water were given, onto a clear spot', () => {
    const targets = { gnome: { x: 630, y: 507 }, frog: { x: FROG.mouth.x, y: FROG.mouth.y }, bird: { x: KINGFISHER.tap.x, y: KINGFISHER.tap.y }, water: { x: 900, y: 470 } }
    for (const [name, at] of Object.entries(targets)) {
      const w = openWorld(freshSave(8), 1)
      run(w, 0.2)
      for (const kind of ['twig', 'maple', 'feather', 'berry', 'cap', 'pebble'] as const) {
        const piece = w.pieces.find((each) => each.kind === kind)
        carry(w, piece ?? LAID_OUT[kind], at)
        run(w, 9)
        expect(untidy(w), `${kind} to the ${name}`).toEqual([])
      }
    }
  })

  it('lets a thing washed ashore come in past the stone and the boat, never under them', () => {
    const w = worldWith({ masts: ['twig', null] })
    run(w, 0.2)
    carry(w, LAID_OUT.birch, { x: 120, y: 470 })
    const leaf = w.pieces.find((piece) => piece.kind === 'birch')
    for (let i = 0; i < 9 / STEP && leaf?.mode !== 'rest'; i++) {
      step(w, STEP)
      if (leaf?.mode === 'float' && leaf.x > STONE.left - 20 && leaf.x < STONE.right + 20) expect(leaf.y).toBeLessThan(STONE.edge - 20)
    }
    expect(untidy(w)).toEqual([])
  })

  it('sets a hull that gives up the stone, and a thing the deck has no room for, on the moss and not on the stone', () => {
    const w = worldWith({ masts: ['twig', null], sails: ['maple', null], deck: ['berry', 'cap', 'pebble', 'feather'] })
    run(w, 0.2)
    // The deck is full: the birch leaf tips off the far side.
    carry(w, LAID_OUT.birch, { x: SEAT.x + 60, y: SEAT.y - 60 })
    run(w, 2)
    expect(w.pieces.find((piece) => piece.kind === 'birch')?.place.on).toBe('bank')
    expect(untidy(w)).toEqual([])
    // Another hull takes the stone, and everything that stood on the first.
    carry(w, LAID_OUT.walnut, { x: SEAT.x, y: SEAT.y - 20 })
    run(w, 2)
    expect(w.pieces.find((piece) => piece.kind === 'walnut')?.place.on).toBe('hull')
    expect(w.pieces.find((piece) => piece.kind === 'bark')?.place.on).toBe('bank')
    expect(untidy(w)).toEqual([])
  })

  it('never lays a making where the gnome stands or the boat sits', () => {
    const w = openWorld(freshSave(4), 1)
    const gnome = gnomeSpot(w)
    for (const kind of KINDS) {
      for (const want of [{ x: gnome.x, y: gnome.y + 40 }, SEAT, { x: STONE.left + 40, y: 640 }]) {
        const at = freeSpot(want, kind, null, w.pieces)
        expect(overlaps(boxOf(kind, at), STONE_TOP), `${kind} at ${at.x},${at.y}`).toBe(false)
      }
    }
  })
})

describe('the pond', () => {
  it('moors the boats sent before clear of the sun, of the water the boat comes in on, and of the gnome\'s pad', () => {
    for (const row of POND.rows) {
      expect(Math.hypot(row.x - SUN.x, row.y - SUN.pond)).toBeGreaterThan(SUN.tap + 60)
      expect(row.y).toBeLessThan(LINE - 60)
      expect(Math.hypot(row.x - POND.pad.x, row.y - POND.pad.y)).toBeGreaterThan(100)
      // Not behind the newest boat, whatever stands on it, nor behind the gnome on his pad: a far lamp would be drawn on a sail or on his hat.
      const half = HULLS.bark.halfWidth * row.s
      expect(row.x + half < POND.moor.x - HULLS.bark.halfWidth || row.x - half > POND.pad.x + 56, `${row.x}`).toBe(true)
      expect(row.x + half).toBeLessThan(STAGE.width - MARGIN)
    }
    // No two at one spot, and those side by side stand at different depths.
    for (let i = 1; i < POND.rows.length; i++) {
      expect(POND.rows[i].x - POND.rows[i - 1].x).toBeGreaterThan(100)
      expect(POND.rows[i].y).not.toBe(POND.rows[i - 1].y)
    }
  })

  it('gives the gnome and the berry a pad each, in front of the moored boat', () => {
    expect(Math.hypot(POND.pad.x - POND.berry.x, POND.pad.y - POND.berry.y)).toBeGreaterThan(70)
    expect(POND.pad.y).toBeGreaterThan(LINE + 20)
    expect(POND.berry.y).toBeGreaterThan(LINE + 20)
  })
})

describe('what is nearer is drawn in front', () => {
  let easel: Easel
  const sheetOf = (kind: Making): unknown => (easel.view as unknown as { sheets: { makings: Record<Making, { sheet: unknown }> } }).sheets.makings[kind].sheet
  const order = (kind: Making): number => easel.surface.stamped.findIndex((stamped) => stamped.image === sheetOf(kind))

  beforeAll(() => {
    easel = setUp()
  })

  /** A boat afloat, and a birch leaf floating at `y`. */
  function afloatWithLeaf(y: number): World {
    const w = worldWith({ masts: ['twig', null] })
    run(w, 0.2)
    launch(w)
    run(w, 2)
    const leaf = w.pieces.find((piece) => piece.kind === 'birch')
    if (leaf) { leaf.mode = 'float'; leaf.x = w.boat.x + 20; leaf.y = y }
    return w
  }

  it('a leaf floating past nearer than the hull is in front of it', () => {
    const w = afloatWithLeaf(LINE + 70)
    expect(w.boat.y).toBeLessThan(LINE + 70)
    easel.frame(w)
    expect(order('bark')).toBeGreaterThanOrEqual(0)
    expect(order('birch')).toBeGreaterThan(order('bark'))
  })

  it('a leaf floating past further off than the hull is behind it', () => {
    const w = afloatWithLeaf(WATER.top + 60)
    expect(w.boat.y).toBeGreaterThan(WATER.top + 60)
    easel.frame(w)
    expect(order('birch')).toBeGreaterThanOrEqual(0)
    expect(order('birch')).toBeLessThan(order('bark'))
  })

  it('a boat in the hand is drawn over the makings that lie on the bank, and on its stone behind them', () => {
    const w = worldWith({ masts: ['twig', null] })
    run(w, 0.2)
    easel.frame(w)
    expect(order('bark')).toBeGreaterThanOrEqual(0)
    expect(order('bark')).toBeLessThan(order('pebble'))
    // Lifted by its hull and carried down over the sand.
    press(w, SEAT.x + 84, SEAT.y - 12)
    dragStart(w)
    dragMove(w, 900, 700)
    run(w, 0.2)
    expect(w.hand?.on).toBe('boat')
    easel.frame(w)
    for (const kind of ['pebble', 'maple', 'berry', 'cap'] as const) expect(order('bark'), kind).toBeGreaterThan(order(kind))
  })

  it('whatever lies on the near bank is in front of everything in the water', () => {
    const w = afloatWithLeaf(LINE + 70)
    easel.frame(w)
    expect(order('pebble')).toBeGreaterThan(order('bark'))
    expect(order('pebble')).toBeGreaterThan(order('birch'))
    expect(MAKINGS.pebble.part).toBe('load')
  })
})
