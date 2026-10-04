import { describe, expect, it } from 'vitest'
import { ACTS, CHANNELS, Customer, FEATURES, keyed, RIGS, WATCHED, type Pose } from './folk'
import { type Handed } from './handback'
import { Director, RACCOON } from './motion'
import { CUSTOMERS, reaction } from './tastes'

const run = (seconds: number, step: (dt: number) => void) => { for (let i = 0; i < Math.round(seconds * 60); i++) step(1 / 60) }
const zero = (): Pose => ({ lean: 0, turn: 0, lids: 0, special: 0, arm: 0, hop: 0, brow: 0, gape: 0 })

// Every gadget a customer could be handed, across all the things they can tell apart.
const everything: Handed[] = []
for (const ran of [true, false]) for (const popped of [false, true]) for (const light of [0, 1, 2, 3] as const) for (const wind of [-3, -1, 0, 1, 2, 3] as const)
  for (const sound of [0, 1, 2, 3] as const) for (const canPutOut of [false, true]) for (const lid of ['flat', 'bulging', 'banded'] as const) for (const shiny of [false, true])
    for (const buzzing of sound > 0 ? [1, 2] : [0]) for (const lit of light > 0 ? [1, 2] : [0]) everything.push({ ran, popped, light, lit, dark: light === 0, wind, sound, buzzing, canPutOut, lid, shiny })

describe('keys', () => {
  it('are joined by straight lines and held at the last', () => {
    const keys = { turn: [[0.2, 0], [0.6, 1]] as const }
    expect(keyed(keys, 0, zero()).turn).toBe(0)
    expect(keyed(keys, 0.4, zero()).turn).toBeCloseTo(0.5, 9)
    expect(keyed(keys, 0.6, zero()).turn).toBe(1)
    expect(keyed(keys, 1, zero()).turn).toBe(1)
    expect(keyed(keys, 0.4, zero()).lean).toBe(0)
  })
})

describe('every reaction has a motion', () => {
  const acts = new Map<string, string>()
  for (const who of CUSTOMERS) for (const handed of everything) acts.set(reaction(who, handed).act, who)

  it('one table of keys for each act a customer can play, and none left over', () => {
    for (const [act] of acts) expect(ACTS[act], act).toBeDefined()
    expect(Object.keys(ACTS).sort()).toEqual([...acts.keys()].sort())
  })

  it('an act belongs to one customer and is named for it', () => {
    for (const [act, who] of acts) expect(act.startsWith(`${who}-`), act).toBe(true)
  })

  it('no two acts are the same motion, or the same motion a little moved', () => {
    const names = Object.keys(ACTS)
    const sample = (name: string) => Array.from({ length: 21 }, (_, i) => CHANNELS.map((c) => keyed(ACTS[name], i / 20, zero())[c])).flat()
    const samples = names.map(sample)
    for (let a = 0; a < names.length; a++) for (let b = a + 1; b < names.length; b++) {
      const apart = Math.sqrt(samples[a].reduce((sum, v, i) => sum + (v - samples[b][i]) ** 2, 0) / samples[a].length)
      expect(apart, `${names[a]} and ${names[b]}`).toBeGreaterThan(0.12)
    }
  })

  it('every act moves something, and keeps every channel inside what a painter can draw', () => {
    for (const [name, keys] of Object.entries(ACTS)) {
      let moved = 0
      for (let i = 0; i <= 20; i++) {
        const pose = keyed(keys, i / 20, zero())
        for (const channel of CHANNELS) {
          moved = Math.max(moved, Math.abs(pose[channel]))
          expect(Math.abs(pose[channel]), `${name} ${channel}`).toBeLessThanOrEqual(channel === 'turn' ? 3 : 1)
        }
      }
      expect(moved, name).toBeGreaterThan(0.4)
    }
  })
})

describe('every character moves like itself', () => {
  it('no small thing is shared: every name is one customer\'s, and none is the old hand\'s', () => {
    const names = CUSTOMERS.flatMap((who) => Object.keys(RIGS[who].idle))
    expect(new Set([...names, ...RACCOON.idle]).size).toBe(names.length + RACCOON.idle.length)
    for (const who of CUSTOMERS) expect(Object.keys(RIGS[who].idle).length, who).toBeGreaterThanOrEqual(3)
  })

  it('no two have the same tempo or the same weight', () => {
    for (let a = 0; a < CUSTOMERS.length; a++) for (let b = a + 1; b < CUSTOMERS.length; b++) {
      const x = RIGS[CUSTOMERS[a]], y = RIGS[CUSTOMERS[b]]
      const ratio = (p: number, q: number) => Math.max(p, q) / Math.min(p, q)
      expect(ratio(x.breath, y.breath), `${CUSTOMERS[a]} ${CUSTOMERS[b]} breath`).toBeGreaterThan(1.15)
      expect(ratio(x.spring.stiffness, y.spring.stiffness), `${CUSTOMERS[a]} ${CUSTOMERS[b]} weight`).toBeGreaterThan(1.15)
      expect(ratio(x.takes, y.takes), `${CUSTOMERS[a]} ${CUSTOMERS[b]} time`).toBeGreaterThan(1.1)
    }
    // And none breathes or weighs as the old hand does.
    for (const who of CUSTOMERS) {
      expect(RIGS[who].breath).not.toBe(RACCOON.breath)
      expect(RIGS[who].spring.stiffness).not.toBe(RACCOON.whiskers.stiffness)
    }
  })

  it('the same pop takes each of them differently', () => {
    const shapes = CUSTOMERS.map((who) => JSON.stringify(RIGS[who].startle))
    expect(new Set(shapes).size).toBe(CUSTOMERS.length)
  })

  it('and so does each thing that happens to a gadget while its owner watches: no two take it the same way', () => {
    for (const what of [...WATCHED, 'alarm'] as const) {
      const shapes = CUSTOMERS.map((who) => JSON.stringify(what === 'alarm' ? RIGS[who].alarm : RIGS[who].watched[what]))
      expect(new Set(shapes).size, what).toBe(CUSTOMERS.length)
    }
    // Each has something of its own that goes up and down with its spirits.
    for (const who of CUSTOMERS) expect(Object.keys(RIGS[who].gauge).length, who).toBeGreaterThan(0)
    expect(new Set(CUSTOMERS.map((who) => JSON.stringify(RIGS[who].gauge))).size).toBe(CUSTOMERS.length)
  })
})

describe('a customer', () => {
  it('is alive while it waits: it breathes, and does each of its small things, never the same twice running', () => {
    for (const who of CUSTOMERS) {
      const customer = new Customer(who, new Director(4))
      const done: string[] = []
      let moved = 0
      run(120, (dt) => {
        customer.step(dt, null, false)
        if (customer.doing && done.at(-1) !== customer.doing) done.push(customer.doing)
        moved = Math.max(moved, ...CHANNELS.map((c) => Math.abs(customer.pose[c])))
      })
      expect(new Set(done).size, who).toBe(Object.keys(RIGS[who].idle).length)
      for (let i = 1; i < done.length; i++) expect(done[i], who).not.toBe(done[i - 1])
      expect(moved, who).toBeGreaterThan(0.1)
    }
  })

  it('follows a reaction to where it ends, each at its own weight', () => {
    const reached = (who: 'owl' | 'tortoise', act: string) => {
      const customer = new Customer(who, new Director(4))
      let when = -1
      run(8, (dt) => { customer.step(dt, { name: act, progress: 1 }, false); if (when < 0 && Math.abs(customer.pose.special - keyed(ACTS[act], 1, zero()).special) < 0.05) when = 1 })
      return { customer, when }
    }
    const owl = reached('owl', 'owl-cap-down-head-right-round')
    expect(owl.customer.pose.special).toBeCloseTo(1, 1)
    expect(owl.customer.pose.turn).toBeCloseTo(1, 1)
    const tortoise = reached('tortoise', 'tortoise-head-and-legs-in')
    expect(tortoise.customer.pose.special).toBeCloseTo(-1, 1)
  })

  it('is set straight to the end of a finished reaction on load, with nothing played', () => {
    const customer = new Customer('yak', new Director(4))
    customer.settle('yak-hair-streams-back')
    expect(customer.pose.special).toBe(1)
    expect(customer.pose.lids).toBe(0.8)
  })

  it('has opinions about what is done to its gadget: it starts, it is delighted, it droops, it winces, and each passes', () => {
    for (const who of CUSTOMERS) for (const what of WATCHED) {
      const still = new Customer(who, new Director(4)), customer = new Customer(who, new Director(4))
      customer.react(what)
      let apart = 0
      run(0.5, (dt) => {
        still.step(dt, null, true)
        customer.step(dt, null, true)
        apart = Math.max(apart, ...[...CHANNELS, ...FEATURES].map((c) => Math.abs(customer.pose[c] - still.pose[c])))
      })
      expect(apart, `${who} ${what}`).toBeGreaterThan(0.08)
      run(6, (dt) => customer.step(dt, null, true))
      expect(customer.watched, `${who} ${what}`).toBeNull()
    }
  })

  it('wears its spirits: the cockatoo\'s crest is up while its gadget runs and flat while a flag stands', () => {
    const crest = (mood: number) => {
      const cockatoo = new Customer('cockatoo', new Director(4))
      let sum = 0, n = 0
      run(4, (dt) => { cockatoo.step(dt, null, true, 0, { mood }); if (!cockatoo.doing) { sum += cockatoo.pose.special; n++ } })
      return sum / n
    }
    expect(crest(0.8)).toBeGreaterThan(crest(-0.15) + 0.3)
    expect(crest(-0.15)).toBeGreaterThan(crest(-0.8) + 0.1)
    // And every one of them shows it in its brow.
    for (const who of CUSTOMERS) {
      const up = new Customer(who, new Director(4)), down = new Customer(who, new Director(4))
      let most = 0, least = 0
      run(5, (dt) => { up.step(dt, null, true, 0, { mood: 0.8 }); down.step(dt, null, true, 0, { mood: -0.8 }); most = Math.max(most, up.pose.brow); least = Math.min(least, down.pose.brow) })
      expect(most, who).toBeGreaterThan(0.15)
      expect(least, who).toBeLessThan(-0.25)
    }
  })

  it('is alarmed for as long as a part of its gadget is out in the hand, and no longer', () => {
    for (const who of CUSTOMERS) {
      const calm = new Customer(who, new Director(4)), alarmed = new Customer(who, new Director(4))
      let apart = 0
      run(3, (dt) => { calm.step(dt, null, true); alarmed.step(dt, null, true, 0, { alarm: true }) })
      apart = Math.max(...[...CHANNELS, ...FEATURES].map((c) => Math.abs(alarmed.pose[c] - calm.pose[c])))
      expect(apart, who).toBeGreaterThan(0.3)
      // A tortoise takes its time.
      run(8, (dt) => { calm.step(dt, null, true); alarmed.step(dt, null, true) })
      for (const c of FEATURES) expect(Math.abs(alarmed.pose[c] - calm.pose[c]), `${who} ${c}`).toBeLessThan(0.2)
    }
  })

  it('looks where the hand is, and at nothing in particular when there is no hand', () => {
    const customer = new Customer('owl', new Director(4))
    run(0.5, (dt) => customer.step(dt, null, true, 0, { look: { x: -200, y: 260 } }))
    expect(customer.gaze.x).toBeLessThan(-0.4)
    expect(customer.gaze.y).toBeGreaterThan(0.5)
    run(0.5, (dt) => customer.step(dt, null, true, 0, { look: { x: 300, y: 40 } }))
    expect(customer.gaze.x).toBeGreaterThan(0.6)
    run(0.5, (dt) => customer.step(dt, null, true))
    expect(Math.abs(customer.gaze.x)).toBeLessThan(0.05)
    for (const g of [customer.gaze.x, customer.gaze.y]) expect(Math.abs(g)).toBeLessThanOrEqual(1)
  })

  it('has everything on end at a pop, and it lies down again', () => {
    for (const who of CUSTOMERS) {
      const customer = new Customer(who, new Director(4))
      expect(customer.fright).toBe(0)
      customer.startle()
      expect(customer.fright).toBe(1)
      run(0.3, (dt) => customer.step(dt, null, true))
      expect(customer.fright, who).toBeGreaterThan(0.4)
      expect(customer.pose.brow, who).toBeGreaterThan(0.1)
      run(4, (dt) => customer.step(dt, null, true))
      expect(customer.fright, who).toBe(0)
    }
  })

  it('flinches at a pop and settles again', () => {
    const customer = new Customer('cockatoo', new Director(4))
    customer.startle()
    let crest = 0
    run(0.5, (dt) => { customer.step(dt, null, false); crest = Math.max(crest, customer.pose.special) })
    expect(crest).toBeGreaterThan(0.4)
    // Long enough to settle, short enough that it has not begun a small thing of its own.
    const quiet = new Customer('cockatoo', new Director(4))
    quiet.startle()
    run(1.1, (dt) => quiet.step(dt, null, false))
    expect(Math.abs(quiet.pose.hop)).toBeLessThan(0.2)
  })
})
