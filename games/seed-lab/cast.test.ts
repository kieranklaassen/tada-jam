import { describe, expect, it } from 'vitest'
import { CAST, FUNNIEST, HEIGHT_MISSES, VISITOR_CHANNELS, castPose } from './cast'
import { VANISH_BUMP_AT } from './castLadybird'
import { ACTORS, AT_REST, poseOf, type Action, type Actor, type Channels } from './motion'
import { LIKES, SECRETS, VISITORS, type VisitorId } from './visitors'

const CHANNELS = Object.keys(AT_REST) as (keyof Channels)[]
const TAU = Math.PI * 2

type One = { who: string; name: string; actor: Actor; action: Action; idle: boolean }
const listOf = (who: string, actor: Actor): One[] => [
  ...Object.entries(actor.idle).map(([name, action]) => ({ who, name, actor, action, idle: true })),
  ...Object.entries(actor.answer).map(([name, action]) => ({ who, name, actor, action, idle: false })),
]
const cast: One[] = VISITORS.flatMap((who) => listOf(who, CAST[who]))
const residents: One[] = Object.entries(ACTORS).flatMap(([who, actor]) => listOf(who, actor))
const label = (one: One) => `${one.who} ${one.name}`

/** The actions every visitor has, whoever it is. */
const SHARED = ['come-in', 'go-off', 'shrug', 'like-colour', 'like-height', 'like-leaf', 'like-petals', 'miss-colour', 'miss-leaf', 'miss-petals', 'take', 'use', 'settle', 'rattle', 'balance', 'tug', 'peer', 'bow', 'poked']
/** The secrets, and whose each is. */
const SECRET_OF: Record<string, VisitorId> = { hat: 'snail', vanish: 'ladybird' }

/** An action as numbers: every channel at 24 moments spread over its length, as motion.test.ts samples the beetle. */
function sampled(one: One): number[] {
  const out: number[] = []
  for (let step = 1; step < 25; step++) {
    const pose = poseOf(one.actor, one.name, (one.action.seconds * step) / 25)
    for (const channel of CHANNELS) out.push(pose[channel] / (channel === 'legs' ? 3 : 1))
  }
  return out
}

const distance = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, value, at) => sum + (value - b[at]) ** 2, 0) / a.length)

/** The largest size a channel reaches in an action, looked at 60 times a second. */
function reach(one: One, channel: keyof Channels): number {
  let most = 0
  for (let t = 0; t < one.action.seconds; t += 1 / 60) most = Math.max(most, Math.abs(poseOf(one.actor, one.name, t)[channel]))
  return most
}

describe('the cast', () => {
  it('has every action the game asks for by name, and the height misses that can happen to each', () => {
    for (const who of VISITORS) {
      const answers = Object.keys(CAST[who].answer)
      const wanted = [...SHARED, ...HEIGHT_MISSES[who].map((way) => `miss-height-${way}`), ...Object.keys(SECRET_OF).filter((secret) => SECRET_OF[secret] === who)]
      expect([...answers].sort(), who).toEqual([...wanted].sort())
      expect(Object.keys(CAST[who].idle).length, who).toBeGreaterThanOrEqual(3)
      for (const name of Object.keys(CAST[who].idle)) expect(answers, name).not.toContain(name)
    }
  })

  it('gives a height miss exactly where a plant can stand higher or lower than the visitor likes', () => {
    for (const who of VISITORS) {
      const ways: string[] = []
      if (LIKES[who].joints < 4) ways.push('higher')
      if (LIKES[who].joints > 1) ways.push('lower')
      expect(HEIGHT_MISSES[who], who).toEqual(ways)
    }
  })

  it('keeps the secrets to the snail and the ladybird', () => {
    expect(Object.keys(SECRET_OF).sort()).toEqual([...SECRETS].sort())
    for (const who of VISITORS) for (const secret of SECRETS) expect(secret in CAST[who].answer, `${who} ${secret}`).toBe(SECRET_OF[secret] === who)
  })

  it('differs from visitor to visitor in tempo, weight and funniest part, and each from the beetle and the worm', () => {
    const all = [...VISITORS.map((who) => CAST[who]), ...Object.values(ACTORS)]
    expect(new Set(all.map((actor) => actor.tempo)).size).toBe(all.length)
    expect(new Set(all.map((actor) => actor.weight)).size).toBe(all.length)
    expect(new Set(all.map((actor) => actor.funniest)).size).toBe(all.length)
    expect(new Set(all.map((actor) => actor.pause.join())).size).toBe(all.length)
    for (const actor of all) expect(actor.pause[0]).toBeLessThan(actor.pause[1])
  })

  it('moves as the sheet says: the snail the slowest and heaviest, the bee the snappiest, the ladybird the one that stops dead', () => {
    const others = (who: VisitorId) => VISITORS.filter((one) => one !== who)
    for (const who of others('snail')) {
      expect(CAST.snail.tempo, who).toBeGreaterThan(CAST[who].tempo)
      expect(CAST.snail.weight, who).toBeGreaterThan(CAST[who].weight)
      expect(CAST.snail.pause[0], who).toBeGreaterThan(CAST[who].pause[0])
    }
    for (const who of others('bee')) {
      expect(CAST.bee.tempo, who).toBeLessThan(CAST[who].tempo)
      expect(CAST.bee.pause[1], who).toBeLessThan(CAST[who].pause[1])
    }
    for (const who of others('ladybird')) expect(CAST.ladybird.weight, who).toBeLessThan(CAST[who].weight)
    // The moth is never straight: wherever it is in the air, it is tipped one way or the other.
    for (const one of cast.filter((each) => each.who === 'moth' && reach(each, 'lift') > 0.2)) expect(reach(one, 'turn'), label(one)).toBeGreaterThan(0.1)
    // The ant goes in straight lines: it never tips, and it leaves the ground only where it is thrown or startled.
    for (const one of cast.filter((each) => each.who === 'ant')) expect(reach(one, 'turn'), label(one)).toBe(0)
  })

  it('differs in length from action to action within a visitor: nothing runs on one shared clock', () => {
    for (const who of VISITORS) {
      const lengths = cast.filter((one) => one.who === who).map((one) => one.action.seconds)
      expect(new Set(lengths).size, who).toBe(lengths.length)
    }
  })

  it('answers by name through castPose, and an unknown name is rest', () => {
    expect(castPose('snail', 'hat', 2)).toEqual(poseOf(CAST.snail, 'hat', 2))
    expect(castPose('bee', 'hat', 2)).toEqual(AT_REST)
    const out = { ...AT_REST }
    expect(castPose('ant', 'use', 1.5, out)).toBe(out)
    expect(out.part).toBeGreaterThan(0.9)
    expect(VANISH_BUMP_AT > 0 && VANISH_BUMP_AT < 1).toBe(true)
  })
})

/** The most a channel may change between two frames at 60 a second. Legs are a speed, not a place, and are not held to one. */
const STEP: Partial<Record<keyof Channels, number>> = { lean: 0.2, look: 0.3, breath: 0.3, shift: 0.2, lift: 0.3, turn: 0.5, climb: 0.2, part: 0.35, part2: 0.35 }

/** The largest change of a channel between two frames of an action. */
function step(one: One, channel: keyof Channels): number {
  let most = 0, before = 0
  for (let t = 1 / 60; t < one.action.seconds; t += 1 / 60) {
    const now = poseOf(one.actor, one.name, t)[channel]
    most = Math.max(most, Math.abs(now - before))
    before = now
  }
  return most
}

/**
 * The moments that are meant to jump, by action and channel, each with its reason. Even these stay under a cap of
 * two and a half times the bound, so that none is a cut from one pose to another.
 */
const MEANT: Record<string, string> = {
  'snail rattle part': 'the pod bursts in its grip and both eye-stalks are gone at once',
  'snail rattle part2': 'the same burst, the far stalk',
  'bee miss-leaf lift': 'the last point of the jagged leaf springs it into the air',
  'bee poked turn': 'a poke bounces it like a ball and it spins once round',
  'ladybird miss-height-higher turn': 'it topples over backwards as stiff as a board',
  'ladybird miss-height-higher part': 'its wing cases pop open to flip it back onto its feet',
  'ladybird rattle part': 'the pod bursts and its wing cases pop',
  'ladybird poked part': 'a poke startles it and its wing cases pop',
  'ladybird vanish part': 'the beetle walks into it and its wing cases pop in fright',
  'ant rattle part2': 'the pod bursts and its knees go',
}
const CAP = 2.5

/** Whole turns an action is allowed to end on instead of 0, because it was written so: the turn carries on round and the next pose is the same to look at. */
const ENDS_TURNED: Record<string, number> = { 'snail miss-height-higher': 1, 'bee poked': 1 }

/** Lengths the brief gives, in seconds: the least and the most. */
const LENGTHS: Record<string, readonly [number, number]> = {
  'come-in': [1.2, 2.5], 'miss-': [1.6, 3], 'like-': [0.7, 1.1], take: [0.7, 0.9], use: [2.5, 4], settle: [0.9, 1.25], hat: [4, 6], vanish: [4, 6],
}

/** The furthest an idle action may take a visitor from its place: a hair of a step, a low hover, a slight tip. */
const IDLE_REACH: Partial<Record<keyof Channels, number>> = { shift: 0.15, lift: 0.3, turn: 0.4, climb: 0 }

/** The least distance between any two actions, sampled as above. motion.test.ts asks 0.06 of the beetle and the worm. */
const LEAST_APART = 0.08

describe('an action of the cast', () => {
  it('starts at rest and ends at rest, back where the visitor stood', () => {
    for (const one of cast) {
      const { seconds } = one.action, turns = ENDS_TURNED[label(one)] ?? 0
      expect(poseOf(one.actor, one.name, 0), label(one)).toEqual(AT_REST)
      expect(poseOf(one.actor, one.name, seconds), label(one)).toEqual(AT_REST)
      expect(poseOf(one.actor, one.name, seconds + 5), label(one)).toEqual(AT_REST)
      expect(one.action.keys[0], label(one)).toEqual({ at: 0, set: {} })
      expect(one.action.keys[one.action.keys.length - 1], label(one)).toEqual({ at: 1, set: turns ? { turn: turns * TAU } : {} })
      const nearEnd = poseOf(one.actor, one.name, seconds * 0.999)
      for (const channel of CHANNELS) expect(Math.abs(nearEnd[channel] - (channel === 'turn' ? turns * TAU : 0)), `${label(one)} ${channel}`).toBeLessThan(0.05)
      for (let at = 1; at < one.action.keys.length; at++) expect(one.action.keys[at].at, label(one)).toBeGreaterThan(one.action.keys[at - 1].at)
    }
    expect(Object.keys(ENDS_TURNED).every((name) => cast.some((one) => label(one) === name))).toBe(true)
  })

  it('moves: somewhere in it a channel is well away from rest', () => {
    for (const one of cast) expect(Math.max(...sampled(one).map(Math.abs)), label(one)).toBeGreaterThan(0.15)
  })

  it('uses only the channels a visitor may use', () => {
    for (const one of cast) {
      for (const key of one.action.keys) for (const channel of Object.keys(key.set)) expect(VISITOR_CHANNELS, `${label(one)} ${channel}`).toContain(channel)
      for (const channel of CHANNELS) if (!VISITOR_CHANNELS.includes(channel)) expect(reach(one, channel), `${label(one)} ${channel}`).toBe(0)
    }
  })

  it('is no other action of the cast, nor the beetle’s or the worm’s, with the numbers nudged', () => {
    const all = [...cast, ...residents], rows = all.map(sampled)
    let least = Infinity
    for (let a = 0; a < cast.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        const gap = distance(rows[a], rows[b])
        least = Math.min(least, gap)
        expect(gap, `${label(all[a])} against ${label(all[b])}`).toBeGreaterThan(LEAST_APART)
      }
    }
    expect(least).toBeGreaterThan(LEAST_APART)
  })

  it('never jumps between two frames, except at the moments listed, and those under a cap', () => {
    const over: string[] = []
    for (const one of cast) {
      for (const channel of VISITOR_CHANNELS) {
        const bound = STEP[channel]
        if (bound === undefined) continue
        const most = step(one, channel), name = `${label(one)} ${channel}`
        if (name in MEANT) {
          // A listed moment really is one, and is still no cut.
          expect(most, name).toBeGreaterThan(bound)
          expect(most, name).toBeLessThan(bound * CAP)
        } else if (most >= bound) over.push(`${name} ${most.toFixed(2)}`)
      }
    }
    expect(over).toEqual([])
    for (const name of Object.keys(MEANT)) expect(cast.some((one) => name.startsWith(`${label(one)} `)), name).toBe(true)
  })

  it('has every like shorter than every miss of the same visitor, and every length inside its range', () => {
    for (const who of VISITORS) {
      const mine = cast.filter((one) => one.who === who)
      const likes = mine.filter((one) => one.name.startsWith('like-')), misses = mine.filter((one) => one.name.startsWith('miss-'))
      expect(likes.length, who).toBe(4)
      expect(misses.length, who).toBe(3 + HEIGHT_MISSES[who].length)
      expect(Math.max(...likes.map((one) => one.action.seconds)), who).toBeLessThan(Math.min(...misses.map((one) => one.action.seconds)))
      for (const one of mine) {
        const range = Object.entries(LENGTHS).find(([start]) => one.name === start || (start.endsWith('-') && one.name.startsWith(start)))?.[1]
        if (range) expect(one.action.seconds >= range[0] && one.action.seconds <= range[1], `${label(one)} ${one.action.seconds}`).toBe(true)
      }
    }
  })

  it('lets a visitor that waits just live: its idle actions use its funniest part and keep it on its place', () => {
    for (const who of VISITORS) {
      const idles = cast.filter((one) => one.who === who && one.idle)
      expect(idles.some((one) => FUNNIEST[who].some((channel) => reach(one, channel) > 0.3)), who).toBe(true)
      for (const one of idles) {
        for (const [channel, limit] of Object.entries(IDLE_REACH) as [keyof Channels, number][]) expect(reach(one, channel), `${label(one)} ${channel}`).toBeLessThanOrEqual(limit)
        // It does not hurry: nothing an idle action does is a listed jump.
        expect(Object.keys(MEANT).some((name) => name.startsWith(`${label(one)} `)), label(one)).toBe(false)
      }
    }
  })

  it('goes to the plant where the sheet sends it: up the stem, across the petal and off the far side, onto the pot', () => {
    const at = (who: VisitorId, name: string) => cast.find((one) => one.who === who && one.name === name)!
    // The snail too tall: up the stem, then onto its shell (about 2.6), and on round to a whole turn.
    expect(reach(at('snail', 'miss-height-higher'), 'climb')).toBeGreaterThan(0.4)
    expect(poseOf(CAST.snail, 'miss-height-higher', 3 * 0.6).turn).toBeGreaterThan(2.4)
    // The bee on a plain flower: lands at the flower and skids past the plant, beyond -1.
    const skid = at('bee', 'miss-petals')
    let furthest = 0
    for (let t = 0; t < skid.action.seconds; t += 1 / 60) furthest = Math.min(furthest, poseOf(skid.actor, skid.name, t).shift)
    expect(furthest).toBeLessThan(-1.3)
    // The bee over a low plant: past it and back, well off its line the whole way.
    expect(reach(at('bee', 'miss-height-lower'), 'lift')).toBeGreaterThan(0.8)
    // The moth at a red flower ends on the pot: at the foot of the plant, wings folded.
    const pot = poseOf(CAST.moth, 'miss-colour', 2.9 * 0.84)
    expect([Math.round(pot.shift), Math.round(pot.climb), pot.part > 0.7]).toEqual([-1, 0, true])
    // The moth at a spotted one hides behind its wings; the ladybird's cases pop; the ant's knees give under the load.
    expect(reach(at('moth', 'miss-petals'), 'part')).toBeGreaterThan(0.95)
    expect(reach(at('ladybird', 'vanish'), 'part')).toBeGreaterThan(0.95)
    expect(reach(at('ant', 'miss-height-higher'), 'part2')).toBeGreaterThan(0.95)
    // The ladybird holds dead still against the flower until the beetle walks into it, cases shut tight.
    for (let share = 0.3; share < VANISH_BUMP_AT; share += 0.02) {
      const pose = poseOf(CAST.ladybird, 'vanish', 4.8 * share)
      expect([pose.part, pose.legs, pose.shift, pose.climb], `${share}`).toEqual([0, 0, -1, 1])
    }
  })
})
