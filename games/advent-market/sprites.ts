import { BAY, paintBay, paintDoorLeaf } from './bays'
import { folkPainters, type FolkSprites } from './folkArt'
import { FRONT_TOP, paintFront, paintSource } from './fronts'
import { BASKET, POT, STICK, WINDOW } from './hall'
import { blank, pool, setBlur, setDensity, sprite, stamp, stampTurned, type Pen, type Sprite } from './paint'
import { CLOTH, DOORWAY, PLACES, slotAt, type Place } from './places'
import { hallSteps, paintBasketBack, paintBasketFront, paintCloth, paintFlame, paintHand, paintLantern, paintSnow, paintStick, paintWax, WAX, type Extent } from './scenery'
import { BOX, paintThing, thingKey } from './thingArt'
import type { Thing } from './things'

// Every picture the frame stamps, painted ahead of it. All of them are painted
// when the surface takes its shape, at the sharpest the display is drawn at,
// and never again while it keeps that shape: a quality tier draws the same
// pictures onto a coarser surface and paints nothing. A thing is painted in
// the frame in which it first looks as it does, without blur, and kept by
// what it looks like.

/** How many thing pictures are kept before the oldest are let go. */
const THINGS_KEPT = 48
/** How big a thing is drawn in the basket, as a share of its size on the bench. */
export const IN_BASKET = 0.42
/** The picture of the basket and what lies in it: the basket's mouth is its handle. */
const BASKET_BOX = { w: 264, h: 330, ox: 132, oy: 200 } as const
/** The stalls and what stands at the front of each to choose from: every source has its own picture, for the moment it hops. */
const SOURCES: readonly (readonly [Place, 'colour' | 'size'])[] = [['candle', 'colour'], ['star', 'colour'], ['star', 'size'], ['wreath', 'colour'], ['wreath', 'size'], ['biscuit', 'colour'], ['biscuit', 'size']]

export type Name = keyof FolkSprites | 'hall' | 'basketBack' | 'basketFront' | 'lantern' | 'flame' | 'stick' | 'light' | 'halo' | `tint${0 | 1 | 2}` | 'hand' | 'snow' | 'cloth' | 'leaf' | `wax${0 | 1 | 2}` | `bay:${Place}` | `front:${Place}` | `source:${string}`

export class Sprites {
  density = 0
  extent: Extent = { x: 0, y: 0, w: 0, h: 0 }
  private readonly have = new Map<string, Sprite>()
  private readonly things = new Map<string, Sprite>()
  private basket: { sprite: Sprite; g: Pen; key: string } | null = null
  /** How many times everything has been painted: what is put together from pictures is put together again after each. */
  private painted = 0

  /**
   * The surface shows `extent` of the stage, and the display is drawn at `density` canvas pixels a unit at its
   * sharpest. Paints every picture when either is new, and nothing when both are as they were.
   */
  plan(extent: Extent, density: number): void {
    const same = this.have.size > 0 && density === this.density && extent.x === this.extent.x && extent.y === this.extent.y && extent.w === this.extent.w && extent.h === this.extent.h
    if (same) return
    this.extent = extent
    this.density = density
    this.painted += 1
    this.things.clear()
    this.basket = null
    setBlur(true)
    const set = (name: Name, made: Sprite) => { this.have.set(name, made) }
    const hall = blank(extent.w, extent.h, -extent.x, -extent.y, density)
    setDensity(density)
    for (const step of hallSteps(extent)) step(hall.g)
    set('hall', hall.sprite)
    const folk = folkPainters(density)
    for (const name of Object.keys(folk) as (keyof FolkSprites)[]) set(name, folk[name]())
    const bottom = extent.y + extent.h
    for (const place of PLACES) {
      set(`bay:${place}`, sprite(BAY.w, Math.max(BAY.h, bottom - BAY.y), -BAY.x, -BAY.y, density, (g) => paintBay(g, place)))
      set(`front:${place}`, sprite(extent.w, bottom - FRONT_TOP, -extent.x, -FRONT_TOP, density, (g) => paintFront(g, place)))
    }
    for (const colour of [0, 1, 2] as const) set(`wax${colour}`, sprite(POT.rx * 2 + 4, POT.ry * 2 + 4, POT.rx + 2, POT.ry + 2, density, (g) => paintWax(g, colour)))
    set('basketBack', sprite(220, 74, 110, 42, density, (g) => { g.translate(-BASKET.x, -BASKET.y); paintBasketBack(g) }))
    set('basketFront', sprite(230, 150, 115, 14, density, (g) => { g.translate(-BASKET.x, -BASKET.y); paintBasketFront(g) }))
    set('lantern', sprite(44, 70, 22, 4, density, paintLantern))
    set('flame', sprite(24, 44, 12, 40, density, paintFlame))
    set('stick', sprite(STICK.half * 2 + 20, 30, STICK.half + 10, 15, density, paintStick))
    // One pool of light serves every flame: it is stamped at the size and strength each one needs.
    set('light', sprite(128, 128, 64, 64, Math.min(1, density), (g) => pool(g, 0, 0, 64, '#ffb24a', 0.9)))
    // The light of a paper lantern, in each of the three papers.
    for (const c of [0, 1, 2] as const) set(`tint${c}`, sprite(128, 128, 64, 64, Math.min(1, density), (g) => pool(g, 0, 0, 64, WAX[c], 0.9)))
    set('halo', sprite(128, 128, 64, 64, Math.min(1, density), (g) => pool(g, 0, 0, 64, '#fff4d0', 0.85)))
    set('hand', sprite(110, 140, 14, 14, density, paintHand))
    set('snow', sprite(WINDOW.w, WINDOW.h * 2, 0, 0, density, paintSnow))
    set('cloth', sprite(CLOTH.w + 12, CLOTH.h + 40, 6, 0, density, (g) => paintCloth(g, CLOTH.w, CLOTH.h + 40)))
    set('leaf', sprite(DOORWAY.right - DOORWAY.left + 8, DOORWAY.sill - DOORWAY.top + 140, 4, 72, density, paintDoorLeaf))
    for (const [place, kind] of SOURCES) for (const index of [0, 1, 2]) set(`source:${place}:${kind}:${index}`, sprite(130, 110, 65, 60, density, (g) => paintSource(g, place, kind, index)))
  }

  of(name: Name): Sprite {
    return this.have.get(name)!
  }

  /** One source at the front by itself, for the moment it hops under a tap. */
  source(place: Place, kind: 'colour' | 'size', index: number): Sprite {
    return this.have.get(`source:${place}:${kind}:${index}`)!
  }

  /**
   * The picture of a thing as it looks now. A thing never seen looking like this is painted here and now: one
   * small picture, without blur, in the frame of the touch that made it so.
   */
  thing(thing: Thing, lit = false): Sprite {
    const key = thingKey(thing, lit)
    const kept = this.things.get(key)
    if (kept) return kept
    if (this.things.size >= THINGS_KEPT) this.things.delete(this.things.keys().next().value as string)
    setBlur(false)
    const made = sprite(BOX.w, BOX.h, BOX.ox, BOX.oy, this.density, (g) => paintThing(g, thing, lit))
    setBlur(true)
    this.things.set(key, made)
    return made
  }

  /**
   * The basket with what lies in it, as one picture: its far side, the things in their six places, its near
   * side. It is put together again only when what lies in it changes. `hidden` is a place left empty: the
   * thing from it is in the air, in the hand, or hopping under a finger.
   */
  basketWith(things: readonly Thing[], hidden: number): Sprite {
    const key = `${this.painted}|${hidden}|${things.map((thing) => thingKey(thing, false)).join('|')}`
    let b = this.basket
    if (b && b.key === key) return b.sprite
    if (!b) b = this.basket = { ...blank(BASKET_BOX.w, BASKET_BOX.h, BASKET_BOX.ox, BASKET_BOX.oy, this.density), key }
    b.key = key
    const g = b.g
    setDensity(this.density)
    g.clearRect(-BASKET_BOX.ox, -BASKET_BOX.oy, BASKET_BOX.w, BASKET_BOX.h)
    g.save()
    g.translate(-BASKET.x, -BASKET.y)
    stamp(g, this.of('basketBack'), BASKET.x, BASKET.y)
    for (let i = 0; i < things.length; i++) {
      if (i === hidden) continue
      const at = slotAt(i)
      // Each leans its own way, as things do in a basket.
      stampTurned(g, this.thing(things[i]), at.x, at.y, ((i * 37) % 5 - 2) * 0.07, IN_BASKET, IN_BASKET)
    }
    stamp(g, this.of('basketFront'), BASKET.x, BASKET.y)
    g.restore()
    return b.sprite
  }
}
