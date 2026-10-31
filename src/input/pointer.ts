const DRAG_THRESHOLD = 8; // px of movement before a touch counts as a drag

export interface PointerHandlers {
  tap(x: number, y: number): void;
  drag(dy: number): void;
}

// One code path for touch and mouse: short touches are taps, longer moves scroll.
export function attachPointer(el: HTMLElement, handlers: PointerHandlers): void {
  let startY = 0, lastY = 0, startX = 0, dragging = false, active = false;

  el.addEventListener('pointerdown', e => {
    active = true;
    dragging = false;
    startX = e.clientX;
    startY = lastY = e.clientY;
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', e => {
    if (!active) return;
    if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD) dragging = true;
    if (dragging) {
      handlers.drag(lastY - e.clientY);
      lastY = e.clientY;
    }
  });

  el.addEventListener('pointerup', e => {
    if (active && !dragging) handlers.tap(e.clientX, e.clientY);
    active = false;
  });

  el.addEventListener('pointercancel', () => { active = false; });
}
