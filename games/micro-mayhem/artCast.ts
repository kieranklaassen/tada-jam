import type { Pen } from './pen'

// The segments of the rest of the cast in the bedroom at night: the baker in
// the big bed, the hen on the chest of drawers, the owl in the window and the
// fly. As with the dog, every pose is one dark figure drawn once.

const D = Math.PI / 180

// --- The baker ---------------------------------------------------------------

type Whiskers = 'down' | 'up' | 'blown' | 'level'

/** The baker's face about its own middle: a round head, a bulb of a nose, a moustache wider than the head, and the tall hat he sleeps in. */
function bakerHead(p: Pen, whiskers: Whiskers, mouth: boolean, hat: 'on' | 'off'): void {
  const blown = whiskers === 'blown'
  // The hat: a band and three puffs. Knocked off, it hangs in the air a hand above him.
  p.at(hat === 'on' ? -14 : 50, hat === 'on' ? -52 : -100, () => {
    p.ell(-30, -30, 26, 24)
    p.ell(0, -40, 28, 26)
    p.ell(30, -30, 26, 24)
    p.poly([-40, -18, 40, -18, 36, 6, -36, 6])
    p.cut(() => p.line([-38, -14, 38, -14], 4))
  }, { turn: (hat === 'on' ? -16 : 18) * D })
  p.cut(() => p.ell(0, 0, 74, 66))
  p.ell(0, 0, 68, 60)
  // A snort takes the whole face: both cheeks blown out, and both halves of the moustache thrown up and out.
  if (blown) { p.ell(-58, 20, 30, 26); p.ell(58, 20, 30, 26) }
  const tilt = whiskers === 'down' ? 16 : whiskers === 'up' ? -22 : 0
  const halves = blown ? [[-62, -6, 52], [62, -6, -52]] : [[-46, 26, tilt], [46, 26, -tilt]]
  p.cut(() => { for (const [x, y, turn] of halves) p.ell(x, y, 61, 22, turn * D) })
  for (const [x, y, turn] of halves) p.ell(x, y, 56, 17, turn * D)
  p.cut(() => {
    p.ell(0, 8, 15, 12)
    if (blown) {
      // Both eyes wide and the mouth a round hole.
      p.ell(-24, -20, 13, 14)
      p.ell(24, -20, 13, 14)
      p.ell(0, 40, 17, 14)
    } else {
      p.line([-40, -16, -27, -7, -14, -16], 5)
      p.line([14, -16, 27, -7, 40, -16], 5)
      if (mouth) p.ell(0, 44, 11, 9)
    }
  })
  // His nose stands out again inside its ring of light.
  p.ell(0, 8, 9, 7)
  if (blown) {
    p.ell(-24, -19, 4, 4)
    p.ell(24, -19, 4, 4)
    // What the snort blows out: three drops thrown up and away from his nose.
    p.ell(-30, -92, 9, 20, -0.35)
    p.ell(-70, -74, 8, 17, -0.9)
    p.ell(-98, -36, 7, 14, -1.3)
  }
}

/** Asleep on his back under the quilt. `rise` lifts the belly with a breath. */
function bakerAsleep(p: Pen, rise: number, whiskers: Whiskers, mouth: boolean): void {
  p.ell(432, 520, 20, 32)
  p.blob([218, 566, 222, 492 - rise, 280, 436 - rise, 346, 436 - rise, 398, 494 - rise, 412, 566])
  p.cut(() => {
    p.line([240, 520 - rise / 2, 310, 500 - rise / 2, 392, 524 - rise / 2], 5)
    p.line([262, 470 - rise, 312, 458 - rise, 362, 472 - rise], 5)
  })
  p.at(158, 504, () => bakerHead(p, whiskers, mouth, whiskers === 'blown' ? 'off' : 'on'))
}

function bakerRoll(p: Pen): void {
  p.blob([112, 566, 116, 478, 196, 418, 330, 418, 400, 486, 412, 566])
  p.cut(() => {
    p.line([140, 520, 260, 494, 394, 524], 5)
    p.line([186, 458, 262, 440, 344, 458], 5)
  })
  p.at(118, 470, () => { p.ell(-22, -22, 22, 20); p.ell(4, -32, 24, 22); p.ell(28, -18, 20, 18) }, { turn: -30 * D })
  for (const [x, y] of [[420, 522], [444, 538]]) {
    // A bare sole with its toes above it.
    p.ell(x, y + 6, 15, 22)
    for (const t of [-11, 0, 11]) p.ell(x + t, y - 24 + Math.abs(t) * 0.3, 5.5, 6)
  }
}

/** Bolt upright with both hands in the air, the hat left hanging over him. He sits clear of the window, so he never covers the owl. */
function bakerSit(p: Pen): void {
  p.blob([270, 566, 278, 486, 312, 452, 392, 452, 424, 486, 432, 566])
  p.line([292, 492, 252, 404], 30)
  p.line([410, 492, 452, 404], 30)
  p.ell(248, 392, 24, 22)
  p.ell(456, 392, 24, 22)
  p.cut(() => {
    p.line([296, 532, 350, 518, 408, 534], 5)
    p.ell(350, 400, 78, 70)
  })
  p.at(350, 400, () => bakerHead(p, 'level', true, 'off'))
}

function bakerHide(p: Pen): void {
  p.blob([96, 566, 98, 486, 160, 446, 300, 428, 398, 494, 412, 566])
  p.cut(() => {
    p.line([120, 520, 250, 494, 394, 524], 5)
    p.line([180, 472, 262, 452, 350, 470], 5)
  })
  p.at(104, 474, () => { p.ell(-20, -20, 20, 18); p.ell(4, -30, 22, 20); p.ell(26, -16, 18, 16) }, { turn: -30 * D })
  for (const x of [146, 170, 194, 218]) p.ell(x, 452 - (x - 146) * 0.12, 11, 15)
}

/** A puff of snore: three bumps in a row, larger each step up. */
function puff(p: Pen, x: number, y: number, r: number): void {
  p.ell(x - r * 0.7, y + r * 0.2, r * 0.7, r * 0.6)
  p.ell(x, y - r * 0.15, r * 0.8, r * 0.75)
  p.ell(x + r * 0.75, y + r * 0.2, r * 0.65, r * 0.55)
}

/** The baker in bed. */
export const BAKER: Record<string, (p: Pen) => void> = {
  bakerIn: (p) => bakerAsleep(p, 0, 'down', false),
  bakerOut: (p) => bakerAsleep(p, 22, 'up', true),
  bakerSnort: (p) => bakerAsleep(p, -16, 'blown', true),
  bakerRoll,
  bakerSit,
  bakerHide,
  puffA: (p) => puff(p, 224, 448, 13),
  puffB: (p) => puff(p, 250, 404, 19),
  puffC: (p) => puff(p, 286, 356, 26),
}

// --- The hen -----------------------------------------------------------------

const HEN_X = 905, HEN_Y = 392

type HenHead = { x: number; y: number; eye: 'shut' | 'wide' | 'none'; beak: 'shut' | 'open' }

function henHead(p: Pen, o: HenHead): void {
  const { x, y } = o
  for (const [dx, dy] of [[-8, -22], [4, -27], [16, -22]]) p.ell(x + dx, y + dy, 8, 11)
  p.ell(x, y, 27, 25)
  if (o.beak === 'open') {
    p.poly([x - 24, y - 8, x - 50, y - 12, x - 26, y + 2])
    p.poly([x - 24, y + 6, x - 46, y + 16, x - 22, y + 14])
  } else p.poly([x - 24, y - 6, x - 50, y + 3, x - 24, y + 10])
  p.ell(x - 14, y + 26, 7, 12)
  p.cut(() => {
    if (o.eye === 'shut') p.line([x - 14, y - 6, x - 6, y, x + 2, y - 6], 4)
    else if (o.eye === 'wide') p.ell(x - 6, y - 5, 11, 11)
  })
  if (o.eye === 'wide') p.ell(x - 7, y - 5, 4, 4)
}

function henBody(p: Pen, y: number, big: boolean): void {
  const rx = big ? 70 : 62, ry = big ? 58 : 50
  for (const turn of [-64, -40, -16]) p.ell(HEN_X + 58 + turn * -0.1, y - 34, 13, 40, turn * -D)
  p.ell(HEN_X, y, rx, ry)
  p.cut(() => p.line([HEN_X - 20, y - 12, HEN_X + 22, y + 22, HEN_X + 46, y - 14], 5))
}

function henPerched(p: Pen, head: HenHead, wingUp = false): void {
  henBody(p, HEN_Y, false)
  p.line([HEN_X - 30, HEN_Y - 20, head.x + 4, head.y + 14], 30)
  henHead(p, head)
  if (wingUp) p.ell(head.x - 6, head.y - 4, 36, 17, -24 * D)
}

function henPuff(p: Pen): void {
  const y = HEN_Y - 52
  // Every feather stands out.
  for (let i = 0; i < 9; i++) {
    const a = (-150 + i * 37) * D
    p.ell(HEN_X + Math.cos(a) * 82, y + Math.sin(a) * 68, 20, 9, a)
  }
  henBody(p, y, true)
  p.line([HEN_X - 34, y - 30, HEN_X - 44, y - 84], 24)
  henHead(p, { x: HEN_X - 46, y: y - 104, eye: 'wide', beak: 'open' })
  for (const dx of [-24, 22]) {
    p.line([HEN_X + dx, y + 50, HEN_X + dx, y + 84], 7)
    p.line([HEN_X + dx - 14, y + 92, HEN_X + dx, y + 82, HEN_X + dx + 14, y + 92], 6)
  }
}

/** She has gone over on her back on top of the chest: her feet in the air, her beak open, and two feathers hanging over her. */
function henFall(p: Pen): void {
  // The head, at the left, upside down: comb underneath, beak wide.
  p.ell(866, 420, 24, 21)
  p.poly([846, 412, 818, 398, 848, 424])
  p.poly([848, 428, 824, 440, 852, 436])
  for (const dx of [-12, 2, 16]) p.ell(866 + dx, 442, 8, 7)
  p.ell(930, 414, 64, 32)
  // Two legs straight up, three toes each.
  for (const x of [912, 950]) {
    p.line([x, 388, x, 338], 8)
    for (const toe of [-16, 0, 16]) p.line([x, 340, x + toe, 322 + Math.abs(toe) * 0.3], 6)
  }
  p.cut(() => {
    p.line([858, 418, 866, 410, 874, 418], 4)
    p.line([896, 420, 934, 434, 972, 418], 5)
  })
  p.ell(988, 352, 14, 6, 40 * D)
  p.ell(872, 366, 13, 6, -30 * D)
}

export const HEN: Record<string, (p: Pen) => void> = {
  henUp: (p) => henPerched(p, { x: HEN_X - 40, y: HEN_Y - 48, eye: 'shut', beak: 'shut' }),
  henNod: (p) => henPerched(p, { x: HEN_X - 52, y: HEN_Y - 30, eye: 'shut', beak: 'shut' }),
  henTuck: (p) => henPerched(p, { x: HEN_X - 50, y: HEN_Y - 8, eye: 'shut', beak: 'shut' }),
  henPuff,
  henFall,
  henHide: (p) => henPerched(p, { x: HEN_X - 40, y: HEN_Y - 48, eye: 'none', beak: 'shut' }, true),
}

// --- The owl -----------------------------------------------------------------

export const OWL_X = 190
/** Where the owl's eyes are, which is where its pupils go. */
export const OWL_EYES = { x: OWL_X, y: 178, apart: 30, less: 6 }

export function owlHead(p: Pen, eyes: 'open' | 'shut' | 'huge'): void {
  p.poly([-58, -34, -70, -78, -26, -50])
  p.poly([58, -34, 70, -78, 26, -50])
  p.ell(0, 0, 72, 58)
  p.cut(() => {
    const r = eyes === 'huge' ? 31 : 27
    if (eyes === 'shut') {
      p.line([-48, -2, -30, 10, -12, -2], 5)
      p.line([12, -2, 30, 10, 48, -2], 5)
    } else {
      // One eye larger than the other: a stare, and never two equal rings side by side.
      p.ell(-30, 0, r, r)
      p.ell(30, 0, r - OWL_EYES.less, r - OWL_EYES.less)
    }
    p.poly([-8, 16, 8, 16, 0, 34])
  })
}

function owlBody(p: Pen, wings: 'folded' | 'spread'): void {
  if (wings === 'spread') {
    p.blob([OWL_X - 50, 228, OWL_X - 118, 150, OWL_X - 134, 214, OWL_X - 112, 286, OWL_X - 56, 290])
    p.blob([OWL_X + 50, 228, OWL_X + 118, 150, OWL_X + 134, 214, OWL_X + 112, 286, OWL_X + 56, 290])
  }
  p.ell(OWL_X, 256, 66, 76)
  p.ell(OWL_X - 22, 330, 16, 9)
  p.ell(OWL_X + 22, 330, 16, 9)
  p.cut(() => {
    if (wings === 'folded') {
      p.line([OWL_X - 44, 214, OWL_X - 56, 262, OWL_X - 34, 312], 5)
      p.line([OWL_X + 44, 214, OWL_X + 56, 262, OWL_X + 34, 312], 5)
    }
    for (const [x, y] of [[-16, 262], [16, 262], [0, 286]]) p.line([OWL_X + x - 10, y, OWL_X + x, y + 8, OWL_X + x + 10, y], 4)
  })
}

function owlPupils(p: Pen, dx: number, r: number): void {
  p.ell(OWL_EYES.x - OWL_EYES.apart + dx, OWL_EYES.y, r, r)
  // The smaller eye has the smaller pupil, which moves less, so that it stays inside its eye.
  p.ell(OWL_EYES.x + OWL_EYES.apart + dx * 0.7, OWL_EYES.y, r * 0.75, r * 0.75)
}

export const OWL: Record<string, (p: Pen) => void> = {
  owlOpen: (p) => { owlBody(p, 'folded'); p.at(OWL_X, OWL_EYES.y, () => owlHead(p, 'open')) },
  owlBlink: (p) => { owlBody(p, 'folded'); p.at(OWL_X, OWL_EYES.y, () => owlHead(p, 'shut')) },
  owlFlip: (p) => {
    owlBody(p, 'folded')
    p.at(OWL_X, OWL_EYES.y, () => owlHead(p, 'huge'), { turn: 180 * D })
    owlPupils(p, 0, 7)
  },
  owlWings: (p) => {
    owlBody(p, 'spread')
    p.at(OWL_X, OWL_EYES.y, () => owlHead(p, 'huge'))
    owlPupils(p, 0, 7)
  },
  owlDuck: (p) => {
    p.at(OWL_X, 286, () => owlHead(p, 'huge'))
    p.ell(OWL_X - 30, 286, 6, 6)
    p.ell(OWL_X + 30, 286, 6, 6)
  },
  owlPupL: (p) => owlPupils(p, -10, 11),
  owlPupC: (p) => owlPupils(p, 0, 11),
  owlPupR: (p) => owlPupils(p, 10, 11),
}

// --- The fly -----------------------------------------------------------------

/** The fly at a spot: wings up as it lifts or lands, flat while it sits. */
export function fly(p: Pen, x: number, y: number, wings: 'up' | 'flat'): void {
  if (wings === 'up') {
    p.ell(x - 4, y - 19, 9, 17, -22 * D)
    p.ell(x + 12, y - 18, 9, 17, 24 * D)
  } else {
    p.ell(x - 12, y - 11, 18, 7, -10 * D)
    p.ell(x + 16, y - 10, 18, 7, 10 * D)
  }
  p.ell(x, y, 17, 12)
  p.ell(x - 18, y - 2, 9, 9)
  p.cut(() => { p.ell(x - 20, y - 4, 3, 3); p.line([x + 2, y - 8, x + 6, y, x + 2, y + 8], 3) })
  for (const dx of [-8, 2, 12]) p.line([x + dx, y + 9, x + dx - 3, y + 19], 3)
}

/** Three shrinking dots from one spot toward the next: where the fly just was. */
export function flyTrail(p: Pen, from: { x: number; y: number }, to: { x: number; y: number }): void {
  for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 0.2
    p.ell(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 34, 6 - i * 1.5, 6 - i * 1.5)
  }
}

/** The fly flat on its back with its legs in the air. */
export function flyOver(p: Pen, x: number, y: number): void {
  p.ell(x, y, 17, 11)
  p.ell(x - 18, y + 1, 9, 8)
  for (const dx of [-8, 2, 12]) p.line([x + dx, y - 8, x + dx + 3, y - 20], 3)
  p.cut(() => p.line([x - 23, y - 2, x - 15, y + 4], 3))
}

/** The fly rubbing its hands: sitting up, with two arms out in front and its hands together. */
export function flyRub(p: Pen, x: number, y: number, other = false): void {
  p.ell(x + 4, y, 13, 16)
  p.ell(x - 4, y - 20, 10, 9)
  p.ell(x + 20, y - 8, 7, 16, 0.5)
  // Two arms side by side that never cross, and its two hands as one small knob where they meet.
  const lift = other ? -7 : 0
  p.line([x - 8, y - 6, x - 20, y - 9 + lift], 3)
  p.line([x - 8, y + 2, x - 20, y - 2 + lift], 3)
  p.ell(x - 22, y - 5.5 + lift, 4, 5.5)
  for (const dx of [0, 10]) p.line([x + dx, y + 13, x + dx - 2, y + 22], 3)
  p.cut(() => p.ell(x - 7, y - 22, 3, 3))
}
