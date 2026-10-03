import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { backUnderCape, capeOff, ideasDue, letIn, markShown, sendFriend } from './cycle'
import { MEET, TAIL_LEN } from './rules'
import { deserializeGame, freshGame, serializeGame, type Game } from './save'
import { CUSTOMERS } from './tastes'
import { act } from './world'

const round = (game: Game): Game => deserializeGame(JSON.parse(JSON.stringify(serializeGame(game))))
const at = (position: string, over: Partial<Game> = {}): Game => ({ ...freshGame(null), position, ...over })

/** Makes the lock as long as its model, the way a child would: one snip or one pull. */
function match(game: Game): Game {
  const deed = game.lock > game.model ? { action: 'snip' as const, at: game.model } : { action: 'pull' as const, to: game.model }
  return { ...game, ...act(game, { object: 'lock' }, deed).salon }
}

describe('a cycle', () => {
  it('ends when the child pulls the cape off, and is judged once', () => {
    const first = capeOff(match(at('beside-long')))
    expect(first.judged).toBe('well')
    expect(first.game).toMatchObject({ cape: 'off', finished: true, position: 'beside-short' })
    expect(first.showing.comparison.kind).toBe('as-long')
    const again = capeOff(first.game)
    expect(again.judged).toBeNull()
    expect(again.game).toBe(first.game)
  })

  it('moves the position one step up after a cycle that went well, down after one that went badly, and not after a mixed one', () => {
    expect(capeOff(match(at('beside-either'))).game.position).toBe('beside-close')
    const untouched = at('beside-either')
    expect(capeOff(untouched).judged).toBe('badly')
    expect(capeOff(untouched).game.position).toBe('beside-short')
    const near = { ...untouched, lock: untouched.model + MEET + 2 }
    expect(capeOff(near).judged).toBe('mixed')
    expect(capeOff(near).game.position).toBe('beside-either')
  })

  it('stays at either end of the order', () => {
    expect(capeOff(at(LADDER[0])).game.position).toBe(LADDER[0])
    const top = LADDER[LADDER.length - 1]
    expect(capeOff(match(at(top))).game.position).toBe(top)
  })

  it('judges nothing a second time when the customer goes back under the cape for more', () => {
    const shown = capeOff(at('beside-either')).game
    const back = backUnderCape(shown)
    expect(back).toMatchObject({ cape: 'on', finished: true, position: shown.position })
    const second = capeOff(match(back))
    expect(second.judged).toBeNull()
    expect(second.showing.comparison.kind).toBe('as-long')
    expect(second.game.position).toBe(shown.position)
    expect(backUnderCape(back)).toBe(back)
  })

  it('keeps the hair as cut when the cape comes off, so the child can change one thing and try again', () => {
    const before = at('beside-long', { lock: 90 })
    const shown = capeOff(before).game
    expect([shown.lock, shown.model, shown.mane]).toEqual([before.lock, before.model, before.mane])
    const retry = capeOff(match(backUnderCape(shown)))
    expect(retry.showing.comparison.kind).toBe('as-long')
  })

  it('lets the next pair in only when the cape is off, on the child\'s touch', () => {
    const working = at('beside-long')
    expect(letIn(working)).toEqual({ game: working, came: false })
    const shown = capeOff(match(working)).game
    const next = letIn(shown)
    expect(next.came).toBe(true)
    expect(next.game).toMatchObject({ chair: 'yak', friend: 'rabbit', cape: 'on', finished: false, position: 'beside-short', seat: 'beside' })
    // The position that just moved is laid out on this very customer: a lock plainly shorter than its model.
    expect(next.game.model - next.game.lock).toBeGreaterThanOrEqual(24)
    expect(next.game.waiting[0]).not.toBe('yak')
    expect(next.game.waiting[0]).not.toBe(next.game.waiting[1])
    expect(next.game.seed).not.toBe(shown.seed)
  })

  it('starts nothing by itself: without a touch the finished pair stand there and the position stays', () => {
    const shown = capeOff(match(at('beside-long'))).game
    expect(round(round(shown))).toEqual(serializeGame(shown))
  })

  it('is found as left at every step of a visit, and replays nothing', () => {
    let game = freshGame(null)
    const steps: ((g: Game) => Game)[] = [
      (g) => markShown(g, 'snip'),
      (g) => ({ ...g, ...act(g, { object: 'tuft', index: 2 }, { action: 'snip', at: 8 }).salon }),
      (g) => ({ ...g, ...act(g, { object: 'lock' }, { action: 'snip', at: g.model + 3 }).salon }),
      (g) => sendFriend(g, 'across'),
      (g) => markShown(g, 'ribbon'),
      (g) => ({ ...g, ...act(g, { object: 'clipping', index: 0 }, { action: 'pull', drop: { on: 'chair' } }).salon }),
      (g) => capeOff(g).game,
      (g) => backUnderCape(g),
      (g) => capeOff(g).game,
      (g) => letIn(g).game,
    ]
    for (const step of steps) {
      game = step(game)
      const back = round(game)
      expect(back).toEqual(serializeGame(game))
      // Put away and opened again in the middle of the ending: the cape is off, the cycle is judged, and nothing judges it again.
      if (back.cape === 'off') expect(capeOff(back).judged).toBeNull()
    }
    expect(game.chair).toBe('yak')
  })

  it('lets the pair that leaves take what it wears, leaves the floor as it is and hangs the ribbon back', () => {
    const shown = capeOff(at('across', { ribbon: { len: 30, at: 'mane' }, shown: { snip: true, pull: true, ribbon: true }, clippings: [{ len: 9, hue: 'lion', on: 'chair', x: 0 }, { len: 12, hue: 'poodle', on: 'floor', x: 60 }, { len: 5, hue: 'ribbon', on: 'friend', x: 0 }] })).game
    const next = letIn(shown).game
    expect(next.clippings).toEqual([{ len: 12, hue: 'poodle', on: 'floor', x: 60 }])
    expect(next.ribbon).toEqual({ len: 30, at: 'peg' })
    const floor = letIn({ ...shown, ribbon: { len: 30, at: 'floor' } }).game
    expect(floor.ribbon).toEqual({ len: 30, at: 'floor' })
  })

  it('lets the child send the friend across the room and back, at any moment', () => {
    const game = at('beside-long')
    const across = sendFriend(game, 'across')
    expect(across.seat).toBe('across')
    expect(across.position).toBe(game.position)
    expect(sendFriend(across, 'beside').seat).toBe('beside')
    expect(sendFriend(game, 'beside')).toBe(game)
    expect(sendFriend(capeOff(game).game, 'across').seat).toBe('across')
  })

  it('shows each new thing once, when it is first needed, and never the answer', () => {
    const fresh = freshGame(null)
    expect(ideasDue(fresh)).toEqual(['snip'])
    const snipped = markShown(fresh, 'snip')
    expect(ideasDue(snipped)).toEqual([])
    const short = { ...snipped, lock: snipped.model - 20 }
    expect(ideasDue(short)).toEqual(['pull'])
    expect(ideasDue(markShown(short, 'pull'))).toEqual([])
    const across = sendFriend(markShown(short, 'pull'), 'across')
    expect(across.ribbon).toBeNull()
    expect(ideasDue(across)).toEqual(['ribbon'])
    const shown = markShown(across, 'ribbon')
    expect(shown.ribbon).toEqual({ len: TAIL_LEN, at: 'peg' })
    expect(ideasDue(shown)).toEqual([])
    // A showing changes no length: the lock and its model are as they were.
    expect([shown.lock, shown.model]).toEqual([short.lock, short.model])
    expect(ideasDue(capeOff(fresh).game)).toEqual([])
    // A first visit that starts with the friend across the room is shown the snip and the ribbon, in that order.
    expect(ideasDue(freshGame(6)).filter((idea) => idea !== 'pull')).toEqual(['snip', 'ribbon'])
  })

  it('climbs the whole order with a child who matches every lock, and stays at the top', () => {
    let game = freshGame(null)
    const seen: string[] = []
    for (let i = 0; i < 12; i++) {
      seen.push(game.position)
      game = letIn(capeOff(match(game)).game).game
    }
    expect(seen.slice(0, 6)).toEqual([...LADDER])
    expect(new Set(seen.slice(6))).toEqual(new Set([LADDER[LADDER.length - 1]]))
  })

  it('comes back down with a child who only whips the cape off: one step at a time, never up, to the first place', () => {
    let game = at('across-close')
    let last = LADDER.indexOf(game.position)
    for (let i = 0; i < 60; i++) {
      game = letIn(capeOff(game).game).game
      const now = LADDER.indexOf(game.position)
      // An untouched lock that starts only a little off is a mixed cycle, and the position stays; otherwise it steps down.
      expect(last - now === 0 || last - now === 1).toBe(true)
      last = now
    }
    expect(game.position).toBe(LADDER[0])
  })

  it('brings every customer round, in pairs of two different animals, over many cycles', () => {
    let game = freshGame(null)
    const chairs = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const before = game.chair
      chairs.add(before)
      expect(game.friend).not.toBe(game.chair)
      game = letIn(capeOff(game).game).game
      expect(game.chair).not.toBe(before)
    }
    expect(chairs.size).toBe(CUSTOMERS.length)
  })
})
