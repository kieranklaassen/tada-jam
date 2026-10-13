import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import * as calls from './calls'
import { TIERS } from './config'
import type { Guidance } from './guidance'
import { BOWLS, COMB, COMB_HAND, FOLK, LOOP, PEGS, PIG, SHEEP } from './layout'
import { cell, dab, daub, fresh, make, setDown, standIn, tally } from './probe'
import { TICK, type Toy } from './toy'
import { View } from './view'
import * as voices from './voices'
import type { Cue } from './voices'
import { ALL_KINDS, BLUE, GREEN, RUSSET, WHITE, YELLOW } from './wool'

// The close of the second reading, ruling 9: the answer to a touch, and the
// motion of any sound, is never something a tier leaves out. A tier leaves
// out two things, and the view counts them as `spared`: loose fibres under a
// working finger, and the second draw of running water and wind. Here every
// kind of sound the game has is made to sound, and through all of it each
// tier's frame is the full frame less what that tier spared, draw for draw.

const sources = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const NO_GUIDANCE: Guidance = { glow: 0, demo: null, demoIndex: -1 }
const ROOM = { x: 1160, y: 250 }

function viewOf(toy: Toy, tier = TIERS[0]): View {
  const view = new View(make)
  view.setTier(tier, toy)
  view.resize(1180, 820, tier.dpr, { scale: 1, x: 0, y: 0 })
  view.load(toy)
  return view
}

const same = (a: Note, b: Note): boolean => a.kind === b.kind && a.frequency === b.frequency && a.peak === b.peak && a.attack === b.attack && a.decay === b.decay && a.glideTo === b.glideTo
const first = (sound: Cue | readonly Note[]): Note | null => (sound.length === 0 ? null : 'notes' in (sound[0] as object) ? (sound as Cue)[0].notes[0] : (sound as readonly Note[])[0])

/** One toy with a view at each tier: every frame is drawn at all four from the same model, and compared. */
class Rig {
  heard: Note[] = []
  frames = 0
  spared = TIERS.map(() => 0)
  private views: View[]
  private c = standIn(tally())
  private ticks = 0

  constructor(readonly toy: Toy) {
    this.views = TIERS.map((tier) => viewOf(toy, tier))
  }

  /** Draws the frame at every tier. What the toy laid and combed since the last frame is handed to each view alike. */
  frame(): void {
    const toy = this.toy, lists = [toy.laid, toy.joins, toy.combed, toy.relaid] as unknown[][], kept = lists.map((list) => [...list])
    const totals = this.views.map((view, tier) => {
      lists.forEach((list, i) => { list.length = 0; list.push(...kept[i]) })
      view.draw(this.c, toy, NO_GUIDANCE)
      this.spared[tier] += view.spared
      return view.draws + view.spared
    })
    this.frames++
    if (totals.some((total) => total !== totals[0])) throw new Error(`at ${toy.t.toFixed(2)} s the tiers drew ${this.views.map((view) => `${view.draws}+${view.spared}`).join(', ')}`)
  }

  /** Plays on, a tick at a time: a frame in every tick that releases a sound, and in every third tick besides. */
  play(seconds: number): void {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      this.toy.advance(TICK)
      const notes = [...(this.toy.takeSounds() ?? []), ...(this.toy.takeSceneSounds() ?? [])]
      this.heard.push(...notes)
      if (notes.length > 0 || ++this.ticks % 3 === 0) this.frame()
    }
  }

  tap(at: { x: number; y: number }, then = 0.8): void {
    this.toy.press(at); this.toy.end('tap'); this.play(then)
  }

  /** One stroke: the finger lands, goes to each point in turn, and lifts. */
  stroke(points: { x: number; y: number }[], each: number, then: number): void {
    this.toy.press(points[0])
    for (const point of points.slice(1)) { this.toy.move(point); this.play(each) }
    this.toy.end('dragEnd')
    this.play(then)
  }
}

/** Every kind of sound, by the name it is exported under: whether it was among the notes heard. */
function kinds(): Record<string, (heard: readonly Note[]) => boolean> {
  const any = (...sounds: (Cue | readonly Note[])[]) => (heard: readonly Note[]): boolean => sounds.some((sound) => { const note = first(sound); return note !== null && heard.some((one) => same(one, note)) })
  const each = (...sounds: (Cue | readonly Note[])[]) => (heard: readonly Note[]): boolean => sounds.every((sound) => any(sound)(heard))
  const dyes = [0, 1, 2, 3, 4], sizes = [0, 1, 2], folk = [0, 1, 2, 3]
  return {
    puff: any(...dyes.flatMap((dye) => sizes.map((size) => voices.puff(dye, size)))),
    brush: (heard) => heard.some((note) => note.kind === 'noise' && note.q === 1.2 && note.attack === 0.02 && note.decay === 0.09),
    pat: (heard) => heard.some((note) => note.kind === 'noise' && note.frequency === 650 && note.q === 0.8),
    clung: any(...dyes.map((dye) => voices.clung(dye))),
    pluck: any(...dyes.flatMap((dye) => sizes.map((size) => voices.pluck(dye, size)))),
    roomPat: any(voices.roomPat), pegKnock: any(voices.pegKnock), mothFlutter: any(voices.mothFlutter),
    WAKE: each(...ALL_KINDS.map((kind) => voices.WAKE[kind])),
    cloudPatter: any(voices.cloudPatter),
    folkVoice: (heard) => any(...folk.map((who) => voices.folkVoice(who, 'look', 0)))(heard) && any(...folk.map((who) => voices.folkVoice(who, 'poke', 0)))(heard),
    muffled: any(voices.muffled(voices.WAKE.earth)),
    rasp: each(...sizes.map((height) => calls.rasp(height))), bareRasp: each(...sizes.map((height) => calls.bareRasp(height))), FLUFF: each(...calls.FLUFF),
    combTeeth: any(calls.combTeeth), combPluck: any(calls.combPluck), peel: any(calls.peel), VEIL: each(...calls.VEIL),
    coatOn: each(...dyes.map((dye) => calls.coatOn(SHEEP, dye))), coatOff: any(calls.coatOff), giggle: any(calls.giggle(SHEEP)),
    setDown: any(calls.setDown(SHEEP)), homeLanding: any(calls.homeLanding(SHEEP)), liftUp: any(calls.liftUp),
    actVoice: any(calls.actVoice(SHEEP, 'graze')), beatVoice: any(calls.beatVoice(SHEEP, 'shiver')),
    loopTwang: any(calls.loopTwang), loopBack: any(calls.loopBack), pictureKnock: any(calls.pictureKnock), mothBite: any(calls.mothBite),
    rainGather: any(calls.rainGather), rainFirst: any(calls.rainFirst), rainSteady: any(calls.rainSteady), fireHiss: any(calls.fireHiss),
    sunReach: any(calls.sunReach), steamHiss: any(calls.steamHiss), dryCracks: any(calls.dryCracks), bowStrands: any(calls.bowStrands), bowHang: any(calls.bowHang),
    unhook: any(calls.unhook), tuck: any(calls.tuck), swingUp: any(calls.swingUp), settleOnPeg: any(calls.settleOnPeg),
    eveningLight: any(calls.eveningLight), eveningWays: any(calls.eveningWays), turnRound: any(calls.turnRound), feltThump: any(calls.feltThump), daylight: any(calls.daylight),
  }
}

/** The sessions: between them every kind of sound is heard. Each returns its rig once it has played out. */
const SESSIONS: Record<string, () => Rig> = {
  'the fifteen things and a scrap': () => {
    const rig = new Rig(fresh(GREEN, 1, 3))
    for (let dye = 0; dye < 5; dye++) for (const row of [42, 22, 5]) { daub(rig.toy, dye, 2 + dye * 14, row, 9 + dye * 14, row + 4); rig.play(1.5) }
    rig.toy.size = 2
    dab(rig.toy, GREEN, 68, 30)
    rig.play(0.5)
    return rig
  },
  'the five veils, and one combed off': () => {
    const rig = new Rig(fresh(RUSSET, 1, 3))
    for (let i = 0; i < 4; i++) { daub(rig.toy, RUSSET, 2 + i * 14, 40, 11 + i * 14, 45); rig.play(1.2) }
    daub(rig.toy, GREEN, 58, 40, 67, 45)
    rig.play(1.2)
    for (const [i, dye] of [GREEN, WHITE, BLUE, YELLOW].entries()) { daub(rig.toy, dye, 5 + i * 14, 41, 8 + i * 14, 43); rig.play(1.6) }
    daub(rig.toy, RUSSET, 61, 41, 64, 43)
    rig.play(1.6)
    // The comb, to and fro over the green veil until it is gone.
    rig.toy.hand = COMB_HAND
    const sweep = Array.from({ length: 24 }, (_, i) => cell(4 + (i % 2) * 6, 40 + (i % 5)))
    rig.stroke(sweep, 0.12, 1.5)
    return rig
  },
  'the comb, on bare felt and on wool at each height': () => {
    const rig = new Rig(fresh(GREEN, 1, 3))
    for (const row of [40, 22, 4]) { daub(rig.toy, GREEN, 40, row, 50, row + 5); rig.play(1.4) }
    rig.tap({ x: COMB.x, y: COMB.y })
    // Through the wool, and on from it onto bare felt, at each height.
    for (const row of [42, 24, 6]) rig.stroke([cell(42, row), cell(48, row), cell(56, row), cell(62, row), cell(66, row)], 0.3, 1.4)
    // A touch that lands where no wool lies: wool from the green bowl, and the comb back in its place.
    rig.tap(cell(10, 20))
    return rig
  },
  'a figure poked, carried, set down, coated, combed, tickled and sent home': () => {
    const rig = new Rig(fresh(GREEN, 1, 3)), toy = rig.toy
    daub(toy, GREEN, 6, 38, 30, 44)
    rig.play(1.5)
    rig.tap({ x: FOLK[PIG].x, y: FOLK[PIG].y - FOLK[PIG].h / 2 }, 1.2)
    setDown(toy, SHEEP, 16, 40)
    rig.play(2.5)
    const across = (): void => { const sheep = toy.folk[SHEEP]; rig.stroke([{ x: sheep.x - 110, y: sheep.y - 30 }, { x: sheep.x, y: sheep.y - 30 }], 0.05, 1.6) }
    for (let dye = 0; dye < 5; dye++) { toy.hand = dye; across() }
    toy.hand = COMB_HAND
    across()
    across()
    const sheep = toy.folk[SHEEP]
    rig.stroke([{ x: sheep.x, y: sheep.y - 20 }, ROOM, ROOM], 0.1, 1.2)
    return rig
  },
  'the room, a stroke of wool, the loop, and a picture hung and knocked': () => {
    const rig = new Rig(fresh(GREEN, 1, 3)), toy = rig.toy
    rig.tap(ROOM)
    rig.tap(PEGS[0])
    rig.tap(LOOP)
    rig.tap({ x: BOWLS[2].x, y: BOWLS[2].y - 16 })
    rig.tap(toy.mothAt()!, 1.6)
    // A tuft taken from the chosen bowl and carried over the table to the felt: it is under the finger at every tier.
    rig.stroke([{ x: BOWLS[2].x, y: BOWLS[2].y - 16 }, { x: BOWLS[2].x + 20, y: BOWLS[2].y - 60 }, { x: BOWLS[2].x + 30, y: BOWLS[2].y - 90 }, cell(34, 46)], 0.15, 1.2)
    // A stroke that goes and then waits: it brushes, then pats.
    rig.stroke([cell(20, 40), cell(26, 40), cell(32, 40), cell(38, 40), cell(38, 40), cell(38, 40), cell(38, 40)], 0.15, 1.5)
    rig.stroke([LOOP, PEGS[0]], 0.1, 9.5)
    rig.tap(PEGS[toy.wall[0].peg], 0.8)
    return rig
  },
  'a tapped cloud, rain on a hill, a sun that dries it, and the bow': () => {
    const rig = new Rig(fresh(WHITE, 0, 3))
    dab(rig.toy, WHITE, 62, 6)
    rig.play(1.6)
    daub(rig.toy, GREEN, 4, 39, 30, 45)
    rig.play(1.4)
    daub(rig.toy, WHITE, 8, 3, 22, 8)
    rig.play(5.5)
    daub(rig.toy, YELLOW, 34, 4, 39, 9)
    rig.play(10.5)
    return rig
  },
  'rain on a fire': () => {
    const rig = new Rig(fresh(YELLOW, 1, 3))
    daub(rig.toy, YELLOW, 30, 22, 38, 27)
    rig.play(1.4)
    daub(rig.toy, WHITE, 30, 4, 38, 8)
    rig.play(5.5)
    return rig
  },
  'a sun that dries all of a rain, and the earth under it': () => {
    const rig = new Rig(fresh(RUSSET, 1, 3))
    daub(rig.toy, RUSSET, 10, 39, 20, 45)
    rig.play(1.4)
    daub(rig.toy, WHITE, 12, 3, 18, 7)
    rig.play(5.5)
    daub(rig.toy, YELLOW, 22, 4, 27, 9)
    rig.play(6)
    return rig
  },
  'four evenings, and the fresh felt after each': () => {
    const rig = new Rig(fresh(GREEN, 1, 3))
    for (let n = 0; n < 4; n++) {
      daub(rig.toy, GREEN, 6, 38, 30, 44)
      rig.play(0.5)
      rig.stroke([LOOP, PEGS[n % 3]], 0.1, 9.6)
      rig.tap(cell(30, 30), 4.3)
    }
    return rig
  },
}

describe('ruling 9: a tier leaves out loose fibres and second copies, and nothing else', () => {
  it('names every sound the game has', () => {
    const exported = ['./calls.ts', './voices.ts'].flatMap((name) => [...sources[name].matchAll(/^export (?:const|function) (\w+)/gm)].map((match) => match[1]))
    // These three are not sounds: the bowls' notes, and the length of a cue.
    const sounds = exported.filter((name) => !['DYE_NOTE', 'cueLength'].includes(name)).sort()
    expect(Object.keys(kinds()).sort()).toEqual(sounds)
    expect(Object.keys(calls).length + Object.keys(voices).length).toBe(exported.length)
  })

  const heard: Note[] = []
  it.each(Object.keys(SESSIONS))('draws, through %s, the same frame at every tier but for what the tier spared', (name) => {
    const rig = SESSIONS[name]()
    heard.push(...rig.heard)
    expect(rig.frames).toBeGreaterThan(60)
    expect(rig.heard.length).toBeGreaterThan(10)
    // The cheaper a tier, the more it spares, and the cheapest spares the most.
    for (let tier = 1; tier < TIERS.length; tier++) expect(rig.spared[tier]).toBeGreaterThanOrEqual(rig.spared[tier - 1])
  })

  it('has heard every kind of sound in those sessions', () => {
    const all = kinds()
    expect(Object.keys(all).filter((name) => !all[name](heard))).toEqual([])
  })

  it('draws the comb\'s fluff, a coat\'s tuft and the room\'s lint at the cheapest tier, every mote, and spares only loose fibres', () => {
    const cheapest = TIERS[TIERS.length - 1]
    expect([cheapest.floaters, cheapest.flow]).toEqual([0, 0])
    const toy = fresh(GREEN, 1, 3), view = viewOf(toy, cheapest), surface = tally(), c = standIn(surface)
    /** How many draws the floaters are: a frame with them, less the same frame without. */
    const afloat = (): { drawn: number; spared: number } => {
      surface.draws = 0
      view.draw(c, toy, NO_GUIDANCE)
      const withThem = surface.draws, spared = view.spared, floaters = toy.floaters
      toy.floaters = []
      surface.draws = 0
      view.draw(c, toy, NO_GUIDANCE)
      toy.floaters = floaters
      return { drawn: withThem - surface.draws, spared }
    }
    daub(toy, GREEN, 6, 38, 30, 44)
    toy.advance(2)
    // The comb through wool: every mote of fluff is drawn.
    toy.hand = COMB_HAND
    toy.press(cell(10, 41)); toy.move(cell(24, 41)); toy.advance(0.4)
    const fluff = toy.floaters.filter((floater) => floater.kept).length
    expect(fluff).toBeGreaterThan(1)
    expect(toy.floaters).toHaveLength(fluff)
    expect(afloat()).toEqual({ drawn: fluff, spared: 0 })
    toy.end('dragEnd')
    toy.advance(2)
    // A coat goes on in a puff of loose fibres, which this tier spares; combed off, its one tuft is drawn.
    setDown(toy, SHEEP, 40, 30)
    toy.advance(2)
    const sheep = toy.folk[SHEEP], across = (): void => { toy.press({ x: sheep.x - 110, y: sheep.y - 30 }); toy.move({ x: sheep.x, y: sheep.y - 30 }); toy.advance(TICK); toy.end('dragEnd') }
    toy.hand = RUSSET
    across()
    expect(sheep.coat).toBe(RUSSET)
    const loose = toy.floaters.filter((floater) => !floater.kept).length
    expect(loose).toBeGreaterThanOrEqual(4)
    expect(afloat()).toEqual({ drawn: 0, spared: loose })
    toy.advance(2)
    toy.hand = COMB_HAND
    across()
    expect(sheep.coat).toBeNull()
    const kept = toy.floaters.filter((floater) => floater.kept)
    expect(kept.some((floater) => floater.size === 1.5)).toBe(true)
    expect(afloat().drawn).toBe(kept.length)
    toy.advance(2)
    // A touch on the bare room: its three motes of lint.
    toy.press(ROOM); toy.end('tap')
    toy.advance(TICK)
    expect(afloat()).toEqual({ drawn: 3, spared: 0 })
    // Lint in the air first, and loose fibres after it: every mote of the lint is drawn, and the fibres are what is spared.
    toy.hand = RUSSET
    across()
    const fibres = toy.floaters.filter((floater) => !floater.kept).length
    expect(fibres).toBeGreaterThanOrEqual(3)
    expect(toy.floaters.slice(0, 3).every((floater) => floater.kept && floater.dye < 0)).toBe(true)
    const stamped: unknown[] = [], watched = standIn(tally())
    ;(watched as unknown as { drawImage: (image: unknown) => void }).drawImage = (image) => { stamped.push(image) }
    view.draw(watched, toy, NO_GUIDANCE)
    const lint = (view as unknown as { lint: { sprites: unknown[] } }).lint.sprites
    expect(stamped.filter((image) => lint.includes(image))).toHaveLength(3)
    expect(view.spared).toBe(fibres)
    // The full tier draws the same motes and the loose fibres too.
    expect(TIERS[0].floaters).toBeGreaterThan(4)
  })
})
