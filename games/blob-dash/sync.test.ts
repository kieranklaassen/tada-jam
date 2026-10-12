import { describe, expect, it } from 'vitest'
import { PLACES } from './beat'
import { bodyOf } from './body'
import { FRAME, fresh, piece } from './drive'
import { BLOB, PIECE, RING, rackPoint, slotOf, slotPoint } from './layout'
import { KINDS, type Piece } from './pieces'
import { makeRng } from './rng'
import type { Toy, ToyEvent } from './toy'

// Sight and sound on one clock. A sound is only ever played for an event, in
// the frame the event is raised. So the test holds every event to the motion
// it belongs to: in the step that raises it, that motion is at its very start.

/** What is wrong with an event raised in the step just played, or null when its motion starts in this step. */
function late(toy: Toy, event: ToyEvent): string | null {
  const zero = (age: number, what: string) => (age === 0 ? null : `${what} is ${age} s old`)
  const runner = (second: boolean) => toy.runners.find((r) => r.twin === second)
  switch (event.type) {
    case 'touch': return toy.fx.some((fx) => fx.kind === 'burst' && fx.age === 0) ? null : 'no burst at its start'
    case 'launch': {
      if (event.muffled) return zero(Math.min(...toy.runners.map((r) => r.bump)), 'the bump')
      return zero(Math.min(toy.fired[event.place], toy.fired[event.place + PLACES]), 'the spring')
    }
    case 'accent': return toy.blob.air?.accent ? null : 'no accented jump'
    case 'lay': return zero(Math.min(toy.laid[event.place], toy.laid[event.place + PLACES]), 'the spring laid')
    case 'land': {
      if (!toy.fx.some((fx) => fx.kind === 'dust' && fx.age === 0)) return 'no dust at its start'
      return zero(Math.min(toy.flashed[event.place], toy.flashed[event.place + PLACES]), 'the landing')
    }
    case 'step': {
      // The footfall: the runner is on that beat now.
      const r = runner(event.second)
      if (!r) return 'no such runner'
      const off = Math.abs(toy.at(r) - Math.round(toy.at(r)))
      return off < 0.2 ? null : `the foot is ${off} of a beat from its beat`
    }
    case 'meet': return zero(Math.min(toy.hits[slotOf(event.beat, false)].age, toy.hits[slotOf(event.beat, true)].age), 'the meeting')
    case 'after': {
      if (event.what === 'shlup' || event.what === 'mlp') return zero(toy.blob.fat, 'the fat blob')
      if (event.what === 'gulp') return zero(Math.min(...toy.runners.map((r) => r.dive)), 'the dive')
      if (event.what === 'plip') return runner(true) ? null : 'no twin to let go'
      if (event.what === 'spit') return zero(Math.min(...toy.runners.map((r) => r.spat)), 'the spit')
      if (event.what === 'bap') {
        // The harder throw's hit: the blob is on the far side and drawn flat there in this step, and the dust flies.
        const r = runner(event.second)
        if (!r) return 'no such runner'
        if (r.flight) return 'still thrown'
        if (!toy.fx.some((fx) => fx.kind === 'dust' && fx.age === 0)) return 'no dust'
        const body = bodyOf(toy, r)
        return body.face === 'flat' && body.tall < 0.6 ? null : `not drawn flat: ${body.face}, ${body.tall} tall`
      }
      // A squelch or a plink: a runner is on that wall, at the half.
      return toy.runners.some((r) => r.stuck && Math.abs(toy.at(r) - r.stuck.beat - 0.5) < 0.2) ? null : 'nobody is peeling'
    }
    case 'release': return event.act === 'grab' ? (toy.release.held ? null : 'not held') : toy.release.held ? 'still held' : null
    case 'pop': return toy.fallers.some((faller) => faller.age === 0) ? null : 'no spring starts to fall'
    case 'dial': return null
    case 'cast': return zero(event.act === 'poke' ? toy.cast[event.who].poke : event.act === 'coo' ? toy.cast.pigeon.coo : event.act === 'rattle' ? toy.cast.rat.rattle : toy.cast.cat.fur, `the ${event.who}'s ${event.act}`)
    case 'piece': {
      const rack = toy.rack[KINDS.indexOf(event.kind)]
      switch (event.act) {
        case 'lift': return toy.hand ? null : 'nothing in the hand'
        case 'set': case 'tap': return Math.min(rack, ...toy.set) === 0 ? null : 'nothing rocks'
        case 'pok': case 'flick': return toy.fx.some((fx) => fx.kind === 'home' && fx.age === 0 && fx.piece === event.kind) ? null : 'nothing starts for home'
        case 'bat': return toy.cast.cat.bat === 0 ? null : 'no paw'
        case 'stick': return toy.fx.some((fx) => fx.kind === 'slide' && fx.age === 0) ? null : 'nothing sticks'
        case 'clonk': case 'rest': return zero(rack, 'the rack')
        case 'hat': return toy.cast.pigeon.hat === event.kind ? null : 'no hat'
        case 'sniff': return zero(toy.cast.rat.sniff, 'the sniff')
      }
      return null
    }
    case 'lap': {
      const flight = toy.flying()
      if (event.act === 'perch') return zero(toy.cast.pigeon.pant, 'the pant')
      if (!flight) return 'the pigeon is on its perch'
      if (event.act === 'stare') return flight.stage === 'stare' && flight.t < 0.1 ? null : 'not at the start of its stare'
      if (event.act === 'takeoff') return flight.stage === 'fly' && flight.t < 0.02 ? null : 'not at its take-off'
      // A flap falls on a beat of the blob's.
      return Math.abs(toy.pos - Math.round(toy.pos)) < 0.1 ? null : 'not on a beat'
    }
  }
}

describe('one clock', () => {
  it('raises every event in the step in which its motion starts, through a visit that reaches everything', () => {
    const seen = new Set<string>()
    for (const seed of [1, 2, 3]) {
      const toy = fresh(140, [4, 9, 23, 40], [piece('drum', 1), piece('chime', 3), piece('flip', 5), piece('wall', 8, true), piece('splitter', 10, true), piece('tunnel', 11), piece('wall', 13), piece('tunnel', 15)], seed)
      const rng = makeRng(seed * 31)
      for (let i = 0; i < 60 * 90; i++) {
        const roll = rng.next()
        if (roll < 0.05) {
          const at = { x: rng.next() * 1180, y: rng.next() * 820 }
          toy.press(at)
          for (const event of toy.take()) {
            seen.add(event.type === 'piece' || event.type === 'cast' || event.type === 'release' || event.type === 'after' || event.type === 'lap' ? `${event.type} ${'act' in event ? event.act : event.what}` : event.type)
            expect(late(toy, event), JSON.stringify(event)).toBeNull()
          }
          const move = rng.next()
          if (move < 0.4) toy.tap()
          else {
            toy.drag(at, { x: rng.next() * 1180, y: rng.next() * 820 })
            toy.endDrag(move < 0.92)
          }
          for (const event of toy.take()) {
            seen.add(event.type === 'piece' || event.type === 'cast' || event.type === 'release' || event.type === 'after' || event.type === 'lap' ? `${event.type} ${'act' in event ? event.act : event.what}` : event.type)
            expect(late(toy, event), JSON.stringify(event)).toBeNull()
          }
        }
        if (i === 900) {
          // A piece set down on a beat that holds one: the old one pops out.
          toy.press(rackPoint(1))
          toy.take()
          toy.drag(rackPoint(1), slotPoint(1))
          toy.endDrag(true)
          for (const event of toy.take()) {
            seen.add(event.type === 'piece' ? `piece ${event.act}` : event.type)
            expect(late(toy, event), JSON.stringify(event)).toBeNull()
          }
        }
        toy.step(FRAME)
        for (const event of toy.take()) {
          seen.add(event.type === 'piece' || event.type === 'cast' || event.type === 'release' || event.type === 'after' || event.type === 'lap' ? `${event.type} ${'act' in event ? event.act : event.what}` : event.type)
          expect(late(toy, event), JSON.stringify(event)).toBeNull()
        }
      }
    }
    // The visit really did reach them.
    for (const kind of ['touch', 'launch', 'lay', 'land', 'step', 'meet', 'after squelch', 'after gulp', 'after shlup', 'release grab', 'release clack', 'pop', 'dial', 'cast poke', 'cast coo', 'cast rattle', 'cast fur', 'piece lift', 'piece set', 'piece tap', 'piece stick', 'piece clonk', 'piece pok']) expect([...seen], kind).toContain(kind)
  })

  it('holds the pigeon\'s lap to the beat of the loop', () => {
    const toy = fresh(120, Array.from({ length: 16 }, (_, beat) => beat * 2))
    let laps = 0
    for (let i = 0; i < 60 * 30; i++) {
      toy.step(FRAME)
      for (const event of toy.take()) {
        if (event.type === 'lap') laps++
        expect(late(toy, event), JSON.stringify(event)).toBeNull()
      }
    }
    expect(laps).toBeGreaterThan(7)
  })

  it('lands a thrown blob in one step: it is drawn in the air until then, and heard, dusted and flashed in the step it is drawn down', () => {
    const cases: [string, number[], Piece[]][] = [
      ['a scoop to the ceiling', [], [piece('flip', 3)]],
      ['a drop to the floor', [], [piece('flip', 1), piece('flip', 4, true)]],
      ['the harder throw of a flip landed on', [4], [piece('flip', 3)]],
      ['a scoop onto a drum', [], [piece('flip', 3), piece('drum', 4, true)]],
      ['a drop onto a chime', [], [piece('flip', 1), piece('flip', 4, true), piece('chime', 5)]],
      ['a harder throw beside a drum', [4], [piece('flip', 3), piece('drum', 4, true)]],
      ['twins', [], [piece('splitter', 1), piece('flip', 3)]],
    ]
    for (const [name, springs, pieces] of cases) {
      const toy = fresh(90, springs, pieces)
      let landings = 0, baps = 0
      for (let i = 0; i < 60 * 8; i++) {
        const thrown = toy.runners.filter((r) => r.flight).map((r) => r.twin)
        toy.step(FRAME)
        const events = toy.take()
        for (const event of events) {
          expect(late(toy, event), `${name}: ${JSON.stringify(event)}`).toBeNull()
          if (event.type === 'after') baps += event.what === 'bap' ? 1 : 0
        }
        for (const r of toy.runners) {
          const body = bodyOf(toy, r)
          if (r.flight) {
            // Still thrown: in the air, round, and not yet on the far side.
            expect(body.face, name).toBe('air')
            expect(body.tall, name).toBe(1)
            continue
          }
          if (!thrown.includes(r.twin)) continue
          landings += 1
          const heard = events.some((event) => (event.type === 'land' || event.type === 'meet' || (event.type === 'after' && event.what === 'bap')) && event.second === r.twin)
          expect(heard, `${name}: heard`).toBe(true)
          expect(toy.fx.some((fx) => fx.kind === 'dust' && fx.age === 0), `${name}: dusted`).toBe(true)
          expect(toy.flashed.some((age) => age === 0), `${name}: flashed`).toBe(true)
          // Drawn down: its underside is on the line, or on what stands there.
          const radius = Math.hypot(body.x - RING.x, body.y - RING.y), lift = r.ceiling ? radius - RING.hub : RING.floor - radius
          expect(lift - (BLOB.size / 2) * body.tall, `${name}: down`).toBeLessThan(PIECE.height + 4)
          expect(lift - (BLOB.size / 2) * body.tall, `${name}: down`).toBeGreaterThan(-1)
        }
      }
      expect(landings, name).toBeGreaterThan(0)
      expect(baps > 0, name).toBe(springs.length > 0)
    }
  })

  it('plays what falls inside one long frame in the order of the loop, each at its own point', () => {
    const toy = fresh(120, [4], [piece('drum', 3), piece('wall', 5)])
    toy.step(3)
    const order = toy.take().map((event) => event.type === 'meet' ? `meet ${event.kind}` : event.type === 'step' ? `step ${event.beat}` : event.type)
    expect(order.filter((name) => name !== 'cast')).toEqual(['step 1', 'launch', 'meet drum', 'step 4', 'meet wall', 'after', 'step 6'])
  })
})
