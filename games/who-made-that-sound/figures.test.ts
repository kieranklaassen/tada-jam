import { describe, expect, it } from 'vitest'
import { AT_REST, GROWN, HUES, LITTLE, WIDE, arrange, outlines, type Pose } from './figures'
import { TARGET } from './stage'
import { bellows, bounds, toHsl } from './tissue'
import { KINDS, type Kind } from './voices'

const posed = (pose: Partial<Pose>): Pose => ({ ...AT_REST, ...pose })
const box = (kind: Kind, pose: Partial<Pose> = {}, size = GROWN[kind]) => bounds(outlines(kind, size, posed(pose)).flat())
/** How wide a figure is across a band of its height: 0 is its top, 1 its feet. */
const acrossAt = (kind: Kind, from: number, to: number) => {
  const all = outlines(kind, 100, AT_REST).flat(), whole = bounds(all)
  return bounds(all.filter(([, y]) => y >= whole.y + whole.h * from && y <= whole.y + whole.h * to)).w
}
const hueApart = (a: string, b: string) => { const turn = Math.abs(toHsl(a)[0] - toHsl(b)[0]); return Math.min(turn, 360 - turn) }

describe('the six hues', () => {
  it('are bright, and no two are near each other', () => {
    for (const kind of KINDS) {
      const [, saturation, light] = toHsl(HUES[kind])
      expect(saturation, kind).toBeGreaterThan(0.55)
      expect(light, kind).toBeGreaterThan(0.4)
      expect(light, kind).toBeLessThan(0.65)
    }
    for (const a of KINDS) for (const b of KINDS) if (a < b) expect(hueApart(HUES[a], HUES[b]), `${a} and ${b}`).toBeGreaterThanOrEqual(30)
  })
})

describe('the six outlines', () => {
  it('are each big enough to tap when grown', () => {
    for (const kind of KINDS) {
      expect(box(kind).w, kind).toBeGreaterThanOrEqual(TARGET)
      expect(box(kind).h, kind).toBeGreaterThanOrEqual(TARGET)
    }
  })

  it('stand on their feet: the lowest point of each is at the ground', () => {
    for (const kind of KINDS) {
      const whole = box(kind, {}, 100)
      expect(Math.abs(whole.y + whole.h), kind).toBeLessThan(4)
    }
  })

  it('are as wide for their height as `WIDE` tells whoever lays them out', () => {
    for (const kind of KINDS) expect(box(kind, {}, 100).w / 100, kind).toBeCloseTo(WIDE[kind], 1)
  })

  it('differ in shape, not only in hue', () => {
    const shape = (kind: Kind) => { const whole = box(kind, {}, 100); return whole.w / whole.h }
    // Wide, tall with a neck, tall on springs.
    expect(shape('hoom')).toBeGreaterThan(1.35)
    expect(shape('brrl')).toBeLessThan(0.8)
    expect(shape('wheep')).toBeLessThan(0.8)
    // The big ones are bigger than the middle ones, and those than the tiny ones.
    const area = (kind: Kind) => box(kind).w * box(kind).h
    expect(Math.min(area('hoom'), area('brrl'))).toBeGreaterThan(Math.max(area('wheep'), area('dooo')))
    expect(Math.min(area('wheep'), area('dooo'))).toBeGreaterThan(Math.max(area('pip'), area('tok')))
    // The two tiny ones: one is round to the top, the other ends in a point.
    expect(acrossAt('pip', 0.12, 0.3)).toBeGreaterThan(acrossAt('tok', 0.12, 0.3) * 1.8)
    // The two big ones: one is a body all the way up, the other a neck.
    expect(acrossAt('hoom', 0.3, 0.45)).toBeGreaterThan(acrossAt('brrl', 0.3, 0.45) * 4)
    // The two middle ones: one stands on thin springs, the other is widest at the ground.
    expect(acrossAt('dooo', 0.75, 0.9)).toBeGreaterThan(acrossAt('dooo', 0, 0.15))
    expect(acrossAt('wheep', 0.3, 0.5)).toBeGreaterThan(acrossAt('wheep', 0.75, 0.9) * 1.2)
  })

  it('make a little one the same figure, smaller', () => {
    for (const kind of KINDS) {
      const grown = box(kind), little = box(kind, {}, GROWN[kind] * LITTLE)
      expect(little.w).toBeCloseTo(grown.w * LITTLE)
      expect(little.h).toBeCloseTo(grown.h * LITTLE)
    }
    expect(LITTLE).toBeGreaterThan(0.45)
    expect(LITTLE).toBeLessThan(0.6)
  })
})

describe('a pose', () => {
  it('is the same every time, and moves whole pieces without changing one', () => {
    for (const kind of KINDS) {
      const pose = posed({ wings: 1, reach: 1, turn: 1, lean: 0.1 })
      expect(arrange(kind, 120, pose)).toEqual(arrange(kind, 120, pose))
      expect(arrange(kind, 120, pose)).toHaveLength(arrange(kind, 120, AT_REST).length)
      for (const joint of arrange(kind, 120, AT_REST)) expect(joint.squash).toBe(1)
    }
  })

  it('holds the wings out to both sides, the same on the left as on the right', () => {
    for (const kind of ['pip', 'hoom', 'dooo'] as const) {
      const rest = box(kind, {}, 100), out = box(kind, { wings: 1 }, 100)
      expect(out.w, kind).toBeGreaterThan(rest.w + 10)
      expect(out.x + out.w / 2, kind).toBeCloseTo(0, 0)
    }
  })

  it('holds both wings out towards one side, looking that way: the whole figure reaches there and not the other way', () => {
    // Where the weight of the outline lies, left to right: the mean of all its points.
    const middle = (kind: Kind, pose: Partial<Pose>) => { const all = outlines(kind, 100, posed(pose)).flat(); return all.reduce((sum, [x]) => sum + x, 0) / all.length }
    for (const kind of KINDS) {
      const right = middle(kind, { wings: 1, reach: 1, turn: 1 }), left = middle(kind, { wings: 1, reach: -1, turn: -1 })
      expect(right, kind).toBeGreaterThan(middle(kind, { turn: 1 }) + 0.5)
      expect(left, kind).toBeLessThan(middle(kind, { turn: -1 }) - 0.5)
    }
    // The widest kind, the one the stone is sized for: both wings end up beyond its body on that side.
    const rest = box('hoom', {}, 100), right = box('hoom', { wings: 1, reach: 1 }, 100)
    expect(right.x + right.w).toBeGreaterThan(rest.x + rest.w + 15)
    expect(right.x).toBeGreaterThan(rest.x)
  })

  it('tips the body about its feet, and the feet stay where they are', () => {
    for (const kind of KINDS) {
      const upright = arrange(kind, 100, AT_REST), tipped = arrange(kind, 100, posed({ lean: 0.2 }))
      const still = upright.filter((joint, i) => joint.x === tipped[i].x && joint.y === tipped[i].y && joint.turn === tipped[i].turn)
      expect(still, kind).toHaveLength(2)
      expect(box(kind, { lean: 0.2 }, 100).x + box(kind, { lean: 0.2 }, 100).w, kind).toBeGreaterThan(box(kind, {}, 100).x + box(kind, {}, 100).w)
    }
  })

  it('turns the face: two eyes and their two dark dots slide that way, the dots furthest', () => {
    for (const kind of KINDS) {
      const ahead = arrange(kind, 100, AT_REST), blinking = arrange(kind, 100, posed({ blink: 1 }))
      const eyes = ahead.flatMap((_, i) => (blinking[i].squash < 1 ? [i] : []))
      expect(eyes, kind).toHaveLength(4)
      const turned = arrange(kind, 100, posed({ turn: 1 })), slid = eyes.map((i) => turned[i].x - ahead[i].x)
      for (const by of slid) expect(by, kind).toBeGreaterThan(1)
      expect(Math.max(...slid), kind).toBeGreaterThan(Math.min(...slid))
    }
  })

  it('points the pointed one the way it looks', () => {
    const right = box('tok', { turn: 1 }, 100), left = box('tok', { turn: -1 }, 100)
    expect(right.x + right.w).toBeCloseTo(-left.x, 0)
    expect(right.x).toBeCloseTo(-(left.x + left.w), 0)
    // Its beak and its tail are the two pieces that change sides; nobody else has a piece that does.
    for (const kind of KINDS) {
      expect(arrange(kind, 100, posed({ turn: 1 })).filter((joint) => joint.flip === -1), kind).toHaveLength(0)
      expect(arrange(kind, 100, posed({ turn: -1 })).filter((joint) => joint.flip === -1), kind).toHaveLength(kind === 'tok' ? 2 : 0)
    }
  })
})

describe('the springs of the springy one', () => {
  it('are solid and the same on both sides: no part of one, seen alone behind something else, is a zigzag of a few strokes', () => {
    // The pieces in the order they are laid: two feet, two legs, the head spring, its bobble, the body, two arms, and the face.
    const pieces = outlines('wheep', 100, AT_REST)
    // The two legs stand upright, so each can be measured as it lies; the spring on the head leans a little, and is the same cut.
    for (const index of [2, 3]) {
      const spring = pieces[index], half = spring.length / 2, middle = spring.reduce((sum, [x]) => sum + x, 0) / spring.length
      // One side of the outline and the other, corner for corner, at the same height and as far from the middle.
      for (let i = 0; i < half; i++) {
        const [x, y] = spring[i], [mx, my] = spring[spring.length - 1 - i]
        expect(my, `piece ${index}`).toBeCloseTo(y, 6)
        expect(mx - middle, `piece ${index}`).toBeCloseTo(-(x - middle), 6)
      }
      // Wide and narrow by turns, eight times: a spring, not a stick.
      const wide = spring.slice(0, half).map(([x]) => Math.abs(x - middle))
      expect(wide.length).toBeGreaterThanOrEqual(9)
      for (let i = 1; i < wide.length; i++) expect(Math.abs(wide[i] - wide[i - 1]), `piece ${index}`).toBeGreaterThan(1)
    }
    // The cut itself: every corner on one side has its twin on the other, at the same height.
    const cut = bellows(40, 6, 8)
    expect(cut).toHaveLength(18)
    for (let i = 0; i < 9; i++) expect([cut[17 - i][0], cut[17 - i][1]]).toEqual([-cut[i][0], cut[i][1]])
    expect(pieces[4]).toHaveLength(pieces[2].length)
  })
})
