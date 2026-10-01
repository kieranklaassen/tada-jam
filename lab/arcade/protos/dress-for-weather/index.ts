// Dress for the Weather: a hallway, a window, a coat rack and a boot bench.
// Look out, dress the child (the zip, the buttons and the boots are the work
// for the hand), open the door and play in whatever the weather is, then come
// home and hang everything up. Nothing is scored, timed or praised: if the
// child went out in socks in the rain, the socks are wet and it comes back.

import { clamp, damp, dist, ease, lerp, shuffle, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { BUTTON_Y, HEAD_Y, ITEM_BOX, TAIL_REST, ZIP_BOTTOM, ZIP_TOP, drawChild, drawItem, handAt } from './figure.ts'
import type { ItemKey, Outfit, Pose } from './figure.ts'
import { glint, seeded } from './paint.ts'
import type { G } from './paint.ts'
import { HALL, PEGS, SKY, WEATHERS, YARD, buildHall, buildYard, drawCat, drawDoor, drawWeatherFar, drawWindow } from './scenes.ts'
import type { Weather } from './scenes.ts'
import { createYard } from './yard.ts'
import type { Drawable } from './yard.ts'

type Slot = 'coat' | 'hat' | 'neck' | 'hands' | 'feet'

interface Item {
  key: ItemKey
  slot: Slot
  // Hung things hang below their anchor; the rest stand on it.
  hung: boolean
  homeX: number
  homeY: number
  x: number
  y: number
  state: 'home' | 'held' | 'flying' | 'worn'
  sway: Spring
  lift: number
  // Rain or snow still on it after an outing.
  damp: number
}

interface Grab {
  kind: 'item' | 'zip' | 'boot' | 'tail' | 'worn' | 'button'
  p: Pointer
  item?: Item
  foot: number
  dx: number
  dy: number
  fromWorn: boolean
  // For a pressed button: where it was heading before the press.
  prior?: number
}

type Trouble = 'socks' | 'wet' | 'cold' | 'hot' | null

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const rand = seeded(Math.floor(stage.rand() * 1e9))

  // ---- cached backdrops, all painted once, before the first frame
  const hallBg = buildHall(rand)
  const yardBg: Record<Weather, HTMLCanvasElement> = {
    rain: buildYard('rain', rand),
    snow: buildYard('snow', rand),
    wind: buildYard('wind', rand),
    sun: buildYard('sun', rand),
  }
  const snowClean = document.createElement('canvas')
  snowClean.width = W
  snowClean.height = H
  snowClean.getContext('2d')?.drawImage(yardBg.snow, 0, 0)

  // ---- the day
  const order = shuffle(WEATHERS, () => stage.rand())
  let day = 0
  let weather: Weather = order[0]!
  let yardWeather: Weather | null = null
  let scene: 'hall' | 'yard' = 'hall'
  let busy = false
  // True from the hand on the door until the garden appears: nothing else can be picked up then.
  let leaving = false
  let veil = 0
  let doorOpen = 0
  let doorTo = 0
  let curtain = 0
  let curtainTo = 0
  let beenOut = false
  let lastTouch = 0
  let ambientAt = 3
  let draughtAt = 5

  // ---- the child
  const o: Outfit = {
    coat: null,
    zip: 0,
    buttons: [0, 0, 0],
    hat: null,
    scarf: false,
    wound: 0,
    tail: null,
    mittens: false,
    feet: null,
    on: [0, 0],
    pull: [0, 0],
  }
  const buttonTo: [number, number, number] = [0, 0, 0]
  // A button sliding back after a change of mind makes no pop.
  const quiet = [false, false, false]
  const kid = { x: HALL.childX as number, y: HALL.childY as number, s: 1, air: 0, hop: 1, fromX: 0, fromY: 0, toX: 0, toY: 0, tx: HALL.childX as number, ty: HALL.childY as number }
  let arrive: (() => void) | null = null
  const squash = spring(1, 210, 13)
  const lean = spring(0, 120, 9)
  const pose: Pose = { squash: 1, lean: 0, armL: 0, armR: 0, lookX: 0, lookY: 0, blink: 0, smile: 0.25, hot: 0, cold: 0, sockWet: 0, wet: 0, glint: 0, t: 0 }
  let armKick = 0
  let smileTo = 0.25
  let glintBoost = 0
  let lookAtX = 0
  let lookAtY = 0
  let lookUntil = 0
  let catTwitch = 0
  let catPurr = 0
  // 0 by day; creeps to 1 once the child is home and everything is hung up.
  let evening = 0
  let stir = 0
  let hatAway: { x: number; y: number; rot: number; life: number } | null = null

  // ---- the rack
  const mk = (key: ItemKey, slot: Slot, hung: boolean, x: number, y: number): Item => ({ key, slot, hung, homeX: x, homeY: y, x, y, state: 'home', sway: spring(0, 60, 5), lift: 0, damp: 0 })
  const items: Item[] = [
    mk('woolhat', 'hat', false, 702, HALL.shelfY),
    mk('sunhat', 'hat', false, 882, HALL.shelfY),
    mk('raincoat', 'coat', true, PEGS[0]!, HALL.pegY),
    mk('scarf', 'neck', true, PEGS[1]!, HALL.pegY),
    mk('woolcoat', 'coat', true, PEGS[2]!, HALL.pegY),
    mk('mittens', 'hands', true, PEGS[3]!, HALL.pegY),
    mk('wellies', 'feet', false, 684, HALL.benchY),
    mk('snowboots', 'feet', false, 797, HALL.benchY),
    mk('sandals', 'feet', false, 910, HALL.benchY),
  ]
  const itemOf = (key: ItemKey): Item => items.find((it) => it.key === key)!
  let grab: Grab | null = null

  const yard = createYard(
    {
      stage,
      kid,
      go: (x, y) => {
        kid.tx = x
        kid.ty = y
      },
      hand: (side) => {
        const [hx, hy] = handAt(side, side < 0 ? pose.armL : pose.armR)
        return [kid.x + hx * kid.s, kid.y - kid.air + hy * kid.s]
      },
      smile: () => {
        pose.smile = 0.9
      },
    },
    yardBg.snow,
    snowClean,
  )

  // ---- sounds of the things themselves
  const rustle = (vol = 0.07): void => {
    sfx.noise({ dur: 0.14, freq: 1700, to: 900, vol, q: 0.7 })
  }
  const tock = (vol = 0.08): void => {
    sfx.tone({ freq: 540, to: 380, dur: 0.05, type: 'triangle', vol })
  }
  const knock = (vol = 0.07): void => {
    sfx.tone({ freq: 180, to: 110, dur: 0.07, type: 'sine', vol })
    sfx.noise({ dur: 0.03, freq: 500, vol: vol * 0.5, filter: 'lowpass' })
  }
  const step = (): void => {
    const boots = o.feet === 'wellies' || o.feet === 'snowboots'
    sfx.tone({ freq: boots ? 150 : 190, to: boots ? 90 : 130, dur: 0.06, type: 'sine', vol: boots ? 0.1 : 0.06 })
    if (boots) sfx.noise({ dur: 0.04, freq: 420, vol: 0.04, filter: 'lowpass' })
  }

  // ---- moving the child about
  const go = (x: number, y: number, then?: () => void): void => {
    kid.tx = x
    kid.ty = y
    arrive = then ?? null
  }

  const landed = (): void => {
    squash.value = 0.88
    if (scene === 'yard') yard.landed(kid.x, kid.y)
    else step()
  }

  const moveKid = (dt: number): void => {
    if (kid.hop < 1) {
      kid.hop = Math.min(1, kid.hop + dt / (scene === 'hall' ? 0.34 : 0.32))
      const e = ease.inOutQuad(kid.hop)
      kid.x = lerp(kid.fromX, kid.toX, e)
      kid.y = lerp(kid.fromY, kid.toY, e)
      kid.air = Math.sin(kid.hop * Math.PI) * (scene === 'hall' ? 30 : 34)
      if (kid.hop === 1) {
        kid.air = 0
        landed()
      }
      return
    }
    const d = dist(kid.x, kid.y, kid.tx, kid.ty)
    if (d > 5) {
      const reach = Math.min(d, scene === 'hall' ? 170 : 100)
      kid.fromX = kid.x
      kid.fromY = kid.y
      kid.toX = kid.x + ((kid.tx - kid.x) / d) * reach
      kid.toY = kid.y + ((kid.ty - kid.y) / d) * reach
      kid.hop = 0
      lean.value = clamp((kid.tx - kid.x) * 0.0006, -0.12, 0.12)
    } else if (arrive) {
      const fn = arrive
      arrive = null
      fn()
    }
  }

  // ---- dressing
  const slotAnchor = (it: Item): [number, number] => {
    const s = kid.s
    if (it.slot === 'coat') return [kid.x, kid.y - 338 * s]
    if (it.slot === 'hat') return [kid.x, kid.y - 414 * s]
    if (it.slot === 'neck') return [kid.x, kid.y - 344 * s]
    if (it.slot === 'hands') return [kid.x, kid.y - 250 * s]
    return [kid.x, kid.y]
  }

  const wornIn = (slot: Slot): Item | undefined => items.find((it) => it.slot === slot && it.state === 'worn')

  const clearSlot = (it: Item): void => {
    if (it.slot === 'coat') o.coat = null
    else if (it.slot === 'hat') o.hat = null
    else if (it.slot === 'neck') {
      o.scarf = false
      o.tail = null
    } else if (it.slot === 'hands') o.mittens = false
    else o.feet = null
  }

  const flyHome = (it: Item): void => {
    it.state = 'flying'
    const fromX = it.x
    const fromY = it.y
    stage.tween(
      0.42,
      (t) => {
        it.x = lerp(fromX, it.homeX, t)
        it.y = lerp(fromY, it.homeY, t) - Math.sin(t * Math.PI) * 50
        it.lift = 1 - t
      },
      ease.inOutQuad,
      () => {
        it.state = 'home'
        it.lift = 0
        it.sway.kick(it.hung ? 2.2 : 0.8)
        if (it.hung) tock()
        else knock(0.06)
      },
    )
  }

  const coatFastened = (): boolean => (o.coat === 'raincoat' ? o.zip > 0.25 : o.coat === 'woolcoat' ? buttonTo.some((b) => b > 0.5) : false)

  const putOn = (it: Item): void => {
    const old = wornIn(it.slot)
    if (old && old !== it) {
      if (it.slot === 'coat' && coatFastened()) {
        // A coat will not go on over a done-up coat: it goes back to its peg.
        glintBoost = 1
        lean.kick(0.6)
        flyHome(it)
        return
      }
      clearSlot(old)
      const [ax, ay] = slotAnchor(old)
      old.x = ax
      old.y = ay
      flyHome(old)
    }
    it.state = 'flying'
    const fromX = it.x
    const fromY = it.y
    stage.tween(
      0.24,
      (t) => {
        const [ax, ay] = slotAnchor(it)
        it.x = lerp(fromX, ax, t)
        it.y = lerp(fromY, ay, t)
        it.lift = 1 - t
      },
      ease.outCubic,
      () => {
        it.state = 'worn'
        it.lift = 0
        squash.value = 0.93
        pose.smile = 0.7
        rustle(0.08)
        if (it.slot === 'coat') {
          o.coat = it.key as 'raincoat' | 'woolcoat'
          o.zip = 0
          o.buttons = [0, 0, 0]
          buttonTo[0] = buttonTo[1] = buttonTo[2] = 0
          armKick = 1
          stage.after(0.16, () => rustle(0.06))
        } else if (it.slot === 'hat') {
          o.hat = it.key as 'woolhat' | 'sunhat'
          squash.value = 0.88
          sfx.tone({ freq: 240, to: 180, dur: 0.06, type: 'sine', vol: 0.06 })
        } else if (it.slot === 'neck') {
          o.scarf = true
          o.wound = 0
          o.tail = null
        } else if (it.slot === 'hands') {
          o.mittens = true
          armKick = 0.6
        } else {
          o.feet = it.key as 'wellies' | 'snowboots' | 'sandals'
          o.on = [0, 0]
          o.pull = [0, 0]
          knock(0.08)
        }
      },
    )
  }

  // Lift a worn thing off the body into the hand.
  const takeOff = (it: Item, p: Pointer): Grab => {
    clearSlot(it)
    it.state = 'held'
    it.x = p.x
    it.y = p.y + (it.hung ? -70 : 34)
    it.lift = 1
    rustle(0.08)
    squash.value = 1.06
    return { kind: 'item', p, item: it, foot: 0, dx: p.x - it.x, dy: p.y - it.y, fromWorn: true }
  }

  const trouble = (): Trouble => {
    const boots = o.feet === 'wellies' || o.feet === 'snowboots'
    if (weather === 'rain') return !boots ? 'socks' : o.coat !== 'raincoat' ? 'wet' : null
    if (weather === 'snow') return !boots ? 'socks' : o.coat !== 'woolcoat' ? 'cold' : null
    if (weather === 'wind') return o.coat ? null : 'cold'
    return o.coat === 'woolcoat' || o.hat === 'woolhat' || o.scarf || o.mittens || o.feet === 'snowboots' ? 'hot' : null
  }

  // ---- going out and coming home
  const fade = (mid: () => void, done?: () => void): void => {
    stage.tween(
      0.32,
      (t) => (veil = t),
      ease.inOutQuad,
      () => {
        mid()
        stage.tween(0.4, (t) => (veil = 1 - t), ease.inOutQuad, done)
      },
    )
  }

  const comeHome = (): void => {
    busy = true
    yard.release()
    go(YARD.doorX, YARD.doorY, () => {
      fade(() => {
        scene = 'hall'
        beenOut = true
        kid.x = kid.tx = HALL.doorX
        kid.y = kid.ty = HALL.doorY
        if (weather === 'rain' || weather === 'snow') {
          for (const it of items) if (it.state === 'worn' && (it.key === 'raincoat' || it.key === 'wellies' || it.key === 'snowboots' || it.key === 'woolcoat' || it.key === 'woolhat')) it.damp = 1
        }
        leaving = false
        go(HALL.childX, HALL.childY, () => {
          sfx.tone({ freq: 150, to: 190, dur: 0.4, type: 'triangle', vol: 0.03 })
          doorTo = 0
          busy = false
          lastTouch = stage.time
        })
      })
    })
  }

  const steppedOut = (): void => {
    if (weather === 'wind' && o.hat === 'sunhat') {
      // The wind takes a straw hat straight back indoors.
      const hat = itemOf('sunhat')
      o.hat = null
      hat.state = 'home'
      hat.x = hat.homeX
      hat.y = hat.homeY
      hatAway = { x: kid.x, y: kid.y - 270, rot: 0, life: 1.4 }
      sfx.noise({ dur: 0.5, freq: 500, to: 2000, vol: 0.07, q: 0.8 })
    }
    const what = trouble()
    if (!what) {
      busy = false
      lastTouch = stage.time
      return
    }
    if (what === 'socks') {
      pose.sockWet = 1
      sfx.noise({ dur: 0.2, freq: 700, to: 250, vol: 0.1, filter: 'lowpass' })
      sfx.noise({ dur: 0.2, freq: 700, to: 250, vol: 0.08, filter: 'lowpass', delay: 0.3 })
      fx.burst(kid.x, kid.y - 4, { count: 6, color: weather === 'snow' ? '#ffffff' : '#cfe1e6', speed: 120, angle: -Math.PI / 2, spread: 2.4, gravity: 700, life: 0.4, size: 4 })
    } else if (what === 'wet') {
      pose.wet = 1
    } else if (what === 'cold') {
      pose.cold = 1
    } else {
      pose.hot = 1
    }
    smileTo = 0
    stage.after(1.5, comeHome)
  }

  const goOut = (): void => {
    busy = true
    leaving = true
    if (grab?.kind === 'item' && grab.item) flyHome(grab.item)
    grab = null
    sfx.tone({ freq: 1100, to: 700, dur: 0.035, type: 'triangle', vol: 0.05 })
    sfx.tone({ freq: 140, to: 190, dur: 0.5, type: 'triangle', vol: 0.035, delay: 0.05 })
    doorTo = 1
    stage.after(0.5, () => {
        // Feet stamp down into boots that were only half on.
        if (o.feet && (o.on[0] < 1 || o.on[1] < 1)) {
          o.on = [1, 1]
          o.pull = [0.5, 0.5]
          knock(0.1)
        }
        go(HALL.doorX, HALL.doorY, () => {
          fade(
            () => {
              scene = 'yard'
              if (yardWeather !== weather) {
                yard.reset(weather)
                yardWeather = weather
              }
              kid.x = kid.tx = YARD.doorX
              kid.y = kid.ty = YARD.doorY
              kid.s = YARD.scale
            },
            () => go(344, 712, steppedOut),
          )
        })
    })
  }

  // ---- hall touches
  const local = (p: Pointer): [number, number] => [(p.x - kid.x) / kid.s, (p.y - kid.y) / kid.s]

  const rackItemAt = (x: number, y: number): Item | null => {
    let best: Item | null = null
    let bd = 1e9
    for (const it of items) {
      if (it.state !== 'home') continue
      const [x0, y0, x1, y1] = ITEM_BOX[it.key]
      if (x < it.x + x0 - 14 || x > it.x + x1 + 14 || y < it.y + y0 - 14 || y > it.y + y1 + 14) continue
      const d = dist(x, y, it.x + (x0 + x1) / 2, it.y + (y0 + y1) / 2)
      if (d < bd) {
        bd = d
        best = it
      }
    }
    return best
  }

  const windowAnswer = (x: number, y: number): void => {
    stir = 1
    if (weather === 'rain') {
      fx.burst(x, y, { count: 6, color: ['#eef6f8', '#cfe1e6'], speed: 60, angle: Math.PI / 2, spread: 0.8, gravity: 500, life: 0.5, size: 4 })
      sfx.tone({ freq: 1500, to: 1000, dur: 0.06, type: 'sine', vol: 0.05 })
      sfx.tone({ freq: 1900, to: 1300, dur: 0.05, type: 'sine', vol: 0.04, delay: 0.09 })
    } else if (weather === 'snow') {
      fx.burst(x, y, { count: 7, color: '#ffffff', speed: 70, life: 0.9, size: 5, gravity: 50, drag: 0.94 })
      sfx.note(7 + Math.floor(Math.random() * 3), 0.5, 'sine', 0.05)
    } else if (weather === 'wind') {
      fx.burst(x, y, { count: 5, color: ['#cf7f3a', '#b9573a', '#dba445'], speed: 240, angle: 0, spread: 0.7, gravity: 80, life: 0.6, size: 6 })
      sfx.noise({ dur: 0.4, freq: 500, to: 1500, vol: 0.06, q: 0.8 })
    } else {
      fx.burst(x, y, { count: 5, color: '#fff3c4', speed: 50, life: 0.7, size: 5, gravity: -20, drag: 0.95 })
      sfx.tone({ freq: 2300, to: 2700, dur: 0.07, type: 'sine', vol: 0.035 })
      sfx.tone({ freq: 2500, to: 2100, dur: 0.09, type: 'sine', vol: 0.035, delay: 0.1 })
    }
  }

  const drawCurtains = (shut: boolean): void => {
    curtainTo = shut ? 1 : 0
    for (let i = 0; i < 3; i++) sfx.tone({ freq: 620 + i * 40, to: 480, dur: 0.035, type: 'triangle', vol: 0.045, delay: i * 0.07 })
    rustle(0.06)
    if (shut) {
      // Behind the curtain the day turns.
      stage.after(0.5, () => {
        day++
        weather = order[day % order.length]!
        beenOut = false
        evening = 0
      })
    } else {
      stage.after(0.3, () => sfx.note(day % 5, 0.9, 'sine', 0.07))
    }
  }

  const ambientTouch = (p: Pointer): void => {
    if (p.y > HALL.floorY - 30) {
      knock(0.07)
      fx.burst(p.x, p.y, { count: 3, color: 'rgba(250,240,220,0.7)', speed: 40, life: 0.4, size: 5, gravity: -30 })
    } else {
      knock(0.04)
      fx.burst(p.x, p.y, { count: 2, color: 'rgba(255,250,235,0.8)', speed: 30, life: 0.35, size: 4, gravity: 40 })
    }
  }

  const hallDown = (p: Pointer): void => {
    lookAtX = p.x
    lookAtY = p.y
    lookUntil = stage.time + 2.5
    const [lx, ly] = local(p)
    const onRug = !busy && !grab
    if (onRug) {
      // A scarf lies on top of the coat, so its ends and its band are reached first.
      const scarfOn = o.scarf && Math.abs(ly + 300) < 66
      if (scarfOn && o.wound < 0.5 && lx > 28 && lx < 76 && ly > -345 && ly < -218) {
        grab = { kind: 'tail', p, foot: 0, dx: 0, dy: 0, fromWorn: false }
        o.tail = { x: lx, y: ly }
        rustle(0.05)
        return
      }
      if (scarfOn && ((lx < -28 && lx > -76 && ly > -345 && ly < -218) || (Math.abs(lx) < 54 && ly < -322))) {
        const scarf = wornIn('neck')
        if (scarf) {
          grab = { kind: 'worn', p, item: scarf, foot: 0, dx: p.x, dy: p.y, fromWorn: true }
          squash.value = 0.95
          rustle(0.04)
          return
        }
      }
      // Then the fastenings: they are small and they are the point.
      const reach = o.scarf ? 30 : 62
      if (o.coat === 'raincoat') {
        const yPull = lerp(ZIP_BOTTOM, ZIP_TOP, o.zip)
        if (Math.abs(lx) < reach && ly > yPull - 46 && ly < yPull + 70) {
          grab = { kind: 'zip', p, foot: 0, dx: 0, dy: ly - yPull, fromWorn: false }
          sfx.tone({ freq: 900, dur: 0.02, type: 'triangle', vol: 0.05 })
          return
        }
      }
      if (o.coat === 'woolcoat' && Math.abs(lx) < reach + 4) {
        let bi = -1
        let bd = 34
        for (let i = 0; i < 3; i++) {
          const d = Math.abs(ly - BUTTON_Y[i]!)
          if (d < bd) {
            bd = d
            bi = i
          }
        }
        if (bi >= 0) {
          // Pressed: it starts through its hole at once. If the finger then drags
          // away, it was the coat that was wanted, and the button goes back.
          const prior = buttonTo[bi]!
          buttonTo[bi] = prior > 0.5 ? 0 : 1
          grab = { kind: 'button', p, foot: bi, dx: p.x, dy: p.y, fromWorn: false, prior }
          squash.value = 0.96
          sfx.noise({ dur: 0.03, freq: 900, vol: 0.04, filter: 'lowpass' })
          return
        }
      }
      if (o.feet && ly > -112 && ly < 34 && Math.abs(lx) < 100) {
        const foot = lx < 0 ? 0 : 1
        if (o.feet === 'sandals' && o.on[foot]! < 1) {
          o.on[foot] = 1
          o.pull[foot] = 0.4
          sfx.tone({ freq: 1300, to: 900, dur: 0.03, type: 'square', vol: 0.03 })
          tock(0.06)
          return
        }
        grab = { kind: 'boot', p, foot, dx: p.x, dy: p.y, fromWorn: false }
        if (o.on[foot]! < 1) {
          o.pull[foot] = 0.12
          sfx.tone({ freq: 240, to: 300, dur: 0.05, type: 'sine', vol: 0.05 })
        }
        return
      }
      // Anything else worn can be lifted off.
      const hat = wornIn('hat')
      const worn: (Item | undefined)[] = [
        hat && ly < HEAD_Y - 14 && ly > HEAD_Y - 130 && Math.abs(lx) < 118 ? hat : undefined,
        o.mittens && (dist(lx, ly, -96, -180) < 46 || dist(lx, ly, 96, -180) < 46) ? wornIn('hands') : undefined,
        o.coat && Math.abs(lx) < 100 && ly > -344 && ly < -108 ? wornIn('coat') : undefined,
      ]
      const hit = worn.find((it) => it)
      if (hit) {
        grab = { kind: 'worn', p, item: hit, foot: 0, dx: p.x, dy: p.y, fromWorn: true }
        squash.value = 0.95
        rustle(0.04)
        return
      }
    }
    if (!grab && !leaving) {
      const it = rackItemAt(p.x, p.y)
      if (it) {
        it.state = 'held'
        it.lift = 1
        it.sway.kick(1.5)
        grab = { kind: 'item', p, item: it, foot: 0, dx: p.x - it.x, dy: p.y - it.y, fromWorn: false }
        rustle(0.07)
        if (it.hung) sfx.tone({ freq: 460, to: 560, dur: 0.04, type: 'triangle', vol: 0.04 })
        return
      }
    }
    if (onRug) {
      const d = HALL.door
      if (p.x > d.x - 16 && p.y > d.y - 10 && p.y < d.y + d.h + 30) {
        goOut()
        return
      }
    }
    const w = HALL.win
    if (p.x > w.x - 30 && p.x < w.x + w.w + 30 && p.y > w.y - 36 && p.y < w.y + w.h + 46) {
      const shut = curtainTo > 0.5
      const onCloth = p.x < w.x + 46 || p.x > w.x + w.w - 46
      if (shut) drawCurtains(false)
      else if (onCloth) drawCurtains(true)
      else windowAnswer(p.x, p.y)
      return
    }
    if (dist(p.x, p.y, HALL.cat.x, HALL.cat.y - 14) < 96) {
      catTwitch = 1
      catPurr = 1
      for (let i = 0; i < 5; i++) sfx.noise({ dur: 0.12, freq: 190, vol: 0.09, filter: 'lowpass', delay: i * 0.17 })
      return
    }
    if (onRug && Math.abs(lx) < 120 && ly > -480 && ly < 20) {
      squash.value = 0.9
      lean.kick(lx > 0 ? -0.7 : 0.7)
      pose.smile = 0.9
      sfx.tone({ freq: 392, to: 494, dur: 0.14, type: 'sine', vol: 0.06 })
      return
    }
    ambientTouch(p)
  }

  const hallMove = (p: Pointer): void => {
    if (!grab || grab.p.id !== p.id) return
    lookAtX = p.x
    lookAtY = p.y
    lookUntil = stage.time + 1.5
    const [lx, ly] = local(p)
    if (grab.kind === 'zip') {
      const before = o.zip
      o.zip = clamp((ZIP_BOTTOM - (ly - grab.dy)) / (ZIP_BOTTOM - ZIP_TOP), 0, 1)
      const teeth = Math.floor(o.zip * 22)
      if (teeth !== Math.floor(before * 22)) {
        sfx.tone({ freq: 620 + o.zip * 760, dur: 0.022, type: 'triangle', vol: 0.05 })
        sfx.noise({ dur: 0.018, freq: 3600, vol: 0.025, filter: 'highpass' })
      }
      if (o.zip >= 1 && before < 1) {
        squash.value = 0.92
        pose.smile = 0.9
        sfx.tone({ freq: 250, to: 170, dur: 0.09, type: 'sine', vol: 0.1 })
      } else if (o.zip <= 0 && before > 0) {
        sfx.tone({ freq: 200, to: 140, dur: 0.07, type: 'sine', vol: 0.07 })
      }
      return
    }
    if (grab.kind === 'boot') {
      const foot = grab.foot
      const up = grab.dy - p.y
      const away = Math.hypot(p.x - grab.dx, p.y - grab.dy)
      if (o.on[foot]! < 1 && up > 6 && up > Math.abs(p.x - grab.dx) * 0.6) {
        o.pull[foot] = clamp(up / 64, 0, 1.1)
        lean.value = (foot === 0 ? 1 : -1) * 0.03 * o.pull[foot]!
        if (o.pull[foot]! >= 1) {
          o.on[foot] = 1
          squash.value = 0.9
          pose.smile = 0.8
          sfx.tone({ freq: 250, to: 520, dur: 0.11, type: 'sine', vol: 0.07 })
          sfx.tone({ freq: 140, to: 80, dur: 0.1, type: 'sine', vol: 0.14, delay: 0.1 })
          grab = null
        }
      } else if (away > 58) {
        const it = wornIn('feet')
        if (it) grab = takeOff(it, p)
      }
      return
    }
    if (grab.kind === 'tail') {
      const d = dist(lx, ly, 0, -330)
      const k = d > 150 ? 150 / d : 1
      o.tail = { x: lx * k, y: -330 + (ly + 330) * k }
      if (lx < -20 && ly < -200) {
        o.wound = 1
        o.tail = null
        grab = null
        squash.value = 0.94
        pose.smile = 0.8
        rustle(0.09)
        stage.after(0.1, () => rustle(0.06))
      } else if (d > 190) {
        const it = wornIn('neck')
        if (it) grab = takeOff(it, p)
      }
      return
    }
    if (grab.kind === 'button') {
      if (Math.hypot(p.x - grab.dx, p.y - grab.dy) < 40) return
      const coat = wornIn('coat')
      const i = grab.foot
      quiet[i] = o.buttons[i]! !== buttonTo[i]!
      buttonTo[i] = grab.prior ?? 0
      if (!coat) {
        grab = null
        return
      }
      grab = { kind: 'worn', p, item: coat, foot: 0, dx: grab.dx, dy: grab.dy, fromWorn: true }
    }
    if (grab.kind === 'worn' && grab.item) {
      const away = Math.hypot(p.x - grab.dx, p.y - grab.dy)
      if (away < 34) return
      if (grab.item.slot === 'coat' && coatFastened()) {
        // A done-up coat does not come off: it only pulls.
        lean.target = clamp((p.x - grab.dx) * 0.0012, -0.1, 0.1)
        if (glintBoost < 0.2) rustle(0.04)
        glintBoost = 1
        return
      }
      grab = takeOff(grab.item, p)
      return
    }
    if (grab.kind === 'item' && grab.item) {
      const it = grab.item
      it.x = p.x - grab.dx
      it.y = p.y - grab.dy
      it.sway.target = clamp(-p.vx * 0.0007, -0.5, 0.5) * (it.hung ? 1 : 0.4)
    }
  }

  const hallUp = (p: Pointer): void => {
    if (!grab || grab.p.id !== p.id) return
    const was = grab
    grab = null
    lean.target = 0
    if (was.kind === 'tail' || was.kind === 'button') {
      // A scarf end drops back by itself; a pressed button carries on through.
      return
    }
    if (was.kind === 'boot') {
      const foot = was.foot
      if (o.on[foot]! < 1 && o.pull[foot]! < 0.2) {
        // A tap on a slouched boot: it wobbles, showing which way it goes.
        o.pull[foot] = 0.35
      }
      return
    }
    if (was.kind === 'worn' && was.item) {
      squash.value = 0.93
      lean.kick(0.5)
      return
    }
    if (was.kind === 'item' && was.item) {
      const it = was.item
      it.sway.target = 0
      const onChild = Math.abs(p.x - kid.x) < 200 && p.y > kid.y - 620 * kid.s
      const nearChild = onChild || (!busy && p.x < 640 && p.x > 200)
      // A plain tap on something on the rack hands it over too.
      const tapped = dist(p.x, p.y, p.startX, p.startY) < 14 && stage.time - p.downAt < 0.35
      if (!was.fromWorn && scene === 'hall' && !leaving && (nearChild || tapped)) putOn(it)
      else flyHome(it)
    }
  }

  // ---- drawing
  const drawHeld = (g: G, it: Item): void => {
    g.save()
    g.translate(it.x, it.y)
    g.rotate(it.sway.value)
    const k = 1 + it.lift * 0.07
    g.scale(k, k)
    drawItem(g, it.key, stage.time)
    if (it.damp > 0.05 && it.state === 'home') {
      // Rain still running off it.
      const [x0, , x1, y1] = ITEM_BOX[it.key]
      g.fillStyle = `rgba(150,190,210,${Math.min(0.8, it.damp)})`
      for (let i = 0; i < 3; i++) {
        const fall = (stage.time * (40 + i * 13) + i * 37) % 46
        g.beginPath()
        g.ellipse(lerp(x0 + 14, x1 - 14, (i + 0.5) / 3), (it.hung ? y1 : 0) + fall, 3.2, 5.4, 0, 0, Math.PI * 2)
        g.fill()
      }
    }
    g.restore()
  }

  const kidShadow = (g: G): void => {
    const k = 1 - kid.air / 120
    g.beginPath()
    g.ellipse(kid.x, kid.y + 2, 84 * kid.s * k, 17 * kid.s * k, 0, 0, Math.PI * 2)
    g.fillStyle = scene === 'yard' && weather === 'snow' ? 'rgba(140,165,195,0.3)' : 'rgba(70,45,25,0.2)'
    g.fill()
  }

  const drawKid = (g: G): void => {
    kidShadow(g)
    drawChild(g, kid.x, kid.y - kid.air, kid.s, o, pose)
  }

  const drawHall = (g: G): void => {
    const t = stage.time
    g.drawImage(hallBg, 0, 0)
    drawWindow(g, weather, t, curtain, evening, stir)
    // Daylight from the window lying on the floor.
    const w = HALL.win
    const light = (weather === 'sun' ? 0.24 : weather === 'snow' ? 0.15 : weather === 'wind' ? 0.12 : 0.06) * (1 - curtain * 0.85) * (1 + Math.sin(t * 0.5) * 0.08)
    g.beginPath()
    g.moveTo(w.x + 36, HALL.floorY + 8)
    g.lineTo(w.x + w.w + 30, HALL.floorY + 8)
    g.lineTo(w.x + w.w + 190, H)
    g.lineTo(w.x + 130, H)
    g.closePath()
    g.fillStyle = weather === 'sun' || weather === 'wind' ? `rgba(255,243,200,${light * 0.6})` : `rgba(240,246,250,${light * 0.6})`
    g.fill()
    // A second, narrower pane inside the first softens the edge.
    g.beginPath()
    g.moveTo(w.x + 52, HALL.floorY + 8)
    g.lineTo(w.x + w.w + 12, HALL.floorY + 8)
    g.lineTo(w.x + w.w + 160, H)
    g.lineTo(w.x + 158, H)
    g.closePath()
    g.fill()
    if (evening > 0.01) {
      g.fillStyle = `rgba(250,170,90,${evening * 0.16 * (1 - curtain * 0.85)})`
      g.fill()
    }
    drawCat(g, t, catTwitch, catPurr)
    const idle = t - lastTouch
    const dressed = items.some((it) => it.state === 'worn')
    const doorGlint = !busy && dressed && pose.glint < 0.1 && idle > 6 ? 0.5 + 0.5 * Math.sin(t * 2.4) : 0
    drawDoor(g, weather, t, doorOpen, doorGlint, evening)
    for (const it of items) if (it.state === 'home') drawHeld(g, it)
    // The curtain cord catches the light once the day's work is hung up.
    const allHome = items.every((it) => it.state === 'home')
    if (beenOut && allHome && !busy && idle > 5) {
      const a = 0.5 + 0.5 * Math.sin(t * 2.2)
      glint(g, curtainTo > 0.5 ? w.x + w.w / 2 : w.x + 12, w.y + w.h * 0.72, 15, a * 0.9)
    }
    drawKid(g)
    for (const it of items) if (it.state === 'held' || it.state === 'flying') drawHeld(g, it)
    if (evening > 0.01) {
      g.fillStyle = `rgba(255,176,104,${evening * 0.07})`
      g.fillRect(0, 0, W, H)
    }
    if (curtain > 0.01) {
      g.fillStyle = `rgba(70,50,70,${curtain * 0.16})`
      g.fillRect(0, 0, W, H)
    }
  }

  const drawables: Drawable[] = []
  const kidDrawable: Drawable = { y: 0, draw: drawKid }
  const drawYard = (g: G): void => {
    const t = stage.time
    g.drawImage(yardBg[weather], 0, 0)
    // The lantern by the door breathes: home is always there.
    g.beginPath()
    g.arc(33, 415, 24 + Math.sin(t * 1.3) * 2, 0, Math.PI * 2)
    g.fillStyle = `rgba(255,226,150,${0.22 + 0.1 * Math.sin(t * 1.3)})`
    g.fill()
    yard.drawGround(g)
    drawables.length = 0
    yard.collect(drawables)
    kidDrawable.y = kid.y
    drawables.push(kidDrawable)
    drawables.sort((a, b) => a.y - b.y)
    for (const d of drawables) d.draw(g)
    drawWeatherFar(g, weather, t)
    yard.drawOver(g)
    if (hatAway) {
      g.save()
      g.translate(hatAway.x, hatAway.y)
      g.rotate(hatAway.rot)
      g.scale(0.6, 0.6)
      drawItem(g, 'sunhat', t)
      g.restore()
    }
  }

  return {
    update(dt) {
      const t = stage.time
      moveKid(dt)
      if (scene === 'hall') {
        const k = clamp((kid.x - HALL.childX) / (HALL.doorX - HALL.childX), 0, 1)
        kid.s = lerp(1, 0.84, k)
      } else {
        kid.s = YARD.scale
        yard.update(dt)
        if (hatAway) {
          hatAway.x -= dt * 260
          hatAway.y += Math.sin(t * 7) * 60 * dt - 20 * dt
          hatAway.rot -= dt * 5
          hatAway.life -= dt
          if (hatAway.life <= 0 || hatAway.x < 110) hatAway = null
        }
      }

      // Springs and settling.
      squash.target = 1 + Math.sin(t * 1.7) * 0.008
      squash.update(dt)
      lean.update(dt)
      curtain = damp(curtain, curtainTo, 5, dt)
      if (doorOpen !== doorTo) {
        doorOpen = doorTo > doorOpen ? Math.min(doorTo, doorOpen + dt / 0.5) : Math.max(doorTo, doorOpen - dt / 0.6)
        if (doorOpen === 0) knock(0.12)
      }
      armKick = Math.max(0, armKick - dt * 1.8)
      stir = Math.max(0, stir - dt * 1.2)
      const dayDone = scene === 'hall' && beenOut && !busy && items.every((it) => it.state === 'home')
      evening = dayDone ? Math.min(1, evening + dt / 26) : Math.max(0, evening - dt / 2.5)
      glintBoost = Math.max(0, glintBoost - dt * 0.8)
      catTwitch = Math.max(0, catTwitch - dt * 3)
      catPurr = Math.max(0, catPurr - dt * 0.8)
      for (let i = 0; i < 3; i++) {
        const before = o.buttons[i]!
        const to = buttonTo[i]!
        if (before === to) {
          quiet[i] = false
          continue
        }
        const next = to > before ? Math.min(to, before + dt * 5.5) : Math.max(to, before - dt * 5.5)
        o.buttons[i] = next
        if (next === to && quiet[i]) {
          quiet[i] = false
        } else if (next === to) {
          // Through the hole: the pop.
          sfx.tone({ freq: 430 + i * 50, to: 300, dur: 0.07, type: 'triangle', vol: 0.11 })
          sfx.noise({ dur: 0.03, freq: 1200, vol: 0.04, filter: 'lowpass' })
          squash.value = 0.95
          if (to === 1) pose.smile = 0.75
        }
      }
      for (let i = 0; i < 2; i++) {
        const tugging = grab?.kind === 'boot' && grab.foot === i
        if (!tugging) o.pull[i] = damp(o.pull[i]!, 0, 9, dt)
      }
      if (o.tail && grab?.kind !== 'tail') {
        o.tail.x = damp(o.tail.x, TAIL_REST.x, 9, dt)
        o.tail.y = damp(o.tail.y, TAIL_REST.y, 9, dt)
        if (dist(o.tail.x, o.tail.y, TAIL_REST.x, TAIL_REST.y) < 1.5) o.tail = null
      }
      for (const it of items) {
        it.sway.update(dt)
        if (it.state === 'home' && it.damp > 0) it.damp = Math.max(0, it.damp - dt / 14)
      }

      // What the weather did wears off indoors.
      if (scene === 'hall' && !busy) {
        pose.cold = Math.max(0, pose.cold - dt / 4)
        pose.hot = Math.max(0, pose.hot - dt / 5)
        pose.wet = Math.max(0, pose.wet - dt / 9)
        pose.sockWet = Math.max(0, pose.sockWet - dt / (o.feet ? 4 : 22))
        if (pose.cold + pose.hot < 0.3) smileTo = 0.25
      }

      // Pose.
      const [yl, yr] = scene === 'yard' ? yard.arms() : [0, 0]
      // Arms come up a little to meet a coat or mittens being brought over.
      const offered = grab?.kind === 'item' && grab.item && !grab.fromWorn && (grab.item.slot === 'coat' || grab.item.slot === 'hands') && Math.abs(grab.item.x - kid.x) < 260
      const zipLift = grab?.kind === 'zip' ? 0.16 : offered ? 0.3 : 0
      pose.armL = damp(pose.armL, Math.max(yl, armKick * 0.75, zipLift), 10, dt)
      pose.armR = damp(pose.armR, Math.max(yr, armKick * 0.75, zipLift), 10, dt)
      pose.squash = squash.value * (kid.hop < 1 ? 1 + Math.abs(Math.cos(kid.hop * Math.PI)) * 0.06 : 1)
      pose.lean = lean.value
      pose.t = t
      pose.blink = (t + 0.4) % 3.7 < 0.13 ? 1 : 0
      pose.smile = damp(pose.smile, smileTo, 1.2, dt)
      let lx = 0
      let ly = 0
      if (grab?.kind === 'zip') {
        ly = 1
      } else if (t < lookUntil && scene === 'hall') {
        lx = clamp((lookAtX - kid.x) / 260, -1, 1)
        ly = clamp((lookAtY - (kid.y - 400 * kid.s)) / 260, -1, 1)
      } else if (scene === 'hall' && !busy && Math.sin(t * 0.23) > 0.8) {
        lx = -1
        ly = -0.2
      } else if (scene === 'yard') {
        lx = clamp((kid.tx - kid.x) / 140, -1, 1)
      }
      pose.lookX = damp(pose.lookX, lx, 7, dt)
      pose.lookY = damp(pose.lookY, ly, 7, dt)
      const idle = t - lastTouch
      const undone = (o.coat === 'raincoat' && o.zip < 0.97) || (o.coat === 'woolcoat' && buttonTo.some((b) => b < 0.5))
      pose.glint = scene === 'hall' && undone && !grab ? Math.max(glintBoost, clamp((idle - 2.5) / 2, 0, 1)) : glintBoost

      // The hallway is never quite still: a draught, and the weather heard through the glass.
      if (scene === 'hall') {
        if (t > draughtAt) {
          draughtAt = t + 4 + Math.random() * 5
          const hung = items.filter((it) => it.state === 'home' && it.hung)
          const it = hung[Math.floor(Math.random() * hung.length)]
          it?.sway.kick(0.5)
        }
        if (t > ambientAt && curtain < 0.5) {
          if (weather === 'rain') {
            ambientAt = t + 0.9 + Math.random() * 1.6
            sfx.tone({ freq: 1300 + Math.random() * 800, to: 950, dur: 0.045, type: 'sine', vol: 0.028 })
          } else if (weather === 'wind') {
            ambientAt = t + 6 + Math.random() * 4
            sfx.noise({ dur: 1.3, freq: 300, to: 620, vol: 0.02, q: 0.6 })
          } else if (weather === 'sun') {
            ambientAt = t + 6 + Math.random() * 5
            const f = 2100 + Math.random() * 500
            sfx.tone({ freq: f, to: f * 1.18, dur: 0.07, type: 'sine', vol: 0.024 })
            sfx.tone({ freq: f * 1.1, to: f * 0.92, dur: 0.09, type: 'sine', vol: 0.024, delay: 0.11 })
          } else {
            ambientAt = t + 8
          }
        }
      }
    },

    draw(g) {
      if (scene === 'hall') drawHall(g)
      else drawYard(g)
      if (veil > 0.005) {
        const s = SKY[weather]
        g.globalAlpha = veil
        g.fillStyle = s.low
        g.fillRect(0, 0, W, H)
        g.globalAlpha = 1
      }
    },

    down(p) {
      lastTouch = stage.time
      if (scene === 'hall') {
        hallDown(p)
        return
      }
      if (busy) {
        yard.sky(p.x, p.y)
        return
      }
      if (yard.down(p)) return
      if (p.x < 214 && p.y > 300 && p.y < 700) {
        knock(0.07)
        comeHome()
        return
      }
      const dk = dist(p.x, p.y, kid.x, kid.y - 150 * kid.s)
      if (dk < 100 && kid.hop === 1) {
        // A tap on the child: a jump on the spot, into whatever is underfoot.
        kid.fromX = kid.toX = kid.x
        kid.fromY = kid.toY = kid.y
        kid.hop = 0
        squash.value = 0.85
        return
      }
      if (p.y > YARD.horizon + 40) {
        const [ax, ay] = yard.aim(p.x, p.y)
        go(ax, ay)
        squash.value = 0.9
        fx.burst(p.x, clamp(p.y, YARD.top, YARD.bottom), { count: 3, color: weather === 'snow' ? '#ffffff' : 'rgba(255,255,240,0.7)', speed: 40, life: 0.35, size: 4, gravity: -20 })
        sfx.tone({ freq: 300, to: 360, dur: 0.05, type: 'sine', vol: 0.035 })
        return
      }
      yard.sky(p.x, p.y)
    },

    move(p) {
      if (scene === 'hall') hallMove(p)
    },

    up(p) {
      if (scene === 'hall') hallUp(p)
      else yard.up(p)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'dress-for-weather',
    name: 'Dress for the Weather',
    emoji: '🧥',
    ages: [3, 7],
    pitch: 'Look out of the window, dress for the weather from the coat rack, then open the door and play outside until it is time to come home.',
    howTo: 'Drag clothes from the rack onto the child. Pull the zip up, press the buttons, tug the boots up. Tap the door to go out; tap the house to come home. Hang everything back, then draw the curtains for a new day.',
    basedOn: 'Montessori dressing frames and care of self; Waldorf outdoor play in all weathers',
    whyFun: 'A zip that follows the finger tooth by tooth, buttons that pop through their holes, boots that stretch and thump on; then puddles, snowballs, a kite or a watering can.',
    set: 'gentle',
  },
  create,
}
