import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { ROSTER, vehicle } from './cycle'
import { CAPACITY } from './fx'
import { Play, type Target } from './play'
import { LAYOUT } from './props'
import { patchCentre, silhouette } from './silhouette'
import { GRID_H, GRID_W, allShiny, cellAt, encode, tally, type Patch } from './surface'
import { deserializeWash, freshWash, serializeWash, washed, type WashState } from './washState'

const FRAME = 1 / 60

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
  return new Play(deserializeWash(JSON.parse(JSON.stringify(serializeWash(play.state))), null))
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
    for (const patch of ['c', 's', 'b', 'f', 'w', 'd', 'p'] as const) for (const tool of ['finger', 'sponge', 'hose', 'cloth'] as const) {
      const play = new Play(coated(patch))
      if (tool !== 'finger') play.press({ kind: 'tool', tool })
      play.sounds.length = 0
      const [col, row] = bodyPatch(play)
      play.press(on(play, col, row))
      expect(play.sounds.length, `${tool} on ${patch}`).toBeGreaterThan(0)
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
      if (r < 0.25) return { kind: 'none' }
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

describe('the send-off and the roll-in', () => {
  it('saves its outcome at once, before a single beat has played', () => {
    const play = new Play(coated('p'))
    const waiting = play.next.def.id
    play.press({ kind: 'next' })
    expect(play.urgent).toBe(true)
    expect(play.state.bay.who).toBe(waiting)
    expect(play.state.position).toBe(LADDER[1])
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
    run(play, 1)
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
    expect(tally(reload(play).next.surface).s).toBeGreaterThan(before)
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
    // Still answered, with a splash, and nothing more to add.
    expect(play.sounds.length).toBeGreaterThan(0)
    expect(play.state).toBe(twice)
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
      const state: WashState = { ...freshWash(null), bay: { who: def.id, cells: encode(silhouette(def)), came: 0 }, next: { who: ROSTER[(ROSTER.indexOf(def) + 1) % ROSTER.length].id, cells: encode(silhouette(ROSTER[(ROSTER.indexOf(def) + 1) % ROSTER.length])) } }
      const play = new Play(state)
      run(play, 0.5)
      expect(play.bay.def.id).toBe(def.id)
      expect(Number.isFinite(play.bay.motion.pose.lift)).toBe(true)
    }
  })
})
