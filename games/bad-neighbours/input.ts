export type ControlAction = 'left' | 'right' | 'rotate' | 'drop' | 'glue';

// Repeat on animation frames rather than timers that can outlive a paused game.
export class HeldButton {
  pointer: number | null = null;
  private next = 0;
  constructor(private fire: () => void, private repeats = false) {}
  press(id: number, now: number) {
    if (this.pointer !== null) return false;
    this.pointer = id; this.next = now + 210; this.fire(); return true;
  }
  advance(now: number) {
    if (this.pointer !== null && this.repeats && now >= this.next) { this.next = now + 95; this.fire(); }
  }
  release(id: number) { if (id === this.pointer) this.clear(); }
  clear() { this.pointer = null; }
}

export class DragGesture {
  private origin: { id: number; x: number; y: number; world: number; scale: number; axis: 'x' | 'y' | null } | null = null;
  begin(id: number, x: number, y: number, world: number, scale: number) {
    if (this.origin) return false;
    this.origin = { id, x, y, world, scale, axis: null }; return true;
  }
  move(id: number, x: number, y: number): number | undefined {
    const p = this.origin; if (!p || id !== p.id) return;
    const dx = x - p.x, dy = y - p.y;
    if (!p.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 10) p.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (p.axis === 'x') return p.world + dx / p.scale;
  }
  end(id: number, x: number, y: number): ControlAction | undefined {
    const p = this.origin; if (!p || id !== p.id) return;
    this.move(id, x, y); this.origin = null;
    if (p.axis === 'y' && y - p.y > 38) return 'drop';
    if (!p.axis && Math.hypot(x - p.x, y - p.y) <= 10) return 'rotate';
  }
  cancel() { this.origin = null; }
}

export function bindGameControls(root: HTMLElement, fire: (action: ControlAction) => void, beforePress: () => void) {
  const controls = [...root.querySelectorAll<HTMLButtonElement>('[data-action]')].map(button => {
    const action = button.dataset.action as ControlAction;
    const held = new HeldButton(() => fire(action), action === 'left' || action === 'right');
    const clear = () => { held.clear(); button.classList.remove('is-held'); };
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || button.disabled) return;
      event.preventDefault(); beforePress();
      if (held.press(event.pointerId, performance.now())) { button.setPointerCapture(event.pointerId); button.classList.add('is-held'); }
    });
    const release = (event: PointerEvent) => { held.release(event.pointerId); if (held.pointer === null) button.classList.remove('is-held'); };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', event => event.preventDefault());
    // Keyboard and assistive-technology clicks have no pointer-down event.
    button.addEventListener('click', event => { if (event.detail === 0) { beforePress(); fire(action); } });
    return { held, clear };
  });
  return {
    advance(now: number) { for (const { held } of controls) held.advance(now); },
    clear() { for (const control of controls) control.clear(); },
  };
}
