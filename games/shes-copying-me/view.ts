import { paintArm, paintAunt, paintFingers, type AuntView } from './auntArt'
import type { RoundHand } from './round'
import { BACKDROP, TIERS, type Tier } from './config'
import { Bits } from './fx'
import { handPose, type Guidance, type HandPose } from './guidance'
import { TOP, paintGuest, type Look } from './guestArt'
import { AUNT, BELL, GUEST, MIDDLE, PANE, PANES, PENDULUM, outward, toPoint, zoneAt } from './layout'
import { guestPose } from './motion'
import { demoMove, type Move, type Party, type PartyEvent, type SeatShow } from './party'
import { paintFrame, paintPane, paintRoom, paintTable } from './room'
import { WANTS, other, type Coat, type Guest, type Side, type Thing } from './rules'
import { blob, brush, bump, cell, clamp, dye, ease, gutta, glowRing, line, soft, type G } from './silk'
import { STAGE, fit, type Point } from './stage'
import { Stamps, type MakeSheet } from './stamps'
import { putThing, tipOf } from './thingArt'

// Puts one frame on the surface from the party as it stands. The room, the
// table and the frame are painted once and stamped; everyone in the room is
// drawn fresh.

const HAIR_ON_END: Record<Guest, string> = { walrus: '#4a3f63', dog: '#fff3d8', goose: '#ffffff', pig: '#f7a3ba' }

/** For the overlay: what is drawn in place in a still frame, and the floods and lines in a picture painted again. */
const IN_PLACE = 22
const PAINTED = 70

export class View {
  readonly bits: Bits
  private sheet: { canvas: CanvasImageSource; g: G } | null = null
  private sized = ''
  private tier: Tier = TIERS[0]
  private readonly make: MakeSheet
  private readonly stamps: Stamps
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** What the last draw put down. */
  drawn = 0

  constructor(seed: number, make: MakeSheet) {
    this.bits = new Bits(seed)
    this.make = make
    this.stamps = new Stamps(make)
  }

  setTier(tier: Tier): void {
    this.tier = tier
    brush.shine = tier.shine
    this.stamps.smooth = tier.smooth
    this.sized = ''
  }

  hear(events: readonly PartyEvent[], party: Party): void {
    for (const event of events) this.bits.add(event, this.tier.bits, (side) => this.spout(party, side))
  }

  step(dt: number): void {
    this.bits.step(dt)
  }

  private spout(party: Party, side: Side): Point {
    const p = party.handPoint(side)
    return { x: p.x + outward(side) * 30, y: p.y + 48 }
  }

  /** The room, painted the size and density of the surface, so a frame begins as one plain copy. */
  private prepare(scale: number, width: number, height: number, x: number, y: number): void {
    const key = [scale, width, height].join()
    if (this.sized === key) return
    this.sized = key
    this.stamps.clear()
    this.sheet = this.make(width, height)
    const g = this.sheet.g
    g.fillStyle = BACKDROP
    g.fillRect(0, 0, width, height)
    g.setTransform(scale, 0, 0, scale, x, y)
    brush.shine = true
    paintRoom(g)
    paintFrame(g)
    brush.shine = this.tier.shine
  }

  draw(g: G, width: number, height: number, dpr: number, party: Party | null, guidance: Guidance | null, round: RoundHand | null = null): void {
    const by = fit(width, height)
    if (by.scale === 0) return
    const scale = by.scale * dpr
    this.prepare(scale, Math.round(width * dpr), Math.round(height * dpr), by.x * dpr, by.y * dpr)
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.imageSmoothingEnabled = false
    g.drawImage(this.sheet!.canvas, 0, 0)
    this.drawn = 1
    if (!party) return
    this.stamps.begin(scale)
    const { put } = this.stamps
    g.setTransform(scale, 0, 0, scale, by.x * dpr, by.y * dpr)
    const time = party.time
    const glow = guidance?.glow ?? 0
    // One thing glows: the next one to touch.
    const next = glow > 0 ? demoMove(party) : null
    const on = (what: Move['what'], side: Side) => (next?.what === what && next.side === side ? glow : 0)
    this.window(g, party, time, on)
    this.pendulum(g, party)
    for (const side of [0, 1] as const) {
      const p = toPoint(side, AUNT)
      g.save()
      g.translate(p.x, p.y)
      g.scale(outward(side), 1)
      paintAunt(g, this.auntView(party, side, time), put)
      g.restore()
    }
    this.cat(g, party, time)
put(g, 'table', [MIDDLE - 320, 650, 640, 170], '', '', paintTable)
    this.guests(g, party, time)
    this.tableThings(g, party, time, glow, next)
    this.wish(g, party, time)
    for (const side of [0, 1] as const) this.arm(g, party, side, time, on('hand', side))
    if (party.scene?.kind === 'tidy') this.hankies(g, party)
    for (const carry of party.carried) if (carry) this.thing(g, party, party.state.table[carry.slot], time)
    this.bits.draw(g, put)
    if (party.scene?.kind === 'statues') this.pigeon(g, party, party.scene.t)
    if (round) this.handAt(g, round.x, round.y, round.press, round.opacity)
    else if (guidance && guidance.demo !== null) this.ghost(g, party, guidance)
    if (this.tier.sheen) this.sheen(g, time)
    this.drawn = IN_PLACE + this.stamps.puts + this.stamps.painted * PAINTED
  }

  private auntView(party: Party, side: Side, time: number): AuntView {
    const show = party.aunts[side], hand = party.hands[side]
    const watching = party.copier === side || (party.hands[other(side)].busy && !hand.busy)
    const me = toPoint(side, { u: AUNT.u, y: AUNT.y - 140 })
    const at = show.face === 'innocent' ? { x: me.x, y: -300 } : hand.busy && !watching ? (party.fingerAt(side) ?? party.handPoint(side)) : party.handPoint(other(side))
    const scene = party.scene
    const curtsy = scene?.kind === 'tidy' ? bump((scene.t - 3.2) / 1.6) : scene?.kind === 'birds' ? bump((scene.t - 4.6) / 1.2) * 0.4 : 0
    return { side, show, hand, hair: party.state.hair[side], lips: party.state.lips[side], look: { x: ((at.x - me.x) * outward(side)) / 260, y: (at.y - me.y) / 260 }, time, copying: party.copier === side, curtsy }
  }

  /** Where a seat's guest is while a scene moves it. */
  private seatAt(party: Party, side: Side): { x: number; y: number; turn: number } {
    const home = toPoint(side, { u: GUEST.u, y: 668 })
    const scene = party.scene
    const out = { x: home.x, y: home.y, turn: 0 }
    const came = party.arrived[side]
    if (came < 0.7) out.y -= 90 * (1 - ease(clamp(came / 0.45))) + 26 * bump((came - 0.4) / 0.3)
    if (!scene) return out
    // Rubbed clean, they shake themselves.
    if (scene.kind === 'tidy') out.turn = Math.sin(scene.t * (side ? 34 : 24)) * 0.1 * bump((scene.t - 2.6) / 1.2)
    if (scene.kind === 'bubbles') {
      const from = toPoint(other(side), { u: GUEST.u, y: 668 })
      const k = ease(clamp((scene.t - 0.4) / 4.4))
      // They knock together in the middle and go on over and under each other.
      const knock = Math.sin(clamp((scene.t - 2.3) / 1) * Math.PI) * 40
      out.x = from.x + (home.x - from.x) * k + (side === 0 ? 1 : -1) * knock
      out.y = home.y - (side === 0 ? 250 : 190) * Math.sin(k * Math.PI)
      out.turn = Math.sin(k * Math.PI * 2) * 0.4
    } else if (scene.kind === 'birds') {
      const t = scene.t
      if (t < 1.6) out.turn = (side === 0 ? 0.3 : -0.3) * bump(t / 1.6)
      else if (t < 5) {
        const beat = (t - 1.6) / 0.8
        out.y -= 46 * Math.abs(Math.sin(beat * Math.PI))
        out.x += 26 * Math.sin(beat * Math.PI)
        out.turn = 0.22 * Math.sin(beat * Math.PI)
      } else out.turn = (side === 0 ? 0.2 : -0.2) * bump((t - 5) / 1)
    }
    return out
  }

  private guests(g: G, party: Party, time: number): void {
    for (const side of [0, 1] as const) {
      const guest = party.state.seated[side], show = party.seats[side]
      const coat = party.state.coats[guest]
      const at = this.seatAt(party, side)
      g.save()
      g.translate(at.x, at.y)
      g.rotate(at.turn)
      g.scale(outward(side), 1)
      const scene = party.scene
      let shown: Coat = coat, flood = 1, from = show.from
      if (scene?.kind === 'tidy' && show.antic === null) {
        // Rubbed clean from the moment the handkerchief is on it.
        from = this.wasCoat[guest] ?? 'clean'
        flood = clamp((scene.t - 0.6 - side * 0.2) / 1.2)
      } else {
        this.wasCoat[guest] = coat
        if (show.t < 0) shown = show.from
        else if (show.from !== coat) flood = clamp(show.t / 0.45)
      }
      const asking = this.asking(party, side)
      const cup = guest === 'walrus' && show.effect === 'splash' && show.t > 0.2 && show.t < 3 ? bump((show.t - 0.2) / 2.8) : 0
      const look: Look = this.guestLook(party, side)
      const paint = (c: Coat, was = '') => paintGuest(g, `seat${side}${was}`, guest, c, guestPose(guest, c, show.antic, show.mood, show.t, time, show.effect), look, time, asking, cup, this.stamps.put)
      if (flood < 1) {
        paint(from, 'was')
        g.save()
        g.beginPath()
        g.ellipse(-10, -190 + 60 * flood, 30 + 260 * flood, 30 + 290 * flood, 0, 0, Math.PI * 2)
        g.clip()
        paint(shown)
        g.restore()
      } else paint(shown)
      const pose = guestPose(guest, coat, show.antic, show.mood, show.t, time, show.effect)
      // With the body, whatever it does.
      g.translate(pose.x, pose.y - 100)
      g.rotate(pose.turn)
      g.translate(0, 100)
      g.scale(pose.sx, pose.sy)
      this.extras(g, guest, show)
      g.restore()
    }
  }

  /** What an answer shows for a moment over the guest. */
  private extras(g: G, guest: Guest, show: SeatShow): void {
    const { t, antic } = show
    if (t < 0) return
    if (antic === 'nose' && t < 0.85) {
      g.save()
      g.translate(guest === 'goose' ? -66 : 0, -TOP[guest] * 0.6 - 60 * clamp(1 - t * 4))
      g.rotate(0.5 + Math.sin(t * 22) * 0.3)
      g.beginPath()
      g.moveTo(-26, 0)
      g.quadraticCurveTo(0, -19, 26, 0)
      g.quadraticCurveTo(0, 19, -26, 0)
      cell(g, '#f25c9a', 3)
      g.restore()
    } else if (antic === 'onEnd' && t < 1.4) {
      const up = Math.min(clamp(t * 8), clamp((1.4 - t) * 4))
      for (let i = -3; i <= 3; i++) {
        g.beginPath()
        g.moveTo(i * 13 - 6, -TOP[guest] + 22 + Math.abs(i) * 8)
        g.quadraticCurveTo(i * 18, -TOP[guest] - 10 * up, i * 21 + Math.sin(t * 40 + i) * 3, -TOP[guest] + 14 - (46 - Math.abs(i) * 7) * up)
        g.quadraticCurveTo(i * 18 + 6, -TOP[guest] - 4, i * 13 + 6, -TOP[guest] + 22 + Math.abs(i) * 8)
        cell(g, HAIR_ON_END[guest], 2.6)
      }
    } else if (antic === 'double' && t < 2.6) {
      const k = Math.min(1, t * 2.2) * 1.14
      g.globalAlpha = clamp((2.6 - t) * 2)
      blob(g, 0, -120, 128 * k, 124 * k)
      gutta(g, 4)
      g.globalAlpha = 1
    }
  }

  private wasCoat: Partial<Record<Guest, Coat>> = {}

  /** Only one seated guest asks at a time. */
  private asking(party: Party, side: Side): number {
    if (party.asker !== side) return 0.2
    return 0.55 + 0.45 * Math.sin(party.time * 2.2)
  }

  private guestLook(party: Party, side: Side): Look {
    const me = toPoint(side, { u: GUEST.u, y: GUEST.y - 90 })
    const busy = party.hands[side].busy
    const hand = party.handPoint(side)
    const want = party.at[WANTS[party.state.seated[side]]]
    if (party.scene?.kind === 'birds') return { x: -1, y: 0 }
    const at = busy ? hand : this.asking(party, side) > 0.2 && want ? want : this.asking(party, side) > 0.2 ? { x: me.x - outward(side) * 40, y: me.y + 10 } : party.at[party.state.held[side]]
    return { x: ((at.x - me.x) * outward(side)) / 160, y: (at.y - me.y) / 160 }
  }

  private thing(g: G, party: Party, thing: Thing, time: number, lit = 0): void {
    const body = party.at[thing]
    const held = party.state.held.indexOf(thing)
    const side: Side = held >= 0 ? (held as Side) : body.x < MIDDLE ? 0 : 1
    const show = party.aunts[side]
    const doing = held >= 0 ? { act: show.thing === thing ? show.act : null, t: show.t, over: zoneAt(party.hands[side]) === 'tip' && !party.hands[side].quiet } : { act: null, t: 9 }
    const s = outward(side)
    g.save()
    g.translate(body.x, body.y)
    g.scale(s, 1)
    if (lit > 0) {
      glowRing(g, 0, 0, 58, 54, Math.min(1, lit), 9)
    }
    g.rotate(body.tilt * s + (held >= 0 ? tipOf(thing, doing) : 0))
    if (held >= 0) g.translate(thing === 'fan' ? 10 : 24, thing === 'duster' ? -22 : -4)
    putThing(g, thing, doing, time, held >= 0 ? 1 : 0.86, this.stamps.put)
    g.restore()
  }

  private tableThings(g: G, party: Party, time: number, glow: number, next: Move | null): void {
    const carried = party.carried.map((carry) => carry && party.state.table[carry.slot])
    for (const thing of party.state.table) if (!carried.includes(thing)) this.thing(g, party, thing, time, next?.what === 'thing' && party.state.table[next.slot] === thing ? glow * 1.2 : 0)
    if (party.untidy || party.bell || party.bellBack < 1) {
      const k = ease(clamp(party.bellBack / 0.45)), from = party.bellFrom
      // Let go, it hops back to its place.
      const at = party.bell ?? { x: from.x + (BELL.x - from.x) * k, y: from.y + (BELL.y - from.y) * k - 46 * bump(party.bellBack / 0.45) - 12 * bump((party.bellBack - 0.45) / 0.25) }
      const gone = party.untidy || party.bell ? 1 : clamp((1 - party.bellBack) / 0.25)
      if (glow > 0 && next?.what === 'bell') glowRing(g, at.x, at.y - 20, 50, 56, glow * 0.7, 9)
      g.save()
      g.translate(at.x, at.y - 34)
      g.globalAlpha = gone
      g.rotate(Math.sin(party.bellRing * 26) * 0.4 * Math.exp(-party.bellRing * 3) + (party.bell ? Math.sin(time * 12) * 0.1 : 0))
      this.stamps.put(g, 'bell', [-40, -52, 80, 116], '', '', (g) => {
      blob(g, 0, 52, 8, 8)
      cell(g, '#a86a2c', 3)
      g.beginPath()
      g.moveTo(-34, 46)
      g.quadraticCurveTo(-22, 34, -20, 8)
      g.quadraticCurveTo(-14, -14, 0, -14)
      g.quadraticCurveTo(14, -14, 20, 8)
      g.quadraticCurveTo(22, 34, 34, 46)
      g.closePath()
      cell(g, dye(g, '#f7c23c', 44), 4)
      line(g, [[0, -14], [0, -34]], '#8a521c', 11)
      blob(g, 0, -38, 9, 9)
      cell(g, '#e2407a', 3)
      })
      g.restore()
    }
  }

  /** What the guest whose turn it is asks for, in a cloud over its head. */
  private wish(g: G, party: Party, time: number): void {
    const side = party.asker
    if (side === null) return
    const guest = party.state.seated[side], s = outward(side)
    const p = toPoint(side, { u: 478, y: Math.max(150, 560 - TOP[guest]) - 60 })
    g.save()
    g.translate(p.x, p.y + Math.sin(time * 2.2) * 5)
    g.scale(s, 1)
    this.stamps.put(g, 'cloud', [-100, -92, 200, 220], '', '', (g) => {
      blob(g, -12, 108, 9, 9)
      cell(g, '#fffdf6', 3)
      blob(g, -6, 84, 14, 12)
      cell(g, '#fffdf6', 3.4)
      soft(g, [[-84, 10], [-72, -44], [-26, -72], [30, -70], [78, -42], [84, 14], [52, 62], [0, 68], [-54, 58]])
      cell(g, '#fffdf6', 5)
    })
    g.rotate(Math.sin(time * 3) * 0.08)
    putThing(g, WANTS[guest], { act: null, t: 9 }, time, 1.1, this.stamps.put)
    g.restore()
  }

  private arm(g: G, party: Party, side: Side, time: number, glow: number): void {
    const p = toPoint(side, AUNT), hand = party.hands[side]
    g.save()
    g.translate(p.x, p.y)
    g.scale(outward(side), 1)
    paintArm(g, side, hand, glow, this.stamps.put)
    g.restore()
    this.thing(g, party, party.state.held[side], time)
    const h = party.handPoint(side)
    g.save()
    g.translate(h.x, h.y)
    g.scale(outward(side), 1)
    paintFingers(g, side, this.stamps.put)
    g.restore()
  }

  private window(g: G, party: Party, time: number, on: (what: Move['what'], side: Side) => number): void {
    for (const side of [0, 1] as const) {
      const glow = on('pane', side)
      const p = PANES[side]
      const guest = party.state.waiting[side], tap = party.paneTap[side]
      g.save()
      g.beginPath()
      g.rect(p.x - PANE.width / 2, p.y - PANE.height / 2, PANE.width, PANE.height)
      g.clip()
      const { x, y } = { x: p.x - PANE.width / 2, y: p.y - PANE.height / 2 }
      this.stamps.put(g, `garden${side}`, [x, y, PANE.width, PANE.height], '', '', (g) => paintPane(g, side))
      g.translate(p.x, p.y + PANE.height / 2 - 2 + 10 * Math.sin(tap * 18) * Math.exp(-tap * 5))
      g.scale(outward(side) * 0.47, 0.47)
      const pose = guestPose(guest, party.state.coats[guest], null, null, 9, time + 3)
      paintGuest(g, `pane${side}`, guest, party.state.coats[guest], pose, { x: -0.2, y: 0.5 }, time, 0.25, 0, this.stamps.put)
      g.restore()
      g.beginPath()
      g.rect(p.x - PANE.width / 2, p.y - PANE.height / 2, PANE.width, PANE.height)
      g.strokeStyle = '#8a521c'
      g.lineWidth = 10
      g.stroke()
      gutta(g, 4)
      if (glow > 0) {
        g.globalAlpha = glow * (0.6 + 0.3 * Math.sin(time * 4))
        g.strokeStyle = '#fff3b0'
        g.lineWidth = 10
        g.stroke()
        g.globalAlpha = 1
      }
    }
  }

  private pendulum(g: G, party: Party): void {
    const a = Math.sin(party.swing) * (0.42 + party.pendulumPush * 0.35)
    const { pivot, length } = PENDULUM
    const x = pivot.x + Math.sin(a) * length, y = pivot.y + Math.cos(a) * length
    line(g, [[pivot.x, pivot.y], [x, y]], '#8a521c', 9)
    line(g, [[pivot.x, pivot.y], [x, y]], '#f7c23c', 4)
    g.save()
    g.translate(x, y)
    this.stamps.put(g, 'bob', [-38, -38, 76, 76], '', '', (g) => {
      blob(g, 0, 0, 34, 34)
      cell(g, '#f7c23c', 5)
      blob(g, 0, 0, 20, 20)
      cell(g, '#e2407a', 3)
      blob(g, 0, 0, 8, 8)
      cell(g, '#ffe39a', 2)
    })
    g.restore()
  }

  /** The sofa's cat: asleep between the aunts, one ear for everything, one eye for a finger. */
  private cat(g: G, party: Party, time: number): void {
    const start = Math.exp(-party.catPoke * 1.6), ear = Math.exp(-Math.min(party.seats[0].t < 0 ? 9 : party.seats[0].t, party.seats[1].t < 0 ? 9 : party.seats[1].t, party.catPoke) * 3)
    const breath = Math.sin(time * 1.5) * 3
    const duck = party.scene?.kind === 'trade' ? 22 * bump(party.scene.t / 1.6) : 0
    g.save()
    g.translate(MIDDLE, 604 + duck)
    g.scale(1 + breath * 0.003, 1 - breath * 0.004 + start * 0.12)
    g.save()
    g.translate(72, -8)
    g.rotate(Math.sin(time * 1.1) * 0.12 + start * Math.sin(time * 22) * 0.2)
    this.stamps.put(g, 'tail', [-36, -30, 96, 72], '', '', (g) => {
      soft(g, [[-30, 16], [10, 4], [34, -20], [52, -18], [46, 8], [8, 34], [-30, 34]])
      cell(g, '#f0a04b', 4)
    })
    g.restore()
    this.stamps.put(g, 'cat', [-100, -90, 200, 136], '', `${start > 0.25}${start > 0.02 ? Math.round(start * 10) : 0}${ear > 0.1 ? Math.floor(time * 20) : ''}`, (g) => this.catBody(g, start, ear, time))
    g.restore()
  }

  private catBody(g: G, start: number, ear: number, time: number): void {
    soft(g, [[-84, 34], [-78, -14], [-30, -48], [34, -46], [82, -10], [86, 34], [0, 42]])
    cell(g, dye(g, '#f0a04b', 92), 4.5)
    for (const x of [-4, 24, 52]) {
      g.beginPath()
      g.moveTo(x, -44 + Math.abs(x - 10) * 0.2)
      g.quadraticCurveTo(x + 10, -24, x + 2, -8)
      g.strokeStyle = '#c9622a'
      g.lineWidth = 8
      g.stroke()
      gutta(g, 2.4)
    }
    g.save()
    g.translate(-44, -6 - start * 14)
    for (const s of [-1, 1]) {
      g.save()
      g.translate(s * 26, -24)
      g.rotate(s * 0.2 + (s > 0 ? ear * Math.sin(time * 40) * 0.5 : 0))
      g.beginPath()
      g.moveTo(-14, 6)
      g.lineTo(s * 6, -26)
      g.lineTo(14, 6)
      g.closePath()
      cell(g, '#f0a04b', 4)
      g.restore()
    }
    blob(g, 0, 0, 44, 36)
    cell(g, dye(g, '#f6b562', 50), 4)
    for (const s of [-1, 1]) {
      if (start > 0.25 && s > 0) {
        blob(g, s * 17, -4, 9, 10)
        cell(g, '#d7f0a0', 3)
        blob(g, s * 17, -4, 3, 8)
        g.fillStyle = '#2a1030'
        g.fill()
      } else {
        g.beginPath()
        g.arc(s * 17, -7, 9, 0.3, Math.PI - 0.3)
        gutta(g, 3.4)
      }
    }
    blob(g, 0, 8, 6, 4.5)
    cell(g, '#e2607a', 2.4)
    g.restore()
  }

  private hankies(g: G, party: Party): void {
    const t = party.scene!.t
    const k = clamp(t / 0.6) * clamp((3.2 - t) / 0.5)
    if (k <= 0) return
    for (const side of [0, 1] as const) {
      const p = party.handPoint(side)
      g.save()
      g.translate(p.x, p.y)
      g.scale(k, k)
      g.rotate(Math.sin(t * 9) * 0.3)
      soft(g, [[-46, -40], [0, -32], [48, -42], [42, 4], [52, 44], [0, 36], [-46, 46], [-40, 0]])
      cell(g, side ? '#fff0b8' : '#f7c6e6', 4)
      g.restore()
    }
  }

  private pigeon(g: G, party: Party, t: number): void {
    const a = toPoint(0, { u: GUEST.u, y: 652 - TOP[party.state.seated[0]] }), b = toPoint(1, { u: GUEST.u, y: 652 - TOP[party.state.seated[1]] })
    const path = (from: Point, to: Point, k: number): Point => ({ x: from.x + (to.x - from.x) * ease(k), y: from.y + (to.y - from.y) * ease(k) - Math.sin(k * Math.PI) * 120 })
    let at: Point, fly = true, dir = 1
    if (t < 1.1) at = path({ x: -80, y: 160 }, a, t / 1.1)
    else if (t < 2.6) {
      at = { x: a.x, y: a.y - 8 * Math.abs(Math.sin(t * 9)) }
      fly = false
    } else if (t < 4.2) at = path(a, b, (t - 2.6) / 1.6)
    else if (t < 5.2) {
      at = { x: b.x, y: b.y - 8 * Math.abs(Math.sin(t * 9)) }
      fly = false
      dir = -1
    } else at = path(b, { x: STAGE.width + 100, y: 120 }, clamp((t - 5.2) / 1.2))
    g.save()
    g.translate(at.x, at.y)
    g.scale(dir, 1)
    soft(g, [[-40, 4], [-10, -18], [20, -14], [30, 6], [4, 22], [-20, 16]])
    cell(g, '#b9c3e0', 4)
    blob(g, 26, -18, 15, 14)
    cell(g, '#8fa3d8', 3)
    blob(g, 30, -20, 3, 3.4)
    g.fillStyle = '#2a1030'
    g.fill()
    g.beginPath()
    g.moveTo(39, -18)
    g.lineTo(50, -14)
    g.lineTo(39, -11)
    cell(g, '#f58a2b', 2)
    g.save()
    g.rotate(fly ? Math.sin(t * 26) * 0.7 - 0.4 : 0.1)
    soft(g, [[-8, -2], [-30, -44], [10, -30], [16, 2]])
    cell(g, '#d6def2', 3)
    g.restore()
    g.restore()
  }

  private ghost(g: G, party: Party, guidance: Guidance): void {
    const { from, to, drag } = demoMove(party)
    const h = handPose(guidance.demo!, drag, this.hand)
    this.handAt(g, from.x + (to.x - from.x) * h.travel, from.y + (to.y - from.y) * h.travel, h.press, h.opacity)
  }

  private handAt(g: G, x: number, y: number, press: number, opacity: number): void {
    g.save()
    g.globalAlpha = opacity * 0.95
    g.translate(x + 8, y + 22)
    g.rotate(-0.25)
    g.scale(1.15 - press * 0.12, 1.15 - press * 0.12)
    soft(g, [[-9, -34], [0, -42], [9, -34], [10, 0], [34, 6], [40, 26], [30, 62], [-10, 62], [-32, 22], [-22, 8], [-9, 18]])
    cell(g, '#fffdf6', 4)
    g.restore()
    g.globalAlpha = 1
  }

  /** One slow band of satin light over the whole cloth. */
  private sheen(g: G, time: number): void {
    const x = ((time * 46) % 2300) - 560
    const band = g.createLinearGradient(x - 90, 0, x + 90, 54)
    band.addColorStop(0, 'rgba(255,255,255,0)')
    band.addColorStop(0.5, 'rgba(255,250,230,0.13)')
    band.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = band
    g.beginPath()
    g.moveTo(x - 110, 0)
    g.lineTo(x + 110, 0)
    g.lineTo(x - 136, STAGE.height)
    g.lineTo(x - 356, STAGE.height)
    g.fill()
  }
}

