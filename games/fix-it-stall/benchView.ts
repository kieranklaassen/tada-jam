import { type Bench, type Mark } from './bench'
import { boardFor, FOOT, ODD_KINDS, type Body, type Circuit, type Part } from './circuit'
import { type Cast, type Standing } from './cast'
import { type Guidance } from './guidance'
import { handBack } from './handback'
import { type Hint } from './ladder'
import { disc, INK, LEAD_COLOURS, roundRect, type Ctx } from './paint'
import { paintCase, paintLane, paintMat, paintTray } from './paintBench'
import { paintBoard, paintFlag, paintOdd, paintPart, paintParts } from './paintBoard'
import { paintCustomerBehind, paintCustomerFront } from './paintCustomers'
import { paintMug, paintRaccoon, paintRaccoonLive } from './paintFolk'
import { CASE, paintGadget, QUIET, type Doing } from './paintGadget'
import { makeGlow, paintLead, paintLeads } from './paintLive'
import { paintGhostHand, paintPractice, paintRings, paintTicket } from './paintScene'
import { level, RUNS_FROM } from './solve'
import { AT_BENCH, boardBox, fit, HELD, HELD_AT_WINDOW, HUNG, layOf, LEAD_U, leadCurve, leadEnds, lidBox, LOOSE, matAt, MUG, oddPlace, OLD_HAND, onCurve, padAt, PROBE_BEND, PROBE_HOME, STAGE, TEST_LAMP, TRAY, type Box, type Lay, type P } from './stage'

// The stall, drawn. What stands still is painted once for a size and stamped
// once a frame: the lane, the counter, the mat, the tray, the bench odds, the
// mug. The board on the mat, the board that hangs and the old hand are
// sprites, repainted only when they change. A frame then draws the customers
// from their rigs, the parts, the leads, the beads where the solved current
// runs, the glows, and whatever a touch just set off.

type Effect = { type: 'bite' | 'pat' | 'pop' | 'blow'; at: P; age: number }
const LASTS = { bite: 0.24, pat: 0.28, pop: 0.6, blow: 0.35 }
type Sprite = { image: HTMLCanvasElement; x: number; y: number; w: number; h: number; key: string }

function sprite(box: Box, k: number, key: string, paint: (c: Ctx) => void): Sprite {
  const image = document.createElement('canvas')
  image.width = Math.max(1, Math.ceil(box.w * k))
  image.height = Math.max(1, Math.ceil(box.h * k))
  const c = image.getContext('2d')!
  c.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
  paint(c)
  return { image, x: box.x, y: box.y, w: box.w, h: box.h, key }
}
const stamp = (c: Ctx, s: Sprite) => c.drawImage(s.image, s.x, s.y, s.w, s.h)
const grow = (box: Box, by: number): Box => ({ x: box.x - by, y: box.y - by, w: box.w + 2 * by, h: box.h + 2 * by })
const between = (a: Box, b: Box, t: number): Box => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t })

export class BenchView {
  private still: HTMLCanvasElement | null = null
  private glow: HTMLCanvasElement | null = null
  private raccoon: Sprite | null = null
  private board: Sprite | null = null
  private hung: Sprite | null = null
  private key = ''
  private k = 1
  private effects: Effect[] = []
  private readonly doing = new WeakMap<Circuit, Doing>()
  private readonly ran = new WeakMap<Circuit, boolean>()

  /** What a touch just set off: a ring where a clip bit, a pat on the mat, a puff at a pop, a flash where a lamp blew. */
  show(marks: readonly Mark[]): void {
    for (const mark of marks) if (mark.type === 'bite' || mark.type === 'pat' || mark.type === 'pop' || mark.type === 'blow') this.effects.push({ type: mark.type, at: mark.at, age: 0 })
  }

  step(dt: number): void {
    for (const effect of this.effects) effect.age += dt
    this.effects = this.effects.filter((e) => e.age < LASTS[e.type])
  }

  /** What a gadget does in its owner's hands, worked out once for a circuit. */
  private doingOf(circuit: Circuit): Doing {
    let doing = this.doing.get(circuit)
    if (!doing) {
      const handed = handBack(circuit)
      doing = { light: handed.light, wind: handed.wind, sound: handed.sound, popped: handed.popped, lid: handed.lid, on: 1, shut: 1 }
      this.doing.set(circuit, doing)
      this.ran.set(circuit, handed.ran)
    }
    return doing
  }

  private build(width: number, height: number, dpr: number): void {
    const f = fit(width, height), k = f.scale * dpr
    const layer = document.createElement('canvas')
    layer.width = Math.max(1, Math.round(width * dpr))
    layer.height = Math.max(1, Math.round(height * dpr))
    const c = layer.getContext('2d')!
    c.setTransform(k, 0, 0, k, f.x * dpr, f.y * dpr)
    const bleed = Math.max(width, height) / f.scale
    paintLane(c, bleed)
    paintMat(c, bleed)
    paintTray(c, TRAY.x, TRAY.y)
    for (const what of ODD_KINDS) {
      const at = oddPlace(what)
      c.save()
      c.shadowColor = INK.shadow
      c.shadowBlur = 6 * k
      c.shadowOffsetX = 2 * k
      c.shadowOffsetY = 4 * k
      c.translate(at.x, at.y)
      c.rotate(-1.1)
      paintOdd(c, 62, what, what === 'foil' ? 54 : what === 'rubber' ? 54 : 84)
      c.restore()
    }
    paintMug(c, MUG.x, MUG.y)
    this.still = layer
    this.glow = makeGlow(Math.round(160 * Math.max(1, k)))
    this.raccoon = sprite({ x: OLD_HAND.x - 160, y: OLD_HAND.y - 125, w: 390, h: 270 }, k, '', (s) => paintRaccoon(s, OLD_HAND.x, OLD_HAND.y, false))
    this.board = this.hung = null
    this.k = k
  }

  /** The board on the mat: its case and lid when it is a gadget, its copper, cracks and pads. Repainted when the gadget or its cracks change. */
  private boardSprite(circuit: Circuit): Sprite {
    const key = `${circuit.gadget}:${circuit.cracks.join(',')}`
    if (this.board?.key !== key) {
      const box = boardBox(circuit), lay = layOf(circuit) as Lay
      const whole = circuit.gadget === 'sign' ? grow(box, 30) : grow({ x: lidBox(circuit).x, y: box.y, w: box.x + box.w - lidBox(circuit).x, h: box.h }, 34)
      this.board = sprite(whole, this.k, key, (c) => {
        if (circuit.gadget !== 'sign') paintCase(c, box.x, box.y, box.w, box.h, CASE[circuit.gadget].body, CASE[circuit.gadget].dark)
        paintBoard(c, lay, circuit)
      })
    }
    return this.board
  }

  /** The board that is not on the mat, hanging small at the top left: parts, leads and all, as it was left. */
  private hungSprite(circuit: Circuit): Sprite {
    const key = JSON.stringify(circuit)
    if (this.hung?.key !== key) {
      const board = boardFor(circuit)
      const u = Math.min((HUNG.w - 30) / (board.cols - 1 + 1.3), (HUNG.h - 24) / (board.rows - 1 + 1.3))
      const lay = { x: HUNG.x + (HUNG.w - (board.cols - 1) * u) / 2, y: HUNG.y + 8 + (HUNG.h - 8 - (board.rows - 1) * u) / 2, u }
      this.hung = sprite(grow(HUNG, 16), this.k, key, (c) => {
        // Two cords up to the hook rail.
        c.strokeStyle = INK.steelDark
        c.lineWidth = 2
        for (const hx of [lay.x + u, lay.x + (board.cols - 2) * u]) { c.beginPath(); c.moveTo(hx, HUNG.y - 16); c.lineTo(hx, lay.y - u * 0.5); c.stroke() }
        paintBoard(c, lay, circuit)
        paintParts(c, lay, circuit)
        paintLeads(c, lay, circuit)
      })
    }
    return this.hung
  }

  /** One frame. Returns how many sprites and figures it drew. */
  draw(c: Ctx, width: number, height: number, dpr: number, bench: Bench, cast: Cast, guidance: Guidance | null, hint: Hint | null, seconds: number): number {
    if (width <= 0 || height <= 0) return 0
    const key = `${width}x${height}@${dpr}`
    if (key !== this.key || !this.still) {
      this.build(width, height, dpr)
      this.key = key
    }
    const f = fit(width, height), k = this.k, still = this.still!
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.drawImage(still, 0, 0)
    c.setTransform(k, 0, 0, k, f.x * dpr, f.y * dpr)
    let drawn = 1
    const stall = bench.stall, show = bench.show
    const places = cast.places(show.walk)

    // The customers stand beyond the counter. They are drawn, and then the counter and the strip of mat below it are
    // stamped back over them: a thin band, not the whole surface.
    for (const who of [places.leaving, places.waiting, places.owner]) {
      if (!who) continue
      paintCustomerBehind(c, who.customer.who, who.at.x, who.at.y, who.size, who.customer.pose, who.customer.breath)
      drawn++
    }
    const top = Math.floor((f.y + (STAGE.counterTop - 2) * f.scale) * dpr), tall = Math.ceil(76 * f.scale * dpr)
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.drawImage(still, 0, top, still.width, tall, 0, top, still.width, tall)
    c.setTransform(k, 0, 0, k, f.x * dpr, f.y * dpr)
    drawn++

    // The old hand, her practice board, and whichever board hangs.
    drawn += this.paintOldHand(c, cast, stall.board, show.neat, seconds)
    const onMat = bench.live, opened = stall.job.open && !stall.finished
    const other = stall.onMat === 'sign' ? (opened ? stall.job.circuit : null) : stall.sign
    if (other) { stamp(c, this.hungSprite(other)); drawn++ }

    // The board on the mat, while it lies there: not while its owner has it.
    const lying = bench.open && show.take < 0.02 && !(bench.hand?.holds === 'gadget')
    if (lying) drawn += this.paintBoardOnMat(c, bench, onMat, seconds)
    if (lying && stall.onMat === 'job' && stall.job.ticket) {
      const box = boardBox(onMat)
      paintTicket(c, stall.job.ticket, { x: box.x + box.w - 96, y: box.y - 34, w: 104, h: 46 })
      drawn++
    }

    // The test lamp always lies on the mat: at its own place, each lead out to its clip, wherever that clip is.
    const lyingOpen = lying
    const clips = lyingOpen ? [bench.probeAt(0), bench.probeAt(1)] : PROBE_HOME
    for (const end of [0, 1] as const) paintLead(c, clips[end], TEST_LAMP, PROBE_BEND[end], INK.black, LEAD_U * 0.86)
    const lamp = TEST_LAMP.y - bench.kickOf('test-lamp') * 3
    disc(c, TEST_LAMP.x + 3, TEST_LAMP.y + 5, 22, 'rgba(16, 28, 22, 0.25)')
    disc(c, TEST_LAMP.x, lamp, 22, INK.steelDark)
    disc(c, TEST_LAMP.x, lamp, 19, INK.steel)
    disc(c, TEST_LAMP.x, lamp, 14, lyingOpen && level(bench.reading.probe) > 0 ? '#fff3c4' : INK.glass)
    drawn += 3

    // What rests on the counter: wing tips and feet, and the gadget each customer holds.
    drawn += this.paintHeld(c, bench, places, seconds)

    drawn += this.paintEffects(c)
    if (guidance && hint) {
      drawn += paintRings(c, hint.glow, guidance.glow, seconds)
      drawn += paintGhostHand(c, guidance, hint.from, hint.to, hint.drag)
    }
    return drawn
  }

  private paintOldHand(c: Ctx, cast: Cast, idea: string | null, neat: number, seconds: number): number {
    const raccoon = cast.raccoon
    paintPractice(c, neat >= 0 || idea ? idea ?? null : null, neat >= 0 ? neat : idea ? 1 : -1, seconds)
    c.save()
    c.translate(OLD_HAND.x - 6, OLD_HAND.y + 34)
    c.scale(1 + raccoon.breath * 0.006, 1 + raccoon.breath * 0.014)
    c.translate(-(OLD_HAND.x - 6), -(OLD_HAND.y + 34))
    stamp(c, this.raccoon!)
    paintRaccoonLive(c, OLD_HAND.x, OLD_HAND.y, { whiskers: raccoon.whiskers.x, eye: raccoon.eye, doing: raccoon.doing, progress: raccoon.progress })
    c.restore()
    if (Math.abs(raccoon.slosh.x) > 0.01) {
      c.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.6, Math.abs(raccoon.slosh.x))})`
      c.lineWidth = 2.5
      c.beginPath()
      c.ellipse(MUG.x + raccoon.slosh.x * 6, MUG.y, 14, 9 + Math.abs(raccoon.slosh.x) * 5, 0, 0, Math.PI * 2)
      c.stroke()
    }
    return 3
  }

  /** A part in its own frame at a place on the stage: its flat shadow, then itself. `lift` raises it off the mat. */
  private paintPartAt(c: Ctx, part: Part, mid: P, angle: number, u: number, lift: number): void {
    c.save()
    c.translate(mid.x, mid.y)
    c.fillStyle = 'rgba(16, 28, 22, 0.3)'
    c.save()
    c.translate((5 + lift * 5) * 0.5, 5 + lift * 5)
    c.rotate(angle)
    // The same room the model keeps clear for it.
    const foot = FOOT[part.kind]
    if (part.kind === 'lamp' || part.kind === 'motor' || part.kind === 'buzzer') { c.beginPath(); c.arc(0, 0, (u * foot.along) / 2, 0, Math.PI * 2) }
    else roundRect(c, (-u * foot.along) / 2, (-u * foot.across) / 2, u * foot.along, u * foot.across, u * 0.07)
    c.fill()
    c.restore()
    c.rotate(angle + (part.kind === 'lamp' ? lift * 0.05 : 0))
    if (lift > 0) c.scale(1 + lift * 0.045, 1 + lift * 0.045)
    // A popped flag is drawn later, over the leads.
    paintPart(c, u, part.kind === 'cell' && part.popped ? { ...part, popped: false } : part)
    c.restore()
  }

  private paintBoardOnMat(c: Ctx, bench: Bench, circuit: Circuit, seconds: number): number {
    let drawn = 1
    stamp(c, this.boardSprite(circuit))
    const lay = layOf(circuit), u = lay.u, reading = bench.reading

    const tested = level(reading.probe)
    // The parts, each as itself. A flicked part hops.
    circuit.parts.forEach((part) => {
      const p = padAt(circuit, part.a), q = padAt(circuit, part.b)
      this.paintPartAt(c, part, { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, Math.atan2(q.y - p.y, q.x - p.x), u, Math.max(0, bench.kickOf(bench.keyOf(part))))
      drawn++
    })
    // Parts that lie loose on the mat, each with a lug at either end to clip to.
    circuit.loose.forEach((body) => {
      const at = matAt(body.at)
      for (const side of [-1, 1]) disc(c, at.x + side * LOOSE.w * 0.5, at.y, 7, INK.solder)
      this.paintPartAt(c, { ...body, a: 0, b: 1 } as Part, at, 0, LOOSE.w, Math.max(0, bench.kickOf(`loose-${body.at}`)))
      drawn++
    })

    // The leads, newest on top, each with its own colour, swinging on its spring.
    const bends = bench.bends()
    const curves: [P, P, P, P][] = []
    circuit.leads.forEach((_, i) => {
      const p = leadEnds(circuit, i)[0], q = bench.endOf(i)
      const wait = bench.armed === i ? Math.sin(seconds * 7) * 5 : 0
      const end = { x: q.x, y: q.y + wait }
      curves.push(leadCurve(p, end, bends[i]))
      paintLead(c, p, end, bends[i], LEAD_COLOURS[i % LEAD_COLOURS.length], LEAD_U, (bench.hot.get(i) ?? 0) / 1.4)
      drawn++
    })
    if (bench.hand?.holds === 'coil') {
      const from = { x: TRAY.x + TRAY.w * 0.72, y: TRAY.y + TRAY.h * 0.84 }
      paintLead(c, from, bench.hand.at, 30, LEAD_COLOURS[circuit.leads.length % LEAD_COLOURS.length], LEAD_U)
      drawn++
    }

    // A popped flag stands over the leads, waving a little, so a lead across the cell never hides it.
    circuit.parts.forEach((part) => {
      if (part.kind !== 'cell' || !part.popped) return
      const p = padAt(circuit, part.a), q = padAt(circuit, part.b)
      c.save()
      c.translate((p.x + q.x) / 2, (p.y + q.y) / 2)
      c.rotate(Math.atan2(q.y - p.y, q.x - p.x))
      c.scale(1.5, -1.5)
      paintFlag(c, u, Math.sin(seconds * 6))
      c.restore()
      drawn++
    })

    // The beads: only where the solved current runs, at its speed, toward where it runs. One path, two draws.
    c.beginPath()
    let beads = 0
    const along = (current: number, length: number, from: number, to: number, where: (t: number) => P) => {
      if (Math.abs(current) < RUNS_FROM) return
      const gap = 26, shift = (((seconds * current * 120) % gap) + gap) % gap
      for (let d = shift + length * from; d < length * to; d += gap) {
        const at = where(d / length)
        c.moveTo(at.x + 4.4, at.y)
        c.arc(at.x, at.y, 4.4, 0, Math.PI * 2)
        beads++
      }
    }
    const cracked = new Set(circuit.cracks)
    boardFor(circuit).traces.forEach((trace, i) => {
      if (cracked.has(i)) return
      const p = padAt(circuit, trace.a), q = padAt(circuit, trace.b)
      along(reading.traces[i], Math.hypot(q.x - p.x, q.y - p.y), 0.08, 0.92, (t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }))
    })
    circuit.leads.forEach((lead, i) => {
      if (lead.b === null) return
      const curve = curves[i]
      along(reading.leads[i] ?? 0, Math.hypot(curve[3].x - curve[0].x, curve[3].y - curve[0].y) * 1.1, 0.16, 0.84, (t) => onCurve(curve, t))
    })
    if (beads > 0) {
      c.fillStyle = INK.bead
      c.fill()
      c.lineWidth = 1.3
      c.strokeStyle = INK.beadEdge
      c.stroke()
      drawn += 2
    }

    // What each part does with the current: a glow, a blade, the rings of a rasp.
    const doing = (part: Body, current: number, at: P, size: number) => {
      const much = level(current)
      if (much === 0) return
      if (part.kind === 'lamp') {
        const wide = size * (1.5 + much * 0.9) * (1 + 0.02 * Math.sin(seconds * 5))
        c.save()
        c.globalCompositeOperation = 'lighter'
        c.globalAlpha = 0.32 + much * 0.16
        c.drawImage(this.glow!, at.x - wide / 2, at.y - wide / 2, wide, wide)
        c.restore()
      } else if (part.kind === 'motor') {
        c.save()
        c.translate(at.x, at.y)
        c.rotate(seconds * current * 9)
        c.fillStyle = INK.blade
        for (let b = 0; b < 3; b++) {
          c.rotate((Math.PI * 2) / 3)
          c.beginPath()
          c.ellipse(size * 0.24, 0, size * 0.22, size * 0.1, 0.35, 0, Math.PI * 2)
          c.fill()
        }
        disc(c, 0, 0, size * 0.07, INK.steel)
        c.restore()
      } else if (part.kind === 'buzzer') {
        c.strokeStyle = 'rgba(40, 46, 54, 0.55)'
        c.lineWidth = 2.4
        for (let i = 0; i < much; i++) {
          const t = (seconds * 3 + i / much) % 1
          c.globalAlpha = 1 - t
          c.beginPath()
          c.arc(at.x, at.y, size * (0.34 + t * 0.4), 0, Math.PI * 2)
          c.stroke()
        }
        c.globalAlpha = 1
      } else return
      drawn++
    }
    circuit.parts.forEach((part, i) => {
      // A blade freewheeling from a flick is drawn below, where it turns by how far the hand set it going.
      if (part.kind === 'motor' && bench.turnedOf(part) !== 0) return
      doing(part, reading.parts[i], bench.midOf(i), u)
    })
    circuit.loose.forEach((body, i) => doing(body, reading.loose[i], matAt(body.at), LOOSE.w))
    // A motor that carries nothing still shows its blade, at rest.
    circuit.parts.forEach((part, i) => {
      const turned = part.kind === 'motor' ? bench.turnedOf(part) : 0
      if (part.kind !== 'motor' || (level(reading.parts[i]) > 0 && turned === 0)) return
      const at = bench.midOf(i)
      c.save()
      c.translate(at.x, at.y)
      c.rotate(i + turned)
      c.fillStyle = INK.blade
      for (let b = 0; b < 3; b++) { c.rotate((Math.PI * 2) / 3); c.beginPath(); c.ellipse(u * 0.24, 0, u * 0.22, u * 0.1, 0.35, 0, Math.PI * 2); c.fill() }
      disc(c, 0, 0, u * 0.07, INK.steel)
      c.restore()
    })
    if (tested > 0) {
      const wide = 60 + tested * 30
      c.save()
      c.globalCompositeOperation = 'lighter'
      c.globalAlpha = 0.3 + tested * 0.15
      c.drawImage(this.glow!, TEST_LAMP.x - wide / 2, TEST_LAMP.y - wide / 2, wide, wide)
      c.restore()
      drawn++
    }

    // A part in the hand, lifted off the mat.
    if (bench.hand?.holds === 'part') {
      const hand = bench.hand
      this.paintPartAt(c, { ...hand.body, a: 0, b: 1 } as Part, hand.at, hand.angle, u, 2.2)
      drawn++
    }
    return drawn
  }

  /** Whatever rests on the counter, and every gadget that is in someone's hands. */
  private paintHeld(c: Ctx, bench: Bench, places: { owner: Standing; waiting: Standing; leaving: Standing | null }, seconds: number): number {
    const stall = bench.stall, show = bench.show
    let drawn = 0
    const edge = (who: Standing) => (STAGE.counterTop - who.at.y)
    for (const who of [places.leaving, places.waiting, places.owner]) {
      if (!who) continue
      paintCustomerFront(c, who.customer.who, who.at.x, who.at.y, who.size, who.customer.pose, edge(who))
      drawn++
    }
    const follow = (box: Box, who: Standing, home: P): Box => ({ x: who.at.x + (box.x - home.x) * who.size, y: box.y, w: box.w * who.size, h: box.h * who.size })
    // The one who waits holds its own gadget out, shut and silent.
    paintGadget(c, stall.next.circuit.gadget, follow({ ...HELD, y: HELD_AT_WINDOW.y - 4 }, places.waiting, AT_BENCH), QUIET, seconds)
    drawn++
    // One who is walking off carries theirs as it was handed back.
    if (places.leaving && bench.leaving) {
      const doing = this.doingOf(bench.leaving.circuit)
      paintGadget(c, bench.leaving.circuit.gadget, follow(HELD, places.leaving, AT_BENCH), { ...doing, on: this.ran.get(bench.leaving.circuit) ? 1 : 0 }, seconds)
      drawn++
    }
    // The owner's gadget: held out shut before it is opened; travelling to them in the hand-back; in their hands, running, after.
    const mat = boardBox(stall.job.circuit), home = follow(HELD, places.owner, AT_BENCH)
    if (bench.hand?.holds === 'gadget') {
      const at = bench.hand.at
      paintGadget(c, stall.job.circuit.gadget, { x: at.x - 110, y: at.y - 60, w: 220, h: 120 }, { ...QUIET, shut: 1, lid: this.doingOf(stall.job.circuit).lid }, seconds)
      drawn++
    } else if (stall.finished || show.take >= 0.02) {
      const doing = this.doingOf(stall.job.circuit)
      paintGadget(c, stall.job.circuit.gadget, between({ x: mat.x + mat.w * 0.2, y: mat.y + mat.h * 0.2, w: mat.w * 0.6, h: mat.h * 0.6 }, home, stall.finished && show.take >= 1 ? 1 : show.take), { ...doing, on: show.on, shut: show.lid }, seconds)
      drawn++
    } else if (!stall.job.open) {
      paintGadget(c, stall.job.circuit.gadget, home, QUIET, seconds)
      drawn++
    }
    return drawn
  }

  private paintEffects(c: Ctx): number {
    for (const effect of this.effects) {
      const t = effect.age / LASTS[effect.type]
      if (effect.type === 'pop') {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.4
          disc(c, effect.at.x + Math.cos(a) * (20 + t * 70), effect.at.y + Math.sin(a) * (14 + t * 52), 12 * (1 - t) + 4, `rgba(244, 246, 248, ${0.8 * (1 - t)})`)
        }
        continue
      }
      if (effect.type === 'blow') {
        disc(c, effect.at.x, effect.at.y, 24 + t * 60, `rgba(255, 250, 230, ${0.9 * (1 - t)})`)
        continue
      }
      c.strokeStyle = effect.type === 'bite' ? `rgba(255, 255, 255, ${0.9 * (1 - t)})` : `rgba(120, 130, 140, ${0.55 * (1 - t)})`
      c.lineWidth = effect.type === 'bite' ? 5 * (1 - t) + 1 : 3
      c.beginPath()
      c.arc(effect.at.x, effect.at.y, (effect.type === 'bite' ? 16 : 10) + t * 30, 0, Math.PI * 2)
      c.stroke()
    }
    return this.effects.length
  }
}
