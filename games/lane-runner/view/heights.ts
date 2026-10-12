// The heights of the layers of the board, in pegs: what lies, and what
// stands on what lies. No two layers share a height, so nothing that lies
// flickers against what it lies on, and nothing that stands reaches down
// into what lies.

/** Everything that stands is on top of the beads that lie: this far above the board. */
export const STAND = 0.5
/** What lies flat, from the board up: the trail, what is laid on it, what a slop leaves on that, the soft darks, the idle light. A figure's own flat parts lie between 0.3 and STAND. */
export const LIES = { trail: 0.1, laid: 0.2, puddle: 0.25, shade: 0.28, light: 0.47 } as const
