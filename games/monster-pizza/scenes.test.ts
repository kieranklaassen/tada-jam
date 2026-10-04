import { describe, expect, it } from 'vitest'
import { CHARACTERS, CUSTOMERS } from './customers'
import { CRUST, chooseHint, glows, type Scene as HintScene } from './hint'
import { KINDS } from './kinds'
import { OVEN_MOUTH, OVEN_WAY, PIZZA, SERVE, biteOf } from './layout'
import { CHANNELS, type Delta } from './motion'
import { Scene, sceneLength } from './scene'
import { EATING_SECONDS, baking, bakedAlready, cannotStandAct, delightAct, eating, fedAct, fewAct, firstShowing, FED_SECONDS, PLUCKS, handFed, harpHands, mannerAct, manyAct, ovenShowing, rawTasting, steppingUp, tasting, walk } from './scenes'
import { restStaging } from './staging'
import { REACH } from './table'
import { planTasting } from './tasting'
import { bite, gulp, mannerLength, type VoiceSpec } from './voices'

const hand = { sound: () => {} }
const KEYS = CHANNELS
const SCALE: Record<keyof Delta, number> = { lift: 1 / 40, squash: 5, lean: 8, mouth: 1, tongue: 1, part: 1, lookX: 1, lookY: 1, blink: 1, brow: 1, frown: 1, smile: 1, pucker: 1, cheeks: 1, pupil: 2, upset: 1, rollX: 1, rollY: 1 }

function curve(at: (u: number) => Delta): number[] {
  const out: number[] = []
  for (let i = 1; i < 16; i++) {
    const d = at(i / 16)
    for (const key of KEYS) out.push((d[key] ?? 0) * SCALE[key])
  }
  return out
}

function apart(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0) / a.length)
}

function allDiffer(curves: number[][], names: readonly string[], least = 0.1): void {
  for (let a = 0; a < curves.length; a++) for (let b = a + 1; b < curves.length; b++) expect(apart(curves[a], curves[b]), `${names[a]} and ${names[b]}`).toBeGreaterThan(least)
}

describe('the grid: every cell moves differently', () => {
  it('too many of each kind', () => {
    allDiffer(KINDS.map((kind) => curve((u) => manyAct(kind, u, false))), KINDS)
    // The big version is its own thing, not the small one again.
    for (const kind of KINDS) expect(apart(curve((u) => manyAct(kind, u, false)), curve((u) => manyAct(kind, u, true))), kind).toBeGreaterThan(0.04)
  })

  it('too few of each kind', () => {
    allDiffer(KINDS.map((kind) => curve((u) => fewAct(kind, u))), KINDS)
  })

  it('each kind fed by hand', () => {
    allDiffer(KINDS.map((kind) => curve((u) => fedAct(kind, u))), KINDS)
  })

  it('each customer\'s walk, delight, manner, and answer to the kind it cannot stand', () => {
    allDiffer(CUSTOMERS.map((who) => curve((u) => walk(who, u))), CUSTOMERS)
    allDiffer(CUSTOMERS.map((who) => curve((u) => delightAct(who, u))), CUSTOMERS)
    allDiffer(CUSTOMERS.map((who) => curve((u) => mannerAct(who, u))), CUSTOMERS)
    allDiffer(CUSTOMERS.map((who) => curve((u) => cannotStandAct(who, u))), CUSTOMERS)
  })

  it('never changes the number of beats with a manner: one beat is one piece, so each manner has one hop at most', () => {
    for (const who of CUSTOMERS) {
      let hops = 0, up = false
      for (let i = 0; i <= 100; i++) {
        const lift = mannerAct(who, i / 100).lift ?? 0
        if (lift > 3 && !up) hops += 1
        up = lift > 3
      }
      expect(hops, who).toBeLessThanOrEqual(1)
    }
  })

  it('leaves every body at rest when its beat ends', () => {
    for (const kind of KINDS) {
      for (const d of [manyAct(kind, 1, false), manyAct(kind, 1, true), fewAct(kind, 1)]) {
        for (const key of KEYS) expect(Math.abs(d[key] ?? 0), `${kind} ${key}`).toBeLessThan(0.02)
      }
    }
  })
})

describe('the scenes', () => {
  const run = (beats: ReturnType<typeof baking>, until: number): void => {
    const scene = new Scene(beats)
    scene.start(0, () => {})
    for (let t = 0; t <= until; t += 1 / 60) scene.update(t)
    expect(scene.running).toBe(false)
  }

  it('last as long as the sheet says: a tasting 4 to 8 seconds, the eating 6 to 9, the rest short', () => {
    const st = restStaging()
    const plan = planTasting([{ kind: 'pepper', wanted: 2, have: 3, off: 1 }])
    const one = sceneLength(tasting(st, plan, 'grum', () => 1, () => ({ index: 0, x: 0, y: 0 }), () => null, hand))
    expect(one).toBeGreaterThanOrEqual(3.9)
    expect(one).toBeLessThanOrEqual(8)
    const eat = sceneLength(eating(st, 'bim', ['olive'], () => {}, hand))
    expect(eat).toBe(EATING_SECONDS)
    expect(eat).toBeGreaterThanOrEqual(6)
    expect(eat).toBeLessThanOrEqual(9)
    expect(sceneLength(rawTasting(st, 'fizz', 'pepper', hand))).toBeCloseTo(4.2, 5)
    expect(sceneLength(baking(st, ['pepper', 'cheese'], hand))).toBeLessThanOrEqual(3.5)
    expect(sceneLength(bakedAlready(st, hand))).toBeLessThanOrEqual(1.5)
    expect(sceneLength(firstShowing(st, { x: 100, y: 500 }, () => {}))).toBeLessThanOrEqual(2.5)
    expect(sceneLength(ovenShowing(st, hand))).toBeLessThanOrEqual(2.5)
    for (const n of [1, 5, 10]) {
      const step = sceneLength(steppingUp(st, 'mops', 'small', 'grum', Array.from({ length: n }, (_, i) => i + 1), hand))
      expect(step).toBeGreaterThanOrEqual(2.5)
      expect(step).toBeLessThanOrEqual(5)
    }
    for (const who of CUSTOMERS) for (const kind of KINDS) expect(sceneLength(handFed(st, who, kind, () => {}, hand))).toBeLessThanOrEqual(2.8)
  })

  it('leave the pizza on the board and every body at rest, whether played through or ended by a touch', () => {
    const builders = [
      (st: ReturnType<typeof restStaging>) => baking(st, ['sock'], hand),
      (st: ReturnType<typeof restStaging>) => baking(st, [], hand),
      (st: ReturnType<typeof restStaging>) => bakedAlready(st, hand),
      (st: ReturnType<typeof restStaging>) => rawTasting(st, 'ooze', 'worm', hand),
      (st: ReturnType<typeof restStaging>) => ovenShowing(st, hand),
      (st: ReturnType<typeof restStaging>) => firstShowing(st, { x: 100, y: 500 }, () => {}),
      (st: ReturnType<typeof restStaging>) => steppingUp(st, 'fizz', 'big', 'bim', [1, 2, 3], hand),
      (st: ReturnType<typeof restStaging>) => tasting(st, planTasting([{ kind: 'cheese', wanted: 1, have: 5, off: 4 }, { kind: 'olive', wanted: 3, have: 1, off: -2 }]), 'mops', () => 3, () => ({ index: 1, x: 40, y: 40 }), () => ({ x: 200, y: 500 }), hand),
    ]
    for (const build of builders) {
      for (const cutAt of [null, 0, 0.3, 1.1, 2.4]) {
        const st = restStaging()
        const scene = new Scene(build(st))
        scene.start(0, () => {})
        if (cutAt === null) for (let t = 0; t <= 12; t += 1 / 60) scene.update(t)
        else {
          for (let t = 0; t <= cutAt; t += 1 / 60) scene.update(t)
          scene.finish()
        }
        expect(scene.running).toBe(false)
        expect([st.pizzaX, st.pizzaY, st.pizzaSize, st.pizzaHidden, st.puffed]).toEqual([PIZZA.x, PIZZA.y, 1, false, 0])
        expect(st.act).toEqual({})
        expect([st.hand, st.cardHand, st.effect, st.lookAt, st.customer, st.leaving, st.arriving]).toEqual([null, null, null, null, null, null, null])
        expect([st.lick, st.sizzling.length, st.patted.length, st.ovenGlow, st.baking, st.cardOpen, st.tubsIn]).toEqual([0, 0, 0, 0, 0, 1, 1])
        expect(st.cardCount).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('bake a pizza out of sight and bring it back', () => {
    const st = restStaging()
    const scene = new Scene(baking(st, ['pepper'], hand))
    scene.start(0, () => {})
    for (let t = 0; t <= 1.2; t += 1 / 60) scene.update(t)
    expect(st.pizzaHidden).toBe(true)
    expect(st.ovenGlow).toBeGreaterThan(0.9)
    expect(Math.hypot(st.pizzaX - OVEN_MOUTH.x, st.pizzaY - OVEN_MOUTH.y)).toBeLessThan(1)
    // The baking move plays once, as the pizza slides out, and is over when the scene is.
    expect(st.baking).toBe(0)
    let played = 0
    for (let t = 1.2; t <= 3.2; t += 1 / 60) {
      scene.update(t)
      if (st.baking > 0) played += 1
      if (st.baking > 0) expect(st.pizzaHidden).toBe(false)
    }
    expect(played).toBeGreaterThan(20)
    expect(st.baking).toBe(0)
  })

  it('play a tasting at the counter, one sizzling piece and one patted picture at a time', () => {
    const st = restStaging()
    const plan = planTasting([{ kind: 'pepper', wanted: 1, have: 3, off: 2 }, { kind: 'cheese', wanted: 2, have: 1, off: -1 }])
    const scene = new Scene(tasting(st, plan, 'grum', (_, index) => 10 + index, (_, index) => ({ index: 5 + index, x: 30, y: 30 }), () => ({ x: 200, y: 500 }), hand))
    scene.start(0, () => {})
    const sizzled = new Set<number>(), patted = new Set<number>()
    for (let t = 0; t <= plan.seconds + 0.1; t += 1 / 60) {
      scene.update(t)
      expect(st.sizzling.length).toBeLessThanOrEqual(1)
      expect(st.patted.length).toBeLessThanOrEqual(1)
      for (const id of st.sizzling) sizzled.add(id)
      for (const index of st.patted) patted.add(index)
      // Never both at once: one thing is shown at a time.
      expect(st.sizzling.length > 0 && st.patted.length > 0).toBe(false)
      if (t > plan.lick.lasts * 0.5 && t < plan.push.at) expect(Math.hypot(st.pizzaX - SERVE.x, st.pizzaY - SERVE.y)).toBeLessThan(1)
    }
    expect([...sizzled].sort()).toEqual([10, 11])
    expect([...patted]).toEqual([5])
    run(tasting(restStaging(), plan, 'grum', () => 1, () => ({ index: 0, x: 0, y: 0 }), () => null, hand), plan.seconds + 0.2)
  })

  it('sizzle every piece that has no partner at once in a big version, and pat every picture that has none', () => {
    const st = restStaging()
    const plan = planTasting([{ kind: 'sock', wanted: 0, have: 5, off: 5 }, { kind: 'olive', wanted: 6, have: 1, off: -5 }])
    expect(plan.tastes.map((t) => [t.big, t.count])).toEqual([[true, 5], [true, 5]])
    const scene = new Scene(tasting(st, plan, 'grum', (_, index) => 20 + index, (_, index) => ({ index: 3 + index, x: 30 + index * 40, y: 30 }), () => ({ x: 200, y: 500 }), hand))
    scene.start(0, () => {})
    let most = 0, mostPatted = 0
    const reached = new Set<number>()
    for (let t = 0; t <= plan.seconds + 0.1; t += 1 / 60) {
      scene.update(t)
      if (st.sizzling.length > 0) expect([...st.sizzling].sort()).toEqual([20, 21, 22, 23, 24])
      if (st.patted.length > 0) expect([...st.patted].sort()).toEqual([3, 4, 5, 6, 7])
      most = Math.max(most, st.sizzling.length)
      mostPatted = Math.max(mostPatted, st.patted.length)
      // The hand goes along the pictures, one after another.
      if (st.cardHand) reached.add(Math.round(st.cardHand.x))
    }
    expect(most).toBe(5)
    expect(mostPatted).toBe(5)
    expect(reached.size).toBe(5)
    expect(st.sizzling.length + st.patted.length).toBe(0)
  })

  it('leave nothing on a customer when they end: the soot of one big flame is shaken off as the tasting ends', () => {
    for (const cutAt of [null, 3.2]) {
      const st = restStaging()
      const plan = planTasting([{ kind: 'pepper', wanted: 1, have: 6, off: 5 }])
      const scene = new Scene(tasting(st, plan, 'fizz', () => 1, () => ({ index: 0, x: 0, y: 0 }), () => null, hand))
      scene.start(0, () => {})
      let sooty = 0
      for (let t = 0; t <= (cutAt ?? plan.seconds + 0.1); t += 1 / 60) {
        scene.update(t)
        sooty = Math.max(sooty, st.soot)
      }
      if (cutAt !== null) scene.finish()
      expect(sooty).toBe(1)
      expect(st.soot).toBe(0)
    }
  })

  it('pull a sock on to be worn, unless the customer cannot stand socks', () => {
    for (const who of CUSTOMERS) {
      const st = restStaging()
      let spat = 0
      const scene = new Scene(handFed(st, who, 'sock', () => { spat++ }, hand))
      scene.start(0, () => {})
      for (let t = 0; t <= 3; t += 1 / 60) scene.update(t)
      expect(st.wearing, who).toBe(who !== 'bim')
      expect(spat, who).toBe(who === 'bim' ? 1 : 0)
    }
  })

  it('take a sock the customer cannot stand into its mouth and spit it back, with no pulling on and no wearing in between', () => {
    const st = restStaging()
    let spat = 0, drawn = 0, handed = 0
    const scene = new Scene(handFed(st, 'bim', 'sock', () => { spat++ }, hand))
    scene.start(0, () => {})
    for (let t = 0; t <= 3; t += 1 / 60) {
      scene.update(t)
      if (st.effect) drawn += 1
      if (st.hand) handed += 1
      expect(st.wearing).toBe(false)
    }
    expect(spat).toBe(1)
    expect(drawn).toBe(0)
    expect(handed).toBe(0)
    // Anyone else pulls it on with a hand, and the sock is drawn on its way there.
    const other = restStaging()
    let pulled = 0
    const wears = new Scene(handFed(other, 'grum', 'sock', () => {}, hand))
    wears.start(0, () => {})
    for (let t = 0; t <= 1; t += 1 / 60) {
      wears.update(t)
      if (other.effect && other.hand) pulled += 1
    }
    expect(pulled).toBeGreaterThan(20)
  })

  it('take three bites and leave the board bare', () => {
    const st = restStaging()
    let eaten = 0
    const scene = new Scene(eating(st, 'ooze', ['worm', 'cheese'], () => { eaten++ }, hand))
    scene.start(0, () => {})
    const bites: number[] = []
    for (let t = 0; t <= EATING_SECONDS + 0.1; t += 1 / 60) {
      scene.update(t)
      bites.push(st.bites)
    }
    for (let i = 1; i < bites.length; i++) expect(bites[i]).toBeGreaterThanOrEqual(bites[i - 1])
    expect(st.bites).toBe(3)
    expect(st.pizzaHidden).toBe(true)
    expect(eaten).toBe(1)
    // The card is rolled away with the last beat.
    expect(st.cardOpen).toBe(0)
  })
})

describe('hints', () => {
  const scene = (over: Partial<HintScene> = {}): HintScene => ({ finished: false, baked: false, tasting: false, own: true, tubs: [{ x: 250, y: 468 }, { x: 250, y: 658 }], handTub: { x: 250, y: 658 }, pieces: [], door: [{ x: 886, y: 334 }, { x: 986, y: 334 }], ...over })

  it('show a tap on one tub when the pizza is bare: always the tub of the kind the customer loves, never the spare one', () => {
    const taps = [0, 1, 2, 3, 4, 5].map((turn) => chooseHint(scene(), turn))
    for (const hint of taps) expect(hint).toEqual({ move: 'tap', at: { x: 250, y: 658 } })
    // Every tub can be touched, and every tub has the ring.
    expect(glows(scene()).length).toBe(2)
  })

  it('show three moves in turn once something is on the pizza: one more on, the pizza onward, one off', () => {
    const s = scene({ pieces: [{ x: 600, y: 500 }] })
    const three = [0, 1, 2].map((turn) => chooseHint(s, turn))
    expect(three[0]).toEqual({ move: 'tap', at: s.handTub })
    // The slide is shown from the crust, where a press takes the pizza and never a piece.
    expect(three[1]).toEqual({ move: 'drag', from: CRUST, to: { x: CRUST.x + OVEN_WAY.x - PIZZA.x, y: CRUST.y + OVEN_WAY.y - PIZZA.y } })
    expect(Math.hypot(CRUST.x - PIZZA.x, CRUST.y - PIZZA.y) / PIZZA.r).toBeGreaterThan(REACH + 0.1)
    expect(three[2]).toEqual({ move: 'tap', at: s.pieces[0] })
    // Baked, the way onward is to the customer.
    expect(chooseHint({ ...s, baked: true }, 1)).toEqual({ move: 'drag', from: CRUST, to: { x: CRUST.x + SERVE.x - PIZZA.x, y: CRUST.y + SERVE.y - PIZZA.y } })
    expect(glows(s).length).toBe(3)
    // Until the child has laid a piece itself, only the tubs are pointed at: the piece a customer showed does not count.
    const watching = { ...s, own: false }
    expect(glows(watching).length).toBe(2)
    for (const turn of [0, 1, 2, 3]) expect(chooseHint(watching, turn)?.move).toBe('tap')
  })

  it('show the door when the customer has eaten', () => {
    const s = scene({ finished: true })
    expect(chooseHint(s, 0)?.move).toBe('tap')
    expect(glows(s).length).toBe(2)
  })
})

describe('the eating, bite by bite', () => {
  it('gives each bite the crunch of the kinds that lie in the third it takes', () => {
    const st = restStaging()
    const heard: string[] = []
    const listening = { sound: (spec: VoiceSpec) => { heard.push(JSON.stringify(spec)) } }
    const scene = new Scene(eating(st, 'grum', ['olive', 'sock'], () => {}, listening, [['olive'], [], ['sock', 'olive']]))
    scene.start(0, () => {})
    for (let t = 0; t <= EATING_SECONDS + 0.1; t += 1 / 60) scene.update(t)
    expect(heard).toContain(JSON.stringify(bite(0, ['olive'])))
    expect(heard).toContain(JSON.stringify(bite(1, [])))
    expect(heard).toContain(JSON.stringify(bite(2, ['sock', 'olive'])))
    expect(heard).not.toContain(JSON.stringify(bite(1, ['olive', 'sock'])))
  })

  it('sends every spot on the pizza to exactly one of the three bites, and something to each', () => {
    const counts = [0, 0, 0]
    for (let x = -1; x <= 1; x += 0.05) for (let y = -1; y <= 1; y += 0.05) if (Math.hypot(x, y) <= 1) counts[biteOf(x, y)] += 1
    const all = counts[0] + counts[1] + counts[2]
    for (const n of counts) expect(n / all).toBeGreaterThan(0.2)
  })

  it('plucks the cheese at the moments its notes sound, and takes each customer as long over a piece fed by hand as its sound lasts in its manner', () => {
    expect(PLUCKS.length).toBe(4)
    for (const who of CUSTOMERS) {
      for (const at of PLUCKS) {
        expect(at).toBeGreaterThan(0.1)
        expect(at).toBeLessThan(1)
        // Dipped at the note, and up again between notes.
        expect(harpHands(who, at).pluck.y - harpHands(who, at - 0.043).pluck.y, who).toBeGreaterThan(15)
      }
      // The pulling hand goes out to the tubs' side and holds the string there.
      expect(harpHands(who, 0.9).pull.x).toBeLessThan(harpHands(who, 0).pull.x - 100)
      expect(harpHands(who, 0.9).pull).toEqual(harpHands(who, 0.5).pull)
      // The scene and the sound are stretched by the same factor, for every kind: what is heard at a share of the sound is drawn at that share of the scene.
      for (const kind of KINDS) {
        if (kind === CHARACTERS[who].loves || kind === CHARACTERS[who].cannotStand) continue
        const st = restStaging()
        const length = sceneLength(handFed(st, who, kind, () => {}, hand))
        expect(length, `${who} ${kind}`).toBeCloseTo(FED_SECONDS * mannerLength(gulp(kind), who), 6)
      }
    }
    // Quick for the quick one, slow for the slow one.
    expect(sceneLength(handFed(restStaging(), 'bim', 'pepper', () => {}, hand))).toBeLessThan(sceneLength(handFed(restStaging(), 'grum', 'pepper', () => {}, hand)) - 0.3)
  })
})
