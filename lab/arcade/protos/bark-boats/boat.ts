// A boat is whatever the child put together: one hull, perhaps a mast,
// perhaps a sail, a little cargo. It is drawn the same way on the stone, on
// the brook and moored in the pond, so what was built is what sails.

import { drawSprite } from './paint.ts'
import type { G } from './paint.ts'
import type { CargoDef, HullDef, MastDef, Pieces, SailDef } from './pieces.ts'

export interface Look {
  hull: HullDef
  mast: MastDef | null
  sail: SailDef | null
  // dx: where along the hull it was put. hop: a little bounce as it lands.
  cargo: { def: CargoDef; dx: number; hop: number }[]
}

export interface Pose {
  // The keel point, and the lean of the whole boat.
  x: number
  y: number
  rot: number
  // Which way it faces as seen from above: 0 is downstream.
  yaw: number
  dusk: number
  // 0..1 as the mast is pressed in and the sail is threaded down.
  mastT: number
  sailT: number
  // The belly of the sail (-1..1) and its tremble (radians).
  billow: number
  flutter: number
  // 1 is at rest; below 1 the hull is pressed down.
  squash: number
  gnome: boolean
  gnomeBob: number
  // 0..1 as the lamp is lit.
  lamp: number
  // Afloat: nothing is drawn below this line.
  waterY: number | null
}

export const GNOME = 1

export function mastFoot(look: Look): number {
  return look.hull.deckY + 10
}

// The sail's centre, in the boat's own coordinates (before yaw).
export function sailCentre(look: Look): { x: number; y: number } {
  const len = look.mast?.len ?? 150
  const h = look.sail?.h ?? 100
  return { x: look.hull.mastX, y: Math.min(mastFoot(look) - len * 0.56, look.hull.deckY - h * 0.5 + 4) }
}

export function mastTop(look: Look): { x: number; y: number } {
  return { x: look.hull.mastX, y: mastFoot(look) - (look.mast?.len ?? 0) }
}

// Where the lamp goes: in an acorn cap if one was loaded, else hung from the
// mast, else set on the bow.
export function lampPoint(look: Look): { x: number; y: number; kind: 'cap' | 'mast' | 'bow' } {
  const cap = look.cargo.find((c) => c.def.key === 'acorn')
  if (cap) return { x: cap.dx, y: look.hull.deckY - 14, kind: 'cap' }
  if (look.mast) return { x: look.hull.mastX + 9, y: mastFoot(look) - look.mast.len * 0.9, kind: 'mast' }
  return { x: look.hull.halfW * 0.7, y: look.hull.rimY - 22, kind: 'bow' }
}

export function drawBoat(g: G, P: Pieces, look: Look, pose: Pose): void {
  const hull = look.hull
  const c = Math.cos(pose.yaw)
  const face = c >= 0 ? 1 : -1
  g.save()
  if (pose.waterY !== null) {
    g.beginPath()
    g.rect(pose.x - 280, pose.waterY - 460, 560, 460)
    g.clip()
  }
  g.translate(pose.x, pose.y)
  if (pose.rot) g.rotate(pose.rot)
  if (pose.squash !== 1) g.scale(2 - pose.squash, pose.squash)
  drawSprite(g, hull.back, 0, 0, 0, 1, 1, pose.dusk)
  if (look.mast) {
    const mx = hull.mastX * c
    const my = mastFoot(look) - (1 - pose.mastT) * 44
    const lean = (1 - pose.mastT) * 0.45
    drawSprite(g, look.mast.sprite, mx, my, lean, 1, 1, pose.dusk)
    if (look.sail) {
      const at = sailCentre(look)
      const sx = mx + pose.billow * 7 * face
      const sy = at.y - (1 - pose.sailT) * (look.mast.len * 0.42)
      const wide = Math.max(0.24, Math.abs(c)) * (1 + pose.billow * 0.07)
      drawSprite(g, look.sail.sprite, sx, sy, pose.flutter + pose.billow * 0.05 * face, wide, 1, pose.dusk)
      // The mast shows again where it comes through the leaf.
      if (pose.sailT > 0.6) {
        g.save()
        g.beginPath()
        g.rect(mx - 9, sy - look.sail.h * 0.17, 18, look.sail.h * 0.3)
        g.clip()
        drawSprite(g, look.mast.sprite, mx, my, lean, 1, 1, pose.dusk)
        g.restore()
      }
    }
  }
  if (pose.gnome) drawSprite(g, P.gnomeSit, hull.seatX * c, hull.deckY + 2 + pose.gnomeBob, 0, GNOME * face, GNOME, pose.dusk)
  for (const item of look.cargo) drawSprite(g, item.def.sprite, item.dx * c, hull.deckY + 1 - item.hop, 0, 1, 1, pose.dusk)
  drawSprite(g, hull.front, 0, 0, 0, 1, 1, pose.dusk)
  if (pose.lamp > 0.01) {
    const lp = lampPoint(look)
    const a = g.globalAlpha
    g.globalAlpha = a * Math.min(1, pose.lamp * 1.4)
    if (lp.kind === 'cap') drawSprite(g, P.flame, lp.x * c, lp.y + 3, 0, 1, 1, 0)
    else drawSprite(g, P.lantern, lp.x * c, lp.y, 0, 1, 1, 0)
    g.globalAlpha = a
  }
  g.restore()
}
