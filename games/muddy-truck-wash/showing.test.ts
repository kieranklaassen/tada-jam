import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { ROSTER, vehicle } from './cycle'
import { arrive, puddled } from './mud'
import { Play } from './play'
import { LAYOUT } from './props'
import { driedNosePatch, keptForShowing } from './showing'
import { silhouette } from './silhouette'
import { cellAt, decode, encode, tally, type Surface } from './surface'
import { foamHat } from './tastes'
import { deserializeWash, freshWash, landedOnNext, serializeWash, throughPuddle, washed, type WashState } from './washState'

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
    // The foam still lands, on clean patches beside it, and on those only: no mud is turned to foam by being thrown at.
    expect(tally(hatted).f).toBeGreaterThan(0)
    expect(tally(hatted).f).toBeLessThanOrEqual(4)
    hatted.forEach((p, i) => { if (p !== dipped[i]) expect(['d', 'w', 'p'], `patch ${i}`).toContain(dipped[i]) })
    expect(tally(hatted).mud).toBe(tally(dipped).mud)
    expect(driedNosePatch(def, hatted)).toEqual(patch)
    // Once it has played nothing is kept back for it; thrown foam still does not land on its mud.
    expect(keptForShowing(def, surface, ['drip'])).toEqual([])
    expect(foamHat(surface, 40)[cell]).toBe('c')
    // The drop falls on mud and not on a lamp eye: the patch stands clear of both eyes, by more than the drop is wide, at the depth the tap hangs at.
    for (const eye of def.eyes) expect(Math.abs(patch.x - eye.at[0]) - eye.r, `${def.id}`).toBeGreaterThan(0.2)
    // The tap does hang over the near eye's depth, so standing clear of it along the vehicle is what keeps the drop off it.
    expect(Math.abs(LAYOUT.tap.z - def.eyes[0].at[2])).toBeLessThan(def.eyes[0].r)
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
    // It rolls in. The showing is a scene of its own after the roll-in: nothing of it is marked or saved while the roll-in plays.
    play.press({ kind: 'next' })
    run(play, 3)
    expect(play.sceneRunning).toBe(true)
    expect(play.state.shown).toEqual([])
    expect(decode(play.state.bay.cells)![cell]).toBe('c')
    // Then it starts: marked and saved at its start, the patch soft on the vehicle when the drop lands.
    run(play, 4)
    expect(play.sceneRunning).toBe(true)
    expect(play.state.shown).toEqual(['drip'])
    expect(decode(play.state.bay.cells)![cell]).toBe('s')
    expect(play.bay.surface[cell]).toBe('c')
    run(play, 6)
    expect(play.sceneRunning).toBe(false)
    expect(play.bay.surface[cell]).toBe('s')
    // What is seen has caught up with what was saved, and the foam that was thrown at it is still on it.
    expect(encode(play.bay.surface)).toBe(play.state.bay.cells)
    expect(tally(play.bay.surface).f).toBeGreaterThan(0)
  })

  it('in play: a send-off cut short by a touch, or a put-away in the middle of it, does not lose the showing', () => {
    const make = (): { play: Play; cell: number } => {
      const base = freshWash(null)
      const who = base.next.who, def = vehicle(who)
      const cells = arrive(silhouette(def), LADDER[1], 31)
      const patch = driedNosePatch(def, cells)!
      return { play: new Play({ ...base, position: LADDER[1], next: { who, cells: encode(cells), dips: 0 } }), cell: cellAt(patch.col, patch.row) }
    }
    // A touch on nothing two seconds into the send-off ends it; the showing starts straight after, and plays.
    const cut = make()
    cut.play.press({ kind: 'next' })
    run(cut.play, 2)
    expect(cut.play.state.shown).toEqual([])
    cut.play.press({ kind: 'none' })
    cut.play.release()
    expect(cut.play.sceneRunning).toBe(true)
    expect(cut.play.state.shown).toEqual(['drip'])
    run(cut.play, 6)
    expect(cut.play.bay.surface[cut.cell]).toBe('s')
    // Put away two seconds into the send-off: on return the vehicle stands in the bay with its dried patch, and the showing plays then.
    const away = make()
    away.play.press({ kind: 'next' })
    run(away.play, 2)
    const back = new Play(deserializeWash(JSON.parse(JSON.stringify(serializeWash(away.play.state))), null))
    expect(back.state.shown).toEqual([])
    expect(back.bay.surface[away.cell]).toBe('c')
    run(back, 0.1)
    expect(back.sceneRunning).toBe(true)
    expect(back.state.shown).toEqual(['drip'])
    run(back, 6)
    expect(back.sceneRunning).toBe(false)
    expect(back.bay.surface[away.cell]).toBe('s')
    // A touch with the hose on the very patch, cutting the send-off short: the showing starts in its place, and the patch is
    // dried still until the showing's own drop lands, so the child sees water soften it before the child's own hose does.
    const hosed = make()
    hosed.play.press({ kind: 'tool', tool: 'hose' })
    hosed.play.press({ kind: 'next' })
    run(hosed.play, 2)
    const def = hosed.play.bay.def, at = driedNosePatch(def, hosed.play.bay.surface)!
    hosed.play.press({ kind: 'truck', col: at.col, row: at.row, x: at.x, y: at.y })
    hosed.play.release()
    expect(hosed.play.sceneRunning).toBe(true)
    expect(hosed.play.state.shown).toEqual(['drip'])
    expect(hosed.play.bay.surface[hosed.cell]).toBe('c')
    run(hosed.play, 6)
    expect(hosed.play.bay.surface[hosed.cell]).toBe('s')
    // A tap on the vehicle a second into the showing ends the showing, as any touch ends a scene: it is not taken for a second tap at the door.
    const tapped = make()
    tapped.play.press({ kind: 'next' })
    run(tapped.play, 0.3)
    tapped.play.press({ kind: 'none' })
    tapped.play.release()
    expect(tapped.play.sceneRunning).toBe(true)
    run(tapped.play, 0.4)
    tapped.play.press({ kind: 'truck', col: 6, row: 2, x: 0.2, y: 1.0 })
    expect(tapped.play.sceneRunning).toBe(false)
    expect(tapped.play.bay.surface[tapped.cell]).toBe('s')
    // And once it has played it does not play again.
    const again = new Play(deserializeWash(JSON.parse(JSON.stringify(serializeWash(back.state))), null))
    run(again, 1)
    expect(again.sceneRunning).toBe(false)
  })
})

describe('landing foam', () => {
  it('goes into the save as it is given', () => {
    const base = freshWash(null)
    const hat = foamHat(decode(base.next.cells)!, 4)
    expect(landedOnNext(base, hat).next.cells).toBe(encode(hat))
  })
})
