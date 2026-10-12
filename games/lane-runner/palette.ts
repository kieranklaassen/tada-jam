// The bead colours. Every figure and every piece of the setting is made of
// these and nothing else, as a box of craft beads holds a fixed set of tubs.
// A plaque names a colour by its one-character key, and stores the key's
// place in this list plus one, with 0 for a peg that holds no bead.

export const BEADS = [
  { key: 'W', hex: '#f7f5ee' }, // white
  { key: 'C', hex: '#f3e2b8' }, // cream
  { key: 'K', hex: '#2a2730' }, // black
  { key: 'A', hex: '#8d8f96' }, // grey
  { key: 'a', hex: '#c9cbd0' }, // pale grey
  { key: 'D', hex: '#5b3a26' }, // dark brown
  { key: 'B', hex: '#8a5a36' }, // brown
  { key: 'T', hex: '#cfa46b' }, // tan
  { key: 't', hex: '#e6cf9c' }, // sand
  { key: 'O', hex: '#f07a22' }, // orange
  { key: 'o', hex: '#f9a857' }, // pale orange
  { key: 'R', hex: '#d93a34' }, // red
  { key: 'r', hex: '#a3262a' }, // dark red
  { key: 'P', hex: '#f39bb5' }, // pink
  { key: 'p', hex: '#f9cbd6' }, // pale pink
  { key: 'Y', hex: '#f7cd2e' }, // yellow
  { key: 'y', hex: '#f9e58a' }, // pale yellow
  { key: 'G', hex: '#4faa3f' }, // green
  { key: 'g', hex: '#2e7a3a' }, // dark green
  { key: 'l', hex: '#a0d468' }, // pale green
  { key: 'U', hex: '#3478d1' }, // blue
  { key: 'u', hex: '#7cc0ee' }, // pale blue
  { key: 'N', hex: '#27407d' }, // navy
  { key: 'V', hex: '#7d55b8' }, // purple
  { key: 'v', hex: '#b79ae0' }, // lilac
  { key: 'E', hex: '#2a9d8f' }, // teal
  { key: 'e', hex: '#9fe0cf' }, // mint
] as const

export type BeadKey = (typeof BEADS)[number]['key']

const INDEX = new Map<string, number>(BEADS.map((bead, i) => [bead.key, i + 1]))

/** The number a plaque stores for a colour: its place in the list plus one. */
export function beadIndex(key: BeadKey): number {
  return INDEX.get(key)!
}

/** The same for a character out of a drawn row, or 0 when it names no bead. */
export function beadIndexOf(char: string): number {
  return INDEX.get(char) ?? 0
}

/** The colour of a stored number as `[red, green, blue]`, each 0 to 1, as written (sRGB). */
export function beadRgb(index: number): [number, number, number] {
  const hex = BEADS[index - 1].hex
  return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255]
}
