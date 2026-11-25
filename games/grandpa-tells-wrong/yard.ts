import { blob, limb, line, lit, shape, soft } from './draw'
import { BAND, LAMP } from './layout'
import { dye, type Family, type G } from './loom'

// What stands still: the yard at four times of the day, the band along the
// bottom, and the woven border. Painted once for a surface.

export type Hour = 0 | 1 | 2 | 3
type Dye = readonly [Family, 0 | 1 | 2 | 3]

const of = ([family, shade]: Dye): string => dye(family, shade)

/** The sky from the top down, for morning, noon, dusk and night. */
export const SKY: readonly (readonly [Dye, Dye])[] = [
  [['rose', 2], ['rose', 3]],
  [['indigo', 2], ['indigo', 3]],
  [['violet', 1], ['violet', 3]],
  [['indigo', 0], ['indigo', 1]],
]
const HILL: readonly (readonly [Dye, Dye, Dye])[] = [
  [['sage', 3], ['sage', 2], ['sage', 2]],
  [['sage', 3], ['sage', 2], ['sage', 2]],
  [['sage', 2], ['sage', 1], ['sage', 1]],
  [['sage', 1], ['sage', 0], ['sage', 0]],
]

export function paintYard(g: G, hour: Hour): void {
  const [high, low] = SKY[hour]
  const night = hour === 3
  g.fillStyle = dye('madder', 0)
  g.fillRect(-3000, -3000, 7000, 7000)
  border(g)
  g.save()
  g.beginPath()
  g.rect(BAND.left, 18, BAND.right - BAND.left, 784)
  g.clip()
  const sky = g.createLinearGradient(0, 18, 0, 440)
  sky.addColorStop(0, of(high))
  sky.addColorStop(1, of(low))
  g.fillStyle = sky
  g.fillRect(0, 0, 1180, 520)
  // Clouds, as a weaver does them: stacked lozenges.
  const cloud = night ? dye('indigo', 2) : hour === 2 ? dye('rose', 2) : dye('cream', 3)
  for (const [x, y, k] of [[300, 220, 1], [660, 66, 0.8], [88, 70, 0.7]] as const) {
    for (const [dx, dy, w] of [[0, 0, 74], [-30, 12, 60], [38, 14, 66], [4, 22, 92]] as const) blob(g, x + dx * k, y + dy * k, w * k, 12 * k, cloud)
  }
  if (night) for (const [x, y] of [[120, 200], [236, 92], [356, 160], [690, 208], [60, 300], [640, 96], [300, 296], [736, 60]]) shape(g, [[x - 9, y], [x, y - 10], [x + 9, y], [x, y + 10]], dye('ochre', 3))
  const [far, mid, near] = HILL[hour]
  soft(g, [[-40, 460], [60, 356], [220, 330], [390, 396], [520, 350], [700, 330], [820, 420], [820, 560], [-40, 560]], of(far))
  soft(g, [[-40, 520], [140, 420], [300, 440], [480, 410], [700, 448], [900, 430], [900, 660], [-40, 660]], of(mid))
  // Rows of a ploughed field on the far hill.
  for (let i = 0; i < 5; i++) line(g, [[90 + i * 34, 424 - i * 9], [60 + i * 52, 474 - i * 8]], night ? dye('sage', 1) : dye('ochre', 2), 8)
  tree(g, 40, 560, night)
  barn(g, night)
  // The yard itself.
  const earth = g.createLinearGradient(0, 500, 0, 650)
  earth.addColorStop(0, night ? dye('walnut', 1) : dye('ochre', 2))
  earth.addColorStop(1, night ? dye('walnut', 1) : dye('ochre', 1))
  soft(g, [[-60, 690], [-60, 520], [160, 500], [420, 516], [700, 504], [1240, 500], [1240, 690]], earth)
  soft(g, [[-60, 540], [-40, 498], [160, 490], [420, 506], [700, 494], [900, 492], [900, 512], [420, 530], [160, 512]], of(near))
  for (const [x, y] of [[270, 540], [536, 552], [96, 618], [752, 560], [330, 622], [560, 624]]) {
    for (const d of [-12, 0, 12]) line(g, [[x, y], [x + d, y - 18]], night ? dye('sage', 1) : dye('sage', 1), 7)
  }
  house(g, hour)
  band(g, night)
  g.restore()
}

function tree(g: G, x: number, y: number, night: boolean): void {
  line(g, [[x, y], [x + 6, y - 190]], night ? dye('walnut', 0) : dye('walnut', 2), 36)
  const leaf = night ? dye('sage', 0) : dye('sage', 1)
  for (const [dx, dy, r] of [[0, -232, 78], [-46, -190, 56], [62, -196, 52], [20, -284, 50]] as const) blob(g, x + dx, y + dy, r, r * 0.9, lit(g, x + dx, y + dy, r, night ? dye('sage', 1) : dye('sage', 2), leaf))
  for (const [dx, dy] of [[-30, -210], [24, -250], [70, -186], [-4, -180], [36, -296]]) blob(g, x + dx, y + dy, 12, 12, night ? dye('madder', 0) : dye('madder', 2))
}

function barn(g: G, night: boolean): void {
  const wall = night ? dye('madder', 0) : dye('madder', 1)
  shape(g, [[486, 500], [486, 396], [540, 344], [594, 396], [594, 500]], wall)
  shape(g, [[470, 402], [540, 330], [610, 402], [594, 406], [540, 352], [486, 406]], dye('walnut', night ? 0 : 1))
  shape(g, [[514, 500], [514, 430], [566, 430], [566, 500]], dye('walnut', night ? 0 : 1))
  line(g, [[518, 434], [562, 496]], dye('ochre', night ? 0 : 1), 7)
  line(g, [[562, 434], [518, 496]], dye('ochre', night ? 0 : 1), 7)
  for (let i = 0; i < 6; i++) line(g, [[640 + i * 34, 506], [640 + i * 34, 458]], dye('walnut', night ? 0 : 2), 11)
  line(g, [[620, 472], [830, 472]], dye('walnut', night ? 0 : 2), 9)
}

function house(g: G, hour: Hour): void {
  const night = hour === 3
  const wall = night ? dye('walnut', 2) : dye('cream', 1)
  g.fillStyle = wall
  g.fillRect(760, 190, 420, 420)
  // Timbers.
  const beam = night ? dye('walnut', 0) : dye('walnut', 1)
  g.fillStyle = beam
  g.fillRect(756, 190, 18, 420)
  g.fillRect(760, 300, 420, 12)
  // A window with a pot in it.
  g.fillStyle = beam
  g.fillRect(1056, 388, 100, 120)
  g.fillStyle = night ? dye('indigo', 0) : dye('indigo', 2)
  g.fillRect(1066, 398, 36, 100)
  g.fillRect(1110, 398, 36, 100)
  soft(g, [[1078, 496], [1072, 464], [1108, 464], [1102, 496]], dye('madder', 1))
  for (const [x, y] of [[1078, 452], [1092, 440], [1106, 454]]) blob(g, x, y, 12, 10, night ? dye('rose', 0) : dye('rose', 2))
  // Roof: thatch, with the ridge the cock stands on.
  const thatch = g.createLinearGradient(0, 120, 0, 230)
  thatch.addColorStop(0, night ? dye('ochre', 0) : dye('ochre', 2))
  thatch.addColorStop(1, night ? dye('walnut', 1) : dye('ochre', 1))
  shape(g, [[716, 226], [770, 150], [1240, 132], [1240, 226]], thatch)
  for (let i = 0; i < 12; i++) line(g, [[738 + i * 42, 214], [760 + i * 42, 158]], night ? dye('walnut', 0) : dye('ochre', 0), 7)
  line(g, [[764, 152], [1220, 134]], night ? dye('walnut', 0) : dye('walnut', 2), 14)
  // Where the lamp hangs.
  line(g, [[LAMP.x, 222], [LAMP.x, LAMP.y - 40]], dye('walnut', 0), 8)
  // Boards of the porch.
  g.fillStyle = night ? dye('walnut', 1) : dye('walnut', 2)
  g.fillRect(760, 600, 420, 40)
  for (let i = 0; i < 5; i++) line(g, [[800 + i * 84, 606], [790 + i * 84, 636]], dye('walnut', night ? 0 : 1), 7)
}

/** The shelf of plain cloth the six things stand on. */
function band(g: G, night: boolean): void {
  g.fillStyle = dye('walnut', 0)
  g.fillRect(0, BAND.top - 8, 1180, 8)
  g.fillStyle = night ? dye('walnut', 1) : dye('sage', 0)
  g.fillRect(0, BAND.top, 1180, 180)
}

/** A madder border with a running row of lozenges, as far as the surface goes. */
function border(g: G): void {
  g.fillStyle = dye('madder', 1)
  g.fillRect(-3000, 6, 7000, 808)
  g.fillRect(4, -3000, 1172, 7000)
  for (let i = -60; i < 110; i++) {
    const x = i * 32 + 12
    for (const y of [9, 811]) shape(g, [[x - 12, y], [x, y - 8], [x + 12, y], [x, y + 8]], i % 2 ? dye('ochre', 2) : dye('cream', 2))
  }
  for (let i = -60; i < 110; i++) {
    const y = i * 24 + 10
    for (const x of [9, 1171]) shape(g, [[x - 8, y], [x, y - 9], [x + 8, y], [x, y + 9]], i % 2 ? dye('indigo', 2) : dye('cream', 2))
  }
  // The cloth goes on: bands of warp ends past the picture.
  for (let i = 1; i < 12; i++) {
    for (const x of [-i * 60, 1180 + i * 60 - 20]) {
      g.fillStyle = i % 3 ? dye('indigo', 0) : dye('ochre', 0)
      g.fillRect(x, -3000, 20, 7000)
    }
    for (const y of [-i * 48, 820 + i * 48 - 16]) {
      g.fillStyle = i % 3 ? dye('indigo', 0) : dye('ochre', 0)
      g.fillRect(-3000, y, 7000, 16)
    }
  }
}

/** The cock on the roof, full of air. */
export function paintCock(g: G, full: number, crow: number, duck: number, blink: boolean): void {
  g.save()
  g.translate(0, duck * 30)
  g.scale(1 + full * 0.1, (1 + full * 0.06) * (1 - duck * 0.35))
  for (const x of [-8, 10]) line(g, [[x, 4], [x, 26]], dye('ochre', 2), 7)
  for (const [dx, dy, c] of [[-58, -44, 'indigo'], [-64, -20, 'sage'], [-50, -62, 'madder']] as const) limb(g, [-18, -8], [dx + 6, dy - 22], [dx, dy], dye(c, 1), 13)
  soft(g, [[-32, -22], [-6, -14], [30, -40], [44, 4], [16, 18], [-20, 14]], lit(g, 4, -4, 40, dye('madder', 2), dye('madder', 0)))
  limb(g, [24, -10], [32, -34], [28 + crow * 10, -52 - crow * 14], dye('ochre', 2), 26)
  const x = 30 + crow * 12, y = -58 - crow * 16
  blob(g, x, y, 19, 18, dye('ochre', 3))
  blob(g, x + full * 8, y + 8, 14 * full + 2, 12 * full + 2, dye('rose', 2))
  for (const d of [-12, 0, 12]) blob(g, x + d, y - 20, 9, 11, dye('madder', 2))
  shape(g, [[x + 14, y - 6], [x + 38, y - crow * 10], [x + 14, y + 6]], dye('ochre', 1))
  if (crow > 0.1) shape(g, [[x + 14, y + 4], [x + 32, y + 12 + crow * 8], [x + 12, y + 14]], dye('ochre', 1))
  if (blink) line(g, [[x - 2, y - 4], [x + 8, y - 4]], dye('walnut', 0), 6)
  else blob(g, x + 4, y - 4, 6, 6, dye('walnut', 0))
  g.restore()
}

export function paintLamp(g: G, lit_: boolean, swing: number): void {
  g.save()
  g.translate(LAMP.x, LAMP.y - 40)
  g.rotate(swing)
  limb(g, [-22, 22], [0, -14], [22, 22], dye('walnut', 0), 7)
  shape(g, [[-32, 30], [-20, 12], [20, 12], [32, 30]], dye('walnut', 1))
  g.fillStyle = lit_ ? dye('ochre', 3) : dye('indigo', 0)
  g.fillRect(-26, 30, 52, 60)
  if (lit_) soft(g, [[-12, 84], [-8, 58], [2, 40], [12, 62], [10, 84]], dye('madder', 2))
  for (const x of [-27, 27]) line(g, [[x, 30], [x, 90]], dye('walnut', 1), 8)
  shape(g, [[-34, 88], [34, 88], [26, 104], [-26, 104]], dye('walnut', 1))
  g.restore()
}

export function paintSun(g: G, x: number, y: number, t: number): void {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.06, long = i % 2 ? 76 : 92
    shape(g, [[x + Math.cos(a - 0.16) * 48, y + Math.sin(a - 0.16) * 48], [x + Math.cos(a) * long, y + Math.sin(a) * long], [x + Math.cos(a + 0.16) * 48, y + Math.sin(a + 0.16) * 48]], i % 2 ? dye('madder', 3) : dye('ochre', 2))
  }
  blob(g, x, y, 50, 49, lit(g, x, y, 50, dye('ochre', 3), dye('ochre', 2)))
  // A sun with a face, as they are woven.
  for (const side of [-1, 1]) line(g, [[x + side * 18 - 7, y - 6], [x + side * 18 + 7, y - 6]], dye('ochre', 0), 7)
  soft(g, [[x - 16, y + 12], [x, y + 16], [x + 16, y + 12], [x, y + 26]], dye('ochre', 0))
}
