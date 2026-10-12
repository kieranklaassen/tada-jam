import { drawCandle } from './candleArt'
import { BUBBLES, RING_SECONDS, SPOT_SECONDS } from './dipping'
import type { Fair } from './fair'
import type { Frame } from './frame'
import { POT } from './hall'
import { DARK, alpha, mix } from './paint'
import { BENCH, CLOTH, COLOUR_X, DOORWAY, SIZE_X, SOURCE, STAR, WALK, isStall, type Place, type Stall } from './places'
import { STAGE } from './stage'
import { WAX, WAX_PALE } from './scenery'
import { MARK, POINTS } from './things'

// What is drawn fresh at a place, over its painted middle and front: the wax
// and what moves on it, the piece in work, the candle on its stick, the door's
// leaf, the cloth, and whatever hops under a tap. `off` is how far the place
// has slid along the hall, so the walk draws two places with the same code.

/** The middle of a place: its painted bay, and at the door the leaf, as far open as the door stands. */
export function drawBay(f: Frame, fair: Fair, place: Place, off: number): void {
  f.put(f.s.of(`bay:${place}`), off, 0)
  if (place === 'door') f.turn(f.s.of('leaf'), DOORWAY.left + off, DOORWAY.top, 0, Math.max(0.06, 1 - fair.doorOpen), 1)
}

/** Whether the piece on this place's bench is somewhere else to the eye: in the hand, or in the air on its way back. */
function away(fair: Fair, place: Place): boolean {
  if (place !== fair.at) return false
  return fair.carry?.from.kind === 'bench' || fair.flight?.hides?.kind === 'bench'
}

/** The wax in the pot: its surface, the rings on it, and the bubbles of a candle that is melting. */
function wax(f: Frame, fair: Fair, off: number): void {
  const g = f.g, d = fair.dipping
  // Risen wax stands higher at its middle and keeps its near edge on the rim: it swells in the pot, and never floats over it.
  const y = POT.y - d.level, wobble = fair.potRing.x, sx = 1 + wobble * 0.02, sy = waxTall(d.level) - wobble * 0.05
  if (fair.potMix < 1) {
    // Wax just poured spreads through the pot: the new colour comes up over the old.
    f.turn(f.s.of(`wax${fair.potWas}`), POT.x + off, y, 0, sx, sy)
    g.globalAlpha = fair.potMix
    f.turn(f.s.of(`wax${fair.pot}`), POT.x + off, y, 0, sx * (0.4 + fair.potMix * 0.6), sy * (0.4 + fair.potMix * 0.6))
    g.globalAlpha = 1
  } else f.turn(f.s.of(`wax${fair.pot}`), POT.x + off, y, 0, sx, sy)
  g.lineWidth = 3
  for (const ring of d.rings) {
    const grow = ring.age / RING_SECONDS, rx = 12 + grow * 78 * ring.size + (2 + d.candle.r[11]) * 0.4
    g.strokeStyle = alpha('#fff6d6', (1 - grow) * 0.8)
    g.beginPath()
    g.ellipse(ring.x + off, y, Math.min(rx, POT.rx - Math.abs(ring.x - POT.x)), rx * 0.24, 0, 0, Math.PI * 2)
    g.stroke()
    f.ops(1)
  }
  if (d.bubbling > 0.05) {
    // Bubbles rise and burst round the candle, each on the game's clock: a slow one or two as a warning, and
    // five quick ones across the pot while the candle melts.
    g.strokeStyle = alpha('#fff6d6', Math.min(1, d.bubbling * (d.melting ? 0.9 : 1.5)))
    g.lineWidth = 2.5
    g.beginPath()
    for (const b of bubblesOf(d.melting, fair.time)) {
      g.moveTo(d.stick.x + off + b.dx + b.r, y + b.dy)
      g.arc(d.stick.x + off + b.dx, y + b.dy, b.r, 0, Math.PI * 2)
    }
    g.stroke()
    f.ops(1)
  }
}

/** How much taller the wax surface is drawn when it stands `level` over the rim, so that its near edge stays where it is at rest. */
export function waxTall(level: number): number {
  return 1 + level / POT.ry
}

/**
 * The bubbles on the wax at a moment of the game's clock, measured from the candle: where each is and how far it
 * has grown. A warning has few, slow and close to the candle; melting has many, quick and wide (`BUBBLES`).
 */
export function bubblesOf(melting: boolean, time: number): { dx: number; dy: number; r: number }[] {
  const how = melting ? BUBBLES.melt : BUBBLES.warn, list: { dx: number; dy: number; r: number }[] = []
  for (let i = 0; i < how.count; i++) {
    const phase = (time * how.pace * (1 + i * 0.14) + i * 0.37) % 1
    list.push({ dx: Math.sin(i * 2.4 + (melting ? 0 : 1.1)) * how.spread, dy: Math.cos(i * 1.7) * 9, r: 3 + phase * 9 })
  }
  return list
}

/** The piece in work on the bench of a stall: it gives under the finger and springs back. */
function piece(f: Frame, fair: Fair, stall: Exclude<Stall, 'candle'>, off: number): void {
  if (away(fair, stall)) return
  const thing = fair.pieces[stall], at = BENCH[stall], b = fair.bench, here = stall === fair.at
  const give = here ? b.give.x : 0, sway = here ? b.sway.x : 0
  // A piece that is pulled at comes after the finger, with slack, and springs back when it is let go.
  const px = here ? fair.pull.x : 0, py = here ? fair.pull.y : 0
  // A star on its way to the top of the ring is not on the ring yet.
  const shown = here && fair.flight?.spin && thing.on ? { ...thing, on: null } : thing
  f.turn(f.s.thing(shown, true), at.x + off + px, at.y + py + give * 3, sway * 0.05, 1 + give * 0.03, 1 - give * 0.04)
  if (here && thing.craft === 'star' && b.made.index >= 0 && b.made.age < 0.3) {
    // The crease of the point just folded catches the light for a moment.
    const g = f.g, a = (b.made.index / POINTS[thing.size]) * Math.PI * 2 - Math.PI / 2, r = STAR.r[thing.size]
    g.strokeStyle = alpha('#fffbe8', 1 - b.made.age / 0.3)
    g.lineWidth = 5
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(at.x + off, at.y)
    g.lineTo(at.x + off + Math.cos(a) * r, at.y + Math.sin(a) * r)
    g.stroke()
    f.ops(1)
  }
}

/** What is worked on at a place: the wax at the candle stall, the piece at the others, nothing at the door. */
export function drawWork(f: Frame, fair: Fair, place: Place, off: number): void {
  if (place === 'candle') wax(f, fair, off)
  else if (isStall(place)) piece(f, fair, place, off)
}

/** The candle on its stick, cut off where it goes under the wax. */
export function drawStick(f: Frame, fair: Fair, off: number): void {
  const g = f.g, d = fair.dipping
  if (!away(fair, 'candle')) {
    g.save()
    if (d.inPot) {
      g.beginPath()
      g.rect(-STAGE.width, -STAGE.height, STAGE.width * 3, STAGE.height + POT.y - d.level + 1)
      g.clip()
    }
    g.translate(d.stick.x + off, d.stick.y)
    g.rotate(-d.swing)
    f.ops(drawCandle(g, d.candle, d.wet))
    if (fair.pieces.candle.mark === MARK.chewed) {
      // What the goat bit out of it.
      g.fillStyle = mix(DARK, '#3a2416', 0.5)
      g.beginPath()
      for (const [side, part] of [[1, 3], [-1, 6], [1, 9]] as const) { const x = side * (4 + d.candle.r[part]), y = 44 + part * 20; g.moveTo(x + 13, y); g.arc(x, y, 13, 0, Math.PI * 2) }
      g.fill()
      f.ops(1)
    }
    g.restore()
  }
  f.turn(f.s.of('stick'), d.stick.x + off, d.stick.y, -d.swing * 0.25)
}

/** The drops that fall from the candle, and the spots of wax that cool on the counter. */
export function drawDrops(f: Frame, fair: Fair): void {
  const g = f.g, d = fair.dipping
  // All the spots of one colour go in one fill.
  for (let colour = 0; colour < WAX.length && d.spots.length > 0; colour++) {
    let any = false
    g.beginPath()
    for (const spot of d.spots) {
      if (spot.colour !== colour) continue
      const left = Math.sqrt(Math.max(0, 1 - spot.age / SPOT_SECONDS))
      g.moveTo(spot.x + spot.size * 1.6 * left, spot.y)
      g.ellipse(spot.x, spot.y, spot.size * 1.6 * left, spot.size * 0.7 * left, 0, 0, Math.PI * 2)
      any = true
    }
    if (!any) continue
    g.fillStyle = WAX[colour]
    g.fill()
    f.ops(1)
  }
  if (d.drops.length === 0) return
  g.fillStyle = WAX_PALE[d.colour]
  g.beginPath()
  for (const drop of d.drops) {
    const long = Math.min(2.2, 1 + drop.vy / 700)
    g.moveTo(drop.x + drop.size, drop.y)
    g.ellipse(drop.x, drop.y, drop.size * 0.8, drop.size * long, 0, 0, Math.PI * 2)
  }
  g.fill()
  f.ops(1)
}

/** The front of a place: its painted sources and lanterns, the cloth while it lies there or flies off, and what hops under a tap. */
export function drawFront(f: Frame, fair: Fair, place: Place, off: number): void {
  const g = f.g, here = place === fair.at, hop = fair.hop
  f.put(f.s.of(`front:${place}`), off, 0)
  if (here && hop.age < 0.3 && (hop.what === 'colour' || hop.what === 'size') && isStall(place)) {
    const up = Math.sin((hop.age / 0.3) * Math.PI), x = (hop.what === 'colour' ? COLOUR_X : SIZE_X)[hop.index]
    f.turn(f.s.source(place, hop.what, hop.index), x + off, SOURCE.y - up * 16, 0, 1 - up * 0.06, 1 + up * 0.1)
  }
  if (isStall(place)) {
    if (!fair.uncovered[place]) f.put(f.s.of('cloth'), CLOTH.x + off, CLOTH.y)
    else if (here && fair.clothFlown < 0.5) {
      // The cloth flies up and off.
      const p = fair.clothFlown / 0.5
      g.globalAlpha = 1 - p
      f.turn(f.s.of('cloth'), CLOTH.x + off + p * 60, CLOTH.y - p * (2 - p) * 150, -p * 0.5)
      g.globalAlpha = 1
    }
  }
  // A walking lantern lights under the finger that is on it: the walk starts when the finger lifts there.
  if (here && fair.pending?.kind === 'lantern') {
    const lantern = fair.pending.dir < 0 ? WALK.left : WALK.right
    f.shine(f.s.of('light'), lantern.x + off, lantern.y + 10, 0.9, 1.3)
  }
  // The lantern that was tapped is lit for the length of the walk, and its light goes by with it.
  if (fair.slide && place === fair.slide.from && hop.what === 'lantern') {
    const lantern = hop.index < 0 ? WALK.left : WALK.right
    f.shine(f.s.of('light'), lantern.x + off, lantern.y + 10, 0.9 * Math.min(1, (1.4 - hop.age) * 3), 1.3)
  }
}
