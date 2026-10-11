import type { Rgb } from './bricks'
import type { Colour } from './toys'

// The colours of the look: moulded plastic in a few saturated primaries, on
// neutral bricks. Written as display values; the brick shader shades them as
// they are.

const hex = (value: number): Rgb => [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]

/** The three toy colours, which are also the three colour gobblers. */
export const TOY_COLOUR: { readonly [C in Colour]: Rgb } = {
  red: hex(0xd8261c),
  blue: hex(0x1668d8),
  yellow: hex(0xf7c400),
}

export const WHITE = hex(0xf3f2ec)
export const BLACK = hex(0x1c2026)
/** The tray the toys stand on: plain and pale, so every toy colour stands off it. */
export const TRAY = hex(0xe4e1d6)
/** The machine's own trim: the one brick primary no toy has, so nothing on the machine looks like a group. */
export const TRIM = hex(0x2ea44f)
/**
 * The cabinet: a dusky violet-blue that is no toy colour and no gobbler's, a good deal greyer than either and
 * darker than the white ones, so every gobbler and every toy stands off it. The step the crew stands on is the
 * lightest of it, the floor round the tray the darkest.
 */
export const WALL = hex(0x5a639f)
export const WALL_LIGHT = hex(0x7a85c6)
export const FLOOR = hex(0x464e86)
export const STEP = hex(0x7f89bd)
export const STEEL = hex(0xaab2bc)
export const STEEL_DARK = hex(0x6c7682)
export const TONGUE = hex(0xf2718a)
export const LAMP = hex(0xffe9a8)
/** The crates the loads come in: a warm brown that is no toy colour. */
export const CRATE = hex(0xb7793f)
export const CRATE_DARK = hex(0x9a6130)
/** The ghost hand: a pale glove. */
export const GLOVE = hex(0xfbfaf4)
export const CUFF = hex(0xff9f6b)

/** The watcher: a soft orchid that is no toy colour, no gobbler's and not the machine's. */
export const WATCHER = hex(0xc47fd6)
export const WATCHER_DARK = hex(0x9a5cb0)
/** A bulb of the cabinet's lamps, lit and dim. */
export const BULB_LIT = hex(0xfff4c6)
export const BULB_DIM = hex(0x9b8450)

export const BACKDROP_HEX = 0x3d4478
