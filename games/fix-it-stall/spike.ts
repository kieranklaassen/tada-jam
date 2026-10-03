import { boardOf } from './board'
import { clipLead, crackTrace, startLead, type Circuit, type Part } from './circuit'
import { asBuilt } from './gadgets'
import { type Ctx } from './paint'
import { paintCase, paintLane, paintMat, paintOdds, paintTestLamp, paintTray, SCENE } from './paintBench'
import { paintBoard, paintParts, type Lay } from './paintBoard'
import { paintMothBehind, paintMothOnCounter, paintMug, paintOwlBehind, paintOwlEyes, paintOwlOnCounter, paintRaccoon } from './paintFolk'
import { makeGlow, paintBeads, paintBlades, paintGlows, paintLeads } from './paintLive'
import { settle } from './settle'
import { type Reading } from './solve'

// The look spike: the game's real scene in the Electronics bench look, before
// any play. It is one fixed moment, the same on every load: the owl's lantern
// lies open on the mat with a cracked trace, a lead already clipped across the
// crack, and the lamp lit. Nothing answers a touch yet. The circuits are real
// ones and are solved, so the beads run exactly where the current does.
//
// Everything that stands still is painted once into a layer and blitted; a
// frame then draws that layer, the beads, the glows, the blades and the owl's
// eyes, which is what a frame of the game will cost.

const JOB: Lay = { x: 372, y: 356, u: 70 }
const SIGN: Lay = { x: 62, y: 24, u: 19 }
const OWL = { x: 590, y: 46 }
const MOTH = { x: 985, y: 66 }

function lantern(): Circuit {
  const board = boardOf('lamp')
  // The top rail is cracked between the two spare rungs, and a lead bridges the crack. A second lead hangs by one clip.
  const crack = board.traces.findIndex((t) => board.pads[t.a].y === 0 && board.pads[t.b].y === 0 && Math.min(board.pads[t.a].x, board.pads[t.b].x) === 4)
  const cracked = crackTrace(asBuilt('lamp'), crack)
  const bridged = clipLead(cracked, board.traces[crack].a, board.traces[crack].b)
  return startLead(bridged, board.rungs[0][1]).circuit
}

function sign(): Circuit {
  const board = boardOf('sign')
  // Broken from the first day: the top rail is cracked half way along, and the second lamp is blown.
  const crack = board.traces.findIndex((t) => board.pads[t.a].y === 0 && board.pads[t.b].y === 0 && Math.min(board.pads[t.a].x, board.pads[t.b].x) === 6)
  const whole = crackTrace(asBuilt('sign'), crack)
  let lamps = 0
  return { ...whole, parts: whole.parts.map((part): Part => (part.kind === 'lamp' && lamps++ === 1 ? { ...part, blown: true } : part)) }
}

export class Spike {
  private readonly job = settle(lantern())
  private readonly sign = settle(sign())
  private still: HTMLCanvasElement | null = null
  private glow: HTMLCanvasElement | null = null
  private key = ''

  /** Scene units to canvas pixels: the scene is fitted whole and centred, and the ground bleeds past it. */
  private fit(c: Ctx, width: number, height: number, dpr: number): number {
    const scale = Math.min(width / SCENE.w, height / SCENE.h) * dpr
    c.setTransform(scale, 0, 0, scale, (width * dpr - SCENE.w * scale) / 2, (height * dpr - SCENE.h * scale) / 2)
    return scale
  }

  private paintStill(width: number, height: number, dpr: number): HTMLCanvasElement {
    const layer = document.createElement('canvas')
    layer.width = Math.max(1, Math.round(width * dpr))
    layer.height = Math.max(1, Math.round(height * dpr))
    const c = layer.getContext('2d')!
    this.fit(c, width, height, dpr)
    const bleed = Math.max(width, height)
    paintLane(c, bleed)
    paintBoard(c, SIGN, this.sign.circuit)
    paintParts(c, SIGN, this.sign.circuit)
    paintOwlBehind(c, OWL.x, OWL.y)
    paintMothBehind(c, MOTH.x, MOTH.y)
    paintMat(c, bleed)
    paintOwlOnCounter(c, OWL.x, OWL.y)
    paintMothOnCounter(c, MOTH.x, MOTH.y)
    paintCase(c, JOB.x - 52, JOB.y - 52, 6 * JOB.u + 104, 3 * JOB.u + 104)
    paintBoard(c, JOB, this.job.circuit)
    paintParts(c, JOB, this.job.circuit)
    paintLeads(c, JOB, this.job.circuit)
    paintTray(c, 905, 252)
    paintOdds(c, 560, 738)
    paintTestLamp(c, 440, 690)
    paintRaccoon(c, 118, 708)
    paintMug(c, 60, 632)
    return layer
  }

  /** Draw one frame at `seconds` of game time. Returns how many sprites and figures it drew. */
  draw(c: Ctx, width: number, height: number, dpr: number, seconds: number): number {
    if (width <= 0 || height <= 0) return 0
    const key = `${width}x${height}@${dpr}`
    if (key !== this.key || !this.still) {
      this.still = this.paintStill(width, height, dpr)
      this.glow = makeGlow(Math.round(128 * dpr))
      this.key = key
    }
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.drawImage(this.still, 0, 0)
    this.fit(c, width, height, dpr)
    let drawn = 1
    for (const [lay, settled] of [[SIGN, this.sign], [JOB, this.job]] as [Lay, { circuit: Circuit; reading: Reading }][]) {
      // Two draws for all the beads of a board, then one for each glow and each blade.
      drawn += paintBeads(c, lay, settled.circuit, settled.reading, seconds) > 0 ? 2 : 0
      drawn += paintBlades(c, lay, settled.circuit, settled.reading, seconds)
      drawn += paintGlows(c, lay, settled.circuit, settled.reading, this.glow!, seconds)
    }
    // The owl blinks slowly, about every five seconds.
    const phase = seconds % 5.2
    paintOwlEyes(c, OWL.x, OWL.y, phase < 0.24 ? Math.sin((phase / 0.24) * Math.PI) : 0)
    return drawn + 2
  }
}
