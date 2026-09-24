// The view: flat coloured cells and plain text from the snapshot, nothing else.
// It holds no state, so the same snapshot always draws the same picture.

import { circle, clear, label, rect, roundRect } from '../../kit/draw.ts'
import { CELL } from './sim.ts'
import type { SpotSnapshot } from './sim.ts'

const SKIN: Record<string, string> = { b: '#ecdcb6', t: '#e2cf9f', l: '#d8c393' }
const DYE = '#3a2a1e'
const WET = '#3b6fd6'

const STATUS: Record<SpotSnapshot['phase'], string> = {
  blank: 'tap to drop dye, drag to lay a row of drops',
  wet: 'the dye waits - press GO when the plan is ready',
  flowing: 'the dye is running...',
  settled: 'settled - add more dye and press GO, or wash',
}

export function draw(ctx: CanvasRenderingContext2D, snapshot: SpotSnapshot): void {
  clear(ctx, '#f6f1e7')

  // The animal, one flat run of same-coloured cells at a time.
  for (let y = 0; y < snapshot.dye.length; y++) {
    const dye = snapshot.dye[y]!
    const skin = snapshot.layout[y]!
    let x = 0
    while (x < dye.length) {
      const colour = dye[x] === '#' ? DYE : dye[x] === 'o' ? WET : dye[x] === '.' ? SKIN[skin[x]!] : undefined
      let end = x + 1
      const colourAt = (i: number) => (dye[i] === '#' ? DYE : dye[i] === 'o' ? WET : dye[i] === '.' ? SKIN[skin[i]!] : undefined)
      while (end < dye.length && colourAt(end) === colour) end++
      if (colour) rect(ctx, x * CELL, y * CELL, (end - x) * CELL, CELL, colour)
      x = end
    }
  }

  const { go, wash } = snapshot
  const goReady = snapshot.phase === 'wet'
  roundRect(ctx, go.x, go.y, go.w, go.h, 28, { fill: goReady ? '#86d19c' : '#cfe5d5', stroke: '#4a7d5a', width: 4 })
  label(ctx, 'GO', go.x + go.w / 2, go.y + go.h / 2, { align: 'center', baseline: 'middle', size: 44, color: '#2d5a3c' })
  roundRect(ctx, wash.x, wash.y, wash.w, wash.h, 28, { fill: '#dde3ea', stroke: '#6b7787', width: 4 })
  label(ctx, 'wash', wash.x + wash.w / 2, wash.y + wash.h / 2, { align: 'center', baseline: 'middle', size: 34, color: '#46505e' })

  label(ctx, STATUS[snapshot.phase], 40, 56, { size: 30 })
  const { body, tail, legs } = snapshot.coats
  label(ctx, `body: ${body}    tail: ${tail}    legs: ${legs}`, 590, 760, { align: 'center', size: 30, color: '#5d5443' })

  if (snapshot.hint) {
    // A ring that grows and fades on the tick clock, not a wall clock.
    const phase = (snapshot.tick % 30) / 30
    circle(ctx, snapshot.hint.x, snapshot.hint.y, 50 + phase * 40, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }
}
