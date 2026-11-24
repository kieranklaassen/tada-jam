import { describe, expect, it } from 'vitest'
import { GROUND, HEN, PAIRS, PUDDLE, SCENERY, SIZE, SQUAT, THINGS, apart, fromPuddle, scaleAt, type BroodId, type ThingKey } from './layout'
import { ringOf } from './lineage'
import { REGRAB_PX } from './play'
import { deserialize, freshState, serialize } from './save'
import { Hand, state } from './testing'
import { hides, type Body } from './yard'

// Everything here goes the way the Mount goes: fingers by pixel, and time.

const chicks = (root: ThingKey | 'hen') => state((s) => { s.brood.forEach((b, i) => { b.kind = 'chick'; b.mother = i === 0 ? root : (`c${i - 1}` as BroodId) }) })
const ring = (n: number) => state((s) => { s.brood.forEach((b, i) => { if (i < n) { b.kind = 'chick'; b.mother = `c${(i + 1) % n}` as BroodId } }) })
const names = (h: Hand) => h.yard.sounds.map((s) => s.name)
const loaded = (h: Hand) => deserialize(JSON.parse(JSON.stringify(serialize(h.yard.toState()))), null)

describe('an egg takes whatever stands nearest for its mother', () => {
  it('answers the landing finger in the same frame, and opens on the lift', () => {
    const h = new Hand()
    const p = h.where('c0')
    h.play.down(1, p.x, p.y)
    expect(names(h)).toContain('press.egg')
    expect(h.yard.one('c0')!.opening).toBeNull()
    h.play.up(1, p.x, p.y)
    expect(h.yard.one('c0')!.opening).toBe(0)
  })
  it('meets a different mother for each of the first three eggs, by tapping alone', () => {
    const h = new Hand(freshState(null))
    for (const id of ['c0', 'c1', 'c2'] as const) { h.tap(id); h.run(4) }
    const mothers = h.yard.brood.map((c) => c.mother)
    expect(new Set(mothers).size).toBe(3)
  })
  it('can be changed until the eyes land, and not after', () => {
    const h = new Hand(state((s) => { s.things.bell.x = 110; s.things.bell.y = 430 }))
    const egg = h.where('c2')
    h.tap('c2')
    h.drag('boot', { x: egg.x - 90, y: egg.y - 10 }, 8)
    h.run(2)
    expect(h.yard.one('c2')!.mother).toBe('boot')
  })
  it('takes the thing it sits in, and a ring closes when eggs see eggs', () => {
    const h = new Hand()
    h.drag('c0', h.where('boot'))
    expect(h.yard.one('c0')!.host).toBe('boot')
    h.tapAt(h.where('c0'))
    h.run(3)
    expect(h.yard.one('c0')!.mother).toBe('boot')
    const r = new Hand(state((s) => { s.brood.splice(2); s.brood[0].x = 500; s.brood[0].y = 600; s.brood[1].x = 592; s.brood[1].y = 600 }))
    r.tap('c0'); r.run(0.2); r.tap('c1'); r.run(4)
    expect(ringOf('c0', r.yard.mothers)).not.toBeNull()
  })
  it('by the puddle belongs to itself', () => {
    const h = new Hand()
    h.drag('c2', { x: PUDDLE.x, y: PUDDLE.y - 60 })
    h.tap('c2'); h.run(3)
    expect(h.yard.one('c2')!.mother).toBe('c2')
  })
})

describe('chicks follow, and what a mother does runs down the chain', () => {
  it('goes after its mother wherever she is put', () => {
    const h = new Hand(chicks('boot'))
    h.run(6)
    h.drag('boot', { x: 820, y: 520 })
    h.run(7)
    expect(apart(h.yard.one('c0')!, h.yard.things.boot)).toBeLessThan(260)
    expect(apart(h.yard.one('c1')!, h.yard.one('c0')!)).toBeLessThan(220)
  })
  it('copies the act one beat later at each step', () => {
    const h = new Hand(chicks('boot'))
    h.run(5)
    h.tap('boot')
    expect(h.yard.one('c0')!.act?.name).not.toBe('bootStomp')
    h.run(0.45)
    expect(h.yard.one('c0')!.act?.name).toBe('bootStomp')
    expect(h.yard.one('c1')!.act?.name).not.toBe('bootStomp')
    h.run(0.42)
    expect(h.yard.one('c1')!.act?.name).toBe('bootStomp')
  })
  it('runs all the way through a ring without going round for ever', () => {
    const h = new Hand(ring(3))
    h.run(2)
    h.tap('c1'); h.run(0.2)
    h.yard.perform(h.yard.one('c0')!, 'chickHop')
    h.yard.sounds = []
    h.run(6)
    expect(names(h).filter((n) => n.startsWith('cry')).length).toBeLessThan(6)
  })
  it('turns until nudged, sits, and turns again', () => {
    const h = new Hand(ring(3))
    h.run(3)
    const a = { ...h.yard.one('c0')! }
    h.run(0.5)
    expect(Math.hypot(h.yard.one('c0')!.x - a.x, h.yard.one('c0')!.y - a.y)).toBeGreaterThan(10)
    h.run(20)
    h.yard.sounds = []
    h.run(6)
    expect(names(h).filter((n) => !n.startsWith('egg'))).toEqual([])
    h.tap('c0')
    expect(h.yard.brood.slice(0, 3).every((c) => c.dizzy)).toBe(true)
    h.run(2)
    const b = { ...h.yard.one('c0')! }
    h.run(1)
    expect(Math.hypot(h.yard.one('c0')!.x - b.x, h.yard.one('c0')!.y - b.y)).toBeLessThan(6)
    expect(loaded(h).brood[0].dizzy).toBe(true)
    h.tap('c1')
    expect(h.yard.brood.slice(0, 3).some((c) => c.dizzy)).toBe(false)
  })
  it('plays the round when five belong to the thing that is tapped, and any touch ends it', () => {
    const h = new Hand(chicks('bell'))
    h.run(6); h.tap('bell'); h.yard.sounds = []
    h.run(6)
    expect(names(h)).toContain('round.cow')
    const g = new Hand(chicks('bell'))
    g.run(6); g.tap('bell'); g.run(1.2); g.tapAt({ x: 40, y: 800 }); g.yard.sounds = []
    g.run(6)
    expect(names(g)).not.toContain('round.cow')
  })
})

describe('the hen', () => {
  it('makes an egg of a chick set on her, and followers keep it', () => {
    const h = new Hand(chicks('boot'))
    h.run(4)
    h.drag('c1', { x: HEN.x, y: HEN.y - 100 })
    expect(h.yard.one('c1')!.kind).toBe('egg')
    expect(loaded(h).brood[1]).toMatchObject({ kind: 'egg', mother: null })
    expect(h.yard.one('c2')!.mother).toBe('c1')
    h.run(3)
    expect(h.yard.one('c1')!.tucking).toBeNull()
  })
  it('lifts a wing, takes the first chick tapped, and one tap brings it out again', () => {
    const h = new Hand(chicks('pig'))
    h.run(6)
    h.tap('hen'); h.run(0.4)
    expect(h.yard.wing).toBeGreaterThan(4)
    h.tap('c2')
    expect(h.yard.one('c2')!.kind).toBe('egg')
    h.run(0.5); h.tap('c3')
    expect(h.yard.one('c3')!.kind).toBe('chick')
    h.run(0.5); h.tap('hen')
    expect(h.yard.one('c2')).toMatchObject({ kind: 'chick', mother: 'c1' })
  })
  it('lays while there are fewer than five, saved at once', () => {
    const h = new Hand(freshState(2))
    h.tap('hen')
    expect(loaded(h).brood.length).toBe(4)
    h.run(2); h.tap('hen'); h.run(2); h.tap('hen'); h.run(2)
    expect(h.yard.brood.length).toBe(5)
  })
  it('has a piece of her own with each thing, and gives it back on free ground', () => {
    const seen = new Set<string>()
    for (const k of THINGS) {
      const h = new Hand()
      h.drag(k, { x: HEN.x, y: HEN.y - 90 })
      seen.add(h.yard.hen.act!.name)
      h.run(4)
      const b = h.yard.things[k]
      expect(apart(b, HEN)).toBeGreaterThanOrEqual(SIZE.hen.r + SIZE[k].r - 1)
    }
    expect(seen.size).toBe(6)
  })
})

describe('where the game puts things', () => {
  it('hides the middle of nothing', () => {
    const h = new Hand(freshState(5))
    for (const k of THINGS) { h.drag(k, { x: HEN.x, y: HEN.y - 90 }); h.run(4) }
    const all = [...THINGS.map((k) => h.yard.things[k]), h.yard.hen, ...h.yard.brood]
    for (const k of THINGS) for (const o of all) if (o.id !== k) expect(hides(h.yard.things[k], h.yard.things[k], o, o), `${k} before ${o.id}`).toBe(false)
  })
})

describe('things', () => {
  it('do something of their own for each of the fifteen pairs', () => {
    const seen = new Set<string>()
    for (const [a, b] of PAIRS) {
      const h = new Hand(state((s) => { s.brood = s.brood.slice(0, 1); for (const k of THINGS) { s.things[k].x = k === b ? 500 : 1080 - THINGS.indexOf(k) * 4; s.things[k].y = k === b ? 600 : 738 } s.brood[0].x = 100; s.brood[0].y = 430 }))
      const gap = SIZE[a].r + SIZE[b].r + 6
      h.yard.things[a].x = 240
      h.yard.things[a].y = 500
      const half = SIZE[a].h * 0.48
      h.drag(a, { x: 500 - gap, y: 600 - half - 34 })
      const said = names(h).filter((n) => n.startsWith('pair.'))
      expect(said.length, `${a} ${b}`).toBeGreaterThan(0)
      seen.add(said[0])
    }
    expect(seen.size).toBe(15)
  })
  it('come to rest on free ground in the yard, whatever the child does for a long time', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const h = new Hand(chicks(THINGS[seed - 1]), seed)
      let r = seed * 7919
      const next = (n: number) => { r = (r * 1103515245 + 12345) % 2147483648; return r % n }
      for (let i = 0; i < 60; i++) {
        const ids = [...THINGS, 'hen' as const, ...h.yard.brood.map((b) => b.id)]
        const id = ids[next(ids.length)]
        if (next(2)) h.drag(id, { x: next(1180), y: next(820) }, 5)
        else h.tap(id)
        h.run(next(20) / 10)
      }
      h.run(8)
      const solid = THINGS.map((k) => h.yard.things[k])
      for (const b of solid) {
        expect(b.x).toBeGreaterThanOrEqual(GROUND.left); expect(b.x).toBeLessThanOrEqual(GROUND.right)
        expect(b.y).toBeGreaterThanOrEqual(GROUND.top); expect(b.y).toBeLessThanOrEqual(GROUND.bottom)
        for (const o of [...solid, h.yard.hen]) if (o !== b) expect(apart(b, o), `${b.id} in ${o.id}, seed ${seed}`).toBeGreaterThan(SIZE[b.kind].r + SIZE[o.kind].r - 3)
      }
      for (const c of h.yard.brood) if (!c.host) for (const o of [...solid, h.yard.hen]) expect(apart(c, o), `${c.id} in ${o.id}, seed ${seed}`).toBeGreaterThan(SIZE.chick.r + SIZE[o.kind].r - 18)
    }
  })
})

describe('a ring of three', () => {
  it('closes by opening the last egg on the first chick', () => {
    const h = new Hand(state((s) => { s.brood.splice(3); s.brood.forEach((b, i) => { b.x = 480 + i * 96; b.y = 600 }); s.brood[1].mother = 'c2'; s.brood[1].kind = 'chick'; s.brood[0].mother = 'c1'; s.brood[0].kind = 'chick'; s.brood[2].host = 'c0' }))
    h.run(1); h.tap('c2'); h.run(3)
    expect(ringOf('c2', h.yard.mothers)?.length).toBe(3)
    // Nobody taps anything more: they are off one another's heads and it turns.
    expect(h.yard.one('c2')!.host).toBeNull()
    h.run(2)
    const p = { ...h.yard.one('c0')! }
    h.run(0.4)
    expect(Math.hypot(h.yard.one('c0')!.x - p.x, h.yard.one('c0')!.y - p.y)).toBeGreaterThan(4)
  })
})

describe('the idle chicks stay in sight', () => {
  it('a chick by its mother is not hidden by her, wherever she stands', () => {
    for (const k of THINGS) {
      const h = new Hand(chicks(k))
      h.run(10)
      const m = h.yard.things[k]
      for (const c of h.yard.brood) expect(hides(m, m, c, c), `${c.id} behind ${k}`).toBe(false)
    }
  })
})

describe('riding', () => {
  it('stacks a tower of chicks, and a tap brings one down', () => {
    const h = new Hand(chicks('bell'))
    h.run(5)
    h.drag('c3', h.where('c2')); h.run(3)
    expect(h.yard.one('c3')!.host).toMatch(/^c/)
    h.drag('c4', h.where('c3')); h.run(0.6)
    expect(h.yard.one('c4')!.host).toBe('c3')
    h.tap('c4'); h.run(1)
    expect(h.yard.one('c4')!.host).toBeNull()
  })
  it('the teapot pours its chick out', () => {
    const h = new Hand(chicks('bell'))
    h.run(5); h.drag('c4', h.where('teapot')); h.run(0.6)
    expect(h.yard.one('c4')!.host).toBe('teapot')
    h.tap('teapot')
    expect(h.yard.one('c4')!.host).toBeNull()
  })
})

describe('touch', () => {
  it('a slipped tap is a tap', () => {
    const h = new Hand(); const p = h.where('boot')
    h.play.down(1, p.x, p.y); h.play.move(1, p.x + 10, p.y + 6); h.play.up(1, p.x + 10, p.y + 6)
    expect(names(h)).toContain('tap.boot')
    const g = new Hand()
    g.play.down(1, p.x, p.y); g.play.move(1, p.x + 24, p.y); g.run(0.1); g.play.up(1, p.x + 24, p.y)
    expect(names(g)).toContain('tap.boot')
  })
  it('a carry survives a short lift of the finger', () => {
    const h = new Hand(); const p = h.lift('boot')
    h.play.move(1, p.x + 200, p.y); h.run(0.5); h.play.up(1, p.x + 200, p.y); h.run(0.15)
    expect(h.yard.carry?.id).toBe('boot')
    h.play.down(2, p.x + 200 + REGRAB_PX - 10, p.y); h.run(1)
    expect(h.yard.carry?.id).toBe('boot')
    h.play.up(2, p.x + 300, p.y); h.run(0.5)
    expect(h.yard.carry).toBeNull()
  })
  it('a finger that is taken away puts the thing back', () => {
    const h = new Hand(); const was = { ...h.yard.things.pig }
    const p = h.lift('pig'); h.play.move(1, p.x - 200, p.y + 100); h.run(0.5); h.play.cancel(1)
    expect(h.yard.things.pig).toMatchObject({ x: was.x, y: was.y, dir: was.dir })
  })
  it('a second finger takes nothing and gets an answer; a resting one hands over', () => {
    const h = new Hand(); h.lift('boot'); h.run(2)
    const p = h.where('teapot'); h.play.down(2, p.x, p.y); h.play.up(2, p.x, p.y)
    expect(names(h)).toContain('dab'); expect(names(h)).not.toContain('tap.teapot')
    const g = new Hand(); g.play.down(1, 30, 806); g.run(0.2); const q = g.where('teapot'); g.play.down(2, q.x, q.y); g.play.up(2, q.x, q.y)
    expect(names(g)).toContain('tap.teapot')
    const r = new Hand(); const b = r.where('bell'); r.play.down(1, b.x, b.y); r.run(1.2); r.play.down(2, q.x, q.y); r.play.up(2, q.x, q.y)
    expect(names(r)).toContain('tap.teapot')
  })
  it('the grown-up corner is answered with a pat and takes nothing', () => {
    const h = new Hand(); h.play.down(1, 1170, 10)
    expect(names(h)).toEqual(['press.ground']); expect(h.play.active).toBe(false)
  })
  it('every scenery that looks touchable answers', () => {
    const h = new Hand(); const heard = new Set<string>()
    for (const s of Object.values(SCENERY)) { h.yard.sounds = []; h.tapAt(s); heard.add(names(h).pop()!) }
    expect(heard.size).toBe(7)
  })
  it('every loose thing, the hen and every egg can be reached at its middle on a first visit', () => {
    const h = new Hand()
    for (const id of [...THINGS, 'hen', 'c0', 'c1', 'c2', 'c3', 'c4'] as const) expect(h.yard.at(h.where(id))).toEqual({ kind: 'body', id })
  })
})

describe('put away at any moment', () => {
  it('an opening egg is a chick with the mother it saw last', () => {
    const h = new Hand(); const near = h.yard.nearest(h.yard.one('c0')!)
    h.tap('c0'); h.run(0.3)
    expect(loaded(h).brood[0]).toMatchObject({ kind: 'chick', mother: near })
    h.play.park()
    expect(h.yard.one('c0')).toMatchObject({ kind: 'chick', mother: near, opening: null })
  })
  it('a thing still under the finger goes back; one let go lands where it hung', () => {
    const h = new Hand(); const was = { ...h.yard.things.boot }; const p = h.lift('boot'); h.play.move(1, p.x + 300, p.y)
    expect(loaded(h).things.boot.x).toBeCloseTo(was.x, 0)
    h.play.park()
    expect(h.yard.things.boot.x).toBe(was.x)
    const g = new Hand(); g.lift('boot'); g.play.move(1, p.x + 300, p.y); g.run(0.5); g.play.up(1, p.x + 300, p.y); g.play.park()
    expect(g.yard.things.boot.x).toBeGreaterThan(was.x + 120)
  })
  it('a round trip changes nothing', () => {
    const h = new Hand(ring(3)); h.run(4); h.drag('c4', h.where('pig')); h.run(2)
    const once = loaded(h)
    expect(new Hand(once).yard.toState()).toEqual(once)
  })
  it('a rolling ball is saved where it will stop', () => {
    const h = new Hand(); h.tap('ball')
    const to = h.yard.things.ball.go!
    expect(loaded(h).things.ball.x).toBeCloseTo(to.x, 0)
  })
})
void SQUAT

describe('what a second reading found', () => {
  it('a chick let go where it would be drawn sitting sits there', () => {
    for (const k of THINGS) {
      const h = new Hand(state((s) => { s.brood.splice(1); s.brood[0].kind = 'chick'; s.brood[0].mother = 'hen' })); h.run(6)
      const c = h.yard.one('c0')!, b = h.yard.things[k], keep = c.host
      c.host = k; const to = h.yard.middle(c); c.host = keep
      h.drag('c0', to)
      expect(h.yard.one('c0')!.host, k).toBe(k)
      expect(b.id).toBe(k)
    }
  })
  it('an egg let go on an egg that rides knocks with it', () => {
    const h = new Hand(state((s) => { s.brood[0].host = 'pig' })); h.run(0.5)
    h.yard.sounds = []
    h.drag('c1', h.where('c0'))
    expect(names(h)).toContain('egg.tok'); expect(h.yard.one('c0')!.act?.name).toBe('eggTok'); expect(h.yard.one('c1')!.host).toBeNull()
  })
  it('a ball sent out of the puddle is not wet on dry ground', () => {
    const h = new Hand(); h.drag('boot', { x: 720, y: 600 }); h.run(1); h.drag('ball', { x: 830, y: 610 }); h.run(1)
    let wetAt = fromPuddle(h.yard.things.ball)
    for (let i = 0; i < 300; i++) { h.yard.sounds = []; h.run(1 / 60); if (names(h).includes('wet.ball')) wetAt = fromPuddle(h.yard.things.ball) }
    expect(wetAt).toBeLessThan(12)
  })
  it('the one under her wing comes out again on what it rode', () => {
    const h = new Hand(state((s) => s.brood.forEach((b, i) => { b.kind = 'chick'; b.mother = 'pig'; if (!i) b.host = 'pig' }))); h.run(5)
    h.tap('hen'); h.run(0.5); h.tap('c0'); h.run(0.8); h.tap('hen'); h.run(1)
    expect(h.yard.one('c0')!.kind).toBe('chick'); expect(h.yard.one('c0')!.host).toBe('pig')
  })
  it('a second thing set on her sends the first hopping down', () => {
    const h = new Hand(); h.drag('boot', { x: HEN.x, y: HEN.y - 90 }); h.run(0.5)
    const was = h.yard.place(h.yard.things.boot)
    h.lift('bell'); h.play.move(1, HEN.x, HEN.y - 90); h.play.up(1, HEN.x, HEN.y - 90); h.run(0.36)
    const now = h.yard.place(h.yard.things.boot)
    expect(Math.hypot(now.x - was.x, now.y - now.z - was.y + was.z)).toBeLessThan(90)
  })
})

describe('what the code review found', () => {
  it('a chick does not run after the mother on its own head', () => {
    const h = new Hand(state((s) => { s.brood[0] = { ...s.brood[0], kind: 'chick', mother: 'c1' }; s.brood[1] = { ...s.brood[1], kind: 'chick', mother: 'c0', host: 'c0' } }))
    h.run(4)
    const p = { x: h.yard.one('c0')!.x, y: h.yard.one('c0')!.y }
    h.run(3)
    expect(apart(h.yard.one('c0')!, p)).toBeLessThan(2); expect(h.yard.one('c0')!.going).toBeLessThan(0.1)
  })
  it('a yard nobody touched is not written when it is put away', () => {
    const h = new Hand(); h.run(2); h.play.park()
    expect(h.yard.changed).toBe('no')
    h.tapAt({ x: 600, y: 600 }); h.yard.changed = 'no'; h.play.park()
    expect(h.yard.changed).toBe('now')
  })
  it('springs stay small however long the frames are', () => {
    const h = new Hand(); h.tap('pig')
    for (let i = 0; i < 300; i++) h.yard.step(0.1)
    expect(Math.abs(h.yard.things.pig.squash)).toBeLessThan(0.5)
  })
  it('an egg the child set in the boot comes out again beside it', () => {
    const h = new Hand(chicks('pig')); h.run(5)
    h.tap('hen'); h.run(0.4); h.tap('c4'); h.run(2.2)
    h.drag('c4', h.where('boot'))
    expect(h.yard.one('c4')!.host).toBe('boot')
    h.tap('hen'); h.run(1)
    expect(h.yard.one('c4')!.kind).toBe('chick'); expect(h.yard.one('c4')!.host).toBeNull()
  })
  it('the hen stops her half when the thing is pulled away', () => {
    const h = new Hand(); h.drag('teapot', { x: HEN.x, y: HEN.y - 90 }); h.run(0.8)
    h.lift('teapot')
    expect(h.yard.hen.act?.name).not.toBe('henLaunched')
  })
})

describe('what a third reading found', () => {
  it('a thing held by is not taken for a mother until it is let go', () => {
    const at = { x: 500, y: 600 }
    const go = (drop: boolean) => {
      const h = new Hand(state((s) => { s.brood.splice(1); Object.assign(s.brood[0], at) }))
      h.tap('c0'); h.lift('boot'); h.play.move(1, at.x + 60, at.y - 100)
      if (drop) h.play.up(1, at.x + 60, at.y - 100)
      h.run(2)
      return h.yard.one('c0')!.mother
    }
    expect(go(false)).not.toBe('boot'); expect(go(true)).toBe('boot')
  })
  it('put away with a thing in the hand, the egg has the mother that stands by it once the thing is back', () => {
    const h = new Hand(state((s) => { s.brood.splice(1) }))
    h.tap('c0'); h.run(0.3); h.lift('c0'); h.play.move(1, 1000, 620)
    const saved = h.yard.toState().brood[0].mother
    h.play.park()
    expect(h.yard.one('c0')!.mother).toBe(saved); expect(saved).not.toBe('ball')
  })
  it('a second chick carried to her leaves her wing up for the first', () => {
    const h = new Hand(chicks('pig')); h.run(5)
    h.tap('hen'); h.run(0.4); h.tap('c4'); h.run(2)
    h.drag('c3', { x: HEN.x, y: HEN.y - 90 }); h.run(1)
    h.tap('hen'); h.run(0.6)
    expect(h.yard.one('c4')!.kind).toBe('chick'); expect(h.yard.one('c3')!.kind).toBe('egg')
  })
  it('chicks do what their mother egg does when it opens', () => {
    const h = new Hand(state((s) => { s.brood[1].kind = 'chick'; s.brood[1].mother = 'c0' })); h.run(4)
    h.tap('c0'); let copied = false
    for (let i = 0; i < 60; i++) { h.run(1 / 60); if (h.yard.one('c1')!.act?.name === 'eggSquash') copied = true }
    expect(copied).toBe(true)
  })
  it('what walks, rolls, is kicked, is laid or follows rests in front of the middle of nothing', () => {
    const clear = (h: Hand, moved: Body[], seed: string) => {
      const all = [...THINGS.map((k) => h.yard.things[k]), h.yard.hen, ...h.yard.brood.filter((b) => !b.host)]
      for (const m of moved) {
        for (const o of all) if (o !== m) expect(hides(m, m, o, o), `${m.id} before ${o.id}, ${seed}`).toBe(false)
        const s = scaleAt(m.y), my = m.y - SIZE[m.kind].h * 0.48 * s
        for (const [k, q] of [['puddle', PUDDLE], ...Object.entries(SCENERY).filter(([n]) => n !== 'fence')] as [string, { x: number; y: number }][]) expect(Math.hypot((q.x - m.x) / (SIZE[m.kind].w * 0.36 * s), (q.y - my) / (SIZE[m.kind].h * 0.38 * s)), `${m.id} before ${k}, ${seed}`).toBeGreaterThan(1)
      }
    }
    for (const k of THINGS) {
      const h = new Hand(state((s) => s.brood.splice(3)))
      for (let i = 0; i < 12; i++) { h.yard.tap({ kind: 'body', id: k }); h.run(3); clear(h, h.yard.things[k].go ? [] : [h.yard.things[k]], `tap ${i}`) }
      h.tap('hen'); h.run(3); h.tap('hen'); h.run(3)
      clear(h, h.yard.brood.slice(3), 'laid')
      const f = new Hand(state((s) => s.brood.forEach((b) => { b.kind = 'chick'; b.mother = k })))
      f.run(10); for (let i = 0; i < 5; i++) { f.yard.tap({ kind: 'body', id: k }); f.run(8); clear(f, f.yard.brood, `followers of ${k}, ${i}`) }
    }
    for (const by of ['boot', 'pig'] as const) {
      const h = new Hand(); const q = h.yard.things.ball
      h.yard.things[by].x = 560; h.yard.things[by].y = 560; q.x = 900; q.y = 590
      h.drag(by, { x: 790, y: 520 }); h.run(4); clear(h, [q], `kicked by ${by}`)
    }
  })
})
