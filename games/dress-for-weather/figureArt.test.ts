import { describe, expect, it } from 'vitest'
import { FACES, type Face } from './answers'
import { CHILD_EAR, PUFFED, drawFace } from './figureArt'
import type { Wearer } from './kinds'
import type { Pen } from './paper'

// The faces are drawn fresh every frame on each figure's own features. A pen
// that draws nothing remembers every round patch it was asked for, so what a
// face shows can be held without a screen.

type Patch = { x: number; y: number; rx: number; ry: number }

function patchesOf(who: Wearer, face: Face): { patches: Patch[]; calls: number; drawn: number } {
  const patches: Patch[] = []
  let drawn = 0
  const pen = new Proxy({}, {
    get: (_, name) => {
      if (name === 'ellipse') return (x: number, y: number, rx: number, ry: number) => { patches.push({ x, y, rx, ry }) }
      if (name === 'fill' || name === 'stroke') return () => { drawn += 1 }
      return () => {}
    },
    set: () => true,
  }) as unknown as Pen
  const calls = drawFace(pen, who, face, 0, 0, false)
  return { patches, calls, drawn }
}

const atEar = (patch: Patch): boolean => Math.abs(Math.abs(patch.x) - CHILD_EAR.x) < 1 && Math.abs(patch.y - CHILD_EAR.y) < 1

describe('the faces', () => {
  it('has the child red to the ears and puffed in the cheeks when it huffs, and nobody else red at the ears', () => {
    const hot = patchesOf('child', 'huff').patches, pleased = patchesOf('child', 'cosy').patches
    const cheekIn = (patches: Patch[], like: Patch): Patch | undefined => patches.find((patch) => patch.x === like.x && patch.y === like.y)
    // Pleased, it is red in two cheeks and nowhere else.
    expect(pleased.length).toBe(2)
    expect(pleased.filter(atEar).length).toBe(0)
    // Too hot, it is red at both ears, each patch the size of the ear the paper is cut round.
    const ears = hot.filter(atEar)
    expect(ears.map((ear) => Math.sign(ear.x)).sort()).toEqual([-1, 1])
    for (const ear of ears) expect([ear.rx, ear.ry]).toEqual([CHILD_EAR.rx, CHILD_EAR.ry])
    // The cheeks are where they always are, and bigger.
    for (const like of pleased) {
      const cheek = cheekIn(hot, like)
      expect(cheek).toBeDefined()
      expect(cheek!.rx).toBeCloseTo(like.rx * PUFFED)
      expect(cheek!.ry).toBeCloseTo(like.ry * PUFFED)
    }
    expect(PUFFED).toBeGreaterThan(1.2)
    for (const who of ['grandfather', 'baby'] as const) {
      const huff = patchesOf(who, 'huff').patches
      for (const like of patchesOf(who, 'cosy').patches) expect(cheekIn(huff, like)!.rx, who).toBeCloseTo(like.rx * PUFFED)
      expect(huff.length - patchesOf('child', 'huff').patches.length, who).toBe(-2)
    }
    expect(patchesOf('dog', 'huff').patches.filter(atEar).length).toBe(0)
  })

  it('reports the draw count it made, for every face of everyone, and the red costs no more on the child than on the others', () => {
    for (const who of ['child', 'grandfather', 'baby', 'dog'] as const) for (const face of FACES) {
      const { calls, drawn } = patchesOf(who, face)
      expect(calls, `${who} ${face}`).toBe(drawn)
    }
    expect(patchesOf('child', 'huff').calls).toBe(patchesOf('baby', 'huff').calls)
  })
})
