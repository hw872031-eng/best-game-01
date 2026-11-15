// EMBERFALL tuning: every number that shapes how the game feels lives here,
// so balancing the game means editing this file and no other.
export const FIELD = { width: 1280, height: 720 };

export const STEP = 1 / 60;

export const SHIP = {
  radius: 15,
  accel: 900,
  maxSpeed: 420,
  drag: 0.92,
  fireCooldown: 0.16,
  bulletSpeed: 760,
  invulnerableSeconds: 2.2,
  startLives: 3,
  startBombs: 1,
};

export const BULLET = { radius: 5, life: 0.9 };

export const ASTEROID = {
  large: { radius: 48, hp: 3, speed: 55, score: 50 },
  medium: { radius: 30, hp: 2, speed: 85, score: 100 },
  small: { radius: 17, hp: 1, speed: 130, score: 150 },
  crystalScore: 250,
  splitSpeed: 150,
};

export const WAVE = {
  baseCount: 5,
  perWave: 2,
  spawnInterval: 0.9,
  clearBonus: 250,
  crystalChance: 0.18,
  emberChance: 0.22,
};

export const COMBO = { window: 2.5, step: 0.1, maxBonus: 1.0 };

export const POWERUP = {
  dropChance: 0.16,
  fallSpeed: 55,
  radius: 15,
  rapidSeconds: 8,
};

export const COLORS = {
  bgTop: '#0b1026',
  bgBottom: '#1a0b2e',
  nebula: ['#3b1d5e', '#123a5e', '#5e1d3a'],
  rock: '#8a6f5c',
  rockDark: '#5c4638',
  crystal: '#4de8ff',
  ember: '#ff7a3c',
  ship: '#ffd166',
  shipGlow: '#ff9f1c',
  bullet: '#ffe66d',
  hud: '#eaf6ff',
  hudDim: '#8fa8c8',
  accent: '#ff5d8f',
};
