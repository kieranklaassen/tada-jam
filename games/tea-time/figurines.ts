import * as THREE from 'three'
import { REGIONS, type Region } from './atlas'
import type { ProfilePoint } from './forms'
import { GOLD, INK, merged, plain, turn } from './pieces'
import { taperedTube } from './props'
import type { GuestId } from './world'

// The guests are glazed figurines that have come to life: a body turned on the
// wheel and painted, a head that turns and nods on it, bead eyes that blink,
// and a few parts of their own (the Bear's arms, the Mouse's tail and ears,
// the Hen's comb and tail). Warm gilt marks what a finger can poke: a nose, a
// beak, a comb. A small guest sits on a stool so its face clears the table.

export type Figure = {
  who: GuestId
  /** Stands at the seat; the whole guest hops, leans and squashes from here. */
  root: THREE.Group
  /** Squashes and stretches from the foot. */
  body: THREE.Group
  /** Turns and nods on the neck. */
  head: THREE.Group
  /** Both eyes as one mesh: scaled flat to blink. */
  eyes: THREE.Mesh
  /** The part of this guest that is funniest: the Bear's arms, the Mouse's tail, the Hen's comb, a Duckling's tail. */
  funny: THREE.Object3D
  /** How high the top of its head is above the cloth, for the shadow and for picking. */
  height: number
  /** How wide it is at its widest, for the shadow and for picking. */
  girth: number
  /** How wide the foot it stands on is, from its middle: the rim it leans on. */
  foot: number
  /** How high the middle of its head is when it sits still. */
  headAt: number
  /** The Mouse's whiskers, which turn about her snout: they twitch, and spin when she is poked. */
  whiskers?: THREE.Object3D
}

function ball(r: number, at: [number, number, number], squash: [number, number, number] = [1, 1, 1], color?: THREE.Color): THREE.BufferGeometry {
  const sphere = plain(new THREE.SphereGeometry(r, 14, 10), color)
  sphere.scale(squash[0], squash[1], squash[2])
  sphere.translate(at[0], at[1], at[2])
  return sphere
}

function cone(r: number, length: number, at: [number, number, number], color?: THREE.Color): THREE.BufferGeometry {
  const shape = plain(new THREE.ConeGeometry(r, length, 10), color)
  shape.rotateX(Math.PI / 2)
  shape.translate(at[0], at[1], at[2] + length / 2)
  return shape
}

/** A pear or an egg: a body profile from its foot up to its neck. */
function bodyProfile(belly: number, height: number, neck: number, low = 0.34): ProfilePoint[] {
  const points: ProfilePoint[] = [{ r: 0, y: 0 }, { r: belly * 0.72, y: 0 }]
  const rows = 14
  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    // Widest at `low` of the way up, then drawn in to the neck.
    const swell = t < low ? Math.sin((t / low) * Math.PI * 0.5) : Math.cos(((t - low) / (1 - low)) * Math.PI * 0.5)
    const from = t < low ? belly * 0.72 : neck
    points.push({ r: from + (belly - from) * swell, y: 0.04 + height * t })
  }
  points.push({ r: 0, y: height + 0.05 })
  return points
}

function eyesOf(kit: THREE.Material, r: number, apart: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(merged([ball(r, [-apart, 0, 0], [1, 1.15, 0.7], INK), ball(r, [apart, 0, 0], [1, 1.15, 0.7], INK)]), kit)
  mesh.position.set(0, y, z)
  mesh.name = 'eyes'
  return mesh
}

/** A low pottery stool with a band, for a guest too small to see over the table. */
function stool(height: number, r: number, segments: number): THREE.BufferGeometry {
  return turn([{ r: 0, y: 0 }, { r: r * 1.05, y: 0 }, { r: r * 0.8, y: height * 0.3 }, { r: r * 0.8, y: height * 0.7 }, { r, y: height * 0.94 }, { r: r * 0.96, y: height }, { r: 0, y: height }], segments, { color: (j) => (j === 4 ? INK : null) })
}

type Plan = {
  belly: number
  tall: number
  neck: number
  region: Region
  stool: number
  head: { r: number; y: number; parts: THREE.BufferGeometry[]; eyes: [number, number, number, number] }
  /** Parts that never move against the body. */
  fixed: THREE.BufferGeometry[]
  funny: THREE.BufferGeometry[]
  /** Where the funny part hinges, in the body's space. */
  hinge: [number, number, number]
}

function planOf(who: GuestId): Plan {
  if (who === 'bear') {
    return {
      belly: 1.02, tall: 1.75, neck: 0.5, region: REGIONS.bear, stool: 0,
      head: {
        r: 0.7, y: 2.2, eyes: [0.085, 0.27, 0.14, 0.6],
        parts: [ball(0.7, [0, 0, 0], [1.06, 0.92, 0.95]), ball(0.3, [0, -0.14, 0.52], [1.15, 0.85, 1]), ball(0.1, [0, -0.06, 0.8], [1.2, 0.8, 0.8], GOLD), ball(0.23, [-0.52, 0.5, 0], [1, 1, 0.6]), ball(0.23, [0.52, 0.5, 0], [1, 1, 0.6])],
      },
      fixed: [ball(0.3, [-0.55, 0.2, 0.62], [1, 0.6, 1.3]), ball(0.3, [0.55, 0.2, 0.62], [1, 0.6, 1.3])],
      // Both arms as one piece, hinged at the shoulders: they lift together for the cup.
      funny: [ball(0.24, [-0.92, -0.42, 0.28], [0.85, 1.9, 0.95]), ball(0.24, [0.92, -0.42, 0.28], [0.85, 1.9, 0.95]), ball(0.13, [-0.92, -0.86, 0.36], [1, 0.7, 1], GOLD), ball(0.13, [0.92, -0.86, 0.36], [1, 0.7, 1], GOLD)],
      hinge: [0, 1.5, 0],
    }
  }
  if (who === 'mouse') {
    const tail = plain(taperedTube(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 0.1, -0.2), new THREE.Vector3(0.78, 0.55, -0.1), new THREE.Vector3(0.6, 0.95, 0.05)]), 0.06, 0.025, 12, 7))
    return {
      belly: 0.46, tall: 0.86, neck: 0.22, region: REGIONS.mouse, stool: 0.8,
      head: {
        r: 0.36, y: 1.12, eyes: [0.055, 0.15, 0.06, 0.31],
        parts: [ball(0.36, [0, 0, 0], [1, 0.95, 1]), cone(0.19, 0.34, [0, -0.07, 0.24]), ball(0.06, [0, -0.07, 0.6], [1, 1, 1], GOLD), ball(0.27, [-0.3, 0.34, -0.04], [1, 1, 0.28]), ball(0.27, [0.3, 0.34, -0.04], [1, 1, 0.28]), ball(0.17, [-0.3, 0.34, 0.03], [1, 1, 0.2], GOLD), ball(0.17, [0.3, 0.34, 0.03], [1, 1, 0.2], GOLD)],
      },
      fixed: [ball(0.1, [-0.3, 0.52, 0.34], [1, 1, 1.3]), ball(0.1, [0.3, 0.52, 0.34], [1, 1, 1.3])],
      funny: [tail],
      hinge: [0.2, 0.12, -0.3],
    }
  }
  if (who === 'hen') {
    return {
      belly: 0.82, tall: 1.34, neck: 0.3, region: REGIONS.hen, stool: 0,
      head: {
        r: 0.34, y: 1.72, eyes: [0.055, 0.2, 0.05, 0.27],
        parts: [ball(0.34, [0, 0, 0]), ball(0.3, [0, -0.3, -0.02], [0.9, 1.2, 0.9]), cone(0.1, 0.24, [0, -0.04, 0.3], GOLD), ball(0.085, [0, -0.2, 0.3], [0.8, 1.3, 0.8], GOLD)],
      },
      fixed: [ball(0.5, [-0.74, 0.74, -0.05], [0.32, 0.9, 1.1]), ball(0.5, [0.74, 0.74, -0.05], [0.32, 0.9, 1.1]), ball(0.34, [0, 1.12, -0.82], [0.5, 1.5, 0.45]), ball(0.3, [-0.22, 1.0, -0.76], [0.45, 1.3, 0.4]), ball(0.3, [0.22, 1.0, -0.76], [0.45, 1.3, 0.4])],
      // The comb: three gilt lobes that flop.
      funny: [ball(0.12, [0, 0.04, 0.14], [0.7, 1.2, 1], GOLD), ball(0.15, [0, 0.1, 0], [0.7, 1.25, 1], GOLD), ball(0.12, [0, 0.04, -0.15], [0.7, 1.15, 1], GOLD)],
      hinge: [0, 2.0, 0.02],
    }
  }
  // A Duckling: a round body, a round head, a gilt bill and a tail that wags.
  return {
    belly: 0.5, tall: 0.74, neck: 0.26, region: REGIONS.plain, stool: 0.62,
    head: { r: 0.34, y: 1.02, eyes: [0.062, 0.17, 0.13, 0.27], parts: [ball(0.34, [0, 0, 0]), ball(0.17, [0, -0.08, 0.36], [1.15, 0.42, 1.2], GOLD)] },
    // Its wings, and its two big gilt feet out in front.
    fixed: [ball(0.26, [-0.44, 0.44, 0], [0.35, 0.9, 1.2]), ball(0.26, [0.44, 0.44, 0], [0.35, 0.9, 1.2]), ball(0.17, [-0.2, 0.05, 0.4], [1.1, 0.3, 1.5], GOLD), ball(0.17, [0.2, 0.05, 0.4], [1.1, 0.3, 1.5], GOLD)],
    funny: [cone(0.16, 0.34, [0, 0, 0])],
    hinge: [0, 0.5, -0.4],
  }
}

/** Builds one guest. `glaze` is the pottery material; `segments` is the lathe's slice count for the tier. */
export function makeFigure(who: GuestId, glaze: THREE.Material, segments: number): Figure {
  const plan = planOf(who)
  const root = new THREE.Group()
  root.name = `guest-${who}`
  // A guest and its stool are one object to the intersection audit.
  root.userData.jamObject = `guest-${who}`
  const body = new THREE.Group()
  body.position.y = plan.stool
  root.add(body)
  if (plan.stool > 0) {
    const seat = new THREE.Mesh(stool(plan.stool, plan.belly * 1.25, segments), glaze)
    seat.name = `stool-${who}`
    root.add(seat)
  }
  const profile = bodyProfile(plan.belly, plan.tall, plan.neck)
  const painted = plan.region === REGIONS.plain ? {} : { region: { area: plan.region, from: 1, to: profile.length - 2 } }
  const torso = new THREE.Mesh(merged([turn(profile, segments, painted), ...plan.fixed]), glaze)
  torso.name = `body-${who}`
  body.add(torso)
  const head = new THREE.Group()
  head.position.y = plan.head.y
  const skull = new THREE.Mesh(merged(plan.head.parts), glaze)
  skull.name = `head-${who}`
  const [eyeR, apart, eyeY, eyeZ] = plan.head.eyes
  const eyes = eyesOf(glaze, eyeR, apart, eyeY, eyeZ)
  head.add(skull, eyes)
  body.add(head)
  const funny = new THREE.Mesh(merged(plan.funny), glaze)
  funny.name = `funny-${who}`
  funny.position.set(plan.hinge[0], plan.hinge[1], plan.hinge[2])
  // The Hen's comb rides on her head; every other funny part hangs on the body.
  if (who === 'hen') {
    funny.position.y -= plan.head.y
    head.add(funny)
  } else body.add(funny)
  let whiskers: THREE.Object3D | undefined
  if (who === 'mouse') {
    // Six fine cobalt whiskers, three a side, drooping from the tip of her snout. No hair on one side lies in line
    // with one on the other, so the six never read as crossed bars.
    const hairs = [0.08, -0.22, -0.5].flatMap((fan) => [-1, 1].map((side) => {
      const hair = plain(new THREE.BoxGeometry(0.3, 0.014, 0.014), INK)
      hair.translate(side * 0.22, 0, 0)
      hair.rotateZ(side * fan)
      return hair
    }))
    whiskers = new THREE.Mesh(merged(hairs), glaze)
    whiskers.name = `whiskers-${who}`
    whiskers.position.set(0, -0.07, 0.5)
    head.add(whiskers)
  }
  return { who, root, body, head, eyes, funny, whiskers, height: plan.stool + plan.head.y + plan.head.r, girth: plan.belly, foot: plan.stool > 0 ? plan.belly * 1.25 * 1.05 : plan.belly * 0.72, headAt: plan.stool + plan.head.y }
}
