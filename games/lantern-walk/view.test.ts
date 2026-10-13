import { describe, expect, it } from 'vitest'
import { freshBadger } from './badger'
import { TIERS } from './config'
import { drawBadger, drawFox, drawHedgehog, drawOwl } from './figures'
import figuresSource from './figures.ts?raw'
import { freshFox } from './fox'
import type { Guidance } from './guidance'
import { Hand, boundsOf, gripFor, woodSave } from './hand'
import { freshHedgehog } from './hedgehog'
import { STAGE_H, STAGE_W, SURFACES, box } from './layout'
import { freshOwl } from './owl'
import { RoomView, paintRoom } from './room'
import { BIG } from './seen'
import roomSource from './room.ts?raw'
import { freshSave } from './save'
import { PAST, paintSetting } from './setting'
import type { Paper, SheetWindow } from './sheet'
import { Sketch } from './sketch'
import { drawSmall } from './small'
import smallSource from './small.ts?raw'
import { fit } from './stage'
import { Table } from './table'
import { CREAM, WoodView, type Aim, type Surface } from './view'
import viewSource from './view.ts?raw'
import mountSource from './lantern-walk.tsx?raw'

// What a frame costs, what it shows and what it leaves out, read off a
// stand-in for the canvas that counts every stamp, stroke and fill itself.

type Call = { name: string; clipped: boolean; fill: unknown }

/** A stand-in for a canvas: every call is taken, and the ones that draw are kept. */
function standIn() {
  const calls: Call[] = []
  let depth = 0
  const clips: number[] = []
  const state: Record<string, unknown> = {}
  const pen = new Proxy(state, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'createLinearGradient') return () => ({ addColorStop() {} })
      return (...args: unknown[]) => {
        if (name === 'save') depth++
        if (name === 'restore') { while (clips.length > 0 && clips[clips.length - 1] >= depth) clips.pop(); depth-- }
        if (name === 'clip') clips.push(depth)
        if (name === 'fill' || name === 'stroke' || name === 'drawImage' || name === 'fillRect') calls.push({ name, clipped: clips.length > 0, fill: name === 'fill' ? target.fillStyle : args[0] })
      }
    },
    set(target, name: string, value) { target[name] = value; return true },
  })
  const surface = { width: 0, height: 0, getContext: () => pen } as unknown as Surface
  return { surface, calls }
}

/** A round window of the sheet. */
function hole(x: number, y: number, paper: Paper | null, r = 9): SheetWindow {
  const outline: number[] = []
  for (let i = 0; i < 12; i++) outline.push(Math.round(x + Math.cos((i / 12) * Math.PI * 2) * r), Math.round(y + Math.sin((i / 12) * Math.PI * 2) * r))
  return { outline, paper, cut: true }
}
/** Eight windows, of every paper and of none. */
const EIGHT: SheetWindow[] = [hole(12, 30, 'red'), hole(36, 30, 'blue'), hole(62, 30, 'yellow'), hole(88, 30, null), hole(12, 70, 'yellow'), hole(36, 70, null), hole(62, 70, 'red'), hole(88, 70, 'blue')]

const guidance: Guidance = { glow: 1, demo: 0.4, demoIndex: 0 }
const aim: Aim = { fromX: 500, fromY: 500, toX: 600, toY: 520, tap: false, glow: box(480, 460, 560, 560) }

function woodView(surface: { width: number; height: number } = SURFACES[0], tier = 0) {
  const main = standIn(), layers = standIn()
  const view = new WoodView(main.surface, () => layers.surface)
  view.resize(surface.width, surface.height, TIERS[tier].dpr, TIERS[tier])
  return { view, calls: main.calls, layers: layers.calls }
}
function roomView(surface: { width: number; height: number } = SURFACES[0], tier = 0) {
  const main = standIn(), layers = standIn()
  const view = new RoomView(main.surface, () => layers.surface)
  view.resize(surface.width, surface.height, TIERS[tier].dpr, TIERS[tier])
  return { view, calls: main.calls, layers: layers.calls }
}

/** A wood busier than any the game can reach: eight windows, every lamp lit, every creature in the light at once, the feather down, the badger's breath out, the door open and the idle guidance up. */
function busiestWood(): Hand {
  const hand = new Hand(woodSave({ sheet: EIGHT, worms: 31 }))
  const wood = hand.wood
  // Lit means answered: the view draws in full whoever the model says a light touches, and here that is everybody.
  for (const name of BIG) wood.sight[name].touch = wood.patches[0]
  wood.touching = () => wood.patches[0]
  wood.owl.feather.t = 1; wood.owl.feather.x = 400; wood.owl.feather.y = 292
  wood.badger.mode = 'draw'; wood.badger.breath = 1; wood.badger.farPuff = 0.6; wood.badger.raspberry = 0.5
  wood.flare = 0.5
  // And a second finger has just landed beside the one that carries.
  wood.nick.pulse = 1; wood.nick.x = 300; wood.nick.y = 420
  return hand
}

/** A table with as much on it as it can hold. */
function busiestTables(): Table[] {
  const cutting = new Table('flat', EIGHT)
  cutting.hand = { kind: 'cut', path: [10, 10, 20, 12, 22, 24], cutSince: 0 }
  const carrying = new Table('flat', EIGHT)
  carrying.hand = { kind: 'paper', paper: 'red', x: 500, y: 400 }
  const lit = new Table('lit', EIGHT)
  lit.flame = 1
  for (const table of [cutting, carrying, lit]) {
    table.gone.along = 0.4; table.gone.sheet = EIGHT
    table.closing.along = 0.5; table.closing.path = [10, 10, 30, 10, 30, 30]
    table.back.along = 0.5; table.tucked.window = 0; table.tucked.pulse = 1
    table.knock.pulse = 1; table.knock.x = 300; table.knock.y = 700
    table.scraps.push({ x: 400, y: 700, spin: 0, outline: [-10, -10, 10, -10, 0, 12], landed: 0, skid: 0 })
    table.cat.bat = 1; table.cat.ear = 1
  }
  return [cutting, carrying, lit]
}

describe('what a frame costs', () => {
  it('the wood: the busiest frame is under 80 draws with one full stamp, and the view counts what the canvas was asked for', () => {
    const { view, calls } = woodView()
    const hand = busiestWood()
    calls.length = 0
    view.draw(hand.wood, { door: 1, glow: 1 }, guidance, aim, 3.3)
    expect(view.draws).toBe(calls.length)
    expect(view.fullStamps).toBe(1)
    // The two other stamps are the ink layer, clipped: through the rounds of the glow-worms' lamps, under the creatures, and through the outlines of the patches.
    expect(calls.filter((call) => call.name === 'drawImage').map((call) => call.clipped)).toEqual([false, true, true])
    let most = view.draws
    // The same wood with the lantern on its hook: the glow lights nobody, and whoever it lies on is scraped again
    // over it as the dark shows them, which is one pass more than a carried lantern costs.
    hand.wood.hung = true
    for (const glow of [0, 0.5, 1]) {
      hand.wood.glow = glow
      calls.length = 0
      view.draw(hand.wood, { door: 1, glow }, guidance, aim, 3.3)
      expect(view.draws).toBe(calls.length)
      expect(view.fullStamps).toBe(1)
      most = Math.max(most, view.draws)
    }
    expect(most).toBeLessThan(80)
    // The one draw number of the game: 72.
    expect(most).toBe(72)
  })

  it('the wood: no frame of a played walk costs more than the busiest', () => {
    const { view, calls } = woodView()
    const busiest = busiestWood()
    view.draw(busiest.wood, { door: 1, glow: 1 }, guidance, aim, 3.3)
    const most = view.draws
    expect(most).toBe(68)
    const hand = new Hand(woodSave({ sheet: EIGHT }))
    let seen = 0
    hand.watch = () => {
      calls.length = 0
      view.draw(hand.game.wood, hand.game.show, hand.play.guidance, hand.play.aim, hand.game.time)
      expect(view.draws).toBe(calls.length)
      seen = Math.max(seen, view.draws)
    }
    hand.carry(300, 500, 400, 0.5)
    hand.carry(700, 300, 900, 0.5)
    hand.up()
    hand.wait(9)
    expect(seen).toBeGreaterThan(20)
    expect(seen).toBeLessThanOrEqual(most)
  })

  it('the wood: on its hook the lantern lights nobody: with every creature under its glow, none of the four large ones is scraped whole', () => {
    const { view, calls } = woodView()
    const hand = busiestWood()
    hand.wood.hung = true
    for (const glow of [0, 0.5, 1]) {
      hand.wood.glow = glow
      calls.length = 0
      view.draw(hand.wood, { door: 0, glow }, guidance, aim, 3.3)
      expect(view.draws).toBe(calls.length)
      expect(view.draws).toBeLessThanOrEqual(72)
      // On the hook the glow lights nobody: none of the four large creatures is scraped whole in cream. The one
      // cream fill left is the small things' own: the glow-worms shown by their own lamps.
      expect(calls.filter((call) => call.name === 'fill' && call.fill === CREAM && !call.clipped)).toHaveLength(1)
    }
    // Carried, the same wood scrapes all four and the small things: five.
    hand.wood.hung = false
    calls.length = 0
    view.draw(hand.wood, { door: 0, glow: 1 }, guidance, aim, 3.3)
    expect(calls.filter((call) => call.name === 'fill' && call.fill === CREAM && !call.clipped)).toHaveLength(5)
  })

  it('the table: a fresh sheet sliding back to the pile is drawn, two draws for as long as it slides, and the frame stays under the busiest', () => {
    const { view, calls } = roomView()
    const table = new Table('flat', EIGHT)
    calls.length = 0
    view.draw(table, { dim: 0, door: 0, smoke: 0 }, null, null, 2.1)
    const still = view.draws
    table.freshBack.x = 760; table.freshBack.y = 430; table.freshBack.along = 0.4
    calls.length = 0
    view.draw(table, { dim: 0, door: 0, smoke: 0 }, null, null, 2.1)
    expect(view.draws).toBe(calls.length)
    expect(view.draws).toBe(still + 2)
    expect(view.draws).toBeLessThanOrEqual(32)
  })

  it('the table: the busiest frame is under 80 draws with one full stamp, and the view counts what the canvas was asked for', () => {
    const { view, calls } = roomView()
    let most = 0
    for (const table of busiestTables()) {
      calls.length = 0
      view.draw(table, { dim: 0.6, door: 1, smoke: 0.5 }, guidance, aim, 2.1)
      expect(view.draws).toBe(calls.length)
      expect(view.fullStamps).toBe(1)
      expect(calls.filter((call) => call.name === 'drawImage')).toHaveLength(1)
      most = Math.max(most, view.draws)
    }
    expect(most).toBeLessThan(80)
    expect(most).toBe(32)
  })

  it('a surface with no size draws nothing and does not throw', () => {
    const main = standIn(), layers = standIn()
    const wood = new WoodView(main.surface, () => layers.surface)
    wood.resize(0, 0, 2, TIERS[0])
    wood.draw(busiestWood().wood, { door: 0, glow: 1 }, null, null, 0)
    const room = new RoomView(main.surface, () => layers.surface)
    room.resize(0, 0, 2, TIERS[0])
    room.draw(new Table('flat', EIGHT), { dim: 0, door: 0, smoke: 0 }, null, null, 0)
    expect(main.calls).toHaveLength(0)
  })
})

describe('before storage has answered', () => {
  it('the view draws the black wax and nothing else: one fill of the whole surface, and neither place', () => {
    const { view, calls, layers } = woodView()
    calls.length = 0; layers.length = 0
    view.blank()
    expect(calls.map((call) => [call.name, call.fill])).toEqual([['fillRect', 0]])
    expect(layers).toHaveLength(0)
    expect(view.draws).toBe(1)
  })

  it('the Mount draws that and neither place until the load is in', () => {
    expect(mountSource).toMatch(/if \(!play\) \{\s*wood\.blank\(\)\s*drawn\.drawCalls = wood\.draws\s*return\s*\}/)
  })
})

describe('a creature a patch of light touches is seen whole', () => {
  it('the lit creatures are drawn after the clip of the patches is lifted, so no patch cuts one in two', () => {
    const { view, calls } = woodView()
    const hand = new Hand(woodSave({ sheet: [hole(79, 50, 'yellow', 16)] }))
    // The edge of the patch on the fox's chest, and no more of the fox than that.
    const at = gripFor(hand.wood, 'yellow', hand.wood.fox.x + 136, 560)
    hand.carry(at.x, at.y, 300, 0.3)
    calls.length = 0
    view.draw(hand.wood, hand.game.show, null, null, hand.game.time)
    const whole = calls.filter((call) => call.name === 'fill' && call.fill === CREAM)
    expect(whole.length).toBeGreaterThan(0)
    expect(whole.every((call) => !call.clipped)).toBe(true)
  })

  it('with no light nothing is drawn in full', () => {
    const { view, calls } = woodView()
    const hand = new Hand(woodSave({ lit: false }))
    calls.length = 0
    view.draw(hand.wood, hand.game.show, null, null, 0)
    expect(calls.filter((call) => call.fill === CREAM)).toHaveLength(0)
  })
})

describe('the answer to a touch is never something a quality tier leaves out', () => {
  it('the wood: every tier draws every figure, every patch and the lantern; only the crumbs of wax go', () => {
    const counts = TIERS.map((_, tier) => {
      const { view, calls } = woodView(SURFACES[0], tier)
      const hand = busiestWood()
      calls.length = 0
      view.draw(hand.wood, { door: 1, glow: 1 }, guidance, aim, 3.3)
      return view.draws
    })
    for (let tier = 0; tier < TIERS.length; tier++) expect(counts[tier]).toBe(counts[0] - (TIERS[tier].grain ? 0 : 2))
  })

  it('the table: every tier draws the same frame', () => {
    const counts = TIERS.map((_, tier) => {
      const { view } = roomView(SURFACES[0], tier)
      view.draw(busiestTables()[0], { dim: 0.6, door: 1, smoke: 0.5 }, guidance, aim, 2.1)
      return view.draws
    })
    expect(new Set(counts).size).toBe(1)
  })
})

describe('the frame is a place filled from edge to edge', () => {
  /** How many cells of a grid over a box hold a scraped line. */
  function empty(sketch: Sketch, left: number, top: number, right: number, bottom: number, columns: number, rows: number): string[] {
    const filled = new Set<string>()
    const pts = sketch.lines.pts
    for (let i = 0; i < sketch.lines.n; i += 2) {
      const column = Math.floor(((pts[i] - left) / (right - left)) * columns), row = Math.floor(((pts[i + 1] - top) / (bottom - top)) * rows)
      filled.add(`${column},${row}`)
    }
    const out: string[] = []
    for (let column = 0; column < columns; column++) for (let row = 0; row < rows; row++) if (!filled.has(`${column},${row}`)) out.push(`${column},${row}`)
    return out
  }

  it('the wood: with the creatures at rest, every cell of an eight by six grid over the stage holds something drawn', () => {
    const sketch = new Sketch()
    paintSetting(sketch)
    const hand = new Hand(woodSave())
    // The creatures are written into the same sketch as the view writes them.
    for (const paint of [drawOwl, drawBadger, drawFox, drawHedgehog]) paint(sketch, hand.wood, 0)
    drawSmall(sketch, hand.wood, 0, false)
    expect(empty(sketch, 0, 0, STAGE_W, STAGE_H, 8, 6)).toEqual([])
  })

  it('the wood and the room are drawn past the stage on every side, as far as either surface shows', () => {
    for (const surface of SURFACES) {
      const by = fit(surface.width, surface.height)
      const shown = box(-by.x / by.scale, -by.y / by.scale, (surface.width - by.x) / by.scale, (surface.height - by.y) / by.scale)
      for (const paint of [paintSetting, paintRoom]) {
        const sketch = new Sketch()
        paint(sketch)
        const drawn = boundsOf(sketch)
        expect(drawn.left).toBeLessThanOrEqual(shown.left)
        expect(drawn.right).toBeGreaterThanOrEqual(shown.right)
        expect(drawn.top).toBeLessThanOrEqual(shown.top + 30)
        expect(drawn.bottom).toBeGreaterThanOrEqual(shown.bottom - 30)
        expect(shown.left).toBeGreaterThanOrEqual(PAST.left)
        expect(shown.bottom).toBeLessThanOrEqual(PAST.bottom)
      }
    }
  })

  it('the room: every cell of a six by four grid holds something drawn, with the table and the cat', () => {
    const sketch = new Sketch()
    paintRoom(sketch)
    // The table top is one scraped-clear place, and what lies on it fills it.
    const cells = empty(sketch, 0, 0, STAGE_W, STAGE_H, 6, 4).filter((cell) => !['1,1', '2,1', '3,1', '4,1', '1,2', '2,2', '3,2', '4,2'].includes(cell))
    expect(cells).toEqual([])
  })
})

describe('every pose value the model computes is read by the view', () => {
  const reads = (source: string, key: string) => new RegExp(`\\.${key}\\b`).test(source)

  /** What a model keeps for itself and the eye never needs: its clocks, its turn-taking and where an act began. */
  const INSIDE = {
    fox: ['t', 'rest', 'fromX', 'toX', 'beat', 'goTo', 'into', 'aside', 'glanceWait', 'saw'],
    owl: ['manner', 'dark', 'since', 'spun', 'beat', 'peering', 'rest', 'glanceWait', 'saw'],
    hedgehog: ['nose', 'way', 't', 'rest', 'beat', 'goTo', 'aside', 'glanceWait', 'saw'],
    badger: ['manner', 't', 'rest', 'near', 'beat', 'glanceWait', 'saw'],
  }

  it('the four large creatures', () => {
    const fresh = { fox: freshFox(0), owl: freshOwl(), hedgehog: freshHedgehog(0), badger: freshBadger() }
    for (const name of ['fox', 'owl', 'hedgehog', 'badger'] as const) {
      const unread = Object.keys(fresh[name]).filter((key) => !INSIDE[name].includes(key) && !reads(figuresSource + smallSource, key))
      expect(unread, name).toEqual([])
    }
  })

  it('the moths, the glow-worms, the spider and the feather', () => {
    // The owl's loose feather is one of the small things.
    for (const key of ['x', 'y', 'mode', 'beat', 'spin', 'fold', 'size', 'glance', 'snore', 'peer', 'pulse', 'duck', 'flash', 'knock', 'drop', 'spiderY', 'feather', 'tilt', 'carries', 'awake']) expect(reads(smallSource, key), key).toBe(true)
    for (const call of ['wormAt(', 'lampShows(']) expect(smallSource.includes(call), call).toBe(true)
  })

  it('the lantern and what a scene shows in the wood', () => {
    for (const key of ['swing', 'swingSpeed', 'flare', 'hung', 'lit', 'gives', 'patches', 'grip', 'lantern', 'door', 'glow', 'bearing', 'local', 'world']) expect(reads(viewSource, key), key).toBe(true)
  })

  it('the table, the cat and what a scene shows in the room', () => {
    for (const key of ['scissors', 'open', 'turn', 'candle', 'rolled', 'wobble', 'hop', 'back', 'along', 'tucked', 'pulse', 'closing', 'gone', 'landing', 'scraps', 'spin', 'outline', 'knock', 'flame', 'held', 'hand', 'made', 'sheet', 'lookX', 'lookY', 'bat', 'ear', 'dim', 'door', 'smoke']) expect(reads(roomSource, key), key).toBe(true)
  })
})

describe('every character moves like itself', () => {
  /** How far a creature's drawing has moved from one sixth of a second to the next, over six seconds at rest. */
  function idle(paint: (s: Sketch, wood: Hand['wood'], t: number) => void): number[] {
    const hand = new Hand(woodSave({ lit: false }))
    const sketch = new Sketch()
    sketch.wobble = 0
    let last: number[] = []
    const moved: number[] = []
    for (let k = 0; k <= 36; k++) {
      sketch.clear()
      paint(sketch, hand.wood, k / 6)
      const now = Array.from(sketch.lines.pts.subarray(0, sketch.lines.n))
      if (k > 0) moved.push(now.length === last.length ? now.reduce((sum, v, i) => sum + Math.abs(v - last[i]), 0) : 999)
      last = now
    }
    return moved
  }
  const alike = (a: number[], b: number[]): number => {
    const mean = (v: number[]) => v.reduce((sum, x) => sum + x, 0) / v.length
    const ma = mean(a), mb = mean(b)
    let top = 0, da = 0, db = 0
    for (let i = 0; i < a.length; i++) { top += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2 }
    return top / Math.sqrt(da * db || 1)
  }

  it('at rest in the dark each of the four large creatures moves, and no two move in step', () => {
    const moves = [drawOwl, drawBadger, drawFox, drawHedgehog].map(idle)
    for (const move of moves) expect(move.filter((by) => by > 1).length).toBeGreaterThan(6)
    for (let a = 0; a < moves.length; a++) for (let b = a + 1; b < moves.length; b++) expect(alike(moves[a], moves[b]), `${a} and ${b}`).toBeLessThan(0.9)
  })
})

describe('a first visit is drawn as a first visit', () => {
  it('the table of a fresh save draws without a wood, at both surface sizes', () => {
    for (const surface of SURFACES) {
      const { view, calls } = roomView(surface)
      const save = freshSave(null)
      calls.length = 0
      view.draw(new Table(save.made, save.sheet), { dim: 0, door: 0, smoke: 0 }, null, null, 0)
      expect(view.draws).toBe(calls.length)
      expect(view.draws).toBeGreaterThan(8)
    }
  })
})
