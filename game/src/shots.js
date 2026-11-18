// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by an
// autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame. The play pilot flies well — it chases
// shards, keeps its distance from danger and fires at whatever is above it —
// while the end pilot barely flies at all, so it is caught out once the
// waves speed up, as a hurried player is.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;

/** Where the pilot wants to be: shards when they are safe, else open space. */
function autopilot(state, skilled) {
  const ship = state.ship;
  let targetX = FIELD.width / 2;
  let targetY = FIELD.height - 160;
  let nearestShard = null;
  let nearestShardD2 = Infinity;
  for (const shard of state.shards) {
    const d2 = (shard.x - ship.x) ** 2 + (shard.y - ship.y) ** 2;
    if (d2 < nearestShardD2) {
      nearestShardD2 = d2;
      nearestShard = shard;
    }
  }
  if (skilled && nearestShard) {
    targetX = nearestShard.x;
    targetY = nearestShard.y;
  }
  let dangerX = 0;
  let dangerY = 0;
  let danger = 0;
  const threats = [];
  for (const orb of state.enemyBullets) threats.push([orb.x, orb.y, 130]);
  for (const enemy of state.enemies) threats.push([enemy.x, enemy.y, enemy.radius + 90]);
  for (const [x, y, radius] of threats) {
    const dx = ship.x - x;
    const dy = ship.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius && d2 > 1) {
      const d = Math.sqrt(d2);
      const push = (1 - d / radius) * 2.2;
      dangerX += (dx / d) * push;
      dangerY += (dy / d) * push;
      danger += push;
    }
  }
  let moveX = 0;
  let moveY = 0;
  if (danger > 0.05) {
    moveX = dangerX;
    moveY = dangerY;
  } else {
    moveX = (targetX - ship.x) / 120;
    moveY = (targetY - ship.y) / 120;
  }
  const moveLength = Math.hypot(moveX, moveY);
  if (moveLength > 1) {
    moveX /= moveLength;
    moveY /= moveLength;
  }
  let aimX = ship.x;
  let aimY = ship.y - 300;
  let nearestEnemy = null;
  let nearestEnemyD2 = Infinity;
  for (const enemy of state.enemies) {
    const d2 = (enemy.x - ship.x) ** 2 + (enemy.y - ship.y) ** 2;
    if (d2 < nearestEnemyD2) {
      nearestEnemyD2 = d2;
      nearestEnemy = enemy;
    }
  }
  if (nearestEnemy) {
    aimX = nearestEnemy.x;
    aimY = nearestEnemy.y;
  }
  const firing = skilled ? nearestEnemy !== null : false;
  return { moveX, moveY, aimX, aimY, firing };
}

const IDLE_INPUT = { moveX: 0, moveY: 0, aimX: FIELD.width / 2, aimY: 200, firing: false };

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, IDLE_INPUT, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const skilled = name === 'play';
  for (let i = 0; i < limit / STEP; i += 1) {
    const input = skilled ? autopilot(world.state, true) : autopilot(world.state, false);
    if (world.step(STEP, input, false) & EVENT_OVER) break;
  }
  const over = world.state.hull <= 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
