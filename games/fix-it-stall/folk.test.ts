import { describe, expect, it } from 'vitest'
import { ACTS, CHANNELS, Customer, keyed, RIGS, type Pose } from './folk'
import { type Handed } from './handback'
import { Director, RACCOON } from './motion'
import { CUSTOMERS, reaction } from './tastes'

const run = (seconds: number, step: (dt: number) => void) => { for (let i = 0; i < Math.round(seconds * 60); i++) step(1 / 60) }
const zero = (): Pose => ({ lean: 0, turn: 0, lids: 0, special: 0, arm: 0, hop: 0 })

// Every gadget a customer could be handed, across all the things they can tell apart.
const everything: Handed[] = []
for (const ran of [true, false]) for (const popped of [false, true]) for (const light of [0, 1, 2, 3] as const) for (const wind of [-3, -1, 0, 1, 2, 3] as const)
  for (const sound of [0, 1, 2, 3] as const) for (const canPutOut of [false, true]) for (const lid of ['flat', 'bulging', 'banded'] as const) for (const shiny of [false, true])
    for (const buzzing of sound > 0 ? [1, 2] : [0]) everything.push({ ran, popped, light, dark: light === 0, wind, sound, buzzing, canPutOut, lid, shiny })

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
