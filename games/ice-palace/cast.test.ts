import { describe, expect, it } from 'vitest'
import { AT, AT_NIGHT, HARE_S, POKED, REACTIONS, WHO, birdPose, fishPose, harePose, kingPose, lampPose, peeperPose, reactionOf, sunPose, type Actor } from './cast'
import castSource from './cast.ts?raw'
import figures from './figures.ts?raw'
import { BUILD, GROUND_Y, KEEP_OUT, onPond } from './ground'
import kids from './kids.ts?raw'
import viewThings from './viewThings.ts?raw'
import { SOUNDS } from './voices'

const idle: Actor = { what: null, age: 0, next: [] }
const doing = (what: string, age: number): Actor => ({ what, age, next: [] })

/** One number a frame for each character's idle: the part of it that moves most. */
const signals: Record<string, (t: number) => number> = {
  king: (t) => kingPose(t, idle).nod + kingPose(t, idle).breath * 0.3,
  lamp: (t) => lampPose(t, idle).legs,
  peeper: (t) => peeperPose(t, idle).left + peeperPose(t, idle).right,
  sun: (t) => sunPose(t, idle).droop + sunPose(t, idle).breath * 0.3,
  bird: (t) => birdPose(t, idle).hop + birdPose(t, idle).cock * 0.3,
  fish: (t) => fishPose(t, idle, 0).x / 150,
  hare: (t) => harePose(t % HARE_S, -1).hop,
}

function alike(a: (t: number) => number, b: (t: number) => number): number {
  const n = 60 * 40
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0
  for (let i = 0; i < n; i++) {
    const x = a(i / 60), y = b(i / 60)
    sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y
  }
  const cov = sab / n - (sa / n) * (sb / n), va = saa / n - (sa / n) ** 2, vb = sbb / n - (sb / n) ** 2
  return cov / Math.sqrt(va * vb)
}

describe('the cast', () => {
  it('moves at idle, each one like itself: no two idles follow each other', () => {
    const names = Object.keys(signals)
    for (const name of names) {
      const values = Array.from({ length: 60 * 12 }, (_, i) => signals[name](i / 60))
      expect(Math.max(...values) - Math.min(...values), `${name} moves`).toBeGreaterThan(0.3)
    }
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      expect(Math.abs(alike(signals[names[i]], signals[names[j]])), `${names[i]} and ${names[j]}`).toBeLessThan(0.5)
    }
  })

  it('has a reaction to a poke for everyone a finger can reach, each with its own sound', () => {
    const sounds = new Set<string>()
    for (const who of ['king', 'lamp', 'peeper', 'sun', 'bird', 'hare'] as const) {
      const reaction = reactionOf(who, POKED[who])
      expect(reaction.sound).not.toBeNull()
      expect(SOUNDS).toContain(reaction.sound)
      sounds.add(reaction.sound!)
      expect(reaction.lasts).toBeLessThanOrEqual(2)
    }
    expect(sounds.size).toBe(6)
  })

  it('shows every reaction: the pose in the middle of one differs from the idle', () => {
    const poses: Record<string, (t: number, actor: Actor) => unknown> = { king: kingPose, lamp: lampPose, peeper: peeperPose, sun: sunPose, bird: birdPose, fish: (t, actor) => fishPose(t, actor, 0) }
    for (const who of WHO) for (const what of Object.keys(REACTIONS[who])) {
      if (who === 'hare') continue
      const mid = reactionOf(who, what).lasts * 0.35
      expect(JSON.stringify(poses[who](3, doing(what, mid))), `${who} ${what}`).not.toBe(JSON.stringify(poses[who](3, idle)))
    }
    // The hare's bolt is its whole crossing: it is told by the clock of the bolt.
    expect(harePose(2, 0.3)).not.toEqual(harePose(2, -1))
  })

  it('shows every taste: the lamp child seeking, pointing, with its nose on lit ice and frowning at snow, and the peeper leaning round a block', () => {
    const moods = (['seek', 'point', 'nose', 'frown'] as const).map((mood) => JSON.stringify(lampPose(1, idle, mood)))
    expect(new Set(moods).size).toBe(4)
    expect(peeperPose(1, idle, true)).not.toEqual(peeperPose(1, idle, false))
    expect(kingPose(9.5, idle, true).nod).toBe(0)
  })

  it('wakes the king whenever he does anything, and lets him doze when he does not', () => {
    const dozing = Array.from({ length: 11 * 60 }, (_, i) => kingPose(i / 60, idle).nod)
    expect(Math.max(...dozing)).toBeGreaterThan(0.8)
    expect(kingPose(9.5, doing('brows', 0.2)).nod).toBe(0)
  })

  it('draws every value a pose holds: each one is read where the figure is drawn', () => {
    const drawn: [string, object, string][] = [
      ['king', kingPose(1, idle), figures],
      ['sun', sunPose(1, idle), figures],
      // The lamp child's arm and lamp are numbers of their own (cast.ts), which the drawing and the tests both read.
      ['lamp', lampPose(1, idle), kids + castSource.slice(castSource.indexOf('export function lampArm'))],
      ['peeper', peeperPose(1, idle), kids],
      ['bird', birdPose(1, idle), kids],
      ['fish', fishPose(1, idle, 0), kids],
      ['hare', harePose(1, -1), kids],
    ]
    for (const [who, pose, source] of drawn) for (const key of Object.keys(pose)) expect(source.includes(`pose.${key}`), `${who}: ${key} is worked out and never drawn`).toBe(true)
    // And what the rules keep for a thing: its squash, wobble, turn, warmth, cap, dents and spin.
    for (const key of ['squash', 'wobble', 'turn', 'heat', 'capAge', 'cap', 'dent', 'spin', 'mode', 'age']) expect(viewThings.includes(`piece.${key}`), `a thing's ${key}`).toBe(true)
  })

  it('stands everyone clear of the bank where the palace goes, by day and by night', () => {
    expect(AT.lamp.x + 100).toBeLessThanOrEqual(BUILD.x0)
    expect(AT.king.x - 118).toBeGreaterThanOrEqual(BUILD.x1)
    expect(onPond(AT.fish.x, AT.fish.y)).toBe(true)
    expect(AT.king.y).toBeGreaterThanOrEqual(GROUND_Y)
    // At night the frost children stand where nothing can lie: inside the places kept clear below the bank.
    for (const at of [AT_NIGHT.lamp, AT_NIGHT.peeper]) expect(KEEP_OUT.some((r) => at.x >= r.x && at.x <= r.x + r.w && at.y >= r.y && at.y <= r.y + r.h)).toBe(true)
  })
})
