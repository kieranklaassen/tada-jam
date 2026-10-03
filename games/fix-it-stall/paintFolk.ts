import { disc, INK, lifted, roundRect, type Ctx } from './paint'

// The folk of the stall, seen from the mender's seat. The look's life goes on
// them and not on the working pieces: the owl who brought the lantern leans
// over the counter, the moth waits at the window with a lamp of its own, and
// the old hand, a raccoon, sleeps at the corner of the mat beside her mug.
// Each is drawn about its own origin in the scene's units. A customer stands
// beyond the counter, so each has a part painted before the counter (`Behind`)
// and a part that rests on it (`OnCounter`).

const OWL = { feather: '#86705a', dark: '#6a5644', chest: '#d2c0a2', disc: '#e2d3b8', eye: '#f2c23a', beak: '#d8962a', cap: '#27375c', capDark: '#1a2644' }

export function paintOwlBehind(c: Ctx, x: number, y: number): void {
  c.save()
  c.translate(x, y)
  // Shoulders and chest; the counter hides everything below.
  c.beginPath()
  c.ellipse(0, 86, 104, 66, 0, 0, Math.PI * 2)
  c.fillStyle = OWL.dark
  c.fill()
  c.beginPath()
  c.ellipse(0, 96, 56, 48, 0, 0, Math.PI * 2)
  c.fillStyle = OWL.chest
  c.fill()
  c.strokeStyle = OWL.feather
  c.lineWidth = 2.4
  for (let row = 0; row < 2; row++) for (let i = -2; i <= 2; i++) {
    c.beginPath()
    c.moveTo(i * 17 - 6 + row * 8, 78 + row * 14)
    c.lineTo(i * 17 + row * 8, 85 + row * 14)
    c.lineTo(i * 17 + 6 + row * 8, 78 + row * 14)
    c.stroke()
  }
  // The head, with its two tufts.
  c.fillStyle = OWL.feather
  for (const side of [-1, 1]) {
    c.beginPath()
    c.moveTo(side * 34, -6)
    c.lineTo(side * 66, -30)
    c.lineTo(side * 64, 14)
    c.closePath()
    c.fill()
  }
  c.beginPath()
  c.ellipse(0, 30, 72, 56, 0, 0, Math.PI * 2)
  c.fill()
  for (const side of [-1, 1]) disc(c, side * 27, 36, 31, OWL.disc)
  c.fillStyle = OWL.beak
  c.beginPath()
  c.moveTo(-8, 46)
  c.lineTo(0, 66)
  c.lineTo(8, 46)
  c.closePath()
  c.fill()
  // The watchman's cap, peak forward.
  c.beginPath()
  c.ellipse(0, -8, 56, 24, 0, 0, Math.PI * 2)
  c.fillStyle = OWL.cap
  c.fill()
  c.beginPath()
  c.ellipse(0, 8, 46, 10, 0, 0, Math.PI * 2)
  c.fillStyle = OWL.capDark
  c.fill()
  disc(c, 0, -12, 7, INK.steel)
  disc(c, -2, -14, 2.4, INK.white)
  c.restore()
}

/** The owl's eyes, looking down at the lantern. `lid` is 0 for open as far as an owl in daylight opens them, 1 for shut. */
export function paintOwlEyes(c: Ctx, x: number, y: number, lid: number): void {
  c.save()
  c.translate(x, y)
  for (const side of [-1, 1]) {
    const ex = side * 27, ey = 38
    disc(c, ex, ey, 18, OWL.eye)
    disc(c, ex + side * -3, ey + 7, 9.5, INK.black)
    disc(c, ex + side * -6, ey + 3, 3, INK.white)
    // A heavy lid: it covers the top of the eye at rest and comes down over it in a blink.
    c.save()
    c.beginPath()
    c.arc(ex, ey, 18.6, 0, Math.PI * 2)
    c.clip()
    c.fillStyle = OWL.feather
    c.fillRect(ex - 20, ey - 20, 40, 15 + lid * 25)
    c.restore()
  }
  c.restore()
}

export function paintOwlOnCounter(c: Ctx, x: number, y: number): void {
  // Two wing tips resting on the counter, three feathers each.
  for (const side of [-1, 1]) {
    lifted(c, 5, () => {
      c.fillStyle = OWL.dark
      for (let f = 0; f < 3; f++) {
        c.beginPath()
        c.ellipse(x + side * (96 + f * 13), y + 124 + f * 2, 9, 22, side * (0.25 + f * 0.12), 0, Math.PI * 2)
        c.fill()
      }
    })
  }
}

const MOTH = { wing: '#a8805a', hind: '#c29f74', band: '#ecdcbc', body: '#f3ead6', head: '#8f6c4c' }

export function paintMothBehind(c: Ctx, x: number, y: number): void {
  c.save()
  c.translate(x, y)
  for (const side of [-1, 1]) {
    // A fore wing and a smaller hind wing, each with a band and one eyespot.
    c.fillStyle = MOTH.wing
    c.beginPath()
    c.moveTo(side * 8, 6)
    c.quadraticCurveTo(side * 70, -52, side * 96, -14)
    c.quadraticCurveTo(side * 92, 30, side * 14, 34)
    c.closePath()
    c.fill()
    c.fillStyle = MOTH.hind
    c.beginPath()
    c.moveTo(side * 10, 30)
    c.quadraticCurveTo(side * 70, 34, side * 62, 70)
    c.quadraticCurveTo(side * 30, 80, side * 8, 52)
    c.closePath()
    c.fill()
    c.strokeStyle = MOTH.band
    c.lineWidth = 6
    c.beginPath()
    c.moveTo(side * 34, -14)
    c.quadraticCurveTo(side * 62, 4, side * 56, 26)
    c.stroke()
    disc(c, side * 72, -8, 10, MOTH.band)
    disc(c, side * 72, -8, 4.6, INK.black)
    // A feathered feeler.
    c.strokeStyle = MOTH.head
    c.lineWidth = 2.4
    c.beginPath()
    c.moveTo(side * 6, -30)
    c.quadraticCurveTo(side * 18, -62, side * 40, -66)
    c.stroke()
    for (let i = 1; i <= 5; i++) {
      const t = i / 6, fx = side * (6 + 34 * t * t + 12 * t), fy = -30 - 36 * t - 6 * t * t
      c.beginPath()
      c.moveTo(fx - 5, fy - 4)
      c.lineTo(fx, fy)
      c.lineTo(fx + 5, fy - 4)
      c.stroke()
    }
  }
  // A furry body: a pale oval with a soft fringe of discs round it.
  for (let i = 0; i < 16; i++) disc(c, Math.cos((i / 16) * Math.PI * 2) * 19, 30 + Math.sin((i / 16) * Math.PI * 2) * 36, 6, MOTH.body)
  c.beginPath()
  c.ellipse(0, 30, 19, 36, 0, 0, Math.PI * 2)
  c.fillStyle = MOTH.body
  c.fill()
  disc(c, 0, -16, 19, MOTH.head)
  for (const side of [-1, 1]) {
    disc(c, side * 10, -18, 8, INK.black)
    disc(c, side * 8, -21, 2.6, INK.white)
  }
  c.restore()
}

/** The moth's own lamp, shut, waiting on the counter in front of it. */
export function paintMothOnCounter(c: Ctx, x: number, y: number): void {
  lifted(c, 6, () => {
    roundRect(c, x - 44, y + 62, 88, 52, 12)
    c.fillStyle = '#3f7fb5'
    c.fill()
  })
  disc(c, x, y + 88, 17, 'rgba(214, 236, 244, 0.9)')
  disc(c, x - 5, y + 82, 4, INK.white)
  c.fillStyle = '#2f6394'
  c.fillRect(x - 44, y + 104, 88, 4)
}

const RACCOON = { fur: '#8a929a', back: '#747c85', mask: '#2b3037', pale: '#e4e6e8', ring: '#3a4048' }

/** The old hand, asleep at the corner of the mat with her head on her arm, her ringed tail round her and her mug in reach. */
export function paintRaccoon(c: Ctx, x: number, y: number): void {
  lifted(c, 10, () => {
    c.beginPath()
    c.ellipse(x - 6, y + 34, 128, 88, -0.25, 0, Math.PI * 2)
    c.fillStyle = RACCOON.back
    c.fill()
  })
  // The tail, curled out along the mat: rings of dark on grey.
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    disc(c, x + 112 + 96 * t - 30 * t * t, y + 76 - 70 * t * t + 14 * t, 21 - 8 * t, i % 4 < 2 ? RACCOON.fur : RACCOON.ring)
  }
  c.save()
  c.translate(x + 74, y - 44)
  c.rotate(-0.42)
  // The forearm her chin rests on.
  roundRect(c, -66, 16, 150, 34, 17)
  c.fillStyle = RACCOON.fur
  c.fill()
  disc(c, 82, 33, 15, RACCOON.mask)
  lifted(c, 6, () => {
    c.beginPath()
    c.ellipse(0, 0, 60, 46, 0, 0, Math.PI * 2)
    c.fillStyle = RACCOON.fur
    c.fill()
  })
  for (const side of [-1, 1]) {
    disc(c, side * 44, -32, 17, RACCOON.mask)
    disc(c, side * 44, -30, 9, RACCOON.pale)
  }
  // The mask, the pale brow above it and the muzzle below.
  c.fillStyle = RACCOON.pale
  c.beginPath()
  c.ellipse(0, -14, 44, 14, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = RACCOON.mask
  for (const side of [-1, 1]) {
    c.beginPath()
    c.ellipse(side * 24, 2, 26, 15, side * 0.3, 0, Math.PI * 2)
    c.fill()
  }
  c.fillStyle = RACCOON.pale
  c.beginPath()
  c.ellipse(0, 24, 24, 18, 0, 0, Math.PI * 2)
  c.fill()
  disc(c, 0, 34, 7.5, INK.black)
  // Eyes shut: two pale curves on the mask. Whiskers at rest.
  c.strokeStyle = RACCOON.pale
  c.lineWidth = 2.6
  c.lineCap = 'round'
  for (const side of [-1, 1]) {
    c.beginPath()
    c.arc(side * 24, 0, 8, 0.25, Math.PI - 0.25)
    c.stroke()
    c.lineWidth = 1.6
    for (let w = -1; w <= 1; w++) {
      c.beginPath()
      c.moveTo(side * 18, 26 + w * 3)
      c.lineTo(side * 58, 24 + w * 11)
      c.stroke()
    }
    c.lineWidth = 2.6
  }
  c.restore()
}

/** Her mug, seen from above: white enamel, a blue rim, tea, and a handle. */
export function paintMug(c: Ctx, x: number, y: number): void {
  c.strokeStyle = INK.white
  c.lineWidth = 8
  c.beginPath()
  c.arc(x + 30, y + 4, 13, -1.2, 1.3)
  c.stroke()
  lifted(c, 6, () => disc(c, x, y, 28, INK.white))
  disc(c, x, y, 22, '#a8672f')
  disc(c, x - 6, y - 7, 5, 'rgba(255, 255, 255, 0.35)')
  c.strokeStyle = '#2f5fa8'
  c.lineWidth = 3.4
  c.beginPath()
  c.arc(x, y, 26.5, 0, Math.PI * 2)
  c.stroke()
}
