"use client";

import { ReactNode, useEffect, useRef } from "react";

type BinaryOrbitsBackgroundProps = {
  className?: string;
  colors?: readonly [string, string];
  backgroundColor?: string;
  rippleKey?: number;
  children?: ReactNode;
};

type OrbitStar = {
  radius: number;
  angle: number;
  size: number;
  brightness: number;
  depth: number;
  phase: number;
};

const DEFAULT_COLORS = ["#7B4DFF", "#FFC2EE"] as const;
const DEFAULT_BACKGROUND = "#0A0A0A";

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((part) => part + part).join("") : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16) || 123,
    g: Number.parseInt(value.slice(2, 4), 16) || 77,
    b: Number.parseInt(value.slice(4, 6), 16) || 255,
  };
}

function mixColor(first: ReturnType<typeof hexToRgb>, second: ReturnType<typeof hexToRgb>, amount: number) {
  return {
    r: Math.round(first.r + (second.r - first.r) * amount),
    g: Math.round(first.g + (second.g - first.g) * amount),
    b: Math.round(first.b + (second.b - first.b) * amount),
  };
}

export function BinaryOrbitsBackground({
  className = "",
  colors = DEFAULT_COLORS,
  backgroundColor = DEFAULT_BACKGROUND,
  rippleKey,
  children,
}: BinaryOrbitsBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rippleStartRef = useRef<number | null>(null);
  const previousRippleRef = useRef(rippleKey);

  useEffect(() => {
    if (rippleKey === undefined || previousRippleRef.current === rippleKey) return;

    previousRippleRef.current = rippleKey;
    rippleStartRef.current = performance.now();
  }, [rippleKey]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!root || !canvas || !context) return;

    const random = seededRandom(74219);
    const outerColor = hexToRgb(colors[0]);
    const coreColor = hexToRgb(colors[1]);
    const stars: OrbitStar[] = Array.from({ length: 1250 }, (_, index) => {
      const radius = Math.pow(random(), 0.62);
      const arm = index % 3;
      const armOffset = (arm / 3) * Math.PI * 2;
      const spread = (random() - 0.5) * (0.1 + radius * 0.42);

      return {
        radius,
        angle: armOffset + radius * 8.2 + spread,
        size: 0.35 + random() * 1.15 + (1 - radius) * 0.45,
        brightness: 0.38 + random() * 0.62,
        depth: random(),
        phase: random() * Math.PI * 2,
      };
    });

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let startTime = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const bounds = root.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (timestamp: number) => {
      if (!width || !height) return;

      const elapsed = Math.max(0, timestamp - startTime);
      const centerX = width * 0.66;
      const centerY = height * 0.66;
      const galaxyRadius = Math.min(width, height) * 0.5;
      const roll = -0.14;
      const tilt = 0.48;
      const seconds = elapsed / 1000;
      const rippleAge = rippleStartRef.current === null ? -1 : timestamp - rippleStartRef.current;
      const rippleProgress = rippleAge >= 0 && rippleAge < 1600 ? rippleAge / 1600 : -1;

      context.clearRect(0, 0, width, height);
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);

      const haze = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, galaxyRadius * 0.95);
      haze.addColorStop(0, "rgba(255, 194, 238, .16)");
      haze.addColorStop(0.2, "rgba(123, 77, 255, .14)");
      haze.addColorStop(0.62, "rgba(47, 26, 105, .08)");
      haze.addColorStop(1, "rgba(10, 10, 10, 0)");
      context.fillStyle = haze;
      context.fillRect(centerX - galaxyRadius, centerY - galaxyRadius, galaxyRadius * 2, galaxyRadius * 2);

      for (const star of stars) {
        const stream = reducedMotion ? 0 : seconds * (0.26 - star.radius * 0.12);
        const angle = star.angle + stream;
        const radius = star.radius * galaxyRadius;
        const rawX = Math.cos(angle) * radius;
        const rawY = Math.sin(angle) * radius * tilt;
        const x = centerX + rawX * Math.cos(roll) - rawY * Math.sin(roll);
        const y = centerY + rawX * Math.sin(roll) + rawY * Math.cos(roll);
        const twinkle = reducedMotion ? 1 : 0.82 + Math.sin(seconds * 2.3 + star.phase) * 0.18;
        const color = mixColor(outerColor, coreColor, Math.max(0, 1 - star.radius * 1.25));
        const rippleDistance = Math.hypot(rawX, rawY / tilt) / galaxyRadius;
        const rippleBoost = rippleProgress < 0 ? 0 : Math.max(0, 1 - Math.abs(rippleDistance - rippleProgress * 1.18) / 0.065);
        const alpha = Math.min(0.98, star.brightness * twinkle * (0.58 + (1 - star.depth) * 0.42) * (1 + rippleBoost * 0.85));
        const size = star.size * (0.76 + (1 - star.radius) * 0.48) * (1 + rippleBoost * 0.72);

        context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
      }

      const core = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, galaxyRadius * 0.21);
      core.addColorStop(0, "rgba(255, 247, 253, .84)");
      core.addColorStop(0.1, "rgba(255, 194, 238, .6)");
      core.addColorStop(0.42, "rgba(123, 77, 255, .18)");
      core.addColorStop(1, "rgba(123, 77, 255, 0)");
      context.fillStyle = core;
      context.fillRect(centerX - galaxyRadius * 0.21, centerY - galaxyRadius * 0.21, galaxyRadius * 0.42, galaxyRadius * 0.42);

      if (rippleProgress >= 0) {
        context.save();
        context.translate(centerX, centerY);
        context.rotate(roll);
        context.scale(1, tilt);
        context.beginPath();
        context.arc(0, 0, galaxyRadius * rippleProgress * 1.18, 0, Math.PI * 2);
        context.strokeStyle = `rgba(255, 194, 238, ${0.28 * (1 - rippleProgress)})`;
        context.lineWidth = 1.6;
        context.shadowColor = "rgba(255, 194, 238, .75)";
        context.shadowBlur = 16;
        context.stroke();
        context.restore();
      }

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(root);
    resize();
    startTime = performance.now();
    draw(startTime);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [backgroundColor, colors]);

  return (
    <div ref={rootRef} className={`binary-orbits-background ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="binary-orbits-vignette" />
      {children}
    </div>
  );
}
