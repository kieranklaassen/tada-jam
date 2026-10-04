import { carve, coat, curve, cut, draw, fill, gouge, halo, mulberry32, oval, rough, shape, within, type Print, type Pt } from './lookCut'

// The bear at the hatch: round is its whole character. A round head with
// puffed cheeks and a pale muzzle turned toward the bakery, round ears, a round
// pale belly with one paw laid on it, and a big round basket in the other arm
// for a big airy loaf. Its coat is carved in rings round the belly, which no
// other coat here is. Painted in reference units from its box's top left
// corner; the ledge cuts it off below the basket.

/** Its box, and where its mouth and the middle of the basket's opening are, as shares of the box. */
export const BEAR = { w: 300, h: 330, mouth: [0.67, 0.42], basket: [0.74, 0.81] } as const

const corner = (x: number, y: number): Pt[] => [[x, y], [x, y]]

/** The round basket: a wide dark opening and a bowl of wicker whose courses sag with its curve. */
function basket(p: Print): void {
  const { rnd } = p
  const bowl = rough(curve([...corner(160, 268), [165, 300], [188, 330], [222, 342], [256, 330], [279, 300], ...corner(284, 268)]), rnd, 0.9, 4)
  const rim = rough(oval(222, 268, 66, 18, 0, 5), rnd, 0.7, 5), hollow = rough(oval(222, 269, 57, 12, 0, 5), rnd, 0.5, 5)
  halo(p, bowl, 5, 0); halo(p, rim, 5, 0.04)
  shape(p, bowl, null, 2, 5.5)
  within(p.key, bowl, () => {
    for (let row = 0; row < 6; row++) for (let x = 166 + (row % 2) * 9; x < 282; x += 18) {
      const u = (x - 222) / 66
      fill(p.key, gouge(x + rnd() * 3, 280 + row * 8 + 16 * Math.sqrt(Math.max(0, 1 - u * u)) + rnd() * 1.5, -u * 0.45, 12, 2.8, 1.2))
    }
  })
  shape(p, rim, null, 2.2, 3.6)
  fill(p.key, hollow)
  within(p.key, hollow, () => { for (let i = 0; i < 6; i++) cut(p.key, gouge(176 + i * 16 + rnd() * 6, 274 - Math.abs(i - 2.5) * 1.6, 0.05, 8 + rnd() * 5, 1.9)) })
}

function head(p: Print, open: boolean): void {
  const { rnd } = p
  // What changes with the mouth is cut from a stream of its own, so both states use the main stream alike.
  const side: Print = { ...p, rnd: mulberry32(open ? 51 : 52) }
  const skull = rough(curve([[150, 28], [108, 40], [84, 76], [78, 114], [94, 148], [134, 167], [178, 169], [218, 155], [238, 122], [234, 84], [214, 48], [182, 30]]), rnd, 1, 5)
  const ears = [oval(100, 46, 24, 23, 0, 4), oval(214, 48, 22, 21, 0, 4)].map((ear) => rough(ear, rnd, 0.8, 4))
  for (const ear of ears) halo(p, ear, 5, 0)
  for (const ear of ears) {
    fill(p.base, ear); fill(p.key, ear)
    cut(p.key, rough(oval(ear[0][0] - 24, ear[0][1] - 1, 11, 10, 0, 3), rnd, 0.6, 3))
  }
  // The rim is cleared over the shoulders too, so the dark head stands off the dark body.
  halo(p, skull, 6, 0.05)
  fill(p.base, skull); fill(p.key, skull)
  // Short fur lying away from the muzzle, all round the face.
  coat(p, skull, 10, 11, 3.6, (x, y) => Math.atan2(y - 116, x - 190), (x, y) => Math.hypot(x - 192, y - 124) < 46 ? 0 : Math.max(0.15, 0.62 - (y - 30) / 320))
  // A puffed cheek: red where the key block is cut away, and a carved arc under it.
  const cheek = oval(120, 128, 13, 11.5, 0, 3)
  cut(p.key, cheek); fill(p.red, cheek)
  carve(p, ['key'], curve([[100, 138], [112, 150], [130, 154]], false), 3.4, 0.1)
  const muzzle = open
    ? curve([[194, 93], [224, 102], [237, 128], [229, 158], [202, 174], [172, 162], [156, 130], [166, 104]])
    : curve([[194, 93], [224, 102], [236, 124], [224, 147], [196, 155], [168, 147], [155, 124], [166, 103]])
  shape(side, rough(muzzle, side.rnd, 0.8, 5), null, 2.2, 5)
  fill(p.key, rough(oval(203, 106, 12.5, 9, 0.1, 3), rnd, 0.5, 3))
  cut(p.key, gouge(197, 103, 0.1, 8, 2.2))
  if (open) {
    const mouth = rough(curve([[184, 126], [202, 121], [220, 126], [222, 146], [203, 164], [184, 148]], true, 3), side.rnd, 0.6, 4)
    const tongue = oval(203, 156, 13, 9, 0, 3)
    fill(p.key, mouth)
    within(p.key, mouth, () => { cut(p.key, tongue); cut(p.key, curve([[195, 116], [209, 116], [208, 128], [202, 133], [197, 128]], true, 3)) })
    within(p.red, mouth, () => fill(p.red, tongue))
  } else {
    draw(side, curve([[203, 114], [203, 128]], false, 3), 2.4, 0.3)
    draw(side, curve([[180, 128], [191, 137], [203, 128], [215, 137], [226, 127]], false, 3), 2.8, 0.2)
  }
  for (const [x, y] of [[176, 122], [172, 131], [181, 133]]) fill(p.key, oval(x, y, 1.3, 1.3, 0, 1.5))
  // Small eyes, wide apart, and a brow carved over each.
  for (const [x, y] of [[158, 86], [214, 84]]) {
    cut(p.key, oval(x, y, 7.6, 7.4, 0, 3))
    fill(p.key, oval(x + 1.6, y + 0.8, 4.2, 4.4, 0, 2))
    cut(p.key, oval(x + 0.4, y - 0.8, 1.3, 1.3, 0, 1.5))
    carve(p, ['key'], curve([[x - 10, y - 11], [x, y - 15], [x + 10, y - 11]], false), 2.8, 0.1)
  }
}

export function paintBear(p: Print, open: boolean): void {
  const { rnd } = p
  const bulk = rough(curve([[138, 146], [72, 160], [30, 214], [22, 286], ...corner(38, 342), ...corner(244, 342), [258, 286], [250, 214], [204, 160]]), rnd, 1.4, 5)
  const belly = rough(oval(146, 262, 66, 72, 0, 5), rnd, 1.2, 6)
  const arm = rough(curve([[34, 204], [32, 240], [54, 268], [96, 278], [134, 274], [152, 256], [142, 236], [112, 236], [86, 226], [72, 200]]), rnd, 1, 5)
  const paw = rough(oval(266, 292, 21, 17, -0.3, 4), rnd, 0.8, 4)
  halo(p, bulk, 6, 0.1)
  fill(p.base, bulk); fill(p.key, bulk)
  // The coat goes round the belly in rings, so the whole bear reads as one ball.
  coat(p, bulk, 10, 15, 4.4, (x, y) => Math.atan2(y - 262, x - 146) + Math.PI / 2, (x, y) => Math.max(0.12, 0.78 - (x - 20) / 520 - (y - 150) / 420))
  shape(p, belly, null, 2.4, 6)
  for (let i = 0; i < 8; i++) fill(p.key, gouge(120 + rnd() * 60, 204 + rnd() * 30, 0.2 + rnd() * 0.3, 6 + rnd() * 6, 1.8))
  // The far arm goes down behind the basket: one carved line says where it is.
  carve(p, ['key'], curve([[222, 190], [236, 222], [240, 258]], false), 4.5, 0.1)
  basket(p)
  halo(p, paw, 4.5, 0)
  fill(p.base, paw); fill(p.key, paw)
  for (let i = 0; i < 4; i++) cut(p.key, gouge(251 + i * 2, 282 + i * 6.5, 0.25, 13, 3.2))
  // The near arm lies across the belly, dark on the pale, with its claws cut at the end.
  fill(p.base, arm); fill(p.key, arm)
  coat(p, arm, 10, 13, 4, (x) => 0.9 - (x - 34) * 0.009, (x) => x > 126 ? 0 : 0.55)
  carve(p, ['key'], curve([[38, 198], [70, 198], [84, 222], [96, 232]], false), 4.5, 0.1)
  for (let i = 0; i < 4; i++) cut(p.key, gouge(149 - Math.abs(i - 1.5) * 2.5, 240 + i * 7.5, Math.PI + (i - 1.5) * 0.14, 13, 3.4))
  head(p, open)
}
