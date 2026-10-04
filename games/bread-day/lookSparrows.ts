import { bare, curve, cut, draw, fill, gouge, halo, offset, oval, posed, ribbon, rough, shape, within, type Print, type Pt } from './lookCut'

// One of the sparrows on the ledge, printed three times from three seeds: a
// plump round bird, whole, with a dark cap, wing and tail and a pale breast
// with a few flecks carved on it, the size of the crumbs it wants. Painted in
// reference units from its box's top left corner; it stands on the box's lower edge.

/** Where the beak tip is when it sits up, and the ground it pecks, as shares of the box. */
export const SPARROW = { w: 104, h: 96, mouth: [0.87, 0.4], basket: [0.79, 0.95] } as const

const corner = (x: number, y: number): Pt[] => [[x, y], [x, y]]
const LEGS: Pt[][] = [[[41, 74], [40, 84], [39, 93]], [[52, 74], [53, 84], [54, 93]]]

/** `peck` prints the same bird tipped over its feet: head down at the ledge, tail in the air. */
export function paintSparrow(p: Print, peck: boolean): void {
  const { rnd } = p
  for (const leg of LEGS) bare(p, ribbon(leg, () => 7))
  posed(p, 46, 56, peck ? 1.08 : 0, 1, () => {
    const body = rough(curve([[16, 58], [19, 42], [32, 28], [50, 19], [66, 20], [77, 31], [78, 46], [72, 62], [58, 76], [38, 78], [22, 70]], true, 3), rnd, 0.7, 4)
    const tail = rough(curve([[28, 52], ...corner(3, 60), [7, 67], ...corner(4, 76), [30, 70]], true, 3), rnd, 0.5, 4)
    const beak = curve([...corner(75, 30), ...corner(91, 38.5), ...corner(75, 46)], true, 2.5)
    const wing = rough(curve([[19, 56], [30, 45], [43, 46], [48, 56], [39, 66], [25, 66]], true, 3), rnd, 0.5, 4)
    halo(p, body, 4.5, 0); halo(p, tail, 3.8, 0); bare(p, offset(beak, (i) => 3 + 0.8 * Math.sin(i)))
    fill(p.base, tail); fill(p.key, tail)
    cut(p.key, gouge(24, 62, 2.9, 17, 2.6))
    fill(p.key, beak)
    shape(p, body, null, 2, 4.6)
    within(p.key, body, () => {
      // The cap, and the stripe through the eye.
      fill(p.key, rough(curve([[38, 27], [52, 17], [68, 18], [80, 31], [68, 26.5], [54, 26.5], [44, 33]], true, 3), rnd, 0.5, 4))
      fill(p.key, gouge(74, 36.5, 3.3, 19, 3.4))
    })
    for (let i = 0; i < 3; i++) cut(p.key, gouge(50 + i * 8, 20.5 + i * 0.8, 3 - i * 0.2, 6, 1.8))
    // The wing, its feathers cut from the shoulder back.
    fill(p.key, wing)
    within(p.key, wing, () => { for (let i = 0; i < 3; i++) cut(p.key, gouge(43 - i * 2, 50 + i * 5, 2.75 - i * 0.12, 19 - i * 3, 3.6)) })
    // Flecks on the breast, crumb-sized.
    for (let i = 0; i < 12; i++) fill(p.key, gouge(70 - (i % 4) * 6.5 - Math.floor(i / 4) * 3 + rnd() * 3, 52 + Math.floor(i / 4) * 7 + (i % 4) * 2.4 + rnd() * 2, 2 + rnd() * 0.5, 5.5 + rnd() * 2, 3.1, 0, 0.5))
    fill(p.red, oval(61, 46, 5, 4.4, 0, 2))
    // The eye sits in its stripe with a ring of paper round it, so it is found at any size.
    cut(p.key, oval(65.5, 35.5, 5.8, 5.6, 0, 2))
    fill(p.key, oval(66.4, 35.8, 3.5, 3.7, 0, 1.5))
    cut(p.key, oval(65.3, 34.6, 1, 1, 0, 1))
  })
  for (const leg of LEGS) { draw(p, leg, 2.8, 0.6); draw(p, [[leg[2][0] - 4, 93.4], [leg[2][0] + 8, 92.8]], 2.2, 0.5) }
}
