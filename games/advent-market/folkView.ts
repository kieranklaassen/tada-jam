import type { Pose } from './folk'
import { JOINTS, type FolkSprites } from './folkArt'
import { FOLK, type Who } from './hall'
import type { Grip } from './holds'
import { stamp, stampTurned, type Pen, type Sprite } from './paint'

// A fair-goer in a frame: its body stamped where its pose puts it, its own
// parts stamped on their joints, the thing it holds stamped where it holds
// it, and its face drawn fresh, since the eyes, the brows and the mouth are
// what answer the child. Hands back how many stamps, strokes and fills it
// took.

type Face = {
  /** Half the gap between the eyes, the eye's size, and how far a pupil can travel. */
  gap: number
  eye: number
  /** The brows: how far above the eyes, half their length, their weight and colour. */
  browUp: number
  browHalf: number
  browWide: number
  browColour: string
  /** The mouth, below the eyes by this much and this wide, or none where a scarf or a jaw is in the way. */
  mouth: { dx: number; dy: number; half: number } | null
  white: string
  pupil: string
  /** The goat's pupils are bars. */
  bar: boolean
}

const FACES: Record<Who, Face> = {
  maker: { gap: 31, eye: 11, browUp: 21, browHalf: 16, browWide: 7, browColour: '#5a3a2a', mouth: { dx: 0, dy: 52, half: 30 }, white: '#fff6e6', pupil: '#2a1a14', bar: false },
  tuba: { gap: 19, eye: 8, browUp: 15, browHalf: 17, browWide: 9, browColour: '#1c1410', mouth: { dx: 0, dy: 56, half: 13 }, white: '#f6eede', pupil: '#1c1410', bar: false },
  baker: { gap: 28, eye: 10, browUp: 19, browHalf: 13, browWide: 5, browColour: '#4a2e1e', mouth: { dx: 0, dy: 60, half: 22 }, white: '#fff6e6', pupil: '#2a1a14', bar: false },
  bundle: { gap: 22, eye: 14, browUp: 21, browHalf: 11, browWide: 5, browColour: '#4a3360', mouth: null, white: '#fffaf0', pupil: '#23161c', bar: false },
  goat: { gap: 23, eye: 12, browUp: 17, browHalf: 12, browWide: 5, browColour: '#8d7858', mouth: null, white: '#f0c84a', pupil: '#2a1a14', bar: true },
}

/**
 * What of its pose each fair-goer's drawing reads, beyond the body and the face that all of them have. The
 * tests hold the model to this: a value the model moves and the drawing does not read is a movement nobody sees.
 */
export const READS: Record<Who, readonly (keyof Pose)[]> = {
  maker: ['dy', 'lean', 'squash', 'lookX', 'lookY', 'lid', 'brow', 'mouth', 'open', 'part', 'part2', 'use', 'flame'],
  tuba: ['dy', 'lean', 'squash', 'lookX', 'lookY', 'lid', 'brow', 'mouth', 'open', 'part', 'part2', 'use'],
  baker: ['dy', 'lean', 'squash', 'lookX', 'lookY', 'lid', 'brow', 'mouth', 'open', 'part', 'part2', 'use', 'eye'],
  bundle: ['dy', 'lean', 'squash', 'lookX', 'lookY', 'lid', 'brow', 'part', 'part2', 'use', 'cross'],
  goat: ['dy', 'lean', 'squash', 'lookX', 'lookY', 'lid', 'brow', 'open', 'part', 'part2', 'use'],
}

function face(g: Pen, who: Who, pose: Pose): number {
  const f = FACES[who]
  const ex = FOLK[who].eyes.x - FOLK[who].x, ey = FOLK[who].eyes.y - FOLK[who].foot
  const open = Math.max(0.08, 1 - pose.lid)
  // One eye can grow huge: the one nearer the bench.
  const huge = (side: number) => (side > 0 ? 1 + pose.eye * 0.9 : 1)
  // The whites (the goat's are yellow), both in one fill.
  g.fillStyle = f.white
  g.beginPath()
  for (const side of [-1, 1]) { g.moveTo(ex + side * f.gap + f.eye * huge(side), ey); g.ellipse(ex + side * f.gap, ey, f.eye * huge(side), f.eye * open * huge(side), 0, 0, Math.PI * 2) }
  g.fill()
  // The pupils, which follow the piece in work, and cross when something sits between the eyes.
  const travel = f.eye * 0.5
  g.fillStyle = f.pupil
  g.beginPath()
  for (const side of [-1, 1]) {
    const px = ex + side * f.gap + pose.lookX * travel * (1 - pose.cross) - side * pose.cross * travel * 1.1, py = ey + pose.lookY * travel * open * (1 - pose.cross) - pose.cross * travel * 0.5
    if (f.bar) g.ellipse(px, py, f.eye * 0.62, f.eye * 0.26 * open, 0, 0, Math.PI * 2)
    else g.ellipse(px, py, f.eye * 0.5 * huge(side), f.eye * 0.5 * open * huge(side), 0, 0, Math.PI * 2)
  }
  g.fill()
  // The brows: raised, they lift and arch; drawn down, their inner ends drop toward the nose.
  g.strokeStyle = f.browColour
  g.lineWidth = f.browWide
  g.lineCap = 'round'
  g.beginPath()
  for (const side of [-1, 1]) {
    const bx = ex + side * f.gap, by = ey - f.browUp - Math.max(0, pose.brow) * 9
    const tilt = -Math.min(0, pose.brow) * 9
    g.moveTo(bx - side * f.browHalf, by + tilt)
    g.quadraticCurveTo(bx, by - 3 - Math.max(0, pose.brow) * 5, bx + side * f.browHalf, by - tilt * 0.4)
  }
  g.stroke()
  let ops = 3
  if (f.mouth) {
    const mx = ex + f.mouth.dx, my = ey + f.mouth.dy, half = f.mouth.half
    const curve = pose.mouth * half * 0.55
    g.beginPath()
    g.moveTo(mx - half, my - curve * 0.5)
    g.quadraticCurveTo(mx, my + curve, mx + half, my - curve * 0.5)
    if (pose.open > 0.08) {
      // Open: the lower lip drops away from the upper.
      g.quadraticCurveTo(mx, my + curve + pose.open * half * 1.1 + 4, mx - half, my - curve * 0.5)
      g.fillStyle = '#4a1c18'
      g.fill()
    } else {
      g.strokeStyle = '#5a2a22'
      g.lineWidth = 5
      g.stroke()
    }
    ops += 1
  }
  return ops
}

/** What a fair-goer is seen to hold: the thing's sprite, and where and how it holds that craft. */
export type Held = { sprite: Sprite; grip: Grip }

/** The held thing, in the body's own units: it goes where the hand takes it as the fair-goer uses it. */
function hold(g: Pen, held: Held, pose: Pose): void {
  const grip = held.grip, to = grip.to, u = Math.min(1, Math.max(0, pose.use))
  const x = grip.x + ((to?.x ?? grip.x) - grip.x) * u, y = grip.y + ((to?.y ?? grip.y) - grip.y) * u
  stampTurned(g, held.sprite, x, y, grip.rot + (to?.rot ?? 0) * pose.use, grip.scale, grip.scale * (grip.flat ?? 1))
}

/** Where the goat's tongue comes out, at the front of its mouth, in its body's own units, and its colour. */
export const TONGUE = { x: 112, y: -60, reach: 30, colour: '#e8848c' } as const

/**
 * `lick` is how far through a lick of its lips the goat is, 0 to 1, or -1 when its tongue is in: the tongue comes
 * out at the front of its mouth, goes along its upper lip to the tip of the muzzle and is drawn in again.
 */
export function drawFellow(g: Pen, sprites: FolkSprites, who: Who, pose: Pose, held: Held | null = null, lick = -1): number {
  const at = FOLK[who]
  let ops = held ? 1 : 0
  const layer = held ? held.grip.layer : -1
  g.save()
  g.translate(at.x, at.foot + pose.dy)
  g.rotate(pose.lean)
  g.scale(1 + (1 - pose.squash) * 0.7, pose.squash)
  switch (who) {
    case 'maker':
      stamp(g, sprites.maker, 0, 0)
      if (held && layer < 2) hold(g, held, pose)
      // Her fist curls and uncurls on its elbow, round whatever is in it.
      stampTurned(g, sprites.fist, JOINTS.fist.x, JOINTS.fist.y, -0.05 - pose.part * 0.3, 1 - pose.part * 0.1, 1)
      ops += 2
      break
    case 'tuba': {
      stampTurned(g, sprites.bell, JOINTS.bell.x, JOINTS.bell.y, pose.part2 * 0.16)
      // What lies in the bell or over it is behind him.
      if (held && layer === 0) hold(g, held, pose)
      stamp(g, sprites.tuba, 0, 0)
      // His cheeks, which fill before a note, and his three fingers, which work the valves.
      const c = JOINTS.cheeks, puff = 9 + Math.max(0, pose.part) * 10
      g.fillStyle = '#dc9a7e'
      g.beginPath()
      for (const side of [-1, 1]) { g.moveTo(c.x + side * c.gap + puff, c.y); g.ellipse(c.x + side * c.gap, c.y, puff, puff * 0.9, 0, 0, Math.PI * 2) }
      for (let k = 0; k < 3; k++) {
        // His fingers lie on the tube where it climbs to the bell, and drum on it.
        const fx = -84 + k * 3 + Math.sin(pose.use * 3 + k * 2.1) * 6 * Math.min(1, Math.abs(pose.use) * 3), fy = -292 - k * 19
        g.moveTo(fx + 6, fy)
        g.arc(fx, fy, 6.5, 0, Math.PI * 2)
      }
      g.fill()
      ops += 3
      break
    }
    case 'baker':
      stamp(g, sprites.baker, 0, 0)
      if (held && layer < 2) hold(g, held, pose)
      stampTurned(g, sprites.hat, JOINTS.hat.x, JOINTS.hat.y, pose.part2 * 0.3 + pose.lean * -1.5)
      ops += 2
      break
    case 'bundle':
      stamp(g, sprites.bundle, 0, 0)
      stamp(g, sprites.pompom, JOINTS.pompom.x + pose.part * 12, JOINTS.pompom.y - Math.abs(pose.part) * 3)
      if (held && layer < 2) hold(g, held, pose)
      stampTurned(g, sprites.mitten, -JOINTS.mitten.x, JOINTS.mitten.y - pose.part2 * 30, -0.3 - pose.part2 * 0.2)
      stampTurned(g, sprites.mitten, JOINTS.mitten.x, JOINTS.mitten.y - pose.part2 * 30, 0.3 + pose.part2 * 0.2, -1, 1)
      ops += 4
      break
    case 'goat':
      stampTurned(g, sprites.ear, JOINTS.earRight.x, JOINTS.earRight.y, 0.5 - pose.part2 * 0.55, -1, 1)
      // The jaw swings open about its hinge, under the muzzle, and slides a little from side to side as it chews.
      stampTurned(g, sprites.jaw, JOINTS.jaw.x + pose.part * 5, JOINTS.jaw.y, 0.1 + pose.open * 0.5)
      stamp(g, sprites.goat, 0, 0)
      // What it has in its mouth lies between its teeth, in front of the muzzle.
      if (held && layer < 2) hold(g, held, pose)
      if (lick >= 0 && lick < 1) {
        // Out and in again: longest in the middle of the lick, and never a shape with an end to read.
        const out = Math.sin(lick * Math.PI)
        g.fillStyle = TONGUE.colour
        g.beginPath()
        g.ellipse(TONGUE.x + lick * TONGUE.reach, TONGUE.y - out * 7, 7 + out * 9, 4 + out * 4, -0.25, 0, Math.PI * 2)
        g.fill()
        ops += 1
      }
      stampTurned(g, sprites.ear, JOINTS.earLeft.x, JOINTS.earLeft.y, -0.25 + pose.part2 * 0.55)
      ops += 4
      break
  }
  ops += face(g, who, pose)
  // His moustache sits over his mouth, so it goes on after the face.
  if (who === 'baker') {
    stampTurned(g, sprites.moustache, JOINTS.moustache.x, JOINTS.moustache.y, pose.part * 0.12, 1, 1 + Math.abs(pose.part) * 0.12)
    ops += 1
  }
  if (held && layer === 2) hold(g, held, pose)
  g.restore()
  return ops
}

/** How many of a fair-goer's drawing are sprite stamps, with nothing in its hands. */
export const BODY_STAMPS: Record<Who, number> = { maker: 2, tuba: 2, baker: 3, bundle: 4, goat: 4 }
