import { describe, expect, it } from 'vitest'
import { boardOf } from './board'
import { benchOdd, clipLead, clipProbe, crackTrace, placePart, removeLead, removePart, startLead, trayPart, turnPart, type Circuit } from './circuit'
import { asBuilt } from './gadgets'
import { handBack, lidOf, type Handed } from './handback'
import { CUSTOMERS, reaction, type Mood } from './tastes'

const board = boardOf('lamp')
const [linkA, linkB] = board.linkSocket
const spare = board.rungs[0]
const indexOf = (circuit: Circuit, kind: string) => circuit.parts.findIndex((p) => p.kind === kind)
const inPlaceOfLink = (circuit: Circuit, part: Parameters<typeof placePart>[1]) => placePart(removeLead(circuit, 0), part)

describe('what a gadget does for its owner', () => {
  it('runs as built, with a flat lid, and can be put out when it has a switch', () => {
    expect(handBack(asBuilt('lamp'))).toEqual({ ran: true, popped: false, light: 2, dark: false, wind: 0, sound: 0, buzzing: 0, canPutOut: true, lid: 'flat', shiny: false })
    expect(handBack(asBuilt('fan-plain'))).toMatchObject({ ran: true, wind: 2, canPutOut: false })
    expect(handBack(asBuilt('robot'))).toMatchObject({ ran: true, light: 2, wind: 2, sound: 2, buzzing: 1 })
  })

  it('is switched on by its owner: a lever left up does not count against the mend', () => {
    const lamp = asBuilt('lamp')
    const up: Circuit = { ...lamp, parts: lamp.parts.map((p) => (p.kind === 'switch' ? { ...p, down: false } : p)) }
    expect(handBack(up).ran).toBe(true)
  })

  it('does not run with a gap, and the lamp is dark', () => {
    expect(handBack(crackTrace(asBuilt('lamp'), 0))).toMatchObject({ ran: false, light: 0, dark: true })
  })

  it('does not run on the stall\'s test lamp: it stays on the mat', () => {
    const cracked = crackTrace(asBuilt('lamp'), 0), trace = board.traces[0]
    expect(handBack(clipProbe(clipProbe(cracked, 0, trace.a), 1, trace.b)).ran).toBe(false)
  })

  it('does not run while a short is in it, and the flag pops in the owner\'s hands', () => {
    expect(handBack(placePart(asBuilt('lamp'), benchOdd('foil', spare[0], spare[1])))).toMatchObject({ ran: false, popped: true })
  })

  it('a fan that sucks turns, and is not mended', () => {
    const fan = asBuilt('fan')
    expect(handBack(turnPart(fan, indexOf(fan, 'motor')))).toMatchObject({ ran: false, wind: -2 })
  })

  it('needs every part it came with: a robot with its arm dead has not run', () => {
    const robot = asBuilt('robot')
    expect(handBack(removePart(robot, indexOf(robot, 'motor')))).toMatchObject({ ran: false, light: 2, sound: 2 })
  })

  it('stands with any mend that works: a second cell, a second lamp, a spoon in the row', () => {
    expect(handBack(inPlaceOfLink(asBuilt('lamp'), trayPart('cell', linkA, linkB)))).toMatchObject({ ran: true, light: 3 })
    expect(handBack(inPlaceOfLink(asBuilt('lamp'), trayPart('lamp', linkA, linkB)))).toMatchObject({ ran: true, light: 1 })
    expect(handBack(placePart(asBuilt('lamp'), trayPart('lamp', spare[0], spare[1])))).toMatchObject({ ran: true, light: 2 })
    expect(handBack(inPlaceOfLink(asBuilt('lamp'), benchOdd('spoon', linkA, linkB)))).toMatchObject({ ran: true, shiny: true })
    expect(handBack(inPlaceOfLink(asBuilt('lamp'), benchOdd('pencil', linkA, linkB)))).toMatchObject({ ran: true, light: 1, shiny: false })
  })

  it('a lead across the switch means it can no longer be put out', () => {
    expect(handBack(clipLead(asBuilt('lamp'), board.switchSocket[0], board.switchSocket[1]))).toMatchObject({ ran: true, canPutOut: false })
  })

  it('shuts flat over a neat mend, bulges over a roundabout one, and needs a band over a mess', () => {
    const cracked = crackTrace(asBuilt('lamp'), 0), trace = board.traces[0]
    expect(lidOf(clipLead(cracked, trace.a, trace.b))).toBe('flat')
    // The long way round: from one end of the crack out along the top rail and back.
    const far = board.switchSocket[0]
    expect(lidOf(clipLead(clipLead(cracked, trace.a, far), far, trace.b))).toBe('bulging')
    let mess = clipLead(cracked, trace.a, trace.b)
    mess = startLead(startLead(mess, spare[0]).circuit, spare[1]).circuit
    expect(lidOf(mess)).toBe('banded')
    // All three run.
    for (const c of [clipLead(cracked, trace.a, trace.b), clipLead(clipLead(cracked, trace.a, far), far, trace.b), mess]) expect(handBack(c).ran).toBe(true)
  })
})

describe('the customers', () => {
  const base: Handed = { ran: true, popped: false, light: 0, dark: false, wind: 0, sound: 0, buzzing: 0, canPutOut: false, lid: 'flat', shiny: false }
  const lit = (light: Handed['light']): Handed => ({ ...base, light })

  // Every gadget a customer could be handed, across all the things they can tell apart.
  const everything: Handed[] = []
  for (const ran of [true, false]) for (const popped of [false, true]) for (const light of [0, 1, 2, 3] as const) for (const wind of [-3, -1, 0, 1, 2, 3] as const)
    for (const sound of [0, 1, 2, 3] as const) for (const canPutOut of [false, true]) for (const lid of ['flat', 'bulging', 'banded'] as const) for (const shiny of [false, true])
      everything.push({ ran, popped, light, dark: light === 0, wind, sound, buzzing: sound > 0 ? 2 : 0, canPutOut, lid, shiny })

  it('each have a like and a dislike that a mend can bring out', () => {
    const likes: Mood[] = ['delight'], dislikes: Mood[] = ['disgust', 'fright', 'sulk', 'asleep']
    for (const who of CUSTOMERS) {
      const moods = new Set(everything.map((h) => reaction(who, h).mood))
      expect(likes.some((m) => moods.has(m)), `${who} likes something`).toBe(true)
      expect(dislikes.some((m) => moods.has(m)), `${who} dislikes something`).toBe(true)
    }
  })

  it('never change: the same gadget gets the same reaction, however often it is handed over', () => {
    for (const who of CUSTOMERS) for (const h of everything.filter((_, i) => i % 37 === 0)) expect(reaction(who, { ...h })).toEqual(reaction(who, h))
  })

  it('no two share a motion', () => {
    const acts = new Map<string, string>()
    for (const who of CUSTOMERS) for (const h of everything) {
      const act = reaction(who, h).act
      expect(acts.get(act) ?? who, act).toBe(who)
      acts.set(act, who)
    }
  })

  it('take the same gadget differently', () => {
    const dazzling = lit(3)
    expect(reaction('owl', dazzling).mood).toBe('disgust')
    expect(reaction('moth', dazzling).mood).toBe('delight')
    const suck: Handed = { ...base, wind: -2 }
    expect(reaction('yak', suck).mood).toBe('disgust')
    expect(reaction('moth', suck)).toMatchObject({ mood: 'delight', secret: true })
  })

  it('the owl likes it dim and likes a switch; the tortoise likes it slow; the cockatoo likes it loud; the magpie likes it neat', () => {
    expect(reaction('owl', lit(1)).mood).toBe('delight')
    expect(reaction('owl', { ...lit(2), canPutOut: true }).mood).toBe('delight')
    expect(reaction('owl', lit(2)).mood).toBe('content')
    expect(reaction('tortoise', { ...base, wind: 1 }).mood).toBe('delight')
    expect(reaction('tortoise', { ...base, wind: 3 }).mood).toBe('fright')
    expect(reaction('cockatoo', { ...base, sound: 3, buzzing: 1 }).mood).toBe('delight')
    expect(reaction('cockatoo', { ...base, sound: 2, buzzing: 2 })).toMatchObject({ mood: 'delight', secret: true })
    expect(reaction('cockatoo', { ...base, dark: true }).mood).toBe('asleep')
    expect(reaction('magpie', base).mood).toBe('delight')
    expect(reaction('magpie', { ...base, lid: 'bulging' }).mood).toBe('disgust')
    expect(reaction('magpie', { ...base, lid: 'banded', shiny: true })).toMatchObject({ mood: 'delight', secret: true })
  })

  it('are never turned on the child: a gadget that does nothing gets a shrug and is laid back', () => {
    for (const who of CUSTOMERS) {
      const taken = reaction(who, { ...base, ran: false })
      expect(taken.mood).toBe('shrug')
      expect(taken.act).toContain('lays-it-back')
    }
    expect(reaction('tortoise', { ...base, ran: false, popped: true }).mood).toBe('fright')
  })
})
