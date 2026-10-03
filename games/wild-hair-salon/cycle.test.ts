import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { SHOWN_PULL, backUnderCape, capeOff, ideasDue, letIn, markShown, sendFriend } from './cycle'
import { MEET, MIN_LEN, PLAIN, TAIL_LEN } from './rules'
import { deserializeGame, freshGame, serializeGame, type Game } from './save'
import { CUSTOMERS } from './tastes'
import { act } from './world'

const round = (game: Game): Game => deserializeGame(JSON.parse(JSON.stringify(serializeGame(game))))
/** A salon with a pair that has just come in, laid out for a position. */
const at = (position: string, over: Partial<Game> = {}): Game => ({ ...letIn({ ...freshGame(null), position }).game, ...over })

/** Makes the lock as long as its model, the way a child would: one snip or one pull. */
function match(game: Game): Game {
  const deed = game.lock > game.model ? { action: 'snip' as const, at: game.model } : { action: 'pull' as const, to: game.model }
  return { ...game, ...act(game, { object: 'lock' }, deed).salon }
}

describe('a first visit', () => {
  it('opens on an empty chair and waits: nothing can be ended, shown or sent, and nothing starts by itself', () => {
    const fresh = freshGame(null)
    expect(capeOff(fresh)).toEqual({ game: fresh, showing: null, judged: null })
    expect(backUnderCape(fresh)).toBe(fresh)
    expect(sendFriend(fresh, 'across')).toBe(fresh)
    expect(ideasDue(fresh)).toEqual([])
    expect(round(fresh)).toEqual(serializeGame(fresh))
  })

  it('brings the first pair in on the child\'s touch on the door, laid out for where the visit starts', () => {
    const { game, came } = letIn(freshGame(null))
    expect(came).toBe(true)
    expect(game).toMatchObject({ chair: 'lion', friend: 'poodle', cape: 'on', finished: false, position: 'beside-long', seat: 'beside' })
    expect(game.lock - game.model).toBeGreaterThanOrEqual(PLAIN.min)
    expect(ideasDue(game)).toEqual(['snip'])
    expect(letIn(freshGame(6)).game).toMatchObject({ position: 'across', seat: 'across' })
  })
})

describe('a cycle', () => {
  it('ends when the child pulls the cape off, and is judged once', () => {
    const first = capeOff(match(at('beside-long')))
    expect(first.judged).toBe('well')
    expect(first.game).toMatchObject({ cape: 'off', finished: true, position: 'beside-short' })
    expect(first.showing?.comparison.kind).toBe('as-long')
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
    expect(second.showing?.comparison.kind).toBe('as-long')
    expect(second.game.position).toBe(shown.position)
    expect(backUnderCape(back)).toBe(back)
  })

  it('keeps the hair as cut when the cape comes off, so the child can change one thing and try again', () => {
    const before = at('beside-long', { lock: 90 })
    const shown = capeOff(before).game
    expect([shown.lock, shown.model, shown.mane]).toEqual([before.lock, before.model, before.mane])
    // While the pair stand there the customer's hair springs back, like the friend's.
    const tugged = act(shown, { object: 'lock' }, { action: 'snip', at: 10 })
    expect(tugged.sprangBack).toBe(true)
    expect(tugged.salon.lock).toBe(90)
    const retry = capeOff(match(backUnderCape(shown)))
    expect(retry.showing?.comparison.kind).toBe('as-long')
  })

  it('keeps the door shut while a customer is under the cape, and lets the next pair in on a touch once it is off', () => {
    const working = at('beside-long')
    expect(letIn(working)).toEqual({ game: working, came: false })
    const shown = capeOff(match(working)).game
    const next = letIn(shown)
    expect(next.came).toBe(true)
    expect(next.game).toMatchObject({ chair: shown.waiting[0], friend: shown.waiting[1], cape: 'on', finished: false, position: 'beside-short', seat: 'beside' })
    // The position that just moved is laid out on this very customer: a lock plainly shorter than its model.
    expect(next.game.model - next.game.lock).toBeGreaterThanOrEqual(PLAIN.min)
    expect(next.game.waiting[0]).not.toBe(next.game.chair)
    expect(next.game.waiting[0]).not.toBe(next.game.waiting[1])
    expect(next.game.seed).not.toBe(shown.seed)
  })

  it('starts nothing by itself: without a touch the finished pair stand there and the position stays', () => {
    const shown = capeOff(match(at('beside-long'))).game
    expect(round(round(shown))).toEqual(serializeGame(shown))
  })

  it('is found as left at every step of a visit, in the state each scene ends in, and replays nothing', () => {
    let game = freshGame(null)
    const steps: ((g: Game) => Game)[] = [
      (g) => letIn(g).game,
      (g) => markShown(g, 'snip'),
      (g) => ({ ...g, ...act(g, { object: 'tuft', index: 2 }, { action: 'snip', at: 8 }).salon }),
      (g) => ({ ...g, ...act(g, { object: 'lock' }, { action: 'snip', at: g.model + 3 }).salon }),
      (g) => sendFriend(g, 'across'),
      (g) => markShown(g, 'ribbon'),
      (g) => ({ ...g, ...act(g, { object: 'tuft', index: 5 }, { action: 'ribbon' }).salon }),
      (g) => ({ ...g, ...act(g, { object: 'clipping', index: 0 }, { action: 'pull', drop: { on: 'face', who: 'chair', spot: 'lip' } }).salon }),
      (g) => capeOff(g).game,
      (g) => backUnderCape(g),
      (g) => capeOff(g).game,
      (g) => letIn(g).game,
    ]
    for (const step of steps) {
      const before = game
      game = step(game)
      expect(game).not.toEqual(before)
      const back = round(game)
      expect(back).toEqual(serializeGame(game))
      // Put away and opened again in the middle of the ending: the cape is off, the cycle is judged, and nothing judges it again.
      if (back.cape === 'off') expect(capeOff(back).judged).toBeNull()
      // Opened again after a showing has started, the showing is not due again.
      for (const idea of ['snip', 'pull', 'ribbon'] as const) if (back.shown[idea]) expect(ideasDue(back)).not.toContain(idea)
    }
    expect(game.chair).not.toBeNull()
    expect(game.cape).toBe('on')
  })

  it('lets the pair that goes out wear out what is on their faces, leaves the floor as it lies and hangs the ribbon back', () => {
    const worn = at('across', { shown: { snip: true, pull: true, ribbon: true }, clippings: [{ len: 9, hue: 'lion', on: 'face', who: 'chair', spot: 'lip' }, { len: 12, hue: 'poodle', on: 'floor', x: 60 }, { len: 5, hue: 'ribbon', on: 'face', who: 'friend', spot: 'brow' }] })
    for (const ribbon of [{ len: 30, at: 'mane', tuft: 2 }, { len: 30, at: 'face', who: 'friend' }, { len: 30, at: 'lock' }, { len: 30, at: 'model' }, { len: 30, at: 'peg' }] as const) {
      const next = letIn(capeOff({ ...worn, ribbon }).game).game
      expect(next.clippings).toEqual([{ len: 12, hue: 'poodle', on: 'floor', x: 60 }])
      expect(next.ribbon).toEqual({ len: 30, at: 'peg' })
    }
    const floor = letIn(capeOff({ ...worn, ribbon: { len: 30, at: 'floor', x: 17 } }).game).game
    expect(floor.ribbon).toEqual({ len: 30, at: 'floor', x: 17 })
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

  it('shows each new thing once, when it is first needed', () => {
    const came = at('beside-long')
    expect(ideasDue(came)).toEqual(['snip'])
    const snipped = markShown(came, 'snip')
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
    expect(ideasDue(capeOff(came).game)).toEqual([])
    // A first visit that starts with the friend across the room is shown the snip and the ribbon, in that order.
    expect(ideasDue(letIn(freshGame(6)).game).filter((idea) => idea !== 'pull')).toEqual(['snip', 'ribbon'])
  })

  it('shows a move and never the answer: a showing changes the mane as the sheet says, and never the lock or its model', () => {
    const came = at('beside-long', { mane: [40, 90, 12, 50, 50, 50, 50, 50, 50] })
    const snipped = markShown(came, 'snip')
    // The longest tuft, to half its length. It gives fluff and no piece, as a snipped tuft does in the grid.
    expect(snipped.mane).toEqual([40, 45, 12, 50, 50, 50, 50, 50, 50])
    expect(snipped.clippings).toEqual(came.clippings)
    const pulled = markShown(snipped, 'pull')
    // The shortest tuft, longer.
    expect(pulled.mane).toEqual([40, 45, 12 + SHOWN_PULL, 50, 50, 50, 50, 50, 50])
    const ribboned = markShown(pulled, 'ribbon')
    expect(ribboned.mane).toEqual(pulled.mane)
    for (const game of [snipped, pulled, ribboned]) expect([game.lock, game.model]).toEqual([came.lock, came.model])
    // Marked once: started again, nothing changes.
    for (const idea of ['snip', 'pull', 'ribbon'] as const) expect(markShown(ribboned, idea)).toBe(ribboned)
    expect(markShown(at('beside-long', { mane: Array(9).fill(MIN_LEN) }), 'snip').mane).toEqual(Array(9).fill(MIN_LEN))
  })

  it('climbs the whole order with a child who matches every lock, and stays at the top', () => {
    let game = letIn(freshGame(null)).game
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
    let game = letIn(freshGame(null)).game
    const chairs = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const before = game.chair
      chairs.add(String(before))
      expect(game.friend).not.toBe(game.chair)
      game = letIn(capeOff(game).game).game
      expect(game.chair).not.toBe(before)
    }
    expect(chairs.size).toBe(CUSTOMERS.length)
  })
})
