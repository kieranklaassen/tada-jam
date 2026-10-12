import { describe, expect, it } from 'vitest'
import { goneShare } from './face'
import { freshFort } from './fortState'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW } from './guidance'
import { CORNER } from './layout'
import { REST_S, TAP_SLOP } from './play'
import { FRAME, builtFort, drag, dragAndLift, first, middle, onFace, picture, playOf, px, run, stored, tap } from './testing'
import { HANG_S } from './toy'

// Everything here goes the way a finger goes: through the Mount's path (play.ts), by pointer id and surface pixel.

const square = (play: ReturnType<typeof first>, id: number, x0: number, y0: number, x1: number, y1: number): [number, number][] => [onFace(play, id, x0, y0), onFace(play, id, x1, y0), onFace(play, id, x1, y1), onFace(play, id, x0, y1), onFace(play, id, x0, y0 + 4)]

describe('the cut', () => {
  it('is answered when the finger lands: the blades bite, the box shudders and everyone looks', () => {
    const play = first()
    play.down(1, ...onFace(play, 0, 100, 60))
    const toy = play.toy
    expect(toy.cues.map((cue) => cue.sound)).toEqual(['bite'])
    expect(toy.age('box:0')).toBe(0)
    expect(toy.scissors.mode).toBe('held')
    expect(toy.watching).toBe(1)
    expect(toy.stroke?.box).toBe(0)
  })

  it('follows the finger, one snip for each stretch cut, and ends when the line closes on itself: the hole is the shape drawn', () => {
    const play = first()
    const heard = drag(play, square(play, 0, 100, 40, 150, 90))
    expect(heard.filter((cue) => cue.sound === 'snip').length).toBeGreaterThan(8)
    // The piece fell while the finger was still down: the lift is not what cuts.
    expect(play.toy.stroke).toBeNull()
    expect(play.toy.state.line).toBeNull()
    const gone = goneShare(play.toy.state.boxes[0].face)
    expect(gone).toBeGreaterThan(0.08)
    expect(gone).toBeLessThan(0.14)
    // The piece tips out and is heard when it lands.
    expect(play.toy.piece?.landed).toBe(false)
    expect(run(play, 0.6).map((cue) => cue.sound)).toContain('slap')
    // A finger that lands on the board afterwards starts a new cut.
    play.up(1, ...onFace(play, 0, 100, 44))
    play.down(2, ...onFace(play, 0, 30, 30))
    expect(play.toy.stroke?.path).toHaveLength(1)
  })

  it('pokes a peep-hole with a tap, even one that slips a little and lasts most of half a second', () => {
    const play = first(), [x, y] = onFace(play, 3, 44, 30)
    play.down(1, x, y)
    play.move(1, x + TAP_SLOP - 2, y + 3)
    run(play, 0.45)
    play.up(1, x + TAP_SLOP - 2, y + 3)
    expect(play.toy.cues.map((cue) => cue.sound)).toContain('pop')
    expect(play.toy.piece?.disc).toBe(true)
    expect(goneShare(play.toy.state.boxes[3].face)).toBeGreaterThan(0)
  })

  it('snips the air anywhere else, and cuts where the scissors meet board', () => {
    const play = first()
    play.down(1, 590, 120)
    expect(play.toy.cues.splice(0).map((cue) => cue.sound)).toEqual(['air'])
    play.move(1, ...onFace(play, 0, 60, 100))
    expect(play.toy.stroke?.box).toBe(0)
  })
})

describe('a pointer cancel', () => {
  it('never acts for the child: no cut is made, the line waits as far as it got, and a carried box goes back where it was', () => {
    const cutting = first()
    drag(cutting, square(cutting, 0, 100, 40, 150, 90).slice(0, 3))
    cutting.cancel(1)
    expect(cutting.toy.stroke).toBeNull()
    expect(goneShare(cutting.toy.state.boxes[0].face)).toBe(0)
    expect(cutting.toy.state.line?.box).toBe(0)
    // A tap that is taken away pokes no hole either.
    const play = first(), before = stored(play.toy.state)
    play.down(2, ...onFace(play, 3, 44, 30))
    play.cancel(2)
    expect(stored(play.toy.state)).toEqual(before)
    drag(play, [middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 3), [300, 300]], 3)
    expect(play.toy.hand?.kind).toBe('box')
    play.cancel(3)
    expect(play.toy.hand).toBeNull()
    run(play, 1)
    expect(stored(play.toy.state)).toEqual(before)
  })
})

describe('a resting contact', () => {
  it('that landed where nothing is hands the work to the next finger at once', () => {
    const play = first()
    play.down(1, 590, 120)
    run(play, 0.1)
    expect(play.down(2, ...onFace(play, 0, 100, 60))).toBe(true)
    expect(play.toy.stroke?.box).toBe(0)
    // The first finger is no longer the one that works: its lift does nothing.
    play.up(1, 590, 120)
    expect(play.toy.stroke?.box).toBe(0)
    play.up(2, ...onFace(play, 0, 100, 60))
    expect(goneShare(play.toy.state.boxes[0].face)).toBeGreaterThan(0)
  })

  it('that has been down a second without moving hands the work over, and cuts nothing itself', () => {
    const play = first(), before = stored(play.toy.state)
    play.down(1, ...onFace(play, 0, 30, 30))
    run(play, REST_S - 0.2)
    // Before the second is up, the first finger still works: a second one gets a small answer where it lands, and changes nothing.
    play.toy.cues.splice(0)
    play.down(2, ...onFace(play, 3, 44, 30))
    expect(play.toy.cues.splice(0).map((cue) => [cue.sound, cue.mover])).toEqual([['knock', 'box:3']])
    expect(play.toy.stroke?.box).toBe(0)
    play.up(2, ...onFace(play, 3, 44, 30))
    run(play, 0.3)
    expect(play.down(3, ...onFace(play, 3, 44, 30))).toBe(true)
    expect(play.toy.stroke?.box).toBe(3)
    play.up(1, ...onFace(play, 0, 30, 30))
    expect(goneShare(play.toy.state.boxes[0].face)).toBe(0)
    play.cancel(3)
    expect(stored(play.toy.state)).toEqual(before)
  })

  it('never interrupts a finger that is cutting or carrying, however long it pauses', () => {
    const play = first()
    drag(play, square(play, 0, 100, 40, 150, 90).slice(0, 3))
    run(play, REST_S + 0.5)
    const line = play.toy.stroke!.path.length
    play.down(2, ...onFace(play, 3, 44, 30))
    expect(play.toy.stroke?.box).toBe(0)
    expect(play.toy.stroke?.path).toHaveLength(line)
    expect(goneShare(play.toy.state.boxes[3].face)).toBe(0)
    play.up(1, ...onFace(play, 0, 150, 90))
    // The line has not closed: it waits, and nothing is cut.
    expect(goneShare(play.toy.state.boxes[0].face)).toBe(0)
    expect(play.toy.state.line?.box).toBe(0)
    drag(play, [middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 3), [500, 200]], 4)
    run(play, REST_S + 0.5)
    play.down(5, 590, 120)
    expect(play.toy.hand?.kind).toBe('box')
    expect(play.toy.hand?.lifted).toBeNull()
  })

  it('lets a finger that holds nothing give way to the next: a tap on the cat is not a hand on the game', () => {
    const play = first()
    play.down(1, ...middle(play, 'cat'))
    run(play, 0.1)
    expect(play.down(2, ...onFace(play, 3, 44, 30))).toBe(true)
    expect(play.toy.stroke?.box).toBe(3)
  })
})

describe('a carry', () => {
  it('survives a lifted finger: the box hangs where it was let go and a finger back on it carries on', () => {
    const play = first(), from = middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 3), to: [number, number] = [640, 180]
    dragAndLift(play, [from, to])
    const toy = play.toy
    expect(toy.hand?.lifted).not.toBeNull()
    const hung = toy.poseOf('box:3')
    run(play, HANG_S - 0.1)
    expect(toy.poseOf('box:3')).toEqual(hung)
    expect(toy.state.boxes[3].on).toBe(-1)
    // Back on it in time: the same carry goes on, and nothing was set down.
    play.down(2, to[0], to[1])
    expect(toy.hand?.lifted).toBeNull()
    run(play, 1)
    expect(toy.hand?.kind).toBe('box')
  })

  it('is set down where it was let go once the hang is over, on the game clock', () => {
    const play = first(), from = middle(play, 'flap', (target) => target.kind === 'flap' && target.id === 3)
    dragAndLift(play, [from, px(play, { x: -0.35, y: 2.3, z: 0.6 })])
    run(play, HANG_S - 2 * FRAME)
    expect(play.toy.hand).not.toBeNull()
    const heard = run(play, 1)
    expect(play.toy.hand).toBeNull()
    // Let go over the big box, it stands on it once the cat has hopped clear: heard when it lands.
    expect(play.toy.state.boxes[3].on).toBe(0)
    expect(heard.map((cue) => cue.sound)).toContain('thump')
  })

  it('put away while it hangs, is set down where it was let go; put away in the finger, it is as if never taken', () => {
    const hanging = first(), from = middle(hanging, 'flap', (target) => target.kind === 'flap' && target.id === 3)
    dragAndLift(hanging, [from, px(hanging, { x: -0.35, y: 2.3, z: 0.6 })])
    run(hanging, 0.1)
    hanging.park()
    expect(hanging.toy.state.boxes[3].on).toBe(0)
    expect(hanging.toy.hand).toBeNull()
    const held = first(), before = stored(held.toy.state)
    drag(held, [from, px(held, { x: -0.35, y: 2.3, z: 0.6 })])
    held.park()
    expect(stored(held.toy.state)).toEqual(before)
  })

  it('gives a thing to a character or a place only when it is let go there', () => {
    const play = playOf(builtFort()), cushion = middle(play, 'cushion', (target) => target.kind === 'cushion' && target.index === 2)
    const before = stored(play.toy.state)
    // Carried across the baby, the grandmother and the heap, and brought back: nobody took it.
    drag(play, [cushion, middle(play, 'baby'), middle(play, 'gran'), middle(play, 'heap'), cushion])
    expect(play.toy.sceneRunning).toBe(false)
    expect(stored(play.toy.state)).toEqual(before)
    play.up(1, cushion[0], cushion[1])
    run(play, 1)
    expect(stored(play.toy.state)).toEqual(before)
    // Let go on the baby, the baby has it.
    dragAndLift(play, [middle(play, 'cushion', (target) => target.kind === 'cushion' && target.index === 2), middle(play, 'baby')], 2)
    run(play, HANG_S + 0.1)
    expect(play.toy.shows.baby.stage).toBe('flop')
  })
})

describe('the grown-up corner and the idle ladder', () => {
  it('answers nothing in the top right corner, and the ladder does not notice', () => {
    for (const [width, height] of [[1180, 820], [1024, 768]] as const) {
      const play = playOf(freshFort(null), 1, [width, height])
      run(play, IDLE_BEFORE_GLOW + 1)
      const before = picture(play.toy), saved = stored(play.toy.state)
      expect(play.down(1, width - CORNER + 2, CORNER - 2)).toBe(false)
      play.move(1, width - 10, 10)
      play.up(1, width - 10, 10)
      expect(play.toy.cues).toHaveLength(0)
      expect(picture(play.toy)).toEqual(before)
      expect(stored(play.toy.state)).toEqual(saved)
      expect(play.step(FRAME).glow).toBeGreaterThan(0)
    }
  })

  it('is taken back by the child alone: nothing a character does by itself resets it, and a put-away does', () => {
    const play = first()
    // A scene that plays, a piece that falls and scissors that go home are not the child's touch.
    tap(play, middle(play, 'baby'))
    const touched = play.toy.time
    let glowAt = -1
    for (let t = 0; t < IDLE_BEFORE_GLOW + 2 && glowAt < 0; t += FRAME) if (play.step(FRAME).glow > 0) glowAt = play.toy.time
    expect(play.toy.time - touched).toBeGreaterThan(IDLE_BEFORE_GLOW - 0.1)
    expect(glowAt - touched).toBeLessThan(IDLE_BEFORE_GLOW + 0.2)
    let demo: number | null = null
    for (let t = 0; t < IDLE_BEFORE_DEMO && demo === null; t += FRAME) demo = play.step(FRAME).demo
    expect(demo).not.toBeNull()
    play.park()
    expect(play.step(FRAME).glow).toBe(0)
    expect(play.step(FRAME).demo).toBeNull()
  })

  it('shows its move a few times, further and further apart, and then stops: it does not nag', () => {
    const play = first(), starts: number[] = []
    let showing = false
    for (let t = 0; t < 200; t += 0.1) {
      const guidance = play.step(0.1)
      if (guidance.demo !== null && !showing) starts.push(play.toy.time)
      showing = guidance.demo !== null
    }
    expect(starts.length).toBeGreaterThan(1)
    expect(starts.length).toBeLessThanOrEqual(4)
    for (let i = 2; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeGreaterThan(starts[i - 1] - starts[i - 2])
    expect(play.step(0.1).glow).toBe(0)
    expect(DEMO_SECONDS).toBeLessThan(IDLE_BEFORE_DEMO)
  })
})
