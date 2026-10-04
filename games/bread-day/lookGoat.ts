import { coat, curve, cut, draw, fill, gouge, halo, oval, ribbon, rough, shape, within, type Print, type Pt } from './lookCut'

// The goat at the hatch, in profile, leaning in toward the peel: a pale head
// with horns, a beard and a level-barred eye, on a dark neck whose coat is
// carved mark by mark. Painted in reference units from its box's top left
// corner; the hatch ledge it leans over is 276 units down.

const LEDGE = 276

/** A horn: a ribbon that sweeps back from the poll and thins to a point, with the ridges cut across it. */
function horn(p: Print, dx: number, dy: number, size: number): void {
  const line = curve(([[204, 58], [198, 30], [174, 10], [142, 10], [120, 28]] as Pt[]).map(([x, y]): Pt => [204 + (x - 204) * size + dx, 58 + (y - 58) * size + dy]), false, 5)
  const width = (t: number) => (21 * Math.pow(1 - t, 0.7) + 3) * size
  const pts = ribbon(line, width)
  halo(p, pts, 4.5, 0)
  shape(p, pts, null, 1.8, 4.5)
  for (let i = 4; i < line.length - 3; i += 3) {
    const a = line[i - 1], b = line[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, half = width(i / (line.length - 1)) * 0.42
    const nx = ((b[1] - a[1]) / len) * half, ny = (-(b[0] - a[0]) / len) * half
    draw(p, [[line[i][0] + nx, line[i][1] + ny], [line[i][0] - nx * 0.5, line[i][1] - ny * 0.5]], 2.2, 0.3)
  }
}

export function paintGoat(p: Print): void {
  const { rnd } = p
  const corner = (x: number, y: number): Pt[] => [[x, y], [x, y]]
  const body = rough(curve([[178, 84], [150, 112], [116, 150], [80, 188], [50, 228], ...corner(32, LEDGE), [120, LEDGE + 3], ...corner(208, LEDGE), [215, 238], [212, 198], [218, 166], [208, 140], [200, 110]]), rnd, 1.4, 5)
  const head = rough(curve([[186, 62], [214, 52], [240, 66], [262, 96], [280, 122], [285, 138], [275, 151], [252, 155], [232, 153], [212, 141], [194, 119], [182, 90]]), rnd, 1, 5)
  const beard = rough(curve([[244, 152], [239, 178], ...corner(247, 208), [258, 182], [263, 153]]), rnd, 0.8, 4)
  const ear = rough(curve([[192, 78], [166, 72], ...corner(140, 90), [164, 100], [190, 96]]), rnd, 0.8, 4)

  // The ground is cleared round the whole animal first, then each part is printed, far parts before near ones.
  halo(p, body, 6, 0.12); halo(p, head, 6, 0.06); halo(p, beard, 4.5, 0); halo(p, ear, 4, 0)
  horn(p, 13, 3, 0.9)
  fill(p.base, body); fill(p.key, body)
  // The coat lies down the neck, carved thickly on the side toward the bakery and left dark along the back.
  coat(p, body, 9, 17, 4.6, (x, y) => 1.72 + (x - 120) * 0.0022 - (y - 180) * 0.001, (x, y) => Math.max(0.12, Math.min(0.92, 0.1 + (x - 40) / 190 + (y - 200) / 700)))
  // A red collar: the key block cut away over a band of red.
  const band = ribbon(curve([[140, 124], [176, 150], [214, 152]], false), () => 15)
  within(p.key, body, () => { cut(p.key, band) })
  within(p.red, body, () => { fill(p.red, band) })
  draw(p, curve([[138, 116], [176, 142], [216, 144]], false), 2.4, 0.3)
  draw(p, curve([[142, 132], [176, 158], [212, 160]], false), 2.8, 0.3)

  shape(p, ear, null, 2, 4.5)
  draw(p, curve([[184, 87], [164, 86], [150, 90]], false), 3.2, 0)
  horn(p, 0, 0, 1)
  shape(p, head, null, 2.4, 6)
  shape(p, beard, null, 1.8, 4)
  draw(p, curve([[248, 160], [246, 180], [248, 196]], false), 2, 0)
  draw(p, curve([[255, 160], [254, 174]], false), 1.8, 0)
  // The eye: wide open, with a goat's level pupil, looking into the bakery.
  fill(p.key, oval(239, 93, 13.5, 11, -0.25, 3))
  cut(p.key, oval(239.5, 93.5, 10.4, 8, -0.25, 3))
  fill(p.key, oval(240.5, 93.5, 6.4, 3.9, -0.1, 2))
  draw(p, curve([[223, 80], [238, 73], [254, 80]], false), 3.4, 0.1)
  fill(p.key, oval(277, 129, 3, 2, 0.6, 2))
  draw(p, curve([[284, 141], [272, 147], [258, 145], [251, 139]], false), 2.6, 0.2)
  fill(p.red, oval(224, 126, 8, 7, 0, 3))
  // A little shading under the jaw and behind the cheek, in short ticks.
  within(p.key, head, () => {
    for (let i = 0; i < 6; i++) fill(p.key, gouge(196 + i * 5 + rnd() * 3, 112 + i * 5, 2.1, 9 + rnd() * 5, 2.4))
    for (let i = 0; i < 4; i++) fill(p.key, gouge(250 + i * 6, 104 + i * 7, 0.9, 7 + rnd() * 4, 2))
  })
}
