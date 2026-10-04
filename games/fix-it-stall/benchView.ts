import { type Bench, type Mark } from './bench'
import { boardFor, FOOT, ODD_KINDS, type Body, type Circuit, type Part } from './circuit'
import { type Cast, type Standing } from './cast'
import { type Guidance } from './guidance'
import { meetsTicket, type Ticket } from './jobs'
import { handBack } from './handback'
import { type Hint } from './ladder'
import { disc, INK, LEAD_COLOURS, roundRect, type Ctx } from './paint'
import { paintCase, paintTray, paintTrayPlace } from './paintBench'
import { paintBoard, paintFlag, paintOdd, paintPart, paintParts } from './paintBoard'
import { paintCustomerBehind, paintCustomerFront } from './paintCustomers'
import { paintOldHandBehind, paintOldHandFront } from './paintOldHand'
import { LASTS, paintEffects, SETS_OFF, type Effect } from './paintEffects'
import { CASE, paintGadget, QUIET, type Doing } from './paintGadget'
import { makeGlow, paintLead, paintLeads } from './paintLive'
import { paintGhostHand, paintPractice, paintRings, paintTicket } from './paintScene'
import { paintMouse, paintPasser, paintPigeon, paintSmoke, paintWashing } from './paintLife'
import { AWNING_BOTTOM, paintAwning, paintBenchTop, paintClutter, paintCounter, paintGarage, paintLaneFar, paintPlate, paintWall, PLATE } from './paintStall'
import { level, read, RUNS_FROM } from './solve'
import { AT_BENCH, boardBox, CARD, fit, FLAG, HELD, HELD_AT_WINDOW, HUNG, layOf, LEAD_U, leadCurve, leadEnds, lidBox, LOOSE, matAt, MUG, oddPlace, OLD_HAND, onCurve, padAt, PILLAR_LEFT, PROBE_BEND, PROBE_HOME, RADIO, STAGE, TEST_LAMP, TOASTER, TRAY, trayPlace, TRAY_KINDS, WINDOW_LEFT, type Box, type Fit, type Lay, type P } from './stage'

// The stall, drawn. What stands still is painted once for a size and stamped
// once a frame: the lane and the house across it, the back wall, the awning,
// the counter, the bench and its mat, the tray, the bench odds, the old hand's
// clutter. The board on the mat and the board that hangs are sprites,
// repainted only when they change. A frame then draws the customers and the
// old hand from their rigs, the parts, the leads, the beads where the solved
// current runs, the glows, and whatever a touch just set off.

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
/** What sits on a motor's shaft in this gadget: a car's motor turns a wheel, a robot's an arm, and every other a fan's blade. Only a blade moves the air. */
const onShaft = (circuit: Circuit): 'wheel' | 'arm' | 'blade' => (circuit.gadget === 'car' ? 'wheel' : circuit.gadget === 'robot' ? 'arm' : 'blade')

/** That thing, about the middle of its motor, turned by `turn` radians. */
function paintShaft(c: Ctx, what: 'wheel' | 'arm' | 'blade', size: number, turn: number): void {
  c.save()
  c.rotate(turn)
  if (what === 'blade') {
    c.fillStyle = INK.blade
    for (let b = 0; b < 3; b++) {
      c.rotate((Math.PI * 2) / 3)
      c.beginPath()
      c.ellipse(size * 0.24, 0, size * 0.22, size * 0.1, 0.35, 0, Math.PI * 2)
      c.fill()
    }
    disc(c, 0, 0, size * 0.07, INK.steel)
  } else if (what === 'wheel') {
    // A tyre and a hub with five holes round it, as on the car's side.
    disc(c, 0, 0, size * 0.3, '#2a2f36')
    disc(c, 0, 0, size * 0.19, '#e9eff2')
    for (let hole = 0; hole < 5; hole++) disc(c, Math.cos((hole * Math.PI * 2) / 5) * size * 0.12, Math.sin((hole * Math.PI * 2) / 5) * size * 0.12, size * 0.034, '#2a2f36')
    disc(c, 0, 0, size * 0.045, INK.steel)
  } else {
    // The robot's arm on its crank: a steel rod with a red knob, going round.
    c.strokeStyle = INK.steel
    c.lineWidth = size * 0.09
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(0, 0)
    c.lineTo(size * 0.36, 0)
    c.stroke()
    disc(c, size * 0.36, 0, size * 0.085, INK.red)
    disc(c, 0, 0, size * 0.07, INK.steelDark)
  }
  c.restore()
}

/** Whether a gadget has a switch in it, on its board or hanging by its leads: its case then has one to throw. */
const hasSwitchIn = (circuit: Circuit) => circuit.parts.some((part) => part.kind === 'switch') || circuit.loose.some((part) => part.kind === 'switch')
/** One face, filled in for each customer in turn: nothing is allocated in a frame. */
const FACE = { gx: 0, gy: 0, fright: 0 }
const stamp = (c: Ctx, s: Sprite) => c.drawImage(s.image, s.x, s.y, s.w, s.h)
const grow = (box: Box, by: number): Box => ({ x: box.x - by, y: box.y - by, w: box.w + 2 * by, h: box.h + 2 * by })
const between = (a: Box, b: Box, t: number): Box => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t })

/** Where the toaster keeps its slice, a little below its slot, and the middle of the radio's speaker: what each does when it is touched happens there. */
const TOAST: P = { x: TOASTER.x + 21, y: TOASTER.y + 16 }, SPEAKER: P = { x: RADIO.x + 22, y: RADIO.y + 47 }

export class BenchView {
  private still: HTMLCanvasElement | null = null
  private glow: HTMLCanvasElement | null = null
  private board: Sprite | null = null
  private hung: Sprite | null = null
  /** Where the board that hangs is drawn, and what runs on it: worked out once for a circuit, with its sprite. */
  private hungLay: Lay = { x: 0, y: 0, u: 1 }
  private hungRuns: { at: P; kind: 'lamp' | 'motor'; much: number; current: number }[] = []
  private key = ''
  private k = 1
  private effects: Effect[] = []
  /** Seconds since a board came down onto the mat: it lands with a little weight. */
  private sinceLanded = 60
  private readonly doing = new WeakMap<Circuit, Doing>()
  private readonly ran = new WeakMap<Circuit, boolean>()
  private readonly met = new WeakMap<Circuit, boolean>()

  /** What a touch just set off: a ring where a clip bit, a pat on the mat, a puff at a pop, a flash where a lamp blew. */
  show(marks: readonly Mark[]): void {
    for (const mark of marks) {
      // Each thing that happens sets off its few effects where it happened.
      const what = mark.type === 'hers' || mark.type === 'shelf' ? mark.what : mark.type === 'knock' ? mark.on : mark.type === 'poke' && mark.who === 'mug' ? 'mug' : mark.type
      const at = 'at' in mark ? mark.at : what === 'mug' ? MUG : what === 'toaster' ? TOAST : what === 'radio' ? SPEAKER : null
      if (at && what in SETS_OFF) for (const type of SETS_OFF[what as keyof typeof SETS_OFF]) this.effects.push({ type, at: what === 'plate' ? PLATE : at, age: 0 })
      // A pop makes the old hand spill a little.
      if (mark.type === 'pop') this.effects.push({ type: 'drops', at: MUG, age: 0 })
      if (mark.type === 'land') this.sinceLanded = 0
    }
    // Never more than a screenful: the oldest go first.
    if (this.effects.length > 40) this.effects.splice(0, this.effects.length - 40)
  }

  step(dt: number): void {
    this.sinceLanded += dt
    for (const effect of this.effects) effect.age += dt
    this.effects = this.effects.filter((e) => e.age < LASTS[e.type])
  }

  /** Whether the gadget holds what its order ticket asks for, worked out once for a circuit. */
  private orderMet(circuit: Circuit, ticket: Ticket): boolean {
    let met = this.met.get(circuit)
    if (met === undefined) {
      met = meetsTicket(circuit, ticket)
      this.met.set(circuit, met)
    }
    return met
  }

  /** What a gadget does in its owner's hands, worked out once for a circuit. */
  private doingOf(circuit: Circuit): Doing {
    let doing = this.doing.get(circuit)
    if (!doing) {
      const handed = handBack(circuit)
      doing = { light: handed.light, wind: handed.wind, sound: handed.sound, popped: handed.popped, lid: handed.lid, on: 1, shut: 1, lit: handed.lit, buzzing: handed.buzzing, switched: hasSwitchIn(circuit), shiny: handed.shiny }
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
    paintLaneFar(c, bleed)
    paintWall(c, bleed)
    paintAwning(c, bleed)
    paintBenchTop(c, bleed)
    paintCounter(c, bleed)
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
    paintClutter(c)
    paintGarage(c)
    paintPlate(c)
    this.still = layer
    this.glow = makeGlow(Math.round(160 * Math.max(1, k)))
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
      // What runs on it as it hangs: read once, when its sprite is made, and not again until the board changes.
      const reading = read(circuit)
      this.hungLay = lay
      this.hungRuns = circuit.parts.flatMap((part, i) => {
        const much = level(reading.parts[i])
        if (much === 0 || (part.kind !== 'lamp' && part.kind !== 'motor')) return []
        const p = board.pads[part.a], q = board.pads[part.b]
        return [{ at: { x: lay.x + ((p.x + q.x) / 2) * u, y: lay.y + ((p.y + q.y) / 2) * u }, kind: part.kind, much, current: reading.parts[i] }]
      })
      this.hung = sprite(grow(HUNG, 16), this.k, key, (c) => {
        // Two cords up to the hook rail.
        c.strokeStyle = INK.steelDark
        c.lineWidth = 2
        for (const hx of [lay.x + u, lay.x + (board.cols - 2) * u]) { c.beginPath(); c.moveTo(hx, HUNG.y - 16); c.lineTo(hx, lay.y - u * 0.5); c.stroke() }
        paintBoard(c, lay, circuit)
        paintParts(c, lay, circuit)
        paintLeads(c, lay, circuit)
        // What lay loose beside it went up with it: its loose parts hang in a column at its side, each as itself, and
        // every lead that is not from pad to pad is drawn to where its clips now are.
        const side = (i: number): P => ({ x: lay.x + (board.cols - 1) * u + u * 1.7 + Math.floor(i / 4) * u * 1.7, y: lay.y + (i % 4) * u * 1.1 })
        circuit.loose.forEach((body, i) => {
          const at = side(i)
          c.save()
          c.translate(at.x, at.y)
          paintPart(c, u * 1.1, { ...body, a: 0, b: 1 } as Part)
          c.restore()
        })
        const where = (bite: Circuit['leads'][number]['a'], lead: number, end: 0 | 1): P => {
          if (typeof bite === 'number') return { x: lay.x + board.pads[bite].x * u, y: lay.y + board.pads[bite].y * u }
          if (bite !== null && 'loose' in bite) { const at = side(bite.loose); return { x: at.x + (bite.end === 0 ? -0.5 : 0.5) * u, y: at.y } }
          // A clip that bites another lead's clip, or nothing: it hangs below the board, each a little along from the last.
          return { x: lay.x + (lead * 1.3 + end * 0.7) * u, y: lay.y + (board.rows - 1) * u + u * 0.9 }
        }
        circuit.leads.forEach((lead, i) => {
          if (typeof lead.a === 'number' && (lead.b === null || typeof lead.b === 'number')) return
          paintLead(c, where(lead.a, i, 0), where(lead.b, i, 1), u * 0.4, LEAD_COLOURS[i % LEAD_COLOURS.length], u)
        })
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

    // On the back wall: her practice board on its shelf, and whichever board hangs.
    paintPractice(c, show.neat >= 0 || stall.board ? stall.board ?? null : null, show.neat >= 0 ? show.neat : stall.board ? 1 : -1, seconds, bench.kickOf('practice'))
    drawn++
    const onMat = bench.live, opened = stall.job.open && !stall.finished
    const other = stall.onMat === 'sign' ? (opened ? stall.job.circuit : null) : stall.sign
    if (other) {
      stamp(c, this.hungSprite(other))
      drawn++
      // Whatever was left running on it keeps running where it hangs: its lamps glow and its blades turn.
      const u = this.hungLay.u
      for (const run of this.hungRuns) {
        if (run.kind === 'lamp') {
          const wide = u * (2.2 + run.much * 0.9) * (1 + 0.03 * Math.sin(seconds * 5 + run.at.x))
          disc(c, run.at.x, run.at.y, u * 0.22, run.much >= 3 ? '#ffffff' : run.much >= 2 ? '#ffe9a8' : '#d9744a')
          c.save()
          c.globalCompositeOperation = 'lighter'
          c.globalAlpha = 0.5
          c.drawImage(this.glow!, run.at.x - wide / 2, run.at.y - wide / 2, wide, wide)
          c.restore()
        } else {
          c.save()
          c.translate(run.at.x, run.at.y)
          paintShaft(c, onShaft(other), u * 1.1, seconds * run.current * 9)
          c.restore()
        }
        drawn++
      }
    }

    // The lane goes about its day behind them: whoever is passing, and the pigeon on the doorstep.
    drawn += paintPasser(c, bench.lane) > 0 ? 1 : 0
    drawn += paintPigeon(c, bench.lane) > 0 ? 1 : 0
    // The customers stand beyond the counter, under the awning, and the old hand sits behind the counter's far end.
    // They are drawn, and then the awning's valance and the counter with the strip of bench below it are stamped
    // back over them: two bands, not the whole surface.
    for (const who of [places.leaving, places.waiting, places.owner]) {
      if (!who) continue
      FACE.gx = who.customer.gaze.x; FACE.gy = who.customer.gaze.y; FACE.fright = who.customer.fright
      // The one who walks off goes down the lane, behind the corner post: never across the wall inside the stall.
      // The one who waits stands at the far end of the open front, half behind its pillar, and steps up from behind it.
      if (who !== places.owner || bench.show.walk < 1) this.inTheLane(c, () => paintCustomerBehind(c, who.customer.who, who.at.x, who.at.y, who.size, who.customer.pose, who.customer.breath, FACE))
      else paintCustomerBehind(c, who.customer.who, who.at.x, who.at.y, who.size, who.customer.pose, who.customer.breath, FACE)
      drawn++
    }
    paintOldHandBehind(c, OLD_HAND.x, OLD_HAND.y, cast.raccoon)
    this.restamp(c, f, dpr, WINDOW_LEFT - 24, 0, STAGE.w, AWNING_BOTTOM + 14, true)
    this.restamp(c, f, dpr, 0, STAGE.counterTop - 2, STAGE.w, STAGE.counterBottom - STAGE.counterTop + 78, false)
    drawn += 3
    // The washing hangs from its line just under the awning, clear of where anybody stands, and swings when it is touched.
    paintWashing(c, bench.lane)
    drawn++
    // With no board open, what is flicked in the tray or among the odds swells where it lies and settles.
    for (let i = 0; i < TRAY_KINDS.length; i++) {
      const jolt = bench.kickOf(`tray-${i}`)
      if (jolt === 0) continue
      paintTrayPlace(c, i, trayPlace(i).x, trayPlace(i).y, jolt)
      drawn++
    }
    for (const what of ODD_KINDS) {
      const jolt = bench.kickOf(`odd-${what}`)
      if (jolt === 0) continue
      const at = oddPlace(what), swell = 1 + Math.abs(jolt) * 0.3
      c.save()
      c.translate(at.x, at.y)
      c.rotate(-1.1)
      c.scale(swell, swell)
      paintOdd(c, 62, what, what === 'foil' ? 54 : what === 'rubber' ? 54 : 84)
      c.restore()
      drawn++
    }

    // The board on the mat, while it lies there: not while its owner has it. The clockwork mouse is under everything
    // but the mat, except in the moment it shoots out from under a board that has just come down.
    const lying = bench.lying
    drawn += paintSmoke(c, seconds, 0) > 0 ? 1 : 0
    if (bench.mouse.where !== 'dash') { paintMouse(c, bench.mouse); drawn++ }
    if (lying) {
      // A board that has just come down lands: it spreads a hair, settles, and the dust goes out from under it.
      const landing = this.sinceLanded < 0.3 ? (1 - this.sinceLanded / 0.3) ** 2 * Math.cos(this.sinceLanded * 30) : 0
      if (landing !== 0) {
        const box = boardBox(onMat), mx = box.x + box.w / 2, my = box.y + box.h / 2
        c.save()
        c.translate(mx, my)
        c.scale(1 + landing * 0.035, 1 - landing * 0.03)
        c.translate(-mx, -my)
      }
      drawn += this.paintBoardOnMat(c, bench, onMat, seconds, cast.inspecting)
      if (landing !== 0) c.restore()
      if (this.sinceLanded < 0.4) {
        const box = boardBox(onMat), t = this.sinceLanded / 0.4
        c.strokeStyle = `rgba(236, 240, 243, ${0.55 * (1 - t)})`
        c.lineWidth = 5 * (1 - t) + 1
        roundRect(c, box.x - 10 - t * 26, box.y - 10 - t * 18, box.w + 20 + t * 52, box.h + 20 + t * 36, 30)
        c.stroke()
        drawn++
      }
    }
    if (bench.mouse.where === 'dash') { paintMouse(c, bench.mouse); drawn++ }
    if (lying && stall.onMat === 'job' && stall.job.ticket) {
      const box = boardBox(onMat)
      paintTicket(c, stall.job.ticket, { x: box.x + 8, y: box.y - 34, w: 104, h: 46 })
      drawn++
    }

    // The test lamp always lies on the mat: at its own place, each lead out to its clip, wherever that clip is.
    const lyingOpen = lying
    const clips = lyingOpen ? [bench.probeAt(0), bench.probeAt(1)] : PROBE_HOME
    for (const end of [0, 1] as const) paintLead(c, clips[end], TEST_LAMP, PROBE_BEND[end], INK.black, LEAD_U * 0.86)
    // Beads run along the test lamp's own two leads whenever current runs through it, in at one clip and out at the other.
    if (lyingOpen && Math.abs(bench.reading.probe) >= RUNS_FROM) {
      const current = bench.reading.probe, gap = 26, shift = (((seconds * current * 120) % gap) + gap) % gap
      c.beginPath()
      for (const end of [0, 1] as const) {
        const curve = leadCurve(clips[end], TEST_LAMP, PROBE_BEND[end]), length = Math.hypot(curve[3].x - curve[0].x, curve[3].y - curve[0].y) * 1.1
        for (let d = shift + length * 0.16; d < length * 0.84; d += gap) {
          const at = onCurve(curve, end === 0 ? d / length : 1 - d / length)
          c.moveTo(at.x + 4.4, at.y)
          c.arc(at.x, at.y, 4.4, 0, Math.PI * 2)
        }
      }
      c.fillStyle = INK.bead
      c.fill()
      c.lineWidth = 1.3
      c.strokeStyle = INK.beadEdge
      c.stroke()
      drawn += 2
    }
    const lamp = TEST_LAMP.y - bench.kickOf('test-lamp') * 3
    disc(c, TEST_LAMP.x + 3, TEST_LAMP.y + 5, 22, 'rgba(16, 28, 22, 0.25)')
    disc(c, TEST_LAMP.x, lamp, 22, INK.steelDark)
    disc(c, TEST_LAMP.x, lamp, 19, INK.steel)
    // Its glass by how much runs through it, as any lamp's: dull red for a little, warm for what it was made for, white for much.
    const through = lyingOpen ? level(bench.reading.probe) : 0
    disc(c, TEST_LAMP.x, lamp, 14, through >= 3 ? '#ffffff' : through >= 2 ? '#ffe9a8' : through >= 1 ? '#d9744a' : INK.glass)
    drawn += 3

    // What rests on the counter: wing tips and feet, and the gadget each customer holds; and the old hand's paws.
    drawn += this.paintHeld(c, bench, places, seconds)
    drawn += this.paintOldHandFront(c, cast, onMat)

    drawn += paintEffects(c, this.effects)
    if (guidance && hint) {
      drawn += paintRings(c, hint.glow, guidance.glow, seconds)
      drawn += paintGhostHand(c, guidance, hint.from, hint.to, hint.drag)
    }
    return drawn
  }

  /**
   * A band of the still layer, stamped back over whatever was drawn across it. `x`, `y`, `w` and `h` are in stage
   * units; a band that runs to an edge of the stage runs on to the edge of the surface, `up` to its top as well.
   */
  private restamp(c: Ctx, f: Fit, dpr: number, x: number, y: number, w: number, h: number, up: boolean): void {
    const still = this.still!
    const left = x <= 0 ? 0 : Math.floor((f.x + x * f.scale) * dpr), right = x + w >= STAGE.w ? still.width : Math.ceil((f.x + (x + w) * f.scale) * dpr)
    const top = up ? 0 : Math.floor((f.y + y * f.scale) * dpr), bottom = Math.ceil((f.y + (y + h) * f.scale) * dpr)
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.drawImage(still, left, top, right - left, bottom - top, left, top, right - left, bottom - top)
    c.setTransform(this.k, 0, 0, this.k, f.x * dpr, f.y * dpr)
  }

  /** Draw something that is out in the lane: only where the front of the stall is open, between the corner post and the pillar. */
  private inTheLane(c: Ctx, paint: () => void): void {
    c.save()
    c.beginPath()
    c.rect(WINDOW_LEFT + 2, -STAGE.h, PILLAR_LEFT - 2 - (WINDOW_LEFT + 2), STAGE.h * 3)
    c.clip()
    paint()
    c.restore()
  }

  /** What of the old hand reaches over the counter: her forearms, her paws, her mug. */
  private paintOldHandFront(c: Ctx, cast: Cast, circuit: Circuit): number {
    const raccoon = cast.raccoon
    // A part of the child's that she has picked up to look at is drawn where her paw has it, a little turned. The
    // painter calls back inside its own frame, about the middle of her face.
    const body = cast.inspecting === null ? undefined : circuit.loose.find((part) => part.at === cast.inspecting)
    const carried = body ? (x: number, y: number) => this.paintPartAt(c, { ...body, a: 0, b: 1 } as Part, { x, y }, 0.3, LOOSE.w * 0.9, 1.4) : undefined
    paintOldHandFront(c, OLD_HAND.x, OLD_HAND.y, raccoon, { x: MUG.x - OLD_HAND.x, y: MUG.y - OLD_HAND.y }, STAGE.counterTop - OLD_HAND.y, carried)
    if (Math.abs(raccoon.slosh.x) > 0.01 && raccoon.mug < 0.5) {
      c.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.6, Math.abs(raccoon.slosh.x))})`
      c.lineWidth = 2.5
      c.beginPath()
      c.ellipse(MUG.x + raccoon.slosh.x * 6, MUG.y, 14, 9 + Math.abs(raccoon.slosh.x) * 5, 0, 0, Math.PI * 2)
      c.stroke()
    }
    return 2
  }

  /**
   * A part in its own frame at a place on the stage: its flat shadow, then itself. `hop` above 0 raises it off the mat;
   * below 0 it has come down again and is squashed against it for a moment.
   */
  private paintPartAt(c: Ctx, part: Part, mid: P, angle: number, u: number, hop: number, turn = 0): void {
    // Turned round, each goes about it in its own way: a cell tumbles end over end, a lamp is unscrewed and screwed
    // back, a buzzer hops round on its feet in three hops, and the rest spin where they sit.
    const swing = Math.sin(turn * Math.PI)
    let spin = 0, along = 1, up = 0
    if (turn > 0) {
      if (part.kind === 'cell') { along = Math.cos(turn * Math.PI); up = swing * 1.6 }
      else if (part.kind === 'lamp') { spin = Math.sin(turn * Math.PI * 3) * 0.6; up = swing * 1.2 }
      else if (part.kind === 'buzzer') { spin = (Math.ceil(turn * 3) / 3) * Math.PI; up = Math.abs(Math.sin(turn * Math.PI * 3)) * 1.1 }
      else { spin = turn * Math.PI; up = swing * 0.5 }
    }
    const lift = Math.max(0, hop) + up, squash = turn > 0 ? 0 : Math.min(1, Math.max(0, -hop)) * 0.5
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
    c.rotate(angle + spin + (part.kind === 'lamp' ? lift * 0.05 : 0))
    if (along !== 1) c.scale(Math.abs(along) < 0.08 ? 0.08 : along, 1)
    if (lift > 0) c.scale(1 + lift * 0.045, 1 + lift * 0.045)
    else if (squash > 0) c.scale(1 + squash, 1 - squash * 0.7)
    // A popped flag is drawn later, over the leads.
    paintPart(c, u, part.kind === 'cell' && part.popped ? { ...part, popped: false } : part)
    c.restore()
  }

  private paintBoardOnMat(c: Ctx, bench: Bench, circuit: Circuit, seconds: number, away: number | null): number {
    let drawn = 1
    stamp(c, this.boardSprite(circuit))
    const lay = layOf(circuit), u = lay.u, reading = bench.reading

    const tested = level(reading.probe), wind = bench.wind(), shaft = onShaft(circuit)
    // The parts, each as itself. A flicked part hops.
    const cells = bench.opposed ? circuit.parts.filter((part) => part.kind === 'cell' && !part.flat && !part.popped) : []
    circuit.parts.forEach((part, i) => {
      const p = padAt(circuit, part.a), q = padAt(circuit, part.b), key = bench.keyOf(part)
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
      let angle = Math.atan2(q.y - p.y, q.x - p.x)
      if (cells.length >= 2 && cells.includes(part)) {
        // Two cells nose to nose lean toward each other and tremble, like arm-wrestlers, for as long as neither gives.
        const other = cells.find((cell) => cell !== part)!, op = padAt(circuit, other.a), oq = padAt(circuit, other.b)
        const dx = (op.x + oq.x) / 2 - mid.x, dy = (op.y + oq.y) / 2 - mid.y, far = Math.hypot(dx, dy) || 1, strain = 4 + Math.sin(seconds * 23 + i) * 1.4
        mid.x += (dx / far) * strain
        mid.y += (dy / far) * strain
        angle += 0.07 * Math.sign(dx * Math.sin(angle) - dy * Math.cos(angle) || 1)
      } else if ((part.kind === 'motor' || part.kind === 'buzzer') && level(reading.parts[i]) === 3) {
        // With far too much through it a motor or a buzzer shakes where it sits.
        mid.x += Math.sin(seconds * 61 + i) * 2.4
        mid.y += Math.cos(seconds * 53 + i) * 1.8
      }
      this.paintPartAt(c, part, mid, angle, u, bench.kickOf(key), bench.turnOf(key))
      drawn++
    })
    // Parts that lie loose on the mat, each with a lug at either end to clip to.
    circuit.loose.forEach((body) => {
      // One the old hand has picked up to look at is in her paw, not here.
      if (body.at === away) return
      const at = matAt(body.at)
      for (const side of [-1, 1]) disc(c, at.x + side * LOOSE.w * 0.5, at.y, 7, INK.solder)
      // A blade that turns on the mat rocks whatever lies loose beside it.
      this.paintPartAt(c, { ...body, a: 0, b: 1 } as Part, at, wind === 0 ? 0 : Math.sin(seconds * 6 + body.at) * 0.05 * wind, LOOSE.w, bench.kickOf(`loose-${body.at}`))
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
      c.scale(FLAG.scale, -FLAG.scale)
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

    // The way a short took glows orange for a moment: its traces and whatever lay on it, as its leads do.
    if (bench.hotTraces.size > 0) {
      const traces = boardFor(circuit).traces
      c.lineCap = 'round'
      c.lineWidth = u * 0.2
      for (const [index, left] of bench.hotTraces) {
        if (!traces[index] || cracked.has(index)) continue
        const p = padAt(circuit, traces[index].a), q = padAt(circuit, traces[index].b)
        c.strokeStyle = `rgba(255, 138, 42, ${Math.min(0.85, left / 1.4)})`
        c.beginPath()
        c.moveTo(p.x, p.y)
        c.lineTo(q.x, q.y)
        c.stroke()
      }
      drawn++
    }
    for (const [key, left] of bench.hotParts) {
      const index = circuit.parts.findIndex((part) => bench.keyOf(part) === key)
      // A thing that lay loose on the way is ringed where it lies.
      const lying = index < 0 ? circuit.loose.find((body) => `loose-${body.at}` === key) : undefined
      if (lying) {
        const where = matAt(lying.at)
        c.strokeStyle = `rgba(255, 138, 42, ${Math.min(0.9, left / 1.4)})`
        c.lineWidth = 7
        c.beginPath()
        c.ellipse(where.x, where.y, LOOSE.w * 0.62, LOOSE.h * 0.7, 0, 0, Math.PI * 2)
        c.stroke()
        drawn++
      }
      if (index < 0) continue
      const at = bench.midOf(index)
      c.strokeStyle = `rgba(255, 138, 42, ${Math.min(0.9, left / 1.4)})`
      c.lineWidth = 7
      c.beginPath()
      c.ellipse(at.x, at.y, u * 0.46, u * 0.34, Math.atan2(padAt(circuit, circuit.parts[index].b).y - padAt(circuit, circuit.parts[index].a).y, padAt(circuit, circuit.parts[index].b).x - padAt(circuit, circuit.parts[index].a).x), 0, Math.PI * 2)
      c.stroke()
      drawn++
    }

    // What each part does with the current: a glow, a blade, the rings of a rasp.
    const doing = (part: Body, current: number, at: P, size: number) => {
      const much = level(current)
      if (much === 0) return
      if (part.kind === 'lamp') {
        // The filament by how much runs through it: dull red for a little, warm for what it was made for, white for much.
        disc(c, at.x, at.y, size * 0.2, much >= 3 ? 'rgba(255, 255, 255, 0.95)' : much >= 2 ? 'rgba(255, 220, 128, 0.7)' : 'rgba(206, 84, 44, 0.6)')
        const wide = size * (1.5 + much * 0.9) * (1 + 0.02 * Math.sin(seconds * 5))
        c.save()
        c.globalCompositeOperation = 'lighter'
        c.globalAlpha = 0.32 + much * 0.16
        c.drawImage(this.glow!, at.x - wide / 2, at.y - wide / 2, wide, wide)
        c.restore()
        // Its warmth: the air shimmers over a lamp that is lit, more the more runs through it.
        // Always the same few wisps, never as many as the level: stronger and wider with more, so that they are no tally.
        c.strokeStyle = `rgba(255, 244, 222, ${0.16 + much * 0.12})`
        c.lineWidth = 1.6 + much * 0.7
        c.lineCap = 'round'
        c.beginPath()
        for (let w = 0; w < 2; w++) {
          const rise = (seconds * 0.5 + w / 2) % 1, x = at.x + (w - 0.5) * size * 0.26, y = at.y - size * (0.34 + rise * 0.42)
          c.moveTo(x, y)
          c.bezierCurveTo(x + size * 0.07, y - size * 0.06, x - size * 0.07, y - size * 0.12, x, y - size * 0.18)
        }
        c.stroke()
      } else if (part.kind === 'motor') {
        c.save()
        c.translate(at.x, at.y)
        paintShaft(c, shaft, size, seconds * current * 9)
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
    circuit.loose.forEach((body, i) => { if (!(body.kind === 'motor' && bench.turnedLoose(body.at) !== 0)) doing(body, reading.loose[i], matAt(body.at), LOOSE.w) })
    // A motor that lies loose shows its blade too: at rest, or freewheeling from a flick.
    circuit.loose.forEach((body, i) => {
      if (body.kind !== 'motor' || body.at === away) return
      const turned = bench.turnedLoose(body.at)
      if (level(reading.loose[i]) > 0 && turned === 0) return
      const at = matAt(body.at)
      c.save()
      c.translate(at.x, at.y)
      paintShaft(c, shaft, LOOSE.w, i + turned)
      c.restore()
    })
    // A motor that carries nothing still shows its blade, at rest.
    circuit.parts.forEach((part, i) => {
      const turned = part.kind === 'motor' ? bench.turnedOf(part) : 0
      if (part.kind !== 'motor' || (level(reading.parts[i]) > 0 && turned === 0)) return
      const at = bench.midOf(i)
      c.save()
      c.translate(at.x, at.y)
      paintShaft(c, shaft, u, i + turned)
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
      if (who === places.leaving) this.inTheLane(c, () => paintCustomerFront(c, who.customer.who, who.at.x, who.at.y, who.size, who.customer.pose, edge(who)))
      else paintCustomerFront(c, who.customer.who, who.at.x, who.at.y, who.size, who.customer.pose, edge(who))
      drawn++
    }
    const follow = (box: Box, who: Standing, home: P): Box => ({ x: who.at.x + (box.x - home.x) * who.size, y: box.y, w: box.w * who.size, h: box.h * who.size })
    // The one who waits holds its own gadget out, shut and silent.
    const waits = follow({ ...HELD, y: HELD_AT_WINDOW.y - 4 }, places.waiting, AT_BENCH)
    paintGadget(c, stall.next.circuit.gadget, waits, { ...QUIET, switched: hasSwitchIn(stall.next.circuit) }, seconds)
    drawn++
    // A gadget that comes with an order has the card clipped to it from the moment its owner steps up.
    if (stall.next.ticket) {
      c.save()
      c.translate(waits.x - 16, waits.y - 22)
      c.scale(places.waiting.size, places.waiting.size)
      paintTicket(c, stall.next.ticket, { x: 0, y: 0, w: CARD.w, h: CARD.h })
      c.restore()
      drawn++
    }
    // One who is walking off carries theirs as it was handed back.
    if (places.leaving && bench.leaving) {
      // A gadget that ran for its owner goes off running. One whose owner was sent away before it was tried goes off
      // shut and still, whatever it did on the mat.
      const doing = this.doingOf(bench.leaving.circuit), leaving = bench.leaving.circuit, at = places.leaving
      this.inTheLane(c, () => paintGadget(c, leaving.gadget, follow(HELD, at, AT_BENCH), { ...doing, on: !bench.sentAway && this.ran.get(leaving) ? 1 : 0 }, seconds))
      drawn++
    }
    // The owner's gadget: held out shut before it is opened; travelling to them in the hand-back; in their hands, running, after.
    const mat = boardBox(stall.job.circuit), home = follow(HELD, places.owner, AT_BENCH)
    if (bench.hand?.holds === 'gadget') {
      const at = bench.hand.at
      paintGadget(c, stall.job.circuit.gadget, { x: at.x - 110, y: at.y - 60, w: 220, h: 120 }, { ...QUIET, shut: 1, lid: this.doingOf(stall.job.circuit).lid, switched: bench.switched }, seconds)
      drawn++
      // Its order card goes with it, clipped to its corner, wherever it is carried.
      if (stall.job.ticket) { paintTicket(c, stall.job.ticket, { x: at.x - 132, y: at.y - 90, w: CARD.w, h: CARD.h }); drawn++ }
    } else if (stall.finished || show.take >= 0.02) {
      const doing = this.doingOf(stall.job.circuit), taken = stall.finished && show.take >= 1 ? 1 : show.take
      paintGadget(c, stall.job.circuit.gadget, between({ x: mat.x + mat.w * 0.2, y: mat.y + mat.h * 0.2, w: mat.w * 0.6, h: mat.h * 0.6 }, home, taken), { ...doing, on: bench.switched ? show.on : 1, shut: show.lid }, seconds)
      drawn++
      // An order ticket goes with the gadget, clipped to its corner. Where the gadget now holds what the card asks
      // for, its owner looks at the card and puts it away; where it does not, the card stays on, and stirs now and then.
      const ticket = stall.job.ticket
      if (ticket) {
        const from: Box = { x: mat.x + 8, y: mat.y - 34, w: CARD.w, h: CARD.h }, card = between(from, { ...CARD, x: CARD.x + home.x - HELD.x }, taken)
        const away = stall.finished && this.orderMet(stall.job.circuit, ticket) ? Math.max(0, Math.min(1, (show.react - 0.55) / 0.25)) : 0
        if (away < 1) {
          const stir = stall.finished && away === 0 && seconds % 4 < 0.6 ? Math.sin((seconds % 4) * 31) * 4 : 0
          c.save()
          c.globalAlpha = 1 - away
          paintTicket(c, ticket, { ...card, x: card.x + stir, y: card.y - away * 46 })
          c.restore()
          drawn++
        }
      }
    } else if (!stall.job.open) {
      paintGadget(c, stall.job.circuit.gadget, home, { ...QUIET, switched: bench.switched }, seconds)
      drawn++
      if (stall.job.ticket) { paintTicket(c, stall.job.ticket, { ...CARD, x: CARD.x + home.x - HELD.x }); drawn++ }
    }
    return drawn
  }
}
