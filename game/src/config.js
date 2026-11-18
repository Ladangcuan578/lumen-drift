// Lumen Drift — every tuning number lives here, so the game can be balanced
// without hunting through the world or renderer.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'lumen-drift.best';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SHIP = {
  radius: 16,
  accel: 2800,
  maxSpeed: 430,
  drag: 5.0,
  fireInterval: 0.16,
  overdriveInterval: 0.085,
  bulletSpeed: 780,
  bulletRadius: 4,
  invulnerableSeconds: 1.4,
};

export const ENEMY = {
  drifter: { radius: 17, hp: 1, speed: 62, score: 50, cost: 1 },
  weaver: { radius: 14, hp: 1, speed: 118, score: 75, cost: 2 },
  spitter: { radius: 19, hp: 2, speed: 52, score: 100, cost: 3, shotInterval: 2.3 },
  splitter: { radius: 30, hp: 3, speed: 46, score: 150, cost: 4 },
  mini: { radius: 9, hp: 1, speed: 150, score: 25, cost: 0 },
};

export const ORB = { radius: 7, speed: 185 };

export const SHARD = { radius: 7, value: 25, fallSpeed: 55, magnetRadius: 280, collectRadius: 30 };

export const COMBO = { windowSeconds: 3.5, max: 8 };

export const POWER = {
  spreadSeconds: 12,
  shieldSeconds: 10,
  overdriveSeconds: 8,
  dropChance: 0.07,
};

export const WAVE = {
  baseBudget: 6,
  budgetPerWave: 4,
  spawnInterval: 0.75,
  clearBonusPerWave: 150,
};

export const PALETTE = {
  bgTop: '#070b1d',
  bgBottom: '#120826',
  nebulaA: '#1c2a6b',
  nebulaB: '#5b1e63',
  nebulaC: '#0e4a5e',
  ship: '#57f7ff',
  shipCore: '#e8feff',
  bullet: '#8ffaff',
  shard: '#ffd94d',
  hull: '#ff5d73',
  text: '#dff6ff',
  dim: '#8fa8c8',
  drifter: '#ff5fd0',
  weaver: '#ff9f43',
  spitter: '#ff4d4d',
  splitter: '#b678ff',
  mini: '#d9a0ff',
  orb: '#ff7ab8',
  spread: '#7dff9e',
  shield: '#6db7ff',
  overdrive: '#ffb84d',
};

export const POWER_KINDS = ['spread', 'shield', 'overdrive'];

/**
 * The letterboxed view of the 1280x720 field inside a canvas that fills its
 * window: scale to fit, centred, with the empty bands left dark.
 */
export function viewTransform(canvas) {
  const w = canvas.clientWidth || FIELD.width;
  const h = canvas.clientHeight || FIELD.height;
  const scale = Math.min(w / FIELD.width, h / FIELD.height);
  return {
    scale,
    offsetX: (w - FIELD.width * scale) / 2,
    offsetY: (h - FIELD.height * scale) / 2,
  };
}
