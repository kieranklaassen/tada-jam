import { OPENING, type Pose } from './bodies'
import { handPose, type Guidance, type HandPose } from './guidance'
import { CRANK, DOG_MOUTH, MOUTH, PIVOT, SWITCH, type HostId } from './layout'
import { NATURE } from './kinds'
import { ink, type Colour } from './paper'
import { PICTURES, paintNight } from './pictures'
import { SHOW_SECONDS, type Bit, type Play, type Thing } from './play'
import { fit, type Fit } from './stage'

// The picture. Pieces are stamped from sprites made once for a surface; what
// is drawn live is the string, the eyes, the mouths and what flies.

type Pen = CanvasRenderingContext2D
type Sprite = { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }

export class View {
  private sprites = new Map<string, Sprite>()
  private nights: Partial<Record<'dark' | 'lit', HTMLCanvasElement>> = {}
  private scale = 0
  private key = ''
  private draws = 0
  private clock = 0
  private readonly level: Record<HostId, number> = { moose: 0, house: 0, tree: 0, dog: 0 }
  private night = 0
  private look = { x: 0, y: 0 }
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private box = { left: 0, top: 0, w: 0, h: 0 }

  constructor(private readonly g: Pen) {}

  /** Draws the frame and returns how many sprites it laid. `most` is the sharpest the surface gets, at which sprites are made. */
  draw(play: Play | null, guidance: Guidance | null, dt: number, width: number, height: number, dpr: number, most: number): number {
    const by = fit(width, height)
    if (by.scale <= 0) return 0
    const { g } = this
    this.draws = 0
    this.clock += dt
    // One save round the frame: a browser then rasters it when the frame is done, and not piece by piece inside the draw.
    g.save()
    const laid = this.paint(play, guidance, dt, width, height, dpr, most, by)
    g.restore()
    return laid
  }
  private paint(play: Play | null, guidance: Guidance | null, dt: number, width: number, height: number, dpr: number, most: number, by: Fit): number {
    const { g } = this
    const scale = by.scale * most, key = `${width}x${height}@${most}`
    if (key !== this.key) {
      this.key = key; this.scale = scale
      this.sprites.clear(); this.nights = {}; this.warmed = 0
      this.box = { left: -by.x / by.scale, top: -by.y / by.scale, w: width / by.scale, h: height / by.scale }
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const ease = Math.min(1, dt * 7), to = play?.lit ? 1 : 0
    this.night += (to - this.night) * ease
    if (this.night < 0.98) this.lay(g, 'dark', 1, width, height)
    if (this.night > 0.02) this.lay(g, 'lit', this.night < 0.98 ? this.night : 1, width, height)
    if (!play) return this.draws
    if (dt === 0 && play.litFor > SHOW_SECONDS && play.lit) this.night = 1
    g.setTransform(dpr * by.scale, 0, 0, dpr * by.scale, dpr * by.x, dpr * by.y)
    for (const id of ['moose', 'house', 'tree', 'dog'] as const) {
      const lit = play.lit ? (play.things.some((thing) => thing.out && thing.host === id && thing.light > 0.5) ? 1 : 0) : 0
      this.level[id] += (lit - this.level[id]) * (dt === 0 ? 1 : ease)
    }
    this.gaze(play, dt)
    this.tree(play)
    this.house(play)
    this.cord(play)
    this.moose(play)
    this.dog(play)
    this.drawBox(play)
    this.string(play)
    for (let i = play.things.length - 1; i > 0; i--) if (play.things[i].out) this.thing(play.things[i], i)
    // Over whatever hangs in front of it: the switch is never hidden.
    this.drawSwitch(play, guidance?.glow ?? 0)
    this.thing(play.things[0], 0)
    for (const bit of play.bits) if (bit.t >= 0) this.bit(bit)
    if (play.twinkle.t < 0.6) this.twinkle(play)
    this.guide(play, guidance)
    if (dt > 0) this.warm(width, height)
    return this.draws
  }

  // --- Sprites ---------------------------------------------------------------

  /** Paints one picture a frame that has not been needed yet, so that nothing is painted in the moment it is. */
  private warm(width: number, height: number): void {
    if (this.warmed > this.names.length * 2) return
    const n = this.warmed++
    if (n === 0) { if (!this.nights.lit) { this.g.setTransform(1, 0, 0, 1, 0, 0); this.lay(this.g, 'lit', 0, width, height); this.draws -= 1 } return }
    this.sprite(this.names[(n - 1) >> 1], n % 2 ? 'lit' : 'dark')
  }
  private warmed = 0
  private readonly names = Object.keys(PICTURES)
  private lay(g: Pen, tone: 'dark' | 'lit', alpha: number, width: number, height: number): void {
    let sheet = this.nights[tone]
    if (!sheet) {
      const { box, scale } = this
      sheet = document.createElement('canvas')
      sheet.width = Math.max(1, Math.ceil(box.w * scale)); sheet.height = Math.max(1, Math.ceil(box.h * scale))
      const p = sheet.getContext('2d')!
      p.setTransform(scale, 0, 0, scale, -box.left * scale, -box.top * scale)
      paintNight(p, tone, box.left, box.top, box.w, box.h)
      this.nights[tone] = sheet
    }
    g.globalAlpha = alpha
    g.drawImage(sheet, 0, 0, width, height)
    g.globalAlpha = 1
    this.draws += 1
  }
  private sprite(name: string, tone: 'dark' | 'lit'): Sprite {
    const id = `${name}/${tone}`
    let sprite = this.sprites.get(id)
    if (!sprite) {
      const picture = PICTURES[name], pad = 10, x = picture.box[0] - pad, y = picture.box[1] - pad, w = picture.box[2] + pad * 2, h = picture.box[3] + pad * 2
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.ceil(w * this.scale)); canvas.height = Math.max(1, Math.ceil(h * this.scale))
      const p = canvas.getContext('2d')!
      p.setTransform(this.scale, 0, 0, this.scale, -x * this.scale, -y * this.scale)
      picture.paint(p, tone)
      sprite = { canvas, x, y, w, h }
      this.sprites.set(id, sprite)
    }
    return sprite
  }
  /** Lays a picture, asleep and then as far awake as it is. */
  private stamp(name: string, light: number): void {
    const { g } = this
    if (light < 0.98) { const s = this.sprite(name, 'dark'); g.drawImage(s.canvas, s.x, s.y, s.w, s.h); this.draws += 1 }
    if (light > 0.02) {
      const s = this.sprite(name, 'lit')
      g.globalAlpha = light; g.drawImage(s.canvas, s.x, s.y, s.w, s.h); g.globalAlpha = 1
      this.draws += 1
    }
  }
  private posed(id: HostId, pose: Pose, draw: () => void): void {
    const { g } = this, o = PIVOT[id]
    g.save()
    g.translate(o.x + pose.dx, o.y + pose.dy); g.rotate(pose.rot); g.scale(pose.sx, pose.sy); g.translate(-o.x, -o.y)
    draw()
    g.restore()
  }

  // --- The four ---------------------------------------------------------------

  /** Where everybody looks: the finger, then the next thing to do, and now and then the child. */
  private gaze(play: Play, dt: number): void {
    let x = play.end.x, y = play.end.y
    const want = play.want()
    const turned = play.things[play.turned]
    if (play.lit && play.hooks.length === 0 && play.litFor < 4) { x = 480; y = -200 }
    else if (play.lit && turned?.out && turned.act < 1.2) { x = turned.x; y = turned.y + 40 }
    if (play.finger) { x = play.finger.x; y = play.finger.y }
    else if (play.round !== null && play.ghost.opacity > 0.3) { x = play.ghost.x; y = play.ghost.y }
    else if (want?.act === 'press') { x = SWITCH.x; y = SWITCH.y }
    if (!play.finger && play.round === null && this.clock % 5 > 3.9) { x = 480; y = 1100 }
    const k = Math.min(1, dt * 9)
    this.look.x += (x - this.look.x) * k; this.look.y += (y - this.look.y) * k
  }
  private eye(x: number, y: number, r: number, lid: number, cross = 0): void {
    const { g } = this, dx = this.look.x - x, dy = this.look.y - y, d = Math.hypot(dx, dy) || 1, reach = r * 0.42
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill()
    g.fillStyle = '#17161c'; g.beginPath(); g.arc(x + (cross ? cross * reach : (dx / d) * reach), y + (cross ? reach * 0.7 : (dy / d) * reach), r * 0.48, 0, 7); g.fill()
    if (lid > 0.02) { g.fillStyle = this.lidColour; g.beginPath(); g.rect(x - r - 1, y - r - 1, r * 2 + 2, (r * 2 + 2) * lid); g.save(); g.clip(); g.beginPath(); g.arc(x, y, r + 1, 0, 7); g.fill(); g.restore() }
  }
  private lidColour = '#8a5238'
  private tongueAt(x: number, y: number, w: number, length: number, light: number): void {
    if (length < 3) return
    const { g } = this
    g.fillStyle = ink('red', light > 0.5 ? 'lit' : 'dark')
    g.fillRect(x - w / 2, y, w, length); g.beginPath(); g.arc(x, y + length, w / 2, 0, Math.PI); g.fill()
  }
  private blink(offset: number): number { const t = (this.clock + offset) % 4.3; return t < 0.16 ? Math.sin((t / 0.16) * Math.PI) : 0 }

  private moose(play: Play): void {
    const { g } = this, body = play.bodies.moose, pose = body.pose, light = this.level.moose, kind = body.kind
    this.posed('moose', pose, () => {
      this.stamp('moose-body', light)
      const open = OPENING.moose * pose.open
      for (const [name, side] of [['antler-left', -1], ['antler-right', 1]] as const) { g.save(); g.translate(open * side, -open * 0.2); this.stamp(name, light); g.restore() }
      const perk = body.dip < 0.9 ? Math.sin((body.dip / 0.9) * Math.PI) : 0
      for (const side of [-1, 1]) { g.save(); g.translate(side < 0 ? 408 : 566, 298); g.scale(side, 1); g.rotate(-0.95 * perk); this.stamp('ear', light); g.restore() }
      this.stamp('moose-head', light)
      g.fillStyle = '#17161c'
      const gape = 12 + 26 * pose.puff + 16 * pose.tongue + (play.held || play.round !== null ? 8 : 0)
      g.beginPath(); g.ellipse(470, 582, 44, gape * 0.6, 0, 0, 7); g.fill()
      this.tongueAt(470, 580, 46, pose.tongue * 92, light)
      const nose: Colour = kind === 'bulb' ? (body.colour as Colour) : 'red', glow = kind && NATURE[kind].motion === 'glow'
      const swell = 1 + pose.puff * 0.3 + (body.dip < 0.4 ? 0.2 * (1 - body.dip / 0.4) : 0)
      if (glow || (light > 0.6 && play.on('moose').length > 0)) this.rays(470, 482, glow ? 92 : 62, nose, glow ? 0.95 : 0.45)
      g.fillStyle = ink(nose, light > 0.4 || glow ? 'lit' : 'dark')
      g.beginPath(); g.arc(470, 480, 36 * swell, 0, 7); g.fill()
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(458, 468, 9, 0, 7); g.fill()
      this.lidColour = ink('orange', light > 0.5 ? 'lit' : 'dark')
      const crossed = body.tickled < 0.9, lid = Math.max(pose.doze, this.blink(0))
      this.eye(444, 350, 36, lid, crossed ? 1 : 0)
      this.eye(528, 350, 36, kind === 'fish' ? 1 : lid, crossed ? -1 : 0)
      g.strokeStyle = '#17161c'; g.lineWidth = 9; g.lineCap = 'round'
      const brow = (crossed ? -14 : 0) + 18 * pose.open + 10 * pose.puff - 8 * pose.doze
      g.beginPath(); g.moveTo(416, 302 - brow); g.lineTo(464, 296 - brow * 0.6); g.moveTo(508, 296 - brow * 0.6); g.lineTo(558, 302 - brow); g.stroke()
    })
  }

  private house(play: Play): void {
    const { g } = this, body = play.bodies.house, pose = body.pose, light = this.level.house, kind = body.kind
    this.posed('house', pose, () => {
      this.stamp('house', light)
      const tone = light > 0.5 ? 'lit' : 'dark', angry = kind === 'trumpet'
      const lids = [Math.max(pose.doze, light > 0.5 ? (body.tickled < 0.5 ? 1 : this.blink(1.7)) : body.tickled < 0.5 ? 0.2 : 0.86), Math.max(pose.doze, angry ? 0.5 : light > 0.5 ? this.blink(1.7) : 0.94)]
      this.lidColour = ink('green', tone)
      ;[845, 1000].forEach((x, i) => {
        g.fillStyle = kind === 'bulb' ? ink(body.colour as Colour, 'lit') : ink('yellow', tone)
        g.beginPath(); g.arc(x, 470, 46, 0, 7); g.fill()
        g.fillStyle = '#17161c'
        const dx = this.look.x - x, dy = this.look.y - 470, d = Math.hypot(dx, dy) || 1
        g.beginPath(); g.arc(x + (dx / d) * 19, 470 + (dy / d) * 19, 20, 0, 7); g.fill()
        g.save(); g.beginPath(); g.arc(x, 470, 47, 0, 7); g.clip(); g.fillStyle = this.lidColour; g.fillRect(x - 50, 420, 100, 100 * lids[i]); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - 50, 418 + 100 * lids[i], 100, 4); g.restore()
      })
      if (pose.tongue > 0.02 || pose.puff > 0.05) { g.fillStyle = '#17161c'; g.fillRect(838, 600, 86, 110); this.tongueAt(881, 640, 60, 60 + pose.tongue * 60, light) }
      g.save(); g.translate(0, -OPENING.house * 1.6 * pose.open); this.stamp('roof', light); g.restore()
    })
  }

  private tree(play: Play): void {
    const { g } = this, body = play.bodies.tree, pose = body.pose, light = this.level.tree
    this.posed('tree', pose, () => {
      g.save()
      const wide = 1 + pose.open * 0.5
      g.translate(160, 0); g.scale(wide, 1); g.translate(-160, 0)
      this.stamp('tree', light)
      g.restore()
      if (body.kind === 'bulb') this.rays(160, 330, 120, body.colour as Colour, 0.4)
      this.lidColour = ink('green', light > 0.5 ? 'lit' : 'dark')
      const lid = Math.max(pose.doze, this.blink(2.9), light > 0.5 ? 0 : 0.35)
      this.eye(134, 270, 19, lid); this.eye(190, 270, 19, lid)
      g.fillStyle = '#17161c'; g.beginPath(); g.ellipse(162, 306, 16, 5 + 10 * pose.puff, 0, 0, 7); g.fill()
      this.tongueAt(162, 306, 24, pose.tongue * 70, light)
    })
  }

  private dog(play: Play): void {
    const { g } = this, body = play.bodies.dog, pose = body.pose, light = this.level.dog
    this.posed('dog', pose, () => {
      g.save(); g.translate(946, 676); g.rotate(-0.33 + Math.sin(this.clock * (play.lit ? 13 : 8)) * 0.09 - pose.open * 0.4 + (body.tickled < 0.5 ? Math.sin(body.tickled * 30) * 0.25 : 0)); this.stamp('dog-tail', light); g.restore()
      this.stamp('dog', light)
      if (body.kind === 'bulb') for (const [x, y, r] of [[972, 668, 19], [1012, 690, 15]]) this.rays(x, y, r * (1 + pose.sy * 0.2), body.colour as Colour, 1)
      for (const side of [-1, 1]) { g.save(); g.translate(1074 + side * 50, 590); g.rotate(side * (-0.35 - pose.open * 1.5 + (body.kind === 'kettle' ? 0.5 : 0) - Math.max(0, pose.puff) * 0.3)); this.stamp('dog-ear', light); g.restore() }
      this.stamp('dog-head', light)
      this.lidColour = ink('white', light > 0.5 ? 'lit' : 'dark')
      const lid = Math.max(pose.doze, this.blink(0.8))
      this.eye(1052, 612, 18, lid); this.eye(1098, 612, 18, lid)
      g.fillStyle = '#17161c'; g.beginPath(); g.ellipse(DOG_MOUTH.x, DOG_MOUTH.y, 17, 5 + 11 * Math.max(pose.puff, pose.tongue), 0, 0, 7); g.fill()
      this.tongueAt(DOG_MOUTH.x, DOG_MOUTH.y, 20, pose.tongue * 138 + (play.lit ? 8 : 5), Math.max(0.6, light))
    })
  }

  // --- The box, the switch, the string ----------------------------------------

  private drawBox(play: Play): void {
    const { g } = this, { box, strain } = play
    const pull = box.lean, lit = this.night
    g.save()
    const angle = play.held || pull > 0.05 ? Math.max(-0.12, Math.min(0.12, (play.end.x - MOUTH.x) * 0.0003)) * pull : 0
    g.translate(168, 752); g.rotate(angle); g.transform(1 - box.squash * 0.35, 0, -angle * 0.5, 1 + box.squash * 0.5 + pull * 0.06, 0, 0); g.translate(-168, -752)
    this.stamp('box-back', lit)
    // The next thing, jammed at the rim.
    const next = play.things.find((thing) => !thing.out)
    if (next) {
      const peek = play.peek < 1.2 ? Math.sin(Math.min(1, play.peek / 1.2) * Math.PI) : 0, up = Math.max(strain, peek), shake = pull > 0.2 ? Math.sin(this.clock * 48) * 0.06 * strain * pull : Math.sin(this.clock * 2) * 0.03
      g.save()
      g.translate(MOUTH.x - 2, MOUTH.y + 34 - up * 104); g.rotate(shake - 0.16); g.scale(1 - up * 0.14 * pull + 0.1, 1 + up * 0.2 * pull + 0.1)
      this.stamp(nameOf(next), Math.max(0.35, lit)); g.restore()
    }
    this.stamp('box-front', lit)
    if (play.crank) { g.save(); g.translate(CRANK.x, CRANK.y); g.rotate(play.crankTurn); this.stamp('wheel', lit); g.restore() }
    g.restore()
  }
  private cord(play: Play): void {
    const { g } = this
    for (const [w, colour] of [[14, 'rgba(0,0,0,0.5)'], [10, ink('red', this.night > 0.5 ? 'lit' : 'dark')], [3, play.lit ? '#ffe07a' : 'rgba(255,255,255,0.25)']] as const) {
      g.strokeStyle = colour; g.lineWidth = w; g.lineCap = 'round'
      g.beginPath(); g.moveTo(280, 740); g.bezierCurveTo(380, 776, 440, 728, 530, 752); g.bezierCurveTo(600, 770, 640, 740, 700, 730); g.stroke()
    }
  }
  private drawSwitch(play: Play, glow: number): void {
    const { g } = this, want = play.want()?.act === 'press' && play.held === null
    const rock = want ? Math.sin(this.clock * 7) * 0.06 * glow * Math.max(0, Math.sin(this.clock * 1.4)) : 0
    const bright = play.lit ? 1 : want ? 0.75 + 0.2 * glow * Math.sin(this.clock * 4) : 0.35
    g.save(); g.translate(SWITCH.x, 736); g.rotate(rock); g.translate(-SWITCH.x, -736)
    const down = Math.max(play.lit ? 22 : 0, play.pressed * 34)
    g.save(); g.translate(SWITCH.x, 668 ); g.scale(1 + down * 0.002, 1 - down * 0.013); g.translate(-SWITCH.x, -668); this.stamp('dome', bright); g.restore()
    this.stamp('post', play.lit ? 1 : 0.2)
    g.restore()
  }

  private string(play: Play): void {
    const { g } = this, { path } = play
    const trace = (upTo: number) => { g.beginPath(); g.moveTo(path.xs[0], path.ys[0]); for (let i = 1; i < path.count && path.along[i - 1] < upTo; i++) g.lineTo(path.xs[i], path.ys[i]) }
    g.lineCap = 'round'; g.lineJoin = 'round'
    trace(Infinity)
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 12; g.stroke()
    g.strokeStyle = '#3f9a67'; g.lineWidth = 8; g.stroke()
    g.strokeStyle = 'rgba(220,255,225,0.55)'; g.lineWidth = 2; g.stroke()
    if (play.lit) { trace(play.litFor * 950); g.strokeStyle = '#ffd84a'; g.lineWidth = 5; g.stroke() }
  }

  private thing(thing: Thing, index: number): void {
    const { g } = this, end = index === 0, acting = thing.act < 1.3 ? Math.sin((thing.act / 1.3) * Math.PI) : 0, t = thing.act
    let rot = -thing.swing * 0.9, sx = 1, sy = 1, dy = 0
    const alive = thing.light > 0.5 ? 1 : 0
    if (alive) {
      const idle = Math.sin(this.clock * 3 + index * 1.7)
      rot += idle * 0.05
      switch (NATURE[thing.kind].motion) {
        case 'stamp': dy = -Math.abs(Math.sin(t * 15)) * 22 * acting; break
        case 'dance': rot += Math.sin(t * 17) * 0.6 * acting; break
        case 'lick': sx += Math.sin(t * 24) * 0.16 * acting; break
        case 'blow': sy += 0.2 * acting + Math.sin(t * 40) * 0.05 * acting; break
        case 'doze': sy += 0.16 * acting; rot += Math.sin(t * 7) * 0.2 * acting; break
        case 'gulp': rot += Math.sin(t * 22) * 0.45 * acting; break
        case 'toot': sx += Math.max(0, Math.sin(t * 18)) * 0.3 * acting; break
        case 'strain': sx += 0.2 * acting; sy -= 0.14 * acting; break
        case 'open': sx += 0.1 * acting; break
        case 'wobble': sx += Math.sin(t * 22) * 0.24 * acting; sy -= Math.sin(t * 22) * 0.24 * acting; break
        case 'glow': sx += 0.12 * acting; sy += 0.12 * acting; break
      }
    }
    const size = thing.size * (end ? 1.45 : 1.06)
    g.save()
    g.translate(thing.x, thing.y + dy); g.rotate(rot); g.scale(sx * size, sy * size)
    if (end || (thing.kind === 'bulb' && thing.light > 0.05)) this.rays(0, 48, end ? 46 + 8 * thing.light : 46, thing.colour as Colour, end ? 0.35 + 0.55 * thing.light + 0.08 * Math.sin(this.clock * 2.4) : 0.8 * thing.light)
    this.stamp(nameOf(thing, alive && thing.kind === 'umbrella' && (thing.act > 1.3 || Math.sin(t * 14) > -0.2) && this.clock % 2.6 > 0.5), end ? Math.max(0.8, thing.light) : thing.light)
    g.restore()
  }
  /** Paper rays stuck round a light. */
  private rays(x: number, y: number, r: number, colour: Colour, alpha: number): void {
    const { g } = this
    g.save(); g.translate(x, y); g.rotate(this.clock * 0.12)
    g.fillStyle = ink(colour, 'lit')
    g.globalAlpha = Math.min(1, alpha) * 0.22
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill()
    g.globalAlpha = Math.min(1, alpha) * 0.85
    g.beginPath()
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, b = 0.11; g.moveTo(Math.cos(a - b) * r * 0.86, Math.sin(a - b) * r * 0.86); g.lineTo(Math.cos(a) * r * 1.28, Math.sin(a) * r * 1.28); g.lineTo(Math.cos(a + b) * r * 0.86, Math.sin(a + b) * r * 0.86); g.closePath() }
    g.fill()
    g.restore()
  }

  private bit(bit: Bit): void {
    const { g } = this, u = bit.t / bit.life, s = bit.size, tone = 'lit' as const
    g.save(); g.translate(bit.x, bit.y); g.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1
    const dot = (r: number, colour: Colour) => { g.fillStyle = ink(colour, tone); g.beginPath(); g.arc(0, 0, Math.max(0.1, r), 0, 7); g.fill() }
    switch (bit.kind) {
      case 'spark': g.rotate(bit.t * 5); g.fillStyle = ink(bit.colour as Colour, tone); g.fillRect(-7 * s, -7 * s, 14 * s, 14 * s); break
      case 'snow': dot(7 * s, 'white'); break
      case 'hatch': {
        g.scale(s, s)
        const open = bit.t > 1
        if (open) { const up = Math.min(1, (bit.t - 1) * 5); g.translate(0, -14 * up); dot(11, 'yellow'); g.fillStyle = ink('orange', tone); g.beginPath(); g.moveTo(9, -2); g.lineTo(19, 1); g.lineTo(9, 4); g.fill(); g.fillStyle = '#17161c'; g.beginPath(); g.arc(4, -4, 2.6, 0, 7); g.fill(); g.translate(0, 14 * up) } else g.rotate(Math.sin(bit.t * 30) * 0.2 * bit.t)
        g.fillStyle = ink('white', tone); g.beginPath()
        if (open) { g.moveTo(-13, -2); for (let i = 0; i < 5; i++) g.lineTo(-13 + i * 6.5, i % 2 ? -8 : -2); g.arc(0, 0, 13, 0, Math.PI) } else g.ellipse(0, -2, 13, 16, 0, 0, 7)
        g.fill(); break
      }
      case 'dust': dot(12 * s * (0.5 + u), 'white'); break
      case 'bow': g.rotate(bit.t * 4); g.fillStyle = ink('red', tone); g.beginPath(); g.moveTo(0, 0); g.lineTo(-13 * s, -9 * s); g.lineTo(-13 * s, 9 * s); g.moveTo(0, 0); g.lineTo(13 * s, -9 * s); g.lineTo(13 * s, 9 * s); g.fill(); break
      case 'sizzle': g.rotate(bit.x); g.fillStyle = ink('orange', tone); g.beginPath(); g.moveTo(0, -12 * s); g.lineTo(6 * s, 6 * s); g.lineTo(-6 * s, 6 * s); g.fill(); break
      case 'steam': dot((8 + 24 * u) * s, 'white'); break
      case 'snore': { const r = 46 * s * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.6); g.translate(0, -r * 0.6 + bit.vy * -0.3 * bit.t); g.globalAlpha *= 0.55; dot(r, 'blue'); g.globalAlpha = 0.9; g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.35, -r * 0.35, r * 0.16, 0, 7); g.fill(); break }
      case 'bubble': g.strokeStyle = ink('blue', tone); g.lineWidth = 4; g.beginPath(); g.arc(Math.sin(bit.t * 8) * 5, 0, (7 + 8 * u) * s, 0, 7); g.stroke(); break
      case 'ring': g.strokeStyle = ink('yellow', tone); g.lineWidth = 6 * (1 - u) + 1; g.beginPath(); g.ellipse(0, 0, (10 + 42 * u) * s, (7 + 30 * u) * s, 0, 0, 7); g.stroke(); break
      case 'egg': g.rotate(bit.t * 3); g.scale(s, s * 1.25); this.stamp('egg', 1); break
      case 'drop': g.fillStyle = ink('blue', tone); g.beginPath(); g.moveTo(0, -12 * s); g.lineTo(6 * s, 3 * s); g.arc(0, 3 * s, 6 * s, 0, Math.PI); g.fill(); break
      case 'wobbleRing': g.fillStyle = ink('green', tone); g.save(); g.scale(1 + Math.sin(bit.t * 20) * 0.3, 1 - Math.sin(bit.t * 20) * 0.3); g.beginPath(); g.arc(0, 0, 10 * s, Math.PI, 0); g.fill(); g.restore(); break
    }
    g.restore()
  }
  private twinkle(play: Play): void {
    const { g } = this, u = play.twinkle.t / 0.6
    g.save(); g.translate(play.twinkle.x, play.twinkle.y); g.rotate(u * 1.2); g.globalAlpha = 1 - u
    g.fillStyle = ink('yellow', 'lit')
    for (let i = 0; i < 5; i++) { g.rotate(1.2566); g.fillRect(14 + 30 * u, -5, 12 * (1 - u * 0.5), 10) }
    g.restore()
  }

  // --- Guidance ----------------------------------------------------------------

  private guide(play: Play, guidance: Guidance | null): void {
    if (play.round !== null) { this.ghost(play.ghost.x, play.ghost.y, play.ghost.press, play.ghost.opacity); return }
    if (!guidance) return
    const want = play.want()
    if (!want) return
    const ring = (x: number, y: number, r: number) => {
      const { g } = this, beat = 0.5 + 0.5 * Math.sin(this.clock * 4)
      g.globalAlpha = guidance.glow * (0.55 + 0.45 * beat); g.strokeStyle = '#17161c'; g.lineWidth = 13
      g.beginPath(); g.arc(x, y, r + 7 * beat, 0, 7); g.stroke()
      g.strokeStyle = '#ffe26a'; g.lineWidth = 8; g.stroke(); g.globalAlpha = 1
    }
    const { end } = play
    if (want.act === 'press') { if (guidance.glow > 0.01) ring(SWITCH.x, SWITCH.y - 8, 92) } else if (guidance.glow > 0.01) {
      ring(end.x, end.y + 60, 66)
      if (play.hooks.length < 4) { const to = play.hookAt(want.hook); ring(to.x, to.y, 46) }
    }
    if (guidance.demo === null) return
    const pose = handPose(guidance.demo, want.act === 'hang', this.hand)
    if (want.act === 'press') this.ghost(SWITCH.x, SWITCH.y - 10, pose.press, pose.opacity)
    else { const to = play.hookAt(want.hook); this.ghost(end.x + (to.x - end.x) * pose.travel, end.y + 50 * (1 - pose.travel) + (to.y - end.y) * pose.travel, pose.press, pose.opacity) }
  }
  private ghost(x: number, y: number, press: number, opacity: number): void {
    if (opacity < 0.01) return
    const { g } = this
    g.save(); g.globalAlpha = opacity; g.translate(x + 4, y + 8); g.rotate(-0.3); const k = 1.25 - 0.15 * press; g.scale(k, k)
    g.beginPath()
    g.moveTo(-11, 0); g.arc(0, 0, 11, Math.PI, 0); g.lineTo(11, 36); g.lineTo(40, 42); g.arc(40, 54, 12, -1.57, 0); g.lineTo(52, 84); g.arc(26, 86, 26, 0, Math.PI); g.lineTo(-2, 78); g.lineTo(-30, 54); g.arc(-24, 46, 9, 2.4, 5.4); g.lineTo(-11, 54); g.closePath()
    g.fillStyle = '#fffdf4'; g.fill(); g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = '#17161c'; g.stroke()
    g.restore()
  }
}

const nameOf = (thing: Thing, open: boolean | 0 = false): string => (thing.kind === 'bulb' ? `bulb-${thing.colour}` : open ? 'umbrella-open' : thing.kind)
