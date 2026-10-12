import { describe, expect, it } from 'vitest'
import { CASES, perform } from './cases'
import { goneShare, isGone } from './face'
import { FIRED, ON_FLOOR, ON_HEAP, ON_RUG, freshFort } from './fortState'
import { SEAM_REACH } from './hands'
import { BOARD, CELL, FLAP, FRONT_Z, kindOf, type Vec } from './layout'
import { ON_CLOTH, TORSO, babyDraw, catDraw, clothTop, granDraw, onTorso, reaches } from './people'
import { restCushion } from './rest'
import { FRAME, drag, dragAndLift, first, heard, hole, middle, onFace, playOf, px, reopened, run, stored, tap } from './testing'
import { CLOSE_S, HANG_S, MOST_PIECES, TIP_LANDS, TIP_S, type Cue } from './toy'

// What the second fresh reading and the second audit run asked for, each as a test that fails when the fix is
// taken out. Everything a finger does here goes the way a finger goes: through play.ts, by pointer id and
// surface pixel. No fort here is set up by hand where a finger can build it.

type P = ReturnType<typeof first>
type Point = readonly [number, number]
const sounds = (cues: readonly Cue[]): string[] => cues.map((cue) => cue.sound)
const room = (play: P, x: number, y: number): [number, number] => px(play, { x, y, z: FRONT_Z })
const flapOf = (play: P, id: number): [number, number] => middle(play, 'flap', (target) => target.kind === 'flap' && target.id === id)
/** The lid of a box to the right of where the cat sits on it. */
function lidRight(play: P, id: number): [number, number] {
  const rect = play.toy.rect(id)!
  return px(play, { x: rect.x + 0.33, y: rect.foot + rect.h + FLAP / 2, z: FRONT_Z - kindOf(id).d + 0.03 })
}
const cushionOf = (play: P, index: number): [number, number] => middle(play, 'cushion', (target) => target.kind === 'cushion' && target.index === index)
/** How far a point of the surface moves when the place under it moves `dx` along the rug, in the plane of the faces. */
const along = (play: P, dx: number): number => room(play, dx, 0)[0] - room(play, 0, 0)[0]
/** Takes what lies at `from`, carries it by each of `to`, lets go, and plays until it has been set down. */
function carry(play: P, from: Point, ...to: Point[]): Cue[] {
  return [...dragAndLift(play, [from, ...to]), ...run(play, HANG_S + 0.05)]
}
/** A square cut in a face, in cells, closed by coming back to where it began; the finger lifts. */
function cutSquare(play: P, id: number, x0: number, y0: number, x1: number, y1: number): Cue[] {
  return dragAndLift(play, [onFace(play, id, x0, y0), onFace(play, id, x1, y0), onFace(play, id, x1, y1), onFace(play, id, x0, y1), onFace(play, id, x0 + 1, y0 + 2)])
}
/** A first visit with the small box standing on the big one, as a finger would have put it. */
function stacked(): P {
  const play = first(4)
  const lid = flapOf(play, 3)
  carry(play, lid, [lid[0] + along(play, -1.65), lid[1] - 40])
  run(play, 1.5)
  if (play.toy.state.boxes[3].on !== 0) throw new Error('the small box did not go onto the big one')
  return play
}

/** Half of a cushion that stands leaning, from front to back. */
const CUSHION_DEEP = 0.11

describe('the cat and the cushions in the box it looks out of', () => {
  /** A first visit with a hole cut in the big box and two cushions pushed in through it. */
  function cushioned(): P {
    const play = playOf((() => { const state = freshFort(null); hole(state, 0, 120, 20, 160, 60); return state })())
    for (const index of [0, 1]) { carry(play, cushionOf(play, index), onFace(play, 0, 140, 40)); run(play, 1) }
    expect(play.toy.state.cushions).toEqual([0, 0, -1])
    return play
  }
  /** Plays on, and holds at every frame that each cushion in the cat's box is behind its head, and that no cushion jumps. */
  function watch(play: P, seconds: number, found: { frames: number; shifted: number; cues: Cue[] }): void {
    const toy = play.toy
    let before = [0, 1].map((index) => toy.poseOf(`cushion:${index}`).z)
    for (let t = 0; t < seconds; t += FRAME) {
      play.step(FRAME)
      found.cues.push(...heard(play))
      const cat = catDraw(toy), stage = toy.shows.cat.stage, now = [0, 1].map((index) => toy.poseOf(`cushion:${index}`).z)
      now.forEach((z, index) => { if (toy.hand?.id !== index) { expect(Math.abs(z - before[index]), `cushion ${index} at ${toy.time.toFixed(2)} s`).toBeLessThan(0.05); found.shifted += Math.abs(z - before[index]) } })
      before = now
      if (!cat.head.show || cat.body.show || !['rise', 'look', 'back', 'in'].includes(stage)) continue
      found.frames++
      for (const index of [0, 1]) if (toy.state.cushions[index] === toy.shows.cat.box && toy.hand?.id !== index) expect(now[index] + CUSHION_DEEP, `cushion ${index} and the cat's head at ${toy.time.toFixed(2)} s (${stage})`).toBeLessThan(cat.head.z - 0.03)
    }
  }

  it('lie behind its head for as long as it is at a hole of that box, at a hole of every size, and are seen and heard to go there and to come back', () => {
    // A hole its head comes out of, a peep-hole it puts an eye to, and a hole it walks in at.
    const holes: ((play: P) => Cue[])[] = [(play) => cutSquare(play, 0, 30, 70, 80, 120), (play) => [...tap(play, onFace(play, 0, 60, 100)), ...heard(play)], (play) => cutSquare(play, 0, 20, 64, 84, 124)]
    holes.forEach((make, n) => {
      const play = cushioned(), toy = play.toy, found = { frames: 0, shifted: 0, cues: [] as Cue[] }
      const rest = toy.poseOf('cushion:0').z
      found.cues.push(...make(play))
      watch(play, 5, found)
      expect(toy.state.cat).toMatchObject({ at: 'look', box: 0 })
      expect(found.frames, `hole ${n}`).toBeGreaterThan(60)
      expect(toy.poseOf('cushion:0').z).toBeLessThan(rest - 0.2)
      expect(sounds(found.cues)).toContain('puff')
      // Touched at its hole it goes back up, and only then do they come forward again.
      tap(play, middle(play, 'cat'))
      watch(play, 3, found)
      expect(toy.state.cat.at).toBe('top')
      expect(toy.poseOf('cushion:0').z).toBeCloseTo(rest, 5)
      if (n < 2) return
      // Touched again it walks in at the big hole, and they are behind it in there too.
      const frames = found.frames
      tap(play, middle(play, 'cat'))
      watch(play, 5, found)
      expect(toy.state.cat).toMatchObject({ at: 'in', box: 0 })
      expect(found.frames - frames).toBeGreaterThan(60)
    })
  })

  it('are never further back than their box is deep, two in the smallest box with the cat at its hole', () => {
    const state = freshFort(null)
    hole(state, 3, 30, 14, 64, 48)
    state.cushions = [3, 3, -1]
    state.cat = { at: 'look', box: 3, cell: 30 * kindOf(3).cols + 46 }
    const back = FRONT_Z - kindOf(3).d + BOARD, first = restCushion(state, 0).z, second = restCushion(state, 1).z
    expect(second - CUSHION_DEEP).toBeGreaterThan(back)
    // And the two are never in one plane.
    expect(first - second).toBeGreaterThan(0.09)
  })

  it('draws back and goes up onto the lid when a cushion is taken out of that box past it', () => {
    const play = cushioned(), toy = play.toy
    cutSquare(play, 0, 30, 70, 80, 120)
    run(play, 5)
    expect(toy.state.cat).toMatchObject({ at: 'look', box: 0 })
    // The second cushion shows at the first hole: a finger takes it there.
    play.down(1, ...onFace(play, 0, 140, 40))
    const landed = heard(play)
    expect(toy.hand).toMatchObject({ kind: 'cushion', id: 1 })
    expect(toy.state.cat.at).toBe('top')
    expect(sounds(landed)).toEqual(expect.arrayContaining(['puff', 'mrrp']))
    expect(toy.shows.cat.stage).toBe('back')
    // Its head is behind the board again before the cushion has been carried a hand's width.
    const found = { frames: 0, shifted: 0, cues: [] as Cue[] }
    watch(play, 0.3, found)
    expect(catDraw(toy).head.z).toBeLessThan(FRONT_Z - 0.05)
    play.up(1, ...room(play, 0.9, 0.1))
    run(play, 2)
    expect(toy.state.cushions).toEqual([0, ON_FLOOR, -1])
  })
})

describe('the cat on a lid the blanket lies over', () => {
  it('sits on the cloth, not in it: through the landing of the roof and its ripple, and through every idle after', () => {
    const play = first(), toy = play.toy
    carry(play, middle(play, 'blanket'), room(play, 0.2, 2))
    expect([...toy.state.blanket].sort()).toEqual([0, 3])
    let on = 0
    for (let t = 0; t < 30; t += FRAME) {
      play.step(FRAME)
      heard(play)
      const cat = catDraw(toy)
      if (!cat.body.show) continue
      const top = clothTop(toy, cat.body.x, cat.body.z)
      // Out in front of the faces on its hop round, or with the cloth still high over it, it is not on the cloth.
      if (top === null || top > cat.body.y + ON_CLOTH.within) continue
      on++
      expect(cat.body.y, `at ${toy.time.toFixed(2)} s`).toBeGreaterThanOrEqual(top + ON_CLOTH.clear - 1e-9)
    }
    expect(toy.state.cat.at).toBe('top')
    expect(on).toBeGreaterThan(1500)
  })
})

describe('a cushion let go on an opening', () => {
  it('goes in where a cushion already shows if there is room, and is fired out of a full box: it never flops on the rug as if it had missed', () => {
    const play = playOf((() => { const state = freshFort(null); hole(state, 0, 40, 20, 160, 70); return state })()), toy = play.toy
    carry(play, cushionOf(play, 0), onFace(play, 0, 100, 45))
    run(play, 1)
    expect(toy.state.cushions).toEqual([0, -1, -1])
    // The first one shows at the left of the opening: the second is let go on it.
    const shows = onFace(play, 0, 53, 40)
    drag(play, [cushionOf(play, 1), shows])
    expect(play.toy.hand?.kind).toBe('cushion')
    play.up(1, ...shows)
    expect(toy.hand?.over).toEqual({ kind: 'cushion', index: 0 })
    const second = run(play, 1.2)
    expect(toy.state.cushions).toEqual([0, 0, -1])
    expect(sounds(second)).toContain('whumpf')
    // The third, let go where a cushion shows in a box that is full: the box bulges and fires it out.
    const third = [...carry(play, cushionOf(play, 2), onFace(play, 0, 60, 40)), ...run(play, 2)]
    expect(toy.state.cushions).toEqual([0, 0, FIRED])
    expect(sounds(third)).toEqual(expect.arrayContaining(['stretch', 'poomf']))
    expect(toy.state.cushions).not.toContain(ON_FLOOR)
  })
})

describe('a tap beside a line that waits', () => {
  const threeSides = (play: P): [number, number][] => [onFace(play, 0, 100, 40), onFace(play, 0, 150, 40), onFace(play, 0, 150, 90), onFace(play, 0, 100, 90)]

  it('pokes a peep-hole like any other tap, and the line still waits; only a drag that starts there takes the line up', () => {
    const play = first(), toy = play.toy
    dragAndLift(play, threeSides(play))
    run(play, 1)
    const kept = JSON.stringify(toy.state.line)
    expect(toy.state.line?.box).toBe(0)
    // A tap a hand's width from the end of the line.
    const landed = tap(play, onFace(play, 0, 104, 96))
    expect(sounds(landed)).toEqual(['bite'])
    expect(sounds(heard(play))).toContain('pop')
    expect(toy.piece?.disc).toBe(true)
    expect(isGone(toy.state.boxes[0].face, 104, 96)).toBe(true)
    expect(JSON.stringify(toy.state.line)).toBe(kept)
    run(play, 6)
    expect(JSON.stringify(toy.state.line)).toBe(kept)
    // A tap that slips a little is still a tap.
    play.down(1, ...onFace(play, 0, 96, 84))
    const [x, y] = onFace(play, 0, 96, 84)
    play.move(1, x + 6, y + 4)
    play.up(1, x + 6, y + 4)
    expect(JSON.stringify(toy.state.line)).toBe(kept)
    run(play, 6)
    // A drag that starts within reach of the end takes the line up from there, and it closes where it began.
    const gone = goneShare(toy.state.boxes[0].face)
    dragAndLift(play, [onFace(play, 0, 108, 88), onFace(play, 0, 102, 60), onFace(play, 0, 100, 43)])
    expect(toy.state.line).toBeNull()
    expect(goneShare(toy.state.boxes[0].face)).toBeGreaterThan(gone + 0.08)
  })
})

describe('the simplest move of a first visit at four', () => {
  it('puts the small box on the big one: dragged by its lid and let go with the finger over the big box, at any height', () => {
    // Straight across at the height of its lid, down against the face of the big box, and up over it.
    for (const [dx, dy] of [[-0.7, 0], [-1.1, 0.5], [-1.6, 0.9], [-0.9, -1.2], [-1.9, -1.9]]) {
      const play = first(4), toy = play.toy, lid = flapOf(play, 3)
      const cues = dragAndLift(play, [lid, [lid[0] + along(play, dx), lid[1] + along(play, dy)]])
      // It goes up and over onto the big box, never through it: while any of it is over the big box, its foot is no lower than that box's top.
      const big = toy.rect(0)!
      for (let t = 0; t < HANG_S + 1.5; t += FRAME) {
        play.step(FRAME)
        cues.push(...heard(play))
        const pose = toy.poseOf('box:3'), over = Math.min(pose.x + kindOf(3).w / 2, big.x + big.w / 2) - Math.max(pose.x - kindOf(3).w / 2, big.x - big.w / 2)
        if (over > 0.02) expect(pose.y, `let go ${dx} m along and ${dy} m down, at ${toy.time.toFixed(2)} s`).toBeGreaterThan(big.foot + big.h - 0.02)
      }
      expect(toy.state.boxes[3], `let go ${dx} m along and ${dy} m down`).toMatchObject({ on: 0, side: false })
      expect(sounds(cues)).toContain('thump')
      // And it stands squarely there, wholly on the big box.
      const top = toy.rect(3)!, below = toy.rect(0)!
      expect(top.x - top.w / 2).toBeGreaterThanOrEqual(below.x - below.w / 2 - 1e-6)
      expect(top.x + top.w / 2).toBeLessThanOrEqual(below.x + below.w / 2 + 1e-6)
    }
  })

  it('lets it be put down again somewhere else: off the big box it stands on the rug, and on the big box anywhere along it', () => {
    const play = stacked(), toy = play.toy, lid = lidRight(play, 3)
    const was = toy.state.boxes[3].x
    carry(play, lid, [lid[0] + along(play, -0.7), lid[1]])
    run(play, 1.5)
    expect(toy.state.boxes[3].on).toBe(0)
    expect(Math.abs(toy.state.boxes[3].x - was)).toBeGreaterThan(40)
    const again = lidRight(play, 3)
    carry(play, again, [again[0] + along(play, 1.9), again[1]], [again[0] + along(play, 1.9), again[1] + along(play, 1.4)])
    run(play, 1.5)
    expect(toy.state.boxes[3]).toMatchObject({ on: ON_RUG, side: false })
  })

  it('never sends a box back while a box that can bear it stands: with no room on the rug it goes onto the big box', () => {
    // The two boxes of a first visit fill the rug. The small box on top of the heap goes onto the small one that stands. The next is a middling one, let go low over the two small ones, which cannot bear it.
    const play = first(4), toy = play.toy
    carry(play, middle(play, 'heap'), room(play, 1.3, 0.5))
    run(play, 1.5)
    expect(toy.state.boxes[4]).toMatchObject({ on: 3, side: false })
    const cues = [...carry(play, middle(play, 'heap'), room(play, 1.3, 0.5)), ...run(play, 1.5)]
    expect(toy.state.boxes[1]).toMatchObject({ on: 0, side: false })
    expect(sounds(cues)).toContain('thump')
  })

  it('keeps the way back for a place where truly nothing can stand: a box off the heap with the rug full and no box that can bear it', () => {
    const play = first(4), toy = play.toy
    // The small box off the heap goes onto the small one, and a middling box onto the big one. The last is as wide as that, too wide for a small box, and too high for the room on top.
    carry(play, middle(play, 'heap'), room(play, 1.3, 0.5))
    run(play, 1.5)
    carry(play, middle(play, 'heap'), room(play, -0.3, 0.5))
    run(play, 1.5)
    expect(toy.state.boxes[4]).toMatchObject({ on: 3, side: false })
    expect(toy.state.boxes[1]).toMatchObject({ on: 0, side: false })
    const before = JSON.stringify(stored(toy.state))
    for (const [x, y] of [[1.3, 0.5], [-0.3, 2.5], [0.2, 1.2]]) {
      const cues = [...carry(play, middle(play, 'heap'), room(play, x, y)), ...run(play, 1.5)]
      expect(JSON.stringify(stored(toy.state)), `let go at ${x}, ${y}`).toBe(before)
      // It is seen and heard to go back and fold.
      expect(sounds(cues)).toContain('fold')
    }
  })
})

describe('a box let go beside the grandmother in the box she wears', () => {
  it('stays on its side of her: it is not sent over her head to the box the finger is over', () => {
    const play = first(), toy = play.toy
    tap(play, middle(play, 'gran'))
    run(play, 7)
    expect(toy.state.gran).toEqual({ at: 'skirt', box: 3 })
    const hers = toy.rect(3)!
    // Off the heap, up towards her, and on with the finger to over the big box: the box is kept to her right.
    dragAndLift(play, [middle(play, 'heap'), room(play, 1.3, 2.2), room(play, 0.4, 2.2)])
    const id = toy.hand!.id, half = kindOf(id).w / 2
    expect(toy.poseOf(`box:${id}`).x - half).toBeGreaterThanOrEqual(hers.x + hers.w / 2 - 1e-6)
    let frames = 0
    for (let t = 0; t < HANG_S + 2; t += FRAME) {
      play.step(FRAME)
      heard(play)
      const pose = toy.poseOf(`box:${id}`)
      // Wherever it goes from there, it is never over her or beyond her.
      frames++
      expect(pose.x, `at ${toy.time.toFixed(2)} s`).toBeGreaterThan(hers.x + 0.1)
    }
    expect(frames).toBeGreaterThan(100)
    // With no room on her side of the rug it folds back onto the heap it came from.
    expect(toy.state.boxes[id].on).toBe(ON_HEAP)
    expect(toy.state.gran).toEqual({ at: 'skirt', box: 3 })
  })
})

describe('tape let go along a seam', () => {
  const taped = (play: P, at: Vec): number => { carry(play, middle(play, 'roll'), px(play, at)); run(play, 1); return play.toy.state.tapes.length }

  it('holds the seam under a stacked box anywhere along its length and a finger\'s width to either side, and no further', () => {
    // The seam is as long as the small box is wide, on top of the big one.
    const seam = (() => { const upper = stacked().toy.rect(3)!; return { left: upper.x - upper.w / 2, right: upper.x + upper.w / 2, y: upper.foot } })()
    expect(seam.y).toBeCloseTo(1.6, 5)
    const near = SEAM_REACH - 0.05, far = SEAM_REACH + 0.08
    for (const [x, y] of [[seam.right - 0.05, seam.y + near], [seam.left + 0.05, seam.y - near], [(seam.left + seam.right) / 2, seam.y], [seam.right + near, seam.y - 0.1], [seam.left - near, seam.y + 0.05]]) expect(taped(stacked(), { x, y, z: FRONT_Z }), `let go at ${x}, ${y}`).toBe(1)
    for (const [x, y] of [[seam.right + far, seam.y - 0.1], [(seam.left + seam.right) / 2, seam.y - far], [seam.left - far, seam.y + 0.05]]) expect(taped(stacked(), { x, y, z: FRONT_Z }), `let go at ${x}, ${y}`).toBe(0)
  })

  it('holds the seam between two boxes side by side from the rug to the top of the lower one', () => {
    // The seam of a first visit stands at 0.75 along the rug, and is 0.8 m high.
    for (const [x, y] of [[0.93, 0.06], [0.57, 0.76], [0.75, 0.4], [0.8, 0.98]]) expect(taped(first(4), { x, y, z: FRONT_Z }), `let go at ${x}, ${y}`).toBe(1)
    expect(taped(first(4), { x: 0.75, y: 0.8 + SEAM_REACH + 0.1, z: FRONT_Z })).toBe(0)
  })
})

describe('a box that tips', () => {
  it('lands in three knocks, each lower, and each is the box coming down: on its edge, over onto its side, and to rest', () => {
    const play = playOf(freshFort(8)), toy = play.toy
    dragAndLift(play, [middle(play, 'heap'), room(play, 1.05, 2.4)])
    const knocks: { pitch: number; up: number }[] = [], between: number[] = [0, 0, 0]
    let tipped = -1
    for (let t = 0; t < HANG_S + TIP_S + 0.5; t += FRAME) {
      play.step(FRAME)
      const box = toy.state.boxes.find((one) => one.side)
      if (box && tipped < 0) tipped = box.id
      if (tipped < 0) { heard(play); continue }
      const up = toy.poseOf(`box:${tipped}`).y - toy.restOf(`box:${tipped}`).y
      for (const cue of heard(play)) if (cue.sound === 'knock') knocks.push({ pitch: cue.pitch, up })
      if (knocks.length < 3) between[knocks.length] = Math.max(between[knocks.length], up)
    }
    expect(TIP_LANDS).toHaveLength(3)
    expect(knocks).toHaveLength(3)
    expect(knocks[0].pitch).toBeGreaterThan(knocks[1].pitch)
    expect(knocks[1].pitch).toBeGreaterThan(knocks[2].pitch)
    // At each knock it is down, and between two knocks it has been up off the rug, less each time.
    for (const knock of knocks) expect(Math.abs(knock.up)).toBeLessThan(0.02)
    expect(between[1]).toBeGreaterThan(0.05)
    expect(between[2]).toBeGreaterThan(0.02)
    expect(between[1]).toBeGreaterThan(between[2])
    expect(toy.poseOf(`box:${tipped}`).side).toBe(1)
  })

  it('with a line waiting on its face has that line closed before it goes over: the cat gets off, the blades are seen and heard to run the line shut where the box hangs, and its piece falls from there', () => {
    const play = stacked(), toy = play.toy
    dragAndLift(play, [onFace(play, 3, 20, 20), onFace(play, 3, 60, 20), onFace(play, 3, 60, 50), onFace(play, 3, 24, 50)])
    run(play, 2)
    expect(toy.state.line?.box).toBe(3)
    expect(goneShare(toy.state.boxes[3].face)).toBe(0)
    expect(toy.state.cat.at).toBe('top')
    // Carried half off the big box by its lid and let go there.
    const lid = lidRight(play, 3)
    dragAndLift(play, [lid, [lid[0] + along(play, 0.8), lid[1]]])
    const hung = toy.poseOf('box:3')
    const cues: Cue[] = []
    let waits = 0, shut = 0, bitten = -1, tipsAt = -1, hovered = false
    for (let t = 0; t < HANG_S + 3; t += FRAME) {
      play.step(FRAME)
      const now = heard(play)
      cues.push(...now)
      if (toy.state.line) continue
      if (now.some((cue) => cue.sound === 'bite')) bitten = toy.time
      if (bitten > 0 && toy.scissors.mode === 'hover') hovered = true
      const pose = toy.poseOf('box:3'), hangs = Math.abs(pose.x - hung.x) + Math.abs(pose.y - hung.y) + pose.side < 1e-6
      if (!hangs && tipsAt < 0) tipsAt = toy.time
      if (toy.closing) {
        // In the save the line is closed and the hole is in the face. On the face the line is still drawn, the box hangs, and the cat is getting off it.
        waits++
        expect(hangs).toBe(true)
        expect(toy.closing.stroke.box).toBe(3)
        expect(goneShare(toy.state.boxes[3].face)).toBeGreaterThan(0.1)
        expect(toy.recut.has(3)).toBe(false)
        expect(toy.piece).toBeNull()
      } else if (toy.scissors.mode === 'closing') {
        // The blades run it shut on the face where it hangs, and by then no part of the cat is at that box.
        shut++
        expect(hangs).toBe(true)
        expect(Math.abs(toy.scissors.at.x - hung.x)).toBeLessThan(kindOf(3).w / 2)
        expect(toy.scissors.at.y).toBeGreaterThan(hung.y)
        expect(toy.piece).toMatchObject({ box: 3, hung: { x: hung.x, foot: hung.y } })
        const cat = catDraw(toy)
        expect(toy.shows.cat.stage).not.toBe('hop')
        expect(Math.hypot(cat.body.x - toy.scissors.at.x, cat.body.y - toy.scissors.at.y)).toBeGreaterThan(0.9)
      }
    }
    expect(waits).toBeGreaterThan(20)
    expect(shut).toBeGreaterThan(10)
    expect(bitten).toBeGreaterThan(0)
    // It goes over only once the blades have run the line shut.
    expect(tipsAt).toBeGreaterThanOrEqual(bitten + CLOSE_S - FRAME)
    expect(sounds(cues)).toEqual(expect.arrayContaining(['bite', 'snip', 'slap']))
    expect(sounds(cues).filter((sound) => sound === 'knock')).toHaveLength(3)
    expect(toy.state.boxes[3]).toMatchObject({ on: ON_RUG, side: true })
    // The scissors do not wait in the air where the box hung: they go home as soon as the line is shut.
    expect(hovered).toBe(false)
    expect(['home', 'rest']).toContain(toy.scissors.mode)
    // Nothing is left to fall later from a face that shows no line.
    tap(play, onFace(play, 0, 40, 40))
    run(play, 1)
    expect(toy.piece?.box).toBe(0)
  })

  it('with a line waiting on its face is found, at any instant of that, with the line closed and the hole in the face', () => {
    for (const stop of [0.05, 0.3, 0.6, 0.9]) {
      const play = stacked(), toy = play.toy
      dragAndLift(play, [onFace(play, 3, 20, 20), onFace(play, 3, 60, 20), onFace(play, 3, 60, 50), onFace(play, 3, 24, 50)])
      run(play, 2)
      const lid = lidRight(play, 3)
      dragAndLift(play, [lid, [lid[0] + along(play, 0.8), lid[1]]])
      run(play, HANG_S + stop)
      const next = reopened(play)
      expect(next.toy.state.line).toBeNull()
      expect(next.toy.state.boxes[3]).toMatchObject({ on: ON_RUG, side: true })
      expect(goneShare(next.toy.state.boxes[3].face)).toBeGreaterThan(0.1)
      // And put away and found in one visit, the face shows what the save holds.
      toy.settle()
      expect(toy.closing).toBeNull()
      expect(toy.recut.has(3)).toBe(true)
    }
  })
})

describe('the cat on the lid of a box that tips', () => {
  /** The big box of a first visit, taken by its lid to the right of the cat, carried up and over the small box and let go there. */
  function tipped(): P {
    const play = first(4), toy = play.toy, lid = lidRight(play, 0)
    expect(toy.state.cat.at).toBe('top')
    dragAndLift(play, [lid, [lid[0], lid[1] - along(play, 1.4)], [lid[0] + along(play, 1.65), lid[1] - along(play, 1.4)]])
    expect(toy.hand).toMatchObject({ kind: 'box', id: 0 })
    run(play, HANG_S - FRAME)
    return play
  }

  it('does not ride it over: where that box would still be the highest thing, the cat jumps down onto the rug, and the box waits until it is off', () => {
    const play = tipped(), toy = play.toy
    const hung = toy.poseOf('box:0')
    let turning = 0, waits = 0, landed = false
    const cues: Cue[] = []
    for (let t = 0; t < 3; t += FRAME) {
      play.step(FRAME)
      cues.push(...heard(play))
      if (toy.hand) continue
      const pose = toy.poseOf('box:0'), stage = toy.shows.cat.stage
      if (pose.side > 0.999) { landed = true; continue }
      if (Math.abs(pose.x - hung.x) + Math.abs(pose.y - hung.y) + pose.side < 1e-6) { waits++; continue }
      // While it turns over, the cat is in the air on its way down or on the rug: never sitting on it.
      turning++
      expect(['hop', 'rug']).toContain(stage)
      // And in the air it is already out in front of the faces.
      if (stage === 'hop') expect(catDraw(toy).body.z, `at ${toy.time.toFixed(2)} s`).toBeGreaterThan(FRONT_Z + 0.1)
    }
    expect(toy.state.boxes[0]).toMatchObject({ on: ON_RUG, side: true })
    expect(toy.state.cat.at).toBe('rug')
    expect(landed).toBe(true)
    expect(waits).toBeGreaterThanOrEqual(15)
    expect(turning).toBeGreaterThan(15)
    expect(sounds(cues)).toEqual(expect.arrayContaining(['mew', 'hop', 'thud']))
    expect(sounds(cues).filter((sound) => sound === 'knock')).toHaveLength(3)
  })

  it('touched on a high lid with no hole to go to, hops where it sits and never dips below that lid', () => {
    const play = stacked(), toy = play.toy
    run(play, 1.5)
    const seat = catDraw(toy).body.y
    expect(seat).toBeGreaterThan(2.3)
    tap(play, middle(play, 'cat'))
    let hops = 0
    for (let t = 0; t < 2; t += FRAME) {
      play.step(FRAME)
      heard(play)
      if (toy.shows.cat.stage === 'hop') hops++
      expect(catDraw(toy).body.y, `at ${toy.time.toFixed(2)} s`).toBeGreaterThan(seat - 0.005)
    }
    expect(hops).toBeGreaterThan(10)
    expect(toy.state.cat.at).toBe('top')
  })

  it('comes down short of the baby: its long hop along the rug never swings it out as far as where the baby sits', () => {
    const play = tipped(), toy = play.toy
    let past = 0
    for (let t = 0; t < 2; t += FRAME) {
      play.step(FRAME)
      heard(play)
      const cat = catDraw(toy), baby = babyDraw(toy)
      if (toy.shows.cat.stage !== 'hop' || Math.abs(cat.head.x - baby.x) > 0.9) continue
      past++
      // Its head is a hand's width deep, and the baby's arms are a little behind where the baby sits.
      expect(cat.head.z + 0.12, `at ${toy.time.toFixed(2)} s`).toBeLessThan(baby.z - 0.05)
    }
    expect(past).toBeGreaterThan(5)
  })
})

describe('the pieces on the rug', () => {
  it('are five at most: five lie there, and the sixth pushes the oldest off under the sofa as it lands', () => {
    // The cat's tail sweeps a piece on its way to the next hole. With the cat stuck in a hole and the grandmother
    // wearing the small box, holes poked in her box bring no cat, and their pieces stay where they fall.
    const play = first(), toy = play.toy
    tap(play, middle(play, 'gran'))
    run(play, 7)
    expect(toy.state.gran).toEqual({ at: 'skirt', box: 3 })
    cutSquare(play, 0, 30, 40, 80, 90)
    run(play, 5)
    tap(play, middle(play, 'cat'))
    run(play, 3)
    tap(play, middle(play, 'cat'))
    run(play, 5)
    expect(toy.state.cat.at).toBe('stuck')
    const lying = (): number => toy.olds.filter((old) => old.swept === null).length + (toy.piece ? 1 : 0)
    expect(lying()).toBe(1)
    const oldest = toy.piece!
    const places = [[14, 12], [14, 30], [14, 48], [32, 12], [32, 48]]
    places.forEach(([cx, cy], n) => {
      tap(play, onFace(play, 3, cx, cy))
      const cues = run(play, 2)
      if (n < 4) {
        // Up to five lie there, and none is pushed.
        expect(lying(), `after poke ${n + 1}`).toBe(n + 2)
        expect(sounds(cues)).not.toContain('scrape')
        expect(oldest.swept).toBeNull()
      } else {
        // The sixth lands and the oldest goes.
        expect(sounds(cues)).toContain('scrape')
        expect(oldest.swept).not.toBeNull()
        expect(lying()).toBe(MOST_PIECES)
      }
    })
  })
})

describe('uncut board', () => {
  const SILL = 4
  /** Where the grandmother's body, head and hat are drawn, bent over as she is: how far up her each is. */
  const UP: Record<string, number> = { 'the grandmother': 0.5, "the grandmother's head": TORSO.head, "the grandmother's hat": 1.9 }
  /** What the plane of the faces holds at a place, as the boxes are drawn now: no face, a hole, or board. */
  function boardAt(play: P, x: number, y: number): 'none' | 'hole' | 'board' {
    const toy = play.toy
    for (const box of toy.state.boxes) {
      if (box.on === ON_HEAP) continue
      const pose = toy.poseOf(`box:${box.id}`), kind = kindOf(box.id), left = pose.x - kind.w / 2
      // A box that is tipping or being folded has no face in the plane.
      if (pose.side > 0.01 || pose.flat > 0.01 || Math.abs(pose.z) > 0.01) continue
      if (x < left || x > left + kind.w || y < pose.y || y > pose.y + kind.h) continue
      const cx = Math.floor((x - left) / CELL), cy = Math.floor((y - pose.y) / CELL)
      // The sill of a door is a few cells of board at the rug, under a hole: what goes in at the door goes over it.
      return isGone(box.face, cx, cy) || (cy < SILL && isGone(box.face, cx, cy + SILL)) ? 'hole' : 'board'
    }
    return 'none'
  }

  it('is never where the middle of any part of the cat or of the grandmother is, or passes: through every act, they go through a face only where it is cut away', () => {
    const slab = { back: FRONT_Z - BOARD - 0.02, front: FRONT_Z + 0.02 }
    const through: string[] = []
    let inBoard = 0, passes = 0
    for (const entry of CASES) {
      const before = new Map<string, Vec>()
      perform(entry, Infinity, (play) => {
        const seen = new Set<string>()
        for (const reach of reaches(play.toy)) {
          if (!/cat|grandmother|hat/.test(reach.part)) continue
          seen.add(reach.part)
          const at = reach.part in UP ? onTorso(granDraw(play.toy), UP[reach.part]) : reach.at, was = before.get(reach.part)
          before.set(reach.part, { ...at })
          let where: Vec | null = null
          if (at.z >= slab.back && at.z <= slab.front) { where = at; inBoard++ }
          // From behind the board to in front of it, or back, between two frames: it passed the board on the way. A part that is somewhere else altogether was not moved there: a touch ended the scene.
          else if (was && (was.z < slab.back) !== (at.z < slab.back) && Math.hypot(at.x - was.x, at.y - was.y, at.z - was.z) < 0.3) {
            const t = (FRONT_Z - BOARD / 2 - was.z) / (at.z - was.z)
            where = { x: was.x + (at.x - was.x) * t, y: was.y + (at.y - was.y) * t, z: FRONT_Z }
            passes++
          }
          if (where && boardAt(play, where.x, where.y) === 'board') through.push(`${reach.part} in ${entry.name} at ${play.toy.time.toFixed(2)} s`)
        }
        for (const part of [...before.keys()]) if (!seen.has(part)) before.delete(part)
      })
    }
    expect(through.slice(0, 12)).toEqual([])
    // And the acts do take them through the faces: the test has looked.
    expect(inBoard + passes).toBeGreaterThan(40)
  })
})
