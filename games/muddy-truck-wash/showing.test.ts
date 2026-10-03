import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { ROSTER, vehicle } from './cycle'
import { arrive, puddled } from './mud'
import { Play } from './play'
import { driedNosePatch, keptForShowing } from './showing'
import { silhouette } from './silhouette'
import { cellAt, decode, encode, tally, type Surface } from './surface'
import { foamHat } from './tastes'
import { freshWash, landedOnNext, throughPuddle, washed, type WashState } from './washState'

const FRAME = 1 / 60
function run(play: Play, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) play.step(FRAME)
}

describe('the dried patch on the nose that the first showing needs', () => {
  it.each(ROSTER.map((def) => [def.id, def] as const))('%s always rolls in with one at dried-patches, open to the sky', (_id, def) => {
    for (const seed of [1, 2, 3, 77, 20261003]) {
      const surface = arrive(silhouette(def), LADDER[1], seed)
      const patch = driedNosePatch(def, surface)
      expect(patch, `seed ${seed}`).not.toBeNull()
      expect(surface[cellAt(patch!.col, patch!.row)]).toBe('c')
      // Nothing of the body stands above it.
      for (let row = patch!.row + 1; row < 7; row++) expect(surface[cellAt(patch!.col, row)]).toBe('.')
    }
  })

  it('is not there on soft mud alone, or once the patch is wet', () => {
    const def = vehicle('tipper')
    expect(driedNosePatch(def, arrive(silhouette(def), LADDER[0], 5))).toBeNull()
    const surface = arrive(silhouette(def), LADDER[1], 5)
    const patch = driedNosePatch(def, surface)!
    const wet: Surface = surface.map((p, cell) => (cell % 12 <= patch.col + 3 && p === 'c' ? 's' : p))
    expect(driedNosePatch(def, wet)).toBeNull()
  })

  it.each(ROSTER.map((def) => [def.id, def] as const))('%s: until the showing has played, neither mud from the puddle nor thrown foam lands on it', (_id, def) => {
    const surface = arrive(silhouette(def), LADDER[1], 9)
    const patch = driedNosePatch(def, surface)!
    const cell = cellAt(patch.col, patch.row)
    const keep = keptForShowing(def, surface, [])
    expect(keep).toEqual([cell])
    const dipped = puddled(puddled(surface, 0, 4, keep), 1, 5, keep)
    expect(dipped[cell]).toBe('c')
    const hatted = foamHat(dipped, 40, keep)
    expect(hatted[cell]).toBe('c')
    // The foam still lands, on the patches beside it.
    expect(tally(hatted).f).toBe(4)
    expect(driedNosePatch(def, hatted)).toEqual(patch)
    // Once it has played, the patch is a patch like any other.
    expect(keptForShowing(def, surface, ['drip'])).toEqual([])
    expect(foamHat(surface, 40)[cell]).toBe('f')
  })

  it('in the save: two trips through the puddle leave the waiting vehicle its dried nose while the showing is to come', () => {
    const base = freshWash(null)
    const who = base.next.who, def = vehicle(who)
    const cells = arrive(silhouette(def), LADDER[1], 31)
    const patch = driedNosePatch(def, cells)!
    const waiting: WashState = { ...base, position: LADDER[1], next: { who, cells: encode(cells), dips: 0 } }
    const twice = throughPuddle(throughPuddle(waiting))
    expect(twice.next.dips).toBe(2)
    expect(decode(twice.next.cells)![cellAt(patch.col, patch.row)]).toBe('c')
    expect(tally(decode(twice.next.cells)!).s).toBeGreaterThan(tally(cells).s)
  })

  it('in play: puddled twice and hit by thrown foam, the first vehicle with dried mud still gets its showing when it rolls in', () => {
    const base = freshWash(null)
    const who = base.next.who, def = vehicle(who)
    const cells = arrive(silhouette(def), LADDER[1], 31)
    const patch = driedNosePatch(def, cells)!
    const cell = cellAt(patch.col, patch.row)
    // Tipper stands in the bay with foam on its bed, and the next vehicle waits with dried mud on its nose.
    const bay = silhouette(vehicle(base.bay.who)).map((p) => (p === '.' ? '.' : 'f')) as Surface
    const play = new Play({ ...washed(base, bay), position: LADDER[1], next: { who, cells: encode(cells), dips: 0 } })
    play.press({ kind: 'puddle' })
    run(play, 3.5)
    play.press({ kind: 'puddle' })
    run(play, 3.5)
    // The cloth on Tipper's nose: a sneeze that throws the foam on its bed over to the one that waits.
    play.press({ kind: 'tool', tool: 'cloth' })
    run(play, 1.5)
    const nose = play.bay.def.zones.nose
    const x = (nose.x0 + nose.x1) / 2, y = (nose.y0 + nose.y1) / 2
    play.press({ kind: 'truck', col: Math.floor(((x - play.bay.def.side.x0) / (play.bay.def.side.x1 - play.bay.def.side.x0)) * 12), row: Math.floor((y / play.bay.def.side.y1) * 7), x, y })
    play.release()
    run(play, 2)
    expect(tally(play.next.surface).f).toBeGreaterThan(0)
    expect(play.next.surface[cell]).toBe('c')
    expect(play.state.shown).toEqual([])
    // It rolls in, and the showing plays: marked and saved at its start, the patch soft at its end.
    play.press({ kind: 'next' })
    expect(play.state.shown).toEqual(['drip'])
    expect(decode(play.state.bay.cells)![cell]).toBe('s')
    expect(play.bay.surface[cell]).toBe('c')
    run(play, 12)
    expect(play.sceneRunning).toBe(false)
    expect(play.bay.surface[cell]).toBe('s')
    // What is seen has caught up with what was saved.
    expect(encode(play.bay.surface)).toBe(play.state.bay.cells)
  })
})

describe('landing foam', () => {
  it('goes into the save as it is given', () => {
    const base = freshWash(null)
    const hat = foamHat(decode(base.next.cells)!, 4)
    expect(landedOnNext(base, hat).next.cells).toBe(encode(hat))
  })
})
