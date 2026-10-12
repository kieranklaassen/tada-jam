import { describe, expect, it } from 'vitest'
import { CEILING_Y, ICICLE, ON_BANK_Y, restOf, widthOf } from './blocks'
import { AT, harePose } from './cast'
import { firstWorld } from './first'
import { BLOCK_H, BOUGH, DRIFT, POND, SUN, sawable } from './ground'
import { CORNER } from './overlay'
import { STAGE, fit, toStage } from './stage'
import { bare, carry, cut, drag, letGo, moveTo, press, pullSun, run, scoop, toNight } from './testing'
import { Toy } from './toy'
import { whoAt } from './toyDay'
import { lampLift } from './toyKids'
import { hatPlace } from './toyKing'
import { pieceAt } from './toyPieces'

// A thing is touched where it is drawn, in every state it can be in; and
// nothing a child reaches for lies under the jam's home control or in the
// grown-up's corner, at any size of surface.

describe('touched where it is drawn', () => {
  it('finds every thing at the place it is drawn now: at rest, afloat, hung, and on the king’s head', () => {
    const toy = new Toy(firstWorld(null), 1)
    cut(toy, 300, 700, 420, 690)
    scoop(toy, 200)
    for (const piece of toy.pieces) expect(pieceAt(toy, { x: piece.x, y: piece.y }), `${piece.kind} at rest`).toBe(piece)
    // A hat is on his head, and is taken from there: not from where the save has it lying.
    carry(toy, 560, 606, AT.king.x, AT.king.y - 300, 0.5)
    const hat = toy.pieces.find((p) => p.mode === 'hat')!
    const head = hatPlace(toy)
    expect(Math.hypot(hat.x - head.x, hat.y - head.y)).toBeLessThan(2)
    expect(pieceAt(toy, head)).toBe(hat)
    expect(pieceAt(toy, { x: hat.rest.x, y: hat.rest.y })).toBeNull()
  })

  it('finds a thing in the air where it is, not where it will land', () => {
    const toy = new Toy(firstWorld(null), 1)
    press(toy, 560, 606)
    moveTo(toy, 420, 180)
    letGo(toy)
    run(toy, 0.05)
    const block = toy.pieces.find((p) => p.len === 150)!
    expect(block.mode).toBe('fall')
    expect(pieceAt(toy, { x: block.x, y: block.y })).toBe(block)
    expect(pieceAt(toy, { x: block.rest.x, y: block.rest.y })).toBeNull()
  })

  it('finds each character where it is now: the king at home and on his seat, the frost children by day and by night, the bird on its perch', () => {
    const toy = new Toy({ ...bare(), blocks: [...bare().blocks, restOf('clear', 200, 400, ON_BANK_Y, 'built')] }, 1)
    expect(whoAt(toy, { x: AT.king.x, y: AT.king.y - 150 })).toBe('king')
    expect(whoAt(toy, { x: AT.lamp.x, y: AT.lamp.y - 80 })).toBe('lamp')
    expect(whoAt(toy, { x: AT.peeper.x, y: AT.peeper.y })).toBe('peeper')
    expect(whoAt(toy, { x: toy.bird.x, y: toy.bird.y })).toBe('bird')
    toNight(toy)
    // He sits on the long block now, drawn smaller: he is there, and no longer at his own place.
    expect(toy.king.where).toBe('seat')
    expect(whoAt(toy, { x: toy.king.x, y: toy.king.y - 80 })).toBe('king')
    expect(whoAt(toy, { x: AT.king.x, y: AT.king.y - 150 })).toBeNull()
    expect(whoAt(toy, { x: toy.kids.lamp.x, y: toy.kids.lamp.y - 80 })).toBe('lamp')
    expect(whoAt(toy, { x: toy.kids.peeper.x, y: toy.kids.peeper.y - 90 })).toBe('peeper')
    expect(whoAt(toy, { x: AT.lamp.x, y: AT.lamp.y - 200 })).toBeNull()
  })

  it('never takes ice the saw can cut for a character: a cut can start anywhere on the pond', () => {
    for (const night of [false, true]) {
      const toy = new Toy(bare(night), 1)
      for (let turn = 0; turn < Math.PI * 2; turn += 0.05) for (const share of [0.3, 0.7, 0.92]) {
        const x = POND.cx + Math.cos(turn) * POND.rx * share, y = POND.cy + Math.sin(turn) * POND.ry * share
        if (sawable(x, y)) expect(whoAt(toy, { x, y }), `at ${Math.round(x)}, ${Math.round(y)}`).toBeNull()
      }
    }
  })

  it('takes hold of the sun where it hangs by day and where its top half shows by night', () => {
    const day = new Toy(bare(), 1)
    press(day, SUN.x + 40, SUN.day + 30)
    expect(day.sunHand).not.toBeNull()
    const night = new Toy(bare(true), 1)
    press(night, SUN.x, SUN.night - 30)
    expect(night.sunHand).not.toBeNull()
    // Below the ridge there is no sun to take: that is snow.
    const under = new Toy(bare(true), 1)
    press(under, SUN.x, SUN.night + 40)
    expect(under.sunHand).toBeNull()
  })
})

describe('clear of the jam’s controls', () => {
  // The home control is a round 48 px button at the top centre, 10 px from the top; the grown-up's corner is the top right 72 by 72.
  const SIZES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [1366, 1024], [2048, 1536], [1600, 900], [844, 390], [667, 375], [390, 844], [768, 1024], [320, 568]]
  /** Whether a round target of stage radius `r` at a stage point reaches into a rectangle of the surface. */
  const reaches = (x: number, y: number, r: number, width: number, height: number, box: { x0: number; y0: number; x1: number; y1: number }): boolean => {
    const by = fit(width, height)
    const cx = by.x + x * by.scale, cy = by.y + y * by.scale, cr = r * by.scale
    return cx + cr > box.x0 && cx - cr < box.x1 && cy + cr > box.y0 && cy - cr < box.y1
  }

  it.each(SIZES)('on a surface of %i by %i nothing a child reaches for is under the home control or in the corner', (width, height) => {
    const home = { x0: width / 2 - 24, y0: 10, x1: width / 2 + 24, y1: 58 }, corner = { x0: width - CORNER, y0: 0, x1: width, y1: CORNER }
    const targets: [string, number, number, number][] = [
      ['the sun by day', SUN.x, SUN.day, SUN.r],
      ['the sun by night', SUN.x, SUN.night - 30, 30],
      ...BOUGH.map((root, i): [string, number, number, number] => [`icicle ${i}`, root.x, root.y + ICICLE / 2, 24]),
      ['the drift', DRIFT.cx, DRIFT.cy, DRIFT.rx],
      ['the king', AT.king.x, AT.king.y - 180, 120],
      ['the lamp child', AT.lamp.x, AT.lamp.y - 80, 90],
      ['the hare', harePose(0, -1).x, harePose(0, -1).y - 24, 46],
      ['the pond', POND.cx, POND.cy, POND.ry],
    ]
    for (const [name, x, y, r] of targets) {
      expect(reaches(x, y, r, width, height, home), `${name} under the home control`).toBe(false)
      expect(reaches(x, y, r, width, height, corner), `${name} in the corner`).toBe(false)
    }
  })

  it.each(SIZES)('on a surface of %i by %i a touch on the home control finds no character and no thing, with King Winter sat as high as he sits right under it', (width, height) => {
    const by = fit(width, height), short = height < 430
    const points: { x: number; y: number }[] = []
    for (let px = width / 2 - 24; px <= width / 2 + 24; px += 6) for (let py = 10; py <= 58; py += 6) points.push(toStage({ x: px, y: py }, by))
    const found = (toy: Toy): string[] => {
      const all = new Set<string>()
      for (const at of points) {
        const who = whoAt(toy, at), piece = pieceAt(toy, at)
        if (who) all.add(who)
        if (piece) all.add(piece.kind)
      }
      return [...all]
    }
    const watch = (toy: Toy, seconds: number): string[] => {
      const all = new Set<string>()
      for (let step = 0; step < Math.round(seconds * 60); step++) {
        run(toy, 1 / 60)
        for (const name of found(toy)) all.add(name)
      }
      return [...all]
    }
    // His highest seat, four rows up, right under the top centre.
    const seat = [0, 1, 2, 3].map((row) => restOf('clear', 150, STAGE.width / 2, ON_BANK_Y - row * BLOCK_H, 'built'))
    const toy = new Toy({ ...bare(true), blocks: [...bare(true).blocks, ...seat, restOf('cloudy', 70, 300, 620, 'lying')] }, 1)
    expect(toy.king).toMatchObject({ where: 'seat', x: STAGE.width / 2, y: ON_BANK_Y - 3 * BLOCK_H - BLOCK_H / 2 })
    expect(watch(toy, 3)).toEqual([])
    // Allowed, with a cap, on a surface under 430 px high only, where the control is 105 units wide and 127 deep:
    // the top edge of a hat on that seat, and his crown and his hat for the moment he stands up on it.
    const under = (stageY: number): number => 58 - (by.y + stageY * by.scale)
    drag(toy, 300, 620, toy.king.x + 10, toy.king.y - 220, 8)
    letGo(toy)
    const hat = toy.pieces.find((p) => p.kind === 'cloudy')!
    expect(hat.mode).toBe('hat')
    const worn = watch(toy, 3)
    expect(worn).toEqual(short ? ['cloudy'] : [])
    expect(under(hat.y - BLOCK_H / 2)).toBeLessThan(short ? 6 : 0)
    pullSun(toy, false)
    let crown = Infinity, hatTop = Infinity
    const stood = new Set<string>()
    for (let step = 0; step < 420; step++) {
      run(toy, 1 / 60)
      for (const name of found(toy)) stood.add(name)
      crown = Math.min(crown, toy.king.y - (368 - toy.king.sat * 90) * toy.king.scale)
      if (hat.mode === 'hat') hatTop = Math.min(hatTop, hat.y - BLOCK_H / 2)
    }
    expect([...stood].filter((name) => !short || (name !== 'king' && name !== 'cloudy'))).toEqual([])
    expect(under(crown)).toBeLessThan(short ? 19 : 0)
    expect(under(hatTop)).toBeLessThan(short ? 31 : 0)
  })

  it.each(SIZES)('on a surface of %i by %i the lamp child, jumping to rap on snow at the top of the highest tower right under the home control, stays clear of it', (width, height) => {
    const by = fit(width, height)
    // A lamp shut in at the top of the tower: snow under it, beside it and over it, and the snow over it is what the child raps.
    const at = (kind: 'snow' | 'clear', len: number, dx: number, row: number): ReturnType<typeof restOf> => restOf(kind, len, STAGE.width / 2 + dx, ON_BANK_Y - row * BLOCK_H, 'built')
    const tower = [at('snow', 200, 0, 6), ...[0, 1, 2, 3].map((row) => at('clear', 200, 0, row)), at('snow', 200, 0, 4), at('snow', 64, -68, 5), at('snow', 64, 68, 5)]
    const toy = new Toy({ ...bare(), blocks: [...bare().blocks, ...tower] }, 1)
    pullSun(toy, true)
    let highest = Infinity, rapped = false
    for (let step = 0; step < 40 * 60 && !(rapped && toy.lampWalk.length === 0 && toy.cast.lamp.what === null); step++) {
      run(toy, 1 / 60)
      rapped ||= toy.cast.lamp.what === 'knock'
      for (let px = width / 2 - 24; px <= width / 2 + 24; px += 8) for (let py = 10; py <= 58; py += 8) expect(whoAt(toy, toStage({ x: px, y: py }, by)), `step ${step}`).toBeNull()
      highest = Math.min(highest, toy.kids.lamp.y - 230 - lampLift(toy))
    }
    expect(rapped).toBe(true)
    expect(highest).toBeLessThan(260)
  })

  it.each(SIZES)('on a surface of %i by %i no thing comes to rest under the home control, however high the palace', (width, height) => {
    // A tower as high as the clearing lets one be, right under the top centre, and one more block carried to the very top of the sheet.
    const tower = [0, 1, 2, 3, 4, 5, 6, 7].map((row) => restOf('clear', 120, STAGE.width / 2, ON_BANK_Y - row * BLOCK_H, 'built'))
    const toy = new Toy({ ...firstWorld(null), blocks: [...firstWorld(null).blocks.filter((b) => b.place !== 'built'), ...tower] }, 1)
    carry(toy, 560, 606, STAGE.width / 2, 30)
    const home = { x0: width / 2 - 24, y0: 10, x1: width / 2 + 24, y1: 58 }
    const top = Math.min(...toy.pieces.filter((p) => p.rest.place === 'built').map((p) => p.rest.y))
    expect(top).toBeLessThan(160)
    expect(top).toBeGreaterThanOrEqual(CEILING_Y)
    for (const piece of toy.pieces) {
      const w = widthOf(piece) / 2
      for (const [x, y] of [[piece.rest.x - w, piece.rest.y - BLOCK_H / 2], [piece.rest.x + w, piece.rest.y - BLOCK_H / 2], [piece.rest.x, piece.rest.y - BLOCK_H / 2]]) {
        const by = fit(width, height), cx = by.x + x * by.scale, cy = by.y + y * by.scale
        expect(cx > home.x0 && cx < home.x1 && cy < home.y1, `${piece.kind} at ${piece.rest.x}, ${piece.rest.y}`).toBe(false)
      }
    }
    // And a touch under the control lands on sky, which is no thing.
    const under = toStage({ x: width / 2, y: 34 }, fit(width, height))
    expect(pieceAt(toy, under)).toBeNull()
  })
})
