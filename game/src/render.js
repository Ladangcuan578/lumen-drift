// Lumen Drift's renderer: every pixel is drawn here — the nebula backdrop,
// parallax starfield, glowing ships and enemies, particles, the HUD and the
// title / pause / game-over panels. Nothing is loaded from a file.
import { FIELD, PALETTE, FONT, viewTransform } from './config.js';
import {
  KIND_DRIFTER, KIND_MINI, KIND_SPITTER, KIND_SPLITTER, KIND_WEAVER,
} from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const SHIP_RING = 30;

const NEBULAE = [
  { x: 260, y: 150, r: 320, color: PALETTE.nebulaA },
  { x: 1050, y: 420, r: 380, color: PALETTE.nebulaB },
  { x: 700, y: 640, r: 300, color: PALETTE.nebulaC },
  { x: 1150, y: 90, r: 220, color: PALETTE.nebulaA },
];

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(4, 10, 26, 0.78)';
  ctx.strokeStyle = 'rgba(87, 247, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawShip(state) {
    const ship = state.ship;
    if (ship.invuln > 0 && Math.floor(state.time * 14) % 2 === 0) return;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    if (state.time < state.shieldUntil) {
      ctx.beginPath();
      ctx.arc(0, 0, SHIP_RING, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(109, 183, 255, 0.8)';
      ctx.lineWidth = 2.5;
      glow(ctx, PALETTE.shield, 14);
      ctx.stroke();
      ctx.fillStyle = 'rgba(109, 183, 255, 0.08)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > 50) {
      const flicker = 14 + Math.sin(state.time * 42) * 5;
      ctx.beginPath();
      ctx.moveTo(-6, 14);
      ctx.lineTo(0, 14 + flicker);
      ctx.lineTo(6, 14);
      ctx.closePath();
      ctx.fillStyle = '#ff9f43';
      glow(ctx, '#ff9f43', 12);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.rotate(ship.angle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(13, 12);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 10);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-13, 12);
    ctx.closePath();
    ctx.fillStyle = PALETTE.ship;
    glow(ctx, PALETTE.ship, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -4, 4, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.shipCore;
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const color = enemy.kind === KIND_DRIFTER ? PALETTE.drifter
      : enemy.kind === KIND_WEAVER ? PALETTE.weaver
        : enemy.kind === KIND_SPITTER ? PALETTE.spitter
          : enemy.kind === KIND_SPLITTER ? PALETTE.splitter : PALETTE.mini;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    glow(ctx, color, 14);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (enemy.kind === KIND_DRIFTER || enemy.kind === KIND_MINI) {
      ctx.rotate(Math.sin(enemy.age * 1.6) * 0.35);
      ctx.beginPath();
      ctx.moveTo(0, enemy.radius);
      ctx.lineTo(enemy.radius * 0.9, -enemy.radius * 0.7);
      ctx.lineTo(-enemy.radius * 0.9, -enemy.radius * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === KIND_WEAVER) {
      ctx.rotate(enemy.age * 1.2);
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius, 0);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius, 0);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === KIND_SPITTER) {
      ctx.rotate(Math.sin(enemy.age * 0.8) * 0.2);
      ctx.strokeRect(-enemy.radius * 0.8, -enemy.radius * 0.8, enemy.radius * 1.6, enemy.radius * 1.6);
      const pulse = 4 + Math.sin(enemy.age * 5) * 2;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd7d7';
      ctx.fill();
    } else {
      ctx.rotate(enemy.angle);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * enemy.radius;
        const py = Math.sin(a) * enemy.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.rotate(-enemy.angle * 2);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * enemy.radius * 0.45;
        const py = Math.sin(a) * enemy.radius * 0.45;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(7, 11, 29, 0.85)';
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    if (enemy.maxHp > 1 && enemy.hp < enemy.maxHp) {
      const w = enemy.radius * 1.6;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-w / 2, -enemy.radius - 12, w, 4);
      ctx.fillStyle = '#ff5d73';
      ctx.fillRect(-w / 2, -enemy.radius - 12, (w * enemy.hp) / enemy.maxHp, 4);
    }
    ctx.restore();
  }

  function drawHud(state, best) {
    text(ctx, 'SCORE', 28, 30, 13, PALETTE.dim, 'left', 600);
    text(ctx, String(state.score), 28, 56, 30, PALETTE.text, 'left', 800);
    text(ctx, `BEST ${Math.max(best, state.score)}`, 28, 84, 13, PALETTE.dim, 'left', 600);
    text(ctx, `WAVE ${state.wave}`, FIELD.width - 28, 40, 20, PALETTE.text, 'right', 800);
    text(ctx, `${state.kills} KILLS  ·  ${state.shardsGot} SHARDS`, FIELD.width - 28, 66, 13, PALETTE.dim, 'right', 600);
    if (state.combo > 1) {
      const width = 170;
      const x = FIELD.width / 2 - width / 2;
      text(ctx, `COMBO x${state.combo}`, FIELD.width / 2, 30, 18, PALETTE.shard, 'center', 800);
      ctx.fillStyle = 'rgba(255, 217, 77, 0.25)';
      ctx.fillRect(x, 46, width, 6);
      ctx.fillStyle = PALETTE.shard;
      ctx.fillRect(x, 46, (width * state.comboTimer) / 3.5, 6);
    }
    text(ctx, 'HULL', 28, FIELD.height - 52, 13, PALETTE.dim, 'left', 600);
    for (let i = 0; i < state.maxHull; i += 1) {
      const x = 34 + i * 26;
      const y = FIELD.height - 28;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      const filled = i < state.hull;
      ctx.fillStyle = filled ? PALETTE.hull : 'rgba(255, 93, 115, 0.18)';
      glow(ctx, PALETTE.hull, filled ? 10 : 0);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }
    const powers = [];
    if (state.time < state.spreadUntil) powers.push(['SPREAD', PALETTE.spread, state.spreadUntil - state.time]);
    if (state.time < state.shieldUntil) powers.push(['SHIELD', PALETTE.shield, state.shieldUntil - state.time]);
    if (state.time < state.overdriveUntil) powers.push(['OVERDRIVE', PALETTE.overdrive, state.overdriveUntil - state.time]);
    powers.forEach((power, index) => {
      const y = FIELD.height - 28 - index * 24;
      text(ctx, `${power[0]} ${Math.ceil(power[2])}s`, FIELD.width - 28, y, 13, power[1], 'right', 700);
    });
    if (state.banner.timer > 0) {
      const alpha = Math.min(1, state.banner.timer);
      ctx.save();
      ctx.globalAlpha = alpha;
      glow(ctx, PALETTE.ship, 24);
      text(ctx, state.banner.text, FIELD.width / 2, 180, 54, PALETTE.text, 'center', 800);
      ctx.restore();
    }
  }

  function drawTitle(state, best) {
    panel(ctx, FIELD.width / 2 - 330, 120, 660, 440);
    glow(ctx, PALETTE.ship, 26);
    text(ctx, 'LUMEN DRIFT', FIELD.width / 2, 185, 58, PALETTE.ship, 'center', 800);
    ctx.shadowBlur = 0;
    text(ctx, 'a neon arcade space shooter', FIELD.width / 2, 232, 18, PALETTE.dim, 'center', 500);
    text(ctx, 'WASD / ARROWS — fly     MOUSE — aim', FIELD.width / 2, 300, 17, PALETTE.text, 'center', 600);
    text(ctx, 'CLICK or SPACE — fire (hold to autofire)', FIELD.width / 2, 330, 17, PALETTE.text, 'center', 600);
    text(ctx, 'P — pause     M — sound     R — restart', FIELD.width / 2, 360, 17, PALETTE.text, 'center', 600);
    text(ctx, 'Blast the drifters, grab star shards, chain combos.', FIELD.width / 2, 408, 15, PALETTE.dim, 'center', 500);
    text(ctx, 'Splitters break apart. Spitters shoot back. Survive.', FIELD.width / 2, 432, 15, PALETTE.dim, 'center', 500);
    const pulse = 0.65 + Math.sin(state.time * 3) * 0.35;
    ctx.save();
    ctx.globalAlpha = pulse;
    text(ctx, 'CLICK OR PRESS SPACE TO LAUNCH', FIELD.width / 2, 500, 20, PALETTE.shard, 'center', 800);
    ctx.restore();
    if (best > 0) text(ctx, `BEST SCORE ${best}`, FIELD.width / 2, 536, 15, PALETTE.dim, 'center', 600);
  }

  function drawPaused() {
    panel(ctx, FIELD.width / 2 - 230, FIELD.height / 2 - 90, 460, 180);
    text(ctx, 'PAUSED', FIELD.width / 2, FIELD.height / 2 - 34, 40, PALETTE.text, 'center', 800);
    text(ctx, 'P or click to keep flying', FIELD.width / 2, FIELD.height / 2 + 24, 16, PALETTE.dim, 'center', 500);
  }

  function drawOver(state, best) {
    const isBest = state.score >= best && state.score > 0;
    panel(ctx, FIELD.width / 2 - 300, 150, 600, 380);
    text(ctx, 'SHIP LOST', FIELD.width / 2, 215, 48, PALETTE.hull, 'center', 800);
    if (isBest) {
      glow(ctx, PALETTE.shard, 18);
      text(ctx, 'NEW BEST SCORE!', FIELD.width / 2, 268, 22, PALETTE.shard, 'center', 800);
      ctx.shadowBlur = 0;
    }
    text(ctx, `SCORE  ${state.score}`, FIELD.width / 2, 322, 30, PALETTE.text, 'center', 800);
    text(ctx, `BEST  ${Math.max(best, state.score)}`, FIELD.width / 2, 360, 17, PALETTE.dim, 'center', 600);
    text(ctx, `WAVE ${state.wave}  ·  ${state.kills} KILLS  ·  ${state.shardsGot} SHARDS`, FIELD.width / 2, 392, 15, PALETTE.dim, 'center', 500);
    const pulse = 0.65 + Math.sin(state.time * 3) * 0.35;
    ctx.save();
    ctx.globalAlpha = pulse;
    text(ctx, 'PRESS R OR CLICK TO FLY AGAIN', FIELD.width / 2, 470, 19, PALETTE.shard, 'center', 800);
    ctx.restore();
  }

  function draw(state, screen, best) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || FIELD.width;
    const cssH = canvas.clientHeight || FIELD.height;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, cssW, cssH);
    const view = viewTransform(canvas);
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);
    if (state.shake > 0.3) {
      // A deterministic wobble from the clock, not Math.random: the same
      // staged frame must paint byte-identical every time it is shot.
      const sway = Math.sin(state.time * 127.1) * state.shake;
      const heave = Math.cos(state.time * 311.7) * state.shake;
      ctx.translate(sway, heave);
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.bgTop);
    gradient.addColorStop(1, PALETTE.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(-30, -30, FIELD.width + 60, FIELD.height + 60);
    for (const nebula of NEBULAE) {
      const radial = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
      radial.addColorStop(0, nebula.color + '55');
      radial.addColorStop(1, nebula.color + '00');
      ctx.fillStyle = radial;
      ctx.fillRect(nebula.x - nebula.r, nebula.y - nebula.r, nebula.r * 2, nebula.r * 2);
    }
    for (const star of state.stars) {
      ctx.fillStyle = star.layer === 2 ? '#ffffff' : star.layer === 1 ? '#bcd8ff' : '#6f87b8';
      ctx.globalAlpha = star.layer === 0 ? 0.5 : 0.9;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
    for (const shard of state.shards) {
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.age * 2.4);
      glow(ctx, PALETTE.shard, 12);
      ctx.fillStyle = PALETTE.shard;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (const power of state.powerups) {
      const color = power.kind === 'spread' ? PALETTE.spread : power.kind === 'shield' ? PALETTE.shield : PALETTE.overdrive;
      const letter = power.kind === 'spread' ? 'S' : power.kind === 'shield' ? 'A' : 'O';
      ctx.save();
      ctx.translate(power.x, power.y + Math.sin(power.age * 3) * 3);
      glow(ctx, color, 14);
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(4, 10, 26, 0.9)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      text(ctx, letter, 0, 1, 15, color, 'center', 800);
      ctx.restore();
    }
    for (const enemy of state.enemies) drawEnemy(enemy);
    for (const orb of state.enemyBullets) {
      ctx.save();
      glow(ctx, PALETTE.orb, 12);
      ctx.fillStyle = PALETTE.orb;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const bullet of state.bullets) {
      ctx.save();
      ctx.strokeStyle = PALETTE.bullet;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      glow(ctx, PALETTE.bullet, 10);
      const tail = 14;
      const length = Math.hypot(bullet.vx, bullet.vy) || 1;
      ctx.beginPath();
      ctx.moveTo(bullet.x - (bullet.vx / length) * tail, bullet.y - (bullet.vy / length) * tail);
      ctx.lineTo(bullet.x, bullet.y);
      ctx.stroke();
      ctx.restore();
    }
    if (screen !== SCREEN_OVER) drawShip(state);
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const floater of state.floaters) {
      ctx.globalAlpha = Math.max(0, floater.life / floater.max);
      text(ctx, floater.text, floater.x, floater.y, 16, floater.color, 'center', 800);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);
    if (screen !== SCREEN_TITLE) drawHud(state, best);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 40, 70, ${Math.min(0.35, state.flash)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
    ctx.restore();
  }

  return { draw };
}
