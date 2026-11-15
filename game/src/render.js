// Every pixel of EMBERFALL: the space backdrop, the ship, the asteroids, the
// particles, the HUD and the title / pause / game-over screens.
import { COLORS, FIELD, POWERUP, SHIP } from './config.js';
import { makeRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

function buildStars(seed) {
  const random = makeRandom(seed);
  const layers = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const stars = [];
    const count = 50 + layer * 40;
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: random() * FIELD.width,
        y: random() * FIELD.height,
        r: 0.6 + layer * 0.5 + random() * 0.9,
        tw: random() * TAU,
        speed: 6 + layer * 14,
      });
    }
    layers.push(stars);
  }
  const nebulae = [];
  for (let i = 0; i < 4; i += 1) {
    nebulae.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      r: 180 + random() * 220,
      color: ['#3b1d5e', '#123a5e', '#5e1d3a'][i % 3],
    });
  }
  return { layers, nebulae };
}

const STARS = buildStars(20261115);

function drawBackground(ctx, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, COLORS.bgTop);
  grad.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const n of STARS.nebulae) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color + '55');
    g.addColorStop(1, n.color + '00');
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  for (let layer = 0; layer < STARS.layers.length; layer += 1) {
    for (const star of STARS.layers[layer]) {
      const y = (star.y + time * star.speed * 0.15) % FIELD.height;
      const alpha = 0.35 + 0.35 * Math.sin(time * 1.5 + star.tw);
      ctx.globalAlpha = Math.max(0.1, alpha);
      ctx.fillStyle = '#dfeaff';
      ctx.beginPath();
      ctx.arc(star.x, y, star.r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawAsteroid(ctx, a, time) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  const glow = a.kind === 'crystal' ? COLORS.crystal : a.kind === 'ember' ? COLORS.ember : '#ffb37a';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  const n = a.points.length;
  for (let i = 0; i < n; i += 1) {
    const angle = (i / n) * TAU;
    const r = a.radius * a.points[i];
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (a.kind === 'crystal') {
    ctx.fillStyle = '#0b3a4a';
    ctx.fill();
    ctx.strokeStyle = COLORS.crystal;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#b8f6ff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-a.radius * 0.4, -a.radius * 0.2);
    ctx.lineTo(0, -a.radius * 0.6);
    ctx.lineTo(a.radius * 0.45, -a.radius * 0.1);
    ctx.lineTo(a.radius * 0.2, a.radius * 0.5);
    ctx.lineTo(-a.radius * 0.5, a.radius * 0.35);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.fillStyle = a.kind === 'ember' ? '#4a1e10' : COLORS.rockDark;
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = a.kind === 'ember' ? '#ff9a5c' : '#a98a6f';
    for (let i = 0; i < 3; i += 1) {
      const cx = Math.cos(a.seed * 10 + i * 2.1) * a.radius * 0.4;
      const cy = Math.sin(a.seed * 7 + i * 1.7) * a.radius * 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, a.radius * 0.14, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawShip(ctx, ship, time) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  const blink = ship.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;
  ctx.rotate(ship.angle + Math.PI / 2);
  // Engine flame
  if (ship.thrust) {
    const flick = 14 + Math.sin(time * 40) * 6;
    ctx.fillStyle = '#ff9f1c';
    ctx.shadowColor = '#ff7a3c';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(0, 14 + flick);
    ctx.lineTo(6, 14);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // Hull
  ctx.fillStyle = '#1b2a4a';
  ctx.strokeStyle = COLORS.ship;
  ctx.lineWidth = 2;
  ctx.shadowColor = COLORS.shipGlow;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(13, 12);
  ctx.lineTo(5, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(-5, 8);
  ctx.lineTo(-13, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.ship;
  ctx.beginPath();
  ctx.arc(0, -4, 4.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (ship.shield > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(77,232,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = COLORS.crystal;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, SHIP.radius + 12 + Math.sin(time * 5) * 2, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPowerup(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.sin(p.rot) * 0.3);
  const color = p.kind === 'shield' ? COLORS.crystal : p.kind === 'bomb' ? COLORS.accent : '#7dff8a';
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#0b1026';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, POWERUP.radius, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.kind === 'shield' ? 'S' : p.kind === 'bomb' ? 'N' : 'R', 0, 1);
  ctx.restore();
}

function drawHud(ctx, s, time) {
  ctx.textBaseline = 'alphabetic';
  // Score, top left
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 30px "Arial Black", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(s.score).padStart(6, '0'), 24, 44);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`BEST ${Math.max(s.best, s.score)}`, 24, 66);
  // Combo
  if (s.combo > 1) {
    const mult = (1 + Math.min(s.combo, 10) * 0.1).toFixed(1);
    ctx.fillStyle = '#ffe66d';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`COMBO x${s.combo}  ·  ${mult}x`, 24, 94);
    ctx.fillStyle = '#3a2f10';
    ctx.fillRect(24, 102, 120, 6);
    ctx.fillStyle = '#ffe66d';
    ctx.fillRect(24, 102, 120 * (s.comboTimer / 2.5), 6);
  }
  // Wave, top centre
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`WAVE ${s.wave}`, FIELD.width / 2, 40);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '13px sans-serif';
  const remaining = s.asteroids.length + s.spawnQueue;
  ctx.fillText(s.waveState === 'banner' ? 'GET READY' : `${remaining} ROCK${remaining === 1 ? '' : 'S'} LEFT`, FIELD.width / 2, 62);
  // Lives and bombs, top right
  ctx.textAlign = 'right';
  for (let i = 0; i < s.lives; i += 1) {
    ctx.save();
    ctx.translate(FIELD.width - 30 - i * 30, 34);
    ctx.fillStyle = COLORS.ship;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 7);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = COLORS.accent;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`NOVA x${s.bombs}`, FIELD.width - 24, 68);
  // Wave banner
  if (s.waveState === 'banner') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,209,102,0.95)';
    ctx.font = 'bold 54px "Arial Black", sans-serif';
    ctx.fillText(`WAVE ${s.wave}`, FIELD.width / 2, FIELD.height / 2 - 10);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '18px sans-serif';
    ctx.fillText('Clear every rock to advance', FIELD.width / 2, FIELD.height / 2 + 26);
  } else if (s.waveState === 'clear') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,209,102,0.95)';
    ctx.font = 'bold 40px "Arial Black", sans-serif';
    ctx.fillText('WAVE CLEAR!', FIELD.width / 2, FIELD.height / 2 - 10);
  }
  // Bottom hints
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(143,168,200,0.75)';
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD / arrows fly  ·  mouse aims  ·  click / Space fires  ·  E or right-click: nova bomb  ·  P pause  ·  M mute', FIELD.width / 2, FIELD.height - 14);
}

function drawTitle(ctx, s, time, showPrompt) {
  ctx.fillStyle = 'rgba(5,8,20,0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  const bob = Math.sin(time * 1.4) * 8;
  const grad = ctx.createLinearGradient(0, 150, 0, 260);
  grad.addColorStop(0, '#ffe66d');
  grad.addColorStop(0.55, '#ff7a3c');
  grad.addColorStop(1, '#ff5d8f');
  ctx.fillStyle = grad;
  ctx.shadowColor = '#ff5d8f';
  ctx.shadowBlur = 34;
  ctx.font = 'bold 96px "Arial Black", sans-serif';
  ctx.fillText('EMBERFALL', FIELD.width / 2, 235 + bob);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.hud;
  ctx.font = '22px sans-serif';
  ctx.fillText('A neon asteroid defense — fly fast, shoot straight, chain the combo', FIELD.width / 2, 285 + bob);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '17px sans-serif';
  ctx.fillText('WASD / arrows to fly  ·  mouse to aim  ·  click or Space to fire', FIELD.width / 2, 350);
  ctx.fillText('E or right-click: nova bomb  ·  crystals are worth 250  ·  grab S / N / R power-ups', FIELD.width / 2, 378);
  if (showPrompt || Math.floor(time * 1.6) % 2 === 0) {
    ctx.fillStyle = '#ffe66d';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO LAUNCH', FIELD.width / 2, 460);
  }
  if (s.best > 0) {
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '16px sans-serif';
    ctx.fillText(`BEST SCORE ${s.best}`, FIELD.width / 2, 505);
  }
}

function drawOver(ctx, s, time, showPrompt) {
  ctx.fillStyle = 'rgba(10,4,12,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d8f';
  ctx.shadowColor = '#ff5d8f';
  ctx.shadowBlur = 26;
  ctx.font = 'bold 72px "Arial Black", sans-serif';
  ctx.fillText('MISSION LOST', FIELD.width / 2, 280);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`SCORE  ${s.score}`, FIELD.width / 2, 350);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '19px sans-serif';
  ctx.fillText(`You reached wave ${s.wave}  ·  ${s.kills} rocks destroyed  ·  best ${Math.max(s.best, s.score)}`, FIELD.width / 2, 392);
  if (showPrompt || Math.floor(time * 1.6) % 2 === 0) {
    ctx.fillStyle = '#ffe66d';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', FIELD.width / 2, 470);
  }
}

export function draw(ctx, s, screen, time, showPrompt) {
  ctx.save();
  if (s.shake > 0) {
    ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
  }
  drawBackground(ctx, time);
  for (const a of s.asteroids) drawAsteroid(ctx, a, time);
  for (const p of s.powerups) drawPowerup(ctx, p, time);
  for (const b of s.bullets) {
    ctx.save();
    ctx.strokeStyle = COLORS.bullet;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  if (!s.gameOver) drawShip(ctx, s.ship, time);
  for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    if (p.ring) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - p.life / p.maxLife), 0, TAU);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of s.texts) {
    ctx.globalAlpha = Math.min(1, t.life);
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px sans-serif`;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE) drawHud(ctx, s, time);
  if (screen === SCREEN_TITLE) drawTitle(ctx, s, time, showPrompt);
  if (screen === SCREEN_OVER) drawOver(ctx, s, time, showPrompt);
  if (screen === SCREEN_PAUSE) {
    ctx.fillStyle = 'rgba(5,8,20,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = COLORS.hud;
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px "Arial Black", sans-serif';
    ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '19px sans-serif';
    ctx.fillText('Press P to resume', FIELD.width / 2, FIELD.height / 2 + 44);
  }
  if (s.flash > 0) {
    ctx.fillStyle = `rgba(255,240,200,${s.flash * 0.5})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  ctx.restore();
}
