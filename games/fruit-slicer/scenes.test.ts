import { describe, expect, it } from 'vitest'
import type { Ending } from './cycle'
import { feastOf } from './feast'
import { shareLength } from './measure'
import type { Customer, Who } from './orders'
import { Scene, sceneLength } from './scene'
import { BITES_SHOWN, FED_DOWN_SECONDS, TO_MOUTH_SECONDS, fedAfter, gliderBeats, restShow, servedShow, serveBeats, showingBeats, type Show } from './scenes'
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
  return { result, taste: tasteOf(who, result), outcome: result.kind === 'fit' ? 'well' : 'badly', glider: false, fed: false }
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
      play(serveBeats(restShow('serve'), { result, taste: tasteOf(who, result), outcome: 'well', glider: false, fed: false }, (id, _length, count) => cues.push([id, count])))
      return cues.filter(([id]) => id !== 'gulp' && id !== 'click' && id !== 'clang' && id !== 'slide')
    }
    const len = (num: number, den: number) => shareLength('long', { num, den })
    expect(heard(customer('pelican', 3, 4), [[len(3, 4)]])).toEqual([['babble', 0]])
    expect(heard(customer('pelican', 3, 4), [[len(1, 4), len(1, 4), len(1, 4)]])).toEqual([['hiccup', undefined], ['hiccup', undefined]])
    expect(heard(customer('twins', 1, 2), [[len(1, 4)], [len(1, 4)]])).toEqual([['babble', 1]])
    expect(heard(customer('twins', 1, 2), [[len(3, 8)], [len(1, 8)]])).toEqual([['tug', undefined]])
    expect(heard(customer('ants', 3, 4), [[len(1, 4), len(1, 4), len(1, 4)]])).toEqual([['babble', 2]])
    expect(heard(customer('ants', 3, 4), [[len(3, 8), len(3, 8)]])[0][0]).toBe('squish')
    expect(heard(customer('boa', 5, 4), [[len(1, 1), len(1, 4)]])).toEqual([['babble', 4]])
    expect(heard(customer('boa', 5, 4), [[len(1, 1), len(1, 16), len(1, 16), len(1, 8)]])).toEqual([['sneeze', undefined], ['sneeze', undefined]])
    // A squash for each ant as it goes down, and a pop for each as it peels itself up.
    expect(heard(customer('ants', 3, 4), [[len(1, 8), len(1, 4), len(1, 4), len(1, 8)]]).map(([id]) => id).sort()).toEqual(['peel', 'peel', 'peel', 'squish', 'squish', 'squish'])
  })

  it('takes about three seconds over a customer fed by hand, however many pieces it was fed in a row, each going down as it arrives', () => {
    const who = customer('pelican', 3, 4)
    for (const count of [1, 2, 6, 12]) {
      const result = serveOf(who, [Array.from({ length: count }, (_, i) => piece(i + 1, 1800 / count))])
      const show = restShow('serve')
      const cues: string[] = []
      const beats = serveBeats(show, { result, taste: tasteOf(who, result), outcome: 'mixed', glider: false, fed: true }, (id) => cues.push(id))
      expect(sceneLength(beats), `${count} pieces`).toBeGreaterThanOrEqual(3)
      expect(sceneLength(beats), `${count} pieces`).toBeLessThanOrEqual(3.4)
      // Nothing goes down before the first piece has reached the mouth; then one after another, piece `i` as it arrives.
      const seen: number[] = []
      const scene = new Scene(beats)
      scene.start(0, () => {})
      for (let t = 0; scene.running && t < 20; t += 1 / 120) {
        scene.update(t)
        seen.push(show.bites)
      }
      expect(seen[Math.floor((TO_MOUTH_SECONDS - 0.02) * 120)]).toBe(0)
      for (let i = 0; i < count; i++) {
        const arrives = TO_MOUTH_SECONDS + fedAfter(i, count)
        expect(seen[Math.floor((arrives - 0.01) * 120)], `${count} pieces, piece ${i}`).toBeLessThanOrEqual(i + 0.001)
        expect(seen[Math.ceil((arrives + FED_DOWN_SECONDS / count) * 120) + 1], `${count} pieces, piece ${i}`).toBeGreaterThanOrEqual(i + 1 - 0.001)
      }
      expect(show.bites).toBe(count)
      // The gulps came with the pieces, from the hand: the scene sounds none of its own.
      expect(cues).not.toContain('gulp')
    }
  })

  it('sounds each of them once, however many there are, at the moment the body shows it', () => {
    const len = (num: number, den: number) => shareLength('long', { num, den })
    /** Plays a serve and returns, for every taste sound, what the body showed in the frame it was heard. */
    const shown = (who: Customer, lists: number[][]) => {
      const result = serveOf(who, lists.map((list, part) => list.map((length, i) => piece(part * 10 + i + 1, length))))
      const taste = tasteOf(who, result), lengths = lists.flat()
      const show = restShow('serve')
      const pending: string[] = []
      const heard: { id: string; feast: ReturnType<typeof feastOf> }[] = []
      play(serveBeats(show, { result, taste, outcome: 'well', glider: false, fed: false }, (id) => void (['hiccup', 'squish', 'peel', 'sneeze'].includes(id) && pending.push(id))), () => {
        for (const id of pending.splice(0)) heard.push({ id, feast: feastOf(who, lengths, taste, show) })
      })
      return heard
    }
    // Thirteen pieces are twelve seams: twelve hiccups, none left out, and each is heard at the top of its own hop.
    const hiccups = shown(customer('pelican', 3, 4), [Array.from({ length: 13 }, () => len(3, 4) / 13)])
    expect(hiccups).toHaveLength(12)
    for (const one of hiccups) expect(one.feast.hop).toBeGreaterThan(5.5)
    // One seam: the one hiccup comes at the top of the one hop, not at its start.
    const single = shown(customer('pelican', 3, 4), [[len(1, 2), len(1, 4)]])
    expect(single).toHaveLength(1)
    expect(single[0].feast.hop).toBeGreaterThan(6.5)
    // Three ants go down one after another: at each squash one more of them is flat, and each pops as it starts to peel itself up.
    const ants = shown(customer('ants', 3, 4), [[len(1, 8), len(1, 4), len(1, 4), len(1, 8)]])
    expect(ants.filter((one) => one.id === 'squish').map((one) => one.feast.flat.filter((flat) => flat > 0).length)).toEqual([1, 2, 3])
    const peels = ants.filter((one) => one.id === 'peel')
    expect(peels).toHaveLength(3)
    peels.forEach((one, k) => {
      expect(one.feast.flat[k]).toBeGreaterThan(0.8)
      expect(one.feast.flat[k]).toBeLessThanOrEqual(1)
      if (k < 2) expect(one.feast.flat[k + 1]).toBe(1)
    })
    // Five crumbs are five sneezes: each is heard as it sets off from the head.
    const sneezes = shown(customer('boa', 5, 4), [[len(1, 1), len(1, 16), len(1, 16), len(1, 16), len(1, 32), len(1, 32)]])
    expect(sneezes).toHaveLength(5)
    for (const one of sneezes) {
      expect(one.feast.sneeze).toBeGreaterThanOrEqual(0)
      expect(one.feast.sneeze).toBeLessThan(0.12)
    }
  })

  it('eats a piece of another fruit too when it is fed by hand: the bite is there for the body to show', () => {
    const who = customer('pelican', 3, 4)
    const other: Piece = { ...piece(1, 600), fruit: 'short' }
    const result = serveOf(who, [[other]])
    expect(result.strays).toHaveLength(1)
    const show = restShow('serve')
    play(serveBeats(show, { result, taste: tasteOf(who, result), outcome: 'mixed', glider: false, fed: true }, () => {}))
    expect(show.bites).toBe(1)
    // Laid in the tin it is no part of the order: it is picked out, and nothing of it is eaten.
    const shut = restShow('serve')
    play(serveBeats(shut, { result, taste: tasteOf(who, result), outcome: 'badly', glider: false, fed: false }, () => {}))
    expect(shut.bites).toBe(0)
  })

  it('has the twins eat in step when each has one piece of one length: one bite for the two pieces, and one gulp', () => {
    const twins = customer('twins', 1, 2)
    const quarter = shareLength('long', { num: 1, den: 4 })
    const result = serveOf(twins, [[piece(1, quarter)], [piece(2, quarter)]])
    const cues: string[] = []
    const show = restShow('serve')
    const beats = serveBeats(show, { result, taste: tasteOf(twins, result), outcome: 'well', glider: false, fed: false }, (id) => cues.push(id))
    play(beats)
    expect(cues.filter((id) => id === 'gulp')).toHaveLength(1)
    expect(show.bites).toBe(2)
    expect(sceneLength(beats)).toBeGreaterThanOrEqual(4)
    // One longer than the other, they eat one after the other: two gulps.
    const uneven = serveOf(twins, [[piece(1, quarter + 300)], [piece(2, quarter - 300)]])
    const more: string[] = []
    play(serveBeats(restShow('serve'), { result: uneven, taste: tasteOf(twins, uneven), outcome: 'badly', glider: false, fed: false }, (id) => more.push(id)))
    expect(more.filter((id) => id === 'gulp')).toHaveLength(2)
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
    // An order longer than one fruit is ruled along both fruits: twelve eighths of the short fruit is sixteen parts, sixteen ticks, still inside five seconds.
    const long = restShow('showing')
    let longTicks = 0
    const beats = showingBeats(long, { ...customer('boa', 12, 8), fruit: 'short' }, (id) => id === 'rule' && longTicks++)
    play(beats)
    expect(longTicks).toBe(16)
    expect(long.ruled).toBe(16)
    expect(sceneLength(beats)).toBeLessThanOrEqual(5)
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
