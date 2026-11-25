import { describe, expect, it } from 'vitest'
import { ForgivingTouch, LIFT_GRACE_MS, type Point } from './input'
import { BODIES, BOX, CRANK, GROUND, HOME, HOOK, HOOKS, HOST_IDS, SNOW, SWITCH } from './layout'
import { Play, SHOW_SECONDS, THINGS } from './play'
import { deserialize, fresh, serialize, type Saved } from './save'

// Everything goes through the same pointer tracker the Mount uses.

const STEP = 1 / 60
class Hand {
  touch = new ForgivingTouch()
  now = 0
  said = 0
  stored = ''
  constructor(readonly play: Play) {}
  wait(seconds: number) { for (let i = 0; i < seconds * 60; i++) { this.now += STEP * 1000; this.play.act(this.touch.advance(this.now)); this.play.step(STEP); this.said += this.play.voices().length; if (this.play.changed()) this.stored = JSON.stringify(this.play.saved); for (const thing of this.play.things) { if (!Number.isFinite(thing.x + thing.y + thing.swing + thing.size)) throw new Error('a thing is nowhere') } } }
  down(at: Point) { this.play.act(this.touch.down(1, at, this.now)) }
  move(to: Point, steps = 24) { const from = this.play.finger ?? to; for (let i = 1; i <= steps; i++) { this.play.act(this.touch.move(1, { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })); this.wait(STEP) } }
  up(at: Point = this.play.finger!) { this.play.act(this.touch.up(1, at, this.now)); this.wait(LIFT_GRACE_MS / 1000 + 0.05) }
  tap(at: Point) { this.down(at); this.wait(0.05); this.up(at) }
}
const start = (over: Partial<Saved> = {}) => { const hand = new Hand(new Play({ ...fresh(), shown: true, ...over })); hand.wait(0.1); return hand }
const at = (id: string): Point => ({ x: HOOK.get(id)!.x, y: HOOK.get(id)!.y })
const end = (hand: Hand): Point => ({ x: hand.play.end.x, y: hand.play.end.y + 20 })
const outs = (hand: Hand) => hand.play.things.filter((thing) => thing.out).length

describe('the pull', () => {
  it('starts with one bulb out and the boot jammed at the rim', () => {
    const { play } = start()
    expect(outs(new Hand(play))).toBe(1)
    expect(play.things[1].kind).toBe('boot')
    expect(play.strain).toBeGreaterThan(0.8)
  })
  it('brings things out one at a time, in order, and the same ones go back in', () => {
    const hand = start()
    hand.down(end(hand)); hand.move({ x: 600, y: 640 })
    const many = outs(hand)
    expect(many).toBeGreaterThanOrEqual(4)
    expect(hand.play.things.slice(0, many).every((thing) => thing.out)).toBe(true)
    hand.move({ x: 330, y: 640 })
    expect(outs(hand)).toBeLessThan(many)
  })
  it('catches on what the end passes, and hangs there when let go', () => {
    const hand = start()
    hand.down(end(hand)); hand.move(at('nose')); hand.move(at('antler-outer-left')); hand.move({ x: 420, y: 120 }); hand.up(); hand.wait(1)
    expect(hand.play.hooks).toEqual(['nose', 'antler-outer-left', 'antler-inner-left'])
    expect(hand.play.end.mode).toBe('hook')
  })
  it('lies down in the snow when let go far from everything, and is taken up from there', () => {
    const hand = start({ hooks: ['nose'] })
    hand.down(end(hand)); hand.move({ x: 480, y: 735 }); hand.up(); hand.wait(1)
    // The nose is already taken and nothing else is near.
    expect(hand.play.end).toMatchObject({ mode: 'snow', y: GROUND })
    hand.down({ x: hand.play.end.x, y: hand.play.end.y - 10 }); hand.move(at('antler-outer-left')); hand.up(); hand.wait(1)
    expect(hand.play.hooks).toEqual(['nose', 'antler-outer-left'])
  })
  it('puts everything back when the browser takes the finger', () => {
    const hand = start({ hooks: ['nose'] })
    const before = JSON.stringify(hand.play.saved)
    hand.down(end(hand)); hand.move(at('antler-outer-left')); hand.move(at('antler-inner-left'))
    expect(hand.play.hooks.length).toBe(3)
    hand.play.act(hand.touch.cancel(1)); hand.wait(0.5)
    expect(JSON.stringify(hand.play.saved)).toBe(before)
  })
  it('survives a lifted finger', () => {
    const hand = start()
    hand.down(end(hand)); hand.move({ x: 560, y: 690 })
    hand.play.act(hand.touch.up(1, { x: 560, y: 690 }, hand.now)); hand.wait(0.1)
    expect(hand.play.held).toBe('end')
    hand.play.act(hand.touch.down(1, { x: 560, y: 690 }, hand.now)); hand.move(at('nose'))
    expect(hand.play.hooks).toEqual(['nose'])
  })
  it('never runs out of things', () => {
    const hand = start({ hooks: HOOKS.map((hook) => hook.id) })
    expect(outs(hand)).toBeGreaterThan(20)
    for (const order of [[...HOOKS].reverse(), [...HOOKS].sort((a, b) => Math.abs(a.x - 600) - Math.abs(b.x - 600)), HOOKS.filter((_, i) => i % 2).flatMap((hook, i) => [hook, HOOKS[i * 2]])]) {
      const ids = [...new Set(order.map((hook) => hook.id))]
      expect(outs(start({ hooks: ids }))).toBeLessThan(THINGS)
    }
    // The longest zigzag there is: always on to what is farthest.
    const left = [...HOOKS], far = [left.shift()!]
    while (left.length) { const last = far[far.length - 1]; left.sort((a, b) => Math.hypot(b.x - last.x, b.y - last.y) - Math.hypot(a.x - last.x, a.y - last.y)); far.push(left.shift()!) }
    expect(outs(start({ hooks: far.map((hook) => hook.id) }))).toBeLessThan(THINGS)
  })
})

describe('taps alone', () => {
  it('hang the string everywhere, light it, and wind it all back', () => {
    const hand = start()
    for (let i = 0; i < HOOKS.length; i++) { hand.tap(i % 2 ? { x: 120, y: 720 } : end(hand)); hand.wait(1) }
    expect(hand.play.hooks.length).toBe(HOOKS.length)
    hand.tap({ x: 120, y: 720 }); hand.wait(1.5)
    expect(hand.play.hooks.length).toBe(HOOKS.length)
    hand.tap(SWITCH)
    expect(hand.play.lit).toBe(true)
    expect(hand.play.crank).toBe(true)
    hand.wait(5)
    for (let i = 0; i < HOOKS.length; i++) { hand.tap(CRANK); hand.wait(1) }
    expect(hand.play.hooks).toEqual([])
    expect(hand.play.end.mode).toBe('home')
    expect(hand.play.seed).toBe(1)
  })
  it('on a free place hang the end there', () => {
    const hand = start({ hooks: ['nose'] })
    hand.tap(at('roof')); hand.wait(1)
    expect(hand.play.hooks).toEqual(['nose', 'roof'])
    hand.tap({ x: 1010, y: 700 }); hand.wait(1)
    expect(hand.play.hooks[2]).toMatch(/^dog/)
  })
  it('never take anything off, or hang anything, by a tap on a thing', () => {
    const hand = start({ hooks: ['nose', 'antler-outer-left', 'antler-inner-left', 'roof'] })
    const before = JSON.stringify(hand.play.saved)
    for (let i = 1; i < outs(hand); i++) { const thing = hand.play.things[i]; if (hand.play.hit({ x: thing.x, y: thing.y + 42 }).on === 'thing') hand.tap({ x: thing.x, y: thing.y + 42 }) }
    expect(JSON.stringify(hand.play.saved)).toBe(before)
  })
  it('are each answered with a sound, wherever they land', () => {
    for (const lit of [false, true]) {
      const hand = start({ hooks: ['nose', 'roof', 'tip'], lit, crank: true })
      hand.wait(1)
      for (let x = 20; x < 1180; x += 90) for (let y = 20; y < 820; y += 90) {
        const was = hand.said
        hand.down({ x, y }); hand.wait(STEP)
        expect(hand.said, `${x},${y}`).toBeGreaterThan(was)
        hand.play.act(hand.touch.cancel(1))
        if (hand.play.lit !== lit) { hand.tap(SWITCH) }
      }
    }
  })
})

describe('a loop', () => {
  it('pulled from the middle hangs on another place, between its neighbours', () => {
    const hand = start({ hooks: ['nose', 'antler-outer-right', 'chimney'] })
    const middle = { x: (690 + 1040) / 2, y: 205 }
    hand.down(middle); hand.move({ x: 900, y: 178 }); hand.move({ x: 880, y: 300 }); hand.up(); hand.wait(1)
    expect(hand.play.hooks).toEqual(['nose', 'antler-outer-right', 'roof', 'chimney'])
    expect(hand.play.end.mode).toBe('hook')
  })
  it('springs back when let go in the open', () => {
    const hand = start({ hooks: ['nose', 'antler-outer-right'] })
    const before = outs(hand)
    hand.down({ x: 330, y: 560 }); hand.move({ x: 330, y: 730 })
    expect(hand.play.held).toBe('loop')
    expect(outs(hand)).toBeGreaterThan(before)
    hand.up(); hand.wait(1)
    expect(hand.play.loop).toBe(null)
    expect(hand.play.hooks).toEqual(['nose', 'antler-outer-right'])
    expect(Math.abs(outs(hand) - before)).toBeLessThanOrEqual(1)
  })
})

describe('the switch', () => {
  it('wakes the string from the box to the end, then each host does what lies on it, and stops by itself', () => {
    const hand = start({ hooks: ['nose', 'antler-outer-left', 'roof', 'dog-head', 'tip'] })
    const did = new Map<string, Set<string>>()
    hand.down(SWITCH); hand.up(SWITCH)
    for (let i = 0; i < SHOW_SECONDS * 60; i++) { hand.wait(STEP); for (const id of HOST_IDS) { const kind = hand.play.bodies[id].kind; if (kind) did.set(id, (did.get(id) ?? new Set()).add(kind)) } }
    expect([...did.keys()].sort()).toEqual([...HOST_IDS].sort())
    expect(hand.play.things.filter((thing) => thing.out).every((thing) => thing.light > 0.9)).toBe(true)
    hand.wait(2)
    const quiet = hand.said
    hand.wait(10)
    expect(hand.said).toBe(quiet)
    hand.tap(SWITCH); hand.wait(2)
    expect(hand.play.things.every((thing) => thing.light < 0.05)).toBe(true)
  })
  it('lights what comes out while it is down', () => {
    const hand = start({ hooks: ['nose'], lit: true })
    hand.down(end(hand)); hand.move(at('roof')); hand.up(); hand.wait(1.5)
    expect(hand.play.things.filter((thing) => thing.out).every((thing) => thing.light > 0.9)).toBe(true)
  })
  it('makes a host do a thing when the thing is touched', () => {
    const hand = start({ hooks: ['nose', 'roof'], lit: true })
    hand.wait(1)
    const index = hand.play.on('moose').find((i) => i > 0)!, thing = hand.play.things[index]
    hand.tap({ x: thing.x, y: thing.y + 42 })
    expect(hand.play.bodies.moose.kind).toBe(thing.kind)
  })
})

describe('winding back', () => {
  it('is what the end carried home to the box does, and any touch stops it', () => {
    const hand = start({ hooks: ['nose', 'antler-outer-left', 'antler-inner-left', 'roof'] })
    hand.down(end(hand)); hand.move({ x: 700, y: 440 }); hand.move({ x: 170, y: 660 }, 40)
    const n = hand.play.hooks.length
    hand.up()
    expect(hand.play.saved.hooks).toEqual([])
    hand.tap({ x: 30, y: 30 }); hand.wait(1)
    expect(hand.play.hooks.length).toBeGreaterThan(0)
    expect(hand.play.hooks.length).toBeLessThanOrEqual(n)
    hand.down(end(hand)); hand.move({ x: 170, y: 660 }, 40); hand.up(); hand.wait(6)
    expect(hand.play.hooks).toEqual([])
    expect(hand.play.seed).toBe(1)
  })
})

describe('the opening round', () => {
  it('shows pull, hang, press once, with the same acts as a finger, and leaves the string on the nose', () => {
    const hand = new Hand(new Play(fresh()))
    expect(hand.play.saved.shown).toBe(true)
    hand.wait(5)
    expect(hand.play.hooks).toEqual(['nose'])
    expect(hand.play.lit).toBe(true)
    const acts = new Set<string>()
    for (let i = 0; i < 180; i++) { hand.wait(STEP); if (hand.play.bodies.moose.kind) acts.add(hand.play.bodies.moose.kind) }
    expect(acts).toContain('bulb'); expect(acts).toContain('boot')
    hand.wait(3)
    expect(hand.play.lit).toBe(false)
    expect(hand.play.crank).toBe(false)
    expect(hand.play.round).toBe(null)
    expect(hand.play.want()).toEqual({ act: 'press' })
    expect(new Play(deserialize(serialize(hand.play.saved))).round).toBe(null)
  })
  it('gives way to a touch at any moment, and nothing is undone or left in the air', () => {
    for (let when = 0.2; when < 9.4; when += 0.37) {
      const hand = new Hand(new Play(fresh()))
      hand.wait(when)
      hand.tap({ x: 640, y: 60 }); hand.wait(1.2)
      expect(hand.play.round).toBe(null)
      expect(['home', 'hook', 'snow']).toContain(hand.play.end.mode)
    }
  })
})

describe('the save', () => {
  it('finds the string as left from every moment of a busy minute, and plays nothing', () => {
    const hand = start()
    const spots: Point[] = [...HOOKS].map((hook) => ({ x: hook.x, y: hook.y })).concat([{ x: 170, y: 680 }, { x: 500, y: 730 }, SWITCH, CRANK])
    for (let i = 0; i < 70; i++) {
      const to = spots[(i * 7) % spots.length]
      if (i % 3 === 0) hand.tap(to)
      else { hand.down(i % 3 === 1 ? end(hand) : spots[(i * 5) % spots.length]); hand.move(to, 8) ; if (i % 5 === 0) hand.play.act(hand.touch.cancel(1)); else hand.up() }
      const saved = deserialize(JSON.parse(JSON.stringify(serialize(hand.play.saved))))
      expect(new Set(saved.hooks).size).toBe(saved.hooks.length)
      const again = new Play(saved)
      expect(again.saved).toEqual({ ...saved, snow: saved.snow === null ? null : Math.min(SNOW.right, Math.max(SNOW.left, saved.snow)) })
      for (let k = 0; k < 30; k++) again.step(STEP)
      expect(again.voices()).toEqual([])
      hand.wait((i % 4) * 0.2)
    }
  })
  it('repairs what it cannot read', () => {
    for (const bad of [null, 3, 'x', [], {}, { v: 2 }, { v: 1, hooks: 'nose', seed: -1, snow: 'a' }]) expect(deserialize(bad).hooks).toEqual([])
    expect(deserialize({ v: 1, hooks: ['nose', 'nose', 'neck', 4, 'roof'], seed: 3, lit: true })).toMatchObject({ hooks: ['nose', 'roof'], seed: 3, lit: true })
  })
})

describe('the layout', () => {
  it('keeps places, the box, the switch and the end apart, and off the bottom', () => {
    for (const a of HOOKS) for (const b of HOOKS) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} ${b.id}`).toBeGreaterThan(95)
    for (const hook of HOOKS) {
      expect(Math.hypot(hook.x - SWITCH.x, hook.y - SWITCH.y)).toBeGreaterThan(SWITCH.r + 70)
      expect(hook.y).toBeLessThan(770)
      expect(hook.x < BOX.left - 5 || hook.x > BOX.right + 5 || hook.y < BOX.top - 80).toBe(true)
    }
    expect(Math.hypot(HOME.x - CRANK.x, HOME.y - CRANK.y)).toBeGreaterThan(130)
    expect(SNOW.right).toBeLessThan(SWITCH.x - SWITCH.r - 30)
    expect(GROUND).toBeLessThan(770)
    expect(Object.keys(BODIES).length).toBe(HOST_IDS.length)
  })
})

describe('what a reviewer found', () => {
  it('a wind-up that is stopped is stored as it stands, with every thing on its place, and the touch is answered and hangs nothing', () => {
    const hand = start({ hooks: ['nose', 'antler-outer-left', 'antler-inner-left', 'roof'] })
    hand.down(end(hand)); hand.move({ x: 700, y: 440 }); hand.move({ x: 170, y: 660 }, 40); hand.up(); hand.wait(0.1)
    const said = hand.said
    hand.tap({ x: 120, y: 720 })
    expect(hand.said).toBeGreaterThan(said)
    hand.wait(1)
    expect(hand.stored).toBe(JSON.stringify(hand.play.saved))
    expect(hand.play.saved.hooks.length).toBeGreaterThan(0)
    hand.play.things.filter((thing) => thing.out).forEach((_, i) => expect(hand.play.path.length - i * 98).toBeGreaterThan(-60))
  })
  it('the switch stops a wind-up and is thrown', () => {
    const hand = start({ hooks: ['nose', 'antler-outer-left', 'roof'] })
    hand.down(end(hand)); hand.move({ x: 700, y: 440 }); hand.move({ x: 170, y: 660 }, 40); hand.up(); hand.wait(0.1)
    hand.tap(SWITCH)
    expect(hand.play.lit).toBe(true)
  })
  it('a loop let go on the place it caught hangs that one only', () => {
    for (const id of ['antler-outer-left', 'antler-inner-left', 'antler-inner-right', 'antler-outer-right']) {
      const hand = start({ hooks: ['nose'] })
      hand.down({ x: 300, y: 560 }); hand.move(at(id)); hand.up(); hand.wait(1)
      expect(hand.play.hooks.filter((one) => one === id).length).toBe(1)
      const place = hand.play.hooks.indexOf(id)
      expect(hand.play.hooks.slice(place + 1).filter((one) => one !== 'nose').length, id).toBeLessThanOrEqual(1)
    }
  })
  it('the end let go on the low branches winds nothing up', () => {
    const hand = start({ hooks: ['nose', 'roof'] })
    hand.down(end(hand)); hand.move({ x: 230, y: 480 }, 40); hand.up(); hand.wait(3)
    expect(hand.play.hooks.slice(0, 2)).toEqual(['nose', 'roof'])
  })
  it('a touch on the sky leaves a flight alone, and everything comes out', () => {
    const hand = start()
    hand.down(end(hand)); hand.play.act(hand.touch.up(1, end(hand), hand.now)); hand.wait(0.05)
    hand.down({ x: 640, y: 40 }); hand.move({ x: 700, y: 60 }); hand.up(); hand.wait(1)
    expect(hand.play.hooks).toEqual(['nose'])
    hand.play.things.forEach((thing, i) => { if (hand.play.path.length - i * 98 > 10) expect(thing.out).toBe(true) })
  })
  it('a loop on its way is hung by the next grab, and by the crank, and never lost', () => {
    for (const then of ['end', 'crank'] as const) {
      const hand = start({ hooks: ['nose'], crank: true })
      hand.down({ x: 300, y: 560 }); hand.move({ x: 300, y: 400 })
      hand.play.act(hand.touch.up(1, { x: 300, y: 400 }, hand.now)); for (let i = 0; i < 19; i++) hand.wait(STEP)
      expect(hand.play.hooks.length + (hand.play.loop?.hook ? 1 : 0)).toBe(2)
      if (then === 'end') { hand.down(end(hand)); hand.move({ x: 600, y: 450 }); expect(hand.play.hooks.length).toBe(2) }
      else { hand.down(CRANK); hand.up(CRANK); hand.wait(1); expect(hand.play.hooks).toEqual(['branch-right']); expect(hand.play.seed).toBe(0); expect(hand.play.end.mode).toBe('hook') }
    }
  })
  it('one tap during the opening round hangs at most one place', () => {
    const hand = new Hand(new Play(fresh()))
    hand.wait(2); hand.tap(end(hand)); hand.wait(1.5)
    expect(hand.play.hooks.length).toBeLessThanOrEqual(1)
  })
})
