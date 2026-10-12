import { n, run, t, type Sound } from './notes'

// The sounds of the game beyond the toy: one for every cell of the grid, every
// theft, every pair on the table and every beat of a scene, in the words of
// the design sheet. A mark's `at` is the moment of the motion it is heard at.

const saw = { wave: 'sawtooth' } as const, tri = { wave: 'triangle' } as const, sq = { wave: 'square' } as const

/** The jay's screech: a rattle of four harsh notes. */
const screech = (at: number, pitch = 1, peak = 0.05) => run(4, at, 0.08, (i, when) => t((1020 + (i % 2) * 70) * pitch, peak, 0.004, 0.05, { ...saw, glideTo: 860 * pitch, at: when }))
/** One beat of his wings. */
const beat = (at: number, pitch = 1) => n(700 * pitch, 1.2, 0.07, 0.02, 0.09, { glideTo: 420 * pitch, at })
/** The toad's croak: `count` pulses from `from` hertz. */
const croak = (at: number, from: number, count = 3, peak = 0.1) => run(count, at, 0.08, (i, when) => t(from - i * 6, peak, 0.01, i === count - 1 ? 0.14 : 0.07, { ...saw, at: when }))

export const CELL_SOUNDS = {
  // Lifting a thing and setting it down where nothing happens.
  pick: { rides: 0.2, marks: [t(520, 0.06, 0.004, 0.06, { ...tri, glideTo: 700 })] },
  setDown: { rides: 0.25, marks: [t(240, 0.09, 0.004, 0.07, tri), n(700, 2, 0.04, 0.003, 0.05)] },
  // The woodlouse that moves in where a thing was carried off.
  louse: { rides: 0.9, marks: run(6, 0.1, 0.11, (i, at) => n(2000 + (i % 2) * 300, 6, 0.045, 0.003, 0.03, { at })) },
  louseOut: { rides: 0.6, marks: run(4, 0, 0.12, (i, at) => n(1700 - i * 120, 6, 0.04, 0.003, 0.03, { at })) },

  // Set down before the hedgehog, unrolled.
  hogSnail: { rides: 2.4, marks: [...run(3, 0.3, 0.3, (i, at) => t(640 - i * 40, 0.08, 0.003, 0.04, { ...tri, at })), ...run(2, 1.5, 0.3, (i, at) => t(560 + i * 40, 0.07, 0.003, 0.04, { ...tri, at })), n(900, 3, 0.07, 0.02, 0.12, { glideTo: 1400, at: 2 })] },
  hogFeather: { rides: 2, marks: [...run(3, 0.2, 0.3, (i, at) => n(2000 + i * 500, 4, 0.05, 0.03, 0.08, { at })), n(1500, 0.6, 0.14, 0.005, 0.25, { glideTo: 600, at: 1.1 }), t(420, 0.08, 0.005, 0.1, { glideTo: 260, at: 1.1 })] },
  hogAcorn: { rides: 2.2, marks: [t(330, 0.11, 0.004, 0.12, { glideTo: 500, at: 0.4 }), ...run(4, 0.56, 0.085, (_i, at) => t(190, 0.07, 0.003, 0.03, { ...sq, at })), t(470, 0.09, 0.003, 0.05, { ...tri, at: 1.1 }), n(300, 2, 0.05, 0.05, 0.6, { at: 1.15 })] },
  hogButton: { rides: 2, marks: [t(1900, 0.07, 0.004, 0.4, { at: 0.3 }), t(2850, 0.03, 0.004, 0.3, { at: 0.3 }), t(1760, 0.07, 0.004, 0.3, { glideTo: 1500, at: 1.3 }), n(800, 3, 0.07, 0.01, 0.1, { glideTo: 500, at: 1.5 })] },
  hogApple: { rides: 2.6, marks: [n(1900, 1.4, 0.12, 0.004, 0.12, { at: 0.6 }), t(160, 0.1, 0.004, 0.1, { at: 0.6 }), ...run(4, 1, 0.35, (i, at) => t(210 + (i % 2) * 30, 0.05, 0.004, 0.05, { ...tri, at }))] },
  applePop: { rides: 0.3, marks: [t(300, 0.12, 0.003, 0.08, { glideTo: 900 })] },
  // Brought to him while he is a ball.
  ballSnail: { rides: 2.6, marks: run(4, 0.3, 0.6, (i, at) => n(520 + i * 60, 5, 0.07, 0.06, 0.14, { glideTo: 320, at })) },
  ballFeather: { rides: 1.6, marks: [n(3600, 4, 0.04, 0.003, 0.03, { at: 0.2 }), ...run(8, 0.4, 0.12, (i, at) => t(1400 + (i % 2) * 220, 0.04, 0.004, 0.04, { at }))] },
  ballAcorn: { rides: 1.4, marks: [t(2300, 0.08, 0.003, 0.2, { at: 0.15 }), t(360, 0.1, 0.003, 0.07, { ...tri, at: 1.1 })] },
  ballButton: { rides: 1.6, marks: [t(2400, 0.05, 0.004, 0.5, { at: 0.5 }), t(3200, 0.03, 0.004, 0.4, { at: 0.5 })] },
  ballApple: { rides: 0.8, marks: [t(120, 0.18, 0.004, 0.14, { glideTo: 80, at: 0.25 }), n(900, 1.5, 0.08, 0.003, 0.06, { at: 0.25 })] },
  // The hedgehog and the worm: the worm dives, and he sits back.
  wormDive: { rides: 1, marks: [n(600, 4, 0.09, 0.05, 0.3, { glideTo: 1800 }), t(380, 0.11, 0.003, 0.08, { glideTo: 820, at: 0.5 })] },
  hogHm: { rides: 0.5, marks: [t(300, 0.06, 0.03, 0.2, { ...tri, glideTo: 240 })] },

  // Put down on the open path.
  pathWorm: { rides: 2.6, marks: run(4, 0.2, 0.5, (i, at) => t(560 + i * 20, 0.05, 0.01, 0.06, { at })).flatMap((mark) => [mark, { ...mark, frequency: mark.frequency * 1.12, at: (mark.at ?? 0) + 0.15 }]) },
  pathSnail: { rides: 4, marks: [n(1400, 7, 0.06, 0.2, 0.9, { glideTo: 1900, at: 0.2 }), t(900, 0.1, 0.002, 0.03, { ...sq, at: 2.2 }), t(940, 0.1, 0.002, 0.03, { ...sq, at: 2.45 }), t(1150, 0.06, 0.01, 0.2, { ...saw, glideTo: 700, at: 2.9 })] },
  pathFeather: { rides: 2.8, marks: [n(2200, 3, 0.05, 0.1, 0.9, { glideTo: 3000, at: 0.1 }), t(520, 0.06, 0.02, 0.12, { ...tri, at: 1.9 }), t(660, 0.06, 0.02, 0.18, { ...tri, at: 2.15 })] },
  pathAcorn: { rides: 3.2, marks: [n(380, 2.5, 0.07, 0.05, 0.8, { glideTo: 260, at: 0.1 }), t(300, 0.07, 0.003, 0.05, { ...tri, at: 1 }), t(820, 0.13, 0.002, 0.04, { ...sq, at: 2 })] },
  pathApple: { rides: 4.2, marks: [n(170, 1.5, 0.11, 0.06, 0.9, { glideTo: 130, at: 0.1 }), t(96, 0.2, 0.004, 0.16, { glideTo: 60, at: 1.1 }), ...run(4, 2, 0.2, (i, at) => beat(at, 1.2 + (i % 2) * 0.2)), t(1250, 0.06, 0.01, 0.22, { ...saw, glideTo: 640, at: 3 }), t(280, 0.07, 0.003, 0.05, { ...tri, at: 3.3 })] },

  // The jay's theft, each thing snatched in its own way.
  stealButton: { rides: 5, marks: [...screech(0.5), beat(2), beat(2.4), beat(2.8), t(2100, 0.09, 0.003, 0.3, { at: 3.4 }), t(3150, 0.04, 0.003, 0.2, { at: 3.4 })] },
  stealWorm: { rides: 5, marks: [...screech(1.6, 0.55, 0.035), n(500, 1, 0.04, 0.01, 0.2, { at: 1.6 }), beat(2, 0.8), beat(2.4, 0.8), beat(2.8, 0.8), t(330, 0.06, 0.004, 0.08, { glideTo: 220, at: 3.4 })] },
  stealSnail: { rides: 5, marks: [...screech(0.5, 1.1), t(240, 0.12, 0.004, 0.07, { glideTo: 700, at: 1.5 }), beat(2, 0.9), beat(2.45, 0.9), beat(2.9, 0.9), t(600, 0.08, 0.003, 0.04, { ...tri, at: 3.4 })] },
  stealFeather: { rides: 5, marks: [...screech(0.5, 0.9), ...run(3, 2, 0.5, (_i, at) => n(1100, 0.8, 0.1, 0.004, 0.07, { at })), n(2600, 3, 0.04, 0.02, 0.15, { at: 3.4 })] },
  stealAcorn: { rides: 5.4, marks: [...screech(0.5, 1.2), t(430, 0.1, 0.003, 0.05, { ...tri, at: 1.9 }), t(410, 0.1, 0.003, 0.05, { ...tri, at: 2.7 }), beat(3.3, 1.1), beat(3.7, 1.1), t(520, 0.08, 0.003, 0.05, { ...tri, at: 4.3 })] },
  stealApple: { rides: 4.4, marks: [...screech(0.5, 0.8), ...run(8, 1.6, 0.2, (i, at) => t(700 + (i % 3) * 40, 0.045, 0.004, 0.06, { ...saw, glideTo: 620, at })), t(90, 0.2, 0.004, 0.16, { glideTo: 60, at: 3.3 })] },

  // Set on the toad's stone: how he looks at each thing, and what the thing does there.
  stoneWorm: { rides: 4, marks: [...croak(0.4, 84, 2, 0.12), ...croak(0.8, 78, 2, 0.12), t(180, 0.06, 0.2, 0.7, { ...saw, glideTo: 240, at: 2 })] },
  stoneSnail: { rides: 4, marks: [t(92, 0.11, 0.03, 0.2, { ...saw, glideTo: 120, at: 0.4 }), t(92, 0.11, 0.03, 0.2, { ...saw, glideTo: 126, at: 0.9 }), ...run(4, 1.8, 0.45, (i, at) => t(150 + [0, 30, 0, -24][i], 0.05, 0.1, 0.3, { at }))] },
  stoneFeather: { rides: 4, marks: [...croak(0.5, 110, 2), t(120, 0.1, 0.01, 0.1, { ...saw, at: 2.1 }), n(1400, 0.6, 0.14, 0.005, 0.22, { glideTo: 500, at: 2.2 })] },
  stoneAcorn: { rides: 4, marks: [t(480, 0.1, 0.003, 0.04, { ...tri, at: 0.5 }), t(480, 0.1, 0.003, 0.04, { ...tri, at: 0.85 }), ...croak(1.3, 124, 2)] },
  stoneButton: { rides: 4, marks: [t(1820, 0.07, 0.004, 0.5, { at: 0.4 }), t(236, 0.09, 0.01, 0.07, { ...saw, at: 0.6 }), t(248, 0.09, 0.01, 0.12, { ...saw, glideTo: 300, at: 0.68 })] },
  stoneApple: { rides: 2.6, marks: [t(82, 0.22, 0.004, 0.18, { glideTo: 50, at: 0.3 }), n(240, 1, 0.1, 0.004, 0.08, { at: 0.3 }), t(100, 0.1, 0.02, 0.8, { ...saw, glideTo: 330, at: 0.4 })] },
  // The toad leaps, lands and croaks once from where he has come to sit.
  toadLeap: { rides: 0.9, marks: [t(110, 0.08, 0.02, 0.3, { glideTo: 260 })] },
  toadOnce: { rides: 0.6, marks: croak(0, 104, 3) },

  // Set in the puddle, or in the bowl on the table.
  waterWorm: { rides: 3, marks: [...run(4, 0.2, 0.4, (i, at) => t(300 + i * 70, 0.08, 0.01, 0.1, { glideTo: 420 + i * 90, at })), ...run(4, 2.3, 0.1, (i, at) => n(1800 + (i % 2) * 400, 5, 0.05, 0.003, 0.03, { at }))] },
  waterSnail: { rides: 3.2, marks: run(3, 0.6, 0.9, (i, at) => t(400 - i * 40, 0.08, 0.02, 0.16, { glideTo: 640 - i * 40, at })) },
  waterFeather: { rides: 2.2, marks: [t(700, 0.04, 0.3, 0.9, { glideTo: 1000, at: 0.1 }), n(900, 2, 0.05, 0.04, 0.12, { at: 1.5 }), n(800, 2, 0.04, 0.04, 0.12, { at: 1.8 })] },
  waterAcorn: { rides: 2, marks: [t(360, 0.13, 0.004, 0.12, { glideTo: 150, at: 0.15 }), t(520, 0.07, 0.01, 0.08, { glideTo: 800, at: 0.8 }), t(600, 0.06, 0.01, 0.08, { glideTo: 900, at: 1.2 })] },
  waterButton: { rides: 1.2, marks: [t(2500, 0.08, 0.002, 0.1, { at: 0.1 }), t(900, 0.05, 0.05, 0.7, { glideTo: 300, at: 0.2 })] },
  waterApple: { rides: 2.2, marks: [n(700, 0.5, 0.16, 0.005, 0.3, { glideTo: 300, at: 0.15 }), t(130, 0.14, 0.005, 0.15, { glideTo: 80, at: 0.15 }), t(1100, 0.06, 0.003, 0.06, { glideTo: 1500, at: 1.1 }), t(1250, 0.05, 0.003, 0.06, { glideTo: 1650, at: 1.5 })] },
  // The jay at the puddle, where the button glints: a peck at his own face, a splash, a shake.
  jayPuddle: { rides: 3.4, marks: [beat(0.2), beat(0.5), t(1500, 0.08, 0.002, 0.03, { ...sq, at: 1.2 }), n(900, 0.6, 0.13, 0.005, 0.25, { at: 1.4 }), ...run(5, 1.9, 0.09, (i, at) => n(2600 + (i % 2) * 500, 4, 0.05, 0.003, 0.04, { at })), beat(2.6), beat(2.9)] },
  // A tap in the bowl with nothing in it.
  bowlTap: { rides: 0.6, marks: [t(880, 0.07, 0.004, 0.12, { glideTo: 1250 })] },
  // A finger on the open water of the puddle: a plip, lower and wetter than the bowl's.
  puddleTap: { rides: 0.6, marks: [t(540, 0.08, 0.004, 0.1, { glideTo: 860 }), n(1500, 3, 0.03, 0.01, 0.16, { glideTo: 1100 })] },

  // The nest tipped out, and each thing landing at the foot of the tree.
  nestTip: { rides: 0.5, marks: [n(3200, 1.5, 0.06, 0.005, 0.06), t(260, 0.07, 0.01, 0.1, { ...tri, glideTo: 180 })] },
  tipLand: { rides: 0.2, marks: [t(330, 0.1, 0.003, 0.06, tri), n(900, 2, 0.04, 0.003, 0.04)] },
  // Through the door: a thing sent in, a thing that found no room and rolls out, the view going in and out.
  sentIn: { rides: 0.55, marks: [n(1200, 2, 0.05, 0.03, 0.3, { glideTo: 500 }), t(520, 0.05, 0.004, 0.08, { ...tri, glideTo: 380 })] },
  rollOff: { rides: 1.6, marks: [n(320, 2.5, 0.08, 0.05, 0.4, { glideTo: 240 }), t(250, 0.1, 0.003, 0.06, { ...tri, at: 0.5 }), n(280, 2.5, 0.06, 0.05, 0.6, { glideTo: 200, at: 0.6 })] },
  comeHome: { rides: 1.4, marks: [t(250, 0.05, 0.05, 0.25, { ...saw, glideTo: 330 }), n(500, 0.8, 0.05, 0.3, 0.8, { glideTo: 900, at: 0.1 }), t(196, 0.1, 0.004, 0.12, { ...tri, at: 1.3 })] },
  goOut: { rides: 0.9, marks: [t(330, 0.05, 0.05, 0.22, { ...saw, glideTo: 240 }), n(900, 0.8, 0.05, 0.2, 0.5, { glideTo: 500, at: 0.1 })] },
  rockHome: { rides: 0.6, marks: [t(390, 0.07, 0.003, 0.05, tri), t(350, 0.06, 0.003, 0.05, { ...tri, at: 0.22 })] },
  // The feather wipes a wet thing dry.
  wipe: { rides: 0.5, marks: [n(2800, 1, 0.05, 0.03, 0.14), n(3300, 1, 0.05, 0.03, 0.14, { at: 0.22 })] },

  // Two things set together on the table.
  'worm+snail': { rides: 1.8, marks: [t(340, 0.08, 0.05, 0.5, { ...tri, glideTo: 700 }), t(960, 0.06, 0.006, 0.07, { at: 1.3 })] },
  'worm+feather': { rides: 1.6, marks: run(10, 0.1, 0.13, (i, at) => t(1050 + (i % 2) * 260, 0.04, 0.004, 0.04, { ...tri, at })) },
  'worm+acorn': { rides: 1.4, marks: [t(280, 0.12, 0.003, 0.08, { glideTo: 760, at: 0.9 })] },
  'worm+button': { rides: 1.6, marks: [n(1500, 6, 0.07, 0.01, 0.16, { glideTo: 3400, at: 0.3 }), n(3400, 6, 0.07, 0.01, 0.16, { glideTo: 1500, at: 0.9 })] },
  'worm+apple': { rides: 2, marks: [n(1300, 2, 0.09, 0.004, 0.07, { at: 0.3 }), n(1100, 2, 0.09, 0.004, 0.07, { at: 0.7 }), t(320, 0.11, 0.003, 0.08, { glideTo: 800, at: 1.5 })] },
  'snail+feather': { rides: 2.2, marks: run(4, 0.4, 0.4, (_i, at) => t(196, 0.05, 0.1, 0.3, { at })) },
  'snail+acorn': { rides: 2.4, marks: run(5, 0.3, 0.4, (i, at) => t(230 + [0, 40, 70, 40, 0][i], 0.05, 0.05, 0.3, { ...saw, at })) },
  'snail+button': { rides: 2, marks: [t(1700, 0.07, 0.004, 0.5, { at: 0.2 }), t(820, 0.06, 0.006, 0.06, { at: 1 }), t(980, 0.06, 0.006, 0.07, { at: 1.4 })] },
  'snail+apple': { rides: 2, marks: run(3, 0.4, 0.45, (i, at) => n(1700 + i * 150, 3, 0.09, 0.02, 0.14, { glideTo: 900, at })) },
  'feather+acorn': { rides: 1.8, marks: [t(1100, 0.04, 0.15, 0.9, { glideTo: 900, at: 0.3 }), n(2400, 5, 0.03, 0.15, 0.8, { at: 0.3 })] },
  'feather+button': { rides: 1.4, marks: [n(3000, 0.8, 0.06, 0.05, 0.3, { at: 0.2 }), t(2640, 0.08, 0.003, 0.3, { at: 0.8 })] },
  'feather+apple': { rides: 1.6, marks: [t(180, 0.13, 0.005, 0.14, { glideTo: 140, at: 0.3 }), ...run(4, 0.6, 0.11, (_i, at) => n(2500, 2, 0.04, 0.01, 0.04, { at }))] },
  'acorn+button': { rides: 2.2, marks: [n(600, 8, 0.07, 0.1, 1.1, { glideTo: 1500, at: 0.2 }), t(400, 0.1, 0.003, 0.06, { ...tri, at: 1.8 })] },
  'acorn+apple': { rides: 1.8, marks: [t(520, 0.09, 0.003, 0.04, { ...tri, at: 0.5 }), t(190, 0.12, 0.005, 0.14, { glideTo: 150, at: 0.55 })] },
  'button+apple': { rides: 1.8, marks: [t(2900, 0.09, 0.002, 0.12, { at: 0.6 }), t(2300, 0.07, 0.002, 0.1, { glideTo: 1500, at: 1.4 })] },
} satisfies Record<string, Sound>
