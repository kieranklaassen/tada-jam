import { describe, expect, it } from 'vitest'
import { WHO, type Who } from './hall'
import { HOLDS, handAt } from './holds'
import { cellOf, meetingSeconds, reactionOf, type Cue } from './meetings'
import { STAGE } from './stage'
import { eats, leftWith, markFor, tasteOf } from './tastes'
import { CRAFTS, MARK, fatCandle, fresh, type Biscuit, type Craft, type Star, type Thing, type Wreath } from './things'
import { notesOf } from './voices'

/** A thing of a craft in a given size (0 to 2) and colour (0 to 2). */
function thing(craft: Craft, size: number, colour: number): Thing {
  if (craft === 'candle') return { ...fatCandle(colour), r: new Array<number>(12).fill([6, 20, 46][size]) }
  if (craft === 'star') return { ...(fresh('star', size, colour) as Star), points: 3 }
  if (craft === 'wreath') return { ...(fresh('wreath', 1, colour) as Wreath), twigs: Array.from({ length: 12 }, (_, i) => (i < [3, 6, 11][size] ? 1 : 0)) }
  return { ...(fresh('biscuit', size, colour) as Biscuit), cut: true }
}

const heard = (cues: Cue[]): string => JSON.stringify(cues.map((cue) => (cue.sound ? notesOf(cue.sound) : null)))
const moved = (cues: Cue[]): string => JSON.stringify(cues.map((cue) => cue.kick ?? null))

describe('the five tastes', () => {
  it('are fixed: she likes large and dislikes small, the bundle the other way round, and the three colours go to the baker, the goat and the tuba player', () => {
    for (const craft of CRAFTS) {
      expect([0, 1, 2].map((size) => tasteOf('maker', thing(craft, size, 0)))).toEqual(['dislike', 'plain', 'like'])
      expect([0, 1, 2].map((size) => tasteOf('bundle', thing(craft, size, 0)))).toEqual(['like', 'plain', 'dislike'])
      expect([0, 1, 2].map((colour) => tasteOf('baker', thing(craft, 1, colour)))).toEqual(['plain', 'like', 'dislike'])
      expect([0, 1, 2].map((colour) => tasteOf('goat', thing(craft, 1, colour)))).toEqual(['dislike', 'plain', 'like'])
      expect([0, 1, 2].map((colour) => tasteOf('tuba', thing(craft, 1, colour)))).toEqual(['like', 'dislike', 'plain'])
    }
  })

  it('leave each mark the grid names, and only the goat and the tuba make a biscuit go', () => {
    expect(markFor('baker', 'candle')).toBe(MARK.blown)
    expect(markFor('goat', 'candle')).toBe(MARK.chewed)
    expect(markFor('maker', 'star')).toBe(MARK.crumpled)
    expect(markFor('maker', 'biscuit')).toBe(MARK.bitten)
    expect(markFor('bundle', 'biscuit')).toBe(MARK.bitten)
    expect(markFor('tuba', 'wreath')).toBe(MARK.none)
    for (const who of WHO) for (const craft of CRAFTS) expect(eats(who, craft), `${who}, ${craft}`).toBe(craft === 'biscuit' && (who === 'goat' || who === 'tuba'))
  })

  it('leave a fair-goer holding the thing with its mark, or nothing where it eats it, and answer a pair from the top down', () => {
    expect(leftWith('goat', thing('biscuit', 1, 0))).toBeNull()
    expect(leftWith('baker', thing('candle', 1, 0))?.mark).toBe(MARK.blown)
    // He blows out the cake: the candle on it is marked, the biscuit is not.
    const cake = { ...thing('biscuit', 1, 1), on: thing('candle', 1, 1) }
    const blown = leftWith('baker', cake)!
    expect([blown.mark, blown.on?.mark]).toEqual([MARK.none, MARK.blown])
    expect(cake.on?.mark).toBe(MARK.none)
    // The goat eats the biscuit off the wreath and chews the wreath.
    const hung = leftWith('goat', { ...thing('wreath', 1, 2), on: thing('biscuit', 0, 0) })!
    expect([hung.mark, hung.on]).toEqual([MARK.chewed, null])
  })
})

describe('the meetings', () => {
  it('give all twenty cells their own sounds and their own movement', () => {
    const sounds = new Set<string>(), moves = new Set<string>()
    for (const who of WHO) for (const craft of CRAFTS) {
      const cues = cellOf(who, thing(craft, 1, who === 'tuba' ? 2 : 0), 'plain')
      expect(cues.length, `${who}, ${craft}`).toBeGreaterThan(0)
      expect(cues.some((cue) => cue.sound), `${who}, ${craft} sounds`).toBe(true)
      expect(cues.some((cue) => cue.kick), `${who}, ${craft} moves`).toBe(true)
      sounds.add(heard(cues))
      moves.add(moved(cues))
    }
    expect(sounds.size).toBe(20)
    expect(moves.size).toBe(20)
  })

  it('leave no row and no column of the grid on one sound', () => {
    const first = (who: Who, craft: Craft) => JSON.stringify(notesOf(cellOf(who, thing(craft, 1, 2), 'plain').find((cue) => cue.sound)!.sound!))
    for (const who of WHO) expect(new Set(CRAFTS.map((craft) => first(who, craft))).size, who).toBe(CRAFTS.length)
    for (const craft of CRAFTS) expect(new Set(WHO.map((who) => first(who, craft))).size, craft).toBe(WHO.length)
  })

  it('turn every reaction one way for a like and another for a dislike, each fair-goer in its own way', () => {
    const turns = new Set<string>()
    for (const who of WHO) {
      const size = (taste: string) => (who === 'maker' ? (taste === 'like' ? 2 : 0) : who === 'bundle' ? (taste === 'like' ? 0 : 2) : 1)
      const colour = (taste: string) => ({ baker: { like: 1, dislike: 2 }, goat: { like: 2, dislike: 0 }, tuba: { like: 0, dislike: 1 } } as Record<string, Record<string, number>>)[who]?.[taste] ?? 0
      const plain = reactionOf(who, thing('wreath', 1, who === 'baker' ? 0 : who === 'goat' ? 1 : 2))
      for (const taste of ['like', 'dislike']) {
        const turned = reactionOf(who, thing('wreath', size(taste), colour(taste)))
        expect(heard(turned) + moved(turned), `${who}, ${taste}`).not.toBe(heard(plain) + moved(plain))
        turns.add(heard(turned) + moved(turned))
      }
    }
    expect(turns.size).toBe(10)
  })

  it('last two to five seconds, pairs and tastes included', () => {
    for (const who of WHO) for (const craft of CRAFTS) for (const size of [0, 2]) for (const colour of [0, 1, 2]) {
      const alone = thing(craft, size, colour)
      const pair = craft === 'candle' ? alone : { ...alone, on: thing(craft === 'star' ? 'wreath' : 'candle', 1, 0) }
      for (const given of [alone, pair]) {
        const seconds = meetingSeconds(who, given)
        expect(seconds, `${who}, ${craft}`).toBeGreaterThanOrEqual(2)
        expect(seconds, `${who}, ${craft}`).toBeLessThanOrEqual(5)
        for (const cue of reactionOf(who, given)) expect(cue.at).toBeLessThan(seconds)
      }
    }
  })

  it('answer a pair from the top: the thing on top first, marked as the top, then the thing under it', () => {
    const cake = { ...thing('biscuit', 1, 0), on: thing('candle', 1, 0) }
    const cues = reactionOf('baker', cake)
    expect(cues[0].top).toBe(true)
    expect(cues.filter((cue) => cue.top && cue.mark)).toHaveLength(1)
    const under = cues.filter((cue) => !cue.top)
    expect(Math.min(...under.map((cue) => cue.at))).toBeGreaterThan(Math.max(...cues.filter((cue) => cue.top).map((cue) => cue.at)))
  })

  it('never show a mark the save does not keep, and show one wherever the save keeps one', () => {
    for (const who of WHO) for (const craft of CRAFTS) {
      const cues = cellOf(who, thing(craft, 1, 0), 'plain')
      expect(cues.some((cue) => cue.mark), `${who}, ${craft}`).toBe(markFor(who, craft) !== MARK.none)
      expect(cues.some((cue) => cue.gone), `${who}, ${craft}`).toBe(eats(who, craft))
    }
  })

  it('hold every craft somewhere on the stage, each fair-goer in a place of its own', () => {
    for (const who of WHO) {
      for (const craft of CRAFTS) {
        const at = handAt(who, craft)
        expect(at.x, `${who}, ${craft}`).toBeGreaterThan(0)
        expect(at.x, `${who}, ${craft}`).toBeLessThan(STAGE.width)
        expect(at.y, `${who}, ${craft}`).toBeGreaterThan(40)
        expect(HOLDS[who][craft].scale).toBeGreaterThan(0.2)
      }
    }
  })
})
