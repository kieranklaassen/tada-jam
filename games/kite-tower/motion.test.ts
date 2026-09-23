import { describe, expect, it } from 'vitest'
import { blankPose, MotionDirector, PERSONALITIES, POSE_CHANNELS, type Action, type Doll } from './motion'

const DOLLS = Object.keys(PERSONALITIES) as Doll[]
const WATCHERS: Doll[] = ['moss', 'bean']
const STEP = 1 / 60

function signature(action: Action): number[] {
  const out: number[] = []
  for (let i = 0; i <= 20; i++) {
    const pose = blankPose()
    action.sample((action.duration * i) / 20, 1, pose)
    // A whole turn is a big number for a small visual change; weigh twirls down.
    for (const channel of POSE_CHANNELS) out.push(channel === 'spin' ? pose[channel] * 0.3 : pose[channel])
  }
  return out
}

function distance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum)
}

function allActions(): { doll: Doll; action: Action }[] {
  const out: { doll: Doll; action: Action }[] = []
  for (const doll of DOLLS) {
    const p = PERSONALITIES[doll]
    for (const action of [...p.react, ...p.cheer, ...p.poke, ...p.delight]) out.push({ doll, action })
  }
  return out
}

/**
 * How far a pose changes the doll's outline seen from the child's seat, where a
 * doll is about 70 px tall: 1 is an arm well out to the side, a hop of 0.15, a
 * lean of 0.15 rad, a quarter turn of the body, or a turn that shows her back.
 * Arms swung in front of the body and head tilts count for nothing.
 */
function outline(pose: ReturnType<typeof blankPose>): number {
  const turned = Math.abs(Math.sin(pose.spin / 2)) > 0.3 ? 1 : 0
  return Math.max(
    Math.max(pose.raiseL, pose.raiseR) / 1.2,
    Math.abs(pose.lift) / 0.15,
    Math.abs(pose.roll) / 0.15,
    Math.abs(pose.squash) / 0.1,
    Math.abs(pose.bow) / 0.25,
    Math.abs(pose.shift) / 0.1,
    Math.abs(pose.twist) / 0.6,
    turned,
  )
}

function peakOutline(action: Action): number {
  let peak = 0
  for (let i = 0; i <= 60; i++) {
    const pose = blankPose()
    action.sample((action.duration * i) / 60, 0.85, pose)
    peak = Math.max(peak, outline(pose))
  }
  return peak
}

function zeroCrossings(doll: Doll, seconds: number): number {
  let crossings = 0
  let previous = 0
  for (let t = 0; t < seconds; t += STEP) {
    const pose = blankPose()
    PERSONALITIES[doll].idle(t, pose)
    if (t > 0 && Math.sign(pose.squash) !== Math.sign(previous)) crossings += 1
    previous = pose.squash
  }
  return crossings
}

describe('motion personalities', () => {
  it('every doll has several reactions, pokes and delights, and each watcher several cheers', () => {
    for (const doll of DOLLS) {
      const p = PERSONALITIES[doll]
      expect(p.react.length, `${doll} react`).toBeGreaterThanOrEqual(2)
      expect(p.poke.length, `${doll} poke`).toBeGreaterThanOrEqual(2)
      expect(p.delight.length, `${doll} delight`).toBeGreaterThanOrEqual(3)
    }
    for (const doll of WATCHERS) expect(PERSONALITIES[doll].cheer.length, `${doll} cheer`).toBeGreaterThanOrEqual(2)
  })

  it('no two dolls share an action name', () => {
    const names = allActions().map(({ action }) => action.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('no two actions anywhere in the room are near-copies', () => {
    const all = allActions().map((entry) => ({ ...entry, sig: signature(entry.action) }))
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d = distance(all[i].sig, all[j].sig)
        expect(d, `${all[i].doll}/${all[i].action.name} vs ${all[j].doll}/${all[j].action.name}`).toBeGreaterThan(0.3)
      }
    }
  })

  it('every answer to the child changes the outline at play distance, and every delight at least a little', () => {
    for (const doll of DOLLS) {
      const p = PERSONALITIES[doll]
      for (const action of [...p.react, ...p.cheer, ...p.poke]) expect(peakOutline(action), `${doll}/${action.name}`).toBeGreaterThanOrEqual(1)
      for (const action of p.delight) expect(peakOutline(action), `${doll}/${action.name}`).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('every action starts and ends near rest, so variants chain without a pop', () => {
    for (const { doll, action } of allActions()) {
      for (const t of [0, action.duration]) {
        const pose = blankPose()
        action.sample(t, 1, pose)
        for (const channel of POSE_CHANNELS) {
          if (channel === 'spin') continue
          expect(Math.abs(pose[channel]), `${doll}/${action.name} ${channel} at ${t}`).toBeLessThan(0.05)
        }
        expect(Math.abs(pose.spin % (Math.PI * 2)), `${doll}/${action.name} ends a whole turn`).toBeLessThan(0.05)
      }
    }
  })

  it('idle tempo and head turns follow who each doll is: Moss slowest, Bean quickest', () => {
    expect(zeroCrossings('moss', 10)).toBeLessThan(zeroCrossings('pip', 10))
    expect(zeroCrossings('pip', 10)).toBeLessThan(zeroCrossings('bean', 10))
    expect(PERSONALITIES.moss.lookRate).toBeLessThan(PERSONALITIES.pip.lookRate)
    expect(PERSONALITIES.pip.lookRate).toBeLessThan(PERSONALITIES.bean.lookRate)
    expect(PERSONALITIES.moss.blinkLength).toBeGreaterThan(PERSONALITIES.bean.blinkLength)
  })
})

describe('MotionDirector', () => {
  it('never plays the same variant twice in a row and uses every variant over time', () => {
    for (const doll of DOLLS) {
      const director = new MotionDirector(doll, 7)
      for (const kind of ['react', 'poke', 'delight'] as const) {
        const seen = new Set<string>()
        let previous = ''
        for (let i = 0; i < 40; i++) {
          const name = director.pick(kind)!.name
          expect(name, `${doll} ${kind}`).not.toBe(previous)
          previous = name
          seen.add(name)
        }
        expect(seen.size, `${doll} ${kind}`).toBe(PERSONALITIES[doll][kind].length)
      }
    }
  })

  it('plays a handful of delights in two idle minutes and none while the doll is busy', () => {
    for (const doll of DOLLS) {
      const director = new MotionDirector(doll, 3)
      for (let t = 0; t < 120; t += STEP) director.sample(t, 'idle')
      expect(director.delights, `${doll} idle`).toBeGreaterThanOrEqual(5)
      expect(director.delights, `${doll} idle`).toBeLessThanOrEqual(25)
      const busy = new MotionDirector(doll, 3)
      for (let t = 0; t < 120; t += STEP) busy.sample(t, t < 60 ? 'walk' : 'busy')
      expect(busy.delights, `${doll} busy`).toBe(0)
    }
  })

  it('a poke drops a delight at once', () => {
    const director = new MotionDirector('bean', 5)
    let t = 0
    while (!director.isPlaying('delight', t) && t < 30) {
      director.sample(t, 'idle')
      t += STEP
    }
    expect(director.isPlaying('delight', t)).toBe(true)
    director.trigger('poke', t)
    director.sample(t, 'idle')
    expect(director.isPlaying('delight', t)).toBe(false)
    expect(director.isPlaying('poke', t)).toBe(true)
  })

  it('a topple everyone sees reaches each doll after its own latency, so they do not jump on the same frame', () => {
    const moss = new MotionDirector('moss', 1)
    const bean = new MotionDirector('bean', 1)
    moss.trigger('react', 10)
    bean.trigger('react', 10)
    expect(bean.isPlaying('react', 10.1)).toBe(true)
    expect(moss.isPlaying('react', 10.1)).toBe(false)
    expect(moss.isPlaying('react', 10.5)).toBe(true)
  })

  it('cheers run back to back through different variants for as long as the kite flies, then stop', () => {
    for (const doll of WATCHERS) {
      const director = new MotionDirector(doll, 9)
      const names = new Set<string>()
      director.setCheering(true, 0)
      let still = 0
      for (let t = 0; t < 12; t += STEP) {
        const pose = director.sample(t, 'busy')
        if (t > 1 && Math.abs(pose.raiseL) + Math.abs(pose.raiseR) + Math.abs(pose.lift) < 0.05) still += STEP
        const name = director.current('cheer', t)
        if (name) names.add(name)
      }
      expect(names.size, `${doll} cheer variants in one flight`).toBeGreaterThanOrEqual(2)
      expect(still, `${doll} rests between cheers only briefly`).toBeLessThan(2.5)
      director.setCheering(false, 12)
      for (let t = 12; t < 16; t += STEP) director.sample(t, 'idle')
      expect(director.isPlaying('cheer', 16)).toBe(false)
    }
  })

  it('blinks on its own rhythm: two dolls, or one doll with two seeds, do not blink in lockstep', () => {
    const blinks = (doll: Doll, seed: number) => {
      const director = new MotionDirector(doll, seed)
      const out: number[] = []
      let wasShut = false
      for (let t = 0; t < 30; t += STEP) {
        const shut = director.sample(t, 'idle').face === 'blink'
        if (shut && !wasShut) out.push(Math.round(t * 10))
        wasShut = shut
      }
      return out
    }
    expect(blinks('moss', 1)).not.toEqual(blinks('moss', 2))
    expect(blinks('bean', 1)).not.toEqual(blinks('pip', 1))
    expect(blinks('bean', 1).length).toBeGreaterThan(blinks('moss', 1).length)
  })
})
