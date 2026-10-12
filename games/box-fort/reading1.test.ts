import { describe, expect, it } from 'vitest'
import { CASES, perform } from './cases'
import { goneShare, isGone } from './face'
import { babySide, corner, feetZone, highest, loadFort, rects, seams, tapeEnd } from './fort'
import { ON_FLOOR, ON_HEAP, ON_RUG, freshFort, type FortState } from './fortState'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO } from './guidance'
import { BOARD, BOX_COUNT, CUSHION_HALF, FRONT_Z, faceAt, kindOf, onPlane } from './layout'
import { CAT_HEAD, HOP_ROUND, babyDraw, catDraw, granDraw, granMiddle, rattleAt, reaches } from './people'
import { BULBS, LIES_FLAT, babyAt, restCloth } from './rest'
import { CHAIR_ARM, cuttable, lidSpot, onSurface, spots, targetAt } from './targets'
import { FRAME, SURFACES, builtFort, drag, dragAndLift, first, heard, hole, middle, onFace, peep, picture, playOf, px, reopened, run, spot, stored, tap } from './testing'
import { HANG_S, Toy, type Cue } from './toy'

// What the first fresh reading and the first audit run asked for, each as a test that fails when the fix is taken
// out. Everything a finger does here goes the way a finger goes: through play.ts, by pointer id and surface pixel.

type P = ReturnType<typeof first>
const sounds = (cues: readonly Cue[]): string[] => cues.map((cue) => cue.sound)
const room = (play: P, x: number, y: number): [number, number] => px(play, { x, y, z: FRONT_Z })
/** Three sides of a square on the big box: a line that has not closed. */
const threeSides = (play: P): [number, number][] => [onFace(play, 0, 100, 40), onFace(play, 0, 150, 40), onFace(play, 0, 150, 90), onFace(play, 0, 100, 90)]
const lineOf = (state: FortState): string => JSON.stringify(state.line)
/** A drag by a finger that is already down, a frame for each step. */
function slide(play: P, id: number, from: readonly [number, number], to: readonly [number, number], steps = 8): Cue[] {
  const all: Cue[] = []
  for (let step = 1; step <= steps; step++) {
    play.move(id, from[0] + ((to[0] - from[0]) * step) / steps, from[1] + ((to[1] - from[1]) * step) / steps)
    all.push(...heard(play), ...run(play, FRAME))
  }
  return all
}
/** Takes what lies at `from`, carries it to `to`, lets go, and plays until it has been set down. */
function carry(play: P, from: readonly [number, number], ...to: (readonly [number, number])[]): Cue[] {
  return [...dragAndLift(play, [from, ...to]), ...run(play, HANG_S + 0.05)]
}

describe('a cut survives a lifted finger', () => {
  it('waits on its face, in the save, for as long as nothing ends it, and cuts nothing while it waits', () => {
    const play = first(), toy = play.toy
    dragAndLift(play, threeSides(play))
    expect(toy.stroke).toBeNull()
    expect(toy.state.line?.box).toBe(0)
    expect(toy.state.line!.path.length).toBeGreaterThan(8)
    expect(goneShare(toy.state.boxes[0].face)).toBe(0)
    expect(toy.piece).toBeNull()
    const kept = lineOf(toy.state)
    // Half a minute on, nothing has ended it: it waits for the child, not for a clock.
    run(play, 30)
    expect(lineOf(toy.state)).toBe(kept)
    expect(JSON.stringify((stored(toy.state) as { line: unknown }).line)).toBe(kept)
    expect(goneShare(toy.state.boxes[0].face)).toBe(0)
  })

  it('is carried on by a finger that lands near its end, and the piece falls when the line comes back to where it began', () => {
    const play = first(), toy = play.toy
    dragAndLift(play, threeSides(play))
    run(play, 3)
    const waited = toy.state.line!.path.length / 2
    // A second touch, a little off the end of the line: the blades bite there, and the line waits until the finger drags.
    play.down(2, ...onFace(play, 0, 104, 86))
    expect(sounds(heard(play))).toEqual(['bite'])
    expect(toy.state.line).not.toBeNull()
    // Dragged, the line is in the scissors again, from the end the finger landed near.
    play.move(2, ...onFace(play, 0, 104, 72))
    expect(toy.stroke?.path.length).toBe(waited + 1)
    expect(toy.state.line).toBeNull()
    slide(play, 2, onFace(play, 0, 104, 72), onFace(play, 0, 100, 43))
    // It closed while the finger was down: the hole is the square that was drawn in two goes.
    expect(toy.stroke).toBeNull()
    const gone = goneShare(toy.state.boxes[0].face)
    expect(gone).toBeGreaterThan(0.08)
    expect(gone).toBeLessThan(0.14)
    expect(toy.piece?.box).toBe(0)
    expect(sounds(run(play, 0.6))).toContain('slap')
  })

  it('is carried on from its beginning as well as from its end', () => {
    const play = first(), toy = play.toy
    dragAndLift(play, threeSides(play))
    run(play, 1)
    play.down(2, ...onFace(play, 0, 102, 44))
    play.move(2, ...onFace(play, 0, 102, 30))
    expect(toy.stroke?.path.length).toBeGreaterThan(8)
    // The end the finger landed at is the end the blades went on from.
    const end = toy.stroke!.path[toy.stroke!.path.length - 2]
    expect(Math.hypot(end.x - 100, end.y - 40)).toBeLessThan(3)
  })

  it('falls when the line runs out over the edge of the box, closed the short way', () => {
    const play = first(), toy = play.toy
    drag(play, [onFace(play, 0, 150, 30), onFace(play, 0, 110, 30), onFace(play, 0, 110, 90), onFace(play, 0, 150, 90), onFace(play, 0, 190, 90)])
    expect(toy.stroke).toBeNull()
    expect(toy.state.line).toBeNull()
    expect(goneShare(toy.state.boxes[0].face)).toBeGreaterThan(0.05)
    expect(toy.piece?.box).toBe(0)
  })

  it('is finished the short way by a bite anywhere else: the scissors keep one line open, and none is ever dropped', () => {
    const play = first(), toy = play.toy
    dragAndLift(play, threeSides(play))
    run(play, 1)
    play.down(2, ...onFace(play, 3, 40, 30))
    expect(toy.state.line).toBeNull()
    expect(goneShare(toy.state.boxes[0].face)).toBeGreaterThan(0.08)
    expect(toy.stroke?.box).toBe(3)
  })

  it('is kept by a put-away at any moment, and the next visit finds it and carries on with it', () => {
    const play = first(), toy = play.toy
    // Put away with the finger still down on a line half made.
    drag(play, threeSides(play))
    play.park()
    expect(toy.stroke).toBeNull()
    const kept = lineOf(toy.state)
    expect(toy.state.line?.box).toBe(0)
    const next = reopened(play)
    expect(lineOf(next.toy.state)).toBe(kept)
    expect(goneShare(next.toy.state.boxes[0].face)).toBe(0)
    next.down(1, ...onFace(next, 0, 102, 88))
    next.move(1, ...onFace(next, 0, 102, 74))
    expect(next.toy.stroke?.path.length).toBe(JSON.parse(kept).path.length / 2 + 1)
  })

  it('leaves a tap a tap: a touch that goes nowhere pokes a peep-hole and leaves no line waiting', () => {
    const play = first(), toy = play.toy
    tap(play, onFace(play, 3, 44, 30))
    expect(sounds(heard(play))).toContain('pop')
    expect(toy.state.line).toBeNull()
    expect(toy.piece?.disc).toBe(true)
  })
})

describe('the loose tape end', () => {
  it('does nothing when it is only touched, and takes one strip and the highest box when it is pulled', () => {
    const play = playOf(builtFort()), toy = play.toy, tab = middle(play, 'tab'), before = JSON.stringify(stored(toy.state))
    expect(sounds(tap(play, tab))).toEqual(['press'])
    run(play, 2)
    expect(JSON.stringify(stored(toy.state))).toBe(before)
    const top = highest(toy.state)!.id
    drag(play, [tab, [tab[0] + 90, tab[1] - 20]])
    expect(toy.hand).toBeNull()
    expect(toy.state.tapes).toHaveLength(1)
    expect(toy.state.boxes[top].on).toBe(ON_HEAP)
  })

  it.each(SURFACES)('is found beside the fort and over no face: a touch low on the right of the right-hand box cuts it, on %i by %i', (width, height) => {
    const taped = (): FortState => { const state = freshFort(null); state.tapes = [[0, 3]]; return state }
    for (const from of [builtFort, taped]) {
      const play = playOf(from(), 1, [width, height]), toy = play.toy
      const found = spot(play, 'tab')!, seen = onSurface(found, width, height)
      for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
        const x = seen.x + dx * (seen.hw - 1), y = seen.y + dy * (seen.hh - 1)
        expect(faceAt(onPlane(x, y, width, height, FRONT_Z), cuttable(toy))).toBeNull()
        expect(targetAt(toy, x, y, width, height).kind).toBe('tab')
      }
      // The face beside it, at the height of the tab, down to its last column of board.
      const right = rects(toy.state).filter((rect) => rect.on === ON_RUG).sort((a, b) => b.x - a.x)[0], end = tapeEnd(toy.state)!
      const [fx, fy] = px(play, { x: right.x + right.w / 2 - 0.03, y: end.y, z: FRONT_Z })
      expect(targetAt(toy, fx, fy, width, height)).toMatchObject({ kind: 'face', id: right.id })
    }
  })
})

describe('tape', () => {
  it('holds on a first visit: the two boxes stand touching, and a strip let go on their seam stays there', () => {
    const play = first(), toy = play.toy, meets = seams(toy.state)
    expect(meets).toHaveLength(1)
    const heardAll = carry(play, middle(play, 'roll'), px(play, meets[0].at))
    expect(sounds(heardAll)).toEqual(expect.arrayContaining(['rip', 'press']))
    expect(toy.state.tapes).toHaveLength(1)
    expect([...toy.state.tapes[0]].sort()).toEqual([meets[0].a, meets[0].b].sort())
  })

  it('that finds no seam sticks to the one box by its end and curls there before it springs back to the roll', () => {
    const play = first(), toy = play.toy
    const heardAll = carry(play, middle(play, 'roll'), onFace(play, 0, 40, 90))
    expect(sounds(heardAll)).toEqual(expect.arrayContaining(['rip', 'press']))
    expect(sounds(heardAll)).not.toContain('zip')
    expect(toy.strip?.stuck).toBe(true)
    expect(toy.age('box:0')).toBeLessThan(0.1)
    expect(toy.state.tapes).toEqual([])
    expect(sounds(run(play, 1))).toEqual(['zip', 'whirr'])
  })
})

describe('a thing let go lies where it was let go', () => {
  it('a cushion on bare rug lies there, and stays', () => {
    const play = first(), toy = play.toy
    carry(play, middle(play, 'cushion', (target) => target.kind === 'cushion' && target.index === 0), room(play, 0.9, 0.4))
    expect(toy.state.cushions[0]).toBe(ON_FLOOR)
    expect(toy.state.cushionAt[0]).toBe(90)
    run(play, 5)
    expect(toy.state.cushions[0]).toBe(ON_FLOOR)
    expect(toy.poseOf('cushion:0').x).toBeCloseTo(0.9, 2)
    expect(toy.poseOf('cushion:0').z).toBeGreaterThan(FRONT_Z)
  })

  it('the blanket on bare rug lies there in a heap, and stays', () => {
    const play = first(8), toy = play.toy
    carry(play, middle(play, 'blanket'), room(play, 1.2, 0.5))
    expect(toy.state.blanket).toEqual([])
    expect(toy.state.lump).not.toBeNull()
    expect(Math.abs(toy.state.lump! / 100 - 1.2)).toBeLessThan(0.6)
    run(play, 5)
    expect(toy.state.lump).not.toBeNull()
    expect(Math.max(...toy.cloth().ys)).toBeLessThan(0.8)
  })

  it('a box with no room anywhere is the one thing that goes back: nothing in the save has changed', () => {
    const play = playOf(builtFort()), toy = play.toy, before = JSON.stringify(stored(toy.state))
    carry(play, middle(play, 'heap'), room(play, -2.2, 3.2), room(play, 1.3, 3.2))
    run(play, 2)
    expect(toy.hand).toBeNull()
    expect(JSON.stringify(stored(toy.state))).toBe(before)
    expect(toy.state.boxes[2].on).toBe(ON_HEAP)
  })
})

describe('the piece that fell out of a cut', () => {
  const cutOne = (play: P): void => { drag(play, [onFace(play, 0, 100, 40), onFace(play, 0, 150, 40), onFace(play, 0, 150, 90), onFace(play, 0, 100, 90), onFace(play, 0, 100, 44)]); play.up(1, ...onFace(play, 0, 100, 44)) }

  it('lies where it fell, through the start of any scene and for as long as nobody sweeps it', () => {
    const play = first(), toy = play.toy
    cutOne(play)
    run(play, 8)
    const piece = toy.piece!, lies = piece.lies
    expect(piece.landed).toBe(true)
    // A scene starts: the baby is touched.
    tap(play, middle(play, 'baby'))
    expect(toy.sceneRunning).toBe(true)
    run(play, 30)
    expect(toy.piece).toBe(piece)
    expect(piece.swept).toBeNull()
    expect(piece.lies).toBe(lies)
    expect(spot(play, 'piece')).not.toBeNull()
  })

  it('rocks where it lies when it is touched, with the slap of board on the rug', () => {
    const play = first(), toy = play.toy
    cutOne(play)
    run(play, 8)
    const key = toy.piece!.key
    const landing = tap(play, middle(play, 'piece'))
    expect(landing.map((cue) => [cue.sound, cue.mover])).toEqual([['slap', `piece:${key}`]])
    expect(toy.piece!.swept).toBeNull()
    expect(toy.scissors.mode).not.toBe('held')
  })

  it('is swept under the sofa by the cat\'s tail on its way to the next hole, seen and heard', () => {
    const play = first(), toy = play.toy
    cutOne(play)
    run(play, 8)
    const older = toy.piece!
    tap(play, onFace(play, 3, 44, 30))
    const swept: Cue[] = []
    let stage = ''
    for (let t = 0; t < 8; t += FRAME) {
      const now = run(play, FRAME).filter((cue) => cue.mover === 'sweep')
      if (now.length > 0) { swept.push(...now); stage = toy.shows.cat.stage }
    }
    expect(sounds(swept)).toEqual(['scrape'])
    // The sound is the tail's: it starts while the cat is at the piece, sweeping.
    expect(stage).toBe('sweep')
    expect(older.swept).not.toBeNull()
    expect(toy.olds.includes(older) || toy.olds.length === 0).toBe(true)
    expect(toy.piece).not.toBe(older)
  })
})

describe('everything that is drawn answers as itself', () => {
  it('the ball squeaks and the block tumbles where they lie by the baby: neither is a snip of the air', () => {
    const play = first(), toy = play.toy
    const ball = tap(play, middle(play, 'toy', (target) => target.kind === 'toy' && target.index === 1))
    expect(ball.map((cue) => [cue.sound, cue.mover])).toEqual([['sproing', 'toy:1']])
    run(play, 0.5)
    const block = tap(play, middle(play, 'toy', (target) => target.kind === 'toy' && target.index === 2))
    expect(block.map((cue) => [cue.sound, cue.mover])).toEqual([['tumble', 'toy:2']])
    expect(toy.scissors.mode).toBe('rest')
    expect(toy.sceneRunning).toBe(false)
  })

  it('a second finger gets a small answer where it lands, and takes nothing from the first', () => {
    const play = first(), toy = play.toy
    drag(play, threeSides(play).slice(0, 2))
    const length = toy.stroke!.length
    // On bare wall a scrap of board jumps where it landed.
    const [wx, wy] = room(play, -0.9, 3.1)
    expect(play.down(2, wx, wy)).toBe(true)
    expect(heard(play).map((cue) => [cue.sound, cue.mover])).toEqual([['air', 'dab']])
    expect(toy.dab.x).toBeCloseTo(-0.9, 1)
    // On a box, a knock; on the baby, its rattle.
    play.down(3, ...onFace(play, 3, 40, 30))
    expect(heard(play).map((cue) => [cue.sound, cue.mover])).toEqual([['knock', 'box:3']])
    play.down(4, ...middle(play, 'baby'))
    expect(heard(play).map((cue) => [cue.sound, cue.mover])).toEqual([['rattle', 'baby:tap']])
    expect(toy.stroke!.length).toBe(length)
    expect(goneShare(toy.state.boxes[3].face)).toBe(0)
    expect(toy.sceneRunning).toBe(false)
    // The first finger cuts on.
    slide(play, 1, threeSides(play)[1], threeSides(play)[2])
    expect(toy.stroke!.length).toBeGreaterThan(length)
  })
})

describe('carrying is told from cutting', () => {
  it.each(SURFACES)('by where the finger lands: the lid and the top of a box carry it, its face is cut, and the lid is 48 px or more as it is drawn, on %i by %i', (width, height) => {
    for (const from of [() => freshFort(null), () => freshFort(8), builtFort]) {
      const play = playOf(from(), 1, [width, height]), toy = play.toy
      for (const found of spots(toy)) {
        if (found.target.kind !== 'flap') continue
        const id = found.target.id, lid = lidSpot(toy, id), seen = onSurface({ target: found.target, ...lid }, width, height)
        // As drawn, with no help from the smallest spot a finger is given.
        const scale = seen.hw / lid.hw
        expect(lid.hh * 2 * scale, `the lid of box ${id}`).toBeGreaterThanOrEqual(48)
        expect(lid.hw * 2 * scale, `the lid of box ${id}`).toBeGreaterThanOrEqual(48)
        expect(targetAt(toy, seen.x, seen.y, width, height)).toMatchObject({ kind: 'flap', id })
        const rect = rects(toy.state).find((entry) => entry.id === id)!
        const [fx, fy] = px(play, { x: rect.x, y: rect.foot + rect.h * 0.5, z: FRONT_Z })
        const onFaceIs = targetAt(toy, fx, fy, width, height)
        expect(['face', 'cat', 'cushion']).toContain(onFaceIs.kind)
      }
    }
  })

  it('a drag that starts on the lid carries the box and cuts nothing; one that starts on the face cuts and carries nothing', () => {
    const play = first(), toy = play.toy, lid = middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 3)
    drag(play, [lid, [lid[0] + 40, lid[1] - 60]])
    expect(toy.hand?.kind).toBe('box')
    expect(toy.stroke).toBeNull()
    play.cancel(1)
    run(play, 1)
    drag(play, [onFace(play, 3, 20, 20), onFace(play, 3, 60, 40)], 2)
    expect(toy.hand).toBeNull()
    expect(toy.stroke?.box).toBe(3)
  })

  it('is shown once by the idle ladder after the first hole, and the switch once when a fort with a hole stands; after that it shows the cut', () => {
    const play = first(), toy = play.toy
    hole(toy.state, 0, 100, 40, 150, 90)
    const shown: string[] = []
    let last = -1
    for (let t = 0; t < 4 * (IDLE_BEFORE_DEMO + DEMO_SECONDS) + 60; t += FRAME) {
      const guidance = play.step(FRAME)
      if (guidance.demoIndex >= 0 && guidance.demoIndex !== last) { shown.push(toy.demo); last = guidance.demoIndex }
    }
    expect(shown.slice(0, 2)).toEqual(['carry', 'switch'])
    expect(shown.slice(2).every((demo) => demo === 'cut')).toBe(true)
    expect(shown.length).toBeGreaterThan(2)
  })

  it('is not shown to a child who has carried a box already, nor the switch to one who has flicked it', () => {
    const play = first(), toy = play.toy
    hole(toy.state, 0, 100, 40, 150, 90)
    const lid = middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 3)
    carry(play, lid, [lid[0], lid[1] - 50])
    tap(play, middle(play, 'switch'))
    run(play, 3)
    tap(play, middle(play, 'switch'))
    const shown = new Set<string>()
    for (let t = 0; t < 2 * (IDLE_BEFORE_DEMO + DEMO_SECONDS) + 30; t += FRAME) if (play.step(FRAME).demoIndex >= 0) shown.add(toy.demo)
    expect([...shown]).toEqual(['cut'])
  })

  it('a cushion let go on a box with no hole flops onto the rug in front of it, where it is seen and can be taken again', () => {
    const play = first(), toy = play.toy
    const heardAll = carry(play, middle(play, 'cushion', (target) => target.kind === 'cushion' && target.index === 0), onFace(play, 0, 90, 60))
    expect(sounds(heardAll)).toContain('knock')
    expect(toy.state.cushions[0]).toBe(ON_FLOOR)
    run(play, 1)
    const lies = toy.poseOf('cushion:0')
    expect(lies.z).toBeGreaterThan(FRONT_Z)
    const [x, y] = px(play, lies)
    expect(targetAt(toy, x, y, play.width, play.height)).toEqual({ kind: 'cushion', index: 0 })
  })
})

describe('the grandmother behind a stack', () => {
  it('is reached by the arm of her chair, which answers for her where board stands in front of her', () => {
    const state = freshFort(null)
    Object.assign(state.boxes[0], { x: 80, on: ON_RUG })
    Object.assign(state.boxes[1], { x: 115, on: 0 })
    const play = playOf(state), toy = play.toy
    const her = granMiddle(granDraw(toy)), [hx, hy] = px(play, her)
    // Where she sits, the board is in front of her: a touch there is a cut.
    expect(targetAt(toy, hx, hy, play.width, play.height).kind).toBe('face')
    const arm = px(play, CHAIR_ARM)
    expect(targetAt(toy, arm[0], arm[1], play.width, play.height).kind).toBe('gran')
    expect(sounds(tap(play, arm))).toContain('click')
    expect(toy.sceneRunning).toBe(true)
    expect(toy.shows.gran.stage).not.toBe('chair')
  })
})

describe('a box taken up and put back', () => {
  const inBox = (): FortState => { const state = freshFort(null); hole(state, 0, 10, 4, 80, 70); state.baby = 0; state.cat = { at: 'top', box: 0, cell: 0 }; state.cushions = [0, -1, -1]; state.toys = [0, -1, -1]; return state }

  it('by a plain tap of its lid leaves everyone and everything where they were', () => {
    const play = playOf(inBox()), toy = play.toy, before = JSON.stringify(stored(toy.state))
    run(play, 4)
    const was = picture(toy)
    expect(sounds(tap(play, middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 0)))).toEqual(['scrape'])
    // Everyone looked at the finger; four seconds on they are as they were.
    run(play, 4)
    expect(JSON.stringify(stored(toy.state))).toBe(before)
    expect(toy.sceneRunning).toBe(false)
    expect(picture(toy)).toEqual(was)
  })

  it('by a touch that is taken away leaves the save as it was, and the baby that crawled off is back behind its box', () => {
    const play = playOf(inBox()), toy = play.toy, before = JSON.stringify(stored(toy.state))
    run(play, 1)
    const was = picture(toy), lid = middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 0)
    drag(play, [lid, [lid[0] + 120, lid[1] - 80]])
    expect(toy.hand?.kind).toBe('box')
    play.cancel(1)
    expect(JSON.stringify(stored(toy.state))).toBe(before)
    run(play, 8)
    expect(JSON.stringify(stored(toy.state))).toBe(before)
    expect(picture(toy)).toEqual(was)
  })

  it('by a put-away in the finger is as if never taken: the next visit finds everyone where they were', () => {
    const play = playOf(inBox()), toy = play.toy, before = JSON.stringify(stored(toy.state))
    const lid = middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 0)
    drag(play, [lid, [lid[0] + 120, lid[1] - 80]])
    play.park()
    expect(JSON.stringify(stored(toy.state))).toBe(before)
    expect(JSON.stringify(stored(reopened(play).toy.state))).toBe(before)
  })
})

describe('the string of lights', () => {
  it('stays on every corner when its end is only touched, and comes off one corner for each pull back', () => {
    const play = playOf(builtFort()), toy = play.toy, draped = [...toy.state.lights], end = middle(play, 'lights')
    expect(draped.length).toBe(4)
    tap(play, end)
    run(play, HANG_S + 0.5)
    expect(toy.state.lights).toEqual(draped)
    expect(toy.state.tangled).toBe(false)
    // Pulled back towards the corner before the last: the last corner lets go, and only that one.
    const from = middle(play, 'lights'), to = px(play, corner(toy.state, draped[draped.length - 2])!)
    play.down(2, from[0], from[1])
    const corners = (): number[] => [...(toy.hand?.corners ?? [])]
    expect(corners()).toEqual(draped)
    let steps = 0
    while (steps < 40 && corners().length === draped.length) { steps++; play.move(2, from[0] + ((to[0] - from[0]) * steps) / 40, from[1] + ((to[1] - from[1]) * steps) / 40); run(play, FRAME) }
    expect(corners()).toEqual(draped.slice(0, -1))
    // It took a pull: the first stretch of the way moved the end and dropped nothing.
    expect(steps).toBeGreaterThan(3)
    play.up(2, from[0] + ((to[0] - from[0]) * steps) / 40, from[1] + ((to[1] - from[1]) * steps) / 40)
    run(play, HANG_S + 0.2)
    expect(toy.state.lights).toEqual(draped.slice(0, -1))
  })
})

describe('one sound for each thing that is seen', () => {
  it('gives the baby\'s giggle a motion as it sits back down: it bounces and an arm goes up', () => {
    const entry = CASES.find((one) => one.name === 'hole and the baby: touched in a box, it crawls back out')!
    let seenAt = -1, bounced = 0, arm = 0
    perform(entry, Infinity, (play, now) => {
      const toy = play.toy
      if (now.some((cue) => cue.sound === 'giggle' && cue.mover === 'baby:giggle')) { seenAt = toy.time; expect(toy.shows.baby.stage).toBe('sit') }
      if (seenAt >= 0 && toy.time - seenAt > 0.05 && toy.time - seenAt < 0.6) { const draw = babyDraw(toy); bounced = Math.max(bounced, draw.bounce); arm = Math.max(arm, draw.armR) }
    })
    expect(seenAt).toBeGreaterThan(0)
    expect(bounced).toBeGreaterThan(0.01)
    expect(arm).toBeGreaterThan(0.5)
  })

  it('rings one bell for each hole as its light lands, and plinks once for each of the twelve bulbs', () => {
    const state = builtFort()
    state.cushions = [-1, -1, -1]
    const play = playOf(state)
    const cues = [...tap(play, middle(play, 'switch')), ...run(play, 9)]
    const bells = cues.filter((cue) => cue.sound === 'bell'), plinks = cues.filter((cue) => cue.sound === 'plink')
    // An eye, a paw, a head, a body and a door: five holes.
    expect(bells).toHaveLength(5)
    expect(new Set(bells.map((cue) => cue.at)).size).toBe(5)
    expect(plinks.map((cue) => cue.mover)).toEqual(Array.from({ length: BULBS }, (_, n) => `bulb:${n}`))
    expect(BULBS).toBe(12)
  })

  it('tinks once for each bulb as the draped string settles', () => {
    const state = freshFort(null)
    const play = playOf(state), toy = play.toy
    const end = middle(play, 'lights')
    const rect = rects(toy.state).find((entry) => entry.id === 0)!
    const corner = px(play, { x: rect.x - rect.w / 2, y: rect.foot + rect.h, z: FRONT_Z })
    dragAndLift(play, [end, corner, [corner[0] - 30, corner[1] + 40]], 1, 24)
    const settled = run(play, HANG_S + 1.2).filter((cue) => cue.mover.startsWith('bulb:'))
    expect(toy.state.lights.length).toBeGreaterThan(0)
    expect(settled.map((cue) => [cue.sound, cue.mover])).toEqual(Array.from({ length: BULBS }, (_, n) => ['tink', `bulb:${n}`]))
  })
})

describe('what the sheet says of the three', () => {
  it('lights the cat\'s eyes in the dark once every light is on', () => {
    const play = playOf(builtFort()), toy = play.toy
    expect(catDraw(toy).shine).toBe(0)
    tap(play, middle(play, 'switch'))
    run(play, 9)
    expect(toy.state.dark).toBe(true)
    expect(catDraw(toy).shine).toBe(1)
  })

  it('has the baby try a toy too big for the slot again before it gives up', () => {
    const entry = CASES.find((one) => one.name === 'hole and the baby: posts its toys through a slot, and one too big springs back')!
    const { cues } = perform(entry)
    expect(cues.filter((cue) => cue.sound === 'sproing').length).toBeGreaterThanOrEqual(2)
  })

  it('has the baby point with one arm: the other keeps hold of the rattle', () => {
    const entry = CASES.find((one) => one.name === 'hole: cut by the finger, and the cat looks out with a paw')!
    let right = 0, left = 0, rest = 0
    perform(entry, Infinity, (play) => {
      const toy = play.toy
      if (toy.time < 0.05) rest = babyDraw(toy).armL
      if (toy.age('baby:squeal') > 0.1 && toy.age('baby:squeal') < 0.5) { const draw = babyDraw(toy); right = Math.max(right, draw.armR); left = Math.max(left, Math.abs(draw.armL - rest)) }
    })
    expect(right).toBeGreaterThan(1.5)
    // The arm with the rattle stays where it was: it is the other arm that points.
    expect(left).toBeLessThan(0.1)
  })

  it('presses every loose strip flat, however many there are', () => {
    const play = playOf(builtFort()), toy = play.toy
    const strips = toy.state.tapes.length
    dragAndLift(play, [middle(play, 'roll'), middle(play, 'gran')])
    const cues = run(play, 12)
    expect(cues.filter((cue) => cue.sound === 'press' && cue.mover.startsWith('tape:')).length).toBe(strips)
    expect(strips).toBe(2)
  })

  it('rolls the disc of a peep-hole on its edge before it lies down', () => {
    const play = first(), toy = play.toy
    tap(play, onFace(play, 3, 44, 30))
    run(play, 2)
    const disc = toy.piece!
    expect(disc.disc).toBe(true)
    expect(Math.abs(disc.lies - disc.from)).toBeGreaterThan(0.2)
    expect(disc.landed).toBe(true)
  })

  it('keeps every scene between 1 and 6 seconds as it is written, whatever starts it: every act of the grid, a fort with every seam taped, and the dark', () => {
    // The length of each scene as it is handed to the game: the end of its last beat.
    const lengths: [number, string][] = []
    let label = ''
    const real = Toy.prototype.play
    Toy.prototype.play = function (this: Toy, poses, beats): void {
      lengths.push([Math.max(0, ...poses.map((pose) => pose.at + pose.lasts), ...beats.map((beat) => beat.at)), label])
      real.call(this, poses, beats)
    }
    try {
      for (const entry of CASES) { label = entry.name; perform(entry) }
      // Three storeys of tape: she presses every strip in one walk; one pull takes the top apart; every hole and bulb lights.
      const fort = builtFort()
      fort.tapes = seams(fort).map((seam) => [seam.a, seam.b] as [number, number])
      expect(fort.tapes.length).toBeGreaterThanOrEqual(3)
      const play = playOf(loadFort(stored(fort)))
      label = 'every strip pressed'
      dragAndLift(play, [middle(play, 'roll'), middle(play, 'gran')])
      const pressed = run(play, 12).filter((cue) => cue.sound === 'press' && cue.mover.startsWith('tape:'))
      expect(pressed).toHaveLength(fort.tapes.length)
      label = 'a pull of the tape end'
      const tab = middle(play, 'tab')
      dragAndLift(play, [tab, [tab[0] + 90, tab[1] - 20]])
      run(play, 8)
      label = 'the switch'
      tap(play, middle(play, 'switch'))
      run(play, 9)
    } finally { Toy.prototype.play = real }
    expect(lengths.length).toBeGreaterThan(30)
    expect(lengths.filter(([seconds]) => seconds > 6)).toEqual([])
    expect(lengths.filter(([seconds]) => seconds < 1)).toEqual([])
  })
})

describe('nothing passes through board', () => {
  /** Every box as it is drawn now: where it is on its way as well as where it stands. */
  const drawnBoxes = (play: P): { id: number; x: number; foot: number; w: number; h: number; d: number }[] =>
    rects(play.toy.state).filter((rect) => !rect.side).map((rect) => { const pose = play.toy.poseOf(`box:${rect.id}`); return { id: rect.id, x: pose.x, foot: pose.y, w: rect.w, h: rect.h, d: kindOf(rect.id).d } })

  it('the cat is never drawn inside a box: off its lid it goes over the back edge and down behind, and it comes back the same way', () => {
    let frames = 0, behind = 0
    const inside: string[] = []
    for (const entry of CASES) perform(entry, Infinity, (play) => {
      const toy = play.toy, cat = catDraw(toy)
      if (!cat.body.show) return
      frames++
      // The middle of its body, a hand above where it sits.
      const at = { x: cat.body.x, y: cat.body.y + 0.2, z: cat.body.z }
      for (const box of drawnBoxes(play)) {
        if (Math.abs(at.x - box.x) < box.w / 2 - 0.05 && at.y > box.foot + 0.05 && at.y < box.foot + box.h - 0.05 && at.z < FRONT_Z - 0.05 && at.z > FRONT_Z - box.d + 0.05) inside.push(`${entry.name} at ${toy.time.toFixed(2)} s, ${toy.shows.cat.stage}, in box ${box.id}`)
        if (at.z <= FRONT_Z - box.d && Math.abs(at.x - box.x) < box.w / 2 && at.y < box.foot + box.h) behind++
      }
    })
    expect(inside.slice(0, 5)).toEqual([])
    expect(frames).toBeGreaterThan(5000)
    // The test has frames of the cat on its way down behind a box, where it would show if it went through.
    expect(behind).toBeGreaterThan(10)
  })

  it('the cat hops onto a box that is coming down where it sat only once the box has landed, and from out in front', () => {
    const state = freshFort(null)
    state.cat = { at: 'top', box: 0, cell: 0 }
    const play = playOf(state), toy = play.toy, lid = middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 3)
    const rect = rects(toy.state).find((entry) => entry.id === 0)!
    dragAndLift(play, [lid, px(play, { x: rect.x, y: 3.1, z: FRONT_Z - 0.5 })], 1, 20)
    let moving = 0, under = 0, hopped = false
    for (let t = 0; t < 4; t += FRAME) {
      run(play, FRAME)
      const cat = catDraw(toy), box = toy.poseOf('box:3')
      hopped = hopped || toy.shows.cat.stage === 'hop'
      if (toy.moving('box:3') >= 1 || toy.state.boxes[3].on !== 0) continue
      moving++
      // While the box comes down, the cat is not under it: it is out in front of the faces or clear to one side.
      if (cat.body.show && Math.abs(cat.body.x - box.x) < 0.55 + 0.3 && cat.body.z < FRONT_Z + 0.02 && cat.body.y + 0.6 > box.y) under++
    }
    expect(toy.state.boxes[3].on).toBe(0)
    expect(hopped).toBe(true)
    expect(moving).toBeGreaterThan(3)
    expect(under).toBe(0)
    expect(toy.shows.cat.stage).toBe('top')
    expect(catDraw(toy).body.y).toBeCloseTo(1.6 + 0.8, 1)
  })

  it('the cat\'s head at a hole is inside the box behind the board: clear of both walls, of the floor and of the lid, its ears as flat as the lid asks', () => {
    // Peep-holes hard against the left wall, the right wall and the lid of the small box.
    for (const [cx, cy] of [[3, 30], [84, 30], [44, 60], [84, 60]] as const) {
      const state = freshFort(null)
      peep(state, 3, cx, cy)
      state.cat = { at: 'look', box: 3, cell: cy * 88 + cx }
      const play = playOf(state), toy = play.toy, rect = rects(state).find((entry) => entry.id === 3)!
      for (let t = 0; t < 3; t += FRAME) {
        run(play, FRAME)
        const cat = catDraw(toy), head = cat.head
        if (!head.show || head.z >= FRONT_Z - 0.05) continue
        const when = `hole at ${cx}, ${cy}, ${t.toFixed(2)} s`
        expect(head.x - CAT_HEAD.half, when).toBeGreaterThanOrEqual(rect.x - rect.w / 2 + BOARD)
        expect(head.x + CAT_HEAD.half, when).toBeLessThanOrEqual(rect.x + rect.w / 2 - BOARD)
        expect(head.y - CAT_HEAD.chin, when).toBeGreaterThanOrEqual(rect.foot + BOARD)
        expect(head.y + CAT_HEAD.ear + CAT_HEAD.earLong * cat.ears, when).toBeLessThanOrEqual(rect.foot + rect.h - BOARD + 1e-9)
      }
    }
  })

  it('the baby goes round a box, never through its wall: beside the box it is clear of it, sitting up', () => {
    let beside = 0
    const through: string[] = []
    for (const entry of CASES.filter((one) => /the baby/.test(one.name))) perform(entry, Infinity, (play) => {
      const toy = play.toy, baby = babyDraw(toy)
      if (!baby.body) return
      const body = reaches(toy).find((reach) => reach.part === 'the baby')!
      for (const box of drawnBoxes(play)) {
        if (body.at.z >= FRONT_Z || body.at.z <= FRONT_Z - box.d) continue
        beside++
        // Its middle is outside the wall by the half of it that is turned to the wall.
        if (Math.abs(body.at.x - box.x) < box.w / 2 + 0.1) through.push(`${entry.name} at ${toy.time.toFixed(2)} s, box ${box.id}`)
      }
    })
    expect(through.slice(0, 5)).toEqual([])
    expect(beside).toBeGreaterThan(40)
  })

  it('the baby lies behind a box with its feet out on a side that has room, and no box is ever set down on them', () => {
    // Two boxes touching: at either of them its feet are on the open side, not in the neighbour.
    let lying = 0
    for (const at of [0, 3]) {
      const state = freshFort(null)
      state.baby = at
      // With no room on either side of a box, the baby is not at it: a load puts it back on the rug.
      if (babySide(state, at) === 0) { expect(loadFort(stored(state)).baby).toBe(ON_RUG); continue }
      lying++
      const zone = feetZone(state)!
      for (const rect of rects(state)) expect(Math.min(zone.right, rect.x + rect.w / 2) - Math.max(zone.left, rect.x - rect.w / 2), `the baby at box ${at}, box ${rect.id}`).toBeLessThanOrEqual(1e-6)
      const feet = babyAt(state)
      expect(feet.x).toBeGreaterThan(zone.left)
      expect(feet.x).toBeLessThan(zone.right)
    }
    expect(lying).toBeGreaterThan(0)
    // A box carried to where its feet are is set down beside them.
    const state = freshFort(8)
    state.baby = 0
    const play = playOf(state), toy = play.toy, zone = feetZone(toy.state)!
    carry(play, middle(play, 'heap'), room(play, 0, 3), room(play, (zone.left + zone.right) / 2, 0.9))
    run(play, 1)
    const stands = rects(toy.state).filter((rect) => rect.id !== 0)
    expect(stands.length).toBeGreaterThan(0)
    expect(toy.state.baby).toBe(0)
    const now = feetZone(toy.state)!
    for (const rect of stands) expect(Math.min(now.right, rect.x + rect.w / 2) - Math.max(now.left, rect.x - rect.w / 2)).toBeLessThanOrEqual(1e-6)
  })

  it('the grandmother steps under the rim of the box she comes to wear only while it is over her head, and out of it the same way', () => {
    let stepped = 0
    const through: string[] = []
    for (const entry of CASES.filter((one) => /wear|sits into one/.test(one.name))) perform(entry, Infinity, (play) => {
      const toy = play.toy, show = toy.shows.gran
      if (show.stage !== 'under') return
      const gran = granDraw(toy), box = toy.poseOf(`box:${show.box}`), kind = kindOf(show.box)
      const top = Math.max(...reaches(toy).filter((reach) => reach.part.startsWith('the grandmother')).map((reach) => reach.at.y + reach.r))
      // Where she crosses the place of its front wall, or stands in the place of a side wall.
      const atFront = Math.abs(gran.z - FRONT_Z) < 0.3 && Math.abs(gran.x - box.x) < kind.w / 2 + 0.3
      if (!atFront) return
      stepped++
      if (box.y < top) through.push(`${entry.name} at ${toy.time.toFixed(2)} s: rim ${box.y.toFixed(2)}, her hat ${top.toFixed(2)}`)
    })
    expect(through.slice(0, 5)).toEqual([])
    expect(stepped).toBeGreaterThan(10)
  })

  it('the grandmother goes in and out of a box by its door: where she crosses the face, the board is cut away at her feet', () => {
    let crossed = 0
    const through: string[] = []
    for (const entry of CASES.filter((one) => /a door she fits|she stands up and goes back/.test(one.name))) perform(entry, Infinity, (play) => {
      const toy = play.toy, gran = granDraw(toy)
      if (Math.abs(gran.z - FRONT_Z) > 0.25) return
      const face = faceAt({ x: gran.x, y: 0.3, z: FRONT_Z }, cuttable(toy))
      if (!face) return
      crossed++
      if (!isGone(toy.state.boxes[face.id].face, Math.floor(face.cx), Math.floor(face.cy))) through.push(`${entry.name} at ${toy.time.toFixed(2)} s, ${toy.shows.gran.stage}`)
    })
    expect(through.slice(0, 5)).toEqual([])
    expect(crossed).toBeGreaterThan(10)
  })

  it('a box carried low stops against what stands in its way, and carried as high as its top goes onto it', () => {
    const play = first(), toy = play.toy, lid = middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 3)
    const big = rects(toy.state).find((rect) => rect.id === 0)!
    // Dragged level into the big box: it stops flush against its side, however far the finger goes on.
    drag(play, [lid, [lid[0] - 300, lid[1]]], 1, 30)
    expect(toy.hand?.pose?.x).toBeCloseTo(big.x + big.w / 2 + 0.55, 2)
    expect(toy.poseOf('box:3').x).toBeCloseTo(big.x + big.w / 2 + 0.55, 2)
    // Lifted over the top of it, it goes over.
    slide(play, 1, [lid[0] - 300, lid[1]], [lid[0] - 300, lid[1] - 260], 20)
    expect(toy.hand!.pose!.x).toBeLessThan(big.x + big.w / 2)
    expect(toy.hand!.pose!.y).toBeGreaterThanOrEqual(big.foot + big.h)
  })

  it('the roof turns the corner of every lid it lies over: a point of it lies on each edge, and none of it cuts through a box', () => {
    for (const from of [builtFort, () => { const state = freshFort(null); state.blanket = [0, 3]; return state }]) {
      const state = from(), cloth = restCloth(state)
      const under = state.blanket.map((id) => rects(state).find((rect) => rect.id === id)!)
      expect(under).toHaveLength(2)
      for (const rect of under) for (const edge of [rect.x - rect.w / 2, rect.x + rect.w / 2]) {
        // No stretch of it between two points passes below the lid inside the box.
        for (let i = 0; i + 1 < cloth.xs.length; i++) {
          const [x0, x1] = [cloth.xs[i], cloth.xs[i + 1]]
          if (x0 >= edge - 1e-9 || x1 <= edge + 1e-9) continue
          const inside = Math.abs(x0 - rect.x) < rect.w / 2 ? i : i + 1, outside = inside === i ? i + 1 : i
          // The stretch crosses the wall: it must cross above the lid.
          const t = (edge - cloth.xs[inside]) / (cloth.xs[outside] - cloth.xs[inside])
          expect(cloth.ys[inside] + (cloth.ys[outside] - cloth.ys[inside]) * t, `box ${rect.id}, edge at ${edge}`).toBeGreaterThanOrEqual(rect.foot + rect.h)
        }
      }
    }
  })

  it('the blanket goes up, across and down: thrown over two boxes it is above them all the way, and above the cat that sits on one', () => {
    const state = freshFort(null)
    state.cat = { at: 'top', box: 0, cell: 0 }
    const play = playOf(state), toy = play.toy
    dragAndLift(play, [middle(play, 'blanket'), room(play, 0.2, 2.2)], 1, 20)
    let low = Infinity, hopped = false, frames = 0
    for (let t = 0; t < HANG_S + 2; t += FRAME) {
      run(play, FRAME)
      if (toy.clothMoved() >= 1 || toy.state.blanket.length !== 2) continue
      frames++
      const cloth = toy.cloth(), cat = catDraw(toy)
      hopped = hopped || toy.shows.cat.stage === 'hop'
      // Over the cat, wherever the blanket is over the lid the cat is on and the cat is still on it. In the hand, and on its way up, it is out in front of the faces.
      for (let i = 0; i < cloth.xs.length; i++) if (cat.body.show && cat.body.z < FRONT_Z + 0.02 && cloth.back < cat.body.z + 0.25 && Math.abs(cloth.xs[i] - cat.body.x) < 0.45) low = Math.min(low, cloth.ys[i] - (cat.body.y + 0.7 * cat.body.sy))
    }
    expect(frames).toBeGreaterThan(10)
    expect(hopped).toBe(true)
    expect(low).toBeGreaterThan(0)
    expect(toy.state.blanket).toHaveLength(2)
  })

  it('a carried cushion is over the rug and over a cushion that lies there, never in them', () => {
    const play = first(), toy = play.toy, which = (index: number) => (target: { kind: string; index?: number }): boolean => target.kind === 'cushion' && target.index === index
    carry(play, middle(play, 'cushion', which(0)), room(play, 0.9, 0.4))
    run(play, 1)
    const lying = toy.poseOf('cushion:0')
    drag(play, [middle(play, 'cushion', which(1)), room(play, 0.9, 0.5), room(play, 0.9, 0.02)], 1, 20)
    const held = toy.poseOf('cushion:1')
    expect(held.x).toBeCloseTo(0.9, 1)
    expect(held.y - CUSHION_HALF).toBeGreaterThan(lying.y)
    // Over bare rug it is clear of the rug.
    slide(play, 1, room(play, 0.9, 0.02), room(play, -0.6, 0.02), 20)
    expect(toy.poseOf('cushion:1').y - CUSHION_HALF).toBeGreaterThan(0)
  })

  it('a cushion on its way has turned the way it will lie before it is there', () => {
    const play = first(), toy = play.toy
    dragAndLift(play, [middle(play, 'cushion', (target) => target.kind === 'cushion' && target.index === 0), room(play, 0.9, 0.4)])
    run(play, HANG_S + FRAME)
    let turned = -1
    for (let t = 0; t < 1; t += FRAME) { run(play, FRAME); if (turned < 0 && Math.abs(toy.poseOf('cushion:0').flat - LIES_FLAT) < 1e-6) turned = toy.moving('cushion:0') }
    expect(turned).toBeGreaterThan(0)
    // By six tenths of its way.
    expect(turned).toBeLessThanOrEqual(0.65)
  })
})

describe('what a sample every 33 ms found', () => {
  const act = (starts: string): (typeof CASES)[number] => { const entry = CASES.find((one) => one.name.startsWith(starts)); if (!entry) throw new Error(`no act begins "${starts}"`); return entry }
  /** A closed square cut on the big box by one finger. */
  const square = (play: P, x0: number, y0: number, x1: number, y1: number): void => { dragAndLift(play, [onFace(play, 0, x0, y0), onFace(play, 0, x1, y0), onFace(play, 0, x1, y1), onFace(play, 0, x0, y1), onFace(play, 0, x0, y0 - 2)]) }

  it('the tail that sweeps a piece off the rug never turns down into the rug', () => {
    const play = first(), toy = play.toy
    square(play, 100, 40, 150, 90)
    run(play, 7)
    square(play, 20, 30, 60, 70)
    let sweeps = 0, lowest = Infinity
    for (let t = 0; t < 8; t += FRAME) {
      run(play, FRAME)
      if (toy.shows.cat.stage !== 'sweep') continue
      sweeps++
      lowest = Math.min(lowest, catDraw(toy).tail)
    }
    expect(sweeps).toBeGreaterThan(5)
    // Turned further down than this, the tail of a cat that sits on the rug is in the rug.
    expect(lowest).toBeGreaterThanOrEqual(-0.2 - 1e-9)
    // And it does flick: it is not held still.
    expect(lowest).toBeLessThan(0.2)
  })

  it('down off a box the cat is out in front of the faces before it comes down at all: it never sinks through the lid it leaves', () => {
    let hops = 0
    const sunk: string[] = []
    for (const entry of CASES) perform(entry, Infinity, (play) => {
      const toy = play.toy, show = toy.shows.cat
      // The first quarter of the hop: after that it is out in front, and comes down there.
      if (show.stage !== 'hop' || show.n === HOP_ROUND || show.from.y - show.to.y <= 0.3 || show.p > 0.25) return
      hops++
      const body = catDraw(toy).body
      if (body.z < FRONT_Z + 0.1 && body.y < show.from.y - 0.03) sunk.push(`${entry.name} at ${toy.time.toFixed(2)} s: ${body.y.toFixed(2)} at depth ${body.z.toFixed(2)}`)
    })
    expect(hops).toBeGreaterThan(10)
    expect(sunk.slice(0, 5)).toEqual([])
  })

  it('the blanket on its way travels with its hem above every box it passes over', () => {
    let over = 0
    const low: string[] = []
    for (const entry of CASES) perform(entry, Infinity, (play) => {
      const toy = play.toy
      if (toy.clothMoved() >= 1) return
      const cloth = toy.cloth()
      for (let id = 0; id < BOX_COUNT; id++) {
        const pose = toy.poseOf(`box:${id}`), kind = kindOf(id)
        // Its front edge, where it hangs down, is over the box: behind its face and not yet past its back wall.
        if (pose.flat > 0.1 || pose.side > 0.1 || cloth.front > FRONT_Z + pose.z - 0.03 || cloth.front < FRONT_Z + pose.z - kind.d - 0.05) continue
        cloth.xs.forEach((x, i) => {
          if (Math.abs(x - pose.x) > kind.w / 2) return
          over++
          // A hand above the lid: over a box its hem is well clear of the lid and of the flap that stands up along its back edge.
          if (cloth.ys[i] - cloth.hang < pose.y + kind.h + 0.1) low.push(`${entry.name} at ${toy.time.toFixed(2)} s: hem at ${(cloth.ys[i] - cloth.hang).toFixed(2)} over box ${id}, whose lid is at ${(pose.y + kind.h).toFixed(2)}`)
        })
      }
    })
    expect(over).toBeGreaterThan(10)
    expect(low.slice(0, 5)).toEqual([])
  })

  it('the blanket over the cat ends where its tail begins: the cat is drawn in under it and its tail lies out from under the edge', () => {
    let under = 0
    const out: string[] = []
    perform(act('blanket and the cat'), Infinity, (play) => {
      const toy = play.toy
      if (toy.shows.cat.stage !== 'under' || !toy.clothBy) return
      under++
      const cat = catDraw(toy), cloth = toy.cloth(), edge = cloth.xs[cloth.xs.length - 1], when = `${toy.time.toFixed(2)} s`
      // The tail begins a quarter of a metre from its middle, as it is cut; the edge of the blanket is there, within a hand.
      const root = cat.body.x + 0.24 * cat.body.sx
      if (edge > root + 0.12 || edge < root) out.push(`${when}: the edge at ${edge.toFixed(2)}, the tail from ${root.toFixed(2)}`)
      // Its body is under the blanket from side to side.
      const half = 0.32 * cat.body.sx
      if (cat.body.x + half > edge + 0.001 || cat.body.x - half < cloth.xs[0]) out.push(`${when}: its body out from under the blanket`)
      // The tail lies over, away from the mound: upright it would stand up through the cloth, and further over it would be in the lid.
      if (cat.tail > -0.19 || cat.tail < -0.31) out.push(`${when}: its tail at ${cat.tail.toFixed(2)}`)
      // The blanket lies on the lid, not in it.
      if (Math.min(...cloth.ys) < cat.body.y + 0.02) out.push(`${when}: the blanket in the lid`)
    })
    expect(under).toBeGreaterThan(60)
    expect(out.slice(0, 5)).toEqual([])
  })

  it('under the blanket the baby has its rattle at its mouth, under the cloth, and the rattle comes up again only once the blanket is off', () => {
    let hidden = 0, off = 0
    const out: string[] = []
    perform(act('blanket and the baby'), Infinity, (play) => {
      const toy = play.toy, stage = toy.shows.baby.stage
      if (stage !== 'hide' && stage !== 'reveal') return
      const rattle = rattleAt(babyDraw(toy)), cloth = toy.cloth(), when = `${toy.time.toFixed(2)} s`
      // The blanket above the rattle: the lowest of the cloth within a hand of it.
      const near = cloth.xs.map((x, i) => (Math.abs(x - rattle.x) < 0.16 ? cloth.ys[i] : Infinity)), above = Math.min(...near)
      if (stage === 'hide') {
        hidden++
        if (!Number.isFinite(above) || rattle.y + 0.1 > above) out.push(`${when}: the rattle at ${rattle.y.toFixed(2)} under cloth at ${above.toFixed(2)}`)
      } else if (Number.isFinite(above) && rattle.z < cloth.front && rattle.z > cloth.back) {
        // While the blanket is still over it as it comes off, the rattle is below it.
        off++
        if (rattle.y + 0.1 > above) out.push(`${when}: the rattle at ${rattle.y.toFixed(2)} up through cloth at ${above.toFixed(2)} as it comes off`)
      }
    })
    expect(hidden).toBeGreaterThan(60)
    expect(off).toBeGreaterThan(3)
    expect(out.slice(0, 5)).toEqual([])
  })

  it('the cat gets off the cushion it lay on before the cushion goes back: the cushion is never pulled out through it', () => {
    let going = 0, off = 0
    const through: string[] = []
    perform(act('cushion and the cat'), Infinity, (play) => {
      const toy = play.toy, cat = catDraw(toy).body
      for (let index = 0; index < 3; index++) {
        if (toy.moving(`cushion:${index}`) >= 1 || toy.hand) continue
        going++
        if (toy.shows.cat.stage === 'hop') off++
        const cushion = toy.poseOf(`cushion:${index}`)
        // The cushion is 86 cm wide and, lying flat, 74 cm from front to back. Where it is under the cat, the cat's feet are above it.
        if (Math.abs(cushion.x - cat.x) < CUSHION_HALF + 0.3 && Math.abs(cushion.z - cat.z) < 0.4 && cat.y < cushion.y + 0.05) through.push(`${toy.time.toFixed(2)} s: the cat's feet at ${cat.y.toFixed(2)}, the cushion at ${cushion.y.toFixed(2)}`)
      }
    })
    expect(going).toBeGreaterThan(10)
    // It is in the air while the cushion goes.
    expect(off).toBeGreaterThan(5)
    expect(through.slice(0, 5)).toEqual([])
  })

  it('a toy posted into a box runs along inside the face and goes back to its place only once it is past the toys that lie there', () => {
    let flying = 0
    const hits: string[] = []
    perform(act('hole and the baby: posts its toys'), Infinity, (play) => {
      const toy = play.toy, state = toy.state
      for (const index of [1, 2]) {
        if (state.toys[index] < 0 || toy.moving(`toy:${index}`) >= 1 || toy.withBaby.has(index)) continue
        flying++
        const flies = toy.poseOf(`toy:${index}`)
        for (const other of [0, 1, 2]) {
          if (other === index || state.toys[other] !== state.toys[index] || toy.moving(`toy:${other}`) < 1) continue
          const lies = toy.poseOf(`toy:${other}`)
          // The ball and the block are a hand across; side by side they lie a hand and a half apart.
          if (Math.abs(flies.x - lies.x) < 0.17 && Math.abs(flies.z - lies.z) < 0.1 && Math.abs(flies.y - lies.y) < 0.17) hits.push(`toy ${index} at toy ${other}, ${toy.time.toFixed(2)} s`)
        }
      }
    })
    expect(flying).toBeGreaterThan(10)
    expect(hits.slice(0, 5)).toEqual([])
  })
})
