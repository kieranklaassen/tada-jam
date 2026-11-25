import { describe, expect, it } from 'vitest'
import { IDS } from './layout'
import { newPose, poseOf } from './motion'
import { Hand } from './testing'
import type { React } from './village'

const REACTS: (React | null)[] = [null, 'sneeze', 'stop', 'land', 'splash', 'meet', 'poke', 'fly', 'go']
const MODES = ['rest', 'slide', 'air', 'hop', 'ride', 'held'] as const
const SIGHT = { asks: false, right: 0, up: 0 }

describe('how they move', () => {
  it('is shared by no two of them', () => {
    const h = new Hand()
    for (const mode of MODES) for (const name of REACTS) {
      const seen = IDS.map((id) => {
        const b = { ...h.v.bodies[id], mode, v: 4, on: null, react: name ? { name, t: 0.15 } : null, sneeze: name === 'sneeze' ? 0.3 : 0 }
        return JSON.stringify([0.3, 0.9, 1.7].map((t) => ({ ...poseOf(b, t, SIGHT, newPose()) })))
      })
      expect(new Set(seen).size, `${mode} ${name}`).toBe(IDS.length)
    }
  })
  it('is never out of bounds', () => {
    const h = new Hand()
    for (const id of IDS) for (const mode of MODES) for (const name of REACTS) for (let t = 0; t < 3; t += 0.07) {
      const b = { ...h.v.bodies[id], mode, v: 6, react: name ? { name, t } : null, sneeze: name === 'sneeze' && t < 0.75 ? t : 0 }
      const p = poseOf(b, t * 3, SIGHT, newPose())
      for (const [k, n] of Object.entries(p)) { expect(Number.isFinite(n), `${id} ${k}`).toBe(true) }
      expect(p.up).toBeGreaterThan(-1.2); expect(p.up).toBeLessThan(1.8)
      expect(p.tall).toBeGreaterThan(0.5); expect(p.tall).toBeLessThan(1.5)
      expect(Math.abs(p.nod)).toBeLessThan(1.2)
    }
  })
})
