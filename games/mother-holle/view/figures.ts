import * as THREE from 'three'
import { SIZE, type Id } from '../layout'
import type { Pose } from '../motion'
import { C, d, scraps } from './palette'
import { Sew } from './puff'

// The six, sewn. Each is a few parts on pivots, all cut from the one sheet, so
// a part is one draw. Origin: under the runners, facing along +x a little
// turned to the child.

export type Figure = { root: THREE.Group; apply: (p: Pose) => void; cap: THREE.Mesh; egg: [number, number, number] }
type Kit = { mesh: (name: string, sew: Sew, parent: THREE.Object3D, at?: readonly [number, number, number]) => THREE.Mesh; pivot: (parent: THREE.Object3D, at: readonly [number, number, number]) => THREE.Group }

const eyes = (sew: Sew, x: number, y: number, z: number, gap: number, r: number) => {
  for (const s of [-1, 1]) sew.form({ at: [x + s * gap, y, z], r: [r, r * 1.1, r * 0.5], across: 4, up: 2, puff: 0, dye: d(C.white, 'smooth') })
  return sew
}
const pupils = (r: number, gap: number) => {
  const sew = new Sew()
  for (const s of [-1, 1]) sew.form({ at: [s * gap, 0, 0], r: [r, r * 1.1, r * 0.45], across: 6, up: 2, puff: 0, sub: 2, dye: d(C.ink, 'smooth') })
  return sew
}
const look = (m: THREE.Mesh, home: readonly [number, number, number], p: Pose, far: number) => m.position.set(home[0] + p.look * far, home[1] + p.lookUp * far, home[2])

function walrus(k: Kit, root: THREE.Group): Figure {
  const tub = k.pivot(root, [0, 0, 0])
  k.mesh('tub', new Sew()
    .form({ at: [0, 0.72, 0], r: [1.28, 0.5, 0.8], round: [0.5, 0.75], across: 10, up: 2, taper: 1.22, puff: 0.1, dye: scraps(d(C.tub, 'rings'), d(0xbfd8e6, 'dots'), d(C.tub, 'sprigs')) })
    .form({ at: [0, 1.14, 0], r: [1.62, 0.12, 1.02], round: [1, 0.75], across: 12, up: 2, puff: 0.04, dye: d(C.cream, 'stripes') })
    .form({ at: [-0.85, 0.2, 0.5], r: [0.17, 0.22, 0.17], across: 4, up: 2, dye: d(C.gold) }).form({ at: [0.85, 0.2, 0.5], r: [0.17, 0.22, 0.17], across: 4, up: 2, dye: d(C.gold) })
    .form({ at: [-0.85, 0.2, -0.5], r: [0.17, 0.22, 0.17], across: 4, up: 2, dye: d(C.gold) }).form({ at: [0.85, 0.2, -0.5], r: [0.17, 0.22, 0.17], across: 4, up: 2, dye: d(C.gold) })
    .form({ at: [-1.5, 1.42, 0], r: [0.1, 0.3, 0.1], across: 4, up: 2, dye: d(C.gold) }).form({ at: [-1.36, 1.66, 0], r: [0.22, 0.09, 0.1], across: 4, up: 2, dye: d(C.gold) }), tub)
  const belly = k.pivot(tub, [0.05, 0.95, 0])
  k.mesh('belly', new Sew().form({ at: [0, 0.3, 0], r: [0.92, 0.75, 0.66], across: 7, up: 4, puff: 0.09, dye: scraps(d(C.walrus, 'petals'), d(C.walrusB), d(C.walrus, 'checks')) }).form({ at: [0.1, 0.22, 0.42], r: [0.6, 0.5, 0.3], across: 4, up: 2, dye: d(0xc9a9a5, 'ticking') }), belly)
  const fl = k.pivot(belly, [-0.62, 0.35, 0.62]), fr = k.pivot(belly, [0.72, 0.3, 0.6])
  const flip = () => new Sew().form({ at: [0, -0.36, 0.08], r: [0.24, 0.5, 0.11], across: 4, up: 2, taper: 0.7, dye: d(C.walrus, 'scallops') })
  k.mesh('flipperL', flip(), fl); k.mesh('flipperR', flip(), fr)
  const head = k.pivot(belly, [0.12, 0.84, 0.08])
  const sew = new Sew().form({ at: [0, 0.2, 0], r: [0.7, 0.6, 0.58], across: 7, up: 3, puff: 0.08, dye: scraps(d(C.walrus), d(C.walrusB, 'dots')) })
  for (const s of [-1, 1]) {
    sew.form({ at: [s * 0.25, -0.03, 0.54], r: [0.34, 0.26, 0.24], across: 4, up: 2, puff: 0.06, dye: d(C.cream, 'dots') })
    sew.form({ at: [s * 0.22, -0.46, 0.6], r: [0.085, 0.32, 0.085], across: 4, up: 2, taper: 1.6, dye: d(C.tusk, 'smooth') })
    for (let i = 0; i < 3; i++) sew.form({ at: [s * (0.52 + i * 0.03), -0.12 + i * 0.1, 0.6], r: [0.24, 0.022, 0.022], turn: [0, s * -0.3, s * (-0.3 + i * 0.25)], across: 3, up: 2, sub: 1, puff: 0, dye: d(C.ink, 'smooth') })
    sew.form({ at: [s * 0.3, 0.7, 0.36], r: [0.19, 0.06, 0.08], turn: [0, 0, s * -0.3], across: 4, up: 2, puff: 0, dye: d(0x5d424c, 'smooth') })
  }
  eyes(sew, 0, 0.42, 0.5, 0.28, 0.18).form({ at: [0, 0.14, 0.72], r: [0.17, 0.12, 0.12], across: 4, up: 2, dye: d(0x57333f, 'smooth') })
  k.mesh('head', sew, head)
  const pu = k.mesh('pupils', pupils(0.09, 0.28), head)
  // The fountain: three blue puffs up from his mouth, only while he blows.
  const jet = k.mesh('fountain', new Sew().form({ at: [0, 0.5, 0], r: [0.16, 0.62, 0.16], across: 5, up: 3, taper: 1.5, dye: d(0x7fc0e2, 'dots') }).form({ at: [0, 1.15, 0], r: [0.46, 0.22, 0.36], across: 6, up: 2, dye: d(0xa6d8ef, 'dots') }), head, [0, 0.75, 0.1])
  const cap = k.mesh('cap', new Sew().form({ at: [0, 0.16, 0], r: [0.74, 0.34, 0.6], across: 6, up: 2, dye: d(C.snow) }).form({ at: [0.02, -0.62, 0.66], r: [0.3, 0.34, 0.16], across: 4, up: 2, taper: 1.5, dye: d(C.snow) }), head, [0, 0.72, 0])
  return { root, cap, egg: [0.12, SIZE.walrus.seat, 0.1], apply: (p) => {
    belly.scale.set(p.wide, p.tall, p.wide); fl.rotation.z = -p.a; fl.rotation.x = -0.4; fr.rotation.z = p.b; fr.rotation.x = -0.4
    head.rotation.set(p.nod, 0.42 + p.head, p.head * 0.4); look(pu, [0, 0.42, 0.585], p, 0.075)
    jet.visible = p.c > 0.03; jet.scale.set(0.7 + p.c * 0.3, Math.max(0.05, p.c), 0.7 + p.c * 0.3)
  } }
}

function granny(k: Kit, root: THREE.Group): Figure {
  const door = k.pivot(root, [0, 0, 0])
  k.mesh('door', new Sew()
    .form({ at: [0, 0.2, 0], r: [1.42, 0.15, 0.8], round: [0.35, 0.25], across: 12, up: 2, puff: 0.06, dye: scraps(d(C.teal, 'plaid'), d(0x3ba39a), d(C.teal, 'checks')) })
    .form({ at: [0.9, 0.4, 0.42], r: [0.14, 0.13, 0.14], across: 4, up: 2, puff: 0, dye: d(C.gold, 'smooth') })
    .form({ at: [-0.75, 0.36, 0], r: [0.42, 0.06, 0.42], round: [0.5, 0.3], across: 4, up: 2, dye: d(0xd2ecef, 'gingham') }), door)
  const body = k.pivot(root, [0, 0.36, 0])
  k.mesh('skirt', new Sew()
    .form({ at: [0, 0.62, 0], r: [0.62, 0.6, 0.5], round: [0.7, 1], across: 8, up: 3, taper: 0.55, puff: 0.09, dye: scraps(d(C.red, 'flowers'), d(C.rose, 'sprigs'), d(C.red, 'bigdots')) })
    .form({ at: [0, 0.62, 0.36], r: [0.34, 0.44, 0.16], across: 3, up: 2, dye: d(C.cream, 'gingham') })
    .form({ at: [-0.3, 0.06, 0.2], r: [0.18, 0.12, 0.28], across: 4, up: 2, dye: d(C.ink, 'smooth') }).form({ at: [0.3, 0.06, 0.2], r: [0.18, 0.12, 0.28], across: 4, up: 2, dye: d(C.ink, 'smooth') })
    .form({ at: [0, 1.2, 0], r: [0.42, 0.22, 0.36], across: 6, up: 2, dye: d(C.mustard, 'scallops') }), body)
  const al = k.pivot(body, [-0.36, 1.22, 0.1]), ar = k.pivot(body, [0.36, 1.22, 0.1])
  const arm = () => new Sew().form({ at: [0, -0.3, 0], r: [0.13, 0.36, 0.13], across: 4, up: 3, dye: d(C.rose, 'sprigs') }).form({ at: [0, -0.68, 0], r: [0.14, 0.14, 0.12], across: 4, up: 2, puff: 0, dye: d(C.skin, 'smooth') })
  k.mesh('armL', arm(), al); k.mesh('armR', arm(), ar)
  const head = k.pivot(body, [0, 1.42, 0.06])
  const sew = new Sew().form({ at: [0, 0.3, 0], r: [0.43, 0.42, 0.4], across: 6, up: 3, puff: 0.04, dye: d(C.skin) })
    .form({ at: [0, 0.48, -0.1], r: [0.47, 0.36, 0.42], across: 6, up: 2, puff: 0.1, dye: d(C.hair, 'ticking') }).form({ at: [0, 0.9, -0.1], r: [0.22, 0.2, 0.22], across: 5, up: 2, dye: d(C.hair, 'ticking') })
    .form({ at: [0, 0.22, 0.42], r: [0.1, 0.09, 0.1], across: 4, up: 2, puff: 0, dye: d(C.skinB, 'smooth') })
    .form({ at: [0, 0.07, 0.36], r: [0.17, 0.07, 0.05], across: 4, up: 2, puff: 0, dye: d(0x9c2f35, 'smooth') })
  for (const s of [-1, 1]) sew.form({ at: [s * 0.28, 0.16, 0.32], r: [0.1, 0.09, 0.06], across: 4, up: 2, puff: 0, dye: d(0xee9b8d, 'smooth') })
  eyes(sew, 0, 0.34, 0.36, 0.16, 0.13)
  k.mesh('head', sew, head)
  const pu = k.mesh('pupils', pupils(0.065, 0.16), head)
  const cap = k.mesh('cap', new Sew().form({ at: [0, 0.34, 0], r: [0.34, 0.5, 0.32], across: 6, up: 3, taper: 0.5, dye: d(C.snow) }), head, [0, 0.72, 0])
  return { root, cap, egg: [0, SIZE.granny.seat, 0], apply: (p) => {
    body.scale.set(p.wide, p.tall, p.wide); body.rotation.z = p.lean; al.rotation.z = -p.a - 0.2; ar.rotation.z = p.b + 0.2
    head.rotation.set(p.nod, 0.4 + p.head * 0.5, p.head); look(pu, [0, 0.34, 0.425], p, 0.055); door.rotation.z = p.c * 0.12
  } }
}

function grandpa(k: Kit, root: THREE.Group): Figure {
  const chair = k.pivot(root, [0, 0, 0])
  k.mesh('chair', new Sew()
    .form({ at: [0, 0.5, 0], r: [0.78, 0.34, 0.72], round: [0.4, 0.4], across: 8, up: 2, puff: 0.12, dye: scraps(d(C.mustard, 'flowers'), d(0xd99a2b, 'plaid')) })
    .form({ at: [-0.05, 1.15, -0.48], r: [0.8, 0.78, 0.3], round: [0.5, 0.5], across: 8, up: 3, puff: 0.12, dye: scraps(d(C.mustard, 'flowers'), d(0xd99a2b, 'plaid'), d(C.mustard, 'petals')) })
    .form({ at: [-0.86, 0.82, 0.08], r: [0.24, 0.34, 0.68], round: [0.6, 0.6], across: 6, up: 2, puff: 0.1, dye: d(0xd99a2b, 'plaid') })
    .form({ at: [0.86, 0.82, 0.08], r: [0.24, 0.34, 0.68], round: [0.6, 0.6], across: 6, up: 2, puff: 0.1, dye: d(0xd99a2b, 'plaid') })
    .form({ at: [-0.7, 0.1, 0.4], r: [0.14, 0.14, 0.14], across: 4, up: 2, dye: d(C.wood) }).form({ at: [0.7, 0.1, 0.4], r: [0.14, 0.14, 0.14], across: 4, up: 2, dye: d(C.wood) }), chair)
  const rest = k.pivot(chair, [0, 0.42, 0.68])
  k.mesh('footrest', new Sew().form({ at: [0, 0, 0.22], r: [0.5, 0.16, 0.26], round: [0.5, 0.5], across: 6, up: 2, dye: d(C.mustard, 'petals') }), rest)
  const body = k.pivot(chair, [0, 0.72, 0])
  k.mesh('body', new Sew()
    .form({ at: [0, 0.34, 0.02], r: [0.58, 0.48, 0.46], across: 7, up: 3, puff: 0.08, dye: scraps(d(0xdfe9f5, 'ticking'), d(0xc9dcef, 'ticking')) })
    .form({ at: [0, 0.12, 0.42], r: [0.62, 0.26, 0.36], across: 7, up: 2, puff: 0.1, dye: scraps(d(C.red, 'gingham'), d(C.navy, 'dots'), d(C.teal, 'checks')) })
    .form({ at: [-0.52, 0.3, 0.3], r: [0.14, 0.16, 0.36], across: 4, up: 2, dye: d(0xdfe9f5, 'ticking') }).form({ at: [0.52, 0.3, 0.3], r: [0.14, 0.16, 0.36], across: 4, up: 2, dye: d(0xdfe9f5, 'ticking') }), body)
  const feet = k.pivot(chair, [0, 0.62, 0.78])
  k.mesh('slippers', new Sew().form({ at: [-0.24, 0.12, 0.16], r: [0.18, 0.26, 0.15], across: 5, up: 2, dye: d(C.plum, 'bigdots') }).form({ at: [0.24, 0.12, 0.16], r: [0.18, 0.26, 0.15], across: 5, up: 2, dye: d(C.plum, 'bigdots') }), feet)
  const head = k.pivot(body, [0, 0.82, 0.06])
  const sew = new Sew().form({ at: [0, 0.24, 0], r: [0.4, 0.38, 0.36], across: 6, up: 3, puff: 0.03, dye: d(C.skinB) })
    .form({ at: [0, 0.02, 0.22], r: [0.4, 0.22, 0.2], across: 6, up: 2, puff: 0.1, dye: d(C.hair, 'ticking') })
    .form({ at: [0, 0.22, 0.4], r: [0.14, 0.12, 0.14], across: 4, up: 2, puff: 0, dye: d(0xdf8f7c, 'smooth') })
    .form({ at: [0, 0.54, -0.04], r: [0.42, 0.22, 0.38], across: 7, up: 2, dye: d(C.navy, 'stripes') })
    .form({ at: [0.16, 0.86, -0.08], r: [0.26, 0.26, 0.24], taper: 0.4, lean: [0.3, 0], across: 6, up: 2, dye: d(C.navy, 'stripes') })
    .form({ at: [0.6, 0.96, -0.08], r: [0.14, 0.14, 0.14], across: 4, up: 2, dye: d(C.white) })
  // Lids, fast shut: round puffs of skin with a lash of thread under each.
  for (const s of [-1, 1]) sew.form({ at: [s * 0.17, 0.32, 0.31], r: [0.13, 0.1, 0.07], across: 4, up: 2, puff: 0, dye: d(0xd79c7c, 'smooth') }).form({ at: [s * 0.17, 0.26, 0.355], r: [0.12, 0.022, 0.03], lean: [0, 0], turn: [0, 0, s * 0.22], across: 4, up: 2, puff: 0, dye: d(C.ink, 'smooth') })
  k.mesh('head', sew, head)
  const cap = k.mesh('cap', new Sew().form({ at: [0, 0.12, 0.02], r: [0.48, 0.26, 0.42], across: 6, up: 2, dye: d(C.snow) }).form({ at: [0, -0.4, 0.42], r: [0.16, 0.12, 0.14], across: 4, up: 2, dye: d(C.snow) }), head, [0, 0.68, 0])
  return { root, cap, egg: [0, SIZE.grandpa.seat, -0.1], apply: (p) => {
    chair.rotation.x = p.flip * 0.7; body.scale.set(p.wide, p.tall, p.wide); body.position.y = 0.72 + p.b
    head.rotation.set(p.nod, 0.3, p.head); feet.rotation.x = p.a - p.c * 0.5; feet.position.z = 0.78 + p.c * 0.34; rest.position.z = 0.68 + p.c * 0.34; chair.rotation.y = 0.35
  } }
}

function cow(k: Kit, root: THREE.Group): Figure {
  const pan = k.pivot(root, [0, 0, 0])
  k.mesh('pan', new Sew()
    .form({ at: [0, 0.26, 0], r: [1.05, 0.24, 0.95], round: [0.5, 1], across: 10, up: 2, taper: 1.15, dye: scraps(d(C.pan, 'checks'), d(0x595b6c)) })
    .form({ at: [-1.5, 0.5, 0], r: [0.5, 0.11, 0.14], turn: [0, 0, -0.2], across: 5, up: 2, dye: d(C.wood, 'stripes') }), pan)
  const body = k.pivot(pan, [0, 0.36, 0])
  k.mesh('body', new Sew()
    .form({ at: [-0.1, 0.5, 0], r: [0.8, 0.55, 0.56], across: 8, up: 3, puff: 0.1, dye: scraps(d(C.cream), d(C.brown, 'petals'), d(C.cream, 'sprigs'), d(C.cream)) })
    .form({ at: [0.5, 0.08, 0.36], r: [0.36, 0.14, 0.15], across: 4, up: 2, dye: d(C.cream) }).form({ at: [0.5, 0.08, -0.36], r: [0.36, 0.14, 0.15], across: 4, up: 2, dye: d(C.cream) })
    .form({ at: [0.1, 0.12, 0.5], r: [0.3, 0.14, 0.16], across: 4, up: 2, dye: d(C.brown, 'petals') })
    .form({ at: [0.62, 0.5, 0.2], r: [0.15, 0.17, 0.14], across: 4, up: 2, puff: 0, dye: d(C.gold, 'rings') }), body)
  const tail = k.pivot(body, [-0.86, 0.75, 0])
  k.mesh('tail', new Sew().form({ at: [-0.06, 0.3, 0], r: [0.07, 0.36, 0.07], across: 4, up: 2, dye: d(C.cream) }).form({ at: [-0.06, 0.72, 0], r: [0.15, 0.17, 0.13], across: 4, up: 2, dye: d(C.brown, 'ticking') }), tail)
  const head = k.pivot(body, [0.62, 0.92, 0.05])
  const sew = new Sew().form({ at: [0.05, 0.2, 0], r: [0.44, 0.44, 0.42], across: 6, up: 3, puff: 0.06, dye: scraps(d(C.cream), d(C.brown, 'petals'), d(C.cream)) })
    .form({ at: [0.06, -0.02, 0.36], r: [0.42, 0.25, 0.26], across: 5, up: 2, puff: 0.08, dye: d(C.rose, 'dots') })
  for (const s of [-1, 1]) sew.form({ at: [0.06 + s * 0.14, 0, 0.6], r: [0.06, 0.075, 0.04], across: 4, up: 2, puff: 0, dye: d(0x8f4558, 'smooth') })
    .form({ at: [0.05 + s * 0.56, 0.36, -0.04], r: [0.26, 0.12, 0.1], turn: [0, 0, s * -0.35], across: 4, up: 2, dye: d(C.brown, 'petals') })
    .form({ at: [0.05 + s * 0.28, 0.72, 0], r: [0.085, 0.22, 0.085], turn: [0, 0, s * -0.45], taper: 0.4, across: 4, up: 2, puff: 0, dye: d(C.tusk, 'smooth') })
  eyes(sew, 0.06, 0.36, 0.34, 0.2, 0.145)
  k.mesh('head', sew, head)
  const pu = k.mesh('pupils', pupils(0.08, 0.2), head)
  const cap = k.mesh('cap', new Sew().form({ at: [0.05, 0.02, 0], r: [0.52, 0.34, 0.46], across: 6, up: 2, dye: d(C.snow) }).form({ at: [-0.7, -0.2, 0], r: [0.66, 0.26, 0.46], across: 6, up: 2, dye: d(C.snow) }), head, [0, 0.55, 0])
  return { root, cap, egg: [0, SIZE.cow.seat, 0], apply: (p) => {
    pan.rotation.y = p.spin - 0.15; tail.rotation.z = p.c * 0.6; tail.rotation.x = p.c * 0.5
    body.scale.set(p.wide, p.tall, p.wide); head.rotation.set(p.nod, p.head * 1.6 + 0.3, p.head * 0.3); look(pu, [0.06, 0.36, 0.41], p, 0.06)
  } }
}

function hen(k: Kit, root: THREE.Group): Figure {
  const body = k.pivot(root, [0, 0, 0])
  k.mesh('body', new Sew()
    .form({ at: [0, 0.46, 0], r: [0.5, 0.4, 0.4], across: 7, up: 3, puff: 0.08, dye: scraps(d(C.rust, 'scallops'), d(0xd9803c, 'petals'), d(C.rust)) })
    .form({ at: [-0.5, 0.72, 0], r: [0.24, 0.32, 0.16], turn: [0, 0, 0.6], across: 4, up: 2, dye: d(C.plum, 'scallops') })
    .form({ at: [0.12, 0.06, 0.14], r: [0.14, 0.06, 0.09], across: 4, up: 2, puff: 0, dye: d(C.mustard, 'smooth') }).form({ at: [0.12, 0.06, -0.14], r: [0.14, 0.06, 0.09], across: 4, up: 2, puff: 0, dye: d(C.mustard, 'smooth') }), body)
  const wl = k.pivot(body, [-0.02, 0.56, 0.34])
  k.mesh('wing', new Sew().form({ at: [-0.06, -0.08, 0.06], r: [0.3, 0.2, 0.09], across: 4, up: 2, dye: d(C.mustard, 'scallops') }), wl)
  const head = k.pivot(body, [0.34, 0.72, 0.04])
  const sew = new Sew().form({ at: [0, 0.18, 0], r: [0.25, 0.28, 0.24], across: 5, up: 2, dye: d(0xd9803c, 'petals') })
    .form({ at: [0.02, 0.5, 0], r: [0.17, 0.13, 0.07], across: 4, up: 2, dye: d(C.red) }).form({ at: [0.2, 0.0, 0.1], r: [0.08, 0.13, 0.06], across: 4, up: 2, dye: d(C.red) })
    .form({ at: [0.24, 0.16, 0.12], r: [0.17, 0.08, 0.08], taper: 0.6, across: 4, up: 2, puff: 0, dye: d(C.mustard, 'smooth') })
  eyes(sew, 0.06, 0.26, 0.19, 0.11, 0.1)
  k.mesh('head', sew, head)
  const pu = k.mesh('pupils', pupils(0.05, 0.11), head)
  const cap = k.mesh('cap', new Sew().form({ at: [-0.2, -0.28, 0], r: [0.66, 0.56, 0.5], across: 6, up: 2, dye: d(C.snow) }), head, [0, 0.16, 0])
  return { root, cap, egg: [0, SIZE.hen.seat, 0], apply: (p) => {
    body.rotation.y = p.spin; body.scale.set(p.wide, p.tall, p.wide); wl.rotation.x = -p.a; head.rotation.set(p.nod * 0.4, 0.5 + p.head, -p.nod); look(pu, [0.06, 0.26, 0.235], p, 0.035)
  } }
}

function mayor(k: Kit, root: THREE.Group): Figure {
  const body = k.pivot(root, [0, 0, 0])
  k.mesh('body', new Sew()
    .form({ at: [0, 0.7, 0], r: [0.46, 0.5, 0.4], across: 7, up: 3, puff: 0.06, dye: scraps(d(C.navy), d(0x415f94, 'ticking')) })
    .form({ at: [-0.18, 0.18, 0], r: [0.15, 0.2, 0.17], across: 4, up: 2, dye: d(0x6d6a78, 'stripes') }).form({ at: [0.18, 0.18, 0], r: [0.15, 0.2, 0.17], across: 4, up: 2, dye: d(0x6d6a78, 'stripes') })
    .form({ at: [0.02, 0.78, 0.3], r: [0.12, 0.5, 0.14], turn: [0, 0, 0.6], across: 3, up: 3, dye: d(C.red, 'stripes') })
    .form({ at: [0.1, 0.62, 0.44], r: [0.12, 0.12, 0.05], across: 5, up: 2, puff: 0, dye: d(C.gold, 'rings') }), body)
  const al = k.pivot(body, [-0.42, 1.0, 0.05]), ar = k.pivot(body, [0.42, 1.0, 0.05])
  const arm = () => new Sew().form({ at: [0, -0.26, 0], r: [0.12, 0.3, 0.12], across: 4, up: 2, dye: d(C.navy) }).form({ at: [0, -0.56, 0], r: [0.12, 0.12, 0.1], across: 4, up: 2, puff: 0, dye: d(C.white, 'smooth') })
  k.mesh('armL', arm(), al); k.mesh('armR', arm(), ar)
  const head = k.pivot(body, [0, 1.16, 0.04])
  const sew = new Sew().form({ at: [0, 0.22, 0], r: [0.36, 0.33, 0.34], across: 6, up: 2, puff: 0.03, dye: d(C.skin) })
    .form({ at: [-0.14, 0.08, 0.32], r: [0.18, 0.07, 0.08], turn: [0, 0, 0.3], across: 4, up: 2, puff: 0.03, dye: d(0x6a4a35, 'ticking') }).form({ at: [0.14, 0.08, 0.32], r: [0.18, 0.07, 0.08], turn: [0, 0, -0.3], across: 4, up: 2, puff: 0.03, dye: d(0x6a4a35, 'ticking') })
    .form({ at: [0, 0.17, 0.36], r: [0.08, 0.08, 0.08], across: 4, up: 2, puff: 0, dye: d(C.skinB, 'smooth') })
  eyes(sew, 0, 0.28, 0.3, 0.14, 0.11)
  k.mesh('head', sew, head)
  const pu = k.mesh('pupils', pupils(0.055, 0.14), head)
  const hat = k.pivot(head, [0, 0.44, 0])
  k.mesh('hat', new Sew().form({ at: [0, 0.04, 0], r: [0.5, 0.06, 0.46], across: 7, up: 2, dye: d(C.ink, 'smooth') }).form({ at: [0, 0.38, 0], r: [0.32, 0.36, 0.3], round: [0.35, 1], across: 6, up: 2, dye: d(0x3c3744) }).form({ at: [0, 0.14, 0], r: [0.335, 0.07, 0.315], round: [0.5, 1], across: 6, up: 2, dye: d(C.red, 'stripes') }), hat)
  const cap = k.mesh('cap', new Sew().form({ at: [0, 0, 0], r: [0.4, 0.3, 0.36], across: 6, up: 2, dye: d(C.snow) }).form({ at: [0, -0.78, 0.06], r: [0.56, 0.16, 0.46], across: 6, up: 2, dye: d(C.snow) }), hat, [0, 0.8, 0])
  return { root, cap, egg: [0, SIZE.mayor.seat, 0], apply: (p) => {
    body.scale.set(p.wide, p.tall, p.wide); al.rotation.z = -p.a - 0.12; ar.rotation.z = p.b + 0.12; head.rotation.set(p.nod, p.head, 0); look(pu, [0, 0.28, 0.355], p, 0.045); hat.position.y = 0.44 + p.c
  } }
}

const MAKE: Record<Id, (k: Kit, root: THREE.Group) => Figure> = { walrus, granny, grandpa, cow, hen, mayor }

/** They are sewn at one size and stuffed up to this one. */
export const BIG = 1.24

export function makeFigure(id: Id, cloth: THREE.Material): Figure {
  const root = new THREE.Group()
  root.scale.setScalar(BIG)
  root.name = id
  root.userData.jamObject = id
  const kit: Kit = {
    mesh(name, sew, parent, at) {
      const m = new THREE.Mesh(sew.geometry(), cloth)
      m.name = `${id}-${name}`
      if (at) m.position.set(...at)
      parent.add(m)
      return m
    },
    pivot(parent, at) {
      const g = new THREE.Group()
      g.position.set(...at)
      parent.add(g)
      return g
    },
  }
  return MAKE[id](kit, root)
}
