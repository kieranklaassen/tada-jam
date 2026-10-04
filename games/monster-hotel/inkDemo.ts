import type { GuestId, Phase } from './guests'
import type { House } from './hotel'
import { bodyBox, fromPlain, spotsOf } from './inkPlaces'
import { SPIKE_SCENE, type InkAir, type InkGuest, type InkMood, type InkScene, type InkTaken, type InkThing, type InkView } from './inkScene'
import { layoutPage, type PageLayout } from './layout'

// Fixed scenes for stills and for grown-ups: `demo=<name>` in the address
// draws one of them in place of the game. Each is built from the seconds
// handed in and nothing else, so the same moment always looks the same.
// Where a scene needs a point on the page (a sweep's start, the finger that
// carries a guest, the ghost hand) it is worked out for a surface of 1180 by
// 820, which is where the stills are taken.

/** The names `demoScene` knows, for a test or a list. */
export const DEMO_NAMES = [
  'spike', 'toy-start', 'toy-rooms', 'view-troll', 'view-bat', 'view-blob', 'sweep', 'carry', 'glow', 'hour',
  'bench', 'things', 'things-held', 'coach', 'coach-away', 'cross', 'happier', 'twin', 'view-lizard', 'view-cook', 'view-fly', 'view-singer', 'view-yeti',
] as const

/** The toy's house: four rooms and nothing built in. */
const TOY_HOUSE: House = { shape: 'square', fixtures: [], twins: [] }

let toyPage: PageLayout | null = null
const pageOf = (): PageLayout => (toyPage ??= layoutPage(1180, 820, 'square'))

const guest = (id: GuestId, place: InkGuest['place'], awake: boolean, more: Partial<InkGuest> = {}): InkGuest =>
  ({ id, place, awake, mood: 'content', turnedTo: null, wrapped: false, staresAt: null, ...more })

/** The toy as it opens: the troll and the bat in the lobby by day, staring at the same door, and the blob on the bench. */
function toyStart(): InkScene {
  return {
    house: TOY_HOUSE, phase: 'day', things: [], airs: [], from: null, coach: false,
    guests: [guest('troll', 'lobby', true, { staresAt: 3 }), guest('bat', 'lobby', true, { staresAt: 3 }), guest('blob', 'bench', true)],
  }
}

/** The tuba's noise from room 2, through the wall into room 3 and through the floor into room 0, each as the viewer takes it. */
const noise = (wall?: InkTaken, floor?: InkTaken): InkAir[] => [
  { kind: 'din', rooms: [2, 3], level: 1, ...(wall ? { taken: wall } : {}) },
  { kind: 'din', rooms: [2, 0], level: 1, ...(floor ? { taken: floor } : {}) },
]

/** The toy at night with both guests upstairs: the troll playing in room 2 and the bat next door in room 3. */
function toyRooms(wall?: InkTaken, floor?: InkTaken): InkScene {
  return {
    house: TOY_HOUSE, phase: 'night', things: [], airs: noise(wall, floor), from: null, coach: false,
    guests: [guest('troll', { room: 2 }, true), guest('bat', { room: 3 }, true), guest('blob', 'bench', false)],
  }
}

const viewOf = (scene: InkScene, view: InkView): InkScene => ({ ...scene, from: view.from, view })

/** Where a guest's feet are on the plain page of the toy's house. */
function feetOf(scene: InkScene, id: GuestId): { x: number; y: number } {
  const found = spotsOf(scene.guests, pageOf()).find((entry) => entry.guest.id === id)
  return found ? { x: found.spot.x, y: found.spot.y } : { x: 0, y: 0 }
}

/** A share from 0 to 1 that runs once in every two seconds, taking `length` seconds over it, and is half way at two seconds in. */
const runOnce = (seconds: number, length: number): number => {
  const within = (((seconds - 2 + length / 2) % 2) + 2) % 2
  return Math.min(1, within / length)
}

/** The long house, with the boiler under its first column and the snow hole over its last. */
const LONG_HOUSE: House = { shape: 'long', fixtures: [{ kind: 'boiler', col: 0 }, { kind: 'snow', col: 2 }], twins: [] }

const shelf = (kind: InkThing['kind'], dial: 1 | 2 | 3 = 1): InkThing => ({ kind, at: 'cupboard', dial })

/**
 * The long house by day with everything out of the cupboard: the quilt hung
 * on the wall between the blob and the tuba, the pipe let through the floor
 * over the cook's pot, the stove with the lizard, the ice box with the yeti,
 * and the clock in the troll's hand, which is why it is up and playing by day.
 */
function thingsOut(): InkScene {
  return {
    // The tuba is stopped at the quilt, on its own side of the wall; the cook's smell goes up through the pipe.
    house: LONG_HOUSE, phase: 'day', from: null, numerals: true, bunches: [4], passing: true,
    guests: [
      guest('lizard', { room: 0 }, true), guest('cook', { room: 1 }, true, { mood: 'happier' }), guest('blob', { room: 3 }, true),
      guest('troll', { room: 4 }, true), guest('yeti', { room: 5 }, true),
    ],
    things: [
      { kind: 'quilt', at: { edge: '3-4' }, dial: 1 }, { kind: 'pipe', at: { edge: '1-4' }, dial: 1 }, { kind: 'stove', at: { room: 0 }, dial: 2 },
      { kind: 'ice', at: { room: 5 }, dial: 3 }, { kind: 'clock', at: { guest: 'troll' }, dial: 1 },
    ],
    airs: [
      { kind: 'din', rooms: [4, 5], level: 1 }, { kind: 'din', rooms: [4, 1], level: 1 },
      { kind: 'pong', rooms: [1, 0], level: 1 }, { kind: 'pong', rooms: [1, 2], level: 1 }, { kind: 'pong', rooms: [1, 4], level: 1 },
      { kind: 'warm', rooms: [0, 3], level: 2 }, { kind: 'cold', rooms: [5, 2], level: 2 },
    ],
  }
}

/** All eight guests in one mood: six in the long house's rooms by night, the bat in the lobby and the singer on the bench. */
function everyone(mood: InkMood): InkScene {
  const cross = mood === 'cross'
  return {
    house: LONG_HOUSE, phase: 'night', from: null, things: [],
    guests: [
      guest('lizard', { room: 0 }, false, { mood, turnedTo: cross ? 'up' : null }),
      guest('cook', { room: 1 }, !cross, { mood, turnedTo: cross ? 'up' : null }),
      guest('fly', { room: 2 }, !cross, { mood, turnedTo: cross ? 'up' : null }),
      guest('blob', { room: 3 }, false, { mood, turnedTo: cross ? 'right' : null }),
      guest('troll', { room: 4 }, true, { mood }),
      guest('yeti', { room: 5 }, false, { mood, turnedTo: cross ? 'down' : null }),
      guest('bat', 'lobby', !cross, { mood, staresAt: 5 }),
      guest('singer', 'bench', true, { mood }),
    ],
    airs: cross ? [{ kind: 'din', rooms: [4, 3], level: 1 }] : [{ kind: 'din', rooms: [4, 3], level: 1 }, { kind: 'din', rooms: [4, 1], level: 1 }, { kind: 'pong', rooms: [1, 2], level: 1 }],
  }
}

/** The long house by night with a guest in every room, for the page as each of them takes it. The singer has the fly's room when the page is hers. */
function fullHouse(from: GuestId): InkScene {
  // Each takes the house in its own way: the cook hums to the tuba, the fly leans into the stew and the singer cannot bear
  // it, the lizard basks in the boiler's warmth, and the yeti minds the stove somebody has stood in its room.
  const tuba: InkTaken = from === 'cook' ? 'loved' : 'faint'
  const scene: InkScene = {
    house: LONG_HOUSE, phase: 'night', from, things: [shelf('quilt'), shelf('pipe'), { kind: 'stove', at: { room: 5 }, dial: 3 }, shelf('ice'), shelf('clock')],
    guests: [
      guest('lizard', { room: 0 }, false), guest('cook', { room: 1 }, true, { mood: from === 'cook' ? 'happier' : 'content' }),
      from === 'singer' ? guest('singer', { room: 2 }, true, { mood: 'cross', turnedTo: 'left' }) : guest('fly', { room: 2 }, true, { mood: from === 'fly' ? 'happier' : 'content' }),
      guest('blob', { room: 3 }, false), guest('troll', { room: 4 }, true), guest('yeti', { room: 5 }, false, { mood: 'cross' }),
    ],
    airs: [
      { kind: 'din', rooms: [4, 3], level: 1, taken: 'faint' }, { kind: 'din', rooms: [4, 5], level: 1, taken: 'faint' }, { kind: 'din', rooms: [4, 1], level: 1, taken: tuba },
      { kind: 'pong', rooms: [1, 2], level: 1, taken: from === 'fly' ? 'loved' : from === 'singer' ? 'minded' : 'faint' }, { kind: 'pong', rooms: [1, 0], level: 1, taken: 'faint' },
      { kind: 'warm', rooms: [0], level: 2, taken: from === 'lizard' ? 'loved' : 'faint' }, { kind: 'warm', rooms: [0, 3], level: 1, taken: from === 'lizard' ? 'loved' : 'faint' },
      { kind: 'warm', rooms: [5], level: 3, taken: from === 'yeti' ? 'minded' : 'faint' },
    ],
  }
  const own = scene.guests.find((entry) => entry.id === from)
  return viewOf(scene, { from, room: own && typeof own.place === 'object' ? own.place.room : null })
}

/** The scene of that name at that moment. A name nobody knows gives the look spike. */
export function demoScene(name: string, seconds: number): InkScene {
  if (name === 'toy-start') return toyStart()
  if (name === 'toy-rooms') return toyRooms()
  if (name === 'view-troll') return viewOf(toyRooms('loved', 'loved'), { from: 'troll', room: 2 })
  if (name === 'view-bat') return viewOf(toyRooms('faint', 'faint'), { from: 'bat', room: 3 })
  if (name === 'view-blob') {
    // The blob has the room next to the tuba, and minds it: turned to the wall it comes through, pillow down.
    const scene = toyRooms('minded', 'faint')
    scene.guests = [guest('troll', { room: 2 }, true), guest('bat', 'lobby', true, { staresAt: 3 }), guest('blob', { room: 3 }, false, { mood: 'cross', turnedTo: 'left' })]
    return viewOf(scene, { from: 'blob', room: 3 })
  }
  if (name === 'sweep') {
    // From the plain page to the troll's, spreading from its feet.
    const scene = viewOf(toyRooms('loved', 'loved'), { from: 'troll', room: 2 })
    return { ...scene, under: null, sweep: { ...feetOf(scene, 'troll'), progress: runOnce(seconds, 0.35) } }
  }
  if (name === 'carry') {
    // The bat in the hand, held over room 1, which its page draws in full ink where it stands. A page in the hand neither enlarges nor turns.
    const scene = toyStart()
    const view: InkView = { from: 'bat', room: 1, large: false, inHand: true }
    const room = pageOf().rooms[1]!.rect
    const over = fromPlain(pageOf(), view, { x: room.x + room.w * 0.5, y: room.y + room.h * 0.5 })
    scene.guests = scene.guests.map((entry) => (entry.id === 'bat' ? { ...entry, carried: { x: over.x, y: over.y - 96 * pageOf().scale, swing: Math.sin(seconds * 3.1) * 0.22 } } : entry))
    return viewOf(scene, view)
  }
  if (name === 'glow') {
    // Nobody has touched anything for a while: the glow is on what can be touched, and the hand shows one press.
    const scene = toyStart()
    const troll = spotsOf(scene.guests, pageOf()).find((entry) => entry.guest.id === 'troll')
    const box = troll ? bodyBox(troll.spot, pageOf()) : { x: 0, y: 0, w: 0, h: 0 }
    return { ...scene, glow: { strength: 1, guests: ['troll', 'bat'], wheel: true }, hand: { x: box.x + box.w * 0.5, y: box.y + box.h * 0.45, down: true, alpha: 1 } }
  }
  if (name === 'hour') {
    // The wheel has been turned: night spreads from it over the day.
    const scene = toyRooms()
    const wheel = pageOf().wheel
    const under: Phase = 'day'
    return { ...scene, hourUnder: under, hourSweep: { x: wheel.x + wheel.w / 2, y: wheel.y + wheel.h / 2, progress: runOnce(seconds, 0.6) }, wheelTurn: (1 - runOnce(seconds, 0.6)) * -0.6 }
  }
  if (name === 'bench') {
    // Each of the eight sits on the bench in turn, two seconds each, in the long house, with a full lobby over its head.
    const order: GuestId[] = ['troll', 'bat', 'blob', 'yeti', 'lizard', 'cook', 'fly', 'singer']
    const id = order[Math.floor((((seconds / 2) % 8) + 8) % 8)]!
    return {
      house: LONG_HOUSE, phase: 'day', from: null, things: [], airs: [],
      guests: [guest(id, 'bench', true), ...order.filter((one) => one !== id).slice(0, 5).map((one) => guest(one, 'lobby', true, { staresAt: 4 }))],
    }
  }
  if (name === 'things') return thingsOut()
  if (name === 'things-held') {
    // The blob rolled in the quilt, the fly with the pipe at its mouth, the troll with the clock, and the two dials in the cupboard.
    return {
      house: LONG_HOUSE, phase: 'night', from: null, numerals: true,
      guests: [guest('fly', { room: 2 }, true), guest('blob', { room: 3 }, false, { wrapped: true }), guest('troll', { room: 4 }, false)],
      things: [{ kind: 'quilt', at: { guest: 'blob' }, dial: 1 }, { kind: 'pipe', at: { guest: 'fly' }, dial: 1 }, shelf('stove', 1), shelf('ice', 3), { kind: 'clock', at: { guest: 'troll' }, dial: 1 }],
      airs: [],
    }
  }
  if (name === 'coach') return { ...toyStart(), coach: true, coachOpen: true, coachWaits: true }
  if (name === 'coach-away') {
    // Every seven seconds: it pulls away to the right, and the next one pulls up from the left.
    const within = ((seconds % 7) + 7) % 7
    const ease = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c) }
    const coachAt = within < 0.6 ? 0 : within < 3 ? ease((within - 0.6) / 2.4) : within < 3.6 ? 1 : within < 6.2 ? ease((within - 3.6) / 2.6) - 1 : 0
    return { ...toyStart(), coach: true, coachAt, porterAt: { dx: Math.sin(seconds * 0.9) * 40 + 44, dy: 0 } }
  }
  if (name === 'cross') return everyone('cross')
  if (name === 'happier') return everyone('happier')
  if (name === 'twin') {
    // A room for two: the bat, who sleeps by day, and the blob, who sleeps by night, share room 0.
    return {
      house: { shape: 'square', fixtures: [], twins: [0, 3] }, phase: 'night', from: null, things: [], airs: [], coach: false,
      guests: [guest('blob', { room: 0 }, false), guest('bat', { room: 0 }, true), guest('troll', 'lobby', true, { staresAt: 3 })],
    }
  }
  if (name === 'view-lizard' || name === 'view-cook' || name === 'view-fly' || name === 'view-singer' || name === 'view-yeti') return fullHouse(name.slice(5) as GuestId)
  return SPIKE_SCENE
}
