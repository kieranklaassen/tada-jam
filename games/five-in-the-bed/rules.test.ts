import { describe, expect, it } from 'vitest'
import { actOf, castOf, nameOf, still } from './acts'
import { BED, FIVE, makeBed, parting, resting, sideOf, type Side } from './bed'
import { advance, askers, deal, leap, makeGame, saveOf, wake, type Game } from './game'
import { hintFor } from './guide'
import { bottles, deal as dealMilk, fits, movesTo, straws } from './milk'
import { makeRng } from './rng'
import { deserialize, firstSaved, outcomeOf, serialize, settledSave, type Saved } from './save'
import { LADDER } from './config'

const partings = Array.from({ length: 32 }, (_, n) => Array.from({ length: FIVE }, (_, i): Side => ((n >> i) & 1 ? 'left' : 'right')))
const saved = (over: Partial<Saved> = {}): Saved => ({ ...firstSaved(4, 9), shown: ['ridge', 'worn'], ...over })
const free = (sides: Side[]): Saved => saved({ sides, milk: null, finished: true })
const run = (g: Game, s: number) => { for (let i = 0; i < s * 60; i++) advance(g, 1 / 60) }
const until = (g: Game, done: () => boolean, most = 20) => { for (let i = 0; i < most * 60 && !done(); i++) advance(g, 1 / 60); expect(done()).toBe(true) }

describe('milk', () => {
  it('is always five bottles, never dealt to fit, and always within reach', () => {
    const rng = makeRng(4)
    for (const p of partings) for (const position of LADDER) for (let i = 0; i < 12; i++) {
      const bed = makeBed(p), d = dealMilk(bed, position, rng)
      expect(d.milk).toHaveLength(FIVE)
      expect(fits(straws(bed, d.milk))).toBe(false)
      const moves = movesTo(bed, d.milk)
      expect(moves).toBeGreaterThan(0)
      if (position === 'next-door') expect(moves).toBe(1)
      if (position === 'whose-milk') for (const s of ['left', 'right'] as const) expect(d.milk.filter((b) => b.side === s).length).toBeGreaterThan(0)
      expect(d.quilt !== null).toBe(position === 'under-the-quilt')
      // Some parting drinks it.
      expect(partings.some((q) => fits(straws(makeBed(q), d.milk)))).toBe(true)
    }
  })
  it('joins one bottle to one sheep, and a misfit leaves as many straws as mouths', () => {
    for (const p of partings) for (let n = 0; n <= FIVE; n++) {
      const all = straws(makeBed(p), bottles(n))
      const who = all.filter((s) => s.who !== null).map((s) => s.who)
      expect(new Set(who).size).toBe(who.length)
      expect(fits(all)).toBe(p.filter((s) => s === 'left').length === n)
    }
  })
  it('keeps a straw with the sheep it has while that sheep stays', () => {
    const g = makeGame(saved())
    run(g, 0.5)
    const before = g.straws!.map((s) => s.who)
    const parts = parting(g.bed)
    leap(g, askers(g)[0])
    run(g, 0.3)
    for (const [i, who] of before.entries()) if (who !== null && parts.right.includes(who)) expect(g.straws![i].who).toBe(who)
  })
  it('gives the one that comes over its straw as it lands', () => {
    const g = makeGame(saved())
    run(g, 0.4)
    const who = askers(g)[0]
    leap(g, who)
    until(g, () => !g.bed.sheep[who].leap, 2)
    run(g, 0.05)
    expect(g.straws?.some((s) => s.who === who) || g.scene?.kind === 'milk').toBe(true)
  })
})

describe('the acts', () => {
  it('are sixteen, one for each way of parting', () => {
    const names = new Set(partings.map((p) => nameOf(castOf(parting(makeBed(p))))))
    expect(names.size).toBe(16)
  })
  it('end as they began, with nobody left in the air, and every number is one', () => {
    for (const p of partings) {
      const cast = castOf(parting(makeBed(p))), act = actOf(cast)
      const at = cast.map((_, i) => ({ x: 300 + i * 132, y: 400 }))
      for (const [n] of cast.entries()) {
        expect(act.pose(act.lasts, n).lift).toBeLessThan(1)
        for (let t = 0; t <= act.lasts; t += 1 / 30) {
          for (const v of Object.values(act.pose(t, n))) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true)
          expect(act.pose(t, n).lift).toBeGreaterThanOrEqual(-0.01)
          expect(act.pose(t, n).lift).toBeLessThan(145)
        }
      }
      for (let t = 0; t <= act.lasts; t += 1 / 30) for (const x of act.props(t, at)) expect([x.x, x.y, x.size, x.turn, x.alpha].every(Number.isFinite)).toBe(true)
      for (const c of act.cues) { expect(c.at).toBeLessThan(act.lasts); expect(c.who).toBeLessThan(cast.length) }
      expect(act.cues.length).toBeGreaterThan(0)
    }
    expect(still().lift).toBe(0)
  })
  it('puts one on for a new parting, not for the old one, and lasts four to ten seconds', () => {
    const g = makeGame(free(['left', 'left', 'right', 'right', 'right']))
    run(g, 2)
    expect(g.scene).toBe(null)
    leap(g, 0)
    until(g, () => g.scene?.kind === 'act', 6)
    let t = 0
    while (g.scene && t < 12) { advance(g, 1 / 60); t += 1 / 60 }
    expect(t).toBeGreaterThan(3.9)
    expect(t).toBeLessThan(10)
  })
  it('brings the dog into the empty half, until a touch', () => {
    const g = makeGame(free(['left', 'left', 'left', 'left', 'right']))
    leap(g, 4)
    until(g, () => g.dogIn === 'right', 14)
    wake(g)
    expect(g.dogIn).toBe(null)
  })
})

describe('a cycle', () => {
  it('opens with one thirsty and one spare straw, one tap from fitting', () => {
    const g = makeGame(saved())
    run(g, 0.5)
    expect(askers(g)).toHaveLength(1)
    expect(g.straws!.filter((s) => s.who === null)).toHaveLength(1)
    expect(hintFor(g)).not.toBe(null)
    leap(g, askers(g)[0])
    until(g, () => g.scene?.kind === 'milk', 5)
    expect(g.save.milk).toBe(null)
    expect(g.save.position).toBe('further')
    let t = 0
    while (g.scene && t < 14) { advance(g, 1 / 60); t += 1 / 60 }
    expect(t).toBeGreaterThan(7)
    expect(t).toBeLessThanOrEqual(10)
    expect(g.asleep).toBe(true)
    run(g, 30)
    // Nothing comes until the child touches the dog.
    expect(g.save.milk).toBe(null)
    expect(hintFor(g)!.at.x).toBeLessThan(BED.left)
    wake(g)
    expect(deal(g)).toBe(true)
    expect(g.save.milk).toHaveLength(FIVE)
  })
  it('shows the way over once, gives nothing away by it, and can be cut short', () => {
    for (const cut of [0, 0.8, 1.2, 2, 3]) {
      const g = makeGame(firstSaved(4, 2))
      const before = g.bed.sheep.map((s) => sideOf(s.x))
      until(g, () => g.scene?.kind === 'show', 6)
      expect(g.save.shown).toContain('ridge')
      let fitted = false
      if (cut) { run(g, cut); expect(saveOf(g).sides).toEqual(before); wake(g); run(g, 0.1); until(g, () => resting(g.bed), 6) }
      else for (let i = 0; i < 480; i++) { advance(g, 1 / 60); if (g.scene && g.scene.kind === 'milk') fitted = true }
      expect(fitted).toBe(false)
      expect(g.bed.sheep.map((s) => sideOf(s.x))).toEqual(before)
      expect(g.save.misfits).toBe(0)
    }
  })
  it('steps up, stays and steps down', () => {
    expect(outcomeOf(1, 1)).toBe('well')
    expect(outcomeOf(2, 1)).toBe('well')
    expect(outcomeOf(5, 1)).toBe('mixed')
    expect(outcomeOf(7, 1)).toBe('badly')
  })
  it('never stops a random child, and never loses a sheep or a bottle', () => {
    const rng = makeRng(12)
    for (const position of LADDER) {
      const g = makeGame(saved({ position, milk: null, finished: true }))
      let drunk = 0
      for (let i = 0; i < 160; i++) {
        wake(g)
        if (!g.save.milk) deal(g)
        else leap(g, Math.floor(rng.next() * FIVE))
        run(g, 2.6)
        if (g.scene?.kind === 'milk') { drunk++; run(g, 10) }
        expect(parting(g.bed).left.length + parting(g.bed).right.length).toBe(FIVE)
        if (g.save.milk) expect(g.save.milk).toHaveLength(FIVE)
        g.events.length = 0
      }
      expect(drunk).toBeGreaterThan(2)
    }
  })
})

describe('the save', () => {
  it('holds the rest it would come to, and opens as left', () => {
    for (const p of partings) {
      const s = settledSave(saved({ sides: p, milk: bottles(2), quilt: 'left' }))
      const back = deserialize(JSON.parse(JSON.stringify(serialize(s))), 4, 1)
      expect(back).toEqual(serialize(s))
      const g = makeGame(back)
      run(g, 3)
      expect(g.scene).toBe(null)
      expect(saveOf(g)).toEqual({ ...back, stream: g.rng.state })
    }
  })
  it('survives anything', () => {
    for (const raw of [null, 3, 'x', [], {}, { v: 1 }, { v: 2 }, { v: 1, sides: ['left'], milk: 4, quilt: 9, shown: 'no', misfits: -2, needed: 1e9, stream: 'a' }, { v: 1, sides: ['left', 'left', 'left', 'left', 'up'], milk: [{ side: 'left', owner: 9 }, {}, 1, 2, 3] }, { v: 1, sides: ['left', 'left', 'left', 'left', 'left'], milk: [0, 1, 2, 3, 4].map((i) => ({ side: i < 3 ? 'left' : 'right', owner: i })) }]) {
      const s = deserialize(raw, null, 5)
      const g = makeGame(s)
      run(g, 1)
      expect(g.bed.sheep).toHaveLength(FIVE)
      expect(JSON.stringify(serialize(saveOf(g))).length).toBeLessThan(2000)
    }
  })
  it('starts by age and keeps a saved place', () => {
    expect(firstSaved(null, 1).position).toBe('next-door')
    expect(firstSaved(4, 1).position).toBe('next-door')
    expect(firstSaved(9, 1).position).toBe('further')
    expect(deserialize(serialize(saved({ position: 'whose-milk' })), 3, 1).position).toBe('whose-milk')
  })
})

describe('how many have to move', () => {
  it('is the fewest over all partings that fit, for every deal at every position', () => {
    const sidesOf = (m: number): Side[] => Array.from({ length: FIVE }, (_, i) => ((m >> i) & 1 ? 'left' : 'right'))
    const apart = (a: number, b: number) => [0, 1, 2, 3, 4].filter((i) => ((a ^ b) >> i) & 1).length
    for (const position of LADDER) for (let m = 0; m < 32; m++) for (let seed = 1; seed < 9; seed++) {
      const { milk } = dealMilk(makeBed(sidesOf(m)), position, makeRng(seed))
      const fewest = Math.min(...Array.from({ length: 32 }, (_, to) => to).filter((to) => fits(straws(makeBed(sidesOf(to)), milk))).map((to) => apart(m, to)))
      expect(movesTo(makeBed(sidesOf(m)), milk)).toBe(fewest)
      expect(fewest).toBeGreaterThan(0)
    }
  })
})
