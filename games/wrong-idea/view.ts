import { BUTLER_DRAWN, DYE, drawButler, drawChair, drawLiving, drawSmall, drawThrone, type Gaze, type Hands } from './figures'
import { JUMP_SECONDS, REACH_SECONDS, THINK, THINK_SECONDS, TOSS_SECONDS } from './errand'
import { handPose, type Guidance, type HandPose } from './guidance'
import { drawIdea, drawMini } from './icons'
import { DREAM, ROPE, SIZE, VESSELS, homeOf, type Spot } from './layout'
import { ellipse, flat, round, soft, Sprites, type Canvas, type G } from './litho'
import { springTo, type Spring } from './motion'
import type { Play } from './play'
import { paintChart, vesselBack, vesselFront, type Frame } from './room'
import { STAGE, fit } from './stage'
import { BUTLER, PLACES, THINGS, thingOf, type Place, type ThingId } from './things'
import { WISHES, wishPlaces } from './wishes'

// Draws the game as it stands. It decides nothing: what it keeps is only how
// things swing, how eyes come round and where his gloves are just now.

type Eased = { gaze: Gaze; swing: Spring; lastX: number }

/** What is in a place, from the back to the front. */
const HEAP: readonly ThingId[] = ['queen', 'king', 'gran', 'piglet', 'hen', 'cat', 'red-sock', 'blue-pot', 'red-hat', 'yellow-pot', 'red-pot', 'yellow-hat', 'yellow-sock', 'blue-sock', 'blue-hat']
const CLOUD = '#f3ead2', COLD = '#8f9a62', WATER = '#9dbcc0'

export class View {
  readonly sprites = new Sprites()
  private chart: Canvas | null = null
  private chartKey = ''
  private frame: Frame = { x0: 0, y0: 0, x1: STAGE.width, y1: STAGE.height }
  private readonly eased: Record<ThingId, Eased> = {}
  private readonly hands = { left: { x: -100, y: -180 }, right: { x: 100, y: -180 } }
  private tint = [143, 154, 98]
  private foam = 0
  private time = 0
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  constructor(private readonly g: G) {
    for (const one of [...THINGS, BUTLER]) this.eased[one.id] = { gaze: { x: 0, y: 0 }, swing: { x: 0, v: 0 }, lastX: 0 }
  }

  draw(play: Play | null, guidance: Guidance | null, step: number, width: number, height: number, dpr: number, painted = dpr): number {
    const g = this.g, by = fit(width, height)
    if (by.scale <= 0) return 0
    this.time += step
    // Painted for the device and not for the tier, so a tier change paints nothing anew.
    this.sprites.resize(Math.min(2.2, Math.max(1, painted * by.scale)))
    this.sprites.drawn = 0
    const key = `${width} ${height} ${painted}`
    if (key !== this.chartKey || !this.chart) {
      this.frame = { x0: -by.x / by.scale, y0: -by.y / by.scale, x1: (width - by.x) / by.scale, y1: (height - by.y) / by.scale }
      this.chart = paintChart(this.frame, painted * by.scale)
      this.chartKey = key
    }
    g.setTransform(dpr * by.scale, 0, 0, dpr * by.scale, dpr * by.x, dpr * by.y)
    g.drawImage(this.chart, this.frame.x0, this.frame.y0, this.frame.x1 - this.frame.x0, this.frame.y1 - this.frame.y0)
    if (play) this.house(play, guidance, step)
    return this.sprites.drawn + 1
  }

  private house(play: Play, guidance: Guidance | null, step: number): void {
    const g = this.g, glow = guidance?.glow ?? 0
    this.mouse()
    this.pendulum()
    this.rope(play)
    const at = (mode: 'home' | Place, id: ThingId) => {
      const now = play.shown[id]
      return now.mode === 'rest' && now.where === mode
    }
    for (const one of THINGS) if (!one.alive && at('home', one.id)) {
      if (glow > 0.01) this.halo(play.spotOf(one.id), one.kind, glow)
      this.thing(play, one.id, step)
    }
    this.still(homeOf('gran'), play.granLift(), () => drawChair(g, this.sprites))
    this.still(homeOf('king'), 0, () => drawThrone(g, this.sprites))
    for (const id of ['gran', 'king', 'queen', 'cat', 'hen', 'piglet']) if (at('home', id)) {
      const spot = play.spotOf(id)
      if (id !== 'gran' && id !== 'king') this.shadow(spot, SIZE[thingOf(id).kind].w * 0.42)
      if (glow > 0.01 && !thingOf(id).heavy) this.halo(spot, thingOf(id).kind, glow)
      this.thing(play, id, step)
    }
    const jumping = play.errand.act.do === 'jump'
    const floor = !play.errand.inside && !jumping
    if (floor) this.butler(play, step)
    for (const place of PLACES) {
      const tint = this.surface(play, place, step)
      vesselBack(g, this.sprites, place, tint)
      if (play.errand.inside === place) this.butler(play, step)
      for (const id of HEAP) if (at(place, id)) this.thing(play, id, step)
      this.front(play, place, tint, step)
    }
    if (jumping) this.butler(play, step)
    for (const one of play.splashes) this.splash(one.place, one.t, one.x, one.big)
    for (const one of THINGS) if (play.shown[one.id].mode === 'butler') this.thing(play, one.id, step)
    if (floor && play.errand.load.length > 0) this.fingers(play)
    for (const one of THINGS) if (play.shown[one.id].mode === 'worn' || play.shown[one.id].mode === 'fly') this.thing(play, one.id, step)
    this.dream(play)
    this.thought(play)
    for (const one of THINGS) if (play.shown[one.id].mode === 'hand') this.thing(play, one.id, step)
    for (const ring of play.rings) if (ring.t < 0.4) {
      g.strokeStyle = `rgba(255,248,226,${0.75 * (1 - ring.t / 0.4)})`
      g.lineWidth = 4
      g.beginPath(); g.arc(ring.x, ring.y, 14 + ring.t * 90, 0, Math.PI * 2); g.stroke()
    }
    if (guidance?.demo != null && !play.busy) this.ghost(play, guidance)
  }

  // --- The living house ---------------------------------------------------------

  private still(spot: Spot, lift: number, draw: () => void): void {
    const g = this.g
    this.shadow(spot, 96)
    g.save()
    g.translate(spot.x, spot.y - lift)
    if (lift) g.rotate(Math.sin(this.time * 22) * lift * 0.003)
    draw()
    g.restore()
  }

  private shadow(spot: Spot, wide: number): void {
    flat(this.g, ellipse(spot.x, spot.y - 1, wide, 9), 'rgba(48,30,24,0.28)', [0, 0, 1, 1], 0)
  }

  /** A mouse goes along the attic about its own business, and looks out now and then. */
  private mouse(): void {
    const g = this.g, t = this.time % 26, there = t < 13
    const p = there ? t / 13 : (26 - t) / 13
    const stop = Math.min(1, Math.max(0, (p - 0.4) / 0.2)), eased = p < 0.4 ? p : p > 0.6 ? p - 0.2 : 0.4
    const x = 470 + eased * 300, resting = stop > 0 && stop < 1
    g.save()
    g.translate(x, 92 - (resting ? 0 : Math.abs(Math.sin(this.time * 14)) * 3))
    g.scale(there ? 1 : -1, 1)
    this.sprites.stamp(g, 'mouse', [-40, -30, 70, 34], (c) => {
      c.strokeStyle = '#a08d86'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, -4); c.quadraticCurveTo(-30, -2, -36, -14); c.stroke()
      flat(c, soft([-18, -4], [-12, -18], [8, -20], [24, -8], [18, 0], [-14, 0]), '#b3a198', [-18, -20, 42, 20], 0.6)
      flat(c, ellipse(4, -19, 7, 7), '#c9aca2', [0, 0, 1, 1], 0)
      flat(c, ellipse(15, -11, 2.2, 2.2), '#33272b', [0, 0, 1, 1], 0)
    })
    g.restore()
  }

  private pendulum(): void {
    const g = this.g
    g.save()
    g.translate(704, 268)
    this.sprites.stamp(g, 'clock', [-26, -38, 52, 60], (c) => {
      flat(c, soft([-20, -30], [0, -40], [20, -30], [22, 18], [-22, 18]), '#65472f', [-22, -38, 44, 56], 0.6)
      flat(c, ellipse(0, -8, 14, 14), '#e2d4b2', [-14, -22, 28, 28], 0.3)
    })
    g.rotate(Math.sin(this.time * 3) * 0.22)
    g.fillStyle = '#65472f'
    g.fillRect(-1.5, 16, 3, 34)
    flat(g, ellipse(0, 54, 8, 8), '#b98a3a', [0, 0, 1, 1], 0)
    g.restore()
  }

  private rope(play: Play): void {
    const g = this.g, pull = play.rope.x, sway = Math.sin(this.time * 1.1) * 3
    g.strokeStyle = '#8a5a48'
    g.lineWidth = 7
    g.lineCap = 'round'
    g.beginPath(); g.moveTo(ROPE.x, ROPE.top - 8); g.quadraticCurveTo(ROPE.x + sway, (ROPE.top + ROPE.y) / 2, ROPE.x + sway, ROPE.y + pull); g.stroke()
    g.save()
    g.translate(ROPE.x, ROPE.top + 14)
    g.rotate(Math.sin(this.time * 18) * Math.min(0.5, Math.abs(play.rope.v) * 0.0012))
    this.sprites.stamp(g, 'bell', [-34, -26, 68, 66], (c) => {
      flat(c, soft([-9, -20], [9, -20], [16, 6], [29, 28], [-29, 28], [-16, 6]), '#b98a3a', [-28, -20, 56, 48], 0.7)
      flat(c, ellipse(0, 31, 7, 7), '#8d6526', [0, 0, 1, 1], 0)
    })
    g.restore()
    g.save()
    g.translate(ROPE.x + sway, ROPE.y + pull)
    this.sprites.stamp(g, 'tassel', [-24, -20, 48, 78], (c) => {
      flat(c, ellipse(0, -4, 15, 13), '#b98a3a', [-15, -17, 30, 26], 0.5)
      flat(c, soft([-12, 4], [12, 4], [21, 48], [0, 54], [-21, 48]), '#8f4a45', [-20, 4, 40, 50], 0.8)
      c.strokeStyle = 'rgba(60,24,24,0.5)'; c.lineWidth = 2
      for (const x of [-8, 0, 8]) { c.beginPath(); c.moveTo(x * 0.6, 10); c.lineTo(x * 1.5, 48); c.stroke() }
    })
    g.restore()
  }

  private halo(spot: Spot, kind: string, glow: number): void {
    const g = this.g, { w, h } = SIZE[kind], r = Math.max(w, h) * 0.72 * spot.s
    const sprite = this.sprites.get('halo', [-64, -64, 128, 128], (c) => {
      const shine = c.createRadialGradient(0, 0, 8, 0, 0, 62)
      shine.addColorStop(0, 'rgba(255,246,214,0.95)')
      shine.addColorStop(0.55, 'rgba(255,240,196,0.55)')
      shine.addColorStop(1, 'rgba(255,240,196,0)')
      c.fillStyle = shine
      c.fillRect(-64, -64, 128, 128)
    })
    g.globalAlpha = glow * (0.6 + Math.sin(this.time * 2.6) * 0.25)
    g.drawImage(sprite.canvas, spot.x - r, spot.y - h * 0.5 * spot.s - r, r * 2, r * 2)
    g.globalAlpha = 1
    this.sprites.drawn += 1
  }

  private gazeOf(play: Play, id: ThingId, spot: Spot, step: number): Gaze {
    const eased = this.eased[id], size = SIZE[thingOf(id).kind]
    const dx = play.gaze.x - spot.x, dy = play.gaze.y - (spot.y - size.h * spot.s * 0.78), far = Math.hypot(dx, dy) || 1
    const near = Math.min(1, far / 60)
    const rate = Math.min(1, step * play.movers[id].look)
    eased.gaze.x += ((dx / far) * near - eased.gaze.x) * rate
    eased.gaze.y += ((dy / far) * near - eased.gaze.y) * rate
    return eased.gaze
  }

  private thing(play: Play, id: ThingId, step: number): void {
    const g = this.g, thing = thingOf(id), spot = play.spotOf(id), now = play.shown[id], eased = this.eased[id]
    const held = now.mode === 'hand'
    const size = SIZE[thing.kind]
    if (step > 0) {
      const vx = held ? (spot.x - eased.lastX) / step : 0
      springTo(eased.swing, Math.max(-0.7, Math.min(0.7, -vx * 0.0011)), thing.heavy ? 60 : 120, thing.heavy ? 5 : 7, step)
      eased.lastX = spot.x
    }
    const q = Math.max(-0.5, Math.min(0.5, play.squash[id].x)), tug = play.tug[id].x
    const pose = play.movers[id]?.pose
    const sway = !thing.alive && now.mode === 'rest' && now.where !== 'home' && now.where !== 'bed' ? Math.sin(this.time * 2 + spot.x) : 0
    const sit = id === 'gran' && now.mode === 'rest' && now.where === 'home'
    const lift = (pose?.lift ?? 0) + (sit ? play.granLift() : 0) + sway * 2.5
    g.save()
    g.translate(spot.x + tug * 16, spot.y - lift)
    if (now.mode === 'fly') g.rotate(Math.sin(Math.max(0, Math.min(1, now.t / now.dur)) * Math.PI * 2) * 0.3 * (thing.heavy ? 0.4 : 1))
    if (held) {
      // It swings under the finger.
      g.translate(0, -size.h * 0.6); g.rotate(eased.swing.x); g.translate(0, size.h * 0.6)
    } else g.rotate(eased.swing.x * 0.4 + sway * 0.05 + (pose?.lean ?? 0) + tug * 0.16)
    const tall = (pose?.squash ?? 1) * (1 + q * 0.5) * (1 + Math.abs(tug) * 0.06)
    g.scale(spot.s * (2 - tall > 0.6 ? 2 - tall : 0.6), spot.s * tall)
    if (pose) {
      const where = now.mode === 'rest' ? now.where : now.mode === 'fly' || held || now.mode === 'butler' || now.mode === 'worn' ? 'bed' : 'home'
      drawLiving(thing.kind, { g, s: this.sprites, pose, gaze: this.gazeOf(play, id, spot, step), t: this.time, place: where })
    } else drawSmall(g, this.sprites, thing)
    g.restore()
  }

  // --- The butler ----------------------------------------------------------------

  private butler(play: Play, step: number): void {
    const g = this.g, errand = play.errand, spot = errand.spot(), pose = play.movers.butler.pose, act = errand.act
    const inside = errand.inside !== null
    const k = spot.s * BUTLER_DRAWN
    const rel = (x: number, y: number): Gaze => ({ x: (x - spot.x) / k, y: (y - spot.y) / k })
    // Where his gloves want to be.
    const rock = Math.sin(this.time * 1.7) * 5
    let left = { x: -104, y: -196 + rock }, right = { x: 104, y: -196 - rock }, point = false, brow = 0, mouth = 0, lift = 0, lean = 0
    const holding = play.holding
    if (errand.load.length > 0 || act.do === 'toss') {
      const first = errand.load[0] ?? null
      const wide = first ? Math.max(46, (SIZE[thingOf(first).kind].w * errand.loadSpot(0, first).s) / 2) : 60
      const up = act.do === 'toss' ? Math.sin(Math.min(1, act.t / TOSS_SECONDS) * Math.PI) * 60 : 0
      left = { x: -wide - 4, y: -452 + up }
      right = { x: wide + 4, y: -452 + up }
    }
    if (act.do === 'reach') {
      const to = rel(act.to.x, act.to.y - 40), p = Math.sin(Math.min(1, act.t / REACH_SECONDS) * Math.PI)
      const which = to.x < 0 ? left : right
      which.x += (to.x - which.x) * p
      which.y += (to.y - which.y) * p
    } else if (act.do === 'think') {
      const stage = act.t < THINK.freeze ? 0 : act.t < THINK.freeze + THINK.show ? 1 : 2
      if (stage === 0) { left = { x: -128, y: -330 }; right = { x: 128, y: -330 }; brow = 1.3; mouth = 0.5 }
      else if (stage === 1) { right = { x: 44, y: -330 }; left = { x: -60, y: -222 }; brow = 0.2 + Math.sin(act.t * 12) * 0.3 }
      else { right = { x: 86, y: -470 }; left = { x: -110, y: -250 }; point = true; brow = 1.2; mouth = 0.8; lift = Math.sin(((act.t - THINK.freeze - THINK.show) / THINK.settle) * Math.PI) * 26 }
    } else if (act.do === 'look') {
      right = { x: 10, y: -286 }; left = { x: -70, y: -232 }; brow = 1
    } else if (act.do === 'jump') {
      left = { x: -120, y: -440 }; right = { x: 120, y: -440 }; brow = 1.2; mouth = 0.9
    } else if (holding && errand.load.length === 0) {
      // His gloves go out to whatever the child carries, as far as he dares.
      const to = rel(play.gaze.x, play.gaze.y), far = Math.hypot(to.x, to.y + 280) || 1, reach = Math.min(150, far * 0.55)
      const dx = (to.x / far) * reach, dy = ((to.y + 280) / far) * reach
      left = { x: -84 + dx, y: -230 + dy }
      right = { x: 84 + dx, y: -230 + dy }
      brow = 0.9
      lean = Math.max(-0.1, Math.min(0.1, to.x * 0.00025))
    } else if (inside) {
      left = { x: -88, y: -226 }; right = { x: errand.inside === 'soup' ? 62 : 88, y: errand.inside === 'soup' ? -396 : -226 }
    }
    const rate = Math.min(1, step * 13)
    for (const [hand, to] of [[this.hands.left, left], [this.hands.right, right]] as const) {
      hand.x += (to.x - hand.x) * rate
      hand.y += (to.y - hand.y) * rate
    }
    const hands: Hands = { left: this.hands.left, right: this.hands.right, point }
    const q = Math.max(-0.4, Math.min(0.4, play.squash.butler.x))
    const tall = pose.squash * (1 + q * 0.3)
    if (!inside && act.do !== 'jump') this.shadow({ x: spot.x, y: spot.y + 3, s: 1 }, 84)
    g.save()
    g.translate(spot.x, spot.y - (errand.busy ? pose.lift * 0.3 : pose.lift * 0.5) - lift)
    g.rotate(pose.lean + lean + (act.do === 'jump' ? Math.sin(Math.min(1, act.t / JUMP_SECONDS) * Math.PI) * 0.3 : 0))
    g.scale(k * (2 - tall), k * tall)
    const shape = { ...pose, brow: pose.brow + brow, mouth: Math.max(pose.mouth, mouth) }
    if (act.do === 'look') shape.tilt += Math.sin(act.t * 5) * 0.12
    drawButler({ g, s: this.sprites, pose: shape, gaze: this.gazeOf(play, BUTLER.id, spot, step), t: this.time, place: inside || act.do === 'jump' ? 'bath' : 'home' }, hands, errand.stride, errand.speed)
    g.restore()
  }

  /** His thumbs over what he carries, so he holds it and it does not float. */
  private fingers(play: Play): void {
    const g = this.g, spot = play.errand.spot(), k = spot.s * BUTLER_DRAWN
    for (const side of [-1, 1]) {
      const hand = side < 0 ? this.hands.left : this.hands.right
      flat(g, ellipse(spot.x + (hand.x - side * 8) * k, spot.y + (hand.y - 4) * k, 9, 12), '#f7f0dd', [0, 0, 1, 1], 0)
    }
  }

  // --- The places ------------------------------------------------------------------

  private within(play: Play, place: Place) {
    return THINGS.filter((one) => {
      const now = play.shown[one.id]
      return now.mode === 'rest' && now.where === place
    })
  }

  /** The soup turns the colour of what is in it. */
  private surface(play: Play, place: Place, step: number): string {
    if (place !== 'soup') return WATER
    const within = this.within(play, place), base = [143, 154, 98], rate = Math.min(1, step * 1.6)
    this.tint = this.tint.map((v, i) => {
      const sum = within.reduce((total, one) => total + parseInt((one.colour ? DYE[one.colour] : COLD).slice(1 + i * 2, 3 + i * 2), 16), 0)
      const to = within.length === 0 ? base[i] : base[i] + (sum / within.length - base[i]) * Math.min(0.62, 0.3 + within.length * 0.05)
      return v + (to - v) * rate
    })
    return `rgb(${this.tint.map(Math.round).join()})`
  }

  private front(play: Play, place: Place, tint: string, step: number): void {
    const g = this.g, { x, half, rim } = VESSELS[place]
    vesselFront(g, this.sprites, place, tint, play.slosh[place].x * 2)
    const idle = Math.sin(this.time * 1.4) * 1.5
    if (place === 'soup') {
      // Cold soup: peas and carrot rounds bob in it, and nothing steams.
      for (let i = 0; i < 6; i++) flat(g, ellipse(x - half * 0.66 + i * half * 0.265, rim + 19 + Math.sin(i * 2.1) * 4 + idle * (i % 2 ? 1 : -1) + play.slosh.soup.x * (i - 2.5) * 0.8, i % 3 === 0 ? 11 : 6, i % 3 === 0 ? 6 : 4.5), i % 3 === 0 ? '#c9823c' : '#6f8a42', [0, 0, 1, 1], 0)
    } else if (place === 'bath') {
      const full = this.within(play, place).length
      this.foam += ((full > 0 ? Math.min(1, 0.35 + full * 0.12) : 0.16) - this.foam) * Math.min(1, step * 2)
      const count = Math.round(4 + this.foam * 12)
      for (let i = 0; i < count; i++) {
        const p = (i + 0.5) / count, r = 7 + ((i * 7) % 5) * 2.4 * (0.5 + this.foam)
        flat(g, ellipse(x - half * 0.86 + half * 1.72 * p, rim + 17 + Math.sin(i * 1.7) * 5 + idle * (i % 2 ? 1 : -1) + play.slosh.bath.x * Math.sin(p * 6) * 2, r, r * 0.86), i % 2 ? '#f4f1e6' : '#e3e6dd', [0, 0, 1, 1], 0)
      }
      // The tap drips.
      const drip = this.time % 1.9
      if (drip > 1.2) flat(g, ellipse(x + half - 66, rim - 42 + (drip - 1.2) ** 2 * 120, 3, 5), '#c9dadb', [0, 0, 1, 1], 0)
    }
    this.badge(play, place)
  }

  /** On each place a plaque with what he thinks belongs there. */
  private badge(play: Play, place: Place): void {
    const idea = play.idea(place), { x, rim } = VESSELS[place]
    if (!idea) return
    const thinking = play.errand.thought, t = thinking && thinking.place === place ? thinking.t : 9
    const shown = Math.min(1, Math.max(0, (t - THINK.freeze - THINK.show) / 0.4))
    if (shown <= 0) return
    const g = this.g, pop = shown + Math.sin(shown * Math.PI) * 0.16
    g.save()
    g.translate(x, rim + 68)
    g.scale(pop, pop)
    this.sprites.stamp(g, 'plaque', [-60, -46, 120, 94], (c) => {
      flat(c, round(-56, -42, 112, 86, 22), '#5d4433', [-56, -42, 112, 86], 0.5)
      flat(c, round(-50, -38, 100, 76, 18), CLOUD, [-50, -38, 100, 76], 0.18)
    })
    g.scale(0.6, 0.6)
    drawIdea(g, this.sprites, idea)
    g.restore()
  }

  private splash(place: Place, t: number, x: number, big: boolean): void {
    if (t > 0.7) return
    const g = this.g, { rim, half } = VESSELS[place], count = big ? 11 : 7, p = t / 0.7
    const colour = place === 'soup' ? `rgb(${this.tint.map(Math.round).join()})` : place === 'bath' ? '#dfeaea' : '#f2ead8'
    for (let i = 0; i < count; i++) {
      const dir = (i / (count - 1) - 0.5) * 2, jump = (big ? 150 : 88) * (1 - Math.abs(dir) * 0.55)
      const px = x + dir * (big ? half * 0.8 : 80) * (0.3 + p), py = rim + 6 - Math.sin(Math.PI * Math.min(1, p * 1.1)) * jump + p * 14
      const r = (place === 'bed' ? 7 : 9) * (1 - p * 0.6) * (big ? 1.3 : 1)
      flat(g, ellipse(px, py, r, place === 'bed' ? r * 0.5 : r * 1.15, dir), colour, [0, 0, 1, 1], 0)
    }
  }

  // --- The pictures in heads ---------------------------------------------------------

  private cloud(x: number, y: number, w: number, h: number, key: string): void {
    const g = this.g
    g.save()
    g.translate(x, y)
    this.sprites.stamp(g, key, [-w / 2 - 22, -h / 2 - 22, w + 44, h + 44], (c) => {
      for (const [colour, grow] of [['#6d5546', 5], [CLOUD, 0]] as const) {
        const rx = w / 2 + grow, ry = h / 2 + grow
        const bump: (readonly [number, number, number])[] = [[-0.62, -0.5, 0.48], [0, -0.66, 0.54], [0.62, -0.48, 0.48], [0.84, 0.1, 0.4], [0.5, 0.56, 0.46], [-0.1, 0.64, 0.5], [-0.64, 0.5, 0.46], [-0.86, 0, 0.4]]
        c.fillStyle = colour
        c.beginPath()
        for (const [dx, dy, r] of bump) { c.moveTo(dx * rx * 0.8, dy * ry); c.ellipse(dx * rx * 0.74, dy * ry * 0.72, rx * r * 0.72 + grow * 0.3, ry * r * 0.86 + grow * 0.3, 0, 0, Math.PI * 2) }
        c.ellipse(0, 0, rx * 0.82, ry * 0.78, 0, 0, Math.PI * 2)
        c.fill()
      }
    })
    g.restore()
  }

  private trail(from: Gaze, to: Gaze): void {
    const count = Math.min(9, Math.max(3, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 46)))
    for (let i = 0; i < count; i++) {
      const p = 0.1 + (i * 0.75) / (count - 1), r = 6 + p * 10
      const x = from.x + (to.x - from.x) * p, y = from.y + (to.y - from.y) * p
      flat(this.g, ellipse(x, y, r + 2, r + 2), '#6d5546', [0, 0, 1, 1], 0)
      flat(this.g, ellipse(x, y, r, r), CLOUD, [0, 0, 1, 1], 0)
    }
  }

  private thought(play: Play): void {
    const errand = play.errand, thought = errand.thought
    if (!thought || errand.bubble < 0.03) return
    const g = this.g, spot = errand.spot(), head = spot.y - 390 * spot.s
    const working = thought.t > THINK_SECONDS + 0.2
    const side = spot.x > 660 ? -1 : 1
    const k = errand.bubble * (working ? 0.56 : 1)
    const x = Math.max(150, Math.min(1030, spot.x + side * (working ? 128 : 190))), y = head < 300 ? (working ? 66 : 116) : head - 60
    this.trail({ x: spot.x + side * 64, y: head + 20 }, { x: x - side * 60 * k, y: y + 40 * k })
    g.save()
    g.translate(x, y)
    g.scale(k, k)
    this.cloud(0, 0, 232, 160, 'cloud')
    const settle = Math.min(1, Math.max(0, (thought.t - THINK.freeze - THINK.show) / 0.35))
    // The examples, side by side.
    const list = thought.examples.slice(-4)
    const gone = thought.idea ? settle : 0
    if (gone < 1) list.forEach((id, i) => {
      const seen = Math.min(1, Math.max(0, (thought.t - 0.1 - i * 0.1) / 0.2))
      const gap = list.length > 3 ? 50 : 66
      g.save()
      g.translate((i - (list.length - 1) / 2) * gap * (1 - gone), 2)
      g.scale(seen, seen)
      g.globalAlpha = 1 - gone
      drawMini(g, this.sprites, id, list.length > 2 ? 62 : 84)
      g.restore()
    })
    // What is left of them when the rest has fallen away.
    if (thought.idea && settle > 0) {
      const pop = settle + Math.sin(settle * Math.PI) * 0.25
      g.scale(pop, pop)
      g.scale(1.08, 1.08)
      drawIdea(g, this.sprites, thought.idea)
    }
    g.restore()
  }

  private dream(play: Play): void {
    const saved = play.saved
    if (!saved.begun) return
    const g = this.g, scene = play.scene
    const grown = play.dreaming ? play.dreamShown : 0
    const pop = grown + Math.sin(grown * Math.PI) * 0.15
    const head = play.spotOf('gran'), from = { x: head.x + 10, y: head.y - SIZE.gran.h * head.s - 4 }
    if (scene !== null) {
      // The bubble has burst: its bits fly off.
      if (scene < 0.5) for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, r = 40 + scene * 190
        flat(g, ellipse(DREAM.x + Math.cos(a) * r, DREAM.y + Math.sin(a) * r * 0.7, 15 * (1 - scene * 2), 13 * (1 - scene * 2)), CLOUD, [0, 0, 1, 1], 0)
      }
      return
    }
    if (grown <= 0) {
      // Between two dreams she holds a small one open, with nothing in it.
      if (!saved.dreaming) {
        const r = 26 + Math.sin(this.time * 2) * 3
        this.trail(from, { x: DREAM.x + 4, y: DREAM.y + 40 })
        flat(g, ellipse(DREAM.x + 4, DREAM.y + 10, r + 4, r * 0.84 + 4), '#6d5546', [0, 0, 1, 1], 0)
        flat(g, ellipse(DREAM.x + 4, DREAM.y + 10, r, r * 0.84), CLOUD, [0, 0, 1, 1], 0)
      }
      return
    }
    const wish = WISHES[saved.wish], places = wishPlaces(wish), { x, w: wide } = play.dreamBox(), y = DREAM.y
    this.trail(from, { x: DREAM.x, y: y + 56 })
    g.save()
    g.translate(x, y + Math.sin(this.time * 1.2) * 2)
    g.scale(pop, pop)
    this.cloud(0, 0, wide, DREAM.h, `dream-cloud ${places.length}`)
    const dry = Object.keys(wish.who).filter((id) => wish.who[id] === 'home')
    const room = wide * 0.74, each = room / (places.length + dry.length * 0.5)
    let left = -room / 2
    for (const place of places) {
      this.scene(place, Object.keys(wish.who).filter((id) => wish.who[id] === place), left + each / 2, 4, Math.min(0.41, each / 400))
      left += each
    }
    for (const id of dry) {
      g.save()
      g.translate(left + each * 0.25, 14)
      drawMini(g, this.sprites, id, 50)
      g.restore()
      left += each * 0.5
    }
    g.restore()
  }

  /** A place seen small, with people in it. */
  private scene(place: Place, who: readonly ThingId[], x: number, y: number, k: number): void {
    const g = this.g, { x: vx, rim } = VESSELS[place]
    g.save()
    g.translate(x, y)
    g.save(); g.scale(k, k); g.translate(-vx, -rim); vesselBack(g, this.sprites, place, place === 'soup' ? COLD : WATER); g.restore()
    who.forEach((id, i) => {
      g.save()
      g.translate((i - (who.length - 1) / 2) * 34, -14)
      drawMini(g, this.sprites, id, who.length > 2 ? 66 : 88)
      g.restore()
    })
    g.save(); g.scale(k, k); g.translate(-vx, -rim); vesselFront(g, this.sprites, place, place === 'soup' ? COLD : WATER, 0); g.restore()
    g.restore()
  }

  // --- The ghost hand --------------------------------------------------------------

  private ghost(play: Play, guidance: Guidance): void {
    const move = play.demo(guidance.demoIndex)
    if (!move || guidance.demo === null) return
    const g = this.g, hand = handPose(guidance.demo, true, this.hand)
    const x = move.from.x + (move.to.x - move.from.x) * hand.travel, y = move.from.y + (move.to.y - move.from.y) * hand.travel - Math.sin(Math.PI * hand.travel) * 40
    // Where it goes shows too.
    if (move.id) this.halo({ x: move.to.x, y: move.to.y + 44, s: 1.5 }, 'hat', hand.opacity)
    g.save()
    g.globalAlpha = hand.opacity * 0.9
    if (move.id && hand.press > 0.2) {
      g.save()
      g.globalAlpha *= 0.55
      g.translate(x, y + SIZE[thingOf(move.id).kind].h / 2)
      drawSmall(g, this.sprites, thingOf(move.id))
      g.restore()
    }
    g.translate(x, y + 8)
    g.scale(1 - hand.press * 0.1, 1 - hand.press * 0.1)
    this.sprites.stamp(g, 'ghost', [-34, -14, 84, 104], (c) => {
      const shape = soft([-8, -8], [8, -8], [11, 30], [34, 34], [44, 52], [38, 84], [0, 86], [-24, 58], [-14, 48], [-8, 56])
      flat(c, shape, '#fff9ea', [-24, -8, 68, 94], 0.18)
      c.strokeStyle = 'rgba(90,64,50,0.65)'; c.lineWidth = 3; c.beginPath(); shape(c); c.stroke()
    })
    g.restore()
  }
}

