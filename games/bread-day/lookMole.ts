import { TAU, carve, curve, cut, draw, fill, gouge, halo, mulberry32, oval, rough, shape, within, type Print, type Pt } from './lookCut'

// The mole at the hatch: small, pale and soft. Almost all of it is bare paper
// with a few short ticks of velvet, so it reads pale beside the dark coats of
// the others. Round spectacles, a pink nose toward the bakery, and two big
// digging hands hugging a small round basket whose dark wicker is lined with
// pale down; its cheek is pressed into the down. Painted in reference units
// from its box's top left corner; the ledge cuts it off below the basket.

/** Its box, and where its mouth and the middle of the basket's opening are, as shares of the box. */
export const MOLE = { w: 200, h: 220, mouth: [0.8, 0.54], basket: [0.67, 0.66] } as const

/** The middle and the half widths of the basket's opening. */
const RIM = { x: 134, y: 146, rx: 42, ry: 12 }
const corner = (x: number, y: number): Pt[] => [[x, y], [x, y]]

/** The down: a soft trim folded over the rim, scalloped all round and hanging lowest in front, round a pale hollow. */
function down(p: Print): void {
  const { rnd } = p, trim: Pt[] = []
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * TAU, puff = 4 + 4.5 * Math.abs(Math.sin(a * 6.5 + 0.4)), hang = Math.max(0, Math.sin(a)) * 8
    trim.push([RIM.x + Math.cos(a) * (RIM.rx + puff), RIM.y + Math.sin(a) * (RIM.ry + puff + hang)])
  }
  const hollow = rough(oval(RIM.x, RIM.y - 1, RIM.rx - 5, RIM.ry - 3, 0, 4), rnd, 0.4, 5)
  shape(p, rough(trim, rnd, 0.8, 4), null, 1.6, 3.6)
  // The far wall of the hollow is in shadow: a dark crescent, which is what makes it an opening.
  within(p.key, hollow, () => { fill(p.key, hollow); cut(p.key, oval(RIM.x, RIM.y + 4.5, RIM.rx - 5, RIM.ry - 3, 0, 4)) })
  draw(p, curve([[RIM.x - RIM.rx + 6, RIM.y + 1], [RIM.x, RIM.y + RIM.ry - 4.5], [RIM.x + RIM.rx - 6, RIM.y + 1]], false), 1.8, 0.1)
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.14 + 0.12 * i), x = RIM.x + Math.cos(a) * (RIM.rx - 3) + rnd() * 3, y = RIM.y + Math.sin(a) * (RIM.ry + 7) + rnd() * 2
    draw(p, curve([[x - 3.5, y + 1.5], [x, y - 2.5], [x + 3.5, y + 1.5]], false, 2), 1.6, 0.2)
  }
}

/** A digging hand: a broad palm at (x, y) and four fat fingers spread about `aim`, each ending in a dark claw. */
function hand(p: Print, x: number, y: number, aim: number): void {
  const c = Math.cos(aim), s = Math.sin(aim)
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * 8.6, turn = aim + (i - 1.5) * 0.17, tc = Math.cos(turn), ts = Math.sin(turn)
    const fx = x + c * 14 - s * off, fy = y + s * 14 + c * off
    shape(p, oval(fx + tc * 7, fy + ts * 7, 13, 5.6, turn, 2.5), null, 1.3, 2.6)
    fill(p.key, gouge(fx + tc * 15, fy + ts * 15, turn, 10, 5))
  }
  shape(p, rough(oval(x, y, 15, 19, aim, 3), p.rnd, 0.7, 4), null, 1.8, 4)
}

export function paintMole(p: Print, open: boolean): void {
  const { rnd } = p
  // What only one state of the mouth has is cut from a stream of its own, so both states use the main stream alike.
  const side: Print = { ...p, rnd: mulberry32(open ? 61 : 62) }
  const body = rough(curve([[96, 34], [126, 42], [150, 64], [166, 85], [177, 95], [181, 102], [177, 110], [167, 120], [159, 134], [150, 160], [150, 200], ...corner(148, 234), ...corner(18, 234), [13, 184], [22, 124], [52, 62]]), rnd, 1.2, 5)
  const bowl = rough(curve([...corner(RIM.x - 43, RIM.y), [RIM.x - 39, 176], [RIM.x - 24, 204], [RIM.x, 213], [RIM.x + 24, 204], [RIM.x + 39, 176], ...corner(RIM.x + 43, RIM.y)]), rnd, 0.9, 4)
  halo(p, body, 6, 0.08); halo(p, bowl, 5, 0); halo(p, oval(RIM.x, RIM.y, RIM.rx + 9, RIM.ry + 9, 0, 5), 4, 0)
  halo(p, oval(176, 180, 20, 22, 0, 4), 4.5, 0)

  shape(p, body, null, 2.2, 4.2)
  // Velvet: a few short ticks down the back, and nothing more, so the mole stays the palest thing at the hatch.
  within(p.key, body, () => {
    for (let i = 0; i < 16; i++) fill(p.key, gouge(26 + rnd() * 50 + i * 1.5, 66 + i * 10 + rnd() * 8, 1.45 + rnd() * 0.3, 8 + rnd() * 7, 2.3))
    for (let i = 0; i < 5; i++) fill(p.key, gouge(76 + i * 10 + rnd() * 4, 47 + rnd() * 5 + Math.abs(i - 1.5) * 2.5, 0.4 + i * 0.14, 7 + rnd() * 4, 2))
  })
  draw(p, curve([[52, 148], [64, 170], [84, 180]], false), 2.8, 0.1)
  // Round spectacles, each with a tiny eye in it, and their arm going back over the head.
  for (const [x, y, r] of [[152, 93, 9.5], [128, 80, 11.5]]) {
    fill(p.key, oval(x, y, r, r, 0, 2.5)); cut(p.key, oval(x + 0.4, y + 0.5, r - 2.8, r - 3, 0, 2.5))
    fill(p.key, oval(x + 1.5, y + 1, 2.5, 2.7, 0, 1.5))
  }
  draw(p, curve([[138, 82], [141, 84], [144, 88]], false, 2), 2.6, 0.6)
  draw(p, curve([[117, 77], [106, 71], [93, 71]], false, 3), 2.4, 0.3)
  fill(p.red, oval(133, 112, 8.5, 7.5, 0, 3))
  shape(p, rough(oval(177, 102, 7.5, 6.5, 0.6, 2.5), rnd, 0.4, 3), 'red', 1.3, 2.4)
  for (const [x, y] of [[163, 96], [168, 100], [161, 102]]) fill(p.key, oval(x, y, 1.1, 1.1, 0, 1.5))

  // The basket: dark wicker with the weave cut white, which no other basket has, so the down and the hands stand off it.
  fill(p.base, bowl); fill(p.key, bowl)
  within(p.key, bowl, () => {
    for (let row = 0; row < 4; row++) {
      const y = 170 + row * 10
      carve(p, ['key'], curve([[RIM.x - 44, y - 4], [RIM.x - 20, y + 5], [RIM.x + 20, y + 5], [RIM.x + 44, y - 4]], false), 2.2, 0.5)
      for (let x = RIM.x - 30 + (row % 2) * 6; x < RIM.x + 34; x += 12) cut(p.key, gouge(x + rnd() * 2, y - 2 + rnd(), 1.5, 5.5, 1.7))
    }
  })
  down(p)
  // The digging hands go on last, pale on the dark wicker.
  hand(p, 180, 178, Math.PI * 0.9)
  hand(p, 90, 188, 0.1)

  // The mouth goes in last, over the down it is pressed into.
  if (open) {
    const mouth = rough(oval(160, 120, 11.5, 13.5, 0.5, 2.5), side.rnd, 0.5, 3), tongue = oval(157, 127, 8, 6, 0.5, 2)
    halo(side, mouth, 2.5, 0)
    fill(p.key, mouth)
    within(p.key, mouth, () => cut(p.key, tongue))
    within(p.red, mouth, () => fill(p.red, tongue))
  } else draw(side, curve([[167, 107], [159, 113], [149, 110], [146, 106]], false, 3), 2.6, 0.2)
}
