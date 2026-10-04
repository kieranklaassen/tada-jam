// Four of the eight guests: the lizard, the cook, the fly and the singer. The
// other four, and what a pose is, are in inkGuests.ts.

import type { Pose } from './inkGuests'
import { PAPER, SPOT, type Pen } from './inkHatch'
import { bedclothes, glance, legs, shut } from './inkParts'

// The lizard in a scarf: sitting up in bed, in profile, hugging its hot-water bottle.
export function lizard(pen: Pen, pose: Pose, inBed: boolean): void {
  // Reached by anything it minds, it goes grey and stiff. Cross for want of warmth it has an icicle and a shiver as well; cross because a noise will not let it sleep it has neither, and one eye open instead.
  const cross = pose.mood === 'cross', cold = cross && !pose.woken, kept = cross && !!pose.woken, glad = pose.mood === 'happier'
  const skin = cross ? PAPER : SPOT, grey = cross ? 2 : 0
  const [lookX, lookY] = glance(pose.looks ?? (pose.turnedTo === 'up' || pose.turnedTo === 'down' ? pose.turnedTo : null))
  const g = pen.ctx
  // The tail. In bed its tip comes out from under the bedclothes at the foot; standing, it leaves the body low at the back and curves up behind, never apart from it. Happier, it curls right round on itself.
  if (!inBed) pen.tube(glad ? [12, -46, 28, -40, 40, -48, 42, -62, 34, -68, 28, -60, 34, -54] : [12, -46, 28, -40, 40, -48, 43, -62], 5.5, skin, 1.4)
  else if (glad) pen.tube([-64, -44, -78, -50, -86, -64, -78, -74, -70, -68, -74, -60, -80, -64], 5, skin, 1.4)
  else pen.tube([-64, -44, -76, -50, -84, -62, -79, -70], 5.5, skin, 1.4)
  // The crest down the back of the head and neck: it stands up taller when it is happier.
  const crest = glad ? 1.7 : 1
  for (const [x, y] of [[4, -154], [14, -145], [18, -132]] as const) pen.shape([x - 4, y + 4, x + 11 * crest, y - 4 * crest, x + 2, y + 12], { fill: skin, w: 1.4, sharp: true })
  pen.shape([-17, -40, -20, -70, -14, -96, -2, -104, 12, -98, 18, -72, 16, -40], { fill: skin, tone: grey, w: 1.9 })
  // The head: a long flat snout held level, a shut eye, a mouth like a ruled line. It lifts or drops the snout to look.
  g.save()
  g.translate(8, -124)
  g.rotate(lookY * 0.32)
  g.translate(-8, 124)
  pen.shape([12, -120, 17, -138, 8, -153, -10, -155, -32, -147, -52, -143, -59, -135, -51, -127, -16, -122], { fill: skin, tone: grey, w: 1.9 })
  pen.line([-58, -134, -36, -132, -14, -131], 1.4)
  pen.dot(-52, -140, 1.2)
  const sees = pose.awake || !!pose.looks || kept
  pen.ellipse(-9, -143, 6, 5.5, { fill: sees ? PAPER : skin, w: 1.4 })
  if (sees) pen.dot(-9 + (pose.looks ? lookX * 2.6 : -2), -143 + lookY * 2, 2.3); else shut(pen, -9, -143, 4.6)
  // Kept awake: the eye that should be shut is open, under a heavy lid, with a bag beneath it.
  if (kept) { pen.line([-17, -149, -9, -147, -1, -150], 2.4); pen.line([-14, -136, -9, -134, -4, -136], 1) }
  // Grey with cold, an icicle hangs off the end of its nose.
  if (cold) pen.shape([-58, -133, -53, -133, -55, -119], { fill: PAPER, w: 1.1, sharp: true })
  g.restore()
  // The scarf, three times round and hanging down the back.
  pen.shape([13, -116, 24, -108, 26, -76, 31, -60, 17, -60, 16, -78, 10, -100], { fill: PAPER, w: 1.6 })
  for (let y = -104; y < -64; y += 10) pen.tone([11, y, 27, y + 2, 28, y + 7, 13, y + 5], 2, 0.2)
  for (const x of [19, 23, 27, 31]) pen.line([x, -60, x + 0.6, -51], 1.1)
  for (const [y, half] of [[-102, 20], [-111, 18.5], [-119, 16]] as const) {
    const coil = [-half, y, -half + 4, y - 6, half - 4, y - 6, half, y, half - 4, y + 6, -half + 4, y + 6]
    pen.shape(coil, { fill: PAPER, w: 0 })
    pen.inside(coil, false, () => { for (let x = -half + 2; x < half; x += 11) pen.tone([x, y - 7, x + 5.5, y - 7, x + 3, y + 7, x - 2.5, y + 7], 2, 0.2) })
    pen.shape(coil, { w: 1.6 })
  }
  // The hot-water bottle: stopper, shoulders, and slanting ribs; both arms round it.
  pen.rect(-27, -106, 10, 5, { fill: PAPER, w: 1.2 })
  pen.rect(-25, -101, 6, 7, { fill: PAPER, w: 1.2 })
  pen.shape([-37, -54, -38, -86, -31, -95, -13, -95, -6, -86, -6, -54, -12, -47, -31, -47], { fill: PAPER, w: 1.7 })
  pen.inside([-34, -52, -34, -88, -10, -88, -10, -52], true, () => {
    // Ribbed one way only: ribs both ways would be a field of crosses.
    for (let k = -110; k < 20; k += 7) pen.line([k, -92, k + 46, -46], 0.7, true)
  })
  for (const y of [-78, -61]) {
    pen.tube([10, y - 8, -8, y - 2, -36, y], 7.5, skin, 1.5)
    for (const k of [-3, 0, 3]) pen.line([-40, y + k, -45, y + k * 1.4], 1.2, true)
  }
  // Stiff with cold, it shivers: short wavering lines either side.
  // Each a wavering line of six strokes: a single bent stroke would be a chevron.
  if (cold) for (const [x, y] of [[-50, -96], [-48, -70], [34, -110], [36, -86]] as const) pen.line([x, y - 6, x + 2, y - 4, x, y - 2, x + 2, y, x, y + 2, x + 2, y + 4, x, y + 6], 0.9)
  if (inBed) bedclothes(pen)
  else legs(pen, 8, -42, skin)
}

// The cook: a toad in a tall hat, asleep on the floor against its own cauldron, spoon upright in its fist.
export function cook(pen: Pen, pose: Pose): void {
  const chilled = pose.mood === 'cross', hums = pose.mood === 'happier'
  // Its head is drawn front on: cross, its eyes go to the side its trouble comes through, and down to the floor when it has no side (an ice box in its own room). A cross guest never looks out of the page at the child.
  const [lookX, lookY] = glance(pose.looks ?? pose.toward ?? (pose.turnedTo === 'up' || pose.turnedTo === 'down' ? pose.turnedTo : chilled ? 'down' : null))
  // Awake and warm enough, a small fire burns under the pot: it stews by day.
  if (pose.awake && !chilled) for (const [x, tall] of [[28, 11], [38, 15], [48, 10]] as const) {
    pen.shape([x, -tall, x + 4, -tall * 0.4, x + 3.5, 0, x - 3.5, 0, x - 4, -tall * 0.5, x - 1.5, -tall * 0.7], { fill: PAPER, w: 1.1 })
  }
  // The cauldron: iron, so hatched as dark as anything on the page, with a rim and three feet.
  for (const x of [20, 40, 60]) pen.line([x, -8, x + (x - 40) * 0.2, 0], 3, true)
  const pot = [10, -52, 4, -34, 9, -16, 24, -6, 52, -6, 68, -16, 74, -34, 68, -52]
  pen.shape(pot, { fill: PAPER, tone: 4, angle: 1.2, w: 0 })
  pen.tone([44, -52, 68, -52, 74, -34, 68, -16, 52, -6, 44, -6], 2, 0.3)
  pen.shape(pot, { w: 1.9 })
  pen.ellipse(39, -54, 33, 7, { fill: PAPER, tone: 4, angle: 0, w: 1.7 })
  pen.line([12, -60, 22, -63], 0.9)
  // The pot's handle: a lug bent out from its side, open below (a closed upright ring would read as a numeral).
  pen.line([71, -39, 76, -41, 77, -47, 72, -49], 1.6)
  // Too cold to simmer: icicles hang off the rim of the pot.
  if (chilled) for (const [x, len] of [[46, 12], [54, 18], [62, 10], [69, 14]] as const) pen.shape([x - 2.6, -50, x + 2.6, -50, x + 0.4, -50 + len], { fill: PAPER, w: 1, sharp: true })
  // Legs straight out along the floor, feet up.
  for (const y of [-7, -13]) pen.tube([-22, y, -52, y + 1], 9, PAPER, 1.4)
  pen.ellipse(-58, -15, 6, 11, { fill: PAPER, tone: 1, w: 1.5 }, -0.15)
  pen.ellipse(-52, -19, 6, 11, { fill: PAPER, w: 1.5 }, 0.1)
  // The body, in its apron, slumped back on the pot.
  pen.shape([-30, -2, -36, -30, -30, -56, -12, -68, 8, -62, 16, -38, 12, -4], { fill: PAPER, tone: 1, angle: 1.2, w: 1.8 })
  pen.shape([-33, -6, -36, -32, -27, -54, -12, -60, -8, -34, -9, -6], { fill: SPOT, w: 1.6 })
  pen.line([-12, -60, 4, -58, 12, -50], 1.1)
  pen.rect(-27, -30, 11, 9, { w: 1 })
  // The head: wide, flat-mouthed, eyes on top like a toad's. The tall hat has gone soft behind them: happier it
  // stands straight up, and too cold it falls right over.
  const hat = hums ? [-20, -98, -24, -128, -18, -152, 4, -158, 22, -150, 24, -126, 14, -105, 6, -98]
    : chilled ? [-22, -98, -24, -112, -8, -122, 22, -124, 46, -114, 50, -100, 36, -98, 14, -104, 6, -98]
    : [-22, -98, -28, -122, -17, -141, 6, -146, 25, -135, 27, -116, 15, -105, 6, -98]
  pen.shape(hat, { fill: PAPER, w: 1.8 })
  if (!chilled) for (const [x, lean] of [[-15, -4], [-5, 0], [5, 4], [14, 8]] as const) pen.line([x, -104, x + (hums ? lean * 0.3 : lean), (hums ? -146 : -134) + Math.abs(lean)], 0.8)
  else for (const x of [0, 14, 28]) pen.line([x, -104, x + 10, -118], 0.8)
  pen.tone(chilled ? [14, -104, 36, -98, 50, -100, 46, -114, 30, -108] : [9, -100, 27, -116, 25, -135, 16, -140, 16, -118], 1, 1.2)
  pen.rect(-22, -104, 30, 7, { fill: PAPER, w: 1.4 })
  pen.shape([-42, -72, -38, -89, -12, -97, 16, -90, 22, -72, 12, -58, -32, -58], { fill: PAPER, tone: 1, angle: 1.2, w: 1.9 })
  pen.line([-41, -70, -36, -73, -10, -72, 16, -73, 21, -70], 1.6)
  pen.dot(-14, -80, 0.9)
  pen.dot(-8, -80, 0.9)
  for (const [x, y] of [[10, -64], [0, -62], [14, -80], [-34, -64]] as const) pen.ellipse(x, y, 1.8, 1.8, { w: 0.8 })
  for (const x of [-27, 3]) {
    pen.ellipse(x, -94, 9, 8, { fill: PAPER, w: 1.6 })
    // Asleep, something that makes it look opens one eye and no more.
    if (pose.awake || (pose.looks && x > 0)) pen.dot(x - 1 + lookX * 4, -94 + lookY * 3.5, 2.4); else shut(pen, x, -94, 5.5)
    // Cross, its lids come half down, level as a ruler.
    if (chilled) { pen.tone([x - 9, -94, x - 7, -100, x, -102, x + 7, -100, x + 9, -94], 3, 0.2, false); pen.line([x - 9, -94, x + 9, -94], 2.2, true) }
  }
  if (pose.awake && !chilled && !hums) {
    // Stirring: the spoon goes over its shoulder into the pot, and its fist goes with it.
    pen.line([27, -96, 41, -52], 2.6, true)
    pen.tube([2, -54, 20, -60, 30, -74], 8, PAPER, 1.4)
    pen.ellipse(31, -76, 7, 6.5, { fill: PAPER, w: 1.5 })
    return
  }
  // The spoon in its fist: bolt upright asleep; let fall when the stew has gone cold; beating time when there is a tune.
  const [tipX, tipY] = chilled ? [-84, -34] : hums ? [-74, -112] : [-52, -116]
  pen.line([-48, chilled ? -40 : -24, tipX, tipY], 2.6, true)
  pen.ellipse(tipX - (chilled ? 8 : 1), tipY - (chilled ? -2 : 10), chilled ? 10 : 7, chilled ? 7 : 10, { fill: PAPER, tone: 1, w: 1.5 }, hums ? -0.4 : 0)
  // Humming, round specks of sound float up beside its raised spoon: dots, since a short dash by itself would read as a sign.
  if (hums) for (const [x, y, r] of [[-92, -118, 1.6], [-89, -104, 1.2], [-62, -134, 1.4]] as const) pen.dot(x, y, r)
  pen.tube([-12, -52, -30, -42, -46, -44], 8, PAPER, 1.4)
  pen.ellipse(-49, -44, 7, 6.5, { fill: PAPER, w: 1.5 })
}

// The fly: nose in the air, napkin tucked in. Cold and cross, it pulls the napkin round its shoulders and hunches.
export function fly(pen: Pen, pose: Pose): void {
  const cold = pose.mood === 'cross', keen = pose.mood === 'happier'
  const [lookX] = glance(pose.looks)
  // Wings, held up and apart behind it, veined. Something rich in the air, and they spread.
  const spread = keen ? 1.22 : 1
  for (const side of [-1, 1]) {
    const wing = [side * 8, -62, side * 22 * spread, -92, side * 40 * spread, -112, side * 54 * spread, -110, side * 56 * spread, -92, side * 44 * spread, -72, side * 24, -56]
    pen.shape(wing, { fill: PAPER, w: 1.5 })
    pen.line([side * 14, -66, side * 34, -90, side * 50, -104], 0.7)
    pen.line([side * 22, -64, side * 42, -80, side * 52, -94], 0.7)
    pen.line([side * 30, -78, side * 44, -100], 0.6)
  }
  // Two thin legs, bent, and the banded abdomen it sits on.
  for (const side of [-1, 1]) pen.line([side * 14, -14, side * 30, -22, side * 34, -2, side * 42, 0], 1.8, true)
  const tail = [-6, -1, -20, -10, -22, -32, -12, -48, 12, -48, 22, -32, 20, -10, 6, -1]
  pen.shape(tail, { fill: PAPER, w: 0 })
  // Bands hatched one way: crosshatching in a band this narrow would come out as a row of crosses.
  pen.inside(tail, false, () => { for (let y = -44; y < 0; y += 12) pen.tone([-26, y, 26, y - 2, 26, y + 4, -26, y + 6], 2, 0.9) })
  pen.shape(tail, { w: 1.8 })
  // The thorax, bristled.
  pen.shape([-20, -44, -24, -64, -14, -78, 14, -78, 24, -64, 20, -44, 0, -38], { fill: PAPER, tone: 3, angle: 1.2, w: 1.8 })
  // The head: two great eyes and the nose held up. Asleep, the lids are half down; cross, they slant.
  const g = pen.ctx
  g.save()
  g.translate(0, -76)
  // It turns its whole head to look: up or down to where a trouble comes from, round toward a knock.
  const nods = pose.looks === 'up' || pose.turnedTo === 'up' ? 0.3 : pose.looks === 'down' || pose.turnedTo === 'down' ? -0.3 : 0
  g.rotate(nods + lookX * -0.24)
  // Its feelers: drooping as a rule, bolt upright when it smells something rich.
  if (keen) { pen.line([-5, -34, -6, -52, -4, -58], 1.3); pen.line([5, -34, 6, -53, 8, -59], 1.3) }
  else { pen.line([-5, -34, -9, -46, -15, -48], 1.2); pen.line([5, -34, 7, -47, 13, -50], 1.2) }
  // The nose, held up; higher still for a smell, with the sniffs drawn in round it.
  if (keen) {
    pen.tube([-10, -10, -22, -22, -26, -42], 6.5, PAPER, 1.4)
    pen.ellipse(-26, -45, 5.5, 3, { fill: PAPER, tone: 3, w: 1.3 }, 0.2)
    // Three small sniffs over its nose, each a wavering wisp: a bar with a leg would read as a numeral.
    for (const [x, y] of [[-36, -52], [-28, -58], [-18, -54]] as const) pen.line([x, y, x - 1.5, y - 2, x + 0.5, y - 4, x - 1, y - 6, x + 1, y - 8, x, y - 10], 0.9)
  } else {
    pen.tube([-10, -10, -22, -18, -30, -32], 6.5, PAPER, 1.4)
    pen.ellipse(-31, -34, 5.5, 3, { fill: PAPER, tone: 3, w: 1.3 }, 0.6)
  }
  pen.ellipse(0, -18, 19, 16, { fill: PAPER, tone: 1, angle: 1.3, w: 1.8 })
  for (const [x, y] of [[-13, -23], [12, -24]] as const) {
    pen.ellipse(x, y, 12, 13, { fill: PAPER, tone: 4, angle: 0.4, w: 1.8 })
    // Asleep, something that makes it look lifts the lid of one eye and no more.
    if (((!pose.awake || cold) && !pose.looks) || (!pose.awake && !!pose.looks && x < 0)) {
      const tilt = cold ? (x < 0 ? 4 : -4) : 0
      const lid = [x - 12.5, y - 1 - tilt, x - 11, y - 8, x - 6, y - 13, x + 6, y - 13, x + 11, y - 8, x + 12.5, y - 1 + tilt]
      pen.shape(lid, { fill: PAPER, w: 1.4, sharp: false })
      pen.line([x - 13, y - 1 - tilt, x + 13, y - 1 + tilt], 2.8, true)
    }
  }
  pen.line([-5, -6, 3, -7], 1.5)
  g.restore()
  if (cold) {
    // The napkin as a shawl: over both shoulders, its corners hanging, held shut by two hands.
    const shawl = [-4, -78, -22, -76, -34, -58, -40, -34, -30, -30, -24, -40, -8, -46, 0, -52, 8, -46, 24, -40, 30, -30, 40, -34, 34, -58, 22, -76, 4, -78]
    pen.shape(shawl, { fill: SPOT, w: 1.9 })
    pen.line([-24, -70, -22, -54, -30, -36], 0.9)
    pen.line([24, -70, 22, -54, 30, -36], 0.9)
    pen.line([-10, -74, -6, -58], 0.8)
    pen.line([10, -74, 6, -58], 0.8)
    pen.line([0, -76, 0, -52], 1.2)
    for (const side of [-1, 1]) {
      pen.line([side * 22, -56, side * 12, -52], 1.8, true)
      pen.ellipse(side * 6, -52, 5, 4, { fill: PAPER, w: 1.3 })
    }
    // It shivers: short wavering lines either side, each of six strokes.
    for (const side of [-1, 1]) for (const y of [-52, -34, -16]) pen.line([side * 46, y - 6, side * 48, y - 4, side * 46, y - 2, side * 48, y, side * 46, y + 2, side * 48, y + 4, side * 46, y + 6], 0.9)
  } else {
    // The napkin as a bib, tucked in under the chin, and two hands folded on it.
    pen.shape([-15, -76, 15, -76, 13, -48, 0, -38, -13, -48], { fill: SPOT, w: 1.8, sharp: true })
    pen.line([-9, -70, -8, -52], 0.8)
    pen.line([9, -70, 8, -52], 0.8)
    for (const side of [-1, 1]) {
      pen.line([side * 22, -66, side * 30, -52, side * 12, -46], 1.8, true)
      pen.ellipse(side * 7, -45, 5, 4, { fill: PAPER, w: 1.3 })
    }
  }
}

// The singer: a ghost in a small hat, mouth open, her music held out. She sits where a bench seat would be.
export function singer(pen: Pen, pose: Pose): void {
  const slighted = pose.mood === 'cross', heard = pose.mood === 'happier'
  // Drawn front on, she cannot be turned to a wall by mirroring: cross, her eyes go to whichever side her trouble comes through, left or right as well as up or down.
  // A trouble with no side (nobody to hear her, a stove in her own room) takes her eyes down to her music: she faces out of the page, and a cross guest never looks at the child.
  const [lookX, lookY] = glance(pose.looks ?? pose.toward ?? (pose.turnedTo === 'up' || pose.turnedTo === 'down' ? pose.turnedTo : slighted ? 'down' : null))
  // The feather in her hat: it stands straight up when she is heard, and hangs when she is not.
  const feather = heard ? [-8, -124, -9, -142, -6, -158, 2, -166] : slighted ? [-8, -124, -20, -130, -30, -120, -32, -106] : [-8, -124, -16, -140, -28, -150, -36, -148]
  pen.line(feather, 1.3)
  for (let i = 1; i <= 5; i++) {
    const t = i / 6, k = Math.min(2, Math.floor(t * 3)), f = t * 3 - k
    const x = feather[2 * k]! + (feather[2 * k + 2]! - feather[2 * k]!) * f, y = feather[2 * k + 1]! + (feather[2 * k + 3]! - feather[2 * k + 1]!) * f
    // Barbs off one side of the quill only, each starting on it: a barb drawn through the quill would make a row of crosses.
    pen.line([x, y, x + 4, y - 5], 0.8)
  }
  // The sheet: narrow shoulders, a long fall, a hem cut in points that does not reach the ground.
  const sheet = [0, -120, 13, -115, 19, -100, 20, -74, 25, -44, 28, -14, 21, -7, 14, -15, 7, -6, 0, -14, -7, -6, -14, -15, -21, -7, -28, -14, -25, -44, -20, -74, -19, -100, -13, -115]
  pen.shape(sheet, { fill: PAPER, w: 0 })
  pen.tone([8, -116, 19, -100, 20, -74, 25, -44, 28, -14, 21, -7, 16, -14, 14, -60], 2, 1.2, false)
  pen.shape(sheet, { w: 1.9 })
  pen.line([-12, -60, -15, -36, -14, -18], 0.7)
  pen.line([2, -56, 0, -30], 0.7)
  pen.rect(-13, -127, 17, 8, { fill: SPOT, w: 1.5 })
  pen.line([-16, -119, 7, -119], 1.6, true)
  // Two small blank eyes, which go where she looks, and the mouth: open to sing whenever she is awake.
  const ex = lookX * 2.5, ey = lookY * 2.5
  if (pose.awake) {
    pen.ellipse(-7 + ex, -103 + ey, 2.6, 3.2, { fill: PAPER, w: 1.4 })
    pen.ellipse(7 + ex, -103 + ey, 2.6, 3.2, { fill: PAPER, w: 1.4 })
    // Cross, her blank eyes get pupils, so that where she glares is plain: at the wall her trouble comes through, or down at her music when it has no side. Never out of the page.
    if (slighted) for (const x of [-7, 7]) pen.dot(x + ex + lookX * 1.5, -103 + ey + lookY * 1.9, 1.15)
  } else if (pose.looks) {
    // Asleep, she opens one eye and no more.
    shut(pen, -7, -103, 3)
    pen.ellipse(7 + ex, -103 + ey, 2.6, 3.2, { fill: PAPER, w: 1.4 })
  } else { shut(pen, -7, -103, 3); shut(pen, 7, -103, 3) }
  pen.line([-11 + ex, slighted ? -111 : -109 + ey, -4 + ex, slighted ? -107 : -110 + ey], slighted ? 1.8 : 1)
  pen.line([4 + ex, slighted ? -107 : -110 + ey, 11 + ex, slighted ? -111 : -109 + ey], slighted ? 1.8 : 1)
  // Awake she sings, heard or not, content or cross: a cross singer's mouth is smaller and her brows are down, and nothing else stops.
  if (pose.awake) pen.ellipse(0, -88, heard ? 8 : slighted ? 5 : 6.5, heard ? 11.5 : slighted ? 7.5 : 9.5, { fill: SPOT, w: 1.8 })
  else if (slighted) pen.line([-8, -89, -6, -91, -4, -88, -2, -91, 0, -88, 2, -91, 4, -88, 6, -91, 8, -89], 1.4)
  else pen.line([-5, -90, 5, -90], 1.5)
  for (let x = -12; x <= 12; x += 4.8) pen.ellipse(x, -72 + Math.abs(x) * -0.25, 1.9, 1.9, { fill: PAPER, w: 0.9 })
  if (!pose.awake) {
    // Asleep, not singing: the music shut and held flat to her front in both arms.
    pen.shape([-16, -66, 16, -68, 17, -38, -15, -36], { fill: SPOT, w: 1.6, sharp: true })
    pen.line([-12, -40, 13, -42], 0.8)
    pen.tube([-18, -78, -22, -56, -6, -46, 8, -48], 7, PAPER, 1.4)
    pen.tube([18, -78, 22, -58, 8, -52, -6, -56], 7, PAPER, 1.4)
    return
  }
  // Her music, held out at arm's length: the pages are scribble, not notes. Heard, she holds it higher and a page lifts; cross, it sags in her arms.
  const g = pen.ctx
  g.save()
  if (heard) g.translate(0, -12)
  else if (slighted) g.translate(0, 9)
  pen.shape([34, -92, 70, -100, 74, -58, 38, -52], { fill: SPOT, w: 1.6, sharp: true })
  pen.shape([37, -89, 53, -93, 55, -58, 40, -55], { fill: PAPER, w: 1.1, sharp: true })
  pen.shape([53, -93, 68, -96, 71, -61, 55, -58], { fill: PAPER, w: 1.1, sharp: true })
  for (let i = 0; i < 4; i++) {
    const y = -84 + i * 7.5
    // Scribble in runs of six strokes or more: a run of three or four would read as a letter.
    pen.line([40, y, 42, y - 2.5, 44, y + 0.5, 46, y - 2.5, 48, y + 0.5, 50, y - 2.5, 52, y - 1], 0.8)
    pen.line([56, y - 2.5, 58, y - 5, 60, y - 2, 62, y - 5, 64, y - 2, 66, y - 5, 68, y - 4], 0.8)
  }
  if (heard) pen.shape([54, -93, 62, -108, 76, -104, 70, -92, 68, -96], { fill: PAPER, w: 1.1 })
  const lift = heard ? 12 : slighted ? -9 : 0
  pen.tube([17, -80 + lift, 30, -70, 40, -70], 7, PAPER, 1.4)
  pen.tube([-17, -80 + lift, -4, -62, 30, -60, 44, -62], 7, PAPER, 1.4)
  g.restore()
}

