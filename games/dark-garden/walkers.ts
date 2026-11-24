import type { Carrier } from './cast'
import { APPLE } from './cast'
import { apple, eye, flame, line, oval, piece, shine, type G } from './glass'
import type { Pose } from './motion'

// The four who carry, in glass and lead, each about 240 units tall with its
// feet at (0, 0), turned to us with the apple held out before it.

type Look = { x: number; y: number }
export type Held = { color: string; lit: boolean; caught: number } | null

/** Where the hands hold the apple's foot. */
const HOLD: Readonly<Record<Carrier, Look>> = { gnome: { x: 62, y: -62 }, goose: { x: 66, y: -52 }, hare: { x: 58, y: -66 }, bear: { x: 66, y: -92 } }

export function walker(g: G, who: Carrier, pose: Pose, look: Look, held: Held, cheeks: number, time: number): void {
  if (who === 'gnome') gnome(g, pose, look, cheeks)
  else if (who === 'goose') goose(g, pose, look, cheeks)
  else if (who === 'hare') hare(g, pose, look, cheeks)
  else bear(g, pose, look, cheeks)
  const at = HOLD[who], up = pose.hands * -20
  if (held) {
    g.save()
    g.translate(at.x, at.y + up)
    g.rotate(pose.turn * -0.7)
    apple(g, held.color, who === 'bear' ? 0.82 : 1, held.lit, time)
    if (held.lit && held.caught < 0.5) flame(g, 0, -68, 0.5 + Math.sin((held.caught / 0.5) * Math.PI) * 0.9, time)
    g.restore()
  }
  hands(g, who, at.x, at.y + up)
}

function hands(g: G, who: Carrier, x: number, y: number): void {
  if (who === 'gnome') { oval(g, x - 24, y - 3, 15, 13, '#f2b48a', 4); oval(g, x + 24, y - 5, 14, 12, '#f2b48a', 4) }
  else if (who === 'goose') piece(g, `M${x - 62} ${y - 24} C ${x - 40} ${y - 6} ${x - 8} ${y + 6} ${x + 30} ${y - 2} C ${x + 20} ${y + 14} ${x - 30} ${y + 24} ${x - 62} ${y - 4} Z`, '#e9edf4', 5)
  else if (who === 'hare') { oval(g, x - 22, y - 4, 14, 11, '#e8cfa8', 4); oval(g, x + 22, y - 4, 14, 11, '#e8cfa8', 4) }
  else { oval(g, x - 22, y - 2, 20, 16, '#8a5a38', 5); oval(g, x + 24, y - 2, 18, 15, '#8a5a38', 5) }
}

function foot(g: G, x: number, f: { x: number; up: number }, color: string, rx: number, ry: number): void {
  oval(g, x + f.x * 20, -ry * 0.7 - f.up * 20, rx, ry, color, 5)
}

function gnome(g: G, p: Pose, look: Look, cheeks: number): void {
  foot(g, -32, p.left, '#5b3a1f', 34, 17)
  foot(g, 34, p.right, '#6d4726', 34, 17)
  // A fat belly in blue, a wide belt, and sleeves that reach for the apple.
  piece(g, 'M-78 -26 C -98 -92 -58 -138 0 -138 C 58 -138 98 -92 78 -26 C 50 -10 -50 -10 -78 -26 Z', '#2f6fc0', 6)
  piece(g, 'M-84 -58 C -50 -40 50 -40 84 -58 L82 -36 C 50 -20 -50 -20 -82 -36 Z', '#7a4a22', 5)
  piece(g, 'M-14 -46 L14 -46 L14 -24 L-14 -24 Z', '#f4c84a', 4)
  shine(g, -44, -92, 12, 26, 0.3, 0.35)
  piece(g, 'M46 -120 C 78 -116 92 -96 84 -76 C 70 -66 52 -74 48 -90 Z', '#2861ab', 5)
  piece(g, 'M-58 -118 C -86 -102 -64 -70 -22 -62 C 4 -58 30 -58 40 -64 L38 -82 C 6 -82 -26 -92 -42 -110 Z', '#3a7fd0', 5)
  // Beard, face, the nose, and a hat with a mind of its own.
  piece(g, 'M-62 -164 C -78 -118 -42 -84 -6 -76 C 34 -84 74 -120 60 -164 Z', '#f4efe0', 6)
  line(g, 'M-34 -140 C -32 -118 -20 -102 -8 -92 M30 -140 C 28 -120 18 -106 8 -96', 3.5)
  piece(g, 'M-58 -168 C -60 -222 60 -222 58 -168 C 56 -142 -56 -142 -58 -168 Z', '#f2b48a', 5)
  oval(g, -44, -154, 17 + cheeks * 16, 12 + cheeks * 14, '#e98268', 4)
  oval(g, 44, -154, 17 + cheeks * 16, 12 + cheeks * 14, '#e98268', 4)
  if (cheeks > 0.2) oval(g, 4, -138, 9, 7, '#a8443a', 4)
  else if (p.mouth > 0.1) oval(g, 4, -138, 13, 6 + p.mouth * 12, '#7a2230', 4)
  else line(g, 'M-16 -139 C -6 -130 14 -130 24 -139', 4)
  eye(g, -23, -179, 14, p.eyes, look)
  eye(g, 27, -179, 14, p.eyes, look)
  oval(g, 3, -158, 22, 18, '#f09a76', 5)
  shine(g, -4, -164, 7, 5, 0, 0.6)
  g.save()
  g.translate(0, -200)
  g.rotate(p.part * 0.06)
  piece(g, 'M-72 2 C -56 -40 -28 -78 34 -96 C 60 -102 84 -82 80 -62 C 66 -74 52 -68 50 -54 C 58 -34 66 -16 72 2 C 40 -16 -40 -16 -72 2 Z', '#d93a30', 6)
  piece(g, 'M-76 4 C -40 -20 40 -20 76 4 C 80 18 72 22 66 20 C 36 4 -36 4 -66 20 C -74 22 -80 16 -76 4 Z', '#f0604c', 5)
  shine(g, -24, -40, 8, 24, 0.8, 0.4)
  oval(g, 84, -58, 14, 14, '#f7e6b4', 4)
  g.restore()
}

function goose(g: G, p: Pose, look: Look, cheeks: number): void {
  for (const [x, f] of [[-20, p.left], [26, p.right]] as const) piece(g, `M${x + f.x * 18 - 4} ${-38} L${x + f.x * 18 + 6} ${-38} L${x + f.x * 20 + 8} ${-10 - f.up * 18} L${x + f.x * 20 + 34} ${-f.up * 18} L${x + f.x * 20 - 20} ${-f.up * 18} L${x + f.x * 20 - 2} ${-10 - f.up * 18} Z`, '#f2902c', 4)
  piece(g, 'M-96 -112 C -104 -130 -86 -134 -74 -120 C -50 -130 -20 -132 10 -128 C 64 -120 88 -84 70 -48 C 50 -20 -20 -18 -56 -46 C -80 -62 -84 -90 -96 -112 Z', '#f4f3ee', 6)
  piece(g, 'M-78 -98 C -50 -112 -8 -106 12 -84 C 0 -56 -34 -48 -56 -60 C -70 -70 -76 -86 -78 -98 Z', '#d7deea', 5)
  line(g, 'M-58 -82 C -40 -78 -22 -74 -6 -76 M-46 -66 C -34 -64 -20 -62 -10 -64', 3.5)
  const neck = p.part * 5
  // A long neck that shoots up when it is spoken to.
  piece(g, `M22 -118 C 6 -150 10 -178 24 ${-198 - neck} L62 ${-196 - neck} C 58 -176 60 -150 70 -108 C 56 -92 34 -98 22 -118 Z`, '#f4f3ee', 6)
  piece(g, 'M14 -132 C 30 -120 58 -118 72 -126 L72 -104 C 52 -92 26 -98 10 -112 Z', '#c23a62', 5)
  piece(g, 'M18 -112 L-6 -78 L18 -74 L34 -106 Z', '#d9527a', 4)
  g.save()
  g.translate(44, -206 - neck)
  oval(g, 0, 0, 34, 30, '#f9f8f3', 6)
  const open = Math.min(1, p.mouth)
  if (open > 0.1) piece(g, 'M22 6 C 44 10 60 20 66 28 C 48 30 30 24 18 16 Z', '#d9731c', 4)
  piece(g, 'M24 -10 C 46 -12 66 -4 74 6 C 54 14 36 14 22 8 Z', '#f2902c', 5)
  if (cheeks > 0.2) { oval(g, 16, 12, 12 + cheeks * 14, 11 + cheeks * 11, '#f4c0b8', 4) }
  eye(g, 6, -8, 11, p.eyes, look)
  // A bonnet, tied on.
  piece(g, 'M-34 4 C -44 -40 -6 -56 22 -36 C 8 -30 -6 -16 -6 6 C -14 14 -28 14 -34 4 Z', '#5fae6a', 5)
  piece(g, 'M22 -38 C 30 -34 32 -24 28 -18 C 10 -18 2 -4 0 14 C -8 14 -10 8 -8 2 C -8 -20 4 -34 22 -38 Z', '#f7e6b4', 4)
  g.restore()
}

function hare(g: G, p: Pose, look: Look, cheeks: number): void {
  foot(g, -28, p.left, '#d9b98a', 36, 15)
  foot(g, 30, p.right, '#e3c596', 36, 15)
  oval(g, -54, -44, 18, 18, '#fbf3e0', 5)
  piece(g, 'M-50 -18 C -66 -70 -42 -122 0 -122 C 42 -122 66 -70 50 -18 C 30 -6 -30 -6 -50 -18 Z', '#d2a86e', 6)
  piece(g, 'M-28 -16 C -34 -56 -22 -86 0 -88 C 24 -86 34 -56 28 -16 C 14 -10 -14 -10 -28 -16 Z', '#f7ead0', 5)
  // A waistcoat the colour of leaves.
  piece(g, 'M-50 -30 C -60 -72 -44 -112 -14 -120 C -6 -96 -18 -60 -22 -20 C -32 -20 -44 -24 -50 -30 Z', '#57984a', 5)
  piece(g, 'M50 -30 C 60 -72 44 -112 14 -120 C 6 -96 18 -60 22 -20 C 32 -20 44 -24 50 -30 Z', '#6aae58', 5)
  piece(g, 'M-40 -104 C -58 -88 -40 -66 20 -62 L44 -66 L42 -80 C 12 -80 -14 -90 -24 -104 Z', '#d2a86e', 5)
  for (const [x, side] of [[-20, -1], [20, 1]] as const) {
    g.save()
    g.translate(x, -172)
    g.rotate(side * (0.16 + p.part * -0.07) + (side < 0 ? p.part * 0.03 : 0))
    piece(g, 'M-14 4 C -24 -40 -18 -84 0 -98 C 18 -84 24 -40 14 4 Z', '#d2a86e', 5)
    piece(g, 'M-6 -4 C -12 -36 -8 -64 0 -76 C 8 -64 12 -36 6 -4 Z', '#f0a8a0', 3.5)
    g.restore()
  }
  piece(g, 'M-46 -138 C -50 -172 -26 -188 0 -188 C 28 -188 50 -172 46 -138 C 42 -112 -42 -112 -46 -138 Z', '#deb87e', 6)
  oval(g, -24, -130, 18 + cheeks * 14, 14 + cheeks * 13, '#f7ead0', 4)
  oval(g, 24, -130, 18 + cheeks * 14, 14 + cheeks * 13, '#f7ead0', 4)
  piece(g, 'M-12 -116 L-1 -116 L-1 -102 L-11 -102 Z', '#ffffff', 3)
  piece(g, 'M1 -116 L12 -116 L11 -102 L1 -102 Z', '#ffffff', 3)
  oval(g, 0, -142, 9, 7, '#d9566a', 4)
  if (p.mouth > 0.1 || cheeks > 0.2) oval(g, 0, -118, 8, 8, '#7a2230', 4)
  eye(g, -22, -156, 15, p.eyes, look, 0.5)
  eye(g, 22, -156, 15, p.eyes, look, 0.5)
}

function bear(g: G, p: Pose, look: Look, cheeks: number): void {
  foot(g, -46, p.left, '#6e4528', 32, 20)
  foot(g, 46, p.right, '#7a4e2e', 32, 20)
  piece(g, 'M-92 -20 C -120 -100 -84 -172 0 -172 C 84 -172 120 -100 92 -20 C 60 0 -60 0 -92 -20 Z', '#7d5232', 6)
  piece(g, 'M-58 -16 C -74 -70 -46 -112 0 -112 C 46 -112 74 -70 58 -16 C 34 -6 -34 -6 -58 -16 Z', '#c99a62', 5)
  shine(g, -62, -110, 14, 30, 0.3, 0.3)
  // A long striped scarf.
  piece(g, 'M-72 -168 C -36 -144 36 -144 72 -168 L74 -142 C 40 -122 -40 -122 -74 -142 Z', '#d95a8e', 5)
  piece(g, 'M-60 -138 L-30 -130 L-38 -72 L-66 -76 Z', '#e682aa', 5)
  line(g, 'M-63 -112 L-34 -108 M-65 -94 L-37 -90', 4)
  piece(g, 'M-84 -136 C -110 -110 -70 -78 18 -84 L48 -92 L44 -112 C 6 -106 -46 -114 -62 -138 Z', '#8a5a38', 5)
  piece(g, 'M84 -138 C 104 -118 102 -94 84 -84 L66 -96 C 74 -108 72 -120 64 -132 Z', '#8a5a38', 5)
  for (const x of [-52, 52]) { oval(g, x, -234, 22, 22, '#7d5232', 5); oval(g, x, -232, 11, 11, '#c99a62', 3.5) }
  piece(g, 'M-72 -184 C -76 -232 -40 -250 0 -250 C 42 -250 76 -232 72 -184 C 66 -148 -66 -148 -72 -184 Z', '#8a5a38', 6)
  oval(g, -44, -178, 14 + cheeks * 18, 12 + cheeks * 16, '#b06a52', 4)
  oval(g, 44, -178, 14 + cheeks * 18, 12 + cheeks * 16, '#b06a52', 4)
  oval(g, 0, -182, 34, 25, '#d9b07a', 5)
  oval(g, 0, -194, 14, 10, '#2a1a1c', 4)
  if (p.mouth > 0.1) oval(g, 0, -172, 12 + p.mouth * 8, 5 + p.mouth * 14, '#7a2230', 4)
  else if (cheeks > 0.2) oval(g, 0, -172, 8, 7, '#7a2230', 4)
  else line(g, 'M0 -184 L0 -176 M-14 -174 C -8 -168 8 -168 14 -174', 4)
  eye(g, -28, -212, 12, p.eyes, look)
  eye(g, 28, -212, 12, p.eyes, look)
  // A nightcap much too small.
  piece(g, 'M-24 -246 C -20 -276 10 -288 44 -270 C 38 -262 26 -262 24 -246 C 10 -254 -10 -254 -24 -246 Z', '#4f7fc9', 5)
  oval(g, 48, -268, 10, 10, '#f7e6b4', 4)
}

export const colorOf = (who: Carrier) => APPLE[who]
