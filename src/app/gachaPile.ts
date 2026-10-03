// gachaPile.ts
// Tạo một đống capsule đặc, tự nhiên và deterministic cho máy gacha.
// Hệ tọa độ khớp với .gacha-ball-chamber / useGachaPhysics.ts: W=100, H=74.

export type PileBall = {
  left: number;
  top: number;
  rotate: number;
  scale: number;
  z: number;
  sprite: number;
  rear: boolean;
};

type RawBall = {
  x: number;
  y: number;
  r: number;
  scale: number;
  rear: boolean;
};

const W = 100;
const H = 74;
const CX = 50;
const CY = 45.8;
const GLASS_R = 41;
const BALL_D = 19.5;

const TARGET_BALLS = 14;
const COLLISION_FACTOR = 0.72;
const WALL_ALLOWANCE = 0.5;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function floorY(x: number, r: number) {
  return H - 6 * Math.pow((x - CX) / GLASS_R, 2) + 0.3 - r;
}

function insideGlass(x: number, y: number, r: number) {
  return Math.hypot(x - CX, y - CY) <= GLASS_R - r * WALL_ALLOWANCE;
}

function collides(ball: RawBall, placed: RawBall[]) {
  return placed.some((other) => {
    const minDistance = (ball.r + other.r) * COLLISION_FACTOR;
    return Math.hypot(ball.x - other.x, ball.y - other.y) < minDistance;
  });
}

function canPlace(ball: RawBall, placed: RawBall[]) {
  return (
    insideGlass(ball.x, ball.y, ball.r) &&
    ball.y <= floorY(ball.x, ball.r) + 0.01 &&
    !collides(ball, placed)
  );
}

function settleBall(ball: RawBall, placed: RawBall[], rnd: () => number) {
  const STEP = 0.42;
  const MAX_STEPS = 1500;

  for (let i = 0; i < MAX_STEPS; i++) {
    const down = { ...ball, y: ball.y + STEP };
    if (canPlace(down, placed)) {
      ball.y = down.y;
      continue;
    }

    // Khi bị chặn, thử lăn xuống khe hai bên. Ưu tiên hướng gần tâm
    // để đống bóng đặc, nhưng vẫn thêm nhiễu để tránh xếp thành hàng.
    const towardCenter = ball.x < CX ? 1 : -1;
    const randomDir = rnd() < 0.28 ? -towardCenter : towardCenter;
    const directions = [randomDir, -randomDir];
    const moves = [
      { dx: 0.42, dy: 0.34 },
      { dx: 0.72, dy: 0.24 },
      { dx: 1.05, dy: 0.12 },
      { dx: 1.4, dy: 0.04 },
    ];

    let moved = false;
    for (const move of moves) {
      for (const dir of directions) {
        const next = {
          ...ball,
          x: ball.x + dir * move.dx,
          y: ball.y + move.dy,
        };
        if (!canPlace(next, placed)) continue;
        ball.x = next.x;
        ball.y = next.y;
        moved = true;
        break;
      }
      if (moved) break;
    }

    if (!moved) break;
  }
}

function buildRawPile(rnd: () => number): RawBall[] {
  const placed: RawBall[] = [];
  let attempts = 0;

  while (placed.length < TARGET_BALLS && attempts < 2400) {
    attempts++;

    const rear = placed.length < 14 ? true : rnd() < 0.46;
    const scale = rear
      ? 0.88 + rnd() * 0.08
      : 0.96 + rnd() * 0.10;
    const r = (BALL_D * scale) / 2;

    // Phân bố X: nhiều bóng gần giữa hơn, nhưng vẫn phủ sát hai thành cong.
    const spread = placed.length < 9 ? 0.92 : 0.78;
    let x = CX + (rnd() + rnd() - 1) * GLASS_R * spread;

    // Cứ vài viên ép điểm thả sang mép để tránh đống bị co thành cột giữa.
    if (placed.length % 7 === 1) x = CX - GLASS_R * (0.48 + rnd() * 0.22);
    if (placed.length % 7 === 5) x = CX + GLASS_R * (0.48 + rnd() * 0.22);

    // FIX: thả từ đúng mép trên của vòng kính tại cột x này.
    // Trước đây y luôn ở đỉnh kính (~15), nơi kính còn rất hẹp, nên các
    // điểm thả lệch ra mép bị insideGlass() loại hết -> chỉ có 1 viên.
    const R = GLASS_R - r * WALL_ALLOWANCE;
    const dx = x - CX;
    const yTop = CY - Math.sqrt(Math.max(0, R * R - dx * dx)) + 0.5;

    const ball: RawBall = {
      x,
      y: yTop,
      r,
      scale,
      rear,
    };

    if (!insideGlass(ball.x, ball.y, ball.r) || collides(ball, placed)) continue;

    settleBall(ball, placed, rnd);

    // Chỉ nhận bóng đã thực sự rơi xuống vùng đống.
    const pileTop = 27.5;
    if (ball.y - ball.r < pileTop) continue;

    placed.push(ball);
  }

  return placed;
}

function assignSprites(balls: RawBall[], spriteCount: number, rnd: () => number) {
  if (spriteCount <= 0) return balls.map(() => 0);

  const sprites = new Array<number>(balls.length);
  const counts = new Array<number>(spriteCount).fill(0);

  balls
    .map((ball, index) => ({ ball, index }))
    .sort((a, b) => b.ball.y - a.ball.y)
    .forEach(({ ball, index }) => {
      let bestSprite = 0;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let sprite = 0; sprite < spriteCount; sprite++) {
        let score = counts[sprite] * 0.45 + rnd() * 0.35;

        for (let j = 0; j < balls.length; j++) {
          if (sprites[j] !== sprite) continue;
          const distance = Math.hypot(ball.x - balls[j].x, ball.y - balls[j].y);
          if (distance < BALL_D * 1.2) score += 3.5;
        }

        if (score < bestScore) {
          bestScore = score;
          bestSprite = sprite;
        }
      }

      sprites[index] = bestSprite;
      counts[bestSprite]++;
    });

  return sprites;
}

export function buildPile(spriteCount: number, seed = 7): PileBall[] {
  const rnd = mulberry32(seed);
  const balls = buildRawPile(rnd);
  const sprites = assignSprites(balls, spriteCount, rnd);

  return balls.map((ball, index) => {
    const strongTilt = rnd() < 0.32;
    const rotate = strongTilt
      ? (rnd() < 0.5 ? -1 : 1) * (38 + rnd() * 62)
      : (rnd() - 0.5) * 42;

    return {
      left: (ball.x / W) * 100,
      top: (ball.y / H) * 100,
      rotate,
      scale: ball.scale,
      // rear luôn sau, viên thấp hơn luôn trước.
      z: ball.rear
        ? Math.round(ball.y * 10)
        : 1000 + Math.round(ball.y * 10),
      sprite: sprites[index],
      rear: ball.rear,
    };
  });
}
