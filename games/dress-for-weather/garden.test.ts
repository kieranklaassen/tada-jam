import { describe, expect, it } from 'vitest'
import { GARMENT_ART } from './garmentArt'
import { FIGURES, GARMENTS, PARTS, type Figure, type Garment, type Part } from './kinds'
import { ARMS, BODIES, EXTENT, GARDEN, SCARF_TIP, SHEET, armTo, boxesMeet, coresAt, gardenPose, homeControlOn, paperBox, scarfTip, type Box, type Point } from './layout'
import { CELLS, SOCKS, everyCell, tasteOf, type Act, type Outfit, type Step } from './outing'
import { fit } from './stage'
import { BURST, DOG_REACH, HAND_ACTS, LOB, RULER, STAND_HALF, STROKES, burstAt, dogIn, dogStance, figureIn, garmentShift, handsOf, hoodOf, lobAt, placed, reachFor, stanceOf, strokeOf, toeCurl, type Reach, type Stance } from './weathering'

// The garden, as numbers: that nothing of the one who went out comes under the
// jam's home control whatever it wears and however the weather moves it, and
// that what a cell says happens is somewhere to be seen: the scarf at the
// gate's post, the snowball on the dog, the splash on the dog, the hood, the
// toes, and the hands.

const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [1366, 1024], [1280, 720], [844, 390]]
/** The home control on each surface, with the room the hall keeps round it. */
const CONTROLS: Box[] = SURFACES.map(([width, height]) => {
  const box = homeControlOn(width, fit(width, height))
  return { x0: box.x0 - 8, y0: box.y0 - 8, x1: box.x1 + 8, y1: box.y1 + 8 }
})
/** One box that holds them all, for a first look. */
const ANY: Box = { x0: Math.min(...CONTROLS.map((c) => c.x0)), y0: Math.min(...CONTROLS.map((c) => c.y0)), x1: Math.max(...CONTROLS.map((c) => c.x1)), y1: Math.max(...CONTROLS.map((c) => c.y1)) }
const F = GARDEN.figure
const moments = Array.from({ length: 51 }, (_, i) => i / 50)
const inBox = (box: Box, p: Point): boolean => p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1

/** Every act a cell or a taste can ask of a figure. */
function everyAct(): Act[] {
  const acts = new Set<Act>()
  for (const { cell } of everyCell()) if (cell.act) acts.add(cell.act)
  for (const who of FIGURES) for (const weather of ['rain', 'snow', 'wind', 'sun'] as const) {
    for (const worn of [[], [{ garment: 'hat', part: 'head' }], [{ garment: 'boots', part: 'feet' }], [{ garment: 'scarf', part: 'neck' }]] as { garment: Garment; part: Part }[][]) {
      const outfit: Outfit = { who, worn, zip: 0, buttons: [false, false, false], tug: 0, open: false, weather, dog: null }
      acts.add(tasteOf(outfit).act)
    }
  }
  return [...acts]
}

/** Every stance a figure can be in, each with a name: every act at every moment, and the walk to the gate for a scarf on every part. */
function stances(who: Figure): { name: string; stance: Stance }[] {
  const all: { name: string; stance: Stance }[] = []
  for (const act of everyAct()) {
    if (act === 'togate') continue
    for (const u of moments) all.push({ name: `${act} at ${u}`, stance: stanceOf(act, who, u) })
  }
  for (const part of PARTS) {
    const step: Step = { kind: 'cell', garment: 'scarf', part, cell: CELLS.scarf.snow as Step extends { cell: infer C } ? C : never }
    for (const u of moments) all.push({ name: `to the gate with the scarf on its ${part} at ${u}`, stance: figureIn(step, who, u) })
  }
  return all
}

/** The paper of a figure and of everything it can wear, each as a box from the middle of its stand. */
function papers(who: Figure): { name: string; box: Box }[] {
  const all = coresAt(who, { x: 0, y: 0 }).map((box, i) => ({ name: i === 0 ? 'its head' : 'its trunk', box }))
  for (const garment of GARMENTS) for (const part of PARTS) for (const open of garment === 'umbrella' ? [false, true] : [false]) {
    const box = paperBox(garment, gardenPose(garment, who, part, open), open)
    all.push({ name: `the ${open ? 'open ' : ''}${garment} on its ${part}`, box: { x0: box.x0 - F.x, y0: box.y0 - F.y, x1: box.x1 - F.x, y1: box.y1 - F.y } })
  }
  return all
}

/** Whether any of a box's paper, in a stance, is under a home control: its corners first, and then points all over it. */
function under(box: Box, who: Figure, stance: Stance): boolean {
  const at = (x: number, y: number) => placed({ x, y }, F, stance, who)
  const corners = [at(box.x0, box.y0), at(box.x1, box.y0), at(box.x1, box.y1), at(box.x0, box.y1)]
  const hull: Box = { x0: Math.min(...corners.map((p) => p.x)), y0: Math.min(...corners.map((p) => p.y)), x1: Math.max(...corners.map((p) => p.x)), y1: Math.max(...corners.map((p) => p.y)) }
  if (!boxesMeet(hull, ANY)) return false
  const nx = Math.ceil((box.x1 - box.x0) / 12), ny = Math.ceil((box.y1 - box.y0) / 12)
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
    const p = at(box.x0 + ((box.x1 - box.x0) * i) / nx, box.y0 + ((box.y1 - box.y0) * j) / ny)
    if (CONTROLS.some((control) => inBox(control, p))) return true
  }
  return false
}

describe('the home control in the garden', () => {
  it('lies on the stage where each surface puts it, and the figure stands clear to the right of them all', () => {
    expect(CONTROLS.length).toBe(5)
    expect(F.x - BODIES.child.handSep - 118).toBeGreaterThan(ANY.x1)
    // The phone's control reaches lowest and widest: lower than the top of the grandfather's head.
    expect(ANY.y1).toBeGreaterThan(F.y - BODIES.grandfather.height)
  })

  it.each(FIGURES)('has nothing of the %s under it, nor of anything it wears on any part, in any act at any moment', (who) => {
    const found: string[] = []
    const all = stances(who)
    expect(all.length).toBeGreaterThan(1500)
    for (const paper of papers(who)) {
      for (const { name, stance } of all) {
        if (under(paper.box, who, stance)) {
          found.push(`${paper.name}, ${name}`)
          break
        }
      }
    }
    expect(found).toEqual([])
  })

  it('has the hat on the grandfather clear of it while he stands, bends, is lifted and chases', () => {
    const hat = papers('grandfather').find((paper) => paper.name === 'the hat on its head')!
    // The hat is where the layout puts it on his head: its top is higher than the phone's control reaches down.
    expect(hat.box.y0 + F.y).toBeLessThan(ANY.y1)
    for (const act of ['chase', 'lifted', 'heron', 'towed', 'leanaway', 'straighten'] as const) for (const u of moments) expect(under(hat.box, 'grandfather', stanceOf(act, 'grandfather', u)), `${act} at ${u}`).toBe(false)
    // And it would be under it if he stood in the middle of the sheet: the test can fail.
    const middle = { x0: hat.box.x0 - (F.x - 590), y0: hat.box.y0, x1: hat.box.x1 - (F.x - 590), y1: hat.box.y1 }
    expect(under(middle, 'grandfather', stanceOf(null, 'grandfather', 0))).toBe(true)
  })

  it.each(FIGURES)('has the hat the wind takes off the %s low on the lawn before it crosses the middle of the sheet', (who) => {
    const far = Math.hypot(Math.max(-EXTENT.hat.x0, EXTENT.hat.x1), Math.max(-EXTENT.hat.y0, EXTENT.hat.y1))
    for (const part of PARTS) {
      const from = gardenPose('hat', who, part, false), to = gardenPose('hat', 'dog', 'back', false)
      for (let i = 0; i <= 200; i++) {
        const u = i / 200, shift = garmentShift('blowoff', u, { x: to.x - from.x, y: to.y - from.y }), stance = stanceOf('chase', who, u)
        // The hat turns as it flies: a square round its pin that holds it however it is turned.
        const x = from.x + stance.dx + shift.dx, y = from.y - stance.up + shift.dy
        expect(boxesMeet({ x0: x - far, y0: y - far, x1: x + far, y1: y + far }, ANY), `from its ${part} at ${u}`).toBe(false)
      }
      const end = garmentShift('blowoff', 1, { x: to.x - from.x, y: to.y - from.y })
      expect(from.x + end.dx).toBeCloseTo(to.x)
      expect(from.y + end.dy).toBeCloseTo(to.y)
      expect(end.gone).toBe(true)
    }
  })

  it.each(FIGURES)('keeps the %s on the sheet and off the dog when it lies down in the shade', (who) => {
    const stance = stanceOf('liedown', who, 0.5)
    expect(stance.lie).toBe(1)
    const dog = coresAt('dog', GARDEN.dog)
    for (const box of coresAt(who, { x: 0, y: 0 })) {
      const corners = [[box.x0, box.y0], [box.x1, box.y0], [box.x1, box.y1], [box.x0, box.y1]].map(([x, y]) => placed({ x, y }, F, stance, who))
      const hull: Box = { x0: Math.min(...corners.map((p) => p.x)), y0: Math.min(...corners.map((p) => p.y)), x1: Math.max(...corners.map((p) => p.x)), y1: Math.max(...corners.map((p) => p.y)) }
      expect(hull.x0).toBeGreaterThan(SHEET.x0)
      expect(hull.x1).toBeLessThan(SHEET.x1)
      // Its head stops short of the gate's post.
      expect(hull.x1).toBeLessThan(GARDEN.post.x)
      // It lies on the lawn, not half under it.
      expect(hull.y1).toBeLessThanOrEqual(F.y + 1)
      for (const other of dog) expect(boxesMeet(hull, other)).toBe(false)
    }
    expect(STAND_HALF[who]).toBeGreaterThan(BODIES[who].footSep)
  })
})

describe('the scarf that freezes', () => {
  it('has its tail where the scarf is drawn: SCARF_TIP is the foot of the tail, turned level', () => {
    const tail = GARMENT_ART.scarf.rings[1]
    let low = -Infinity, sum = 0, n = 0
    for (let i = 1; i < tail.length; i += 2) low = Math.max(low, tail[i])
    for (let i = 0; i < tail.length; i += 2) if (tail[i + 1] > low - 10) { sum += tail[i]; n += 1 }
    // Turned a quarter turn, a point (x, y) of the scarf lies at (y, -x) from the pin.
    expect(SCARF_TIP.x).toBeCloseTo(low, -1)
    expect(SCARF_TIP.y).toBeCloseTo(-sum / n, -1)
  })

  it.each(FIGURES)('knocks the gate\'s post with its tip in the frame the ting is heard, the %s standing still there, wherever the scarf is worn', (who) => {
    const cell = CELLS.scarf.snow
    if ('fast' in cell) throw new Error('one cell')
    expect(cell.move).toBe('ruler')
    expect(cell.act).toBe('togate')
    expect(cell.notes.map(([at]) => at)).toEqual([RULER.knocks])
    for (const part of PARTS) {
      const step: Step = { kind: 'cell', garment: 'scarf', part, cell }, pose = gardenPose('scarf', who, part, false), tip = scarfTip(who, part)
      for (let u = RULER.knocks; u <= RULER.stays + 1e-9; u += 0.01) {
        const stance = figureIn(step, who, u), shift = garmentShift('ruler', u, { x: 0, y: 0 }, pose.rot)
        // The tail is level, whichever way the scarf lies on that part.
        expect(Math.cos(pose.rot + shift.rot)).toBeCloseTo(0)
        expect(Math.sin(pose.rot + shift.rot)).toBeCloseTo(-1)
        for (const still of [stance.up, stance.tilt, stance.bend, stance.squash, stance.lie]) expect(still).toBeCloseTo(0)
        // And its tip is at the near face of the post, at a height the post has.
        expect(tip.x + stance.dx, `on its ${part} at ${u}`).toBeCloseTo(GARDEN.post.x)
        expect(tip.y).toBeGreaterThanOrEqual(GARDEN.post.top)
        expect(tip.y).toBeLessThan(GARDEN.gate.y + 46)
      }
      // It walks there and back: it starts and ends where it stood, and is not there before the knock.
      expect(figureIn(step, who, 0).dx).toBeCloseTo(0)
      expect(figureIn(step, who, 1).dx).toBeCloseTo(0)
      if (Math.abs(GARDEN.post.x - tip.x) > 1) expect(Math.abs(figureIn(step, who, 0.3).dx)).toBeLessThan(Math.abs(GARDEN.post.x - tip.x))
      expect(garmentShift('ruler', 0, { x: 0, y: 0 }, pose.rot).rot).toBeCloseTo(0)
      expect(garmentShift('ruler', 1, { x: 0, y: 0 }, pose.rot).rot).toBeCloseTo(0)
    }
    // On the neck, where it belongs, the walk is one that is seen.
    expect(GARDEN.post.x - scarfTip(who, 'neck').x).toBeGreaterThan(30)
  })
})

describe('the snowball and the splash', () => {
  it('lobs the snowball from the mittens to the dog, where it lands when the flump is heard and the dog is flattened', () => {
    const cell = CELLS.mittens.snow
    if ('fast' in cell) throw new Error('one cell')
    expect(cell.bits).toMatchObject({ kind: 'mound', shape: 'ball' })
    expect(cell.dog).toBe('flump')
    const times = cell.notes.map(([at]) => at)
    // Three pats before it is lobbed, and the flump as it lands.
    expect(times.slice(0, 3).every((at) => at < LOB.from)).toBe(true)
    expect(times[3]).toBe(LOB.lands)
    const from = { x: 900, y: 500 }, to = { x: 300, y: 620 }
    expect(lobAt(0, from, to)).toMatchObject(from)
    expect(lobAt(LOB.from - 0.01, from, to)).toMatchObject({ ...from, burst: 0 })
    // It grows as it is patted.
    expect(lobAt(0.4, from, to).r).toBeGreaterThan(lobAt(0.05, from, to).r)
    let last = from.x, highest = from.y
    for (let u = LOB.from; u < LOB.lands; u += 0.01) {
      const ball = lobAt(u, from, to)
      expect(ball.x).toBeLessThanOrEqual(last)
      expect(ball.burst).toBe(0)
      last = ball.x
      highest = Math.min(highest, ball.y)
    }
    expect(highest).toBeLessThan(from.y - 100)
    expect(lobAt(LOB.lands, from, to)).toMatchObject({ ...to, burst: 0 })
    expect(lobAt(1, from, to).burst).toBe(1)
    // The dog does nothing until it lands, and is flattened then.
    for (let u = 0; u <= LOB.lands; u += 0.02) expect(dogStance('flump', u).squash).toBe(0)
    expect(dogStance('flump', (LOB.lands + 1) / 2).squash).toBeGreaterThan(0.15)
    // The mittens open as it leaves them.
    expect(garmentShift('pat', 0.3).apart).toBeLessThan(0.5)
    expect(garmentShift('pat', LOB.from + 0.12).apart).toBe(1)
  })

  it('sends the splash of a jump as far as the dog, which ducks when it gets there', () => {
    const cell = CELLS.boots.rain
    if (!('fast' in cell)) throw new Error('two cells')
    expect(cell.fast.bits).toMatchObject({ kind: 'drops', way: 'burst' })
    expect(cell.fast.dog).toBe('soaked')
    // The splosh is heard as the feet come down, and the drops leave the puddle then.
    expect(cell.fast.notes.map(([at]) => at)).toEqual([BURST.from])
    expect(stanceOf('jump', 'child', BURST.from).up).toBeLessThan(5)
    expect(stanceOf('jump', 'child', BURST.from - 0.2).up).toBeGreaterThan(60)
    const n = 12, reach = 550
    for (let i = 0; i < n; i++) expect(burstAt(i, n, BURST.from, reach)).toBeNull()
    for (let i = 0; i < n; i++) expect(burstAt(i, n, BURST.from + 0.02, reach)).not.toBeNull()
    // The furthest drop is at the dog when the splash lands, back on the ground.
    const far = burstAt(0, n, BURST.lands, reach)!
    expect(far.x).toBeCloseTo(-reach)
    expect(far.y).toBeCloseTo(0)
    // They go both ways, up and over.
    expect(burstAt(n - 1, n, BURST.lands, reach)!.x).toBeGreaterThan(100)
    expect(burstAt(3, n, (BURST.from + BURST.lands) / 2, reach)!.y).toBeLessThan(-60)
    for (let u = 0; u <= BURST.lands; u += 0.02) expect(dogStance('soaked', u)).toMatchObject({ squash: 0, tilt: 0 })
    expect(dogStance('soaked', 0.82).squash).toBeGreaterThan(0.1)
    // The dog that squeezes in under the umbrella goes as far as the figure and comes back.
    expect(dogIn({ kind: 'cell', garment: 'umbrella', part: 'hands', cell: (CELLS.umbrella.rain as { fast: typeof cell.fast }).fast }, 0.5).dx).toBeCloseTo(DOG_REACH)
    expect(GARDEN.dog.x + DOG_REACH).toBeLessThan(F.x - 100)
  })
})

describe('the hood and the toes', () => {
  it('puts the raincoat\'s hood up for the cell in which only the hood rattles, and down again', () => {
    const cell = CELLS.raincoat.wind
    if (!('fast' in cell)) throw new Error('two cells')
    expect(cell.fast.move).toBe('hood')
    expect(hoodOf(0)).toEqual({ up: 0, shake: 0 })
    expect(hoodOf(1).up).toBe(0)
    expect(hoodOf(0.5).up).toBe(1)
    // It is up for every one of its rattles, and shakes both ways.
    for (const [at] of cell.fast.notes) expect(hoodOf(at).up, `at ${at}`).toBe(1)
    const shakes = moments.map((u) => hoodOf(u).shake)
    expect(Math.max(...shakes)).toBeGreaterThan(0.05)
    expect(Math.min(...shakes)).toBeLessThan(-0.05)
  })

  it('curls the toes of the socks in the warm grass while the creak is heard, and uncurls them', () => {
    expect(SOCKS.sun.bits).toEqual({ kind: 'pool', way: 'grass' })
    expect(SOCKS.sun.act).toBe('curl')
    expect(toeCurl(0)).toBe(0)
    expect(toeCurl(1)).toBe(0)
    expect(toeCurl(0.6)).toBe(1)
    const [at] = SOCKS.sun.notes[0]
    expect(toeCurl(at)).toBeGreaterThan(0.2)
    expect(toeCurl(at)).toBeLessThan(1)
  })
})

describe('the hands', () => {
  const mid = (who: Figure, act: Act, u: number, reach: Reach | null = null) => handsOf(act, who, u, reach)
  /** The hat's paper on a part of a figure, from the middle of its stand. */
  const hatOn = (who: Figure, part: Part): Box => {
    const box = paperBox('hat', gardenPose('hat', who, part, false), false)
    return { x0: box.x0 - F.x, y0: box.y0 - F.y, x1: box.x1 - F.x, y1: box.y1 - F.y }
  }
  const onHead = (who: Figure): Reach => reachFor(who, hatOn(who, 'head'))

  it('are used by a cell or a taste for every act that has them, and no other act lifts an arm', () => {
    const used = new Set(everyAct())
    for (const act of HAND_ACTS) expect(used.has(act), act).toBe(true)
    for (const act of used) if (!HAND_ACTS.includes(act)) for (const u of moments) expect(handsOf(act, 'child', u)).toEqual({ left: null, right: null })
    expect(handsOf(null, 'child', 0.5)).toEqual({ left: null, right: null })
  })

  it.each(FIGURES)('hang at both ends of every act of the hands, and are lifted in the middle (%s)', (who) => {
    for (const act of HAND_ACTS) {
      expect(mid(who, act, 0)).toEqual({ left: null, right: null })
      expect(mid(who, act, 1)).toEqual({ left: null, right: null })
      const hands = mid(who, act, 0.5), rest = ARMS[who].hand
      expect(hands.left).not.toBeNull()
      expect(Math.hypot(hands.left!.x + rest.x, hands.left!.y - rest.y)).toBeGreaterThan(20)
      // One hand for fanning, scratching and pulling at a collar; both for patting and for the ears.
      expect(hands.right !== null).toBe(act === 'pats' || act === 'cower')
      // Just lifted, a hand is still near where it hung: nothing jumps.
      const first = mid(who, act, 0.01).left!
      expect(Math.hypot(first.x + rest.x, first.y - rest.y)).toBeLessThan(12)
    }
  })

  it('fan the face to and fro beside it', () => {
    for (const who of FIGURES) {
      const xs = moments.filter((u) => u > 0.2 && u < 0.8).map((u) => mid(who, 'fan', u).left!)
      const body = BODIES[who]
      expect(Math.max(...xs.map((p) => p.x)) - Math.min(...xs.map((p) => p.x))).toBeGreaterThan(20)
      for (const p of xs) {
        expect(p.x).toBeLessThan(-body.faceR)
        expect(Math.abs(p.y - body.face.y)).toBeLessThan(body.faceR)
      }
    }
  })

  it('scratch, pull and pat once for each sound of the act', () => {
    const skritches = CELLS.hat.sun
    if ('fast' in skritches) throw new Error('one cell')
    expect(skritches.act).toBe('scratch')
    expect(skritches.notes.map(([at]) => at)).toEqual(STROKES.scratch)
    const hot = tasteOf({ who: 'child', worn: [{ garment: 'scarf', part: 'neck' }], zip: 0, buttons: [false, false, false], tug: 0, open: false, weather: 'sun', dog: null })
    expect(hot.act).toBe('tug')
    expect(hot.notes.map(([at]) => at)).toEqual(STROKES.tug)
    const crows = tasteOf({ who: 'baby', worn: [{ garment: 'boots', part: 'head' }], zip: 0, buttons: [false, false, false], tug: 0, open: false, weather: 'sun', dog: null })
    expect(crows.act).toBe('pats')
    // Two crows, and then a pat for each pat that is heard.
    expect(crows.notes.map(([at]) => at).slice(2)).toEqual(STROKES.pats)
    for (const act of ['scratch', 'tug', 'pats'] as const) {
      for (const at of STROKES[act]!) expect(strokeOf(act, at)).toBeCloseTo(1)
      expect(strokeOf(act, (STROKES[act]![0] + STROKES[act]![1]) / 2)).toBeLessThan(0.5)
    }
    // A stroke is seen: the hand at a stroke is somewhere else than between two strokes, for every figure.
    for (const who of FIGURES) {
      const reach = onHead(who)
      for (const act of ['scratch', 'pats'] as const) {
        const at = STROKES[act]![0], between = (STROKES[act]![0] + STROKES[act]![1]) / 2
        const on = armTo(who, { x: -mid(who, act, at, reach).left!.x, y: mid(who, act, at, reach).left!.y }).hand, off = armTo(who, { x: -mid(who, act, between, reach).left!.x, y: mid(who, act, between, reach).left!.y }).hand
        expect(Math.hypot(on.x - off.x, on.y - off.y), `${who} ${act}`).toBeGreaterThan(6)
      }
    }
  })

  it('go to the nearest of the thing that is scratched or patted, and get there where an arm can', () => {
    // Under the brim of a hat on the head: the child's hand is on the hat's paper, and its arm reaches.
    for (const who of ['child', 'grandfather'] as const) {
      const box = hatOn(who, 'head'), want = mid(who, 'scratch', STROKES.scratch![1], reachFor(who, box)).left!
      const got = armTo(who, { x: -want.x, y: want.y }).hand
      // The hand is there, or as near as a lifted arm is seen: under the brim, close to its own shoulder.
      expect(Math.hypot(got.x + want.x, got.y - want.y), who).toBeLessThan(6)
      expect(want.x).toBeGreaterThanOrEqual(box.x0)
      expect(want.x).toBeLessThanOrEqual(box.x1)
      expect(want.y).toBeGreaterThanOrEqual(box.y0)
      expect(want.y).toBeLessThanOrEqual(box.y1)
    }
    // A hat on the feet is scratched at its top, on the left side.
    const low = reachFor('child', hatOn('child', 'feet'))
    expect(low.left.y).toBeCloseTo(hatOn('child', 'feet').y0 + 12)
    expect(low.left.x).toBeLessThan(0)
    expect(low.right.x).toBeGreaterThan(0)
    // The baby's arms are short and unfold: both hands get to the brim of what is on its head at each pat.
    const hat = hatOn('baby', 'head'), pats = mid('baby', 'pats', STROKES.pats![0], reachFor('baby', hat))
    for (const [hand, side] of [[pats.left!, -1], [pats.right!, 1]] as const) {
      const at = armTo('baby', { x: side * hand.x, y: hand.y }).hand
      expect(Math.hypot(at.x - side * hand.x, at.y - hand.y)).toBeLessThan(1)
      expect(at.y).toBeLessThan(hat.y1)
      expect(at.y).toBeGreaterThan(hat.y0)
    }
    // Its hands reach its ears.
    const ears = mid('baby', 'cower', 0.5)
    const ear = armTo('baby', { x: ears.right!.x, y: ears.right!.y }).hand
    expect(ear.x).toBeCloseTo(BODIES.baby.faceR + 2)
    expect(ear.y).toBeCloseTo(BODIES.baby.face.y + 8)
    expect(ears.left!.x).toBeCloseTo(-ears.right!.x)
  })
})
