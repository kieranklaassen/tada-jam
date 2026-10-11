import { STAGE } from '../stage'
import { FRAME, GRASS_Y, GROUND, MOUTH_X, SURFACE } from './layout'
import * as P from './palette'

// What stands still: the sky, the far hills, the grass and the invaders' camp, and the wooden frame of the farm.
// It is painted once into a cached sheet when the surface changes size, and stamped as one draw a frame.

type Pen = CanvasRenderingContext2D

const blob = (pen: Pen, x: number, y: number, rx: number, ry: number) => {
  pen.beginPath()
  pen.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  pen.fill()
}

/** One blade of grass: a thin leaf from its foot, leaning. */
function blade(pen: Pen, x: number, foot: number, height: number, lean: number, width: number): void {
  pen.beginPath()
  pen.moveTo(x - width / 2, foot)
  pen.quadraticCurveTo(x + lean * 0.4, foot - height * 0.6, x + lean, foot - height)
  pen.quadraticCurveTo(x + lean * 0.6 + width, foot - height * 0.5, x + width / 2, foot)
  pen.closePath()
  pen.fill()
}

/** A toadstool with a fat stalk and a spotted cap. */
function toadstool(pen: Pen, x: number, foot: number, size: number, cap: string, tilt: number): void {
  pen.save()
  pen.translate(x, foot)
  pen.rotate(tilt)
  pen.fillStyle = '#f3ead2'
  pen.beginPath()
  pen.moveTo(-size * 0.16, 0)
  pen.quadraticCurveTo(-size * 0.2, -size * 0.5, -size * 0.1, -size * 0.74)
  pen.lineTo(size * 0.1, -size * 0.74)
  pen.quadraticCurveTo(size * 0.2, -size * 0.5, size * 0.16, 0)
  pen.closePath()
  pen.fill()
  pen.fillStyle = '#d9cdb0'
  pen.fillRect(-size * 0.13, -size * 0.74, size * 0.26, size * 0.06)
  pen.fillStyle = cap
  pen.beginPath()
  pen.moveTo(-size * 0.52, -size * 0.7)
  pen.bezierCurveTo(-size * 0.5, -size * 1.18, size * 0.5, -size * 1.18, size * 0.52, -size * 0.7)
  pen.quadraticCurveTo(0, -size * 0.6, -size * 0.52, -size * 0.7)
  pen.closePath()
  pen.fill()
  pen.fillStyle = '#fff6e0'
  blob(pen, -size * 0.24, -size * 0.86, size * 0.07, size * 0.05)
  blob(pen, size * 0.06, -size * 0.97, size * 0.09, size * 0.06)
  blob(pen, size * 0.3, -size * 0.82, size * 0.06, size * 0.045)
  pen.fillStyle = 'rgba(255,255,255,0.55)'
  blob(pen, -size * 0.3, -size * 0.98, size * 0.1, size * 0.03)
  pen.restore()
}

/** A tent pitched from one big leaf over a twig, its door a dark slit. */
function leafTent(pen: Pen, x: number, foot: number, size: number, leaf: string, vein: string): void {
  pen.fillStyle = leaf
  pen.beginPath()
  pen.moveTo(x - size * 0.62, foot)
  pen.quadraticCurveTo(x - size * 0.2, foot - size * 0.5, x, foot - size * 0.78)
  pen.quadraticCurveTo(x + size * 0.24, foot - size * 0.5, x + size * 0.66, foot)
  pen.closePath()
  pen.fill()
  pen.fillStyle = 'rgba(20,40,10,0.55)'
  pen.beginPath()
  pen.moveTo(x - size * 0.13, foot)
  pen.quadraticCurveTo(x - size * 0.02, foot - size * 0.34, x, foot - size * 0.5)
  pen.quadraticCurveTo(x + size * 0.04, foot - size * 0.3, x + size * 0.15, foot)
  pen.closePath()
  pen.fill()
  pen.strokeStyle = vein
  pen.lineWidth = 2
  pen.beginPath()
  pen.moveTo(x, foot - size * 0.78)
  pen.lineTo(x + size * 0.02, foot - size * 0.96)
  pen.moveTo(x - size * 0.4, foot - size * 0.1)
  pen.quadraticCurveTo(x - size * 0.3, foot - size * 0.3, x - size * 0.12, foot - size * 0.56)
  pen.moveTo(x + size * 0.44, foot - size * 0.1)
  pen.quadraticCurveTo(x + size * 0.3, foot - size * 0.32, x + size * 0.12, foot - size * 0.58)
  pen.stroke()
}

/** The log the next party waits on, lying beside the mouth. */
function log(pen: Pen, x: number, foot: number, length: number): void {
  pen.fillStyle = '#8a5a34'
  pen.beginPath()
  pen.roundRect(x, foot - 26, length, 26, 12)
  pen.fill()
  pen.fillStyle = '#a9744a'
  pen.beginPath()
  pen.roundRect(x + 6, foot - 24, length - 16, 8, 4)
  pen.fill()
  pen.fillStyle = '#d9b07a'
  blob(pen, x + length - 5, foot - 13, 9, 13)
  pen.strokeStyle = '#a97a48'
  pen.lineWidth = 2
  pen.beginPath()
  pen.ellipse(x + length - 5, foot - 13, 4.5, 7, 0, 0, Math.PI * 2)
  pen.stroke()
  pen.fillStyle = '#6d4426'
  pen.fillRect(x + length * 0.3, foot - 9, 14, 2)
  pen.fillRect(x + length * 0.55, foot - 15, 10, 2)
  // A twig stub with one leaf, so it is a log and not a bar.
  pen.strokeStyle = '#8a5a34'
  pen.lineWidth = 5
  pen.lineCap = 'round'
  pen.beginPath()
  pen.moveTo(x + length * 0.22, foot - 24)
  pen.lineTo(x + length * 0.17, foot - 40)
  pen.stroke()
  pen.fillStyle = P.GRASS.light
  pen.beginPath()
  pen.ellipse(x + length * 0.14, foot - 45, 9, 5, -0.6, 0, Math.PI * 2)
  pen.fill()
}

/** The sky, the far hills, the grass and the camp. Everything here lies between the frame's inner edges. */
function paintSurface(pen: Pen): void {
  const { x, y, width, height } = SURFACE
  const sky = pen.createLinearGradient(0, y, 0, y + height)
  sky.addColorStop(0, P.SKY.top)
  sky.addColorStop(1, P.SKY.low)
  pen.fillStyle = sky
  pen.fillRect(x, y, width, height)
  pen.fillStyle = P.SKY.cloud
  for (const [cx, cy, s] of [[170, 66, 1], [860, 58, 1.25], [1050, 92, 0.7], [470, 50, 0.6]] as const) {
    blob(pen, cx, cy, 44 * s, 15 * s)
    blob(pen, cx - 26 * s, cy + 5 * s, 26 * s, 11 * s)
    blob(pen, cx + 30 * s, cy + 6 * s, 30 * s, 11 * s)
    blob(pen, cx + 6 * s, cy - 10 * s, 24 * s, 13 * s)
  }
  pen.fillStyle = P.SKY.far
  pen.beginPath()
  pen.moveTo(x, GRASS_Y)
  pen.bezierCurveTo(x + 200, GRASS_Y - 96, x + 420, GRASS_Y - 30, x + 620, GRASS_Y - 70)
  pen.bezierCurveTo(x + 820, GRASS_Y - 110, x + 980, GRASS_Y - 40, x + width, GRASS_Y - 84)
  pen.lineTo(x + width, GRASS_Y)
  pen.closePath()
  pen.fill()
  pen.fillStyle = P.SKY.hill
  pen.beginPath()
  pen.moveTo(x, GRASS_Y - 30)
  pen.bezierCurveTo(x + 260, GRASS_Y - 70, x + 420, GRASS_Y - 8, x + 640, GRASS_Y - 36)
  pen.bezierCurveTo(x + 860, GRASS_Y - 62, x + 1000, GRASS_Y - 14, x + width, GRASS_Y - 44)
  pen.lineTo(x + width, GRASS_Y)
  pen.lineTo(x, GRASS_Y)
  pen.closePath()
  pen.fill()
  // Tall grass behind the camp, darker, so the campers stand in front of something.
  pen.fillStyle = P.GRASS.dark
  for (let n = 0; n < 150; n++) {
    const gx = x + ((n * 97) % 1117) + 2, h = 22 + ((n * 53) % 30)
    if (Math.abs(gx - MOUTH_X) < 60) continue
    blade(pen, gx, GRASS_Y, h, ((n * 31) % 17) - 8, 7)
  }
  leafTent(pen, 120, GRASS_Y, 118, '#5fae4a', '#3f8436')
  leafTent(pen, 236, GRASS_Y, 86, '#8fc15a', '#5f943a')
  leafTent(pen, 1068, GRASS_Y, 104, '#d2a441', '#9c7426')
  toadstool(pen, 800, GRASS_Y, 96, '#d9463a', -0.06)
  toadstool(pen, 874, GRASS_Y, 62, '#e8743a', 0.12)
  toadstool(pen, 968, GRASS_Y, 74, '#d9463a', 0.05)
  toadstool(pen, 52, GRASS_Y, 46, '#e8743a', -0.1)
  log(pen, 368, GRASS_Y, 150)
  // A washing line between two stalks, with a leaf and a sock on it.
  pen.strokeStyle = P.GRASS.dark
  pen.lineWidth = 4
  pen.lineCap = 'round'
  pen.beginPath()
  pen.moveTo(884, GRASS_Y)
  pen.lineTo(888, GRASS_Y - 92)
  pen.moveTo(1016, GRASS_Y)
  pen.lineTo(1012, GRASS_Y - 96)
  pen.stroke()
  pen.strokeStyle = '#f3ead2'
  pen.lineWidth = 1.5
  pen.beginPath()
  pen.moveTo(888, GRASS_Y - 90)
  pen.quadraticCurveTo(950, GRASS_Y - 76, 1012, GRASS_Y - 94)
  pen.stroke()
  pen.fillStyle = '#e2573a'
  pen.beginPath()
  pen.roundRect(912, GRASS_Y - 86, 9, 22, 4)
  pen.roundRect(912, GRASS_Y - 70, 17, 8, 4)
  pen.fill()
  pen.fillStyle = '#f1d58a'
  pen.beginPath()
  pen.roundRect(942, GRASS_Y - 82, 22, 18, 3)
  pen.fill()
  pen.fillStyle = '#6a4fb0'
  pen.beginPath()
  pen.roundRect(976, GRASS_Y - 88, 9, 20, 4)
  pen.roundRect(976, GRASS_Y - 74, 16, 8, 4)
  pen.fill()
  // A ring of pebbles with twigs laid for a fire that is never lit.
  pen.fillStyle = P.STONE.edge
  for (const dx of [-22, -11, 0, 11, 22]) blob(pen, 300 + dx, GRASS_Y - 4, 7, 5)
  pen.strokeStyle = '#6d4426'
  pen.lineWidth = 4
  pen.beginPath()
  pen.moveTo(286, GRASS_Y - 6)
  pen.lineTo(310, GRASS_Y - 24)
  pen.moveTo(314, GRASS_Y - 6)
  pen.lineTo(290, GRASS_Y - 24)
  pen.stroke()
  // Grass in front, lighter, and a few daisies.
  pen.fillStyle = P.GRASS.blade
  for (let n = 0; n < 190; n++) {
    const gx = x + ((n * 59) % 1119) + 1, h = 8 + ((n * 37) % 15)
    if (Math.abs(gx - MOUTH_X) < 34) continue
    blade(pen, gx, GRASS_Y + 2, h, ((n * 23) % 11) - 5, 6)
  }
  pen.fillStyle = P.GRASS.light
  for (let n = 0; n < 70; n++) {
    const gx = x + ((n * 131) % 1113) + 4
    if (Math.abs(gx - MOUTH_X) < 34) continue
    blade(pen, gx, GRASS_Y + 2, 7 + ((n * 41) % 9), ((n * 29) % 9) - 4, 5)
  }
  for (const [dx, dy] of [[196, 20], [660, 26], [724, 18], [1120, 24]] as const) {
    pen.fillStyle = '#fffdf5'
    for (let k = 0; k < 6; k++) blob(pen, dx + Math.cos(k * 1.05) * 5, GRASS_Y - dy + Math.sin(k * 1.05) * 5, 3.4, 3.4)
    pen.fillStyle = '#f2c230'
    blob(pen, dx, GRASS_Y - dy, 3, 3)
    pen.fillStyle = P.GRASS.blade
    pen.fillRect(dx - 1, GRASS_Y - dy + 5, 2, dy - 5)
  }
}

/** The frame: four boards with grain, a dark inner lip, and a peg in each corner. */
function paintFrame(pen: Pen): void {
  const { width, height } = STAGE
  pen.fillStyle = P.WOOD.mid
  pen.fillRect(0, 0, width, FRAME)
  pen.fillRect(0, height - FRAME, width, FRAME)
  pen.fillRect(0, 0, FRAME, height)
  pen.fillRect(width - FRAME, 0, FRAME, height)
  pen.fillStyle = P.WOOD.light
  pen.fillRect(0, 0, width, 5)
  pen.fillRect(0, 0, 5, height)
  pen.fillStyle = P.WOOD.grain
  for (let n = 0; n < 26; n++) {
    const gx = 40 + ((n * 211) % (width - 160)), len = 40 + ((n * 67) % 90)
    pen.fillRect(gx, 9 + (n % 3) * 6, len, 1.5)
    pen.fillRect(width - gx - len, height - FRAME + 8 + (n % 3) * 6, len, 1.5)
  }
  for (let n = 0; n < 18; n++) {
    const gy = 44 + ((n * 173) % (height - 170)), len = 36 + ((n * 59) % 80)
    pen.fillRect(9 + (n % 3) * 6, gy, 1.5, len)
    pen.fillRect(width - FRAME + 8 + (n % 3) * 6, height - gy - len, 1.5, len)
  }
  pen.fillStyle = P.WOOD.dark
  pen.fillRect(FRAME - 4, FRAME - 4, width - 2 * FRAME + 8, 4)
  pen.fillRect(FRAME - 4, height - FRAME, width - 2 * FRAME + 8, 4)
  pen.fillRect(FRAME - 4, FRAME - 4, 4, height - 2 * FRAME + 8)
  pen.fillRect(width - FRAME, FRAME - 4, 4, height - 2 * FRAME + 8)
  for (const [cx, cy] of [[15, 15], [width - 15, 15], [15, height - 15], [width - 15, height - 15]] as const) {
    pen.fillStyle = P.WOOD.peg
    blob(pen, cx, cy, 6.5, 6.5)
    pen.fillStyle = P.WOOD.light
    blob(pen, cx - 1.5, cy - 1.5, 2.2, 2.2)
  }
}

/** Paints everything that stands still, in stage units. The ground's own sheet goes over the gap it leaves. */
export function paintSetting(pen: Pen): void {
  pen.fillStyle = P.EARTH.open
  pen.fillRect(GROUND.x, GROUND.y, GROUND.width, GROUND.height)
  paintSurface(pen)
  paintFrame(pen)
}
