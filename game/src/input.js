// Keyboard and mouse state, read once per frame by the world step.
// The game is played with WASD or arrows to fly, mouse to aim, click or Space
// to fire, E or right-click for a nova bomb, P to pause, M to mute.
export function createInput(canvas) {
  const keys = new Set();
  let mouseX = 640;
  let mouseY = 300;
  let mouseDown = false;
  let pressed = new Set();

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const name = keyName(event);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
    if (!keys.has(name)) pressed.add(name);
    keys.add(name);
  });
  window.addEventListener('keyup', (event) => keys.delete(keyName(event)));
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });

  function updateMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    mouseY = ((event.clientY - rect.top) / rect.height) * 720;
  }
  canvas.addEventListener('mousemove', updateMouse);
  canvas.addEventListener('mousedown', (event) => {
    updateMouse(event);
    if (event.button === 0) mouseDown = true;
    if (event.button === 2) pressed.add('bomb');
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    get mouseX() { return mouseX; },
    get mouseY() { return mouseY; },
    get firing() { return mouseDown || keys.has(' '); },
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      return { x, y };
    },
    // One-shot presses, consumed at the end of each frame by the game loop.
    wasPressed(name) { return pressed.has(name); },
    endFrame() { pressed.clear(); },
  };
}
