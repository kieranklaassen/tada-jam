import { CELL, BUILDINGS, cellsFor, type Shape } from './model';

export type Context = CanvasRenderingContext2D;
export const SPRITE_WIDTH = 170;
export const SPRITE_HEIGHT = 135;
export const SPRITE_X = 85;
export const SPRITE_Y = 65;
const outlines = new Map<Shape, Path2D>();
const windows = new Map<Shape, { x: number; y: number; width: number; height: number }[]>();

export function silhouetteFor(shape: Shape) {
  if (outlines.has(shape)) return outlines.get(shape)!;
  const path = new Path2D();
  for (const p of cellsFor(shape)) path.rect(p.x - CELL / 2, p.y - CELL / 2, CELL, CELL);
  outlines.set(shape, path);
  return path;
}

export function windowFor(shape: Shape, index: number) {
  if (!windows.has(shape)) windows.set(shape, cellsFor(shape).map(p => ({ x: p.x - 7, y: p.y - 9, width: 14, height: 20 })));
  return windows.get(shape)![index];
}

function plant(ctx: Context, x: number, y: number, size = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  ctx.fillStyle = '#bd6745'; ctx.fillRect(-2.5, -3, 5, 3);
  ctx.fillStyle = '#365f47'; ctx.fillRect(-.5, -10, 1, 7);
  ctx.fillRect(-3.5, -9, 3, 2); ctx.fillRect(.5, -7, 3, 2); ctx.fillRect(-2.5, -6, 2, 2); ctx.restore();
}

export function buildingSprite(shape: Shape): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = SPRITE_WIDTH * 2; canvas.height = SPRITE_HEIGHT * 2;
  const ctx = canvas.getContext('2d')!; ctx.scale(2, 2); ctx.translate(SPRITE_X, SPRITE_Y);
  const palette = BUILDINGS[shape], cells = cellsFor(shape), outline = silhouetteFor(shape);
  ctx.save(); ctx.clip(outline);
  ctx.fillStyle = palette.main; ctx.fill(outline);
  // Brick, plaster, and cornices live inside the exact physical footprint.
  cells.forEach((p, index) => {
    const x = p.x - 16, y = p.y - 16;
    ctx.fillStyle = palette.light; ctx.globalAlpha = .32;
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
      const bx = x + col * 8 + (row % 2) * 4;
      ctx.fillRect(bx, y + row * 5, 6.5, .5);
      if ((row + col + index) % 3 === 0) ctx.fillRect(bx, y + row * 5, .5, 3.5);
    }
    ctx.globalAlpha = 1;
    const win = windowFor(shape, index);
    ctx.fillStyle = palette.dark; ctx.fillRect(win.x - 2, win.y - 2, 18, 25);
    ctx.fillStyle = '#eeddbc'; ctx.fillRect(win.x - 1, win.y - 1, 16, 22);
    ctx.fillStyle = index % 3 === 0 ? '#e6b369' : '#354656'; ctx.fillRect(win.x, win.y, 14, 20);
    ctx.fillStyle = index % 3 === 0 ? '#edc385' : '#536b76'; ctx.fillRect(win.x + 1, win.y + 1, 12, 18);
    // Wallpaper, sill, shutters, and an inset balcony; nothing extends the hitbox.
    ctx.fillStyle = '#172e42'; ctx.globalAlpha = .35; ctx.fillRect(win.x + 1, win.y + 13, 12, 6); ctx.globalAlpha = 1;
    ctx.fillStyle = '#ead8b2'; ctx.fillRect(win.x - 2, win.y + 20, 18, 1.5); ctx.fillStyle = palette.dark; ctx.fillRect(win.x - 2, win.y + 22, 18, 1);
    if (index % 2 === 0) {
      ctx.fillStyle = palette.dark; ctx.fillRect(win.x - 5, win.y, 3, 20); ctx.fillRect(win.x + 16, win.y, 3, 20);
      ctx.fillStyle = palette.light;
      for (let sy = 1; sy < 20; sy += 3) { ctx.fillRect(win.x - 4.5, win.y + sy, 2, .5); ctx.fillRect(win.x + 16.5, win.y + sy, 2, .5); }
    } else {
      ctx.fillStyle = '#233546'; ctx.fillRect(win.x - 3, win.y + 15, 20, 1);
      for (let sx = -2; sx < 18; sx += 3) ctx.fillRect(win.x + sx, win.y + 15, .7, 5);
    }
    if (index === 1 || shape === 'I') plant(ctx, win.x + 11, win.y + 20, .7);
    if (index === 3) {
      // A small air conditioner is inset into the wall.
      ctx.fillStyle = '#b9b9aa'; ctx.fillRect(x + 2, y + 24, 6, 5); ctx.fillStyle = '#5c6970';
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 3, y + 25 + k, 4, .45);
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      if (cells.some(q => q.x === p.x + dx * CELL && q.y === p.y + dy * CELL)) continue;
      if (dy === -1) { ctx.fillStyle = '#293c4a'; ctx.fillRect(x, y, 32, 1); ctx.fillStyle = palette.light; ctx.fillRect(x, y + 1, 32, 2); ctx.fillStyle = palette.dark; ctx.fillRect(x, y + 3, 32, 1); }
      if (dy === 1) { ctx.fillStyle = palette.dark; ctx.fillRect(x, y + 30, 32, 2); ctx.fillStyle = palette.light; ctx.fillRect(x, y + 29, 32, 1); }
      if (dx) { ctx.fillStyle = palette.dark; ctx.fillRect(p.x + dx * 16 - (dx > 0 ? 1 : 0), y, 1, 32); }
    }
    // The same little wall lamp by every window: a home marker that counts nothing.
    ctx.fillStyle = '#263c4b'; ctx.fillRect(x + 2.5, y + 6, 0.8, 3); ctx.fillRect(x + 2.5, y + 6, 2.5, 0.8);
    ctx.fillStyle = '#f3cf7d'; ctx.fillRect(x + 3.6, y + 6.8, 2, 2.6);
  });
  ctx.restore(); return canvas;
}

export function pixelPerson(ctx: Context, x: number, y: number, phase: number, shirt = '#e8ba55', worried = false, size = 1) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(size, size);
  const step = Math.sin(phase) > 0 ? 1 : -1;
  ctx.fillStyle = '#242e38'; ctx.fillRect(-1.5, -8, 3, 2);
  ctx.fillStyle = '#d49b73'; ctx.fillRect(-1.5, -6.5, 3, 2.5);
  ctx.fillStyle = shirt; ctx.fillRect(-2, -4, 4, 4);
  ctx.fillStyle = '#283a49'; ctx.fillRect(-1.5, 0, 1.5, 2 + (worried ? 0 : step * .5)); ctx.fillRect(.5, 0, 1.5, 2 - (worried ? 0 : step * .5));
  ctx.strokeStyle = shirt; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(-2, -3); ctx.lineTo(-3.5, worried ? -6 : -1 + step); ctx.moveTo(2, -3); ctx.lineTo(3.5, worried ? -6 : -1 - step); ctx.stroke();
  ctx.restore();
}

/** Animated details are separately clipped so characters cannot fake a solid edge. */
export function drawResidents(ctx: Context, shape: Shape, time: number, identity: number, reaction = 0) {
  ctx.save(); ctx.clip(silhouetteFor(shape));
  for (let i = 0; i < 4; i++) {
    const win = windowFor(shape, i), phase = time * .85 + identity * 1.7 + i * 2.4;
    ctx.save(); ctx.beginPath(); ctx.rect(win.x, win.y, win.width, win.height); ctx.clip();
    const lit = Math.sin(time * .17 + i * 2 + identity) > -.3;
    ctx.fillStyle = lit ? '#ffce75' : '#28414f'; ctx.globalAlpha = lit ? .2 : .32; ctx.fillRect(win.x, win.y, win.width, win.height); ctx.globalAlpha = 1;
    if (shape === 'T' && i === 2) {
      // The laundromat's washer has a visible spinning drum.
      ctx.fillStyle = '#b8c7c0'; ctx.fillRect(win.x + 2, win.y + 9, 10, 10);
      ctx.save(); ctx.translate(win.x + 7, win.y + 14); ctx.rotate(time * 2); ctx.strokeStyle = '#466176'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 3, .2, 5); ctx.stroke(); ctx.restore();
    } else if (i !== 1 || identity % 2 === 0) {
      const walking = Math.sin(phase) * 2.3;
      pixelPerson(ctx, win.x + 7 + walking, win.y + 17, phase * 3, ['#f2d47d', '#df785c', '#a6c7c1', '#f3eee0'][(identity + i) % 4], reaction > .1);
    }
    if ((identity + i) % 4 === 1) {
      // A curtain slides shut occasionally, and quickly during a big wobble.
      const curtain = reaction > .5 ? .7 : Math.max(0, Math.sin(phase * .27) - .6) * 1.5;
      ctx.fillStyle = '#d7b9a0'; ctx.fillRect(win.x, win.y, 2 + 9 * curtain, win.height);
      ctx.fillStyle = '#af8975'; ctx.fillRect(win.x + 1, win.y, .5, win.height);
    }
    ctx.restore();
    ctx.fillStyle = '#d7d0b6'; ctx.fillRect(win.x + 6.5, win.y, .65, 9); ctx.fillRect(win.x, win.y + 8, 14, .65);
    if (shape === 'O' && i === 3) {
      // The café has a striped awning, a counter, and a steaming cup.
      for (let stripe = 0; stripe < 7; stripe++) { ctx.fillStyle = stripe % 2 ? '#efdfb9' : '#b95543'; ctx.fillRect(win.x + stripe * 2, win.y, 2, 4); }
      ctx.fillStyle = '#b68251'; ctx.fillRect(win.x, win.y + 17, 14, 3);
      ctx.fillStyle = '#f6ead4'; ctx.fillRect(win.x + 3, win.y + 14, 3, 3);
      ctx.globalAlpha = .35; ctx.fillRect(win.x + 4 + Math.sin(time * 2), win.y + 10, .8, 2); ctx.globalAlpha = 1;
    }
    if (shape === 'Z' && i === 1) {
      // Late-night television flickers behind the curtains.
      ctx.fillStyle = '#233744'; ctx.fillRect(win.x + 5, win.y + 11, 8, 6);
      ctx.fillStyle = Math.sin(time * 1.6) > 0 ? '#94bcd3' : '#c4998e'; ctx.fillRect(win.x + 6, win.y + 12, 6, 4);
    }
  }
  ctx.restore();
}
