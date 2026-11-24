import { blob, button, oval, path, run, sew, type Album, type Ctx, type Picture } from './stitch'
import { BITS, type BitKey } from './scenery'
import { FOODS, type FoodKind } from './save'

// The cloth pieces of those who watch, and of what lies about the yard.

const felt = (ctx: Ctx, x: number, y: number, r: number): void => sew(ctx, oval(x, y, r, r * 1.08), 'goose', { pad: 6, stitch: 0, drop: 2, edge: 2 })

export class Folk {
  constructor(private readonly album: Album) {}

  // The farmer, from his feet.
  farmerLegs(): Picture {
    return this.album.get('farmerLegs', [-84, -150, 168, 166], (ctx) => {
      for (const x of [-34, 34]) {
        sew(ctx, path((p) => p.roundRect(x - 32, -140, 64, 116, 14)), 'denim', { pad: 18 })
        sew(ctx, blob([[x - 34, -30], [x + 22, -34], [x + 32, -8], [x + 28, 6], [x - 50, 6], [x - 54, -10]], 0.9), 'leather', { pad: 12 })
      }
    })
  }
  farmerBody(): Picture { return this.shirt(true) }
  farmerBare(): Picture { return this.shirt(false) }
  private shirt(buttons: boolean): Picture {
    return this.album.get(`shirt${buttons}`, [-104, -300, 208, 200], (ctx) => {
      sew(ctx, blob([[-58, -282], [0, -292], [58, -282], [92, -220], [88, -150], [50, -112], [-50, -112], [-88, -150], [-92, -220]], 0.95), 'shirt', { pad: 30 })
      sew(ctx, path((p) => { p.moveTo(-84, -156); p.quadraticCurveTo(0, -178, 84, -156); p.lineTo(60, -110); p.lineTo(-60, -110); p.closePath() }), 'denim', { pad: 18 })
      for (const s of [-1, 1]) {
        sew(ctx, path((p) => { p.moveTo(s * 34, -286); p.lineTo(s * 50, -286); p.lineTo(s * 58, -160); p.lineTo(s * 42, -162); p.closePath() }), 'leather', { pad: 5, stitch: 3, drop: 2, edge: 1.6 })
        button(ctx, s * 50, -158, 8, '#f4c95d', '#8c6a1b')
      }
      if (buttons) for (let i = 0; i < 3; i++) button(ctx, 0, -256 + i * 34, 8, '#e8735a', '#8d3322')
    })
  }
  farmerButton(): Picture { return this.album.get('farmerButton', [-10, -10, 20, 21], (ctx) => button(ctx, 0, 0, 8, '#e8735a', '#8d3322')) }
  farmerArm(): Picture {
    return this.album.get('farmerArm', [-128, -34, 160, 80], (ctx) => {
      sew(ctx, blob([[18, -24], [-30, -20], [-84, -14], [-86, 14], [-30, 22], [20, 24]], 0.9), 'shirt', { pad: 14 })
      sew(ctx, oval(-98, 0, 22, 19), 'skin', { pad: 10, stitch: 5 })
    })
  }
  farmerHead(): Picture {
    return this.album.get('farmerHead', [-86, -150, 172, 160], (ctx) => {
      for (const s of [-1, 1]) sew(ctx, oval(s * 62, -62, 16, 20), 'skin', { pad: 8, stitch: 4 })
      sew(ctx, blob([[-60, -60], [-52, -116], [0, -134], [52, -116], [60, -60], [40, -10], [0, 2], [-40, -10]], 0.95), 'skin', { pad: 22 })
      felt(ctx, -24, -82, 18); felt(ctx, 22, -82, 18)
      for (const s of [-1, 1]) sew(ctx, oval(s * 40, -46, 13, 10), 'rose', { pad: 5, stitch: 4, drop: 0, edge: 1.6 })
    })
  }
  farmerNose(): Picture { return this.album.get('farmerNose', [-26, -24, 52, 54], (ctx) => sew(ctx, oval(0, 0, 21, 19), 'rose', { pad: 10, stitch: 5 })) }
  farmerMoustache(): Picture {
    return this.album.get('farmerMoustache', [-66, -20, 132, 60], (ctx) => {
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? (i % 2 ? '#9b6a45' : '#b07c52') : '#5b3a22'
        ctx.lineWidth = pass ? 7 : 10.5
        ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(0, -4 + i); ctx.quadraticCurveTo(s * 26, -14 + i * 9, s * (52 - i * 3), 4 + i * 5); ctx.stroke()
      }
    })
  }
  farmerHat(): Picture {
    return this.album.get('farmerHat', [-92, -84, 184, 116], (ctx) => {
      sew(ctx, oval(0, 6, 84, 20), 'straw', { pad: 14 })
      sew(ctx, blob([[-48, 2], [-44, -52], [0, -72], [44, -52], [48, 2], [0, 12]], 0.9), 'straw', { pad: 18 })
      sew(ctx, path((p) => { p.moveTo(-48, -12); p.quadraticCurveTo(0, 2, 48, -12); p.lineTo(49, 4); p.quadraticCurveTo(0, 18, -49, 4); p.closePath() }), 'red', { pad: 6, stitch: 4, drop: 0 })
    })
  }
  farmerMouth(): Picture { return this.album.get('farmerMouth', [-26, -20, 52, 44], (ctx) => sew(ctx, oval(0, 0, 18, 15), 'dark', { pad: 6, stitch: 0, drop: 0 })) }

  // The cow's head, from the middle of her neck.
  cowHead(): Picture {
    return this.album.get('cowHead', [-96, -92, 192, 178], (ctx) => {
      for (const s of [-1, 1]) sew(ctx, blob([[s * 28, -56], [s * 44, -84], [s * 54, -78], [s * 46, -48]], 0.9), 'wood', { pad: 6, stitch: 4 })
      sew(ctx, blob([[-58, -30], [-40, -66], [0, -72], [40, -66], [58, -30], [46, 24], [0, 40], [-46, 24]], 0.95), 'cow', { pad: 22 })
      sew(ctx, blob([[14, -66], [52, -50], [54, -14], [26, 0], [6, -26]], 0.95), 'patch', { pad: 12, stitch: 6, drop: 0 })
      felt(ctx, -24, -26, 17); felt(ctx, 26, -26, 17)
    })
  }
  cowEar(): Picture { return this.album.get('cowEar', [-60, -26, 70, 56], (ctx) => sew(ctx, blob([[6, -10], [-28, -20], [-52, -4], [-36, 18], [4, 12]], 0.95), 'cow', { pad: 12, stitch: 6 })) }
  cowMuzzle(): Picture {
    return this.album.get('cowMuzzle', [-62, -36, 124, 82], (ctx) => {
      sew(ctx, oval(0, 0, 52, 30), 'pink', { pad: 18 })
      for (const s of [-1, 1]) { ctx.fillStyle = '#a14c60'; ctx.beginPath(); ctx.ellipse(s * 22, -4, 7, 9, s * 0.3, 0, 7); ctx.fill() }
    })
  }
  cowJaw(): Picture {
    return this.album.get('cowJaw', [-50, -18, 120, 56], (ctx) => {
      sew(ctx, oval(0, 6, 38, 18), 'rose', { pad: 10, stitch: 5 })
      for (const [x, turn] of [[34, -0.3], [40, 0.1], [36, 0.5]] as const) { ctx.save(); ctx.translate(x - 8, 6); ctx.rotate(turn); sew(ctx, blob([[0, -4], [26, -6], [32, 0], [26, 6], [0, 4]]), 'leaf', { pad: 5, stitch: 3, drop: 1, edge: 1.6 }); ctx.restore() }
    })
  }
  tongue(): Picture { return this.album.get('tongue', [-22, -8, 44, 66], (ctx) => sew(ctx, blob([[-14, 0], [14, 0], [16, 34], [0, 50], [-16, 34]], 0.95), 'rose', { pad: 10, stitch: 5 })) }

  // The hen, from her feet.
  henBody(): Picture {
    return this.album.get('henBody', [-66, -86, 132, 92], (ctx) => {
      for (const x of [-8, 12]) { ctx.strokeStyle = '#d88420'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, -16); ctx.lineTo(x, 0); ctx.lineTo(x - 9, 0); ctx.stroke() }
      for (const [turn, y] of [[-0.6, -50], [-0.2, -44], [0.15, -38]]) { ctx.save(); ctx.translate(30, y); ctx.rotate(turn); sew(ctx, oval(14, 0, 22, 9), 'red', { pad: 7, stitch: 4 }); ctx.restore() }
      sew(ctx, blob([[-46, -44], [-24, -66], [24, -62], [44, -40], [24, -14], [-28, -14]], 0.95), 'egg', { pad: 18 })
      sew(ctx, blob([[-14, -48], [22, -50], [30, -34], [6, -24], [-18, -32]], 0.95), 'cow', { pad: 8, stitch: 5 })
    })
  }
  henFace(): Picture {
    return this.album.get('henFace', [-58, -54, 92, 84], (ctx) => {
      for (const [x, y] of [[-12, -34], [0, -40], [12, -34]]) sew(ctx, oval(x, y, 8, 10), 'red', { pad: 5, stitch: 3 })
      sew(ctx, oval(0, -8, 27, 26), 'egg', { pad: 12, stitch: 6 })
      sew(ctx, blob([[-22, -10], [-48, -2], [-22, 8]], 0.7), 'orange', { pad: 5, stitch: 3 })
      sew(ctx, oval(-20, 16, 6, 9), 'red', { pad: 4, stitch: 3 })
      felt(ctx, -8, -14, 10); felt(ctx, 12, -14, 10)
    })
  }

  // The pig, from the middle of its mud.
  pigBody(): Picture {
    return this.album.get('pigBody', [-120, -84, 240, 130], (ctx) => {
      sew(ctx, blob([[-98, 4], [-76, -46], [-10, -68], [66, -56], [100, -10], [84, 30], [-70, 34]], 0.95), 'pink', { pad: 28 })
      ctx.strokeStyle = '#b45d6d'; ctx.lineWidth = 8; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(94, -20); ctx.bezierCurveTo(122, -30, 112, -56, 98, -44); ctx.bezierCurveTo(92, -36, 108, -28, 114, -36); ctx.stroke()
    })
  }
  pigHead(): Picture {
    return this.album.get('pigHead', [-72, -86, 144, 142], (ctx) => {
      for (const s of [-1, 1]) sew(ctx, blob([[s * 20, -42], [s * 46, -78], [s * 56, -32]], 0.8), 'pink', { pad: 10, stitch: 6 })
      sew(ctx, oval(0, -6, 58, 50), 'pink', { pad: 22 })
      felt(ctx, -20, -24, 14); felt(ctx, 20, -24, 14)
    })
  }
  pigSnout(): Picture {
    return this.album.get('pigSnout', [-32, -24, 64, 52], (ctx) => {
      sew(ctx, oval(0, 0, 27, 20), 'rose', { pad: 10, stitch: 5 })
      for (const s of [-1, 1]) { ctx.fillStyle = '#8c3a4e'; ctx.beginPath(); ctx.ellipse(s * 9, 0, 4.6, 7, 0, 0, 7); ctx.fill() }
    })
  }
  pigMud(): Picture { return this.album.get('pigMud', [-160, -20, 320, 90], (ctx) => sew(ctx, blob([[-146, 24], [-90, 0], [-30, 12], [40, -2], [110, 6], [148, 28], [110, 54], [-100, 56]], 0.95), 'mud', { pad: 20 })) }

  // Things.
  food(kind: FoodKind): Picture {
    return this.album.get(`food${kind}`, [-32, -38, 64, 70], (ctx) => {
      if (kind === 'apple') {
        sew(ctx, blob([[-20, -6], [-10, -20], [0, -16], [10, -20], [20, -6], [14, 16], [0, 20], [-14, 16]], 1), 'red', { pad: 12, stitch: 5 })
        sew(ctx, blob([[0, -18], [10, -32], [24, -32], [14, -18]], 0.9), 'leaf', { pad: 5, stitch: 3 })
      } else if (kind === 'carrot') {
        for (const x of [-8, 0, 8]) { ctx.save(); ctx.translate(x * 0.6, -14); ctx.rotate(x * 0.05); sew(ctx, oval(0, -10, 5, 13), 'leaf', { pad: 4, stitch: 3 }); ctx.restore() }
        sew(ctx, blob([[-15, -14], [15, -14], [10, 10], [0, 26], [-10, 10]], 0.9), 'carrot', { pad: 10, stitch: 5 })
      } else sew(ctx, blob([[0, -22], [15, -6], [14, 12], [0, 20], [-14, 12], [-15, -6]], 1), 'egg', { pad: 12, stitch: 5 })
    })
  }
  cup(): Picture { return this.album.get('cup', [-30, -14, 60, 50], (ctx) => sew(ctx, blob([[-20, -8], [20, -8], [14, 12], [6, 16], [12, 30], [-12, 30], [-6, 16], [-14, 12]], 0.8), 'sky', { pad: 8, stitch: 5 })) }
  paw(): Picture {
    return this.album.get('paw', [-30, -24, 64, 50], (ctx) => {
      sew(ctx, oval(0, 0, 25, 18), 'bear', { pad: 10, stitch: 5 })
      for (const x of [8, 16, 22]) { ctx.fillStyle = '#3b2415'; ctx.beginPath(); ctx.ellipse(x, 9, 2.6, 4, -0.4, 0, 7); ctx.fill() }
    })
  }
  bit(key: BitKey): Picture {
    return this.album.get(key, [-84, -66, 168, 132], (ctx) => {
      if (key === 'sun') sew(ctx, oval(0, 0, 54, 54), 'bale', { pad: 20, stitch: 8 })
      else if (key === 'stone') sew(ctx, blob([[-30, 4], [-14, -18], [16, -16], [32, 4], [0, 18]], 1), 'grey', { pad: 9, stitch: 5, drop: 3 })
      else if (key === 'cloud' || key === 'cloudlet') {
        const s = key === 'cloud' ? 1 : 0.7
        sew(ctx, blob([[-70 * s, 10], [-50 * s, -20 * s], [-16 * s, -22 * s], [6 * s, -42 * s], [38 * s, -24 * s], [70 * s, 4], [50 * s, 22 * s], [-50 * s, 22 * s]], 1.1), 'goose', { pad: 16, stitch: 6, drop: 6 })
      } else {
        const name = key === 'flowerRed' ? 'red' : key === 'flowerWhite' ? 'goose' : 'bale'
        for (let i = 0; i < 5; i++) sew(ctx, oval(Math.cos(i * 1.257) * 11, Math.sin(i * 1.257) * 11, 9, 9), name, { pad: 5, stitch: 0, drop: 1, edge: 1.6 })
        button(ctx, 0, 0, 7, key === 'flowerYellow' ? '#e8735a' : '#f4c95d', '#8c6a1b')
      }
    })
  }
  leaves(): Picture { return this.album.get('leaves', [-30, -40, 60, 46], (ctx) => { for (const x of [-10, 0, 10]) sew(ctx, oval(x, -14 - (x ? 0 : 5), 6, 15, x * 0.06), 'leaf', { pad: 4, stitch: 3 }) }) }
  pull(): Picture { return this.album.get('pull', [-14, -8, 28, 40], (ctx) => sew(ctx, oval(0, 9, 8, 14), 'bale', { pad: 4, stitch: 0, drop: 2, edge: 2.4 })) }
  tree(): Picture {
    return this.album.get('tree', [-120, -130, 240, 270], (ctx) => {
      sew(ctx, path((p) => { p.moveTo(-16, 60); p.lineTo(16, 60); p.lineTo(22, 132); p.lineTo(-22, 132); p.closePath() }), 'leather', { pad: 12 })
      sew(ctx, blob([[-84, 10], [-92, -50], [-44, -100], [24, -104], [84, -70], [96, 0], [62, 58], [0, 74], [-58, 60]], 1), 'leaf', { pad: 28 })
      for (const [x, y] of [[-44, -30], [34, -54], [52, 14], [-18, 30]]) sew(ctx, oval(x, y, 15, 15), 'red', { pad: 8, stitch: 4 })
    })
  }
  post(): Picture { return this.album.get('post', [-22, -12, 44, 300], (ctx) => sew(ctx, path((p) => p.roundRect(-14, -6, 28, 286, 8)), 'wood', { pad: 10 })) }
  farmpost(): Picture {
    return this.album.get('farmpost', [-30, -190, 60, 206], (ctx) => {
      sew(ctx, path((p) => p.roundRect(-16, -176, 32, 180, 10)), 'wood', { pad: 12 })
      sew(ctx, oval(0, -172, 23, 14), 'red', { pad: 8, stitch: 5 })
    })
  }
  fence(): Picture {
    return this.album.get('fence', [240, 486, 750, 120], (ctx) => {
      for (const y of [516, 556]) sew(ctx, path((p) => p.roundRect(250, y, 730, 18, 8)), 'wood', { pad: 7, stitch: 5 })
      for (let x = 268; x < 975; x += 88) sew(ctx, path((p) => { p.moveTo(x, 506); p.lineTo(x + 12, 494); p.lineTo(x + 24, 506); p.lineTo(x + 24, 592); p.lineTo(x, 592); p.closePath() }), 'wood', { pad: 8, stitch: 5 })
    })
  }
  door(): Picture {
    return this.album.get('door', [-4, -220, 220, 240], (ctx) => {
      sew(ctx, path((p) => p.roundRect(2, -208, 196, 214, 10)), 'barn', { pad: 22 })
      for (const [a, b] of [[-196, -10], [-10, -196]]) run(ctx, path((p) => { p.moveTo(18, a); p.lineTo(184, b) }), '#ffe2d8', 5, [12, 8])
      sew(ctx, path((p) => p.roundRect(140, -118, 70, 28, 10)), 'leather', { pad: 7, stitch: 5 })
      ctx.strokeStyle = '#d9c06a'; ctx.lineWidth = 6; ctx.strokeRect(152, -124, 28, 40)
    })
  }
  bow(): Picture {
    return this.album.get('bow', [-104, -80, 208, 170], (ctx) => {
      for (const s of [-1, 1] as const) {
        sew(ctx, blob([[0, -10], [s * 52, -58], [s * 92, -40], [s * 92, 30], [s * 54, 46], [0, 12]], 0.95), s < 0 ? 'bale' : 'sky', { pad: 18 })
        sew(ctx, blob([[s * 4, 6], [s * 36, 40], [s * 48, 76], [s * 20, 72], [s * 2, 30]], 0.9), s < 0 ? 'bale' : 'sky', { pad: 8 })
      }
      sew(ctx, oval(0, 0, 24, 27), 'red', { pad: 10, stitch: 6 })
    })
  }
  hand(): Picture {
    return this.album.get('hand', [-34, -14, 84, 116], (ctx) => {
      sew(ctx, blob([[-9, 2], [0, -6], [10, 2], [12, 34], [40, 40], [42, 66], [32, 92], [-8, 92], [-22, 62], [-28, 44], [-16, 42], [-8, 50]], 0.9), 'goose', { pad: 10, stitch: 5 })
    })
  }
  ring(): Picture { return this.album.get('ring', [-112, -112, 224, 224], (ctx) => { ctx.setLineDash([22, 14]); ctx.strokeStyle = '#8a5b3c'; ctx.lineWidth = 15; ctx.beginPath(); ctx.arc(0, 0, 98, 0, 7); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 100, 0, 7); ctx.stroke() }) }
  /** Sews every one of them. */
  all(): void {
    for (const kind of FOODS) this.food(kind)
    for (const bit of BITS) this.bit(bit.key)
    for (const piece of ['farmerLegs', 'farmerBody', 'farmerBare', 'leaves', 'farmerButton', 'farmerArm', 'farmerHead', 'farmerNose', 'farmerMoustache', 'farmerHat', 'farmerMouth', 'cowHead', 'cowEar', 'cowMuzzle', 'cowJaw', 'tongue', 'henBody', 'henFace', 'pigBody', 'pigHead', 'pigSnout', 'pigMud', 'cup', 'paw', 'pull', 'tree', 'post', 'farmpost', 'fence', 'door', 'bow', 'hand', 'ring'] as const) this[piece]()
  }
}
