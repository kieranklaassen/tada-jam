import { draw } from './layout'
import { JOIN_SECONDS, TRICKS, nextTrick } from './motion'
import { pictureOf, type Picture, type Spot } from './picture'
import { WIDE } from './figures'
import { boundFor, finalSpot, type Act, type Cast, type Play, type Sounded } from './plays'
import { Scene, type Beat } from './scene'
import type { Rect } from './stage'
import { type Kind, VOICES, callSeconds } from './voices'
import type { World } from './world'

// What is on the page while the game is played, on the game's own time. It
// holds the picture of the saved world (picture.ts), the play that is running
// on it, if any (plays.ts), and the small things that move by themselves:
// lids that lift, a row that makes room, someone on the hill doing a trick.
//
// A play runs on the template's scene.ts: each act is a beat that writes its
// progress here, and a touch finishes the scene, which lands every act at its
// end. The world has already changed when a play starts, so the play is only
// ever a view of a saved state catching up with it, and when it is over the
// page is exactly the picture of that state. No renderer and no sound.

const NEVER = -Infinity
const ease = (t: number) => t * t * (3 - 2 * t)
const clamp = (t: number) => Math.max(0, Math.min(1, t))

/** Someone on the hill, and what it is in the middle of. */
/** Someone on the hill. `callAt` is when its call starts; with `notesAt` it sounds single notes at those times instead of its whole call (joining in on the beats or in the gaps of another's call). */
export type Standing = { kind: Kind; pressedAt: number; callAt: number; notesAt: number[] | null; trick: number; trickAt: number; lastTrick: number; joinAt: number }
/** What hops up where a finger landed on nothing to tap: scraps of paper on the page, leaves on the hill, chips on the stone. */
export type Scrap = { x: number; y: number; at: number; turn: number; of: 'hill' | 'stone' | 'page' }
export const SCRAP_SECONDS = 0.9

/** Where a cast member is at this moment of its play, and how much of it shows. */
export type Posed = Spot & { visible: boolean; alpha: number; air: number; turn: number; lid: number; burst: number | null }

/** The state of one cast member of a play, from the progress of each act. A pure function, so a test can ask it anything. */
/** How far a rolling egg travels for each radian it turns: about the half of its width. */
const ROLLS_ON = 56

export function poseOf(cast: Cast, play: Play, progress: readonly number[], begun: readonly boolean[]): Posed {
  const posed: Posed = { ...cast.from, visible: cast.shown, alpha: 1, air: 0, turn: 0, lid: 0, burst: null }
  let from: Spot = cast.from
  play.acts.forEach((act, i) => {
    if (act.who !== cast.id || !begun[i]) return
    const p = progress[i]
    posed.visible = true
    if (act.do === 'go' || act.do === 'fly' || act.do === 'slide' || act.do === 'roll') {
      const t = act.do === 'fly' ? p : ease(p)
      posed.x = from.x + (act.to.x - from.x) * t
      posed.y = from.y + (act.to.y - from.y) * t
      posed.size = from.size + (act.to.size - from.size) * t
      if (act.do === 'go' && p < 1) {
        posed.air = Math.abs(Math.sin(Math.PI * act.hops * p))
        posed.y -= posed.air * Math.min(46, posed.size * 0.3)
      } else if (act.do === 'fly' && p < 1) {
        posed.y -= Math.sin(Math.PI * p) * 150
        posed.turn = (1 - p) * -3.2
      } else if (act.do === 'roll' && p < 1) {
        // It turns as far as it travels, as a thing that rolls on the ground does, and comes to rest upright.
        posed.turn = ((act.to.x - from.x) * (1 - t)) / ROLLS_ON
      }
      if (p >= 1) from = act.to
    } else if (act.do === 'fade') {
      posed.y -= 70 * ease(p)
      posed.alpha = 1 - clamp((p - 0.4) / 0.6)
      if (p >= 1) posed.visible = false
    } else if (act.do === 'sink') {
      posed.size = from.size * (1 - 0.5 * ease(p))
      if (p >= 1) posed.visible = false
    } else if (act.do === 'burst') {
      posed.burst = p
      if (p >= 1) posed.visible = false
    } else if (act.do === 'wake') posed.lid = p
  })
  return posed
}

export class Show {
  now = 0
  picture: Picture
  play: Play | null = null
  /** How far each act of the play has got, 0 to 1, and whether it has begun. */
  progress: number[] = []
  begun: boolean[] = []
  /** A play the game started by itself while the child was idle: it is not the child's doing and does not count as play. */
  idle = false
  standing = new Map<number, Standing>()
  /** Where each spot of the row is drawn: it follows the picture, so a row that grows makes room smoothly. */
  xs = new Map<string, number>()
  /** How tall each one in the row is drawn: a grown one makes itself smaller smoothly when a fourth joins the row. */
  sizes = new Map<string, number>()
  /** How far each hide's lid is lifted. */
  lids = new Map<string, number>()
  /** When each spot of the row was last pressed. */
  pressed = new Map<string, number>()
  scraps: Scrap[] = []
  private scene: Scene | null = null
  /** When the play that is running started. */
  private began = 0
  /**
   * Calls of a play that gave way to a touch while they sounded. A voice that has begun is heard to its end, so
   * whoever called goes on moving in its shape for as long: the thing of the picture it is, or is on its way to be.
   */
  echoes: { who: string; kind: Kind; inside: boolean; at: number; lasts: number; sounds: number }[] = []
  /** The calls already handed over to be sounded, each with the moment it starts: such a voice sounds, whatever ends the play before that moment. */
  private handed: { at: number; kind: Kind }[] = []
  /** What is still to sound. A sound of the running play goes when the play gives way; any other is heard out. */
  private pending: (Sounded & { ofPlay?: boolean })[] = []
  private rng: number

  /** The page as a saved world is found: everything standing, nothing in motion. */
  constructor(world: World, view: Rect) {
    this.rng = world.rng
    this.picture = pictureOf(world, view)
    this.settle()
  }

  private roll(): number {
    const next = draw(this.rng)
    this.rng = next.rng
    return next.value
  }

  /** Everything that eases is put where it belongs at once. */
  private settle() {
    this.xs.clear(); this.lids.clear(); this.sizes.clear()
    for (const thing of this.picture.things) {
      if ('slot' in thing) { this.xs.set(thing.key, thing.x); this.sizes.set(thing.key, thing.size); this.lids.set(thing.key, thing.heard ? 1 : 0) }
    }
    this.follow()
  }

  /** Whoever stands on the hill now is known here, and whoever has left is forgotten. */
  private follow() {
    const places = new Set<number>()
    for (const thing of this.picture.things) {
      if (!('place' in thing)) continue
      places.add(thing.place)
      const was = this.standing.get(thing.place)
      if (!was || was.kind !== thing.kind) this.standing.set(thing.place, { kind: thing.kind, pressedAt: NEVER, callAt: NEVER, notesAt: null, trick: 0, trickAt: NEVER, lastTrick: -1, joinAt: NEVER })
    }
    for (const place of [...this.standing.keys()]) if (!places.has(place)) this.standing.delete(place)
    for (const key of [...this.xs.keys()]) if (!this.picture.things.some((thing) => thing.key === key)) { this.xs.delete(key); this.sizes.delete(key); this.lids.delete(key); this.pressed.delete(key) }
  }

  /** The world changed, or the surface did: the picture is read again. A new spot of the row starts where it stands. */
  retarget(world: World, view: Rect) {
    this.picture = pictureOf(world, view)
    for (const thing of this.picture.things) {
      if (!('slot' in thing)) continue
      if (!this.xs.has(thing.key)) { this.xs.set(thing.key, thing.x); this.sizes.set(thing.key, thing.size); this.lids.set(thing.key, thing.heard ? 1 : 0) }
    }
    this.follow()
  }

  /** Starts a play. `save` puts the outcome into storage first, at once (scene.ts): the world has changed already. */
  start(play: Play, save: () => void, idle = false) {
    this.finish()
    this.play = play
    this.idle = idle
    this.progress = play.acts.map(() => 0)
    this.begun = play.acts.map(() => false)
    const beats: Beat[] = play.acts.map((act, i) => ({ at: act.at, lasts: act.lasts, play: (progress: number) => { this.progress[i] = progress; this.begun[i] = true } }))
    this.scene = new Scene(beats)
    this.began = this.now
    this.scene.start(this.now, save)
    this.pending = [...this.pending, ...play.sounds.map((sound) => ({ ...sound, at: this.now + sound.at, ofPlay: true }))]
    this.scene.update(this.now)
  }

  /** A touch: the play ends now, every act lands where it was going, and what it had still to sound is dropped. */
  finish() {
    this.keepCalls()
    this.landed()
    this.scene?.finish()
    this.scene = null
    this.play = null
    this.idle = false
    // What someone on the hill was tapped for is not the play's: its call, and each note of a join, still sounds.
    this.pending = this.pending.filter((sound) => !sound.ofPlay)
  }

  /**
   * A play is over: whatever of the row it showed on its way stands in its spot again, and takes up from there
   * what it does when it has been heard (its lid lifts again, a grown one steps out again), without a jump.
   */
  private landed() {
    for (const key of this.play?.hidden ?? []) if (key.startsWith('slot:')) this.lids.set(key, 0)
  }

  /** The calls of the running play that still sound are kept as echoes, on the thing of the picture that calls. */
  private keepCalls() {
    const play = this.play
    if (!play) return
    const hill = this.picture.things.flatMap((thing) => ('place' in thing ? [{ kind: thing.kind, as: thing.what, place: thing.place }] : []))
    for (const act of play.acts) {
      if (act.do !== 'call') continue
      const at = this.began + act.at, sounds = callSeconds(VOICES[act.kind])
      // Kept if it sounds now, or has been handed over to sound in a moment: either way it will be heard.
      const willSound = this.now >= at || this.handed.some((one) => one.kind === act.kind && Math.abs(one.at - at) < 1e-6)
      if (!willSound || this.now >= at + sounds) continue
      // Someone of the cast is the thing of the picture it was on its way to be: the one on the hill, the one who
      // asks at the stone, the grown one back in its spot of the row. Anything else is itself.
      const place = boundFor(play, act.who, hill), end = play.cast.some((one) => one.id === act.who) ? finalSpot(play, act.who) : null
      const stands = end ? this.picture.things.find((thing) => !('place' in thing) && Math.abs(thing.x - end.x) < 0.5 && Math.abs(thing.y - end.y) < 0.5) : undefined
      const who = place !== null ? `hill:${place}` : stands ? stands.key : act.who
      if (!this.picture.things.some((thing) => thing.key === who) || this.echoes.some((one) => one.who === who && one.at === at)) continue
      this.echoes.push({ who, kind: act.kind, inside: act.inside, at, lasts: act.lasts, sounds })
    }
  }

  /** Whether someone has come out of a hide in the running play and is on stage: the one who asks then has it to look at, and asks no more. */
  get met(): boolean {
    const play = this.play
    return play !== null && play.cast.some((cast) => cast.id === 'out') && play.acts.some((act, i) => act.who === 'out' && this.begun[i])
  }

  /** Whether the choir of the running play has begun: someone has been told to turn to the front. From then on everyone faces front. */
  get choir(): boolean {
    return this.play !== null && this.play.acts.some((act, i) => act.do === 'face' && this.begun[i])
  }

  get playing(): boolean {
    return this.play !== null
  }

  /** Whether anything the child set going is still moving: a play, a trick, a scrap of paper. */
  get moving(): boolean {
    if (this.play && !this.idle) return true
    if (this.scraps.length > 0 || this.echoes.length > 0) return true
    for (const one of this.standing.values()) if (this.now - one.trickAt < (TRICKS[one.kind][one.trick]?.seconds ?? 0) || this.now - one.joinAt < JOIN_SECONDS[one.kind] || this.now < this.callEnds(one)) return true
    return false
  }

  /** Sounds from outside a play: a tap on someone on the hill, or on nothing. */
  sound(sounds: readonly Sounded[]) {
    this.pending.push(...sounds.map((sound) => ({ ...sound, at: this.now + sound.at })))
  }

  /** The sounds that are due within `horizon` seconds from now, each with how long from now it starts. They are handed over once. */
  due(horizon: number): (Sounded & { after: number })[] {
    const out = this.pending.filter((sound) => sound.at <= this.now + horizon).map((sound) => ({ ...sound, after: Math.max(0, sound.at - this.now) }))
    for (const sound of out) if ('call' in sound) this.handed.push({ at: sound.at, kind: sound.call.kind })
    this.pending = this.pending.filter((sound) => sound.at > this.now + horizon)
    return out
  }

  /**
   * The place on the hill that a figure of the running play under this point is on its way to: a tap on someone
   * who has just come out, or on the one beside it, is a tap on the one it is, wherever the scene has it.
   */
  bound(x: number, y: number, hill: World['hill']): number | null {
    const play = this.play
    if (!play) return null
    for (let i = play.cast.length - 1; i >= 0; i--) {
      const cast = play.cast[i], place = boundFor(play, cast.id, hill)
      if (place === null) continue
      const posed = poseOf(cast, play, this.progress, this.begun), half = Math.max(50, (WIDE[cast.kind] * posed.size) / 2)
      if (posed.visible && x >= posed.x - half && x <= posed.x + half && y <= posed.y && y >= posed.y - Math.max(100, posed.size)) return place
    }
    return null
  }

  /**
   * A call of the running play that is sounding now, by anyone but whoever stands, or is on its way to stand, in
   * `place` on the hill: how long it has sounded and how long it still will. The play gives way to a touch, but
   * a voice that has begun is heard to its end, so someone on the hill who is tapped meanwhile joins in with it.
   */
  sounding(place?: number, hill: World['hill'] = []): { remaining: number; since: number } | null {
    let heard: { remaining: number; since: number } | null = null
    // A voice that outlasted its play is another's call as well, for as long as it sounds.
    for (const echo of this.echoes) {
      const since = this.now - echo.at, remaining = echo.sounds - since
      if (echo.who !== `hill:${place}` && since >= 0 && remaining > 0 && (!heard || remaining > heard.remaining)) heard = { remaining, since }
    }
    for (const act of this.play?.acts ?? []) {
      if (act.do !== 'call' || (place !== undefined && (act.who === `hill:${place}` || boundFor(this.play!, act.who, hill) === place))) continue
      const since = this.now - this.began - act.at, remaining = callSeconds(VOICES[act.kind]) - since
      if (since >= 0 && remaining > 0 && (!heard || remaining > heard.remaining)) heard = { remaining, since }
    }
    return heard
  }

  /** Someone on the hill whose call is sounding now, other than the one in `but`. */
  calling(but: number): Standing | undefined {
    for (const [place, one] of this.standing) if (place !== but && this.now - one.callAt >= 0 && this.now < this.callEnds(one)) return one
    return undefined
  }

  /** When the call of someone on the hill is over: after its last note. */
  private callEnds(one: Standing): number {
    return one.notesAt ? Math.max(...one.notesAt) + VOICES[one.kind].length : one.callAt + callSeconds(VOICES[one.kind])
  }

  /**
   * A finger on someone on the hill: it calls, and joins in if another is calling, or else does a trick, never
   * the same one twice running. Returns how many seconds of the other's call are still to come when it joins in,
   * and null when it does a trick. `callsAfter` is told that, and how long the other's call has sounded already,
   * and says when its own call starts, for the picture of it: one number for its whole call, a list for single notes.
   * `heard` is a call of a play that was sounding when the finger landed (`sounding`), if nobody on the hill calls.
   */
  poke(place: number, callsAfter: (remaining: number | null, since: number) => number | number[] = () => 0.03, heard: { remaining: number; since: number } | null = null): number | null {
    const one = this.standing.get(place)
    if (!one) return null
    one.pressedAt = this.now
    const other = this.calling(place)
    const remaining = other ? this.callEnds(other) - this.now : heard ? heard.remaining : null
    const after = callsAfter(remaining, other ? this.now - other.callAt : heard ? heard.since : 0)
    one.callAt = this.now + (typeof after === 'number' ? after : Math.min(...after))
    one.notesAt = typeof after === 'number' ? null : after.map((at) => this.now + at)
    if (remaining !== null) one.joinAt = this.now
    else {
      one.trick = nextTrick(one.kind, one.lastTrick, this.roll())
      one.lastTrick = one.trick
      one.trickAt = this.now
    }
    return remaining
  }

  /** How far a hide leans towards a neighbour whose call is sounding now: the ones beside it lean in. */
  leaning(key: string, x: number): number {
    let lean = 0
    for (const echo of this.echoes) {
      const progress = (this.now - echo.at) / echo.lasts, other = this.xs.get(echo.who)
      if (echo.who !== key && echo.who.startsWith('slot:') && progress >= 0 && progress < 1 && other !== undefined) lean += Math.sign(other - x) * 0.1 * Math.sin(Math.PI * progress)
    }
    this.play?.acts.forEach((act, i) => {
      if (act.do !== 'call' || act.who === key || !act.who.startsWith('slot:') || !this.begun[i] || this.progress[i] >= 1) return
      const other = this.xs.get(act.who)
      if (other !== undefined) lean += Math.sign(other - x) * 0.1 * Math.sin(Math.PI * this.progress[i])
    })
    return lean
  }

  /** A finger on someone on the hill who does not call or do a trick for it at once (the second of a round): it squashes under the finger all the same. */
  squash(place: number) {
    const one = this.standing.get(place)
    if (one) one.pressedAt = this.now
  }

  /** A finger on a spot of the row. */
  press(key: string) {
    this.pressed.set(key, this.now)
  }

  /** A finger where nothing can be tapped: something small hops up there, by what it landed on. */
  flick(x: number, y: number, of: Scrap['of'] = 'page') {
    this.scraps.push({ x, y, at: this.now, turn: this.roll() * 6.28, of })
    if (this.scraps.length > 12) this.scraps.shift()
  }

  /** Moves everything on by `dt` seconds of the game's own time. */
  step(dt: number) {
    this.now += dt
    if (this.scene) {
      this.scene.update(this.now)
      if (!this.scene.running) { this.landed(); this.scene = null; this.play = null; this.idle = false }
    }
    const towards = 1 - Math.exp(-dt * 14)
    for (const thing of this.picture.things) {
      if (!('slot' in thing)) continue
      const x = this.xs.get(thing.key) ?? thing.x, lid = this.lids.get(thing.key) ?? 0
      this.xs.set(thing.key, Math.abs(thing.x - x) < 0.05 ? thing.x : x + (thing.x - x) * (1 - Math.exp(-dt * 9)))
      const size = this.sizes.get(thing.key) ?? thing.size
      this.sizes.set(thing.key, Math.abs(thing.size - size) < 0.05 ? thing.size : size + (thing.size - size) * (1 - Math.exp(-dt * 9)))
      const to = thing.heard ? 1 : 0
      this.lids.set(thing.key, Math.abs(to - lid) < 0.002 ? to : lid + (to - lid) * towards)
    }
    this.scraps = this.scraps.filter((scrap) => this.now - scrap.at < SCRAP_SECONDS)
    this.echoes = this.echoes.filter((echo) => this.now - echo.at < Math.max(echo.lasts, echo.sounds))
    this.handed = this.handed.filter((one) => this.now - one.at < 2)
  }

  /** Whether a thing of the picture is left out for now because the play shows it on its way. */
  hidden(key: string): boolean {
    return this.play !== null && this.play.hidden.includes(key)
  }

  /** The acts of the play that are running now on a cast member or a thing, each with its progress. */
  acting(who: string): { act: Act; progress: number }[] {
    const out: { act: Act; progress: number }[] = []
    // A call that outlasted its play goes on as it was: the same picture, from where it had got to.
    for (const echo of this.echoes) {
      const progress = (this.now - echo.at) / echo.lasts
      if (echo.who === who && progress >= 0 && progress < 1) out.push({ act: { at: 0, lasts: echo.lasts, who, do: 'call', kind: echo.kind, inside: echo.inside }, progress })
    }
    this.play?.acts.forEach((act, i) => { if (act.who === who && this.begun[i] && this.progress[i] < 1) out.push({ act, progress: this.progress[i] }) })
    return out
  }

  /** How far off the page a thing that is still to arrive stands: 1 before it starts, 0 when it is there. */
  away(key: string): number {
    if (!this.play) return 0
    const i = this.play.acts.findIndex((act) => act.who === key && act.do === 'arrive')
    return i < 0 ? 0 : this.begun[i] ? 1 - ease(this.progress[i]) : 1
  }

  /** The picture with everything that moves left out. Two shows of one world that have settled give the same. */
  still(): unknown {
    return {
      things: this.picture.things.map((thing) => ({ ...thing, x: 'slot' in thing ? Math.round((this.xs.get(thing.key) ?? thing.x) * 10) / 10 : thing.x, lid: 'slot' in thing ? Math.round((this.lids.get(thing.key) ?? 0) * 100) / 100 : 0 })),
      playing: this.playing,
      scraps: this.scraps.length,
    }
  }
}
