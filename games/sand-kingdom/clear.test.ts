import { describe, expect, it } from 'vitest'
import { BEACHES, MOAT, WALL_X, WALL_Z, WRONG_GROOVE_X } from './beaches'
import { EEL_BODY, EEL_NOSE, FIST_AFTER, type Folk } from './folk'
import { deserializeKingdom } from './kingdom'
import { CRAB_HOME, LOG, LUMPS, rockTop } from './layout'
import { HAT_REACH, Play } from './play'
import { CRAB_TOP, type Part, RIDE_AT, apart, crabRounds, eyeLean, gullSpan, gullTall, highest, lowest, shellTop, starParts } from './solid'
import { JOURNEY_SECONDS } from './sun'
import { type Patch, SHELL_RADIUS, TAKEN, bucketPatch, woodPatches } from './things'
import { FOLK_COME, TIDE_OUT } from './timeline'

// Nothing passes through anything. The game lifts whatever is carried over the
// top of whatever it comes to, walks the folk round what stands in their way,
// and rests each body on what is under it. Each of those is held here in
// every frame of the moments that bring two things together, on the shapes
// the game itself reckons with (solid.ts); solid.test.ts holds those shapes
// to the meshes that are drawn.

const DT = 1 / 60
const fresh = (age: number | null = 7, seed = 1): Play => new Play(deserializeKingdom(null, age), seed)
const steps = (play: Play, seconds: number, each?: () => void): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    play.step(DT)
    each?.()
  }
}

type Thing = { kind: 'shell'; index: number } | { kind: 'wood'; index: number }

/** The longest reach of each shell from its middle, before its size (the scallop, the whelk with its tip, the mussel). */
const SHELL_REACH = [0.58, 0.78, 0.72]
/** A bough as it is drawn: a rod 0.2 thick each way and 1.32 long each way, with a stub that stands 0.42 over its middle. */
const BOUGH = { thick: 0.22, long: 1.12, top: 0.42 } as const
const alongBough = (x: number, z: number, turn: number): Patch[] => [-1, -0.67, -0.33, 0, 0.33, 0.67, 1].map((k) => ({ x: x + Math.cos(turn) * BOUGH.long * k, z: z + Math.sin(turn) * BOUGH.long * k, r: BOUGH.thick }))

/** A body on the beach as it is drawn: the sand it is over, and how high its top stands. */
type Body = { name: string; rounds: Patch[]; top: number; bottom?: number }

/** Everything that stands or lies on the beach but one thing, each as it is drawn now. */
function bodies(play: Play, but: Thing): Body[] {
  const out: Body[] = []
  const bucket = play.things.bucket, pail = play.bucketPose()
  if (bucket.side || Math.abs(pail.turn) > 0.05) out.push({ name: 'the bucket on its side', rounds: [{ x: pail.x, z: pail.z, r: 1.1 }], top: pail.y + 1.0 })
  else {
    // The pail with what is heaped in it, and the bow of its handle over it: a thin bow from one side of the rim
    // to the other, which swings a little way to the back and front where it is highest.
    out.push({ name: 'the bucket', rounds: [{ x: pail.x, z: pail.z, r: 0.66 * pail.wide }], top: pail.y + 1.1 * pail.tall })
    for (const k of [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]) {
      const high = Math.sqrt(1 - k * k)
      out.push({ name: 'the bucket\'s handle', rounds: [{ x: pail.x + k * 0.7 * pail.wide, z: pail.z - 0.17 * high, r: 0.05 + 0.22 * high }], top: pail.y + (0.98 + 0.74 * high) * pail.tall, bottom: pail.y + 0.85 * pail.tall })
    }
  }
  play.things.shells.forEach((shell, index) => {
    if ((but.kind === 'shell' && but.index === index) || shell.state === 'bucket' || play.hat === index) return
    const at = play.shellPose(index)
    out.push({ name: `shell ${index}`, rounds: [{ x: at.x, z: at.z, r: SHELL_REACH[index] * at.wide }], top: at.y + (shell.state === 'tower' ? 0.6 : 0.34) * at.tall })
  })
  play.things.wood.forEach((piece, index) => {
    if (but.kind === 'wood' && but.index === index) return
    const at = play.woodPose(index)
    out.push({ name: `wood ${index}`, rounds: alongBough(at.x, at.z, piece.turn), top: at.y + BOUGH.top })
  })
  const folk = play.folk, crab = folk.crab, star = folk.starfish
  out.push({ name: 'the crab', rounds: crabRounds(crab), top: crab.floor + CRAB_TOP + (play.hat >= 0 ? 0.4 : 0) })
  if (!(star.on === 'rock' && star.move === 'perched')) out.push({ name: 'the starfish', rounds: star.rounds(), top: star.y + highest(starParts(star)), bottom: star.y + lowest(starParts(star)) - 0.02 })
  folk.gulls.birds.forEach((bird, index) => out.push({ name: `gull ${index}`, rounds: [{ x: bird.x, z: bird.z, r: Math.max(gullSpan(bird, index, -1), gullSpan(bird, index, 1)) }], top: bird.y + bird.hop + gullTall(index) }))
  return out
}

/** The sand a shell or a piece of wood is over as it is drawn now, and how high its underside is. */
function drawn(play: Play, thing: Thing): { rounds: Patch[]; under: number; top: number } {
  if (thing.kind === 'shell') {
    const at = play.shellPose(thing.index), shell = play.things.shells[thing.index]
    // The dome lies on its rim, 0.03 under its middle; the other way up it is a dish that rests on its back.
    return { rounds: [{ x: at.x, z: at.z, r: SHELL_REACH[thing.index] * at.wide }], under: at.y - (shell.up ? 0.04 : 0.34 * at.tall), top: at.y + 0.34 * at.tall }
  }
  const at = play.woodPose(thing.index)
  // Held all but level: an end is a hand lower than the middle at most.
  return { rounds: alongBough(at.x, at.z, at.turn), under: at.y - 0.2 - Math.abs(Math.sin(at.rock)) * BOUGH.long, top: at.y + BOUGH.top + Math.abs(Math.sin(at.rock)) * BOUGH.long }
}

/**
 * How deep a carried thing is in whatever stands on the beach now: 0 while it is beside everything, or over the
 * top of what it is over.
 */
function into(play: Play, thing: Thing): { deep: number; what: string } {
  const own = drawn(play, thing)
  let deep = 0, what = ''
  for (const body of bodies(play, thing)) {
    const gap = apart(own.rounds, body.rounds)
    // Under what stands over the sand without reaching down to it (the bow of the handle, the starfish spread on
    // its tower) it is in nothing either.
    if (gap >= 0 || own.under >= body.top || (body.bottom !== undefined && own.top <= body.bottom)) continue
    const sunk = Math.min(-gap, body.top - own.under, body.bottom !== undefined ? own.top - body.bottom : Infinity)
    if (sunk > deep) {
      deep = sunk
      what = `${body.name}: its top ${body.top.toFixed(2)}, the underside of the thing ${own.under.toFixed(2)}, ${(-gap).toFixed(2)} over it`
    }
  }
  return { deep, what }
}

/** Whether it lies beside everything: over none of them. */
function beside(play: Play, thing: Thing): boolean {
  const own = drawn(play, thing)
  return bodies(play, thing).every((body) => apart(own.rounds, body.rounds) >= -1e-6 || (body.bottom !== undefined && own.top <= body.bottom))
}

/** A thing taken by a finger and dragged along a line, a frame at a time; `each` looks at every frame. */
function drag(play: Play, thing: Thing, to: readonly [number, number], seconds: number, each: (doing: string) => void, letGo = true): void {
  const from = thing.kind === 'shell' ? play.things.shells[thing.index] : play.things.wood[thing.index]
  const fromX = from.x, fromZ = from.z, count = Math.round(seconds / DT)
  play.press(thing)
  play.dragStart()
  for (let i = 1; i <= count; i++) {
    play.drag(fromX + ((to[0] - fromX) * i) / count, fromZ + ((to[1] - fromZ) * i) / count, 0)
    play.step(DT)
    each('in the hand')
  }
  if (!letGo) return
  play.release()
  for (let i = 0; i < 60; i++) {
    play.step(DT)
    each('let go')
  }
}

describe('a shell or a piece of wood in the hand', () => {
  /** The first visit's beach with one thing of each kind laid out in a row across the middle, clear of the rocks. */
  const laid = (): Play => {
    const play = fresh()
    Object.assign(play.things.bucket, { x: 0, z: 4.2, holds: 'nothing', side: false })
    Object.assign(play.things.shells[0], { x: -3.2, z: 4.2, state: 'lying' })
    Object.assign(play.things.shells[1], { x: 2.2, z: 4.2, state: 'lying' })
    Object.assign(play.things.shells[2], { x: -1.6, z: 6.6, state: 'lying' })
    Object.assign(play.things.wood[0], { x: -1.6, z: 4.2, turn: Math.PI / 2 })
    Object.assign(play.things.wood[1], { x: 3.9, z: 4.3, turn: 1.2 })
    steps(play, 0.2)
    return play
  }
  const THINGS: readonly Thing[] = [{ kind: 'shell', index: 0 }, { kind: 'shell', index: 1 }, { kind: 'shell', index: 2 }, { kind: 'wood', index: 0 }, { kind: 'wood', index: 1 }]
  const name = (thing: Thing): string => `${thing.kind} ${thing.index}`

  it('rides up and over a bough, a shell and the standing bucket: dragged right along the row, it is in none of them in any frame', { timeout: 60_000 }, () => {
    for (const thing of THINGS) for (const way of [1, -1]) {
      const play = laid()
      const from = thing.kind === 'shell' ? play.things.shells[thing.index] : play.things.wood[thing.index]
      // Right across the row and out the far side, slowly enough that it is over each thing for many frames.
      let worst = { deep: 0, what: '' }, rode = 0
      const look = (doing: string): void => {
        const now = into(play, thing)
        if (now.deep > worst.deep) worst = { deep: now.deep, what: `${now.what}, ${doing}` }
        const held = thing.kind === 'shell' ? play.shellPose(thing.index).y - play.ground(from.x, from.z) : play.woodPose(thing.index).y - play.ground(from.x, from.z)
        rode = Math.max(rode, held)
      }
      drag(play, thing, [way > 0 ? 5 : -4.6, 4.2], 3.2, look)
      expect(worst.deep, `${name(thing)} dragged ${way > 0 ? 'right' : 'left'}: ${worst.what}`).toBeLessThan(0.02)
      // It did go over things: it was well up off the sand on the way.
      if (!(thing.kind === 'shell' && thing.index === 2)) expect(rode, name(thing)).toBeGreaterThan(0.5)
      // Let go at the end of the row it lies beside everything.
      expect(beside(play, thing), name(thing)).toBe(true)
    }
  })

  it('let go over the top of any of them it is carried on across and set down beside, never down through it', { timeout: 60_000 }, () => {
    for (const thing of THINGS) {
      // Over each of the others in turn: dragged straight to it and let go there.
      const targets: { name: string; at: (play: Play) => { x: number; z: number } }[] = [
        { name: 'the bucket', at: (play) => play.things.bucket },
        ...[0, 1, 2].filter((index) => !(thing.kind === 'shell' && thing.index === index)).map((index) => ({ name: `shell ${index}`, at: (play: Play) => play.things.shells[index] })),
        ...[0, 1].filter((index) => !(thing.kind === 'wood' && thing.index === index)).map((index) => ({ name: `wood ${index}`, at: (play: Play) => play.things.wood[index] })),
      ]
      for (const target of targets) for (const share of [0.7, 0.85, 1]) {
        const play = laid()
        const from = thing.kind === 'shell' ? play.things.shells[thing.index] : play.things.wood[thing.index]
        const goal = target.at(play), to: [number, number] = [from.x + (goal.x - from.x) * share, from.z + (goal.z - from.z) * share]
        let worst = { deep: 0, what: '' }
        drag(play, thing, to, 0.8, (doing) => {
          const now = into(play, thing)
          if (now.deep > worst.deep) worst = { deep: now.deep, what: `${now.what}, ${doing}` }
        })
        const doing = `${name(thing)} let go ${share} of the way to ${target.name}`
        expect(worst.deep, `${doing}: ${worst.what}`).toBeLessThan(0.02)
        expect(beside(play, thing), doing).toBe(true)
        const lies = thing.kind === 'shell' ? play.shellPose(thing.index).y : play.woodPose(thing.index).y - 0.18
        expect(lies - play.ground(from.x, from.z), doing).toBeLessThan(0.25)
      }
    }
  })

  for (const thing of [{ kind: 'shell', index: 2 }, { kind: 'wood', index: 0 }] as const) it(`rides over the crab, the gulls and the starfish at evening, and let go on any of them is set down beside: a ${thing.kind === 'shell' ? 'shell' : 'bough'}`, { timeout: 60_000 }, () => {
    // The kingdom at evening: the crab on its ring, the gulls on the wall, the starfish on the tower.
    const goals: { name: string; at: (folk: Folk) => { x: number; z: number } }[] = [
      { name: 'the crab', at: (folk) => folk.crab },
      { name: 'the starfish', at: (folk) => folk.starfish },
      { name: 'the first gull', at: (folk) => folk.gulls.birds[0] },
      { name: 'the last gull', at: (folk) => folk.gulls.birds[2] },
    ]
    for (const goal of goals) for (const letGo of [true, false]) {
      const play = new Play(BEACHES.evening(7), 3)
      steps(play, 14)
      const from = thing.kind === 'shell' ? play.things.shells[thing.index] : play.things.wood[thing.index]
      const startX = from.x, startZ = from.z
      let worst = { deep: 0, what: '' }, over = 0
      const look = (doing: string): void => {
        const now = into(play, thing)
        if (now.deep > worst.deep) worst = { deep: now.deep, what: `${now.what}, ${doing}` }
      }
      // It follows the one it is dragged at for two seconds: the crab walks, and the thing comes after it.
      play.press(thing)
      play.dragStart()
      for (let i = 1; i <= 120; i++) {
        const at = goal.at(play.folk), k = Math.min(1, i / 60)
        play.drag(startX + (at.x - startX) * k, startZ + (at.z - startZ) * k, 0)
        play.step(DT)
        look('in the hand')
        const y = thing.kind === 'shell' ? play.shellPose(thing.index).y : play.woodPose(thing.index).y
        over = Math.max(over, y - play.ground(from.x, from.z))
      }
      if (letGo) {
        play.release()
        steps(play, 1.2, () => look('let go'))
      } else {
        // Taken away: it goes back where it came from, over whatever lies between.
        play.cancel()
        steps(play, 1.2, () => look('taken away'))
      }
      const doing = `${thing.kind} ${thing.index} at ${goal.name}, ${letGo ? 'let go' : 'taken away'}`
      expect(worst.deep, `${doing}: ${worst.what}`).toBeLessThan(0.02)
      expect(over, doing).toBeGreaterThan(0.4)
    }
  })

  it('rides over the crab at its place by day as it does at evening: dragged at the crab it is never in it, goes well up over it, and let go there is set down beside', { timeout: 60_000 }, () => {
    for (const thing of [{ kind: 'shell', index: 2 }, { kind: 'wood', index: 0 }] as const) {
      const play = fresh()
      steps(play, 2)
      const from = thing.kind === 'shell' ? play.things.shells[thing.index] : play.things.wood[thing.index]
      const startX = from.x, startZ = from.z
      let worst = { deep: 0, what: '' }, over = 0
      const look = (doing: string): void => {
        const now = into(play, thing)
        if (now.deep > worst.deep) worst = { deep: now.deep, what: `${now.what}, ${doing}` }
      }
      // It follows the crab for two seconds: the crab sidles off as far as its place goes, and the thing comes after it.
      play.press(thing)
      play.dragStart()
      for (let i = 1; i <= 120; i++) {
        const at = play.folk.crab, k = Math.min(1, i / 60)
        play.drag(startX + (at.x - startX) * k, startZ + (at.z - startZ) * k, 0)
        play.step(DT)
        look('in the hand')
        const y = thing.kind === 'shell' ? play.shellPose(thing.index).y : play.woodPose(thing.index).y
        over = Math.max(over, y - play.ground(from.x, from.z))
      }
      play.release()
      steps(play, 1.2, () => look('let go'))
      const doing = `${thing.kind} ${thing.index} at the crab by day`
      expect(worst.deep, `${doing}: ${worst.what}`).toBeLessThan(0.02)
      expect(over, doing).toBeGreaterThan(0.4)
      expect(beside(play, thing), doing).toBe(true)
      // And it goes where the finger goes, right to the middle of the crab's place: it is not slid round the place.
      const again = fresh()
      steps(again, 2)
      const lies = thing.kind === 'shell' ? again.things.shells[thing.index] : again.things.wood[thing.index]
      const fromX = lies.x, fromZ = lies.z
      let deep = 0
      again.press(thing)
      again.dragStart()
      for (let i = 1; i <= 90; i++) {
        const k = Math.min(1, i / 60)
        again.drag(fromX + (CRAB_HOME.x - fromX) * k, fromZ + (CRAB_HOME.z - fromZ) * k, 0)
        again.step(DT)
        deep = Math.max(deep, into(again, thing).deep)
      }
      expect(Math.hypot(lies.x - CRAB_HOME.x, lies.z - CRAB_HOME.z), doing).toBeLessThan(0.1)
      expect(deep, doing).toBeLessThan(0.02)
      again.cancel()
    }
  })
})

describe('the crab on its way', () => {
  for (const name of ['evening', 'wrong-evening'] as const) for (const first of [0, 4]) it(`never has a leg or a claw over the bucket or a piece of wood, wherever the child sets them down on its bank: ${name}, places ${first} to ${first + 3}`, { timeout: 60_000 }, () => {
    {
      // The bucket and a bough set down at places along the crab's way, one after another, as it walks.
      for (let trial = first; trial < first + 4; trial++) {
        const play = new Play(BEACHES[name](7), 5 + trial)
        steps(play, 6)
        const crab = play.folk.crab
        let least = Infinity, what = ''
        const look = (): void => {
          const rounds = crabRounds(crab)
          const bucket = apart(rounds, [bucketPatch(play.things.bucket)])
          if (bucket < least) {
            least = bucket
            what = 'the bucket'
          }
          play.things.wood.forEach((piece, index) => {
            const gap = apart(rounds, woodPatches(piece))
            if (gap < least) {
              least = gap
              what = `wood ${index}`
            }
          })
        }
        // Ahead of it on its ring: where it will be in a few seconds.
        const turn = (trial / 8) * Math.PI * 2, far = 2.05
        const spot: [number, number] = [MOAT.x + Math.cos(turn) * far, MOAT.z + Math.sin(turn) * far]
        const from = play.things.bucket
        const fromX = from.x, fromZ = from.z
        play.press({ kind: 'bucket' })
        play.dragStart()
        for (let i = 1; i <= 40; i++) {
          play.drag(fromX + ((spot[0] - fromX) * i) / 40, fromZ + ((spot[1] - fromZ) * i) / 40, 0)
          play.step(DT)
        }
        play.release()
        steps(play, 0.6)
        // From here on, with the bucket standing where it was set down, and then a bough beside it.
        steps(play, 20, look)
        const wood = play.things.wood[0], woodX = wood.x, woodZ = wood.z, other: [number, number] = [MOAT.x - Math.cos(turn) * far, MOAT.z - Math.sin(turn) * far]
        play.press({ kind: 'wood', index: 0 })
        play.dragStart()
        for (let i = 1; i <= 40; i++) {
          play.drag(woodX + ((other[0] - woodX) * i) / 40, woodZ + ((other[1] - woodZ) * i) / 40, 0)
          play.step(DT)
        }
        play.release()
        steps(play, 0.6)
        steps(play, 20, look)
        expect(least, `${name}, trial ${trial}: ${what}`).toBeGreaterThan(0)
      }
    }
  })
})

/** A point of the world in the crab's own frame: across it, up from the sand under it, and to its front. It turns, and leans into a run. */
function inCrab(play: Play, x: number, y: number, z: number): [number, number, number] {
  const crab = play.folk.crab, dx = x - crab.x, dz = z - crab.z
  const across = dx * Math.cos(crab.turn) - dz * Math.sin(crab.turn), up = y - crab.floor - crab.lift * 0.35
  return [across * Math.cos(crab.lean) + up * Math.sin(crab.lean), -across * Math.sin(crab.lean) + up * Math.cos(crab.lean), dx * Math.sin(crab.turn) + dz * Math.cos(crab.turn)]
}

/** Points over the skin of a lump, in the world. */
function skin(part: Part, at: { x: number; y: number; z: number }): [number, number, number][] {
  const out: [number, number, number][] = []
  for (let i = 0; i <= 6; i++) for (let j = 0; j < 10; j++) {
    const tip = (i / 6) * Math.PI, round = (j / 10) * Math.PI * 2
    const px = Math.sin(tip) * Math.cos(round), py = Math.cos(tip), pz = Math.sin(tip) * Math.sin(round), m = part.m
    out.push([at.x + part.cx + m[0] * px + m[1] * py + m[2] * pz, at.y + part.cy + m[3] * px + m[4] * py + m[5] * pz, at.z + part.cz + m[6] * px + m[7] * py + m[8] * pz])
  }
  return out
}

describe('the starfish', () => {
  it('rides the crab on top of its shell, with its arms clear of the crab\'s eyes on their stalks, its claws and the shell it wears', { timeout: 60_000 }, () => {
    const play = new Play(BEACHES['wrong-evening'](7), 5)
    const star = play.folk.starfish, crab = play.folk.crab
    let rode = 0, hatted = 0, worst = 0, what = ''
    const note = (deep: number, name: string): void => {
      if (deep > worst) {
        worst = deep
        what = `${name} at ${play.time.toFixed(2)}`
      }
    }
    for (let t = 0; t < 70; t += DT) {
      // Poked now and then, so it curls its arms while it rides.
      if (Math.round(t / DT) % 600 === 300 && star.on === 'crab' && star.move === 'perched') {
        play.press({ kind: 'folk', who: 'starfish', index: 0 })
        play.tap()
      }
      play.step(DT)
      if (!(star.on === 'crab' && star.move === 'perched')) continue
      rode += 1
      if (play.hat >= 0) hatted += 1
      for (const part of starParts(star)) for (const [x, y, z] of skin(part, star)) {
        const [across, up, front] = inCrab(play, x, y, z)
        // On top of the shell: no point of it is under the shell's top where it is over the shell.
        note(shellTop(across, front, crab.lift) - up - 0.03, 'in the crab\'s shell')
        // The eyes: a ball of 0.2 at 1.36 up, 0.3 to either side and 0.22 to the front, on a stalk under it.
        for (const side of [-1, 1]) {
          note(0.2 - Math.hypot(across - side * 0.3, up - 1.36, front - 0.22), 'in an eye of the crab')
          if (up > 0.86 && up < 1.36) note(0.06 - Math.hypot(across - side * 0.3, front - 0.22), 'in an eye stalk of the crab')
          // The claws: a ball of 0.32 with its two fingers standing up from it, held from 0.3 to 1.0 up.
          const low = 0.55 + crab.claws[side < 0 ? 0 : 1].raise * 0.5
          if (up > low - 0.3 && up < low + 0.65) note(0.4 - Math.hypot(across - side * 1.02, front - 0.5), 'in a claw of the crab')
        }
      }
      // The shell the crab wears lies in front of it, on the eyes: no arm is in it.
      if (play.hat >= 0) {
        const hat = play.shellPose(play.hat)
        for (const part of starParts(star)) for (const [x, y, z] of skin(part, star)) {
          if (Math.abs(y - hat.y) < 0.16 * hat.tall) note(0.55 * hat.wide - Math.hypot(x - hat.x, z - hat.z), 'in the crab\'s hat')
        }
      }
    }
    expect(rode).toBeGreaterThan(1200)
    expect(hatted).toBeGreaterThan(60)
    expect(worst, what).toBeLessThanOrEqual(0)
    // Where it stands is behind the eyes, as the game says.
    expect(RIDE_AT.z).toBeLessThan(-0.4)
  })

  /** The starfish and the crab through one part of what brings them together, every frame looked at. */
  const neverInTheCrab = (which: 'the folk come' | 'boughs on the bank, places 0 to 3' | 'boughs on the bank, places 4 to 7' | 'swinging round under an arm'): void => {
    // How far any lump of the starfish is in the crab as it is drawn: its shell, its eyes on their stalks as they
    // lean, its claws, and a shell it wears.
    const into = (play: Play): { deep: number; what: string } => {
      const star = play.folk.starfish, crab = play.folk.crab
      let deep = -Infinity, what = ''
      const note = (now: number, name: string): void => {
        if (now > deep) {
          deep = now
          what = `${name} at ${play.time.toFixed(2)}, the starfish ${star.move} on the ${star.on}`
        }
      }
      const hat = play.hat >= 0 ? play.shellPose(play.hat) : null
      for (const part of starParts(star)) for (const [x, y, z] of skin(part, star)) {
        const [across, up, front] = inCrab(play, x, y, z)
        note(shellTop(across, front, crab.lift) - up, 'in the crab\'s shell')
        for (const side of [-1, 1]) {
          const eye = crab.eyes[side < 0 ? 0 : 1], claw = crab.claws[side < 0 ? 0 : 1]
          // A ball of 0.2 at the end of a stalk 0.46 long that stands 0.9 up, 0.3 to the side and 0.22 to the front.
          const lean = eyeLean(eye.across, eye.toward, side, eye.out, claw.raise), long = 0.46 * (0.12 + 0.88 * eye.out)
          for (const k of [0.25, 0.5, 0.75, 1]) {
            const at = [side * 0.3 + Math.sin(lean.side) * long * k, 0.9 + Math.cos(lean.side) * Math.cos(lean.forward) * long * k, 0.22 + Math.sin(lean.forward) * long * k]
            note((k === 1 ? 0.2 : 0.06) - Math.hypot(across - at[0], up - at[1], front - at[2]), 'in an eye of the crab')
          }
          // A claw as it is held: a ball of 0.32, and its two fingers standing up from it, leaning out as it is raised.
          const middle = 0.55 + claw.raise * 0.5, leanOut = side * claw.raise * -0.5
          const turned = (px: number, py: number): [number, number] => [side * 1.02 + px * Math.cos(leanOut) - py * Math.sin(leanOut), middle + px * Math.sin(leanOut) + py * Math.cos(leanOut)]
          const finger = (from: [number, number], to: [number, number], thick: number): number => {
            const vx = to[0] - from[0], vy = to[1] - from[1], k = Math.min(1, Math.max(0, ((across - from[0]) * vx + (up - from[1]) * vy) / (vx * vx + vy * vy)))
            return thick - Math.hypot(across - from[0] - vx * k, up - from[1] - vy * k, front - 0.5)
          }
          note(0.32 - Math.hypot(across - side * 1.02, (up - middle) / 0.86, (front - 0.5) / 0.7), 'in a claw of the crab')
          note(finger(turned(side * 0.12, 0.11), turned(side * 0.12, 0.61), 0.1), 'in the big finger of a claw of the crab')
          note(finger(turned(side * -0.14, 0.2), turned(side * -0.14 - Math.sin(side * 0.5) * 0.19, 0.32 + Math.cos(0.5) * 0.19), 0.07), 'in the small finger of a claw of the crab')
        }
        if (hat && Math.abs(y - hat.y) < 0.16 * hat.tall) note(0.55 * hat.wide - Math.hypot(x - hat.x, z - hat.z), 'in the crab\'s hat')
      }
      return { deep, what }
    }
    let worst = { deep: -Infinity, what: '' }, near = Infinity
    const look = (play: Play, doing: string): void => {
      const star = play.folk.starfish
      if (star.riding) return
      const now = into(play)
      if (now.deep > worst.deep) worst = { deep: now.deep, what: `${doing}: ${now.what}` }
      if (star.on === 'tower') near = Math.min(near, Math.hypot(play.folk.crab.x - star.x, play.folk.crab.z - star.z))
    }
    // The folk come: the crab is out on its bank first, and the starfish leaps onto the tower beside it. Poked
    // there, it curls and flops while the crab goes by.
    for (const seed of which === 'the folk come' ? [1, 3] : []) {
      const play = new Play(BEACHES.kingdom(7), seed)
      play.press({ kind: 'sun' })
      play.tap()
      let frame = 0
      steps(play, JOURNEY_SECONDS + FOLK_COME.end + 30, () => {
        frame += 1
        const star = play.folk.starfish
        if (frame % 420 === 0 && star.on === 'tower' && star.move === 'perched') {
          play.press({ kind: 'folk', who: 'starfish', index: 0 })
          play.tap()
        }
        look(play, `the folk come, seed ${seed}`)
      })
      expect(play.folk.starfish.on, `seed ${seed}`).toBe('tower')
    }
    // A bough set down on the crab's bank: it steps round it on the tower's side, through the moat, and still
    // not under the arms that hang out over it.
    // The last part is two evenings in which the crab swings right round, to lead with its other side, where an
    // arm hangs over it: it lowers its claws first, and swings only when they are low enough for the arm.
    const places: (readonly [number, number])[] = which === 'the folk come' ? [] : which === 'swinging round under an arm' ? [[1, 14], [7, 40]] : [0, 1, 2, 3].map((k) => [k + (which === 'boughs on the bank, places 0 to 3' ? 0 : 4), 3 + k + (which === 'boughs on the bank, places 0 to 3' ? 0 : 4)] as const)
    for (const [trial, seed] of places) {
      const play = new Play(BEACHES.evening(7), seed)
      steps(play, 6)
      const turn = (trial / 8) * Math.PI * 2
      for (const [index, far] of [[0, 2.3], [1, 2.9]] as const) {
        const wood = play.things.wood[index], fromX = wood.x, fromZ = wood.z, toX = MOAT.x + Math.cos(turn + index * 2.4) * far, toZ = MOAT.z + Math.sin(turn + index * 2.4) * far
        play.press({ kind: 'wood', index })
        play.dragStart()
        for (let i = 1; i <= 40; i++) {
          play.drag(fromX + ((toX - fromX) * i) / 40, fromZ + ((toZ - fromZ) * i) / 40, 0)
          play.step(DT)
          look(play, `a bough dragged, trial ${trial}`)
        }
        play.release()
        steps(play, 14, () => look(play, `a bough on the bank, trial ${trial}`))
      }
    }
    expect(worst.deep, worst.what).toBeLessThanOrEqual(0)
    // And it did come close: within a body's length of the tower's middle.
    expect(near).toBeLessThan(2.6)
  }
  for (const which of ['the folk come', 'boughs on the bank, places 0 to 3', 'boughs on the bank, places 4 to 7', 'swinging round under an arm'] as const) {
    it(`is never in the crab but on its back: under an arm out over the edge of a tower the crab lowers its claw and pulls in its eye, and where that is not room enough it goes round: ${which}`, { timeout: 60_000 }, () => neverInTheCrab(which))
  }

  it('lies on its rock and is never in it: at rest, reaching, flopping, poked into a fist, and as the tide goes out', { timeout: 60_000 }, () => {
    /** How deep the lowest point of any of its lumps is in a rock. */
    const inRock = (play: Play): number => {
      const star = play.folk.starfish
      let deep = 0
      for (const part of starParts(star)) for (const [x, y, z] of skin(part, star)) {
        for (const rock of LUMPS) {
          const dx = (x - rock.x) / rock.rx, dy = (y - rock.y) / rock.ry, dz = (z - rock.z) / rock.rz, inside = 1 - Math.hypot(dx, dy, dz)
          if (inside > 0) deep = Math.max(deep, inside * Math.min(rock.rx, rock.ry, rock.rz))
        }
      }
      return deep
    }
    // By day: it stretches and flops by itself, and is poked.
    const day = fresh()
    let worst = 0
    for (let t = 0; t < 60; t += DT) {
      if (Math.round(t / DT) % 420 === 200) {
        day.press({ kind: 'folk', who: 'starfish', index: 0 })
        day.tap()
      }
      day.step(DT)
      worst = Math.max(worst, inRock(day))
    }
    // Its seat is pressed into the rock by a hair, so it lies on it and not over it.
    expect(worst).toBeLessThan(0.05)
    // From the tower back to its rock as the tide goes out.
    const play = new Play(BEACHES.evening(7), 1)
    steps(play, 2)
    play.press({ kind: 'sun' })
    play.tap()
    let back = 0
    steps(play, JOURNEY_SECONDS + TIDE_OUT.back.at + TIDE_OUT.back.lasts + 10, () => {
      back = Math.max(back, inRock(play))
    })
    expect(play.folk.starfish.on).toBe('rock')
    expect(back).toBeLessThan(0.05)
  })

  it('shuts its face before an arm is over it: its eyes are under their lids from before any arm curls until every arm is open again', () => {
    const play = fresh()
    const star = play.folk.starfish
    steps(play, 1)
    play.press({ kind: 'folk', who: 'starfish', index: 0 })
    play.tap()
    let shutFirst = false, curled = 0
    for (let t = 0; t < 3; t += DT) {
      play.step(DT)
      const most = Math.max(...star.arms)
      if (most < 0.09 && star.blink === 1 && t < FIST_AFTER + DT) shutFirst = true
      if (most > 0.1) {
        curled += 1
        expect(star.blink, `at ${t.toFixed(2)}`).toBe(1)
        expect(star.mouth, `at ${t.toFixed(2)}`).toBeLessThan(0.05)
      }
    }
    expect(shutFirst).toBe(true)
    expect(curled).toBeGreaterThan(40)
  })
})

describe('the gulls', () => {
  /** How far each bird reaches into the bird beside it now: 0 while every pair keeps its room. */
  const crowd = (play: Play): number => {
    const birds = play.folk.gulls.birds
    let deep = 0
    for (let a = 0; a < birds.length; a++) for (let b = 0; b < birds.length; b++) {
      const left = birds[a], right = birds[b]
      if (a === b || left.x >= right.x || Math.abs(left.z - right.z) > 1.5) continue
      const feetA = left.y + left.hop, feetB = right.y + right.hop
      if (feetA >= feetB + gullTall(b) || feetB >= feetA + gullTall(a)) continue
      deep = Math.max(deep, gullSpan(left, a, 1) + gullSpan(right, b, -1) - (right.x - left.x))
    }
    return deep
  }

  it('never reach a stretched wing, a turned head or a lean into the bird beside them: on the log by day, poked, ducking and shuffling', () => {
    const play = fresh()
    let worst = 0, widest = 0
    for (let t = 0; t < 90; t += DT) {
      const frame = Math.round(t / DT)
      // A poke at each in turn, a finger beside them, and grains thrown their way.
      if (frame % 400 === 100) {
        play.press({ kind: 'folk', who: 'gull', index: Math.floor(frame / 400) % 3 })
        play.tap()
      }
      if (frame % 700 === 350) {
        play.press({ kind: 'sand', x: 5, z: 6.5 })
        play.tap()
      }
      play.step(DT)
      worst = Math.max(worst, crowd(play))
      for (const bird of play.folk.gulls.birds) widest = Math.max(widest, bird.wings[0], bird.wings[1])
    }
    expect(worst).toBeLessThanOrEqual(0)
    // They did stretch: a wing was out.
    expect(widest).toBeGreaterThan(0.5)
  })

  it('never reach into each other on a wall, flat or lumpy, as they land, slip and flap back up', { timeout: 60_000 }, () => {
    for (const name of ['evening', 'wrong-evening'] as const) {
      const play = new Play(BEACHES[name](7), 2)
      let worst = 0
      steps(play, 60, () => {
        worst = Math.max(worst, crowd(play))
      })
      expect(worst, name).toBeLessThanOrEqual(0)
      expect(play.folk.gulls.birds.some((bird) => bird.place === 'wall'), name).toBe(true)
    }
    expect(WALL_X.to - WALL_X.from).toBeGreaterThan(2)
    expect(WALL_Z).toBeGreaterThan(0)
  })

  it('never reach a wing, a beak or a lean into the crab as it goes by beside their wall', { timeout: 60_000 }, () => {
    let least = Infinity, what = '', beside = 0
    for (let seed = 1; seed <= 8; seed++) {
      const play = new Play(BEACHES.evening(7), seed)
      const crab = play.folk.crab
      let frame = 0
      steps(play, 30, () => {
        frame += 1
        // Poked now and then, so that they flap and stretch while the crab is there.
        if (frame % 200 === 100) {
          play.press({ kind: 'folk', who: 'gull', index: (frame / 200) % 3 | 0 })
          play.tap()
        }
        const top = crab.floor + CRAB_TOP, rounds = crabRounds(crab)
        play.folk.gulls.birds.forEach((bird, index) => {
          if (bird.y + bird.hop >= top) return
          for (const side of [-1, 1]) {
            const span = gullSpan(bird, index, side)
            // Along the bird's reach to that side, from its middle to its tip: no point of it is over the crab.
            for (const k of [0.25, 0.5, 0.75, 1]) {
              const gap = apart(rounds, [{ x: bird.x + side * span * k, z: bird.z, r: 0 }])
              if (gap < 0.5) beside += 1
              if (gap < least) {
                least = gap
                what = `seed ${seed} at ${play.time.toFixed(2)}: gull ${index}, side ${side}, span ${span.toFixed(2)}`
              }
            }
          }
        })
      })
    }
    expect(beside).toBeGreaterThan(100)
    expect(least, what).toBeGreaterThan(0)
  })

  it('and the starfish keep apart: no arm of it is over a gull\'s place while it leaps to the tower and lies there', () => {
    const play = new Play(BEACHES.kingdom(7), 1)
    play.press({ kind: 'sun' })
    play.tap()
    let least = Infinity
    steps(play, JOURNEY_SECONDS + FOLK_COME.end + 30, () => {
      const star = play.folk.starfish
      for (const part of starParts(star)) for (const [x, y, z] of skin(part, star)) {
        play.folk.gulls.birds.forEach((bird, index) => {
          const feet = bird.y + bird.hop
          if (y < feet - 0.05 || y > feet + gullTall(index)) return
          const reach = Math.max(gullSpan(bird, index, -1), gullSpan(bird, index, 1))
          least = Math.min(least, Math.hypot(x - bird.x, z - bird.z) - reach)
        })
      }
    })
    expect(play.folk.starfish.on).toBe('tower')
    expect(least).toBeGreaterThan(0)
  })
})

describe('the bored small crabs', () => {
  it('walk on the sand and stand on a rock they come to, never in it', { timeout: 60_000 }, () => {
    const play = fresh(7, 3)
    play.press({ kind: 'sun' })
    play.tap()
    let deep = 0, shown = 0
    steps(play, JOURNEY_SECONDS + FOLK_COME.end + 40, () => {
      for (const crab of play.folk.small.crabs) {
        if (crab.shown < 0.5) continue
        shown += 1
        // Its feet: under its middle and a body's half width to either side.
        for (const across of [-0.8, 0, 0.8]) {
          const x = crab.x + across * crab.size, top = rockTop(x, crab.z)
          if (top > -Infinity) deep = Math.max(deep, top - (play.ground(crab.x, crab.z) + crab.hop))
        }
      }
    })
    expect(shown).toBeGreaterThan(600)
    expect(deep).toBeLessThan(0.05)
  })
})

describe('the shell the crab wears', () => {
  it('is lifted before a leg comes to it, rests on the crab\'s two eyes, and is put back where it lay', { timeout: 60_000 }, () => {
    const play = new Play(BEACHES['wrong-evening'](7), 5)
    const crab = play.folk.crab
    const lay = play.things.shells.map((shell) => ({ x: shell.x, z: shell.z }))
    let worn = 0, put = 0, was = -1, near = Infinity
    for (let t = 0; t < 90; t += DT) {
      play.step(DT)
      // A shell lying on the sand is never under the crab: the nearest its legs and claws come to one is the reach it is lifted at.
      play.things.shells.forEach((shell, index) => {
        if (shell.state === 'bucket' || shell.state === 'tower' || play.hat === index || play.poses.shells[index].fly) return
        near = Math.min(near, apart(crabRounds(crab), [{ x: shell.x, z: shell.z, r: SHELL_RADIUS }]))
      })
      if (play.hat >= 0) {
        worn += 1
        const pose = play.shellPose(play.hat)
        if (!(play as unknown as { hatFly: unknown }).hatFly) {
          // On its head: over the eyes, whose tops are 1.56 over the sand, and its underside on them.
          const [across, up, front] = inCrab(play, pose.x, pose.y, pose.z)
          expect(Math.abs(across)).toBeLessThan(0.12)
          expect(front).toBeGreaterThan(0.2)
          expect(up - 0.16 * pose.tall).toBeGreaterThan(1.5)
          expect(up - 0.16 * pose.tall).toBeLessThan(1.64)
        }
      } else if (was >= 0) {
        put += 1
        // Put back where it lay: its place on the sand has not changed.
        expect(play.things.shells[was].x).toBeCloseTo(lay[was].x, 6)
        expect(play.things.shells[was].z).toBeCloseTo(lay[was].z, 6)
      }
      was = play.hat
    }
    expect(worn).toBeGreaterThan(100)
    expect(put).toBeGreaterThanOrEqual(1)
    expect(near).toBeGreaterThan(HAT_REACH - 0.15)
  })

  it('is lifted while the folk are still coming too: on its way to its bank the crab never has a leg over a shell that lies there', { timeout: 60_000 }, () => {
    for (const seed of [1, 3, 5, 7]) {
      const play = new Play(BEACHES.wrong(7), seed)
      const crab = play.folk.crab
      steps(play, 1)
      play.press({ kind: 'sun' })
      play.tap()
      let near = Infinity, worn = 0
      steps(play, JOURNEY_SECONDS + 30, () => {
        if (play.hat >= 0) worn += 1
        play.things.shells.forEach((shell, index) => {
          if (shell.state === 'bucket' || shell.state === 'tower' || play.hat === index || play.poses.shells[index].fly) return
          near = Math.min(near, apart(crabRounds(crab), [{ x: shell.x, z: shell.z, r: SHELL_RADIUS }]))
        })
      })
      expect(worn, `seed ${seed}`).toBeGreaterThan(30)
      expect(near, `seed ${seed}`).toBeGreaterThan(HAT_REACH - 0.15)
    }
  })

  it('is one at a time: the next is not lifted until the last is down, and wearing one the crab stops at another, puts the first down and has no leg over the second', { timeout: 60_000 }, () => {
    // A bough on the bank either side sends the crab along the top of the beach, where two shells lie a few steps
    // apart: it puts one back and comes to the next in the same breath.
    let both = 0, near = Infinity, what = ''
    const wore = new Set<number>()
    for (const seed of [1, 3, 5, 7]) {
      const play = new Play(BEACHES.evening(7), seed)
      const crab = play.folk.crab
      steps(play, 6)
      const look = (): void => {
        const aloft = play.things.shells.filter((_, index) => play.hat === index || play.poses.shells[index].fly !== null).length
        if (aloft > 1) both += 1
        if (play.hat >= 0) wore.add(play.hat)
        play.things.shells.forEach((shell, index) => {
          if (shell.state === 'bucket' || shell.state === 'tower' || play.hat === index || play.poses.shells[index].fly) return
          const gap = apart(crabRounds(crab), [{ x: shell.x, z: shell.z, r: SHELL_RADIUS }])
          if (gap < near) {
            near = gap
            what = `seed ${seed} at ${play.time.toFixed(2)}: shell ${index}, wearing ${play.hat}`
          }
        })
      }
      for (const [index, toX, toZ] of [[0, -2.3, 3.45], [1, 2.14, 1.49]] as const) {
        const wood = play.things.wood[index], fromX = wood.x, fromZ = wood.z
        play.press({ kind: 'wood', index })
        play.dragStart()
        for (let i = 1; i <= 40; i++) {
          play.drag(fromX + ((toX - fromX) * i) / 40, fromZ + ((toZ - fromZ) * i) / 40, 0)
          play.step(DT)
          look()
        }
        play.release()
        steps(play, 20, look)
      }
    }
    expect(wore.size).toBeGreaterThan(1)
    expect(both).toBe(0)
    expect(near, what).toBeGreaterThan(0)
    // A second shell laid at its feet while it wears one: it stops, puts the first down clear of itself, and only
    // then lifts the second.
    const play = new Play(BEACHES['wrong-evening'](7), 1)
    steps(play, 3)
    const first = play.hat
    expect(first).toBeGreaterThanOrEqual(0)
    const second = first === 2 ? 0 : 2
    Object.assign(play.things.shells[second], { x: play.folk.crab.x + 0.3, z: play.folk.crab.z + 0.2, state: 'lying' })
    let changed = false, stood = Infinity
    const from = { x: play.folk.crab.x, z: play.folk.crab.z }
    steps(play, 6, () => {
      const aloft = play.things.shells.filter((_, index) => play.hat === index || play.poses.shells[index].fly !== null).length
      if (aloft > 1) both += 1
      if (play.hat === second && !changed) {
        changed = true
        stood = Math.hypot(play.folk.crab.x - from.x, play.folk.crab.z - from.z)
        // The first lies clear of the crab's legs, out of the reach it is lifted at.
        const put = play.things.shells[first]
        expect(apart(crabRounds(play.folk.crab), [{ x: put.x, z: put.z, r: SHELL_RADIUS }])).toBeGreaterThan(HAT_REACH)
      }
    })
    expect(changed).toBe(true)
    expect(both).toBe(0)
    // It stood where it was while it changed them.
    expect(stood).toBeLessThan(0.1)
  })

  it('stays on the crab\'s eyes when the crab is poked: its stalks are not pulled in from under the shell, and never bounce up into it', { timeout: 60_000 }, () => {
    const play = new Play(BEACHES['wrong-evening'](7), 5)
    const crab = play.folk.crab
    let poked = 0, low = Infinity, high = 0
    for (let t = 0; t < 90; t += DT) {
      // Poked again and again while it wears the shell.
      if (play.hat >= 0 && !(play as unknown as { hatFly: unknown }).hatFly && Math.round(t / DT) % 40 === 0) {
        play.press({ kind: 'folk', who: 'crab', index: 0 })
        play.tap()
        poked += 1
      }
      play.step(DT)
      if (play.hat >= 0 && !(play as unknown as { hatFly: unknown }).hatFly && poked > 0) for (const eye of crab.eyes) {
        low = Math.min(low, eye.out)
        high = Math.max(high, eye.out)
      }
    }
    expect(poked).toBeGreaterThan(3)
    // Once the shell is on them the stalks are out their whole length, no less and no more.
    expect(high).toBeLessThanOrEqual(1)
    expect(low).toBeGreaterThan(0.9)
  })
})

/** Points over the eel's head and neck as they are drawn, before its place, its turn and its size (view/folkView.ts). */
const EEL_SKIN: [number, number, number][] = []
for (let i = 0; i < 12; i++) for (const lift of [-0.8, -0.4, 0, 0.4, 0.8]) {
  const round = (i / 12) * Math.PI * 2, wide = Math.sqrt(1 - lift * lift)
  EEL_SKIN.push([Math.cos(round) * wide * 0.36, Math.sin(round) * wide * 0.31, lift * 0.58])
}
for (let i = 0; i < 8; i++) for (let k = 0; k <= 5; k++) EEL_SKIN.push([Math.cos((i / 8) * Math.PI * 2) * 0.27, Math.sin((i / 8) * Math.PI * 2) * 0.27 - 0.02, -0.3 - (1.3 * k) / 5])
/** Where those points are now, or none while the eel is not drawn. */
function eelSkin(play: Play): [number, number, number][] {
  const eel = play.folk.eel
  if (!(eel.where === 'rock' ? eel.out > 0.02 : eel.dip < 0.97 && !eel.under)) return []
  const push = eel.nose * EEL_NOSE, cy = Math.cos(eel.yaw), sy = Math.sin(eel.yaw), cp = Math.cos(eel.pitch), sp = Math.sin(eel.pitch)
  return EEL_SKIN.map(([x, y, z]) => {
    const across = x * 1.25, up = (y * cp - z * sp) * 1.25, along = (y * sp + z * cp) * 1.25
    return [eel.x + sy * push + across * cy + along * sy, eel.y + up, eel.z + cy * push - across * sy + along * cy]
  })
}

describe('the eel', () => {
  it('is in no rock but its own, no pebble and not in the gulls\' log: out of both ways from its rock, poked, swimming at evening and going home', { timeout: 60_000 }, () => {
    // Every rock that is drawn but the one it lives in, each taken a twentieth bigger than its lump.
    const others = LUMPS.filter((rock) => !(rock.of === 'eel' && rock.big))
    expect(others.length).toBe(LUMPS.length - 1)
    for (const name of ['first', 'kingdom', 'wrong-evening', 'channel'] as const) {
      const play = new Play(BEACHES[name](7), 3)
      let worst = 0, what = '', drawn = 0
      const ways = new Set<string>()
      const look = (): void => {
        const eel = play.folk.eel, skin = eelSkin(play)
        if (skin.length > 0) {
          drawn += 1
          ways.add(eel.where === 'rock' ? `hole ${eel.hole}` : 'groove')
        }
        for (const [x, y, z] of skin) {
          let deep = 0
          for (const rock of others) deep = Math.max(deep, 1.05 - Math.hypot((x - rock.x) / rock.rx, (y - rock.y) / rock.ry, (z - rock.z) / rock.rz))
          if (x > LOG.x0 && x < LOG.x1) deep = Math.max(deep, LOG.radius - Math.hypot(y - (LOG.top - LOG.radius), z - LOG.z))
          for (const post of [LOG.x0 + 0.55, LOG.x1 - 0.55]) if (y < LOG.top) deep = Math.max(deep, 0.22 - Math.hypot(x - post, z - (LOG.z - 0.05)))
          if (deep > worst) {
            worst = deep
            what = `${name}: ${deep.toFixed(3)} at ${x.toFixed(2)}, ${z.toFixed(2)} after ${play.time.toFixed(2)} s, ${eel.where} ${eel.hole}, out ${eel.out.toFixed(2)}`
          }
        }
      }
      const poke = (): void => {
        play.press({ kind: 'folk', who: 'eel', index: 0 })
        play.tap()
      }
      const tapSun = (): void => {
        play.press({ kind: 'sun' })
        play.tap()
      }
      steps(play, 3, look)
      for (let i = 0; i < 4; i++) {
        poke()
        steps(play, 2.5, look)
      }
      tapSun()
      steps(play, JOURNEY_SECONDS + 40, look)
      for (let i = 0; i < 3; i++) {
        poke()
        steps(play, 3, look)
      }
      tapSun()
      steps(play, JOURNEY_SECONDS + 25, look)
      expect(worst, what).toBe(0)
      expect(drawn).toBeGreaterThan(600)
      // Both ways out of its rock were seen, and on a beach with water for it, the eel in it.
      expect(ways.has('hole 0') && ways.has('hole 1'), [...ways].join()).toBe(true)
      if (name !== 'first') expect(ways.has('groove'), name).toBe(true)
    }
  })

  it('is right under the water, and not drawn, before the bucket or a bough afloat is over any of it', { timeout: 60_000 }, () => {
    for (const thing of ['bucket', 'wood'] as const) for (let when = 4; when <= 20; when += 4) {
      const play = new Play(BEACHES.evening(7), 5)
      steps(play, when)
      // Set down in the channel the eel swims, a little way up from the bridge.
      const to: [number, number] = [MOAT.x, 1.2]
      const from = thing === 'bucket' ? play.things.bucket : play.things.wood[0], fromX = from.x, fromZ = from.z
      let worst = 0
      const look = (): void => {
        const eel = play.folk.eel
        if (eel.where !== 'groove' || eel.dip >= 0.97) return
        const fx = Math.sin(eel.yaw), fz = Math.cos(eel.yaw)
        const over: Patch[] = thing === 'bucket' ? [bucketPatch(play.things.bucket)] : woodPatches({ ...play.things.wood[0], x: play.woodPose(0).x, z: play.woodPose(0).z })
        const pose = thing === 'bucket' ? play.bucketPose() : play.woodPose(0)
        // Only what is down at the water: a thing carried high over the eel is over it, not in it.
        if (pose.y - play.ground(pose.x, pose.z) > 0.6) return
        for (const [along, r] of EEL_BODY) worst = Math.max(worst, -apart([{ x: eel.x + fx * along, z: eel.z + fz * along, r: r * 0.6 }], over))
      }
      play.press(thing === 'bucket' ? { kind: 'bucket' } : { kind: 'wood', index: 0 })
      play.dragStart()
      for (let i = 1; i <= 50; i++) {
        play.drag(fromX + ((to[0] - fromX) * i) / 50, fromZ + ((to[1] - fromZ) * i) / 50, 0)
        play.step(DT)
        look()
      }
      play.release()
      steps(play, 25, look)
      expect(worst, `${thing} set down at ${when}`).toBeLessThanOrEqual(0)
    }
    expect(TAKEN.length).toBeGreaterThan(0)
  })

  it('goes under for a shell that stands low in the side of a tower beside its water, and not for one further off than the shell reaches', () => {
    const play = new Play(BEACHES.evening(7), 7)
    const shell = play.things.shells.findIndex((each) => each.state === 'tower')
    expect(shell).toBeGreaterThanOrEqual(0)
    const at = play.shellPose(shell), over = (play as unknown as { world: { shellOver: (x: number, z: number, r: number) => boolean } }).world.shellOver
    // The shell stands on its edge facing the child: it is in the way of a head in the moat right in front of it
    // and to either side as far as it is long, and of nothing at the head of the channel.
    const head = EEL_BODY[0][1]
    expect(over(at.x, at.z + 0.6, head)).toBe(true)
    expect(over(at.x + 0.9, at.z + 0.3, head)).toBe(true)
    expect(over(at.x, at.z + 1.25, head)).toBe(false)
    expect(over(at.x + 1.4, at.z, head)).toBe(false)
    // Where it lies now the eel is up, and stays clear of the shell all evening.
    let worst = 0, up = 0
    steps(play, 60, () => {
      const eel = play.folk.eel
      if (eel.where !== 'groove' || eel.dip >= 0.97) return
      up += 1
      const fx = Math.sin(eel.yaw), fz = Math.cos(eel.yaw), now = play.shellPose(shell)
      for (const [along, r] of EEL_BODY) worst = Math.max(worst, -apart([{ x: eel.x + fx * along, z: eel.z + fz * along, r: r * 0.6 }], [{ x: now.x, z: now.z, r: SHELL_REACH[shell] * now.wide }]))
    })
    expect(up).toBeGreaterThan(300)
    expect(worst).toBeLessThanOrEqual(0)
  })

  it('sniffs at driftwood without touching it: with a bough lying right beside its groove, no part of it that is drawn is in the wood', { timeout: 60_000 }, () => {
    for (const beside of [0.45, 0.6, 0.8, 1.1]) {
      const saved = BEACHES['wrong-evening'](7)
      // A bough lying along the groove, this far from its middle line: nearer than the eel's head is wide.
      saved.wood[1] = { x: WRONG_GROOVE_X + beside, z: -0.2, turn: Math.PI / 2 }
      const play = new Play(saved, 3)
      let worst = 0, up = 0
      steps(play, 60, () => {
        const eel = play.folk.eel
        if (eel.where !== 'groove' || eel.dip >= 0.97) return
        up += 1
        const fx = Math.sin(eel.yaw), fz = Math.cos(eel.yaw), push = eel.nose * EEL_NOSE
        const wood = woodPatches({ ...play.things.wood[1], x: play.woodPose(1).x, z: play.woodPose(1).z }).map((patch) => ({ ...patch, r: 0.22 }))
        for (const [along, r] of EEL_BODY) worst = Math.max(worst, -apart([{ x: eel.x + fx * (along + push), z: eel.z + fz * (along + push), r }], wood))
      })
      expect(worst, `a bough ${beside} from the groove`).toBeLessThanOrEqual(0)
      // Far enough off, it is up and sniffing.
      if (beside >= 1.1) expect(up).toBeGreaterThan(200)
    }
  })
})
