import { describe, expect, it } from 'vitest'
import { paintCreature, POSES, SIZE } from './creatures'
import type { CreatureKind } from './creatures'
import { DUNG_FLY, EYE, FLY, RAIDER } from './palette'

// The painters need no canvas to be checked: a stand-in context takes every call, remembers its name and its
// numbers, and follows the drawing frame, so that it also knows where on the stage every painted path lies.
//
// What the bounds cover: every path that is filled or stroked, built from moveTo, lineTo, the two curves (walked
// in eight steps), arc and ellipse (walked round their sweep) and arcTo (by its two corner points, which lie a
// little outside the rounded corner), under save, restore, translate, rotate, scale, transform and setTransform; a
// stroke counts half its line width more on every side. What they do not cover: a clip is ignored, so a shape cut
// by one counts whole, and rect, fillRect and images are not followed, because no painter uses them. The bounds
// can therefore be a little too wide and never too narrow.
//
// It also remembers the colour of every fill, so that a test can ask whether the brush of an eye was used at all.

type Bounds = { left: number; right: number; top: number; bottom: number }

function standIn(): { ctx: CanvasRenderingContext2D; calls: string[]; seen: string[]; fills: string[]; bounds: Bounds } {
  const calls: string[] = []
  const seen: string[] = []
  const fills: string[] = []
  let colour = ''
  const bounds: Bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  let m = [1, 0, 0, 1, 0, 0]
  let width = 1
  const saved: { m: number[]; width: number }[] = []
  let path: [number, number][] = []
  let at: [number, number] = [0, 0]
  const add = (x: number, y: number) => {
    path.push([m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]])
    at = [x, y]
  }
  const mul = (a: number, b: number, c: number, d: number, e: number, f: number) => {
    m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]
  }
  const sweep = (x: number, y: number, rx: number, ry: number, turn: number, from: number, to: number, back = false) => {
    let span = to - from
    if (back) span = span <= -Math.PI * 2 ? -Math.PI * 2 : span > 0 ? span - Math.PI * 2 * Math.ceil(span / (Math.PI * 2)) : span
    else span = span >= Math.PI * 2 ? Math.PI * 2 : span < 0 ? span + Math.PI * 2 * Math.ceil(-span / (Math.PI * 2)) : span
    for (let i = 0; i <= 32; i++) {
      const a = from + (span * i) / 32
      const px = Math.cos(a) * rx
      const py = Math.sin(a) * ry
      add(x + px * Math.cos(turn) - py * Math.sin(turn), y + px * Math.sin(turn) + py * Math.cos(turn))
    }
  }
  const paint = (grow: number) => {
    for (const [x, y] of path) {
      bounds.left = Math.min(bounds.left, x - grow)
      bounds.right = Math.max(bounds.right, x + grow)
      bounds.top = Math.min(bounds.top, y - grow)
      bounds.bottom = Math.max(bounds.bottom, y + grow)
    }
  }
  const does: Record<string, (...n: number[]) => unknown> = {
    save: () => saved.push({ m, width }),
    restore: () => {
      const s = saved.pop()
      if (s) ({ m, width } = s)
    },
    translate: (x, y) => mul(1, 0, 0, 1, x, y),
    rotate: (a) => mul(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0),
    scale: (x, y) => mul(x, 0, 0, y, 0, 0),
    transform: (a, b, c, d, e, f) => mul(a, b, c, d, e, f),
    setTransform: (a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) => {
      m = [a, b, c, d, e, f]
    },
    getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }),
    beginPath: () => {
      path = []
    },
    moveTo: (x, y) => add(x, y),
    lineTo: (x, y) => add(x, y),
    quadraticCurveTo: (cx, cy, x, y) => {
      const [x0, y0] = at
      for (let i = 1; i <= 8; i++) {
        const t = i / 8
        add((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y)
      }
    },
    bezierCurveTo: (ax, ay, bx, by, x, y) => {
      const [x0, y0] = at
      for (let i = 1; i <= 8; i++) {
        const t = i / 8
        const u = 1 - t
        add(u ** 3 * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t ** 3 * x, u ** 3 * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t ** 3 * y)
      }
    },
    arc: (x, y, r, from, to, back) => sweep(x, y, r, r, 0, from, to, !!back),
    ellipse: (x, y, rx, ry, turn, from, to, back) => sweep(x, y, rx, ry, turn, from, to, !!back),
    arcTo: (x1, y1, x2, y2) => {
      add(x1, y1)
      add(x2, y2)
    },
    fill: () => {
      fills.push(colour)
      paint(0)
    },
    stroke: () => paint((width / 2) * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]))),
  }
  const ctx = new Proxy(
    {},
    {
      get:
        (_, name) =>
        (...n: number[]) => {
          calls.push(String(name))
          seen.push(`${String(name)} ${n.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)).join(' ')}`)
          return does[String(name)]?.(...n)
        },
      set: (_, name, value) => {
        if (name === 'lineWidth') width = value
        if (name === 'fillStyle') colour = String(value)
        return true
      },
    },
  ) as unknown as CanvasRenderingContext2D
  return { ctx, calls, seen, fills, bounds }
}

/** What a pose paints, at rest and a while later. */
function painted(kind: CreatureKind, pose: string, t: number) {
  const s = standIn()
  paintCreature(s.ctx, kind, pose, { x: 0.4, y: -0.6 }, t)
  return s
}

const KINDS = Object.keys(POSES) as CreatureKind[]
const TIMES = [0, 0.3, 1.7, 2.9]

/** The poses that are two frames of one movement: flipping between them must change the picture. */
const PARTNERS: [CreatureKind, string, string][] = [
  ['ant', 'walk1', 'walk2'],
  ['worker', 'walk', 'walk2'],
  ['raider', 'walk', 'walk2'],
  ['raider', 'stuck', 'stuck2'],
  ['raider', 'nap', 'nap2'],
  ['beetle', 'walk', 'walk2'],
  ['beetle', 'onBack', 'onBack2'],
  ['fly', 'hands', 'hands2'],
  ['fly', 'fly', 'fly2'],
  ['dungBeetle', 'polish', 'polish2'],
  ['dungBeetle', 'walk', 'walk2'],
  ['dungFly', 'point', 'point2'],
  ['dungFly', 'fly', 'fly2'],
  ['queen', 'wedged', 'wedged2'],
  ['queen', 'sit', 'sit2'],
  ['beetle', 'lean', 'strain'],
  ['beetle', 'eat', 'burp'],
  ['fly', 'taste', 'tasteFoot'],
  ['dungBeetle', 'onBack', 'onBack2'],
  ['dungFly', 'conduct', 'conduct2'],
  ['dungFly', 'weep', 'weep2'],
  ['queen', 'eggDown', 'eggDown2'],
]

/** The poses of a raid that goes wrong, added after the others; the last of each of the first three is its duck. */
const RAID: [CreatureKind, string[]][] = [
  ['raider', ['buried', 'balled', 'flat', 'shrug', 'lie', 'climb', 'duck']],
  ['beetle', ['eat', 'burp', 'blind', 'strain', 'sit', 'fall', 'duck']],
  ['fly', ['taste', 'tasteFoot', 'gummed', 'tumble', 'peer', 'dodge', 'duck']],
  ['dungBeetle', ['duck', 'heave', 'lost', 'onBack', 'onBack2']],
  ['dungFly', ['duck', 'conduct', 'conduct2', 'down', 'tumble', 'arms', 'weep', 'weep2']],
]

/** The poses added last of all: a duck for every invader, the dung beetle's and the dung fly's, and the queen's. */
const NEW: [CreatureKind, string[]][] = [
  ['raider', ['duck']],
  ['beetle', ['duck']],
  ['fly', ['duck']],
  ['dungBeetle', ['duck', 'heave', 'lost', 'onBack', 'onBack2']],
  ['dungFly', ['duck', 'conduct', 'conduct2', 'down', 'tumble', 'arms', 'weep', 'weep2']],
  ['queen', ['eggDown', 'eggDown2']],
]

/** What only an eye is painted with: its white, or the tint a kind has for it; its pupil; the wash of a shut lid. */
const LID_WASH = 'rgba(255,255,255,0.2)'
const EYE_COLOURS: Partial<Record<CreatureKind, string[]>> = {
  raider: [EYE.pupil, LID_WASH, EYE.white, RAIDER.eye],
  beetle: [EYE.pupil, LID_WASH, EYE.white],
  fly: [EYE.pupil, LID_WASH, EYE.white, FLY.eye],
  dungBeetle: [EYE.pupil, LID_WASH, EYE.white],
  dungFly: [EYE.pupil, LID_WASH, EYE.white, DUNG_FLY.eye],
}

describe('the creatures', () => {
  it('have the sizes the ground was cut for', () => {
    expect(SIZE).toEqual({
      ant: { width: 112, height: 28 },
      queen: { width: 120, height: 72 },
      worker: { width: 84, height: 24 },
      raider: { width: 118, height: 28 },
      beetle: { width: 124, height: 56 },
      fly: { width: 118, height: 56 },
      dungBeetle: { width: 124, height: 56 },
      dungBall: { width: 84, height: 84 },
      dungFly: { width: 118, height: 56 },
    })
  })

  it('have the poses the scenes ask for, the first ones in their old order', () => {
    expect(KINDS).toHaveLength(9)
    expect(POSES.ant).toEqual(['stand', 'dig', 'look', 'walk1', 'walk2', 'carry', 'wait'])
    expect(POSES.queen).toEqual(['wedged', 'sit', 'wedged2', 'sit2', 'eggDown', 'eggDown2'])
    expect(POSES.worker).toEqual(['walk', 'carry', 'hips', 'walk2'])
    expect(POSES.raider.slice(0, 7)).toEqual(['pillow', 'walk', 'stuck', 'nap', 'walk2', 'stuck2', 'nap2'])
    expect(POSES.beetle.slice(0, 6)).toEqual(['napkin', 'walk', 'onBack', 'lean', 'walk2', 'onBack2'])
    expect(POSES.fly.slice(0, 5)).toEqual(['hands', 'fly', 'bump', 'hands2', 'fly2'])
    expect(POSES.dungBeetle.slice(0, 6)).toEqual(['polish', 'push', 'sit', 'polish2', 'walk', 'walk2'])
    expect(POSES.dungBall).toEqual(['plain', 'sandy'])
    expect(POSES.dungFly.slice(0, 4)).toEqual(['point', 'fly', 'point2', 'fly2'])
  })

  for (const kind of KINDS) {
    for (const pose of POSES[kind]) {
      it(`paints ${kind} in pose ${pose} with shapes and no writing`, () => {
        for (const t of TIMES) {
          const s = standIn()
          expect(() => paintCreature(s.ctx, kind, pose, { x: 0.4, y: -0.6 }, t)).not.toThrow()
          expect(s.calls).toContain('fill')
          expect(s.calls).not.toContain('fillText')
          expect(s.calls).not.toContain('strokeText')
          // Whatever a painter saves it gives back, so the caller's frame is as it left it.
          expect(s.calls.filter((c) => c === 'save')).toHaveLength(s.calls.filter((c) => c === 'restore').length)
          expect(Number.isFinite(s.bounds.top) && Number.isFinite(s.bounds.left)).toBe(true)
        }
      })
    }
  }

  it('has the poses of the raid after the old ones, each a picture of its own', () => {
    expect(POSES.raider.slice(7)).toEqual(RAID[0][1])
    expect(POSES.beetle.slice(6)).toEqual(RAID[1][1])
    expect(POSES.fly.slice(5)).toEqual(RAID[2][1])
    expect(POSES.dungBeetle.slice(6)).toEqual(RAID[3][1])
    expect(POSES.dungFly.slice(4)).toEqual(RAID[4][1])
    for (const [kind, poses] of RAID) {
      const pictures = POSES[kind].map((pose) => painted(kind, pose, 0).seen.join('\n'))
      expect(new Set(pictures).size, kind).toBe(POSES[kind].length)
      expect(poses.every((pose) => POSES[kind].includes(pose))).toBe(true)
    }
  })

  // A raid pose stays in the box of its kind: no higher than 62 above its feet, which is the two cells of the
  // tallest box and six more, and no further to either side than half the box and ten more for a horn, a jaw or
  // the tip of a wing. A raider is only one cell high, so it keeps lower still. The same bounds, with the same
  // limits: see the head of the file.
  for (const [kind, poses] of RAID) {
    for (const pose of poses) {
      it(`keeps ${kind} in the raid pose ${pose} within its box`, () => {
        for (const t of TIMES) {
          const { bounds } = painted(kind, pose, t)
          expect(bounds.top, `t = ${t}`).toBeGreaterThanOrEqual(kind === 'raider' ? -40 : -62)
          expect(bounds.left, `t = ${t}`).toBeGreaterThanOrEqual(-SIZE[kind].width / 2 - 10)
          expect(bounds.right, `t = ${t}`).toBeLessThanOrEqual(SIZE[kind].width / 2 + 10)
          expect(bounds.bottom, `t = ${t}`).toBeLessThanOrEqual(8)
        }
      })
    }
  }

  // Every pose added last is in the list of its kind, paints at every time with shapes alone and gives back what
  // it saves, and is a picture of its own: not the kind's first pose, which is what a name nobody knows would get,
  // and not any other pose of the kind.
  for (const [kind, poses] of NEW) {
    for (const pose of poses) {
      it(`paints ${kind} in the new pose ${pose} as a picture of its own`, () => {
        expect(POSES[kind]).toContain(pose)
        expect(POSES[kind].indexOf(pose)).toBeGreaterThan(0)
        for (const t of TIMES) {
          const s = standIn()
          expect(() => paintCreature(s.ctx, kind, pose, { x: 0.4, y: -0.6 }, t)).not.toThrow()
          expect(s.calls).toContain('fill')
          expect(s.calls).not.toContain('fillText')
          expect(s.calls).not.toContain('strokeText')
          expect(s.calls.filter((c) => c === 'save')).toHaveLength(s.calls.filter((c) => c === 'restore').length)
          for (const other of POSES[kind]) if (other !== pose) expect(s.seen, `${other}, t = ${t}`).not.toEqual(painted(kind, other, t).seen)
        }
      })
    }
  }

  // A creature that ducks hides its face. Every eye is painted by one brush, which fills a white (or the tint of
  // the kind), a pupil and, when the eye is shut, a pale wash over the lid; the pupil's colour and the wash are
  // filled by nothing else. So a duck may fill none of them. The first check shows that the stand-in would see an
  // eye if there were one: open on every kind as it walks or flies, shut in the raider's nap.
  it('sees the brush of an eye where there is one', () => {
    for (const kind of Object.keys(EYE_COLOURS) as CreatureKind[]) expect(painted(kind, kind.endsWith('ly') ? 'fly' : 'walk', 0).fills, kind).toContain(EYE.pupil)
    expect(painted('raider', 'walk', 0).fills).toContain(RAIDER.eye)
    expect(painted('fly', 'hands', 0).fills).toContain(FLY.eye)
    expect(painted('dungFly', 'point', 0).fills).toContain(DUNG_FLY.eye)
    expect(painted('beetle', 'walk', 0).fills).toContain(EYE.white)
    expect(painted('raider', 'nap', 0).fills).toContain(LID_WASH)
    expect(painted('raider', 'nap', 0).fills).not.toContain(EYE.pupil)
  })

  for (const kind of Object.keys(EYE_COLOURS) as CreatureKind[]) {
    it(`paints no eye on ${kind} when it ducks`, () => {
      expect(POSES[kind]).toContain('duck')
      for (const t of TIMES) {
        const { fills } = painted(kind, 'duck', t)
        for (const colour of EYE_COLOURS[kind] ?? []) expect(fills, `${colour}, t = ${t}`).not.toContain(colour)
      }
    })
  }

  it('paints the first pose of a kind when asked for one it has not, and needs neither a look nor a time', () => {
    const asked = standIn()
    const first = standIn()
    paintCreature(asked.ctx, 'beetle', 'no such pose')
    paintCreature(first.ctx, 'beetle', POSES.beetle[0], { x: 0, y: 0 }, 0)
    expect(asked.seen).toEqual(first.seen)
  })

  for (const [kind, one, other] of PARTNERS) {
    it(`paints ${kind} differently in ${one} and in ${other}, so that a swap is a movement`, () => {
      expect(POSES[kind]).toContain(one)
      expect(POSES[kind]).toContain(other)
      for (const t of TIMES) expect(painted(kind, one, t).seen).not.toEqual(painted(kind, other, t).seen)
    })
  }

  // The fliers and the dung beetle live in tunnels two cells high: 56, and six more for the tip of a wing or a
  // feeler. See the head of the file for what these bounds cover.
  for (const kind of ['fly', 'dungFly', 'dungBeetle'] as const) {
    for (const pose of POSES[kind]) {
      it(`keeps ${kind} in pose ${pose} within 62 above its feet`, () => {
        for (const t of TIMES) expect(painted(kind, pose, t).bounds.top, `t = ${t}`).toBeGreaterThanOrEqual(-62)
      })
    }
  }

  // The child's ant sits at the foot of a shaft three cells wide, so sat down it is no wider than 80 and no higher
  // than 34, feelers and neckerchief included. The same bounds, with the same limits.
  for (const pose of ['look', 'wait']) {
    it(`keeps the sitting ant in pose ${pose} within 40 of its feet to either side, and 34 high`, () => {
      for (const t of TIMES) {
        const { bounds } = painted('ant', pose, t)
        expect(bounds.left, `t = ${t}`).toBeGreaterThanOrEqual(-40)
        expect(bounds.right, `t = ${t}`).toBeLessThanOrEqual(40)
        expect(bounds.top, `t = ${t}`).toBeGreaterThanOrEqual(-34)
      }
    })
  }

  it('follows the frame: a stroked line under a turn and a shift lands where a canvas would put it', () => {
    const s = standIn()
    s.ctx.save()
    s.ctx.translate(10, -20)
    s.ctx.rotate(Math.PI / 2)
    s.ctx.lineWidth = 4
    s.ctx.beginPath()
    s.ctx.moveTo(0, 0)
    s.ctx.lineTo(30, 0)
    s.ctx.stroke()
    s.ctx.restore()
    expect(s.bounds.left).toBeCloseTo(8)
    expect(s.bounds.right).toBeCloseTo(12)
    expect(s.bounds.top).toBeCloseTo(-22)
    expect(s.bounds.bottom).toBeCloseTo(12)
  })
})
