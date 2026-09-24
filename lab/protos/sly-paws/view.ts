// The view: flat shapes from the snapshot, nothing else. Words and numbers are
// allowed in the lab, so it says plainly what to do and keeps a short record of
// the last rounds, which is how the creature's habits get worked out.

import { circle, clear, label, rect, roundRect } from '../../kit/draw.ts'
import { CREATURE_PAWS, MY_PAWS, PAW_R } from './sim.ts'
import type { Paw, SlySnapshot } from './sim.ts'

const SIDE = ['left', 'right'] as const
const INK = '#2b2620'

function paw(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, fill: string, ring: boolean) {
  circle(ctx, p.x, p.y, PAW_R, { fill, stroke: ring ? INK : '#8a7f6a', width: ring ? 8 : 4 })
}

function pebble(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, color: string) {
  circle(ctx, p.x, p.y, 26, { fill: color, stroke: INK, width: 3 })
}

export function draw(ctx: CanvasRenderingContext2D, s: SlySnapshot): void {
  clear(ctx, '#f6f0e4')

  // The creature: a flat body and two eyes above its paws.
  circle(ctx, 590, 190, 105, { fill: s.creature.color })
  circle(ctx, 555, 170, 14, '#fff')
  circle(ctx, 625, 170, 14, '#fff')
  label(ctx, s.creature.name, 590, 330, { align: 'center', size: 34 })
  label(ctx, 'its paws: where did it hide?', 590, 500, { align: 'center', size: 22, color: '#8a7f6a' })
  label(ctx, 'your paws: where do you hide?', 590, 760, { align: 'center', size: 22, color: '#8a7f6a' })

  const r = s.reveal
  for (const i of [0, 1] as Paw[]) {
    paw(ctx, CREATURE_PAWS[i], '#e4dccb', s.myGuess === i || r?.mG === i)
    paw(ctx, MY_PAWS[i], '#dbe8d5', s.myHide === i || r?.mH === i)
    label(ctx, SIDE[i], CREATURE_PAWS[i].x, CREATURE_PAWS[i].y + PAW_R + 26, { align: 'center', size: 20, color: '#8a7f6a' })
  }
  if (r) {
    // Its pebble where it hid, its eyes on the paw it guessed, my pebble where I hid.
    pebble(ctx, CREATURE_PAWS[r.cH], s.creature.color)
    pebble(ctx, MY_PAWS[r.mH], '#3fa66b')
    label(ctx, 'you looked', CREATURE_PAWS[r.mG].x, CREATURE_PAWS[r.mG].y - PAW_R - 12, { align: 'center', size: 20 })
    label(ctx, 'it looked', MY_PAWS[r.cG].x, MY_PAWS[r.cG].y - PAW_R - 12, { align: 'center', size: 20 })
    const line =
      r.outcome === 'sly' ? 'Sly! It read you and missed.' : r.outcome === 'won' ? 'You found it.' : r.outcome === 'lost' ? 'It found you.' : r.outcome === 'both' ? 'Both found.' : 'Neither found.'
    label(ctx, line, 590, 60, { align: 'center', size: 40, color: r.outcome === 'lost' ? '#b3402e' : '#2f7d4f' })
  } else {
    const need = s.myHide === null && s.myGuess === null ? 'Tap one of your paws to hide, then one of its paws to guess.' : s.myHide === null ? 'Now tap one of your paws to hide your pebble.' : 'Now tap one of its paws to guess.'
    label(ctx, need, 590, 60, { align: 'center', size: 28 })
  }

  // What each round showed, newest at the bottom.
  rect(ctx, 880, 90, 280, 320, { fill: '#efe7d6', stroke: '#c9bfa8', width: 3 })
  label(ctx, 'last rounds', 900, 122, { size: 22, color: '#8a7f6a' })
  s.history.forEach((h, i) => {
    const y = 158 + i * 42
    const mark = h.dodge ? 'sly' : h.found ? 'found' : h.caught ? 'caught' : '-'
    label(ctx, `you ${SIDE[h.mH][0]}/${SIDE[h.mG][0]}  it ${SIDE[h.cH][0]}/${SIDE[h.cG][0]}  ${mark}`, 900, y, { size: 22 })
  })
  label(ctx, 'hid/looked', 900, 396, { size: 18, color: '#8a7f6a' })

  if (s.score) label(ctx, `you ${s.score.me}  it ${s.score.it}  (first to ${s.score.to})`, 40, 60, { size: 30 })
  if (s.crowUnlocked) label(ctx, 'the Crow has heard of you', 40, 100, { size: 22, color: '#8a7f6a' })

  if (s.hint) {
    const phase = (s.tick % 30) / 30
    roundRect(ctx, s.hint.x - 100, s.hint.y - 100, 200, 200, 100, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }
}
