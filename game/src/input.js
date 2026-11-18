// Keyboard and mouse, read as one input snapshot per frame. Movement comes
// from WASD or the arrow keys, the mouse aims the ship, holding the mouse
// button or Space fires, and Space/Enter confirms, P or Escape pauses,
// M toggles sound.
import { FIELD, viewTransform } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const MOVE = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const held = new Set();
  let pending = 0;
  const mouse = { x: FIELD.width / 2, y: FIELD.height / 2, down: false };

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const view = viewTransform(canvas);
    mouse.x = (clientX - rect.left - view.offsetX) / view.scale;
    mouse.y = (clientY - rect.top - view.offsetY) / view.scale;
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    if (CONFIRM.has(event.code)) pending |= ACTION_CONFIRM;
    if (PAUSE.has(event.code)) pending |= ACTION_PAUSE;
    if (MUTE.has(event.code)) pending |= ACTION_MUTE;
    if (CONFIRM.has(event.code) || MOVE[event.code]) event.preventDefault();
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseMove(event) {
    toLogical(event.clientX, event.clientY);
  }

  function onMouseDown(event) {
    if (event.button === 0) {
      mouse.down = true;
      toLogical(event.clientX, event.clientY);
      pending |= ACTION_CONFIRM;
    }
  }

  function onMouseUp(event) {
    if (event.button === 0) mouse.down = false;
  }

  function onBlur() {
    held.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    /** Normalised movement vector from the held keys, or {x:0, y:0}. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const move = MOVE[code];
        if (move) {
          x += move[0];
          y += move[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    /** True while Space or the mouse button is held: the fire button. */
    firing() {
      return mouse.down || held.has('Space');
    },
    /** Edge-triggered actions since the last call, as a bitmask. */
    takeActions() {
      const actions = pending;
      pending = 0;
      return actions;
    },
  };
}
