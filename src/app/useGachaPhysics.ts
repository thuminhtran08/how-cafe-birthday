"use client";

import { RefObject, useEffect, useRef } from "react";

type GachaBall = {
  id: number;
  left: number;
  top: number;
  rotate: number;
  scale: number;
  z: number;
  rear: boolean;
};

type Body = {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  radius: number;
};

const GRAVITY = 1500;
const AIR_FORCE = 820;
const SIDE_FORCE = 420;
const BOUNCE = 0.58;
const DRAG = 0.992;
const ANGULAR_DRAG = 0.985;

const random = (min: number, max: number) =>
  min + Math.random() * (max - min);

export function useGachaPhysics(
  chamberRef: RefObject<HTMLDivElement | null>,
  balls: readonly GachaBall[],
  playing: boolean
) {
  const rafRef = useRef<number | null>(null);
  const bodiesRef = useRef<Body[]>([]);
  const previousTimeRef = useRef<number | null>(null);

  // Khởi tạo body từ pile hiện tại.
  useEffect(() => {
    const chamber = chamberRef.current;
    if (!chamber) return;

    const elements = Array.from(
      chamber.querySelectorAll<HTMLElement>(".gacha-ball")
    );

    if (!elements.length) return;

    const rect = chamber.getBoundingClientRect();

    bodiesRef.current = elements.map((el, index) => {
      const ball = balls[index];

      const x = ((ball?.left ?? 50) / 100) * rect.width;
      const y = ((ball?.top ?? 50) / 100) * rect.height;

      const elementRect = el.getBoundingClientRect();

      const radius = Math.max(
        10,
        Math.min(elementRect.width, elementRect.height) * 0.4
      );

      return {
        el,
        x,
        y,
        vx: 0,
        vy: 0,
        angle: ball?.rotate ?? 0,
        angularVelocity: 0,
        radius,
      };
    });
  }, [chamberRef, balls]);

  useEffect(() => {
    const chamber = chamberRef.current;
    if (!chamber) return;

    const bodies = bodiesRef.current;
    if (!bodies.length) return;

    const stopAnimation = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      previousTimeRef.current = null;
    };

    // IDLE: trả bóng về đúng pile.
    if (!playing) {
      stopAnimation();

      bodies.forEach((body, index) => {
        const ball = balls[index];
        if (!ball) return;

        body.el.style.removeProperty("--physics-x");
        body.el.style.removeProperty("--physics-y");
        body.el.style.removeProperty("--physics-r");

        body.vx = 0;
        body.vy = 0;
        body.angularVelocity = 0;
        body.angle = ball.rotate;
      });

      return;
    }

    const rect = chamber.getBoundingClientRect();

  const centerX = rect.width * 0.5;
const centerY = rect.height * 0.56;
const radiusX = rect.width * 0.41;   // đúng bán kính kính (41%)
const radiusY = rect.height * 0.44;  // đáy elip = đáy buồng, bóng không rơi ra ngoài

    // Bắt đầu animation từ đúng vị trí pile.
    bodies.forEach((body, index) => {
      const ball = balls[index];
      if (!ball) return;

      body.x = (ball.left / 100) * rect.width;
      body.y = (ball.top / 100) * rect.height;

      body.vx = random(-180, 180);
      body.vy = random(-680, -360);

      body.angle = ball.rotate;
      body.angularVelocity = random(-240, 240);
    });

    previousTimeRef.current = null;

    const constrainToChamber = (body: Body) => {
      const safeX = Math.max(20, radiusX - body.radius);
      const safeY = Math.max(20, radiusY - body.radius);

      const dx = body.x - centerX;
      const dy = body.y - centerY;

      const normalized =
        (dx * dx) / (safeX * safeX) +
        (dy * dy) / (safeY * safeY);

      if (normalized <= 1) return;

      const correction = 1 / Math.sqrt(normalized);

      body.x = centerX + dx * correction;
      body.y = centerY + dy * correction;

      const nxRaw = dx / (safeX * safeX);
      const nyRaw = dy / (safeY * safeY);

      const length = Math.hypot(nxRaw, nyRaw) || 1;

      const nx = nxRaw / length;
      const ny = nyRaw / length;

      const velocityAlongNormal =
        body.vx * nx + body.vy * ny;

      if (velocityAlongNormal > 0) {
        body.vx -=
          (1 + BOUNCE) * velocityAlongNormal * nx;

        body.vy -=
          (1 + BOUNCE) * velocityAlongNormal * ny;
      }

      body.angularVelocity += random(-30, 30);
    };

    const resolveCollisions = () => {
      for (let i = 0; i < bodies.length; i += 1) {
        for (let j = i + 1; j < bodies.length; j += 1) {
          const a = bodies[i];
          const b = bodies[j];

          const dx = b.x - a.x;
          const dy = b.y - a.y;

          const distance = Math.hypot(dx, dy) || 0.001;

          // Cho phép overlap nhẹ để nhìn dày như capsule thật.
          const minimumDistance =
            (a.radius + b.radius) * 0.78;

          if (distance >= minimumDistance) continue;

          const nx = dx / distance;
          const ny = dy / distance;

          const overlap = minimumDistance - distance;

          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;

          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;

          const relativeVX = b.vx - a.vx;
          const relativeVY = b.vy - a.vy;

          const velocityAlongNormal =
            relativeVX * nx + relativeVY * ny;

          if (velocityAlongNormal >= 0) continue;

          const impulse =
            (-(1 + 0.46) * velocityAlongNormal) / 2;

          const impulseX = impulse * nx;
          const impulseY = impulse * ny;

          a.vx -= impulseX;
          a.vy -= impulseY;

          b.vx += impulseX;
          b.vy += impulseY;

          a.angularVelocity += random(-18, 18);
          b.angularVelocity += random(-18, 18);
        }
      }
    };

    const render = (time: number) => {
      if (previousTimeRef.current === null) {
        previousTimeRef.current = time;
      }

      const deltaMs =
        time - (previousTimeRef.current ?? time);

      previousTimeRef.current = time;

      const dt = Math.min(deltaMs / 1000, 0.025);

      bodies.forEach((body, index) => {
        const distanceFromCenter =
          Math.abs(body.x - centerX) / radiusX;

        const centerStrength = Math.max(
          0,
          1 - distanceFromCenter
        );

        const turbulence =
          Math.sin(time * 0.009 + index * 1.73) * 0.55 +
          Math.sin(time * 0.015 + index * 0.91) * 0.45;

        // Gravity.
        body.vy += GRAVITY * dt;

        // Luồng khí từ dưới lên.
        body.vy -=
          AIR_FORCE *
          (0.5 + centerStrength * 0.85) *
          dt;

        // Chuyển động ngang.
        body.vx +=
          turbulence *
          SIDE_FORCE *
          dt;

        // Các cú đẩy nhỏ ngẫu nhiên.
        if (Math.random() < 0.015) {
          body.vy -= random(100, 230);
          body.vx += random(-110, 110);
        }

        body.vx *= Math.pow(DRAG, dt * 60);
        body.vy *= Math.pow(DRAG, dt * 60);

        body.angularVelocity *= Math.pow(
          ANGULAR_DRAG,
          dt * 60
        );

        body.x += body.vx * dt;
        body.y += body.vy * dt;

        body.angle += body.angularVelocity * dt;

        constrainToChamber(body);
      });

      resolveCollisions();
      resolveCollisions();

      // Chỉ thêm offset, KHÔNG phá left/top/transform gốc.
      bodies.forEach((body, index) => {
        const ball = balls[index];
        if (!ball) return;

        const originX =
          (ball.left / 100) * rect.width;

        const originY =
          (ball.top / 100) * rect.height;

        body.el.style.setProperty(
          "--physics-x",
          `${body.x - originX}px`
        );

        body.el.style.setProperty(
          "--physics-y",
          `${body.y - originY}px`
        );

        body.el.style.setProperty(
          "--physics-r",
          `${body.angle - ball.rotate}deg`
        );
      });

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return stopAnimation;
  }, [playing, chamberRef, balls]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);
}