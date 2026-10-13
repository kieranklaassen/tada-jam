import { diner, type House, type RoomId } from './house'
import type { Pen, Picture } from './pen'

// What is seen of a room through its door: a corner of it, as that room
// stands now. Each is one small dark picture, drawn in the doorway's own
// units: 56 wide beside the door leaf, 150 tall, with the floor near 140.

/** The way a room is seen through its door, for a house; the pictures by that name; and the one whose ghost shows. */
export type Peek = { of(house: House): string; ghost: string; pictures: Readonly<Record<string, Picture>> }

function tub(p: Pen): void {
  p.blob([0, 140, 2, 104, 54, 104, 56, 140])
  p.cut(() => p.line([6, 114, 28, 118, 50, 114], 4))
}

function duck(p: Pen, x: number, y: number): void {
  p.ell(x, y, 12, 9)
  p.ell(x - 8, y - 11, 7, 7)
  p.poly([x - 14, y - 13, x - 23, y - 10, x - 14, y - 7])
  p.cut(() => p.ell(x - 9, y - 12, 2, 2))
}

function pot(p: Pen, x: number, y: number, turn: number): void {
  p.at(x, y, () => {
    p.ell(0, 0, 22, 18)
    p.line([-22, -10, 22, -10], 7)
    p.ell(0, -18, 20, 6)
    p.ell(0, -26, 5, 4)
    p.cut(() => p.line([-12, 2, 0, 8, 12, 2], 4))
  }, { turn })
}

function basket(p: Pen): void {
  p.blob([4, 110, 52, 110, 46, 142, 10, 142])
  p.line([8, 110, 14, 76, 42, 76, 48, 110], 5)
  p.cut(() => { p.line([10, 122, 28, 128, 46, 122], 4) })
}

function pump(p: Pen): void {
  p.blob([4, 142, 6, 108, 26, 108, 28, 142])
  p.line([16, 108, 16, 86], 6)
  p.ell(16, 82, 11, 6)
}

function bowl(p: Pen): void {
  p.line([0, 140, 56, 140], 6)
  p.blob([4, 110, 52, 110, 44, 134, 12, 134])
}

/** A pie on the stand: flat as a plate, or tall and domed once an egg has been laid. */
function pie(p: Pen, x: number, y: number, tall = false): void {
  const high = tall ? 34 : 16
  p.blob([x - 20, y, x - 17, y - high * 0.75, x - 8, y - high, x + 8, y - high, x + 17, y - high * 0.75, x + 20, y])
  p.cut(() => p.line([x - 8, y - high * 0.5, x, y - high * 0.6, x + 8, y - high * 0.5], 3))
}

/** How high a pie stands in a peek. */
const PIE_RISE = { flat: 20, tall: 38 }

/** A tray on a stand with a wide foot. */
function stand(p: Pen): void {
  p.ell(28, 120, 27, 6)
  p.poly([20, 124, 36, 124, 46, 144, 10, 144])
}

function stem(p: Pen, tall: number): void {
  p.line([28, 142, 24, 142 - tall * 0.5, 30, 142 - tall], 7)
  p.ell(14, 142 - tall * 0.4, 14, 6, 0.5)
  p.ell(42, 142 - tall * 0.6, 14, 6, -0.5)
  p.ell(30, 142 - tall - 9, 9, 12)
  p.cut(() => p.ell(30, 142 - tall - 10, 3, 4))
}

export const PEEKS: Readonly<Record<RoomId, Peek>> = {
  bedroom: {
    of: (h) => (h.dog === 3 ? 'dogOut' : 'dogIn'),
    ghost: 'dogIn',
    pictures: {
      // The dog asleep on his cushion, and the cushion alone with his bone on it.
      dogIn: (p) => {
        p.ell(28, 140, 27, 7)
        p.ell(32, 122, 22, 15)
        p.ell(12, 126, 13, 11)
        p.ell(6, 134, 6, 10, 0.3)
        p.cut(() => p.line([8, 124, 12, 127, 16, 124], 3))
        p.ell(20, 98, 6, 6)
        p.ell(30, 82, 9, 9)
      },
      dogOut: (p) => {
        p.ell(28, 136, 27, 9)
        p.cut(() => p.ell(28, 132, 18, 4))
        p.line([18, 118, 38, 112], 7)
        for (const [x, y] of [[15, 114], [17, 123], [39, 107], [42, 116]]) p.ell(x, y, 5, 5)
      },
    },
  },
  kitchen: {
    of: (h) => (h.soup === 3 ? 'flood' : 'pot'),
    ghost: 'pot',
    pictures: {
      pot: (p) => {
        p.blob([0, 142, 0, 126, 56, 126, 56, 142])
        pot(p, 28, 106, 0)
        p.ell(18, 66, 6, 7)
        p.ell(30, 48, 8, 9)
        p.ell(20, 28, 9, 10)
      },
      flood: (p) => {
        pot(p, 26, 100, -0.3)
        // One pool with a lapping edge, as in the kitchen itself: never two level wavy strokes one over the other.
        p.blob([0, 148, 0, 129, 14, 122, 28, 129, 42, 121, 56, 128, 56, 148])
      },
    },
  },
  bathroom: {
    // The bath shows in the clear once every patch of the glass is rubbed clear. The foot is the hen's, and she is not in the bath while she sits at the table.
    of: (h) => (h.fog !== 0 ? 'fog' : h.place === 'dining' && diner(h) === 'hen' ? 'clearNoFoot' : 'clear'),
    ghost: 'clear',
    pictures: {
      fog: (p) => {
        for (const [x, y, rx, ry] of [[16, 30, 15, 12], [38, 40, 16, 13], [20, 62, 18, 13], [40, 84, 15, 12], [16, 100, 15, 13], [36, 122, 18, 13], [12, 134, 11, 9]]) p.ell(x, y, rx, ry)
      },
      clear: (p) => {
        tub(p)
        duck(p, 42, 92)
        p.line([14, 104, 12, 72], 9)
        p.ell(12, 64, 9, 12)
        for (const dx of [-8, 0, 8]) p.ell(12 + dx, 50 + Math.abs(dx) * 0.4, 4, 4.5)
      },
      clearNoFoot: (p) => {
        tub(p)
        duck(p, 36, 92)
      },
    },
  },
  garden: {
    of: (h) => `weed${h.weed}`,
    ghost: 'weed1',
    pictures: {
      weed0: (p) => stem(p, 34),
      weed1: (p) => stem(p, 96),
      weed2: (p) => {
        p.ell(28, 138, 24, 7)
        p.cut(() => p.ell(28, 136, 15, 3))
        p.ell(8, 126, 6, 5)
        p.ell(46, 124, 7, 5)
        p.ell(30, 114, 5, 4)
      },
    },
  },
  dining: {
    of: (h) => (h.soup === 0 ? 'bowl0' : h.soup === 3 ? 'spill' : 'bowl1'),
    ghost: 'bowl1',
    pictures: {
      bowl0: (p) => bowl(p),
      bowl1: (p) => {
        bowl(p)
        p.ell(28, 108, 20, 7)
        // Steam as puffs that rise and shrink, never as a pair of curved strokes.
        p.ell(22, 90, 7, 5, -0.3)
        p.ell(34, 78, 5, 4, 0.3)
        p.ell(26, 66, 3.5, 3)
      },
      spill: (p) => {
        bowl(p)
        p.ell(28, 106, 24, 9)
        p.ell(6, 124, 6, 14)
        p.ell(50, 126, 6, 16)
        p.ell(40, 148, 5, 4)
      },
    },
  },
  henhouse: {
    // The basket as it stands: empty, one egg, two, or two and the chick.
    of: (h) => (h.eggs === 3 ? 'chick' : `eggs${h.eggs}`),
    ghost: 'eggs2',
    pictures: {
      eggs0: (p) => basket(p),
      eggs1: (p) => {
        basket(p)
        p.ell(28, 100, 10, 12)
      },
      eggs2: (p) => {
        basket(p)
        p.ell(20, 102, 10, 12, -0.3)
        p.ell(36, 100, 10, 12, 0.3)
      },
      chick: (p) => {
        basket(p)
        p.ell(18, 102, 10, 12, -0.3)
        p.ell(38, 102, 10, 12, 0.3)
        p.ell(28, 60, 12, 10)
        p.ell(22, 46, 8, 8)
        p.poly([15, 44, 7, 47, 15, 50])
        p.cut(() => p.ell(20, 45, 2, 2))
      },
    },
  },
  fair: {
    of: (h) => `balloon${h.balloon}`,
    ghost: 'balloon2',
    pictures: {
      balloon0: (p) => {
        pump(p)
        p.ell(42, 132, 8, 11, 0.5)
      },
      balloon1: (p) => {
        pump(p)
        p.ell(40, 104, 15, 18)
        p.cut(() => p.ell(35, 97, 4, 6, 0.5))
      },
      balloon2: (p) => {
        pump(p)
        p.ell(34, 60, 22, 38)
        p.cut(() => p.ell(26, 44, 5, 10, 0.4))
      },
      balloon3: (p) => {
        pump(p)
        for (const [x, y, turn] of [[40, 108, 0.4], [46, 70, -0.6], [28, 44, 1.2], [10, 62, 0.2], [34, 86, -1]]) p.ell(x, y, 9, 4, turn)
      },
    },
  },
  bakery: {
    // The tray as it stands: empty, one pie or two, flat or tall, or the tower fallen.
    of: (h) => (h.pies === 0 ? 'tray0' : h.pies === 3 ? 'toppled' : `pies${h.pies}${h.eggs > 0 ? 'T' : 'F'}`),
    ghost: 'pies2F',
    pictures: {
      tray0: (p) => stand(p),
      pies1F: (p) => { stand(p); pie(p, 28, 114) },
      pies2F: (p) => { stand(p); pie(p, 28, 114); pie(p, 28, 114 - PIE_RISE.flat) },
      pies1T: (p) => { stand(p); pie(p, 28, 114, true) },
      pies2T: (p) => { stand(p); pie(p, 28, 114, true); pie(p, 28, 114 - PIE_RISE.tall, true) },
      toppled: (p) => {
        p.ell(16, 138, 15, 6)
        p.ell(40, 128, 14, 6)
        p.ell(26, 116, 5, 4)
        p.ell(8, 118, 4, 5)
        p.ell(48, 108, 4, 5)
      },
    },
  },
}
