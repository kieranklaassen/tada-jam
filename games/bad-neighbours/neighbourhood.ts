import { FLOOR, cellsFor, type Piece } from './model';

export type PropKind = 'book' | 'plant' | 'sock' | 'paper' | 'resident';
export interface StreetProp { kind: PropKind; x: number; y: number; vx: number; vy: number; angle: number; spin: number; age: number; lifetime: number; bounces: number; color: string; }
export const MAX_PROPS = 72;
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
    for (const p of this.props) {
      p.age += dt;
      if (p.kind === 'resident') { p.vy = Math.min(27, p.vy + 15 * dt); p.x += (p.vx + Math.sin(p.age * 3) * 12) * dt; }
      else { p.vy += 220 * dt; p.x += p.vx * dt; p.angle += p.spin * dt; }
      const before = p.y; p.y += p.vy * dt;
      if (p.kind !== 'resident' && before < FLOOR - 2 && p.y >= FLOOR - 2 && Math.abs(p.x) < platformWidth / 2 && p.bounces < 2) { p.y = FLOOR - 2; p.vy = -Math.abs(p.vy) * .28; p.vx *= .65; p.bounces++; }
    }
    this.props = this.props.filter(p => p.age < p.lifetime && p.y < FLOOR + 240 && Math.abs(p.x) < 600);
  }
}
