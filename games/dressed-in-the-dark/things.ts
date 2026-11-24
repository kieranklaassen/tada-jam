// Who sleeps here, what there is to wear, and what each of them thinks of it. The tastes never change
// (pack: game-design, characters-with-opinions.md).

export const SLEEPERS = ['goat', 'hippo', 'hen', 'croc', 'pig'] as const
export type Sleeper = (typeof SLEEPERS)[number]

export const GARMENTS = ['bell', 'feather', 'pan', 'gown', 'armour', 'slippers', 'tutu', 'skates', 'boots'] as const
export type Garment = (typeof GARMENTS)[number]

/** Where on a body a garment goes. */
export type Slot = 'head' | 'body' | 'feet'
export const SLOT: Record<Garment, Slot> = {
  bell: 'head', pan: 'head', feather: 'head',
  gown: 'body', armour: 'body', tutu: 'body',
  boots: 'feet', slippers: 'feet', skates: 'feet',
}

/** On the line from the first night. The others are behind the wardrobe door, the two that make a sleeper walk among them. */
export const FIRST_OUT: readonly Garment[] = ['bell', 'pan', 'armour', 'tutu', 'boots']

/** The one garment each of them loves and dreams of. */
export const LOVES: Record<Sleeper, Garment> = { goat: 'pan', hippo: 'tutu', hen: 'boots', croc: 'feather', pig: 'skates' }
/** The one garment each of them does not notice, and then does. */
export const MISSES: Record<Sleeper, Garment> = { goat: 'boots', hippo: 'slippers', hen: 'gown', croc: 'armour', pig: 'bell' }

/** Three whole sets. Whoever wears one acts the part. */
export const PARTS = ['knight', 'lady', 'rider'] as const
export type Part = (typeof PARTS)[number]
export const SETS: Record<Part, readonly Garment[]> = {
  knight: ['pan', 'armour', 'boots'],
  lady: ['feather', 'gown', 'slippers'],
  rider: ['bell', 'tutu', 'skates'],
}

/** What a sleeper makes of everything it has on when the lamp shows it, and the garment that does its trick. */
export type Verdict =
  | { kind: 'bare' }
  | { kind: 'appalled'; at: Garment }
  | { kind: 'love'; at: Garment; and: boolean }
  | { kind: 'late'; at: Garment }
  | { kind: 'part'; part: Part; at: Garment }

function completedAt(part: Part, worn: readonly Garment[]): number {
  return Math.max(...SETS[part].map((garment) => worn.indexOf(garment)))
}

export function verdictOf(sleeper: Sleeper, worn: readonly Garment[]): Verdict {
  if (worn.length === 0) return { kind: 'bare' }
  const at = worn[worn.length - 1]
  // A whole set is acted out; with more than one, the set completed last.
  const whole = PARTS.filter((part) => SETS[part].every((garment) => worn.includes(garment)))
    .sort((a, b) => completedAt(b, worn) - completedAt(a, worn))
  if (whole.length > 0) return { kind: 'part', part: whole[0], at }
  // What it loves, and then (`and`) whatever else it has on; failing that, what it has not noticed; failing that, the last thing.
  if (worn.includes(LOVES[sleeper])) return { kind: 'love', at: LOVES[sleeper], and: worn.length > 1 }
  if (worn.includes(MISSES[sleeper])) return { kind: 'late', at: MISSES[sleeper] }
  return { kind: 'appalled', at }
}
