import { APPLE, JOKE, type Carrier } from './cast'
import { at, ENTRY, FLAME, GATE, LENGTH, PLACES, sizeAt } from './garden'
import { apple, count, flame, glow, line, makeCanvas, oval, piece, type Canvas, type G } from './glass'
import { handAt, want } from './guide'
import { handPose, type Guidance, type HandPose } from './guidance'
import { homeTurn, move, rest, type Pose } from './motion'
import { CLOSING, OPENING, Play, PUFF, SETTING, WAITING, WAITING_SIZE } from './play'
import { asleep, progress, sleeper } from './sleepers'
import { STAGE, fit } from './stage'
import { walker } from './walkers'
import { paint, stampDen, star, type Frame, type Painted } from './window'

// Draws the game as it stands. It decides nothing.

type Look = { x: number; y: number }

export class View {
  private painted: Painted | null = null
  /** The dark window with every place that is wholly open already in it, so a place at rest costs nothing. */
  private base: Canvas | null = null
  private baked: boolean[] = []
  private key = ''
  private frame: Frame = { x0: 0, y0: 0, x1: STAGE.width, y1: STAGE.height }
  private readonly pose: Pose = rest()
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private time = 0
  private eased = new Map<string, Look>()
  private step = 0
  private slots: Partial<Record<Carrier, Look & { k: number }>> = {}

  constructor(private readonly g: G) {}

  draw(play: Play | null, guidance: Guidance | null, step: number, width: number, height: number, dpr: number, painted = dpr): number {
    const g = this.g, by = fit(width, height)
    if (by.scale <= 0) return 0
    this.time += step
    this.step = step
    count.fills = 0
    const key = `${width} ${height} ${painted}`
    if (key !== this.key || !this.painted) {
      this.frame = { x0: -by.x / by.scale, y0: -by.y / by.scale, x1: (width - by.x) / by.scale, y1: (height - by.y) / by.scale }
      this.painted = paint(this.frame, Math.min(2, painted * by.scale))
      this.base = makeCanvas(this.painted.dark.width, this.painted.dark.height)
      this.base.getContext('2d')!.drawImage(this.painted.dark, 0, 0)
      this.baked = PLACES.map(() => false)
      this.key = key
    }
    g.setTransform(dpr * by.scale, 0, 0, dpr * by.scale, dpr * by.x, dpr * by.y)
    g.globalAlpha = 1
    const p = this.painted
    if (play && play.shown.every((one) => one.who && one.open > OPENING && one.closing === null)) this.layer(p.lit)
    else { if (play) this.bake(play, p); this.layer(this.base!) }
    if (play) this.garden(play, guidance, p)
    else { this.shine(0); this.middle(null) }
    g.setTransform(1, 0, 0, 1, 0, 0)
    return count.fills + 1
  }

  private bake(play: Play, p: Painted): void {
    const g = this.base!.getContext('2d')!
    const open = (id: number) => play.shown[id].who !== null && play.shown[id].open >= OPENING && play.shown[id].closing === null
    if (this.baked.some((one, id) => one && !open(id))) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(p.dark, 0, 0)
      this.baked.fill(false)
    }
    const f = this.frame, k = p.lit.width / (f.x1 - f.x0)
    for (const place of PLACES) if (open(place.id) && !this.baked[place.id]) {
      g.save()
      g.setTransform(k, 0, 0, k, -f.x0 * k, -f.y0 * k)
      g.clip(p.clips[place.id].path)
      g.drawImage(p.lit, f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0)
      g.restore()
      this.baked[place.id] = true
    }
  }

  private layer(canvas: HTMLCanvasElement): void {
    const f = this.frame
    this.g.drawImage(canvas, f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0)
    count.fills++
  }

  /** A part of the lit window, under whatever is clipped. */
  private litPart(p: Painted, box: Frame): void {
    const f = this.frame, kx = p.lit.width / (f.x1 - f.x0), ky = p.lit.height / (f.y1 - f.y0)
    const x0 = Math.max(box.x0, f.x0), y0 = Math.max(box.y0, f.y0), x1 = Math.min(box.x1, f.x1), y1 = Math.min(box.y1, f.y1)
    if (x1 <= x0 || y1 <= y0) return
    this.g.drawImage(p.lit, (x0 - f.x0) * kx, (y0 - f.y0) * ky, (x1 - x0) * kx, (y1 - y0) * ky, x0, y0, x1 - x0, y1 - y0)
    count.fills++
  }

  private garden(play: Play, guidance: Guidance | null, p: Painted): void {
    const g = this.g, w = play.walker, here = play.where(), wants = want(play)
    const still = !play.busy, glowing = still ? guidance?.glow ?? 0 : 0
    this.opened(play, p)
    this.carried(play, p)
    this.way(play, glowing)
    this.trail(play)
    // The stars where the light is wanted.
    if (wants.what === 'place') for (const place of PLACES) if (play.save.set[place.id] === null) {
      const here2 = place.id === (w.place ?? wants.place)
      const beat = here2 ? 0.75 + Math.sin(this.time * 4) * 0.25 : 0.4
      g.globalAlpha = beat
      star(g, place, here2 ? 0.95 + Math.sin(this.time * 4) * 0.06 : 0.78, '#f7d35a')
      g.globalAlpha = 1
      if (here2) glow(g, place.apple.x, place.apple.y - 4, 70 + glowing * 30, 0.35 + glowing * 0.4)
    }
    this.shine(play.flare + (wants.what === 'light' ? glowing * 0.35 : 0))
    // From the back to the front.
    const things: { y: number; draw: () => void }[] = []
    for (const place of PLACES) {
      things.push({ y: place.den.y - 12, draw: () => this.place(play, place.id) })
      things.push({ y: place.apple.y, draw: () => this.light(play, place.id) })
    }
    things.push({ y: FLAME.y + 14, draw: () => this.middle(play) })
    things.push({ y: here.y + 6, draw: () => this.front(play, glowing) })
    things.sort((a, b) => a.y - b.y)
    for (const one of things) one.draw()
    this.waiting(play)
    this.basket(play)
    for (const one of play.leavers) this.leaver(one)
    if (play.puff !== null) this.wind(play)
    if (guidance?.demo != null && still && wants.what !== 'none') this.ghost(play, guidance)
  }

  // --- The glass --------------------------------------------------------------------

  private opened(play: Play, p: Painted): void {
    const g = this.g
    const all = play.shown.every((one) => one.who && one.open > OPENING && one.closing === null)
    if (all) return
    for (const place of PLACES) {
      const one = play.shown[place.id], clip = p.clips[place.id]
      if (!one.who || this.baked[place.id]) continue
      g.save()
      if (one.closing !== null) {
        g.globalAlpha = Math.max(0, 1 - one.closing / CLOSING)
        g.clip(clip.path)
        this.litPart(p, clip.box)
      } else {
        // Pane by pane, outward from the light.
        const front = (one.open / OPENING) * (clip.reach + 60), open = new Path2D()
        const just: Path2D[] = []
        for (const q of clip.panes) if (q.far < front) { open.addPath(q.path); if (front - q.far < 60) just.push(q.path) }
        g.clip(open)
        this.litPart(p, clip.box)
        g.fillStyle = 'rgba(255,250,220,0.6)'
        for (const q of just) { g.fill(q); count.fills++ }
      }
      g.restore()
      if (one.open < OPENING && one.closing === null) {
        const t = one.open / OPENING
        glow(g, place.apple.x, place.apple.y - 30, 120 + t * 160, 0.9 * (1 - t))
      }
    }
  }

  /** A carried light opens the glass about it, and the dark closes again behind. */
  private carried(play: Play, p: Painted): void {
    const g = this.g, w = play.walker
    if (!w.lit) return
    const q = play.where(), r = 96 + Math.min(1, w.caught) * 26 + Math.sin(this.time * 9) * 3
    // Faint at its edge, so that it reads as light and not as a thing.
    for (const part of [1.12, 0.95, 0.76]) {
      const reach = r * part
      g.save()
      g.beginPath(); g.arc(q.x, q.y - 34, reach, 0, 7)
      g.clip()
      g.globalAlpha = 0.42
      this.litPart(p, { x0: q.x - reach, y0: q.y - 34 - reach, x1: q.x + reach, y1: q.y - 34 + reach })
      g.restore()
    }
    glow(g, q.x, q.y - 60, r * 1.5, play.shown.filter((one) => one.who).length > 5 ? 0.2 : 0.4)
  }

  /** The way that is meant: crumbs of light that run along the path to where the candle is wanted. */
  private way(play: Play, glowing: number): void {
    const g = this.g, w = play.walker
    if (play.full || play.puff !== null || play.walker.setting !== null || play.walker.arrived < 1) return
    const lit = w.lit, to = lit ? (w.place !== null ? PLACES[w.place].u : PLACES[Math.max(0, play.nearestDark(play.where()))].u) : LENGTH - 30
    const from = w.u + (to > w.u ? 46 : -46), way = to - from
    if (way * (to - w.u) <= 0) return
    const gap = 44, n = Math.floor(Math.abs(way) / gap), run = (this.time * 3.2) % 1
    for (let i = 0; i < n; i++) {
      const u = from + Math.sign(way) * (i + run) * gap, q = at(u)
      const wave = 0.5 + 0.5 * Math.sin(this.time * 4 - i * 0.55)
      g.globalAlpha = (0.3 + wave * 0.4 + glowing * 0.3) * Math.min(1, (n - i) / 2 + 0.3)
      const k = u < ENTRY ? 1.4 : 1
      oval(g, q.x, q.y, (4 + wave * 2) * k, (3 + wave * 1.4) * k, '#ffe08a', 0)
    }
    g.globalAlpha = 1
  }

  private trail(play: Play): void {
    const g = this.g
    for (const one of play.trail) {
      g.globalAlpha = Math.max(0, 0.4 * (1 - one.t / 0.9))
      oval(g, one.x, one.y, 9 * (1 - one.t / 0.9) + 2, 9 * (1 - one.t / 0.9) + 2, '#cfd8ff', 0)
    }
    g.globalAlpha = 1
  }

  /** The light of the middle flame lies on the glass, under everyone, so a white goose beside it stays a goose. */
  private shine(flare: number): void {
    glow(this.g, FLAME.x, FLAME.y - 60, 190 + flare * 90 + Math.sin(this.time * 7) * 5, 0.85)
  }

  private middle(play: Play | null): void {
    const g = this.g, t = this.time
    const flare = play?.flare ?? 0, duck = play?.duck ?? 0, lean = play?.lean ?? 0
    const size = 1.15 + flare * 0.5, tall = (1 - Math.sin(Math.min(1, duck) * Math.PI) * 0.6) * (play?.dancing ? 1.35 + Math.sin(t * 8) * 0.1 : 1)
    oval(g, FLAME.x, FLAME.y + 16, 46, 16, '#7a4a22', 5)
    piece(g, 'M625 426 L624 372 C 632 364 658 364 666 372 L665 426 C 652 434 638 434 625 426 Z', '#fbf0d2', 5)
    piece(g, 'M624 376 C 632 366 658 366 666 376 C 666 396 656 384 654 390 C 650 404 644 386 638 388 C 632 392 626 398 624 376 Z', '#fffaf0', 3)
    flame(g, FLAME.x, FLAME.y - 44, size, t, lean, Math.max(0.3, tall))
  }

  // --- Places ------------------------------------------------------------------------

  private lookFrom(id: string, x: number, y: number, to: Look): Look {
    let now = this.eased.get(id)
    if (!now) this.eased.set(id, (now = { x: 0, y: 0 }))
    const dx = to.x - x, dy = to.y - y, far = Math.hypot(dx, dy) || 1, near = Math.min(1, far / 70), rate = Math.min(1, this.step * 8)
    now.x += ((dx / far) * near - now.x) * rate
    now.y += ((dy / far) * near - now.y) * rate
    return now
  }

  private place(play: Play, id: number): void {
    const g = this.g, place = PLACES[id], one = play.shown[id], who = play.sleeperAt(id)
    g.save()
    g.translate(place.den.x, place.den.y)
    g.scale(place.size, place.size)
    // What is there, dark or lit: it lights up after its glass.
    const light = !one.who ? 0 : one.closing !== null ? Math.max(0, 1 - one.closing / CLOSING) : Math.min(1, Math.max(0, (one.open - 0.3) / 0.4))
    if (light < 1) stampDen(g, place.kind, false)
    if (light > 0) { g.globalAlpha = light; stampDen(g, place.kind, true); g.globalAlpha = 1 }
    count.fills++
    if (!who || (one.open < 0.4 && one.closing === null)) {
      // Asleep, and now and then it stirs as a light goes by.
      const w = play.walker, stir = w.lit && Math.hypot(play.where().x - place.den.x, play.where().y - place.den.y) < 170 ? 0.4 + 0.2 * Math.sin(this.time * 6) : 0
      g.globalAlpha = who ? Math.max(0, 1 - one.open / 0.4) : 1
      asleep(g, place.kind, this.time + id * 1.3, Math.max(stir * 0.3, play.stir[id]))
    } else {
      const open = one.closing !== null ? 1 - one.closing / CLOSING : Math.min(1, (one.open - 0.5) / 0.5)
      g.globalAlpha = one.closing !== null ? Math.max(0, 1 - one.closing / CLOSING) : Math.min(1, (one.open - 0.4) / 0.3)
      const mirror = place.den.x > 800 ? -1 : 1
      g.scale(mirror, 1)
      const p = progress(who, one.joke)
      const aim = play.gaze && play.walker.goal === null ? play.gaze : play.where()
      const look = this.lookFrom(`s${id}`, place.den.x, place.den.y - 60, aim)
      const life = (this.time + id * 1.71) % (3.1 + id * 0.43)
      const blink = life < 0.13 ? 0 : 1
      // It bobs on its light's note.
      const bob = one.rung < 0.4 ? Math.sin((one.rung / 0.4) * Math.PI) * 10 : 0
      g.translate(0, -bob)
      if (play.dancing) g.rotate(Math.sin(this.time * 7 + id) * 0.07)
      sleeper(g, who, { p: one.joke > JOKE[who] ? 1 : p, open: Math.max(0, open) * (p < 1 ? 1 : blink), look: { x: look.x * mirror, y: look.y }, t: this.time + id * 2.2 })
    }
    g.restore()
  }

  private light(play: Play, id: number): void {
    const g = this.g, place = PLACES[id], one = play.shown[id]
    if (!one.who) return
    const k = 0.62 * (one.open < 0.25 ? 1 + Math.sin((one.open / 0.25) * Math.PI) * 0.25 : 1)
    const lit = one.closing === null
    const rung = one.rung < 0.5 ? 1 - one.rung / 0.5 : 0
    if (lit) glow(g, place.apple.x, place.apple.y - 46, 74 + rung * 60, 0.45 + rung * 0.5)
    g.save()
    g.translate(place.apple.x, place.apple.y + 10)
    if (one.closing !== null) {
      // It tips over and rolls off home.
      const t = one.closing / CLOSING
      g.translate((GATE.x - place.apple.x) * t * t * 0.4, (GATE.y - place.apple.y) * t * t * 0.4)
      g.rotate(-t * 4)
      g.globalAlpha = 1 - t
    }
    g.rotate(Math.sin(this.time * 22) * rung * 0.16)
    apple(g, APPLE[one.who], k * (1 + rung * 0.12), lit, this.time + id * 3.3)
    g.restore()
    if (rung > 0) {
      g.strokeStyle = `rgba(255,244,200,${0.8 * rung})`
      g.lineWidth = 4
      g.beginPath(); g.ellipse(place.apple.x, place.apple.y, 30 + (1 - rung) * 60, 18 + (1 - rung) * 36, 0, 0, 7); g.stroke()
    }
  }

  // --- Those who carry ---------------------------------------------------------------

  private figure(who: Carrier, x: number, y: number, k: number, o: { walked: number; speed: number; squash: number; hop: number; flip: number; held: 'lit' | 'unlit' | 'none'; caught: number; cheeks: number; lean: number; turn: number; look: Look; setting?: number }): void {
    const g = this.g, pose = move(who, { walked: o.walked, speed: o.speed, time: this.time, squash: o.squash, hop: o.hop, caught: o.caught, setting: o.setting }, this.pose)
    const size = who === 'bear' ? 1.06 : who === 'gnome' ? 1 : 0.98
    g.save()
    g.translate(x, y)
    g.globalAlpha *= 0.4
    oval(g, 0, 2, 74 * k, 13 * k, '#05040c', 0)
    g.globalAlpha /= 0.4
    g.translate(0, -pose.lift * k)
    g.scale(k * size * o.flip, k * size)
    if (o.turn) { g.translate(0, -110); g.rotate(o.turn); g.translate(0, 110) }
    g.rotate(pose.turn + o.lean)
    g.scale(2 - pose.squash, pose.squash)
    // The goose looks at nobody.
    const look = who === 'goose' ? { x: 0.75, y: -0.5 } : { x: o.look.x * o.flip, y: o.look.y }
    walker(g, who, pose, look, o.held === 'none' ? null : { color: APPLE[who], lit: o.held === 'lit', caught: o.caught }, o.cheeks, this.time)
    g.restore()
  }

  private front(play: Play, glowing: number): void {
    const w = play.walker, q = play.where(), k = sizeAt(w.u)
    let x = q.x, y = q.y, scale = k
    if (w.arrived < 1) {
      // It steps up from the line to the gate.
      const t = w.arrived, s = t * t * (3 - 2 * t)
      x = WAITING[0].x + (q.x - WAITING[0].x) * s
      y = WAITING[0].y + (q.y - WAITING[0].y) * s - Math.sin(t * Math.PI) * 60
      scale = WAITING_SIZE + (k - WAITING_SIZE) * s
    }
    const empty = play.full || play.puff !== null
    const asks = play.asksToBlow
    let cheeks = asks ? 1 + Math.sin(this.time * 3) * 0.35 : 0
    let lean = 0
    if (play.puff !== null) {
      const t = play.puff
      if (t < PUFF.breath) { cheeks = t / PUFF.breath * 1.5; lean = -0.12 * (t / PUFF.breath) }
      else { const out = Math.min(1, (t - PUFF.breath) / (PUFF.gap * PLACES.length)); cheeks = 1.4 * (1 - out); lean = out < 1 ? 0.16 : 0 }
    }
    // Leaning toward what it wants, and breathing toward it.
    const wants = want(play)
    const toward = wants.what === 'light' || wants.what === 'place' ? Math.sign(wants.to.x - q.x) || 1 : 1
    if (!play.busy && wants.what !== 'none' && wants.what !== 'blow') lean += toward * (0.06 + Math.sin(this.time * 2.4) * 0.03)
    const sit = play.puff !== null && play.puff > PUFF.breath + PUFF.gap * PLACES.length ? 0.2 : 0
    const gaze = play.puff !== null ? FLAME : wants.what === 'light' ? (Math.sin(this.time * 0.9) > 0.3 && !play.busy ? { x: q.x, y: q.y + 400 } : FLAME) : wants.what === 'place' ? wants.to : { x: q.x, y: q.y + 400 }
    const look = this.lookFrom('front', q.x, q.y - 180 * k, gaze)
    if (glowing > 0.01 || asks) glow(this.g, x, y - 110 * scale, 190 * scale, Math.max(glowing * 0.5, asks ? 0.3 : 0))
    this.figure(w.who, x, y - sit * -8, scale * (1 - sit * 0.3), {
      walked: w.walked, speed: w.speed, squash: w.squash, hop: play.hop[w.who], flip: w.goal !== null && w.speed > 60 ? this.facing(play) : 1, held: empty ? 'none' : w.lit ? 'lit' : 'unlit', caught: w.caught, cheeks, lean, turn: 0, look, setting: w.setting === null ? 0 : w.setting / SETTING,
    })
  }

  /** Which way it goes across the window just now. */
  private facing(play: Play): number {
    const w = play.walker, a = at(w.u), b = at(w.u + w.heading * 8)
    return b.x - a.x < -1.5 ? -1 : 1
  }

  private waiting(play: Play): void {
    const gone = new Set(play.leavers.map((one) => one.who))
    for (let i = 0; i < WAITING.length; i++) {
      const who = play.save.queue[i + 1]
      if (who === play.walker.who || gone.has(who)) continue
      // They shuffle along the line as it moves up.
      const slot = WAITING[i], now = (this.slots[who] ??= { ...slot, k: 0 })
      const rate = Math.min(1, this.step * 7)
      now.x += (slot.x - now.x) * rate
      now.y += (slot.y - now.y) * rate
      const q = play.where(), look = this.lookFrom(`w${who}`, slot.x, slot.y - 90, play.atGate ? FLAME : q)
      this.figure(who, now.x, now.y, WAITING_SIZE, { walked: 0, speed: 0, squash: 0, hop: play.dancing ? 0.5 + 0.5 * Math.sin(this.time * 5 + i) : play.hop[who], flip: 1, held: play.apples > i + 1 && play.puff === null ? 'unlit' : 'none', caught: 9, cheeks: 0, lean: 0.03, turn: 0, look })
    }
    for (const who of gone) delete this.slots[who]
  }

  private leaver(one: Play['leavers'][number]): void {
    const q = Play.leap(one), k = one.size + (WAITING_SIZE - one.size) * q.turn
    this.figure(one.who, q.x, q.y, k, { walked: one.t * 900, speed: one.who === 'bear' || one.who === 'gnome' ? 0 : 400, squash: 0, hop: 0, flip: -1, held: 'none', caught: 9, cheeks: 0, lean: 0, turn: homeTurn(one.who, q.turn), look: { x: 0, y: 1 } })
  }

  private basket(play: Play): void {
    const g = this.g, x = 42, y = 806, n = Math.max(0, play.apples - 1 - WAITING.length)
    g.save()
    g.translate(x, y)
    piece(g, 'M-58 -60 C -40 -84 40 -84 58 -60 L50 -44 L-50 -44 Z', '#3a2415', 5)
    // Every apple still to be carried can be seen, and none is named.
    const spots = [[-32, -50], [0, -48], [32, -50], [-17, -68], [17, -68], [-34, -74], [34, -74], [0, -86], [-14, -92]] as const
    const colors = ['#e2382f', '#f4bd2a', '#7fc447', '#e0629a']
    for (let i = Math.min(n, spots.length) - 1; i >= 0; i--) {
      oval(g, spots[i][0], spots[i][1], 18, 17, colors[i % 4], 4)
      line(g, `M${spots[i][0]} ${spots[i][1] - 17} L${spots[i][0] + 2} ${spots[i][1] - 25}`, 4)
    }
    piece(g, 'M-58 -54 C -30 -40 30 -40 58 -54 L46 0 C 24 10 -24 10 -46 0 Z', '#b5793a', 5)
    line(g, 'M-53 -34 C -28 -22 28 -22 53 -34 M-49 -14 C -26 -4 26 -4 49 -14 M-30 -44 L-24 4 M0 -42 L0 8 M30 -44 L24 4', 3.5)
    g.restore()
  }

  private wind(play: Play): void {
    const g = this.g, t = (play.puff ?? 0) - PUFF.breath
    if (t < 0 || t > PUFF.gap * PLACES.length + 0.3) return
    g.lineCap = 'round'
    for (let i = 0; i < 7; i++) {
      const p = (t * 1.3 + i * 0.17) % 1, u = p * LENGTH, a = at(u), b = at(Math.min(LENGTH, u + 120)), m = at(Math.min(LENGTH, u + 60))
      g.strokeStyle = `rgba(225,235,255,${0.7 * Math.sin(p * Math.PI)})`
      g.lineWidth = 7
      g.beginPath(); g.moveTo(a.x, a.y - 30 + i * 6); g.quadraticCurveTo(m.x, m.y - 42 + i * 6, b.x, b.y - 30 + i * 6); g.stroke()
      count.fills++
    }
  }

  private ghost(play: Play, guidance: Guidance): void {
    const g = this.g, wants = want(play)
    handPose(guidance.demo ?? 0, wants.drag, this.hand)
    const q = handAt(play, wants, this.hand.travel)
    g.save()
    g.globalAlpha = this.hand.opacity * 0.92
    g.translate(q.x, q.y)
    const s = 1.25 - this.hand.press * 0.16
    if (this.hand.press > 0.1) { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 18 + this.hand.press * 12, 0, 7); g.stroke() }
    g.scale(s, s)
    g.rotate(-0.28)
    piece(g, 'M-9 2 C -10 -6 9 -6 10 2 L11 34 C 18 28 28 32 28 38 C 36 34 44 38 44 46 C 52 44 58 50 57 58 L52 92 C 48 108 8 110 0 94 L-22 60 C -28 48 -14 42 -8 52 L-6 54 Z', '#fffdf4', 4)
    line(g, 'M28 40 L28 56 M44 48 L43 60', 3)
    g.restore()
    g.globalAlpha = 1
  }
}
