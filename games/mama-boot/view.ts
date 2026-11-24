import { Box, CAST, TAU, type Make, type Pen, type Sprite } from './craft'
import { YARN, cutCast, type Cast, type Figure } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { moveToShow, type Move } from './guide'
import { HEN, POSTS, PUDDLE, SCENERY, SIZE, postLean, scaleAt, type Spot, type ThingKey } from './layout'
import { ringOf, type Gait } from './lineage'
import { STANCES, WALKS, add, addAct, reset, type Pose } from './moves'
import { makeRng } from './rng'
import { YARD, cutScenery, paintYard, type Scenery } from './scenery'
import { fit } from './stage'
import { LAND, LID, OUT, TUCK_S, LAY_S, type Body, type Chick, type Yard } from './yard'

// Draws the yard. It eases nothing of the game's: what it keeps is the pupils,
// which roll in the eyes as googly eyes do. Every picture is cut once; a frame
// moves them.

const { sin, cos, abs, min, max, PI } = Math
const clamp = (t: number) => min(1, max(0, t))
const smooth = (t: number) => { const u = clamp(t); return u * u * (3 - 2 * u) }

type Roll = { x: number; y: number; vx: number; vy: number; px: number; py: number }
type Place = { x: number; y: number; z: number }

export class View {
  private readonly cast: Cast
  private readonly scenery: Scenery
  private backdrop: HTMLCanvasElement | null = null
  /** The size the yard was painted for, the size last asked for, and for how many draws it has been that. */
  private painted = { width: 0, height: 0 }
  private asked = { width: 0, height: 0, draws: 0 }
  private readonly rolls = new Map<string, Roll>()
  private readonly pose: Pose = reset({} as Pose)
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private g!: Pen
  private yard!: Yard
  private t = 0
  private step = 0
  drawn = 0

  /** `fine` is the most pixels to a unit the surface will ever have: the yard is painted once at that, and a lower tier shows it smaller. */
  constructor(private readonly make: Make, private readonly fine = 2) {
    const box = new Box(make, makeRng(11))
    this.cast = cutCast(box)
    this.scenery = cutScenery(box)
  }

  /** The bare yard, for a surface whose saved state has not been read yet. */
  bare(g: Pen, width: number, height: number, dpr: number): void {
    const now = fit(width, height)
    if (now.scale <= 0) return
    const back = this.back(width, height), was = fit(this.painted.width, this.painted.height)
    // While a surface is being resized the picture there is stands in, laid where its stage belongs.
    const k = now.scale / was.scale
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (k !== 1 || this.painted.width !== width || this.painted.height !== height) { g.fillStyle = '#8fd0ea'; g.fillRect(0, 0, width, height) }
    g.drawImage(back, now.x - was.x * k, now.y - was.y * k, this.painted.width * k, this.painted.height * k)
  }

  /** The painted yard. It costs far more than a frame to paint, so it waits for a new size to hold still. */
  private back(width: number, height: number): HTMLCanvasElement {
    const { asked, painted } = this
    asked.draws = asked.width === width && asked.height === height ? asked.draws + 1 : 0
    asked.width = width
    asked.height = height
    if (this.backdrop && ((painted.width === width && painted.height === height) || asked.draws < 20)) return this.backdrop
    this.dispose()
    const by = fit(width, height), c = this.make(Math.round(width * this.fine), Math.round(height * this.fine))
    const g = c.getContext('2d') as Pen
    g.setTransform(this.fine * by.scale, 0, 0, this.fine * by.scale, this.fine * by.x, this.fine * by.y)
    g.fillStyle = '#8fd0ea'
    g.fillRect(YARD.x, YARD.y, YARD.w, YARD.h)
    paintYard(g, new Box(this.make, makeRng(5)))
    this.painted = { width, height }
    this.backdrop = c
    return c
  }

  /** Gives the large picture back at once, rather than when it is collected. */
  dispose(): void {
    if (this.backdrop) { this.backdrop.width = 0; this.backdrop.height = 0 }
    this.backdrop = null
  }

  draw(g: Pen, yard: Yard, width: number, height: number, dpr: number, guidance: Guidance | null, step: number): number {
    const by = fit(width, height)
    if (by.scale <= 0) return 0
    this.g = g
    this.yard = yard
    this.step = step
    this.t = yard.time
    this.drawn = 1
    this.bare(g, width, height, dpr)
    g.setTransform(dpr * by.scale, 0, 0, dpr * by.scale, dpr * by.x, dpr * by.y)
    g.globalAlpha = 1
    this.background()
    const move = guidance && guidance.glow > 0 ? moveToShow(yard, guidance) : null
    if (guidance && move) { g.globalAlpha = guidance.glow * (0.75 + 0.25 * sin(this.t * 4)); const on = yard.asking ? 1 : 1.9; this.put(this.cast.glow, move.glow.x, move.glow.y, on, on); g.globalAlpha = 1 }
    // While her wing is up, each chick that can run under it stands in the light.
    if (yard.wing > 0 && yard.canTuck) for (const c of yard.brood) if (c.kind === 'chick' && c.opening === null) { const p = yard.middle(c); g.globalAlpha = 0.7 + 0.3 * sin(this.t * 6); this.put(this.cast.glow, p.x, p.y, 0.8) }
    g.globalAlpha = 1
    this.put(this.cast.nestBack, HEN.x, HEN.y + 8)
    for (const b of yard.drawOrder()) {
      if (b.kind === 'hen') { this.drawHen(b) } else if (b.kind === 'egg' || b.kind === 'chick') this.drawBrood(b as Chick)
      else this.drawThing(b as Body & { kind: ThingKey })
    }
    this.threads()
    this.particles()
    for (const d of yard.dabs) { const u = d.t / 0.6; g.globalAlpha = 1 - u; this.put(this.cast.fx.fluff, d.x, d.y - u * 14, 1 + sin(u * PI) * 0.6); g.globalAlpha = 1 }
    if (guidance && move && guidance.demo !== null) this.ghost(move, guidance)
    g.setTransform(1, 0, 0, 1, 0, 0)
    return this.drawn
  }

  private put(s: Sprite, x: number, y: number, sx = 1, sy = sx, rot = 0): void {
    const g = this.g
    this.drawn += 1
    if (rot === 0 && sx === 1 && sy === 1) { g.drawImage(s.canvas, x - s.ox, y - s.oy, s.w, s.h); return }
    g.save()
    g.translate(x, y)
    if (rot) g.rotate(rot)
    g.scale(sx, sy)
    g.drawImage(s.canvas, -s.ox, -s.oy, s.w, s.h)
    g.restore()
  }

  // --- behind ------------------------------------------------------------------

  private background(): void {
    const s = this.scenery, y = this.yard, t = this.t
    const since = (k: keyof typeof SCENERY) => y.scenery[k]
    const ring = (u: number, n: number, over = 0.9) => (u < over ? sin((u / over) * PI * 2 * n) * (1 - u / over) : 0)
    this.put(s.sun, SCENERY.sun.x, SCENERY.sun.y, 1 + ring(since('sun'), 2) * 0.06, undefined, t * 0.08 + smooth(since('sun') / 1.4) * 1.2)
    for (const k of ['cloudA', 'cloudB'] as const) { const u = since(k), p = ring(u, 2); this.put(s[k], SCENERY[k].x + sin(t * 0.25 + (k === 'cloudA' ? 0 : 2)) * 14, SCENERY[k].y + sin(t * 0.5) * 3, 1 + p * 0.16, 1 - p * 0.12) }
    // The cow stands in the barn door, hindquarters out, and looks round at the fifth chick's round.
    const cow = SCENERY.cow, face = y.cowFaces > 0 ? clamp(y.cowFaces * 3) : 0
    const chew = sin(t * 1.4) * 1.5
    this.put(s.cow, cow.x, cow.y + 26 + chew, 0.92)
    if (face > 0) this.put(s.cowHead, cow.x, cow.y - 14 + sin(t * 9) * 3 * face, 1, 1 + sin(t * 9) * 0.04)
    else this.put(s.tail, cow.x + 6, cow.y - 24, 1, 1, sin(t * 1.1) * 0.24 + ring(since('cow'), 3, 1.1) * 1.1)
    const sh = SCENERY.sheep, b = ring(since('sheep'), 4)
    this.put(s.sheep, sh.x, sh.y + 8, 1 + b * 0.04, 1 + sin(t * 1.8) * 0.015 - b * 0.05)
    this.put(s.sheepHead, sh.x + 48, sh.y - 22 + sin(t * 2.6) * 2 - abs(b) * 10, 1, 1 + abs(b) * 0.06, b * 0.16)
    const tr = ring(since('tree'), 4)
    this.put(s.tree, SCENERY.tree.x, SCENERY.tree.y + 22, 1, 1, sin(t * 0.9) * 0.012 + tr * 0.09)
    const f = since('fence')
    // The posts by the finger shake where they stand, the nearest first.
    if (f < 1) for (const x of POSTS) {
      const far = abs(x - y.fenceX)
      if (far > 95) continue
      const shake = ring(max(0, f - far * 0.0015), 5, 0.8)
      this.put(s.post, x + shake * 5, 404 - abs(shake) * 3, 1, 1, postLean(x) + shake * 0.05)
    }
    const p = y.puddleT
    const g = this.g
    for (const c of y.creases) {
      g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - c.t / 1.6)})`; g.lineWidth = 3
      const a = cos(c.turn) * 13, b2 = sin(c.turn) * 6
      g.beginPath(); g.moveTo(c.x - a, c.y - b2); g.lineTo(c.x - b2 * 0.4, c.y + 5); g.lineTo(c.x + a, c.y + b2 - 4); g.stroke()
      this.drawn += 1
    }
    if (y.dent) {
      const u = y.dent.t / 0.5, k = (1 - smooth(u)) * (1 + sin(u * PI * 3) * 0.1)
      g.fillStyle = `rgba(6,30,40,${0.34 * k})`; g.beginPath(); g.ellipse(y.dent.x, y.dent.y, 30 * (0.7 + k * 0.3), 20 * (0.7 + k * 0.3), 0, 0, TAU); g.fill()
      g.strokeStyle = `rgba(255,255,255,${0.4 * k})`; g.lineWidth = 3; g.beginPath(); g.ellipse(y.dent.x + 1, y.dent.y + 3, 30, 20, 0, 0.3, 2.6); g.stroke()
      this.drawn += 2
    }
    if (p < 1) { g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p)})`; g.lineWidth = 4; g.beginPath(); g.ellipse(PUDDLE.x, PUDDLE.y, PUDDLE.rx * (0.3 + p * 0.66), PUDDLE.ry * (0.3 + p * 0.66), 0, 0, TAU); g.stroke(); this.drawn += 1 }
  }

  // --- figures -----------------------------------------------------------------

  private begin(b: Body): Pose {
    const pose = reset(this.pose)
    if (b.act) addAct(pose, b.act.name, b.act.t, b.act.amount)
    // Only an egg turns lying on the water; a chick that copies it goes head over heels.
    if (b.kind !== 'egg') pose.rot += pose.spin
    pose.sy *= 1 + b.squash * 0.9
    pose.sx *= 1 - b.squash * 0.7
    return pose
  }

  /** The shadow on the ground, the hard shadow, and then the pen stands in the figure's own units. Ends with `end`. */
  private enter(b: Body, f: Figure, at: Place, pose: Pose, size: number): void {
    const g = this.g, s = scaleAt(at.y) * size
    const rides = this.yard.hostOf(b) !== null || this.yard.gag?.thing === b.id
    const high = (rides ? 0 : at.z) + pose.lift
    g.globalAlpha = max(0.25, 1 - high / 260)
    if (!rides) this.put(this.cast.contact, at.x + 5, at.y + 3, (SIZE[b.kind].w / 200) * s * 0.92, (SIZE[b.kind].w / 200) * s * 0.72)
    g.globalAlpha = 1
    for (const pass of [0, 1]) {
      g.save()
      g.translate(at.x + pose.dx * b.dir + (pass ? 0 : CAST.x + min(high, 110) * 0.12), at.y - at.z - pose.lift * s + (pass ? 0 : CAST.y + min(high, 110) * 0.2))
      g.scale(s * b.dir, s)
      g.translate(f.pivot.x, f.pivot.y)
      g.rotate(pose.rot)
      g.translate(-f.pivot.x, -f.pivot.y)
      g.scale(pose.sx, pose.sy)
      if (pass === 0) { this.put(f.shadow, 0, 0); g.restore() }
    }
  }

  private end(): void {
    this.g.restore()
  }

  /** Where the pupils roll: after what is looked at, thrown about by how the body moves. */
  private roll(b: Body, at: Place, look: Spot | null, pose: Pose, free = false): Roll {
    let r = this.rolls.get(b.id)
    if (!r) { r = { x: 0, y: 0, vx: 0, vy: 0, px: at.x, py: at.y - at.z }; this.rolls.set(b.id, r) }
    const dt = min(0.05, this.step)
    if (dt > 0) {
      const mid = at.y - at.z - SIZE[b.kind].h * 0.6
      let tx = 0, ty = 0.25
      if (look) { const dx = look.x - at.x, dy = look.y - mid, d = Math.hypot(dx, dy) || 1; tx = dx / max(d, 60); ty = dy / max(d, 60) }
      tx = tx * 0.8 + pose.gazeX * b.dir
      ty = ty * 0.8 + pose.gazeY
      if (free) { tx = cos(this.t * 13); ty = sin(this.t * 13) }
      const my = at.y - at.z - pose.lift, mvx = clamp2((at.x - r.px) / dt / 900), mvy = clamp2((my - r.py) / dt / 900)
      r.px = at.x
      r.py = my
      r.vx += ((tx - r.x) * 150 - r.vx * 11 - mvx * 46) * dt
      r.vy += ((ty - r.y) * 150 - r.vy * 11 - mvy * 46) * dt
      r.x += r.vx * dt
      r.y += r.vy * dt
      const d = Math.hypot(r.x, r.y)
      if (d > 1) { r.x /= d; r.y /= d }
    }
    return r
  }

  private eyes(f: Figure, b: Body, r: Roll, shut: number, up = 0, oneOnly = false): void {
    const g = this.g
    const blink = shut === 0 && !b.act && (this.t + b.id.charCodeAt(0) * 0.37 + b.id.charCodeAt(1) * 0.9) % 4.3 < 0.11 ? 1 : 0
    const c = cos(up), s = sin(up)
    for (const [i, e] of f.eyes.entries()) {
      const lid = oneOnly && i === 0 ? 1 : clamp(shut + blink)
      if (lid < 0.95) {
        const px = r.x * b.dir, k = e.r * 0.4
        this.put(this.cast.pupil, e.x + (px * c + r.y * s) * k, e.y + (-px * s + r.y * c) * k, (e.r * 0.56) / 20)
      }
      if (lid > 0.02) {
        g.fillStyle = e.lid
        g.beginPath(); g.arc(e.x, e.y, e.r + 0.8, 0, TAU)
        if (lid < 0.97) { g.save(); g.beginPath(); g.rect(e.x - e.r - 2, e.y - e.r - 2, e.r * 2 + 4, (e.r * 2 + 3) * lid); g.clip(); g.beginPath(); g.arc(e.x, e.y, e.r + 0.8, 0, TAU); g.fill(); g.restore() } else {
          g.fill()
          g.strokeStyle = 'rgba(40,16,10,0.75)'; g.lineWidth = 3; g.beginPath(); g.arc(e.x, e.y - e.r * 0.2, e.r * 0.8, 0.5, PI - 0.5); g.stroke()
        }
        this.drawn += 1
      }
    }
  }

  private mouth(f: Figure, open: number): void {
    if (!f.mouth) return
    const m = f.mouth
    if (open < 0.06) this.put(this.cast.lower, m.x, m.y, m.r / 20)
    else this.put(this.cast.mouth, m.x, m.y, (m.r / 20) * (0.7 + open * 0.35), (m.r / 20) * (0.25 + open))
  }

  private part(f: Figure, name: string, rot = 0, dx = 0, dy = 0, sx = 1, sy = 1): void {
    const p = f.parts[name]
    this.put(p.sprite, p.x + dx, p.y + dy, sx, sy, rot)
  }

  private drawThing(b: Body & { kind: ThingKey }): void {
    const y = this.yard, f = this.cast.things[b.kind], at = y.place(b), pose = this.begin(b), t = this.t
    const held = y.carry?.id === b.id
    // Each is alive in its own way while nothing happens.
    if (!b.act) {
      if (b.kind === 'boot') { const k = (t * 0.5) % 3; pose.rot += k < 0.4 ? sin(k / 0.4 * PI * 2) * 0.035 : 0 } else if (b.kind === 'teapot') { pose.sy *= 1 + sin(t * 2.3) * 0.012; pose.flap += max(0, sin(t * 0.9) - 0.93) * 4 } else if (b.kind === 'pig') { pose.sx *= 1 + sin(t * 2) * 0.013; pose.flap += sin(t * 5) * 0.3 } else if (b.kind === 'farmer') { pose.flap += 0.5 + sin(t * 1.5) * 0.5; pose.mouth = max(pose.mouth, max(0, -sin(t * 1.5)) * 0.5) } else if (b.kind === 'ball') { pose.sy *= 1 + sin(t * 3.1) * 0.02; pose.sx *= 1 - sin(t * 3.1) * 0.015 } else pose.rot += sin(t * 1.7) * 0.03
      if (b.kind === 'bell') pose.flap += sin(t * 1.7 - 0.6) * 0.2
    }
    if (held) { pose.rot += sin(t * 6 + b.kind.length) * 0.07; pose.sy *= 1.04 }
    if (b.kind === 'farmer') pose.shut += 1
    const spin = b.kind === 'ball' ? pose.rot + b.spin * b.dir : 0
    if (b.kind === 'ball') pose.rot = sin(pose.rot) * 0.25
    const look = held ? y.finger : y.finger ?? this.lookOf(b)
    const r = this.roll(b, at, look, pose)
    this.enter(b, f, at, pose, 1)
    const rider = y.riderOf(b.id)
    switch (b.kind) {
      case 'boot':
        this.part(f, 'loop', pose.flap * 0.5)
        this.put(f.body, 0, 0)
        this.part(f, 'cuff', pose.flap * 0.22, 0, abs(pose.flap) * -3)
        break
      case 'teapot':
        this.put(f.body, 0, 0)
        if (!rider) this.part(f, 'lid', pose.flap * -0.12, 0, -abs(pose.flap) * 26)
        break
      case 'pig': {
        const pot = y.things.teapot
        const want = Math.atan2(pot.y - b.y, (pot.x - b.x) * b.dir)
        this.part(f, 'tail', pose.flap * 0.5)
        this.put(f.body, 0, 0)
        const lick = b.act?.name === 'pigLick'
        if (pose.mouth < 0.3 || lick) this.part(f, 'tongue', lick ? -abs(sin(t * 9)) * 0.9 : want + sin(t * 2.2) * 0.08, 0, 0, lick ? 1.3 : 1 + sin(t * 2.2) * 0.06, 1)
        break
      }
      case 'farmer':
        { const k = b.act?.name === 'farmerKick' ? pose.flap : sin(t * 1.5) * 0.04; this.part(f, 'leg', k * 0.3); this.part(f, 'leg', -k * 0.3 + 0.12, 4, 14) }
        this.part(f, 'belly', 0, 0, 0, 1 + pose.flap * 0.03, 0.82 + clamp(pose.flap) * 0.24)
        this.put(f.body, 0, 0)
        // His arms, held open round nothing, or closed on what there is.
        this.part(f, 'arm', -0.35 + (b.act?.name.match(/Hug|Pillow/) ? pose.flap * 1.5 : sin(t * 1.5) * 0.06), 0, 0)
        this.part(f, 'arm', 0.5 + (b.act?.name.match(/Hug|Pillow/) ? pose.flap * 1.1 : sin(t * 1.5 + 1) * 0.06), 52, 8)
        break
      case 'ball':
        this.part(f, 'spin', spin)
        this.eyeWhites(f)
        break
      case 'bell':
        this.part(f, 'clapper', -pose.flap * 0.7)
        this.put(f.body, 0, 0)
        break
    }
    // Asleep, he opens one eye and no more.
    this.eyes(f, b, r, pose.shut, 0, b.kind === 'farmer')
    this.mouth(f, pose.mouth)
    this.end()
  }

  private eyeWhites(f: Figure): void {
    const g = this.g
    for (const e of f.eyes) { g.fillStyle = '#b9c3cc'; g.beginPath(); g.arc(e.x, e.y, e.r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(e.x - e.r * 0.04, e.y - e.r * 0.05, e.r * 0.91, 0, TAU); g.fill(); this.drawn += 1 }
  }

  /** What each one looks at when no finger is down. */
  private lookOf(b: Body): Spot | null {
    const y = this.yard
    if (b.kind === 'pig') return y.middle(y.things.teapot)
    if (b.kind === 'farmer') return null
    const child = y.brood.find((c) => c.mother === b.id && c.kind === 'chick')
    if (child) return y.middle(child)
    const a = this.t * 0.35 + b.id.length * 2.1
    return { x: b.x + cos(Math.floor(a) * 2.4) * 200, y: b.y - 60 + sin(Math.floor(a) * 1.7) * 60 }
  }

  private drawHen(b: Body): void {
    const y = this.yard, f = this.cast.hen, pose = this.begin(b), t = this.t
    if (!b.act) { pose.sy *= 1 + sin(t * 1.6) * 0.012; pose.rot += sin(t * 0.7) * 0.015 }
    const mothers = y.mothers
    const ringing = y.brood.some((c) => { const ring = c.mother ? ringOf(c.id, mothers) : null; return ring !== null && y.running(ring) })
    const at = { x: HEN.x, y: HEN.y, z: 0 }
    const foot = b.act?.name === 'henFoot'
    const busy = y.brood.find((c) => c.opening !== null) ?? y.brood.find((c) => c.act)
    let look: Spot | null = y.finger ?? (busy ? y.middle(busy) : y.asking ? y.middle(y.asking) : { x: HEN.x + 40, y: HEN.y })
    if (ringing && !b.act) look = { x: HEN.x + cos(t * 5) * 100, y: HEN.y - 150 + sin(t * 5) * 100 }
    const r = this.roll(b, at, look, pose)
    this.enter(b, f, at, pose, 1)
    if (foot) this.part(f, 'leg')
    this.put(f.body, 0, 0)
    // One side of her skirt is held up over the hollow, until something is under it.
    const tuck = y.brood.find((c) => c.tucking !== null)
    const lift = tuck ? clamp(abs(tuck.tucking! - 0.5) * 2 - 0.4) : 1
    this.part(f, 'skirt', -0.9 * lift - sin(t * 1.6) * 0.05, 0, -6 * lift)
    const wing = y.wing > 0 ? 1 : clamp(pose.flap)
    this.part(f, 'wing', wing * 1 - min(0, pose.flap) * 0.4 + (y.wing > 0 ? sin(t * 5) * 0.08 : sin(t * 1.6) * 0.03))
    const g = this.g
    g.save()
    g.translate(88, -186); g.rotate(pose.head); g.translate(-88, 186)
    this.part(f, 'head')
    this.eyes(f, b, r, pose.shut, (pose.head + pose.rot))
    this.part(f, 'under', pose.mouth * 0.5)
    this.part(f, 'top', -pose.mouth * 0.3)
    g.restore()
    this.end()
    this.put(this.cast.nestFront, HEN.x, HEN.y + 8)
  }

  private drawBrood(c: Chick): void {
    if (c.opening !== null) return this.drawOpening(c)
    if (c.tucking !== null) return this.drawTuck(c)
    if (c.laying !== null) {
      const u = (c.laying - LAY_S * 0.6) / (LAY_S * 0.4)
      if (u > 0) this.drawEgg(c, hop({ x: HEN.x - 60, y: HEN.y + 20, z: 20 }, c, u))
      return
    }
    if (c.kind === 'egg') this.drawEgg(c, this.yard.place(c))
    else this.drawChick(c, this.yard.place(c))
  }

  private drawTuck(c: Chick): void {
    const t = c.tucking!
    if (t < 0.55) { const at = this.yard.place(c); if (c.wasEgg) this.drawEgg(c, at); else this.drawChick(c, at, 1 - (t / 0.55) * 0.35) } else if (t > 1.2) this.drawEgg(c, hop({ x: HEN.x + (c.wasEgg ? 60 : -70), y: HEN.y + 22, z: 16 }, c, (t - 1.2) / (TUCK_S - 1.2)))
  }

  private drawEgg(c: Chick, at: Place): void {
    const g = this.g, y = this.yard, e = this.cast.eggs[c.id], pose = this.begin(c), s = scaleAt(at.y)
    const asking = y.asking === c, held = y.carry?.id === c.id
    // It leans toward what it would see.
    const near = y.nearest(c), n = near === c.id ? { x: PUDDLE.x } : y.place(y.of(near)!)
    const lean = max(-1, min(1, (n.x - at.x) / 90)) * 0.1
    pose.rot += lean + sin(this.t * 1.7 + c.id.charCodeAt(1)) * (asking ? 0.05 : 0.02) + (held ? sin(this.t * 6) * 0.08 : 0)
    g.globalAlpha = max(0.25, 1 - at.z / 260)
    this.put(this.cast.contact, at.x + 4, at.y + 1, 0.46 * s, 0.4 * s)
    g.globalAlpha = 1
    for (const pass of [0, 1]) {
      g.save()
      g.translate(at.x + pose.dx + (pass ? 0 : CAST.x), at.y - at.z - pose.lift + (pass ? 0 : CAST.y))
      g.rotate(pose.rot)
      if (pose.spin) { g.translate(0, -SPIN_AT * s); g.rotate(pose.spin); g.translate(0, SPIN_AT * s) }
      g.scale(s * pose.sx * (n.x < at.x ? -1 : 1), s * pose.sy)
      if (pass === 0) this.put(e.shadow, 0, 0)
      else { this.put(e.whole, 0, 0); if (c.host === 'teapot') this.put(this.cast.things.teapot.parts.lid.sprite, 0, -100, 0.8); this.put(e.beak, 18 + clamp(pose.flap) * 8 + (asking ? sin(this.t * 2.4) * 1.5 : 0), -61, 0.8 + clamp(pose.flap) * 0.3) }
      g.restore()
    }
  }

  private drawOpening(c: Chick): void {
    const g = this.g, y = this.yard, e = this.cast.eggs[c.id], t = c.opening!, at = y.place(c), s = scaleAt(at.y)
    const held = t < LID
    if (held) {
      const u = t / LID
      const shake = sin(u * PI * 9) * 0.1 * u
      g.globalAlpha = 1
      this.put(this.cast.contact, at.x + 4, at.y + 1, 0.46 * s, 0.4 * s)
      g.save(); g.translate(at.x, at.y - at.z); g.rotate(shake); g.scale(s * (1 + u * 0.06 - c.squash * 0.7), s * (1 - sin(u * PI) * 0.1 + c.squash * 0.9))
      this.put(e.bottom, 0, 0); this.put(e.lid, 0, -u * 7, 1, 1, u * 0.06)
      g.restore()
      return
    }
    const rise = t < OUT - 0.5 ? smooth((t - LID) / 0.3) : 1
    const out = clamp((t - (OUT - 0.5)) / 0.5)
    this.put(this.cast.contact, at.x + 4, at.y + 1, 0.46 * s, 0.4 * s)
    const chick = { x: at.x + out * 10, y: at.y - 0.1, z: at.z + (rise * 44 - 24) * s * (1 - out) + sin(out * PI) * 50 }
    this.drawChick(c, chick, 0.86 + rise * 0.14, true, out)
    g.globalAlpha = 1 - smooth((out - 0.5) * 2)
    this.put(e.bottom, at.x - out * 26, at.y - at.z, s, s, -out * 0.9)
    g.globalAlpha = 1
    // The lid flies off, goes round once and comes down beside it.
    const l = t - LID
    if (l < 1.3) {
      const fly = min(1, l / 0.75)
      g.globalAlpha = 1 - smooth((l - 0.9) / 0.4)
      this.put(e.lid, at.x - fly * 84, at.y - at.z - sin(fly * PI) * 120 + fly * 56, s, s, -fly * PI * 1.9)
      g.globalAlpha = 1
    }
  }

  private drawChick(c: Chick, at: Place, size = 1, opening = false, out = 0): void {
    const y = this.yard, f = this.cast.chicks[c.id], pose = this.begin(c)
    const gait: Gait = c.kind === 'chick' ? y.gait(c) : 'egg'
    const held = y.carry?.id === c.id
    if (opening) { pose.rot += out * PI * 2; pose.mouth = max(pose.mouth, c.opening! < LAND ? 0.2 : pose.mouth) } else if (held) { pose.flap += sin(this.t * 22) * 0.8; pose.rot += sin(this.t * 7) * 0.12; pose.mouth = max(pose.mouth, 0.3) } else if (c.dizzy) { pose.rot += sin(this.t * 3 + c.stance) * 0.16; pose.sy *= 0.84; pose.sx *= 1.08 } else if (c.host && !c.act) { const on = y.of(c.host); pose.rot += sin(this.t * (on?.kind === 'bell' ? 9 : 2.2) + c.stance) * 0.07; if (on?.kind === 'ball') { pose.dx += sin(this.t * 3) * 7; pose.lift += abs(sin(this.t * 14)) * 5 } } else if (!c.act || c.going > 0.4) {
      const go = c.going
      if (go > 0.08) add(pose, WALKS[gait](c.phase, go))
      if (go < 0.5 && c.kind === 'chick') add(pose, scaled(STANCES[gait](c.stance), 1 - go * 2))
    }
    const m = c.mother && c.mother !== c.id ? y.of(c.mother) : null
    const host = c.host ? y.of(c.host) : null
    let look: Spot | null = m ? y.middle(m) : c.mother === c.id ? { x: PUDDLE.x, y: PUDDLE.y } : null
    const rolling = (opening && c.opening! < LAND - 0.12) || c.dizzy
    if (opening && c.opening! < LAND && !rolling) { const n = y.nearest(c); look = n === c.id ? { x: PUDDLE.x, y: PUDDLE.y } : y.middle(y.of(n)!) }
    if (host?.kind === 'teapot') pose.rot = sin(this.t * 2) * 0.06
    const r = this.roll(c, at, look, pose, rolling)
    this.enter(c, f, at, pose, size * 1.16)
    // Feet: tucked in by one that takes after an egg, running on a ball, and stepping otherwise.
    if (!(c.kind === 'chick' && gait === 'egg' && !c.host)) {
      const run = host?.kind === 'ball' ? sin(this.t * 22) : c.going > 0.2 ? sin(c.phase * PI * 2) * c.going : 0
      this.part(f, 'foot', run * 0.5, -12, -max(0, run) * 7)
      this.part(f, 'foot', -run * 0.5, 12, -max(0, -run) * 7)
    }
    this.put(f.body, 0, 0)
    if (c.kind === 'chick' && c.tucking === null && !(opening && c.thread > 0.4)) this.put(this.cast.scarf[gait], 4, -55)
    this.part(f, 'wing', pose.flap * 0.9)
    this.eyes(f, c, r, pose.shut, pose.rot * c.dir)
    this.part(f, 'under', pose.mouth * 0.6)
    this.part(f, 'top', -pose.mouth * 0.35)
    if (host?.kind === 'teapot') { const lid = this.cast.things.teapot.parts.lid; this.put(lid.sprite, 6, -96, 0.8, 0.8, sin(this.t * 2) * 0.1) }
    this.end()
  }

  /** The thread from a chick to its mother: taut when it has just been tied, and again for a moment when it is asked whose it is. */
  private threads(): void {
    const g = this.g, y = this.yard
    for (const c of y.brood) {
      if (c.thread <= 0 || c.kind !== 'chick' || !c.mother) continue
      const at = y.place(c), b = c.mother === c.id ? { x: PUDDLE.x, y: PUDDLE.y } : y.middle(y.of(c.mother)!)
      const a = { x: at.x + 6 * c.dir, y: at.y - at.z - (c.opening !== null ? 80 : 58) * scaleAt(at.y) }
      const [light, dark] = YARN[y.gait(c)]
      const k = clamp(c.thread * 3), since = 1.6 - c.thread
      const pull = since < 0.35 ? sin(since * 40) * 12 * (1 - since / 0.35) : 0
      const to = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
      const mx = (a.x + to.x) / 2, my = (a.y + to.y) / 2 + pull
      g.lineCap = 'round'
      for (const [w, col, dx, dy] of [[8, 'rgba(10,30,40,0.3)', 3, 5], [7, dark, 0, 0], [4, light, -0.6, -1]] as const) {
        g.strokeStyle = col; g.lineWidth = w
        g.beginPath(); g.moveTo(a.x + dx, a.y + dy); g.quadraticCurveTo(mx + dx, my + dy, to.x + dx, to.y + dy); g.stroke()
      }
      this.drawn += 1
    }
  }

  private particles(): void {
    const g = this.g
    for (const f of this.yard.fx) {
      if (f.age < 0) continue
      const u = f.age / f.lasts, soft = f.kind === 'steam' || f.kind === 'bubble'
      g.globalAlpha = soft ? 0.9 * (1 - u) : 1 - smooth((u - 0.7) / 0.3)
      this.put(this.cast.fx[f.kind], f.x, f.y - f.z, soft ? 0.6 + u : 1, undefined, f.kind === 'shell' || f.kind === 'feather' ? f.turn + u * 5 : 0)
    }
    g.globalAlpha = 1
  }

  private ghost(move: Move, guidance: Guidance): void {
    const second = move.then !== undefined && guidance.demo! >= 0.5
    const u = move.then ? (guidance.demo! * 2) % 1 : guidance.demo!
    const g = this.g, p = handPose(u, move.drag, this.hand)
    if (second) move = { ...move, from: move.then!, to: move.then! }
    const x = move.from.x + (move.to.x - move.from.x) * p.travel, y = move.from.y + (move.to.y - move.from.y) * p.travel + (1 - p.press) * 26
    g.globalAlpha = p.opacity * 0.5
    this.put(this.cast.handShadow, x + 6 + (1 - p.press) * 8, y + 8 + (1 - p.press) * 12, 1, 1, -0.3)
    g.globalAlpha = p.opacity
    this.put(this.cast.hand, x, y, 1 - p.press * 0.08, undefined, -0.3)
    g.globalAlpha = 1
  }
}

/** How far above where it stands an egg's middle is. */
const SPIN_AT = 54
const clamp2 = (v: number) => min(1.5, max(-1.5, v))
const hop = (from: Place, to: Spot, u: number): Place => { const k = clamp(u); return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, z: from.z * (1 - k) + sin(k * PI) * 44 } }
const scaled = (p: Partial<Pose>, k: number): Partial<Pose> => ({ dx: (p.dx ?? 0) * k, lift: (p.lift ?? 0) * k, rot: (p.rot ?? 0) * k, sx: 1 + ((p.sx ?? 1) - 1) * k, sy: 1 + ((p.sy ?? 1) - 1) * k, mouth: (p.mouth ?? 0) * k, shut: (p.shut ?? 0) * k, flap: (p.flap ?? 0) * k, gazeX: (p.gazeX ?? 0) * k, gazeY: (p.gazeY ?? 0) * k })
