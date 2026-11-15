// EMBERFALL entry point: wires the canvas, the input, the sound and the world
// together, runs the fixed-step loop, and stages deterministic screenshot
// scenes when the page is opened with ?shot=start|play|battle|end.
import { FIELD, STEP } from './config.js';
import { createWorld, EVENT_BOMB, EVENT_HIT, EVENT_OVER, EVENT_WAVE_CLEAR } from './world.js';
import { draw, SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const audio = createAudio();
const input = createInput(canvas);
const world = createWorld(seed);
world.onShoot = () => audio.shoot();
world.onExplosion = (big) => audio.explosion(big);
world.onHit = () => audio.hit();
world.onPowerup = () => audio.powerup();
world.onBomb = () => audio.bomb();
world.onGameOver = () => audio.gameOver();

let best = 0;
try { best = Number(window.localStorage.getItem('emberfall-best') || '0') || 0; } catch { best = 0; }
world.state.best = best;

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
  ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

if (shotName) {
  // Screenshot mode: stage the scene once and hold the frame.
  const staged = stageShot(shotName, world);
  world.state.best = staged.best;
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  const frozenTime = world.state.time;
  // Staged scenes always show their call-to-action line: a frozen frame
  // must not catch the prompt mid-blink.
  draw(ctx, world.state, staged.screen, frozenTime, true);
  // Keep redrawing the same frozen frame so headless screenshots catch it.
  function hold() {
    fitCanvas();
    draw(ctx, world.state, staged.screen, frozenTime, true);
    requestAnimationFrame(hold);
  }
  requestAnimationFrame(hold);
} else {
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    world.reset();
    world.state.best = best;
    screen = SCREEN_PLAY;
    announce('Game started. Wave 1.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    best = Math.max(best, world.state.score);
    try { window.localStorage.setItem('emberfall-best', String(best)); } catch { /* storage unavailable */ }
    announce(`Game over. Score ${world.state.score}.`);
  }

  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (screen === SCREEN_TITLE) {
      // Attract mode: the world drifts behind the title; a lost ship simply
      // respawns so the backdrop never goes quiet.
      world.step(dt, { mx: 0, my: 0, aimX: world.state.ship.x, aimY: world.state.ship.y - 100, firing: false, bomb: false }, true);
      if (world.state.gameOver) {
        world.reset();
        world.state.best = best;
      }
      if (input.wasPressed('Enter') || input.wasPressed(' ') || input.firing) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (input.wasPressed('p') || input.wasPressed('P')) {
        screen = SCREEN_PAUSE;
      } else {
        const axis = input.axis();
        const control = {
          mx: axis.x, my: axis.y,
          aimX: input.mouseX, aimY: input.mouseY,
          firing: input.firing,
          bomb: input.wasPressed('e') || input.wasPressed('E') || input.wasPressed('bomb'),
        };
        accumulator += dt;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const events = world.step(STEP, control, false);
          if (events & EVENT_WAVE_CLEAR) audio.wave();
          if (events & EVENT_OVER) endGame();
        }
      }
    } else if (screen === SCREEN_PAUSE) {
      if (input.wasPressed('p') || input.wasPressed('P')) screen = SCREEN_PLAY;
    } else if (screen === SCREEN_OVER) {
      if (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter') || input.firing) startGame();
    }
    if (input.wasPressed('m') || input.wasPressed('M')) audio.toggleMute();
    draw(ctx, world.state, screen, world.state.time);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
