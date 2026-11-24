import { paintArm, paintAunt, paintFingers, type AuntView } from './auntArt'
import { BACKDROP, TIERS, type Tier } from './config'
import { Bits } from './fx'
import { handPose, type Guidance, type HandPose } from './guidance'
import { paintGuest, type Look } from './guestArt'
import { AUNT, BELL, GUEST, MIDDLE, PANE, PANES, PENDULUM, outward, toPoint, zoneAt } from './layout'
import { guestPose } from './motion'
import { demoMove, type Party, type PartyEvent } from './party'
import { paintFrame, paintPane, paintRoom, paintTable } from './room'
import { other, type Coat, type Guest, type Side, type Thing } from './rules'
import { blob, brush, bump, cell, clamp, dye, ease, gutta, line, soft, type G } from './silk'
import { STAGE, fit, type Point } from './stage'
import { paintThing, tipOf } from './thingArt'

// Puts one frame on the surface from the party as it stands. The room, the
// table and the frame are painted once and stamped; everyone in the room is
// drawn fresh.

export type MakeSheet = (width: number, height: number) => { canvas: CanvasImageSource; g: G }

const MARGIN = { x: 400, y: 300 }

export class View {
  readonly bits: Bits
  private sheet: { canvas: CanvasImageSource; g: G } | null = null
  private table: { canvas: CanvasImageSource; g: G } | null = null
  private sized = ''
  private tier: Tier = TIERS[0]
  private readonly make: MakeSheet
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** What the last draw put down. */
  drawn = 0

  constructor(seed: number, make: MakeSheet) {
    this.bits = new Bits(seed)
    this.make = make
  }

  setTier(tier: Tier): void {
    this.tier = tier
    brush.shine = tier.shine
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

  /** The room, painted at the density it is shown at. */
  private prepare(scale: number): void {
    const key = scale.toFixed(3)
    if (this.sized === key) return
    this.sized = key
    const w = STAGE.width, h = STAGE.height
    this.sheet = this.make(Math.ceil((w + MARGIN.x * 2) * scale), Math.ceil((h + MARGIN.y * 2) * scale))
    const g = this.sheet.g
    g.setTransform(scale, 0, 0, scale, MARGIN.x * scale, MARGIN.y * scale)
    brush.shine = true
    paintRoom(g)
    paintFrame(g)
    this.table = this.make(Math.ceil(640 * scale), Math.ceil(170 * scale))
    this.table.g.setTransform(scale, 0, 0, scale, -(MIDDLE - 320) * scale, -650 * scale)
    paintTable(this.table.g)
    brush.shine = this.tier.shine
  }

  draw(g: G, width: number, height: number, dpr: number, party: Party | null, guidance: Guidance | null): void {
    const by = fit(width, height)
    if (by.scale === 0) return
    const scale = by.scale * dpr
    this.prepare(scale)
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.fillStyle = BACKDROP
    g.fillRect(0, 0, width * dpr, height * dpr)
    g.drawImage(this.sheet!.canvas, Math.round(by.x * dpr - MARGIN.x * scale), Math.round(by.y * dpr - MARGIN.y * scale))
    this.drawn = 1
    if (!party) return
    g.setTransform(scale, 0, 0, scale, by.x * dpr, by.y * dpr)
    const time = party.time
    const glow = guidance?.glow ?? 0
    this.window(g, party, time, glow)
    this.pendulum(g, party, glow)
    for (const side of [0, 1] as const) {
      const p = toPoint(side, AUNT)
      g.save()
      g.translate(p.x, p.y)
      g.scale(outward(side), 1)
      paintAunt(g, this.auntView(party, side, time))
      g.restore()
    }
    this.cat(g, party, time)
    g.drawImage(this.table!.canvas, MIDDLE - 320, 650, (this.table!.canvas as HTMLCanvasElement).width / scale, (this.table!.canvas as HTMLCanvasElement).height / scale)
    this.guests(g, party, time)
    this.tableThings(g, party, time, glow)
    if (party.scene?.kind === 'tidy') this.hankies(g, party)
    for (const side of [0, 1] as const) this.arm(g, party, side, time, glow)
    if (party.carried) this.thing(g, party, party.state.table[party.carried.slot], time)
    this.bits.draw(g)
    if (party.scene?.kind === 'statues') this.pigeon(g, party.scene.t)
    if (guidance && guidance.demo !== null) this.ghost(g, party, guidance)
    if (this.tier.sheen) this.sheen(g, time)
    this.drawn += 14 + this.bits.bits.length
  }

  private auntView(party: Party, side: Side, time: number): AuntView {
    const show = party.aunts[side], hand = party.hands[side]
    const watching = party.copier === side || (party.hands[other(side)].busy && !hand.busy)
    const me = toPoint(side, { u: AUNT.u, y: AUNT.y - 140 })
    const at = show.face === 'innocent' ? { x: me.x, y: -300 } : watching ? party.handPoint(other(side)) : hand.busy ? party.handPoint(side) : toPoint(side, GUEST)
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
      if (scene?.kind === 'tidy') {
        // Rubbed clean from the moment the handkerchief is on it.
        from = this.wasCoat[guest] ?? 'clean'
        flood = clamp((scene.t - 0.6 - side * 0.2) / 1.2)
      } else {
        this.wasCoat[guest] = coat
        if (show.t < 0) shown = show.from
        else if (show.from !== coat) flood = clamp(show.t / 0.45)
      }
      const asking = this.asking(party, side)
      const cup = guest === 'walrus' && show.mood === 'delight' && show.t > 0.2 && show.t < 3 && show.from !== 'puffed' ? 1 : 0
      const look: Look = this.guestLook(party, side)
      const paint = (c: Coat) => paintGuest(g, guest, c, guestPose(guest, c, show.antic, show.mood, show.t, time), look, time, asking, cup)
      if (flood < 1) {
        paint(from)
        g.save()
        g.beginPath()
        g.ellipse(-10, -190 + 60 * flood, 30 + 260 * flood, 30 + 290 * flood, 0, 0, Math.PI * 2)
        g.clip()
        paint(shown)
        g.restore()
      } else paint(shown)
      g.restore()
    }
  }
  private wasCoat: Partial<Record<Guest, Coat>> = {}

  /** Only one seated guest asks at a time: the one whose aunt is not at work, the first when neither is. */
  private asking(party: Party, side: Side): number {
    const turn = party.hands[0].busy && !party.hands[1].busy ? 1 : 0
    if (party.scene || turn !== side) return 0.2
    return 0.55 + 0.45 * Math.sin(party.time * 2.2)
  }

  private guestLook(party: Party, side: Side): Look {
    const me = toPoint(side, { u: GUEST.u, y: GUEST.y - 90 })
    const busy = party.hands[side].busy
    const hand = party.handPoint(side)
    const at = busy ? hand : this.asking(party, side) > 0.2 ? { x: me.x - outward(side) * 40, y: me.y + 10 } : party.at[party.state.held[side]]
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
      g.globalAlpha = lit * 0.5
      blob(g, 0, 0, 58, 54)
      g.strokeStyle = '#fff3b0'
      g.lineWidth = 8
      g.stroke()
      g.globalAlpha = 1
    }
    g.rotate(body.tilt * s + (held >= 0 ? tipOf(thing, doing) : 0))
    if (held >= 0) g.translate(thing === 'fan' ? 10 : 24, thing === 'duster' ? -22 : -4)
    else g.scale(0.86, 0.86)
    paintThing(g, thing, doing, time)
    g.restore()
  }

  private tableThings(g: G, party: Party, time: number, glow: number): void {
    const carried = party.carried ? party.state.table[party.carried.slot] : null
    for (const thing of party.state.table) if (thing !== carried) this.thing(g, party, thing, time, glow * 0.6)
    if (party.untidy || party.bell) {
      const at = party.bell ?? BELL
      g.save()
      g.translate(at.x, at.y - 34)
      g.rotate(Math.sin(party.bellRing * 26) * 0.4 * Math.exp(-party.bellRing * 3) + (party.bell ? Math.sin(time * 12) * 0.1 : 0))
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
      g.restore()
    }
  }

  private arm(g: G, party: Party, side: Side, time: number, glow: number): void {
    const p = toPoint(side, AUNT), hand = party.hands[side]
    g.save()
    g.translate(p.x, p.y)
    g.scale(outward(side), 1)
    paintArm(g, side, hand, time, glow)
    g.restore()
    this.thing(g, party, party.state.held[side], time)
    const h = party.handPoint(side)
    g.save()
    g.translate(h.x, h.y)
    g.scale(outward(side), 1)
    paintFingers(g, side)
    g.restore()
  }

  private window(g: G, party: Party, time: number, glow: number): void {
    for (const side of [0, 1] as const) {
      const p = PANES[side]
      const guest = party.state.waiting[side], tap = party.paneTap[side]
      g.save()
      g.beginPath()
      g.rect(p.x - PANE.width / 2, p.y - PANE.height / 2, PANE.width, PANE.height)
      g.clip()
      paintPane(g, side)
      g.translate(p.x, p.y + PANE.height / 2 + 12 + 10 * Math.sin(tap * 18) * Math.exp(-tap * 5))
      g.scale(outward(side) * 0.66, 0.66)
      const pose = guestPose(guest, party.state.coats[guest], null, null, 9, time + 3)
      paintGuest(g, guest, party.state.coats[guest], pose, { x: -0.2, y: 0.5 }, time, 0.25, 0)
      g.restore()
      g.beginPath()
      g.rect(p.x - PANE.width / 2, p.y - PANE.height / 2, PANE.width, PANE.height)
      g.strokeStyle = '#8a521c'
      g.lineWidth = 10
      g.stroke()
      gutta(g, 4)
      if (glow > 0) {
        g.globalAlpha = glow * 0.35
        g.strokeStyle = '#fff3b0'
        g.lineWidth = 8
        g.stroke()
        g.globalAlpha = 1
      }
    }
  }

  private pendulum(g: G, party: Party, glow: number): void {
    const a = Math.sin(party.swing) * (0.42 + party.pendulumPush * 0.35)
    const { pivot, length } = PENDULUM
    const x = pivot.x + Math.sin(a) * length, y = pivot.y + Math.cos(a) * length
    line(g, [[pivot.x, pivot.y], [x, y]], '#8a521c', 9)
    line(g, [[pivot.x, pivot.y], [x, y]], '#f7c23c', 4)
    blob(g, x, y, 34, 34)
    cell(g, '#f7c23c', 5)
    blob(g, x, y, 20, 20)
    cell(g, '#e2407a', 3)
    blob(g, x, y, 8, 8)
    cell(g, '#ffe39a', 2)
    if (glow > 0) {
      g.globalAlpha = glow * 0.3
      blob(g, x, y, 44, 44)
      g.strokeStyle = '#fff3b0'
      g.lineWidth = 6
      g.stroke()
      g.globalAlpha = 1
    }
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
    soft(g, [[-30, 16], [10, 4], [34, -20], [52, -18], [46, 8], [8, 34], [-30, 34]])
    cell(g, '#f0a04b', 4)
    g.restore()
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
    g.restore()
  }

  private hankies(g: G, party: Party): void {
    const t = party.scene!.t
    const k = clamp(t / 0.6) * clamp((3.2 - t) / 0.5)
    if (k <= 0) return
    for (const side of [0, 1] as const) {
      const p = toPoint(side, { u: GUEST.u - 10 + Math.sin(t * (side ? 13 : 8)) * 54, y: 545 + Math.cos(t * (side ? 9 : 6)) * 46 })
      g.save()
      g.translate(p.x, p.y)
      g.scale(k, k)
      g.rotate(Math.sin(t * 9) * 0.3)
      soft(g, [[-46, -40], [0, -32], [48, -42], [42, 4], [52, 44], [0, 36], [-46, 46], [-40, 0]])
      cell(g, side ? '#fff0b8' : '#f7c6e6', 4)
      g.restore()
    }
  }

  private pigeon(g: G, t: number): void {
    const a = toPoint(0, { u: GUEST.u, y: 424 }), b = toPoint(1, { u: GUEST.u, y: 424 })
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
    const { from, to } = demoMove(party, guidance.demoIndex)
    const h = handPose(guidance.demo!, true, this.hand)
    const x = from.x + (to.x - from.x) * h.travel, y = from.y + (to.y - from.y) * h.travel
    g.save()
    g.globalAlpha = h.opacity * 0.8
    g.translate(x + 8, y + 22)
    g.rotate(-0.25)
    g.scale(1 - h.press * 0.1, 1 - h.press * 0.1)
    soft(g, [[-9, -34], [0, -42], [9, -34], [10, 0], [34, 6], [40, 26], [30, 62], [-10, 62], [-32, 22], [-22, 8], [-9, 18]])
    cell(g, '#fffdf6', 4)
    g.restore()
    g.globalAlpha = 1
  }

  /** One slow band of satin light over the whole cloth. */
  private sheen(g: G, time: number): void {
    const x = ((time * 46) % 2300) - 560
    const band = g.createLinearGradient(x - 150, 0, x + 150, 90)
    band.addColorStop(0, 'rgba(255,255,255,0)')
    band.addColorStop(0.5, 'rgba(255,250,230,0.13)')
    band.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = band
    g.beginPath()
    g.moveTo(x - 180, 0)
    g.lineTo(x + 180, 0)
    g.lineTo(x - 60, STAGE.height)
    g.lineTo(x - 420, STAGE.height)
    g.fill()
  }
}

