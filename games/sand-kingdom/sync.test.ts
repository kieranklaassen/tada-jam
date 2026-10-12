import { describe, expect, it } from 'vitest'
import { BEACHES, WRONG_GROOVE_X } from './beaches'
import { eelShown } from './folk'
import { deserializeKingdom } from './kingdom'
import type { Target } from './layout'
import { type Heard, type Maker, Play } from './play'
import { JOURNEY_SECONDS } from './sun'

// Sound and picture are one event. Every note the game sounds names who made
// it; this test plays through the day, both scenes and each evening, records
// what every maker looks like in every frame, and fails for a note that
// sounds while its maker is not drawn, or is drawn standing still.

const DT = 1 / 60

/** Everything the view draws of one maker, as numbers: when none of them changes, the maker is drawn standing still. */
function looks(play: Play): Record<Maker, number[]> {
  const folk = play.folk, things = play.things, poses = play.poses
  const crab = folk.crab, star = folk.starfish, eel = folk.eel
  const flight = (fly: { time: number } | null) => (fly ? fly.time : -1)
  const air = [play.grains.length, play.grains.reduce((sum, grain) => sum + grain.y, 0)]
  return {
    finger: [play.field.version, ...air],
    bucket: [things.bucket.x, things.bucket.z, things.bucket.side ? 1 : 0, ['nothing', 'sand', 'water'].indexOf(things.bucket.holds), poses.bucket.hop, poses.bucket.tilt, poses.bucket.perch, poses.bucket.handle, flight(poses.bucket.fly), play.field.version],
    shell: [...things.shells.flatMap((shell) => [shell.x, shell.z, shell.up ? 1 : 0, ['lying', 'pressed', 'bucket', 'tower'].indexOf(shell.state)]), ...poses.shells.flatMap((pose) => [pose.sink, pose.squash, pose.spin, flight(pose.fly)]), play.hat, ...air],
    wood: [...things.wood.flatMap((piece) => [piece.x, piece.z, piece.turn]), ...poses.wood.flatMap((pose) => [pose.rock, pose.lift])],
    sun: [play.sun.t, play.sun.pulse],
    sea: [play.tide, play.wave.front, play.wave.show, play.wetVersion, play.rings.length, play.rings.reduce((sum, ring) => sum + ring.age, 0), play.stain.show, play.field.version, ...air],
    sky: play.clouds.flatMap((cloud) => [cloud.slide, cloud.squash]),
    rock: air,
    log: [...air, ...folk.gulls.birds.map((bird) => bird.y + bird.squash)],
    crab: [crab.x, crab.z, crab.turn, crab.stride, crab.lift, crab.lean, crab.dug, ...crab.claws.flatMap((claw) => [claw.raise, claw.shut]), ...crab.eyes.flatMap((eye) => [eye.out, eye.across, eye.toward]), crab.mouth],
    starfish: [star.x, star.y, star.z, star.spread, star.stretch, star.sway, star.squash, star.turn, ...star.arms, star.wave, star.lookAcross, star.lookUp, star.blink, star.mouth],
    eel: [eel.out, eel.x, eel.y, eel.z, eel.yaw, eel.pitch, eel.dip, eel.nose, eel.lookAcross, eel.lookUp, ...eel.shut, eel.mouth, eel.under ? 1 : 0],
    gulls: folk.gulls.birds.flatMap((bird) => [bird.x, bird.y, bird.z, bird.hop, bird.lean, bird.head, bird.duck, ...bird.wings, bird.beak, bird.squash]),
    small: folk.small.crabs.flatMap((one) => [one.x, one.z, one.stride, one.shown, one.hop]),
  }
}
/** Whether the maker is drawn at all in this frame: for the eel, by the rule the view itself draws it by. */
function shown(play: Play, by: Maker): boolean {
  if (by === 'eel') return eelShown(play.folk.eel)
  if (by === 'small') return play.folk.small.crabs.some((one) => one.shown > 0.2)
  return true
}

type Frame = { time: number; looks: Record<Maker, number[]>; shown: Record<string, boolean> }

class Session {
  readonly frames: Frame[] = []
  readonly notes: Heard[] = []
  private readonly seen = new Set<Heard>()
  constructor(readonly play: Play, readonly name: string) {
    this.snap()
  }
  private snap(): void {
    const play = this.play
    for (const one of play.heard) {
      if (this.seen.has(one)) continue
      this.seen.add(one)
      this.notes.push(one)
    }
    const all = looks(play)
    const visible: Record<string, boolean> = {}
    for (const by of Object.keys(all) as Maker[]) visible[by] = shown(play, by)
    this.frames.push({ time: play.time, looks: all, shown: visible })
  }
  run(seconds: number): this {
    for (let t = 0; t < seconds - 1e-9; t += DT) {
      this.play.step(DT)
      this.snap()
    }
    return this
  }
  tap(target: Target): this {
    this.play.endScene()
    this.play.press(target)
    this.play.tap()
    return this.run(DT)
  }
  drag(target: Target, to: readonly (readonly [number, number])[], seconds = 0.5): this {
    const play = this.play
    play.endScene()
    play.press(target)
    play.dragStart()
    const from: [number, number] = target.kind === 'sand' || target.kind === 'water' ? [target.x, target.z] : target.kind === 'bucket' ? [play.things.bucket.x, play.things.bucket.z] : target.kind === 'shell' ? [play.things.shells[target.index].x, play.things.shells[target.index].z] : target.kind === 'wood' ? [play.things.wood[target.index].x, play.things.wood[target.index].z] : [0, 0]
    const points = [from, ...to], count = Math.round(seconds / DT)
    for (let i = 1; i <= count; i++) {
      const f = (i / count) * (points.length - 1), k = Math.min(points.length - 2, Math.floor(f)), u = f - k
      play.drag(points[k][0] + (points[k + 1][0] - points[k][0]) * u, points[k][1] + (points[k + 1][1] - points[k][1]) * u, 0)
      this.run(DT)
    }
    play.release()
    return this.run(DT)
  }
  /** Every note of one maker that sounded in a frame in which nothing of it was drawn. */
  unseen(by: Maker): string[] {
    const out: string[] = []
    for (const note of this.notes) {
      if (note.by !== by) continue
      const frame = this.frames.find((one) => one.time >= note.at - 1e-6)
      if (frame && !frame.shown[by]) out.push(`${this.name}: ${note.name} at ${note.at.toFixed(2)}`)
    }
    return out
  }
  /** Every note that sounded while its maker was not drawn, or was drawn still from just before it to a little after. */
  stray(): string[] {
    const out: string[] = []
    const frames = this.frames
    for (const note of this.notes) {
      const at = frames.findIndex((frame) => frame.time >= note.at - 1e-6)
      // A note set for later than the session ran is not judged.
      if (at < 0) continue
      const from = Math.max(0, at - 9), to = Math.min(frames.length - 1, at + 15)
      let moved = false, visible = false
      for (let i = from; i <= to; i++) {
        if (frames[i].shown[note.by]) visible = true
        if (i > from && frames[i].looks[note.by].some((value, k) => value !== frames[i - 1].looks[note.by][k])) moved = true
      }
      if (!visible || !moved) out.push(`${this.name}: ${note.name} by ${note.by} at ${note.at.toFixed(2)}${visible ? ' while it is drawn still' : ' while it is not drawn'}`)
    }
    return out
  }
}

const sand = (x: number, z: number): Target => ({ kind: 'sand', x, z })
const fresh = (age: number | null): Play => new Play(deserializeKingdom(null, age), 5)

describe('sound and picture are one event', () => {
  it('through a day of play: every tap and every drag of the grid', { timeout: 20_000 }, () => {
    const s = new Session(fresh(3), 'day')
    s.run(4)
    // The folk and the places, each touched.
    s.tap({ kind: 'folk', who: 'crab', index: 0 }).run(2).tap({ kind: 'folk', who: 'starfish', index: 0 }).run(2.5).tap({ kind: 'folk', who: 'eel', index: 0 }).run(2)
    for (const index of [0, 1, 2]) s.tap({ kind: 'folk', who: 'gull', index }).run(1.2)
    s.tap({ kind: 'rock', x: 4.9, y: 1.4, z: 6.3 }).run(1).tap({ kind: 'log', x: 5, y: 1.2, z: 1.2 }).run(1)
    s.tap({ kind: 'cloud', index: 0 }).run(1).tap({ kind: 'sky', x: 2 }).run(1).tap({ kind: 'water', x: 1, z: -3.4 }).run(1.2)
    // The sand: a dent, a groove, a tap in it, a groove across it, a heap patted.
    s.tap(sand(-1.5, 2)).run(1).drag(sand(-2.5, 3), [[2.5, 3]]).run(1.5).tap(sand(0, 3)).run(1).drag(sand(1, 1.6), [[1, 4.4]]).run(1.5)
    // The bucket: turned out, a tower patted, filled, a second tier, a third, a furrow, over the wood, into the sea.
    const bucket: Target = { kind: 'bucket' }
    s.tap(bucket).run(1.5).tap(bucket).run(1).tap(bucket).run(1.5)
    s.drag(bucket, [[3.4, 3.2]], 0.8).run(1).tap(bucket).run(1.5)
    s.tap(sand(s.play.things.bucket.x - 1.5, s.play.things.bucket.z)).run(1)
    s.drag(bucket, [[2.6, -2.4], [3, -2.9]], 1.2).run(1).drag(bucket, [[2.2, 0.5]], 0.8).run(0.5).tap(bucket).run(2)
    s.drag(bucket, [[s.play.things.wood[1].x, s.play.things.wood[1].z]], 0.8).run(1.5).tap(bucket).run(1)
    // The shells and the wood.
    for (const index of [0, 1, 2]) s.tap({ kind: 'shell', index }).run(0.8)
    s.tap({ kind: 'shell', index: 0 }).run(0.8).drag({ kind: 'shell', index: 1 }, [[-2.2, 4.2]], 0.7).run(1)
    s.tap({ kind: 'wood', index: 0 }).run(2).drag({ kind: 'wood', index: 0 }, [[0, 3]], 0.7).run(1.5)
    s.run(3)
    expect(s.notes.length).toBeGreaterThan(60)
    expect(new Set(s.notes.map((note) => note.by)).size).toBeGreaterThanOrEqual(11)
    expect(s.stray()).toEqual([])
  })

  it('through the sun going down on a kingdom, the evening after it, and the tide going out', { timeout: 30_000 }, () => {
    const s = new Session(new Play(BEACHES.kingdom(7), 5), 'kingdom')
    s.run(1).tap({ kind: 'sun' }).run(JOURNEY_SECONDS + 26)
    expect(s.play.sun.home).toBe('down')
    // Each of the folk touched at its evening place, and the evening left to itself for a while.
    s.tap({ kind: 'folk', who: 'crab', index: 0 }).run(2).tap({ kind: 'folk', who: 'starfish', index: 0 }).run(2.5).tap({ kind: 'folk', who: 'eel', index: 0 }).run(2)
    for (const index of [0, 1, 2]) s.tap({ kind: 'folk', who: 'gull', index }).run(1.2)
    s.run(20)
    s.tap({ kind: 'sun' }).run(JOURNEY_SECONDS + 12)
    expect(s.play.sun.home).toBe('up')
    const makers = new Set(s.notes.map((note) => note.by))
    for (const by of ['sun', 'sea', 'crab', 'starfish', 'eel', 'gulls'] as const) expect(makers.has(by), by).toBe(true)
    expect(s.stray(), s.stray().join(' / ')).toEqual([])
  })

  it('through an evening where each thing built is a little wrong, and one where nothing is built', { timeout: 30_000 }, () => {
    const wrong = new Session(new Play(BEACHES.wrong(7), 5), 'wrong')
    wrong.tap({ kind: 'sun' }).run(JOURNEY_SECONDS + 45)
    for (const who of ['crab', 'starfish', 'eel'] as const) wrong.tap({ kind: 'folk', who, index: 0 }).run(2)
    wrong.run(10)
    expect(wrong.stray(), wrong.stray().join(' / ')).toEqual([])
    const bare = new Session(new Play(deserializeKingdom(null, 7), 5), 'bare')
    bare.tap({ kind: 'sun' }).run(JOURNEY_SECONDS + 30)
    expect(bare.notes.some((note) => note.by === 'small')).toBe(true)
    expect(bare.stray()).toEqual([])
    // An evening found on load, left to itself.
    const found = new Session(new Play(BEACHES['wrong-evening'](7), 5), 'found')
    found.run(40)
    expect(found.stray(), found.stray().join(' / ')).toEqual([])
  })

  it('no sound without sight for the eel: its swish, its sniff and its bloop sound only in a frame in which something of it is drawn', { timeout: 60_000 }, () => {
    const sessions: Session[] = []
    // A plain evening, where the crab walks over its water; a groove with driftwood lying near, which it sniffs
    // at; the same with the wood laid right beside the groove, where it stays under to sniff; a channel with
    // wood afloat along it; and the driftwood laid across, which it goes under.
    sessions.push(new Session(new Play(BEACHES.evening(7), 5), 'evening').run(60))
    sessions.push(new Session(new Play(BEACHES['wrong-evening'](7), 5), 'wood near').run(40))
    for (const [name, x, z] of [['wood beside', WRONG_GROOVE_X + 0.7, 0.2], ['wood beside the end', WRONG_GROOVE_X + 0.5, 1.2], ['wood across', WRONG_GROOVE_X, 0.3]] as const) {
      const s = new Session(new Play(BEACHES['wrong-evening'](7), 5), name)
      sessions.push(s.run(2).drag({ kind: 'wood', index: 1 }, [[x, z]], 0.4).run(50))
    }
    const channel = new Session(new Play(BEACHES.channel(7), 5), 'channel')
    sessions.push(channel.tap({ kind: 'sun' }).run(JOURNEY_SECONDS + 60))
    let swishes = 0, sniffs = 0, bloops = 0
    for (const s of sessions) {
      expect(s.unseen('eel')).toEqual([])
      expect(s.stray()).toEqual([])
      for (const note of s.notes) {
        if (note.by !== 'eel') continue
        if (note.name === 'swish') swishes += 1
        if (note.name === 'sniff') sniffs += 1
        if (note.name === 'bloop') bloops += 1
      }
    }
    // It is heard all the same: a swish with each slide that is seen, a sniff where it is up to sniff, a bloop as it comes up.
    expect(swishes).toBeGreaterThan(40)
    expect(sniffs).toBeGreaterThan(5)
    expect(bloops).toBeGreaterThan(0)
  })
})
