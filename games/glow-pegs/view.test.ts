import { describe, expect, it } from 'vitest'
import { BLUE, BOARD, COLS, GREEN, HOLES, MOTH_RADIUS, ORIGIN, PEG_RADIUS, PITCH, RED, ROWS, WHITE, YELLOW, centreOf, holeAt, perchOf, type Colour } from './board'
import { TIERS } from './config'
import { MOTH_SIZE, drawGecko, drawMoth, drawSpider } from './figures'
import { CAP_ACROSS, halfShape } from './beam'
import { drawBlooms } from './blooms'
import { BUTTONS, ECHO_LINE, GECKO, HANDLE, SPIDER, SPIDER_PLACE, keyMarks, knobAt, spiderAt } from './layout'
import { SPIDER_ACTS, spiderPose, type GeckoPose, type SpiderAct, type SpiderPose } from './motion'
import type { Ctx } from './pen'
import { Moth } from './moth'
import { freshSave } from './save'
import { HANDLE_RATTLE, PILE_RATTLE, Toy, handleGlint, handleSwing } from './toy'
import { HALF_LIGHT, ToyView } from './view'

// Every value the model computes for the eye is read by the view: changed, it changes what is drawn. And a
// thing is touched where it is drawn, in every state. A stand-in context writes down every call it is given.

function recorder(): { ctx: Ctx; calls: string[]; canvas: HTMLCanvasElement } {
  const calls: string[] = []
  const gradient = { addColorStop: () => {} }
  const round = (value: unknown) => (typeof value === 'number' ? value.toFixed(3) : typeof value === 'string' ? value : '')
  const target: Record<string, unknown> = {}
  const ctx = new Proxy(target, {
    get(_, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => gradient
      return (...args: unknown[]) => void calls.push(`${name}(${args.map(round).join(',')})`)
    },
    set(_, name, value) {
      if (typeof name === 'string') {
        target[name] = value
        if (name === 'globalAlpha' || name === 'strokeStyle' || name === 'fillStyle' || name === 'lineWidth') calls.push(`${name}=${round(value)}`)
      }
      return true
    },
  }) as unknown as Ctx
  return { ctx, calls, canvas: { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement }
}

const restSpider = (): SpiderPose => ({ drop: 0, swing: 0, squash: 0, eyeSpread: 0, lids: 0, cover: 0, feet: [0, 0, 0, 0], shake: 0, strand: 0 })
const restGecko = (): GeckoPose => ({ slide: 0, tremble: 0, tongue: 0, curl: 0, wag: 0, belly: 0, lids: [0, 0], pupil: 1, mouth: 0, slip: 0, rolling: 0, roll: 0, cross: 0, nod: 0 })
const look = { x: 590, y: 330 }

describe('every value of a pose is drawn', () => {
  it('the spider: each of its twelve values changes the drawing', () => {
    const drawing = (pose: SpiderPose) => { const { ctx, calls } = recorder(); drawSpider(ctx, pose, look, 0.3); return calls.join() }
    const rest = drawing(restSpider())
    const changes: Record<string, (pose: SpiderPose) => void> = {
      drop: (pose) => (pose.drop = 40), swing: (pose) => (pose.swing = 0.2), squash: (pose) => (pose.squash = 0.2), eyeSpread: (pose) => (pose.eyeSpread = 0.5),
      lids: (pose) => (pose.lids = 0.6), cover: (pose) => (pose.cover = 0.8), shake: (pose) => (pose.shake = 0.2), strand: (pose) => (pose.strand = 0.7),
      'foot 0': (pose) => (pose.feet[0] = 1), 'foot 1': (pose) => (pose.feet[1] = 1), 'foot 2': (pose) => (pose.feet[2] = 1), 'foot 3': (pose) => (pose.feet[3] = 1),
    }
    expect(Object.keys(changes)).toHaveLength(Object.keys(restSpider()).length - 1 + 4)
    const seen = new Set([rest])
    for (const [name, change] of Object.entries(changes)) {
      const pose = restSpider()
      change(pose)
      const now = drawing(pose)
      expect(now, name).not.toBe(rest)
      seen.add(now)
    }
    // And no two of them draw the same.
    expect(seen.size).toBe(13)
  })

  it('the gecko: each of its fifteen values changes the drawing', () => {
    const drawing = (pose: GeckoPose) => { const { ctx, calls } = recorder(); drawGecko(ctx, pose, look, 0.3, { x: 0, y: 0 }); return calls.join() }
    const rest = drawing(restGecko())
    const changes: Record<string, (pose: GeckoPose) => void> = {
      slide: (pose) => (pose.slide = 20), tremble: (pose) => (pose.tremble = 2), tongue: (pose) => (pose.tongue = 0.6), curl: (pose) => (pose.curl = 0.5), wag: (pose) => (pose.wag = 0.3),
      belly: (pose) => (pose.belly = 0.6), 'left lid': (pose) => (pose.lids[0] = 0.9), 'right lid': (pose) => (pose.lids[1] = 0.9), pupil: (pose) => (pose.pupil = 0.3), mouth: (pose) => (pose.mouth = 0.6),
      slip: (pose) => (pose.slip = 0.7), rolling: (pose) => (pose.rolling = 0.8), cross: (pose) => (pose.cross = 0.8), nod: (pose) => (pose.nod = 8),
    }
    const seen = new Set([rest])
    for (const [name, change] of Object.entries(changes)) {
      const pose = restGecko()
      change(pose)
      const now = drawing(pose)
      expect(now, name).not.toBe(rest)
      seen.add(now)
    }
    expect(seen.size).toBe(15)
    // The angle of a roll is read while the eyes roll.
    const rolled = (roll: number) => drawing({ ...restGecko(), rolling: 1, roll })
    expect(rolled(1)).not.toBe(rolled(2.5))
    expect(Object.keys(changes).length + 1).toBe(Object.keys(restGecko()).length + 1)
  })

  it('draws the spider where a touch finds it, wherever its thread has taken it', () => {
    for (const [drop, swing] of [[0, 0], [170, 0], [60, 0.2], [120, -0.09]]) {
      const { ctx, calls } = recorder()
      drawSpider(ctx, { ...restSpider(), drop, swing }, look, 0.3)
      const at = spiderAt(drop, swing)
      // Its abdomen is an ellipse sixteen units below the point a touch is measured from.
      expect(calls).toContain(`ellipse(${at.x.toFixed(3)},${(at.y + 16).toFixed(3)},44.000,46.000,0.000,0.000,${(Math.PI * 2).toFixed(3)})`)
    }
  })
})

describe('the moth as it is drawn', () => {
  /** Every point the moth's outline is drawn through or bent towards, as its distance from its middle. */
  function reach(moth: Moth): number {
    const { ctx, calls } = recorder()
    drawMoth(ctx, moth, 0.3)
    let far = 0
    for (const call of calls) {
      const found = /^(moveTo|lineTo|quadraticCurveTo)\((.*)\)$/.exec(call)
      if (!found) continue
      const n = found[2].split(',').map(Number)
      for (let i = 0; i + 1 < n.length; i += 2) far = Math.max(far, Math.hypot(n[i] - moth.x, n[i + 1] - moth.y))
    }
    return far
  }

  it('sitting, with its wings as wide as they go and turned any way, stays clear of every peg and hole mark beside it', () => {
    // A peg's cap is drawn two units inside its radius; the moth sits where four cells meet.
    const room = Math.hypot(PITCH / 2, PITCH / 2) - (PEG_RADIUS - 2)
    let widest = 0
    for (const act of [null, 'fan', 'doze'] as const) {
      for (let wing = 0; wing < 3; wing += 0.05) for (const heading of [-Math.PI / 2, 0, 0.8, 2.4, Math.PI]) {
        const moth = new Moth(40)
        moth.wing = wing
        moth.heading = heading
        if (act) { moth.mode = 'act'; moth.act = act }
        expect(moth.resting).toBe(true)
        widest = Math.max(widest, reach(moth))
      }
    }
    expect(widest).toBeLessThanOrEqual(room)
    expect(MOTH_RADIUS).toBeLessThanOrEqual(room)
    // It is as large as that room allows, give or take a fifth, so that it reads.
    expect(widest).toBeGreaterThan(room * 0.8)
  })

  it('is drawn half as large again in the air, with its own way of flying', () => {
    const sitting = new Moth(40), flying = new Moth(40)
    flying.mode = 'fly'
    flying.wing = 0.03
    expect(reach(flying)).toBeGreaterThan(reach(sitting) * 1.3)
    expect(MOTH_SIZE.flying / MOTH_SIZE.resting).toBeGreaterThan(1.5)
  })
})

describe('every moving thing of the game is drawn', () => {
  /** What the live layer is given for a toy as it stands. */
  function drawing(change: (toy: Toy) => void, save = freshSave(null)): string {
    const still = recorder(), live = recorder()
    const view = new ToyView(still.canvas, live.canvas, () => recorder().canvas)
    view.setTier(TIERS[0])
    view.resize(1180, 820, 2)
    const toy = new Toy(save, 1)
    change(toy)
    live.calls.length = 0
    view.draw(toy, 0, null)
    return live.calls.join()
  }
  const rest = drawing(() => {})

  it('draws the same toy the same way twice', () => {
    expect(drawing(() => {})).toBe(rest)
  })

  const changes: Record<string, (toy: Toy) => void> = {
    'the bezel\'s kick': (toy) => (toy.kickAge = 0.1),
    'the loudspeaker\'s pulse': (toy) => (toy.pulseAge = 0.1),
    'a well that took a peg': (toy) => (toy.wellAge[3] = 0.1),
    'the well of the colour in hand': (toy) => (toy.wellAge[toy.hand] = 0.05),
    'the colour in hand': (toy) => (toy.hand = YELLOW),
    'the key that is down': (toy) => { toy.mirror = 2 },
    'the other key down': (toy) => { toy.mirror = 1 },
    'a key just pressed': (toy) => (toy.buttonAge = 0.02),
    'the lever\'s knob part of the way down': (toy) => { toy.knob = 0.4 },
    'the lever\'s knob in the finger': (toy) => { toy.leverHeld = true },
    'a well\'s pile rattling': (toy) => (toy.pileAge[3] = 0.1),
    'the gecko\'s neck leaning': (toy) => { toy.neck.x = 9; toy.neck.y = -6 },
    'the lever down': (toy) => { toy.leverDown = true },
    'the lever on its way': (toy) => (toy.leverAge = 0.03),
    'the handle pulled': (toy) => (toy.handlePull = 30),
    'the handle rattling': (toy) => (toy.handleAge = 0.1),
    'the spider shaken by a landing': (toy) => (toy.joltAge = 0.1),
    'a spark': (toy) => void toy.sparks.push({ x: 600, y: 596, age: 0.1 }),
    'a bloom': (toy) => void toy.blooms.push({ hole: 20, colour: RED, age: 0.1, closing: false }),
    'a bloom closing': (toy) => void toy.blooms.push({ hole: 20, colour: YELLOW, age: 0.1, closing: true }),
    'a springing peg': (toy) => void toy.live.push({ hole: 20, colour: RED, age: 0.1, held: false, since: 0.1, from: 0.7, lit: true }),
    'a white peg hanging dark': (toy) => void toy.live.push({ hole: 20, colour: 5, age: 0.1, held: false, since: 0.1, from: 0.7, lit: false }),
    'a peg in the air': (toy) => void toy.fallers.push({ colour: GREEN, kind: 'knocked', t: 0.3, ...centreOf(20) }),
    'a beam': (toy) => void toy.beams.push({ col: 4, dir: 1, half: false, hold: 0, turns: 0, from: -1, row: -1, open: false, shut: -1 }),
    'a half beam': (toy) => void toy.beams.push({ col: 4, dir: -1, half: true, hold: 0, turns: 0, from: 6, row: 3, open: false, shut: -1 }),
    'a flash': (toy) => void toy.flashes.push({ hole: 20, colour: RED, age: 0.1, half: false }),
    'a half beam\'s flash': (toy) => void toy.flashes.push({ hole: 20, colour: RED, age: 0.1, half: true }),
    'the bulbs chasing the beam': (toy) => { toy.beams.push({ col: 4, dir: 1, half: false, hold: 0, turns: 0, from: -1, row: -1, open: false, shut: -1 }); toy.chase = true },
    'the moth somewhere else': (toy) => { toy.moth.x += 30 },
    'the moth turned': (toy) => { toy.moth.heading += 1 },
    'the moth in the air': (toy) => { toy.moth.mode = 'fly' },
    'the spider in an act': (toy) => { toy.spider.begin('dream'); toy.spider.t = 1 },
    'the gecko in an act': (toy) => { toy.gecko.begin('wag'); toy.gecko.t = 0.1 },
    'the finger, which the watchers look at': (toy) => { toy.finger = true; toy.look.x = 300; toy.look.y = 700 },
  }

  it('changes the drawing for each of them, and for no two alike', () => {
    const seen = new Map([[rest, 'rest']])
    for (const [name, change] of Object.entries(changes)) {
      const now = drawing(change)
      expect(seen.get(now), name).toBeUndefined()
      seen.set(now, name)
    }
  })

  it('draws a beam only with the chase: the bulbs follow the beam and nothing else', () => {
    const beam = (toy: Toy) => void toy.beams.push({ col: 4, dir: 1, half: false, hold: 0, turns: 0, from: -1, row: -1, open: false, shut: -1 })
    expect(drawing((toy) => { beam(toy); toy.chase = true })).not.toBe(drawing(beam))
  })
})

describe('a thing is touched where it is drawn, in every state', () => {
  const DT = 1 / 60
  const run = (toy: Toy, seconds: number) => { for (let t = 0; t < seconds - 1e-9; t += DT) toy.step(DT) }

  it('the spider at the end of its thread answers there, and not where it hung before', () => {
    const toy = new Toy(freshSave(null), 1)
    toy.press(SPIDER.x, SPIDER.y)
    toy.release()
    run(toy, 0.3)
    const at = toy.places().spider
    expect(at.y - SPIDER.y).toBeGreaterThan(120)
    toy.sounds.length = 0
    toy.press(SPIDER.x, SPIDER.y - 40)
    expect(toy.sounds.map((cue) => cue.name)).toEqual(['pluck'])
    toy.release()
    toy.sounds.length = 0
    toy.press(at.x, at.y)
    expect(toy.sounds.map((cue) => cue.name)).toEqual(['boing'])
  })

  it('the gecko that has slid down the wall answers where it now is', () => {
    const toy = new Toy({ ...freshSave(null), hand: 5 }, 1)
    toy.press(centreOf(10).x, centreOf(10).y)
    toy.release()
    run(toy, 0.6)
    const slide = toy.places().geckoSlide
    expect(slide).toBeGreaterThan(30)
    toy.sounds.length = 0
    toy.press(GECKO.x, GECKO.bottom + slide - 4)
    expect(toy.gecko.act).toBe('chirp')
  })

  it('the moth answers at the flash it chased to, and in the air it is no target: the touch is the hole\'s', () => {
    const board = new Array<number>(HOLES).fill(0)
    board[holeAt(1, 5)] = RED
    const toy = new Toy({ ...freshSave(null), board, moth: null, hand: 2 }, 1)
    toy.press(knobAt(0).x, knobAt(0).y)
    toy.release()
    for (let i = 0; i < 60 * 6 && toy.moth.mode !== 'away'; i++) toy.step(DT)
    expect(toy.moth.mode).toBe('away')
    const perch = perchOf(holeAt(1, 5))
    expect(toy.places().moth).toEqual(perch)
    toy.press(perch.x, perch.y)
    expect(toy.moth.act).toBe('tumble')
    toy.release()
    // Tumbling, it cannot be caught: the same point is now a hole of the board.
    expect(toy.places().moth).toBeNull()
    const before = toy.board.filter((cell) => cell !== 0).length
    toy.press(perch.x + 6, perch.y - 6)
    expect(toy.board.filter((cell) => cell !== 0).length).toBe(before + 1)
  })

  it('the handle answers all over its ball where it hangs, and the lever over the whole of its travel', () => {
    const toy = new Toy(freshSave(null), 1)
    // The handle hangs at rest whenever a touch can land on it: its ball answers from its top to its bottom.
    for (const y of [HANDLE.y - 22, HANDLE.y, HANDLE.y + 38]) {
      toy.sounds.length = 0
      toy.press(HANDLE.x, y)
      expect(toy.sounds.map((cue) => cue.name)).toEqual(['rattle'])
      toy.release()
    }
    toy.press(knobAt(0).x, knobAt(0).y)
    toy.release()
    expect(toy.leverDown).toBe(true)
    run(toy, 0.5)
    // The knob is now at the bottom of its slot, and answers there.
    expect(toy.knob).toBeCloseTo(1, 2)
    toy.press(knobAt(1).x, knobAt(1).y)
    toy.release()
    expect(toy.leverDown).toBe(false)
  })
})

describe('what the first reading asked of the drawing', () => {
  /** The calls the live layer is given for a toy as it stands. */
  function calls(change: (toy: Toy) => void, save = freshSave(null)): string[] {
    const still = recorder(), live = recorder()
    const view = new ToyView(still.canvas, live.canvas, () => recorder().canvas)
    view.setTier(TIERS[0])
    view.resize(1180, 820, 2)
    view.draw(new Toy(save, 1), 0, null)
    const toy = new Toy(save, 1)
    change(toy)
    live.calls.length = 0
    view.draw(toy, 0, null)
    return live.calls
  }
  const added = (now: string[], rest: string[]) => { const had = new Set(rest); return now.filter((call) => !had.has(call)) }
  const rest = calls(() => {})
  const names = (list: string[]) => list.map((call) => call.slice(0, call.indexOf('(') < 0 ? call.indexOf('=') : call.indexOf('('))).join()

  it('draws a half beam as a soft dim band behind the peg: along its row, no taller than the cap, the cap left out of it, and never a stroke through a peg', () => {
    const cap = CAP_ACROSS / 2
    const numbers = (call: string) => call.slice(call.indexOf('(') + 1, -1).split(',').map(Number)
    const yellowRow = (row: number) => {
      const board = new Array<number>(HOLES).fill(0)
      for (let col = 0; col < COLS; col += 2) board[holeAt(col, row)] = YELLOW
      return { ...freshSave(null), board, moth: null }
    }
    for (const row of [0, 3, ROWS - 1]) {
      const save = yellowRow(row)
      // A half beam on every column of a row whose every other hole holds a yellow peg.
      const now = calls((toy) => {
        for (let col = 0; col < COLS; col++) toy.beams.push({ col, dir: -1, half: true, hold: 0, turns: 0, from: col, row, open: false, shut: -1 })
      }, save)
      const drawn = added(now, calls(() => {}, save))
      const bands = drawn.filter((call) => call.startsWith('ellipse(')).map(numbers)
      expect(bands).toHaveLength(COLS)
      const y = ORIGIN.y + row * PITCH
      for (const [x, cy, reach, half, turn] of bands) {
        // It lies along the row: level, centred on the row, and no taller than a peg's cap, so nothing of it shows above or below a peg.
        expect(turn).toBe(0)
        expect(cy).toBe(y)
        expect(half * 2).toBeLessThanOrEqual(CAP_ACROSS)
        expect(cy - half).toBeGreaterThan(BOARD.y)
        expect(cy + half).toBeLessThan(BOARD.y + BOARD.height)
        // It is longer than the cap is wide, and stops short of the cap of a peg in the next cell.
        expect(reach).toBeGreaterThan(cap + 8)
        expect(reach).toBeLessThan(PITCH - cap)
        // Longer than tall: a band along the row, never an upright stroke.
        expect(reach).toBeGreaterThan(half)
        expect(x).toBeGreaterThan(BOARD.x)
      }
      expect(new Set(bands.map(([, , , half]) => half)).size).toBe(COLS)
      // Where a peg stands the cap is cut out of the band, as a whole turn the other way round, in the same path: the band is behind the peg.
      const cuts = drawn.filter((call) => call.startsWith('arc(')).map(numbers)
      expect(cuts).toHaveLength(Math.ceil(COLS / 2))
      for (const [x, cy, r] of cuts) {
        expect(cy).toBe(y)
        expect(r).toBe(cap)
        expect(((x - ORIGIN.x) / PITCH) % 2).toBe(0)
      }
      for (const call of drawn.filter((call) => call.startsWith('arc('))) expect(call.endsWith(`,0.000,${(Math.PI * 2).toFixed(3)},)`)).toBe(true)
      // All of it is one fill, dim, and added to what is there: no stroke is drawn for a half beam.
      const count = (list: string[], name: string) => list.filter((call) => call === name).length
      const before = calls(() => {}, save)
      expect(count(now, 'fill()')).toBe(count(before, 'fill()') + 1)
      expect(count(now, 'stroke()')).toBe(count(before, 'stroke()'))
      const at = now.indexOf(drawn.find((call) => call.startsWith('ellipse('))!)
      const alpha = now.slice(at).find((call) => call.startsWith('globalAlpha='))!
      expect(Number(alpha.slice(12))).toBeLessThanOrEqual(HALF_LIGHT)
      expect(HALF_LIGHT).toBeLessThanOrEqual(0.4)
    }
    // On an empty hole there is no cap to leave out: the band is whole.
    const bare = added(calls((toy) => void toy.beams.push({ col: 4, dir: -1, half: true, hold: 0, turns: 0, from: 6, row: 3, open: false, shut: -1 }), { ...freshSave(null), board: new Array<number>(HOLES).fill(0), moth: null }), calls(() => {}, { ...freshSave(null), board: new Array<number>(HOLES).fill(0), moth: null }))
    expect(bare.filter((call) => call.startsWith('ellipse('))).toHaveLength(1)
    expect(bare.filter((call) => call.startsWith('arc('))).toHaveLength(0)
  })

  it('draws the handle\'s rattle: the ball swung about twenty units to the side of where it hangs, its cord bent after it, and its glint flared', () => {
    const numbers = (call: string) => call.slice(call.indexOf('(') + 1, -1).split(',').map(Number)
    /** Where the ball's outline begins (its top, where the cord holds it) and the radii of its glint. */
    const ball = (age: number, pull = 0) => {
      const drawn = calls((toy) => { toy.handleAge = age; toy.handlePull = pull })
      const top = drawn.find((call) => call.startsWith('moveTo(') && Math.abs(numbers(call)[1] - (HANDLE.y + pull - 24)) < 1e-6)
      const glint = drawn.filter((call) => call.startsWith('ellipse(')).map(numbers).find(([, y]) => Math.abs(y - (HANDLE.y + pull + 8)) < 1e-6)
      return top && glint ? { x: numbers(top)[0], glint: glint[2] } : null
    }
    // At rest the handle is its stamp, and nothing of it is drawn line by line.
    expect(ball(9)).toBeNull()
    // A twentieth of a second into a rattle the ball is at the far end of its first swing.
    const out = ball(0.05)!
    expect(out.x - HANDLE.x).toBeCloseTo(handleSwing(0.05), 2)
    expect(Math.abs(out.x - HANDLE.x)).toBeGreaterThan(17)
    expect(out.glint).toBeGreaterThan(12)
    // And then at the far end of the other side.
    expect(ball(0.152)!.x - HANDLE.x).toBeLessThan(-15)
    // Late in the second it still moves, and its glint is still larger than the one it rests with.
    const late = ball(0.66)!
    expect(Math.abs(late.x - HANDLE.x)).toBeGreaterThan(5)
    expect(late.glint).toBeGreaterThan(8)
    // When the second is out it is the stamp again.
    expect(ball(HANDLE_RATTLE.lasts)).toBeNull()
    expect(handleGlint(0.05)).toBeGreaterThan(0.7)
    // Under a finger that has pulled it most of the way down it swings far less.
    expect(Math.abs(ball(0.05, 60)!.x - HANDLE.x)).toBeLessThan(5)
    // Rattling by itself, after the stretch with no touch, it is drawn the same way: the toy sets the same age.
    const toy = new Toy(freshSave(null), 1)
    toy.press(600, 596)
    toy.release()
    toy.sounds.length = 0
    for (let i = 0; i < 60 * 95 && toy.sounds.every((cue) => cue.name !== 'rattle'); i++) { toy.sounds.length = 0; toy.step(1 / 60) }
    expect(toy.sounds.map((cue) => cue.name)).toContain('rattle')
    expect(toy.handleAge).toBe(0)
    toy.step(0.05)
    expect(Math.abs(handleSwing(toy.handleAge))).toBeGreaterThan(17)
  })

  it('draws no bar while the beam is off the board for its one beat', () => {
    const on = calls((toy) => void toy.beams.push({ col: 4, dir: 1, half: false, hold: 0, turns: 0, from: -1, row: -1, open: false, shut: -1 }))
    const off = calls((toy) => void toy.beams.push({ col: -1, dir: 1, half: false, hold: 0, turns: 0, from: -1, row: -1, open: false, shut: -1 }))
    const stamps = (list: string[]) => list.filter((call) => call.startsWith('drawImage(')).length
    expect(stamps(on)).toBe(stamps(rest) + 1)
    expect(stamps(off)).toBe(stamps(rest))
  })

  it('draws on a board that splits the beam everywhere no two half beams the same at any frame', () => {
    const save = { ...freshSave(null), board: new Array<number>(HOLES).fill(YELLOW), moth: null }
    const toy = new Toy(save, 1)
    toy.press(knobAt(0).x, knobAt(0).y)
    toy.release()
    let most = 0
    for (let i = 0; i < 60 * 12; i++) {
      toy.step(1 / 60)
      const shapes = toy.beams.filter((beam) => beam.half).map((beam) => JSON.stringify(halfShape(beam.from)))
      expect(new Set(shapes).size).toBe(shapes.length)
      most = Math.max(most, shapes.length)
    }
    expect(most).toBeGreaterThan(4)
  })

  it('draws the loudspeaker\'s pulse as a closed ring: a whole turn, shut, and no arc with a gap', () => {
    const pulse = added(calls((toy) => (toy.pulseAge = 0.1)), rest)
    const rings = pulse.filter((call) => call.startsWith('ellipse(') || call.startsWith('arc('))
    expect(rings).toHaveLength(1)
    expect(rings[0].endsWith(`,0.000,${(Math.PI * 2).toFixed(3)})`)).toBe(true)
    // The path is shut after the ring and before it is stroked.
    const now = calls((toy) => (toy.pulseAge = 0.1))
    const at = now.indexOf(rings[0])
    expect(now[at + 1]).toBe('closePath()')
    // Its two radii are near each other: a ring, not a sliver.
    const [, , rx, ry] = rings[0].slice(8).split(',').map(Number)
    expect(rx / ry).toBeGreaterThan(0.85)
  })

  it('lights the key that is down whole and at once: on the frame of the press its peg, its fold lines and every echo are there', () => {
    for (const { mirror, x, y } of BUTTONS) {
      const now = calls((toy) => toy.press(x, y))
      const marks = keyMarks(mirror), sink = 3
      const arc = (mark: { x: number; y: number; r: number }) => `arc(${mark.x.toFixed(3)},${(mark.y + sink).toFixed(3)},${mark.r.toFixed(3)},0.000,${(Math.PI * 2).toFixed(3)})`
      // Its peg is the peg sprite of the colour in hand, the cap with its light, at the key's size: not a flat disc.
      const side = (PITCH * marks.peg.r) / (PEG_RADIUS - 2)
      expect(now, `key ${mirror}`).toContain(`drawImage(,${(marks.peg.x - side / 2).toFixed(3)},${(marks.peg.y + sink - side / 2).toFixed(3)},${side.toFixed(3)},${side.toFixed(3)})`)
      expect(now, `key ${mirror}`).not.toContain(arc(marks.peg))
      for (const echo of marks.echoes) expect(now, `key ${mirror}`).toContain(arc(echo))
      for (const fold of marks.folds) expect(now, `key ${mirror}`).toContain(`lineTo(${fold[2].toFixed(3)},${(fold[3] + sink).toFixed(3)})`)
      // And nothing more arrives later: long after the press the same marks are drawn, the same number of calls.
      const later = calls((toy) => { toy.press(x, y); toy.release(); toy.buttonAge = 5; toy.pulseAge = 5; toy.finger = false; toy.look.x = 590; toy.look.y = 330 })
      const count = (list: string[], name: string) => list.filter((call) => call.startsWith(name)).length
      expect(count(later, 'arc(')).toBe(count(calls((toy) => { toy.mirror = mirror }), 'arc('))
    }
    // The three keys lit are three different drawings: one peg; a peg, a fold and an echo; a peg, two folds and three echoes.
    expect(keyMarks(0).echoes).toHaveLength(0)
    expect(keyMarks(1).echoes).toHaveLength(1)
    expect(keyMarks(2).echoes).toHaveLength(3)
    expect([keyMarks(0).folds.length, keyMarks(1).folds.length, keyMarks(2).folds.length]).toEqual([0, 1, 2])
  })

  it('rattles a tapped well\'s whole pile as one stamp, and stops', () => {
    const stamps = (list: string[]) => list.filter((call) => call.startsWith('drawImage(')).length
    expect(stamps(calls((toy) => (toy.pileAge[3] = 0.1)))).toBe(stamps(rest) + 1)
    expect(names(calls((toy) => (toy.pileAge[3] = PILE_RATTLE)))).toBe(names(rest))
    // Two frames of the rattle put the pile in two places.
    expect(calls((toy) => (toy.pileAge[3] = 0.05)).join()).not.toBe(calls((toy) => (toy.pileAge[3] = 0.1)).join())
  })

  it('draws the gecko\'s neck where the model has it: the head moves with it and the feet do not', () => {
    const drawing = (neck: { x: number; y: number }) => { const { ctx, calls: made } = recorder(); drawGecko(ctx, restGecko(), look, 0.3, neck); return made }
    const straight = drawing({ x: 0, y: 0 }), leaning = drawing({ x: 12, y: -9 })
    expect(leaning.join()).not.toBe(straight.join())
    // Part of the drawing is the same (what stays on the wall) and part has moved (the head and neck).
    const same = leaning.filter((call, i) => call === straight[i]).length
    expect(same).toBeGreaterThan(0)
    expect(same).toBeLessThan(leaning.length)
    expect(leaning).toHaveLength(straight.length)
  })
})

describe('what the second reading asked of the drawing', () => {
  /** Both layers' calls for a toy as it stands, and every canvas the view asked for, with its size. */
  function drawn(change: (toy: Toy) => void, save = freshSave(null)) {
    const still = recorder(), live = recorder()
    const made: [number, number][] = []
    const view = new ToyView(still.canvas, live.canvas, (w, h) => { made.push([w, h]); return recorder().canvas })
    view.setTier(TIERS[0])
    view.resize(1180, 820, 1)
    const toy = new Toy(save, 1)
    change(toy)
    view.draw(toy, 0, null)
    return { still: still.calls, live: live.calls, made, view, toy }
  }

  /** The widths of every line an arc is stroked with, and whether a path that holds it was ever filled. */
  function strokesOf(calls: string[], arc: string): { widths: number[]; filled: boolean } {
    const widths: number[] = []
    let inPath = false, width = 1, filled = false
    for (const call of calls) {
      if (call === 'beginPath()') inPath = false
      else if (call === arc) inPath = true
      else if (call.startsWith('lineWidth=')) width = Number(call.slice(10))
      else if (call === 'stroke()' && inPath) widths.push(width)
      else if (call === 'fill()' && inPath) filled = true
    }
    return { widths, filled }
  }

  it('keeps every echo on a key hollow, at rest and lit, at pixel ratio 1: one thin line, never a glow that could fill it, never a fill', () => {
    const at = (mark: { x: number; y: number; r: number }) => `arc(${mark.x.toFixed(3)},${mark.y.toFixed(3)},${mark.r.toFixed(3)},0.000,${(Math.PI * 2).toFixed(3)})`
    for (const mirror of [1, 2] as const) {
      const { still, live } = drawn((toy) => { toy.mirror = mirror })
      for (const echo of keyMarks(mirror).echoes) {
        const rest = strokesOf(still, at(echo)), lit = strokesOf(live, at(echo))
        // At rest: one stroke, no wide dim pass under it. Lit: one stroke.
        expect(rest.widths).toHaveLength(1)
        expect(lit.widths).toHaveLength(1)
        for (const width of [...rest.widths, ...lit.widths]) expect(width).toBeLessThanOrEqual(ECHO_LINE)
        expect(rest.filled || lit.filled).toBe(false)
        // The hole that is left is most of the echo.
        expect(echo.r * 2 - ECHO_LINE).toBeGreaterThan(echo.r * 1.6)
      }
    }
  })

  it('draws the solid peg of every key at rest as a cap with its glint, in the same place on each, and nothing else on a key is filled', () => {
    const { still } = drawn(() => {})
    for (const { mirror } of BUTTONS) {
      const peg = keyMarks(mirror).peg
      const cap = `arc(${peg.x.toFixed(3)},${peg.y.toFixed(3)},${peg.r.toFixed(3)},0.000,${(Math.PI * 2).toFixed(3)})`
      const i = still.indexOf(cap)
      expect(i, `key ${mirror}`).toBeGreaterThan(0)
      expect(still[i + 1]).toBe('fill()')
      // The glint: a small tilted oval up and left of the cap's middle, filled after it.
      const glint = still.slice(i + 2, i + 8).find((call) => call.startsWith('ellipse('))!
      const [gx, gy] = glint.slice(8).split(',').map(Number)
      expect(gx).toBeLessThan(peg.x)
      expect(gy).toBeLessThan(peg.y)
    }
  })

  it('makes only the gecko\'s drawing again when its neck has come to rest somewhere new', () => {
    const { made, view, toy } = drawn(() => {})
    const before = made.length
    view.draw(toy, 1 / 60, null)
    expect(made.length).toBe(before)
    toy.neck.x += 6
    toy.neck.y -= 4
    // Still moving as far as the view knows: nothing is made. Then at rest: one drawing, the size of the gecko's.
    view.draw(toy, 1 / 60, null)
    expect(made.length).toBe(before)
    view.draw(toy, 1 / 60, null)
    expect(made.length).toBe(before + 1)
    const sizes = made.slice(0, before).map(([w, h]) => `${w} by ${h}`)
    const again = `${made[before][0]} by ${made[before][1]}`
    expect(sizes.filter((size) => size === again)).toHaveLength(1)
    expect(made[before][1]).toBeGreaterThan(made[before][0] * 2)
    view.draw(toy, 1 / 60, null)
    view.draw(toy, 1 / 60, null)
    expect(made.length).toBe(before + 1)
  })

  it('draws the yellow bloom, and its closing, as two rings round the one hole, one inside the other: never two rings side by side', () => {
    const hole = holeAt(5, 3), at = centreOf(hole)
    for (const closing of [false, true]) {
      let apart = 0, seen = 0
      for (let age = 0; age < 0.6; age += 0.01) {
        const { ctx, calls } = recorder()
        drawBlooms(ctx, [{ hole, colour: YELLOW as Colour, age, closing }])
        const rings = calls.filter((call) => call.startsWith('arc(')).map((call) => call.slice(4, -1).split(',').map(Number))
        if (rings.length === 0) continue
        seen += 1
        // Dashes aside, the rings are two, and both are centred on the hole.
        const whole = rings.filter(([, , , from, to]) => from === 0 && Math.abs(to - Math.PI * 2) < 0.01)
        expect(whole).toHaveLength(2)
        for (const [x, y, r] of whole) {
          expect(x).toBe(at.x)
          expect(y).toBe(at.y)
          expect(r).toBeGreaterThan(0)
        }
        apart = Math.max(apart, Math.abs(whole[0][2] - whole[1][2]))
      }
      expect(seen).toBeGreaterThan(10)
      // They start plainly apart, one well inside the other.
      expect(apart).toBeGreaterThan(30)
    }
    // The other colours' rings are centred on their hole too.
    for (const colour of [RED, BLUE, GREEN, WHITE] as Colour[]) {
      const { ctx, calls } = recorder()
      drawBlooms(ctx, [{ hole, colour, age: 0.3, closing: false }])
      for (const call of calls.filter((c) => c.startsWith('arc('))) expect(call.startsWith(`arc(${at.x.toFixed(3)},${at.y.toFixed(3)},`)).toBe(true)
    }
  })

  it('keeps every leg of the spider in its own place in every act, at every moment: no foot over the board\'s frame or off the stage', () => {
    /** The furthest left and right anything of the spider is drawn, and the lowest. */
    const extent = (pose: SpiderPose, jolt: number) => {
      const { ctx, calls } = recorder()
      drawSpider(ctx, pose, look, 0.3, 'all', jolt)
      let left = Infinity, right = -Infinity, low = -Infinity
      let at = [0, 0]
      const note = (x: number, y: number, rx = 0, ry = rx) => { left = Math.min(left, x - rx); right = Math.max(right, x + rx); low = Math.max(low, y + ry) }
      for (const call of calls) {
        const open = call.indexOf('(')
        if (open < 0) continue
        const name = call.slice(0, open), n = call.slice(open + 1, -1).split(',').map(Number)
        if (name === 'moveTo' || name === 'lineTo') { note(n[0], n[1]); at = [n[0], n[1]] }
        else if (name === 'quadraticCurveTo') {
          // The curve itself, point by point: its control point is not drawn.
          for (let k = 1; k <= 12; k++) { const u = k / 12; note((1 - u) ** 2 * at[0] + 2 * u * (1 - u) * n[0] + u * u * n[2], (1 - u) ** 2 * at[1] + 2 * u * (1 - u) * n[1] + u * u * n[3]) }
          at = [n[2], n[3]]
        }
        else if (name === 'arc') note(n[0], n[1], n[2])
        else if (name === 'ellipse') note(n[0], n[1], n[2], n[3])
      }
      return { left, right, low }
    }
    const fresh = (): SpiderPose => restSpider()
    const atRest = extent(fresh(), 0)
    // At rest its legs are at their full reach, a little inside its place.
    expect(atRest.right).toBeGreaterThan(SPIDER.x + 85)
    expect(atRest.right + 1.5).toBeLessThanOrEqual(SPIDER_PLACE.right)
    let widest = 0
    for (const act of Object.keys(SPIDER_ACTS) as SpiderAct[]) {
      let from = Infinity, to = -Infinity
      for (let t = 0; t <= SPIDER_ACTS[act].length; t += 1 / 120) {
        const pose = spiderPose(act, t, fresh())
        for (const jolt of [0, 6]) {
          const { left, right, low } = extent(pose, jolt)
          // A leg's line is 3 units wide: its edge stays inside too.
          expect(right + 1.5, `${act} at ${t.toFixed(2)}`).toBeLessThanOrEqual(SPIDER_PLACE.right)
          expect(left - 1.5, `${act} at ${t.toFixed(2)}`).toBeGreaterThanOrEqual(SPIDER_PLACE.left - 2)
          expect(low, `${act} at ${t.toFixed(2)}`).toBeLessThan(612)
        }
        const middle = spiderAt(pose.drop, pose.swing).x
        from = Math.min(from, middle)
        to = Math.max(to, middle)
      }
      widest = Math.max(widest, to - from)
    }
    // Its place ends outside the board's frame, and it still swings: the dreaming spider's body travels far, legs drawn in on the near side.
    expect(SPIDER_PLACE.right).toBeLessThan(BOARD.x - 8)
    expect(widest).toBeGreaterThan(50)
  })
})
