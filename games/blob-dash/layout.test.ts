import { describe, expect, it } from 'vitest'
import { BEATS } from './beat'
import { BEAT_LENGTH, CAMERA, CAST, CORNER_PX, DIAL, HOME, HOME_CLEAR, LEDGE, PIECE, RACK, RELEASE, RING, SLOTS, STAGE_BOX, SURFACES, WALL, WINDOW, ahead, angleAt, castAt, boxOf, offPiece, standsIn, cornerOn, frame, homeOn, onCamera, onDial, onRelease, onTrack, pieceUnder, polar, rackAt, rackBox, rackFoot, rackPoint, slotAt, slotOf, slotPoint, uprightOn, type Box } from './layout'
import { KINDS, type Kind } from './pieces'
import { fit, toStage } from './stage'

/** Every place a piece can stand, holding one kind. */
const FULL = (kind: Kind): [number, Kind][] => SLOTS.map((slot) => [slot, kind])
const far = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
const fromRing = (p: { x: number; y: number }) => far(p, RING)
/** How far a point is from a box: 0 inside it. */
const toBox = (p: { x: number; y: number }, box: Box) => Math.hypot(Math.max(box.x - p.x, 0, p.x - box.x - box.w), Math.max(box.y - p.y, 0, p.y - box.y - box.h))
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
/** The box in which a finger takes the piece in a place of the rack: the piece as drawn, and the reach round it. */
const rackReach = (i: number): Box => {
  const box = rackBox(i)
  return { x: box.x - RACK.reach, y: box.y - RACK.reach, w: box.w + RACK.reach * 2, h: box.h + RACK.reach * 2 }
}
const corners = (box: Box) => [{ x: box.x, y: box.y }, { x: box.x + box.w, y: box.y }, { x: box.x, y: box.y + box.h }, { x: box.x + box.w, y: box.y + box.h }]
/** How far the piece standing in a slot reaches from its middle, as drawn. */
const PIECE_R = Math.hypot(PIECE.width / 2, PIECE.height / 2)

/** Everything a finger must be able to reach, as discs: the grip along its whole travel, the dial, the rack, and every beat of both surfaces. */
function reachables(): { name: string; x: number; y: number; r: number }[] {
  return [
    { name: 'grip at rest', x: RELEASE.x, y: RELEASE.rest, r: RELEASE.r },
    { name: 'grip pulled', x: RELEASE.x, y: RELEASE.rest + RELEASE.travel, r: RELEASE.r },
    { name: 'dial', x: DIAL.x, y: DIAL.y, r: DIAL.r },
    ...Array.from({ length: RACK.slots }, (_, i) => { const box = rackBox(i); return { name: `rack ${i}`, x: box.x + box.w / 2, y: box.y + box.h / 2, r: Math.max(box.w, box.h) / 2 } }),
    ...SLOTS.map((slot) => ({ name: `slot ${slot}`, ...slotPoint(slot), r: PIECE_R })),
  ]
}

describe('the course', () => {
  it('starts at the bottom and runs anticlockwise, so the blob goes left to right along the bottom the right way up', () => {
    expect(onTrack(0, 0, false)).toEqual({ x: RING.x, y: RING.y + RING.floor })
    expect(onTrack(4, 0, false).x).toBeCloseTo(RING.x + RING.floor, 6)
    expect(onTrack(8, 0, false).y).toBeCloseTo(RING.y - RING.floor, 6)
    expect(onTrack(1, 0, false).x).toBeGreaterThan(RING.x)
    expect(uprightOn(0, false)).toBeCloseTo(0, 6)
    expect(angleAt(16)).toBeCloseTo(angleAt(0) - Math.PI * 2, 9)
  })

  it('has its ceiling on the rim of the niche, with the head of whatever stands there towards the floor', () => {
    expect(fromRing(onTrack(3, 0, true))).toBeCloseTo(RING.hub, 6)
    expect(fromRing(onTrack(3, 20, true))).toBeCloseTo(RING.hub + 20, 6)
    expect(fromRing(onTrack(3, 20, false))).toBeCloseTo(RING.floor - 20, 6)
    expect(Math.abs(uprightOn(0, true))).toBeCloseTo(Math.PI, 6)
  })

  it('says where round the lap any point of the wall is', () => {
    for (const beats of [0, 0.5, 3, 7.25, 12, 15.75]) {
      const at = polar(onTrack(beats, 30, false))
      expect(at.beats).toBeCloseTo(beats, 6)
      expect(at.r).toBeCloseTo(RING.floor - 30, 6)
    }
  })
})

describe('the twenty-four places a piece can stand', () => {
  it('are every beat of the floor and every second beat of the ceiling', () => {
    expect(SLOTS).toHaveLength(BEATS + BEATS / 2)
    for (let beat = 0; beat < BEATS; beat++) {
      expect(standsIn(slotOf(beat, false))).toBe(true)
      expect(standsIn(slotOf(beat, true))).toBe(beat % 2 === 0)
    }
    expect(standsIn(-1)).toBe(false)
    expect(standsIn(BEATS * 2)).toBe(false)
    expect(standsIn(2.5)).toBe(false)
  })

  it('are found again from the point a piece stands on, and a finger on the piece finds the piece', () => {
    for (const slot of SLOTS) {
      expect(slotAt(slotPoint(slot)), `slot ${slot}`).toBe(slot)
      expect(pieceUnder(slotPoint(slot), FULL('drum'))).toBe(slot)
      expect(pieceUnder(slotPoint(slot), [[slot, 'drum']])).toBe(slot)
    }
    expect(slotOf(3, false)).toBe(3)
    expect(slotOf(3, true)).toBe(19)
    expect(slotOf(19, false)).toBe(3)
  })

  it('take a piece let go anywhere on the course for the nearest place, on the surface it is nearer', () => {
    expect(slotAt(onTrack(5.3, 5, false))).toBe(5)
    expect(slotAt(onTrack(5.6, 60, false))).toBe(6)
    // On the ceiling the nearest place is the nearest even beat.
    expect(slotAt(onTrack(5.3, 40, true))).toBe(22)
    expect(slotAt(onTrack(4.9, 40, true))).toBe(20)
    expect(slotAt(onTrack(15.2, 20, true))).toBe(16)
    expect(slotAt(onTrack(15.7, 10, false))).toBe(0)
    for (let beats = 0; beats < BEATS; beats += 0.25) expect(standsIn(slotAt(onTrack(beats, 30, true))!), `${beats}`).toBe(true)
    // A little outside the line still counts; the bare wall, the niche and the rack do not.
    expect(slotAt(onTrack(5, -30, false))).toBe(5)
    expect(slotAt(onTrack(5, -80, false))).toBeNull()
    expect(slotAt({ x: RING.x, y: RING.y })).toBeNull()
    for (let i = 0; i < RACK.slots; i++) expect(slotAt(rackPoint(i)), `rack ${i}`).toBeNull()
  })

  it('give way to the rack where their margin reaches its pieces: where a finger takes a piece of the rack, a piece let go is no slot', () => {
    let reached = 0
    for (let x = RACK.first - 80; x <= RACK.first + (RACK.slots - 1) * RACK.pitch + 80; x += 3) for (let y = RACK.y - 100; y <= RACK.y + 20; y += 2) {
      const at = { x, y }
      if (rackAt(at) === null) continue
      expect(slotAt(at), `${x}, ${y}`).toBeNull()
      // The margin does reach there: without the rack this point would be a beat at the foot of the ring.
      if (fromRing(at) <= RING.floor + RING.line + 30) reached += 1
    }
    expect(reached).toBeGreaterThan(50)
    // The ring's own line at its foot is still the track, and so is a finger's width inside it.
    for (let beats = -1; beats <= 1; beats += 0.125) for (const lift of [-RING.line, -RING.line / 2, 0, 20, 60]) expect(slotAt(onTrack(beats, lift, false)), `${beats}, ${lift}`).toBe(slotOf(Math.round(beats), false))
  })

  it('stand clear of each other: no piece as drawn reaches into the next, on either surface or across the course', () => {
    for (const a of SLOTS) for (const b of SLOTS) if (a < b) expect(far(slotPoint(a), slotPoint(b)), `${a} and ${b}`).toBeGreaterThan(PIECE.width)
    // A wall's stub stands ahead of its beat: on the ceiling it ends before the next place's piece begins.
    expect(boxOf('wall').to).toBeLessThan(BEAT_LENGTH.ceiling * 2 - PIECE.width / 2)
    expect(pieceUnder({ x: 60, y: 60 }, FULL('drum'))).toBeNull()
  })
})

describe('a piece under a finger', () => {
  /** The sizes the touch is held at: a tablet lying, a smaller one, and a tablet standing. */
  const SIZES = [[1180, 820], [1024, 768], [820, 1180]] as const
  const CEILING = SLOTS.filter((slot) => slot >= BEATS)
  /** A point in a slot's own frame. */
  const inSlot = (slot: number, along: number, lift: number) => ahead(slot % BEATS, along, lift, slot >= BEATS)
  /** How many stage units of a line through a piece take that piece, with every place full. */
  const taken = (slot: number, pieces: [number, Kind][], point: (t: number) => { x: number; y: number }) => {
    let units = 0
    for (let t = -120; t <= 120; t += 0.5) if (pieceUnder(point(t), pieces) === slot) units += 0.5
    return units
  }

  it('is touched at 48 px or more on the ceiling at each size, along the rim and across it, with every place full', () => {
    for (const kind of KINDS) {
      const pieces = FULL(kind), part = boxOf(kind), mid = (part.from + part.to) / 2
      for (const slot of CEILING) {
        const along = taken(slot, pieces, (t) => inSlot(slot, mid + t, part.top / 2)), across = taken(slot, pieces, (t) => inSlot(slot, mid, part.top / 2 + t))
        for (const [width, height] of SIZES) {
          const scale = fit(width, height).scale
          expect(along * scale, `${kind} in ${slot} along, at ${width}x${height}`).toBeGreaterThanOrEqual(48)
          expect(across * scale, `${kind} in ${slot} across, at ${width}x${height}`).toBeGreaterThanOrEqual(48)
        }
      }
    }
  })

  it('is touched at 48 px or more on the floor too, at each size', () => {
    for (const kind of KINDS) {
      const pieces = FULL(kind), part = boxOf(kind), mid = (part.from + part.to) / 2
      const along = taken(5, pieces, (t) => inSlot(5, mid + t, part.top / 2)), across = taken(5, pieces, (t) => inSlot(5, mid, part.top / 2 + t))
      for (const [width, height] of SIZES) expect(Math.min(along, across) * fit(width, height).scale, `${kind} at ${width}x${height}`).toBeGreaterThanOrEqual(48)
    }
  })

  it('never lifts the neighbour: a finger anywhere on a piece as drawn takes that piece, whatever stands beside it', () => {
    for (const kind of KINDS) for (const beside of KINDS) for (const [slot, next] of [[slotOf(4, true), slotOf(6, true)], [slotOf(14, true), slotOf(0, true)], [5, 6]] as const) {
      const pieces: [number, Kind][] = [[slot, kind], [next, beside]]
      for (const [own, what] of [[slot, kind], [next, beside]] as const) for (const part of [boxOf(what)]) {
        const wrong: string[] = []
        for (let along = part.from; along <= part.to; along += 1) for (let lift = 0; lift <= part.top; lift += 1) {
          if (pieceUnder(inSlot(own, along, lift), pieces) !== own) wrong.push(`${what} in ${own} beside ${own === slot ? beside : kind}, at ${along}, ${lift}`)
        }
        expect(wrong).toEqual([])
      }
    }
  })

  it('takes a wall by its stub or by the grit on its beat, and nothing from the bare line between two pieces that are out of reach', () => {
    expect(offPiece(inSlot(3, WALL.ahead, WALL.height / 2), 3, 'wall')).toBe(0)
    expect(offPiece(inSlot(3, 0, 2), 3, 'wall')).toBe(0)
    expect(offPiece(inSlot(3, 0, PIECE.height / 2), 3, 'drum')).toBe(0)
    expect(offPiece(inSlot(3, PIECE.width / 2 + 10, 0), 3, 'drum')).toBeCloseTo(10, 6)
    expect(pieceUnder(inSlot(3, BEAT_LENGTH.floor / 2, PIECE.height / 2), [[3, 'drum'], [4, 'drum']])).toBeNull()
  })
})

describe('what a finger must reach', () => {
  it('is all on the stage', () => {
    for (const thing of reachables()) {
      expect(thing.x - thing.r, thing.name).toBeGreaterThanOrEqual(0)
      expect(thing.x + thing.r, thing.name).toBeLessThanOrEqual(STAGE_BOX.w)
      expect(thing.y - thing.r, thing.name).toBeGreaterThanOrEqual(0)
      expect(thing.y + thing.r, thing.name).toBeLessThanOrEqual(STAGE_BOX.h)
    }
  })

  it('is never under the jam\'s home control, at any surface size', () => {
    for (const [width, height] of SURFACES) {
      const home = homeOn(width, height)
      for (const thing of reachables()) expect(toBox(thing, home), `${thing.name} at ${width}x${height}`).toBeGreaterThan(thing.r)
    }
  })

  it('sets the stage smaller and lower on a short wide surface, so the home control ends above the top of the track, and leaves a tablet as the plain fit has it', () => {
    for (const [width, height] of SURFACES) {
      const by = frame(width, height), plain = fit(width, height), home = homeOn(width, height)
      // The whole stage is on the surface, in its own shape, in the middle from side to side.
      expect(by.scale).toBeGreaterThan(0)
      expect(by.scale).toBeLessThanOrEqual(plain.scale)
      expect(by.x).toBeCloseTo((width - STAGE_BOX.w * by.scale) / 2, 6)
      expect(by.y).toBeGreaterThanOrEqual(-1e-9)
      expect(by.y + STAGE_BOX.h * by.scale).toBeLessThanOrEqual(height + 1e-9)
      // The control ends above everything a finger must reach.
      expect(home.y + home.h, `${width}x${height}`).toBeLessThanOrEqual(HOME_CLEAR + 1e-9)
      // Where the plain fit already clears it, nothing is changed.
      if ((HOME.top + HOME.size - plain.y) / plain.scale <= HOME_CLEAR) expect(by).toEqual(plain)
    }
    for (const [width, height] of [[1180, 820], [1024, 768], [1133, 744], [1366, 1024], [1400, 700], [760, 560], [820, 1180]]) expect(frame(width, height)).toEqual(fit(width, height))
    // The three short wide ones are the ones that need it: with the plain fit the control would lie on the top beat.
    for (const [width, height] of [[1000, 600], [844, 390], [568, 320]]) {
      const plain = fit(width, height), top = slotPoint(slotOf(8, false))
      expect(top.y - (HOME.top + HOME.size - plain.y) / plain.scale, `${width}x${height}`).toBeLessThan(PIECE_R)
      expect(frame(width, height).scale).toBeLessThan(plain.scale)
    }
    // A surface with no size, or too short to hold the control at all, draws nothing.
    for (const [width, height] of [[0, 0], [800, 0], [800, 40], [NaN, NaN]]) expect(frame(width, height)).toEqual({ scale: 0, x: 0, y: 0 })
  })

  it('is never in the grown-up\'s corner, at any surface size', () => {
    for (const [width, height] of SURFACES) {
      const corner = cornerOn(width, height)
      for (const thing of reachables()) expect(toBox(thing, corner), `${thing.name} at ${width}x${height}`).toBeGreaterThan(thing.r)
    }
  })

  it('places the home control and the corner where the jam draws them', () => {
    for (const [width, height] of SURFACES) {
      const by = frame(width, height), home = homeOn(width, height), corner = cornerOn(width, height)
      const centre = toStage({ x: width / 2, y: HOME.top + HOME.size / 2 }, by)
      expect(home.x + home.w / 2).toBeCloseTo(centre.x, 6)
      expect(home.y + home.h / 2).toBeCloseTo(centre.y, 6)
      expect(home.w * by.scale).toBeCloseTo(HOME.size, 6)
      const edge = toStage({ x: width, y: 0 }, by)
      expect(corner.x + corner.w).toBeCloseTo(edge.x, 6)
      expect(corner.y).toBeCloseTo(edge.y, 6)
      expect(corner.w * by.scale).toBeCloseTo(CORNER_PX, 6)
    }
  })

  it('is touched where it is drawn: the grip wherever it hangs, the dial, and each place of the rack', () => {
    expect(onRelease({ x: RELEASE.x, y: RELEASE.rest })).toBe(true)
    expect(onRelease({ x: RELEASE.x, y: RELEASE.rest }, RELEASE.travel)).toBe(false)
    expect(onRelease({ x: RELEASE.x, y: RELEASE.rest + RELEASE.travel }, RELEASE.travel)).toBe(true)
    expect(onRelease({ x: RELEASE.x + RELEASE.sway, y: RELEASE.rest }, 0, RELEASE.sway)).toBe(true)
    expect(onDial({ x: DIAL.x + DIAL.r, y: DIAL.y })).toBe(true)
    expect(onDial({ x: DIAL.x - DIAL.reach - 1, y: DIAL.y })).toBe(false)
    for (let i = 0; i < RACK.slots; i++) expect(rackAt(rackPoint(i))).toBe(i)
    expect(rackAt({ x: rackPoint(0).x - RACK.pitch / 2, y: RACK.y - 80 })).toBeNull()
    expect(RELEASE.reach * 2).toBeGreaterThanOrEqual(48)
  })

  it('takes a piece on the rack by any part of it as drawn, the wall\'s stub and grit included, at 48 px or more at each size', () => {
    for (let i = 0; i < RACK.slots; i++) {
      const box = rackBox(i), kind = KINDS[i], part = boxOf(kind), foot = rackFoot(i)
      // The box is the piece as it is drawn: the part it fills on the line, three tenths larger, on its foot on the plank.
      expect(box.x).toBeCloseTo(foot.x + part.from * RACK.scale, 9)
      expect(box.w).toBeCloseTo((part.to - part.from) * RACK.scale, 9)
      expect(box.y + box.h).toBe(RACK.y)
      // Its middle is the middle of its place, so the whole of it stands on the plank.
      expect(box.x + box.w / 2).toBeCloseTo(rackPoint(i).x, 9)
      expect(box.x).toBeGreaterThanOrEqual(RACK.first - RACK.over)
      expect(box.x + box.w).toBeLessThanOrEqual(RACK.first + (RACK.slots - 1) * RACK.pitch + RACK.over)
      // Every point of it takes it, and no other.
      for (let x = 0; x <= 1; x += 0.05) for (let y = 0; y <= 1; y += 0.1) expect(rackAt({ x: box.x + box.w * x, y: box.y + box.h * y }), `${kind} at ${x}, ${y}`).toBe(i)
      for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180]]) {
        const reach = rackReach(i)
        // Its neighbour's reach ends halfway across the gap between them.
        const wide = i > 0 && i < RACK.slots - 1 ? RACK.pitch : reach.w
        expect(Math.min(wide, reach.w, reach.h) * fit(width, height).scale, `${kind} at ${width}x${height}`).toBeGreaterThanOrEqual(48)
      }
    }
    // The wall on the rack: a finger on its stub, well ahead of its foot, takes it.
    const wall = KINDS.indexOf('wall'), foot = rackFoot(wall)
    expect(rackAt({ x: foot.x + WALL.ahead * RACK.scale, y: RACK.y - (WALL.height / 2) * RACK.scale })).toBe(wall)
    expect(rackAt({ x: foot.x, y: RACK.y - 3 })).toBe(wall)
  })
})

describe('the release, the dial and the rack', () => {
  const grip = (pull: number) => ({ x: RELEASE.x, y: RELEASE.rest + RELEASE.travel * pull })

  it('stand clear of the ring', () => {
    const edge = RING.floor + RING.line
    for (const pull of [0, 0.5, 1]) expect(fromRing(grip(pull)) - RELEASE.reach).toBeGreaterThan(edge)
    expect(fromRing(DIAL) - DIAL.reach).toBeGreaterThan(edge)
    for (let i = 0; i < RACK.slots; i++) for (const corner of corners(rackReach(i))) expect(fromRing(corner), `rack ${i}`).toBeGreaterThan(edge)
  })

  it('stand clear of each other', () => {
    for (const pull of [0, 0.5, 1]) {
      expect(far(grip(pull), DIAL)).toBeGreaterThan(RELEASE.reach + DIAL.reach)
      for (let i = 0; i < RACK.slots; i++) expect(toBox(grip(pull), rackReach(i))).toBeGreaterThan(RELEASE.reach)
    }
    for (let i = 0; i < RACK.slots; i++) {
      expect(toBox(DIAL, rackReach(i)), `rack ${i}`).toBeGreaterThan(DIAL.reach)
      // Two pieces on the rack never touch as drawn; between them the nearer takes the finger.
      if (i > 0) expect(apart(rackBox(i), rackBox(i - 1))).toBe(true)
    }
  })

  it('stand clear of the cast, so a poke is never a pull, a turn or a piece', () => {
    for (const who of ['rat', 'cat', 'camera', 'neighbour'] as const) {
      const box = CAST[who].box
      for (const pull of [0, 0.5, 1]) expect(toBox(grip(pull), box), `grip and ${who}`).toBeGreaterThanOrEqual(RELEASE.reach)
      expect(toBox(DIAL, box), `dial and ${who}`).toBeGreaterThanOrEqual(DIAL.reach)
      for (let i = 0; i < RACK.slots; i++) expect(apart(rackReach(i), box), `rack ${i} and ${who}`).toBe(true)
    }
  })
})

describe('the cast', () => {
  it('each have a place of their own on the wall, clear of the ring and of each other', () => {
    const names = ['rat', 'cat', 'camera', 'neighbour'] as const
    for (const who of names) {
      const box = CAST[who].box
      expect(box.x, who).toBeGreaterThanOrEqual(0)
      expect(box.y, who).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w, who).toBeLessThanOrEqual(STAGE_BOX.w)
      expect(box.y + box.h, who).toBeLessThanOrEqual(STAGE_BOX.h)
      for (const corner of [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]]) expect(fromRing({ x: corner[0], y: corner[1] }), who).toBeGreaterThanOrEqual(RING.floor + RING.line)
      for (const other of names) if (who < other) expect(apart(box, CAST[other].box), `${who} and ${other}`).toBe(true)
    }
  })

  it('are large: each of the three animals fills a good part of the wall', () => {
    expect(CAST.rat.box.h).toBeGreaterThan(STAGE_BOX.h * 0.45)
    expect(CAST.cat.box.w).toBeGreaterThan(STAGE_BOX.w * 0.2)
    expect(CAST.pigeon.box.w).toBeGreaterThan(STAGE_BOX.h * 0.2)
  })

  it('are found by a poke: the pigeon anywhere inside its niche, the others in their boxes', () => {
    expect(castAt({ x: RING.x, y: RING.y })).toBe('pigeon')
    expect(castAt({ x: RING.x + RING.hub - RING.rim - 2, y: RING.y })).toBe('pigeon')
    expect(castAt({ x: RING.x + RING.hub + 2, y: RING.y })).toBeNull()
    for (const who of ['rat', 'cat', 'camera', 'neighbour'] as const) {
      const box = CAST[who].box
      expect(castAt({ x: box.x + box.w / 2, y: box.y + box.h / 2 })).toBe(who)
    }
    expect(castAt({ x: 330, y: 70 })).toBeNull()
  })

  it('finds the camera where it is drawn, however it is turned, and keeps all it sweeps on bare wall', () => {
    const at = (pan: number, along: number, across: number) => ({ x: CAST.camera.x + along * Math.cos(pan) - across * Math.sin(pan), y: CAST.camera.y + along * Math.sin(pan) + across * Math.cos(pan) })
    const box = CAST.camera.box
    for (let pan = CAMERA.least; pan <= CAMERA.most + CAMERA.nod + 1e-9; pan += 0.05) {
      // Its lens, its back end, and the corners of its hood and box.
      for (const [along, across] of [[112, 0], [CAMERA.from, 0], [CAMERA.to, CAMERA.top], [CAMERA.to, CAMERA.bottom], [CAMERA.from, CAMERA.top], [50, CAMERA.bottom]]) {
        expect(onCamera(at(pan, along, across), pan), `${pan}: ${along}, ${across}`).toBe(true)
        expect(castAt(at(pan, along, across), pan)).toBe('camera')
      }
      // Past a finger's reach of it, the wall is bare.
      for (const [along, across] of [[CAMERA.to + CAMERA.reach + 2, 0], [50, CAMERA.top - CAMERA.reach - 2], [50, CAMERA.bottom + CAMERA.reach + 2], [CAMERA.from - CAMERA.reach - 2, 0]]) expect(castAt(at(pan, along, across), pan), `${pan}: ${along}, ${across}`).toBeNull()
      // All it sweeps, with that reach, is inside the box the layout keeps clear for it.
      for (const along of [CAMERA.from - CAMERA.reach, CAMERA.to + CAMERA.reach]) for (const across of [CAMERA.top - CAMERA.reach, CAMERA.bottom + CAMERA.reach]) expect(toBox(at(pan, along, across), box), `${pan}`).toBe(0)
    }
    // Turned a quarter away, its lens is nowhere near where it was.
    expect(onCamera(at(0, 112, 0), 1.2)).toBe(false)
    expect(onCamera(at(1.2, 112, 0), 0)).toBe(false)
  })

  it('has the cat on its ledge and the neighbour in the window above it', () => {
    expect(CAST.cat.y).toBe(LEDGE.y)
    expect(WINDOW.y + WINDOW.h).toBeLessThan(CAST.cat.box.y)
    expect(CAST.neighbour.box).toEqual(WINDOW)
  })
})
