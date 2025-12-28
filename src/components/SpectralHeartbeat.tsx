import React from "react";

export type SpectralHeartbeatProps = {
  vector: number[];
  prevVector?: number[];
  size?: number;
  tickEpsilon?: number; // radians
};

function norm(v: number[]) {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

function normalize(v: number[]) {
  const n = norm(v);
  if (n === 0) return v.map(() => 0);
  return v.map((x) => x / n);
}

function dot(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function angleBetween(a: number[], b: number[]) {
  const d = dot(a, b);
  const c = Math.max(-1, Math.min(1, d));
  return Math.acos(c);
}

export default function SpectralHeartbeat({
  vector,
  prevVector,
  size = 200,
  tickEpsilon = 0.15,
}: SpectralHeartbeatProps) {
  const s = normalize(vector);
  const hasFlat = s.every((x) => x === 0);

  const p = prevVector ? normalize(prevVector) : undefined;
  const theta = p ? angleBetween(s, p) : 0;
  const isTick = !!p && theta > tickEpsilon;

  // Project to 2D using first two components (fallbacks to 0)
  const x = s[0] ?? 0;
  const y = s[1] ?? 0;

  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.max(8, size / 2 - 10);
  const dotX = cx + x * radius;
  const dotY = cy - y * radius;

  return (
    <div style={{ width: size, height: size }}>
      {hasFlat ? (
        <div data-testid="heartbeat-flat">Flat spectrum</div>
      ) : (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#ddd"
            strokeWidth={2}
            data-testid="heartbeat-circle"
          />
          <line
            x1={cx}
            y1={cy}
            x2={dotX}
            y2={dotY}
            stroke="#bbb"
            strokeWidth={1}
            data-testid="heartbeat-axis"
          />
          <circle
            cx={dotX}
            cy={dotY}
            r={6}
            fill="#2b8"
            stroke="#053"
            data-testid="heartbeat-dot"
          />
          {isTick && (
            <circle
              cx={cx}
              cy={cy}
              r={radius + 6}
              fill="none"
              stroke="#f66"
              strokeWidth={2}
              strokeDasharray="6 4"
              data-testid="heartbeat-tick"
            />
          )}
        </svg>
      )}
    </div>
  );
}
