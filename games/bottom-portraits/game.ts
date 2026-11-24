import type { Note } from './audio'
import { CAST, FIGURES, type Id } from './cast'
import { EASEL, HUNG, NAILS, SHOWN, SPOTS, STEPS, type P3 } from './layout'
import { ACT_SECONDS, TEMPERS, act, clamp, ease, fly, hold, idle, poke, want } from './motion'
import { restMaestro, restPose, settle, type MaestroPose, type Pose } from './pose'
import { Scene, type Beat } from './scene'
import { actOf, affronts, sideOf, sights, type Act } from './sight'
import { NAIL_COUNT, arrangementOf, at as whoAt, move, paint, placeOf, seated, sendTo, turnOne, turnTable, type Arrangement, type Place, type Table } from './table'
import { ACTS, HOPS, SOUNDS, landing, press, winding, type SoundName } from './voices'

// The game with no browser in it: the table, everyone's body in time, the
// painter, and the scenes. The touch path (play.ts) calls what a finger
// means; the view reads `poses`, `maestro`, `easel`, `nails` and the rest.

export type Cue = { notes: readonly Note[]; scene: boolean }
type Flight = { from: P3; high: number; /** How far it swings out of the straight way, so two can pass. */ bow: number; start: number; lasts: number; yaw: number; landed: boolean }
type Body = {
  /** Where its stand has got to and where it is going, in radians, unwrapped. */
  yaw: number; yawV: number; goal: number
  twist: number; twistV: number
  squash: number; squashV: number
  poked: number
  act: { kind: Act; t: number; weight: number } | null
  flight: Flight | null
  gaze: number
}
/** Something that answers by itself and changes nothing. */
export type Small = 'table' | 'floor' | 'step' | 'window' | 'pots' | 'shown' | 'easel' | 'maestro' | 'key'

const Q = Math.PI / 2
const STEP = 1 / 120
export const HANG_S = 0.8
/** The plane in front of everything in which a carried one hangs. */
export const CARRY_Z = 5.2
/** When the painting's beats start and how long they take. */
export const PAINTING = { measure: 0, dabs: 0.6, back: 2.4, spin: 2.8, answer: 3.5, react: 3.75, gap: 0.35, secret: 1.5, secretLasts: 4 } as const
const FLECKS = 6
const COLOURS: Readonly<Record<Id, string>> = { elephant: '#7f95ad', hen: '#f3ead6', hippo: '#a688b4', pig: '#eda0a2', giraffe: '#eeb044', crocodile: '#6fa84f', board: '#d3622e' }

export class Game {
  time = 0
  readonly cues: Cue[] = []
  /** A touch ended a scene: what is left of its sounds is cut off. */
  hushed = false
  dirty = false
  urgent = false
  readonly poses = {} as Record<Id, Pose>
  readonly maestro: MaestroPose = restMaestro()
  readonly bodies = {} as Record<Id, Body>
  /** What is left of the table's turn, in radians, and how often it has been turned. */
  swing = 0
  turned = 0
  keyUp: number
  keySpin = 0
  keySquash = 1
  easel = { ...EASEL, roll: 0, size: 1, tile: -1 }
  readonly nails: { hung: boolean; swing: number; drop: number }[]
  flecks: { x: number; y: number; z: number; r: number; colour: string }[] = []
  /** Portraits the view has yet to paint. */
  readonly wanted: { arrangement: Arrangement; tile: number }[] = []
  /** The one in the child's hand, and where its foot is being held. */
  hand: { id: Id; at: P3; from: Place } | null = null
  /** What the child has found by doing it, this visit: the guidance shows each once. */
  readonly done = new Set<'paint' | 'turn' | 'bring' | 'key'>()
  scene: Scene | null = null
  /** Seconds the picture has been on its way to its nail, or null. */
  private hanging: { t: number; nail: number; from: P3 & { size: number } } | null = null
  private wobble = -1
  private bare = 1
  private readonly swung: number[] = new Array<number>(NAIL_COUNT).fill(-1)
  private mood: { what: 'watch' | 'bottom' | 'face' | 'side' | 'teeth' | 'crane'; since: number; x: number } = { what: 'watch', since: -9, x: 0 }
  private stagecraft: { what: 'measure' | 'dab' | 'back' | 'proud' | 'shocked' | 'secret' | null; k: number } = { what: null, k: 0 }
  private nudged = -9
  private easelSquash = 1

  constructor(readonly table: Table) {
    for (const id of CAST) {
      const yaw = this.facing(id)
      this.bodies[id] = { yaw, yawV: 0, goal: yaw, twist: 0, twistV: 0, squash: 1, squashV: 0, poked: -1, act: null, flight: null, gaze: 0 }
      this.poses[id] = restPose()
    }
    this.nails = table.wall.map((a, n) => ({ hung: a !== null && !(table.finished && n === table.last), swing: 0, drop: 0 }))
    this.repaint()
    if (table.finished) this.easel = { ...SHOWN, yaw: 0, roll: 0, tile: table.last }
    this.keyUp = seated(table).length >= 2 ? 1 : 0
    this.lay()
  }

  /** Every picture is asked for again: on load, and when the browser has lost the sheet they are on. */
  repaint(): void {
    this.table.wall.forEach((arrangement, tile) => { if (arrangement) this.wanted.push({ arrangement, tile }) })
  }

  /** The way a stand faces: on the table its quarter, on the steps turned a little in towards the room as well. */
  private facing(id: Id): number {
    const place = placeOf(this.table, id), turn = this.table.turns[id] * Q
    return place.kind === 'spot' ? turn : turn + (place.n < 3 ? 0.42 : -0.42)
  }

  say(notes: readonly Note[], scene = false): void { this.cues.push({ notes, scene }) }
  sound(name: SoundName, scene = false): void { this.say(SOUNDS[name], scene) }

  private changed(now = false): void { this.dirty = true; this.urgent ||= now }

  /** Where a place is at this moment: a table that is turning carries its places. */
  where(place: Place): P3 {
    if (place.kind === 'step') return STEPS[place.n]
    const p = SPOTS[place.n]
    if (this.swing === 0) return p
    const c = Math.cos(-this.swing), s = Math.sin(-this.swing)
    return { x: p.x * c + p.z * s, y: 0, z: -p.x * s + p.z * c }
  }

  // --- What a finger does -----------------------------------------------------

  /** A landing finger ends a running scene and is spent on it. Returns whether it was. */
  interrupt(): boolean {
    if (!this.scene?.running) return false
    // The old picture reaches its nail before the new one is shown.
    if (this.hanging) this.hang()
    this.scene.finish()
    this.hushed = true
    return true
  }

  /** The finger is on one: its tin gives at once. */
  pressed(id: Id): void {
    const body = this.bodies[id]
    body.squashV -= 2.6
    body.poked = 0
    this.say(press(id))
  }

  /** A tap on one: on the table it winds round a quarter; on the steps it comes over. */
  tapped(id: Id): void {
    const place = placeOf(this.table, id)
    if (place.kind === 'step') { this.done.add('bring'); this.send(id, sendTo(this.table)); return }
    this.alter()
    turnOne(this.table, id)
    const body = this.bodies[id]
    body.goal += Q
    this.say(winding(id))
    this.done.add('turn')
    this.notice(id)
    this.changed()
  }

  /** The whole table goes a quarter round. */
  tappedKey(): boolean {
    if (seated(this.table).length < 2) return false
    this.alter()
    const who = seated(this.table)
    turnTable(this.table)
    this.swing += Q
    this.turned += 1
    for (const id of who) { this.bodies[id].goal += Q; this.bodies[id].yaw += Q }
    this.keySquash = 0.75
    this.sound('table')
    this.done.add('key')
    this.notice(who.sort((a, b) => this.where(placeOf(this.table, a)).z - this.where(placeOf(this.table, b)).z)[0])
    this.changed()
    return true
  }

  /** One is sent to a place, and whoever stands there comes the other way, first. */
  send(id: Id, to: Place): boolean {
    const was = { ...this.poses[id] }
    const moved = move(this.table, id, to)
    if (moved.length === 0) return false
    this.alter()
    const other = moved[1]
    // The one that gives way goes straight, the other round it on the child's side.
    const lasts = Math.max(...moved.map((one) => TEMPERS[one].hop))
    if (other) this.launch(other, this.poses[other], id, 0, lasts)
    this.launch(id, was, other ?? null, other ? 2.9 : 0, lasts)
    this.notice(placeOf(this.table, id).kind === 'spot' ? id : other ?? seated(this.table)[0])
    this.changed()
    return true
  }

  private launch(id: Id, from: P3, pass: Id | null, bow: number, lasts = TEMPERS[id].hop): void {
    const place = placeOf(this.table, id), to = this.where(place), body = this.bodies[id]
    // Over the heads of whoever stands on the way.
    let high = Math.max(from.y, to.y) + 0.7
    for (const other of CAST) {
      if (other === id || other === pass) continue
      const p = this.where(placeOf(this.table, other)), dx = to.x - from.x, dz = to.z - from.z
      const k = clamp(((p.x - from.x) * dx + (p.z - from.z) * dz) / (dx * dx + dz * dz || 1))
      if (Math.hypot(from.x + dx * k - p.x, from.z + dz * k - p.z) < 2.75) high = Math.max(high, p.y + FIGURES[other].height + 0.75)
    }
    body.flight = { from: { x: from.x, y: from.y, z: from.z }, high, bow, start: this.time, lasts, yaw: body.yaw, landed: false }
    body.act = null
    body.goal = this.nearestTurn(body.yaw, this.facing(id))
    this.say(HOPS[id])
  }

  private nearestTurn(yaw: number, goal: number): number {
    const full = Math.PI * 2
    return goal + Math.round((yaw - goal) / full) * full
  }

  // --- Carrying ---------------------------------------------------------------

  take(id: Id, at: P3): void {
    this.hand = { id, at, from: placeOf(this.table, id) }
    const body = this.bodies[id]
    body.act = null
    body.flight = null
    this.holdFrom = { at: this.time, from: { x: this.poses[id].x, y: this.poses[id].y, z: this.poses[id].z } }
    this.sound('lift')
  }
  private holdFrom: { at: number; from: P3 } = { at: 0, from: { x: 0, y: 0, z: 0 } }

  carry(at: P3): void { if (this.hand) this.hand.at = at }

  /** Let go over a place: it goes there, or comes back where it was, in sight and heard. */
  drop(to: Place | null): void {
    const hand = this.hand
    if (!hand) return
    this.hand = null
    if (to && this.send(hand.id, to)) return
    this.launch(hand.id, this.poses[hand.id], null, 0)
    if (to && (to.kind !== hand.from.kind || to.n !== hand.from.n)) this.sound('refuse')
  }

  // --- The painter ------------------------------------------------------------

  /** He is asked for a picture. */
  paint(): void {
    this.alter()
    this.done.add('paint')
    const table = this.table, offset = this.hanging ? HANG_S - this.hanging.t : 0
    const nail = (table.last + 1) % NAIL_COUNT, old = table.wall[nail] !== null
    const arrangement = arrangementOf(table), all = sights(arrangement), secret = affronts(arrangement)
    const beats: Beat[] = []
    const beat = (at: number, lasts: number, play: Beat['play']): void => { beats.push({ at: offset + at, lasts, play }) }
    const cue = (at: number, name: SoundName): void => beat(at, 0, (_, finishing) => { if (!finishing) this.sound(name, true) })
    if (old) {
      cue(0, 'drop')
      beats.push({ at: 0, lasts: 0.7, play: (t) => {
        this.nails[nail].drop = 7 * t * t
        this.nails[nail].swing = 0.35 * Math.sin(t * 9) * t
        if (t >= 1) Object.assign(this.nails[nail], { hung: false, drop: 0, swing: 0 })
      } })
    }
    cue(PAINTING.measure, 'measure')
    beat(PAINTING.measure, 0.6, (t) => { this.stagecraft = t < 1 ? { what: 'measure', k: t } : { what: 'dab', k: 0 } })
    const dabs = PAINTING.back - PAINTING.dabs, bursts = 3
    for (let n = 0; n < bursts; n++) cue(PAINTING.dabs + (dabs / bursts) * n, 'dab')
    const who = seated(table)
    beat(PAINTING.dabs, dabs, (t) => {
      this.stagecraft = { what: 'dab', k: t }
      this.flecks = []
      if (t >= 1) return
      for (let n = 0; n < bursts * FLECKS; n++) {
        const born = (Math.floor(n / FLECKS) + (n % FLECKS) / FLECKS * 0.7) / bursts, age = (t - born) * dabs
        if (age < 0 || age > 0.7) continue
        const side = ((n * 37) % 17) / 8.5 - 1, up = 2.5 + ((n * 53) % 11) / 8
        this.flecks.push({ x: EASEL.x + side * 0.7 + side * age * 0.8, y: EASEL.y + 1.0 + up * age - 4.4 * age * age, z: EASEL.z + 0.35, r: 0.09 * (1 - age * 0.9) + 0.03, colour: COLOURS[who[n % who.length]] })
      }
    })
    cue(PAINTING.back, 'back')
    beat(PAINTING.back, 0.4, (t) => { this.stagecraft = { what: 'back', k: t } })
    beat(PAINTING.back, 0, () => { this.wanted.push({ arrangement, tile: nail }) })
    cue(PAINTING.spin, 'spin')
    beat(PAINTING.spin, 0.7, (t) => {
      const k = ease(t), arc = Math.sin(t * Math.PI)
      this.easel = { x: EASEL.x + (SHOWN.x - EASEL.x) * k, y: EASEL.y + (SHOWN.y - EASEL.y) * k + arc * 0.35, z: EASEL.z + (SHOWN.z - EASEL.z) * k, yaw: EASEL.yaw + (Math.PI * 4 - EASEL.yaw) * k, roll: arc * 0.12, size: 1 + (SHOWN.size - 1) * k, tile: nail }
      if (t >= 1) { this.easel.yaw = 0; this.bare = 1 }
    })
    const behind = all.some((s) => s.id !== 'board' && s.side === 'back' && s.how === 'seen')
    cue(PAINTING.answer, behind ? 'monocle' : 'proud')
    beat(PAINTING.answer, 2.4, (t) => { this.stagecraft = t < 1 ? { what: behind ? 'shocked' : 'proud', k: t } : { what: null, k: 0 } })
    all.forEach((sight, n) => {
      const kind = actOf(sight), id = sight.id, start = PAINTING.react + n * PAINTING.gap
      beat(start, 0, (_, finishing) => { if (!finishing) this.say(ACTS[id][kind], true) })
      beat(start, ACT_SECONDS[id][kind], (t, finishing) => {
        const body = this.bodies[id]
        if (finishing) { if (body.act) body.act.weight = Math.min(body.act.weight, 0.999); return }
        body.act = t < 1 ? { kind, t, weight: 1 } : null
        body.gaze = t < 1 ? hold(t, 0.12, 0.85) : 0
      })
    })
    if (secret) {
      const start = PAINTING.react + (all.length - 1) * PAINTING.gap + PAINTING.secret
      cue(start, 'swivel')
      cue(start + 1.1, 'flap')
      cue(start + 3.0, 'swivel')
      beat(start, PAINTING.secretLasts, (t) => { this.stagecraft = t < 1 ? { what: 'secret', k: t } : { what: null, k: 0 } })
    }
    this.scene = new Scene(beats)
    this.scene.start(this.time, () => { paint(table); this.changed(true) })
  }

  /** The table is about to change, or another picture is asked for: the one that stands shown goes to its nail. */
  private alter(): void {
    if (!this.table.finished) return
    this.table.finished = false
    this.hanging = { t: 0, nail: this.table.last, from: { x: this.easel.x, y: this.easel.y, z: this.easel.z, size: this.easel.size } }
    this.sound('hang')
    this.changed(true)
  }

  /** What has just come round to him, and what he makes of it. */
  private notice(id: Id): void {
    const all = sights(arrangementOf(this.table)), s = all.find((one) => one.id === id)
    const x = s ? SPOTS[s.spot].x : 0
    let what: typeof this.mood.what = 'crane'
    if (s && s.how !== 'hidden' && s.how !== 'hole') {
      const side = sideOf(this.table.turns[id])
      what = id === 'board' ? (side === 'front' ? 'face' : 'crane') : side === 'side' ? 'side' : side === 'back' ? 'bottom' : id === 'crocodile' ? 'teeth' : 'face'
    } else if (s?.how === 'hole') what = 'face'
    this.mood = { what, since: this.time, x }
    // His answer comes as the turn ends, never over the ratchet.
    this.moodDue = what
  }
  private moodDue: typeof this.mood.what | null = null

  // --- Small answers ------------------------------------------------------------

  small(what: Small): void {
    switch (what) {
      case 'table': this.sound('wood'); for (const id of seated(this.table)) this.bodies[id].squashV -= 0.8; this.keySquash = Math.min(this.keySquash, 0.88); break
      case 'floor': this.sound('floor'); break
      case 'step': this.sound('wood'); break
      case 'window': this.sound('glass'); this.mood = { what: 'crane', since: this.time, x: -3 }; break
      case 'pots': this.sound('pots'); this.mood = { what: 'side', since: this.time, x: 2 }; break
      case 'shown': this.sound('swing'); this.wobble = 0; break
      case 'easel': this.sound('wood'); this.easelSquash = 0.9; break
      case 'maestro': this.sound('hmm'); this.nudged = this.time; break
      case 'key': this.sound('wood'); this.keySquash = 0.8; break
    }
  }

  /** A hung picture swings and calls in the voices of those in it. */
  swingPicture(n: number): void {
    const arrangement = this.table.wall[n]
    if (!arrangement || !this.nails[n].hung) return
    this.swung[n] = 0
    const notes: Note[] = [...SOUNDS.swing]
    sights(arrangement).slice(0, 3).forEach((s, k) => { for (const note of press(s.id)) notes.push({ ...note, delay: (note.delay ?? 0) + 0.18 + k * 0.2 }) })
    const first = sights(arrangement)[0]
    for (const note of ACTS[first.id][actOf(first)]) if ((note.delay ?? 0) < 0.9) notes.push({ ...note, peak: note.peak * 0.6, delay: (note.delay ?? 0) + 0.3 })
    this.say(notes)
  }

  // --- Time -------------------------------------------------------------------

  private spare = 0
  step(dt: number): void {
    this.spare += dt
    while (this.spare >= STEP - 1e-9) { this.spare -= STEP; this.tick(STEP) }
    this.lay()
  }

  private tick(dt: number): void {
    this.time += dt
    this.scene?.update(this.time)
    if (this.moodDue && this.time - this.mood.since > 0.42) {
      const what = this.moodDue
      this.moodDue = null
      this.sound(what === 'bottom' ? 'monocle' : what === 'face' ? 'proud' : what === 'side' ? 'hmm' : what === 'teeth' ? 'duck' : 'crane')
    }
    if (this.hanging) {
      this.hanging.t += dt
      if (this.hanging.t >= HANG_S) this.hang()
    } else if (!this.table.finished && !this.scene?.running) {
      this.easel = { ...EASEL, roll: 0, size: 1, tile: -1 }
    }
    this.bare = Math.min(1, this.bare + dt * 3)
    this.swing = this.swing < 0.002 ? 0 : this.swing - Math.min(this.swing, Math.min(this.swing * 5.5, 3.4) * dt)
    const up = seated(this.table).length >= 2 ? 1 : 0
    if (up && this.keyUp === 0 && this.time > 0.1) this.sound('keyUp')
    this.keyUp += Math.sign(up - this.keyUp) * Math.min(Math.abs(up - this.keyUp), dt * 2.6)
    this.keySpin += (this.turned * Math.PI - this.keySpin) * Math.min(1, dt * 5)
    this.keySquash += (1 - this.keySquash) * Math.min(1, dt * 9)
    this.easelSquash += (1 - this.easelSquash) * Math.min(1, dt * 9)
    if (this.wobble >= 0 && (this.wobble += dt) > 1.2) this.wobble = -1
    for (let n = 0; n < NAIL_COUNT; n++) if (this.swung[n] >= 0) {
      this.swung[n] += dt
      this.nails[n].swing = 0.3 * Math.sin(this.swung[n] * 7) * Math.exp(-this.swung[n] * 1.7)
      if (this.swung[n] > 2.6) { this.swung[n] = -1; this.nails[n].swing = 0 }
    }
    for (const id of CAST) this.move(id, dt)
    this.hold(dt)
  }

  private move(id: Id, dt: number): void {
    const body = this.bodies[id], temper = TEMPERS[id]
    // The stand goes round fast and stops dead; the body lags and rocks.
    const was = body.yawV
    body.yawV += ((body.goal - body.yaw) * 190 - body.yawV * 27) * dt
    body.yaw += body.yawV * dt
    body.twistV += (-body.twist * temper.spring - body.twistV * temper.damp - (body.yawV - was) / dt * temper.lag * 0.55) * dt
    body.twist = Math.max(-0.7, Math.min(0.7, body.twist + body.twistV * dt))
    body.squashV += ((1 - body.squash) * 260 - body.squashV * 13) * dt
    body.squash = Math.max(0.8, Math.min(1.16, body.squash + body.squashV * dt))
    if (body.poked >= 0 && (body.poked += dt / 0.6) >= 1) body.poked = -1
    if (body.act && body.act.weight < 1 && (body.act.weight -= dt * 6) <= 0) { body.act = null; body.gaze = 0 }
    if (body.act && body.act.weight < 1) body.gaze = Math.min(body.gaze, body.act.weight)
    const flight = body.flight
    if (flight && this.time >= flight.start + flight.lasts) {
      body.flight = null
      body.squashV -= 3.4
      this.say(landing(id))
    }
  }

  private hang(): void {
    const nail = this.hanging!.nail
    this.hanging = null
    Object.assign(this.nails[nail], { hung: true, drop: 0, swing: 0 })
    this.swung[nail] = 0.02
    this.easel = { ...EASEL, roll: 0, size: 1, tile: -1 }
    this.bare = 0
  }

  /** The painter, from what he is doing and what he has just seen. */
  private hold(dt: number): void {
    const m = this.maestro, t = this.time, goal = restMaestro()
    const age = t - this.mood.since - 0.3, seen = age > 0 && age < 2.4 ? this.mood.what : 'watch'
    const x = this.mood.x * 0.16
    goal.lean = 0.05 + 0.03 * Math.sin(t * 0.9)
    goal.sway = 0.03 * Math.sin(t * 0.63)
    goal.squash = 1 + 0.012 * Math.sin(t * 1.7)
    goal.arm = 0.16 + 0.05 * Math.sin(t * 1.3)
    goal.shake = 0.2 * Math.sin(t * 0.41)
    goal.look = Math.sin(t * 0.7) > 0.3 ? 1 : -0.4
    goal.moustache = 0.06 * Math.sin(t * 2.1)
    let quick = 9
    const blink = t % 4.3
    const what = this.stagecraft.what, k = this.stagecraft.k
    if (what === 'measure') { goal.arm = 1; goal.lid = 0.45; goal.nod = -0.05; goal.lean = 0.14; goal.cock = 0.14 }
    else if (what === 'dab') { goal.arm = 0.45; goal.dab = Math.sin(k * 60) * 0.8; goal.shake = -0.35; goal.nod = 0.15; goal.look = k % 0.34 < 0.12 ? 1 : -1; goal.sway = 0.05 * Math.sin(k * 30); goal.moustache = 0.3 * Math.sin(k * 60); quick = 30 }
    else if (what === 'back') { goal.lean = -0.2; goal.cock = 0.2; goal.arm = 0.1; goal.moustache = 0.5; goal.nod = -0.1 }
    else if (what === 'shocked') { goal.shake = -0.6; goal.up = 0.5; goal.look = -1; goal.monocle = 1; goal.moustache = -0.5; goal.beret = hold(k, 0.08, 0.5) * 1.4; goal.squash = 1 + 0.1 * hold(k, 0.08, 0.3); goal.lean = -0.16; quick = 13 }
    else if (what === 'proud') { goal.shake = -0.45 + 0.1 * Math.sin(k * 20); goal.up = 0.5; goal.nod = -0.14; goal.lid = 0.4; goal.moustache = 1; goal.squash = 1.06; goal.lean = -0.1 }
    else if (what === 'secret') {
      const round = ease(k / 0.16) * (1 - ease((k - 0.8) / 0.18))
      goal.yaw = Math.PI * round
      m.yaw = goal.yaw
      goal.flap = k > 0.26 && k < 0.78 ? 1 : 0
      goal.lean = 0.28 * round; goal.shake = 1.15 * round; goal.look = round; goal.moustache = -0.6 * round; goal.monocle = round > 0.4 ? 1 : 0
      goal.squash = 1 - 0.1 * Math.max(0, Math.sin((k - 0.26) * 40)) * (k > 0.26 && k < 0.45 ? 1 : 0)
      goal.lid = 0.3 * round
      quick = 14
    } else if (seen === 'bottom') { goal.monocle = 1; goal.lean = -0.1; goal.shake = x; goal.lid = 0; goal.up = 0.4; goal.beret = hold(age / 2.4, 0.06, 0.3) ; goal.squash = 1.05; goal.moustache = -0.35; quick = 14 }
    else if (seen === 'face') { goal.moustache = 1; goal.nod = -0.12 + 0.06 * Math.sin(age * 8); goal.shake = x; goal.lean = 0.08; goal.squash = 1.04; goal.lid = 0.3 }
    else if (seen === 'side') { goal.arm = 1; goal.lid = 0.5; goal.cock = 0.22; goal.shake = x; goal.lean = 0.12 }
    else if (seen === 'teeth') { goal.duck = 1.1 * hold(age / 2.4, 0.1, 0.7); goal.up = 0.8; goal.moustache = -0.8; goal.beret = 0.8; goal.squash = 0.9; quick = 16 }
    else if (seen === 'crane') { goal.sway = 0.24 * Math.sin(age * 4.2); goal.squash = 1.08; goal.cock = -0.2 * Math.sin(age * 4.2); goal.look = Math.sin(age * 4.2); goal.moustache = 0.2 }
    const poked = t - this.nudged
    if (poked < 0.9) { goal.beret += 1.2 * Math.max(0, 1 - poked * 2); goal.moustache += Math.sin(poked * 22) * (1 - poked); goal.squash *= 1 - 0.1 * Math.sin(poked * 12) * (1 - poked) }
    if (blink < 0.16) goal.lid = Math.max(goal.lid, Math.sin((blink / 0.16) * Math.PI))
    const toward = (key: keyof MaestroPose, rate: number): void => { m[key] += (goal[key] - m[key]) * Math.min(1, dt * rate) }
    for (const key of Object.keys(goal) as (keyof MaestroPose)[]) toward(key, key === 'dab' || key === 'lid' ? 40 : key === 'monocle' ? 8 : quick)
  }

  /** Everyone's pose as it is seen now. */
  private readonly scratch = restPose()
  private lay(): void {
    for (const id of CAST) {
      const pose = settle(this.poses[id]), body = this.bodies[id], place = placeOf(this.table, id), base = this.where(place)
      const onTable = place.kind === 'spot'
      pose.x = base.x; pose.y = base.y; pose.z = base.z
      pose.yaw = body.yaw - (onTable && !body.flight ? this.swing : 0)
      pose.squash = body.squash
      pose.twist = body.twist
      idle(id, this.time, pose)
      want(id, this.table.turns[id], pose, onTable && this.hand?.id !== id)
      // Something loose goes on wagging after the body has stopped.
      const wag = body.twistV * 0.05
      pose.b += wag * 0.6
      pose.cock += wag * 0.3
      if (body.poked >= 0) poke(id, body.poked, pose)
      if (body.act) {
        const s = Object.assign(this.scratch, restPose()), w = body.act.weight
        act(id, body.act.kind, body.act.t, s)
        pose.squash *= 1 + (s.squash - 1) * w
        for (const key of ['lean', 'tilt', 'twist', 'hop', 'slide', 'nod', 'shake', 'cock', 'a', 'b', 'look', 'up'] as const) pose[key] += s[key] * w
        pose.lid = Math.max(pose.lid, s.lid * w)
      }
      if (body.gaze > 0) {
        // It turns its head and eyes to the picture, as far as a neck goes.
        const round = Math.atan2(SHOWN.x - pose.x, SHOWN.z - pose.z) - pose.yaw, short = Math.atan2(Math.sin(round), Math.cos(round))
        pose.shake += Math.max(-0.5, Math.min(0.5, short)) * body.gaze * 0.8
        pose.up += 0.6 * body.gaze
        pose.look += Math.sign(short) * 0.6 * body.gaze
      }
      if (this.hand?.id === id) {
        const k = clamp((this.time - this.holdFrom.at) / 0.32), from = this.holdFrom.from, to = this.hand.at
        this.arc(pose, from, to, k, Math.max(from.y, to.y, this.headsNear(id, from)))
        pose.tilt += 0.14 * Math.sin(this.time * 7)
        fly(id, 0.5, pose)
        pose.twist -= id === 'board' ? Math.PI : 0
      } else if (body.flight) {
        const f = body.flight, t = clamp((this.time - f.start) / f.lasts)
        this.arc(pose, f.from, base, t, f.high)
        if (f.bow > 0) {
          const dx = base.x - f.from.x, dz = base.z - f.from.z, far = Math.hypot(dx, dz) || 1, side = dx >= 0 ? 1 : -1, out = f.bow * Math.sin(ease((t - 0.1) / 0.8) * Math.PI)
          pose.x -= (side * dz / far) * out
          pose.z += (side * dx / far) * out
        }
        fly(id, t * 0.999, pose)
      }
      pose.lid = clamp(pose.lid)
      pose.squash = Math.max(0.72, Math.min(1.2, pose.squash))
    }
    if (this.hanging) {
      const h = this.hanging, k = ease(h.t / HANG_S), to = NAILS[h.nail], arc = Math.sin(clamp(h.t / HANG_S) * Math.PI)
      this.easel = { x: h.from.x + (to.x - h.from.x) * k, y: h.from.y + (to.y - h.from.y) * k + arc * 1.3, z: h.from.z + (to.z - h.from.z) * k, yaw: 0, roll: arc * 0.2, size: h.from.size + (HUNG - h.from.size) * k, tile: h.nail }
    } else {
      this.easel.roll = this.wobble >= 0 ? 0.13 * Math.sin(this.wobble * 14) * Math.exp(-this.wobble * 3.4) : this.scene?.running ? this.easel.roll : 0
      if (this.easel.tile < 0) this.easel.size = Math.max(0.02, ease(this.bare)) * this.easelSquash
    }
  }

  /** Up, over and down, so that nobody is passed through. */
  private arc(pose: Pose, from: P3, to: P3, t: number, high: number): void {
    const up = ease(t / 0.36), over = ease((t - 0.22) / 0.56), down = ease((t - 0.64) / 0.36)
    pose.x = from.x + (to.x - from.x) * over
    pose.z = from.z + (to.z - from.z) * over
    pose.y = from.y + (high - from.y) * up + (to.y - high) * down
  }

  private headsNear(id: Id, from: P3): number {
    let high = from.y
    for (const other of CAST) {
      const p = this.poses[other]
      if (other !== id && p.z > from.z - 0.5 && Math.abs(p.x - from.x) < 2.6) high = Math.max(high, p.y + FIGURES[other].height + 0.4)
    }
    return high
  }

  /** Whether anything is moving that a still would not show the end of. */
  get busy(): boolean { return this.scene?.running === true || this.hanging !== null || CAST.some((id) => this.bodies[id].flight) }

  /** The game is put away: everything is where a load would have it. */
  park(): void {
    this.hand = null
    if (this.hanging) this.hang()
    this.scene?.finish()
    this.swing = 0
    this.moodDue = null
    this.mood.since = -9
    this.wobble = -1
    this.bare = 1
    this.stagecraft = { what: null, k: 0 }
    this.swung.fill(-1)
    for (const nail of this.nails) nail.swing = 0
    for (const id of CAST) {
      const goal = this.facing(id)
      Object.assign(this.bodies[id], { yaw: goal, yawV: 0, goal, twist: 0, twistV: 0, squash: 1, squashV: 0, poked: -1, act: null, flight: null, gaze: 0 })
    }
    this.keyUp = seated(this.table).length >= 2 ? 1 : 0
    Object.assign(this.maestro, restMaestro())
    this.cues.length = 0
    this.lay()
  }

  get tableYaw(): number { return this.turned * Q - this.swing }
  at(place: Place): Id | null { return whoAt(this.table, place) }
}
