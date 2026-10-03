import { describe, expect, it } from 'vitest'
import { vehicle } from './cycle'
import { Play } from './play'
import { silhouette } from './silhouette'
import { GRID_H, GRID_W, cellAt, tally, type Surface, type Tool } from './surface'
import { freshWash, washed } from './washState'

// The cloth and the mud. The lead saw, in play on a real machine, a cloth
// turn a whole vehicle brown: these tests rub as that wash did, in rows from
// top to bottom at the spacing a finger's rub is sampled at, and count.

const FRAME = 1 / 60

/** One rub with the tool in hand along every row, top to bottom, the finger moving a third of a patch at a time. */
function rubAll(play: Play, tool: Tool): void {
  if (play.hand !== tool) play.press({ kind: 'tool', tool })
  for (let t = 0; t < 1.5; t += FRAME) play.step(FRAME)
  const side = play.bay.def.side, cw = (side.x1 - side.x0) / GRID_W, ch = (side.y1 - side.y0) / GRID_H
  for (let row = GRID_H - 1; row >= 0; row--) {
    let down = false
    for (let fc = 0.5; fc < GRID_W; fc += 1 / 3) {
      const col = Math.floor(fc)
      if (play.bay.surface[cellAt(col, row)] === '.') continue
      const target = { kind: 'truck' as const, col, row, x: side.x0 + fc * cw, y: side.y0 + (row + 0.5) * ch }
      if (down) play.drag(target, 4)
      else play.press(target)
      down = true
      play.step(FRAME)
    }
    play.release()
    play.step(FRAME)
  }
}

function wait(play: Play, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) play.step(FRAME)
}

describe('the cloth and the mud', () => {
  it('the wash the lead scripted: sponge twice, hose twice, cloth twice over the whole tipper leaves it no browner than a few short smears', () => {
    const play = new Play(freshWash(4))
    expect(play.bay.def.id).toBe('tipper')
    // The first showing plays out first.
    wait(play, 6)
    rubAll(play, 'sponge')
    rubAll(play, 'sponge')
    rubAll(play, 'hose')
    rubAll(play, 'hose')
    // Where the hose only softened dried mud, soft mud is left.
    const left = tally(play.bay.surface).mud
    expect(left).toBeGreaterThan(0)
    rubAll(play, 'cloth')
    rubAll(play, 'cloth')
    const t = tally(play.bay.surface)
    // Each patch of soft mud can smear three patches along a rub and no further, however often the cloth passes.
    expect(t.mud, `brown patches after the cloth, of ${t.body}; ${left} before it`).toBeLessThanOrEqual(left * 4)
    expect(t.mud).toBeLessThan(t.body * 0.6)
  })

  it('one soft patch left on a shining vehicle: two passes of the cloth over everything leave four brown patches', () => {
    const fresh = { ...freshWash(null), shown: ['drip' as const] }
    const body = silhouette(vehicle(fresh.bay.who))
    const surface: Surface = body.map((patch) => (patch === '.' ? '.' : 'p'))
    // A patch in the middle of a full row, with body for three patches after it.
    const row = 3, col = [...Array(GRID_W).keys()].find((c) => [0, 1, 2, 3].every((d) => body[cellAt(c + d, row)] !== '.' && c + d < GRID_W))!
    surface[cellAt(col, row)] = 's'
    const play = new Play(washed(fresh, surface))
    rubAll(play, 'cloth')
    expect(tally(play.bay.surface).mud).toBe(4)
    rubAll(play, 'cloth')
    rubAll(play, 'cloth')
    expect(tally(play.bay.surface).mud).toBe(4)
    // The soft mud is still where it was, and the three after it are the smear.
    expect(play.bay.surface[cellAt(col, row)]).toBe('s')
  })
})
