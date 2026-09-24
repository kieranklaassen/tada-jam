// Crossed Wires: a courtyard where beetles trundle over pressure plates and the
// child drags wires from plates and gates to lamps and a drawbridge. Pure and
// Node-importable: no DOM, no Vite globals.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'crossed-wires',
  name: 'Crossed Wires',
  verb: 'wire',
  engine: 'combination',
  lens: 'other',
  ageBand: [10, 12],
  // `stamps` is a small collection: the first time the courtyard shows a
  // flicker, a steady blink, a beat, or a traveler crossing, a stamp is added.
  // It changes no affordance and no circuit; the panel measures whether it
  // pulls the child back. Removing it leaves the sandbox untouched.
  hooks: ['stamps'],
  features: [
    { name: 'wires' },
    { name: 'gates' },
    { name: 'kinds' },
    { name: 'lit' },
    { name: 'loops' },
    // More sinks doing a flicker, a blink, or a beat is what the loop is for.
    { name: 'blinking', objective: 'up' },
    // Travelers get across only when the wiring holds the bridge down long enough.
    { name: 'crossings', objective: 'up' },
  ],
  // The signature is the set of behaviour classes present across the four sinks
  // (lit, slow, buzz, blink, beat): 2^5 - 1 = 31 non-empty sets, plus `dark`
  // when nothing is going on.
  signatureBound: 32,
  hookAblation: { supported: true },
}
