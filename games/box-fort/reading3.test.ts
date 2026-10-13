import { describe, expect, it } from 'vitest'
import mount from './box-fort.tsx?raw'
import { goneShare } from './face'
import { dropBox, loadFort, rects, topOf } from './fort'
import { MAX_LINE, ON_HEAP, ON_RUG, freshFort, type FortState } from './fortState'
import { LIGHTS_FALL } from './hands'
import { FLAP, FRONT_Z, RUG, kindOf } from './layout'
import { KNITS, granDraw, onTorso } from './people'
import { heaped, restBulbs, restCloth } from './rest'
import { FRAME, drag, dragAndLift, first, heard, hole, middle, onFace, playOf, px, reopened, run, spot, stored, tap } from './testing'
import { BLADES_S, HANG_S, MAX_PATH, type Cue } from './toy'

// What the third fresh reading and the third audit run asked for, each as a test that fails when the fix is
// taken out. Everything a finger does here goes the way a finger goes: through play.ts, by pointer id and
// surface pixel. A fort is set up by hand only where the test is about a record that is loaded.

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
/** How far a point of the surface moves when the place under it moves `dx` along the rug, in the plane of the faces. */
const along = (play: P, dx: number): number => room(play, dx, 0)[0] - room(play, 0, 0)[0]
/** Takes what lies at `from`, carries it by each of `to`, lets go, and plays until it has been set down. */
function carry(play: P, from: Point, ...to: Point[]): Cue[] {
  return [...dragAndLift(play, [from, ...to]), ...run(play, HANG_S + 0.05)]
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
/** The same with a line cut on the small box that was not closed, and waits. */
function lined(): P {
  const play = stacked()
  dragAndLift(play, [onFace(play, 3, 20, 20), onFace(play, 3, 60, 20), onFace(play, 3, 60, 50), onFace(play, 3, 24, 50)])
  run(play, 2)
  if (play.toy.state.line?.box !== 3) throw new Error('no line waits on the small box')
  return play
}

describe('a roof in a record that is loaded', () => {
  /** Two storeys on both boxes of a first visit, as the audit starts several of its moments. */
  function built(blanket: number[]): FortState {
    const state = freshFort(4)
    Object.assign(state.boxes[0], { x: -35, on: ON_RUG })
    Object.assign(state.boxes[3], { x: 130, on: ON_RUG })
    Object.assign(state.boxes[1], { x: -35, on: 0 })
    Object.assign(state.boxes[4], { x: 130, on: 3 })
    state.blanket = blanket
    return loadFort(stored(state))
  }
  /** Whether any point of the blanket where it rests is inside a box that stands. */
  function inABox(state: FortState): boolean {
    const cloth = restCloth(state)
    return cloth.xs.some((x, i) => rects(state).some((rect) => !rect.side && x > rect.x - rect.w / 2 + 0.02 && x < rect.x + rect.w / 2 - 0.02 && cloth.ys[i] > rect.foot + 0.02 && cloth.ys[i] < topOf(rect) - 0.02))
  }

  it('slides off a lid that carries a box: the blanket never lies inside a box, whatever the record holds', () => {
    // A roof over the two lower boxes, each with a box standing on it: no finger can throw that, but a record can hold it.
    const state = built([0, 3])
    expect(state.blanket.length).toBeLessThan(2)
    expect(inABox(state)).toBe(false)
    // Over the two bare lids on top it is a roof, and stays one.
    const roofed = built([1, 4])
    expect(roofed.blanket).toEqual([1, 4])
    expect(inABox(roofed)).toBe(false)
  })
})

describe('the string of lights let go over nothing', () => {
  it('is seen to fall into its tangle: down over many frames, never up and never in one jump, and its glass sound comes as it lands', () => {
    const play = first(4), toy = play.toy
    // Off its hook, out over the rug high above the boxes and past no corner, and let go there.
    dragAndLift(play, [middle(play, 'lights'), room(play, 1.2, 2.7), room(play, 1.0, 2.6)])
    const cues: Cue[] = []
    let falling = 0, landedAt = -1, glassAt = -1, was = toy.bulbs()
    for (let t = 0; t < HANG_S + 1.5; t += FRAME) {
      play.step(FRAME)
      const now = heard(play), bulbs = toy.bulbs(), rest = restBulbs(toy.state)
      cues.push(...now)
      const off = Math.max(...bulbs.map((bulb, n) => Math.hypot(bulb.x - rest[n].x, bulb.y - rest[n].y, bulb.z - rest[n].z)))
      if (toy.state.tangled) {
        // The save has it in its tangle from the moment it is let go; the picture gets there bulb by bulb.
        if (off > 0.02) falling++
        else if (landedAt < 0) landedAt = toy.time
        bulbs.forEach((bulb, n) => {
          expect(Math.hypot(bulb.x - was[n].x, bulb.y - was[n].y, bulb.z - was[n].z), `bulb ${n} at ${toy.time.toFixed(2)} s`).toBeLessThan(0.3)
          expect(bulb.y, `bulb ${n} at ${toy.time.toFixed(2)} s`).toBeLessThanOrEqual(was[n].y + 1e-9)
        })
      }
      if (now.some((cue) => cue.sound === 'glass')) { glassAt = toy.time; expect(off).toBeLessThan(0.02) }
      was = bulbs
    }
    expect(toy.state.tangled).toBe(true)
    expect(falling).toBeGreaterThan(LIGHTS_FALL.rug / FRAME)
    expect(glassAt).toBeGreaterThan(0)
    expect(Math.abs(glassAt - landedAt)).toBeLessThan(2 * FRAME)
    expect(sounds(cues).filter((sound) => sound === 'glass')).toHaveLength(1)
  })

  it('is found in its tangle when the game is put away while it falls, and falls no further when it is taken up again', () => {
    const play = first(4), toy = play.toy
    dragAndLift(play, [middle(play, 'lights'), room(play, 1.2, 2.7), room(play, 1.0, 2.6)])
    run(play, HANG_S + 0.1)
    expect(toy.state.tangled).toBe(true)
    expect(toy.bulbs()[0].y).toBeGreaterThan(restBulbs(toy.state)[0].y + 0.3)
    expect(reopened(play).toy.bulbs()).toEqual(restBulbs(toy.state))
    play.park()
    expect(toy.bulbs()).toEqual(restBulbs(toy.state))
    expect(sounds(run(play, 1))).not.toContain('glass')
    // Taken up while it falls, it is in the hand from that frame and the fall is over.
    const again = first(4)
    dragAndLift(again, [middle(again, 'lights'), room(again, 1.2, 2.7), room(again, 1.0, 2.6)])
    run(again, HANG_S + 0.1)
    const grip = middle(again, 'lights')
    drag(again, [grip, [grip[0], grip[1] - 60]])
    expect(again.toy.hand?.kind).toBe('lights')
    const held = again.toy.bulbs()
    expect(sounds(run(again, 1))).not.toContain('glass')
    expect(again.toy.bulbs()).toEqual(held)
  })
})

describe('the heap', () => {
  /** Whether a box of the heap could be let go anywhere at all and stay in the fort. */
  function hasPlace(state: FortState, id: number): boolean {
    for (let x = RUG.left; x <= RUG.right; x += 0.05) {
      for (const finger of [x, null]) {
        const trial: FortState = { ...state, boxes: state.boxes.map((box) => ({ ...box })), blanket: [...state.blanket] }
        if (dropBox(trial, id, x, finger).how !== 'back') return true
      }
    }
    return false
  }
  const standing = (state: FortState): number => state.boxes.filter((box) => box.on !== ON_HEAP).length

  it('has the smallest box on top, and of two the same size the lower id', () => {
    expect(heaped(freshFort(4))).toEqual([2, 1, 4])
    expect(heaped(freshFort(8))).toEqual([2, 1, 4, 3])
  })

  it('does not stop a first visit at four at three boxes: the box on top goes onto the small one, the next onto the big one, and only the last has no place', () => {
    const play = first(4), toy = play.toy
    expect(standing(toy.state)).toBe(2)
    // Each is let go low, over the box a child would try first.
    carry(play, middle(play, 'heap'), room(play, 1.3, 0.5))
    run(play, 1.5)
    expect(standing(toy.state)).toBe(3)
    carry(play, middle(play, 'heap'), room(play, -0.3, 0.5))
    run(play, 1.5)
    expect(standing(toy.state)).toBe(4)
    // The last is as wide as the one on the big box: no lid bears it, and the rug is full. No other box is left that could go where it cannot.
    const last = heaped(toy.state)
    expect(last).toHaveLength(1)
    expect(hasPlace(toy.state, last[0])).toBe(false)
  })

  it('offers a box that has a place whenever any box on it has one: through a hundred and twenty carries of every kind, from both first visits', () => {
    let looked = 0, stuck = 0
    for (const [age, seed] of [[4, 1], [4, 2], [8, 3], [8, 4]] as const) {
      const play = first(age, seed), toy = play.toy
      let s = seed * 7919
      const next = (): number => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 }
      for (let n = 0; n < 30; n++) {
        const up = toy.state.boxes.filter((box) => box.on !== ON_HEAP && spot(play, 'flap', (target) => target.kind === 'flap' && target.id === box.id))
        const fromHeap = heaped(toy.state).length > 0 && (up.length === 0 || next() < 0.6)
        const from = fromHeap ? middle(play, 'heap') : up.length > 0 ? flapOf(play, up[Math.floor(next() * up.length)].id) : null
        if (!from) break
        const to = next() < 0.15 ? middle(play, 'heap') : room(play, -1.6 + next() * 3.5, 0.2 + next() * 2.6)
        carry(play, from, to)
        run(play, 2.5)
        const pile = heaped(toy.state)
        if (pile.length === 0) continue
        looked++
        const top = pile[pile.length - 1]
        if (!hasPlace(toy.state, top)) { stuck++; for (const id of pile) expect(hasPlace(toy.state, id), `box ${id} under box ${top}, age ${age}, carry ${n}`).toBe(false) }
      }
    }
    // The test has looked, and has met forts where nothing more can stand.
    expect(looked).toBeGreaterThan(80)
    expect(stuck).toBeGreaterThan(3)
  })
})

describe('a line that waits on a box that leaves the fort', () => {
  it('is closed the short way before the box is folded onto the heap: the box hangs over the heap, the cat gets off it, the blades run the line shut, its piece falls, and only then is it folded', () => {
    const play = lined(), toy = play.toy
    expect(toy.state.cat.at).toBe('top')
    const lid = lidRight(play, 3)
    dragAndLift(play, [lid, room(play, 1.6, 1.6), middle(play, 'heap')])
    const hung = toy.poseOf('box:3')
    const cues: Cue[] = []
    let waits = 0, bitten = -1, foldsAt = -1, pieceAt = -1
    for (let t = 0; t < HANG_S + 3.5; t += FRAME) {
      play.step(FRAME)
      const now = heard(play)
      cues.push(...now)
      if (toy.state.boxes[3].on !== ON_HEAP) continue
      // From the moment it is let go the save has the box on the heap as fresh board, and no line: found as left at any instant.
      expect(toy.state.line).toBeNull()
      expect(goneShare(toy.state.boxes[3].face)).toBe(0)
      if (now.some((cue) => cue.sound === 'bite')) bitten = toy.time
      if (toy.piece && pieceAt < 0) pieceAt = toy.time
      const pose = toy.poseOf('box:3'), hangs = Math.abs(pose.x - hung.x) + Math.abs(pose.y - hung.y) + pose.flat < 1e-6
      if (!hangs && foldsAt < 0) foldsAt = toy.time
      if (toy.closing) {
        // The line is still drawn on the face the box shows, which is the face it had; the box hangs.
        waits++
        expect(hangs).toBe(true)
        expect(toy.closing.stroke.box).toBe(3)
        expect(toy.kept.has(3)).toBe(true)
        expect(goneShare(toy.kept.get(3)!)).toBeGreaterThan(0.1)
        expect(toy.piece).toBeNull()
      }
    }
    expect(waits).toBeGreaterThan(20)
    expect(bitten).toBeGreaterThan(0)
    expect(pieceAt).toBeGreaterThan(0)
    expect(pieceAt).toBeLessThanOrEqual(bitten + FRAME)
    // It is folded only once the blades have run the line shut, and lies on the heap as fresh board.
    expect(foldsAt).toBeGreaterThanOrEqual(bitten + BLADES_S - 2 * FRAME)
    expect(sounds(cues)).toEqual(expect.arrayContaining(['bite', 'slap', 'fold']))
    expect(sounds(cues).indexOf('bite')).toBeLessThan(sounds(cues).indexOf('fold'))
    expect(toy.kept.size).toBe(0)
    expect(toy.restOf('box:3').flat).toBe(1)
  })

  it('is closed the short way before a pull of the tape end takes its box: where the box stands, with its piece falling, before the box hops back to the heap', () => {
    const play = lined(), toy = play.toy
    // A strip over the seam under the small box, and then one pull of the loose end.
    const rect = toy.rect(3)!
    carry(play, middle(play, 'roll'), room(play, rect.x, rect.foot))
    run(play, 1)
    expect(toy.state.tapes).toHaveLength(1)
    expect(toy.state.line?.box).toBe(3)
    const stood = toy.poseOf('box:3'), tab = middle(play, 'tab')
    const cues: Cue[] = dragAndLift(play, [tab, [tab[0] + along(play, 0.5), tab[1]]])
    let waits = 0, bitten = -1, goesAt = -1
    for (let t = 0; t < 5; t += FRAME) {
      play.step(FRAME)
      const now = heard(play)
      cues.push(...now)
      expect(toy.state.line).toBeNull()
      expect(toy.state.boxes[3].on).toBe(ON_HEAP)
      if (now.some((cue) => cue.sound === 'bite')) bitten = toy.time
      const pose = toy.poseOf('box:3'), stands = Math.abs(pose.x - stood.x) + Math.abs(pose.y - stood.y) + pose.flat < 1e-6
      if (!stands && goesAt < 0) goesAt = toy.time
      if (toy.closing) { waits++; expect(stands).toBe(true); expect(toy.piece).toBeNull() }
    }
    expect(waits).toBeGreaterThan(10)
    expect(bitten).toBeGreaterThan(0)
    expect(goesAt).toBeGreaterThanOrEqual(bitten + BLADES_S - 2 * FRAME)
    expect(sounds(cues)).toEqual(expect.arrayContaining(['tear', 'bite', 'slap', 'fold']))
    expect(toy.kept.size).toBe(0)
    // Put away while the line is still to be shut, the fort is found as the save has it, and no piece lies about.
    const away = lined()
    const under = away.toy.rect(3)!
    carry(away, middle(away, 'roll'), room(away, under.x, under.foot))
    run(away, 1)
    const end = middle(away, 'tab')
    dragAndLift(away, [end, [end[0] + along(away, 0.5), end[1]]])
    run(away, 0.1)
    expect(away.toy.closing).not.toBeNull()
    away.park()
    expect(away.toy.closing).toBeNull()
    expect(away.toy.kept.size).toBe(0)
    expect(away.toy.piece).toBeNull()
    expect(sounds(run(away, 2))).not.toContain('bite')
  })
})

describe('a cut round the whole big face', () => {
  it('is one cut: the finger goes all the way round inside the frame and the line closes only where it began', () => {
    const play = first(8), toy = play.toy
    const round: Point[] = [onFace(play, 0, 6, 6), onFace(play, 0, 170, 6), onFace(play, 0, 170, 122), onFace(play, 0, 6, 122), onFace(play, 0, 6, 9)]
    // A point for each cell or so, as a finger gives them.
    const cues = drag(play, round.slice(0, 4), 1, 170)
    let longest = toy.stroke?.path.length ?? 0
    expect(sounds(cues)).not.toContain('slap')
    expect(toy.stroke).not.toBeNull()
    // Three sides round, the line is longer than any line was allowed to be before, and is still one line.
    expect(longest).toBeGreaterThan(360)
    expect(goneShare(toy.state.boxes[0].face)).toBe(0)
    const [ax, ay] = round[3], [bx, by] = round[4]
    for (let step = 1; step <= 120 && toy.stroke; step++) {
      longest = Math.max(longest, toy.stroke.path.length)
      play.move(1, ax + ((bx - ax) * step) / 120, ay + ((by - ay) * step) / 120)
      cues.push(...heard(play), ...run(play, FRAME))
    }
    expect(longest).toBeLessThan(MAX_PATH)
    // It closed where it began, and what it went round is gone: nearly the whole face.
    expect(toy.stroke).toBeNull()
    expect(toy.state.line).toBeNull()
    expect(goneShare(toy.state.boxes[0].face)).toBeGreaterThan(0.8)
    cues.push(...run(play, 2))
    expect(sounds(cues).filter((sound) => sound === 'slap')).toHaveLength(1)
  })

  it('saves a line of any length it can have with at most its limit of points, its last point where the finger left it, and keeps the largest record under half the size a record may have', () => {
    const play = first(8), toy = play.toy
    // To and fro across the big face in rows that never meet: longer than a line is saved point for point.
    const rows: Point[] = []
    for (let row = 0; row < 7; row++) rows.push(onFace(play, 0, row % 2 ? 168 : 8, 10 + row * 16), onFace(play, 0, row % 2 ? 8 : 168, 10 + row * 16))
    drag(play, rows, 1, 160)
    const drawn = toy.stroke!.path.length, last = toy.stroke!.path[drawn - 1]
    expect(drawn).toBeGreaterThan(MAX_LINE)
    expect(drawn).toBeLessThan(MAX_PATH)
    play.up(1, rows[rows.length - 1][0], rows[rows.length - 1][1])
    const line = toy.state.line!
    expect(line.path.length / 2).toBeLessThanOrEqual(MAX_LINE)
    expect(line.path.slice(-2)).toEqual([Math.round(last.x * 10) / 10, Math.round(last.y * 10) / 10])
    expect(reopened(play).toy.state.line).toEqual(line)
    // The largest record: every face cut to pieces and a line of the most points a record holds.
    const full = freshFort(8)
    for (const box of full.boxes) { box.on = ON_RUG; box.face.gone.forEach((_, i) => { box.face.gone[i] = i % 3 === 0 ? 1 : 0 }) }
    full.tapes = Array.from({ length: 8 }, () => [0, 1] as [number, number])
    full.lights = Array.from({ length: 12 }, (_, i) => i % 10)
    full.line = { box: 0, path: Array.from({ length: MAX_LINE * 2 }, (_, i) => 100.5 + (i % 70)) }
    // Under 20 KB, as the sheet says, and so well under half of what a record may be.
    expect(JSON.stringify(stored(full)).length).toBeLessThan(20 * 1024)
  })
})

describe('the grandmother and a thing done to the box she is in', () => {
  /** Plays on and holds that she blames nobody: from her own small noise on, her brows stay down and her eyes are on her knitting. Returns the sounds, and how many frames her eyes were there. */
  function watch(play: P, seconds: number): { cues: Cue[]; knits: number } {
    const toy = play.toy, cues: Cue[] = []
    let knits = 0
    for (let t = 0; t < seconds; t += FRAME) {
      play.step(FRAME)
      cues.push(...heard(play))
      const draw = granDraw(toy)
      if (toy.age('gran:knit') < KNITS) {
        // Her eyes are down on her own hands, in front of her and below her head.
        knits++
        expect(draw.brow, `at ${toy.time.toFixed(2)} s`).toBeLessThan(0.5)
        expect(draw.look.y).toBeLessThan(draw.y + 1.3 * draw.scale)
        expect(Math.abs(draw.look.x - draw.x)).toBeLessThan(0.05)
        expect(draw.headNod).toBeGreaterThan(0.1)
      }
    }
    return { cues, knits }
  }

  it('turned out of it by a pull of the tape end, she does not cluck at the child: her needles click, her eyes are on her knitting, and she goes back to her chair', () => {
    // She sits in the big box by its door; a strip holds the two boxes, and one pull takes the big box from round her.
    const play = playOf((() => { const state = freshFort(4); hole(state, 0, 90, 2, 160, 104); return state })()), toy = play.toy
    tap(play, middle(play, 'gran'))
    run(play, 7)
    expect(toy.state.gran).toEqual({ at: 'in', box: 0 })
    carry(play, middle(play, 'roll'), room(play, 0.75, 0.4))
    run(play, 1)
    expect(toy.state.tapes).toHaveLength(1)
    const tab = middle(play, 'tab')
    dragAndLift(play, [tab, [tab[0] + along(play, 0.5), tab[1]]])
    expect(toy.state.gran.at).toBe('chair')
    const { cues, knits } = watch(play, 6)
    expect(sounds(cues)).toContain('click')
    expect(sounds(cues)).not.toContain('cluck')
    expect(sounds(cues)).not.toContain('ooh')
    expect(knits).toBeGreaterThan(60)
    expect(toy.shows.gran.stage).toBe('chair')
  })

  it('given a cushion or the blanket on the box she wears, she does not cluck either: her needles click, her eyes stay on them, and the thing goes back', () => {
    for (const thing of ['cushion', 'blanket'] as const) {
      const play = first(4), toy = play.toy
      tap(play, middle(play, 'gran'))
      run(play, 7)
      expect(toy.state.gran).toEqual({ at: 'skirt', box: 3 })
      const hers = toy.rect(3)!, before = JSON.stringify(stored(toy.state))
      dragAndLift(play, [thing === 'cushion' ? middle(play, 'cushion', (target) => target.kind === 'cushion' && target.index === 1) : middle(play, 'blanket'), room(play, hers.x, hers.foot + 0.3)])
      const { cues, knits } = watch(play, HANG_S + 2.5)
      expect(sounds(cues), thing).toContain('click')
      expect(sounds(cues), thing).not.toContain('cluck')
      expect(knits, thing).toBeGreaterThan(60)
      expect(JSON.stringify(stored(toy.state)), thing).toBe(before)
    }
  })
})

describe('a finger whose capture the surface loses', () => {
  it('is a cancel when neither its lift nor its cancel has come, and nothing more when one has', () => {
    // The Mount hears of it, and takes it for a cancel only while it still counts that finger as down.
    expect(mount).toMatch(/const onLost = \(event: PointerEvent\) => \{\s*if \(fingers\.has\(event\.pointerId\)\) onCancel\(event\)\s*\}/)
    expect(mount).toContain("root.addEventListener('lostpointercapture', onLost)")
    expect(mount).toContain("root.removeEventListener('lostpointercapture', onLost)")
    // What a cancel does: the box in the hand is back where it was, as if never taken.
    const play = first(4), toy = play.toy, before = JSON.stringify(stored(toy.state)), lid = flapOf(play, 3)
    drag(play, [lid, [lid[0] + along(play, -0.8), lid[1] - 60]])
    expect(toy.hand?.kind).toBe('box')
    play.cancel(1)
    run(play, 1)
    expect(toy.hand).toBeNull()
    expect(JSON.stringify(stored(toy.state))).toBe(before)
    // And after a lift, the same finger's cancel is nothing: the box stays where it was let go.
    carry(play, flapOf(play, 3), [lid[0] + along(play, -1.65), lid[1] - 40])
    run(play, 1.5)
    const after = JSON.stringify(stored(toy.state))
    expect(after).not.toBe(before)
    play.cancel(1)
    expect(sounds(run(play, 1))).toEqual([])
    expect(JSON.stringify(stored(toy.state))).toBe(after)
  })
})

describe('what the last stepped check found', () => {
  it('the grandmother\'s head goes back through the wall of a box that goes over her only above or below that wall, on its way on and on its way off, whatever she was doing', () => {
    // The back wall of the small box, which stands with its face at the front of the fort.
    const back = FRONT_Z - kindOf(3).d, tall = kindOf(3).h
    let leaned = 0, under = 0, near = 0
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      // On a first visit no hole reaches the floor: tapped, she sits down in the small box and comes up wearing it; tapped again, she takes it off.
      const play = first(4, seed), toy = play.toy
      for (const [waits, lasts] of [[0.4 * seed, 7], [0.3 * seed, 6]] as const) {
        run(play, waits)
        tap(play, middle(play, 'gran'))
        for (let i = 0; i < lasts / FRAME; i++) {
          play.step(FRAME)
          heard(play)
          if (toy.shows.gran.stage !== 'under') continue
          under++
          const draw = granDraw(toy), rim = toy.poseOf('box:3').y
          if (Math.abs(draw.lean) > 0.01) leaned++
          // Her head from her chin to the top of her hat, along the line her back leans on.
          for (let up = 1.0; up <= 2.06; up += 0.04) {
            const at = onTorso(draw, up)
            if (Math.abs(at.z - back) > 0.06) continue
            near++
            const clear = at.y < rim - 0.02 || at.y > rim + tall + FLAP + 0.02
            expect(clear, `seed ${seed} at ${toy.time.toFixed(2)} s: her head at ${at.y.toFixed(2)} is in the back wall, which is from ${rim.toFixed(2)} to ${(rim + tall).toFixed(2)}`).toBe(true)
          }
        }
      }
      expect(toy.state.gran.at).toBe('chair')
    }
    expect(under).toBeGreaterThan(600)
    expect(leaned).toBeGreaterThan(200)
    expect(near).toBeGreaterThan(50)
  })
})
