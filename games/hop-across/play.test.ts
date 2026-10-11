import { describe, expect, it } from 'vitest'
import { CLOTH_COL, HOME_COL, NEXT_COL, SEAT_ROW, faults } from './board'
import { DOWN, HOPS, RIGHT, STAY, UP, playUntil, visitAt } from './careful'
import { LADDER } from './config'
import { answerTouch, hop, judge, owedOnLoad, startShowing } from './play'
import { below, makeRng } from './rng'
import { MOST_MISHAPS, boardOf, deserialize, serialize, type Saved } from './save'

const stored = (saved: Saved): Saved => deserialize(JSON.parse(JSON.stringify(serialize(saved))), null, 1)
const toPicnic = (position: string, seed = 1) => {
  const found = playUntil(visitAt(position, seed), (turn) => turn.picnic)
  if (!found) throw new Error(`no picnic at ${position}`)
  return found
}

describe('how a crossing is judged', () => {
  it('goes well with at most one mishap of the rabbit, badly with five or more, and is mixed between', () => {
    expect([0, 1, 2, 4, 5, 9].map(judge)).toEqual(['well', 'well', 'mixed', 'mixed', 'badly', 'badly'])
  })

  it('moves the position one step on after a crossing that went well, in the save of the hop that ended it', () => {
    const { turn } = toPicnic('cars')
    expect(turn.slide).toBeNull()
    expect(turn.saved.finished).toBe(true)
    expect(turn.saved.position).toBe('lorry')
    expect(turn.saved.mishaps).toBe(0)
    expect(turn.saved.family.every((pawn) => pawn.c === CLOTH_COL && !pawn.flat)).toBe(true)
    // Put away at that instant and opened again, it is all there.
    expect(stored(turn.saved)).toEqual(serialize(turn.saved))
  })

  it('moves it one step back after one that went badly, and not at all after a mixed one', () => {
    const { before } = toPicnic('logs')
    const last = (mishaps: number) => playUntil({ ...before, mishaps }, (turn) => turn.picnic, 1)!.turn.saved
    expect(last(5).position).toBe('lorry')
    expect(last(MOST_MISHAPS).position).toBe('lorry')
    expect(last(3).position).toBe('logs')
    expect(last(1).position).toBe('turtle')
  })

  it('does not judge a crossing laid from another position than the one the state holds', () => {
    const { before } = toPicnic('logs')
    const { turn } = playUntil({ ...before, position: 'bell' }, (one) => one.picnic, 1)!
    expect(turn.saved.finished).toBe(true)
    expect(turn.saved.position).toBe('bell')
  })

  it('judges a crossing once: hops along the cloth after the picnic change nothing but the board', () => {
    let saved = toPicnic('cars').turn.saved
    for (const asked of [UP, DOWN, DOWN, UP]) {
      const turn = hop(saved, asked)
      expect(turn.picnic).toBe(false)
      expect(turn.saved.finished).toBe(true)
      expect(turn.saved.position).toBe('lorry')
      saved = turn.saved
    }
  })

  it('counts the rabbit\'s own mishaps and nobody else\'s, never past nine', () => {
    const rng = makeRng(11)
    let saved = visitAt('shared-river', 2)
    let hers = 0, others = 0
    for (let n = 0; n < 500; n++) {
      const turn = hop(saved, HOPS[below(rng, HOPS.length)])
      const mine = turn.events.filter((event) => (event.type === 'flatten' || event.type === 'spit') && event.who === 0).length
      others += turn.events.filter((event) => (event.type === 'flatten' || event.type === 'spit') && event.who !== 0).length
      hers += mine
      if (!turn.picnic && !turn.slide && !saved.finished) expect(turn.saved.mishaps).toBe(Math.min(MOST_MISHAPS, saved.mishaps + mine))
      if (turn.picnic) expect(turn.saved.mishaps).toBe(0)
      // The hop that slides the board on lands her on the new crossing: what befalls her in it is that crossing's first.
      if (turn.slide) expect(turn.saved.mishaps).toBe(mine)
      saved = turn.saved
    }
    expect(hers).toBeGreaterThan(MOST_MISHAPS)
    expect(others).toBeGreaterThan(0)
  })
})

describe('the board slides on when she hops beyond the cloth', () => {
  it('makes the cloth the home bank and lays the crossing after next, all in that hop\'s save', () => {
    const picnic = toPicnic('cars').turn.saved
    const turn = hop(picnic, RIGHT)
    expect(turn.slide).not.toBeNull()
    expect(turn.slide!.tipped).toEqual([])
    const saved = turn.saved
    expect(saved.finished).toBe(false)
    expect(saved.position).toBe('lorry')
    expect(saved.mishaps).toBe(0)
    expect(saved.crossing.home).toBe('cloth')
    expect(saved.crossing.from).toBe(picnic.next.from)
    expect(saved.crossing.lanes.slice(1)).toEqual(picnic.next.lanes.slice(1))
    expect(saved.next.from).toBe('lorry')
    expect(saved.seed).not.toBe(picnic.seed)
    expect(saved.family[0].c).toBe(NEXT_COL - CLOTH_COL)
    // The small ones keep the squares of the cloth that the hop's own step left them on.
    expect(saved.family.slice(1).map((pawn) => [pawn.c, pawn.r])).toEqual(turn.board.family.slice(1).map((pawn) => [HOME_COL, pawn.r]))
    expect(faults(boardOf(saved))).toEqual([])
    expect(turn.slide!.board).toEqual(boardOf(saved))
    expect(stored(saved)).toEqual(serialize(saved))
  })

  it('counts a flattening in the hop that lands her beyond the cloth as the first mishap of the new crossing', () => {
    // From the row on the cloth, with the world stepped a few times, a hop onto the lane beyond comes down in
    // front of a car there.
    let flattened = 0, clean = 0
    for (const position of ['cars', 'lorry']) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        // The careful walk does not get every layout to its picnic; those it does are enough.
        const found = playUntil(visitAt(position, seed), (turn) => turn.picnic)
        if (!found) continue
        let waiting = found.turn.saved
        for (let n = 0; n < 8; n++) {
          const turn = hop(waiting, RIGHT)
          expect(turn.slide).not.toBeNull()
          const hers = turn.events.filter((event) => event.type === 'flatten' && event.who === 0).length
          expect(turn.saved.mishaps).toBe(hers)
          expect(turn.saved.family[0].flat).toBe(hers > 0)
          if (hers > 0) flattened++
          else clean++
          waiting = hop(waiting, STAY).saved
        }
      }
    }
    expect(flattened).toBeGreaterThan(0)
    expect(clean).toBeGreaterThan(0)
    // The same from a crossing she did not finish: the old one is judged as mixed, and the new one starts at what this hop did.
    const reached = playUntil(visitAt('cars', 2), (turn) => turn.saved.family[0].c === CLOTH_COL && !turn.picnic)!
    let before = { ...reached.turn.saved, mishaps: 3 }
    for (let n = 0; n < 8; n++) {
      const turn = hop(before, RIGHT)
      if (!turn.slide) break
      expect(turn.saved.mishaps).toBe(turn.events.filter((event) => event.type === 'flatten' && event.who === 0).length)
      before = { ...hop(before, STAY).saved, mishaps: 3 }
      if (before.finished || before.family[0].c !== CLOTH_COL) break
    }
  })

  it('tips the small ones she left behind after her, and judges the crossing she did not finish as mixed', () => {
    const reached = playUntil(visitAt('logs', 1), (turn) => turn.saved.family[0].c === CLOTH_COL)!
    expect(reached.turn.picnic).toBe(false)
    const turn = hop({ ...reached.turn.saved, mishaps: 7 }, RIGHT)
    // Whoever the hop's own step did not bring on to the cloth.
    const behind = turn.board.family.map((pawn, who) => (who > 0 && pawn.c !== CLOTH_COL ? who : -1)).filter((who) => who > 0)
    expect(behind.length).toBeGreaterThan(0)
    expect(turn.slide!.tipped).toEqual(behind)
    const saved = turn.saved
    expect(saved.position).toBe('logs')
    expect(saved.finished).toBe(false)
    expect(saved.mishaps).toBe(0)
    const small = saved.family.slice(1)
    expect(small.every((pawn) => pawn.c === HOME_COL && !pawn.flat && pawn.on === null && pawn.r !== SEAT_ROW)).toBe(true)
    expect(new Set(small.map((pawn) => pawn.r)).size).toBe(3)
    expect(faults(boardOf(saved))).toEqual([])
    expect(stored(saved)).toEqual(serialize(saved))
  })

  it('is found as left after every hop of a long walk over many crossings', () => {
    const rng = makeRng(5)
    let saved = visitAt('cars', 3)
    let slides = 0
    for (let n = 0; n < 1500; n++) {
      // Mostly onwards, so the walk gets across again and again.
      const turn = hop(saved, below(rng, 3) === 0 ? HOPS[below(rng, HOPS.length)] : saved.family[0].c === CLOTH_COL && !saved.finished && below(rng, 2) === 0 ? DOWN : RIGHT)
      if (turn.slide) slides++
      saved = turn.saved
      expect(faults(boardOf(saved))).toEqual([])
      if (n % 7 === 0 || turn.slide || turn.picnic) expect(stored(saved)).toEqual(serialize(saved))
      expect(LADDER).toContain(saved.position)
    }
    expect(slides).toBeGreaterThan(5)
  })
})

describe('the duck\'s showing', () => {
  it('is settled when it starts: the thing is shown, the lane stands as the duck will leave it, and the family has not moved', () => {
    const saved = visitAt('cars', 1, true)
    const started = startShowing(saved)!
    expect(started.show.thing).toBe('cars')
    expect(started.saved.shown).toEqual(['cars'])
    expect(started.saved.family).toEqual(saved.family)
    const before = boardOf(saved).lanes, after = boardOf(started.saved).lanes
    after.forEach((lane, c) => expect(lane).toEqual(c === started.show.col ? started.show.steps[started.show.steps.length - 1].lane : before[c]))
    expect(faults(boardOf(started.saved))).toEqual([])
    expect(stored(started.saved)).toEqual(serialize(started.saved))
    // Shown once: nothing is owed after it.
    expect(startShowing(started.saved)).toBeNull()
  })

  it('shows the newest thing of the crossing first, for a first visit that starts further on', () => {
    expect(startShowing(visitAt('bell', 1, true))!.show.thing).toBe('bell')
    expect(startShowing(visitAt('logs', 1, true))!.show.thing).toBe('logs')
  })
})

describe('a touch and the showing that is owed', () => {
  const fresh = visitAt('cars', 1, true)

  it('starts the showing and makes no hop', () => {
    const answer = answerTouch(fresh, true, false)
    expect(answer.show!.thing).toBe('cars')
    expect(answer).toMatchObject({ watched: true, hops: false })
    expect(answer.saved.shown).toContain('cars')
    expect(answer.saved.family).toEqual(fresh.family)
  })

  it('is an ordinary hop when it cut the tip or the slide short, and ends the showing with its lane where the save has it', () => {
    const answer = answerTouch(fresh, true, true)
    expect(answer).toMatchObject({ watched: false, hops: true })
    // The showing is settled exactly as one that was watched to its end.
    expect(answer.saved).toEqual(startShowing(fresh)!.saved)
    const lane = answer.show!.steps[answer.show!.steps.length - 1].lane
    expect(boardOf(answer.saved).lanes[answer.show!.col]).toEqual(lane)
    // The same touch then hops her one square, and the thing is never shown again.
    const turn = hop(answer.saved, RIGHT)
    expect(turn.board.family[0].c).toBe(fresh.family[0].c + 1)
    expect(answerTouch(turn.saved, true, false)).toMatchObject({ show: null, hops: true })
  })

  it('is owed on a load only while the family has not set out, so a touch after opening the game again mid-crossing hops', () => {
    // A first visit, and the same put away before any touch.
    expect(owedOnLoad(fresh)).toBe(true)
    // Put away as the slide ended: she is on the first lane and the small ones in line on the cloth behind her.
    const slid = hop(toPicnic('cars').turn.saved, RIGHT).saved
    expect(owedOnLoad(slid)).toBe(true)
    // Under way, with a thing on the board that was never shown: nothing is owed, and the touch is a hop.
    let under = fresh
    for (let n = 0; n < 3; n++) under = hop(under, RIGHT).saved
    expect(under.family.slice(1).some((pawn) => pawn.c !== HOME_COL)).toBe(true)
    expect(startShowing(under)).not.toBeNull()
    expect(owedOnLoad(under)).toBe(false)
    expect(answerTouch(under, owedOnLoad(under), false)).toEqual({ saved: under, show: null, watched: false, hops: true })
    // On the cloth after the picnic nothing is owed either.
    expect(owedOnLoad(toPicnic('cars').turn.saved)).toBe(false)
  })

  it('is a hop that changes nothing when no showing is owed, or nothing on the board is new', () => {
    expect(answerTouch(fresh, false, false)).toEqual({ saved: fresh, show: null, watched: false, hops: true })
    expect(answerTouch(fresh, false, true)).toEqual({ saved: fresh, show: null, watched: false, hops: true })
    const seen = visitAt('cars', 1)
    expect(answerTouch(seen, true, true)).toEqual({ saved: seen, show: null, watched: false, hops: true })
  })
})
