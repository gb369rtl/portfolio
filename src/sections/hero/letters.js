// What happens when something crosses the portrait: anything that moves over the letters is a stone.
// A letter inside a stone's reach is thrown clear, taking some of the stone's own speed; otherwise a spring
// pulls it home. All distances are for a portrait 600 px tall and scale with the portrait's real height.

const DESIGN_HEIGHT = 600;
const REACH = 16; // px from a stone's centre
const HIT = 640; // px/s a letter leaves with
const TRANSFER = 1.6; // share of the stone's speed it takes along
const STIFFNESS = 18;
const DAMPING = 5.5;
const MAX_STONE_SPEED = 3000;
const MAX_LETTER_SPEED = 4400;

/**
 * @param {object} face the portrait's dot set; this writes its O (offset) array
 * @param {object} renderer the renderer drawing `face`
 * @returns {(dt: number, box: {left: number, top: number, width: number, height: number}, stones: {x: number, y: number}[]) => void}
 *   call once per frame with the portrait's box and the position of every stone, in the same coordinates
 */
export function createLetterPhysics(face, renderer) {
  const offsetX = new Float32Array(face.n);
  const offsetY = new Float32Array(face.n);
  const speedX = new Float32Array(face.n);
  const speedY = new Float32Array(face.n);
  let before = []; // where each stone was a frame ago, to know how fast it is going

  return function knock(dt, box, stones) {
    if (dt <= 0) return;
    const scale = box.height / DESIGN_HEIGHT;
    const half = box.height / 2;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const reach = REACH * scale;
    const maxStone = MAX_STONE_SPEED * scale;
    const maxLetter = MAX_LETTER_SPEED * scale;

    const moving = stones.map((stone, i) => {
      if (!stone) return null;
      const x = stone.x - cx;
      const y = stone.y - cy;
      const was = before[i];
      let vx = was ? (x - was.x) / dt : 0;
      let vy = was ? (y - was.y) / dt : 0;
      const speed = Math.hypot(vx, vy);
      if (speed > maxStone) {
        vx *= maxStone / speed;
        vy *= maxStone / speed;
      }
      return { x, y, vx, vy };
    });
    before = moving.map((stone) => stone && { x: stone.x, y: stone.y });
    const live = moving.filter(Boolean);

    for (let i = 0; i < face.n; i++) {
      const x = face.B[i * 3] * half + offsetX[i];
      const y = -face.B[i * 3 + 1] * half + offsetY[i];
      let hit = false;
      for (const stone of live) {
        const dx = x - stone.x;
        const dy = y - stone.y;
        if (dx > reach || dx < -reach || dy > reach || dy < -reach) continue;
        const distance = Math.hypot(dx, dy);
        if (distance < reach) {
          const nx = distance > 0.001 ? dx / distance : Math.random() - 0.5;
          const ny = distance > 0.001 ? dy / distance : Math.random() - 0.5;
          speedX[i] = nx * HIT * scale + stone.vx * TRANSFER;
          speedY[i] = ny * HIT * scale + stone.vy * TRANSFER;
          hit = true;
          break;
        }
      }
      if (!hit) {
        speedX[i] += (-offsetX[i] * STIFFNESS - speedX[i] * DAMPING) * dt;
        speedY[i] += (-offsetY[i] * STIFFNESS - speedY[i] * DAMPING) * dt;
      }
      const speed = Math.hypot(speedX[i], speedY[i]);
      if (speed > maxLetter) {
        speedX[i] *= maxLetter / speed;
        speedY[i] *= maxLetter / speed;
      }
      offsetX[i] += speedX[i] * dt;
      offsetY[i] += speedY[i] * dt;
      face.O[i * 2] = offsetX[i] / half;
      face.O[i * 2 + 1] = -offsetY[i] / half;
    }
    renderer.setDots(face, ['aO']);
  };
}
