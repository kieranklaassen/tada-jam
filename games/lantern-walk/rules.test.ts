import { describe, expect, it } from 'vitest'
import { GRACE, Game, RESTING } from './game'
import { GLOW_RAMP, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW } from './guidance'
import { FRAME, Hand, goHome, meet, meetAll, woodSave } from './hand'
import { CORNER_PX, FOX_HOME_END, HEDGEHOG_MAT, HOOK_GRIP, PLACES, SURFACES } from './layout'
import { deserialize, freshSave, serialize, type Save } from './save'
import { sheetOf } from './sheet'
import { CANDLE_REST, EDGE, PAPER_RESTS, PILE, SHEET, WICK, fromSheet } from './table'

// The rules that hold whatever the child does, each played through the path
// the Mount uses.

const middle = (b: { left: number; right: number; top: number; bottom: number }) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 })
const point = (x: number, y: number) => fromSheet(x, y)
/** A save as storage would give it back. */
const stored = (save: Save): Save => deserialize(JSON.parse(JSON.stringify(serialize(save))))

/** Everything a game holds that is drawn or played on, without its clocks, its chance and its wiring. */
function dump(game: Game): unknown {
  const skip = new Set(['time', 'owed', 'rng', 'events', 'onSave', 'seed', 'kept', 'rested', 'sheet'])
  const copy = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') return typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : typeof value === 'function' ? undefined : value
    if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>, (v) => Math.round(v * 1e6) / 1e6)
    if (value instanceof Set) return [...value]
    if (Array.isArray(value)) return value.map(copy)
    const out: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value)) if (!skip.has(key)) out[key] = copy(inner)
    return out
  }
  return { save: game.toSave(), table: copy(game.table), wood: copy(game.wood), show: copy(game.show), scene: game.sceneRunning, busy: game.busy }
}

/** A hand at the table with a rolled lantern and the candle in: one tap from the wood. */
function ready(): Hand {
  const hand = new Hand(freshSave(4))
  hand.drag(EDGE.left + 30, 440, SHEET.left + 60, 440, 500)
  hand.wait(0.5)
  hand.drag(CANDLE_REST.x, CANDLE_REST.y, WICK.x, WICK.y + 90, 500)
  hand.wait(0.5)
  return hand
}

describe('a resting contact never deadens the game', () => {
  it('a finger that landed where nothing is hands the work to the next finger that lands', () => {
    const hand = new Hand(freshSave(4))
    expect(hand.down(240, 250, 1)).toBe(true)
    hand.wait(0.2)
    expect(hand.down(CANDLE_REST.x, CANDLE_REST.y, 2)).toBe(true)
    hand.slide(700, 620, 400, 2)
    expect(hand.table.candle.x).toBe(700)
    // The finger that rests goes on resting: its moves and its lift do nothing.
    hand.move(300, 300, 1)
    hand.up(1)
    expect(hand.table.hand?.kind).toBe('candle')
  })

  it('a finger that has been down a second without moving hands the lantern to the next finger', () => {
    const hand = new Hand(woodSave({ lantern: { x: 600, y: 600 } }))
    hand.down(600, 600, 1)
    hand.wait(RESTING - 0.2)
    expect(hand.down(300, 500, 2)).toBe(false)
    hand.up(2)
    hand.wait(0.3)
    expect(hand.down(300, 500, 2)).toBe(true)
    hand.wait(1)
    expect(hand.wood.grip.x).toBeCloseTo(300, 0)
    // The hand-over is not a let-go: nothing was hung or lit by it, and the first finger now does nothing.
    hand.move(900, 700, 1)
    hand.wait(0.5)
    expect(hand.wood.grip.x).toBeCloseTo(300, 0)
  })

  it('a finger that is carrying is never interrupted, however long it holds still', () => {
    const hand = new Hand(woodSave({ lantern: { x: 600, y: 600 } }))
    hand.down(600, 600, 1)
    hand.slide(500, 600, 300, 1)
    hand.wait(2)
    expect(hand.down(200, 400, 2)).toBe(false)
    hand.wait(0.5)
    expect(hand.wood.grip.x).toBeCloseTo(500, 0)
    hand.slide(520, 640, 300, 1)
    expect(hand.wood.want.x).toBe(520)
  })

  it('a finger that is cutting is never interrupted', () => {
    const hand = new Hand(freshSave(8))
    const a = point(30, 30), b = point(60, 30), c = point(60, 70), d = point(30, 70)
    hand.down(a.x, a.y, 1)
    hand.slide(b.x, b.y, 240, 1)
    hand.wait(1.5)
    expect(hand.down(CANDLE_REST.x, CANDLE_REST.y, 2)).toBe(false)
    hand.slide(c.x, c.y, 240, 1); hand.slide(d.x, d.y, 240, 1)
    hand.up(1)
    hand.wait(0.5)
    expect(hand.table.sheet.length).toBe(1)
    expect(hand.table.candle.x).toBe(CANDLE_REST.x)
  })
})

describe('a carry survives a lifted finger', () => {
  it('the lantern waits where it was let go for the grace, and a finger landing on it again carries on', () => {
    const hand = new Hand(woodSave({ lantern: { x: 600, y: 600 } }))
    hand.down(600, 600)
    hand.slide(760, 420, 300)
    hand.up()
    hand.wait(GRACE - 0.1)
    expect(hand.wood.holding).toBe(true)
    hand.down(790, 440)
    hand.slide(HOOK_GRIP.x, HOOK_GRIP.y, 300)
    expect(hand.wood.hung).toBe(false)
    // The hook takes it only when it is let go there, and only once the grace has run out.
    hand.up()
    hand.wait(GRACE - 0.1)
    expect(hand.wood.hung).toBe(false)
    hand.wait(0.2)
    expect(hand.wood.hung).toBe(true)
    expect(hand.game.finished).toBe(true)
  })

  it('a paper in the hand hangs where it was let go, is carried on by a finger landing on it, and is taken by a window only when let go there', () => {
    const hand = new Hand(freshSave(8))
    hand.table.sheet = [{ outline: [30, 30, 60, 30, 60, 70, 30, 70], paper: null, cut: true }]
    const rest = middle(PAPER_RESTS.red), over = point(45, 50)
    hand.down(rest.x, rest.y)
    hand.slide(rest.x + 60, rest.y + 40, 400)
    hand.up()
    hand.wait(GRACE - 0.1)
    expect(hand.table.hand).toMatchObject({ kind: 'paper', x: rest.x + 60, y: rest.y + 40 })
    hand.down(rest.x + 70, rest.y + 50)
    hand.slide(over.x, over.y, 400)
    expect(hand.table.sheet[0].paper).toBe(null)
    hand.up()
    hand.wait(GRACE + 0.1)
    expect(hand.table.sheet[0].paper).toBe('red')
    expect(hand.table.hand).toBe(null)
  })

  it('a cut survives a lifted finger: the line goes on and is one window', () => {
    const hand = new Hand(freshSave(8))
    const a = point(30, 30), b = point(60, 30), c = point(60, 70), d = point(30, 70)
    hand.down(a.x, a.y)
    hand.slide(b.x, b.y, 240)
    hand.up()
    hand.wait(0.15)
    hand.down(b.x + 6, b.y + 6)
    hand.slide(c.x, c.y, 240); hand.slide(d.x, d.y, 240)
    hand.up()
    hand.wait(GRACE + 0.1)
    expect(hand.table.sheet.length).toBe(1)
  })

  it('a finger that lands on the thing in hand and lifts without moving is a tap: it lights a dark lantern', () => {
    const hand = new Hand(woodSave({ lit: false, lantern: { x: 600, y: 600 } }))
    hand.down(600, 600)
    hand.slide(640, 620, 300)
    hand.up()
    hand.wait(0.1)
    hand.tap(hand.wood.lantern.x, hand.wood.lantern.y)
    expect(hand.wood.lit).toBe(true)
  })

  it('a tap of the youngest, held for most of half a second, is still a tap', () => {
    const hand = ready()
    hand.down(WICK.x, WICK.y + 60)
    hand.wait(0.45)
    hand.up()
    expect(hand.game.place).toBe('wood')
  })
})

describe('no pending flag outlives its touch', () => {
  it('after every lift and every cancel, once the grace has run, no hand holds anything', () => {
    const hand = new Hand(freshSave(4))
    const acts: (() => void)[] = [
      () => hand.drag(middle(PAPER_RESTS.blue).x, middle(PAPER_RESTS.blue).y, 600, 620, 500),
      () => { hand.down(CANDLE_REST.x, CANDLE_REST.y); hand.slide(800, 600, 500); hand.cancel() },
      () => hand.drag(point(20, 20).x, point(20, 20).y, point(40, 30).x, point(40, 30).y, 300),
      () => hand.drag(middle(PILE).x, middle(PILE).y, 1030, 300, 500),
      () => { hand.down(EDGE.left + 30, 440); hand.slide(700, 440, 300); hand.cancel() },
      () => hand.tap(240, 250),
    ]
    for (const act of acts) {
      act()
      hand.wait(GRACE + 0.1)
      expect(hand.game.busy).toBe(false)
      expect(hand.table.hand).toBe(null)
    }
    const wood = new Hand(woodSave({ lantern: { x: 600, y: 600 } }))
    wood.drag(600, 600, 400, 500)
    wood.wait(GRACE + 0.1)
    expect(wood.game.busy).toBe(false)
    expect(wood.wood.holding).toBe(false)
  })
})

describe('a pointer the browser takes away never acts for the child', () => {
  it('a cancelled cut is no cut, a cancelled paper tucks nothing, a cancelled candle goes back, a cancelled fresh sheet changes nothing, a cancelled roll unrolls', () => {
    const hand = new Hand(freshSave(4))
    const before = JSON.stringify(hand.game.toSave())
    const a = point(8, 8), b = point(28, 8), c = point(28, 20), d = point(8, 20)
    hand.down(a.x, a.y); hand.slide(b.x, b.y, 240); hand.slide(c.x, c.y, 240); hand.slide(d.x, d.y, 240)
    hand.cancel()
    const yellow = middle(PAPER_RESTS.yellow), red = point(79, 50)
    hand.down(yellow.x, yellow.y); hand.slide(red.x, red.y, 400)
    hand.cancel()
    hand.down(CANDLE_REST.x, CANDLE_REST.y); hand.slide(560, 440, 400)
    hand.cancel()
    hand.down(middle(PILE).x, middle(PILE).y); hand.slide(600, 440, 400)
    hand.cancel()
    hand.down(EDGE.left + 30, 440); hand.slide(SHEET.left + 60, 440, 400)
    hand.cancel()
    hand.wait(1)
    expect(JSON.stringify(hand.game.toSave())).toBe(before)
    expect(hand.table.candle).toEqual(CANDLE_REST)
    expect(hand.table.rolled).toBe(0)
    // And none of the cancels made a sound of its own.
    const made = hand.heard.length
    hand.down(CANDLE_REST.x, CANDLE_REST.y)
    const after = hand.heard.length
    hand.cancel()
    expect(hand.heard.length).toBe(after)
    expect(after).toBeGreaterThan(made)
  })

  it('a cancelled carry over the hook hangs nothing, a cancelled tap lights nothing, and a cancelled pull takes nothing down', () => {
    const hand = new Hand(woodSave({ lit: false, lantern: { x: 900, y: 500 } }))
    hand.down(900, 500)
    hand.cancel()
    expect(hand.wood.lit).toBe(false)
    hand.down(900, 500); hand.slide(HOOK_GRIP.x, HOOK_GRIP.y, 400)
    hand.cancel()
    hand.wait(1)
    expect(hand.wood.hung).toBe(false)
    expect(hand.game.finished).toBe(false)
    const hung = new Hand(woodSave({ finished: true }))
    hung.down(hung.wood.lantern.x, hung.wood.lantern.y); hung.slide(hung.wood.lantern.x - 30, hung.wood.lantern.y + 20, 300)
    hung.cancel()
    hung.wait(1)
    expect(hung.game.place).toBe('wood')
    expect(hung.wood.hung).toBe(true)
  })

  it('a cancel does not end a scene', () => {
    const hand = ready()
    hand.down(WICK.x, WICK.y + 60); hand.wait(0.1); hand.up()
    hand.wait(1)
    hand.cancel(7)
    expect(hand.game.sceneRunning).toBe(true)
  })
})

describe('the grown-up corner and the home control', () => {
  for (const surface of SURFACES) {
    it(`the corner answers nothing and leaves the idle ladder where it is, at ${surface.width} by ${surface.height}`, () => {
      const hand = new Hand(woodSave({ lit: false, lantern: { x: 600, y: 600 } }), surface)
      hand.wait(IDLE_BEFORE_GLOW + GLOW_RAMP + 0.1)
      expect(hand.play.guidance!.glow).toBe(1)
      const before = JSON.stringify(dump(hand.game))
      expect(hand.play.down(1, surface.width - CORNER_PX / 2, CORNER_PX / 2)).toBe(false)
      hand.play.move(1, surface.width - 10, 10)
      hand.play.up(1, surface.width - 10, 10)
      expect(JSON.stringify(dump(hand.game))).toBe(before)
      expect(hand.heard.length).toBe(0)
      expect(hand.spoke.length).toBe(0)
      expect(hand.play.guidance!.glow).toBe(1)
      // Just outside the corner, a touch is a touch.
      expect(hand.play.down(2, surface.width - CORNER_PX - 4, CORNER_PX + 4)).toBe(true)
      expect(hand.heard.length).toBe(1)
    })
  }
})

describe('the idle ladder', () => {
  it('a touch takes it back; a finger at work keeps it down; what a creature does by itself never does', () => {
    const hand = new Hand(woodSave({ lit: false, lantern: { x: 700, y: 660 } }))
    // A dark lantern is carried to the badger and let go: it grins, lies back and snores, by itself, for as long as it is left.
    hand.carry(330, 660, 300, 0.2)
    hand.up()
    hand.wait(IDLE_BEFORE_GLOW + GLOW_RAMP + 0.5)
    expect(hand.play.guidance!.glow).toBe(1)
    const snores = hand.count('snore')
    expect(snores).toBeGreaterThan(0)
    hand.wait(IDLE_BEFORE_DEMO - IDLE_BEFORE_GLOW)
    expect(hand.count('snore')).toBeGreaterThan(snores)
    expect(hand.play.guidance!.demo).not.toBe(null)
    // A finger that carries keeps it at the bottom for as long as it works.
    hand.down(330, 660)
    hand.slide(500, 660, 40)
    expect(hand.play.guidance!.glow).toBe(0)
    expect(hand.play.guidance!.demo).toBe(null)
  })

  it('stays down through a whole scene', () => {
    const hand = ready()
    hand.tap(WICK.x, WICK.y + 60)
    let shown = 0
    hand.watch = () => { if (hand.game.sceneRunning) shown = Math.max(shown, hand.play.guidance!.glow) }
    hand.wait(7)
    expect(shown).toBe(0)
  })

  it('is taken back when the game is put away', () => {
    const hand = new Hand(freshSave(4))
    hand.wait(IDLE_BEFORE_DEMO + 1)
    expect(hand.play.guidance!.demo).not.toBe(null)
    hand.play.rest()
    expect(hand.play.guidance).toMatchObject({ glow: 0, demo: null })
    hand.wait(IDLE_BEFORE_GLOW - 0.2)
    expect(hand.play.guidance!.glow).toBe(0)
  })

  it('points at one thing at a time at the table, and at the one next act', () => {
    const blank = new Hand(freshSave(8))
    expect(blank.play.aim.glow).toEqual({ left: 884, top: 396, right: 1004, bottom: 476 })
    const three = new Hand(freshSave(4))
    expect(three.play.aim.glow).toEqual(EDGE)
    const rolled = ready()
    expect(rolled.play.aim.tap).toBe(true)
  })
})

describe('the scenes', () => {
  it('out of the door: what is saved the moment the wick is tapped is what the sheet lists', () => {
    const hand = ready()
    hand.kept.length = 0
    hand.tap(WICK.x, WICK.y + 60)
    expect(hand.kept).toContain(true)
    const save = hand.game.toSave()
    expect(save).toMatchObject({ made: 'lit', lit: true, place: 'wood', lantern: PLACES.lantern, fox: PLACES.fox, hedgehog: PLACES.hedgehog, worms: 0, moths: 'bark', met: [], finished: false })
    expect(save.sheet).toEqual(freshSave(4).sheet)
    // The scene's own end changes nothing that is saved.
    hand.wait(7)
    expect(hand.game.toSave()).toEqual(save)
    expect(hand.game.sceneRunning).toBe(false)
  })

  it('home: what is saved the moment the lantern is let go on the hook is where the scene will leave everything', () => {
    // The three windows as a child would have cut them, and a walk that meets all six by play.
    const hand = new Hand(woodSave({ sheet: sheetOf('three-windows').map((window) => ({ ...window, cut: true })) }))
    meetAll(hand)
    expect(hand.wood.met.size).toBe(6)
    goHome(hand)
    const lamps = hand.wood.worms.lamps
    expect(lamps).toBeGreaterThan(0)
    hand.kept.length = 0
    hand.up()
    hand.wait(GRACE + 0.05)
    expect(hand.kept).toContain(true)
    const save = hand.game.toSave()
    expect(save).toMatchObject({ finished: true, position: 'one-window', lantern: HOOK_GRIP, lit: true, worms: lamps, moths: 'lantern' })
    expect(save.fox.x).toBe(FOX_HOME_END)
    expect(save.hedgehog.x).toBe(HEDGEHOG_MAT)
    hand.wait(9)
    expect(hand.game.sceneRunning).toBe(false)
    expect(hand.game.toSave()).toEqual(save)
    expect(hand.wood.moths.list.every((moth) => moth.mode === 'on')).toBe(true)
  })

  it('home: a walk with no window the child cut is mixed and leaves the position, and a lantern hung unlit stays dark', () => {
    const hand = new Hand(woodSave({ lit: false, lantern: { x: 900, y: 520 } }))
    hand.down(900, 520); hand.slide(HOOK_GRIP.x, HOOK_GRIP.y, 400); hand.up()
    hand.wait(9)
    expect(hand.game.toSave()).toMatchObject({ finished: true, position: 'three-windows', lit: false, moths: 'bark' })
    expect(hand.count('strike')).toBe(0)
  })

  it('taken down: what is saved the moment the lantern comes off the hook is the table with the sheet as it was', () => {
    const sheet = [{ outline: [40, 40, 60, 40, 60, 60, 40, 60], paper: 'yellow' as const, cut: true }]
    const hand = new Hand(woodSave({ finished: true, sheet, position: 'one-window' }))
    hand.down(hand.wood.lantern.x, hand.wood.lantern.y)
    hand.kept.length = 0
    hand.slide(hand.wood.lantern.x - 150, hand.wood.lantern.y + 130, 400)
    expect(hand.kept).toContain(true)
    const save = hand.game.toSave()
    expect(save).toMatchObject({ place: 'table', made: 'flat', lit: false, finished: false, position: 'one-window', sheet })
    hand.up()
    hand.wait(5)
    expect(hand.game.toSave()).toEqual(save)
  })

  for (const [name, start, lasts] of [
    ['out of the door', (hand: Hand) => hand.tap(WICK.x, WICK.y + 60), 6],
    ['home', (hand: Hand) => { meetAll(hand); hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 600, 0); hand.up(); hand.wait(GRACE + 0.05) }, 8],
    ['taken down', (hand: Hand) => { hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 600, 0); hand.up(); hand.wait(9); hand.down(hand.wood.lantern.x, hand.wood.lantern.y); hand.slide(hand.wood.lantern.x - 150, hand.wood.lantern.y + 130, 400); hand.up() }, 4],
  ] as const) {
    it(`${name}: a touch ends it where it is, silent from that frame, and leaves what its own end leaves`, () => {
      // What the scene's own end leaves.
      const whole = name === 'out of the door' ? ready() : new Hand(woodSave({ lantern: { x: 800, y: 560 } }))
      start(whole)
      expect(whole.game.sceneRunning).toBe(true)
      whole.wait(lasts + 1)
      for (const part of [0.05, 0.3, 0.5, 0.8]) {
        const hand = name === 'out of the door' ? ready() : new Hand(woodSave({ lantern: { x: 800, y: 560 } }))
        start(hand)
        hand.wait(lasts * part)
        expect(hand.game.sceneRunning).toBe(true)
        const spoken = hand.spoke.length
        // A touch in a far corner of the stage, where it does nothing else of note.
        hand.down(20, 800, 5)
        expect(hand.game.sceneRunning).toBe(false)
        expect(hand.game.toSave().place).toBe(whole.game.toSave().place)
        expect(hand.game.toSave().finished).toBe(whole.game.toSave().finished)
        // Silent from that frame: the scene's gain is closed, and nothing that sounds after it belongs to the scene.
        expect(hand.spoke.slice(spoken)).toContain('hushScene')
        hand.cancel(5)
        hand.wait(lasts + 1)
        for (const voice of hand.spoke.slice(spoken)) if (typeof voice !== 'string') expect(voice.scene).toBe(false)
        const cues = ['door', 'eyes', 'pinch', 'unroll', 'farBlow']
        const after = hand.heard.filter((event) => event.at > hand.game.time - lasts - 1 - FRAME).map((event) => event.kind)
        for (const cue of cues) expect(after).not.toContain(cue)
        if (name !== 'out of the door') {
          const left = hand.game.toSave(), right = whole.game.toSave()
          expect({ ...left, lantern: 0, lit: 0 }).toEqual({ ...right, lantern: 0, lit: 0 })
        }
      }
    })
  }
})

describe('found as left', () => {
  /** A whole evening, with something under way at most instants. */
  function evening(hand: Hand, each: () => void): void {
    hand.watch = each
    const a = point(8, 8), b = point(28, 8), c = point(28, 22), d = point(8, 22)
    hand.down(a.x, a.y); hand.slide(b.x, b.y, 200); hand.slide(c.x, c.y, 200); hand.slide(d.x, d.y, 200); hand.up()
    hand.wait(1.2)
    const yellow = middle(PAPER_RESTS.yellow), cut = point(18, 15)
    hand.drag(yellow.x, yellow.y, cut.x, cut.y, 300)
    hand.wait(0.6)
    hand.drag(middle(PAPER_RESTS.red).x, middle(PAPER_RESTS.red).y, 900, 600, 300)
    hand.wait(0.8)
    hand.drag(EDGE.left + 30, 440, SHEET.left + 60, 440, 300)
    hand.wait(0.5)
    hand.drag(CANDLE_REST.x, CANDLE_REST.y, WICK.x, WICK.y + 90, 300)
    hand.wait(1.2)
    hand.tap(WICK.x, WICK.y + 60)
    hand.wait(6.5)
    hand.carry(700, 700, 200, 1)
    hand.carry(420, 420, 200, 1.5)
    hand.carry(331, 645, 200, 2)
    hand.up()
    hand.wait(0.6)
    hand.tap(hand.wood.lantern.x, hand.wood.lantern.y)
    hand.carry(820, 420, 260, 1.5)
    hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 300, 0)
    hand.up()
    hand.wait(9)
    hand.drag(hand.wood.lantern.x, hand.wood.lantern.y, hand.wood.lantern.x - 150, hand.wood.lantern.y + 130, 300)
    hand.wait(5)
  }

  it('put away at any instant and loaded again: nothing replays, nothing starts, nothing sounds, and nothing saved is lost', () => {
    const hand = new Hand(freshSave(4))
    let frame = 0, checked = 0
    const places = new Set<string>()
    evening(hand, () => {
      if (frame++ % 23 !== 0) return
      checked++
      const save = stored(hand.game.toSave())
      places.add(`${save.place}|${save.made}|${save.finished}|${save.lit}`)
      const loaded = new Hand(save)
      // No scene runs, the place shown is the place saved, and the save is the same save.
      expect(loaded.game.sceneRunning).toBe(false)
      expect(loaded.game.show).toEqual({ room: save.place === 'table', dim: 0, door: 0, smoke: 0, glow: 1 })
      expect(loaded.game.toSave()).toEqual(save)
      // Left alone, it stays as it was found: no sound, no call to storage, the same save.
      loaded.wait(2.5)
      expect(loaded.heard.map((event) => event.kind), JSON.stringify(save)).toEqual([])
      expect(loaded.spoke.length).toBe(0)
      expect(loaded.kept.length).toBe(0)
      expect(loaded.game.toSave()).toEqual(save)
    })
    expect(checked).toBeGreaterThan(100)
    // The evening went through the table in every stage of making, the wood lit and dark, and the hook (place, made, finished, lit).
    expect([...places].sort()).toEqual(['table|candle|false|false', 'table|flat|false|false', 'table|rolled|false|false', 'wood|lit|false|false', 'wood|lit|false|true', 'wood|lit|true|true'].sort())
  })

  it('a parked game is the game a load gives, at every instant, and plays on as that game does', () => {
    const hand = new Hand(freshSave(4))
    let frame = 0, checked = 0
    evening(hand, () => {
      if (frame++ % 41 !== 7) return
      checked++
      // A second game brought to the same instant by a load, and this one parked.
      const parked = new Hand(stored(hand.game.toSave()))
      const before = stored(hand.game.toSave())
      const twin = new Hand(before)
      // Park the copy that was made from the save while something is in its hand, to hold the parking itself.
      parked.down(600, 500); parked.slide(640, 520, 300)
      parked.play.rest()
      expect(parked.spoke[parked.spoke.length - 1]).toBe('hushAll')
      const parkedSave = parked.game.toSave()
      const again = new Hand(stored(parkedSave))
      expect(dump(parked.game)).toEqual(dump(again.game))
      // And the game itself, parked where it is, with whatever was in the hand or on the screen.
      const live = stored(hand.game.toSave())
      const copy = new Game(live, 1)
      copy.park()
      expect(dump(copy)).toEqual(dump(new Game(live, 1)))
      expect(twin.game.sceneRunning).toBe(false)
    })
    expect(checked).toBeGreaterThan(50)
  })

  it('parking with something in the hand, a scene under way, the ending and a first showing: each is what a load of its save gives', () => {
    const cases: [string, () => Hand][] = [
      ['a cut under way', () => { const h = new Hand(freshSave(8)); const a = point(30, 30), b = point(60, 30); h.down(a.x, a.y); h.slide(b.x, b.y, 240); return h }],
      ['a paper in the hand', () => { const h = new Hand(freshSave(4)); const r = middle(PAPER_RESTS.red); h.down(r.x, r.y); h.slide(600, 400, 400); return h }],
      ['the candle in the hand', () => { const h = new Hand(freshSave(4)); h.down(CANDLE_REST.x, CANDLE_REST.y); h.slide(560, 440, 400); return h }],
      ['a fresh sheet in the hand', () => { const h = new Hand(freshSave(4)); h.down(middle(PILE).x, middle(PILE).y); h.slide(600, 440, 400); return h }],
      ['a fresh sheet landing', () => { const h = new Hand(freshSave(4)); h.drag(middle(PILE).x, middle(PILE).y, 600, 440, 400); h.wait(GRACE + 0.05); return h }],
      ['the edge half rolled', () => { const h = new Hand(freshSave(4)); h.down(EDGE.left + 30, 440); h.slide(640, 440, 300); return h }],
      ['the first scene', () => { const h = ready(); h.tap(WICK.x, WICK.y + 60); h.wait(2); return h }],
      ['the first scene, in the wood', () => { const h = ready(); h.tap(WICK.x, WICK.y + 60); h.wait(4.4); return h }],
      ['the first showing of the wood', () => { const h = ready(); h.tap(WICK.x, WICK.y + 60); h.wait(6.5); return h }],
      ['the lantern in the hand', () => { const h = new Hand(woodSave()); h.carry(600, 500, 300, 0.2); return h }],
      ['the lantern in the hand over the hook', () => { const h = new Hand(woodSave()); h.carry(HOOK_GRIP.x, HOOK_GRIP.y, 300, 0.2); return h }],
      ['the badger about to blow', () => { const h = new Hand(woodSave({ lantern: { x: 500, y: 645 } })); h.carry(331, 645, 300, 0.2); return h }],
      ['the ending under way', () => { const h = new Hand(woodSave()); meetAll(h, ['fox', 'hedgehog', 'moths']); h.carry(HOOK_GRIP.x, HOOK_GRIP.y, 400, 0); h.up(); h.wait(3); return h }],
      ['the ending, over', () => { const h = new Hand(woodSave()); meetAll(h, ['fox', 'hedgehog', 'moths']); h.carry(HOOK_GRIP.x, HOOK_GRIP.y, 400, 0); h.up(); h.wait(10); return h }],
      ['the pull off the hook', () => { const h = new Hand(woodSave({ finished: true })); h.down(h.wood.lantern.x, h.wood.lantern.y); h.slide(h.wood.lantern.x - 40, h.wood.lantern.y + 20, 300); return h }],
      ['taken down, under way', () => { const h = new Hand(woodSave({ finished: true })); h.down(h.wood.lantern.x, h.wood.lantern.y); h.slide(h.wood.lantern.x - 150, h.wood.lantern.y + 130, 300); h.up(); h.wait(2.5); return h }],
    ]
    for (const [name, make] of cases) {
      const hand = make()
      const save = stored(hand.game.toSave())
      hand.play.rest()
      expect(dump(hand.game), name).toEqual(dump(new Game(save, 1)))
      expect(hand.spoke[hand.spoke.length - 1], name).toBe('hushAll')
      expect(hand.game.busy, name).toBe(false)
      // Opened again, it plays on without a sound until it is touched.
      const heard = hand.heard.length
      hand.wait(3)
      expect(hand.heard.length, name).toBe(heard)
      const twin = new Hand(save)
      twin.wait(3)
      expect(dump(hand.game), name).toEqual(dump(twin.game))
    }
  })

  it('nothing let go just before the game is put away is lost: a cut, a paper, a fresh sheet and a lantern on the hook, each still waiting out its lift, stand as let go where they were', () => {
    /** The middle of a window of the sheet, on the table. */
    const windowAt = (h: Hand, i: number) => { const o = h.table.sheet[i].outline; let x = 0, y = 0; for (let k = 0; k < o.length; k += 2) { x += o[k]; y += o[k + 1] } return point(x / (o.length / 2), y / (o.length / 2)) }
    const cases: [string, () => Hand, (h: Hand) => void][] = [
      ['a cut', () => { const h = new Hand(freshSave(8)); const a = point(30, 30), b = point(60, 30), c = point(60, 60), d = point(30, 60); h.down(a.x, a.y); h.slide(b.x, b.y, 300); h.slide(c.x, c.y, 300); h.slide(d.x, d.y, 300); h.up(); return h },
        (h) => { expect(h.game.toSave().sheet).toHaveLength(1); expect(h.game.toSave().sheet[0].cut).toBe(true) }],
      ['a paper', () => { const h = new Hand(freshSave(4)); const i = h.table.sheet.findIndex((w) => w.paper === 'blue'); const r = middle(PAPER_RESTS.red), to = windowAt(h, i); h.down(r.x, r.y); h.slide(to.x, to.y, 400); h.up(); return h },
        (h) => { expect(h.game.toSave().sheet.map((w) => w.paper).sort()).toEqual(['red', 'red', 'yellow']) }],
      ['a fresh sheet', () => { const h = new Hand(freshSave(4)); const i = h.table.sheet.findIndex((w) => w.paper === 'blue'); const r = middle(PAPER_RESTS.red), to = windowAt(h, i); h.drag(r.x, r.y, to.x, to.y, 400); h.wait(GRACE + 0.2); expect(h.game.toSave().sheet.some((w) => w.paper === 'blue')).toBe(false); h.down(middle(PILE).x, middle(PILE).y); h.slide(600, 440, 400); h.up(); return h },
        (h) => { expect(h.game.toSave().sheet).toEqual(freshSave(4).sheet) }],
      ['the lantern on the hook', () => { const h = new Hand(woodSave()); meet(h, 'fox'); h.carry(HOOK_GRIP.x, HOOK_GRIP.y, 400, 0.1); h.up(); return h },
        (h) => { expect(h.game.toSave().finished).toBe(true); expect(h.wood.hung).toBe(true) }],
    ]
    for (const [name, make, holds] of cases) {
      const hand = make()
      // Still inside the 0.3 s in which a finger could take the thing up again: nothing has been settled yet.
      expect(hand.game.busy, name).toBe(true)
      hand.wait(GRACE / 3)
      hand.play.rest()
      holds(hand)
      // And the parked game is the game a load of what it now saves gives.
      const save = stored(hand.game.toSave())
      expect(dump(hand.game), name).toEqual(dump(new Game(save, 1)))
      hand.wait(2)
      holds(hand)
    }
  })

  it('a dark wood found dark stays dark, and waits for the tap', () => {
    const hand = new Hand(woodSave({ lit: false, lantern: { x: 400, y: 600 } }))
    hand.wait(5)
    expect(hand.wood.lit).toBe(false)
    expect(hand.heard.length).toBe(0)
  })
})

describe('age is a hint', () => {
  it('chooses the sheet a first visit finds, with both ends open, and nothing else', () => {
    const sheets = [null, 2, 4, 5, 6, 7, 8, 12, 40].map((age) => [freshSave(age).position, freshSave(age).sheet.length])
    expect(sheets).toEqual([['three-windows', 3], ['three-windows', 3], ['three-windows', 3], ['three-windows', 3], ['one-window', 1], ['one-window', 1], ['blank-sheet', 0], ['blank-sheet', 0], ['blank-sheet', 0]])
    for (const age of [null, 4, 6, 8]) expect({ ...freshSave(age), position: '', sheet: [] }).toEqual({ ...freshSave(null), position: '', sheet: [] })
  })

  it('a saved game is the same game at every age', () => {
    const save = serialize(woodSave({ position: 'one-window', lantern: { x: 500, y: 500 }, worms: 3 }))
    for (const age of [null, 4, 6, 8, 12]) expect(deserialize(JSON.parse(JSON.stringify(save)), age)).toEqual(deserialize(save, null))
  })

  it('any sheet can be cut further by any child, up to eight windows', () => {
    const hand = new Hand(freshSave(4))
    for (let i = 0; i < 6; i++) {
      const a = point(6 + i * 15, 76), b = point(16 + i * 15, 76), c = point(16 + i * 15, 92), d = point(6 + i * 15, 92)
      hand.down(a.x, a.y); hand.slide(b.x, b.y, 300); hand.slide(c.x, c.y, 300); hand.slide(d.x, d.y, 300); hand.up()
      hand.wait(GRACE + 0.1)
    }
    expect(hand.table.sheet.length).toBe(8)
    expect(hand.table.sheet.filter((window) => window.cut).length).toBe(5)
  })
})
