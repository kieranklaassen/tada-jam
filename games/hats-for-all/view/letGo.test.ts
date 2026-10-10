import { describe, expect, it } from 'vitest'
import { Game } from '../game'
import { BODY } from '../sizes'
import { ROW_Z, TILE_Z, holeX, spotX } from '../stage'
import type { Saved } from '../save'
import { FoamStage } from './stage3d'

// Where a dragged thing is let go, on the scene as it is drawn at 1180 by 820
// with no renderer. A drag is an extra for this band, and counts when partly
// done (ART.md, "The band and its age rule"): let go over the open floor at
// least half way to a creature, it is finished for the child.

const saved: Saved = {
  v: 1, position: 'spare-hat', finished: false, seed: 5, shown: true,
  crew: [{ kind: 'bop', spot: 1, hats: [] }, { kind: 'lanky', spot: 3, hats: [] }], tile: ['cone', 'dome', 'brim'], loose: [], changes: [], guest: null, leaver: null, slips: 0,
}

function scene(): { game: Game; stage: FoamStage; hat: { x: number; y: number }; bop: { x: number; y: number }; lanky: { x: number; y: number } } {
  const game = new Game(saved), stage = new FoamStage()
  stage.resize(1180, 820)
  game.step(1 / 60)
  stage.update(game.play, null)
  return {
    game, stage,
    hat: stage.screenOf(holeX(0, 3), 0.5, TILE_Z),
    bop: stage.screenOf(spotX(1), BODY.bop.top / 2, ROW_Z),
    lanky: stage.screenOf(spotX(3), BODY.lanky.top / 2, ROW_Z),
  }
}

const between = (a: { x: number; y: number }, b: { x: number; y: number }, share: number): { x: number; y: number } => ({ x: a.x + (b.x - a.x) * share, y: a.y + (b.y - a.y) * share })

describe('a drag that is let go', () => {
  it('on a creature lands on it, with or without where it began', () => {
    const { game, stage, hat, bop } = scene()
    expect(stage.letGoAt(bop.x, bop.y, game.play, { type: 'hat', hat: 0 })).toEqual({ on: 'creature', who: 'bop' })
    expect(stage.letGoAt(bop.x, bop.y, game.play, { type: 'hat', hat: 0 }, hat)).toEqual({ on: 'creature', who: 'bop' })
  })

  it('counts when partly done: more than half way to a creature over the open floor, it is finished to that creature; less, and the hat lies where it was let go', () => {
    const { game, stage, hat, bop, lanky } = scene()
    const far = between(hat, bop, 0.62), short = between(hat, bop, 0.3)
    // Both points are open floor: with no word of where the drag began they are the floor.
    expect(stage.letGoAt(far.x, far.y, game.play, { type: 'hat', hat: 0 }).on).toBe('floor')
    expect(stage.letGoAt(far.x, far.y, game.play, { type: 'hat', hat: 0 }, hat)).toEqual({ on: 'creature', who: 'bop' })
    expect(stage.letGoAt(short.x, short.y, game.play, { type: 'hat', hat: 0 }, hat).on).not.toBe('creature')
    // And it is the creature the drag was going to, not another.
    const other = between(hat, lanky, 0.62)
    expect(stage.letGoAt(other.x, other.y, game.play, { type: 'hat', hat: 0 }, hat)).toEqual({ on: 'creature', who: 'lanky' })
  })

  it('counts only when it was plainly going there: to the side of the straight line, or past the creature, it is let go where it is', () => {
    const { game, stage, hat, bop, lanky } = scene()
    const long = Math.hypot(bop.x - hat.x, bop.y - hat.y), acrossX = -(bop.y - hat.y) / long, acrossY = (bop.x - hat.x) / long
    const on = between(hat, bop, 0.7)
    for (const side of [-1, 1]) {
      const wide = { x: on.x + side * acrossX * long * 0.35, y: on.y + side * acrossY * long * 0.35 }
      expect(stage.letGoAt(wide.x, wide.y, game.play, { type: 'hat', hat: 0 }, hat)).not.toEqual({ on: 'creature', who: 'bop' })
    }
    // A hat taken off a head and let go on the mat straight below it lies there: it goes to no neighbour, and not back.
    const head = stage.screenOf(spotX(1), BODY.bop.top + 0.4, ROW_Z), below = { x: head.x, y: head.y + 260 }
    expect(stage.letGoAt(below.x, below.y, game.play, { type: 'hat', hat: 0 }, head).on).toBe('floor')
    // And one carried to the front corner of the mat is nowhere near a head.
    expect(stage.letGoAt(30, 790, game.play, { type: 'hat', hat: 0 }, hat).on).toBe('floor')
    expect(lanky.x).toBeGreaterThan(bop.x)
  })

  it('away from every creature is on the floor, and over the tile is on the tile', () => {
    const { game, stage, hat } = scene()
    expect(stage.letGoAt(hat.x - 40, 800, game.play, { type: 'hat', hat: 0 }, hat).on).toBe('floor')
    const home = stage.screenOf(holeX(2, 3), 0.5, TILE_Z)
    expect(stage.letGoAt(home.x, home.y + 30, game.play, { type: 'hat', hat: 0 }, hat).on).toBe('tile')
  })

  it('and a pulled creature is never finished to itself', () => {
    const { game, stage, bop, lanky } = scene()
    const far = between(bop, lanky, 0.7)
    expect(stage.letGoAt(far.x, far.y, game.play, { type: 'creature', who: 'bop' }, bop)).toEqual({ on: 'creature', who: 'lanky' })
    const down = { x: bop.x, y: bop.y + 200 }
    expect(stage.letGoAt(down.x, down.y, game.play, { type: 'creature', who: 'bop' }, bop).on).not.toBe('creature')
  })
})
