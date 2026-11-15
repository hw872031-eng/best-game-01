// The simulation: ship, asteroids, bullets, power-ups, waves, score and combo.
// It knows nothing about the canvas or the DOM, so the screenshot stager can
// run it forward in fixed steps and the game loop can run it in real time.
import { ASTEROID, BULLET, COMBO, FIELD, POWERUP, SHIP, STEP, WAVE } from './config.js';
import { makeRandom, range } from './random.js';

export const EVENT_OVER = 1;
export const EVENT_WAVE_CLEAR = 2;
export const EVENT_HIT = 4;
export const EVENT_BOMB = 8;

const TAU = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(seed) {
  const random = makeRandom(seed);
  const world = {
    random,
    state: null,
    reset() {
      this.state = {
        time: 0,
        score: 0,
        best: 0,
        combo: 0,
        comboTimer: 0,
        lives: SHIP.startLives,
        bombs: SHIP.startBombs,
        wave: 1,
        waveState: 'banner',
        waveTimer: 2.0,
        spawnQueue: 0,
        spawnTimer: 0,
        ship: {
          x: FIELD.width / 2, y: FIELD.height / 2 + 120,
          vx: 0, vy: 0, angle: -Math.PI / 2,
          fireTimer: 0, invulnerable: 0, shield: 0, rapid: 0, thrust: 0,
        },
        bullets: [],
        asteroids: [],
        particles: [],
        texts: [],
        powerups: [],
        shake: 0,
        flash: 0,
        gameOver: false,
        kills: 0,
      };
    },
    // Advance one fixed step. `control` is {mx, my, aimX, aimY, firing, bomb}.
    // `silent` suppresses audio callbacks (used by the screenshot stager).
    step(dt, control, silent) {
      const s = this.state;
      if (s.gameOver) return 0;
      let events = 0;
      s.time += dt;
      if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 30);
      if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 2.5);
      if (s.comboTimer > 0) {
        s.comboTimer -= dt;
        if (s.comboTimer <= 0) s.combo = 0;
      }
      const ship = s.ship;
      if (ship.invulnerable > 0) ship.invulnerable -= dt;
      if (ship.shield > 0) ship.shield -= dt;
      if (ship.rapid > 0) ship.rapid -= dt;
      if (ship.fireTimer > 0) ship.fireTimer -= dt;

      // --- wave flow ---
      if (s.waveState === 'banner') {
        s.waveTimer -= dt;
        if (s.waveTimer <= 0) {
          s.waveState = 'active';
          s.spawnQueue = WAVE.baseCount + (s.wave - 1) * WAVE.perWave;
          s.spawnTimer = 0.4;
        }
      } else if (s.waveState === 'active') {
        if (s.spawnQueue > 0) {
          s.spawnTimer -= dt;
          if (s.spawnTimer <= 0) {
            s.spawnTimer = WAVE.spawnInterval;
            s.spawnQueue -= 1;
            this.spawnAsteroid();
          }
        } else if (s.asteroids.length === 0) {
          s.waveState = 'clear';
          s.waveTimer = 2.2;
          const bonus = WAVE.clearBonus * s.wave;
          s.score += bonus;
          this.addText(FIELD.width / 2, FIELD.height / 2 - 40, `WAVE ${s.wave} CLEAR  +${bonus}`, '#ffd166', 30);
          events |= EVENT_WAVE_CLEAR;
        }
      } else if (s.waveState === 'clear') {
        s.waveTimer -= dt;
        if (s.waveTimer <= 0) {
          s.wave += 1;
          s.waveState = 'banner';
          s.waveTimer = 2.0;
        }
      }

      // --- ship movement and aim ---
      const len = Math.hypot(control.mx, control.my) || 1;
      const ax = (control.mx / len) * SHIP.accel * (control.mx || control.my ? 1 : 0);
      const ay = (control.my / len) * SHIP.accel * (control.mx || control.my ? 1 : 0);
      ship.vx = (ship.vx + ax * dt) * Math.pow(SHIP.drag, dt * 60);
      ship.vy = (ship.vy + ay * dt) * Math.pow(SHIP.drag, dt * 60);
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > SHIP.maxSpeed) {
        ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
        ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
      }
      ship.x = Math.min(FIELD.width - SHIP.radius, Math.max(SHIP.radius, ship.x + ship.vx * dt));
      ship.y = Math.min(FIELD.height - SHIP.radius, Math.max(SHIP.radius, ship.y + ship.vy * dt));
      ship.thrust = control.mx || control.my ? 1 : 0;
      ship.angle = Math.atan2(control.aimY - ship.y, control.aimX - ship.x);

      // --- firing ---
      const cooldown = ship.rapid > 0 ? SHIP.fireCooldown / 2 : SHIP.fireCooldown;
      if (control.firing && ship.fireTimer <= 0) {
        ship.fireTimer = cooldown;
        const bx = ship.x + Math.cos(ship.angle) * (SHIP.radius + 8);
        const by = ship.y + Math.sin(ship.angle) * (SHIP.radius + 8);
        s.bullets.push({
          x: bx, y: by,
          vx: Math.cos(ship.angle) * SHIP.bulletSpeed + ship.vx * 0.4,
          vy: Math.sin(ship.angle) * SHIP.bulletSpeed + ship.vy * 0.4,
          life: BULLET.life,
        });
        this.burst(bx, by, 3, '#ffe66d', 120);
        if (!silent && this.onShoot) this.onShoot();
      }

      // --- nova bomb ---
      if (control.bomb && s.bombs > 0 && s.asteroids.length > 0) {
        s.bombs -= 1;
        s.flash = 1;
        s.shake = 26;
        for (const a of s.asteroids) {
          this.addScore(Math.floor(this.asteroidScore(a) / 2), a.x, a.y);
          this.explode(a.x, a.y, a.radius, a.kind === 'crystal' ? '#4de8ff' : '#ff9f1c');
        }
        s.asteroids = [];
        s.kills += 1;
        events |= EVENT_BOMB;
        if (!silent && this.onBomb) this.onBomb();
      }

      // --- bullets ---
      for (const b of s.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
      }
      s.bullets = s.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < FIELD.width + 20 && b.y > -20 && b.y < FIELD.height + 20);

      // --- asteroids drift and spin ---
      for (const a of s.asteroids) {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.rot += a.rotSpeed * dt;
        if (a.x < -a.radius - 10) a.x = FIELD.width + a.radius + 9;
        if (a.x > FIELD.width + a.radius + 10) a.x = -a.radius - 9;
        if (a.y < -a.radius - 10) a.y = FIELD.height + a.radius + 9;
        if (a.y > FIELD.height + a.radius + 10) a.y = -a.radius - 9;
      }

      // --- bullet vs asteroid ---
      for (const b of [...s.bullets]) {
        for (const a of [...s.asteroids]) {
          if (b.life <= 0) continue;
          const rr = a.radius + BULLET.radius;
          if (dist2(b.x, b.y, a.x, a.y) < rr * rr) {
            b.life = 0;
            a.hp -= 1;
            this.burst(b.x, b.y, 4, '#ffffff', 90);
            if (a.hp <= 0) this.destroyAsteroid(a, silent);
            break;
          }
        }
      }
      s.bullets = s.bullets.filter((b) => b.life > 0);
      s.asteroids = s.asteroids.filter((a) => a.hp > 0);

      // --- power-ups drift and pickup ---
      for (const p of s.powerups) {
        p.y += POWERUP.fallSpeed * dt;
        p.rot += dt * 2;
        if (dist2(p.x, p.y, ship.x, ship.y) < (POWERUP.radius + SHIP.radius) ** 2) {
          p.taken = true;
          this.applyPowerup(p.kind);
          this.addText(ship.x, ship.y - 30, p.kind === 'shield' ? 'SHIELD!' : p.kind === 'bomb' ? '+1 NOVA BOMB!' : 'RAPID FIRE!', '#4de8ff', 20);
          if (!silent && this.onPowerup) this.onPowerup();
        }
      }
      s.powerups = s.powerups.filter((p) => !p.taken && p.y < FIELD.height + 30);

      // --- ship vs asteroid ---
      if (ship.invulnerable <= 0 && ship.shield <= 0) {
        for (const a of s.asteroids) {
          const rr = a.radius * 0.85 + SHIP.radius * 0.8;
          if (dist2(a.x, a.y, ship.x, ship.y) < rr * rr) {
            this.destroyAsteroid(a, silent);
            s.asteroids = s.asteroids.filter((x) => x.hp > 0);
            events |= this.damageShip(silent);
            break;
          }
        }
      } else if (ship.shield > 0) {
        for (const a of s.asteroids) {
          const rr = a.radius * 0.85 + SHIP.radius + 14;
          if (dist2(a.x, a.y, ship.x, ship.y) < rr * rr) {
            this.destroyAsteroid(a, silent);
            s.asteroids = s.asteroids.filter((x) => x.hp > 0);
          }
        }
      }

      // --- particles and floating text ---
      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.98, dt * 60);
        p.vy *= Math.pow(0.98, dt * 60);
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);
      for (const t of s.texts) {
        t.y -= 34 * dt;
        t.life -= dt;
      }
      s.texts = s.texts.filter((t) => t.life > 0);
      return events;
    },

    damageShip(silent) {
      const s = this.state;
      s.lives -= 1;
      s.combo = 0;
      s.shake = 22;
      s.flash = 0.7;
      this.explode(s.ship.x, s.ship.y, 34, '#ffd166');
      if (!silent && this.onHit) this.onHit();
      if (s.lives <= 0) {
        s.gameOver = true;
        if (!silent && this.onGameOver) this.onGameOver();
        return EVENT_OVER | EVENT_HIT;
      }
      s.ship.x = FIELD.width / 2;
      s.ship.y = FIELD.height / 2 + 120;
      s.ship.vx = 0;
      s.ship.vy = 0;
      s.ship.invulnerable = SHIP.invulnerableSeconds;
      return EVENT_HIT;
    },

    asteroidScore(a) {
      if (a.kind === 'crystal') return ASTEROID.crystalScore;
      return ASTEROID[a.size].score;
    },

    addScore(base, x, y) {
      const s = this.state;
      s.combo += 1;
      s.comboTimer = COMBO.window;
      const mult = 1 + Math.min(s.combo, 10) * COMBO.step;
      const points = Math.round(base * mult);
      s.score += points;
      this.addText(x, y, `+${points}`, '#ffe66d', 16);
    },

    destroyAsteroid(a, silent) {
      const s = this.state;
      a.hp = 0;
      s.kills += 1;
      this.addScore(this.asteroidScore(a), a.x, a.y);
      this.explode(a.x, a.y, a.radius, a.kind === 'crystal' ? '#4de8ff' : a.kind === 'ember' ? '#ff7a3c' : '#c9a184');
      if (!silent && this.onExplosion) this.onExplosion(a.size === 'large');
      if (a.size === 'large' || a.size === 'medium') {
        const child = a.size === 'large' ? 'medium' : 'small';
        for (let i = 0; i < 2; i += 1) {
          const angle = this.random() * TAU;
          s.asteroids.push(this.makeAsteroid(child, a.kind === 'ember' ? 'ember' : 'rock', a.x, a.y, Math.cos(angle) * ASTEROID.splitSpeed, Math.sin(angle) * ASTEROID.splitSpeed));
        }
      }
      if (this.random() < POWERUP.dropChance) {
        const kinds = ['shield', 'bomb', 'rapid'];
        s.powerups.push({ x: a.x, y: a.y, kind: kinds[Math.floor(this.random() * kinds.length)], rot: 0, taken: false });
      }
    },

    applyPowerup(kind) {
      const s = this.state;
      if (kind === 'shield') s.ship.shield = 5;
      if (kind === 'bomb') s.bombs += 1;
      if (kind === 'rapid') s.ship.rapid = POWERUP.rapidSeconds;
    },

    spawnAsteroid() {
      const s = this.state;
      const edge = Math.floor(this.random() * 4);
      let x = 0;
      let y = 0;
      if (edge === 0) { x = this.random() * FIELD.width; y = -60; }
      if (edge === 1) { x = FIELD.width + 60; y = this.random() * FIELD.height; }
      if (edge === 2) { x = this.random() * FIELD.width; y = FIELD.height + 60; }
      if (edge === 3) { x = -60; y = this.random() * FIELD.height; }
      const cx = FIELD.width / 2 + range(this.random, -160, 160);
      const cy = FIELD.height / 2 + range(this.random, -120, 120);
      const angle = Math.atan2(cy - y, cx - x) + range(this.random, -0.4, 0.4);
      const speed = ASTEROID.large.speed + s.wave * 6;
      const roll = this.random();
      const kind = roll < WAVE.crystalChance ? 'crystal' : roll < WAVE.crystalChance + WAVE.emberChance ? 'ember' : 'rock';
      s.asteroids.push(this.makeAsteroid('large', kind, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed));
    },

    makeAsteroid(size, kind, x, y, vx, vy) {
      const def = ASTEROID[size];
      const points = [];
      const count = 9 + Math.floor(this.random() * 3);
      for (let i = 0; i < count; i += 1) {
        points.push(0.72 + this.random() * 0.4);
      }
      return {
        size, kind, x, y, vx, vy,
        radius: def.radius, hp: def.hp,
        rot: this.random() * TAU,
        rotSpeed: range(this.random, -1.2, 1.2),
        points,
        seed: this.random(),
      };
    },

    burst(x, y, n, color, speed) {
      const s = this.state;
      for (let i = 0; i < n; i += 1) {
        const angle = this.random() * TAU;
        const v = range(this.random, speed * 0.3, speed);
        s.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: range(this.random, 0.3, 0.7), maxLife: 0.7, size: range(this.random, 1.5, 3.5), color });
      }
    },

    explode(x, y, radius, color) {
      const s = this.state;
      const n = Math.floor(radius * 0.9);
      for (let i = 0; i < n; i += 1) {
        const angle = this.random() * TAU;
        const v = range(this.random, 40, 40 + radius * 4);
        s.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: range(this.random, 0.4, 1.1), maxLife: 1.1, size: range(this.random, 2, 5), color });
      }
      s.particles.push({ x, y, vx: 0, vy: 0, life: 0.35, maxLife: 0.35, size: radius * 1.6, color, ring: true });
    },

    addText(x, y, text, color, size) {
      this.state.texts.push({ x, y, text, color, size, life: 1.1 });
    },
  };
  world.reset();
  return world;
}

export { STEP };
