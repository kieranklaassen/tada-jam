import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { ROSTER, vehicle } from './cycle'
import { CAPACITY, KIND } from './fx'
import { arrive } from './mud'
import { DRUM_STRAIN, LICK_FIRST, LICK_GAPS, Play, type Target } from './play'
import { LAYOUT, TOOL_HOME, TOOL_MIDDLE } from './props'
import { queueOf, queueSpot } from './queue'
import { TRACK } from './scenes'
import { patchCentre, silhouette } from './silhouette'
import { bucketTop } from './spots'
import { AT_DRUM, LIKED } from './tastes'
import * as voices from './voices'
import type { VoiceSpec } from './voices'
import { GRID_H, GRID_W, allShiny, cellAt, encode, tally, type Patch } from './surface'
import { deserializeWash, freshWash, serializeWash, washed, type WashState } from './washState'

const FRAME = 1 / 60

/** The middle of each tool as it hangs on the rack. */
const TOOL_AT = Object.fromEntries((['sponge', 'hose', 'cloth'] as const).map((tool) => [tool, [0, 1, 2].map((k) => TOOL_HOME[tool][k] + TOOL_MIDDLE[tool][k])])) as Record<'sponge' | 'hose' | 'cloth', number[]>

/** A press on a patch of the vehicle in the bay, at the patch's middle. */
function on(play: Play, col: number, row: number): Target {
  return { kind: 'truck', col, row, ...patchCentre(play.bay.def, col, row) }
}

function run(play: Play, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) play.step(FRAME)
}

/** A state whose bay vehicle is coated in one patch, with the first showing already seen. */
function coated(patch: Patch, position = LADDER[0]): WashState {
  const fresh = { ...freshWash(null), position, shown: ['drip' as const] }
  return washed(fresh, silhouette(vehicle(fresh.bay.who)).map((p) => (p === '.' ? '.' : patch)))
}

/** The first patch of body in the bay vehicle, from the middle outward. */
function bodyPatch(play: Play): [number, number] {
  for (let row = 2; row < GRID_H; row++) for (let col = 3; col < GRID_W; col++) if (play.bay.surface[cellAt(col, row)] !== '.') return [col, row]
  throw new Error('no body')
}

function reload(play: Play): Play {
  return new Play(deserializeWash(JSON.parse(JSON.stringify(serializeWash(play.state))), null), undefined, true)
}

describe('a touch is answered when the finger lands', () => {
  it('changes the patch, sounds and throws something in the very call of the press', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'sponge' })
    play.sounds.length = 0
    const [col, row] = bodyPatch(play)
    const before = play.bay.surface
    play.press(on(play, col, row))
    expect(play.bay.surface).not.toBe(before)
    expect(play.bay.surface[cellAt(col, row)]).toBe('b')
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.particles.count).toBeGreaterThan(0)
    expect(play.tool.working).toBe(true)
    expect(play.dirty).toBe(true)
  })

  it('answers every hand on every state: nothing is ever refused', () => {
    for (const patch of ['c', 's', 'm', 'b', 'f', 'w', 'd', 'p'] as const) for (const tool of ['finger', 'sponge', 'hose', 'cloth'] as const) {
      const play = new Play(coated(patch))
      if (tool !== 'finger') play.press({ kind: 'tool', tool })
      play.sounds.length = 0
      const [col, row] = bodyPatch(play)
      play.press(on(play, col, row))
      expect(play.sounds.length, `${tool} on ${patch}`).toBeGreaterThan(0)
    }
  })

  it('a tap on the bare floor or on nothing at all is answered too', () => {
    for (const tool of ['finger', 'sponge', 'hose', 'cloth'] as const) {
      const play = new Play(coated('d'))
      if (tool !== 'finger') play.press({ kind: 'tool', tool })
      play.sounds.length = 0
      play.press({ kind: 'floor', x: 1, z: 2 })
      expect(play.sounds.length, tool).toBeGreaterThan(0)
      expect(play.particles.count, tool).toBeGreaterThan(0)
      play.sounds.length = 0
      play.press({ kind: 'none' })
      expect(play.sounds.length, tool).toBeGreaterThan(0)
      // Nothing a save holds has changed.
      expect(play.dirty).toBe(false)
    }
  })

  it('random tapping always produces something and never breaks the save', () => {
    const play = new Play(freshWash(4))
    let seed = 12345
    const random = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
    const targets = (): Target => {
      const r = random()
      if (r < 0.12) return { kind: 'tool', tool: (['sponge', 'hose', 'cloth'] as const)[Math.floor(random() * 3)] }
      if (r < 0.17) return { kind: 'next' }
      if (r < 0.22) return { kind: 'puddle' }
      if (r < 0.24) return { kind: 'none' }
      if (r < 0.26) return { kind: 'queue', place: Math.floor(random() * 2) }
      if (r < 0.28) return { kind: 'bit', bit: (['roller', 'pinwheel', 'shelf', 'lamp'] as const)[Math.floor(random() * 4)] }
      if (r < 0.3) return { kind: 'floor', x: random() * 6 - 3, z: 1.5 + random() }
      return on(play, Math.floor(random() * GRID_W), Math.floor(random() * GRID_H))
    }
    for (let i = 0; i < 400; i++) {
      const target = targets()
      play.sounds.length = 0
      const onBody = target.kind === 'truck' && play.bay.surface[cellAt(target.col, target.row)] !== '.'
      play.press(target)
      if (onBody || target.kind === 'tool' || target.kind === 'puddle' || target.kind === 'next') run(play, 0.05)
      if (onBody) expect(play.sounds.length + play.particles.count, `tap ${i}`).toBeGreaterThan(0)
      play.release()
      run(play, 0.1 + random() * 0.4)
      expect(play.particles.count).toBeLessThanOrEqual(CAPACITY)
      expect(deserializeWash(JSON.parse(JSON.stringify(serializeWash(play.state))), null)).toEqual(play.state)
      // A scene's outcome is in the save from its start; what is seen catches up as its beats play.
      if (!play.sceneRunning) expect(encode(play.bay.surface), `after tap ${i}`).toBe(play.state.bay.cells)
      play.sounds.length = 0
      play.marks.length = 0
    }
  })
})

describe('tools', () => {
  it('a tap takes a tool, a tap on another swaps it, a tap on the one in hand hangs it up', () => {
    const play = new Play(coated('s'))
    expect(play.hand).toBe('finger')
    play.press({ kind: 'tool', tool: 'hose' })
    expect(play.hand).toBe('hose')
    play.press({ kind: 'tool', tool: 'cloth' })
    expect(play.hand).toBe('cloth')
    run(play, 2)
    play.press({ kind: 'tool', tool: 'cloth' })
    expect(play.hand).toBe('finger')
  })

  it('two quick taps on a tool are one taking: a small child who taps twice still holds it', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'sponge' })
    run(play, 0.3)
    play.sounds.length = 0
    play.press({ kind: 'tool', tool: 'sponge' })
    expect(play.hand).toBe('sponge')
    expect(play.sounds.length).toBeGreaterThan(0)
  })

  it('a rub lays the same dab along the finger\'s path, and what was done stays done when the finger lifts', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'sponge' })
    play.press(on(play, 3, 3))
    for (let col = 3; col <= 9; col += 0.5) {
      play.drag({ kind: 'truck', col: Math.floor(col), row: 3, ...patchCentre(play.bay.def, Math.floor(col), 3), x: play.bay.def.side.x0 + ((col + 0.5) / GRID_W) * (play.bay.def.side.x1 - play.bay.def.side.x0) }, 4)
      play.step(FRAME)
    }
    play.release()
    for (let col = 3; col <= 9; col++) if (silhouette(play.bay.def)[cellAt(col, 3)] !== '.') expect(play.bay.surface[cellAt(col, 3)]).toBe('b')
    expect(play.tool.working).toBe(false)
    expect(play.hand).toBe('sponge')
  })

  it('a cloth that goes back to the rack is clean: the mud on it is not kept', () => {
    const body = silhouette(vehicle(freshWash(null).bay.who))
    const row = 3, col = [...Array(GRID_W).keys()].find((c) => [0, 1, 2, 3, 4].every((d) => c + d < GRID_W && body[cellAt(c + d, row)] !== '.'))!
    const start = (): Play => {
      const surface = body.map((p) => (p === '.' ? '.' : 'd')) as Patch[]
      surface[cellAt(col, row)] = 's'
      const play = new Play(washed({ ...freshWash(null), shown: ['drip'] }, surface))
      play.press({ kind: 'tool', tool: 'cloth' })
      play.press(on(play, col, row))
      play.release()
      return play
    }
    // Straight on to the next patch, the muddy cloth smears it.
    const muddy = start()
    muddy.press(on(muddy, col + 1, row))
    expect(muddy.bay.surface[cellAt(col + 1, row)]).toBe('m')
    // Hung up and taken again, it shines the same patch.
    const hung = start()
    run(hung, 2)
    hung.press({ kind: 'tool', tool: 'cloth' })
    expect(hung.hand).toBe('finger')
    run(hung, 2)
    hung.press({ kind: 'tool', tool: 'cloth' })
    hung.press(on(hung, col + 3, row))
    expect(hung.bay.surface[cellAt(col + 3, row)]).toBe('p')
    // Swapped for another tool and taken again, the same.
    const swapped = start()
    swapped.press({ kind: 'tool', tool: 'hose' })
    swapped.press({ kind: 'tool', tool: 'cloth' })
    swapped.press(on(swapped, col + 3, row))
    expect(swapped.bay.surface[cellAt(col + 3, row)]).toBe('p')
    // And on load: the save holds no mud for the cloth.
    expect(JSON.stringify(serializeWash(start().state))).not.toContain('carried')
  })

  it('under the cloth a smear slides and stays: the touch is answered and nothing spreads', () => {
    const play = new Play(coated('m'))
    play.press({ kind: 'tool', tool: 'cloth' })
    play.sounds.length = 0
    const before = play.bay.surface
    const [col, row] = bodyPatch(play)
    play.press(on(play, col, row))
    play.drag(on(play, col + 1, row), 3)
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.bay.surface).toBe(before)
  })

  it('a held hose keeps spraying, and a rub that slides off the vehicle lets the body go', () => {
    const play = new Play(coated('d'))
    play.press({ kind: 'tool', tool: 'hose' })
    const [col, row] = bodyPatch(play)
    play.press(on(play, col, row))
    play.sounds.length = 0
    run(play, 1)
    expect(play.sounds.length).toBeGreaterThanOrEqual(3)
    play.drag({ kind: 'none' }, 0)
    expect(play.tool.working).toBe(false)
  })
})

describe('the tap', () => {
  it('is not a tool: touched, it swings on its arm with a clink, gives no water, and comes to rest', () => {
    for (const tool of ['finger', 'sponge', 'hose', 'cloth'] as const) {
      const play = new Play(coated('d'))
      if (tool !== 'finger') play.press({ kind: 'tool', tool })
      run(play, 0.2)
      play.sounds.length = 0
      play.marks.length = 0
      const drops = play.particles.count
      play.dirty = false
      play.press({ kind: 'tap' })
      expect(play.sounds.length, tool).toBe(1)
      // The tool in hand is still in hand, no drop has been let go, and nothing a save holds has changed.
      expect(play.hand).toBe(tool)
      expect(play.particles.count).toBe(drops)
      expect(play.dirty).toBe(false)
      let most = 0
      for (let i = 0; i < 30; i++) { play.step(FRAME); most = Math.max(most, Math.abs(play.tapAngle)) }
      expect(most).toBeGreaterThan(0.1)
      expect(most).toBeLessThan(0.9)
      run(play, 8)
      expect(play.tapAngle).toBe(0)
      expect(play.marks.filter((mark) => Math.abs(mark.x - LAYOUT.tap.x) < 0.3)).toHaveLength(0)
    }
  })

  it('tapped again and again it only swings: it never swings round its arm', () => {
    const play = new Play(coated('d'))
    let most = 0
    for (let i = 0; i < 300; i++) {
      if (i % 6 === 0) play.press({ kind: 'tap' })
      play.step(FRAME)
      most = Math.max(most, Math.abs(play.tapAngle))
    }
    expect(most).toBeLessThanOrEqual(0.6)
  })
})

describe('the send-off and the roll-in', () => {
  it('saves its outcome at once, before a single beat has played', () => {
    const play = new Play(coated('p'))
    const waiting = play.next.def.id, before = play.state
    play.press({ kind: 'next' })
    expect(play.urgent).toBe(true)
    expect(play.state.bay.who).toBe(waiting)
    expect(play.state.position).toBe(LADDER[1])
    // Every field the scene changes is in the save from its start: the position as the judged wash moved it, the
    // newcomer with its cells and what it came with, the next one at the door with no trips through the puddle, and the seed.
    expect(play.state.bay.cells).toBe(before.next.cells)
    expect(play.state.bay.came).toBe(tally(play.bay.surface).mud)
    expect(play.state.next.who).not.toBe(waiting)
    expect(play.state.next.dips).toBe(0)
    expect(play.state.seed).not.toBe(before.seed)
    expect(play.sceneRunning).toBe(true)
    // Put away now and opened again: the newcomer is in the bay and nothing replays.
    const again = reload(play)
    expect(again.bay.def.id).toBe(waiting)
    expect(again.sceneRunning).toBe(false)
    expect(again.bay.motion.homeX).toBe(LAYOUT.bay.x)
    expect(again.leaving).toBeNull()
  })

  it('plays for about six seconds and leaves the newcomer in the bay and another at the door', () => {
    const play = new Play(coated('d'))
    const left = play.bay
    play.press({ kind: 'next' })
    run(play, 3.5)
    expect(play.leaving).toBeNull()
    expect(left.motion.homeX).toBeLessThan(-10)
    expect(play.sceneRunning).toBe(true)
    run(play, 3)
    expect(play.sceneRunning).toBe(false)
    expect(play.bay.motion.homeX).toBeCloseTo(LAYOUT.bay.x)
    expect(play.next.motion.homeX).toBeCloseTo(LAYOUT.door.x)
    expect(play.next.def.id).not.toBe(play.bay.def.id)
  })

  it('gives way to any touch: every beat lands at its end and the touch is answered', () => {
    const play = new Play(coated('d'))
    play.press({ kind: 'next' })
    run(play, 1.5)
    play.sounds.length = 0
    play.press(on(play, ...bodyPatch(play)))
    expect(play.sceneRunning).toBe(false)
    expect(play.leaving).toBeNull()
    expect(play.bay.motion.homeX).toBeCloseTo(LAYOUT.bay.x)
    expect(play.next.motion.homeX).toBeCloseTo(LAYOUT.door.x)
    expect(play.sounds.length).toBeGreaterThan(0)
  })

  it('nothing new starts by itself: a washed vehicle stays as long as the child likes', () => {
    const play = new Play(coated('p'))
    const who = play.bay.def.id
    run(play, 120)
    expect(play.bay.def.id).toBe(who)
    expect(play.sceneRunning).toBe(false)
    expect(play.dirty).toBe(false)
  })

  it('a vehicle sent off half washed leaves as it is and the game goes on', () => {
    const play = new Play(coated('c', LADDER[1]))
    play.press({ kind: 'next' })
    expect(play.state.position).toBe(LADDER[0])
    run(play, 7)
    expect(play.sceneRunning).toBe(false)
    expect(tally(play.bay.surface).mud).toBeGreaterThan(0)
  })
})

describe('the queue in the yard and the pieces of the place', () => {
  const stage = (play: Play): string[] => play.onStage.map((who) => who.def.id)

  it('shows the two that are neither in the bay nor at the door, each once, on the hill and turned toward the bay', () => {
    const play = new Play(coated('s'))
    expect(play.queue.map((who) => who.def.id)).toEqual(queueOf(play.state.bay.who, play.state.next.who))
    expect(new Set(stage(play)).size).toBe(4)
    play.queue.forEach((who, place) => {
      const spot = queueSpot(place)
      run(play, 0.1)
      expect(who.motion.pose.x).toBeCloseTo(spot.x, 1)
      expect(who.motion.pose.z).toBe(spot.z)
      expect(who.motion.pose.turn).toBe(spot.turn)
      expect(who.motion.pose.hop).toBe(spot.ground)
      expect(spot.ground).toBeGreaterThan(LAYOUT.hill.h)
      expect(tally(who.surface).mud).toBeGreaterThan(0)
    })
    // The one in the bay and the one at the door stand on the floor, nose ahead.
    for (const who of [play.bay, play.next]) expect([who.motion.pose.turn, who.motion.ground]).toEqual([0, 0])
  })

  it('a touch on one that waits makes it toot and jump, and changes nothing a save holds', () => {
    const play = new Play(coated('s'))
    for (const place of [0, 1]) {
      const before = JSON.stringify(serializeWash(play.state)), surface = play.queue[place].surface
      play.sounds.length = 0
      play.press({ kind: 'queue', place })
      expect(play.sounds.length).toBeGreaterThan(0)
      // Wheels and all leave the hill and come back down onto it, and the thump is heard as it lands, not before.
      const ground = queueSpot(place).ground
      let highest = 0, landedAt = -1, thumpAt = -1
      const thump = JSON.stringify(voices.place.thump())
      for (let i = 0; i < 40; i++) {
        play.sounds.length = 0
        play.step(FRAME)
        const up = play.queue[place].motion.pose.hop - ground
        highest = Math.max(highest, up)
        if (highest > 0.1 && up === 0 && landedAt < 0) landedAt = i
        if (play.sounds.some((sound) => JSON.stringify(sound.spec) === thump) && thumpAt < 0) thumpAt = i
      }
      expect(highest).toBeGreaterThan(0.18)
      expect(landedAt).toBeGreaterThan(10)
      expect(Math.abs(thumpAt - landedAt)).toBeLessThanOrEqual(2)
      expect(play.dirty).toBe(false)
      expect(JSON.stringify(serializeWash(play.state))).toBe(before)
      expect(play.queue[place].surface).toBe(surface)
      expect(play.hand).toBe('finger')
    }
  })

  it('a touch on the roller, the pinwheel, the shelf or the lamp is answered with its own sound and its own move, and changes nothing a save holds', () => {
    const play = new Play(coated('s'))
    const before = JSON.stringify(serializeWash(play.state)), surface = encode(play.bay.surface)
    const heard: string[] = []
    for (const bit of ['roller', 'pinwheel', 'shelf', 'lamp'] as const) {
      const was = play.bits[bit]
      play.sounds.length = 0
      play.press({ kind: 'bit', bit })
      expect(play.sounds).toHaveLength(1)
      heard.push(JSON.stringify(play.sounds[0].spec))
      run(play, 0.12)
      expect(play.bits[bit]).toBeGreaterThan(was + 0.05)
    }
    expect(new Set(heard).size).toBe(4)
    expect(play.dirty).toBe(false)
    expect(JSON.stringify(serializeWash(play.state))).toBe(before)
    expect(encode(play.bay.surface)).toBe(surface)
  })

  it('at a send-off the head of the queue comes to the door, the other takes its place, and the one that left joins at the back', () => {
    const play = new Play(coated('s'))
    const [head, other] = play.queue.map((who) => who.def.id), left = play.bay.def.id
    play.press({ kind: 'next' })
    // From the first frame: nobody is drawn twice, and the one that leaves is still wearing what it left in.
    expect(new Set(stage(play)).size).toBe(stage(play).length)
    expect(play.onStage.find((who) => who.def.id === left)).toBe(play.leaving)
    for (let i = 0; i < 60 * 9; i++) {
      play.step(FRAME)
      expect(new Set(stage(play)).size).toBe(stage(play).length)
    }
    expect(play.sceneRunning).toBe(false)
    expect(play.next.def.id).toBe(head)
    expect(play.queue.map((who) => who.def.id)).toEqual([other, left])
    expect(encode(play.next.surface)).toBe(play.state.next.cells)
    expect([play.next.motion.pose.turn, play.next.motion.pose.hop, play.next.motion.homeX, play.next.motion.homeZ]).toEqual([0, 0, LAYOUT.door.x, LAYOUT.door.z])
    play.queue.forEach((who, place) => {
      const spot = queueSpot(place)
      expect([who.motion.homeX, who.motion.homeZ, who.motion.turn, who.motion.ground, who.motion.hop]).toEqual([spot.x, spot.z, spot.turn, spot.ground, 0])
      expect(tally(who.surface).mud).toBeGreaterThan(0)
    })
  })

  it('a touch in the middle of a send-off leaves every vehicle where the scene was taking it', () => {
    for (const at of [0.1, 1.0, 2.4, 3.3, 5.0]) {
      const play = new Play(coated('s'))
      const [head, other] = play.queue.map((who) => who.def.id), left = play.bay.def.id
      play.press({ kind: 'next' })
      run(play, at)
      play.press({ kind: 'none' })
      play.step(FRAME)
      expect(play.sceneRunning).toBe(false)
      expect(play.next.def.id).toBe(head)
      expect([play.next.motion.turn, play.next.motion.ground, play.next.motion.homeX, play.next.motion.homeZ]).toEqual([0, 0, LAYOUT.door.x, LAYOUT.door.z])
      expect(encode(play.next.surface)).toBe(play.state.next.cells)
      expect(play.queue.map((who) => who.def.id)).toEqual([other, left])
      play.queue.forEach((who, place) => {
        const spot = queueSpot(place)
        expect([who.motion.homeX, who.motion.homeZ, who.motion.turn, who.motion.ground, who.motion.hop]).toEqual([spot.x, spot.z, spot.turn, spot.ground, 0])
      })
      expect(play.leaving).toBe(null)
      // And a reload shows the same four in the same places.
      const again = reload(play)
      expect(again.onStage.map((who) => who.def.id).sort()).toEqual(play.onStage.map((who) => who.def.id).sort())
      expect(again.queue.map((who) => who.def.id)).toEqual(play.queue.map((who) => who.def.id))
    }
  })
})

describe('what the grid promises to the eye', () => {
  const kinds = (play: Play): number[] => Array.from(play.particles.kind.slice(0, play.particles.count))
  const mixerIn = (patch: Patch): Play => {
    const def = vehicle('mixer'), fresh = { ...freshWash(null), shown: ['drip' as const] }
    return new Play({ ...fresh, bay: { who: 'mixer', cells: encode(silhouette(def).map((p) => (p === '.' ? '.' : patch))), came: 0 }, next: { who: 'tipper', cells: encode(silhouette(vehicle('tipper'))), dips: 0 } })
  }

  it('a bare finger leaves a crack on dried mud and a dent in soft mud, each where it landed and each gone again', () => {
    for (const [patch, kind] of [['c', KIND.crack], ['s', KIND.dent]] as const) {
      const play = new Play(coated(patch))
      const [col, row] = bodyPatch(play)
      play.press(on(play, col, row))
      const i = kinds(play).indexOf(kind)
      expect(i, `a mark on ${patch}`).toBeGreaterThanOrEqual(0)
      const at = [play.particles.x[i], play.particles.y[i]]
      play.release()
      run(play, 0.5)
      const j = kinds(play).indexOf(kind)
      expect([play.particles.x[j], play.particles.y[j]]).toEqual(at)
      run(play, 2)
      expect(kinds(play)).not.toContain(kind)
      // The mud is as it was: a poke changes nothing a save holds.
      expect(encode(play.bay.surface)).toBe(play.state.bay.cells)
      expect(tally(play.bay.surface).mud).toBe(tally(play.bay.surface).body)
    }
  })

  it('the cloth wears a beard of foam while it pushes foam, mud while it carries mud, and nothing on the rack', () => {
    const foam = new Play(coated('f'))
    expect(foam.clothWears).toBe(null)
    foam.press({ kind: 'tool', tool: 'cloth' })
    expect(foam.clothWears).toBe(null)
    const [col, row] = bodyPatch(foam)
    foam.press(on(foam, col, row))
    expect(foam.clothWears).toBe('foam')
    foam.release()
    run(foam, 1.5)
    foam.press({ kind: 'tool', tool: 'cloth' })
    expect(foam.clothWears).toBe(null)
    const mud = new Play(coated('s'))
    mud.press({ kind: 'tool', tool: 'cloth' })
    mud.press(on(mud, col, row))
    expect(mud.clothWears).toBe('mud')
  })

  it('the sponge piles foam up where it goes over foam or lays it on dry paint, and not on wet paint', () => {
    for (const [patch, swells] of [['f', true], ['b', true], ['d', true], ['w', false], ['s', false]] as const) {
      const play = new Play(coated(patch))
      play.press({ kind: 'tool', tool: 'sponge' })
      const [col, row] = bodyPatch(play)
      play.press(on(play, col, row))
      expect(play.swells.length > 0, `on ${patch}`).toBe(swells)
      if (swells) expect(play.swells[0]).toBe(cellAt(col, row))
    }
  })

  it('the mixer rocks its drum a little way round and back while it is left alone and not under a finger; jammed by dried mud it strains a hair each way and cannot turn', () => {
    const play = mixerIn('d')
    let low = Infinity, high = -Infinity
    for (let i = 0; i < 60 * 8; i++) {
      play.step(FRAME)
      if (i > 120) { low = Math.min(low, play.bay.motion.pose.part); high = Math.max(high, play.bay.motion.pose.part) }
    }
    expect(high).toBeGreaterThan(0.12)
    expect(low).toBeLessThan(-0.12)
    expect(high - low).toBeLessThan(0.5)
    // Under a finger on its cab it holds still.
    play.press(on(play, 1, 2))
    run(play, 2)
    const held = play.bay.motion.pose.part
    run(play, 0.5)
    expect(Math.abs(play.bay.motion.pose.part - held)).toBeLessThan(0.02)
    // Jammed with dried mud, it keeps trying: the drum strains a hair each way, again and again, and cannot turn.
    const jammed = mixerIn('c')
    run(jammed, 2)
    let down = Infinity, up = -Infinity, tries = 0, was = 0
    for (let i = 0; i < 60 * 8; i++) {
      jammed.step(FRAME)
      const part = jammed.bay.motion.pose.part
      down = Math.min(down, part)
      up = Math.max(up, part)
      const side = part > DRUM_STRAIN * 0.6 ? 1 : part < -DRUM_STRAIN * 0.6 ? -1 : 0
      if (side !== 0 && side !== was) tries += 1
      if (side !== 0) was = side
    }
    // Both ways, each a hair, seen: most of the strain and never past it.
    expect(up).toBeGreaterThan(DRUM_STRAIN * 0.8)
    expect(down).toBeLessThan(-DRUM_STRAIN * 0.8)
    expect(Math.max(up, -down)).toBeLessThanOrEqual(DRUM_STRAIN + 1e-9)
    // It goes on trying, first one way and then the other, for as long as it is left: five tries or more in eight seconds.
    expect(tries).toBeGreaterThanOrEqual(5)
  })

  it('a vehicle sent off in soft mud leaves two brown tyre tracks, one sent off wet leaves two wet lines, and a shining one leaves none', () => {
    for (const [patch, kind] of [['s', KIND.splat], ['w', KIND.drop], ['p', null]] as const) {
      const play = new Play(coated(patch))
      const track = Math.max(...play.bay.def.wheels.map((wheel) => wheel.z))
      play.press({ kind: 'next' })
      const lines = new Map<number, number>()
      for (let i = 0; i < 60 * 4; i++) {
        play.step(FRAME)
        for (const mark of play.marks) if (mark.y === 0 && mark.size === TRACK) {
          expect(mark.kind).toBe(kind)
          // Each mark lies under the tyres of one side or the other.
          const side = Math.round((mark.z - play.leaving!.motion.homeZ) / track)
          expect(Math.abs(side)).toBe(1)
          lines.set(side, (lines.get(side) ?? 0) + 1)
        }
        play.marks.length = 0
      }
      if (kind === null) expect(lines.size).toBe(0)
      else {
        expect(lines.get(1)).toBeGreaterThan(20)
        expect(lines.get(1)).toBe(lines.get(-1))
      }
    }
  })
})

describe('what the reader of the sheet found', () => {
  it('a want goes with where a vehicle stands: after every send-off the two a wash can reach glance at the tools they like and the two on the hill at the wash', () => {
    const play = new Play(coated('s'))
    for (let wash = 0; wash < 5; wash++) {
      run(play, 0.2)
      for (const who of [play.bay, play.next]) {
        const liked = LIKED[who.def.id], want = who.motion.want!
        if (!liked) {
          expect(want).toBe(AT_DRUM)
          continue
        }
        // Its eyes turn toward where that tool hangs: from the near eye, the tool lies along the look.
        const eye = who.def.eyes[0]
        const from = [who.motion.homeX + eye.at[0], eye.at[1], who.motion.homeZ], tool = [TOOL_AT[liked][0], TOOL_AT[liked][1], TOOL_AT[liked][2]]
        const look = [-Math.cos(want.side) * Math.cos(want.up), Math.sin(want.up), Math.sin(want.side) * Math.cos(want.up)]
        const to = [tool[0] - from[0], tool[1] - from[1], tool[2] - from[2]], far = Math.hypot(to[0], to[1], to[2])
        expect((look[0] * to[0] + look[1] * to[1] + look[2] * to[2]) / far, `${who.def.id} at ${who.motion.homeX}`).toBeGreaterThan(0.999)
      }
      for (const who of play.queue) expect(who.motion.want!.side).toBeLessThan(0.2)
      play.press({ kind: 'next' })
      run(play, 9)
    }
  })

  it('a vehicle glances at the tool it likes where the tool is: on the rack, and in the child\'s hand when the child has taken it', () => {
    const play = new Play(coated('s'))
    expect(play.bay.def.id).toBe('tipper')
    run(play, 0.1)
    const onRack = { ...play.bay.motion.want! }
    play.press({ kind: 'tool', tool: 'sponge' })
    run(play, 0.1)
    const inHand = { ...play.bay.motion.want! }
    // The sponge waits above the cab now: the look goes up to it, away from the empty bucket.
    expect(inHand.up).toBeGreaterThan(onRack.up + 0.3)
    // Another tool in hand changes nothing for it.
    play.press({ kind: 'tool', tool: 'hose' })
    run(play, 0.1)
    expect(play.bay.motion.want).toEqual(onRack)
  })

  it('a like works every time: two taps a fifth of a second apart set it off twice', () => {
    const play = new Play(coated('d'))
    expect(play.bay.def.id).toBe('tipper')
    play.press({ kind: 'tool', tool: 'sponge' })
    const toot = JSON.stringify(voices.feel.foamToot(play.bay.def.horn.low))
    let heard = 0
    const [col, row] = bodyPatch(play)
    for (let tap = 0; tap < 4; tap++) {
      play.sounds.length = 0
      play.press(on(play, col, row))
      heard += play.sounds.filter((sound) => JSON.stringify(sound.spec) === toot).length
      play.release()
      run(play, 0.2)
    }
    expect(heard).toBe(4)
  })

  it('within one rub a like comes again only after a moment, so it does not pile up', () => {
    const play = new Play(coated('d'))
    play.press({ kind: 'tool', tool: 'sponge' })
    const toot = JSON.stringify(voices.feel.foamToot(play.bay.def.horn.low))
    let heard = 0
    play.sounds.length = 0
    play.press(on(play, 3, 3))
    for (let i = 0; i < 30; i++) {
      play.drag(on(play, 3 + (i % 6), 3), 6)
      play.step(FRAME)
    }
    heard = play.sounds.filter((sound) => JSON.stringify(sound.spec) === toot).length
    expect(heard).toBe(1)
  })

  it('foam thrown by the sneeze and mud from the puddle both stay, whichever lands first', () => {
    for (const gap of [0.1, 0.4, 0.9, 2]) {
      const fresh = { ...freshWash(null), shown: ['drip' as const] }
      const play = new Play(washed(fresh, silhouette(vehicle(fresh.bay.who)).map((p) => (p === '.' ? '.' : 'f'))))
      expect(play.bay.def.id).toBe('tipper')
      play.press({ kind: 'tool', tool: 'cloth' })
      const nose = play.bay.def.zones.nose
      play.press({ kind: 'truck', col: 0, row: 2, x: (nose.x0 + nose.x1) / 2, y: (nose.y0 + nose.y1) / 2 })
      play.release()
      run(play, gap)
      play.press({ kind: 'puddle' })
      run(play, 6)
      expect(play.sceneRunning).toBe(false)
      expect(encode(play.next.surface), `puddle ${gap} s after the sneeze`).toBe(play.state.next.cells)
      const t = tally(play.next.surface)
      expect(t.foam).toBeGreaterThan(0)
      expect(play.state.next.dips).toBe(1)
    }
  })

  it('a shining vehicle sent off has a glint run along it from nose to tail', () => {
    const play = new Play(coated('p'))
    const side = play.bay.def.side
    play.press({ kind: 'next' })
    const xs: number[] = []
    for (let i = 0; i < 60; i++) {
      play.step(FRAME)
      for (let k = 0; k < play.particles.count; k++) if (play.particles.kind[k] === KIND.glint && Math.abs(play.particles.z[k] - play.leaving!.motion.homeZ - 1.05) < 0.2 && play.particles.age[k] < FRAME * 1.5) xs.push(play.particles.x[k] - play.leaving!.motion.homeX)
    }
    expect(xs.length).toBeGreaterThanOrEqual(8)
    // In order, from the nose to the tail.
    expect(Math.min(...xs)).toBeLessThan(side.x0 + 0.8)
    expect(Math.max(...xs)).toBeGreaterThan(side.x1 - 0.8)
    for (let i = 1; i < 8; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1])
  })

  it('a finger that comes down straight after a rub is answered as a touch of its own, on the vehicle and off it', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'sponge' })
    play.press(on(play, 3, 3))
    play.drag(on(play, 6, 3), 4)
    play.release()
    run(play, 0.15)
    // The touch takes it for the same rub and reports only a move. On the vehicle it is a dab like any tap: heard, and the patch changes.
    play.sounds.length = 0
    expect(play.bay.surface[cellAt(9, 3)]).toBe('s')
    play.land(on(play, 9, 3))
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.bay.surface[cellAt(9, 3)]).toBe('b')
    play.release()
    play.sounds.length = 0
    // On the vehicle at the door it sends the one in the bay off; on a piece of the place it sets it going.
    play.land({ kind: 'bit', bit: 'pinwheel' })
    expect(play.sounds.length).toBeGreaterThan(0)
    play.land({ kind: 'next' })
    expect(play.sceneRunning).toBe(true)
    expect(play.leaving).not.toBe(null)
  })

  it('a second tap on the vehicle at the door straight after the first lets the send-off play on, and is answered', () => {
    const play = new Play(coated('s'))
    const left = play.bay.def.id
    play.press({ kind: 'next' })
    run(play, 0.4)
    play.sounds.length = 0
    const state = play.state
    play.press({ kind: 'next' })
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.sceneRunning).toBe(true)
    expect(play.leaving?.def.id).toBe(left)
    expect(play.state).toBe(state)
    expect(encode(play.bay.surface)).toBe(play.state.bay.cells)
    // By now the save has made the vehicle at the door the one in the bay, so the same tap can come as a touch on it, with a tool in hand: it too only toots.
    const sponged = new Play(coated('s'))
    sponged.press({ kind: 'tool', tool: 'sponge' })
    sponged.press({ kind: 'next' })
    run(sponged, 0.3)
    const cells = sponged.state.bay.cells
    sponged.sounds.length = 0
    sponged.press(on(sponged, ...bodyPatch(sponged)))
    expect(sponged.sounds.length).toBeGreaterThan(0)
    expect(sponged.sceneRunning).toBe(true)
    expect(sponged.state.bay.cells).toBe(cells)
    expect(sponged.bay.motion.homeX).toBeCloseTo(LAYOUT.door.x, 1)
    // Later, a tap there ends the scene and is a touch as any other.
    run(play, 1.5)
    play.press({ kind: 'next' })
    expect(play.state).not.toBe(state)
  })

  it('every clod that lands has its clack and every bubble its pop, one after another', () => {
    const isClack = (spec: voices.VoiceSpec): boolean => spec.length === 2 && spec[0].wave === 'triangle' && spec[0].length === 0.03
    const isPop = (spec: voices.VoiceSpec): boolean => spec.length === 1 && spec[0].wave === 'sine' && spec[0].length === 0.04
    const dried = new Play(coated('c'))
    dried.press({ kind: 'next' })
    let clods = 0, clacks = 0, most = 0
    for (let i = 0; i < 60 * 9; i++) {
      dried.step(FRAME)
      clods += dried.marks.filter((mark) => mark.kind === KIND.crumb).length
      clacks += dried.sounds.filter((sound) => isClack(sound.spec)).length
      most = Math.max(most, dried.sounds.length)
      dried.marks.length = 0
      dried.sounds.length = 0
    }
    expect(clods).toBeGreaterThan(15)
    expect(clacks).toBe(clods)
    expect(most).toBeLessThanOrEqual(6)
    const soft = new Play(coated('s'))
    soft.press({ kind: 'tool', tool: 'sponge' })
    soft.sounds.length = 0
    for (const col of [3, 5, 7]) soft.press(on(soft, col, 3))
    soft.release()
    let bubbles = 0
    for (let k = 0; k < soft.particles.count; k++) if (soft.particles.kind[k] === KIND.bubble) bubbles += 1
    let pops = 0
    for (let i = 0; i < 60 * 8; i++) {
      soft.step(FRAME)
      pops += soft.sounds.filter((sound) => isPop(sound.spec)).length
      soft.sounds.length = 0
    }
    expect(bubbles).toBeGreaterThan(10)
    expect(pops).toBe(bubbles)
  })

  it('no pop is heard long after its bubble has gone: a heap of foam going is a fizz, and then it is quiet', () => {
    const isPop = (spec: voices.VoiceSpec): boolean => spec.length === 1 && spec[0].wave === 'sine' && spec[0].length === 0.04
    const play = new Play(coated('f'))
    play.press({ kind: 'tool', tool: 'sponge' })
    // Two seconds of fast scrubbing over foam: seven bubbles a dab.
    for (let frame = 0; frame < 120; frame++) {
      const col = Math.abs(((frame / 3) % 22) - 11), target = on(play, Math.round(col), 2 + (frame % 3))
      if (frame === 0) play.press(target)
      else play.drag(target, 9)
      play.step(FRAME)
      play.sounds.length = 0
    }
    play.release()
    // When the last bubble has popped, the last pop is heard within a tenth of a second.
    let quietAfter = -1, lastBubble = -1
    for (let i = 0; i < 60 * 6; i++) {
      play.step(FRAME)
      if (Array.from(play.particles.kind.slice(0, play.particles.count)).includes(KIND.bubble)) lastBubble = i
      if (play.sounds.some((sound) => isPop(sound.spec))) quietAfter = i
      play.sounds.length = 0
    }
    expect(lastBubble).toBeGreaterThan(30)
    expect(quietAfter - lastBubble).toBeLessThanOrEqual(12)
  })

  it('the head of the queue takes one hop along the hill and then one leap off its far end and away, before it is taken round to the door', () => {
    const play = new Play(coated('s'))
    const head = play.queue[0], from = queueSpot(0)
    play.press({ kind: 'next' })
    let furthest = 0, highest = 0, landings = 0, wasUp = false
    for (let i = 0; i < Math.round(1.85 * 60); i++) {
      play.step(FRAME)
      furthest = Math.max(furthest, head.motion.homeX)
      highest = Math.max(highest, head.motion.ground + head.motion.hop)
      // It comes down once on the hill, a little way along, on the hill's own height; the next time it is down it is far out in the yard.
      const up = head.motion.hop > 0
      if (wasUp && !up) {
        landings += 1
        if (landings === 1) {
          expect(head.motion.homeX).toBeCloseTo(from.x + 2.3, 1)
          expect(head.motion.ground).toBe(from.ground)
        } else expect(head.motion.homeX).toBeGreaterThan(from.x + 10)
      }
      wasUp = up
      expect(head.motion.turn).toBe(from.turn)
    }
    expect(landings).toBe(2)
    expect(furthest).toBeGreaterThan(from.x + 10)
    expect(highest).toBeGreaterThan(from.ground + 1.2)
    expect(head.motion.ground).toBe(0)
  })

  it('the tipper toots for foam, not for the sponge: on dried mud, where no foam is laid, it does not', () => {
    const play = new Play(coated('c'))
    expect(play.bay.def.id).toBe('tipper')
    play.press({ kind: 'tool', tool: 'sponge' })
    const toot = JSON.stringify(voices.feel.foamToot(play.bay.def.horn.low))
    play.sounds.length = 0
    const [col, row] = bodyPatch(play)
    play.press(on(play, col, row))
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.sounds.some((sound) => JSON.stringify(sound.spec) === toot)).toBe(false)
  })

  it('the tipper toots for foam under any hand: a finger on it, the cloth pushing it, the hose taking it off; and for no hand where there is none', () => {
    const tooted = (patch: Patch, hand: 'finger' | 'hose' | 'cloth' | 'sponge'): boolean => {
      const play = new Play(coated(patch))
      if (hand !== 'finger') play.press({ kind: 'tool', tool: hand })
      const toot = JSON.stringify(voices.feel.foamToot(play.bay.def.horn.low))
      play.sounds.length = 0
      // On the bed, well away from the nose, where the cloth sets off the sneeze instead.
      play.press(on(play, 8, 3))
      return play.sounds.some((sound) => JSON.stringify(sound.spec) === toot)
    }
    for (const hand of ['finger', 'hose', 'cloth', 'sponge'] as const) for (const patch of ['f', 'b'] as const) expect(tooted(patch, hand), `${hand} on ${patch}`).toBe(true)
    for (const hand of ['finger', 'hose', 'cloth'] as const) for (const patch of ['c', 's', 'w', 'd', 'p'] as const) expect(tooted(patch, hand), `${hand} on ${patch}`).toBe(false)
    // The sponge leaves foam on everything but dried mud.
    for (const patch of ['s', 'w', 'd', 'p'] as const) expect(tooted(patch, 'sponge'), `sponge on ${patch}`).toBe(true)
    expect(tooted('c', 'sponge')).toBe(false)
  })

  it('the tipper toots when a dab leaves foam on any patch under it: a sponge on a dried patch with soft mud beside it', () => {
    const fresh = { ...freshWash(null), shown: ['drip' as const] }
    const cells: Patch[] = silhouette(vehicle(fresh.bay.who)).map((p) => (p === '.' ? '.' : 's'))
    cells[cellAt(8, 3)] = 'c'
    const play = new Play(washed(fresh, cells))
    play.press({ kind: 'tool', tool: 'sponge' })
    const toot = JSON.stringify(voices.feel.foamToot(play.bay.def.horn.low))
    play.sounds.length = 0
    play.press(on(play, 8, 3))
    // The dried patch under the finger took no foam; the soft mud beside it did.
    expect(play.bay.surface[cellAt(8, 3)]).toBe('c')
    expect(play.bay.surface[cellAt(9, 3)]).toBe('b')
    expect(play.sounds.some((sound) => JSON.stringify(sound.spec) === toot)).toBe(true)
  })

  it('what is on the mixer\'s drum is what spirals off it when it turns, whatever the hand', () => {
    const mixer = (patch: Patch): Play => {
      const def = vehicle('mixer'), fresh = { ...freshWash(null), shown: ['drip' as const] }
      return new Play({ ...fresh, bay: { who: 'mixer', cells: encode(silhouette(def).map((p) => (p === '.' ? '.' : patch))), came: 0 }, next: { who: 'tipper', cells: encode(silhouette(vehicle('tipper'))), dips: 0 } })
    }
    for (const [patch, kind] of [['f', KIND.blob], ['s', KIND.splat], ['w', KIND.drop], ['d', KIND.dust]] as const) {
      const play = mixer(patch)
      const zone = play.bay.def.zones.part
      // A bare finger on the drum: it changes nothing, so what flies is what was there.
      play.press({ kind: 'truck', col: 8, row: 4, x: (zone.x0 + zone.x1) / 2, y: (zone.y0 + zone.y1) / 2 })
      play.release()
      const flown = new Set<number>()
      for (let i = 0; i < 40; i++) {
        play.step(FRAME)
        for (let k = 0; k < play.particles.count; k++) if (Math.abs(play.particles.z[k] - 1.0) < 0.25 && play.particles.age[k] < FRAME * 1.5) flown.add(play.particles.kind[k])
      }
      expect(flown.has(kind), `a drum in ${patch}`).toBe(true)
    }
  })

  it('in the first showing a drop swells at the tap before it falls', () => {
    const play = new Play(freshWash(4))
    const seen: number[] = []
    for (let i = 0; i < 60 * 3; i++) {
      play.step(FRAME)
      const kinds = Array.from(play.particles.kind.slice(0, play.particles.count))
      seen.push(kinds.includes(KIND.bead) ? 1 : kinds.includes(KIND.drop) ? 2 : 0)
    }
    const bead = seen.indexOf(1), drop = seen.indexOf(2)
    expect(bead).toBeGreaterThan(0)
    expect(drop).toBeGreaterThan(bead + 20)
    // The bead is gone when the drop falls: it has become the drop.
    expect(seen.slice(drop)).not.toContain(1)
  })

  it('in the shine the mixer\'s drum turns once, exactly, and a touch that ends the scene leaves it turned once', () => {
    for (const cut of [null, 3.0]) {
      const def = vehicle('mixer'), fresh = { ...freshWash(null), shown: ['drip' as const] }
      const cells: Patch[] = silhouette(def).map((p) => (p === '.' ? '.' : 'p'))
      const last = cells.findIndex((p, i) => p !== '.' && i > 40)
      cells[last] = 'w'
      const play = new Play({ ...fresh, bay: { who: 'mixer', cells: encode(cells), came: 0 }, next: { who: 'tipper', cells: encode(silhouette(vehicle('tipper'))), dips: 0 } })
      play.press({ kind: 'tool', tool: 'cloth' })
      play.press(on(play, last % GRID_W, Math.floor(last / GRID_W)))
      expect(play.sceneRunning).toBe(true)
      run(play, cut ?? 7)
      if (cut !== null) play.press({ kind: 'none' })
      expect(play.sceneRunning).toBe(false)
      expect(play.bay.motion.turned).toBeCloseTo(Math.PI * 2, 9)
    }
  })

  it('a vehicle that brakes in the bay has its mud wobbled', () => {
    const play = new Play(coated('s'))
    const incoming = play.next.def.id
    play.press({ kind: 'next' })
    run(play, 4.3)
    expect(play.wobbles).toHaveLength(0)
    run(play, 0.3)
    expect(play.wobbles).toEqual([incoming])
  })

  it('the two on the hill look at the bay at a siren and at a cough, as at a sneeze', () => {
    for (const [who, tool, zone] of [['fire-engine', 'hose', 'nose'], ['tractor', 'hose', 'part']] as const) {
      const def = vehicle(who), fresh = { ...freshWash(null), shown: ['drip' as const] }
      const play = new Play({ ...fresh, bay: { who, cells: encode(silhouette(def).map((p) => (p === '.' ? '.' : 'd'))), came: 0 }, next: { who: 'mixer', cells: encode(silhouette(vehicle('mixer'))), dips: 0 } })
      play.press({ kind: 'tool', tool })
      run(play, 0.5)
      for (const waiting of play.queue) expect(waiting.motion.lookAt).toBe(null)
      const z = def.zones[zone], x = (z.x0 + z.x1) / 2, y = (z.y0 + z.y1) / 2
      const col = Math.min(GRID_W - 1, Math.max(0, Math.floor(((x - def.side.x0) / (def.side.x1 - def.side.x0)) * GRID_W))), row = Math.min(GRID_H - 1, Math.max(0, Math.floor(((y - def.side.y0) / (def.side.y1 - def.side.y0)) * GRID_H)))
      play.press({ kind: 'truck', col, row, x, y })
      play.release()
      run(play, 0.6)
      for (const waiting of play.queue) expect(waiting.motion.lookAt, who).not.toBe(null)
      run(play, 2)
      for (const waiting of play.queue) expect(waiting.motion.lookAt).toBe(null)
    }
  })

  it('the hose on the bare floor tells the floor where its jet landed, and no other hand does', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'floor', x: 1, z: 2.5 })
    expect(play.jets).toHaveLength(0)
    play.press({ kind: 'tool', tool: 'hose' })
    play.press({ kind: 'floor', x: 1, z: 2.5 })
    expect(play.jets).toEqual([{ x: 1, z: 2.5 }])
  })

  it('the jet is seen to land on the floor: the nozzle goes there, sprays on while the finger stays, follows a rub, and stops when the finger lifts', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'hose' })
    play.press({ kind: 'floor', x: 1, z: 2.5 })
    expect(play.tool.working).toBe(true)
    expect([play.tool.x, play.tool.z]).toEqual([1, 2.5])
    expect(play.tool.y).toBeLessThan(0.1)
    // Held still, it sprays again and again.
    play.jets.length = 0
    run(play, 1)
    expect(play.jets.length).toBeGreaterThanOrEqual(3)
    expect(play.jets.every((jet) => jet.x === 1 && jet.z === 2.5)).toBe(true)
    // Rubbed along the floor, the jet goes with the finger and pushes as it goes.
    play.jets.length = 0
    for (let i = 1; i <= 5; i++) { play.drag({ kind: 'floor', x: 1 + i * 0.4, z: 2.6 }, 0); play.step(FRAME) }
    expect(play.tool.x).toBeCloseTo(3, 5)
    expect(play.jets.length).toBeGreaterThanOrEqual(4)
    expect(play.jets[play.jets.length - 1].x).toBeGreaterThan(2.5)
    play.release()
    expect(play.tool.working).toBe(false)
    play.jets.length = 0
    run(play, 1)
    expect(play.jets).toHaveLength(0)
    // Behind the vehicle the nozzle cannot go: the floor is still wetted and answers, and no jet is drawn through the vehicle.
    play.sounds.length = 0
    play.press({ kind: 'floor', x: 0, z: -1.5 })
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.tool.working).toBe(false)
    // Nothing of this is in the save.
    expect(encode(play.bay.surface)).toBe(play.state.bay.cells)
    expect(play.dirty).toBe(false)
  })
})

describe('what the seventh reader found', () => {
  it('every vehicle is in its own place from the first frame, before any step: none stands inside another', () => {
    const play = new Play(coated('s'))
    const places = play.onStage.map((who) => `${who.motion.pose.x},${who.motion.pose.z}`)
    expect(new Set(places).size).toBe(4)
    expect([play.bay.motion.pose.x, play.bay.motion.pose.z]).toEqual([LAYOUT.bay.x, LAYOUT.bay.z])
    expect([play.next.motion.pose.x, play.next.motion.pose.z]).toEqual([LAYOUT.door.x, LAYOUT.door.z])
    play.queue.forEach((who, place) => {
      const spot = queueSpot(place)
      expect([who.motion.pose.x, who.motion.pose.z, who.motion.pose.turn, who.motion.pose.hop]).toEqual([spot.x, spot.z, spot.turn, spot.ground])
    })
    // And a step does not move them.
    play.step(FRAME)
    expect(play.next.motion.pose.x).toBeCloseTo(LAYOUT.door.x, 2)
  })

  it('two quick taps on the puddle are one trip through it, not two', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'puddle' })
    run(play, 0.3)
    play.sounds.length = 0
    play.press({ kind: 'puddle' })
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.sceneRunning).toBe(true)
    expect(play.state.next.dips).toBe(1)
    run(play, 4)
    expect(play.state.next.dips).toBe(1)
    expect(encode(play.next.surface)).toBe(play.state.next.cells)
    // A tap after that is the second trip.
    play.press({ kind: 'puddle' })
    expect(play.state.next.dips).toBe(2)
  })

  it('a vehicle that has only splashed in a full puddle still rolls on its wheels afterwards', () => {
    const play = new Play(coated('s'))
    for (let i = 0; i < 3; i++) {
      play.press({ kind: 'puddle' })
      run(play, 4)
    }
    expect(play.state.next.dips).toBe(2)
    expect(play.next.motion.hop).toBe(0)
    const rolled = play.next.motion.pose.wheelSpin
    play.press({ kind: 'next' })
    run(play, 5)
    // It has driven from the door into the bay: its wheels have turned many times.
    expect(Math.abs(play.bay.motion.pose.wheelSpin - rolled)).toBeGreaterThan(6)
  })

  it('in the shine the drum turns once and no more, even when the dab that set it off was on the drum and had set it spinning', () => {
    const def = vehicle('mixer'), fresh = { ...freshWash(null), shown: ['drip' as const] }
    const cells: Patch[] = silhouette(def).map((p) => (p === '.' ? '.' : 'p'))
    const zone = def.zones.part
    const col = Math.floor((((zone.x0 + zone.x1) / 2 - def.side.x0) / (def.side.x1 - def.side.x0)) * GRID_W), row = Math.floor((((zone.y0 + zone.y1) / 2 - def.side.y0) / (def.side.y1 - def.side.y0)) * GRID_H)
    cells[cellAt(col, row)] = 'w'
    const play = new Play({ ...fresh, bay: { who: 'mixer', cells: encode(cells), came: 0 }, next: { who: 'tipper', cells: encode(silhouette(vehicle('tipper'))), dips: 0 } })
    play.press({ kind: 'tool', tool: 'cloth' })
    play.press({ kind: 'truck', col, row, x: (zone.x0 + zone.x1) / 2, y: (zone.y0 + zone.y1) / 2 })
    play.release()
    expect(play.sceneRunning).toBe(true)
    // Up to the flourish the drum is still turning from the touch; from the flourish on it turns once and stands.
    run(play, 2.55)
    const before = play.bay.motion.pose.part
    run(play, 1.75)
    const after = play.bay.motion.pose.part
    expect(after - before).toBeGreaterThan(Math.PI * 2 - 0.25)
    expect(after - before).toBeLessThan(Math.PI * 2 + 0.02)
    run(play, 0.25)
    expect(Math.abs(play.bay.motion.pose.part - after)).toBeLessThan(0.01)
    expect(play.sceneRunning).toBe(true)
  })

  it('a rub that runs off the vehicle and over the rack takes no tool: only a finger that comes down on a tool takes it', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'sponge' })
    play.press(on(play, 1, 3))
    play.drag(on(play, 0, 3), 5)
    play.drag({ kind: 'none' }, 5)
    play.drag({ kind: 'tool', tool: 'hose' }, 5)
    play.drag({ kind: 'tool', tool: 'cloth' }, 5)
    play.release()
    expect(play.hand).toBe('sponge')
    play.press({ kind: 'tool', tool: 'hose' })
    expect(play.hand).toBe('hose')
  })

  it('the tractor coughs one ring of steam out of its pipe, and it rises', () => {
    const def = vehicle('tractor'), fresh = { ...freshWash(null), shown: ['drip' as const] }
    const play = new Play({ ...fresh, bay: { who: 'tractor', cells: encode(silhouette(def).map((p) => (p === '.' ? '.' : 'd'))), came: 0 }, next: { who: 'mixer', cells: encode(silhouette(vehicle('mixer'))), dips: 0 } })
    play.press({ kind: 'tool', tool: 'hose' })
    const z = def.zones.part, x = (z.x0 + z.x1) / 2, y = (z.y0 + z.y1) / 2
    play.press({ kind: 'truck', col: Math.floor(((x - def.side.x0) / (def.side.x1 - def.side.x0)) * GRID_W), row: Math.floor(((y - def.side.y0) / (def.side.y1 - def.side.y0)) * GRID_H), x, y })
    play.release()
    const heights: number[] = []
    for (let i = 0; i < 60; i++) {
      play.step(FRAME)
      const rings = Array.from({ length: play.particles.count }, (_, k) => k).filter((k) => play.particles.kind[k] === KIND.ring)
      expect(rings.length).toBeLessThanOrEqual(1)
      if (rings.length) heights.push(play.particles.y[rings[0]])
    }
    expect(heights.length).toBeGreaterThan(20)
    expect(heights[heights.length - 1]).toBeGreaterThan(heights[0] + 0.2)
  })

  it('foam thrown by the sneeze flies to the vehicle that waits and shows on it when it lands there, not before', () => {
    const fresh = { ...freshWash(null), shown: ['drip' as const] }
    const play = new Play(washed(fresh, silhouette(vehicle(fresh.bay.who)).map((p) => (p === '.' ? '.' : 'f'))))
    play.press({ kind: 'tool', tool: 'cloth' })
    const nose = play.bay.def.zones.nose
    play.press({ kind: 'truck', col: 0, row: 2, x: (nose.x0 + nose.x1) / 2, y: (nose.y0 + nose.y1) / 2 })
    play.release()
    const next = play.next, side = next.def.side
    const foamOn = (): number => tally(next.surface).foam
    expect(foamOn()).toBe(0)
    let lastSeen: { x: number; y: number; z: number }[] = [], shownAt = -1, goneAt = -1
    for (let i = 0; i < 120; i++) {
      play.step(FRAME)
      const blobs = Array.from({ length: play.particles.count }, (_, k) => k).filter((k) => play.particles.kind[k] === KIND.blob && play.particles.x[k] > 2.6)
      if (blobs.length) lastSeen = blobs.map((k) => ({ x: play.particles.x[k], y: play.particles.y[k], z: play.particles.z[k] }))
      else if (lastSeen.length && goneAt < 0) goneAt = i
      if (foamOn() > 0 && shownAt < 0) shownAt = i
    }
    // The last of the blobs were over the waiting vehicle, at the height of its body, when they ended.
    expect(lastSeen.length).toBeGreaterThan(0)
    for (const blob of lastSeen) {
      expect(blob.x).toBeGreaterThan(next.motion.homeX + side.x0 - 0.3)
      expect(blob.y).toBeGreaterThan(1.0)
      expect(blob.y).toBeLessThan(side.y1 + 0.3)
    }
    // And the foam showed on it as the last of them landed, within a few frames either way.
    expect(shownAt).toBeGreaterThan(60)
    expect(Math.abs(shownAt - goneAt)).toBeLessThanOrEqual(6)
  })

  it('after the shine the mixer rocks its drum again, whether the shine played out or a touch ended it', () => {
    for (const cut of [null, 1.0]) {
      const def = vehicle('mixer'), fresh = { ...freshWash(null), shown: ['drip' as const] }
      const cells: Patch[] = silhouette(def).map((p) => (p === '.' ? '.' : 'p'))
      const last = cells.findIndex((p, i) => p !== '.' && i > 40)
      cells[last] = 'w'
      const play = new Play({ ...fresh, bay: { who: 'mixer', cells: encode(cells), came: 0 }, next: { who: 'tipper', cells: encode(silhouette(vehicle('tipper'))), dips: 0 } })
      play.press({ kind: 'tool', tool: 'cloth' })
      play.press(on(play, last % GRID_W, Math.floor(last / GRID_W)))
      play.release()
      run(play, cut ?? 6)
      if (cut !== null) { play.press({ kind: 'none' }); play.release() }
      expect(play.sceneRunning).toBe(false)
      run(play, 3)
      let low = Infinity, high = -Infinity
      for (let i = 0; i < 60 * 5; i++) {
        play.step(FRAME)
        low = Math.min(low, play.bay.motion.pose.part)
        high = Math.max(high, play.bay.motion.pose.part)
      }
      expect(high - low, `cut ${cut}`).toBeGreaterThan(0.25)
    }
  })

  it('under the cloth a smear and soft mud slide a little: their patch is handed to the view, and nothing in the save moves', () => {
    for (const patch of ['m', 's'] as const) {
      const play = new Play(coated(patch))
      play.press({ kind: 'tool', tool: 'cloth' })
      const [col, row] = bodyPatch(play)
      const before = play.state.bay.cells
      play.press(on(play, col, row))
      expect(play.swells).toContain(cellAt(col, row))
      if (patch === 'm') expect(play.state.bay.cells).toBe(before)
    }
  })

  it('a send-off ended by a touch is not heard afterwards: what its later beats would have sounded and thrown is left out', () => {
    for (const patch of ['c', 's', 'p'] as const) {
      const play = new Play(coated(patch))
      play.press({ kind: 'next' })
      run(play, 0.2)
      play.sounds.length = 0
      const flying = play.particles.count
      play.press({ kind: 'none' })
      // The touch's own knock, and nothing of the scene: no horn, no rev, no clods from a vehicle that is already gone.
      expect(play.sounds).toHaveLength(1)
      expect(play.particles.count).toBe(flying)
      expect(play.sceneRunning).toBe(false)
      expect(play.leaving).toBe(null)
      // The floor still has the trail the scene was laying: that is seen.
      if (patch === 's') expect(play.marks.some((mark) => mark.strength !== undefined)).toBe(true)
    }
  })

  it('a rub on the drum while the shine is turning it adds no turn of its own: the drum still turns once', () => {
    const def = vehicle('mixer'), fresh = { ...freshWash(null), shown: ['drip' as const] }
    const cells: Patch[] = silhouette(def).map((p) => (p === '.' ? '.' : 'p'))
    const zone = def.zones.part, x = (zone.x0 + zone.x1) / 2, y = (zone.y0 + zone.y1) / 2
    const col = Math.floor(((x - def.side.x0) / (def.side.x1 - def.side.x0)) * GRID_W), row = Math.floor(((y - def.side.y0) / (def.side.y1 - def.side.y0)) * GRID_H)
    cells[cellAt(col, row)] = 'w'
    const play = new Play({ ...fresh, bay: { who: 'mixer', cells: encode(cells), came: 0 }, next: { who: 'tipper', cells: encode(silhouette(vehicle('tipper'))), dips: 0 } })
    play.press({ kind: 'tool', tool: 'cloth' })
    play.press({ kind: 'truck', col, row, x, y })
    expect(play.sceneRunning).toBe(true)
    // The finger stays on the drum and keeps rubbing, right through the scene's own turn.
    let at = 0
    const rub = (seconds: number): void => {
      for (let i = 0; i < Math.round(seconds * 60); i++) {
        at += 1
        play.drag({ kind: 'truck', col, row, x: x + Math.sin(at / 5) * 0.5, y }, 4)
        play.step(FRAME)
      }
    }
    rub(2.55)
    const before = play.bay.motion.pose.part
    rub(1.75)
    const after = play.bay.motion.pose.part
    expect(after - before).toBeGreaterThan(Math.PI * 2 - 0.25)
    expect(after - before).toBeLessThan(Math.PI * 2 + 0.02)
    rub(0.2)
    expect(Math.abs(play.bay.motion.pose.part - after)).toBeLessThan(0.01)
    expect(play.sceneRunning).toBe(true)
  })

  it('a tap on the bare wall is seen as well as heard: a puff where the finger was', () => {
    const play = new Play(coated('s'))
    play.sounds.length = 0
    play.press({ kind: 'none', at: [-1, 2.4, -2.65] })
    expect(play.sounds).toHaveLength(1)
    expect(play.particles.count).toBeGreaterThan(0)
    expect(play.particles.z[0]).toBeCloseTo(-2.65, 1)
  })

  it('the dab on the drum that makes the mixer shine gives the drum no spin: from that dab to the end of the shine it turns once', () => {
    const def = vehicle('mixer'), fresh = { ...freshWash(null), shown: ['drip' as const] }
    const cells: Patch[] = silhouette(def).map((p) => (p === '.' ? '.' : 'p'))
    const zone = def.zones.part, x = (zone.x0 + zone.x1) / 2, y = (zone.y0 + zone.y1) / 2
    const col = Math.floor(((x - def.side.x0) / (def.side.x1 - def.side.x0)) * GRID_W), row = Math.floor(((y - def.side.y0) / (def.side.y1 - def.side.y0)) * GRID_H)
    cells[cellAt(col, row)] = 'w'
    const play = new Play({ ...fresh, bay: { who: 'mixer', cells: encode(cells), came: 0 }, next: { who: 'tipper', cells: encode(silhouette(vehicle('tipper'))), dips: 0 } })
    play.press({ kind: 'tool', tool: 'cloth' })
    // A touch on the drum a second before sets it spinning, as its like does.
    play.press({ kind: 'truck', col: col + 2, row, x: x + (2 * (def.side.x1 - def.side.x0)) / GRID_W, y })
    play.release()
    run(play, 1)
    expect(play.sceneRunning).toBe(false)
    expect(Math.abs(play.bay.motion.pose.part)).toBeGreaterThan(1)
    play.press({ kind: 'truck', col, row, x, y })
    play.release()
    expect(play.sceneRunning).toBe(true)
    play.step(FRAME)
    const before = play.bay.motion.pose.part
    // Up to the flourish the drum stands; in it, it turns once; after it, it stands.
    run(play, 2.4)
    expect(Math.abs(play.bay.motion.pose.part - before)).toBeLessThan(0.02)
    run(play, 2.0)
    expect(play.sceneRunning).toBe(true)
    expect(play.bay.motion.pose.part - before).toBeGreaterThan(Math.PI * 2 - 0.02)
    expect(play.bay.motion.pose.part - before).toBeLessThan(Math.PI * 2 + 0.02)
  })

  it('a vehicle that brakes at the door, and one that brakes coming out of the puddle, have their mud wobbled too', () => {
    const play = new Play(coated('s'))
    const head = play.queue[0].def.id
    play.press({ kind: 'next' })
    run(play, 5.9)
    play.wobbles.length = 0
    run(play, 0.3)
    expect(play.wobbles).toContain(head)
    run(play, 3)
    play.wobbles.length = 0
    play.press({ kind: 'puddle' })
    run(play, 4)
    expect(play.wobbles).toContain(play.next.def.id)
  })

  it('the one that hops along the hill into the head\'s place thumps at both of its landings', () => {
    const play = new Play(coated('s'))
    const thump = JSON.stringify(voices.place.thump())
    play.press({ kind: 'next' })
    const heard: number[] = []
    for (let i = 0; i < Math.round(3.2 * 60); i++) {
      play.sounds.length = 0
      play.step(FRAME)
      if (play.sounds.some((sound) => JSON.stringify(sound.spec) === thump)) heard.push(i / 60)
    }
    // The head's one landing on the hill, then the mover's two.
    expect(heard).toHaveLength(3)
    expect(heard[1]).toBeGreaterThan(2.3)
    expect(heard[2] - heard[1]).toBeGreaterThan(0.3)
  })

  it('a finger held down through a send-off, hose in hand, does not get to the dried patch before the showing: its first move starts the showing', () => {
    const base = freshWash(null)
    const who = base.next.who, def = vehicle(who)
    const cells = arrive(silhouette(def), LADDER[1], 31)
    const play = new Play({ ...base, position: LADDER[1], next: { who, cells: encode(cells), dips: 0 } })
    play.press({ kind: 'tool', tool: 'hose' })
    play.press({ kind: 'next' })
    // The finger stays down. The scene plays out; the frame it ends in, before the game's own step, the finger moves onto the nose.
    for (let i = 0; i < 60 * 12 && play.sceneRunning; i++) play.step(FRAME)
    expect(play.sceneRunning).toBe(false)
    expect(play.state.shown).toEqual([])
    const patch = play.bay.surface.findIndex((p, i) => p === 'c' && i % GRID_W === 2)
    const centre = patchCentre(play.bay.def, patch % GRID_W, Math.floor(patch / GRID_W))
    play.drag({ kind: 'truck', col: patch % GRID_W, row: Math.floor(patch / GRID_W), ...centre }, 2)
    expect(play.sceneRunning).toBe(true)
    expect(play.state.shown).toEqual(['drip'])
    expect(play.bay.surface[patch]).toBe('c')
  })

  it('whatever is on a vehicle at all is in its trail: one patch of foam on a shining vehicle still leaves a blob behind it', () => {
    const fresh = { ...freshWash(null), shown: ['drip' as const] }
    const cells: Patch[] = silhouette(vehicle(fresh.bay.who)).map((p) => (p === '.' ? '.' : 'p'))
    cells[cellAt(8, 3)] = 'f'
    const play = new Play(washed(fresh, cells))
    play.press({ kind: 'next' })
    let blobs = 0
    for (let i = 0; i < 60 * 3; i++) {
      play.step(FRAME)
      for (let k = 0; k < play.particles.count; k++) if (play.particles.kind[k] === KIND.blob && play.particles.age[k] < FRAME * 1.5) blobs += 1
    }
    expect(blobs).toBeGreaterThan(0)
  })

  it('a tool in hand waits by the vehicle until it is put to the paint, and says so, so that a touch on it where it is drawn can be a touch on it', () => {
    const play = new Play(coated('s'))
    expect(play.toolWaits).toBe(false)
    play.press({ kind: 'tool', tool: 'sponge' })
    expect(play.toolWaits).toBe(true)
    // A touch on it where it waits, later than a child's double tap: it is hung up again.
    run(play, 1.5)
    play.press({ kind: 'tool', tool: 'sponge' })
    expect(play.hand).toBe('finger')
    expect(play.toolWaits).toBe(false)
    play.press({ kind: 'tool', tool: 'cloth' })
    play.press(on(play, 5, 3))
    expect(play.toolWaits).toBe(false)
    play.release()
    expect(play.toolWaits).toBe(false)
    // After a send-off the tool is back where it waits.
    play.press({ kind: 'next' })
    expect(play.toolWaits).toBe(true)
  })

  it('plates of dried mud that crack off a leaving vehicle lie in their row while the newcomer rolls in', () => {
    const play = new Play(coated('c'))
    play.press({ kind: 'next' })
    const lying = (): number => Array.from({ length: play.particles.count }, (_, k) => k).filter((k) => play.particles.kind[k] === KIND.crumb && play.particles.y[k] < 0.05).length
    run(play, 3.0)
    const atThree = lying()
    run(play, 1.4)
    // When the newcomer brakes, at 4.4 seconds, most of what fell is still lying there.
    expect(atThree).toBeGreaterThan(8)
    expect(lying()).toBeGreaterThanOrEqual(Math.floor(atThree * 0.6))
  })

  it('a sponge a little way under the mixer\'s tyre, given the tyre\'s patch, foams the wheel and tickles', () => {
    const def = vehicle('mixer'), fresh = { ...freshWash(null), shown: ['drip' as const] }
    const play = new Play(washed({ ...fresh, bay: { ...fresh.bay, who: 'mixer' }, next: { ...fresh.next, who: 'tractor' } }, silhouette(def).map((p) => (p === '.' ? '.' : 'd'))))
    const wheel = def.wheels[0], col = Math.floor(((wheel.x - def.side.x0) / (def.side.x1 - def.side.x0)) * GRID_W)
    expect(play.bay.surface[cellAt(col, 0)]).toBe('d')
    const heard = (y: number, tool: 'sponge' | 'cloth'): string => {
      const game = new Play(play.state)
      game.press({ kind: 'tool', tool })
      game.sounds.length = 0
      game.press({ kind: 'truck', col, row: 0, x: wheel.x, y })
      if (tool === 'sponge') expect(game.bay.surface[cellAt(col, 0)]).toBe('f')
      return JSON.stringify(game.sounds)
    }
    // The point under the finger is below the tyre, off the vehicle, as the picker reports it for a touch just off the edge:
    // it sounds as a touch on the middle of the tyre does, tickle and all, and not as the cloth there does or as the sponge on the cab.
    expect(heard(-0.1, 'sponge')).toBe(heard(0.3, 'sponge'))
    const giggle = JSON.stringify(voices.feel.giggle(def.horn.high))
    expect(heard(-0.1, 'sponge')).toContain(giggle)
    expect(heard(-0.1, 'cloth')).not.toContain(giggle)
  })

  it('the bucket, a pool, the drain, the window and the pipe each give an answer of their own where the finger is, and change nothing', () => {
    const pool = LAYOUT.pools[0], w = LAYOUT.window, pipe = LAYOUT.pipe
    const cases: [string, Target, VoiceSpec, number, readonly [number, number, number]][] = [
      ['bucket', { kind: 'bucket' }, voices.place.slosh(), KIND.blob, bucketTop()],
      ['pool', { kind: 'floor', x: pool.x, z: pool.z }, voices.place.plop(), KIND.drop, [pool.x, 0, pool.z]],
      ['drain', { kind: 'floor', x: LAYOUT.drain.x, z: LAYOUT.drain.z }, voices.place.glug(), KIND.bubble, [LAYOUT.drain.x, 0, LAYOUT.drain.z]],
      ['window', { kind: 'none', at: [(w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, LAYOUT.wall.z + 0.05] }, voices.place.squeak(), KIND.glint, [(w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, LAYOUT.wall.z]],
      ['pipe', { kind: 'none', at: [-3.5, pipe.y + 0.1, LAYOUT.wall.z + 0.05] }, voices.place.bonk(), KIND.drop, [-3.5, pipe.y, LAYOUT.wall.z + 0.2]],
    ]
    const heard = new Set<string>()
    for (const hand of ['finger', 'sponge', 'cloth'] as const) {
      for (const [name, target, voice, kind, at] of cases) {
        const play = new Play(coated('s'))
        if (hand !== 'finger') play.press({ kind: 'tool', tool: hand })
        const before = play.state, surface = [...play.bay.surface]
        play.sounds.length = 0
        play.press(target)
        play.release()
        // Its own sound, in the very call of the press, and no knock of the bare floor or wall with it.
        expect(play.sounds.map((sound) => JSON.stringify(sound.spec)), `${name} with the ${hand}`).toEqual([JSON.stringify(voice)])
        heard.add(JSON.stringify(voice))
        run(play, 0.4)
        // Something of its own is seen within reach of the finger.
        const near = Array.from({ length: play.particles.count }, (_, k) => k).filter((k) => play.particles.kind[k] === kind && Math.hypot(play.particles.x[k] - at[0], play.particles.z[k] - at[2]) < 1.2)
        expect(near.length, `${name} with the ${hand}`).toBeGreaterThan(0)
        // Nothing of a wash changed: no field, no patch, and the hand holds what it held.
        expect(play.state).toBe(before)
        expect(play.bay.surface).toEqual(surface)
        expect(play.hand).toBe(hand)
        expect(play.dirty).toBe(false)
      }
    }
    // Five things, five sounds.
    expect(heard.size).toBe(5)
    // Under the hose a pool still plops, and the jet lands on it as it does anywhere on the floor.
    const hose = new Play(coated('s'))
    hose.press({ kind: 'tool', tool: 'hose' })
    hose.sounds.length = 0
    hose.press({ kind: 'floor', x: pool.x, z: pool.z })
    expect(hose.sounds.map((sound) => JSON.stringify(sound.spec))).toContain(JSON.stringify(voices.place.plop()))
    expect(hose.sounds.length).toBe(2)
    expect(hose.jets.length).toBe(1)
    // The bare floor and the bare wall answer as they did.
    const bare = new Play(coated('s'))
    bare.sounds.length = 0
    bare.press({ kind: 'floor', x: 0, z: 2.7 })
    expect(JSON.stringify(bare.sounds[0].spec)).toBe(JSON.stringify(voices.poke.knock()))
    bare.sounds.length = 0
    bare.press({ kind: 'none', at: [-4, 2.0, LAYOUT.wall.z + 0.05] })
    expect(JSON.stringify(bare.sounds[0].spec)).toBe(JSON.stringify(voices.plip(0.9)))
  })

  it('left to itself, the muddy one at the door now and then puts its tongue out at the mud on its own nose: silent, changing nothing, and never over a scene or under a finger', () => {
    const play = new Play(coated('s'))
    const before = play.state
    play.sounds.length = 0
    const out: number[] = []
    let was = false
    for (let i = 0; i < 60 * 45; i++) {
      play.step(FRAME)
      const is = play.next.motion.pose.tongue > 0.5 && play.next.motion.pose.cross > 0.4
      if (is && !was) out.push(i * FRAME)
      was = is
    }
    // The first within a few seconds, so that something funny happens before a touch; then now and then, unevenly.
    expect(out.length).toBeGreaterThanOrEqual(3)
    expect(out[0]).toBeGreaterThan(LICK_FIRST - 0.1)
    expect(out[0]).toBeLessThan(LICK_FIRST + 1)
    expect(out[1] - out[0]).toBeCloseTo(LICK_GAPS[0], 0)
    expect(out[2] - out[1]).toBeCloseTo(LICK_GAPS[1], 0)
    // Between tries the tongue is in and the eyes are straight.
    expect(play.next.motion.pose.tongue).toBeLessThan(0.5)
    // It makes no sound: all that is heard in that time is the drop from the nozzle landing, as before.
    for (const sound of play.sounds) expect(sound.spec).toEqual(play.sounds[0].spec)
    expect(play.sounds[0].spec.length).toBe(1)
    expect(play.state).toBe(before)
    expect(play.dirty).toBe(false)
    // The one in the bay does not do it: its face is for what is done to it.
    const bay = new Play(coated('s'))
    let most = 0
    for (let i = 0; i < 60 * 20; i++) { bay.step(FRAME); most = Math.max(most, bay.bay.motion.pose.tongue) }
    expect(most).toBeLessThan(0.3)
    // Under a finger that is working it holds off.
    const busy = new Play(coated('s'))
    busy.press(on(busy, 5, 3))
    let during = 0
    for (let i = 0; i < 60 * 8; i++) { busy.step(FRAME); during = Math.max(during, busy.next.motion.pose.tongue) }
    expect(during).toBeLessThan(0.3)
  })

  it('a second finger ends a scene too, and gets its knock', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'next' })
    run(play, 2)
    expect(play.sceneRunning).toBe(true)
    play.sounds.length = 0
    play.extra()
    expect(play.sceneRunning).toBe(false)
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.bay.motion.homeX).toBeCloseTo(LAYOUT.bay.x)
  })

  it('the rub that sets the shine off goes on being answered while the shine plays, and does not end it', () => {
    const def = vehicle('tipper'), fresh = { ...freshWash(null), shown: ['drip' as const] }
    const cells: Patch[] = silhouette(def).map((p) => (p === '.' ? '.' : 'p'))
    const last = cells.findIndex((p, i) => p !== '.' && i > 40)
    cells[last] = 'w'
    const play = new Play(washed(fresh, cells))
    play.press({ kind: 'tool', tool: 'cloth' })
    play.press(on(play, last % GRID_W, Math.floor(last / GRID_W)))
    expect(play.sceneRunning).toBe(true)
    // The finger rubs on: each stroke squeaks and the cloth goes with it.
    let heard = 0
    for (let i = 1; i <= 30; i++) {
      play.sounds.length = 0
      play.drag(on(play, 3 + (i % 6), 3), 5)
      heard += play.sounds.length
      play.step(FRAME)
    }
    expect(heard).toBeGreaterThan(3)
    expect(play.tool.working).toBe(true)
    expect(play.sceneRunning).toBe(true)
    expect(allShiny(play.bay.surface)).toBe(true)
    // A new touch still ends it.
    play.release()
    play.press({ kind: 'none' })
    expect(play.sceneRunning).toBe(false)
  })

  it('a leaving vehicle sheds what is on it only where it can be seen: nothing lands past the left edge of the floor', () => {
    for (const patch of ['c', 's', 'f', 'w'] as const) for (const cut of [null, 1.3]) {
      const play = new Play(coated(patch))
      play.press({ kind: 'next' })
      let landings = 0
      for (let i = 0; i < 60 * 9; i++) {
        if (cut !== null && i === Math.round(cut * 60)) play.press({ kind: 'none' })
        play.step(FRAME)
        // The tyre tracks are laid, not thrown, and make no sound: they are not counted here.
        for (const mark of play.marks) if (mark.strength === undefined) {
          landings += 1
          expect(mark.x, `${patch}, cut ${cut}`).toBeGreaterThan(-6.2)
        }
        play.marks.length = 0
      }
      if (cut === null) expect(landings, patch).toBeGreaterThan(4)
    }
  })
})

describe('found as left', () => {
  it('a reload gives back the same vehicles, patch for patch, with the tools on the rack and no scene', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'sponge' })
    play.press(on(play, ...bodyPatch(play)))
    play.release()
    run(play, 0.5)
    const again = reload(play)
    expect(encode(again.bay.surface)).toBe(encode(play.bay.surface))
    expect(encode(again.next.surface)).toBe(encode(play.next.surface))
    expect(again.bay.def.id).toBe(play.bay.def.id)
    expect(again.hand).toBe('finger')
    expect(again.sceneRunning).toBe(false)
    run(again, 5)
    expect(again.sceneRunning).toBe(false)
    expect(again.dirty).toBe(false)
  })

  it('reads no clock: a play stepped not at all is the play that was saved', () => {
    const play = new Play(coated('w'))
    expect(serializeWash(reload(play).state)).toEqual(serializeWash(play.state))
  })
})

describe('the shine', () => {
  it('starts on the dab that leaves every patch shiny, and never on load', () => {
    const play = new Play(coated('w'))
    play.press({ kind: 'tool', tool: 'cloth' })
    for (let row = 0; row < GRID_H && !allShiny(play.bay.surface); row++) for (let col = 0; col < GRID_W && !allShiny(play.bay.surface); col++) {
      if (play.bay.surface[cellAt(col, row)] === '.') continue
      expect(play.sceneRunning).toBe(false)
      play.press(on(play, col, row))
      play.release()
    }
    expect(allShiny(play.bay.surface)).toBe(true)
    expect(play.sceneRunning).toBe(true)
    run(play, 6)
    expect(play.sceneRunning).toBe(false)
    expect(play.bay.motion.partTarget).toBe(0)
    expect(reload(play).sceneRunning).toBe(false)
  })

  it('plays again every time the whole vehicle becomes shiny', () => {
    const play = new Play(coated('p'))
    const [col, row] = bodyPatch(play)
    // A fingerprint dulls one patch; the cloth brings the shine back.
    play.press(on(play, col, row))
    play.release()
    expect(allShiny(play.bay.surface)).toBe(false)
    play.press({ kind: 'tool', tool: 'cloth' })
    play.press(on(play, col, row))
    expect(play.sceneRunning).toBe(true)
  })
})

describe('the puddle', () => {
  it('muddies the vehicle that waits twice, in a scene whose outcome is saved when it starts, and then only splashes', () => {
    const play = new Play(coated('d'))
    const before = tally(play.next.surface).s
    play.press({ kind: 'puddle' })
    expect(play.urgent).toBe(true)
    // Saved at the start: the added mud and one more trip.
    expect(tally(reload(play).next.surface).s).toBeGreaterThan(before)
    expect(reload(play).state.next.dips).toBe(1)
    run(play, 3.2)
    expect(play.sceneRunning).toBe(false)
    expect(encode(play.next.surface)).toBe(play.state.next.cells)
    expect(play.next.motion.homeX).toBeCloseTo(LAYOUT.door.x)
    expect(play.next.motion.hop).toBeCloseTo(0)
    play.press({ kind: 'puddle' })
    run(play, 3.2)
    const twice = play.state
    play.dirty = false
    play.sounds.length = 0
    play.press({ kind: 'puddle' })
    run(play, 1)
    // Still answered, with a splash, and no field changed.
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.state).toBe(twice)
    expect(play.state.next.dips).toBe(2)
    expect(play.dirty).toBe(false)
  })
})

describe('the first showing', () => {
  it('plays once for the first vehicle with dried mud, marks itself at its start, and never plays again', () => {
    const play = new Play(freshWash(4))
    expect(play.state.position).toBe(LADDER[1])
    const caked = tally(play.bay.surface).c
    play.step(FRAME)
    expect(play.sceneRunning).toBe(true)
    expect(play.state.shown).toContain('drip')
    expect(play.urgent).toBe(true)
    // Put away during the showing: on return the patch is soft and nothing replays.
    const again = reload(play)
    run(again, 1)
    expect(again.sceneRunning).toBe(false)
    expect(tally(again.bay.surface).c).toBeLessThan(caked)
    run(play, 6)
    expect(play.sceneRunning).toBe(false)
    expect(tally(play.bay.surface).c).toBeLessThan(caked)
    expect(tally(play.bay.surface).mud).toBe(tally(decodeOr(freshWash(4))).mud)
    expect(play.bay.motion.homeX).toBeCloseTo(LAYOUT.bay.x)
  })

  it('owed when the game was put away, it does not play when the game is opened: the vehicle stands with its dried mud, and the showing starts at the first touch, whatever is touched', () => {
    const targets: Target[] = [{ kind: 'tool', tool: 'hose' }, { kind: 'floor', x: 0, z: 2.5 }, { kind: 'none' }, { kind: 'puddle' }, { kind: 'next' }, { kind: 'tap' }, { kind: 'bit', bit: 'lamp' }, { kind: 'queue', place: 0 }]
    for (const target of targets) {
      // A child on soft mud sends the first vehicle off; the newcomer has dried mud, and the game is put away during the send-off.
      const first = new Play({ ...coated('s'), shown: [], next: freshWash(4).next })
      first.press({ kind: 'next' })
      first.release()
      run(first, 1)
      expect(first.sceneRunning).toBe(true)
      expect(tally(decodeOr(first.state)).c, 'a newcomer with dried mud').toBeGreaterThan(0)
      expect(first.state.shown).toEqual([])
      const opened = reload(first)
      const caked = tally(opened.bay.surface).c
      // Left alone for a long while, nothing plays, nothing sounds, and the mud is as it was left.
      opened.sounds.length = 0
      run(opened, 30)
      expect(opened.sceneRunning).toBe(false)
      expect(opened.state.shown).toEqual([])
      expect(tally(opened.bay.surface).c).toBe(caked)
      expect(opened.dirty).toBe(false)
      // The first touch starts it, and is not answered as a touch of its own: no tool is taken and nothing is sent off.
      const before = opened.state
      opened.press(target)
      opened.release()
      expect(opened.sceneRunning, target.kind).toBe(true)
      expect(opened.state.shown).toEqual(['drip'])
      expect(opened.hand).toBe('finger')
      expect(opened.state.bay.who).toBe(before.bay.who)
      expect(opened.state.next).toEqual(before.next)
      run(opened, 7)
      expect(tally(opened.bay.surface).c).toBeLessThan(caked)
    }
    // The same for a first visit put away before its first frame was drawn and saved.
    const early = reload(new Play(freshWash(4)))
    run(early, 10)
    expect(early.sceneRunning).toBe(false)
    expect(early.state.shown).toEqual([])
    early.press(on(early, 5, 3))
    expect(early.state.shown).toEqual(['drip'])
    // A first visit is not a game that was put away: there it plays in the first seconds.
    const visit = new Play(freshWash(4))
    visit.step(FRAME)
    expect(visit.sceneRunning).toBe(true)
  })

  it('does not play for a child who starts on soft mud, until dried mud first rolls in', () => {
    const play = new Play(freshWash(2))
    run(play, 2)
    expect(play.sceneRunning).toBe(false)
    expect(play.state.shown).toEqual([])
  })
})

function decodeOr(state: WashState): Patch[] {
  return state.bay.cells.split('') as Patch[]
}

describe('the work of a frame stays inside its budget', () => {
  it('never holds more than the pool of flying things, and queues only a few sounds a frame, in the busiest minute', () => {
    const play = new Play(coated('f'))
    play.press({ kind: 'tool', tool: 'sponge' })
    let mostSounds = 0, mostMarks = 0, most = 0
    // A fast rub back and forth over foam with the sponge, the busiest thing a finger can do, then a send-off on top of it.
    for (let frame = 0; frame < 60 * 20; frame++) {
      const col = Math.abs(((frame / 3) % (2 * (GRID_W - 1))) - (GRID_W - 1)), row = 2 + Math.floor((frame / 40) % 3)
      const target = on(play, Math.round(col), row)
      if (frame === 0) play.press(target)
      else if (frame === 600) play.press({ kind: 'next' })
      else if (frame % 2 === 0 && !play.sceneRunning) play.drag(target, 9)
      play.sounds.length = 0
      play.marks.length = 0
      play.step(FRAME)
      mostSounds = Math.max(mostSounds, play.sounds.length)
      mostMarks = Math.max(mostMarks, play.marks.length)
      most = Math.max(most, play.particles.count)
    }
    expect(most, 'flying things at once').toBeGreaterThan(40)
    expect(most).toBeLessThanOrEqual(CAPACITY)
    expect(mostSounds, 'sounds queued in one frame').toBeLessThanOrEqual(6)
    expect(mostMarks, 'things landing in one frame').toBeLessThanOrEqual(12)
  })

  it('every vehicle of the roster can be built and stood in the bay', () => {
    for (const def of ROSTER) {
      const state: WashState = { ...freshWash(null), bay: { who: def.id, cells: encode(silhouette(def)), came: 0 }, next: { who: ROSTER[(ROSTER.indexOf(def) + 1) % ROSTER.length].id, cells: encode(silhouette(ROSTER[(ROSTER.indexOf(def) + 1) % ROSTER.length])), dips: 0 } }
      const play = new Play(state)
      run(play, 0.5)
      expect(play.bay.def.id).toBe(def.id)
      expect(Number.isFinite(play.bay.motion.pose.lift)).toBe(true)
    }
  })
})
