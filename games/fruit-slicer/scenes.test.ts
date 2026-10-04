import { describe, expect, it } from 'vitest'
import type { Ending } from './cycle'
import { shareLength } from './measure'
import type { Customer, Who } from './orders'
import { Scene, sceneLength } from './scene'
import { BITES_SHOWN, gliderBeats, restShow, servedShow, serveBeats, showingBeats, type Show } from './scenes'
import { serveOf } from './serve'
import { tasteOf } from './tastes'
import type { Piece } from './world'

const customer = (who: Who, num: number, den: number, more: { num: number; den: number }[] = []): Customer => ({ who, fruit: 'long', shares: [{ num, den }, ...more], carries: null, written: true, lined: true })
const piece = (id: number, length: number): Piece => ({ id, fruit: 'long', length, place: { on: 'tin', part: 0, turn: id }, blind: true, ruled: 0, mark: 0 })
/** An ending in which the pelican was given `count` equal pieces that together are its order, plus `off` points. */
function ending(count: number, off = 0): Ending {
  const who = customer('pelican', 3, 4)
  const each = shareLength('long', { num: 3, den: 4 }) / count
  const result = serveOf(who, [Array.from({ length: count }, (_, i) => piece(i + 1, each + (i === 0 ? off : 0)))])
  return { result, taste: tasteOf(who, result), outcome: result.kind === 'fit' ? 'well' : 'badly', glider: false }
}
/** Plays beats from start to finish at 60 frames a second, and returns the cues heard. */
function play(beats: ReturnType<typeof serveBeats>, each?: () => void): void {
  const scene = new Scene(beats)
  scene.start(0, () => {})
  for (let t = 0; scene.running && t < 20; t += 1 / 60) {
    scene.update(t)
    each?.()
  }
}

describe('the serve', () => {
  it('lasts 4 to 8 seconds, whatever was served', () => {
    for (const count of [1, 2, 3, 6, 7, 12, 30]) {
      const length = sceneLength(serveBeats(restShow('serve'), ending(count), () => {}))
      expect(length, `${count} pieces`).toBeGreaterThanOrEqual(4)
      expect(length, `${count} pieces`).toBeLessThanOrEqual(8)
    }
  })

  it('runs in order: the lid, the lift, each piece in turn, the taste, and coming to rest', () => {
    const show = restShow('serve')
    const order: string[] = []
    const mark = (name: string) => order.includes(name) || order.push(name)
    play(serveBeats(show, ending(3), () => {}), () => {
      if (show.lid > 0) mark('lid')
      if (show.lift > 0) mark('lift')
      if (show.bites > 0) mark('bites')
      if (show.taste > 0) mark('taste')
      if (show.settle > 0) mark('settle')
      if (show.lift > 0) expect(show.lid).toBe(1)
      if (show.taste > 0) expect(show.bites).toBe(3)
    })
    expect(order).toEqual(['lid', 'lift', 'bites', 'taste', 'settle'])
    expect(show).toEqual(servedShow(3))
  })

  it('eats up to six pieces one at a time, a gulp each at the pitch of its length, and the rest in one go', () => {
    const cues: [string, number | undefined][] = []
    const show = restShow('serve')
    play(serveBeats(show, ending(9), (id, length) => cues.push([id, length])))
    expect(cues.filter(([id]) => id === 'gulp')).toHaveLength(BITES_SHOWN + 1)
    expect(show.bites).toBe(9)
    expect(cues[0][0]).toBe('click')
    // Nine pieces are eight seams: the pelican's taste is heard as hiccups.
    expect(cues.at(-1)![0]).toBe('hiccup')
  })

  it('sounds the taste as it shows it: a hiccup for every seam, the twins\' tug, a squash for a flattened ant, a sneeze for every crumb, and otherwise its own noise', () => {
    const heard = (who: Customer, lists: number[][]): [string, number | undefined][] => {
      const result = serveOf(who, lists.map((list, part) => list.map((length, i) => piece(part * 10 + i + 1, length))))
      const cues: [string, number | undefined][] = []
      play(serveBeats(restShow('serve'), { result, taste: tasteOf(who, result), outcome: 'well', glider: false }, (id, _length, count) => cues.push([id, count])))
      return cues.filter(([id]) => id !== 'gulp' && id !== 'click' && id !== 'clang' && id !== 'slide')
    }
    const len = (num: number, den: number) => shareLength('long', { num, den })
    expect(heard(customer('pelican', 3, 4), [[len(3, 4)]])).toEqual([['babble', 0]])
    expect(heard(customer('pelican', 3, 4), [[len(1, 4), len(1, 4), len(1, 4)]])).toEqual([['hiccup', 2]])
    expect(heard(customer('twins', 1, 2), [[len(1, 4)], [len(1, 4)]])).toEqual([['babble', 1]])
    expect(heard(customer('twins', 1, 2), [[len(3, 8)], [len(1, 8)]])).toEqual([['tug', undefined]])
    expect(heard(customer('ants', 3, 4), [[len(1, 4), len(1, 4), len(1, 4)]])).toEqual([['babble', 2]])
    expect(heard(customer('ants', 3, 4), [[len(3, 8), len(3, 8)]])[0][0]).toBe('squish')
    expect(heard(customer('boa', 5, 4), [[len(1, 1), len(1, 4)]])).toEqual([['babble', 4]])
    expect(heard(customer('boa', 5, 4), [[len(1, 1), len(1, 16), len(1, 16), len(1, 8)]])).toEqual([['sneeze', 2]])
  })

  it('starts with the lid shutting on a fit, bouncing on what sticks out, or closing on a gap', () => {
    const first = (served: Ending) => {
      const cues: string[] = []
      play(serveBeats(restShow('serve'), served, (id) => cues.push(id)))
      return cues[0]
    }
    expect(first(ending(1))).toBe('click')
    expect(first(ending(1, 500))).toBe('clang')
    expect(first(ending(1, -500))).toBe('slide')
  })

  it('ended by a touch lands every beat at its end: the pose the game is found in on load', () => {
    const show = restShow('serve')
    const scene = new Scene(serveBeats(show, ending(4), () => {}))
    scene.start(0, () => {})
    scene.update(0.3)
    expect(show.lid).toBeGreaterThan(0)
    expect(show.bites).toBe(0)
    scene.finish()
    expect(show).toEqual(servedShow(4))
    expect(scene.running).toBe(false)
  })
})

describe('the first showing', () => {
  it('lasts 3 to 5 seconds for every order there is', () => {
    const orders: Customer[] = [customer('pelican', 1, 2), customer('pelican', 5, 12), customer('twins', 1, 2), customer('ants', 3, 4), customer('cat', 2, 3, [{ num: 3, den: 4 }]), customer('boa', 5, 4)]
    for (const order of orders) {
      const length = sceneLength(showingBeats(restShow('showing'), order, () => {}))
      expect(length, order.who).toBeGreaterThanOrEqual(3)
      expect(length, order.who).toBeLessThanOrEqual(5)
    }
  })

  it('rules the whole into its parts one tick a part, then fills the ordered ones', () => {
    const show = restShow('showing')
    let ticks = 0, filledEarly = false
    play(showingBeats(show, customer('ants', 3, 4), (id) => id === 'rule' && ticks++), () => {
      if (show.fill > 0 && show.ruled < 4) filledEarly = true
    })
    expect(ticks).toBe(4)
    expect(show.ruled).toBe(4)
    expect(show.fill).toBe(1)
    expect(filledEarly).toBe(false)
    expect(show.extra).toBe(0)
  })

  it("rules the cat's two shares into the same parts, and adds the divider for the twins and the sign for the cat", () => {
    const cat = restShow('showing')
    play(showingBeats(cat, customer('cat', 2, 3, [{ num: 3, den: 4 }]), () => {}))
    expect(cat.ruled).toBe(12)
    expect(cat.extra).toBe(1)
    const twins = restShow('showing')
    play(showingBeats(twins, customer('twins', 1, 2), () => {}))
    expect(twins.extra).toBe(1)
  })

  it('ended by a touch lays the rest at once and leaves every part ruled', () => {
    const show = restShow('showing')
    let ticks = 0
    const scene = new Scene(showingBeats(show, customer('pelican', 5, 8), () => ticks++))
    scene.start(0, () => {})
    scene.update(0.9)
    const heard = ticks
    scene.finish()
    expect(show.ruled).toBe(8)
    expect(show.fill).toBe(1)
    // The beat counted what it had laid: the rest is asked for exactly once, and the game mutes it.
    expect(ticks).toBe(8)
    expect(heard).toBeLessThan(8)
  })
})

describe('the glider', () => {
  it('lasts about 5 seconds: two tries at the beak, the wings, the glide out, the feather', () => {
    const show: Show = restShow('glider')
    const beats = gliderBeats(show, () => {})
    expect(sceneLength(beats)).toBeCloseTo(5, 0)
    const order: string[] = []
    const mark = (name: string) => order.includes(name) || order.push(name)
    play(beats, () => {
      if (show.tries > 0) mark('tries')
      if (show.wings > 0) mark('wings')
      if (show.away > 0) mark('away')
      if (show.feather > 0) mark('feather')
    })
    expect(order).toEqual(['tries', 'wings', 'away', 'feather'])
    expect(show).toMatchObject({ tries: 2, wings: 1, away: 1, feather: 1 })
  })
})
