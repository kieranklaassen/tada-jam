import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CASES, perform } from '../cases'
import { TIERS } from '../config'
import { ON_FLOOR } from '../fortState'
import { loadFort } from '../fort'
import type { Guidance } from '../guidance'
import { CUSHIONS, CUSHION_HALF, FLAP, FRONT_Z, kindOf } from '../layout'
import { ON_CLOTH, babyDraw, catDraw, clothTop, granDraw } from '../people'
import { FRAME, builtFort, dragAndLift, first, middle, onFace, playOf, px, run, stored } from '../testing'
import { freshFort } from '../fortState'
import { Diorama } from './diorama'
import castSource from './cast.ts?raw'
import dioramaSource from './diorama.ts?raw'

// The cardboard model with no renderer: a test can build it, lay any moment of the game on it and count what
// would be drawn. Every mesh is one draw call, so the count of visible meshes is the frame's draw number.

const GUIDED: Guidance = { glow: 1, demo: 0.6, demoIndex: 0 }

function visible(diorama: Diorama): string[] {
  const names: string[] = []
  const visit = (object: THREE.Object3D): void => {
    if (!object.visible) return
    if ((object as THREE.Mesh).isMesh) names.push(object.name)
    for (const child of object.children) visit(child)
  }
  visit(diorama.scene)
  return names
}

describe('the draw number', () => {
  it('stays under 80 in the busiest frame: a built fort in the dark, a piece on the rug, a box in the hand, the ghost hand out', () => {
    const diorama = new Diorama()
    let most = 0, when = ''
    const look = (label: string, play: ReturnType<typeof first>): void => {
      diorama.update(play.toy, GUIDED)
      const count = diorama.drawn()
      if (count > most) { most = count; when = label }
    }
    for (const entry of CASES) perform(entry, Infinity, (play) => { if (Math.round(play.toy.time * 60) % 6 === 0) look(entry.name, play) })
    // And the busiest the game can be made: everything built, every box holed and lit, a cut under way with a piece still on the rug.
    const state = builtFort()
    state.dark = true
    const busy = playOf(state)
    busy.down(1, 400, 470); busy.up(1, 400, 470)
    for (let t = 0; t < 1; t += 1 / 30) busy.step(1 / 30)
    busy.down(2, 380, 500); busy.move(2, 420, 520); busy.move(2, 460, 500)
    look('the built fort in the dark', busy)
    expect(busy.toy.stroke ?? busy.toy.hand ?? busy.toy.piece).not.toBeNull()
    expect(most, when).toBeLessThan(80)
    expect(most, when).toBeGreaterThan(40)
    // Each mesh is one call; the ghost hand and its trail are see-through on both sides and take two.
    expect(diorama.drawn()).toBeGreaterThanOrEqual(visible(diorama).length)
    expect(diorama.drawn()).toBeLessThanOrEqual(visible(diorama).length + 4)
    diorama.dispose()
  })

  it('leaves no answer to a touch out at any tier: a tier takes the soft shadows and the swaying rain, and nothing else', () => {
    const lowest = new Diorama(), highest = new Diorama()
    lowest.setTier(TIERS[TIERS.length - 1])
    highest.setTier(TIERS[0])
    const decoration = /shadow|rain/
    for (const entry of CASES.filter((_, i) => i % 4 === 0)) {
      perform(entry, Infinity, (play) => {
        if (Math.round(play.toy.time * 60) % 10 !== 0) return
        // A game has one view, which is told once of a face that was cut; here two views draw the same game, so the second is told too.
        const cut = [...play.toy.recut]
        lowest.update(play.toy, GUIDED)
        const low = visible(lowest).filter((mesh) => !decoration.test(mesh))
        for (const id of cut) play.toy.recut.add(id)
        highest.update(play.toy, GUIDED)
        expect(low, entry.name).toEqual(visible(highest).filter((mesh) => !decoration.test(mesh)))
      })
    }
    // What the tiers differ in is named as decoration, and every tier keeps the same fields.
    for (const tier of TIERS) expect(Object.keys(tier).sort()).toEqual(Object.keys(TIERS[0]).sort())
    lowest.dispose(); highest.dispose()
  })
})

describe('what the model computes, the view reads', () => {
  it('reads every value of the cat, the baby and the grandmother as they are drawn', () => {
    const toy = first().toy
    const section = (from: string, to: string): string => castSource.slice(castSource.indexOf(`export class ${from}`), to ? castSource.indexOf(`export class ${to}`) : undefined)
    const views: [string, object, string][] = [['cat', catDraw(toy), section('CatView', 'BabyView')], ['baby', babyDraw(toy), section('BabyView', 'GranView')], ['gran', granDraw(toy), section('GranView', '')]]
    for (const [who, draw, source] of views) {
      for (const key of Object.keys(draw)) {
        const read = new RegExp(`(draw\\.${key}\\b|\\b${key}\\b[^\\n]*\\} = draw|seatOf\\(draw\\))`).test(source)
        expect(read, `the ${who}'s ${key} is computed and never drawn`).toBe(true)
      }
    }
    // The grandmother's seat is read through seatOf, which takes these three.
    for (const key of ['seated', 'sunk', 'rise']) expect(castSource).toMatch(new RegExp(`draw\\.${key}\\b|seatOf\\(draw\\)`))
  })

  it('draws everything from the model: where a thing is, how far a move has got, and each light in its turn', () => {
    for (const read of ['toy.poseOf(`box:', 'toy.poseOf(`cushion:', 'toy.poseOf(`toy:', 'toy.cloth()', 'toy.bulbs()', 'rollAt(toy)', 'toy.bladeOpen()', 'toy.dusk()', 'toy.lit', 'toy.moving(', 'pieceRest(', 'demoHand(toy', 'flapShows(toy', 'tapeEnd(state)', 'seamOf(state', 'catDraw(toy)', 'babyDraw(toy)', 'granDraw(toy)', 'rattleAt(baby)', 'handOf(baby)', 'pose.flat', 'pose.side', 'cloth.hang', 'cloth.front', 'cloth.back', 'roll.spin', 'roll.flat']) expect(dioramaSource, read).toContain(read)
  })
})

describe('what a sample every 33 ms found, as it is drawn', () => {
  const act = (starts: string): (typeof CASES)[number] => { const entry = CASES.find((one) => one.name.startsWith(starts)); if (!entry) throw new Error(`no act begins "${starts}"`); return entry }
  const at = new THREE.Vector3()
  /** Where a named thing is drawn, in the room. */
  const where = (diorama: Diorama, name: string): THREE.Vector3 => { const thing = diorama.scene.getObjectByName(name); if (!thing) throw new Error(`nothing is drawn as ${name}`); diorama.scene.updateMatrixWorld(true); return thing.getWorldPosition(at).clone() }
  const drawnAs = (diorama: Diorama, name: string): THREE.Object3D => { const thing = diorama.scene.getObjectByName(name); if (!thing) throw new Error(`nothing is drawn as ${name}`); return thing }

  it('the strip of tape that a finger pulls runs in front of a head that looks out of a hole, and nowhere lies in itself', () => {
    const diorama = new Diorama()
    let pulled = 0
    perform(act('tape: pulled off the roll to a seam'), Infinity, (play) => {
      if (play.toy.hand?.kind !== 'tape') return
      diorama.update(play.toy, null)
      const strip = drawnAs(diorama, 'tape-strip') as THREE.Mesh, places = strip.geometry.getAttribute('position'), count = strip.geometry.drawRange.count / 6 + 1
      expect(strip.visible).toBe(true)
      pulled++
      // Two corners for each point along it. From a third of the way it is in front of the faces by more than a head comes out of a hole.
      let last = Infinity
      for (let i = Math.ceil(count / 3) + 1; i < count; i++) {
        const z = places.getZ(i * 2)
        expect(z).toBeGreaterThan(FRONT_Z + 0.2)
        // And each point is nearer the faces than the one before it: two stretches of it that cross are never in one plane.
        expect(z).toBeLessThan(last - 0.001)
        last = z
      }
    })
    expect(pulled).toBeGreaterThan(5)
    diorama.dispose()
  })

  it('the roll the baby bowls hops over the block that lies beside the baby', () => {
    const diorama = new Diorama()
    let bowls = 0, passes = 0
    const hits: string[] = []
    perform(act('tape and the baby: bowls'), Infinity, (play) => {
      if (play.toy.shows.baby.stage !== 'bowl') return
      diorama.update(play.toy, null)
      bowls++
      const roll = where(diorama, 'tape-roll'), block = where(diorama, 'toy-block')
      // The roll is a disc a hand and a half across and a hand thick; the block is a hand each way.
      if (Math.abs(roll.x - block.x) > 0.17 + 0.09 || Math.abs(roll.z - block.z) > 0.058 + 0.06) return
      passes++
      // How far the middle of the disc is from the nearest point of the block: less than the disc's radius, and it is in the block.
      const near = Math.hypot(roll.x - Math.max(block.x - 0.09, Math.min(block.x + 0.09, roll.x)), roll.y - Math.max(block.y - 0.09, Math.min(block.y + 0.09, roll.y)))
      if (near < 0.17 - 0.01) hits.push(`${play.toy.time.toFixed(2)} s: the roll at ${roll.y.toFixed(2)}, the block at ${block.y.toFixed(2)}`)
    })
    expect(bowls).toBeGreaterThan(60)
    expect(passes).toBeGreaterThan(1)
    expect(hits).toEqual([])
    diorama.dispose()
  })

  it('the block beside a baby that flops onto a cushion stays on the rug, and the cushion nudges it clear of itself and of the tape roll', () => {
    const diorama = new Diorama()
    let flops = 0
    const hits: string[] = []
    perform(act('cushion and the baby: flops'), Infinity, (play) => {
      const toy = play.toy
      if (toy.shows.baby.stage !== 'flop') return
      diorama.update(toy, null)
      flops++
      const block = where(diorama, 'toy-block'), roll = where(diorama, 'tape-roll'), when = `${toy.time.toFixed(2)} s`
      if (block.y > 0.2) hits.push(`${when}: the block in the air at ${block.y.toFixed(2)}`)
      if (Math.abs(roll.x - block.x) < 0.17 + 0.09 && Math.abs(roll.z - block.z) < 0.058 + 0.06) hits.push(`${when}: the block in the roll`)
      for (let index = 0; index < 3; index++) {
        const cushion = toy.poseOf(`cushion:${index}`)
        // A cushion that lies flat is 74 cm from front to back, and thicker than the block's foot is off the rug.
        if (cushion.flat > 0.8 && cushion.y < 0.3 && Math.abs(cushion.x - block.x) < CUSHION_HALF + 0.09 && Math.abs(cushion.z - block.z) < 0.37 + 0.06) hits.push(`${when}: the block in cushion ${index}`)
      }
    })
    expect(flops).toBeGreaterThan(60)
    expect(hits.slice(0, 5)).toEqual([])
    diorama.dispose()
  })

  it('a cushion that lies on the rug lies in front of the scissors that cut the face behind it, and they cross it on their way home above it', () => {
    const state = freshFort(null)
    state.cushions[0] = ON_FLOOR
    state.cushionAt[0] = -70
    const play = playOf(loadFort(stored(state))), toy = play.toy, diorama = new Diorama(), box = new THREE.Box3()
    expect(toy.poseOf('cushion:0').flat).toBeGreaterThan(1)
    let over = 0, across = 0
    const hits: string[] = []
    const look = (): void => {
      diorama.update(toy, null)
      if (toy.scissors.mode === 'rest') return
      // The piece that falls out of the cut pushes the cushion aside: it is measured where it lies now.
      const lies = toy.poseOf('cushion:0')
      diorama.scene.updateMatrixWorld(true)
      box.setFromObject(drawnAs(diorama, 'scissors'), true)
      if (box.max.x < lies.x - CUSHION_HALF || box.min.x > lies.x + CUSHION_HALF) return
      over++
      // Flat on the rug the cushion is drawn 44 cm from front to back and a hand high. Where the scissors are over it, they are above it.
      if (box.max.z > lies.z - 0.22 && box.min.z < lies.z + 0.22) across++
      if (box.max.z > lies.z - 0.22 && box.min.z < lies.z + 0.22 && box.min.y < lies.y + 0.07) hits.push(`${toy.time.toFixed(2)} s: the scissors down to ${box.min.y.toFixed(2)}, out to ${box.max.z.toFixed(2)}`)
    }
    // A window cut low on the face, right above the cushion: down the board, along just over the cushion, up and back.
    const corners = [onFace(play, 0, 45, 40), onFace(play, 0, 45, 8), onFace(play, 0, 75, 8), onFace(play, 0, 75, 40), onFace(play, 0, 45, 42)]
    play.down(1, corners[0][0], corners[0][1])
    for (let c = 1; c < corners.length; c++) for (let step = 1; step <= 8; step++) { play.move(1, corners[c - 1][0] + ((corners[c][0] - corners[c - 1][0]) * step) / 8, corners[c - 1][1] + ((corners[c][1] - corners[c - 1][1]) * step) / 8); run(play, FRAME); look() }
    play.up(1, corners[4][0], corners[4][1])
    for (let t = 0; t < 6; t += FRAME) { run(play, FRAME); look() }
    expect(over).toBeGreaterThan(30)
    // On their way home to the front of the rug they cross over it.
    expect(across).toBeGreaterThan(2)
    expect(hits.slice(0, 5)).toEqual([])
    diorama.dispose()
  })

  it('a cushion that comes down onto the sofa slides down the way it leans: it never comes down through the cushion in front of it', () => {
    const diorama = new Diorama(), play = first(), toy = play.toy
    let falls = 0
    const hits: string[] = []
    // Where the plane a leaning cushion lies in crosses the height of the seat: two cushions whose planes are a board apart do not meet.
    const plane = (thing: THREE.Vector3): number => thing.z + 0.16 * (thing.y - CUSHIONS[0].y)
    // The cushion at the back of the row is let go on the grandmother, who sits on it and gives it back.
    dragAndLift(play, [middle(play, 'cushion', (target) => target.kind === 'cushion' && target.index === 2), middle(play, 'gran')])
    for (let t = 0; t < 7; t += FRAME) {
      run(play, FRAME)
      const pose = toy.poseOf('cushion:2'), above = pose.y - CUSHIONS[2].y
      if (toy.moving('cushion:2') >= 1 || Math.abs(pose.x - CUSHIONS[2].x) > 0.01 || above > 0.5 || above < 0.02) continue
      diorama.update(toy, null)
      falls++
      const gap = plane(where(diorama, 'cushion-1')) - plane(where(diorama, 'cushion-2'))
      if (gap < 0.11) hits.push(`${toy.time.toFixed(2)} s: ${gap.toFixed(3)} apart, ${above.toFixed(2)} above the seat`)
    }
    expect(toy.state.cushions[2]).toBe(-1)
    expect(falls).toBeGreaterThan(3)
    expect(hits.slice(0, 5)).toEqual([])
    diorama.dispose()
  })

  it("the grandmother's skirt hangs behind her body when she stands and well behind it on her knees, and her lap is there only once she has sat right down", () => {
    const diorama = new Diorama()
    let standing = 0, kneeling = 0, laps = 0
    const hits: string[] = []
    perform(act('hole and the grandmother: a door she fits'), Infinity, (play) => {
      const toy = play.toy, gran = granDraw(toy)
      diorama.update(toy, null)
      const legs = drawnAs(diorama, 'gran-legs'), torso = drawnAs(diorama, 'gran-torso'), lap = drawnAs(diorama, 'gran-lap')
      if (lap.visible) { laps++; if (gran.seated < 0.99) hits.push(`${toy.time.toFixed(2)} s: her lap while she is ${gran.seated.toFixed(2)} seated`) }
      if (!legs.visible || gran.seated > 0.001) return
      standing++
      // The skirt is cut 56 cm in front of where it hangs from; the body stands 8 cm in front of her middle. The skirt is more than a board behind it.
      const behind = torso.position.z - (legs.position.z + 0.56)
      if (behind < 0.04) hits.push(`${toy.time.toFixed(2)} s: her skirt ${behind.toFixed(3)} behind her body`)
      // On her knees her body comes down to where the skirt is: the skirt is more than a board behind it.
      if (torso.position.y < 0.2) { kneeling++; if (behind < 0.09) hits.push(`${toy.time.toFixed(2)} s: on her knees her skirt ${behind.toFixed(3)} behind her body`) }
    })
    expect(standing).toBeGreaterThan(60)
    expect(kneeling).toBeGreaterThan(5)
    // In her chair, with nothing happening, her lap and her handbag are there.
    const idle = first()
    run(idle, 0.5)
    diorama.update(idle.toy, null)
    expect(drawnAs(diorama, 'gran-lap').visible).toBe(true)
    expect(laps).toBeGreaterThan(0)
    expect(hits.slice(0, 5)).toEqual([])
    diorama.dispose()
  })
})

describe('what the second audit run found, as it is drawn', () => {
  const drawnAs = (diorama: Diorama, name: string): THREE.Object3D => { const thing = diorama.scene.getObjectByName(name); if (!thing) throw new Error(`nothing is drawn as ${name}`); return thing }
  const shown = (thing: THREE.Object3D): boolean => { for (let part: THREE.Object3D | null = thing; part; part = part.parent) if (!part.visible) return false; return true }
  /** The room a drawn thing takes up: every corner of it as it is turned, and of what hangs on it, but nothing of it that is not shown. */
  const roomOf = (diorama: Diorama, name: string): THREE.Box3 => {
    diorama.scene.updateMatrixWorld(true)
    const room = new THREE.Box3(), corner = new THREE.Vector3()
    const add = (thing: THREE.Object3D): void => {
      if (!thing.visible) return
      const at = (thing as THREE.Mesh).geometry?.getAttribute('position')
      if (at) for (let n = 0; n < at.count; n++) room.expandByPoint(corner.fromBufferAttribute(at, n).applyMatrix4(thing.matrixWorld))
      thing.children.forEach(add)
    }
    add(drawnAs(diorama, name))
    return room
  }

  it('the cat on a lid the blanket lies over sits on the cloth: neither its paw nor its body is in the blanket, while the roof lands and ripples and through half a minute after', () => {
    const diorama = new Diorama(), play = first(), toy = play.toy
    dragAndLift(play, [middle(play, 'blanket'), px(play, { x: 0.2, y: 2, z: FRONT_Z })])
    let on = 0, frames = 0
    const hits: string[] = []
    for (let t = 0; t < 30; t += FRAME) {
      play.step(FRAME)
      toy.cues.length = 0
      if (frames++ % 2) continue
      const cat = catDraw(toy), top = cat.body.show ? clothTop(toy, cat.body.x, cat.body.z) : null
      // Out in front of the faces on its hop round, or with the cloth still high over it, it is not on the cloth.
      if (top === null || top > cat.body.y + ON_CLOTH.within) continue
      diorama.update(toy, null)
      on++
      for (const part of ['cat-paw', 'cat-body']) {
        if (!shown(drawnAs(diorama, part))) continue
        const low = roomOf(diorama, part).min.y
        if (low < top - 0.001) hits.push(`${toy.time.toFixed(2)} s: ${part} ${(top - low).toFixed(3)} in the cloth`)
      }
    }
    expect(toy.state.blanket).toHaveLength(2)
    expect(on).toBeGreaterThan(700)
    expect(hits.slice(0, 5)).toEqual([])
    diorama.dispose()
  })

  it('the block is pushed along the rug beside the crawling baby: under its chin, and behind the roll and the scissors where they lie', () => {
    const diorama = new Diorama(), play = playOf(builtFort()), toy = play.toy
    let crawls = 0, past = 0
    const hits: string[] = []
    const look = (): void => {
      if (toy.shows.baby.stage !== 'crawl') return
      diorama.update(toy, null)
      crawls++
      const block = roomOf(diorama, 'toy-block'), when = `${toy.time.toFixed(2)} s`
      if (block.max.y > 0.25) hits.push(`${when}: the block in the air at ${block.max.y.toFixed(2)}`)
      for (const thing of ['scissors', 'tape-roll', 'baby-face']) {
        const other = roomOf(diorama, thing)
        if (thing === 'scissors' && block.max.x > other.min.x && block.min.x < other.max.x) past++
        if (block.intersectsBox(other)) hits.push(`${when}: the block in the ${thing}`)
      }
    }
    // Sent to the fort and called back, twice over.
    for (let round = 0; round < 2; round++) {
      const at = middle(play, 'baby')
      play.down(1, at[0], at[1]); play.up(1, at[0], at[1])
      for (let t = 0; t < 9; t += FRAME) { play.step(FRAME); toy.cues.length = 0; look() }
    }
    expect(crawls).toBeGreaterThan(100)
    expect(past).toBeGreaterThan(20)
    expect(hits.slice(0, 5)).toEqual([])
    diorama.dispose()
  })

  it('a face is drawn under the name of a cut face from its first hole on, and under no other: the audit excuses the cat, the grandmother and a posted toy only at a face that is cut', () => {
    const diorama = new Diorama(), play = first(), toy = play.toy
    diorama.update(toy, null)
    const names = (): string[] => { const all: string[] = []; diorama.scene.traverse((thing) => { if (/^box-\d-face/.test(thing.name)) all.push(thing.name) }); return all.sort() }
    expect(names()).toEqual(['box-0-face', 'box-1-face', 'box-2-face', 'box-3-face', 'box-4-face'])
    const at = onFace(play, 3, 40, 30)
    play.down(1, at[0], at[1]); play.up(1, at[0], at[1])
    run(play, 0.2)
    diorama.update(toy, null)
    expect(names()).toEqual(['box-0-face', 'box-1-face', 'box-2-face', 'box-3-face-cut', 'box-4-face'])
    diorama.dispose()
  })
})

describe('what the third reading found, as it is drawn', () => {
  /** A first visit with the small box on the big one and a line that waits on the small box. */
  function lined(): ReturnType<typeof first> {
    const state = freshFort(4)
    Object.assign(state.boxes[3], { x: -35, on: 0 })
    state.line = { box: 3, path: [20, 20, 60, 20, 60, 50, 24, 50] }
    return playOf(loadFort(stored(state)))
  }
  const lid = (play: ReturnType<typeof first>): [number, number] => { const rect = play.toy.rect(3)!; return px(play, { x: rect.x + 0.33, y: rect.foot + rect.h + FLAP / 2, z: FRONT_Z - kindOf(3).d + 0.03 }) }

  it('the line of a box that hangs while the blades run it shut is drawn on that box, let go to tip or over the heap; and a box on its way to the heap shows its face with the new hole until it lies there', () => {
    for (const how of ['tip', 'heap'] as const) {
      const play = lined(), toy = play.toy, diorama = new Diorama(), from = lid(play)
      diorama.setTier(TIERS[0])
      diorama.update(toy, null)
      expect(visible(diorama), how).toContain('cut-line')
      expect(visible(diorama), how).toContain('box-3-face')
      dragAndLift(play, how === 'tip' ? [from, [from[0] + 300, from[1]]] : [from, px(play, { x: 1.6, y: 1.6, z: FRONT_Z }), middle(play, 'heap')])
      let hung = 0, holed = 0, flat = 0
      for (let t = 0; t < 4; t += FRAME) {
        play.step(FRAME)
        toy.cues.length = 0
        diorama.update(toy, null)
        const seen = visible(diorama)
        if (toy.closing) { hung++; expect(seen, `${how} at ${toy.time.toFixed(2)} s`).toContain('cut-line'); expect(seen).toContain('box-3-face') }
        else if (hung > 0 && how === 'heap') {
          // The line is shut: the hole shows in the face while the box hangs and is folded, and once it lies flat it is fresh board.
          if (toy.poseOf('box:3').flat < 0.3) { holed++; expect(seen, `at ${toy.time.toFixed(2)} s`).toContain('box-3-face-cut') }
          if (toy.poseOf('box:3').flat === 1 && !toy.kept.has(3)) { flat++; expect(seen).not.toContain('box-3-face-cut') }
        }
      }
      expect(hung, how).toBeGreaterThan(20)
      if (how === 'heap') { expect(holed).toBeGreaterThan(10); expect(flat).toBeGreaterThan(30) }
    }
  })
})

describe('what the last stepped check found, as it is drawn', () => {
  it('the grandmother\'s knitting is gathered up for as long as she bobs under a box, leaning or not: it never comes down to where the roll lies on the rug', () => {
    const play = first(4), toy = play.toy, diorama = new Diorama(), box = new THREE.Box3()
    diorama.setTier(TIERS[0])
    let under = 0, lowest = Infinity, upright = 0
    // On a first visit she sits down in the small box and comes up wearing it; tapped again, she takes it off.
    for (const lasts of [7, 6]) {
      dragAndLift(play, [middle(play, 'gran')])
      for (let t = 0; t < lasts; t += FRAME) {
        play.step(FRAME)
        toy.cues.length = 0
        if (toy.shows.gran.stage !== 'under') continue
        const draw = granDraw(toy)
        if (draw.rise > -0.3) continue
        under++
        if (Math.abs(draw.lean) < 0.01) upright++
        diorama.update(toy, null)
        const scarf = diorama.scene.getObjectByName('gran-scarf')!
        diorama.scene.updateMatrixWorld(true)
        lowest = Math.min(lowest, box.setFromObject(scarf).min.y)
      }
    }
    expect(under).toBeGreaterThan(60)
    // Since she leans only under the rim, she is down and upright for part of the way.
    expect(upright).toBeGreaterThan(10)
    // The roll lies with its middle 17 cm off the rug; ungathered, her scarf hung down to the rug itself.
    expect(lowest).toBeGreaterThan(0.25)
    diorama.dispose()
  })
})
