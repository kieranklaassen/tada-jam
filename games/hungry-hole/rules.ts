import { fits, footOf, mouthOf, type Kind } from './kinds'

// The three rules that move a thing between the street, the hole and its
// breath, with no places in them. `Play` uses them for every such move, and
// rules.test.ts walks them through every state a street can reach.

/** The hole takes a thing or a stack when its mouth, as wide as what is inside makes it, is wider than the bottom thing. */
export function takes(belly: readonly Kind[], parts: readonly Kind[]): boolean {
  return parts.length > 0 && fits(footOf(parts), mouthOf(belly))
}

/** A stack goes in whole, bottom first: its top thing is then the last in, and the next out. */
export function swallowed(belly: readonly Kind[], parts: readonly Kind[]): Kind[] {
  return [...belly, ...parts]
}

/** A burp gives back the last thing in, and it comes up underneath whatever rides already. Null from an empty hole. */
export function burped(belly: readonly Kind[], breath: readonly Kind[]): { belly: Kind[]; breath: Kind[] } | null {
  if (belly.length === 0) return null
  return { belly: belly.slice(0, -1), breath: [belly[belly.length - 1], ...breath] }
}
