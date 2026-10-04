// The colours of the sticker look: bright daylight colours on a pale backing
// sheet. Every sticker has a white cut border, so nothing here is white or
// near white except what lies well inside a sticker.

export const PAL = {
  /** The backing sheet: the wall of the room. Pale, and dark enough for a white border to show on it. */
  sheet: '#cfeaf4',
  sheetLow: '#bfe0ee',
  /** The lamp's light on the sheet, fading to nothing. */
  light: 'rgba(255, 250, 222, 0.6)',
  lightEdge: 'rgba(255, 250, 222, 0)',
  floor: '#ffd27a',
  floorLine: '#f7bd55',
  /** The soft dark of every face and line: a plum, never black. */
  ink: '#43305a',
  blush: '#ff8fa3',
  white: '#ffffff',

  rabbit: { fur: '#b9a2f2', arm: '#ad95ea', paw: '#d6c8fb', belly: '#f3ecff', inner: '#ff9db8', nose: '#ff7fa0' },
  dog: { fur: '#f79a3e', ear: '#b8612b', paw: '#ffe3b8', muzzle: '#ffe9c6', mouth: '#8c2f45', tongue: '#ff7f9c', tongueLine: '#e95f84', nose: '#4a3148' },
  bear: { fur: '#b97b45', belly: '#f8dfb2', inner: '#e8a56f', pad: '#8a5630', nose: '#4a3148' },
  cat: { fur: '#7f90bd', stripe: '#63739f', belly: '#e9eefb', inner: '#ff9db8', nose: '#ff7fa0' },
  mouse: { fur: '#9db0c6', belly: '#e6eef7', pink: '#ff9fb4', hat: '#ef4f5f', hatBand: '#ffd23f' },
  hedgehog: { spines: '#8d5b3f', face: '#ffdcae', nose: '#4a3148' },
  duck: { body: '#ffd23f', wing: '#f5b82e', bill: '#ff8a3c' },

  table: { top: '#3fc7b0', edge: '#2aa893', leg: '#b9c6de', foot: '#97a7c6' },
  cart: { tray: '#4f9df2', lip: '#3b82d6', post: '#c3cee3', wheel: '#59627d', hub: '#dfe6f3' },
  door: { frame: '#ff7f6e', leaf: '#e8624f', knob: '#ffd23f', sky: '#aee3ff', hill: '#b4e88f', grass: '#86d96f', path: '#ffe7a8' },
  window: { frame: '#ff7f6e', sill: '#f2695a', sky: '#9bdcff', skyLow: '#d6f2ff', hill: '#86d96f', hillFar: '#b4e88f', bush: '#4fbf6a' },
  lamp: { cord: '#8f9bb8', shade: '#ffc93c', inside: '#fff3b8', bulb: '#fffbe0' },
  leaf: { green: '#4fbf6a', stem: '#3aa35a' },

  /** The inside of an open mouth, and a tongue, for any animal. */
  mouth: '#8c2f45',
  tongue: '#ff7f9c',
  drop: { water: '#62bdf6', glint: '#ffffff' },
  hand: { skin: '#fff0da', line: '#f0c9a0' },
  halo: { core: 'rgba(255, 252, 235, 0.92)', gold: 'rgba(255, 196, 46, 0.9)', out: 'rgba(255, 196, 46, 0)' },

  bowl: { body: '#ef4f5f', rim: '#d63b4e', water: '#bfeaff', waterDeep: '#8fd4fb' },
  blanket: { cloth: '#ffcf3d', trim: '#ff8a3c', fold: '#e9ae1c' },
  plaster: { sheet: '#dff3ea', strip: '#f2b184', pad: '#ffe1c4', dot: '#d9925f' },
  brush: { wood: '#e8a24f', bristle: '#5b477f' },
  basket: { wicker: '#d98f45', inside: '#b56f2c', weave: '#b9742f', cushion: '#ffb3c1' },
} as const
