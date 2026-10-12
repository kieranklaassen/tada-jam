import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BEACHES } from './beaches'
import { BUILT, base, deltaAt, encode, heightAt, peakNear, tower } from './field'
import { SNAP_EVERY } from './folk'
import { deserializeKingdom } from './kingdom'
import { ASKEW, type Grain, OFF_MIDDLE, Play, RING_SECONDS, RUN_BACK_SECONDS, RUN_FLECKS, RUN_LEAN, type Ring, SHOT_SECONDS, SKID_FROM, WAKE_EVERY, WOOD_LEAN } from './play'
import { JOURNEY_SECONDS } from './sun'
import { woodEnds, woodShadow } from './things'
import { ThingsView } from './view/thingsView'
import { VOICES } from './voices'
import { grooveTurn } from './water'

// Each sound has its picture, in the frame it sounds: what is heard is seen
// to happen, by a child of 3, at that moment. And three shapes the beach must
// never draw by accident: a plus, a cross and a T.

const DT = 1 / 60
const fresh = (age: number | null = 7, seed = 1): Play => new Play(deserializeKingdom(null, age), seed)
const steps = (play: Play, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) play.step(DT)
}
/** Plays frame by frame and hands each frame what was heard in it and the rings and grains that are new in it. */
function watch(play: Play, seconds: number, each: (heard: string[], rings: Ring[], grains: Grain[], frame: number) => void, before?: (frame: number) => void): void {
  let from = play.heard.length
  const rings = new Set(play.rings), grains = new Set(play.grains)
  for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
    before?.(frame)
    play.step(DT)
    // A sound that was noted ahead of its moment counts in the frame its moment comes.
    const now = play.heard.filter((one, index) => (index >= from && one.at <= play.time + 1e-9) || (index < from && one.at > play.time - DT + 1e-9 && one.at <= play.time + 1e-9)).map((one) => one.name)
    from = play.heard.length
    const newRings = play.rings.filter((ring) => !rings.has(ring)), newGrains = play.grains.filter((grain) => !grains.has(grain))
    for (const ring of newRings) rings.add(ring)
    for (const grain of newGrains) grains.add(grain)
    each(now, newRings, newGrains, frame)
  }
}
/** The things out of the way, at the top of the beach. */
function aside(play: Play): void {
  Object.assign(play.things.bucket, { x: -5, z: 6.6 })
  play.things.shells.forEach((shell, index) => Object.assign(shell, { x: 3 + index * 0.9, z: 7.2, state: 'lying' }))
  Object.assign(play.things.wood[0], { x: -2, z: 7.2, turn: 0 })
  Object.assign(play.things.wood[1], { x: 0.8, z: 7.3, turn: 0 })
}
function stroke(play: Play, points: readonly (readonly [number, number])[], each = 0.08): void {
  play.press({ kind: 'sand', x: points[0][0], z: points[0][1] })
  play.dragStart()
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1], [bx, bz] = points[i]
    const count = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / each))
    for (let k = 1; k <= count; k++) {
      play.drag(ax + ((bx - ax) * k) / count, az + ((bz - az) * k) / count, 0)
      play.step(DT)
    }
  }
  play.release()
}

describe('the shell that shows in the bucket', () => {
  it('is the shell that was scooped up, whichever of the three it was, and none when the bucket is on its side or turned out', () => {
    const material = new THREE.MeshBasicMaterial()
    const view = new ThingsView(material, material)
    const peeks = [0, 1, 2].map((index) => view.group.getObjectByName(`bucket-shell-${index}`) as THREE.Mesh)
    const shells = [0, 1, 2].map((index) => view.group.getObjectByName(`shell-${index}`) as THREE.Mesh)
    for (const index of [0, 1, 2]) {
      // Each is drawn with the shape of its own shell: same colours, same outline, smaller.
      expect(peeks[index].geometry).toBe(shells[index].geometry)
      const play = fresh()
      aside(play)
      Object.assign(play.things.bucket, { x: 0, z: 4, holds: 'nothing' })
      Object.assign(play.things.shells[index], { x: 1.6, z: 4 })
      expect(play.peek()).toBe(-1)
      view.update(play)
      expect(peeks.map((peek) => peek.visible)).toEqual([false, false, false])
      play.press({ kind: 'bucket' })
      play.dragStart()
      for (let i = 1; i <= 10; i++) {
        play.drag(i * 0.06, 4, 0)
        play.step(DT)
      }
      play.release()
      expect(play.things.shells[index].state).toBe('bucket')
      expect(play.peek()).toBe(index)
      view.update(play)
      expect(peeks.map((peek) => peek.visible)).toEqual([0, 1, 2].map((other) => other === index))
      expect(shells[index].visible).toBe(false)
      // Carried on until it is full and turned out: the shell is in the tower's side, and none shows in the bucket.
      play.press({ kind: 'bucket' })
      play.dragStart()
      for (let i = 1; i <= 30; i++) {
        play.drag(0.6 + i * 0.06, 4, 0)
        play.step(DT)
      }
      play.release()
      expect(play.things.bucket.holds).toBe('sand')
      expect(play.peek()).toBe(index)
      steps(play, 0.5)
      play.press({ kind: 'bucket' })
      play.tap()
      expect(play.peek()).toBe(-1)
      view.update(play)
      expect(peeks.map((peek) => peek.visible)).toEqual([false, false, false])
      expect(shells[index].visible).toBe(true)
    }
    view.dispose()
    material.dispose()
  })
})

describe('each sound on the frame of its motion', () => {
  it('the trickle: the wall between two grooves is seen to fall in, with its grains, in the frame the crunch and the trickle sound', () => {
    const play = fresh()
    aside(play)
    stroke(play, [[-2, 3], [2, 3]])
    steps(play, 2)
    // The rim of the old groove, on the side the new stroke comes from.
    const rim = deltaAt(play.field, 0, 3 - 0.55)
    expect(rim).toBeGreaterThan(0.03)
    play.press({ kind: 'sand', x: 0, z: 1.2 })
    play.dragStart()
    let z = 1.2, at = -1
    let before = encode(play.field), wall = rim
    watch(play, 1.2, (heard, _, grains, frame) => {
      if (heard.includes('trickle')) {
        at = frame
        expect(heard).toContain('crunch')
        // The wall has fallen in: what stood up between the finger and the old groove is low, and its grains are in the air.
        expect(deltaAt(play.field, 0, 3 - 0.55)).toBeLessThan(wall * 0.6)
        expect(grains.filter((grain) => !grain.wet).length).toBeGreaterThanOrEqual(9)
        expect(encode(play.field)).not.toBe(before)
      }
      before = encode(play.field)
      wall = deltaAt(play.field, 0, 3 - 0.55)
    }, () => {
      z = Math.min(4.5, z + 0.05)
      play.drag(0, z, 0)
    })
    expect(at).toBeGreaterThan(0)
    // No part of it waits inside the voice.
    expect(VOICES.trickle.every((note) => (note.delay ?? 0) === 0)).toBe(true)
  })

  it('the skitter: the shell shot from under a tower is in the air first, and skitters from the frame it is down on the sand', () => {
    const play = fresh(4)
    aside(play)
    Object.assign(play.things.bucket, { x: -0.3, z: 4, holds: 'sand' })
    Object.assign(play.things.shells[0], { x: 1.1, z: 4 })
    play.press({ kind: 'bucket' })
    play.tap()
    const shell = play.things.shells[0]
    expect(shell.state).toBe('lying')
    expect(play.poses.shells[0].fly?.skid).toBe(true)
    const up = (): number => play.shellPose(0).y - play.ground(play.shellPose(0).x, play.shellPose(0).z)
    let heardAt = -1, highest = 0
    const flown: number[] = []
    watch(play, SHOT_SECONDS + 0.3, (heard, _, __, frame) => {
      flown.push(up())
      if (heardAt < 0) highest = Math.max(highest, up())
      if (!heard.includes('skitter')) return
      heardAt = frame
      // Down on the sand, and still on its way: it has a third of its road to skitter over.
      const pose = play.shellPose(0)
      expect(up()).toBeLessThan(0.12)
      expect(Math.hypot(pose.x - shell.x, pose.z - shell.z)).toBeGreaterThan(0.4)
      expect(play.poses.shells[0].fly).not.toBeNull()
    })
    expect(heardAt).toBeGreaterThan(0)
    expect((heardAt + 1) * DT).toBeCloseTo(SHOT_SECONDS * SKID_FROM, 1)
    // Before that it was well clear of the sand.
    expect(highest).toBeGreaterThan(0.2)
    // The three ticks of the skitter all fall while it slides.
    const last = Math.max(...VOICES.skitter.map((note) => note.delay ?? 0))
    expect(VOICES.skitter[0].delay ?? 0).toBe(0)
    expect(SHOT_SECONDS * SKID_FROM + last).toBeLessThan(SHOT_SECONDS)
    for (const frame of flown.slice(heardAt, Math.round(SHOT_SECONDS * 60))) expect(frame).toBeLessThan(0.12)
  })

  it('the crab: poked, it snaps three times and clicks three times, each click in the frame its claws shut', () => {
    const play = fresh()
    const claws = play.folk.crab.claws
    let snaps = 0, clicks = 0
    // The first snap and the first click are in the press.
    const mark = play.heard.length
    play.press({ kind: 'folk', who: 'crab', index: 0 })
    play.tap()
    expect(claws.every((claw) => claw.shut === 1)).toBe(true)
    expect(play.heard.slice(mark).map((one) => one.name)).toEqual(['clack'])
    snaps += 1
    clicks += 1
    let was = 1
    watch(play, 1.5, (heard) => {
      const shutNow = claws[0].shut === 1 && was < 1
      const clicked = heard.filter((name) => name === 'clack').length
      expect(clicked).toBe(shutNow ? 1 : 0)
      if (shutNow) snaps += 1
      clicks += clicked
      was = claws[0].shut
      expect(claws[1].shut).toBeCloseTo(claws[0].shut, 6)
    })
    expect(snaps).toBe(3)
    expect(clicks).toBe(3)
    expect(SNAP_EVERY * 2).toBeLessThan(0.5)
    // One click is one snap: no second click waits inside the voice.
    expect(VOICES.clack.every((note) => (note.delay ?? 0) === 0)).toBe(true)
  })

  it('the crab: a grain landing on it makes one claw snap once, with one click as it shuts', () => {
    const play = fresh()
    steps(play, 1)
    const claws = play.folk.crab.claws
    play.folk.crab.pinch()
    let snaps = 0, clicks = 0, was = claws[1].shut
    watch(play, 1.2, (heard) => {
      const shutNow = claws[1].shut === 1 && was < 1
      const clicked = heard.filter((name) => name === 'clack').length
      expect(clicked).toBe(shutNow ? 1 : 0)
      if (shutNow) snaps += 1
      clicks += clicked
      was = claws[1].shut
    })
    expect(snaps).toBe(1)
    expect(clicks).toBe(1)
  })
})

describe('what was only sounded has its picture', () => {
  it('a wake: with each slosh a ragged streak of foam is left behind the finger, no two alike and none the mirror of another', () => {
    for (const z of [-3.1, -7.5]) {
      const play = fresh()
      play.press({ kind: 'water', x: -3, z })
      play.dragStart()
      let x = -3, wakes = 0, lastAt = -1
      const laid: Ring[] = []
      watch(play, 1.0, (heard, rings, _, frame) => {
        const streaks = rings.filter((ring) => ring.long !== undefined)
        if (!heard.includes('wake')) {
          expect(streaks).toHaveLength(0)
          return
        }
        wakes += 1
        if (lastAt >= 0) expect((frame - lastAt) * DT).toBeGreaterThan(WAKE_EVERY - DT * 1.5)
        lastAt = frame
        // One streak, and at times a smaller fleck with it: never a pair.
        expect(streaks.length).toBeGreaterThanOrEqual(1)
        expect(streaks.length).toBeLessThanOrEqual(2)
        if (streaks.length === 2) expect(streaks[1].long!).toBeLessThan(streaks[0].long! - 0.3)
        for (const ring of streaks) {
          // Behind the finger, which is moving toward +x, and near its path.
          expect(ring.x).toBeLessThan(x - 0.2)
          expect(Math.hypot(ring.x - x, ring.z - z)).toBeLessThan(1.3)
          laid.push({ ...ring, x: ring.x - x, z: ring.z - z })
        }
      }, () => {
        x += 0.12
        play.drag(x, z, 0)
      })
      play.release()
      expect(wakes, `at z ${z}`).toBeGreaterThanOrEqual(3)
      // No two lie alike: not in where they lie behind the finger, how they are turned, or how long they are.
      for (let i = 0; i < laid.length; i++) for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i], b = laid[j]
        expect(Math.abs(a.turn! - b.turn!) + Math.abs(a.long! - b.long!) + Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.05)
        // None is another mirrored in the finger's path: that would be the two arms of a V.
        expect(Math.abs(a.turn! + b.turn! - 2 * Math.PI) + Math.abs(a.long! - b.long!) + Math.hypot(a.x - b.x, a.z + b.z)).toBeGreaterThan(0.05)
      }
    }
  })

  it('a slow finger in the water sloshes too, and never hisses like dry sand; out at sea its rings each sound', () => {
    for (const z of [-3.1, -7.5]) {
      const play = fresh()
      play.press({ kind: 'water', x: -3, z })
      play.dragStart()
      let x = -3
      const names = new Set<string>()
      watch(play, 2.5, (heard) => {
        for (const name of heard) names.add(name)
      }, () => {
        x += 0.012
        play.drag(x, z, 0)
      })
      play.release()
      expect(names.has('hiss'), `at z ${z}`).toBe(false)
      expect(names.has('wake'), `at z ${z}`).toBe(true)
    }
    // Slower still, out at sea: no wake, and each ring the finger throws is a plip.
    const play = fresh()
    play.press({ kind: 'water', x: -3, z: -7.5 })
    play.dragStart()
    let x = -3, plips = 0, rings = 0
    watch(play, 6, (heard, laid) => {
      plips += heard.filter((name) => name === 'plip').length
      // The rings the finger throws, not those of the drops that fall back.
      rings += laid.filter((ring) => ring.long === undefined && ring.age < RING_SECONDS * 0.2).length
      expect(heard).not.toContain('hiss')
    }, () => {
      x += 0.004
      play.drag(x, -7.5, 0)
    })
    play.release()
    expect(rings).toBeGreaterThanOrEqual(2)
    expect(plips).toBe(rings)
  })

  it('a stroke under standing water brings up a cloud of sand: motes the colour of sand that drift out on the water, and no drops', () => {
    const play = fresh()
    play.press({ kind: 'water', x: -3, z: -3.1 })
    play.dragStart()
    play.grains.length = 0
    let x = -3, motes = 0, drops = 0
    watch(play, 0.8, (_, __, grains) => {
      for (const grain of grains) {
        if (grain.bubble !== undefined && !grain.wet) {
          motes += 1
          // On the water, near the finger, and sent outward, not up.
          expect(grain.y).toBeGreaterThan(play.sea - 0.1)
          expect(grain.y).toBeLessThan(play.sea + 0.2)
          expect(Math.hypot(grain.x - x, grain.z + 3.1)).toBeLessThan(0.4)
          expect(Math.hypot(grain.vx, grain.vz)).toBeGreaterThan(0.2)
          expect(grain.vy).toBeLessThan(0.2)
        } else if (grain.wet) drops += 1
      }
    }, () => {
      x += 0.05
      play.drag(x, -3.1, 0)
    })
    play.release()
    expect(motes).toBeGreaterThan(8)
    expect(drops).toBe(0)
    // They drift and are gone.
    steps(play, 1.2)
    expect(play.grains.filter((grain) => grain.bubble !== undefined && !grain.wet)).toHaveLength(0)
  })

  it('water welling up: a finger in a groove brings a bright ring over the bottom of the hole and bubbles rising from it, with the squelch', () => {
    const play = fresh()
    aside(play)
    stroke(play, [[-2, 4], [2, 4]])
    steps(play, 2)
    expect(play.rings).toHaveLength(0)
    expect(play.grains).toHaveLength(0)
    const mark = play.heard.length
    play.press({ kind: 'sand', x: 0.5, z: 4 })
    expect(play.heard.slice(mark).map((one) => one.name)).toEqual(['squelch'])
    const bottom = heightAt(play.field, 0.5, 4)
    // The ring lies on the bottom of the hole, well above the sea that is far down the beach: it is seen.
    expect(play.rings).toHaveLength(1)
    expect(play.rings[0].y).toBeCloseTo(bottom + 0.03, 6)
    expect(play.rings[0].y!).toBeGreaterThan(play.sea + 0.2)
    expect(Math.hypot(play.rings[0].x - 0.5, play.rings[0].z - 4)).toBeLessThan(1e-6)
    const bubbles = play.grains.filter((grain) => grain.bubble !== undefined)
    expect(bubbles.length).toBeGreaterThanOrEqual(6)
    for (const bubble of bubbles) {
      expect(bubble.wet).toBe(true)
      expect(bubble.vy).toBeGreaterThan(0)
      expect(Math.hypot(bubble.x - 0.5, bubble.z - 4)).toBeLessThan(0.2)
    }
    play.tap()
    // They rise and are gone, and the ring spreads and is gone.
    const from = bubbles[0].y
    steps(play, 0.2)
    expect(bubbles[0].y).toBeGreaterThan(from + 0.05)
    steps(play, RING_SECONDS + 0.2)
    expect(play.rings).toHaveLength(0)
    expect(play.grains.filter((grain) => grain.bubble !== undefined)).toHaveLength(0)
  })

  it('the small wave back along a pool: flecks of foam are laid one after another from the sea end up the pool, for as long as the whoosh sounds, unequal, off the middle and never square across', () => {
    const play = fresh()
    aside(play)
    // A channel dug down to the day sea: water stands in its sea end by day.
    stroke(play, [[0, -2.8], [0, 2.5]])
    steps(play, 2)
    play.press({ kind: 'sun' })
    play.tap()
    let whooshAt = -1
    const flecks: { frame: number; ring: Ring }[] = []
    watch(play, JOURNEY_SECONDS + 5, (heard, rings, _, frame) => {
      if (heard.includes('whoosh')) whooshAt = frame
      for (const ring of rings) if (ring.long !== undefined) flecks.push({ frame, ring })
    })
    expect(whooshAt).toBeGreaterThan(0)
    expect(flecks).toHaveLength(RUN_FLECKS)
    // The first with the whoosh, the last before it has died away, and each further up the pool than the one before.
    expect(flecks[0].frame).toBe(whooshAt)
    expect((flecks[flecks.length - 1].frame - whooshAt) * DT).toBeLessThan(RUN_BACK_SECONDS)
    const gaps: number[] = []
    for (let i = 1; i < flecks.length; i++) {
      expect(flecks[i].frame).toBeGreaterThan(flecks[i - 1].frame)
      expect(flecks[i].ring.z).toBeGreaterThan(flecks[i - 1].ring.z + 0.1)
      gaps.push(flecks[i].ring.z - flecks[i - 1].ring.z)
    }
    // Not a row of even flecks. The steps between them are unequal, and so are their lengths.
    expect(Math.max(...gaps)).toBeGreaterThan(Math.min(...gaps) * 1.3)
    const longs = flecks.map((bar) => bar.ring.long!)
    expect(Math.max(...longs)).toBeGreaterThan(Math.min(...longs) * 1.6)
    for (let i = 1; i < flecks.length; i++) expect(Math.abs(longs[i] - longs[i - 1])).toBeGreaterThan(0.1)
    // The pool runs along z, so square across it is a turn of 0: each lies well off square, not all to one side,
    // and no two that follow each other lie parallel.
    const leans = flecks.map((bar) => Math.atan(Math.tan(bar.ring.turn!)))
    for (const lean of leans) expect(Math.abs(lean)).toBeGreaterThanOrEqual(RUN_LEAN - 1e-9)
    expect(leans.some((lean) => lean > 0) && leans.some((lean) => lean < 0)).toBe(true)
    for (let i = 1; i < leans.length; i++) expect(Math.abs(leans[i] - leans[i - 1])).toBeGreaterThan(0.02)
    // Off the middle of the pool, to one side or the other.
    for (const bar of flecks) expect(Math.abs(bar.ring.x - flecks[0].ring.x) + Math.abs(bar.ring.x)).toBeGreaterThan(0.03)
    expect(flecks[0].ring.z).toBeLessThan(-1.5)
    expect(flecks[flecks.length - 1].ring.z).toBeGreaterThan(1.5)
    for (const { ring } of flecks) {
      // On the pool, and more across it than along it: the channel runs up the beach.
      expect(Math.abs(ring.x)).toBeLessThan(0.3)
      expect(Math.abs(Math.cos(ring.turn!))).toBeGreaterThan(0.7)
    }
  })

  it('grains sliding in: where sand sinks at evening, grains are seen to slide off it and drop into the water as the plops sound', () => {
    const play = fresh()
    aside(play)
    tower(play.field, 0, -1.5, 0, 1)
    stroke(play, [[3, -1.6], [5, -1.6]])
    steps(play, 2)
    play.press({ kind: 'sun' })
    play.tap()
    let plopsAt = -1, slid: Grain[] = [], ringsAfter = 0
    watch(play, JOURNEY_SECONDS + 4, (heard, rings, grains, frame) => {
      if (heard.includes('plops')) {
        plopsAt = frame
        slid = grains.filter((grain) => !grain.wet && grain.bubble === undefined)
      } else if (plopsAt >= 0 && frame < plopsAt + 60) ringsAfter += rings.filter((ring) => ring.long === undefined).length
    })
    expect(plopsAt).toBeGreaterThan(0)
    // Four from each place that sinks, starting on the sand that is going under.
    expect(slid.length).toBeGreaterThanOrEqual(8)
    expect(slid.length % 4).toBe(0)
    // And each makes its ring where it drops into the water.
    expect(ringsAfter).toBeGreaterThanOrEqual(4)
  })
})

describe('three shapes the beach never draws', () => {
  it('no plus: the shadow under a piece of wood lies along the wood, however it is turned', () => {
    for (const turn of [0, 0.3, 0.8, Math.PI / 2, 2.2, -0.6, -1.4, Math.PI]) {
      const piece = { x: 1.2, z: 3.4, turn }
      const shadow = woodShadow(piece), [end, other] = woodEnds(piece)
      // Its long way is the line through the two ends of the bough.
      const along = Math.atan2(other.z - end.z, other.x - end.x)
      expect(Math.abs(Math.sin(along - Math.atan2(shadow.az, shadow.ax)))).toBeLessThan(1e-9)
      expect(Math.hypot(shadow.ax, shadow.az)).toBeCloseTo(1, 9)
      // Long and thin, under the bough from end to end: an oval that cannot cross it.
      expect(shadow.long).toBeGreaterThan(shadow.wide * 3.5)
      expect(shadow.long).toBeGreaterThanOrEqual(1.2)
      expect(shadow.wide).toBeLessThan(0.4)
      expect(shadow.x).toBe(piece.x)
      expect(shadow.z).toBe(piece.z)
    }
  })

  it('no cross: a bridge is laid a little askew across its groove, never exactly square, and the two pieces askew to different sides', () => {
    const leans: number[] = []
    for (const index of [0, 1]) {
      for (const slope of [0, 0.35, -0.5, 0.9]) {
        const play = fresh()
        aside(play)
        // A groove across the beach, sloping a little or a lot.
        stroke(play, [[-3, 3.6 - 3 * slope * 0.4], [3, 3.6 + 3 * slope * 0.4]])
        const piece = play.things.wood[index], start = { x: piece.x, z: piece.z }
        const mark = play.heard.length
        play.press({ kind: 'wood', index })
        play.dragStart()
        for (let i = 1; i <= 30; i++) {
          play.drag(start.x + ((0 - start.x) * i) / 30, start.z + ((3.6 - start.z) * i) / 30, 0)
          play.step(DT)
        }
        play.release()
        expect(play.heard.slice(mark).map((one) => one.name)).toContain('bridge')
        const runs = grooveTurn(play.field, piece.x, piece.z)!
        // How far it lies from square across the groove, signed.
        let off = piece.turn - (runs + Math.PI / 2)
        while (off > Math.PI / 2) off -= Math.PI
        while (off < -Math.PI / 2) off += Math.PI
        expect(Math.abs(off), `piece ${index}, slope ${slope}`).toBeCloseTo(ASKEW, 6)
        // Well off square: a bough across a bright groove is never an upright cross.
        expect(Math.abs(off)).toBeGreaterThan(0.5)
        leans.push(Math.sign(off) * (index === 0 ? 1 : -1))
        // Saved as it lies, and it lies so when the game is opened again.
        const again = play.parked(3)
        expect(again.things.wood[index].turn).toBeCloseTo(piece.turn, 2)
      }
    }
    expect(new Set(leans).size).toBe(1)
    // The bridge of the beach that is already built is askew too.
    const built = new Play(BEACHES.kingdom(7), 1), bridge = built.things.wood[1]
    expect(Math.abs(Math.sin(bridge.turn))).toBeGreaterThan(0.15)
  })

  it('no T: a tower turned out across a piece of wood stands to one side of its middle, and the wood goes through it on the sand, leaning', () => {
    for (const reach of [-0.6, -0.2, 0, 0.1, 0.5]) {
      const play = fresh(4)
      aside(play)
      const piece = play.things.wood[0]
      Object.assign(piece, { x: 0.5, z: 4.4, turn: 0.1 })
      // The full bucket stands against the wood, opposite a point `reach` along it.
      const ax = Math.cos(piece.turn), az = Math.sin(piece.turn)
      Object.assign(play.things.bucket, { x: piece.x + ax * reach - az * 1.05, z: piece.z + az * reach + ax * 1.05, holds: 'sand', shell: false })
      const mark = play.heard.length
      play.press({ kind: 'bucket' })
      play.tap()
      expect(play.heard.slice(mark).map((one) => one.name)).toContain('thudCrack')
      steps(play, 3)
      // Where the tower stands along the wood: never at its middle.
      let best = -Infinity, where = 0
      for (let along = -1; along <= 1.001; along += 0.05) {
        const stands = peakNear(play.field, piece.x + ax * along, piece.z + az * along, 0.2)
        if (stands > best + 1e-6) {
          best = stands
          where = along
        }
      }
      expect(best).toBeGreaterThan(0.6)
      let centre = 0, count = 0
      for (let along = -1.2; along <= 1.201; along += 0.05) {
        if (deltaAt(play.field, piece.x + ax * along, piece.z + az * along) < BUILT) continue
        centre += along
        count += 1
      }
      centre /= count
      expect(Math.abs(centre), `reach ${reach}, tower at ${where.toFixed(2)}`).toBeCloseTo(OFF_MIDDLE, 1)
      expect(Math.sign(centre)).toBe(reach >= 0 ? 1 : -1)
      // One arm is long and the other short: both tips of the wood stick out of the tower, unequally.
      const [end, other] = woodEnds(piece)
      for (const tip of [-1.24, 1.24]) expect(deltaAt(play.field, piece.x + ax * tip, piece.z + az * tip)).toBeLessThan(0.12)
      // The wood is on the sand, through the tower, and not carried up onto its top.
      const pose = play.woodPose(0)
      expect(pose.y - (base(end.z) + base(other.z)) / 2).toBeLessThan(0.3)
      expect(pose.y - (base(end.z) + base(other.z)) / 2).toBeGreaterThan(0.15)
      expect(pose.y).toBeLessThan(play.ground(piece.x + ax * centre, piece.z + az * centre) - 0.3)
      // And it is not level: the long arm is levered up, the short one pressed down.
      expect(Math.abs(pose.rock)).toBeCloseTo(WOOD_LEAN, 2)
      expect(Math.sign(pose.rock)).toBe(centre > 0 ? -1 : 1)
      expect(play.woodLean(0)).toBe(centre > 0 ? -WOOD_LEAN : WOOD_LEAN)
    }
  })

  it('no T: a piece of wood let go on a tower lies through it leaning, and is level again when the tower is gone', () => {
    const play = fresh()
    aside(play)
    tower(play.field, 1, 4, 0, 1)
    const piece = play.things.wood[1], start = { x: piece.x, z: piece.z }
    play.press({ kind: 'wood', index: 1 })
    play.dragStart()
    for (let i = 1; i <= 30; i++) {
      play.drag(start.x + ((1 - start.x) * i) / 30, start.z + ((4 - start.z) * i) / 30, 0)
      play.step(DT)
    }
    play.release()
    steps(play, 3)
    expect(Math.hypot(piece.x - 1, piece.z - 4)).toBeLessThan(0.3)
    expect(Math.abs(play.woodPose(1).rock)).toBeCloseTo(WOOD_LEAN, 2)
    expect(play.woodPose(1).y).toBeLessThan(play.ground(1, 4) - 0.3)
    // The same leaning when the game is opened again: it is read from the sand, not remembered.
    expect(play.parked(2).woodPose(1).rock).toBeCloseTo(play.woodLean(1), 6)
    // On level sand it lies level.
    const level = fresh()
    steps(level, 1)
    expect(level.woodLean(0)).toBe(0)
    expect(level.woodLean(1)).toBe(0)
  })
})
