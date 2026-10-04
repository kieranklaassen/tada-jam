import { describe, expect, it } from 'vitest'
import { BREATH as BREATH_TEST, finding, knockRight, knockWrong, meeting, reunion, round, sceneSeconds, showing } from './beats'
import { LADDER } from './config'
import { type Clutch, FIRST_SEED, stir } from './layout'
import { ENTRANCE_SECONDS } from './motion'
import { WIDE } from './figures'
import { STONE_FEET, bringerSpot, nestOf, pictureOf, slotSpot, targetOf, waitersOf, whatIsAt } from './picture'
import { FORMS } from './places'
import { type Act, BEAT, BREATHLESS, type Play, aloneAt, bareSound, besideStone, boundFor, hillSpots, direct, directRound, GULP, knockSpot, withGulp, familyAt, finalSpot, joinSound, HEARD_STEP, LEAVES_FALL, LONGEST_VOICE, LUNGE, notesOf, riderOn, roundWith, SET_DOWN, tapsFrom, TIP_FLY, twinAt } from './plays'
import { askerSize, bringerSize, edgeSize, littleSize } from './sizes'
import { EGG, STAGE, eggSpots } from './stage'
import { IN_STEP_TAIL } from './reactions'
import { reactionOf } from './tastes'
import { KINDS, RUSTLE, VOICES, callOf, callSeconds } from './voices'
import { type Action, type World, act, freshWorld } from './world'

const VIEW = { x: 0, y: 0, w: STAGE.width, h: STAGE.height }
const slot = (at: number): Action => ({ type: 'slot', slot: at })
const edge: Action = { type: 'edge' }

/** One tap on a world: the world after it and the play for it. */
function tapped(world: World, action: Action): { world: World; play: Play | null } {
  const step = act(world, action)
  return { world: step.world, play: direct(step.happened, action, world, step.world, VIEW, 0) }
}
function after(world: World, ...actions: Action[]): World {
  for (const action of actions) world = act(world, action).world
  return world
}
const waiting = (next: Clutch): World => ({ ...freshWorld(null), position: next.place, shown: [...FORMS], next, extra: 'dooo' })
const seek = (): Clutch => ({ form: 'seek', place: 'three-eggs', kinds: ['pip', 'hoom', 'wheep'], slots: ['fresh', 'fresh', 'fresh'], queue: ['hoom', 'wheep', 'pip'], asker: null, wrong: 0 })
const who = (): Clutch => ({ form: 'who', place: 'who-is-inside', kinds: ['pip', 'tok', 'hoom'], slots: ['fresh', 'fresh', 'fresh'], queue: ['tok', 'hoom', 'pip'], asker: null, wrong: 0 })
const alike = (): Clutch => ({ form: 'alike', place: 'two-alike', kinds: ['pip', 'hoom', 'hoom', 'pip'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: [], asker: null, wrong: 0 })

const does = (play: Play, who: string) => play.acts.filter((one) => one.who === who).map((one) => one.do)
const calls = (play: Play) => play.acts.filter((one): one is Extract<Act, { do: 'call' }> => one.do === 'call')
/** Where a cast member has been sent by the time `at` comes. */
function finalSpotBefore(play: Play, id: string, at: number) {
  let spot = play.cast.find((one) => one.id === id)!.from
  for (const act of play.acts) if (act.who === id && act.do === 'go' && act.at < at) spot = act.to
  return spot
}

describe('the reunion', () => {
  it('takes its time from the scene, lets both be heard and then sound as one, and ends with the two in their place on the hill', () => {
    const before = after(waiting(seek()), edge, slot(1))
    const { world, play } = tapped(before, slot(1))
    const place = world.hill[0].place
    expect(play!.seconds).toBeCloseTo(sceneSeconds(reunion('hoom')), 9)
    expect(does(play!, 'out')).toEqual(['enter', 'go', 'call', 'call', 'react', 'go', 'go'])
    expect(does(play!, 'seeker')).toEqual(['call', 'call', 'react', 'go'])
    expect(does(play!, 'shell')).toEqual(['burst'])
    // It comes out in one leap that lands beside the asker, so the two stand next to each other to be heard.
    const leap = play!.acts.find((one): one is Extract<Act, { do: 'go' }> => one.who === 'out' && one.do === 'go')!
    expect([leap.to, leap.hops, leap.lasts]).toEqual([besideStone('hoom'), 1, ENTRANCE_SECONDS.hoom])
    // Sounding as one, each sings in step in its kind's own way, from the moment they call together until the little one climbs on.
    const inStep = play!.acts.filter((one): one is Extract<Act, { do: 'react' }> => one.do === 'react')
    expect(inStep.map((one) => [one.who, one.how])).toEqual([['out', 'in-step'], ['seeker', 'in-step']])
    expect(play!.acts.find((one) => one.who === 'out' && one.do === 'enter')!.lasts).toBe(ENTRANCE_SECONDS.hoom)
    // The little one is heard first, then the one who asked, then the two at the same moment.
    const [first, second, third, fourth] = calls(play!)
    expect([first.who, second.who]).toEqual(['out', 'seeker'])
    expect(second.at).toBeGreaterThan(first.at + first.lasts)
    expect(third.at).toBe(fourth.at)
    // On the hill the grown one stands where the saved world has the family, and the little one rides on it.
    expect(play!.hidden).toContain(`hill:${place}`)
    expect(finalSpot(play!, 'seeker')).toEqual(familyAt('hoom', place))
    expect(finalSpot(play!, 'out')).toEqual(riderOn(familyAt('hoom', place)))
    const thing = pictureOf(world, VIEW).things.find((one) => one.key === `hill:${place}`)!
    expect({ x: thing.x, y: thing.y, size: thing.size }).toEqual(familyAt('hoom', place))
    // It starts where the asker stood and where the hide stood.
    expect(play!.cast.find((one) => one.id === 'seeker')!.from).toEqual({ ...STONE_FEET, size: askerSize('hoom') })
  })

  it('in a row of pairs brings two little ones together, side by side', () => {
    const before = after(waiting(alike()), edge, slot(1), slot(1), slot(2))
    const { world, play } = tapped(before, slot(2))
    const place = world.hill[0].place
    expect(world.hill[0]).toMatchObject({ kind: 'hoom', as: 'twins' })
    expect(play!.cast.find((one) => one.id === 'seeker')!.body).toBe('little')
    expect([finalSpot(play!, 'out'), finalSpot(play!, 'seeker')]).toEqual([twinAt('hoom', place, 1), twinAt('hoom', place, -1)])
  })
})

describe('the meeting that does not match', () => {
  it('lets the one who came out be heard, then the asker, then each react by its taste, and sends it up the hill alone', () => {
    const before = after(waiting(seek()), edge, slot(0))
    const { world, play } = tapped(before, slot(0))
    expect(play!.seconds).toBeCloseTo(sceneSeconds(meeting('hoom', 'pip')), 9)
    const [first, second] = calls(play!)
    expect([first.who, first.kind, second.who, second.kind]).toEqual(['out', 'pip', 'asker', 'hoom'])
    const reacts = play!.acts.filter((one): one is Extract<Act, { do: 'react' }> => one.do === 'react')
    expect(reacts.map((one) => [one.who, one.how])).toEqual([['asker', reactionOf('hoom', 'pip')], ['out', reactionOf('pip', 'hoom')]])
    expect(reacts[0].at).toBe(reacts[1].at)
    // The asker stays at the stone: it is not on stage as a cast member, the picture's own asker acts.
    expect(play!.cast.map((one) => one.id).sort()).toEqual(['out', 'shell'])
    // The one let out lands beside the asker at the stone before either calls: the two are heard and seen side by side.
    const leap = play!.acts.find((one): one is Extract<Act, { do: 'go' }> => one.who === 'out' && one.do === 'go')!
    expect(leap.to).toEqual(besideStone('pip'))
    expect(leap.at + leap.lasts).toBeLessThanOrEqual(first.at)
    expect(play!.hidden).not.toContain('asker')
    expect(finalSpot(play!, 'out')).toEqual(aloneAt('pip', world.hill[0].place))
  })

  it('is a different play for every two kinds', () => {
    const plays = new Set<string>()
    for (const asker of KINDS) for (const other of KINDS) {
      if (asker === other) continue
      const third = KINDS.find((kind) => kind !== asker && kind !== other)!
      const cycle: Clutch = { form: 'seek', place: 'three-eggs', kinds: [asker, other, third], slots: ['heard', 'heard', 'heard'], queue: [other, third], asker, wrong: 0 }
      const world: World = { ...freshWorld(null), position: 'three-eggs', finished: false, shown: [...FORMS], next: null, cycle }
      plays.add(JSON.stringify(tapped(world, slot(1)).play!.acts))
    }
    expect(plays.size).toBe(30)
  })
})

describe('who-is-inside', () => {
  it('has the grown one walk to the stone and knock: its own egg bursts, and the two go up the hill', () => {
    const before = after(waiting(who()), edge, slot(1))
    const { world, play } = tapped(before, slot(1))
    expect(play!.seconds).toBeCloseTo(sceneSeconds(knockRight('tok')), 9)
    // The beats of every reunion: the one who came out calls, then the other, here the grown one who knocked, then the two as one.
    expect(does(play!, 'grown')).toEqual(['go', 'lunge', 'call', 'call', 'react', 'go'])
    const [alone, answer, one, other] = calls(play!)
    expect([alone.who, answer.who]).toEqual(['out', 'grown'])
    expect(answer.at).toBeGreaterThan(alone.at + alone.lasts)
    expect(one.at).toBe(other.at)
    expect(does(play!, 'shell')).toEqual(['burst'])
    expect(does(play!, 'out')).toEqual(['enter', 'call', 'call', 'react', 'go', 'go'])
    expect(finalSpot(play!, 'grown')).toEqual(familyAt('tok', world.hill[0].place))
    expect(finalSpot(play!, 'out')).toEqual(riderOn(familyAt('tok', world.hill[0].place)))
  })

  it('sends a grown one whose voice it is not back to its spot, after the egg has answered and it has reacted', () => {
    const before = after(waiting(who()), edge, slot(0))
    const { world, play } = tapped(before, slot(0))
    expect(play!.seconds).toBeCloseTo(sceneSeconds(knockWrong('tok', 'pip')), 9)
    expect(does(play!, 'grown')).toEqual(['go', 'lunge', 'call', 'react', 'go'])
    const [answer, mine] = calls(play!)
    expect([answer.who, answer.kind, answer.inside, mine.who, mine.inside]).toEqual(['asker', 'tok', true, 'grown', false])
    const home = pictureOf(world, VIEW).things.find((one) => one.key === 'slot:0')!
    expect(finalSpot(play!, 'grown')).toEqual({ x: home.x, y: home.y, size: home.size })
    expect(play!.hidden).toEqual(['slot:0'])
  })
})

describe('the finding on the hill', () => {
  it('brings the one who comes to ask straight up to its own, who waited alone', () => {
    const before = after(waiting(seek()), edge, slot(0), slot(0), slot(1), slot(1), edge, slot(2), slot(2))
    const alone = before.hill.find((one) => one.as === 'single')!
    const { play } = tapped(before, edge)
    expect(does(play!, 'comer').slice(0, 5)).toEqual(['go', 'call', 'call', 'react', 'go'])
    expect(does(play!, 'alone').slice(0, 4)).toEqual(['call', 'call', 'react', 'go'])
    // The choir follows in the same play, and the two who have just come together are in it like everyone else:
    // each turns to the front, calls when its turn comes and calls with all at the end. Their place on the hill
    // is not drawn until the play is over, so the choir is theirs to do.
    expect(play!.hidden).toContain(`hill:${alone.place}`)
    for (const who of ['comer', 'alone']) expect(does(play!, who).slice(-3), who).toEqual(['face', 'call', 'call'])
    // One voice for the two of them, each time.
    const sung = calls(play!).filter((one) => one.who === 'comer').slice(-2)
    for (const one of sung) expect(play!.sounds.filter((sound) => 'call' in sound && sound.at === one.at && sound.call.kind === 'pip')).toHaveLength(1)
    expect(finalSpot(play!, 'comer')).toEqual(familyAt('pip', alone.place))
    expect(finalSpot(play!, 'alone')).toEqual(riderOn(familyAt('pip', alone.place)))
    // It was the last of the clutch, so the choir follows in the same play.
    expect(play!.seconds).toBeGreaterThan(sceneSeconds(finding('pip')) + 4)
  })
})

describe('the showing and the clutch coming in', () => {
  it('plays the showing first, then lets the hides tumble into the row, then brings the one who asks to the stone', () => {
    const { world, play } = tapped(freshWorld(null), edge)
    const shower = world.hill[0], length = sceneSeconds(showing('seek', shower.kind))
    const firstEgg = play!.acts.find((one) => one.who === 'in:0')!, comer = play!.acts.find((one) => one.who === 'comer')!
    expect(firstEgg.at).toBeGreaterThanOrEqual(length - 1e-9)
    expect(comer.at).toBeGreaterThan(firstEgg.at)
    expect(does(play!, 'shower')).toEqual(['go', 'call', 'lunge', 'call', 'lunge', 'call', 'react', 'go'])
    expect(does(play!, 'shown')).toEqual(['slide', 'call', 'wake', 'call', 'burst'])
    expect(finalSpot(play!, 'shower')).toEqual(familyAt(shower.kind, shower.place))
    // Everything the play shows on its way is left out of the picture until it is there.
    expect(play!.hidden.sort()).toEqual(['asker', `hill:${shower.place}`, 'slot:0', 'slot:1'].sort())
    world.cycle!.kinds.forEach((_, i) => {
      const thing = pictureOf(world, VIEW).things.find((one) => one.key === `slot:${i}`)!
      expect(finalSpot(play!, `in:${i}`)).toMatchObject({ x: thing.x, y: thing.y })
    })
    expect(finalSpot(play!, 'comer')).toEqual({ ...STONE_FEET, size: askerSize(world.cycle!.asker!) })
  })
})

describe('the round', () => {
  it('has two of one family call in turn and together, for as long as the scene says, and changes nothing', () => {
    const world: World = { ...freshWorld(null), hill: [{ kind: 'pip', as: 'family', place: 0 }, { kind: 'tok', as: 'twins', place: 2 }] }
    const play = directRound(world.hill[0], world.hill[1], world, VIEW)
    expect(play.seconds).toBeCloseTo(sceneSeconds(round('pip', 'tok')), 9)
    expect(new Set(play.acts.map((one) => one.who))).toEqual(new Set(['hill:0', 'hill:2']))
    expect(play.cast).toEqual([])
    expect(play.hidden).toEqual([])
  })
})

describe('tapped while another one on the hill calls', () => {
  const calls = (kind: 'pip' | 'tok' | 'hoom' | 'brrl' | 'wheep' | 'dooo', remaining: number, since = 0) => joinSound(kind, remaining, since).sounds.flatMap((one) => ('call' in one ? [one.at] : []))

  it('pip peeps on every beat of the other call, and never more than four times', () => {
    // The other's call has a beat at its start and one every BEAT after that. Tapped 0.1 s into a call of 0.9 s,
    // pip peeps on the two beats still to come, counted from the start of that call and not from the finger.
    const near = (got: number[], want: number[]) => { expect(got).toHaveLength(want.length); got.forEach((at, i) => expect(at).toBeCloseTo(want[i], 9)) }
    near(calls('pip', 0.8, 0.1), [BEAT - 0.1, 2 * BEAT - 0.1])
    near(calls('pip', 0.9, 0), [BEAT, 2 * BEAT])
    // With no beat left it still peeps once, at once.
    near(calls('pip', 0.1, 0.8), [0.03])
    expect(calls('pip', 9, 0.2)).toHaveLength(4)
    // The picture is told when each peep starts.
    expect(joinSound('pip', 0.8, 0.1).callsAfter).toEqual(calls('pip', 0.8, 0.1))
  })

  it('tok puts the two notes of its double peep into the next two gaps between the beats of the other call', () => {
    for (const since of [0.02, 0.1, 0.2, 0.31, 0.5]) {
      const joined = joinSound('tok', 0.9 - since, since), notes = joined.sounds.flatMap((one) => ('call' in one ? [one] : []))
      expect(notes.map((one) => one.call.note)).toEqual([0, 1])
      expect(joined.callsAfter).toEqual(notes.map((one) => one.at))
      for (const one of notes) {
        // Half way between two beats, counted from the start of the other's call, and never before the finger.
        expect(((since + one.at) / BEAT) % 1).toBeCloseTo(0.5, 9)
        expect(one.at).toBeGreaterThanOrEqual(0.03 - 1e-9)
        // One note of its call and no more: the same high, short note each time.
        expect(notesOf(one.call)).toEqual([{ ...callOf('tok')[one.call.note!], at: 0 }])
      }
      expect(notes[0].at).toBeLessThanOrEqual(BEAT + 0.03)
      expect(notes[1].at - notes[0].at).toBeCloseTo(BEAT, 9)
    }
  })

  it('wheep answers the other call and dooo finishes it: each sounds once the other is over', () => {
    for (const kind of ['wheep', 'dooo'] as const) {
      const joined = joinSound(kind, 0.6)
      expect(calls(kind, 0.6)).toEqual([0.65])
      expect(joined.callsAfter).toBe(0.65)
    }
  })

  it('hoom and brrl sound with it at once, and every one of the six answers the finger with a sound as it lands', () => {
    for (const kind of ['hoom', 'brrl'] as const) expect(calls(kind, 0.6)).toEqual([0.03])
    for (const kind of KINDS) {
      const joined = joinSound(kind, 0.5)
      expect(joined.sounds[0].at).toBe(0)
      expect(joined.sounds.some((one) => 'call' in one && one.call.kind === kind && !one.call.inside)).toBe(true)
    }
  })
})

describe('the one who asks, tapped again and again', () => {
  it('takes one huge gulp of air after several taps in a row, heard as the finger lands, and then calls as it does each time, with everyone still hidden answering', () => {
    const world = after(waiting(seek()), edge)
    const { play: plain } = tapped(world, { type: 'asker' }), play = withGulp(plain!)
    expect(BREATHLESS).toBeGreaterThanOrEqual(3)
    expect([play.acts[0].who, play.acts[0].do, play.acts[0].at, play.acts[0].lasts]).toEqual(['asker', 'gulp', 0, GULP])
    expect(play.sounds[0].at).toBe(0)
    expect('puffs' in play.sounds[0]).toBe(true)
    // It calls each time: the same calls as on any tap on it, the asker's and every hidden one's, after the gulp.
    expect(calls(plain!).length).toBe(1 + world.cycle!.kinds.length)
    expect(calls(play).map((one) => [one.who, one.kind, one.at])).toEqual(calls(plain!).map((one) => [one.who, one.kind, one.at + GULP]))
    expect(play.sounds.filter((one) => 'call' in one)).toHaveLength(calls(plain!).length)
    expect(play.seconds).toBeCloseTo(plain!.seconds + GULP, 9)
    expect(play.cast).toEqual(plain!.cast)
    expect(play.hidden).toEqual(plain!.hidden)
  })
})

describe('every play of a long game', () => {
  /** Every tap of seeded games from every place, with its play. */
  function every(): { play: Play; action: Action; world: World }[] {
    const out: { play: Play; action: Action; world: World }[] = []
    for (const [n, place] of LADDER.entries()) {
      let world = freshWorld(null, stir(FIRST_SEED, n), place), rng = stir(FIRST_SEED, 40 + n)
      for (let i = 0; i < 260; i++) {
        rng = stir(rng, i)
        const roll = rng % 100, spot = (rng >>> 8) % 4, cycle = world.cycle
        const right = cycle && !world.finished && cycle.asker !== null ? cycle.kinds.findIndex((kind, at) => kind === cycle.asker && cycle.slots[at] !== 'done') : spot
        const action: Action = roll < 35 ? slot(right) : roll < 60 ? slot(spot) : roll < 80 ? edge : roll < 88 ? { type: 'asker' } : { type: 'basket' }
        const step = tapped(world, action)
        if (step.play) out.push({ play: step.play, action, world: step.world })
        world = step.world
      }
    }
    return out
  }
  const plays = every()

  it('answers the finger with a sound at the moment it lands', () => {
    expect(plays.length).toBeGreaterThan(600)
    for (const { play } of plays) expect(play.sounds[0].at).toBeLessThanOrEqual(0.02)
  })

  it('never lets two calls sound at once unless they are meant to sound together', () => {
    for (const { play } of plays) {
      const all = calls(play).sort((a, b) => a.at - b.at)
      for (let i = 1; i < all.length; i++) {
        const before = all[i - 1], now = all[i]
        if (now.at < before.at + Math.max(before.lasts, callSeconds(VOICES[before.kind])) - 1e-9) expect(now.at, JSON.stringify([before, now])).toBeCloseTo(before.at, 9)
      }
      // A call is shown for as long as it sounds. A leaf pile is the one exception: its rustle is as long whoever calls.
      for (const one of all) expect([callSeconds(VOICES[one.kind]), ...(one.inside && one.who.startsWith('slot:') ? [RUSTLE.seconds] : [])]).toContain(one.lasts)
    }
  })

  it('sounds every call it shows, at the moment it shows it', () => {
    for (const { play } of plays) {
      const shown = calls(play).map((one) => `${one.at.toFixed(4)} ${one.kind} ${one.inside}`).sort()
      const heard = play.sounds.flatMap((one) => ('call' in one ? [`${one.at.toFixed(4)} ${one.call.kind} ${one.call.inside}`] : [])).sort()
      // In the choir a family that has just arrived is two figures with one voice: both show the call, and it sounds once.
      expect([...new Set(heard)]).toEqual([...new Set(shown)])
      expect(heard.length).toBeLessThanOrEqual(shown.length)
    }
  })

  it('reaches every way of asking, leaf piles, the basket and the choir', () => {
    const seen = new Set<string>()
    for (const { play, world } of plays) {
      if (world.cycle) seen.add(world.cycle.form)
      for (const one of play.cast) seen.add(`cast:${one.body}`)
      for (const one of play.acts) seen.add(`do:${one.do}`)
    }
    for (const want of ['seek', 'who', 'alike', 'cast:pile', 'cast:nest', 'cast:bowl', 'cast:family', 'do:react', 'do:face', 'do:arrive', 'do:fade', 'do:lunge', 'do:wake']) expect(seen, want).toContain(want)
  })

  it('is never longer than the showing, a clutch coming in and a first call together', () => {
    for (const { play } of plays) {
      expect(play.seconds).toBeGreaterThan(0)
      expect(play.seconds).toBeLessThan(26)
    }
  })
})

// The second column of the grid in ART.md: each kind has its own picture of two who sound as one.
describe('the picture of a reunion, kind by kind', () => {
  type Kind = (typeof KINDS)[number]
  const others: Record<Kind, Kind> = { pip: 'hoom', tok: 'hoom', hoom: 'pip', brrl: 'pip', wheep: 'pip', dooo: 'pip' }
  /** A reunion of `kind` in a row of two: it asks, and its own hide is opened. */
  const reunited = (kind: Kind) => {
    const next: Clutch = { form: 'seek', place: 'two-eggs', kinds: [others[kind], kind], slots: ['fresh', 'fresh'], queue: [kind, others[kind]], asker: null, wrong: 0 }
    const before = after(waiting(next), edge, slot(1))
    return tapped(before, slot(1)).play!
  }
  /** The egg of `kind` is at the stone in `who`, and its own grown one is sent to knock. */
  const knocked = (kind: Kind) => {
    const next: Clutch = { form: 'who', place: 'who-is-inside', kinds: [others[kind], kind], slots: ['fresh', 'fresh'], queue: [kind, others[kind]], asker: null, wrong: 0 }
    const before = after(waiting(next), edge, slot(1))
    return tapped(before, slot(1)).play!
  }
  const inStep = (play: Play) => play.acts.filter((one): one is Extract<Act, { do: 'react' }> => one.do === 'react' && one.how === 'in-step')
  const asker = (kind: Kind) => ({ ...STONE_FEET, size: askerSize(kind) })

  it('lasts the call and a little longer, with each of the two leaning the way the other stands', () => {
    for (const kind of KINDS) {
      for (const [play, right, left] of [[reunited(kind), 'out', 'seeker'], [knocked(kind), 'grown', 'out']] as const) {
        const last = inStep(play).filter((one) => one.much === undefined)
        expect(last.map((one) => one.who).sort(), kind).toEqual([left, right].sort())
        for (const one of last) expect(one.lasts, kind).toBeCloseTo(callSeconds(VOICES[kind]) + IN_STEP_TAIL, 9)
        // `away` is the side the other is not on. On the head of the other the two share a spot, and either side will do.
        if (kind !== 'pip') {
          expect(last.find((one) => one.who === left)!.away, kind).toBe(-1)
          expect(last.find((one) => one.who === right)!.away, kind).toBe(1)
        }
      }
    }
  })

  it('pip shoots out and lands on the head of the one who asks, in front of it, and rides there while the two peep', () => {
    const play = reunited('pip'), leap = play.acts.find((one): one is Extract<Act, { do: 'go' }> => one.who === 'out' && one.do === 'go')!
    expect(leap.to).toEqual(riderOn(asker('pip')))
    expect([leap.hops, leap.lasts]).toEqual([1, ENTRANCE_SECONDS.pip])
    expect(play.cast.find((one) => one.id === 'out')!.rides).toBe('seeker')
    expect(play.cast.findIndex((one) => one.id === 'seeker')).toBeLessThan(play.cast.findIndex((one) => one.id === 'out'))
    // In `who` it lands on the head of the grown one who knocked.
    const sent = knocked('pip'), up = sent.acts.find((one): one is Extract<Act, { do: 'go' }> => one.who === 'out' && one.do === 'go')!
    expect(up.to).toEqual(riderOn(finalSpotBefore(sent, 'grown', up.at)))
    expect(sent.cast.find((one) => one.id === 'out')!.rides).toBe('grown')
    // Every other kind lands beside the one who asks.
    for (const kind of KINDS.filter((one) => one !== 'pip')) {
      const other = reunited(kind).acts.find((one): one is Extract<Act, { do: 'go' }> => one.who === 'out' && one.do === 'go')!
      expect(other.to, kind).toEqual(besideStone(kind))
    }
  })

  it('adds no sound of its own to the two voices: what is heard while two sound as one is the two calls', () => {
    for (const kind of KINDS) for (const play of [reunited(kind), knocked(kind)]) {
      const at = inStep(play).find((one) => one.much === undefined)!.at, lasts = callSeconds(VOICES[kind])
      expect(play.sounds.filter((one) => 'puffs' in one && one.at >= at && one.at < at + lasts), kind).toEqual([])
      expect(play.sounds.filter((one) => 'call' in one && one.at === at), kind).toHaveLength(2)
    }
  })

  it('wheep bounces on every glide and higher each time; no other kind moves before the two sound as one', () => {
    const play = reunited('wheep')
    for (const who of ['out', 'seeker']) {
      const much = inStep(play).filter((one) => one.who === who).sort((a, b) => a.at - b.at).map((one) => one.much ?? 1)
      expect(much).toHaveLength(3)
      expect(much[0]).toBeLessThan(much[1])
      expect(much[1]).toBeLessThan(much[2])
      expect(much[2]).toBe(1)
    }
    // One bounce for each call that is heard: the little one's, the asker's, and the two together.
    const glides = [...new Set(calls(play).map((one) => one.at))].sort((a, b) => a - b)
    expect([...new Set(inStep(play).map((one) => one.at))].sort((a, b) => a - b)).toEqual(glides)
    // In `who` it is the same three glides: the one who came out, the grown one who knocked, and the two as one.
    expect(inStep(knocked('wheep')).filter((one) => one.who === 'out').map((one) => one.much ?? 1)).toEqual([1 / 3, 2 / 3, 1])
    for (const kind of KINDS.filter((one) => one !== 'wheep')) expect(inStep(reunited(kind)), kind).toHaveLength(2)
  })
})

describe('a call from a leaf pile', () => {
  it('rustles as long whoever calls from it, so the eye learns nothing there; an egg moves as long as its voice', () => {
    for (const place of ['three-eggs', 'leaf-piles'] as const) {
      for (const kind of KINDS) {
        const other = kind === 'hoom' ? 'pip' : 'hoom'
        const next: Clutch = { form: 'seek', place, kinds: [other, kind], slots: ['fresh', 'fresh'], queue: [other, kind], asker: null, wrong: 0 }
        const play = tapped(after(waiting(next), edge), slot(1)).play!
        const hide = calls(play).find((one) => one.who === 'slot:1')!
        expect(hide.inside).toBe(true)
        expect(hide.lasts, `${place} ${kind}`).toBe(place === 'leaf-piles' ? RUSTLE.seconds : callSeconds(VOICES[kind]))
        // The rustle is heard as well as seen, and only from a pile: a soft sound that is not a voice, as the call starts.
        expect(play.sounds.filter((one) => 'puffs' in one && one.at === hide.at).length, `${place} ${kind}`).toBe(place === 'leaf-piles' ? 1 : 0)
        // The voice itself is what it is, and so is the answer of the one who asks.
        expect(play.sounds.some((one) => 'call' in one && one.call.kind === kind && one.call.inside && one.at === hide.at)).toBe(true)
        const answer = calls(play).find((one) => one.who === 'asker')!
        expect(answer.at).toBeGreaterThanOrEqual(hide.at + hide.lasts - 1e-9)
        // Among leaf piles the answer waits as long whoever called, so not even the pause shows how long the voice
        // was; among eggs it comes when the voice is over.
        expect(answer.at - hide.at, `${place} ${kind}`).toBeCloseTo((place === 'leaf-piles' ? LONGEST_VOICE : callSeconds(VOICES[kind])) + BREATH_TEST, 9)
      }
    }
  })
})

describe('the round', () => {
  const hill = (): World => ({ ...freshWorld(null), hill: [{ kind: 'pip', as: 'family', place: 0 }, { kind: 'tok', as: 'single', place: 1 }, { kind: 'hoom', as: 'twins', place: 3 }] })

  it('is sung by two of one family tapped one straight after the other, in either order and after any wait', () => {
    const world = hill(), [pip, tok, hoom] = world.hill
    // There is no clock in it: only who was tapped last, with nothing touched since.
    expect(roundWith.length).toBe(3)
    expect(roundWith(world, { kind: 'pip', place: 0 }, tok)).toBe(pip)
    expect(roundWith(world, { kind: 'tok', place: 1 }, pip)).toBe(tok)
    expect(roundWith(world, { kind: 'pip', place: 0 }, hoom)).toBeNull()
    expect(roundWith(world, { kind: 'hoom', place: 3 }, tok)).toBeNull()
    // The same one twice is not a round, nor is a first tap, nor a tap after the first of the two has left the hill.
    expect(roundWith(world, { kind: 'pip', place: 0 }, pip)).toBeNull()
    expect(roundWith(world, null, tok)).toBeNull()
    expect(roundWith({ ...world, hill: [tok, hoom] }, { kind: 'pip', place: 0 }, tok)).toBeNull()
    expect(roundWith({ ...world, hill: [{ kind: 'brrl', as: 'single', place: 0 }, tok] }, { kind: 'pip', place: 0 }, tok)).toBeNull()
  })
})

describe('the showing', () => {
  /** The first clutch of a way of asking the child has not met comes in: the showing plays first. */
  const shown = (next: Clutch) => tapped({ ...waiting(next), shown: [] }, edge).play!
  const spot = (play: Play, id: string, at: number) => finalSpotBefore(play, id, at)

  it('stands the one who shows so near the egg that each tap lands on it, in every way of asking and for every kind', () => {
    for (const next of [seek(), who(), alike()]) {
      const play = shown(next), shower = play.cast.find((one) => one.id === 'shower')!, taps = play.acts.filter((one): one is Extract<Act, { do: 'lunge' }> => one.who === 'shower' && one.do === 'lunge')
      expect(taps).toHaveLength(2)
      const down = play.acts.find((one): one is Extract<Act, { do: 'slide' }> => one.who === 'shown' && one.do === 'slide')!, egg = down.to
      for (const tap of taps) {
        const from = spot(play, 'shower', tap.at)
        // The gap between the body and the egg is less than the lunge covers, and the lunge goes towards the egg.
        const gap = Math.abs(egg.x - from.x) - (WIDE[shower.kind] * from.size) / 2 - ((EGG.w / EGG.h) * egg.size) / 2
        expect(gap, next.form).toBeGreaterThan(0)
        expect(gap, next.form).toBeLessThan(LUNGE * from.size)
        expect(tap.towards, next.form).toBe(Math.sign(egg.x - from.x))
      }
      // The egg comes in on the head of the one who shows and is set down from there once the two have arrived.
      const walk = play.acts.find((one): one is Extract<Act, { do: 'go' }> => one.who === 'shower' && one.do === 'go')!, carried = play.cast.find((one) => one.id === 'shown')!
      expect([carried.rides, carried.shown], next.form).toEqual(['shower', false])
      expect([carried.from.x, carried.from.y], next.form).toEqual([riderOn(walk.to).x, riderOn(walk.to).y])
      expect(down.at, next.form).toBeCloseTo(walk.at + walk.lasts, 9)
      expect(down.lasts, next.form).toBe(SET_DOWN)
      // It is down before it is tapped.
      expect(down.at + down.lasts, next.form).toBeLessThan(taps[0].at)
      // In `who` the egg is on the stone and the grown one has walked over to it; otherwise the egg is on the first spot of the row.
      expect(egg.x, next.form).toBe(next.form === 'who' ? STONE_FEET.x : slotSpot(0, next.kinds.length).x)
    }
    for (const kind of KINDS) for (const side of [-1, 1] as const) {
      const hide = { x: 400, y: 600, size: EGG.h }, from = tapsFrom(kind, hide, 150, side)
      expect(Math.sign(from.x - hide.x)).toBe(side)
      expect(Math.abs(from.x - hide.x) - (WIDE[kind] * 150) / 2 - EGG.w / 2).toBeLessThan(LUNGE * 150)
    }
  })

  it('in two-alike is done by a little one with a piece of shell still on its head: it has just come out', () => {
    expect(shown(alike()).cast.find((one) => one.id === 'shower')).toMatchObject({ body: 'little', hatched: true })
    for (const next of [seek(), who()]) expect(shown(next).cast.find((one) => one.id === 'shower')).toMatchObject({ body: 'grown', hatched: false })
  })
})

describe('the egg from the basket', () => {
  const tipped = (place: string) => {
    const next: Clutch = { form: 'seek', place, kinds: ['pip', 'hoom'], slots: ['fresh', 'fresh'], queue: ['pip', 'hoom'], asker: null, wrong: 0 }
    return tapped(after(waiting(next), edge), { type: 'basket' }).play!
  }

  it('lands among leaf piles as the egg it is, and leaves fall over it with a rustle while it sinks out of sight', () => {
    const play = tipped('leaf-piles'), egg = play.cast.find((one) => one.id === 'tipped')!, leaves = play.cast.find((one) => one.id === 'leaves')!
    expect(egg.body).toBe('egg')
    expect([leaves.body, leaves.shown]).toEqual(['pile', false])
    const fall = play.acts.find((one): one is Extract<Act, { do: 'slide' }> => one.who === 'leaves' && one.do === 'slide')!
    // They start above the spot when the egg has landed, and come down onto it.
    expect([fall.at, fall.lasts]).toEqual([TIP_FLY, LEAVES_FALL])
    expect(leaves.from.y).toBeLessThan(fall.to.y - 100)
    expect(fall.to).toEqual(finalSpot(play, 'tipped'))
    expect(does(play, 'tipped')).toEqual(['fly', 'sink'])
    expect(play.sounds.some((one) => 'puffs' in one && one.at > TIP_FLY && one.at < TIP_FLY + LEAVES_FALL)).toBe(true)
    expect(play.cast.indexOf(egg)).toBeLessThan(play.cast.indexOf(leaves))
  })

  it('among eggs is an egg all the way, and nothing falls over it', () => {
    const play = tipped('three-eggs')
    expect(play.cast.find((one) => one.id === 'tipped')!.body).toBe('egg')
    expect(play.cast.some((one) => one.id === 'leaves')).toBe(false)
    expect(does(play, 'tipped')).toEqual(['fly'])
  })
})

describe('where the figures of a scene are bound', () => {
  it('lands whoever comes out clear of the first hide of a full row, whatever its kind', () => {
    const hide = eggSpots(4)[0]
    for (const kind of KINDS) {
      const spot = besideStone(kind)
      expect(spot.x + (WIDE[kind] * littleSize(kind)) / 2, kind).toBeLessThanOrEqual(hide.x - 10 + 1e-9)
      expect(spot.x, kind).toBeGreaterThan(STONE_FEET.x)
    }
  })

  it('says for each figure of a reunion which place on the hill it is on its way to, and for nobody else', () => {
    const before = after(waiting(seek()), edge, slot(1))
    const { world, play } = tapped(before, slot(1)), place = world.hill[0].place
    expect(boundFor(play!, 'seeker', world.hill)).toBe(place)
    expect(boundFor(play!, 'out', world.hill)).toBe(place)
    // The shell bursts and is gone, and nobody of that name is in the play.
    expect(boundFor(play!, 'shell', world.hill)).toBeNull()
    expect(boundFor(play!, 'nobody', world.hill)).toBeNull()
    // The two of a family stand in two spots of one place.
    expect(hillSpots('hoom', 'family', place)).toEqual([familyAt('hoom', place), riderOn(familyAt('hoom', place))])
    expect(hillSpots('hoom', 'twins', place)).toEqual([twinAt('hoom', place, 1), twinAt('hoom', place, -1)])
    expect(hillSpots('hoom', 'single', place)).toEqual([aloneAt('hoom', place)])
  })
})

describe('the egg that asks', () => {
  it('rolls onto the stone along the ground, heard as it comes and as it stops', () => {
    const { play } = tapped(waiting(who()), edge), comer = play!.cast.find((one) => one.id === 'comer')!
    expect(comer.body).toBe('egg')
    expect(does(play!, 'comer').slice(0, 2)).toEqual(['roll', 'call'])
    const roll = play!.acts.find((one): one is Extract<Act, { do: 'roll' }> => one.who === 'comer' && one.do === 'roll')!
    expect([roll.to.x, roll.to.y]).toEqual([STONE_FEET.x, STONE_FEET.y])
    // From the ground at the edge up onto the stone, which lies a little higher: no arc through the air.
    expect(Math.abs(comer.from.y - roll.to.y)).toBeLessThanOrEqual(12)
    expect(play!.sounds.some((one) => 'puffs' in one && one.at === roll.at)).toBe(true)
    expect(play!.sounds.some((one) => 'puffs' in one && Math.abs(one.at - (roll.at + roll.lasts)) < 1e-9)).toBe(true)
  })
})

describe('the round, as a play', () => {
  it('answers the finger with a sound as it lands, though the one under it sings second', () => {
    const world: World = { ...freshWorld(null), hill: [{ kind: 'pip', as: 'family', place: 0 }, { kind: 'tok', as: 'single', place: 1 }] }
    const play = directRound(world.hill[0], world.hill[1], world, VIEW)
    expect(play.sounds.some((one) => 'puffs' in one && one.at === 0)).toBe(true)
  })
})

describe('a hide tapped while nobody is at the stone', () => {
  it('answers the finger first, as it lands, and the one who then comes in calls at the stone: that call is the answer', () => {
    for (const next of [seek(), who()]) {
      // The clutch is in, its first asker has found its own, and the next one waits at the edge.
      let world = after(waiting(next), edge)
      const mine = next.kinds.indexOf(world.cycle!.asker!)
      world = after(world, slot(mine), slot(mine))
      expect(world.cycle!.asker).toBeNull()
      const other = next.kinds.findIndex((_, i) => world.cycle!.slots[i] !== 'done')
      const { world: then, play } = tapped(world, slot(other))
      expect(then.cycle!.asker).not.toBeNull()
      const all = calls(play!), hide = all.find((one) => one.who === `slot:${other}`)!, comer = all.find((one) => one.who === 'comer')!
      // The hide's call comes within a tenth of a second of the finger, with the knock on the shell at the touch.
      expect(hide.at, next.form).toBeLessThan(0.1)
      expect(play!.sounds[0].at, next.form).toBeLessThan(0.05)
      // The one who comes in is on its way only after that, and calls once it stands at the stone.
      const way = play!.acts.find((one) => one.who === 'comer' && (one.do === 'go' || one.do === 'roll'))!
      expect(way.at, next.form).toBeGreaterThanOrEqual(hide.at + hide.lasts)
      expect(comer.at, next.form).toBeGreaterThanOrEqual(way.at + way.lasts)
      // Two calls, one after the other, and no third.
      expect(all, next.form).toHaveLength(2)
    }
  })
})

describe('whoever waits at the edge', () => {
  it('is tapped wherever a finger lands on it, also on what is drawn outside its target; the basket in front of it stays the basket', () => {
    // A wide one brings the next clutch, and the basket stands beside it.
    const world = waiting(seek()), picture = pictureOf(world, VIEW)
    const edgeThing = picture.things.find((one) => one.key === 'edge')!, basket = picture.things.find((one) => one.key === 'basket')!
    if (edgeThing.key !== 'edge') throw new Error('no edge')
    const [bringer] = waitersOf(edgeThing, VIEW), target = targetOf(edgeThing, picture), bowl = targetOf(basket, picture)
    expect(bringer.kind).toBe('hoom')
    // It is drawn wider than its target, which keeps clear of the basket.
    const left = bringer.x - (WIDE.hoom * bringer.size) / 2
    expect(left).toBeLessThan(target.x)
    expect(target.x).toBeGreaterThan(bowl.x + bowl.w)
    // In its target, and on its body between the target and the basket and above the basket: the one who waits.
    expect(whatIsAt(picture, world, target.x + target.w / 2, target.y + target.h / 2)).toEqual({ type: 'edge' })
    expect(whatIsAt(picture, world, (bowl.x + bowl.w + target.x) / 2 + 12, bringer.y - bringer.size * 0.9)).toEqual({ type: 'edge' })
    expect(whatIsAt(picture, world, bowl.x + bowl.w - 30, bowl.y - 30)).toEqual({ type: 'edge' })
    // On the basket: the basket, which is drawn in front.
    expect(whatIsAt(picture, world, bowl.x + bowl.w / 2, bowl.y + bowl.h / 2)).toEqual({ type: 'basket' })
    expect(whatIsAt(picture, world, bowl.x + bowl.w - 12, bowl.y + bowl.h - 30)).toEqual({ type: 'basket' })
    // Beside the egg and above the rim of the bowl it is the wide one behind the basket that is seen, and tapped.
    expect(whatIsAt(picture, world, bowl.x + bowl.w - 12, bowl.y + bowl.h / 2)).toEqual({ type: 'edge' })
    // And well clear of both, nothing.
    expect(whatIsAt(picture, world, bowl.x - 20, bowl.y - 120)).toBeNull()
  })

  it('is every grown one of a `who` clutch around the nest, and the one who waits inside a cycle', () => {
    const picture = pictureOf(waiting(who()), VIEW), thing = picture.things.find((one) => one.key === 'edge')!
    if (thing.key !== 'edge') throw new Error('no edge')
    expect(waitersOf(thing, VIEW).map((one) => one.kind)).toEqual(['pip', 'tok', 'hoom'])
    const inside = after(waiting(seek()), edge, slot(1), slot(1)), then = pictureOf(inside, VIEW), next = then.things.find((one) => one.key === 'edge')!
    if (next.key !== 'edge') throw new Error('no edge')
    expect(waitersOf(next, VIEW)).toEqual([{ kind: next.kind, x: next.x, y: next.y, size: next.size }])
  })
})

describe('a clutch coming into a leaf place', () => {
  it('tumbles out of the nest as eggs, and leaves fall over each one as it lands: what is in a nest is eggs', () => {
    const next: Clutch = { form: 'seek', place: 'leaf-piles', kinds: ['pip', 'hoom', 'wheep'], slots: ['fresh', 'fresh', 'fresh'], queue: ['hoom', 'wheep', 'pip'], asker: null, wrong: 0 }
    const { play } = tapped(waiting(next), edge)
    for (const at of [0, 1, 2]) {
      const egg = play!.cast.find((one) => one.id === `in:${at}`)!, leaves = play!.cast.find((one) => one.id === `leaves:${at}`)!
      expect([egg.body, leaves.body, leaves.shown]).toEqual(['egg', 'pile', false])
      expect(does(play!, `in:${at}`)).toEqual(['fly', 'sink'])
      const fly = play!.acts.find((one) => one.who === `in:${at}` && one.do === 'fly')!, fall = play!.acts.find((one): one is Extract<Act, { do: 'slide' }> => one.who === `leaves:${at}` && one.do === 'slide')!
      // The leaves come down when the egg has landed, onto the spot of the row where the heap then stands.
      expect(fall.at).toBeCloseTo(fly.at + fly.lasts, 9)
      expect([fall.to.x, fall.to.y]).toEqual([slotSpot(at, 3).x, slotSpot(at, 3).y])
      expect(leaves.from.y).toBeLessThan(fall.to.y - 100)
    }
    // Among eggs nothing falls over them.
    expect(tapped(waiting(seek()), edge).play!.cast.some((one) => one.id.startsWith('leaves'))).toBe(false)
  })
})

describe('the order of a showing', () => {
  it('is the same in every way of asking: the one who shows calls and the egg answers, a tap, the egg calls and the one who shows calls again, a tap', () => {
    for (const form of ['seek', 'who', 'alike'] as const) {
      const cues = showing(form, 'hoom').filter((cue) => cue.cue === 'calls' || cue.cue === 'taps')
      expect(cues.map((cue) => (cue.cue === 'calls' ? (cue.inside ? 'egg' : 'shows') : 'tap')), form).toEqual(['shows', 'egg', 'tap', 'egg', 'shows', 'tap'])
    }
    // In `who` it begins with the grown one walking over to the stone.
    expect(showing('who', 'hoom')[0].cue).toBe('crosses')
    expect(showing('seek', 'hoom')[0].cue).toBe('enters')
  })
})

describe('a `who` clutch coming in', () => {
  it('keeps the three grown ones in sight from the tap: each stands where it waited until it sets off for its spot, through a showing as well', () => {
    for (const world of [waiting(who()), { ...waiting(who()), shown: [] }]) {
      const edgeThing = pictureOf(world, VIEW).things.find((one) => one.key === 'edge')!
      if (edgeThing.key !== 'edge') throw new Error('no edge')
      const stood = waitersOf(edgeThing, VIEW), { play } = tapped(world, edge)
      expect(stood).toHaveLength(3)
      stood.forEach((one, at) => {
        const cast = play!.cast.find((each) => each.id === `in:${at}`)!
        expect([cast.kind, cast.shown, cast.from]).toEqual([one.kind, true, { x: one.x, y: one.y, size: one.size }])
        expect(finalSpot(play!, `in:${at}`)).toMatchObject(slotSpot(at, 3))
      })
    }
  })

  it('leaves the small nest of an egg that waited at the edge where it was while the egg rolls out, and then takes it off the page', () => {
    // The first egg has been matched; the next waits at the edge in its nest and is tapped.
    const before = after(waiting(who()), edge, slot(1), slot(1))
    expect(before.cycle!.asker).toBeNull()
    const waited = pictureOf(before, VIEW).things.find((one) => one.key === 'edge')!
    const { play } = tapped(before, edge), cup = play!.cast.find((one) => one.id === 'cup')!
    expect([cup.body, cup.shown, cup.eggs]).toEqual(['nest', true, 0])
    expect([cup.from.x, cup.from.y]).toEqual([waited.x, waited.y])
    const off = play!.acts.find((one): one is Extract<Act, { do: 'slide' }> => one.who === 'cup' && one.do === 'slide')!
    expect(off.to.x).toBeGreaterThan(VIEW.w)
    expect(off.at).toBeGreaterThan(0)
  })
})

describe('the order of the choir', () => {
  it('is the order in which they came to stand on the hill, also in two-alike, where the first one let out asks at the stone and comes to the hill later', () => {
    const next: Clutch = { form: 'alike', place: 'two-alike', kinds: ['tok', 'dooo', 'dooo', 'tok'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: [], asker: null, wrong: 0 }
    let world = after(waiting(next), edge), found: readonly string[] = []
    // tok is let out first and asks; a dooo is opened for it and goes up alone; then the other tok; then the other dooo.
    for (const at of [0, 0, 1, 1, 3, 3, 2, 2]) {
      const step = act(world, slot(at))
      world = step.world
      for (const one of step.happened) if (one.type === 'ends') found = one.found
    }
    expect(world.finished).toBe(true)
    const stood = world.hill.filter((one) => one.kind === 'tok' || one.kind === 'dooo').map((one) => one.kind)
    expect(stood).toEqual(['dooo', 'tok'])
    expect(found).toEqual(stood)
  })
})

describe('targets that are as big as what is seen', () => {
  it('takes a tap on the head of a tall grown one in the row as a tap on it', () => {
    const next: Clutch = { form: 'who', place: 'who-is-inside', kinds: ['brrl', 'pip', 'hoom'], slots: ['fresh', 'fresh', 'fresh'], queue: ['pip', 'hoom', 'brrl'], asker: null, wrong: 0 }
    const world = after(waiting(next), edge), picture = pictureOf(world, VIEW), tall = picture.things.find((one) => one.key === 'slot:0')!
    expect(tall.size).toBeGreaterThan(EGG.h)
    // Its eyes are near the top of it: well above where a hide's target ends.
    expect(whatIsAt(picture, world, tall.x, tall.y - tall.size * 0.9)).toEqual({ type: 'slot', slot: 0 })
    expect(targetOf(tall, picture).h).toBe(tall.size)
    // A hide's target is the hide's, as before.
    const eggs = pictureOf(after(waiting(seek()), edge), VIEW)
    expect(targetOf(eggs.things.find((one) => one.key === 'slot:0')!, eggs).h).toBe(EGG.h)
  })

  it('takes a tap on any of the three grown ones of a waiting `who` clutch as a tap on them, also beside the basket', () => {
    const world = waiting(who()), picture = pictureOf(world, VIEW), thing = picture.things.find((one) => one.key === 'edge')!
    if (thing.key !== 'edge') throw new Error('no edge')
    for (const one of waitersOf(thing, VIEW)) expect(whatIsAt(picture, world, one.x, one.y - one.size / 2), one.kind).toEqual({ type: 'edge' })
    // The basket's egg, which stands in front of them, is still the basket.
    const basket = picture.things.find((one) => one.key === 'basket')!
    expect(whatIsAt(picture, world, basket.x, basket.y - 100)).toEqual({ type: 'basket' })
  })

  it('stands the one who knocks clear of the first of the row, with a little page between', () => {
    for (const row of [3, 4]) for (const kind of KINDS) {
      const spot = knockSpot(kind, row), right = spot.x + (WIDE[kind] * spot.size) / 2
      expect(right, `${kind} in a row of ${row}`).toBeLessThanOrEqual(slotSpot(0, row).x - (row >= 4 ? 126 : 150) / 2 - 6 + 1e-9)
      expect(spot.x, kind).toBeGreaterThan(STONE_FEET.x)
    }
  })
})

describe('a tap on what cannot be tapped', () => {
  it('sounds as the thing it lands on: grass on the hill, a tick on the stone, paper on the page, each at once and each its own', () => {
    const heard = (['hill', 'stone', 'page'] as const).map((of) => bareSound(of, 0.5))
    for (const sounds of heard) {
      expect(sounds).toHaveLength(1)
      expect(sounds[0].at).toBe(0)
      expect('puffs' in sounds[0]).toBe(true)
    }
    expect(new Set(heard.map((sounds) => JSON.stringify(sounds))).size).toBe(3)
  })
})

describe('the first frame', () => {
  it('has the one who brings the first clutch well into the page and bigger than at the edge, with the nest on its head, and it is tapped there', () => {
    const world = freshWorld(null), picture = pictureOf(world, VIEW), thing = picture.things.find((one) => one.key === 'edge')!
    if (thing.key !== 'edge' || thing.kind === null) throw new Error('nobody waits')
    expect([thing.what, thing.roomy]).toEqual(['clutch', true])
    const [bringer] = waitersOf(thing, VIEW)
    expect(bringer).toEqual({ kind: thing.kind, ...bringerSpot(VIEW, thing.kind, true) })
    // Right of the middle and at least a quarter of the page in from its edge; bigger than one who waits at the edge.
    expect(bringer.x).toBeGreaterThan(VIEW.w / 2)
    expect(bringer.x).toBeLessThanOrEqual(VIEW.w * 0.75)
    expect(bringer.size).toBe(bringerSize(thing.kind))
    for (const kind of KINDS) expect(bringerSize(kind), kind).toBeGreaterThan(edgeSize(kind) * 1.05)
    // The nest is on its head, and the idle glow and hand go to it: the thing's own place is where it stands.
    expect(nestOf(VIEW, 'seek', thing.kind, true).x).toBe(bringer.x)
    expect(thing.x).toBe(bringer.x)
    // A tap on its body, and on its head, brings the clutch in.
    expect(whatIsAt(picture, world, bringer.x, bringer.y - bringer.size / 2)).toEqual({ type: 'edge' })
    expect(whatIsAt(picture, world, bringer.x, bringer.y - bringer.size * 0.9)).toEqual({ type: 'edge' })
    // It sets off for the stone from where it stood.
    const { play } = tapped(world, edge), comer = play!.cast.find((one) => one.id === 'comer')!
    expect(comer.from).toEqual({ x: bringer.x, y: bringer.y, size: bringer.size })
  })

  it('keeps the one who brings a clutch at the edge where there is no room: beside the basket, or under someone on the right of the hill', () => {
    const edgeOf = (world: World) => { const thing = pictureOf(world, VIEW).things.find((one) => one.key === 'edge')!; if (thing.key !== 'edge') throw new Error('no edge'); return thing }
    expect(edgeOf(waiting(seek())).roomy).toBe(false)
    expect(edgeOf({ ...waiting(seek()), extra: null, hill: [{ kind: 'tok', as: 'family', place: 3 }] }).roomy).toBe(false)
    expect(edgeOf({ ...waiting(seek()), extra: null, hill: [{ kind: 'tok', as: 'family', place: 0 }] }).roomy).toBe(true)
    // A `who` clutch and a clutch of pairs have no one who brings them.
    expect(edgeOf({ ...waiting(who()), extra: null }).roomy).toBe(false)
    expect(edgeOf({ ...waiting(alike()), extra: null }).roomy).toBe(false)
  })
})

describe('a grown one of the row that has been heard', () => {
  it('sets off for the stone from a step in front of the row, where it stood once it had been heard', () => {
    const before = after(waiting(who()), edge, slot(1))
    const { play } = tapped(before, slot(1)), grown = play!.cast.find((one) => one.id === 'grown')!
    expect(HEARD_STEP).toBeGreaterThanOrEqual(24)
    expect([grown.from.x, grown.from.y]).toEqual([slotSpot(1, 3).x, slotSpot(1, 3).y + HEARD_STEP])
  })
})
