// The pictures. Each row is a string: '.' is empty, an uppercase letter is a
// one-hit brick in that palette colour, the lowercase letter is the same colour
// in a steel frame (two hits), and '*' is a bomb brick.

export type PowerKind = 'multi' | 'fire' | 'wide' | 'laser' | 'goo'

export interface Level {
  icon: string
  cheer: string
  rows: readonly string[]
  // Backdrop gradient, top to bottom, and the colour the backdrop pulses in.
  bg: readonly [string, string, string]
  glow: string
  // The first capsules of the level, in order; after that they are random.
  drops: readonly PowerKind[]
}

export const PALETTE: Record<string, string> = {
  R: '#ff4d6d',
  P: '#ffc2d4',
  O: '#ff9a3c',
  Y: '#ffd93b',
  G: '#4fe07a',
  B: '#4db8ff',
  V: '#b07cff',
  W: '#f4f7ff',
  K: '#6b4a3a',
}

export const LEVELS: readonly Level[] = [
  {
    icon: '❤️',
    cheer: 'HEART BUSTED!',
    rows: [
      '.RRR...RRR.',
      'RRRRR.RRRRR',
      'RPPRRRRRRRR',
      'RPRRR*RRRRR',
      '.RRRRRRRRR.',
      '..R*RRR*R..',
      '...RRRRR...',
      '....RRR....',
      '.....R.....',
    ],
    bg: ['#1a1040', '#3b1a6b', '#7a2a7a'],
    glow: '#ff7ab8',
    drops: ['multi', 'wide', 'fire', 'multi'],
  },
  {
    icon: '😀',
    cheer: 'SMILE SMASHED!',
    rows: [
      '....YYYYY....',
      '..YYYYYYYYY..',
      '.YYY*YYY*YYY.',
      'YYYY*YYY*YYYY',
      'YYYYYYYYYYYYY',
      'YYKYYYYYYYKYY',
      '.YYKKKKKKKYY.',
      '..YYYRRRYYY..',
      '....YYYYY....',
    ],
    bg: ['#0e1a4a', '#1d3a8a', '#2a6aa8'],
    glow: '#ffe14d',
    drops: ['laser', 'multi', 'goo', 'fire'],
  },
  {
    icon: '👾',
    cheer: 'ZAPPED!',
    rows: [
      '..g.....g..',
      '...G...G...',
      '..GGGGGGG..',
      '.GG*GGG*GG.',
      'GGGGGGGGGGG',
      'G.GGGGGGG.G',
      'G.g.....g.G',
      '...gg.gg...',
    ],
    bg: ['#05060f', '#0c1430', '#123040'],
    glow: '#5eff8a',
    drops: ['fire', 'laser', 'multi', 'goo'],
  },
  {
    icon: '🌈',
    cheer: 'RAINBOW BOOM!',
    rows: [
      '.....RRRRR.....',
      '...RROOOOORR...',
      '..ROOYYYYYOOR..',
      '.ROOYYG*GYYOOR.',
      '.ROYGGBBBGGYOR.',
      'ROYYGB...BGYYOR',
      'ROYGB.....BGYOR',
      'R*YGB.....BGY*R',
      'wwWWw.....wWWww',
    ],
    bg: ['#15235c', '#2d4fa8', '#5f93e0'],
    glow: '#ffffff',
    drops: ['multi', 'goo', 'laser', 'multi'],
  },
  {
    icon: '👻',
    cheer: 'BOO-STED!',
    rows: [
      '...BBBBB...',
      '.BBBBBBBBB.',
      'BBWWBBBWWBB',
      'BBW*BBBW*BB',
      'BBBBBBBBBBB',
      'BBBBBBBBBBB',
      'BBBBBBBBBBB',
      'bBBBBBBBBBb',
      'b.bb.b.bb.b',
    ],
    bg: ['#120a2a', '#2a1458', '#43207a'],
    glow: '#9ad0ff',
    drops: ['fire', 'multi', 'laser', 'wide'],
  },
  {
    icon: '🍄',
    cheer: 'MUSHROOM MASHED!',
    rows: [
      '...RRRRR...',
      '.RRWWRRRRR.',
      'RRRWWRRWWRR',
      'RRRRRRRWWRR',
      'RWWRRRRRRRR',
      'rrrrrrrrrrr',
      '..PPPPPPP..',
      '..PP*P*PP..',
      '...PPPPP...',
    ],
    bg: ['#08241c', '#0f4a3a', '#2a7a4a'],
    glow: '#ffb3c6',
    drops: ['laser', 'multi', 'fire', 'goo'],
  },
  {
    icon: '🐱',
    cheer: 'CAT-ASTROPHE!',
    rows: [
      '.OO.......OO.',
      '.OOO.....OOO.',
      '.OOOOOOOOOOO.',
      'OOOOOOOOOOOOO',
      'OOg*OOOOO*gOO',
      'OOOOOOPOOOOOO',
      'wwOOOKOKOOOww',
      '.OOOOOOOOOOO.',
      '...OOOOOOO...',
    ],
    bg: ['#2a1030', '#5a1e4a', '#a0443a'],
    glow: '#ffc27a',
    drops: ['multi', 'fire', 'wide', 'laser'],
  },
  {
    icon: '🌟',
    cheer: 'SUPERSTAR!',
    rows: [
      '......Y......',
      '.....YYY.....',
      'yYYYYYYYYYYYy',
      '.yYYY*Y*YYYy.',
      '..YYYYYYYYY..',
      '...YYYOYYY...',
      '..YYYY.YYYY..',
      '..yYY...YYy..',
      '.yy.......yy.',
    ],
    bg: ['#060818', '#141a4a', '#3a2a7a'],
    glow: '#fff3a0',
    drops: ['fire', 'multi', 'laser', 'multi'],
  },
]
