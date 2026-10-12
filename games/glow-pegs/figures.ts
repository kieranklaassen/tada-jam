import { BOARD } from './board'
import { GECKO, HANDLE, SPIDER, SPIDER_PLACE, spiderAt } from './layout'
import type { GeckoPose, SpiderPose } from './motion'
import type { Moth } from './moth'
import { INK, fillBlack, fillInk, glow, ring, type Ctx } from './pen'

/** What to draw of a watcher: all of it, all but its pupils (for the drawing that is stamped while it rests), or its pupils alone. */
export type Part = 'all' | 'body' | 'pupils'

// The three who live in the cabinet, drawn each frame as lines from their
// poses. Each body is filled black first so the wall behind does not show
// through it. The spider and the gecko are large; the moth is small.

type Look = { x: number; y: number }

/** A pupil's offset: towards where the watcher looks, no further than `reach`. */
function gaze(fromX: number, fromY: number, look: Look, reach: number): { x: number; y: number } {
  const dx = look.x - fromX, dy = look.y - fromY
  const far = Math.hypot(dx, dy) || 1
  const pull = Math.min(1, far / 160) * reach
  return { x: (dx / far) * pull, y: (dy / far) * pull }
}

/** Half the width of the line a leg is drawn with, and a little more. */
const LEG_LINE = 2

export function drawSpider(ctx: Ctx, pose: SpiderPose, look: Look, halo: number, part: Part = 'all', jolt = 0): void {
  const middle = spiderAt(pose.drop, pose.swing)
  const x = middle.x, y = middle.y + jolt
  const wide = 1 + pose.squash * 0.6, tall = 1 - pose.squash
  const headY = y - 36 * tall, eyeY = headY - 2
  const eyes = [-1, 1].map((s) => ({ x: x + s * (15 + 11 * pose.eyeSpread) + pose.shake * 22, y: eyeY }))
  if (part === 'pupils') return spiderPupils(ctx, eyes, look)
  // Its legs stay in its own place: on the side where the body has swung near the board's frame, or near the
  // edge of the stage, it draws them in by as much as there is no room for, so no foot is ever over the board.
  const reach = 90 * wide + LEG_LINE
  const gather = [Math.min(1, Math.max(0, x - SPIDER_PLACE.left) / reach), Math.min(1, Math.max(0, SPIDER_PLACE.right - x) / reach)]
  const side = (s: number) => s * wide * gather[s < 0 ? 0 : 1]
  // The thread it hangs by, and the strand under its foot that runs to the bezel.
  const foot = { x: x + 81 * side(1), y: y - 20 * tall }
  const corner = { x: BOARD.x - 14, y: BOARD.y + 6 }
  ctx.beginPath()
  ctx.moveTo(SPIDER.x, SPIDER.anchorY)
  ctx.lineTo(x, headY - 30)
  ctx.moveTo(foot.x, foot.y)
  ctx.quadraticCurveTo((foot.x + corner.x) / 2 + 9 * pose.strand, (foot.y + corner.y) / 2, corner.x, corner.y)
  glow(ctx, INK.web, 1.4, 0)
  // Eight legs: four a side, each a thigh and a shin. The front pair can drum, and can cover the eyes.
  ctx.beginPath()
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const lift = i < 2 ? pose.feet[i * 2 + (s < 0 ? 0 : 1)] : 0
      const kx = x + (58 + i * 6) * side(s), ky = y + (-44 + i * 24) * tall - lift * 10
      const fx = x + (90 - Math.abs(i - 1.5) * 9) * side(s), fy = y + (-62 + i * 42) * tall - lift * 24
      // A front leg that is over the eyes is drawn last, over the face.
      if (i === 0 && pose.cover > 0.05) continue
      ctx.moveTo(x + s * 30 * wide, y + (-8 + i * 10) * tall)
      ctx.lineTo(kx, ky)
      ctx.lineTo(fx, fy)
    }
  }
  // Limbs are thin lines with no wide pass under them: the body carries the glow.
  glow(ctx, INK.spider, 3, 0)
  // The body: a round abdomen and a round head.
  ctx.beginPath()
  ctx.ellipse(x, y + 16 * tall, 44 * wide, 46 * tall, 0, 0, Math.PI * 2)
  ctx.moveTo(x + 30 * wide, headY)
  ctx.ellipse(x, headY, 30 * wide, 27 * tall, 0, 0, Math.PI * 2)
  fillBlack(ctx)
  glow(ctx, INK.spider, 3.2, halo)
  // Two big eyes that follow the finger, a mouth, and two small fangs.
  ctx.beginPath()
  for (const eye of eyes) ring(ctx, eye.x, eye.y, 11.5)
  const dazzled = pose.cover > 0.3
  if (dazzled) ring(ctx, x + pose.shake * 22, headY + 17, 4)
  else {
    ctx.moveTo(x - 9 + pose.shake * 22, headY + 14)
    ctx.quadraticCurveTo(x + pose.shake * 22, headY + 21, x + 9 + pose.shake * 22, headY + 14)
  }
  for (const eye of eyes) {
    if (pose.lids > 0.05) {
      // A lid is a line that comes down across the eye.
      const drop = -11.5 + 23 * pose.lids * 0.75
      const half = Math.sqrt(Math.max(0, 11.5 * 11.5 - drop * drop))
      ctx.moveTo(eye.x - half, eye.y + drop)
      ctx.lineTo(eye.x + half, eye.y + drop)
    }
  }
  glow(ctx, INK.hand, 2, 0)
  if (part === 'all' && pose.lids < 0.7 && pose.cover < 0.6) spiderPupils(ctx, eyes, look)
  if (pose.cover > 0.05) {
    // Too bright: the two front legs come up over the face and a round foot sits on each eye. A peek slides them off a little.
    const c = pose.cover
    const legs = [-1, 1].map((s) => {
      const eye = eyes[s < 0 ? 0 : 1]
      const restK = { x: x + 58 * side(s), y: y - 44 * tall }, restF = { x: x + 76.5 * side(s), y: y - 62 * tall }
      return {
        sx: x + s * 30 * wide, sy: y - 8 * tall,
        kx: restK.x + (x + s * 50 - restK.x) * c, ky: restK.y + (headY - 30 - restK.y) * c,
        fx: restF.x + (eye.x + s * 2 - restF.x) * c, fy: restF.y + (eye.y - restF.y) * c,
      }
    })
    ctx.beginPath()
    for (const leg of legs) ring(ctx, leg.fx, leg.fy, 12.5)
    fillBlack(ctx)
    for (const leg of legs) {
      ctx.moveTo(leg.sx, leg.sy)
      ctx.lineTo(leg.kx, leg.ky)
      ctx.lineTo(leg.fx, leg.fy - 12.5)
    }
    glow(ctx, INK.spider, 3, halo)
  }
}

function spiderPupils(ctx: Ctx, eyes: { x: number; y: number }[], look: Look): void {
  ctx.beginPath()
  for (const eye of eyes) {
    const at = gaze(eye.x, eye.y, look, 5.5)
    ring(ctx, eye.x + at.x, eye.y + at.y + 1, 4.6)
  }
  fillInk(ctx, INK.hand)
}

/** Where the gecko's pupils are: following its gaze, turned in to its nose, or rolling round the eye. */
function geckoPupils(ctx: Ctx, eyes: { x: number; y: number }[], pose: GeckoPose, look: Look): void {
  ctx.beginPath()
  let any = false
  eyes.forEach((eye, i) => {
    if (pose.lids[i] > 0.5) return
    const at = gaze(eye.x, eye.y, look, 5)
    const side = i === 0 ? 1 : -1
    let dx = at.x + (side * 6 - at.x) * pose.cross, dy = at.y + (-6 - at.y) * pose.cross
    dx += (Math.cos(pose.roll) * 6.5 - dx) * pose.rolling
    dy += (Math.sin(pose.roll) * 6.5 - dy) * pose.rolling
    ctx.moveTo(eye.x + dx, eye.y + dy - 6.5)
    ctx.ellipse(eye.x + dx, eye.y + dy, 2 + 3 * pose.pupil, 6.5, 0, 0, Math.PI * 2)
    any = true
  })
  if (any) fillInk(ctx, INK.hand)
}

/** `neck` is how far the gecko's head leans towards the warm pegs. */
export function drawGecko(ctx: Ctx, pose: GeckoPose, look: Look, halo: number, neck: Look, part: Part = 'all'): void {
  const x = GECKO.x + pose.tremble, top = 150 + pose.slide
  // The head is thrown back, up the wall, by a nod, and stretched on its neck towards the warm pegs; the body stays where it grips.
  const head = top - pose.nod + neck.y, hx = x + neck.x
  const eyes = [-1, 1].map((s) => ({ x: hx + s * 25, y: head + 40 }))
  if (part === 'pupils') return geckoPupils(ctx, eyes, pose, look)
  const leg = (side: number, at: number, up: number, lifted: number) => {
    // An upper leg out from the body, a lower leg to the wall, and a foot of three round toes.
    const sx = x + side * 24, sy = top + at
    const swing = lifted * 0.9
    const kx = sx + side * 20, ky = sy + up * 16 - lifted * 12
    const fx = kx + side * (10 + 8 * Math.cos(swing)), fy = ky + up * (16 - 30 * Math.sin(swing))
    ctx.moveTo(sx, sy)
    ctx.lineTo(kx, ky)
    ctx.lineTo(fx, fy)
    for (const spread of [-0.7, 0, 0.7]) {
      const a = (side > 0 ? 0 : Math.PI) + spread + up * 0.5 * side
      ctx.moveTo(fx, fy)
      ctx.lineTo(fx + Math.cos(a) * 11, fy + Math.sin(a) * 11)
      ring(ctx, fx + Math.cos(a) * 14, fy + Math.sin(a) * 14, 3)
    }
  }
  ctx.beginPath()
  leg(-1, 108, -1, 0)
  leg(1, 108, -1, pose.slip)
  leg(-1, 250, 1, 0)
  leg(1, 250, 1, 0)
  glow(ctx, INK.gecko, 2.6, 0)
  // One outline from the snout down the left side, round the tail's tip and back up the right.
  const curl = pose.curl, tipX = x + 58 * curl + Math.sin(pose.wag) * 70, tipY = top + 408 - 78 * Math.abs(curl) - Math.abs(Math.sin(pose.wag)) * 14
  const bendX = x + 30 * curl + Math.sin(pose.wag) * 36, bendY = top + 350
  ctx.beginPath()
  ctx.moveTo(hx, head)
  ctx.bezierCurveTo(hx - 30, head, hx - 40, head + 30, hx - 36, head + 50)
  ctx.bezierCurveTo(hx - 30, head + 72, x - 20, top + 76, x - 22, top + 92)
  ctx.bezierCurveTo(x - 36, top + 130, x - 36, top + 200, x - 20, top + 262)
  ctx.quadraticCurveTo(bendX - 14, bendY, tipX, tipY)
  ctx.quadraticCurveTo(bendX + 14, bendY, x + 20, top + 262)
  ctx.bezierCurveTo(x + 36, top + 200, x + 36, top + 130, x + 22, top + 92)
  ctx.bezierCurveTo(x + 20, top + 76, hx + 30, head + 72, hx + 36, head + 50)
  ctx.bezierCurveTo(hx + 40, head + 30, hx + 30, head, hx, head)
  fillBlack(ctx)
  glow(ctx, INK.gecko, 3, halo)
  // The belly's bands, which glow when it basks.
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const y = top + 112 + i * 26, half = 20 - Math.abs(i - 2) * 2.5
    ctx.moveTo(x - half, y)
    ctx.quadraticCurveTo(x, y + 7, x + half, y)
  }
  glow(ctx, pose.belly > 0.1 ? INK.bulb : INK.gecko, 1.6 + 1.6 * pose.belly, halo * pose.belly, 0.45 + 0.55 * pose.belly)
  // Eyes on the sides of the head, a mouth at the snout, and a tongue that reaches its own eye.
  ctx.beginPath()
  for (const eye of eyes) ring(ctx, eye.x, eye.y, 13)
  eyes.forEach((eye, i) => {
    if (pose.lids[i] > 0.5) {
      ctx.moveTo(eye.x - 10, eye.y + 2)
      ctx.quadraticCurveTo(eye.x, eye.y + 9, eye.x + 10, eye.y + 2)
    }
  })
  if (pose.mouth > 0.08) {
    ctx.moveTo(hx + 9, head + 14)
    ctx.ellipse(hx, head + 14, 9, 2 + 9 * pose.mouth, 0, 0, Math.PI * 2)
  } else {
    ctx.moveTo(hx - 10, head + 12)
    ctx.quadraticCurveTo(hx, head + 18, hx + 10, head + 12)
  }
  glow(ctx, INK.hand, 2, 0)
  if (part === 'all') geckoPupils(ctx, eyes, pose, look)
  if (pose.tongue > 0.02) {
    const t = pose.tongue
    ctx.beginPath()
    ctx.moveTo(hx, head + 14)
    ctx.quadraticCurveTo(hx + 54 * t, head - 22 * t, hx + 25 * t, head + 14 + 22 * t)
    glow(ctx, '#ff8fa8', 3.4, 0)
  }
}

/** How large the moth is drawn: folded small where it sits, so that it covers no peg and no hole mark, and half as large again in the air. */
export const MOTH_SIZE = { resting: 0.8, flying: 1.3 } as const

/** The moth: two round fore wings and two hind wings, solid and dusky with a bright edge, a fat white body, and two antennae. */
export function drawMoth(ctx: Ctx, moth: Moth, halo: number): void {
  const flying = moth.flying
  const k = flying ? MOTH_SIZE.flying : MOTH_SIZE.resting
  const cos = Math.cos(moth.heading), sin = Math.sin(moth.heading)
  /** A point given along the body, forward of its middle, and across it. */
  const at = (along: number, across: number): [number, number] => [moth.x + (cos * along - sin * across) * k, moth.y + (sin * along + cos * across) * k]
  // The wings swing out from lying back along the body (shut) to a little forward of square (wide) in the air; sitting, they stay half folded.
  const a = flying ? 0.3 + 1.6 * moth.wingOpen : 0.3 + 0.9 * moth.wingOpen
  /** A point of a wing: `r` out from its shoulder, `turn` further round than the wing itself. */
  const wing = (side: number, shoulder: number, r: number, turn: number): [number, number] => at(shoulder - r * Math.cos(a + turn), side * (2 + r * Math.sin(a + turn)))
  ctx.beginPath()
  for (const side of [-1, 1]) {
    // A round fore wing and a smaller hind wing behind it.
    ctx.moveTo(...at(5, side * 2))
    ctx.quadraticCurveTo(...wing(side, 5, 27, 0.5), ...wing(side, 5, 21, 0))
    ctx.quadraticCurveTo(...wing(side, 5, 19, -0.75), ...at(-1, side * 2))
    ctx.quadraticCurveTo(...wing(side, -1, 15, -0.35), ...wing(side, -1, 12, -0.8))
    ctx.quadraticCurveTo(...wing(side, -1, 9, -1.3), ...at(-7, side * 1.5))
  }
  // The wings are solid, a dusky lilac, so the board behind does not show through them.
  fillInk(ctx, '#4b3d78')
  // Two antennae that curl outward, forward of the head.
  for (const side of [-1, 1]) {
    ctx.moveTo(...at(8, side * 1.5))
    ctx.quadraticCurveTo(...at(15, side * 2), ...at(15, side * 8))
  }
  glow(ctx, INK.moth, 2.2 * Math.sqrt(k), halo)
  // A fat body, solid.
  ctx.beginPath()
  ctx.ellipse(moth.x, moth.y, 9.5 * k, 4.6 * k, moth.heading, 0, Math.PI * 2)
  fillInk(ctx, '#ffffff')
}

/** The tray's handle: a solid amber bob on a short cord, drawn where the finger has pulled it. Like the lever's knob it is a solid thing to take hold of. */
export function drawHandle(ctx: Ctx, pull: number, wiggle: number, glint = 0): void {
  const x = HANDLE.x + wiggle, y = HANDLE.y + pull
  ctx.beginPath()
  ctx.moveTo(HANDLE.x, HANDLE.top + 8)
  ctx.quadraticCurveTo(HANDLE.x + wiggle * 0.4, (HANDLE.top + y) / 2, x, y - 20)
  glow(ctx, INK.touch, 3.4, 0)
  // The bob: a fat drop, narrow where the cord holds it.
  ctx.beginPath()
  ctx.moveTo(x, y - 24)
  ctx.bezierCurveTo(x + 42, y + 2, x + 32, y + 40, x, y + 40)
  ctx.bezierCurveTo(x - 32, y + 40, x - 42, y + 2, x, y - 24)
  fillInk(ctx, INK.touch)
  // Its glint, which flares while the handle rattles: larger, whiter, and still inside the bob.
  ctx.beginPath()
  ctx.ellipse(x - 12 + 4 * glint, y + 8, 8 + 6 * glint, 4.5 + 3 * glint, -0.8, 0, Math.PI * 2)
  fillInk(ctx, glint > 0 ? '#ffffff' : '#fff0cf', 0.85 + 0.15 * glint)
}

/** The ghost hand: a white outline of a pointing hand whose fingertip is at the point. */
export function drawHand(ctx: Ctx, x: number, y: number, press: number, opacity: number): void {
  const s = 1 - 0.1 * press
  ctx.beginPath()
  // The finger, up and to the left of the palm.
  ctx.moveTo(x - 6 * s, y + 4 * s)
  ctx.arc(x, y + 6 * s, 7 * s, Math.PI, 0)
  ctx.lineTo(x + 7 * s, y + 30 * s)
  ctx.bezierCurveTo(x + 30 * s, y + 30 * s, x + 34 * s, y + 46 * s, x + 30 * s, y + 62 * s)
  ctx.bezierCurveTo(x + 24 * s, y + 78 * s, x - 4 * s, y + 78 * s, x - 10 * s, y + 62 * s)
  ctx.lineTo(x - 22 * s, y + 42 * s)
  ctx.bezierCurveTo(x - 24 * s, y + 34 * s, x - 14 * s, y + 32 * s, x - 7 * s, y + 40 * s)
  ctx.closePath()
  fillBlack(ctx, opacity)
  glow(ctx, INK.hand, 2.4, 0, opacity)
}
