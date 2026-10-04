import { beforeAll, describe, expect, it } from 'vitest'
import { CHARACTERS, CUSTOMERS, type Customer } from './customers'
import { WORN, drawEffect, flameShape, sootSpot, wriggleRun, type Anchors } from './effects'
import { MANNERS, through } from './manner'
import { KINDS, type Kind } from './kinds'
import { COUNTER_Y, CUSTOMER, PIZZA } from './layout'
import { useCanvases, type Pen } from './marker'
import { bellyRing, customerSprites, drawCustomer, eyes, knot, onLimpHead, restPose, stalk, type CustomerSprites } from './monsterArt'
import { Recording, recordingCanvases } from './recording'
import { fewHand } from './scenes'

// What is drawn for a reaction, counted on a recording context: each
// customer's answer to the kind it cannot stand shows in its own part, and
// each kind that is missing is mimed in its own way.

const bodies = new Map<Customer, CustomerSprites>()

beforeAll(() => {
  useCanvases(recordingCanvases().make)
  for (const who of CUSTOMERS) bodies.set(who, customerSprites(who, 1))
})

function drawn(who: Customer, upset: number, part = 0): { strokes: number; fills: number; clips: number; stamps: number } {
  const g = new Recording(1180, 820)
  drawCustomer(g as unknown as Pen, who, bodies.get(who)!, CUSTOMER.x, CUSTOMER.y, 1, { ...restPose(), upset, part })
  return { strokes: g.strokes, fills: g.fills, clips: g.clips, stamps: g.stamps.length }
}

/** Whether a line through these points crosses itself. */
function crossesItself(points: readonly number[]): boolean {
  const n = points.length / 2
  const side = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax))
  for (let i = 0; i + 1 < n; i++) {
    for (let j = i + 2; j + 1 < n; j++) {
      const [ax, ay, bx, by] = [points[i * 2], points[i * 2 + 1], points[i * 2 + 2], points[i * 2 + 3]]
      const [cx, cy, dx, dy] = [points[j * 2], points[j * 2 + 1], points[j * 2 + 2], points[j * 2 + 3]]
      if (side(ax, ay, bx, by, cx, cy) * side(ax, ay, bx, by, dx, dy) < 0 && side(cx, cy, dx, dy, ax, ay) * side(cx, cy, dx, dy, bx, by) < 0) return true
    }
  }
  return false
}

describe('the kind a customer cannot stand, drawn', () => {
  it('ties Bim\'s eye stalk in a knot: one filled lump on a stalk that has grown, and gone again after', () => {
    expect(knot(0, 0)).toBeNull()
    const tied = knot(0.3, 1)!
    const xs = tied.lump.filter((_, i) => i % 2 === 0), ys = tied.lump.filter((_, i) => i % 2 === 1)
    // A lump, not a loop: it is filled, and the stalk is one line that never crosses itself, so nothing reads as a ring with a bar through it.
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(30)
    for (const [part, upset] of [[0, 0], [0.4, 1], [-0.6, 0.6], [1.5, 1]]) expect(crossesItself(stalk(part, upset))).toBe(false)
    const top = (points: number[]) => points[points.length - 1]
    expect(top(stalk(0, 1))).toBeLessThan(top(stalk(0, 0)) - 40)
    // The knot sits clear below the eye, which has gone up with the stalk, and above the head.
    const eye = eyes('bim')[0]
    expect(Math.min(...ys)).toBeGreaterThan(eye.y - 56 + eye.r - 12)
    expect(Math.max(...ys)).toBeLessThan(-CHARACTERS.bim.height + 12)
    // Drawn: one fill more than a stalk with no knot.
    const calm = drawn('bim', 0), upset = drawn('bim', 1)
    expect(upset.fills + upset.strokes).toBeGreaterThan(calm.fills + calm.strokes)
  })

  it('lights Grum\'s belly and blows steam from both ears, and wobbles the belly at any time', () => {
    const calm = drawn('grum', 0), lit = drawn('grum', 1)
    // The glow, its core, five specks of light and four puffs of steam, two a side.
    expect(lit.fills - calm.fills).toBeGreaterThanOrEqual(2 + 4)
    expect(lit.strokes + lit.fills - calm.strokes - calm.fills).toBeGreaterThanOrEqual(2 + 5 + 4 * 2)
    // The belly is drawn each frame from his funniest part's swing, so it swells and swings after the body has stopped.
    const width = (ring: number[]) => Math.max(...ring.filter((_, i) => i % 2 === 0)) - Math.min(...ring.filter((_, i) => i % 2 === 0))
    expect(width(bellyRing(1.5))).toBeGreaterThan(width(bellyRing(0)) * 1.08)
    expect(width(bellyRing(-1))).toBeLessThan(width(bellyRing(0)))
    expect(bellyRing(1)[0]).not.toBe(bellyRing(-1)[0])
  })

  it('lets Fizz\'s neck go limp: the body is drawn in two, the head hung over from the neck', () => {
    expect(drawn('fizz', 0).clips).toBe(0)
    expect(drawn('fizz', 0).stamps).toBe(1)
    const limp = drawn('fizz', 1)
    expect(limp.clips).toBe(2)
    expect(limp.stamps).toBe(2)
  })

  it('draws a shut eye as a round ball with its lid down, and not as an open eye flattened', () => {
    for (const who of CUSTOMERS) {
      const shut = new Recording(1180, 820), open = new Recording(1180, 820)
      drawCustomer(shut as unknown as Pen, who, bodies.get(who)!, CUSTOMER.x, CUSTOMER.y, 1, { ...restPose(), blink: 1 })
      drawCustomer(open as unknown as Pen, who, bodies.get(who)!, CUSTOMER.x, CUSTOMER.y, 1, { ...restPose(), blink: 0 })
      // An open eye is a white, a pupil and a dot of light; a shut one is a ball in the customer's colour and the crease of its lid.
      expect(`${shut.strokes} ${shut.fills}`, who).not.toBe(`${open.strokes} ${open.fills}`)
      // The same shut eye whether it is nearly shut or quite shut: it does not go on flattening to a slit.
      const nearly = new Recording(1180, 820)
      drawCustomer(nearly as unknown as Pen, who, bodies.get(who)!, CUSTOMER.x, CUSTOMER.y, 1, { ...restPose(), blink: 0.7 })
      expect(`${nearly.strokes} ${nearly.fills}`, who).toBe(`${shut.strokes} ${shut.fills}`)
    }
  })

  it('stands every hair on Mops on end', () => {
    const on = drawn('mops', 1), off = drawn('mops', 0)
    expect(on.strokes + on.fills - off.strokes - off.fills).toBeGreaterThanOrEqual(14)
  })

})

describe('a reaction in its owner\'s manner', () => {
  it('draws Bim\'s flame as one thin quick spark and Grum\'s as one slow ball that rolls out', () => {
    const bim = flameShape(MANNERS.bim, 0.5, false), grum = flameShape(MANNERS.grum, 0.5, false)
    expect(bim.long / bim.wide).toBeGreaterThan(3)
    expect(grum.long / grum.wide).toBeLessThan(1.6)
    expect(grum.wide).toBeGreaterThan(bim.wide * 3)
    expect(bim.out).toBe(0)
    expect(grum.out).toBeGreaterThan(20)
    // Quick: over a little past half the beat. Slow: not begun a tenth of the way in, and still going at the end.
    expect(through(MANNERS.bim, 0.56)).toBe(1)
    expect(through(MANNERS.grum, 0.1)).toBe(0)
    expect(through(MANNERS.grum, 0.9)).toBeLessThan(1)
  })

  it('gives every customer a manner of its own', () => {
    const seen = new Set(CUSTOMERS.map((who) => JSON.stringify(MANNERS[who])))
    expect(seen.size).toBe(CUSTOMERS.length)
    for (const who of CUSTOMERS) {
      const m = MANNERS[who]
      expect(m.to).toBeGreaterThan(m.from + 0.5)
      expect(m.from).toBeGreaterThanOrEqual(0)
      expect(m.to).toBeLessThanOrEqual(1)
    }
  })
})

describe('a kind that is missing, mimed', () => {
  const anchors = (who: Customer): Anchors => {
    const c = CHARACTERS[who], eye = eyes(who)[0]
    return {
      mouth: { x: CUSTOMER.x, y: CUSTOMER.y - c.mouthAt * c.height },
      eye: { x: CUSTOMER.x + eye.x, y: CUSTOMER.y + eye.y, r: eye.r },
      hands: { free: null, card: null },
      eyesLow: CUSTOMER.y + eye.y + eye.r,
      height: c.height,
      body: c.body,
      counter: COUNTER_Y,
      head: { x: CUSTOMER.x, y: CUSTOMER.y - c.height },
      belly: { x: CUSTOMER.x, y: CUSTOMER.y - c.height * 0.26 },
      pizza: { x: PIZZA.x, y: PIZZA.y, r: PIZZA.r },
      halfWidth: c.halfWidth,
    }
  }
  const mime = (kind: Kind, way: 'few' | 'burp' = 'few', kinds?: Kind[]): string => {
    const g = new Recording(1180, 820)
    drawEffect(g as unknown as Pen, { kind, way, big: false, t: 0.4, kinds }, anchors('grum'))
    return `${g.strokes} strokes, ${g.fills} fills`
  }

  it('draws each kind\'s mime in its own way', () => {
    expect(new Set(KINDS.map((kind) => mime(kind))).size).toBe(KINDS.length)
  })

  it('moves the free hand for the mimes made with a hand: to the mouth, to the eye, to a string in the air, and to its hip', () => {
    for (const who of CUSTOMERS) {
      const c = CHARACTERS[who], eye = eyes(who)[0]
      const fan = fewHand(who, 'pepper', 0.3)!, ring = fewHand(who, 'olive', 0.3)!, pluck = fewHand(who, 'cheese', 0.3)!
      expect(Math.abs(fan.y - (CUSTOMER.y - c.mouthAt * c.height)), who).toBeLessThan(30)
      // The hand that fans keeps moving.
      expect(Math.abs(fewHand(who, 'pepper', 0.35)!.x - fan.x), who).toBeGreaterThan(5)
      expect(Math.hypot(ring.x - (CUSTOMER.x + eye.x), ring.y - (CUSTOMER.y + eye.y)), who).toBeLessThan(eye.r * 2)
      // Above the counter, where it can be seen.
      expect(pluck.y, who).toBeLessThan(COUNTER_Y)
      for (const kind of ['mushroom', 'worm'] as const) expect(fewHand(who, kind, 0.3), who + kind).toBeNull()
      // For a sock the hand is on its hip, inside its own outline, so the arm is not across the lifted leg.
      const hip = fewHand(who, 'sock', 0.3)!
      expect(Math.abs(hip.x - CUSTOMER.x)).toBeLessThan(c.halfWidth * 0.7)
      expect(hip.y).toBeLessThan(COUNTER_Y)
    }
  })

  it('draws one stink cloud for one extra sock and one wriggle for one extra worm', () => {
    const drawnFor = (kind: Kind, way: 'many' | 'burp', kinds?: Kind[], big = false): number => {
      const g = new Recording(1180, 820)
      drawEffect(g as unknown as Pen, { kind, way, big, t: 0.5, kinds }, anchors('grum'))
      return g.strokes + g.fills
    }
    // A burp of one kind is one cloud, and so is one extra sock.
    expect(drawnFor('sock', 'many')).toBe(drawnFor('sock', 'burp', ['sock']))
    // One wriggle for one extra worm; the big version is three of them one after another, so never more than one is drawn, and still one cloud.
    expect(drawnFor('worm', 'many', undefined, true)).toBe(drawnFor('worm', 'many'))
    expect(drawnFor('sock', 'many', undefined, true)).toBe(drawnFor('sock', 'many'))
  })

  it('keeps soot below every customer\'s eyes, and a worn sock clear of the eye on its side', () => {
    for (const who of CUSTOMERS) {
      const c = CHARACTERS[who], a = anchors(who)
      const lowest = eyes(who).reduce((low, e) => Math.max(low, CUSTOMER.y + e.y + e.r), -Infinity)
      const soot = sootSpot({ ...a, eyesLow: lowest })
      // A sooty face still has to be seen to blink.
      expect(soot.y - soot.r, who).toBeGreaterThanOrEqual(lowest)
      const eye = eyes(who)[0]
      const sock = Math.min(-c.halfWidth * WORN.x, eye.x - eye.r - WORN.clear)
      expect(sock + 28, who).toBeLessThanOrEqual(eye.x - eye.r)
    }
  })

  it('runs the wriggle down the body and stops it above the counter, for every customer', () => {
    for (const who of CUSTOMERS) {
      const a = anchors(who), run = wriggleRun(a), up = 24 * 1.4
      // Never onto the pizza, with the wave's own height to spare, and a run long enough to be seen running.
      expect(run.to + up, who).toBeLessThanOrEqual(COUNTER_Y + 20)
      expect(run.to - run.from, who).toBeGreaterThanOrEqual(28)
      expect(run.from, who).toBeGreaterThan(a.head.y)
      // Never across an eye: every eye is wholly above the band the wave moves in, or, on the one with its eye on a stalk, above its head.
      for (const e of eyes(who)) {
        const low = CUSTOMER.y + e.y + e.r
        expect(low <= run.from - up || low <= a.head.y + 10, `${who}: an eye at ${low}, the wave from ${run.from - up}`).toBe(true)
      }
      // And never across the mouth: wholly below it, or wholly above it.
      expect(run.from - up >= a.mouth.y || run.to + up <= a.mouth.y, who).toBe(true)
    }
  })

  it('takes the mouth along when Fizz\'s head hangs over: the tongue comes from where the mouth is drawn', () => {
    const c = CHARACTERS.fizz
    const up = onLimpHead('fizz', { ...restPose(), upset: 0 }, 0, -c.mouthAt * c.height)
    const over = onLimpHead('fizz', { ...restPose(), upset: 1 }, 0, -c.mouthAt * c.height)
    expect(up).toEqual({ x: 0, y: -c.mouthAt * c.height })
    // Hung over to one side, and lower than it was.
    expect(Math.abs(over.x)).toBeGreaterThan(40)
    expect(over.y).toBeGreaterThan(up.y)
    // Nobody else's mouth moves.
    expect(onLimpHead('grum', { ...restPose(), upset: 1 }, 0, -100)).toEqual({ x: 0, y: -100 })
  })

  it('leaves nothing of a mime or of a piece fed by hand standing before its beat or after it, in anyone\'s manner', () => {
    for (const who of CUSTOMERS) {
      for (const way of ['few', 'fed'] as const) {
        for (const kind of KINDS) {
          for (const t of [0, 1]) {
            const g = new Recording(1180, 820)
            drawEffect(g as unknown as Pen, { kind, way, big: false, t, who }, anchors(who))
            expect(g.strokes + g.fills, `${who} ${way} ${kind} at ${t}`).toBe(0)
          }
          // And all through the beat there is something to see, for the quick ones too.
          if (way === 'few') {
            for (const t of [0.2, 0.5, 0.8]) {
              const g = new Recording(1180, 820)
              drawEffect(g as unknown as Pen, { kind, way, big: false, t, who }, anchors(who))
              expect(g.strokes + g.fills, `${who} ${way} ${kind} at ${t}`).toBeGreaterThan(0)
            }
          }
        }
      }
    }
  })

  it('burps one puff for every kind that was eaten', () => {
    const one = mime('olive', 'burp', ['olive']), three = mime('olive', 'burp', ['olive', 'pepper', 'sock'])
    expect(one).not.toBe(three)
    expect(Number(three.split(' ')[0])).toBe(Number(one.split(' ')[0]) * 3)
  })
})
