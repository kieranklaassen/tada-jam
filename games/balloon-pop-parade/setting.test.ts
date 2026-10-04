import { describe, expect, it } from 'vitest'
import { BALLOON, FAR_HILL, GROWN_UP_CORNER, PARADE_RING, SKY_ROW, viewFor } from './layout'
import { KIND_COLOURS, luminance, rgb, SETTING_COLOURS } from './palette'
import { BALL, HUT, KEEPER, POOL, SETTING, seenBox, TOYS } from './setting'

// The setting is painted once and takes no part in the task. What it must not
// do is held here: stand behind the balloons, look like a balloon, stand where
// a friend walks, or cost more than one draw.

const IPAD = viewFor(1180, 820)
const saturation = (hex: string) => { const [r, g, b] = rgb(hex); return (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b) }

describe('the setting', () => {
  it('leaves bare sky behind the row of balloons: nothing of it stands as high as the lowest balloon of the row', () => {
    const under = SKY_ROW - BALLOON * 1.3
    for (const pillow of SETTING) expect(seenBox(pillow).top, `the pillow at ${pillow.at.join(', ')}`).toBeLessThan(under)
  })

  it('keeps out of the grown-up\'s corner', () => {
    const corner = GROWN_UP_CORNER / IPAD.pixelsPerUnit
    for (const pillow of SETTING) {
      const box = seenBox(pillow)
      expect(box.right > IPAD.width / 2 - corner && box.top > IPAD.height / 2 - corner, `the pillow at ${pillow.at.join(', ')}`).toBe(false)
    }
  })

  it('is paler than anything the child sorts by: every colour of it is lighter than every balloon but the duck\'s, and far less saturated than any', () => {
    const balloons = Object.values(KIND_COLOURS), dullest = Math.min(...balloons.map(saturation))
    for (const [name, colour] of Object.entries(SETTING_COLOURS)) {
      expect(saturation(colour), name).toBeLessThan(dullest - 0.2)
      for (const kind of ['frog', 'hippo', 'crab'] as const) expect(luminance(colour), `${name} against the ${kind}'s`).toBeGreaterThan(luminance(KIND_COLOURS[kind]) + 0.1)
    }
  })

  it('stands well behind the friends or well in front of them, so that nobody walks through it', () => {
    for (const pillow of SETTING) {
      const front = pillow.at[2] + pillow.size[2], back = pillow.at[2] - pillow.size[2]
      expect(back > 1.4 || front < -9, `the pillow at ${pillow.at.join(', ')}`).toBe(true)
    }
    // The pool and the ball are in front of the feet and off to the sides, clear of a troop of three in the middle.
    expect(POOL.z - POOL.radius).toBeGreaterThan(1.4)
    expect(POOL.x - POOL.radius).toBeGreaterThan(3.4)
    expect(BALL.z - BALL.radius).toBeGreaterThan(1.4)
  })

  it('is one mesh of a modest number of pillows, most of them small', () => {
    expect(SETTING.length).toBeLessThan(130)
    expect(SETTING.filter((pillow) => pillow.detail === undefined).length).toBe(0)
  })

  it('puts the hut and its keeper inside the ring the parade walks, so the troops go round them', () => {
    for (const at of [HUT, KEEPER]) {
      const dx = (at.x - FAR_HILL.x) / PARADE_RING.x, dz = (at.z - FAR_HILL.z - PARADE_RING.forward) / PARADE_RING.z
      expect(Math.hypot(dx, dz)).toBeLessThan(0.6)
    }
  })

  it('has three toys that live in it, each one mesh: the whale and the keeper with eyes, the ball with none', () => {
    expect(Object.keys(TOYS).sort()).toEqual(['ball', 'keeper', 'whale'])
    expect(TOYS.whale.face.eyeSize).toBeGreaterThan(0)
    expect(TOYS.keeper.face.eyeSize).toBeGreaterThan(0)
    expect(TOYS.ball.face.eyeSize).toBe(0)
    for (const toy of Object.values(TOYS)) expect(toy.pillows.length).toBeGreaterThan(0)
  })
})
