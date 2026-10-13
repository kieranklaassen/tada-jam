import type { Driver, Frac, GameAudit } from '../types.ts'

// Block Castle: the afternoon rug with a pile on it, a block carried over the
// pile and set down, a tall pile, evening falling on a castle, the castle
// standing with all three folk at rest and each thing tapped, the afternoon
// coming back, and the basket tipped so the rug is tidied. The last moment
// pulls out a block that is hemmed in on all four sides with another on it.
// Four more reach what a tap in the evening sets going that the one castle
// does not hold: one of the folk set in a tower under its lifted roof, a
// board with both ends in the air bending under the one who lands on it with
// the dragon under it, the cook carried to a room up high, and a castle with
// no room and no arch. Two more: a slope set on a block, which nods, with a
// long one laid on the rug, and a room with something built over it tapped
// with the cook in it. The first of those two also points a slope at a lone
// block: its heel is on the block and its toe over the bare rug, evening
// falls on it, and the slide it has become is tapped.
// The moments that need a pile start from a saved rug, so none depends on a
// long build by taps.

type Hook = { projectFrac(p: readonly number[]): number[] | null }
type AuditWindow = { __jamAudit: Hook }

const SLOT = 'tada-jam:slot:block-castle'
type Block = [kind: string, col: number, row: number]
const saved = (blocks: readonly Block[], finished = false): object => ({ v: 1, position: 'open', finished, blocks: blocks.map(([kind, col, row]) => ({ kind, col, row })) })

// One of each kind and a place for each of the folk: a roof for the king, a room on the rug with free places
// beside it for the cook, an arch with nothing in front of it for the dragon.
const CASTLE: Block[] = [['cube', 0, 1], ['arch', 3, 0], ['thin', 0, 0], ['round', 6, 0], ['slope', 0, 2], ['long', 4, 0], ['round', 2, 0], ['cube', 6, 1]]
// The highest pile the frame shows, with a slide and a gate beside it.
const TALL: Block[] = [['long', 1, 1], ['long', 1, 1], ['long', 1, 1], ['cube', 2, 1], ['cube', 2, 1], ['cube', 2, 1], ['arch', 4, 0], ['slope', 4, 2]]

// A cube with a cube on it and something on each of its four sides: it cannot come out where it stands.
const HEMMED: Block[] = [['cube', 5, 1], ['cube', 5, 1], ['round', 4, 1], ['round', 6, 1], ['round', 5, 0], ['long', 4, 2]]

// A tower with nothing beside it, a higher seat for the king and a room for the cook: tapped, one of them is set in it.
const VISIT: Block[] = [['round', 1, 1], ['round', 5, 0], ['round', 5, 0], ['cube', 3, 2]]
// A long one on one cube under its middle: both its ends are in the air, and the dragon, with no arch, lies under it.
const SPRING: Block[] = [['cube', 3, 1], ['long', 2, 1], ['thin', 6, 0]]
// A room on a tower, and a higher seat for the king: the cook lies beside it out over the rug, wedged by his cap.
const HIGH: Block[] = [['round', 3, 1], ['cube', 3, 1], ['round', 6, 0], ['round', 6, 0], ['thin', 6, 0]]
// No room and no arch: the cook cooks in the open, the dragon lies under the bridge, the king sits on the tip of the pole.
const OPEN: Block[] = [['round', 1, 1], ['round', 3, 1], ['long', 1, 1], ['round', 5, 0], ['thin', 5, 0]]

// A room with a tower built over it, and a higher seat for the king: the cook lies beside it under the tower.
const OVER: Block[] = [['cube', 2, 1], ['round', 2, 1], ['round', 6, 0], ['round', 6, 0], ['thin', 6, 0]]
// Two cubes side by side, for a slope to be set across, and one that stands alone in front of them.
const PAIR: Block[] = [['cube', 2, 1], ['cube', 3, 1], ['cube', 1, 2]]

// The room's numbers, as games/block-castle/layout.ts has them.
const GRID_X = -0.9
const BASKET = { x: 5.2, z: 0.25, bed: 0.34, wide: 3.2 }
const BELL = { x: 1.95 + 0.22, y: 1.1, z: 3.4 }
const place = (col: number, row: number, y = 0.2, wide = 1): [number, number, number] => [GRID_X + col - 3 + (wide - 1) / 2, y, row - 1]
const offer = (dx: number, dz: number, up: number): [number, number, number] => [BASKET.x + dx, BASKET.bed + up, BASKET.z + dz]
const OFFER = { thin: offer(-1.0, -1.35, 1.6), arch: offer(0.4, -1.35, 1.3), round: offer(-0.9, -0.42, 1.3), cube: offer(0.5, -0.42, 0.9), slope: offer(-0.5, 0.5, 0.7), long: offer(0, 1.36, 0.4) }
const WICKER: [number, number, number] = [BASKET.x - BASKET.wide / 2 - 0.06, 0.35, BASKET.z + 0.6]

const FACE = 'eyelids, pupils and brows lie on the face they belong to: a lid turns down over the front of its eye, and a brow tilts on the brow line'

async function world(d: Driver, p: readonly [number, number, number]): Promise<Frac> {
  const at = await d.page.evaluate((q) => (window as unknown as AuditWindow).__jamAudit.projectFrac(q), [...p])
  return at ? [at[0], at[1]] : [0.5, 0.5]
}

// A rug to start a moment from. The shell writes a save that is still waiting when the page goes away, and that
// write would land on top of the one made here: so the page is reloaded once with nothing, which lets the shell
// write what it has, and then with the rug.
const startFrom = async (d: Driver, state: object): Promise<void> => {
  await d.reload()
  await d.reload({ [SLOT]: state })
}

const tapAt = async (d: Driver, p: readonly [number, number, number], rest = 600): Promise<void> => {
  await d.tap(await world(d, p))
  await d.wait(rest)
}

export default {
  enforce: true,
  childAge: 3,
  ignore: [
    // Flat decals with depth writing off, laid over whatever is under them: the shadows of the blocks and of the
    // folk, the patch of sun and the leaf shadows in it, and the water of the moat on the floor round the rug.
    '^shadows$',
    'folk-shadows',
    'sun-patch',
    'leaf-shadows',
    '(^|>)moat$',
    // Screen-facing sprites: the idle glow, the glow of the lamps, wool dust and smoke, the motes in the sunbeam.
    '^glow$',
    'evening-glow',
    'wool-dust',
    '^motes$',
    // The demonstration hand is drawn without a depth test.
    'ghost-hand',
  ],
  moments: [
    // The first rug of the youngest, at rest: glow at three seconds, the ghost hand at five.
    { name: 'first-rug-idle', run: (d) => d.wait(8600) },
    {
      name: 'day',
      run: async (d) => {
        await startFrom(d, saved(CASTLE))
        await d.wait(1500)
        // Each of the folk poked, the rug patted, the basket's wicker touched.
        await tapAt(d, [-5.7, 1.0, 1.5], 900)
        await tapAt(d, [3.05, 1.9, -2.5], 900)
        await tapAt(d, [-2.5, 0.5, 3.45], 1200)
        await tapAt(d, place(3, 1, 0), 400)
        await tapAt(d, WICKER, 800)
      },
    },
    {
      name: 'carry',
      run: async (d) => {
        // An arch carried out of the basket over the pile and set down in front of it.
        await d.press(await world(d, OFFER.arch))
        await d.move(await world(d, place(5, 0, 2.2)), 700)
        await d.move(await world(d, place(2, 0, 2.4)), 700)
        await d.move(await world(d, place(4, 2, 0.2)), 700)
        await d.wait(300)
        await d.release()
        await d.wait(1200)
        // A round one tapped out of the basket hops to the rug by itself.
        await tapAt(d, OFFER.round, 1400)
        // A block of the rug with another on it is lifted and put back.
        await d.press(await world(d, place(6, 1, 0.5)))
        await d.wait(400)
        await d.release()
        await d.wait(800)
        // A slope dropped on the tip of the thin one cannot stay, and hops off.
        await d.drag(await world(d, OFFER.slope), await world(d, place(0, 0, 2.1)), 900)
        await d.wait(1500)
      },
    },
    {
      name: 'tall-pile',
      run: async (d) => {
        await startFrom(d, saved(TALL))
        await d.wait(1200)
        // One more on top of the highest place, and one pulled out from under.
        await d.drag(await world(d, OFFER.round), await world(d, place(1, 1, 1.7)), 900)
        await d.wait(1400)
        await d.drag(await world(d, place(2, 1, 2.0)), await world(d, place(5, 1, 0.2)), 900)
        await d.wait(1600)
      },
    },
    {
      name: 'evening-falls',
      run: async (d) => {
        await startFrom(d, saved(CASTLE))
        await d.wait(800)
        await tapAt(d, [BELL.x, BELL.y, BELL.z], 0)
        // The whole scene: the sun sinks, each block becomes its thing, and the folk are carried in one after the
        // other, the king to his roof, the cook to his window, the dragon to his gate.
        await d.wait(8800)
      },
    },
    {
      name: 'evening-castle',
      run: async (d) => {
        // All three at rest: the king on the roof, the cook with his cap in at the window, the dragon's nose under the gate.
        await d.wait(2500)
        // Every thing tapped: a room, the gate with the dragon under it, the flag, the roof under the king, the
        // slide (one of them rides it into the moat), the bridge (one of them crosses it), the battlements, and
        // the cook's room.
        await tapAt(d, place(0, 1, 0.5), 1500)
        await tapAt(d, place(3, 0, 1.3, 2), 2200)
        await tapAt(d, place(0, 0, 1.8), 1600)
        await tapAt(d, place(2, 0, 1.2), 1800)
        await tapAt(d, place(0, 2, 0.4, 2), 5200)
        await tapAt(d, place(4, 0, 1.9, 3), 5200)
        await tapAt(d, place(6, 0, 1.2), 1500)
        await tapAt(d, place(6, 1, 0.5), 1500)
        // Each of the folk poked where he rests.
        for (const part of ['king-nut', 'cook-nut', 'dragon-rings']) {
          const at = await d.find(part)
          if (at) await d.tap(at)
          await d.wait(1200)
        }
      },
    },
    {
      name: 'afternoon-returns',
      run: async (d) => {
        // The folk are carried home one after the other, the dragon first, and the castle turns back into blocks.
        await tapAt(d, [BELL.x, BELL.y, BELL.z], 0)
        await d.wait(4800)
      },
    },
    {
      name: 'tall-evening',
      run: async (d) => {
        // The tallest pile as a castle, the camera stepped back, found as it was left.
        await startFrom(d, saved(TALL, true))
        await d.wait(2500)
        await tapAt(d, place(4, 2, 0.4, 2), 4200)
        // The top long one, with three cubes standing on it: its boards lie whole where nothing stands and their
        // ends stick out from under the cubes, they rattle, and the king crosses over the cubes.
        await tapAt(d, place(1, 1, 1.4), 5200)
      },
    },
    {
      name: 'basket-tipped',
      run: async (d) => {
        await startFrom(d, saved(CASTLE))
        await d.wait(800)
        // The wicker of its rug side, pulled toward the rug: it tips, the blocks in it duck down, the blocks of the rug
        // are lifted over one at a time and dropped in at its mouth, and it rocks upright.
        const from = await world(d, WICKER)
        await d.drag(from, [from[0] - 0.12, from[1]], 500)
        await d.wait(5200)
      },
    },
    {
      name: 'hemmed-pull',
      run: async (d) => {
        await startFrom(d, saved(HEMMED))
        await d.wait(1200)
        // The lower cube by its front face, over the long one that lies in front of it: it comes up with the cube
        // that stands on it, goes out over the long one, and the other drops. Carried to the open rug and set down.
        await d.drag(await world(d, [GRID_X + 2, 0.75, 0.43]), await world(d, place(1, 1, 0.2)), 900)
        await d.wait(1600)
      },
    },
    {
      name: 'tower-visit',
      run: async (d) => {
        await startFrom(d, saved(VISIT, true))
        await d.wait(2500)
        // The free tower: its roof goes straight up, the cook is carried in under it, looks out, and is carried
        // back to his window, and the roof comes down.
        await tapAt(d, place(1, 1, 1.2), 4500)
      },
    },
    {
      name: 'springboard',
      run: async (d) => {
        await startFrom(d, saved(SPRING, true))
        // The cook in the open, frowning into his pot, and the dragon under the board.
        await d.wait(2500)
        // The king is set down on the near end: it dips, throws him up, he crosses over the dragon, who puffs his
        // smoke at the first step, and the far end dips and throws him too.
        await tapAt(d, place(2, 1, 1.3, 3), 6500)
      },
    },
    {
      name: 'room-up-high',
      run: async (d) => {
        await startFrom(d, saved(HIGH))
        await d.wait(800)
        await tapAt(d, [BELL.x, BELL.y, BELL.z], 0)
        // The cook goes up to his room with his eyes shut and his pot on his head, and lies out over the rug.
        await d.wait(8800)
        const cook = await d.find('cook-nut')
        if (cook) await d.tap(cook)
        await d.wait(1200)
        await tapAt(d, place(3, 1, 2.0), 1500)
      },
    },
    {
      name: 'open-air',
      run: async (d) => {
        await startFrom(d, saved(OPEN, true))
        await d.wait(2500)
        // The king comes down from the tip of the pole, crosses the bridge over the dragon, and goes back up.
        await tapAt(d, place(1, 1, 1.8, 3), 5500)
        // The flag of the pole he sits on: it runs down and up, and he stretches up tall over it, wobbling on the tip.
        await tapAt(d, place(5, 0, 2.6), 2400)
        const king = await d.find('king-nut')
        if (king) await d.tap(king)
        await d.wait(1200)
      },
    },
    {
      name: 'nod-and-dust',
      run: async (d) => {
        await startFrom(d, saved(PAIR))
        await d.wait(1000)
        // A slope out of the basket across the two cubes: heel first, then its toe nods. A long one laid on the
        // bare rug in front of them: one end, then the other.
        await d.drag(await world(d, OFFER.slope), await world(d, place(2, 1, 1.3, 2)), 900)
        await d.wait(1800)
        await d.drag(await world(d, OFFER.long), await world(d, place(3, 2, 0.3, 3)), 900)
        await d.wait(1500)
        // A second slope pointed at the cube that stands alone. In that column a slope faces left, so the place
        // under the finger is its heel: it sits with its heel on the cube and its toe out over the bare rug, and nods.
        await d.drag(await world(d, OFFER.slope), await world(d, place(1, 2, 1.3)), 900)
        await d.wait(1800)
        // Evening falls on it: the ladder drops at the heel that is on the cube, and the slide is tapped.
        await tapAt(d, [BELL.x, BELL.y, BELL.z], 0)
        await d.wait(8800)
        await tapAt(d, place(1, 2, 1.7), 5000)
      },
    },
    {
      name: 'built-over',
      run: async (d) => {
        await startFrom(d, saved(OVER, true))
        await d.wait(2500)
        // The cook's room, with a tower built over it: the light clicks, his spoon clangs, and he grins and stirs fast.
        await tapAt(d, place(2, 1, 0.5), 1800)
      },
    },
  ],
  allow: [
    // --- One of the folk is one figure of several parts, and each part meets the next where it grows from it. The
    // --- caps are the deepest seen in the one run so far, with room for a deeper blink or wobble. A lid is a
    // --- closed skin since the eighth run, so what is measured between it and the nut is how far the skin is in
    // --- the conker behind the eye (0.27 of the lids at most over every pose, held in `drawn.test.ts`), and the
    // --- king's cap came down from 1.4 with it. The dragon's two lids are the same skin since the ninth run; his
    // --- rules are as they were.
    { a: 'king-(nut|face)', b: 'king-(lids|pupils)', kind: 'pose', upTo: 0.7, reason: FACE },
    { a: 'king-lids', b: 'king-pupils', kind: 'pose', upTo: 0.5, reason: FACE },
    { a: 'king-nut', b: 'king-face', kind: 'pose', upTo: 0.25, reason: "the king's face is the pale scar of the conker he is" },
    { a: 'king-crown', b: 'king-(nut|face|lids)', kind: 'pose', upTo: 0.7, reason: "the king's crown is too big for him: it sits down over his head, and slips over his eyes when it drops" },
    { a: 'king-cushion', b: 'king-(nut|face)', kind: 'pose', upTo: 0.9, reason: 'in the evening the king sits on his cushion, and sinks into it when he is poked' },
    { a: 'king-arms', b: 'king-(nut|cushion)', kind: 'pose', upTo: 0.35, reason: "the king's two twig arms grow from his sides and hold his cushion up" },
    { a: 'cook-(nut|cap)', b: 'cook-(lids|pupils|brows)', kind: 'pose', upTo: 1.8, reason: FACE },
    { a: 'cook-lids', b: 'cook-pupils', kind: 'pose', upTo: 0.7, reason: FACE },
    { a: 'cook-nut', b: 'cook-cap', kind: 'pose', upTo: 0.5, reason: "the cook's cap is the cup of the acorn he is: it sits on his head and bobs when he is poked" },
    { a: 'cook-spoon', b: 'cook-(nut|lids|cap)', kind: 'pose', upTo: 1.8, reason: 'the spoon goes round the pot between his two arms, and its thin handle passes in front of his eyes and under the brim of his cap' },
    { a: 'dragon-head', b: 'dragon-(lid|pupils|jaw)', kind: 'pose', upTo: 1.5, reason: FACE },
    { a: 'dragon-lid', b: 'dragon-pupils', kind: 'pose', upTo: 0.5, reason: FACE },
    { a: 'dragon-pillow', b: 'dragon-jaw', kind: 'pose', upTo: 0.5, reason: 'the dragon rests his chin on his pillow' },
    { a: 'dragon-rings', b: 'dragon-rings', kind: 'penetration', upTo: 0.4, reason: 'his body is a pine cone: each ring of scales lies over the gaps of the ring behind it' },
    { a: 'dragon-rings', b: 'dragon-(head|lid|jaw|pupils|pillow|tail)', kind: 'penetration', upTo: 0.4, reason: 'his head, his tail and the pillow under his chin join the first and last rings of his scales, and he pulls his head in among them' },
    { a: 'dragon-rings', b: 'dragon-(head|lid|jaw|pupils)', upTo: 1.05, reason: 'with a gate coming down on him he pulls his head back in under his first rings of scales, as a cone shuts, and his eyes and their lids go in with it: tucked in, most of his head is inside those rings, which cover it (90% of a lid in the second run, before he was given further to pull it; the cap is the whole of a part and is not a measured depth)' },
    { a: 'bell-stand', b: 'bell-brass', kind: 'pose', upTo: 0.4, reason: 'the bell hangs from the fork of its branch and swings on it' },
    // --- Where one thing is meant to be in or on another.
    { a: 'basket-weave', b: 'blocks-long', kind: 'penetration', upTo: 0.7, reason: 'the long block lies on the bed of the basket between its walls, below the rim. The basket is an open tray, and the audit reads what lies in it as sunk in it (52% in the first run, 61% in the second); in the close-up it touches nothing' },
    { a: 'room>(floor|rug)', b: 'dragon-rings', kind: 'penetration', upTo: 0.25, reason: 'the dragon lies on the boards, and in the evening on the rug, with the scales under his belly pressed flat (up to 15% of a ring in the first run and 17% in the second), where he covers them' },
    { a: 'blocks-cube', b: 'cook-cap', kind: 'penetration', upTo: 0.7, reason: 'the cook lies beside his room with the crown of his cap in at its side window' },
    { a: 'cook-(cap|nut)', b: 'dress-lights', upTo: 1.05, reason: 'the lit pane of that side window is where his cap goes in: the pane is inside the cap, and his head rocks against it when he is poked' },
    { a: 'cook-cap', b: 'dress-wood', kind: 'penetration', upTo: 0.9, reason: 'the crown of his cap, in at the side window, reaches the back of the thin shutter beside it (75% of the shutter, which is three hundredths thick)' },
    { a: 'king-cushion', b: 'blocks-', kind: 'penetration', upTo: 0.3, reason: 'the king sets his cushion down on the top of his seat and presses it on (16% on the tip of a pole in the one run)' },
    { a: 'king-(cushion|nut)', b: 'dress-wood', kind: 'penetration', upTo: 0.2, reason: 'the wood of the castle is one piece to the audit, so this holds two things: on a pole the flag flies just under his cushion and he brushes its top edge when he bounces (10% in the first run), and on a bridge he presses his cushion on its boards as on any seat, tipped with the board where it bends (17% in the sixth run; the 35% of that run and the 24% of the seventh were faults, fixed: see REFINEMENT.md)' },
    { a: 'blocks-thin', b: 'dress-wood', kind: 'penetration', upTo: 0.4, reason: 'the flag is tied to its pole, and its near edge turns into the pole as it flies' },
    { a: 'blocks-slope', b: '(king|cook)-(nut|cushion|pot)', kind: 'penetration', upTo: 0.2, reason: 'one of them riding a slide sits on its face and presses into it (12% in the one run)' },
  ],
} satisfies GameAudit
