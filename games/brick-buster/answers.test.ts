import { describe, expect, it } from 'vitest'
import * as answers from './answers'
import { AnswerPlayer, sceneBeats, type Answer, type Cue, type Stage, type Who } from './answers'
import { Scene, sceneLength } from './scene'
import type { BallKind } from './save'
import { LIMITS, seconds, type Sound } from './voices'

const KINDS: readonly BallKind[] = ['plain', 'wet', 'hot', 'heavy']

/** Every answer the table can give, each made as the rules make it. */
export const EVERY: Record<string, Answer> = {
  press: answers.press(), flick: answers.flick(0.3, false), 'flick heavy': answers.flick(0, true), release: answers.release(),
  bounce: answers.bounce(-0.5, false), 'bounce heavy': answers.bounce(0, true), 'sink in': answers.sinkIn(false), 'sink in heavy': answers.sinkIn(true), knock: answers.knock(),
  pat: answers.pat(500), 'rail dragon': answers.rail('dragon', 0.5), 'rail walrus': answers.rail('walrus', 0.5), 'rail elephant': answers.rail('elephant', 0.5),
  roof: answers.roof(0.5, false), 'roof flung': answers.roof(1, true),
  'walrus hot': answers.walrusHot(), 'dragon wet': answers.dragonWet(),
  'ring and crack': answers.ringAndCrack(3, 3, 2), shatter: answers.shatter(0, 3, 2), wipe: answers.wipe(3), sag: answers.sag(3), 'pop drip': answers.popDrip(0),
  'crash through': answers.crashThrough([0, 1, 2]), 'tink glass': answers.tinkGlass(3),
  'jelly throw': answers.jellyThrow(1, 0, 1, 1, 2), 'jelly off': answers.jellyOff(0, -1, 1, 2), slip: answers.slip(1), 'jelly melt': answers.jellyMelt(0), 'jelly fling': answers.jellyFling(1),
  'jelly wobble': answers.jellyWobble(1, 0), swell: answers.swell(1),
  skate: answers.skate(6, 0, 1), freeze: answers.freeze(6), melt: answers.melt(6), anvil: answers.anvil(6), 'finger ice': answers.fingerIce(6),
  'knock seed': answers.knockSeed(13, true, 1, 0), 'vine ride': answers.vineRide(), 'vine shoot': answers.vineShoot(13), 'vine brown': answers.vineBrown(), 'pop seed': answers.popSeed(0),
  'drive seed': answers.driveSeed(0), 'finger seed': answers.fingerSeed(13),
  'yawn shuffle': answers.yawnShuffle(2, 1, 1, 2), 'yawn lean': answers.yawnLean(1, -1, 1, 2), stir: answers.stir(1, 1, 2), wake: answers.wake(0), snuggle: answers.snuggle(1), 'tip out': answers.tipOut(7),
  'tip to rubble': answers.tipToRubble(0), 'finger sleepy': answers.fingerSleepy(1, 1),
  'pool plip': answers.poolPlip(8), 'pool splash': answers.poolSplash(8), 'pool boil': answers.poolBoil(8, [0, 1]), 'pool sploosh': answers.poolSploosh(8),
  'bell only': answers.bellOnly('plain'), stood: answers.stood(4, 4, 2), 'yawn to rail': answers.yawnToRail(5, 5, 2), 'lean on rail': answers.leanOnRail(5, 1), 'sleepy hum': answers.sleepyHum(5, 5, 2),
  'poke walrus': answers.pokeWalrus(), 'poke dragon': answers.pokeDragon(), 'poke elephant': answers.pokeElephant(), 'poke ladybird': answers.pokeLadybird(),
  'show hot gate': answers.showHotGate(), 'show wet gate': answers.showWetGate(),
  rolling: answers.rolling(0.5), 'fetch dragon': answers.fetchReach('dragon'), 'fetch elephant': answers.fetchReach('elephant'),
  'fetch back dragon': answers.fetchBack('dragon'), 'fetch back elephant': answers.fetchBack('elephant'),
}
for (const kind of KINDS) {
  EVERY[`boom ${kind}`] = answers.boom(500, 0, kind, [0, 1, 2])
  EVERY[`bell standing ${kind}`] = answers.bellStanding(kind)
  EVERY[`unfold ${kind}`] = answers.unfold(kind, 5, [0, 4, 7, 13], 6, 3)
}
EVERY['bell standing finger'] = answers.bellStanding('finger')
EVERY['unfold finger'] = answers.unfold('finger', 18, [0, 1, 2, 3, 4, 5], 6, 3)
EVERY['cleared'] = answers.cleared(6)
EVERY['cleared pool'] = answers.cleared(0)
for (const toy of ['dragon', 'walrus', 'elephant'] as const) {
  EVERY[`gate ${toy}`] = answers.gate(toy, false)
  EVERY[`gate ${toy} again`] = answers.gate(toy, true)
}

/** A stage that writes down what each beat hands it, and when. */
function recorder() {
  const log: { at: number; what: 'pose' | 'sound' | 'cue'; who?: Who; channels?: Readonly<Record<string, number>>; cue?: Cue; notes?: Sound }[] = []
  const clock = { now: 0 }
  const stage: Stage = {
    pose: (who, channels) => log.push({ at: clock.now, what: 'pose', who, channels }),
    sound: (notes) => log.push({ at: clock.now, what: 'sound', notes }),
    cue: (cue) => log.push({ at: clock.now, what: 'cue', cue }),
  }
  return { log, clock, stage }
}

describe('every answer, as beats', () => {
  it.each(Object.entries(EVERY))('%s: beats in order, the first at once or soon, and sounds in range', (_, answer) => {
    expect(answer.length).toBeGreaterThan(0)
    for (let i = 1; i < answer.length; i++) expect(answer[i].at).toBeGreaterThanOrEqual(answer[i - 1].at)
    expect(answer[0].at).toBeGreaterThanOrEqual(0)
    for (const beat of answer) {
      if (beat.lasts !== undefined) expect(beat.lasts).toBeGreaterThanOrEqual(0)
      if (!beat.notes) continue
      expect(seconds(beat.notes)).toBeLessThanOrEqual(LIMITS.maxSeconds)
      for (const tone of beat.notes) expect(tone).not.toHaveProperty('delay')
    }
  })

  it('answers a touch or a hit in the frame it happens, with a pose and a sound together', () => {
    const late = new Set(['release', 'swell', 'fetch dragon', 'fetch elephant', 'fetch back dragon', 'fetch back elephant', 'rail dragon', 'rail walrus', 'rail elephant', 'walrus hot', 'dragon wet', 'cleared', 'cleared pool',
      // A brick over at the rail leans when it has got there, which the rules time.
      'lean on rail'])
    const silent: string[] = []
    for (const [name, answer] of Object.entries(EVERY)) {
      if (late.has(name)) continue
      const first = answer.filter((beat) => beat.at === 0)
      if (first.length === 0 || !first.some((beat) => beat.notes !== undefined)) silent.push(name)
    }
    expect(silent).toEqual([])
  })

  it('sight and sound share one clock: the player hands over a beat\'s pose, notes and cue at the same moment, at the beat\'s own time', () => {
    for (const [name, answer] of Object.entries(EVERY)) {
      const { log, clock, stage } = recorder()
      const player = new AnswerPlayer(stage)
      player.start(answer)
      const step = 1 / 240
      for (let i = 0; i < 240 * 8 && player.busy; i++) {
        clock.now += step
        player.step(step)
      }
      expect(player.busy, name).toBe(false)
      // Every beat arrived, in order, no earlier than its time and less than a step late.
      const poses = log.filter((entry) => entry.what === 'pose')
      expect(poses.length, name).toBe(answer.length)
      answer.forEach((beat, index) => {
        expect(poses[index].at, name).toBeGreaterThanOrEqual(beat.at - 1e-6)
        expect(poses[index].at, name).toBeLessThan(beat.at + step + 1e-6)
      })
      // Its notes and its cue come in the same call as its pose.
      const sounds = log.filter((entry) => entry.what === 'sound')
      const sounding = answer.filter((beat) => beat.notes !== undefined)
      expect(sounds.length, name).toBe(sounding.length)
      sounding.forEach((beat, index) => {
        expect(sounds[index].notes).toBe(beat.notes)
        expect(sounds[index].at, name).toBe(poses[answer.indexOf(beat)].at)
      })
    }
  })

  it('a scene plays the same beats on the scene module, and a touch that ends it lands every pose and cue and plays no note', () => {
    for (const name of ['cleared', 'unfold finger', 'show hot gate', 'show wet gate']) {
      const answer = EVERY[name]
      const watched = recorder()
      const scene = new Scene(sceneBeats(answer, watched.stage))
      scene.start(0, () => {})
      for (let t = 0; t <= sceneLength(sceneBeats(answer, watched.stage)) + 0.1; t += 1 / 60) scene.update(t)
      expect(scene.running).toBe(false)
      expect(watched.log.filter((entry) => entry.what === 'pose').length).toBe(answer.length)
      expect(watched.log.filter((entry) => entry.what === 'sound').length).toBe(answer.filter((beat) => beat.notes).length)

      const ended = recorder()
      const cut = new Scene(sceneBeats(answer, ended.stage))
      cut.start(0, () => {})
      cut.update(0.3)
      const heard = ended.log.filter((entry) => entry.what === 'sound').length
      cut.finish()
      expect(cut.running).toBe(false)
      expect(ended.log.filter((entry) => entry.what === 'sound').length, `${name} is silent from the touch`).toBe(heard)
      expect(ended.log.filter((entry) => entry.what === 'pose').length).toBe(answer.length)
      expect(ended.log.filter((entry) => entry.what === 'cue').length).toBe(answer.filter((beat) => beat.cue).length)
    }
  })

  it('keeps the scenes short: an ending of about five seconds, an unfolding of about four, a showing of about three', () => {
    const length = (answer: Answer) => answer[answer.length - 1].at
    expect(length(EVERY['cleared'])).toBeGreaterThan(3.5)
    expect(length(answer18())).toBeLessThan(7)
    expect(length(EVERY['unfold finger'])).toBeLessThan(4.5)
    expect(length(EVERY['show hot gate'])).toBeGreaterThan(2.5)
    expect(length(EVERY['show hot gate'])).toBeLessThan(3.6)
    expect(length(EVERY['show wet gate'])).toBeLessThan(3.6)
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) expect(length(answers.gate(toy, false))).toBeLessThan(1.8)
  })

  it('gives every cell of the grid its own sound', () => {
    const cells = ['ring and crack', 'wipe', 'sag', 'crash through', 'tink glass', 'jelly throw', 'slip', 'jelly melt', 'jelly fling', 'jelly wobble', 'skate', 'freeze', 'melt', 'anvil', 'finger ice',
      'knock seed', 'vine shoot', 'pop seed', 'drive seed', 'finger seed', 'yawn shuffle', 'wake', 'snuggle', 'tip out', 'finger sleepy', 'boom plain', 'boom wet', 'boom hot', 'boom heavy', 'pat',
      'pool plip', 'pool splash', 'pool boil', 'pool sploosh', 'bell standing plain', 'bell standing wet', 'bell standing hot', 'bell standing heavy', 'bell standing finger', 'pop drip',
      'gate dragon', 'gate walrus', 'gate elephant', 'gate dragon again', 'gate walrus again', 'gate elephant again', 'sink in', 'bounce', 'bounce heavy']
    const heard = cells.map((name) => JSON.stringify(EVERY[name].flatMap((beat) => beat.notes ?? [])))
    expect(new Set(heard).size).toBe(cells.length)
  })
})

describe('the large toys', () => {
  const TOYS = ['dragon', 'walrus', 'elephant'] as const
  const SCENES = /^(cleared|unfold|show)\b/

  it('each starts to answer the thing that just happened within a third of a second, the elephant last', () => {
    let answered = 0
    for (const [name, answer] of Object.entries(EVERY)) {
      if (SCENES.test(name)) continue
      for (const toy of TOYS) {
        const first = answer.find((beat) => beat.who === toy)
        if (!first) continue
        answered += 1
        expect(first.at, `${toy} in ${name}`).toBeLessThanOrEqual(1 / 3)
      }
    }
    expect(answered).toBeGreaterThan(20)
    // The ones a reader timed: glass in shards, a melt, a seed popped, a splash and a sploosh.
    for (const name of ['shatter', 'crash through', 'pop drip', 'melt', 'pop seed', 'pool splash', 'pool sploosh']) {
      const firsts = TOYS.map((toy) => EVERY[name].find((beat) => beat.who === toy)?.at).filter((at): at is number => at !== undefined)
      expect(firsts.length, name).toBeGreaterThan(0)
      for (const at of firsts) expect(at, name).toBeLessThanOrEqual(1 / 3)
    }
    expect(answers.TOY_AFTER + 0.24).toBeLessThan(1 / 3)
  })

  it('no toy claps, at a clearing or at any other time: no answer holds the clap\'s sound or brings two flippers together, and at a clearing no toy repeats itself', () => {
    // The clap, as it was: a short wide burst and a low thump.
    const clap = [{ kind: 'noise', frequency: 900, q: 0.8, peak: 0.13, attack: 0.002, decay: 0.08 }, { kind: 'tone', wave: 'sine', frequency: 170, peak: 0.07, attack: 0.003, decay: 0.07 }].map((tone) => JSON.stringify(tone))
    const claps = (answer: Answer) => answer.flatMap((beat) => beat.notes ?? []).filter((tone) => clap.includes(JSON.stringify(tone))).length
    const poses = (answer: Answer, who: string) => answer.filter((beat) => beat.who === who).map((beat) => beat.pose as Record<string, number>)
    // Every answer of the game.
    for (const [name, answer] of Object.entries(EVERY)) {
      expect(claps(answer), name).toBe(0)
      for (const pose of poses(answer, 'walrus')) {
        expect(pose.flip, name).toBe(undefined)
        expect(pose.clap, name).toBe(undefined)
        // One flipper at a time: it never pats its belly and rubs its chest in one beat.
        expect(pose.pat !== undefined && pose.pat > 0 && pose.rub !== undefined && pose.rub > 0, name).toBe(false)
      }
    }
    // No toy answers a clearing: each only turns to watch, and none of them makes a sound or any other move.
    for (const heaps of [0, 4, 18]) {
      const answer = answers.cleared(heaps)
      for (const toy of TOYS) {
        const beats = answer.filter((beat) => beat.who === toy)
        expect(beats.length, toy).toBe(1)
        expect(beats[0].notes, toy).toBe(undefined)
        expect(beats[0].pose, toy).toEqual({ watch: 1 })
      }
      // The three do not turn at one moment: each after its own delay.
      expect(new Set(answer.filter((beat) => TOYS.includes(beat.who as (typeof TOYS)[number])).map((beat) => beat.at)).size).toBe(3)
    }
    // And when the next wall stands, each turns back, again without a sound.
    for (const toy of TOYS) {
      const beats = answers.unfold('finger', 6, [0, 4, 7], 6, 3).filter((beat) => beat.who === toy)
      expect(beats.map((beat) => beat.pose), toy).toEqual([{ watch: 0 }])
      expect(beats[0].notes, toy).toBe(undefined)
    }
    // What the walrus does for water, for a ball in its tub and for a finger: a wallow, a snort, a slap with one flipper.
    for (const name of ['melt', 'pool splash', 'pool sploosh']) expect(poses(EVERY[name], 'walrus').some((pose) => pose.wallow !== undefined), name).toBe(true)
  })
})

/** The longest ending: a full wall of eighteen in the rubble. */
function answer18(): Answer {
  return answers.cleared(18)
}
