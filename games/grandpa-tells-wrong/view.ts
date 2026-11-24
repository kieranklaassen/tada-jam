import { type Tier } from './config'
import { blob, bump, clamp, ease, jolt, lerp, limb, line, shape, soft, span } from './draw'
import { paintFigure, restPose, type Pose } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import type { Point } from './input'
import { BAND, COCK, CROWN, LAMP, LIFT, NEARER, SPOT, SUN, THING_AT, pictureAt } from './layout'
import { Loom, dye, type G, type MakeSheet } from './loom'
import { ACT, HIT, PROTEST, actPose, idlePose, type Stance } from './moves'
import { CARRY, DUSK_LASTS, HAPPENS, MORNING_LASTS, TELL, UNRAVEL, WICK, demoMove, type Play, type PlayEvent } from './play'
import { paintThing } from './props'
import { fit } from './stage'
import { BARE, THINGS, YARD, after, same, type Coat, type Thing, type Who, type World, type Worn } from './tale'
import { SKY, paintCock, paintLamp, paintSun, paintYard, type Hour } from './yard'

// One frame of the cloth from the evening as it stands.

type Bit = { x: number; y: number; vx: number; vy: number; t: number; lasts: number; size: number; colour: string; fall: number; spin: number }

const SPLASH: Record<Thing, { colours: readonly string[]; n: number; fall: number; speed: number }> = {
  mud: { colours: [dye('walnut', 2), dye('walnut', 1), dye('walnut', 3)], n: 22, fall: 900, speed: 330 },
  water: { colours: [dye('indigo', 3), dye('indigo', 2), dye('cream', 3)], n: 30, fall: 800, speed: 380 },
  jam: { colours: [dye('madder', 2), dye('madder', 3), dye('madder', 1)], n: 14, fall: 700, speed: 210 },
  pillow: { colours: [dye('cream', 3), dye('cream', 2), dye('ochre', 3)], n: 34, fall: 60, speed: 260 },
  pants: { colours: [dye('cream', 3), dye('indigo', 2)], n: 6, fall: 500, speed: 160 },
  balloon: { colours: [dye('violet', 3), dye('violet', 2)], n: 8, fall: -80, speed: 160 },
}

/** A glove puppet is head and shoulders: how big, and how far below the picture's top its feet would be. */
const PUPPET: Record<Who, { size: number; feet: number; x: number }> = {
  goose: { size: 0.52, feet: 178, x: -20 },
  pig: { size: 0.6, feet: 148, x: 0 },
  granny: { size: 0.6, feet: 208, x: 0 },
  grandpa: { size: 0.48, feet: 206, x: 0 },
  moon: { size: 0.78, feet: 74, x: 0 },
}

/** Roughly what one frame puts down, for the overlay. */
const STILL = 4

export class View {
  private readonly loom: Loom
  private readonly hours: (CanvasImageSource | null)[] = [null, null, null, null]
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private bits: Bit[] = []
  private most = 150
  private ribs = true
  private chance = 1
  private every = 1
  private tick = 0
  private strung = ''
  /** The sky shown, the one before it, and how much of the new one is woven. */
  private hour: Hour | -1 = -1
  private was: Hour = 0
  private woven = 1
  private sun: Point = { ...SUN[0] }
  drawn = 0

  constructor(seed: number, make: MakeSheet) {
    this.loom = new Loom(make)
    this.chance = (seed % 2147483646) + 1
  }

  setTier(tier: Tier): void {
    this.ribs = tier.ribs
    this.most = tier.bits
    this.every = tier.every
    this.strung = ''
  }

  clear(): void {
    this.bits = []
  }

  private random(): number {
    this.chance = (this.chance * 48271) % 2147483647
    return this.chance / 2147483647
  }

  hear(events: readonly PlayEvent[], play: Play): void {
    for (const event of events) {
      if (event.kind === 'land' && !event.small) {
        const at = play.crown(event.who)
        this.burst(event.thing, at.x, at.y + 60, 1, HIT)
      } else if (event.kind === 'splat') this.burst(event.thing, event.at.x, event.at.y, 0.8, 0)
    }
  }

  private burst(thing: Thing, x: number, y: number, k: number, delay: number): void {
    const { colours, n, fall, speed } = SPLASH[thing]
    for (let i = 0; i < n * k && this.bits.length < this.most; i++) {
      const a = this.random() * Math.PI * 2, v = speed * (0.3 + this.random() * 0.7)
      this.bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.5, t: -delay, lasts: fall < 100 ? 1.8 : 0.9, size: 7 + this.random() * 9, colour: colours[i % colours.length], fall, spin: this.random() * 6 })
    }
  }

  step(dt: number, play: Play | null): void {
    for (const bit of this.bits) {
      bit.t += dt
      if (bit.t < 0) continue
      bit.vy += bit.fall * dt
      if (bit.fall < 100) { bit.vx *= 1 - 1.6 * dt; bit.vy *= 1 - 1.2 * dt }
      bit.x += bit.vx * dt
      bit.y += bit.vy * dt
    }
    this.bits = this.bits.filter((bit) => bit.t < bit.lasts)
    if (!play) return
    this.settle(play)
    const want = hourOf(play)
    if (want !== this.hour) {
      this.was = Math.max(0, this.hour) as Hour
      this.hour = want
      this.woven = 0
    }
    this.woven = Math.min(1, this.woven + dt / 1.5)
    const to = SUN[Math.min(3, want)]
    const k = Math.min(1, dt * 2)
    this.sun.x += (to.x - this.sun.x) * k
    this.sun.y += (to.y - this.sun.y) * k
    if (play.scene?.kind === 'morning' && play.scene.t < 0.1) this.sun = { x: 60, y: 520 }
  }

  /** The first sight of a play is as it stands: nothing is on its way. */
  private settle(play: Play): void {
    if (this.hour >= 0) return
    this.hour = this.was = hourOf(play)
    this.sun = { ...SUN[this.hour] }
  }

  draw(surface: G, width: number, height: number, dpr: number, play: Play | null, guidance: Guidance | null): void {
    const by = fit(width, height)
    if (by.scale === 0) return
    const pw = Math.round(width * dpr), ph = Math.round(height * dpr)
    const key = [pw, ph, this.ribs].join()
    // Two frames of one cloth, on the slowest devices.
    if (key === this.strung && ++this.tick % this.every !== 0) return
    if (key !== this.strung) {
      this.strung = key
      this.loom.string(pw, ph, by.scale * dpr, by.x * dpr, by.y * dpr, this.ribs)
      this.hours.fill(null)
      this.hours.forEach((_, hour) => { this.hours[hour] = this.loom.still((g) => paintYard(g, hour as Hour)) })
    }
    const g = this.loom.begin()
    g.globalAlpha = 1
    if (play) this.settle(play)
    const part = ease(this.woven)
    this.loom.lay(this.hours[part < 1 ? this.was : Math.max(0, this.hour)]!)
    if (part < 1) {
      // The new sky is woven up from the ground, and the shuttle runs along its edge.
      this.loom.lay(this.hours[Math.max(0, this.hour)]!, part)
      const edge = 820 * (1 - part)
      const along = 590 + Math.sin(part * 60) * 540
      shape(g, [[along - 46, edge], [along, edge - 10], [along + 46, edge], [along, edge + 10]], dye('walnut', 3))
    }
    if (play) this.scene(g, play, guidance)
    surface.setTransform(1, 0, 0, 1, 0, 0)
    surface.globalAlpha = 1
    this.loom.weave(surface)
    this.drawn = STILL
  }

  private scene(g: G, play: Play, guidance: Guidance | null): void {
    const t = play.time
    g.save()
    g.beginPath()
    g.rect(BAND.left, 18, BAND.right - BAND.left, 784)
    g.clip()
    const glow = guidance?.glow ?? 0
    this.sky(g, play, t)
    this.cock(g, play, t)
    const scene = play.scene
    const wick = scene?.kind === 'lamp' && scene.t < WICK
    if (play.evening && (!play.save.finished || wick)) {
      // Its light on the wall, in two tones.
      blob(g, LAMP.x, LAMP.y + 14, 104 + 4 * Math.sin(t * 5), 112 + 4 * Math.sin(t * 5), dye('ochre', 0))
      blob(g, LAMP.x, LAMP.y + 14, 68, 76, dye('ochre', 1))
    }
    paintLamp(g, play.evening && (!play.save.finished || wick), jolt(play.lampPoked, 9, 2) * 0.3 + (play.evening && !play.night ? Math.sin(t * 1.6) * 0.04 : 0))
    if (scene?.kind === 'lamp' && scene.t > UNRAVEL[0] && scene.t < UNRAVEL[1]) this.unravel(g, play, scene.t)
    else this.people(g, play, play.shown)
    this.band(g, play, t)
    this.arms(g, play, t)
    if (scene?.kind === 'lamp' && scene.t > WICK && scene.t < UNRAVEL[0] + 0.3) {
      g.globalAlpha = 0.62 * bump(span(scene.t, WICK - 0.2, UNRAVEL[0] + 0.3))
      g.fillStyle = dye('indigo', 0)
      g.fillRect(0, 0, 1180, 820)
      g.globalAlpha = 1
    }
    this.emptied(g, play)
    if (play.knock.t < 0.4) {
      const k = play.knock.t / 0.4
      for (let i = 0; i < 5; i++) blob(g, play.knock.at.x + Math.cos(i * 1.26) * 44 * ease(k), play.knock.at.y + Math.sin(i * 1.26) * 34 * ease(k), 11 * (1 - k), 9 * (1 - k), dye('cream', 3))
    }
    if (scene?.kind === 'lamp') this.carry(g, play, scene.t)
    this.protests(g, play)
    for (const thing of THINGS) {
      const at = play.thingAt(thing)
      if (at.held) this.thing(g, thing, at.at.x, at.at.y, at.tip, 1.08, Math.sin(t * 7) * 0.05)
    }
    this.fly(g)
    if (glow > 0) this.glows(g, play, glow)
    if (guidance && guidance.demo !== null) this.ghost(g, play, guidance.demo, guidance.demoIndex)
    g.restore()
  }

  // --- Sky -----------------------------------------------------------------

  private sky(g: G, play: Play, t: number): void {
    if (this.sun.y < 430) {
      g.save()
      g.beginPath()
      g.rect(0, 0, 1180, 380)
      g.clip()
      paintSun(g, this.sun.x, this.sun.y, t)
      g.restore()
    }
    if (play.evening) {
      const rise = play.scene?.kind === 'dusk' ? 1 - ease(play.scene.t / DUSK_LASTS) : 0
      if (!(play.scene?.kind === 'lamp' && play.scene.t > UNRAVEL[0] && play.scene.t < UNRAVEL[1])) this.moon(g, play, rise * 300)
    } else if (play.scene?.kind === 'morning') this.moon(g, play, ease(play.scene.t / MORNING_LASTS) * 330)
  }

  private moon(g: G, play: Play, sink: number): void {
    g.save()
    g.beginPath()
    g.rect(0, 0, 1180, 372)
    g.clip()
    this.one(g, play, 'moon', play.shown.moon, sink)
    g.restore()
  }

  private cock(g: G, play: Play, t: number): void {
    const crow = play.scene?.kind === 'morning' ? bump(play.scene.t / 1.5) : 0
    const full = play.night ? 1 + 0.06 * Math.sin(t * 9) : 0.35 + 0.1 * Math.sin(t * 1.4)
    g.save()
    g.translate(COCK.x, COCK.y)
    if (play.night) g.rotate(Math.sin(t * 2.2) * 0.04)
    paintCock(g, full * (1 - crow), crow, bump(play.cockPoked / 0.5), (t * 0.31) % 1 > 0.95)
    g.restore()
  }

  // --- People --------------------------------------------------------------

  private people(g: G, play: Play, world: World): void {
    const order: readonly Who[] = ['granny', 'pig', 'goose'].filter((who) => who !== play.save.asks) as Who[]
    this.one(g, play, 'grandpa', world.grandpa, 0)
    for (const who of order) this.one(g, play, who, world[who], 0)
    this.one(g, play, play.save.asks, world[play.save.asks], 0)
  }

  private look(play: Play, who: Who): { x: number; y: number } | null {
    const me = SPOT[who], tall = who === 'grandpa' ? 350 : who === 'moon' ? 0 : 220
    let at: Point | null = null
    if (play.held?.dragging) at = play.held.at
    else if (play.flights[0]) at = play.thingAt(play.flights[0].thing).at
    else {
      const busy = [...YARD, 'grandpa', 'moon'].find((one) => one !== who && play.acts[one as Who]) as Who | undefined
      if (busy) at = { x: SPOT[busy].x, y: SPOT[busy].y - 180 }
      else if (play.telling >= 0) {
        const box = pictureAt(play.telling, play.count)
        at = { x: box.x + box.width / 2, y: box.y }
      } else if (who === 'grandpa' && play.save.phase === 'told' && !play.night) {
        // The pictures, the child, and once she has meddled, the lamp.
        const beat = (play.time * 0.35) % 1
        if (play.meddled && beat > 0.55) at = LAMP
        else if (beat < 0.3) at = { x: 480, y: 740 }
        else return { x: 0, y: 0.2 }
      } else if (who === play.save.asks && play.save.phase === 'day') {
        const beat = (play.time * 0.4) % 1
        if (beat < 0.35) return { x: 0, y: 0.1 }
        at = THING_AT(Math.floor(beat * 9) % 6)
      }
    }
    if (!at) return null
    return { x: clamp((at.x - me.x) / 240, -1, 1), y: clamp((at.y - (me.y - tall)) / 240, -1, 1) }
  }

  private stance(play: Play, who: Who, worn: Worn): Stance {
    const dozing = who === 'grandpa' && (!play.evening || play.scene?.kind === 'morning') && play.scene?.kind !== 'dusk'
    return {
      who, worn, t: play.time,
      asleep: play.night || (dozing && who === 'grandpa'),
      asking: who === play.save.asks && play.save.phase === 'day',
      look: this.look(play, who),
      under: play.over === who ? play.held!.thing : null,
      poked: play.poked[who],
      accused: play.accused.includes(who) ? play.protestT : 99,
      protest: play.wronged.includes(who) ? play.protestT : 99,
      stare: play.stare < 0 ? 9 : play.stare,
    }
  }

  private one(g: G, play: Play, who: Who, worn: Worn, sink: number): void {
    const act = play.acts[who]
    const stance = this.stance(play, who, worn)
    let pose: Pose, wear = worn, was: Coat = worn.coat
    let lift = worn.up ? LIFT[who] : 0
    if (act) {
      pose = actPose({ ...stance, worn: act.t < HIT ? act.from : worn }, act.what, act.t, act.truth === 'lie')
      was = act.from.coat
      if (act.t < HIT) wear = act.from
      const s = span(act.t, HIT, HIT + (worn.up ? 0.9 : 0.35))
      lift = lerp(act.from.up ? LIFT[who] : 0, worn.up ? LIFT[who] : 0, worn.up === act.from.up ? 1 : ease(s))
    } else pose = idlePose(stance)
    if (who === 'grandpa') this.grandpa(play, pose, act !== undefined, stance.asleep)
    const at = SPOT[who], near = who === play.save.asks && play.save.phase === 'day' ? NEARER : 1
    g.save()
    g.translate(at.x, at.y + sink + (near > 1 ? 8 : 0))
    if (who !== 'moon') {
      g.globalAlpha = 0.4
      blob(g, 0, -2, (who === 'grandpa' ? 150 : 92) * (1 - lift / 400), 15, dye('walnut', 1))
      g.globalAlpha = 1
    }
    g.translate(0, -lift)
    g.scale(near, near)
    paintFigure(g, who, pose, wear, play.time, was, false, act !== undefined && worn.up && !act.from.up)
    g.restore()
  }

  /** What is on Grandpa's mind shows in his moustache. */
  private grandpa(play: Play, pose: Pose, acting: boolean, asleep: boolean): void {
    if (play.scene?.kind === 'morning' && play.finds) {
      // He finds what he told himself into, and goes back to sleep.
      const k = bump(span(play.scene.t, 0.3, 2.1))
      pose.eyes = Math.max(pose.eyes, 1.3 * k)
      pose.look = { x: 0, y: 1 }
      pose.brow = k
      pose.quirk = 1.2 * k * Math.sin(play.scene.t * 8)
      return
    }
    if (asleep) {
      // One eye opens at a splash.
      const stirred = YARD.some((who) => { const act = play.acts[who]; return act && act.t > HIT && act.t < HIT + 0.5 })
      if (stirred && !play.night) pose.eyes = 0.5
      return
    }
    const curl = play.curled >= 0 && play.curled < 1.5
    if (curl) pose.quirk = 1.1 * ease(play.curled / 0.3)
    if (acting) return
    const t = play.time
    if (play.telling >= 0) {
      pose.mouth = Math.sin(t * 13) > 0 ? 'open' : 'round'
      pose.quirk = 0.35 * Math.sin(t * 13)
      pose.brow = Math.sin(t * 3)
      pose.turn = Math.sin(t * 3.3) * 0.03
      pose.sy *= 1 + 0.015 * Math.sin(t * 6.6)
    } else if (play.save.phase === 'dusk') {
      pose.brow = 0.6 + 0.3 * Math.sin(t * 2)
      pose.mouth = 'smile'
      pose.quirk = 0.4 + 0.15 * Math.sin(t * 3)
    } else if (play.pondered < 1.4) {
      pose.brow = play.pondered < 0.7 ? 1 : -0.4
      pose.eyes = 1.15
      pose.look = { x: -0.8, y: 0.9 }
      pose.quirk = 0.5 * jolt(play.pondered, 18, 3)
    }
    if (curl) { pose.quirk = 1.1 * ease(play.curled / 0.3); pose.brow = 0.5; pose.eyes = 0.7; pose.look = { x: 0.7, y: -0.8 } }
    if (play.remembered >= 0 && play.remembered < 1.6) { pose.quirk = 1.8 * bump(span(play.remembered, 0, 0.5)); pose.eyes = 1.3; pose.brow = 1; pose.mouth = 'round'; pose.look = { x: 0, y: -1 } }
  }

  private arms(g: G, play: Play, t: number): void {
    const worn = play.shown.grandpa, act = play.acts.grandpa
    const lift = act ? lerp(act.from.up ? LIFT.grandpa : 0, worn.up ? LIFT.grandpa : 0, worn.up === act.from.up ? 1 : ease(span(act.t, HIT, HIT + 0.9))) : worn.up ? LIFT.grandpa : 0
    const bob = worn.up ? Math.sin(t * 1.3 + 5.2) * 7 : 0
    const sx = SPOT.grandpa.x, sy = SPOT.grandpa.y - 252 - lift + bob
    const sleeve = worn.coat === 'mud' ? dye('walnut', 2) : worn.coat === 'jam' ? dye('madder', 2) : dye('cream', 2)
    const asleep = play.night || !play.evening
    // The right arm, his own.
    let rx = sx + 132, ry = sy + 96
    const told = play.save.phase === 'told' && !play.night && play.telling < 0 && play.scene?.kind !== 'lamp'
    if (told && !play.meddled) { rx = sx + 66; ry = sy - 158 + 8 * Math.sin(t * 9) * (Math.sin(t * 1.1) > 0 ? 1 : 0) }
    else if (told && (t * 0.35) % 1 > 0.62) { rx = sx + 30; ry = sy - 36 }
    if (play.remembered >= 0 && play.remembered < 1.6) { rx = sx + 24; ry = sy - 170 + 10 * jolt(play.remembered - 0.2, 20, 4) }
    if (play.scene?.kind === 'lamp' && play.scene.t < UNRAVEL[0]) {
      const k = ease(play.scene.t / WICK) * (1 - ease(span(play.scene.t, WICK + 0.1, UNRAVEL[0])))
      rx = lerp(rx, LAMP.x - 6, k)
      ry = lerp(ry, LAMP.y + 10, k)
    }
    limb(g, [sx + 92, sy], [sx + 168, sy + 40], [rx, ry], sleeve, 40)
    blob(g, rx, ry, 26, 24, dye('rose', 2))
    // The left, with the puppet on it: a sock with eyes.
    let lx = sx - 128, ly = sy + 84
    if (!asleep) {
      if (play.telling >= 0) {
        const box = pictureAt(play.telling, play.count)
        const into = ease(span(play.scene!.t, TELL[play.telling] - 0.3, TELL[play.telling] + 0.25))
        lx = lerp(sx - 190, box.x + box.width * 0.5 + 18 * Math.sin(t * 5), into)
        ly = lerp(sy + 40, box.y - 14 + 12 * Math.sin(t * 9), into)
      } else if (play.save.phase === 'dusk') { lx = sx - 176 + 14 * Math.sin(t * 3); ly = sy - 96 + 16 * Math.sin(t * 2.2) }
      else if (told) { lx = sx - 200; ly = Math.min(612, sy + 236) + 6 * Math.sin(t * 2.4) }
    } else ly += 5 * Math.sin(t * 1.5)
    // A long reach goes low, under the faces.
    const low = clamp((ly - sy - 120) / 120)
    limb(g, [sx - 92, sy], [lerp(Math.min(sx - 176, (sx + lx) / 2 - 20), sx - 250, low), lerp(Math.min(sy + 40, ly - 40), sy + 330, low)], [lx, ly], sleeve, 40)
    const flap = play.telling >= 0 ? 0.5 + 0.5 * Math.sin(t * 15) : asleep ? 0.25 + 0.25 * Math.sin(t * 1.5) : 0.3 + 0.3 * Math.sin(t * 4)
    if (play.scene?.kind === 'lamp' && play.scene.t > UNRAVEL[0] && play.scene.t < UNRAVEL[1]) return
    this.sock(g, lx, ly, flap, asleep)
  }

  private sock(g: G, x: number, y: number, flap: number, dull: boolean): void {
    g.save()
    g.translate(x, y)
    g.rotate(-0.2)
    soft(g, [[-58, 4 + flap * 18], [-50, 22 + flap * 22], [10, 30], [36, 14], [10, 6]], dye('violet', 1))
    shape(g, [[-48, 4], [-48, 12 + flap * 16], [6, 10]], dye('madder', 1))
    soft(g, [[-62, -2 - flap * 10], [-52, -30 - flap * 10], [0, -40], [38, -22], [36, 14], [0, 10]], dye('violet', 2))
    for (const dx of [-26, 2]) {
      blob(g, dx, -38 - flap * 5, 11, 11, dye('cream', 3))
      if (dull) line(g, [[dx - 8, -38], [dx + 8, -38]], dye('walnut', 0), 7)
      else blob(g, dx - 3, -38 - flap * 5, 6, 6, dye('walnut', 0))
    }
    g.restore()
  }

  // --- The band ------------------------------------------------------------

  private thing(g: G, thing: Thing, x: number, y: number, tip: number, size: number, turn: number): void {
    g.save()
    g.translate(x, y)
    g.rotate(turn)
    g.scale(size, size)
    paintThing(g, thing, tip)
    g.restore()
  }

  /** A thing being emptied over somebody. */
  private emptied(g: G, play: Play): void {
    for (const who of [...YARD, 'grandpa', 'moon'] as Who[]) {
      const act = play.acts[who]
      if (!act || act.t > 0.75 || act.what === 'balloon') continue
      if (act.what === 'pants' && act.t > HIT) continue
      const at = SPOT[who], c = CROWN[who], lift = act.from.up ? LIFT[who] : 0
      const k = span(act.t, HIT * 0.5, 0.75)
      let x = at.x + c.x, y = at.y + c.y - lift - 20, tip = act.what === 'pants' ? Math.PI * ease(act.t / HIT) : lerp(0.3, 2.5, ease(act.t / HIT))
      if (act.what === 'pillow') { tip = 0.6; x += lerp(-130, 30, ease(act.t / HIT)); y += 60 }
      if (act.what === 'pants') y += 30 * ease(act.t / HIT)
      g.save()
      g.translate(x, y)
      if (act.t > 0.6) g.scale(1 - span(act.t, 0.6, 0.75) * 0.8, 1 - span(act.t, 0.6, 0.75) * 0.8)
      paintThing(g, act.what, tip, k)
      g.restore()
      if (act.what === 'mud' || act.what === 'water' || act.what === 'jam') {
        const fall = span(act.t, 0.12, HIT)
        if (act.t < HIT + 0.12) blob(g, x - 26, y + 30 + fall * 70, act.what === 'water' ? 54 : 40, 22 + fall * 30, SPLASH[act.what].colours[0])
      }
    }
  }

  private using(play: Play, thing: Thing): boolean {
    return ([...YARD, 'grandpa', 'moon'] as Who[]).some((who) => { const act = play.acts[who]; return act && act.what === thing && act.t < 0.75 })
  }

  private band(g: G, play: Play, t: number): void {
    const scene = play.scene
    const covered = play.evening ? (scene?.kind === 'dusk' ? ease(span(scene.t, 0.2, 1.5)) : 1) : scene?.kind === 'morning' ? 1 - ease(span(scene.t, 0.4, 1.6)) : 0
    if (covered < 1) {
      for (const thing of THINGS) {
        const at = play.thingAt(thing)
        if (at.held || this.using(play, thing)) continue
        const poked = play.thingPoked[thing]
        const j = jolt(poked, 24, 6)
        g.save()
        g.translate(at.at.x, at.at.y + 52)
        g.globalAlpha = 0.5
        blob(g, 0, 4, 62, 10, dye('walnut', 0))
        g.globalAlpha = 1
        g.scale(1 + 0.14 * j, 1 - 0.14 * j)
        g.translate(0, -52)
        paintThing(g, thing, 0.03 * j)
        g.restore()
      }
    }
    if (covered <= 0) return
    this.cloth(g, play, covered)
    if (play.save.phase !== 'told') return
    const order = [0, 1, 2].filter((i) => i < play.up)
    if (play.sliding) order.sort((a, b) => Number(a === play.sliding!.at) - Number(b === play.sliding!.at))
    for (const i of order) if (!(scene?.kind === 'lamp' && scene.t > HAPPENS[i] - CARRY)) this.picture(g, play, i, t)
  }

  private cloth(g: G, play: Play, covered: number): void {
    const edge = BAND.left + (BAND.right - BAND.left) * covered
    g.fillStyle = dye('violet', 0)
    g.fillRect(BAND.left, BAND.top, edge - BAND.left, 170)
    for (let i = 0; i < 12; i++) {
      const x = 60 + i * 100
      if (x > edge) break
      for (const y of [676, 728, 780]) shape(g, [[x - 12, y], [x, y - 10], [x + 12, y], [x, y + 10]], dye('violet', 1))
    }
    if (play.clothPoked.t < 0.7) {
      const k = bump(play.clothPoked.t / 0.7)
      soft(g, [[play.clothPoked.x - 70, 720], [play.clothPoked.x - 30, 720 - 60 * k], [play.clothPoked.x + 34, 720 - 64 * k], [play.clothPoked.x + 74, 720], [play.clothPoked.x, 740]], dye('violet', 1))
    }
    if (covered < 1) {
      blob(g, edge, 720, 20, 86, dye('violet', 2))
      blob(g, edge + 4, 720, 9, 74, dye('violet', 1))
    }
  }

  private picture(g: G, play: Play, i: number, t: number): void {
    const box = pictureAt(i, play.count), event = play.save.told[i], age = play.pictureT[i]
    const telling = play.scene?.kind === 'telling'
    const rise = telling ? ease(span(play.scene!.t, TELL[i], TELL[i] + 0.35)) : 1
    const slide = play.sliding?.at === i ? play.sliding.dx : 0
    const happening = play.scene?.kind === 'lamp' ? play.scene.t >= HAPPENS[i] && play.scene.t < (HAPPENS[i + 1] ?? 99) : play.telling === i
    g.save()
    g.translate(box.x + slide, box.y + (1 - rise) * 170 - (slide ? 8 : 0))
    g.fillStyle = happening ? dye('ochre', 3) : dye('ochre', 1)
    g.fillRect(0, 0, box.width, box.height)
    g.beginPath()
    g.rect(8, 8, box.width - 16, box.height - 16)
    g.clip()
    const [high, low] = SKY[i]
    const sky = g.createLinearGradient(0, 0, 0, box.height)
    sky.addColorStop(0, dye(high[0], high[1]))
    sky.addColorStop(1, dye(low[0], low[1]))
    g.fillStyle = sky
    g.fillRect(0, 0, box.width, box.height)
    g.fillStyle = dye('sage', 1)
    g.fillRect(0, box.height - 22, box.width, 22)
    // Its place in the day: the sun climbing, high, and going.
    blob(g, box.width * 0.5, [box.height - 24, 30, box.height - 24][i], 26, 25, i === 2 ? dye('madder', 2) : dye('ochre', 3))
    g.fillStyle = dye('sage', 1)
    g.fillRect(0, box.height - 22, box.width, 22)
    // A dark round of cloth behind the thing.
    const px = box.width * 0.76, py = box.height * 0.52
    blob(g, px, py, 66, 60, dye('sage', 0))
    const cx = box.width * 0.26, { size, feet, x: aside } = PUPPET[event.who]
    // The puppet.
    const bare: Worn = { ...BARE }, done = after(bare, event.what)
    const acting = age < ACT
    const stance: Stance = { who: event.who, worn: bare, t: 0, asleep: false, asking: false, look: { x: 0, y: 0 }, under: null, poked: 99, stare: 99, protest: 99, accused: 99 }
    let pose = acting ? actPose({ ...stance, t }, event.what, age, false) : restPose()
    if (event.who === 'goose' && !acting) pose.quirk = 0.2
    const wear = acting && age < HIT ? bare : done
    const jump = acting ? jolt(age, 16, 5) * 8 : 0
    const flip = play.flipped[i].who < 0.2 ? 0.75 + 0.25 * span(play.flipped[i].who, 0, 0.2) : 1
    g.save()
    // Underpants need room over the head, and a balloon lifts a little.
    g.translate(cx + aside, feet - jump + (wear.pants ? 26 : 0) - (wear.up ? 12 : 0))
    g.scale(size, size * flip)
    paintFigure(g, event.who, pose, wear, t, 'bare', true)
    g.restore()
    // The thing goes over and does it.
    const go = acting ? ease(span(age, 0, HIT)) * (1 - ease(span(age, 0.7, 1.15))) : 0
    const tip = acting ? go * (event.what === 'pillow' ? -0.6 : event.what === 'pants' ? Math.PI : -2.3) : 0
    const flat = play.flipped[i].what < 0.2 ? 0.75 + 0.25 * span(play.flipped[i].what, 0, 0.2) : 1
    g.save()
    g.translate(lerp(px, cx + 18, go), lerp(py, 34, go))
    g.scale(0.84, 0.84 * flat)
    if (!(event.what === 'pants' && acting && age > HIT && age < 0.8)) paintThing(g, event.what, tip, acting ? span(age, HIT * 0.6, HIT * 1.5) * (1 - span(age, 0.8, 1.1)) : 0)
    g.restore()
    if (acting && age > HIT * 0.7 && age < 0.7) {
      const s = span(age, HIT * 0.7, 0.7)
      SPLASH[event.what].colours.forEach((colour, n) => {
        for (const side of [-1, 1]) blob(g, cx + side * (20 + s * (50 + n * 12)), 44 - 30 * Math.sin(s * 3) + s * 70 + n * 6, 8 * (1 - s) + 3, 8 * (1 - s) + 3, colour)
      })
    }
    g.restore()
  }

  /** A picture leaves the band and goes to whoever it is about, and then it happens. */
  private carry(g: G, play: Play, now: number): void {
    for (let i = 0; i < play.count; i++) {
      const s = span(now, HAPPENS[i] - CARRY, HAPPENS[i])
      if (s <= 0 || s >= 1) continue
      const box = pictureAt(i, play.count), to = play.crown(play.save.told[i].who), k = ease(s), size = 1 + 0.5 * bump(s) - 0.45 * k
      g.save()
      g.translate(lerp(box.x + box.width / 2, to.x, k), lerp(box.y + box.height / 2, to.y - 30, k) - 70 * bump(s))
      g.rotate(0.06 * Math.sin(s * 9))
      g.scale(size, size)
      g.translate(-box.x - box.width / 2, -box.y - box.height / 2)
      this.picture(g, play, i, play.time)
      g.restore()
    }
  }

  /** What really happened, over the head of whoever protests. */
  private protests(g: G, play: Play): void {
    const t = play.protestT
    if (t > PROTEST + 0.7) return
    const k = Math.min(ease(t / 0.2), 1 - ease(span(t, PROTEST + 0.4, PROTEST + 0.7)))
    const said = new Set<Who>()
    play.save.day.forEach((event, i) => {
      if (said.has(event.who) || k <= 0 || i >= play.up || !play.wronged.includes(event.who) || same(event, play.save.told[i])) return
      said.add(event.who)
      const at = play.crown(event.who), x = clamp(at.x + (event.who === 'goose' ? 60 : 0), 130, 720), y = Math.max(96, at.y - 96)
      blob(g, lerp(x, at.x, 0.7), at.y - 14, 9 * k, 8 * k, dye('cream', 3))
      blob(g, lerp(x, at.x, 0.4), at.y - 34, 14 * k, 11 * k, dye('cream', 3))
      g.save()
      g.translate(x, y)
      g.scale(k, k)
      blob(g, 0, 0, 104, 66, dye('walnut', 1))
      blob(g, 0, 0, 98, 60, dye('cream', 3))
      this.thing(g, event.what, 0, -8, event.what === 'pants' ? 0 : 0.5, 0.72, 0)
      g.restore()
    })
  }

  // --- The lamp's work -------------------------------------------------------

  /** The yard comes undone row by row, back to its morning. */
  private unravel(g: G, play: Play, now: number): void {
    const k = span(now, UNRAVEL[0], UNRAVEL[1]), edge = lerp(650, 40, k)
    g.save()
    g.beginPath()
    g.rect(0, 0, 1180, edge)
    g.clip()
    this.people(g, play, play.before)
    this.one(g, play, 'moon', play.before.moon, 0)
    g.restore()
    g.save()
    g.beginPath()
    g.rect(0, edge, 1180, 820 - edge)
    g.clip()
    this.people(g, play, play.save.base)
    this.one(g, play, 'moon', play.save.base.moon, 0)
    g.restore()
    // The loose weft, pulled out to one side and back.
    const out = Math.sin(now * 9)
    for (let i = 0; i < 5; i++) {
      const colour = [dye('madder', 2), dye('cream', 3), dye('indigo', 2), dye('ochre', 2), dye('rose', 2)][i]
      line(g, Array.from({ length: 24 }, (_, n) => [n * 52, edge + i * 8 - 16 + Math.sin(n * 1.3 + now * 18 + i) * 4] as const), colour, 6)
    }
    // It is his puppet that pulls it out.
    this.sock(g, 590 + out * 500, edge + 10, 0.4, false)
  }

  // --- Loose things ----------------------------------------------------------

  private fly(g: G): void {
    for (const bit of this.bits) {
      if (bit.t < 0) continue
      const k = 1 - bit.t / bit.lasts
      if (bit.fall < 100 && bit.fall > 0) blob(g, bit.x + Math.sin(bit.t * 5 + bit.spin) * 14, bit.y, bit.size * 1.3, bit.size * 0.55, bit.colour, Math.sin(bit.t * 4 + bit.spin))
      else blob(g, bit.x, bit.y, bit.size * (0.4 + 0.6 * k), bit.size * (0.4 + 0.6 * k), bit.colour)
    }
  }

  // --- Guidance ----------------------------------------------------------------

  private glows(g: G, play: Play, glow: number): void {
    const beat = 0.5 + 0.5 * Math.sin(play.time * 3.4)
    const ring = (x: number, y: number, rx: number, ry: number) => {
      g.globalAlpha = glow
      g.beginPath()
      g.ellipse(x, y, rx + beat * 6, ry + beat * 6, 0, 0, Math.PI * 2)
      g.strokeStyle = dye('walnut', 0)
      g.lineWidth = 15
      g.stroke()
      g.strokeStyle = dye('ochre', 3)
      g.lineWidth = 8
      g.stroke()
      g.globalAlpha = 1
    }
    if (play.busy) return
    if (play.night) ring(COCK.x, COCK.y - 20, 78, 72)
    else if (play.save.phase === 'dusk') ring(SPOT.grandpa.x, SPOT.grandpa.y - 340, 130, 110)
    else if (play.save.phase === 'told') {
      // One want at a time: the pictures until one is touched, and then the lamp.
      if (play.meddled) ring(LAMP.x, LAMP.y + 14, 58, 70)
      else {
        // One at a time, along the row.
        const at = Math.floor(play.time / 0.8) % (play.count * 2), box = pictureAt(at >> 1, play.count)
        ring(box.x + box.width * (at & 1 ? 0.76 : 0.26), box.y + 76, 68, 58)
      }
    } else {
      const at = THING_AT(Math.floor(play.time / 0.8) % THINGS.length)
      ring(at.x, at.y, 80, 64)
    }
  }

  private ghost(g: G, play: Play, demo: number, index: number): void {
    const { from, to, thing } = demoMove(play, index)
    const pose = handPose(demo, to !== null, this.hand)
    const x = to ? lerp(from.x, to.x, pose.travel) : from.x, y = to ? lerp(from.y, to.y, pose.travel) : from.y
    g.globalAlpha = pose.opacity
    if (thing && pose.travel > 0 && pose.travel < 1) this.thing(g, thing, x, y - 24, 0, 0.9, 0)
    g.save()
    g.translate(x + 10, y + 12)
    g.scale(1.15 - pose.press * 0.2, 1.15 - pose.press * 0.2)
    for (const [colour, grow] of [[dye('walnut', 0), 8], [dye('cream', 3), 0]] as const) {
      line(g, [[0, 0], [10, 44]], colour, 24 + grow)
      soft(g, [[-12 - grow, 34], [52 + grow, 26], [64 + grow, 66], [44, 106 + grow], [4, 104 + grow], [-16 - grow, 70]], colour)
    }
    g.restore()
    g.globalAlpha = 1
  }
}

/** The hour of the sky: one for each happening so far, and night from dusk on. */
function hourOf(play: Play): Hour {
  if (play.evening) return 3
  return Math.min(2, play.save.day.length) as Hour
}
