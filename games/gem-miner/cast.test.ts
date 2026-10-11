import { describe, expect, it } from 'vitest'
import { Cast, MAMMOTH_IDLES, MANNER, MOLE_IDLES, nextIdle, type Lodger } from './cast'
import { drawn, everyEvent, roomFor } from './fixtures'
import { Game, type Event } from './game'
import { BEASTS, COLS, indexOf } from './layout'
import { makeRng } from './rng'
import { layWorld, type DwellerKind } from './world'

// Who answers what, and how: each character's fixed tastes, as the numbers
// the view draws from.

const FRAME = 1 / 60
const at = { x: 0, y: 0 }

function castOf(...rows: string[]): { game: Game; cast: Cast } {
  const game = new Game(drawn(...rows))
  return { game, cast: new Cast(7, game) }
}
function steps(cast: Cast, game: Game, seconds: number, each?: () => void): void {
  for (let t = FRAME; t <= seconds + 1e-9; t += FRAME) { cast.step(FRAME, game); each?.() }
}
const breakOf = (kind: 'earth' | 'sandstone', index: number): Event => ({ type: 'break', kind, index, n: kind === 'earth' ? 1 : 3, aside: false, from: at })

describe('the mole', () => {
  it('twitches his nose when earth crumbles, and at nothing else', () => {
    const { game, cast } = castOf('@ee')
    cast.feed(breakOf('sandstone', 1), game)
    expect(cast.mole.nose).toBe(0)
    cast.feed(breakOf('earth', 1), game)
    expect(cast.mole.nose).toBe(1)
    steps(cast, game, 1)
    expect(cast.mole.nose).toBe(0)
    for (const event of everyEvent()) {
      if (event.type === 'break' && event.kind === 'earth') continue
      cast.feed(event, game)
      expect(cast.mole.nose, event.type).toBe(0)
    }
  })

  it('shakes the sting of granite out of his paws, and of nothing else', () => {
    const { game, cast } = castOf('@g')
    for (const event of everyEvent()) {
      if (event.type === 'clang') continue
      cast.feed(event, game)
      expect(cast.mole.sting, event.type).toBe(0)
    }
    cast.feed({ type: 'clang', index: 1, from: at }, game)
    expect(cast.mole.sting).toBe(1)
    expect(cast.mole.start).toBe(1)
    steps(cast, game, 1.2)
    expect(cast.mole.sting).toBe(0)
  })

  it('squashes harder the harder the thing: a step, a chip, a break, granite, his own seat', () => {
    const kick = (event: Event): number => {
      const { game, cast } = castOf('@ee')
      cast.feed(event, game)
      return cast.mole.squash.v
    }
    const step = kick({ type: 'step', node: 1, wade: false, slop: false })
    const chip = kick({ type: 'chip', kind: 'sandstone', index: 1, n: 1, aside: false, from: at })
    const broke = kick(breakOf('earth', 1))
    const clang = kick({ type: 'clang', index: 1, from: at })
    const sit = kick({ type: 'sit' })
    expect(step).toBeGreaterThan(0)
    expect(chip).toBeGreaterThan(step)
    expect(broke).toBeGreaterThan(chip)
    expect(clang).toBeGreaterThan(broke)
    expect(sit).toBeGreaterThan(clang)
  })

  it('does an idle move only at rest, and never the same one twice running', () => {
    const { game, cast } = castOf('@ee')
    const seen: string[] = []
    let last: string | null = null
    steps(cast, game, 90, () => {
      if (cast.mole.idle !== last && cast.mole.idle !== null) seen.push(cast.mole.idle)
      last = cast.mole.idle
    })
    expect(seen.length).toBeGreaterThan(8)
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
    expect(new Set(seen)).toEqual(new Set(MOLE_IDLES))
    // While a finger works him he does none.
    game.press({ x: 5 + 2.5 * 90, y: 190 + 45 })
    const busy: (string | null)[] = []
    for (let i = 0; i < 30; i++) { game.step(FRAME); cast.step(FRAME, game); busy.push(cast.mole.idle) }
    expect(busy.every((idle) => idle === null)).toBe(true)
  })
})

describe('the mammoth', () => {
  it('clamps its ears and rattles its tusks at a clang, a ring and a gong, and lets them go again', () => {
    for (const event of [{ type: 'clang', index: 20, from: at }, { type: 'ring', index: 20, n: 1, loose: false }, { type: 'gong', index: 20 }] as Event[]) {
      const { game, cast } = castOf('@g')
      cast.feed(event, game)
      expect(cast.mammoth.ear.to, event.type).toBe(-1)
      expect(cast.mammoth.rattle, event.type).toBe(1)
      steps(cast, game, 0.3)
      expect(cast.mammoth.ear.x, event.type).toBeLessThan(-0.3)
      steps(cast, game, 3)
      expect(cast.mammoth.rattle).toBe(0)
      expect(cast.mammoth.ear.to).toBe(0)
      expect(Math.abs(cast.mammoth.ear.x)).toBeLessThan(0.1)
    }
  })

  it('ties its trunk in a knot at every smell of gas, longest at a blast, and at nothing else', () => {
    const gas: Record<string, number> = { whoomph: 3, whistle: 2, fff: 1.2, charm: 0.7 }
    for (const event of everyEvent()) {
      const { game, cast } = castOf('@a')
      cast.feed(event, game)
      const knocked = event.type === 'knock' && event.kind === 'gas'
      expect(cast.mammoth.knot, event.type).toBe(knocked ? 0.9 : gas[event.type] ?? 0)
    }
    // A longer knot is not cut short by a shorter smell.
    const { game, cast } = castOf('@a')
    cast.feed({ type: 'whoomph', index: 1 }, game)
    cast.feed({ type: 'charm', index: 1 }, game)
    expect(cast.mammoth.knot).toBe(3)
    expect(cast.mammoth.fur).toBe(1)
    steps(cast, game, 3.1)
    expect(cast.mammoth.knot).toBe(0)
    expect(cast.mammoth.fur).toBe(0)
  })

  it('does no idle move of its own while its trunk is knotted', () => {
    const { game, cast } = castOf('@a')
    cast.feed({ type: 'whoomph', index: 1 }, game)
    const idles: (string | null)[] = []
    steps(cast, game, 2.9, () => idles.push(cast.mammoth.idle))
    expect(idles.every((idle) => idle === null)).toBe(true)
  })

  it('lifts the foot that stands over a blow: the hind foot over the first two columns, the fore foot over the next two', () => {
    const feet = (c: number, type: 'chip' | 'break'): { hind: number; fore: number } => {
      const { game, cast } = castOf('@ee')
      const index = indexOf(c, 2)
      cast.feed(type === 'chip' ? { type, kind: 'sandstone', index, n: 1, aside: false, from: at } : breakOf('earth', index), game)
      return { hind: cast.mammoth.hind.v, fore: cast.mammoth.fore.v }
    }
    for (const type of ['chip', 'break'] as const) {
      for (const c of [0, 1]) { expect(feet(c, type).hind).toBeGreaterThan(0); expect(feet(c, type).fore).toBe(0) }
      for (const c of [2, 3]) { expect(feet(c, type).fore).toBeGreaterThan(0); expect(feet(c, type).hind).toBe(0) }
      for (let c = 4; c < COLS; c++) expect(feet(c, type)).toEqual({ hind: 0, fore: 0 })
    }
    // The foot comes up and goes down again.
    const { game, cast } = castOf('@ee')
    cast.feed(breakOf('earth', indexOf(0, 2)), game)
    let high = 0
    steps(cast, game, 0.4, () => { high = Math.max(high, cast.mammoth.hind.x) })
    expect(high).toBeGreaterThan(0.1)
    steps(cast, game, 2)
    expect(Math.abs(cast.mammoth.hind.x)).toBeLessThan(0.02)
  })

  it('looks down between its legs at a break, and not at a chip', () => {
    const { game, cast } = castOf('@ee')
    cast.feed({ type: 'chip', kind: 'sandstone', index: 1, n: 1, aside: false, from: at }, game)
    expect(cast.mammoth.dip.to).toBe(0)
    cast.feed(breakOf('earth', 1), game)
    expect(cast.mammoth.dip.to).toBe(1)
    let low = 0
    steps(cast, game, 3, () => { low = Math.max(low, cast.mammoth.dip.x) })
    expect(low).toBeGreaterThan(0.9)
    expect(cast.mammoth.dip.to).toBe(0)
  })

  it('answers a finger with its trunk and its ears', () => {
    const { game, cast } = castOf('@ee')
    cast.feed({ type: 'poke', who: 'mammoth', index: 0 }, game)
    expect(cast.mammoth.trunk.to).toBe(1)
    expect(cast.mammoth.ear.to).toBe(1)
    steps(cast, game, 4)
    expect(cast.mammoth.trunk.to).toBe(0)
    expect(cast.mammoth.ear.to).toBe(0)
  })

  it('never does the same idle move twice running, and does them all', () => {
    const { game, cast } = castOf('@ee')
    const seen: string[] = []
    let last: string | null = null
    steps(cast, game, 150, () => {
      if (cast.mammoth.idle !== last && cast.mammoth.idle !== null) seen.push(cast.mammoth.idle)
      last = cast.mammoth.idle
    })
    expect(seen.length).toBeGreaterThan(12)
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
    expect(new Set(seen)).toEqual(new Set(MAMMOTH_IDLES))
  })
})

describe('picking an idle move', () => {
  it('never gives the one before, and gives every other', () => {
    const rng = makeRng(3)
    for (const count of [2, 3, 4]) {
      let last = -1
      const seen = new Set<number>()
      for (let i = 0; i < 400; i++) {
        const next = nextIdle(rng, count, last)
        expect(next).not.toBe(last)
        expect(next).toBeGreaterThanOrEqual(0)
        expect(next).toBeLessThan(count)
        seen.add(next)
        last = next
      }
      expect(seen.size).toBe(count)
    }
  })
})

describe('the dwellers', () => {
  const KINDS = Object.keys(MANNER) as DwellerKind[]
  const one = (kind: DwellerKind): { game: Game; cast: Cast; lodger: Lodger } => {
    const game = new Game(roomFor(kind))
    const cast = new Cast(7, game)
    const lodger = cast.lodgers.find((each) => each.kind === kind)!
    expect(lodger, kind).toBeDefined()
    return { game, cast, lodger }
  }

  it('are all there when the cave opens: nobody arrives on load', () => {
    for (const kind of KINDS) {
      const { cast } = one(kind)
      for (const lodger of cast.lodgers) { expect(lodger.here).toBe(1); expect(lodger.start.left).toBe(0) }
    }
  })

  it('flinch at a noise as far off as each kind hears, and no farther', () => {
    for (const kind of KINDS) {
      const hears = MANNER[kind].hears
      // A clang is the loudest thing in the hill: it carries four blocks.
      const reach = Math.min(4, hears)
      const near = one(kind)
      near.cast.feed({ type: 'clang', index: near.lodger.at + reach, from: at }, near.game)
      expect(near.lodger.flinch.to, kind).toBe(1)
      const far = one(kind)
      far.cast.feed({ type: 'clang', index: far.lodger.at + reach + 1, from: at }, far.game)
      expect(far.lodger.flinch.to, kind).toBe(0)
    }
  })

  it('flinch at a knock only from the next block, whatever their ears', () => {
    for (const kind of KINDS) {
      const beside = one(kind)
      beside.cast.feed({ type: 'knock', kind: 'earth', index: beside.lodger.at + 1, at }, beside.game)
      expect(beside.lodger.flinch.to, kind).toBe(1)
      const further = one(kind)
      further.cast.feed({ type: 'knock', kind: 'earth', index: further.lodger.at + 2, at }, further.game)
      expect(further.lodger.flinch.to, kind).toBe(0)
    }
  })

  it('let a flinch go again', () => {
    const { game, cast, lodger } = one('bat')
    cast.feed({ type: 'clang', index: lodger.at + 1, from: at }, game)
    let tight = 0
    steps(cast, game, 1.5, () => { tight = Math.max(tight, lodger.flinch.x) })
    expect(tight).toBeGreaterThan(0.8)
    expect(lodger.flinch.to).toBe(0)
    expect(Math.abs(lodger.flinch.x)).toBeLessThan(0.05)
  })

  it('each do their own start under a finger, for as long as their kind takes', () => {
    for (const kind of KINDS) {
      const { game, cast, lodger } = one(kind)
      cast.feed({ type: 'poke', who: kind, index: lodger.at }, game)
      expect(lodger.start.left, kind).toBe(MANNER[kind].start)
      steps(cast, game, MANNER[kind].start + 0.05)
      expect(lodger.start.left, kind).toBe(0)
    }
    // No two kinds keep the same time.
    const tempos = KINDS.map((kind) => Object.values(MANNER[kind]).join(' '))
    expect(new Set(tempos).size).toBe(KINDS.length)
  })

  it('take their idle moves in turn, a different one each time', () => {
    for (const kind of KINDS) {
      const { game, cast, lodger } = one(kind)
      const turns: number[] = []
      let was = 0
      steps(cast, game, 60, () => {
        if (lodger.idleBeat.left > was) turns.push(lodger.turn)
        was = lodger.idleBeat.left
      })
      expect(turns.length, kind).toBeGreaterThan(3)
      for (let i = 1; i < turns.length; i++) expect(turns[i], kind).not.toBe(turns[i - 1])
      expect(new Set(turns).size, kind).toBe(3)
    }
  })

  it('are blown off their place by a blast in their own shaft, and the others only flinch', () => {
    const { game, cast, lodger } = one('bat')
    cast.feed({ type: 'whoomph', index: lodger.at }, game)
    expect(lodger.blown).toBeGreaterThan(0)
    const other = one('bat')
    other.cast.feed({ type: 'whoomph', index: indexOf(10, 1) }, other.game)
    expect(other.lodger.blown).toBe(0)
    expect(other.lodger.flinch.to).toBe(1)
    // Blown off, it is not there to see until it comes back.
    steps(cast, game, 0.3)
    expect(lodger.shown).toBe(0)
    steps(cast, game, 2.2)
    expect(lodger.shown).toBe(1)
  })
})

describe('the worms in the undug hill', () => {
  const hill = (): { game: Game; cast: Cast } => {
    const game = new Game(layWorld(1, 'near'))
    return { game, cast: new Cast(7, game) }
  }

  it('look out of their earth when the cave opens', () => {
    const { game, cast } = hill()
    expect(game.worms.length).toBeGreaterThan(0)
    expect(cast.worms.map((worm) => worm.at)).toEqual(game.worms)
    for (const worm of cast.worms) expect(worm.out.x).toBe(1)
  })

  it('pull back in when their earth or the block beside it is knocked, and come out again in the quiet', () => {
    for (const aside of [0, 1]) {
      const { game, cast } = hill()
      const worm = cast.worms[cast.worms.length - 1]
      cast.feed({ type: 'knock', kind: 'earth', index: worm.at - aside, at }, game)
      steps(cast, game, 0.5)
      expect(worm.out.x).toBeLessThan(0.1)
      for (const other of cast.worms) if (other !== worm) expect(other.out.x).toBeGreaterThan(0.9)
      steps(cast, game, 2.5)
      expect(worm.out.x).toBeGreaterThan(0.9)
    }
  })

  it('are gone with their earth', () => {
    const { game, cast } = hill()
    const gone = game.worms[0]
    game.worms = game.worms.filter((index) => index !== gone)
    cast.step(FRAME, game)
    expect(cast.worms.some((worm) => worm.at === gone)).toBe(false)
  })
})

describe('the painted herd', () => {
  it('turns the head of the animal the mole stands under, and no other', () => {
    // The burrow is under the first of the three.
    const first = castOf('eeeeee@')
    steps(first.cast, first.game, 2)
    expect(first.cast.beasts.map((head) => Math.round(head.x))).toEqual([1, 0, 0])
    const far = castOf('@eeeeee')
    steps(far.cast, far.game, 2)
    expect(far.cast.beasts.map((head) => Math.round(head.x))).toEqual([0, 0, 0])
    const last = castOf('eeeeeeeeeee@')
    steps(last.cast, last.game, 2)
    expect(last.cast.beasts.map((head) => Math.round(head.x))).toEqual([0, 0, 1])
    expect(BEASTS).toHaveLength(3)
  })

  it('turns slowly, as paint would: not there in a tenth of a second, there in a second', () => {
    const { game, cast } = castOf('eeeeee@')
    steps(cast, game, 0.1)
    expect(cast.beasts[0].x).toBeLessThan(0.5)
    steps(cast, game, 0.9)
    expect(cast.beasts[0].x).toBeGreaterThan(0.9)
  })
})

describe('the lift and the lamp', () => {
  it('bounces the cage on its rope under a finger, and stills it', () => {
    const { game, cast } = castOf('@ee')
    cast.feed({ type: 'poke', who: 'lift', index: 0 }, game)
    let most = 0
    steps(cast, game, 0.3, () => { most = Math.max(most, Math.abs(cast.cage.x)) })
    expect(most).toBeGreaterThan(0.1)
    steps(cast, game, 3)
    expect(Math.abs(cast.cage.x)).toBeLessThan(0.01)
  })

  it('sets a hung lamp swinging when the mole ducks under it, once, and lets it swing long', () => {
    const { game, cast } = castOf('@ee')
    cast.step(FRAME, game)
    expect(cast.lamp.x).toBe(0)
    game.mole.duck = true
    cast.step(FRAME, game)
    const kicked = cast.lamp.v
    expect(Math.abs(kicked)).toBeGreaterThan(1)
    // Staying ducked does not push it again.
    cast.step(FRAME, game)
    expect(Math.abs(cast.lamp.v)).toBeLessThanOrEqual(Math.abs(kicked))
    let crossings = 0, was = Math.sign(cast.lamp.x)
    steps(cast, game, 3, () => { const now = Math.sign(cast.lamp.x); if (now !== was && now !== 0) { crossings += 1; was = now } })
    expect(crossings).toBeGreaterThanOrEqual(3)
  })
})

describe('nobody in the hill reacts to the child stopping', () => {
  it('lets a finger lift with no answer from anyone', () => {
    const game = new Game(roomFor('bat'))
    const cast = new Cast(7, game)
    game.press({ x: 5 + 6.5 * 90, y: 190 + 4.5 * 90 })
    for (let i = 0; i < 40; i++) { game.step(FRAME); for (const event of game.drain()) cast.feed(event, game); cast.step(FRAME, game) }
    steps(cast, game, 3)
    const before = JSON.stringify({ lodgers: cast.lodgers.map((lodger) => [lodger.start.left, lodger.flinch.to, lodger.blown]), mammoth: [cast.mammoth.ear.to, cast.mammoth.trunk.to, cast.mammoth.dip.to, cast.mammoth.knot], face: [cast.mole.start, cast.mole.sting] })
    game.release('drop', { x: 5 + 6.5 * 90, y: 190 + 4.5 * 90 })
    const events = game.drain()
    for (const event of events) cast.feed(event, game)
    const after = JSON.stringify({ lodgers: cast.lodgers.map((lodger) => [lodger.start.left, lodger.flinch.to, lodger.blown]), mammoth: [cast.mammoth.ear.to, cast.mammoth.trunk.to, cast.mammoth.dip.to, cast.mammoth.knot], face: [cast.mole.start, cast.mole.sting] })
    expect(after).toBe(before)
  })
})
