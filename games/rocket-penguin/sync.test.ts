import { describe, expect, it } from 'vitest'
import { STEP, clampPouch, fly, type Body, type Happening } from './flight'
import { BARE_PAPER, gridOfPulls, heardFrom, newToy, play, playUntil, pullAndLetGo, pullAt, staged, type Played } from './testing'
import { CLAP, SNAP, TAKE, type Pose } from './toy'
import { mealAt, type Lie } from './view'
import type { SoundName } from './voices'
import { BASKET, BERG, CLOUD, DRIFT, ICE_Y, PENGUIN, SEALS, SPOUT, type Part } from './world'

// Sight and sound run on one clock: the game's. A sound is asked for in the
// step that shows its cause; a sound that falls a moment after its cause is
// a cue on the same clock, never a wait inside its voice (voices.test.ts);
// and a scene that a touch ends is silent from that frame. These tests fly
// the model by itself, play the same thing through the toy, and hold each
// sound to the frame it belongs to.

/** The first sound each happening of a bare flight makes. */
function soundOf(what: Happening): SoundName | null {
  switch (what.kind) {
    case 'seal': return what.which === 0 ? 'boing' : 'deepBoing'
    case 'bump': return ({ igloo: 'knock', whale: 'slap', balloon: 'bomp', berg: 'tink', basket: 'wicker', shelf: 'scrape' } as const)[what.what]
    case 'ice': return what.on === 'crate' ? 'rattle' : 'scrape'
    case 'spout': return 'rush'
    case 'cloudIn': return 'hush'
    case 'cloudOut': return 'sneeze'
    case 'end': return ({ beak: 'thunk', belly: 'flop', feet: 'tap', drift: 'whump', sea: 'splash', basket: 'wicker', off: null } as const)[what.how]
    default: return null
  }
}

const POSE: Record<string, Pose> = { beak: 'beak', belly: 'belly', feet: 'stand', drift: 'buried', sea: 'bob', basket: 'perch', off: 'gone' }

/** A spread of the pulls a finger can make: every seventh of the grid. */
const PULLS = gridOfPulls(20).filter((_, index) => index % 7 === 0)

/** The frame, counted from the release, in which the toy took off: the one that honks. */
const takeOff = (played: Played): number => played.heard.findIndex((sounds) => sounds.some((sound) => sound.name === 'honk'))

const namesAt = (played: Played, frame: number): string[] => (played.heard[frame] ?? []).map((sound) => sound.name)

describe('one clock', () => {
  it('asks for each sound of a flight in the very step of the model that causes it, and for nothing in a step where nothing happened', () => {
    expect(PULLS.length).toBeGreaterThan(20)
    for (const pull of PULLS) {
      const model = fly(clampPouch(pull))
      const played = newToy()
      pullAndLetGo(played, pull)
      // One frame to one step of the model.
      while (played.toy.phase === 'snap' || played.toy.phase === 'fly') play(played, STEP, STEP)
      const first = takeOff(played)
      expect(first).toBeGreaterThanOrEqual(0)
      for (const { at, what } of model.happened) {
        const sound = soundOf(what)
        if (sound !== null) expect(namesAt(played, first + at), `${what.kind} at step ${at}`).toContain(sound)
      }
      const steps = new Set(model.happened.map(({ at }) => first + at))
      played.heard.forEach((sounds, index) => {
        if (index > first && !steps.has(index)) expect(sounds, `step ${index}`).toEqual([])
      })
    }
  })

  it('shows the landing in the frame that sounds it, at any frame rate', () => {
    for (const dt of [1 / 120, 1 / 60, 1 / 30, 0.1]) for (const pull of PULLS) {
      const model = fly(clampPouch(pull))
      const ending = soundOf({ kind: 'end', how: model.body.ended!, on: null, speed: 0 })
      const played = newToy()
      pullAndLetGo(played, pull)
      let landedAt = -1
      while (played.toy.phase === 'snap' || played.toy.phase === 'fly') {
        play(played, dt, dt)
        if ((played.toy.phase as string) === 'scene') landedAt = played.heard.length - 1
      }
      expect(landedAt).toBeGreaterThan(0)
      // The pose of the landing is in the frame the flight ends in, and so is its sound: never a frame apart.
      expect(played.toy.show().pilot.pose).toBe(POSE[model.body.ended!])
      if (ending) expect(namesAt(played, landedAt)).toContain(ending)
    }
  })

  it('puts a happening in the frame whose time holds it, when a frame is several steps long', () => {
    for (const pull of PULLS.slice(0, 12)) {
      const dt = 1 / 30
      const model = fly(clampPouch(pull))
      const played = newToy()
      pullAndLetGo(played, pull)
      while (played.toy.phase === 'snap' || played.toy.phase === 'fly') play(played, dt, dt)
      const first = takeOff(played)
      for (const { at, what } of model.happened) {
        const sound = soundOf(what)
        if (sound === null) continue
        // Step `at` of the model is played in the frame that many steps of time after the take-off.
        const frame = first + Math.floor((at * STEP) / dt + 1e-9)
        expect([frame - 1, frame, frame + 1].some((index) => namesAt(played, index).includes(sound)), `${what.kind} at step ${at}`).toBe(true)
      }
    }
  })

  it('twangs in the call that lets go, and honks a snap later in the frame the penguin leaves the pouch', () => {
    for (const dt of [1 / 120, 1 / 60, 1 / 30]) {
      const played = newToy()
      expect(pullAndLetGo(played, pullAt(40, 170)).map((sound) => sound.name)).toContain('twang')
      let before: Pose = played.toy.show().pilot.pose
      for (let n = 0; n < 40; n++) {
        play(played, dt, dt)
        const pose = played.toy.show().pilot.pose
        const honked = namesAt(played, played.heard.length - 1).includes('honk')
        expect(honked).toBe(before === 'seat' && pose === 'fly')
        // The honk is a cue on the game's clock: the first frame whose time is a snap after the twang.
        if (honked) expect(played.heard.length).toBe(Math.ceil(SNAP / dt - 1e-9))
        before = pose
      }
    }
  })
})

/** A sound that falls a moment after its cause: the load, where the body is put, the two sounds, and the seconds between them. */
const CUES: [string, Part[], Partial<Body>, boolean, string, string, number][] = [
  ['the second wingtip', ['wings'], { x: 238, y: ICE_Y - PENGUIN.r - 1, vx: -100, vy: 60 }, false, 'squeak', 'squeak', 0.13],
  ['the second foot', ['umbrella'], { x: 238, y: ICE_Y - PENGUIN.r - 6, vy: 120, open: true }, false, 'tap', 'tap', 0.11],
  ['the fish across the face', ['fish'], { x: 238, y: ICE_Y - PENGUIN.r - 6, vy: 500 }, false, 'thunk', 'wetslap', 0.18],
  ['the singed seal\'s cough', ['rocket'], { x: SEALS[0].x, y: SEALS[0].y - SEALS[0].r - PENGUIN.r - 6, vy: 300, turn: Math.PI / 2 }, true, 'hiss', 'cough', 0.4],
  ['the flattened seal\'s oof', ['springs'], { x: SEALS[0].x, y: SEALS[0].y - SEALS[0].r - PENGUIN.r - 6, vx: 30, vy: 300 }, false, 'deeptwang', 'oof', 0.14],
  ['the seal\'s burp', ['fish'], { x: SEALS[1].x, y: SEALS[1].y - SEALS[1].r - PENGUIN.r - 6, vx: 30, vy: 300 }, false, 'snap', 'burp', 0.7],
  ['the muffled spring', ['springs'], { x: DRIFT.x + 5, y: DRIFT.y - DRIFT.ry - 30, vy: 250 }, false, 'crunch', 'mspring', 0.1],
]

/** The frames, in order, in which a sound was heard. */
const framesOf = (played: Played, name: string): number[] => played.heard.flatMap((sounds, index) => (sounds.some((sound) => sound.name === name) ? [index] : []))

describe('a sound that follows its cause', () => {
  it('is a cue on the game clock: it falls in the first frame whose time has reached it, at any frame rate', () => {
    for (const [name, parts, put, hold, cause, cue, after] of CUES) for (const dt of [1 / 120, 1 / 60, 1 / 30]) {
      const played = staged(parts, put, hold)
      play(played, 1.4, dt)
      const caused = framesOf(played, cause)[0]
      const cued = cause === cue ? framesOf(played, cue)[1] : framesOf(played, cue)[0]
      expect(caused, name).toBeGreaterThanOrEqual(0)
      expect(cued, name).toBeGreaterThan(caused)
      expect(cued - caused, `${name} at ${Math.round(1 / dt)} frames a second`).toBe(Math.ceil(after / dt - 1e-6))
    }
  })

  it('stands still while the game does: a cue waits for game time, not for the wall clock', () => {
    const played = staged(['springs'], { x: SEALS[0].x, y: SEALS[0].y - SEALS[0].r - PENGUIN.r - 6, vx: 30, vy: 300 })
    playUntil(played, () => heardFrom(played).includes('deeptwang'))
    // Parked: no step is played, however long the wait.
    for (let n = 0; n < 500; n++) played.toy.step(0)
    expect(played.toy.takeSounds()).toEqual([])
    play(played, 0.2)
    expect(heardFrom(played)).toContain('oof')
  })

  it('keeps on only while its cause lasts: the roar with the flame, the patter and the jangle in the cloud, the drum in the water', () => {
    const lasting: [Part, Partial<Body>, boolean, string, (played: Played) => boolean][] = [
      ['rocket', { x: 600, y: 420, vy: -100, turn: -Math.PI / 2 }, true, 'roar', (played) => played.toy.show().pilot.flame === 1],
      ['umbrella', { x: CLOUD[2].x, y: CLOUD[2].y - CLOUD[2].r - 18, vy: 200, open: true }, false, 'patter', (played) => played.toy.body!.inCloud],
      ['springs', { x: CLOUD[2].x, y: CLOUD[2].y - CLOUD[2].r - 18, vy: 200 }, false, 'jangle', (played) => played.toy.body!.inCloud && played.toy.show().pilot.jangle > 0],
      ['umbrella', { x: SPOUT.x, y: 570 }, false, 'drum', (played) => played.toy.body!.inSpout],
      ['fish', { x: SPOUT.x, y: 520 }, false, 'flapslap', (played) => played.toy.body!.inSpout && played.toy.show().pilot.fish === 'wet'],
    ]
    for (const [part, put, hold, sound, lasts] of lasting) {
      const played = staged([part], put, hold)
      let heard = 0
      for (let n = 0; n < 240 && played.toy.phase === 'fly'; n++) {
        play(played, 1 / 60)
        if (!namesAt(played, played.heard.length - 1).includes(sound)) continue
        heard += 1
        expect(lasts(played), `${sound} in frame ${n}`).toBe(true)
      }
      expect(heard, sound).toBeGreaterThan(2)
    }
  })
})

describe('the scenes, beat by beat', () => {
  it('sounds each beat of the way back in the frame that shows it', () => {
    const played = staged([], { x: 238, y: ICE_Y - PENGUIN.r - 6, vy: 500 })
    playUntil(played, (toy) => toy.phase === 'scene')
    played.heard.length = 0
    let waggled = 0, pose: Pose = played.toy.show().pilot.pose, height = played.toy.show().pilot.y
    while (played.toy.phase === 'scene') {
      play(played, 1 / 60)
      const frame = played.toy.show()
      const sounds = namesAt(played, played.heard.length - 1)
      // The muffled honk comes with the feet starting to go.
      if (sounds.includes('muffled')) { expect(waggled).toBe(0); expect(frame.pilot.waggle).toBe(1); expect(frame.pilot.beak).toBeGreaterThan(0) }
      // The near seal, beside it, claps twice: each clap is heard with its flippers together.
      if (sounds.includes('clap')) expect(frame.nearSeal.clap).toBeGreaterThan(0.97)
      // The pop comes as it leaves the ice, the slide as it lies down to toboggan, the hop as it leaves the ice for the pouch.
      if (sounds.includes('pop')) { expect(pose).toBe('beak'); expect(frame.pilot.y).toBeLessThan(height) }
      if (sounds.includes('shake')) expect(frame.pilot.shiver).toBeGreaterThan(0)
      if (sounds.includes('slide')) expect(frame.pilot.pose).toBe('toboggan')
      if (sounds.includes('hop')) expect(frame.pilot.pose).toBe('hop')
      if (sounds.includes('sag')) expect(frame.pilot.pose).toBe('seat')
      if (frame.pilot.pose !== pose && frame.pilot.pose === 'seat') expect(sounds).toContain('sag')
      waggled = frame.pilot.waggle
      pose = frame.pilot.pose
      height = frame.pilot.y
    }
    expect(heardFrom(played)).toEqual(['muffled', 'clap', 'clap', 'pop', 'shake', 'slide', 'hop', 'sag'])
  })

  it('sounds the fish taken in the frame the friend\'s reach gets to it, and a friend\'s answer only while it answers', () => {
    const played = staged(['fish'], { x: BERG.x0 + 106, y: BERG.y0 - PENGUIN.r - 2, vy: 20, fish: 'wet' })
    playUntil(played, (toy) => toy.phase === 'scene')
    let act: string | null = null, reached = 0
    while (played.toy.phase === 'scene') {
      play(played, 1 / 60)
      const frame = played.toy.show()
      const sounds = namesAt(played, played.heard.length - 1)
      const now = frame.meal.walrus?.act ?? null
      // The fish is off the rod from the frame the walrus starts to reach for it, and is heard to come off as the reach gets there.
      if (now === 'take') expect(frame.pilot.fish).toBeNull()
      if (sounds.includes('take')) { expect(act).toBe('take'); expect(now).toBe('take'); expect(reached).toBeLessThan(TAKE.reach); expect(frame.meal.walrus!.p).toBeGreaterThanOrEqual(TAKE.reach) }
      if (sounds.includes('wring') || sounds.includes('groan')) { expect(now).toBe('react'); expect(frame.walrus.brow).toBeGreaterThan(0) }
      act = now
      reached = now === 'take' ? frame.meal.walrus!.p : 0
    }
    expect(heardFrom(played)).toEqual(expect.arrayContaining(['take', 'wring', 'groan']))
  })

  it('sounds each friend\'s answer to an empty-handed penguin in the frame it is seen', () => {
    const walrus = staged([], { x: BERG.x0 + 106, y: BERG.y0 - PENGUIN.r - 2, vy: 20 })
    const puffin = staged([], { x: BASKET.x0 - PENGUIN.r - 2, y: (BASKET.y0 + BASKET.y1) / 2, vx: 100 })
    const chick = staged([], { x: 540, y: ICE_Y - PENGUIN.r - 2, vy: 20 })
    let seen = 0
    for (const played of [walrus, puffin, chick]) {
      playUntil(played, (toy) => toy.phase === 'scene')
      let onto = 0
      while (played.toy.phase === 'scene') {
        play(played, 1 / 60)
        const frame = played.toy.show()
        const sounds = namesAt(played, played.heard.length - 1)
        if (sounds.includes('harrumph')) { seen += 1; expect(frame.walrus.sigh).toBeGreaterThan(0); expect(frame.pilot.blown).toBe(1) }
        if (sounds.includes('lens')) { seen += 1; expect(frame.puffin.close).toBeGreaterThan(0) }
        if (sounds.includes('plateflip')) { seen += 1; expect(frame.chick.plate).toBeGreaterThan(0) }
        // The chick peeps as it leaves the ice, for the penguin and again for its doorway, and its feet are heard as they come down on each.
        if (sounds.includes('peep') && onto === 0) { seen += 1; expect(frame.chick.ride).toBe('head'); expect(frame.chick.peep).toBeGreaterThan(0); expect(frame.chick.onto).toBeLessThan(0.1) }
        if (sounds.includes('peep') && onto === 1) { seen += 1; expect(frame.chick.ride).toBe('head'); expect(frame.chick.onto).toBeLessThan(1) }
        if (sounds.includes('tap') && onto > 0 && onto < 1 && frame.chick.ride !== null) { seen += 1; expect(frame.chick.onto).toBe(1) }
        if (sounds.includes('tap') && frame.chick.ride === null) { seen += 1; expect(onto).toBeGreaterThan(0); expect(onto).toBeLessThan(0.1) }
        if (onto < 1 && frame.chick.onto === 1) expect(sounds).toContain('tap')
        onto = frame.chick.onto
      }
    }
    expect(seen).toBe(7)
  })

  it('sounds each slip of the chick\'s wet fish as it leaves the plate, and each rap and hammer blow of the puffin\'s frozen one as it comes down', () => {
    const lie: Lie = { x: 0, y: 0, rot: 0, size: 1, tall: 1 }
    // The chick: three slips, each in the frame the fish starts up off the plate.
    const chick = staged(['fish'], { x: 540, y: ICE_Y - PENGUIN.r - 2, vy: 20, fish: 'wet' })
    playUntil(chick, (toy) => toy.phase === 'scene')
    let slips = 0, was = Infinity
    const plate = mealAt('chick', { fish: 'wet', act: 'react', p: 0 }, 0, 1, 0, lie).y
    while (chick.toy.phase === 'scene') {
      play(chick, 1 / 60)
      const meal = chick.toy.show().meal.chick
      const y = meal && meal.act === 'react' ? mealAt('chick', meal, 0, 1, 0, lie).y : plate
      if (namesAt(chick, chick.heard.length - 1).includes('slip')) {
        slips += 1
        expect(meal?.act).toBe('react')
        // It is on the plate, or has only just left it, and it was on the plate the frame before.
        expect(plate - y, `slip ${slips}`).toBeLessThan(4)
        expect(plate - was, `before slip ${slips}`).toBeLessThan(4)
        play(chick, 3 / 60)
        const next = chick.toy.show().meal.chick!
        expect(plate - mealAt('chick', next, 0, 1, 0, lie).y, `after slip ${slips}`).toBeGreaterThan(5)
      }
      was = y
    }
    expect(slips).toBe(3)

    // The puffin: two raps and two hammer blows, each in the frame the fish is down on the rim at the end of its swing.
    const puffin = staged(['fish'], { x: BASKET.x0 - PENGUIN.r - 2, y: (BASKET.y0 + BASKET.y1) / 2, vx: 100, fish: 'frozen' })
    playUntil(puffin, (toy) => toy.phase === 'scene')
    const blows: string[] = []
    let up = 0
    const down = mealAt('puffin', { fish: 'frozen', act: 'react', p: 0 }, 0, 1, 0, lie).rot
    while (puffin.toy.phase === 'scene') {
      play(puffin, 1 / 60)
      const meal = puffin.toy.show().meal.puffin
      const swung = meal && meal.act === 'react' ? mealAt('puffin', meal, 0, 1, 0, lie).rot - down : 0
      const sounds = namesAt(puffin, puffin.heard.length - 1).filter((name) => name === 'rap' || name === 'hammer')
      if (sounds.length > 0) {
        blows.push(...sounds)
        // It was up since the last blow, and it is down now.
        expect(up, `before blow ${blows.length}`).toBeGreaterThan(0.8)
        expect(Math.abs(swung), `blow ${blows.length}`).toBeLessThan(0.12)
        up = 0
      }
      up = Math.max(up, swung)
    }
    expect(blows).toEqual(['rap', 'rap', 'hammer', 'hammer'])
  })

  it('claps the near seal\'s flippers twice at a glider that bounces off it, and each clap is heard as they meet', () => {
    const played = staged(['wings'], { x: SEALS[0].x, y: SEALS[0].y - SEALS[0].r - PENGUIN.r - 4, vx: 60, vy: 300 })
    const claps: number[] = []
    let low = 1, apart = 0
    for (let n = 0; n < 90 && claps.length < 2; n++) {
      play(played, 1 / 60)
      const clap = played.toy.show().nearSeal.clap
      if (namesAt(played, played.heard.length - 1).includes('clap')) {
        claps.push(n)
        expect(clap, `clap ${claps.length}`).toBeGreaterThan(0.97)
        // Between two claps the flippers have come apart.
        if (claps.length === 2) apart = low
        low = 1
      }
      low = Math.min(low, clap)
    }
    expect(claps.length).toBe(2)
    expect(apart).toBeLessThan(0.1)
    expect((claps[1] - claps[0]) / 60).toBeCloseTo(CLAP / 2, 1)
    // And then they are still.
    play(played, CLAP / 4 + 2 / 60)
    expect(played.toy.show().nearSeal.clap).toBe(0)
  })

  it('is silent from the frame a touch ends it: no beat left over and no cue still waiting sounds afterwards', () => {
    const scenes: [Part[], Partial<Body>][] = [
      // The fish is still swinging towards the penguin's face.
      [['fish'], { x: 238, y: ICE_Y - PENGUIN.r - 6, vy: 500 }],
      // The second foot has not come down.
      [['umbrella'], { x: 238, y: ICE_Y - PENGUIN.r - 6, vy: 120, open: true }],
      [['fish'], { x: 540, y: ICE_Y - PENGUIN.r - 2, vy: 20, fish: 'frozen' }],
      [[], { x: 1232, y: 300, vx: 300 }],
    ]
    for (const [parts, put] of scenes) for (const frames of [0, 3, 30, 75, 130]) {
      const played = staged(parts, put)
      playUntil(played, (toy) => toy.phase === 'scene')
      play(played, frames / 60)
      if (played.toy.phase !== 'scene') continue
      played.toy.takeSounds()
      played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
      played.toy.tap()
      expect(played.toy.takeSounds().map((sound) => sound.name)).toEqual(['dot'])
      const from = played.heard.length
      play(played, 6)
      expect(heardFrom(played, from)).toEqual(['rub'])
    }
  })
})
