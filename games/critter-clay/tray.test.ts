import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { TRAY, TRAY_SLOT_RISE } from './layout'
import { PART_KINDS, type PartKind } from './parts'
import { displayBase, Rig } from './rig'
import { buildPartShapes } from './view/shapes'

// Parts in the tray rest on their slot's clay disc: the lowest point of each
// drawn shape touches it, and hopping, squashing, or growing back never dips
// a part into it.

const shapes = buildPartShapes()
const SLOT = TRAY.height + TRAY_SLOT_RISE
const v = new THREE.Vector3()

function lowest(kind: PartKind, matrix: THREE.Matrix4): number {
  const position = shapes[kind].attributes.position
  let min = Infinity
  for (let i = 0; i < position.count; i++) min = Math.min(min, v.fromBufferAttribute(position, i).applyMatrix4(matrix).y)
  return min
}

function trayMatrix(rig: Rig, kind: PartKind, grow: number, hop: number, squash: number): THREE.Matrix4 {
  rig.begin()
  rig.trayPart(kind, 0, grow, hop, squash, 0)
  return new THREE.Matrix4().fromArray(rig.batches[kind].matrices, 0)
}

describe('parts in the tray', () => {
  it.each(PART_KINDS)('a %s rests on its slot, neither sunk into it nor floating', (kind) => {
    const bottom = lowest(kind, trayMatrix(new Rig(), kind, 1, 0, 0))
    expect(bottom).toBeGreaterThanOrEqual(SLOT)
    expect(bottom).toBeLessThan(SLOT + 0.05)
  })

  it.each(PART_KINDS)('a %s growing back, hopping, or squashed never dips into its slot', (kind) => {
    const rig = new Rig()
    for (const grow of [0.05, 0.3, 0.7, 1, 1.1, 1.2])
      for (const squash of [-0.3, -0.1, 0, 0.12, 0.3])
        for (const hop of [0, 0.4, 3.2]) expect(lowest(kind, trayMatrix(rig, kind, grow, hop, squash))).toBeGreaterThanOrEqual(SLOT - 1e-4)
  })

  it('the hit test, glows, and flights home aim at the same rest height the tray draws', () => {
    const rig = new Rig()
    for (const kind of PART_KINDS) expect(new THREE.Vector3().setFromMatrixPosition(trayMatrix(rig, kind, 1, 0, 0)).y).toBeCloseTo(TRAY.height + displayBase(kind), 5)
  })
})
