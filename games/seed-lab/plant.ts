// The model of the world: what a plant carries and what it shows.
//
// A plant carries a pair of factors for each of four traits. What it shows
// follows from its pairs and from the soil it came up in, and from nothing
// else. Which factor hides which is the game's own choice (ART.md, "The
// representation"); that a pair is one factor from each parent is the model.
//
// No renderer and no DOM: this module is numbers in and numbers out.

export const TRAITS = ['colour', 'height', 'leaf', 'petals'] as const
export type Trait = (typeof TRAITS)[number]

/** One factor of a pair. For colour 1 is red and 0 is white. For the other three, 1 is the factor that hides the other: tall, round, plain. */
export type Factor = 0 | 1
/** The two factors a plant carries for one trait: the first came from the plant the pod sat on, the second from the plant the dust came from. */
export type Pair = readonly [Factor, Factor]
/** All four pairs packed into one whole number from 0 to 255, two bits a trait in the order of `TRAITS`. This is what a save stores. */
export type Pairs = number

export type Colour = 'red' | 'pink' | 'white'
export type Leaf = 'round' | 'jagged'
export type Petals = 'plain' | 'spotted'
/** Stem joints as seen: four for a tall plant, two for a short one, and half of either when it came up in dry soil. */
export type Joints = 1 | 2 | 4

/** What a plant shows. Two plants with the same look can carry different pairs. */
export type Look = { colour: Colour; joints: Joints; leaf: Leaf; petals: Petals }

export const TALL_JOINTS = 4
export const SHORT_JOINTS = 2

export function isPairs(value: unknown): value is Pairs {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255
}

export function pack(pairs: Record<Trait, Pair>): Pairs {
  let packed = 0
  TRAITS.forEach((trait, at) => {
    packed |= (pairs[trait][0] << (2 * at)) | (pairs[trait][1] << (2 * at + 1))
  })
  return packed
}

export function pairOf(pairs: Pairs, trait: Trait): Pair {
  const at = TRAITS.indexOf(trait)
  return [((pairs >> (2 * at)) & 1) as Factor, ((pairs >> (2 * at + 1)) & 1) as Factor]
}

/** The same plant with one pair replaced. */
export function withPair(pairs: Pairs, trait: Trait, pair: Pair): Pairs {
  const at = TRAITS.indexOf(trait)
  const cleared = pairs & ~(3 << (2 * at))
  return cleared | (pair[0] << (2 * at)) | (pair[1] << (2 * at + 1))
}

/** Whether either factor of the pair is the one that hides the other. */
function shows(pairs: Pairs, trait: Trait): boolean {
  const [first, second] = pairOf(pairs, trait)
  return first === 1 || second === 1
}

/** A plant carries a factor it does not show: its pair for the trait is mixed. In colour a mixed pair shows, as pink. */
export function carriesHidden(pairs: Pairs, trait: Trait): boolean {
  const [first, second] = pairOf(pairs, trait)
  return trait !== 'colour' && first !== second
}

/** Both factors of the pair are the same, so every seed gets that factor from this plant. */
export function breedsTrue(pairs: Pairs, trait: Trait): boolean {
  const [first, second] = pairOf(pairs, trait)
  return first === second
}

export function colourOf(pairs: Pairs): Colour {
  const [first, second] = pairOf(pairs, 'colour')
  return first + second === 2 ? 'red' : first + second === 1 ? 'pink' : 'white'
}

/**
 * How high the plant stands, in joints. The pairs set four or two; soil that
 * was dry when it came up halves that. A tall plant from dry soil and a short
 * one from wet soil both stand two joints high and pass on different things.
 */
export function jointsOf(pairs: Pairs, dry: boolean): Joints {
  const grown = shows(pairs, 'height') ? TALL_JOINTS : SHORT_JOINTS
  return (dry ? grown / 2 : grown) as Joints
}

export function lookOf(pairs: Pairs, dry: boolean): Look {
  return {
    colour: colourOf(pairs),
    joints: jointsOf(pairs, dry),
    leaf: shows(pairs, 'leaf') ? 'round' : 'jagged',
    petals: shows(pairs, 'petals') ? 'plain' : 'spotted',
  }
}

const COLOURS: readonly Colour[] = ['white', 'pink', 'red']
const JOINTS: readonly Joints[] = [1, 2, 4]

/** Number of different looks: three colours, three heights, two leaves, two kinds of petal. */
export const LOOKS = 36

/** A look as one whole number from 0 to 35, for the small drawings a save keeps of plants that have left the page. */
export function lookCode(look: Look): number {
  return COLOURS.indexOf(look.colour) + 3 * (JOINTS.indexOf(look.joints) + 3 * ((look.leaf === 'jagged' ? 1 : 0) + 2 * (look.petals === 'spotted' ? 1 : 0)))
}

export function isLookCode(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < LOOKS
}

export function lookFromCode(code: number): Look {
  const colour = COLOURS[code % 3]
  const joints = JOINTS[Math.floor(code / 3) % 3]
  const rest = Math.floor(code / 9)
  return { colour, joints, leaf: rest % 2 === 1 ? 'jagged' : 'round', petals: rest >= 2 ? 'spotted' : 'plain' }
}

// --- The packets -------------------------------------------------------------

/**
 * What the seeds of each packet carry. Every packet plant looks the same:
 * pink, tall, round-leaved, plain. Pink is a red factor with a white one, and
 * each later packet also carries, hidden, the one factor it is named for. So
 * nothing a visitor asks for can be taken out of a packet: it has to be bred.
 * A packet can be sown again at any time, so no factor can be lost.
 */
export const PACKETS = {
  pink: pack({ colour: [1, 0], height: [1, 1], leaf: [1, 1], petals: [1, 1] }),
  short: pack({ colour: [1, 0], height: [1, 0], leaf: [1, 1], petals: [1, 1] }),
  jagged: pack({ colour: [1, 0], height: [1, 1], leaf: [1, 0], petals: [1, 1] }),
  spots: pack({ colour: [1, 0], height: [1, 1], leaf: [1, 1], petals: [1, 0] }),
} as const satisfies Record<string, Pairs>

export type PacketId = keyof typeof PACKETS
export const PACKET_IDS = Object.keys(PACKETS) as PacketId[]

export function isPacketId(value: unknown): value is PacketId {
  return typeof value === 'string' && Object.hasOwn(PACKETS, value)
}
