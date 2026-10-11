import type { Face } from './answers'
import { TAIL_AT, drawFace } from './figureArt'
import { COLOURS, isPair } from './garmentArt'
import { PART_Z, type Garden, type Hall } from './hall'
import { TUG_STEPS, type Figure, type Garment, type Part, type SpotPart, type Wearer } from './kinds'
import { ARMS, BODIES, CREASE_Y, DOG_HEAD, GARDEN, SHEET, armTo, gardenPose, paperBox, scarfTip, type Box, type Point, type Pose } from './layout'
import { blinking } from './motion'
import type { Bits, Cell, Taste } from './outing'
import { KEY_LINE, type Pen } from './paper'
import { SKY } from './scenery'
import { UNDER_THE_HEAD, drawArm, drawButtons, drawZip, paintWeather, traceWeather, type Brush, type Sprites } from './view'
import { AT_REST, BURST, RULER, burstAt, dogIn, figureIn, garmentShift, handsOf, hoodOf, lobAt, reachFor, standing, toeCurl, type Reach, type Shift, type Stance } from './weathering'

// The garden on the back of the hall sheet, while an outing plays. It draws
// what went out (the outfit the hall copied at the door) and lays on it what
// the step that is playing says: the garment's move, the figure's stance in
// its own manner, the dog's, the face, the hands, and the small things the
// weather adds. Every number comes from weathering.ts, outing.ts and
// layout.ts; nothing here decides anything.
//
// In the garden a figure is the same paper cut another way: its body without
// its arms, and each arm by itself, so that a hand can fan a face, scratch
// under a hat, pull at a collar or pat what is on a head.

const WET = '#4f9fd6'
const SNOW = '#fdfeff'
/** Where the sun stands in the garden's sky: left of the home control, clear of it and of the tall post. */
export const SUN = { x: 400, y: 116, r: 46 }
/** The colour of each figure's socks at the toes. */
const SOCK: Record<Figure, string> = { child: '#fbf9f0', grandfather: '#7c8f5a', baby: '#fbf9f0' }

function lines(brush: Brush, colour: string, width: number): void {
  const g = brush.g
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.stroke()
  brush.calls += 1
}

function filled(brush: Brush, colour: string): void {
  brush.g.fillStyle = colour
  brush.g.fill()
  brush.calls += 1
}

/** One garment of the outfit, on the pen's wearer (the pen is on the middle of its stand), moved as the weather moves it. */
function garmentOn(brush: Brush, sprites: Sprites, garden: Garden, garment: Garment, pose: Pose, at: Point, shift: Shift): void {
  const g = brush.g, o = garden.outfit, art = sprites.garments
  const open = garment === 'umbrella' && o.open
  const sides: readonly (1 | -1)[] = isPair(garment) ? [1, -1] : [1]
  for (const side of sides) {
    const own = side === -1 && shift.other ? shift.other : { dx: 0, dy: 0, rot: 0 }
    g.save()
    g.translate(pose.x - at.x + shift.dx + own.dx, pose.y - at.y + shift.dy + own.dy)
    g.rotate(pose.rot + shift.rot + own.rot)
    g.scale(shift.sx, shift.sy)
    if (isPair(garment)) {
      g.translate(side * pose.sep * shift.apart, 0)
      g.scale(side, 1)
    }
    if (garment === 'boots') {
      // Boots that are not tugged right on sit high and askew, wherever they are worn.
      g.translate(0, -9 * (TUG_STEPS - o.tug))
      g.rotate(0.09 * (TUG_STEPS - o.tug))
    }
    brush.stamp(garment === 'umbrella' ? (shift.flip > 0.5 ? art.blownUmbrella : open ? art.openUmbrella.folded : art.piece.umbrella.folded) : art.piece[garment].folded)
    if (garment === 'raincoat') drawZip(brush, art, o.zip, true)
    if (garment === 'duffel') drawButtons(brush, art, o.buttons.map((through) => (through ? 1 : 0)))
    g.restore()
  }
}

/** Sets the pen on a stand with a stance laid over it (weathering.ts has the numbers). */
function stand(g: Pen, at: Point, stance: Stance, who: Wearer): void {
  const by = standing(at, stance, who)
  g.translate(by.x, by.y)
  g.rotate(by.rot)
  g.scale(by.sx, by.sy)
}

/**
 * The small things the weather adds round a box of paper, at `u` of the cell. `sock` is the colour of the toes
 * that curl. The snowball and the splash of a jump travel, and are drawn by the garden itself.
 */
function bits(brush: Brush, b: Bits, box: Box, u: number, t: number, sock: string): void {
  const g = brush.g, w = box.x1 - box.x0, cx = (box.x0 + box.x1) / 2
  const edge = b.kind === 'pool' ? box.y1 : b.at === 'top' ? box.y0 : b.at === 'hem' ? box.y1 : (box.y0 + box.y1) / 2
  const swell = Math.sin(Math.PI * Math.min(1, u))
  g.beginPath()
  switch (b.kind) {
    case 'drops':
      for (let i = 0; i < b.n; i++) {
        const along = (i + 0.5) / b.n, phase = (u * 3 + i * 0.37) % 1
        let x = box.x0 + w * along, y = edge
        if (b.way === 'fall') y += 46 * phase
        else if (b.way === 'bounce') { x += (along - 0.5) * 30 * phase; y -= 26 * Math.sin(Math.PI * phase) }
        else { const side = i % 2 ? 1 : -1; x = cx + side * (w / 2 + 70 * phase); y += 30 * phase * phase }
        g.moveTo(x + 4, y)
        g.arc(x, y, 4, 0, Math.PI * 2)
      }
      filled(brush, WET)
      return
    case 'mound': {
      const grown = Math.min(1, u / 0.7), gone = b.falls && u > 0.74
      if (gone) {
        const out = (u - 0.74) / 0.26
        for (let i = 0; i < 5; i++) { const x = cx + (i - 2) * 26 * (1 + out), y = edge + 80 * out + (i % 2) * 14; g.moveTo(x + 9, y); g.arc(x, y, 9 * (1 - out * 0.5), 0, Math.PI * 2) }
      } else if (b.shape === 'cone') { g.moveTo(cx - 18, edge + 6); g.lineTo(cx, edge - 90 * grown); g.lineTo(cx + 18, edge + 6); g.closePath() }
      else { g.ellipse(cx, edge + 4, w * (b.shape === 'pile' ? 0.42 : 0.36), 8 + (b.shape === 'pile' ? 34 : 20) * grown, 0, Math.PI, Math.PI * 2); g.closePath() }
      filled(brush, SNOW)
      lines(brush, 'rgba(74, 63, 58, 0.5)', 1.4)
      return
    }
    case 'dots':
      for (let i = 0; i < 6; i++) {
        const along = (i + 0.5) / 6
        let x = box.x0 + w * along, y = edge, r = 4
        if (b.way === 'in') { x = cx + (along - 0.5) * 40; y = box.y0 - 30 + 70 * ((u * 2 + along) % 1) }
        else if (b.way === 'prints') { x = cx - 150 + i * 50; y = box.y1 + 6 + (i % 2) * 8; r = i / 6 < u ? 9 : 0 }
        else if (b.way === 'holes') { x = cx - 60 + i * 26; y = box.y1 + 4; r = i / 6 < u ? 4 : 0 }
        else { x = box.x0 + w * ((along * 7) % 1); y = box.y0 + (box.y1 - box.y0) * ((along * 3 + 0.2) % 1); r = 3 * swell }
        if (r <= 0) continue
        g.moveTo(x + r, y)
        g.ellipse(x, y, r, b.way === 'prints' ? r * 0.5 : r, 0, 0, Math.PI * 2)
      }
      filled(brush, b.way === 'prints' || b.way === 'holes' ? 'rgba(120, 140, 160, 0.7)' : SNOW)
      return
    case 'streaks':
      for (let i = 0; i < 4; i++) {
        if (b.way === 'strings') { if (i > 1) break; const side = i ? 1 : -1; g.moveTo(cx + side * 20, box.y1 + 86); g.quadraticCurveTo(cx + side * 34, box.y1 + 30, cx + side * w * 0.3, box.y1) }
        else if (b.way === 'hoot') { if (i > 1) break; const y = box.y0 - 8 - i * 9; g.moveTo(box.x0 - 30 + 50 * u, y); g.quadraticCurveTo(cx, y - 14, box.x1 + 30 + 50 * u, y) }
        else { const y = edge - 20 + i * 16, x = box.x0 - 90 + ((u * 3 + i * 0.3) % 1) * (w + 180); g.moveTo(x, y); g.quadraticCurveTo(x + 30, y - 9, x + 64, y) }
      }
      lines(brush, b.way === 'strings' ? '#a8336a' : 'rgba(255, 253, 247, 0.9)', b.way === 'strings' ? 2 : 3)
      return
    case 'wisps':
      // Steam: soft puffs that rise and swell, each with a smaller one under it. Puffs, not wavy lines, which could be taken for a letter.
      for (let i = 0; i < 3; i++) {
        const rise = ((u * 2 + i * 0.3) % 1) * 70, x = cx + (i - 1) * 46 + 6 * Math.sin(rise / 11 + i), y = edge - rise, r = 5 + rise * 0.13
        g.moveTo(x + r, y - 10)
        g.arc(x, y - 10, r, 0, Math.PI * 2)
        g.moveTo(x - 5 + r * 0.6, y + 6)
        g.arc(x - 5, y + 6, r * 0.6, 0, Math.PI * 2)
      }
      filled(brush, 'rgba(255, 253, 247, 0.82)')
      return
    case 'spark': {
      const x = cx + w * 0.3, y = edge - 8, r = 8 + 10 * Math.abs(Math.sin(t * 9))
      // A glint cut from paper, four points and filled: not crossed lines, which could be taken for a sign.
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, reach = i % 2 ? r * 0.3 : r; if (i) g.lineTo(x + Math.cos(a) * reach, y + Math.sin(a) * reach); else g.moveTo(x + reach, y) }
      g.closePath()
      filled(brush, '#ffe9a8')
      return
    }
    case 'pool':
      switch (b.way) {
        case 'puddle': g.ellipse(cx, box.y1 + 8, 40 + 110 * Math.min(1, u * 1.4), 8 + 12 * Math.min(1, u * 1.4), 0, 0, Math.PI * 2); filled(brush, 'rgba(79, 159, 214, 0.75)'); return
        case 'trail': g.ellipse(cx + 70, box.y1 + 6, 70, 12, 0, 0, Math.PI * 2); filled(brush, 'rgba(79, 159, 214, 0.75)'); return
        case 'shade': g.ellipse(cx, box.y1, 230 * swell + 20, 26, 0, 0, Math.PI * 2); filled(brush, 'rgba(40, 70, 60, 0.3)'); return
        case 'soak': for (const foot of [0.25, 0.75]) { const x = box.x0 + w * foot, up = Math.min(1, u * 1.5); g.moveTo(x + 24, box.y1 - 6 - 8 * up); g.ellipse(x, box.y1 - 6 - 8 * up, 24, 5 + 10 * up, 0, 0, Math.PI * 2) } filled(brush, 'rgba(40, 60, 110, 0.45)'); return
        case 'blue': g.ellipse(box.x0 + w * 0.25, box.y1 - 8, 20, 10, 0, 0, Math.PI * 2); g.ellipse(box.x0 + w * 0.75, box.y1 - 8, 20, 10, 0, 0, Math.PI * 2); filled(brush, `rgba(90, 140, 220, ${0.7 * swell})`); return
        case 'toes': for (let i = 0; i < 4; i++) { const x = box.x0 - 30 - i * 9, y = box.y1 - 60 * swell - 6 * Math.sin(t * 14 + i); g.moveTo(x + 5, y); g.arc(x, y, 5, 0, Math.PI * 2) } filled(brush, '#f2a6bd'); return
        case 'flags': for (const side of [-1, 1]) { const x = cx + side * w * 0.42, flap = 10 * Math.sin(t * 26 + side); g.moveTo(x, box.y1 - 12); g.lineTo(x + side * 30, box.y1 - 18 + flap); g.lineTo(x, box.y1 - 2); g.closePath() } filled(brush, '#fbf9f0'); lines(brush, KEY_LINE, 1.4); return
        case 'grass': {
          for (let i = 0; i < 6; i++) { const x = box.x0 + w * (i / 5); g.moveTo(x, box.y1 + 4); g.lineTo(x + 5 * Math.sin(t * 3 + i), box.y1 - 16 * swell) }
          lines(brush, '#4f8f5c', 3)
          // The toe of each sock curls up off the grass, and uncurls again.
          const curl = toeCurl(u) * 1.25, long = 30
          g.beginPath()
          for (const side of [-1, 1]) {
            const x = cx + side * w * 0.36, y = box.y1 - 2
            g.moveTo(x, y)
            g.lineTo(x + side * long * Math.cos(curl), y - 2 - long * Math.sin(curl))
            g.lineTo(x + side * long * 0.8 * Math.cos(curl + 0.5), y - 2 - long * 0.8 * Math.sin(curl + 0.5))
            g.lineTo(x, y - 13)
            g.closePath()
          }
          filled(brush, sock)
          lines(brush, KEY_LINE, 1.4)
          return
        }
      }
  }
}

/** The garden, the figure that went out in what it went out in, the dog, and the step of the outing that is playing. */
export function drawGarden(brush: Brush, sprites: Sprites, hall: Hall, garden: Garden): void {
  const g = brush.g, o = garden.outfit, who = o.who, t = hall.t, weather = o.weather
  const step = garden.index >= 0 ? garden.steps[garden.index] : null, u = garden.u
  const cell: Cell | null = step && step.kind !== 'taste' ? step.cell : null
  const taste: Taste | null = step && step.kind === 'taste' ? step.taste : null
  const moving = step && step.kind === 'cell' ? step.garment : null
  // The sky, the sun in it, the garden and snow lying on the lawn. The gate comes after the figure.
  g.fillStyle = SKY[weather]
  g.fillRect(SHEET.x0, SHEET.y0, SHEET.x1 - SHEET.x0, SHEET.y1 - SHEET.y0)
  brush.calls += 1
  if (weather === 'sun') {
    g.beginPath()
    g.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2)
    filled(brush, '#ffd75a')
  }
  brush.stamp(sprites.scenery.garden)
  if (weather === 'snow') {
    g.beginPath()
    g.rect(SHEET.x0, GARDEN.ground + 26, SHEET.x1 - SHEET.x0, SHEET.y1 - GARDEN.ground - 26)
    filled(brush, 'rgba(253, 254, 255, 0.88)')
  }
  const falls = () => {
    if (weather !== 'sun') paintWeather(brush, weather, traceWeather(g, weather, t, SHEET.x0 + 10, SHEET.y0 + 10, SHEET.x1 - 10, SHEET.y1 - 30, weather === 'wind' ? 14 : 34, SUN), weather === 'rain' ? 2.4 : 3)
    else paintWeather(brush, weather, traceWeather(g, weather, t, 0, 0, 0, 0, 12, SUN), 5)
  }
  // While the sheet is still turning, the garden is empty: the figure and the dog are in it when it is over.
  if (hall.flip < 1) {
    brush.stamp(sprites.scenery.gate)
    falls()
    return
  }
  const F = GARDEN.figure, D = GARDEN.dog, body = BODIES[who], figures = sprites.figures
  const act = cell?.act ?? taste?.act ?? null
  const stance = figureIn(step, who, u), dogMoves = dogIn(step, u)
  const face: Face = cell?.face ?? taste?.face ?? 'rest'
  const open = (garment: Garment): boolean => garment === 'umbrella' && o.open
  // What lies on the ground under everyone: a puddle, a patch of shade.
  const feet: Box = { x0: F.x + stance.dx - body.footSep - 34, y0: F.y - 44, x1: F.x + stance.dx + body.footSep + 34, y1: F.y - 2 }
  const boxOf = (garment: Garment, part: SpotPart): Box => {
    const box = paperBox(garment, gardenPose(garment, who, part, open(garment)), open(garment))
    return { x0: box.x0 + stance.dx, y0: box.y0 - stance.up, x1: box.x1 + stance.dx, y1: box.y1 - stance.up }
  }
  const b = cell?.bits ?? null
  const under = b !== null && b.kind === 'pool' && (b.way === 'puddle' || b.way === 'shade' || b.way === 'trail')
  if (b && under) bits(brush, b, { ...feet, x0: F.x - 60, x1: F.x + 60 }, u, t, SOCK[who])
  // The dog, in what it has on: its own until the wind brings it the hat.
  const dogWears: Garment | null = garden.hatOnDog ? 'hat' : o.dog
  g.save()
  stand(g, D, dogMoves, 'dog')
  g.save()
  g.translate(TAIL_AT.x, TAIL_AT.y)
  g.rotate(0.5 * Math.sin(t * 15))
  brush.stamp(figures.tail)
  g.restore()
  brush.stamp(figures.dog)
  if (dogWears) garmentOn(brush, sprites, garden, dogWears, gardenPose(dogWears, 'dog', 'back', open(dogWears) && !garden.hatOnDog), D, AT_REST)
  brush.stamp(figures.dogHead)
  brush.calls += drawFace(g, 'dog', cell?.dog ? 'tongue' : 'rest', 0.6, 0, false)
  g.restore()
  // The figure, in its own manner, and what it wears from the lowest part up.
  type Worn = { garment: Garment; part: Part }
  const worn: Worn[] = [...o.worn].sort((a, c) => PART_Z[a.part] - PART_Z[c.part]).filter((w) => !(garden.hatOnDog && w.garment === 'hat'))
  // Where its hands go, if this act is one of the hands: to the thing that itches or is patted, wherever it is worn.
  const reached = worn.find((w) => (act === 'scratch' ? w.garment === moving : act === 'pats' && w.part === 'head'))
  let reach: Reach | null = null
  if (reached) {
    const box = paperBox(reached.garment, gardenPose(reached.garment, who, reached.part, open(reached.garment)), open(reached.garment))
    reach = reachFor(who, { x0: box.x0 - F.x, y0: box.y0 - F.y, x1: box.x1 - F.x, y1: box.y1 - F.y })
  }
  const hands = handsOf(act, who, u, reach), rest = ARMS[who].hand
  const lifted = hands.left !== null || hands.right !== null
  /** How far a hand has moved from where it hangs: as far as its arm lets it go. */
  const moved = (side: 1 | -1): Point => {
    const to = side === 1 ? hands.right : hands.left
    if (!to) return { x: 0, y: 0 }
    const got = armTo(who, { x: side * to.x, y: to.y }).hand
    return { x: side * (got.x - rest.x), y: got.y - rest.y }
  }
  const shiftOf = (garment: Garment, part: SpotPart): Shift => {
    let shift: Shift = AT_REST
    // The baby pulls whatever is on its head down over its ears.
    if (taste?.ears && part === 'head') shift = { ...AT_REST, dy: 34 * Math.sin(Math.PI * Math.min(1, u * 1.6) * 0.5) }
    else if (garment === moving && cell) {
      const pose = gardenPose(garment, who, part, open(garment))
      if (cell.move !== 'blowoff') shift = garmentShift(cell.move, u, { x: 0, y: 0 }, pose.rot)
      else {
        const to = gardenPose('hat', 'dog', 'back', false)
        shift = garmentShift('blowoff', u, { x: to.x - pose.x, y: to.y - pose.y })
      }
    }
    // What is on the hands goes where the hands go: a single thing is held in the right, a pair is on both.
    if (part !== 'hands' || !lifted) return shift
    const right = moved(1), left = moved(-1)
    if (!isPair(garment)) return { ...shift, dx: shift.dx + right.x, dy: shift.dy + right.y }
    return { ...shift, dx: shift.dx + right.x, dy: shift.dy + right.y, other: { dx: (shift.other?.dx ?? 0) + left.x - right.x, dy: (shift.other?.dy ?? 0) + left.y - right.y, rot: shift.other?.rot ?? 0 } }
  }
  // What is on the hands is drawn after an arm that is lifted, so that a mitten stays on its hand.
  const late = (w: Worn): boolean => lifted && w.part === 'hands'
  const upper = (pose: Pose): boolean => pose.y - F.y < CREASE_Y
  const clothes = (pick: (w: Worn, pose: Pose) => boolean) => {
    for (const w of worn) {
      const pose = gardenPose(w.garment, who, w.part, open(w.garment))
      if (pick(w, pose)) garmentOn(brush, sprites, garden, w.garment, pose, F, shiftOf(w.garment, w.part))
    }
  }
  const looks = () => { brush.calls += drawFace(g, who, face, 0, face === 'rest' ? -0.5 : 0, blinking(who, t) && face === 'rest') }
  // An arm that hangs is drawn with the body, under the clothes; one that is lifted is drawn over them.
  const arms = (up: boolean) => {
    for (const side of [-1, 1] as const) {
      const hand = side === 1 ? hands.right : hands.left
      if ((hand !== null) === up) drawArm(brush, figures, who, side, hand)
    }
  }
  g.save()
  stand(g, F, stance, who)
  if (who === 'grandfather') {
    brush.stamp(figures.armless.grandfatherLegs)
    clothes((w, pose) => !upper(pose) && !late(w))
    g.translate(0, CREASE_Y)
    g.rotate(stance.bend)
    g.translate(0, -CREASE_Y)
    brush.stamp(figures.armless.grandfatherTop)
    arms(false)
    looks()
    clothes((w, pose) => upper(pose) && !late(w))
  } else if (who === 'baby') {
    brush.stamp(figures.armless.baby)
    arms(false)
    clothes((w) => UNDER_THE_HEAD.includes(w.part) && !late(w))
    brush.stamp(figures.babyHead)
    looks()
    clothes((w) => !UNDER_THE_HEAD.includes(w.part) && !late(w))
  } else {
    brush.stamp(figures.armless.child)
    arms(false)
    looks()
    clothes((w) => !late(w))
  }
  // The raincoat's hood, up in the wind and rattling: round the face when the coat is on the body, and standing off the coat's own collar anywhere else.
  if (cell?.move === 'hood' && step && step.kind === 'cell') {
    const hood = hoodOf(u), pose = gardenPose('raincoat', who, step.part, false)
    if (hood.up > 0) {
      const onBody = step.part === 'body'
      const cx = onBody ? body.face.x - (pose.x - F.x) : 0, cy = onBody ? body.face.y - (pose.y - F.y) : -40, r1 = onBody ? body.faceR + 4 : 24, r2 = r1 + 18
      g.save()
      g.translate(pose.x - F.x, pose.y - F.y)
      g.rotate(pose.rot + hood.shake)
      g.scale(1, hood.up)
      g.beginPath()
      g.moveTo(cx - r2, 0)
      g.lineTo(cx - r2, cy)
      g.arc(cx, cy, r2, Math.PI, 0)
      g.lineTo(cx + r2, 0)
      g.lineTo(cx + r1, 0)
      g.lineTo(cx + r1, cy)
      g.arc(cx, cy, r1, 0, Math.PI, true)
      g.lineTo(cx - r1, 0)
      g.closePath()
      filled(brush, COLOURS.raincoat.colour)
      lines(brush, KEY_LINE, 2)
      g.restore()
    }
  }
  arms(true)
  clothes((w) => late(w))
  g.restore()
  // The gate stands on the near side of the lawn: whoever leans, lies or is blown that way is behind it.
  brush.stamp(sprites.scenery.gate)
  // What the weather adds round the garment that is answering, or at the feet.
  const box = step && step.kind === 'cell' ? boxOf(step.garment, step.part) : feet
  const dogHead = { x: D.x + (DOG_HEAD.x0 + DOG_HEAD.x1) / 2, y: D.y + (DOG_HEAD.y0 + DOG_HEAD.y1) / 2 }
  if (b && b.kind === 'mound' && b.shape === 'ball') {
    // The snowball: patted between the mittens, lobbed, and in pieces on the dog.
    const ball = lobAt(u, { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }, { x: dogHead.x - 40, y: D.y - 96 })
    g.beginPath()
    if (ball.burst <= 0) g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
    else {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * (0.1 + 0.16 * i), far = 60 * ball.burst, x = ball.x + Math.cos(a) * far, y = ball.y + Math.sin(a) * far + 70 * ball.burst * ball.burst
        g.moveTo(x + 9, y)
        g.arc(x, y, 9 * (1 - ball.burst * 0.6), 0, Math.PI * 2)
      }
    }
    filled(brush, SNOW)
    lines(brush, 'rgba(74, 63, 58, 0.5)', 1.4)
  } else if (b && b.kind === 'drops' && b.way === 'burst') {
    // The splash of the jump: it leaves the puddle as the feet come down, and the furthest of it lands on the dog.
    const from = { x: (feet.x0 + feet.x1) / 2, y: feet.y1 - 4 }, reach = from.x - dogHead.x
    const r = 4.5 * (1 - 0.5 * Math.max(0, (u - BURST.lands) / (1 - BURST.lands)))
    g.beginPath()
    for (let i = 0; i < b.n; i++) {
      const at = burstAt(i, b.n, u, reach)
      if (!at) continue
      // The half that goes the dog's way comes down at the height of its head.
      const fall = i < b.n / 2 ? (dogHead.y - from.y) * Math.min(1, Math.abs(at.x) / reach) : 0
      g.moveTo(from.x + at.x + r, from.y + at.y + fall)
      g.arc(from.x + at.x, from.y + at.y + fall, r, 0, Math.PI * 2)
    }
    filled(brush, WET)
  } else if (b && b.kind === 'spark' && cell?.move === 'ruler' && step && step.kind === 'cell') {
    // The frozen tail knocks the gate's post: a glint where its tip is, from the knock until the figure turns back.
    if (u >= RULER.knocks && u < RULER.stays) {
      const tip = scarfTip(who, step.part)
      bits(brush, b, { x0: GARDEN.post.x - 12, y0: tip.y, x1: GARDEN.post.x - 12, y1: tip.y + 8 }, u, t, SOCK[who])
    }
  } else if (b && !under) bits(brush, b, box, u, t, SOCK[who])
  // What falls or blows, over everything.
  falls()
}
