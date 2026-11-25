import type { Bit, Item, Pose } from './acts'
import { COLOR as C, INK, oval, poly, smooth, type Brush } from './brush'
import { ANKLE, BOOT, HEAD } from './layout'
import type { OwnerId } from './owners'
import type { ThingId } from './things'

// Everyone and everything in the book: flat, frontal, one thick line. Shapes
// are made once here from plain numbers; nothing is drawn until a brush asks.

const S = {
  round: oval(1, 100, 100), roundB: oval(5, 100, 100), small: oval(9, 30, 30, 0.8),
  // --- things, about 90 across
  leaf: smooth(11, [0, 0, 14, -18, 38, -16, 24, 2]), carrot: smooth(12, [-22, -30, 0, -37, 22, -30, 14, 10, 0, 50, -14, 10]),
  carrotTop: smooth(13, [0, -30, -26, -48, -24, -64, -8, -54, 0, -76, 10, -54, 26, -62, 24, -46]),
  man: smooth(14, [0, -48, 20, -38, 18, -20, 44, -20, 46, 0, 20, 2, 26, 40, 8, 46, 0, 22, -8, 46, -26, 40, -20, 2, -46, 0, -44, -20, -18, -20, -20, -38]),
  frogBody: smooth(15, [-44, 34, -46, 4, -30, -26, 0, -32, 30, -26, 46, 4, 44, 34, 20, 40, -20, 40]), frogLeg: oval(16, 24, 15, 0.8),
  mouse: smooth(17, [-40, 30, -38, -2, -12, -22, 18, -14, 48, 16, 34, 32]), mouseEar: oval(18, 19, 19, 0.8),
  bowl: smooth(19, [-50, -14, 50, -14, 40, 24, 20, 38, -20, 38, -40, 24], true, 0.8), heap: smooth(20, [-46, -12, -34, -32, -10, -38, 4, -48, 22, -36, 46, -14, 0, -6]),
  bell: smooth(21, [-16, -36, 16, -36, 28, -6, 46, 30, 0, 36, -46, 30, -28, -6]), clapper: oval(22, 12, 12, 0.6),
  // --- the boot, in the group's units
  boot: smooth(30, [26, BOOT.rim, 184, BOOT.rim, 180, -190, 190, -132, 250, -118, 298, -84, 304, -34, 286, -4, 160, 0, 30, 0, 14, -30, 22, -150], true, 1.2, 5),
  sole: smooth(31, [12, -26, 150, -22, 306, -30, 304, 2, 284, 14, 24, 14, 10, 0], true, 1),
  cuff: smooth(32, [16, BOOT.rim - 14, 194, BOOT.rim - 14, 198, BOOT.rim + 40, 12, BOOT.rim + 40], true, 1, 4), mouth: oval(33, 84, 22, 0.8),
  hole: smooth(34, [-26, -20, -6, -34, 14, -26, 30, -30, 26, 6, 10, 26, -18, 22]),
  // --- owners, from where each stands
  oma: smooth(40, [-60, -352, 60, -352, 118, -60, 126, -14, 0, -2, -126, -14, -118, -60]), apron: smooth(41, [-46, -300, 46, -300, 78, -50, 0, -36, -78, -50]),
  omaHair: smooth(42, [-112, -450, -100, -536, -40, -574, 40, -574, 100, -536, 112, -450, 78, -500, 0, -520, -78, -500]), bun: oval(43, 44, 38),
  bear: smooth(44, [-74, -352, 74, -352, 122, -210, 116, -50, 60, -8, -60, -8, -116, -50, -122, -210]), belly: oval(45, 72, 96),
  goose: smooth(46, [-40, -380, 40, -380, 70, -280, 138, -180, 116, -50, 0, -22, -116, -50, -138, -180, -70, -280]),
  beak: smooth(47, [-52, -10, 0, -24, 52, -10, 34, 20, 0, 30, -34, 20]), beakLow: smooth(48, [-32, 4, 32, 4, 20, 32, 0, 40, -20, 32]),
  elephant: smooth(49, [-84, -340, 84, -340, 138, -200, 132, -60, 108, -8, -108, -8, -132, -60, -138, -200]), ear: smooth(50, [-10, -70, 60, -82, 104, -30, 92, 46, 34, 70, -6, 40]),
  horse: smooth(51, [-64, -372, 64, -372, 104, -230, 100, -60, 80, -8, -80, -8, -100, -60, -104, -230]),
  horseHead: smooth(52, [-62, -550, 62, -550, 78, -470, 70, -400, 62, -352, 0, -334, -62, -352, -70, -400, -78, -470]), horseEar: smooth(53, [-18, 10, 0, -58, 18, 10]),
  mane: smooth(54, [-34, -548, -38, -606, -8, -624, 30, -600, 36, -548, 22, -490, 0, -510, -16, -486]), muzzle: oval(55, 72, 54),
  human: smooth(56, [-34, -34, 30, -36, 46, -8, 84, 8, 110, 24, 106, 46, 40, 50, -24, 50, -44, 28]), paw: smooth(57, [-42, -36, 38, -38, 66, -12, 112, 6, 116, 44, 40, 54, -30, 54, -52, 26]),
  web: smooth(58, [-18, -34, 20, -34, 26, 4, 122, 22, 96, 34, 124, 52, 60, 52, 20, 58, -24, 54, -34, 20]), round4: smooth(59, [-52, -40, 50, -40, 62, 0, 72, 46, 40, 56, -44, 56, -66, 44]), hoof: smooth(60, [-30, -34, 36, -34, 44, 2, 62, 50, -44, 50, -38, 0]), hoofTip: smooth(61, [-42, 10, 46, 10, 62, 50, -44, 50]),
  shoe: smooth(62, [-40, -40, 34, -40, 46, -14, 66, 4, 60, 22, -44, 22]), splat: smooth(63, [-90, -20, -60, -78, 0, -70, 60, -88, 92, -30, 84, 40, 60, 96, 34, 58, 0, 84, -30, 54, -62, 78, -80, 34]),
  tri: poly(64, [-16, 0, 16, 0, 0, 20]), tooth: smooth(65, [-44, 0, 44, 0, 30, 26, -30, 26]), peel: smooth(66, [-58, -18, 0, 2, 58, -18, 40, 22, 0, 34, -40, 22]),
  wing: smooth(67, [0, 0, 30, 20, 40, 84, 10, 130, -24, 90, -26, 30]), tuft: smooth(68, [-18, 8, -14, -44, 0, -20, 8, -54, 16, -14, 26, -30, 20, 8]), moth: smooth(69, [0, 0, -34, -26, -40, 8, -12, 18, 0, 8, 12, 18, 40, 8, 34, -26]),
} as const

export type BootLook = { body: string; cuff: string; sole: string }
export const BOOTS: Record<OwnerId, BootLook> = {
  oma: { body: C.red, cuff: C.white, sole: INK }, bear: { body: C.green, cuff: C.yellow, sole: INK }, goose: { body: C.yellow, cuff: C.red, sole: INK },
  elephant: { body: C.white, cuff: C.red, sole: INK }, horse: { body: C.orange, cuff: C.white, sole: INK },
}
export const SKIN: Record<OwnerId, string> = { oma: C.skin, bear: C.brown, goose: C.white, elephant: C.grey, horse: C.white }
const FOOT: Record<OwnerId, string> = { oma: C.skin, bear: C.brown, goose: C.orange, elephant: C.grey, horse: C.white }
const LEG: Record<OwnerId, number> = { oma: 50, bear: 70, goose: 26, elephant: 92, horse: 54 }
const ARM: Record<OwnerId, string> = { oma: C.yellow, bear: C.brown, goose: C.white, elephant: C.grey, horse: C.white }

// --- things ------------------------------------------------------------------

export function drawThing(b: Brush, id: ThingId, x: number, y: number, rot: number, sx: number, sy: number, fat = 0, line = 7): void {
  const { pen } = b, was = b.line
  pen.save(); pen.translate(x, y); pen.rotate(rot); pen.scale(sx, sy)
  b.line = line
  switch (id) {
    case 'mandarin':
      b.lay(S.round, C.orange, { sx: 0.44, sy: 0.4 }); b.lay(S.leaf, C.green, { y: -36, line: line * 0.8 }); b.dot(-14, 8, 3, 3, INK); b.dot(6, 16, 3, 3, INK); b.dot(-4, -8, 3, 3, INK); break
    case 'carrot':
      b.lay(S.carrotTop, C.green, { y: 6 }); b.lay(S.carrot, C.orange); b.curve(-14, -8, -6, -5, 0, -8, 5); b.curve(2, 10, 8, 12, 12, 9, 5); break
    case 'biscuit':
      b.lay(S.man, C.brown); b.dot(-7, -34, 4, 4, C.white); b.dot(8, -34, 4, 4, C.white); b.curve(-8, -25, 0, -18, 9, -25, 4, C.white); b.dot(0, -8, 4.5, 4.5, C.white); b.dot(0, 8, 4.5, 4.5, C.white); break
    case 'frog': {
      const w = 1 + fat * 0.75
      b.lay(S.frogLeg, C.green, { x: -38 * w, y: 34 }); b.lay(S.frogLeg, C.green, { x: 38 * w, y: 34 })
      b.lay(S.frogBody, C.green, { sx: w, sy: 1 + fat * 0.4, y: -fat * 10 })
      const ey = -32 - fat * 22
      for (const ex of [-20, 20]) { b.lay(S.small, C.white, { x: ex * (1 + fat * 0.3), y: ey, sx: 0.56, sy: 0.56 }); b.dot(ex * (1 + fat * 0.3), ey + 1, 6, 7, INK) }
      b.curve(-24 * w, -4, 0, 14, 24 * w, -4, 5.5)
      if (fat > 0) b.curve(-22, 22, 0, 30, 22, 22, 5)
      break
    }
    case 'mouse': {
      const w = 1 + fat * 0.6
      b.curve(-38 * w, 24, -64 * w, 34, -62 * w, 2, 6)
      b.lay(S.mouse, C.white, { sx: w, sy: 1 + fat * 0.7, y: -fat * 14 })
      b.lay(S.mouseEar, C.pink, { x: -2, y: -26 - fat * 22 }); b.lay(S.mouseEar, C.pink, { x: 22, y: -22 - fat * 22 })
      b.dot(24, 4 - fat * 14, 5, 6, INK); b.dot(50 * w - 2, 16, 7, 6, C.red)
      break
    }
    case 'porridge': b.lay(S.heap, C.white); b.lay(S.bowl, C.red); b.curve(-34, 6, 0, 16, 34, 6, 6, C.white); break
    case 'bell': b.lay(S.clapper, C.red, { y: 38 }); b.lay(S.bell, C.yellow); b.curve(-34, 14, 0, 22, 34, 14, 6); b.ring(0, -42, 9, 0, 6.28, line); break
  }
  b.line = was
  pen.restore()
}

// --- the boot ----------------------------------------------------------------

export function drawBootBack(b: Brush, p: Pose): void {
  b.lay(S.mouth, INK, { x: BOOT.x + p.boot.dx, y: BOOT.rim * p.boot.sy - 8 + p.boot.dy, sx: p.boot.sx, line: 4 })

}
export function drawBoot(b: Brush, owner: OwnerId, p: Pose, toes: boolean): void {
  const k = BOOTS[owner], { pen } = b
  pen.save(); pen.translate(BOOT.x + p.boot.dx, p.boot.dy); pen.rotate(p.boot.rot); pen.scale(p.boot.sx, p.boot.sy); pen.translate(-BOOT.x, 0)
  b.lay(S.boot, k.body); b.lay(S.sole, k.sole, { line: 3 })
  if (owner === 'bear') for (const x of [60, 100, 140]) b.dot(x, -120, 9, 9, C.yellow)
  if (owner === 'oma') for (const [x, y] of [[70, -190], [130, -150], [84, -100], [150, -70], [214, -66]]) b.dot(x, y, 11, 11, C.white)
  if (owner === 'goose') for (const y of [-216, -176, -136]) b.curve(60, y, 100, y + 14, 140, y, 8, C.red)
  if (owner === 'elephant') b.lay(S.small, C.red, { x: 100, y: -140, sx: 1.2, sy: 1.2 })
  if (owner === 'horse') { b.curve(28, -190, 100, -176, 176, -190, 12, C.white); b.curve(28, -150, 100, -136, 180, -150, 12, C.white) }
  if (p.hole > 0.04) {
    b.lay(S.hole, INK, { x: BOOT.toeX - 22, y: BOOT.toeY + 4, sx: p.hole, sy: p.hole, line: 4 })
    if (toes) { for (let i = 0; i < 3; i++) b.lay(S.small, FOOT[owner], { x: BOOT.toeX - 14 + i * 13, y: BOOT.toeY - 10 + i * 12, sx: 0.55, sy: 0.55, line: 5 }) }
  }
  b.lay(S.cuff, k.cuff)
  if (owner === 'oma') for (let x = 40; x < 190; x += 34) b.curve(x, BOOT.rim - 2, x + 3, BOOT.rim + 12, x, BOOT.rim + 26, 5)
  pen.restore()
}

// --- feet --------------------------------------------------------------------

export function drawFoot(b: Brush, owner: OwnerId, x: number, y: number, rot: number, toes: number): void {
  const { pen } = b, f = FOOT[owner], wig = (i: number): number => toes * 7 * (i % 2 ? 1 : -1)
  pen.save(); pen.translate(x, y); pen.rotate(rot)
  switch (owner) {
    case 'oma':
      for (let i = 3; i >= 0; i--) b.lay(S.small, f, { x: 70 + i * 13, y: 46 - Math.abs(i - 1) * 2 + wig(i), sx: 0.5, sy: 0.56, line: 6 })
      b.lay(S.human, f)
      for (let i = 0; i < 4; i++) b.lay(S.small, f, { x: 46 + i * 21, y: 50 + wig(i) * 0.9, sx: 0.46, sy: 0.6, line: 6 })
      b.lay(S.small, f, { x: 114, y: 26 - toes * 12, sx: 0.86, sy: 0.82, line: 7 }); b.curve(112, 12 - toes * 12, 126, 12 - toes * 12, 132, 22 - toes * 12, 5)
      break
    case 'bear':
      b.lay(S.paw, f)
      for (let i = 0; i < 4; i++) { b.lay(S.small, f, { x: 34 + i * 27, y: 50 + wig(i), sx: 0.62, sy: 0.62, line: 7 }); b.curve(40 + i * 27, 66 + wig(i), 46 + i * 27, 76 + wig(i), 42 + i * 27, 84 + wig(i), 7) }
      break
    case 'goose': b.lay(S.web, f, { rot: wig(0) * 0.012 }); b.curve(16, 20, 50, 26, 92, 36, 5); b.curve(6, 24, 30, 40, 54, 50, 5); break
    case 'elephant':
      b.lay(S.round4, f)
      for (let i = 0; i < 4; i++) b.lay(S.small, C.white, { x: -32 + i * 28, y: 50 + wig(i) * 0.7, sx: 0.5, sy: 0.46, line: 6 })
      break
    case 'horse': b.lay(S.hoof, f, { rot: wig(0) * 0.02 }); b.lay(S.hoofTip, INK, { rot: wig(0) * 0.02, line: 4 }); b.curve(-34, -4, -20, 22, -40, 24, 8); b.curve(30, -6, 34, 20, 52, 22, 8); break
  }
  pen.restore()
}

// --- faces -------------------------------------------------------------------

function eyes(b: Brush, p: Pose, gap: number, y: number, k = 1): void {
  for (const side of [-1, 1]) {
    const x = side * gap
    if (p.eyes === 'shut') b.curve(x - 14 * k, y, x, y + 8 * k, x + 14 * k, y, 7)
    else if (p.eyes === 'happy') b.curve(x - 17 * k, y + 8, x, y - 20 * k, x + 17 * k, y + 8, 8)
    else {
      const wide = p.eyes === 'wide' ? 1.35 : 1
      b.lay(S.small, C.white, { x, y, sx: 0.74 * k * wide, sy: 0.82 * k * wide, line: 5.5 })
      const lx = p.eyes === 'cross' ? -side * 10 * k : p.lookX * 10 * k, ly = p.eyes === 'cross' ? -11 * k : p.lookY * 11 * k
      b.dot(x + lx, y + ly, 9 * k, 11 * k, INK)
    }
  }
}
function mouth(b: Brush, p: Pose, y: number, w: number): void {
  switch (p.mouth) {
    case 'smile': b.curve(-w, y, 0, y + w * 0.62, w, y, 7.5); break
    case 'shut': b.curve(-w * 0.6, y + 6, 0, y + 3, w * 0.6, y + 6, 7.5); break
    case 'o': b.lay(S.small, C.red, { y: y + 12, sx: w / 34, sy: w / 26, line: 7 }); break
    case 'grin': b.lay(S.tooth, C.red, { y: y - 4, sx: w / 40, sy: w / 30, line: 7 }); b.curve(-w * 0.6, y + 5, 0, y + 8, w * 0.6, y + 5, 8, C.white); break
    case 'wobble': b.curve(-w, y + 4, -w * 0.4, y - 12, 0, y + 6, 7.5); b.curve(0, y + 6, w * 0.4, y + 20, w, y + 2, 7.5); break
    case 'chew': b.lay(S.small, C.red, { y: y + 10, sx: 0.8, sy: 0.4, line: 7 }); b.dot(-w - 18, y - 2, 15, 13, C.pink); b.dot(w + 18, y - 2, 15, 13, C.pink); break
    case 'lick': b.curve(-w, y, 0, y + w * 0.62, w, y, 7.5); b.lay(S.small, C.red, { x: w * 0.55, y: y + 10, sx: 0.5, sy: 0.72, rot: -0.5, line: 6 }); break
    case 'peel': b.lay(S.peel, C.orange, { y: y + 4, sx: w / 48, sy: w / 40, line: 7 }); for (const x of [-18, 0, 18]) b.curve(x, y + 8, x, y + 14, x, y + 22, 4); break
  }
}


function head(b: Brush, owner: OwnerId, p: Pose): void {
  const { pen } = b, y = HEAD.y
  pen.save(); pen.translate(0, y + 80); pen.rotate(p.tilt); pen.translate(0, -y - 80)
  switch (owner) {
    case 'oma':
      b.lay(S.bun, C.white, { y: -592 }); b.lay(S.round, C.skin, { y, sx: 1.06, sy: 1 }); b.lay(S.omaHair, C.white)
      b.dot(-66, y + 26, 17, 14, C.pink); b.dot(66, y + 26, 17, 14, C.pink)
      for (const s of [-1, 1]) b.ring(s * 42, y - 6, 31, 0, 6.283, 5, C.red)
      b.curve(-11, y - 10, 0, y - 18, 11, y - 10, 5, C.red)
      eyes(b, p, 42, y - 6, 0.82); b.curve(-6, y + 14, 2, y + 32, 12, y + 20, 6); mouth(b, p, y + 46, 32); break
    case 'bear':
      for (const s of [-1, 1]) { b.lay(S.small, C.brown, { x: s * 84, y: y - 84, sx: 1.35, sy: 1.35 }); b.dot(s * 84, y - 84, 17, 17, C.pink) }
      b.lay(S.round, C.brown, { y, sx: 1.16, sy: 1.02 }); b.lay(S.muzzle, C.straw, { y: y + 42, sx: 0.92, sy: 0.92 }); b.dot(0, y + 18, 19, 13, INK)
      eyes(b, p, 46, y - 26, 0.85); mouth(b, p, y + 44, 28); break
    case 'goose': {
      b.lay(S.tuft, C.white, { y: y - 94 }); b.lay(S.round, C.white, { y, sx: 0.94, sy: 1 })
      eyes(b, p, 42, y - 26, 0.9)
      const open = p.mouth === 'o' || p.mouth === 'grin' || p.mouth === 'lick' || p.mouth === 'wobble' ? 1 : p.mouth === 'chew' ? 0.5 + 0.5 * Math.sin(p.tilt * 60) : 0.15
      b.lay(S.beakLow, C.red, { y: y + 34 + open * 16 }); b.lay(S.beak, p.mouth === 'peel' ? C.yellow : C.orange, { y: y + 32 }); break
    }
    case 'elephant': {
      const flap = Math.sin(p.tilt * 30) * 0.2 + p.arms * 0.25
      b.lay(S.ear, C.grey, { x: 92, y: y - 6, rot: -flap }); b.lay(S.ear, C.grey, { x: -92, y: y - 6, sx: -1, rot: flap })
      b.lay(S.round, C.grey, { y, sx: 1.12, sy: 1.02 }); eyes(b, p, 48, y - 22, 0.9); mouth(b, p, y + 66, 26)
      const lift = p.mouth === 'o' || p.mouth === 'grin' ? 1 : p.mouth === 'lick' ? 0.6 : 0
      b.tube(0, y + 20, 8 - lift * 70, y + 100 - lift * 30, -24 - lift * 96, y + 128 - lift * 120, 42, C.grey); break
    }
    case 'horse':
      b.lay(S.horseEar, C.white, { x: -46, y: y - 96, rot: -0.2 - p.arms * 0.2 }); b.lay(S.horseEar, C.white, { x: 46, y: y - 96, rot: 0.2 + p.arms * 0.2 })
      b.lay(S.horseHead, C.white); b.lay(S.muzzle, C.pink, { y: y + 78, sx: 0.98, sy: 0.86 }); b.lay(S.mane, C.yellow)
      eyes(b, p, 46, y - 22, 0.85); b.dot(-24, y + 60, 7, 9, INK); b.dot(24, y + 60, 7, 9, INK); mouth(b, p, y + 82, 30); break
  }
  if (p.mask > 0.03) {
    const k = p.mask
    b.lay(S.splat, C.white, { y: y - 6, sx: 1.12 * k, sy: 1.04 * k })
    if (k > 0.45) { eyes(b, { ...p, eyes: p.eyes === 'cross' ? 'wide' : p.eyes }, 42, y - 14, 0.8); mouth(b, p, y + 36, 26) }
  }
  pen.restore()
}

/** Everything of the owner behind the boot: the body, the arms, the other leg and the head. */
export function drawOwner(b: Brush, owner: OwnerId, p: Pose, ox: number): void {
  const { pen } = b, a = p.arms, skin = SKIN[owner]
  pen.save(); pen.translate(ox, 0)
  // The leg it stands on, in its other shoe.
  b.tube(-52, -60, -54, -40, -56, -26, LEG[owner] * 0.8, FOOT[owner]); b.lay(S.shoe, BOOTS[owner].body, { x: -56, y: -14, sx: -1.05 })
  const arm = (s: number): void => {
    const x0 = s * 74, y0 = -300, up = a * 2.5 + (s < 0 ? 0.1 : 0.25), L = 132
    const x1 = x0 + s * Math.sin(up + 0.25) * L, y1 = y0 + Math.cos(up + 0.25) * L
    if (owner === 'goose') { b.lay(S.wing, C.white, { x: s * 92, y: -300, sx: s, rot: -s * (0.15 + a * 1.9) }); return }
    b.tube(x0, y0, x0 + s * 44, y0 + Math.cos(up) * 60, x1, y1, owner === 'elephant' ? 54 : owner === 'bear' ? 50 : 38, ARM[owner])
    b.lay(S.small, owner === 'horse' ? INK : skin, { x: x1, y: y1, sx: 0.78, sy: 0.78 })
  }
  arm(-1)
  switch (owner) {
    case 'oma': b.lay(S.oma, C.yellow); b.lay(S.apron, C.white); b.curve(-30, -170, 0, -156, 30, -170, 7); for (const x of [-24, 0, 24]) b.dot(x, -322, 5, 5, C.red); break
    case 'bear': b.lay(S.bear, C.brown); b.lay(S.belly, C.straw, { y: -180 }); break
    case 'goose': b.lay(S.goose, C.white); b.lay(S.tooth, C.red, { y: -366, sx: 1.2, sy: 1 }); b.lay(S.tri, C.red, { y: -344, sx: 2, sy: 3 }); break
    case 'elephant': b.lay(S.elephant, C.red); for (const y of [-270, -190, -110]) b.dot(0, y, 11, 11, C.white); break
    case 'horse': b.lay(S.horse, C.white); b.lay(S.apron, C.red, { y: -70, sx: 1.2, sy: 0.75 }); b.lay(S.small, C.yellow, { y: -240, sx: 0.8, sy: 0.8 }); break
  }
  arm(1)
  head(b, owner, p)
  pen.restore()
}

/** The leg that holds the bare foot out, in front of the body. */
export function drawLeg(b: Brush, owner: OwnerId, p: Pose, ox: number): void {
  const x0 = ox + 62, y0 = -196, x1 = p.footX, y1 = p.footY + 14
  b.tube(x0, y0, (x0 + x1) / 2 - 10, Math.min(y0, y1) - 190, x1, y1, LEG[owner], owner === 'oma' ? C.skin : FOOT[owner])
  if (owner === 'oma') b.tube(x0 - 4, y0 + 6, x0 + 12, y0 - 40, x0 + 30, y0 - 74, 74, C.red)
  if (owner === 'elephant') b.tube(x0 - 4, y0 + 6, x0 + 12, y0 - 40, x0 + 34, y0 - 78, 108, C.red)
}

export function drawItem(b: Brush, i: Item): void { drawThing(b, i.id, i.x, i.y, i.rot, i.s, i.s, i.fat) }

export function drawBits(b: Brush, bits: readonly Bit[], owner: OwnerId): void {
  for (const k of bits) {
    switch (k.kind) {
      case 'juice': b.lay(S.small, C.orange, { x: k.x, y: k.y, sx: k.r / 30, sy: k.r / 26, line: 5 }); break
      case 'porridge': b.lay(S.small, C.white, { x: k.x, y: k.y, sx: k.r / 28, sy: k.r / 30, line: 6 }); break
      case 'crumb': b.lay(S.tri, C.brown, { x: k.x, y: k.y, sx: k.r / 14, sy: k.r / 14, rot: k.x, line: 4 }); break
      case 'puff': b.lay(S.roundB, C.white, { x: k.x, y: k.y, sx: k.r / 100, sy: k.r / 110, line: 6 }); break
      case 'lump': b.lay(S.small, FOOT[owner], { x: k.x, y: k.y, sx: k.r / 34, sy: k.r / 40, line: 7 }); break
      case 'moth': b.lay(S.moth, C.yellow, { x: k.x, y: k.y, sx: (k.r / 24) * (0.5 + 0.5 * Math.abs(Math.sin(k.y * 0.2))), sy: k.r / 24, line: 5 }); break
      case 'ring': b.ring(k.x, k.y, k.r, -0.5, 0.5, 8, C.yellow); b.ring(k.x, k.y, k.r, 2.64, 3.64, 8, C.yellow); break
    }
  }
}

/** A head asleep on its pillow, and the foot that sticks out of the blanket. */
export function drawSleeper(b: Brush, owner: OwnerId, x: number, y: number, t: number, awake: boolean): void {
  const { pen } = b, i = owner.length
  pen.save(); pen.translate(x, y + 10); pen.scale(0.66, 0.66); pen.rotate(Math.sin(t * 1.4 + i) * 0.03); pen.translate(0, -HEAD.y)
  head(b, owner, { ...SLEEP, eyes: awake ? 'open' : 'shut', mouth: awake ? 'o' : Math.sin(t * 1.6 + i) > 0.3 ? 'o' : 'smile', lookX: 0, lookY: 0.6 })
  pen.restore()
}
export function drawSleepingFoot(b: Brush, owner: OwnerId, x: number, y: number, t: number): void {
  const { pen } = b
  pen.save(); pen.translate(x, y); pen.scale(0.62, 0.62); drawFoot(b, owner, -4, 16, 1.25, 0.4 + 0.4 * Math.sin(t * 1.5 + x)); pen.restore()
}
const SLEEP: Pose = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, arms: 0, lookX: 0, lookY: 0, eyes: 'shut', mouth: 'smile', tilt: 0, footX: ANKLE.x, footY: ANKLE.y, footRot: 0, toes: 0, boot: { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 }, hole: 0, mask: 0 }

/** The next owner: half a face round the edge and a bare foot held out. */
export function drawPeek(b: Brush, owner: OwnerId, x: number, y: number, t: number): void {
  const { pen } = b, lean = Math.sin(t * 1.3) * 7
  pen.save(); pen.translate(x - 34 + lean, y); pen.scale(0.86, 0.86); pen.rotate(0.16); pen.translate(0, -HEAD.y)
  head(b, owner, { ...SLEEP, eyes: (t * 0.23) % 1 < 0.04 ? 'shut' : 'open', lookX: 1, lookY: 0.1 })
  pen.restore()
  pen.save(); pen.translate(x - 22 + lean, y + 178); pen.scale(0.8, 0.8)
  b.tube(-80, 40, -30, -30, 20, 0, LEG[owner], FOOT[owner]); drawFoot(b, owner, 22, -4, -0.2, 0.5 + 0.5 * Math.sin(t * 4))
  pen.restore()
}
