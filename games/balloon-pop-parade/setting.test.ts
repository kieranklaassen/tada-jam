import { describe, expect, it } from 'vitest'
import { BALLOON, FAR_HILL, GROWN_UP_CORNER, PARADE_RING, SKY_ROW, viewFor } from './layout'
import { KIND_COLOURS, luminance, PALETTE, rgb, SETTING_COLOURS } from './palette'
import { BALL, HUT, KEEPER, POOL, SETTING, seenBox, TOYS, WHALE_SCALE } from './setting'
import { BODIES } from './bodies'

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

  it('keeps the whale and the keeper below the friends in contrast: hazed, smaller than any friend, and printed in a softer ink', () => {
    for (const toy of [TOYS.whale, TOYS.keeper]) {
      expect(toy.haze).toBeGreaterThanOrEqual(0.2)
      expect(toy.face.ink).toBe(PALETTE.softInk)
      for (const body of Object.values(BODIES)) expect(toy.face.eyeSize * (toy === TOYS.whale ? WHALE_SCALE : 1)).toBeLessThan(body.face.eyeSize * 0.75)
    }
    expect(luminance(PALETTE.softInk)).toBeGreaterThan(luminance(PALETTE.ink) * 4)
    // The whale is narrower than the narrowest friend in front.
    const wide = Math.max(...TOYS.whale.pillows.map((part) => Math.abs(part.at[0]) + part.size[0])) * WHALE_SCALE
    expect(wide).toBeLessThan(Math.min(...Object.values(BODIES).map((body) => body.halfWidth)) * 1.28)
  })

  it('draws the ball plainly as a ball: striped in three pale colours with white between, a button at each pole, and round where a balloon is not', () => {
    const [skin, ...buttons] = TOYS.ball.pillows
    expect(skin.stripes).toHaveLength(6)
    expect(new Set(skin.stripes).size).toBe(4)
    // Every second panel is the white between the colours.
    for (const k of [0, 2, 4]) expect(skin.stripes![k]).toBe(skin.stripes![0])
    expect(skin.panels).toBe(skin.stripes!.length)
    expect(buttons).toHaveLength(2)
    expect(buttons[0].at.map((v) => -v)).toEqual(buttons[1].at)
    // It is as tall as it is wide, and seen where it lies, in front, it is wider than a balloon of the row.
    expect(new Set(skin.size).size).toBe(1)
    const seen = BALL.radius * IPAD.distance / (IPAD.distance - BALL.z)
    expect(seen).toBeGreaterThan(BALLOON * IPAD.balloon * 1.05)
  })

  it('hangs the leaves of a palm from a bud, each bent in two: no leaf crosses another, and none is a bar through the middle', () => {
    const leaves = SETTING.filter((part) => part.colour === SETTING_COLOURS.leaf && part.turn !== undefined)
    // Two palms, five leaves each, two pieces a leaf.
    expect(leaves).toHaveLength(20)
    type Point = { x: number; y: number }
    const ends = (part: typeof leaves[number]): [Point, Point] => {
      const angle = part.turn![2], reach = part.size[0]
      return [{ x: part.at[0] - Math.cos(angle) * reach, y: part.at[1] - Math.sin(angle) * reach }, { x: part.at[0] + Math.cos(angle) * reach, y: part.at[1] + Math.sin(angle) * reach }]
    }
    const side = (a: Point, b: Point, c: Point) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x))
    const cross = (p: [Point, Point], q: [Point, Point]) => side(p[0], p[1], q[0]) !== side(p[0], p[1], q[1]) && side(q[0], q[1], p[0]) !== side(q[0], q[1], p[1])
    for (const palm of [leaves.slice(0, 10), leaves.slice(10)]) {
      for (let a = 0; a < palm.length; a++) for (let b = a + 1; b < palm.length; b++) {
        // The two pieces of one leaf meet end to end; no other two touch.
        if (Math.floor(a / 2) === Math.floor(b / 2)) continue
        expect(cross(ends(palm[a]), ends(palm[b])), `pieces ${a} and ${b}`).toBe(false)
      }
      // Each leaf bends: its second piece is turned from its first by a good way, and no two leaves leave the bud opposite each other in one line.
      for (let leaf = 0; leaf < 5; leaf++) expect(Math.abs(palm[leaf * 2].turn![2] - palm[leaf * 2 + 1].turn![2])).toBeGreaterThan(0.5)
      for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) expect(Math.abs(Math.abs(palm[a * 2].turn![2] - palm[b * 2].turn![2]) - Math.PI), `leaves ${a} and ${b}`).toBeGreaterThan(0.12)
    }
  })
})
