// The screenshot scenes behind ?shot=start|play|battle|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// an autopilot, so the frame is what a short game really looks like and the
// same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward a point 240 away from the nearest rock, fleeing close ones.
 *  `bold` holds closer and fires on a wider arc, for a busier battle scene. */
function autopilot(state, dodge, bold) {
  const ship = state.ship;
  let target = null;
  let targetDist = Infinity;
  for (const a of state.asteroids) {
    const d = Math.hypot(a.x - ship.x, a.y - ship.y);
    if (d < targetDist) { targetDist = d; target = a; }
  }
  let mx = 0;
  let my = 0;
  if (target) {
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    // Hold about 240 away (190 when bold): approach when far, back off when close.
    const hold = bold ? 190 : 240;
    const want = d > hold + 60 ? 1 : d < hold - 70 ? -1 : 0;
    mx = (dx / d) * want;
    my = (dy / d) * want;
  }
  if (dodge) {
    for (const a of state.asteroids) {
      const dx = ship.x - a.x;
      const dy = ship.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 150 && d > 1) {
        mx += (dx / d) * 1.4;
        my += (dy / d) * 1.4;
      }
    }
  }
  const len = Math.hypot(mx, my) || 1;
  const aimX = target ? target.x : ship.x;
  const aimY = target ? target.y : ship.y - 100;
  const aimAngle = Math.atan2(aimY - ship.y, aimX - ship.x);
  let angleDiff = aimAngle - ship.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  return {
    mx: mx / len, my: my / len,
    aimX, aimY,
    firing: target !== null && Math.abs(angleDiff) < (bold ? 0.6 : 0.4),
    bomb: false,
  };
}

/** A reckless pilot: it neither moves nor fires, so it is caught out quickly. */
function recklessPilot(state) {
  return {
    mx: 0, my: 0,
    aimX: state.ship.x,
    aimY: state.ship.y - 100,
    firing: false,
    bomb: false,
  };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'battle' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, autopilot(world.state, true), true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    // Play well for a while so the run has a real score, then stop flying
    // and stop firing: the rocks close in and the mission ends soon after.
    for (let i = 0; i < 15 / STEP; i += 1) {
      world.step(STEP, autopilot(world.state, true), true);
    }
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      if (world.step(STEP, recklessPilot(world.state), true) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'battle') {
    // Push on to wave 3 with a bold pilot, so the frame is thick with rocks,
    // bullets and particles; cap the staging time so it always terminates.
    for (let i = 0; i < 150 / STEP; i += 1) {
      if (world.step(STEP, autopilot(world.state, true, true), true) & EVENT_OVER) break;
      if (world.state.wave >= 3 && world.state.asteroids.length >= 6 && world.state.waveState === 'active') break;
    }
    const over = world.state.lives === 0;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  const seconds = PLAY_SECONDS;
  for (let i = 0; i < seconds / STEP; i += 1) {
    if (world.step(STEP, autopilot(world.state, true), true) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
