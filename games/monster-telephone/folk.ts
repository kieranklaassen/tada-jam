import { INK, WASH, curve, ground, hatch, mark, oval, type Album, type Picture } from './marker'

// The two on the telephone. The ostrich is black and red, the mole blue and
// red: two pens each, so neither is ever taken for a magnet.

export class Folk {
  constructor(private readonly album: Album) {}

  ostrichBody(): Picture {
    return this.album.get('o:body', [-118, -120, 258, 250], (ctx) => {
      // Tail plumes to the right, then the body over them.
      for (const [x, y, rx, ry] of [[88, -34, 34, 26], [100, 6, 34, 26], [86, 44, 32, 25]] as const) { const p = oval(x, y, rx, ry); ground(ctx, p); mark(ctx, curve([[x - rx, y], [x - rx * 0.4, y - ry], [x + rx * 0.4, y - ry * 0.8], [x + rx, y - 3], [x + rx * 0.5, y + ry * 0.4], [x + rx * 0.7, y + ry], [x - rx * 0.4, y + ry]]), 'black', 4.4) }
      const body = curve([[-74, -22], [-58, -70], [-10, -90], [44, -80], [78, -36], [80, 24], [56, 74], [4, 92], [-48, 78], [-78, 28]], true)
      ground(ctx, body, WASH.black)
      hatch(ctx, body, 'black', 11, 10, 4.2, 0.36)
      // Feathers: rows of loops.
      for (let row = 0; row < 5; row++) for (let i = 0; i < 6; i++) {
        const x = -60 + i * 25 + (row % 2) * 12, y = -52 + row * 30
        if ((x / 66) ** 2 + (y / 78) ** 2 > 1) continue
        mark(ctx, curve([[x - 12, y - 8], [x - 9, y + 11], [x + 2, y + 14], [x + 12, y - 6]]), 'black', 4.6, 0.92, row * 7 + i)
      }
      mark(ctx, body, 'black', 5.4)
    })
  }
  ostrichWing(): Picture {
    return this.album.get('o:wing', [-20, -34, 132, 68], (ctx) => {
      const wing = curve([[-8, -16], [30, -26], [70, -20], [102, -8], [86, 0], [100, 10], [76, 12], [84, 24], [52, 22], [20, 26], [-8, 14]], true)
      ground(ctx, wing); hatch(ctx, wing, 'black', 14, -14, 4, 0.4); mark(ctx, wing, 'black', 5)
    })
  }
  /** Seen from the side, looking left. The eyes are drawn live. */
  ostrichHead(): Picture {
    return this.album.get('o:head', [-84, -70, 160, 132], (ctx) => {
      const head = curve([[-34, 8], [-36, -18], [-16, -40], [14, -42], [38, -22], [40, 8], [22, 30], [-8, 34]], true)
      ground(ctx, head); hatch(ctx, curve([[-10, 20], [30, 10], [36, 24], [10, 34]], true), 'red', 8, 5, 3, 0.4)
      mark(ctx, head, 'black', 5)
      const beak = curve([[-30, 2], [-52, 2], [-76, 12], [-72, 20], [-50, 24], [-24, 26], [-18, 14]], true)
      ground(ctx, beak, WASH.red); mark(ctx, beak, 'red', 5)
      mark(ctx, curve([[-72, 15], [-50, 14], [-26, 16]]), 'red', 4)
      ctx.fillStyle = INK.red; ctx.beginPath(); ctx.ellipse(-46, 7, 3.4, 2, 0, 0, 7); ctx.fill()
      // Three silly hairs.
      for (const [x, d] of [[-4, -12], [8, 2], [18, 14]] as const) mark(ctx, curve([[x, -41], [x + d * 0.4, -54], [x + d, -62]]), 'black', 4, 0.95, x + 30)
      // The two great eyes, whites and lashes.
      for (const x of [-16, 16]) { ground(ctx, oval(x, -14, 17, 19), '#fff'); mark(ctx, oval(x, -14, 17, 19), 'black', 4.6); for (const d of [-9, 0, 9]) mark(ctx, curve([[x + d, -32 + Math.abs(d) * 0.3], [x + d * 1.5, -41 + Math.abs(d) * 0.3]]), 'black', 3.6, 0.95, x + d + 70) }
    }, 1.15)
  }
  pupil(): Picture {
    return this.album.get('o:pupil', [-12, -12, 24, 24], (ctx) => { ctx.fillStyle = INK.black; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -3, 2.8, 0, 7); ctx.fill() }, 1.3)
  }
  ostrichLids(): Picture {
    return this.album.get('o:lids', [-40, -40, 80, 46], (ctx) => { for (const x of [-16, 16]) { ground(ctx, oval(x, -14, 17, 19)); mark(ctx, curve([[x - 16, -12], [x, -5], [x + 16, -12]]), 'black', 4.6) } }, 1.15)
  }

  moleBody(): Picture {
    return this.album.get('m:body', [-116, -146, 232, 290], (ctx) => {
      const body = curve([[0, -124], [52, -112], [84, -66], [94, 10], [96, 90], [90, 140], [-90, 140], [-96, 90], [-94, 10], [-84, -66], [-52, -112]], true)
      ground(ctx, body, WASH.blue); hatch(ctx, body, 'blue', 9, 12, 4.4, 0.5); mark(ctx, body, 'blue', 5.6)
      const belly = curve([[0, 4], [44, 22], [56, 76], [42, 134], [-42, 134], [-56, 76], [-44, 22]], true)
      ground(ctx, belly, '#eff4fd'); mark(ctx, belly, 'blue', 4.2)
      // A tuft, whiskers, two teeth.
      for (const d of [-8, 0, 9]) mark(ctx, curve([[d * 0.5, -122], [d * 1.6, -140]]), 'blue', 4.4, 0.95, d + 90)
      const snout = curve([[-40, -46], [-30, -70], [0, -78], [30, -70], [40, -46], [28, -24], [0, -18], [-28, -24]], true)
      ground(ctx, snout, '#eff4fd'); mark(ctx, snout, 'blue', 4.6)
      for (const s of [-1, 1]) for (const d of [-8, 3, 14]) mark(ctx, curve([[s * 32, -44 + d * 0.5], [s * 72, -50 + d * 1.2]]), 'black', 3, 0.8, s * d + 120)
      for (const x of [-11, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x, -22, 10, 14, 3); ctx.fill(); ctx.strokeStyle = INK.blue; ctx.lineWidth = 3; ctx.stroke() }
      const nose = curve([[-17, -60], [-13, -72], [0, -76], [13, -72], [17, -60], [8, -48], [0, -45], [-8, -48]], true)
      ground(ctx, nose, '#ee8d92'); hatch(ctx, nose, 'red', 6, 4, 4.4, 0.7); mark(ctx, nose, 'red', 4.6)
      for (const x of [-26, 26]) { ground(ctx, oval(x, -88, 15, 15), '#fff'); mark(ctx, oval(x, -88, 15, 15), 'blue', 4.2) }
    })
  }
  moleLids(): Picture {
    return this.album.get('m:lids', [-48, -108, 96, 40], (ctx) => { for (const x of [-26, 26]) { ground(ctx, oval(x, -88, 15, 15), WASH.blue); mark(ctx, curve([[x - 13, -90], [x, -80], [x + 13, -90]]), 'blue', 4.6); mark(ctx, curve([[x - 8, -95], [x + 6, -84]]), 'blue', 3, 0.6, x + 33) } })
  }
  /** A shovel of a hand, its wrist at 0. */
  moleHand(): Picture {
    return this.album.get('m:hand', [-40, -56, 80, 92], (ctx) => {
      const palm = curve([[-20, 26], [-30, 0], [-28, -22], [-14, -34], [10, -36], [28, -20], [30, 2], [20, 26]], true)
      for (const [x, y, d] of [[-24, -22, -5], [-9, -34, -2], [9, -35, 2], [24, -24, 6]] as const) { const claw = curve([[x - 6, y + 4], [x + d, y - 17], [x + 6, y + 4]], true); ground(ctx, claw, '#fff'); mark(ctx, claw, 'blue', 3.8) }
      ground(ctx, palm, '#f6d4d6'); hatch(ctx, palm, 'red', 10, 6, 3.4, 0.3); mark(ctx, palm, 'blue', 5)
    })
  }
}
