// Lumen Drift's world: the ship, four enemy kinds, bullets, star shards,
// power-ups, waves, particles and scoring. Pure simulation: it takes a
// per-frame input snapshot {moveX, moveY, aimX, aimY, firing} and a fixed
// step, and reports what happened as an event bitmask. Rendering and sound
// live elsewhere; this file only decides what happens.
import {
  COMBO, ENEMY, FIELD, ORB, POWER, SHARD, SHIP, STEP, WAVE,
} from './config.js';

export const KIND_DRIFTER = 'drifter';
export const KIND_WEAVER = 'weaver';
export const KIND_SPITTER = 'spitter';
export const KIND_SPLITTER = 'splitter';
export const KIND_MINI = 'mini';

export const EVENT_HIT = 1;
export const EVENT_KILL = 2;
export const EVENT_OVER = 4;
export const EVENT_WAVE = 8;
export const EVENT_SHARD = 16;
export const EVENT_POWER = 32;

const KIND_COST = {
  [KIND_DRIFTER]: ENEMY.drifter.cost,
  [KIND_WEAVER]: ENEMY.weaver.cost,
  [KIND_SPITTER]: ENEMY.spitter.cost,
  [KIND_SPLITTER]: ENEMY.splitter.cost,
};

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const state = {
    time: 0,
    ship: { x: FIELD.width / 2, y: FIELD.height - 120, vx: 0, vy: 0, angle: -Math.PI / 2, fireTimer: 0, invuln: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    shards: [],
    powerups: [],
    particles: [],
    floaters: [],
    stars: [],
    wave: 0,
    waveState: 'intro',
    spawnQueue: [],
    spawnTimer: 0,
    clearTimer: 0,
    score: 0,
    combo: 1,
    comboTimer: 0,
    hull: 3,
    maxHull: 3,
    kills: 0,
    shardsGot: 0,
    shake: 0,
    flash: 0,
    spreadUntil: 0,
    overdriveUntil: 0,
    shieldUntil: 0,
    banner: { text: '', timer: 0 },
    demoTimer: 0,
  };

  function addParticles(x, y, count, color, speed, size) {
    for (let i = 0; i < count; i += 1) {
      if (state.particles.length > 420) return;
      const angle = random.range(0, Math.PI * 2);
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: random.range(0.3, 0.8),
        max: 0.8,
        size: random.range(size * 0.5, size * 1.4),
        color,
      });
    }
  }

  function addFloater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 1.1, max: 1.1 });
  }

  function raiseCombo() {
    state.combo = Math.min(state.combo + 1, COMBO.max);
    state.comboTimer = COMBO.windowSeconds;
  }

  function makeStars() {
    state.stars = [];
    for (let i = 0; i < 110; i += 1) {
      const layer = random.int(0, 2);
      state.stars.push({
        x: random.range(0, FIELD.width),
        y: random.range(0, FIELD.height),
        layer,
        size: layer === 0 ? 1 : layer === 1 ? 1.6 : 2.4,
        speed: layer === 0 ? 12 : layer === 1 ? 26 : 52,
      });
    }
  }

  function pickKind(wave) {
    const table = [[KIND_DRIFTER, 10], [KIND_WEAVER, 6]];
    if (wave >= 2) table.push([KIND_SPITTER, 4], [KIND_SPLITTER, 3]);
    let total = 0;
    for (const [, weight] of table) total += weight;
    let roll = random.next() * total;
    for (const [kind, weight] of table) {
      roll -= weight;
      if (roll <= 0) return kind;
    }
    return KIND_DRIFTER;
  }

  function startWave(number) {
    state.wave = number;
    state.waveState = 'fight';
    let budget = WAVE.baseBudget + number * WAVE.budgetPerWave;
    state.spawnQueue = [];
    while (budget > 0) {
      const kind = pickKind(number);
      const cost = KIND_COST[kind];
      if (cost > budget) {
        state.spawnQueue.push(KIND_DRIFTER);
        budget -= 1;
      } else {
        state.spawnQueue.push(kind);
        budget -= cost;
      }
    }
    state.spawnTimer = 0.6;
    state.banner = { text: `WAVE ${number}`, timer: 2.0 };
  }

  function spawnEnemy(kind) {
    const tune = ENEMY[kind];
    const speedScale = 1 + (state.wave - 1) * 0.06;
    state.enemies.push({
      kind,
      x: random.range(50, FIELD.width - 50),
      y: -40,
      baseX: 0,
      vx: 0,
      vy: 0,
      radius: tune.radius,
      hp: tune.hp,
      maxHp: tune.hp,
      speed: tune.speed * speedScale * random.range(0.9, 1.1),
      score: tune.score,
      age: random.range(0, Math.PI * 2),
      targetY: random.range(120, 230),
      shotTimer: random.range(1.2, 2.4),
      angle: random.range(0, Math.PI * 2),
    });
    const enemy = state.enemies[state.enemies.length - 1];
    enemy.baseX = enemy.x;
  }

  function spawnMini(x, y) {
    const angle = random.range(0, Math.PI * 2);
    state.enemies.push({
      kind: KIND_MINI,
      x, y,
      baseX: x,
      vx: Math.cos(angle) * ENEMY.mini.speed,
      vy: Math.sin(angle) * ENEMY.mini.speed * 0.6 + 60,
      radius: ENEMY.mini.radius,
      hp: 1,
      maxHp: 1,
      speed: ENEMY.mini.speed,
      score: ENEMY.mini.score,
      age: 0,
      targetY: 0,
      shotTimer: 0,
      angle: 0,
    });
  }

  function dropLoot(x, y, kind) {
    if (random.chance(POWER.dropChance)) {
      const powerKind = random.pick(['spread', 'shield', 'overdrive']);
      state.powerups.push({ kind: powerKind, x, y, vy: 70, age: 0 });
      return;
    }
    const count = kind === KIND_SPLITTER ? 3 : random.chance(0.7) ? 1 : 0;
    for (let i = 0; i < count; i += 1) {
      state.shards.push({
        x: x + random.range(-18, 18),
        y: y + random.range(-10, 10),
        vx: random.range(-30, 30),
        vy: random.range(10, 50),
        age: random.range(0, Math.PI * 2),
      });
    }
  }

  function killEnemy(enemy, index, award) {
    state.enemies.splice(index, 1);
    const color = enemy.kind === KIND_DRIFTER ? '#ff5fd0'
      : enemy.kind === KIND_WEAVER ? '#ff9f43'
        : enemy.kind === KIND_SPITTER ? '#ff4d4d'
          : enemy.kind === KIND_SPLITTER ? '#b678ff' : '#d9a0ff';
    addParticles(enemy.x, enemy.y, enemy.kind === KIND_SPLITTER ? 34 : 20, color, 260, 3.5);
    addParticles(enemy.x, enemy.y, 8, '#ffffff', 140, 2);
    state.kills += 1;
    if (enemy.kind === KIND_SPLITTER) {
      for (let i = 0; i < 3; i += 1) spawnMini(enemy.x, enemy.y);
    }
    if (award) {
      const gained = enemy.score * state.combo;
      state.score += gained;
      addFloater(enemy.x, enemy.y, `+${gained}`, '#dff6ff');
      raiseCombo();
      dropLoot(enemy.x, enemy.y, enemy.kind);
    }
    state.shake = Math.min(state.shake + (enemy.kind === KIND_SPLITTER ? 9 : 4), 12);
    return EVENT_KILL;
  }

  function hurtShip() {
    if (state.ship.invuln > 0) return 0;
    if (state.time < state.shieldUntil) {
      addParticles(state.ship.x, state.ship.y, 14, '#6db7ff', 220, 3);
      state.shake = Math.min(state.shake + 5, 12);
      return EVENT_HIT;
    }
    state.hull -= 1;
    state.ship.invuln = SHIP.invulnerableSeconds;
    state.flash = 0.35;
    state.shake = 12;
    state.combo = 1;
    state.comboTimer = 0;
    addParticles(state.ship.x, state.ship.y, 26, '#ff5d73', 300, 3.5);
    if (state.hull <= 0) {
      addParticles(state.ship.x, state.ship.y, 60, '#57f7ff', 380, 4);
      addParticles(state.ship.x, state.ship.y, 30, '#ffffff', 260, 3);
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function fireBullet() {
    const ship = state.ship;
    const spread = state.time < state.spreadUntil;
    const offsets = spread ? [-0.17, 0, 0.17] : [0];
    for (const offset of offsets) {
      const angle = ship.angle + offset;
      state.bullets.push({
        x: ship.x + Math.cos(angle) * 24,
        y: ship.y + Math.sin(angle) * 24,
        vx: Math.cos(angle) * SHIP.bulletSpeed,
        vy: Math.sin(angle) * SHIP.bulletSpeed,
        life: SHIP.bulletSpeed * 0 + 1.2,
        radius: SHIP.bulletRadius,
      });
    }
  }

  function stepShip(dt, input) {
    const ship = state.ship;
    ship.vx += input.moveX * SHIP.accel * dt;
    ship.vy += input.moveY * SHIP.accel * dt;
    const drag = Math.max(0, 1 - SHIP.drag * dt);
    ship.vx *= drag;
    ship.vy *= drag;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > SHIP.maxSpeed) {
      ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
      ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
    }
    ship.x = Math.min(FIELD.width - 24, Math.max(24, ship.x + ship.vx * dt));
    ship.y = Math.min(FIELD.height - 24, Math.max(24, ship.y + ship.vy * dt));
    ship.angle = Math.atan2(input.aimY - ship.y, input.aimX - ship.x);
    if (ship.invuln > 0) ship.invuln -= dt;
    ship.fireTimer -= dt;
    const interval = state.time < state.overdriveUntil ? SHIP.overdriveInterval : SHIP.fireInterval;
    if (input.firing && ship.fireTimer <= 0) {
      fireBullet();
      ship.fireTimer = interval;
    }
    if (speed > 60 && random.chance(0.6)) {
      state.particles.push({
        x: ship.x - Math.cos(ship.angle) * 18 + random.range(-3, 3),
        y: ship.y - Math.sin(ship.angle) * 18 + random.range(-3, 3),
        vx: -ship.vx * 0.15 + random.range(-12, 12),
        vy: -ship.vy * 0.15 + random.range(-12, 12),
        life: 0.35, max: 0.35, size: 2.4, color: '#2fb9d8',
      });
    }
  }

  function stepEnemies(dt) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.age += dt;
      if (enemy.kind === KIND_DRIFTER) {
        enemy.y += enemy.speed * dt;
        enemy.x = enemy.baseX + Math.sin(enemy.age * 1.6) * 42;
      } else if (enemy.kind === KIND_WEAVER) {
        enemy.y += enemy.speed * dt;
        enemy.x = enemy.baseX + Math.sin(enemy.age * 3.1) * 130;
      } else if (enemy.kind === KIND_SPITTER) {
        if (enemy.y < enemy.targetY) {
          enemy.y += enemy.speed * dt;
        } else {
          enemy.x = enemy.baseX + Math.sin(enemy.age * 1.1) * 46;
          enemy.shotTimer -= dt;
          if (enemy.shotTimer <= 0) {
            enemy.shotTimer = ENEMY.spitter.shotInterval * random.range(0.9, 1.15);
            const aim = Math.atan2(state.ship.y - enemy.y, state.ship.x - enemy.x);
            state.enemyBullets.push({
              x: enemy.x, y: enemy.y + enemy.radius,
              vx: Math.cos(aim) * ORB.speed, vy: Math.sin(aim) * ORB.speed,
              radius: ORB.radius,
            });
            addParticles(enemy.x, enemy.y + enemy.radius, 4, '#ff7ab8', 90, 2);
          }
        }
      } else if (enemy.kind === KIND_SPLITTER) {
        enemy.y += enemy.speed * dt;
        enemy.x = enemy.baseX + Math.sin(enemy.age * 0.9) * 30;
        enemy.angle += dt * 0.8;
      } else {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.x < 12 || enemy.x > FIELD.width - 12) enemy.vx *= -1;
      }
      if (enemy.y > FIELD.height + 60 || enemy.y < -120 || enemy.x < -80 || enemy.x > FIELD.width + 80) {
        state.enemies.splice(i, 1);
      }
    }
  }

  function stepBullets(dt) {
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
        state.bullets.splice(i, 1);
      }
    }
    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const orb = state.enemyBullets[i];
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      if (orb.x < -20 || orb.x > FIELD.width + 20 || orb.y < -20 || orb.y > FIELD.height + 20) {
        state.enemyBullets.splice(i, 1);
      }
    }
  }

  function stepPickups(dt) {
    const ship = state.ship;
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const shard = state.shards[i];
      shard.age += dt;
      const d2 = dist2(shard.x, shard.y, ship.x, ship.y);
      if (d2 < SHARD.magnetRadius * SHARD.magnetRadius) {
        const d = Math.max(1, Math.sqrt(d2));
        const pull = 900 * (1 - d / (SHARD.magnetRadius * 1.4));
        shard.vx += ((ship.x - shard.x) / d) * pull * dt;
        shard.vy += ((ship.y - shard.y) / d) * pull * dt;
      } else {
        shard.vy += (SHARD.fallSpeed - shard.vy) * dt * 0.5;
      }
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (d2 < SHARD.collectRadius * SHARD.collectRadius) {
        state.shards.splice(i, 1);
        const gained = SHARD.value * state.combo;
        state.score += gained;
        state.shardsGot += 1;
        addFloater(shard.x, shard.y, `+${gained}`, '#ffd94d');
        addParticles(shard.x, shard.y, 6, '#ffd94d', 120, 2);
        raiseCombo();
      } else if (shard.y > FIELD.height + 30) {
        state.shards.splice(i, 1);
      }
    }
    for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
      const power = state.powerups[i];
      power.age += dt;
      power.y += power.vy * dt;
      if (dist2(power.x, power.y, ship.x, ship.y) < 34 * 34) {
        state.powerups.splice(i, 1);
        if (power.kind === 'spread') state.spreadUntil = state.time + POWER.spreadSeconds;
        if (power.kind === 'shield') state.shieldUntil = state.time + POWER.shieldSeconds;
        if (power.kind === 'overdrive') state.overdriveUntil = state.time + POWER.overdriveSeconds;
        addFloater(ship.x, ship.y - 30, power.kind.toUpperCase(), '#7dff9e');
        addParticles(ship.x, ship.y, 16, '#7dff9e', 200, 3);
      } else if (power.y > FIELD.height + 30) {
        state.powerups.splice(i, 1);
      }
    }
  }

  function stepCollisions() {
    let events = 0;
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        const reach = bullet.radius + enemy.radius;
        if (dist2(bullet.x, bullet.y, enemy.x, enemy.y) < reach * reach) {
          state.bullets.splice(i, 1);
          enemy.hp -= 1;
          addParticles(bullet.x, bullet.y, 5, '#8ffaff', 160, 2);
          if (enemy.hp <= 0) events |= killEnemy(enemy, j, true);
          break;
        }
      }
    }
    const ship = state.ship;
    if (ship.invuln <= 0) {
      for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
        const orb = state.enemyBullets[i];
        const reach = orb.radius + SHIP.radius;
        if (dist2(orb.x, orb.y, ship.x, ship.y) < reach * reach) {
          state.enemyBullets.splice(i, 1);
          events |= hurtShip();
          break;
        }
      }
    }
    if (ship.invuln <= 0 && !(events & EVENT_OVER)) {
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        const reach = enemy.radius + SHIP.radius - 4;
        if (dist2(enemy.x, enemy.y, ship.x, ship.y) < reach * reach) {
          events |= killEnemy(enemy, j, false);
          events |= hurtShip();
          break;
        }
      }
    }
    return events;
  }

  function stepFx(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - 2.2 * dt);
      p.vy *= Math.max(0, 1 - 2.2 * dt);
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.y -= 42 * dt;
      f.life -= dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    for (const star of state.stars) {
      star.y += star.speed * dt;
      if (star.y > FIELD.height + 2) {
        star.y = -2;
        star.x = random.range(0, FIELD.width);
      }
    }
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (state.flash > 0) state.flash -= dt;
    if (state.banner.timer > 0) state.banner.timer -= dt;
  }

  function reset() {
    state.time = 0;
    state.ship = { x: FIELD.width / 2, y: FIELD.height - 120, vx: 0, vy: 0, angle: -Math.PI / 2, fireTimer: 0, invuln: 0 };
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.shards = [];
    state.powerups = [];
    state.particles = [];
    state.floaters = [];
    state.wave = 0;
    state.waveState = 'intro';
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.clearTimer = 0;
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.hull = 3;
    state.maxHull = 3;
    state.kills = 0;
    state.shardsGot = 0;
    state.shake = 0;
    state.flash = 0;
    state.spreadUntil = 0;
    state.overdriveUntil = 0;
    state.shieldUntil = 0;
    state.banner = { text: '', timer: 0 };
    state.demoTimer = 0;
    makeStars();
    startWave(1);
  }

  /**
   * Advance the world one fixed step. `demo` runs the title-screen backdrop:
   * stars drift, a few enemies float by, nothing shoots and the ship rests.
   */
  function step(dt, input, demo) {
    state.time += dt;
    if (demo) {
      state.demoTimer -= dt;
      if (state.demoTimer <= 0 && state.enemies.length < 7) {
        state.demoTimer = 1.1;
        spawnEnemy(random.pick([KIND_DRIFTER, KIND_WEAVER, KIND_SPLITTER]));
      }
      stepEnemies(dt);
      stepFx(dt);
      return 0;
    }
    let events = 0;
    stepShip(dt, input);
    if (state.waveState === 'fight' && state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(state.spawnQueue.shift());
        state.spawnTimer = Math.max(0.35, WAVE.spawnInterval - state.wave * 0.03);
      }
    }
    stepEnemies(dt);
    stepBullets(dt);
    stepPickups(dt);
    events |= stepCollisions();
    if (events & EVENT_OVER) return events;
    if (state.waveState === 'fight' && state.spawnQueue.length === 0 && state.enemies.length === 0) {
      state.waveState = 'clear';
      const bonus = WAVE.clearBonusPerWave * state.wave;
      state.score += bonus;
      addFloater(FIELD.width / 2, FIELD.height / 2 - 60, `WAVE CLEAR +${bonus}`, '#7dff9e');
      state.clearTimer = 2.4;
      events |= EVENT_WAVE;
    }
    if (state.waveState === 'clear') {
      state.clearTimer -= dt;
      if (state.clearTimer <= 0) startWave(state.wave + 1);
    }
    stepFx(dt);
    return events;
  }

  reset();

  return { state, reset, step, startWave };
}
