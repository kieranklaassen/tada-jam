import { describe, expect, it } from 'vitest'
import { BROUGHT, CELLS, SOAKED, cellOf, neededFor, type AnswerId, type BitKind, type Brought } from './cells'
import { Farm, STAYS_UP_S, DOOR_GUARD_S } from './farm'
import { BODY, HENHOUSE, HENS, HOME, ROOFTOP, THINGS, centreOf, doorBox, henCircle, type Point, type ThingId } from './layout'
import { blankHen, blankRig, goatRig, henRig, pigRig, ponyRig, PERSONALITY, type HenRig, type Rig } from './motion'
import { ANIMALS, freshState, type AnimalId, type GameState } from './state'
import { USES } from './timeline'
import { SEGMENTS, channelOf, type SoundId, type Who } from './voices'

// What is heard and what is drawn share one clock. This walks every cell of
// the grid, every chain an answer sets off and all three scenes, a small step
// at a time, and for every note of every sound the model sends it asks, at
// the moment the note sounds, whether its maker is doing it: the thing is at
// the animal, the bits are in the air, the body is off its idle pose, the
// door is moving, the hen's head is down. A note that sounds while its maker
// is not doing it fails by name.
//
// It holds two more things at every step. An answer to a thing goes on only
// while the thing is at the animal, or once the thing has given what the
// answer needs of it. And a thing is at an animal only while that animal is
// answering it. So a thing taken away in the middle of a use takes the answer
// with it, and the walk of every pair of uses says so.

const DT = 1 / 120
/** A note may lead or trail what makes it by this much: under two frames at sixty a second, and the fade of a pose. */
const EARLY = 0.04, LATE = 0.05

type Pending = { sound: SoundId; who: Who; at: number; due: number; animal: AnimalId | null; lead: number }
type Miss = string

const BIG = { pony: ponyRig, goat: goatRig, pig: pigRig } as const

/** Whether two rigs differ by enough to see. */
function moved(a: Rig, b: Rig): boolean {
  return Math.abs(a.dx - b.dx) > 1.5 || Math.abs(a.dy - b.dy) > 1.5 || Math.abs(a.headX - b.headX) > 1.5 || Math.abs(a.headY - b.headY) > 1.5
    || Math.abs(a.rot - b.rot) > 0.02 || Math.abs(a.head - b.head) > 0.03 || Math.abs(a.earL - b.earL) > 0.05 || Math.abs(a.earR - b.earR) > 0.05 || Math.abs(a.tail - b.tail) > 0.08 || Math.abs(a.jaw - b.jaw) > 0.08
    || Math.abs(a.sx - b.sx) > 0.012 || Math.abs(a.sy - b.sy) > 0.012 || Math.abs(a.mouth - b.mouth) > 0.08 || Math.abs(a.grin - b.grin) > 0.08 || Math.abs(a.lid - b.lid) > 0.1 || Math.abs(a.extra - b.extra) > 0.06 || Math.abs(a.extra2 - b.extra2) > 0.06
}

/** A large animal's body is off its idle pose: its answer is moving it now. */
function bodyBusy(farm: Farm, animal: Exclude<AnimalId, 'hens'>): boolean {
  const a = farm.answers[animal]
  if (!a) return false
  const rig = BIG[animal]
  return moved(rig(farm.time, farm.filled[animal], a.id, a.t, a.lasts, false, blankRig()), rig(farm.time, farm.filled[animal], null, 0, 1, false, blankRig()))
}

function henPose(farm: Farm, i: number, answering: boolean): HenRig {
  const hen = farm.hens[i], a = answering ? farm.answers.hens : null
  return henRig(i, farm.time, hen.mode, hen.speed, farm.filled.hens, a?.id ?? null, a?.t ?? 0, a?.lasts ?? 1, a?.lead === i, hen.pecked, blankHen())
}

/** A hen is doing something: on her way somewhere, pecking, or moved by the hens' answer. */
function henBusy(farm: Farm, i: number): boolean {
  const hen = farm.hens[i]
  if (hen.inside) return false
  if ((hen.mode === 'go' && hen.wait <= 0) || hen.mode === 'peck' || hen.trip >= 0 || hen.shook >= 0 || hen.bumped >= 0) return true
  const a = henPose(farm, i, true), b = henPose(farm, i, false)
  return Math.abs(a.dy - b.dy) > 1.5 || Math.abs(a.rot - b.rot) > 0.04 || Math.abs(a.head - b.head) > 0.04 || Math.abs(a.neck - b.neck) > 0.05 || Math.abs(a.wing - b.wing) > 0.05
    || Math.abs(a.puff - b.puff) > 0.04 || Math.abs(a.lean - b.lean) > 0.03 || Math.abs(a.extra - b.extra) > 0.06 || Math.abs(a.extra2 - b.extra2) > 0.06
}

/** Whether the maker of a note is drawn doing it now. `doorMoved` is when the door last moved along its rail. */
function doing(farm: Farm, note: Pending, doorMoved: number): boolean {
  const who = note.who, hand = farm.hand
  if (who === 'touch') return true
  if (who === 'leap') return hand?.mode === 'leap' && hand.cell === note.sound
  if (who === 'thing') return hand?.mode === 'tip' && hand.cell === note.sound
  if (who === 'back') return hand?.mode === 'back'
  if (who.startsWith('bits-')) return farm.bits.some((bit) => bit.kind === (who.slice(5) as BitKind))
  if (who === 'body') return note.animal === 'hens' ? farm.hens.some((_, i) => henBusy(farm, i)) : note.animal !== null && farm.answers[note.animal]?.id === note.sound && bodyBusy(farm, note.animal)
  if (who === 'lead') return henBusy(farm, note.lead)
  if (who === 'others') return farm.hens.some((_, i) => i !== note.lead && henBusy(farm, i))
  if (who === 'door') return farm.time - doorMoved <= 0.1
  if (who === 'door-shakes') return farm.doorShake > 0.1
  if (who === 'hens-move') return farm.hens.some((hen) => (hen.mode === 'go' && hen.wait <= 0) || hen.trip >= 0 || hen.shook >= 0)
  if (who === 'trip') return farm.hens[1].trip >= 0
  if (who === 'shake') return farm.hens[0].shook >= 0
  if (who === 'beaks') return farm.peek > 0.5 && farm.slide === 0
  if (who === 'sun-dips') return farm.sunDip > 0 && farm.sunDip < 1
  if (who === 'crow') return farm.crow >= 0 && farm.slide === 0
  if (who === 'cat-stretch') return farm.catStretch >= 0 && farm.cat > 0.6
  if (who === 'mew') return farm.hatch >= 0 && farm.cat < 0.5
  if (who === 'croon') return farm.filled.hens === 1 && farm.hens.every((hen, i) => hen.mode === 'stand' && henPose(farm, i, false).sit === 1 && henPose(farm, i, false).puff > 0.1 + PERSONALITY.hens[i].depth + 0.004)
  if (who.startsWith('bumped-')) return farm.hens[Number(who.slice(7))].bumped >= 0
  if (who.startsWith('run-')) { const hen = farm.hens[Number(who.slice(4))]; return hen.mode === 'go' && hen.wait <= 0 }
  if (who.startsWith('peck-')) { const i = Number(who.slice(5)); return farm.hens[i].mode === 'peck' && henPose(farm, i, true).head > 0.8 }
  if (who.startsWith('asleep-')) return farm.asleep.has(who.slice(7) as AnimalId)
  if (who.startsWith('yawn-')) return farm.yawned[who.slice(5) as AnimalId] >= 0
  if (who.startsWith('settled-')) return farm.settled[who.slice(8) as AnimalId] >= 0
  throw new Error(`no probe for ${who}`)
}

const channel = (sound: SoundId): string | null => channelOf(sound).channel
const replaces = (sound: SoundId): boolean => channelOf(sound).replace

/** Walks a yard and keeps every note the model sends until its moment has come. */
class Walk {
  readonly misses: Miss[] = []
  readonly heard = new Set<SoundId>()
  /** Every channel the model has said to stop, in order. */
  readonly stopped: string[] = []
  private pending: Pending[] = []
  private doorMoved = -9
  private slide: number
  constructor(readonly farm: Farm, private readonly name: string) {
    this.slide = farm.slide
  }

  /** Takes what the model has queued. Stops come first, as in the Mount: a stopped channel's notes are not owed any more. */
  private take(): void {
    const farm = this.farm
    const stops = farm.takeStops()
    this.stopped.push(...stops)
    if (stops.length > 0) this.pending = this.pending.filter((note) => !stops.includes(channel(note.sound) as never))
    for (const sound of farm.takeSounds()) {
      this.heard.add(sound)
      const on = channel(sound)
      // An answer takes its animal's channel over.
      if (on !== null && replaces(sound)) this.pending = this.pending.filter((note) => channel(note.sound) !== on)
      const animal = sound in CELLS ? (sound.slice(sound.indexOf('-') + 1) as AnimalId) : null
      for (const segment of SEGMENTS[sound]) for (const one of segment.notes) this.pending.push({ sound, who: segment.who, at: one.delay ?? 0, due: farm.time + (one.delay ?? 0), animal, lead: farm.answers.hens?.lead ?? 0 })
    }
  }

  private check(): void {
    const farm = this.farm
    if (farm.slide !== this.slide) { this.slide = farm.slide; this.doorMoved = farm.time }
    const hand = farm.hand
    const at = hand && (hand.mode === 'leap' || hand.mode === 'tip') ? hand.cell : null
    for (const animal of ANIMALS) {
      const a = farm.answers[animal]
      if (a && a.id in USES && a.id !== at && a.t < neededFor(a.id as keyof typeof USES) - 0.02) this.miss(`${this.name}: ${a.id} goes on at ${a.t.toFixed(2)} s with its thing gone`)
    }
    if (at && farm.answers[at.slice(at.indexOf('-') + 1) as AnimalId]?.id !== at) this.miss(`${this.name}: the ${hand!.thing} is at an animal that is not answering it (${at})`)
    this.pending = this.pending.filter((note) => {
      if (farm.time < note.due - EARLY) return true
      if (doing(farm, note, this.doorMoved)) return false
      if (farm.time <= note.due + LATE) return true
      this.misses.push(`${this.name}: ${note.sound} at ${note.at.toFixed(2)} s sounds while ${note.who} is not doing it`)
      return false
    })
  }

  private miss(what: Miss): void {
    if (!this.misses.includes(what)) this.misses.push(what)
  }

  touch(at: Point): void {
    this.farm.press(at.x, at.y)
    this.farm.tap()
    this.take()
    this.check()
  }

  play(seconds: number): void {
    for (let t = 0; t < seconds; t += DT) {
      this.farm.step(DT)
      this.take()
      this.check()
    }
  }

  lift(thing: ThingId): void {
    this.touch(HOME[thing])
    this.play(STAYS_UP_S + 0.1)
  }
}

const open = (content: AnimalId[] = []): GameState => ({ ...freshState(null), door: 'open', content })
const shut = (): GameState => ({ ...freshState(null), door: 'shut', content: [] })
const spot = (farm: Farm, animal: AnimalId, lead = 1): Point => (animal === 'hens' ? henCircle(farm.hens[lead], HENS[lead].size) : centreOf(BODY[animal]))
const doorAt = (farm: Farm): Point => { const box = doorBox(farm.slide); return { x: box.x + box.w / 2, y: box.y + 40 } }

/** Uses one thing (or the bare finger) on one animal in a yard, and walks the answer and whatever it sets off to its end. */
function useOnce(state: GameState, brought: Brought, animal: AnimalId, lead: number, seed: number): Walk {
  const walk = new Walk(new Farm(state, seed), `${brought} on ${animal}${animal === 'hens' ? ` (hen ${lead})` : ''}, door ${state.door}, ${state.content.length} content`)
  walk.play(0.5)
  if (brought !== 'finger') walk.lift(brought)
  walk.touch(spot(walk.farm, animal, lead))
  walk.play(CELLS[cellOf(brought, animal)].lasts + 5)
  return walk
}

describe('one clock for what is heard and what is drawn', () => {
  it('sounds every note of every cell while its maker is doing it, with nobody content and with everybody content', () => {
    const misses: Miss[] = []
    const heard = new Set<SoundId>()
    for (const content of [[], [...ANIMALS]] as AnimalId[][]) {
      for (const brought of BROUGHT) for (const animal of ANIMALS) for (const lead of animal === 'hens' ? [0, 1, 2] : [0]) {
        const walk = useOnce(open(content), brought, animal, lead, 3 + lead)
        misses.push(...walk.misses)
        for (const sound of walk.heard) heard.add(sound)
      }
    }
    expect(misses).toEqual([])
    // Every cell was heard, with the two chains that cross the yard and each hen's own pecks.
    for (const brought of BROUGHT) for (const animal of ANIMALS) expect(heard.has(cellOf(brought, animal)), cellOf(brought, animal)).toBe(true)
    for (const sound of [SOAKED, 'run-white', 'run-russet', 'bonk-white', 'bonk-russet', 'bonk-bantam', 'tok-white', 'tok-russet', 'tok-bantam', 'peck-white', 'peck-russet', 'peck-bantam'] as SoundId[]) expect(heard.has(sound), sound).toBe(true)
  })

  it('ends an answer with its thing when the thing is taken away mid-use: every pair of uses, the second at several moments inside the first', () => {
    const misses: Miss[] = []
    const moments = [0.05, 0.15, 0.25, 0.45, 0.8, 1.3, 1.9, 2.5]
    // The thing leaves for another animal, for another thing, or for the night. A thing at an animal is no target
    // itself, so a touch on it lands on what is under it; and a knock on the bare page takes nothing away.
    // Two more come after the thing: it is laid down as soon as it is back over its place and a hen is poked, and
    // the brush is lifted in its place and used on a hen. Both find the hens wherever the first use sent them.
    type Second = { kind: 'use'; animal: AnimalId } | { kind: 'lift' } | { kind: 'night' } | { kind: 'knock' } | { kind: 'poke' } | { kind: 'brush' }
    const seconds: Second[] = [...ANIMALS.map((animal): Second => ({ kind: 'use', animal })), { kind: 'lift' }, { kind: 'night' }, { kind: 'knock' }, { kind: 'poke' }, { kind: 'brush' }]
    let cut = 0, kept = 0
    for (const state of [open(), open([...ANIMALS]), shut()]) for (const thing of THINGS) for (const first of ANIMALS) {
      // With the door shut the hens' column is the coming out, which the scenes walk.
      if (state.door === 'shut' && (first === 'hens' || thing !== 'scoop')) continue
      const cell = cellOf(thing, first) as keyof typeof USES
      for (const [nth, at] of moments.entries()) for (const second of seconds) {
        if ((second.kind === 'poke' || second.kind === 'brush') && (state.door === 'shut' || (second.kind === 'brush' && thing === 'brush'))) continue
        if (at >= CELLS[cell].lasts || (state.door === 'shut' && (second.kind === 'night' || (second.kind === 'use' && second.animal === 'hens')))) continue
        const name = `${cell} then ${second.kind === 'use' ? `the ${thing} on ${second.animal}` : second.kind} at ${at} s, door ${state.door}, ${state.content.length} content`
        const walk = new Walk(new Farm(state, 7), name)
        const farm = walk.farm
        walk.play(0.5)
        walk.lift(thing)
        walk.touch(spot(farm, first))
        walk.play(at)
        const there = farm.hand !== null && (farm.hand.mode === 'leap' || farm.hand.mode === 'tip')
        const needed = there && farm.answers[first]?.id === cell && farm.hand!.clock < neededFor(cell)
        const same = second.kind === 'use' && second.animal === first
        walk.stopped.length = 0
        // The idle yard throws dust and bubbles of its own; an answer throws the rest.
        const thrown = (): number => farm.bits.filter((bit) => bit.kind !== 'dust' && bit.kind !== 'bubble').length
        const bits = thrown()
        if (second.kind === 'use') walk.touch(spot(farm, second.animal))
        else if (second.kind === 'lift') walk.touch(HOME[THINGS[(THINGS.indexOf(thing) + 1) % THINGS.length]])
        else if (second.kind === 'night') walk.touch(doorAt(farm))
        else if (second.kind === 'poke') {
          while (farm.hand!.mode !== 'held' || farm.hand!.since < STAYS_UP_S) walk.play(DT)
          walk.touch({ x: farm.hand!.x, y: farm.hand!.y })
          expect(farm.hand, name).toBeNull()
          walk.play(0.1)
          walk.touch(spot(farm, 'hens', nth % 3))
          expect(farm.answers.hens?.id, name).toBe('finger-hens')
        } else if (second.kind === 'brush') {
          walk.touch(HOME.brush)
          walk.play(0.1)
          walk.touch(spot(farm, 'hens', nth % 3))
          // A hen walking home past the brush's place is in front of it, and a tap there is hers: the first thing is then used on her.
          expect(farm.answers.hens?.id, name).toBe(`${farm.hand!.thing}-hens`)
        }
        else walk.touch({ x: 640, y: 150 })
        if (second.kind === 'knock') expect(farm.answers[first]?.id, name).toBe(cell)
        else if (second.kind === 'poke' || second.kind === 'brush') kept += 1
        else if (needed && !same) {
          cut += 1
          // The answer has stopped, its channel is stopped, and the animal is left looking after the thing.
          expect(farm.answers[first], name).toBeNull()
          expect(walk.stopped, name).toContain(first)
          expect(farm.turned, name).toMatchObject({ animal: first, left: true })
          // Nothing more falls from a thing that has gone: with no new use, no bit is thrown at all.
          if (second.kind === 'lift') {
            for (let t = 0; t < 1.2; t += DT) { walk.play(DT); expect(thrown(), name).toBeLessThanOrEqual(bits); expect(farm.answers[first], name).toBeNull() }
          }
        } else if (!same) kept += 1
        walk.play(second.kind === 'night' ? 11 : 7)
        misses.push(...walk.misses)
      }
    }
    expect(misses).toEqual([])
    // Both kinds of pair were walked: the thing taken while it was needed, and taken after it had given what it gives.
    expect(cut).toBeGreaterThan(150)
    expect(kept).toBeGreaterThan(150)
  })

  it('shakes the door for as long as the shut-in hens drum on it', () => {
    for (const animal of ['pony', 'goat', 'pig'] as const) {
      const walk = useOnce(shut(), 'scoop', animal, 0, 5)
      expect(walk.heard.has('hens-drum')).toBe(true)
      expect(walk.misses).toEqual([])
    }
  })

  it('sounds the coming out as it is drawn: the rumble while the door slides, the trip at the sill, the shake when she is out', () => {
    const walk = new Walk(new Farm(shut(), 2), 'the coming out')
    walk.play(1)
    walk.touch(doorAt(walk.farm))
    walk.play(4)
    for (const sound of ['door-open', 'trip', 'shake'] as SoundId[]) expect(walk.heard.has(sound), sound).toBe(true)
    expect(walk.misses).toEqual([])
  })

  it('sounds the night as it is drawn, with the hens at home and with the hens across the yard, where the door waits for them', () => {
    for (const away of [false, true]) {
      const walk = new Walk(new Farm(open(['pony', 'pig']), 4), `the night, hens ${away ? 'away' : 'home'}`)
      walk.play(1)
      if (away) {
        walk.lift('scoop')
        walk.touch(spot(walk.farm, 'pig'))
        walk.play(2.4)
        expect(walk.farm.hens.some((hen) => hen.x > 600)).toBe(true)
      }
      walk.touch(doorAt(walk.farm))
      walk.play(11)
      for (const sound of ['hens-in', 'door-slide', 'door-clunk', 'nightfall', 'snore-pony', 'snore-goat', 'snore-pig', 'snore-hens', 'crow', 'yawn-pony', 'yawn-goat', 'yawn-pig', 'beaks'] as SoundId[]) expect(walk.heard.has(sound), `${sound}, hens ${away ? 'away' : 'home'}`).toBe(true)
      expect(walk.misses).toEqual([])
    }
  })

  it('sounds the full morning as it is drawn: the cat stretches when it is out on the roof, and each animal moves with its settled sound', () => {
    const walk = new Walk(new Farm(open(), 6), 'the full morning')
    walk.play(0.5)
    for (const animal of ANIMALS) {
      walk.lift(({ hens: 'scoop', pony: 'brush', goat: 'fork', pig: 'bucket' } as const)[animal])
      walk.touch(spot(walk.farm, animal))
      walk.play(animal === 'pig' ? 14 : 4.5)
    }
    for (const sound of ['cat-stretch', 'settled-hens', 'settled-pony', 'settled-goat', 'settled-pig'] as SoundId[]) expect(walk.heard.has(sound), sound).toBe(true)
    // Afterwards the yard is quiet but for the hens' crooning and the pig's bubble, each drawn as it sounds.
    walk.play(20)
    for (const sound of ['croon', 'bubble'] as SoundId[]) expect(walk.heard.has(sound), sound).toBe(true)
    // And the cat on the roof stretches when the hatch under it, or the cat, is touched.
    walk.touch(centreOf(HENHOUSE.hatch))
    walk.play(2)
    walk.touch(ROOFTOP)
    walk.play(2)
    expect(walk.misses).toEqual([])
  })

  it('has the cat look out when it mews', () => {
    const walk = new Walk(new Farm(open(), 1), 'the hatch')
    walk.play(0.5)
    walk.touch(centreOf(HENHOUSE.hatch))
    walk.play(3)
    expect(walk.heard.has('mew')).toBe(true)
    expect(walk.misses).toEqual([])
  })

  it('owes nothing more once a new use replaces an answer, or a touch ends a scene: the model says which channels to stop', () => {
    // A sneeze is 1.9 seconds into grain on the pony. A new use at one second takes the pony's channel.
    const farm = new Farm(open(), 1)
    for (let t = 0; t < 0.5; t += DT) farm.step(DT)
    farm.press(HOME.scoop.x, HOME.scoop.y); farm.tap()
    for (let t = 0; t < STAYS_UP_S + 0.1; t += DT) farm.step(DT)
    const pony = centreOf(BODY.pony)
    farm.press(pony.x, pony.y); farm.tap()
    farm.takeStops(); farm.takeSounds()
    for (let t = 0; t < 1; t += DT) farm.step(DT)
    farm.press(pony.x, pony.y); farm.tap()
    expect(farm.takeSounds()).toContain('scoop-pony')
    expect(channelOf('scoop-pony')).toEqual({ channel: 'pony', replace: true })
    // The hens that were sent for the first spill are sent again: their run and their pecks are stopped.
    expect(farm.takeStops()).toEqual(expect.arrayContaining(['flock', 'hen-white', 'hen-russet', 'hen-bantam']))
    // The night ends every answer, and a touch ends the night.
    for (let t = 0; t < DOOR_GUARD_S + 0.3; t += DT) farm.step(DT)
    farm.takeStops()
    const door = doorAt(farm)
    farm.press(door.x, door.y); farm.tap()
    expect(farm.takeStops()).toEqual(expect.arrayContaining([...ANIMALS, 'flock']))
    for (let t = 0; t < 3; t += DT) farm.step(DT)
    farm.takeStops()
    farm.press(660, 40)
    expect(farm.takeStops()).toContain('scene')
    expect(farm.playing).toBeNull()
  })

  it('gives every sound a maker for each of its notes, and puts every answer on its animal\'s channel', () => {
    for (const [sound, segments] of Object.entries(SEGMENTS)) {
      expect(segments.length, sound).toBeGreaterThan(0)
      for (const segment of segments) expect(segment.notes.length, `${sound} ${segment.who}`).toBeGreaterThan(0)
    }
    for (const id of Object.keys(CELLS) as AnswerId[]) expect(channelOf(id), id).toEqual({ channel: id.slice(id.indexOf('-') + 1), replace: true })
    for (const sound of ['door-open', 'hens-in', 'door-slide', 'door-clunk', 'crow', 'snore-pig', 'settled-goat', 'yawn-pony', 'beaks'] as SoundId[]) expect(channelOf(sound).channel, sound).toBe('scene')
    for (const sound of ['knock', 'lift-fork', 'lay', 'sun'] as SoundId[]) expect(channelOf(sound).channel, sound).toBeNull()
  })
})
