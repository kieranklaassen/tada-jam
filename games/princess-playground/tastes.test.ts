import { describe, expect, it } from 'vitest'
import { emptyArrangement, putInSand, putOnEnd, type Arrangement } from './arrangement'
import { TASTES, feelingAbout, moodOf, situationsOf } from './tastes'
import { FRIEND_IDS, type FriendId } from './world'

const on = (left: FriendId[], right: FriendId[]): Arrangement => {
  let a = emptyArrangement()
  for (const id of left) a = putOnEnd(a, id, 'left')
  for (const id of right) a = putOnEnd(a, id, 'right')
  return a
}

describe('the friends’ fixed tastes', () => {
  it('each has one want, at least two likes and at least one dislike, and nothing it both likes and dislikes', () => {
    for (const id of FRIEND_IDS) {
      const taste = TASTES[id]
      expect(taste.likes.length, id).toBeGreaterThanOrEqual(2)
      expect(taste.dislikes.length, id).toBeGreaterThanOrEqual(1)
      for (const what of taste.likes) expect(taste.dislikes.includes(what)).toBe(false)
    }
    expect(new Set(FRIEND_IDS.map((id) => TASTES[id].wants)).size).toBe(4)
  })

  it('no two friends have the same tastes: the same thing lands differently on each', () => {
    const key = (id: FriendId) => `${[...TASTES[id].likes].sort()} / ${[...TASTES[id].dislikes].sort()}`
    expect(new Set(FRIEND_IDS.map(key)).size).toBe(4)
    expect(feelingAbout('pim', 'tossed')).toBe('likes')
    expect(feelingAbout('mog', 'tossed')).toBe('dislikes')
    expect(feelingAbout('bo', 'underneath')).toBe('likes')
    expect(feelingAbout('pim', 'underneath')).toBe('dislikes')
    expect(feelingAbout('mog', 'underneath')).toBe('dislikes')
  })

  it('a taste is about the scene: none is about the child, time, or how often', () => {
    const all = FRIEND_IDS.flatMap((id) => [...TASTES[id].likes, ...TASTES[id].dislikes, TASTES[id].wants])
    for (const what of all) expect(what).not.toMatch(/child|wait|time|long|again|count|leave|return|back|score|win/i)
  })

  it('what a friend feels follows from the arrangement alone, the same every time', () => {
    const a = on(['bo', 'pim'], ['mog'])
    for (const id of FRIEND_IDS) expect(moodOf(a, id)).toEqual(moodOf(on(['bo', 'pim'], ['mog']), id))
  })

  it('Pim on Bo’s head is glad, Bo underneath is proud of it, and Mog up on the high end has his perch', () => {
    const a = on(['bo', 'pim'], ['mog'])
    expect(situationsOf(a, 'pim')).toEqual(expect.arrayContaining(['down', 'on-top']))
    expect(moodOf(a, 'pim')).toEqual({ mood: 'glad', about: 'on-top' })
    expect(moodOf(a, 'bo')).toEqual({ mood: 'glad', about: 'underneath' })
    expect(moodOf(a, 'mog')).toEqual({ mood: 'glad', about: 'up' })
  })

  it('Pim underneath Mog is put out, and Mog on top of her is glad', () => {
    const a = on(['pim', 'mog'], [])
    expect(moodOf(a, 'pim')).toEqual({ mood: 'put-out', about: 'underneath' })
    expect(moodOf(a, 'mog').mood).toBe('glad')
  })

  it('Bo alone on the plank is put out and dozes; one friend opposite ends it', () => {
    expect(moodOf(on(['bo'], []), 'bo')).toEqual({ mood: 'put-out', about: 'alone-on-plank' })
    expect(moodOf(on(['bo'], ['pim']), 'bo').about).not.toBe('alone-on-plank')
  })

  it('Dot at the rim is apart and put out; brought onto the plank with a friend on it, it is glad', () => {
    const start = on(['pim'], [])
    expect(moodOf(start, 'dot')).toEqual({ mood: 'put-out', about: 'apart' })
    expect(moodOf(on(['pim'], ['dot']), 'dot')).toEqual({ mood: 'glad', about: 'in-company' })
    // Walked over to stand beside a friend in the sand, it is glad as well.
    const beside = putInSand(start, 'dot', { x: 3.4, z: 2.6 })
    expect(moodOf(beside, 'dot').mood).toBe('glad')
    // Alone on the plank it is still by itself.
    expect(moodOf(on([], ['dot']), 'dot').mood).toBe('put-out')
  })

  it('a dislike is there to be caused on purpose: every friend has an arrangement that puts it out and one that makes it glad', () => {
    const tries = [on(['bo'], []), on(['pim', 'mog'], ['bo']), on(['mog', 'pim'], ['bo']), on(['bo', 'pim'], ['mog', 'dot']), on(['pim'], ['dot']), on(['pim'], [])]
    for (const id of FRIEND_IDS) {
      const moods = new Set(tries.map((a) => moodOf(a, id).mood))
      expect(moods.has('glad'), id).toBe(true)
      expect(moods.has('put-out'), id).toBe(true)
    }
  })
})
