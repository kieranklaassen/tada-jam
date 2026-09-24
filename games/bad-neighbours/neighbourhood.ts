import { FLOOR, cellsFor, type Piece } from './model';

export type PropKind = 'book' | 'plant' | 'sock' | 'paper' | 'resident';
export interface StreetProp { kind: PropKind; x: number; y: number; vx: number; vy: number; angle: number; spin: number; age: number; lifetime: number; bounces: number; color: string; }
export const MAX_PROPS = 72;
/** Seconds a prop that has come to rest on the deck has left: the renderer's fade-out, the last half second of a prop's life. */
export const SETTLED_FADE = .5;
/** Each thrown prop's outline about its centre, as `Renderer` paints it: the rectangles the deck holds it up by. */
export const PROP_OUTLINES: Record<Exclude<PropKind, 'resident'>, readonly (readonly [number, number, number, number])[]> = {
  book: [[-4, -3, 8, 6]],
  plant: [[-3, -1, 6, 5], [-1, -9, 1.5, 8], [-4, -8, 4, 2], [0, -6, 4, 2]],
  sock: [[-2, -5, 4, 7], [-2, 0, 7, 3]],
  paper: [[-3, -4, 6, 8]],
};
/** The slab's depth below the deck, as the model builds it and the renderer paints it. */
const SLAB_DEPTH = 38;
type ThrownKind = Exclude<PropKind, 'resident'>;
/** Each outline rectangle's corners in order round it, as x, y pairs about the prop's centre. */
const CORNERS = Object.fromEntries(Object.entries(PROP_OUTLINES).map(([kind, rects]) => [kind, rects.map(([x, y, w, h]) => [x, y, x + w, y, x + w, y + h, x, y + h])])) as Record<ThrownKind, number[][]>;
/** How far a prop's outline reaches from its centre at any turn. */
const RADIUS = Object.fromEntries(Object.entries(CORNERS).map(([kind, rects]) => [kind, Math.max(...rects.flatMap(r => [0, 2, 4, 6].map(i => Math.hypot(r[i], r[i + 1]))))])) as Record<ThrownKind, number>;
/**
 * How far along (ox, oy) the part of a thrown prop's outline lying between `lo` and `hi` on x (on y
 * with `acrossY`) reaches from its centre at its current turn; −Infinity when none of it lies there.
 */
function reach(p: StreetProp, acrossY: boolean, lo: number, hi: number, ox: number, oy: number) {
  if (p.kind === 'resident') return -Infinity;
  const c = Math.cos(p.angle), s = Math.sin(p.angle);
  let far = -Infinity;
  for (const r of CORNERS[p.kind]) for (let i = 0; i < 8; i += 2) {
    const j = (i + 2) % 8;
    const ax = r[i] * c - r[i + 1] * s, ay = r[i] * s + r[i + 1] * c, bx = r[j] * c - r[j + 1] * s, by = r[j] * s + r[j + 1] * c;
    const a = acrossY ? ay : ax, b = acrossY ? by : bx;
    if (a >= lo && a <= hi) far = Math.max(far, ox * ax + oy * ay);
    for (let k = 0; k < 2; k++) {
      const edge = k ? hi : lo;
      if ((a - edge) * (b - edge) >= 0) continue;
      const t = (edge - a) / (b - a);
      far = Math.max(far, ox * (ax + t * (bx - ax)) + oy * (ay + t * (by - ay)));
    }
  }
  return far;
}
/** How far below its centre the part of a thrown prop's outline over the deck reaches. */
export const deckReach = (p: StreetProp, half: number) => reach(p, false, -half - p.x, half - p.x, 0, 1);
/** How far towards the slab the part of a thrown prop's outline level with the slab reaches. */
export const sideReach = (p: StreetProp) => reach(p, true, FLOOR - p.y, FLOOR + SLAB_DEPTH - p.y, -Math.sign(p.x), 0);
export class Neighbourhood {
  props: StreetProp[] = [];
  /** Lowered by the quality tier on slower devices. */
  maxProps = MAX_PROPS;
  reactions = new Map<number, number>();
  private previousAngles = new Map<number, number>();
  private shedAt = new Map<number, number>();
  time = 0;
  reset() { this.props = []; this.reactions.clear(); this.previousAngles.clear(); this.shedAt.clear(); this.time = 0; }
  react(piece: Piece, intensity: number) { this.reactions.set(piece.body.id, Math.max(this.reactions.get(piece.body.id) || 0, intensity)); }
  spill(piece: Piece, amount: number, rotation = false) {
    this.react(piece, rotation ? 2.2 : 1.1);
    if (this.time - (this.shedAt.get(piece.body.id) ?? -10) < .3) return;
    this.shedAt.set(piece.body.id, this.time);
    const body = piece.body, cells = cellsFor(piece.shape), c = Math.cos(body.angle), s = Math.sin(body.angle);
    for (let i = 0; i < amount && this.props.length < this.maxProps; i++) {
      const cell = cells[(i + Math.floor(this.time)) % cells.length];
      const localX = cell.x + (i % 2 ? 8 : -8), localY = cell.y;
      this.props.push({ kind: (['book', 'plant', 'sock', 'paper'] as PropKind[])[(i + body.id) % 4], x: body.position.x + localX * c - localY * s, y: body.position.y + localX * s + localY * c, vx: (i % 2 ? 1 : -1) * (25 + i * 9) + body.velocity.x * 25, vy: -45 - i * 12, angle: body.angle, spin: (i % 2 ? 1 : -1) * (2 + i), age: 0, lifetime: 3.5 + i * .12, bounces: 0, color: ['#d76749', '#e6bb62', '#e4e6d6', '#4b7190'][i % 4] });
    }
  }
  rescue(piece: Piece) {
    if (this.props.length >= this.maxProps) return;
    this.props.push({ kind: 'resident', x: piece.body.position.x, y: Math.min(piece.body.position.y - 50, FLOOR - 100), vx: piece.body.position.x > 0 ? 30 : -30, vy: 13, angle: 0, spin: 0, age: 0, lifetime: 6, bounces: 0, color: '#e8b657' });
  }
  update(delta: number, pieces: Piece[], platformWidth: number, reduced = false) {
    if (delta <= 0) return;
    const dt = Math.min(.05, Math.max(0, delta / 1000)); this.time += dt;
    const live = new Set(pieces.map(p => p.body.id));
    for (const [id, value] of this.reactions) { if (!live.has(id) || value <= dt) this.reactions.delete(id); else this.reactions.set(id, value - dt); }
    for (const piece of pieces) {
      const prior = this.previousAngles.get(piece.body.id) ?? piece.body.angle;
      if (!reduced && piece.landed && Math.abs(piece.body.angle - prior) > .08 && this.time - (this.shedAt.get(piece.body.id) ?? -10) > 1.8) this.spill(piece, 2);
      this.previousAngles.set(piece.body.id, piece.body.angle);
    }
    for (const id of this.previousAngles.keys()) if (!live.has(id)) { this.previousAngles.delete(id); this.shedAt.delete(id); }
    for (const id of this.shedAt.keys()) if (!live.has(id)) this.shedAt.delete(id);
    const half = platformWidth / 2;
    for (const p of this.props) {
      p.age += dt;
      const radius = p.kind === 'resident' ? 0 : RADIUS[p.kind];
      // Only a prop that is above the deck can land on it; one beside or below the slab falls past.
      const reach = p.y + radius > FLOOR ? deckReach(p, half) : -Infinity;
      const above = reach === -Infinity ? p.y < FLOOR : p.y + reach <= FLOOR + 1e-9;
      if (p.kind === 'resident') { p.vy = Math.min(27, p.vy + 15 * dt); p.x += (p.vx + Math.sin(p.age * 3) * 12) * dt; }
      else { p.vy += 220 * dt; p.x += p.vx * dt; p.angle += p.spin * dt; }
      p.y += p.vy * dt;
      if (p.kind === 'resident' || p.y + radius <= FLOOR || Math.abs(p.x) - radius >= half) continue;
      if (!above) {
        // The slab's side holds off a prop falling beside it.
        const inward = sideReach(p), side = Math.sign(p.x);
        if (Math.abs(p.x) >= half && inward > Math.abs(p.x) - half) { p.x = side * (half + inward); p.vx = side * Math.max(0, side * p.vx); }
        continue;
      }
      // The deck holds a prop up by the part of its outline over it. One hanging past the edge
      // tips off; one on the deck bounces twice, then lies where it landed and fades straight away,
      // so the deck never fills up with them.
      const rest = FLOOR - deckReach(p, half);
      if (p.y < rest) continue;
      p.y = rest;
      if (Math.abs(p.x) >= half) { p.vy = 0; p.vx = Math.sign(p.x) * Math.max(Math.abs(p.vx), 20); continue; }
      if (p.vy <= 0) continue;
      if (p.bounces < 2) { p.vy = -Math.abs(p.vy) * .28; p.vx *= .65; p.bounces++; }
      else { p.vy = 0; p.vx = 0; p.spin = 0; p.lifetime = Math.min(p.lifetime, p.age + SETTLED_FADE); }
    }
    this.props = this.props.filter(p => p.age < p.lifetime && p.y < FLOOR + 240 && Math.abs(p.x) < 600);
  }
}
