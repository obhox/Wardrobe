// Tiny price-history line. The dashed rule marks the target price.
export default function Sparkline({
  points,
  target,
  width = 260,
  height = 44,
}: {
  points: number[];
  target?: number;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const all = target != null ? [...points, target] : points;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pad = 4;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const trend = last < first ? "down" : last > first ? "up" : "flat";

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`price history, ${points.length} checks, trending ${trend}`}
        className="overflow-visible"
      >
        {target != null && (
          <line
            x1={pad}
            x2={width - pad}
            y1={y(target)}
            y2={y(target)}
            stroke="var(--ink-soft)"
            strokeDasharray="3 4"
            strokeWidth={1}
            opacity={0.6}
          />
        )}
        <path d={d} fill="none" stroke="var(--ink)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last)} r={3} fill="var(--accent, var(--ink))" />
      </svg>
      <figcaption className="sr-only">
        from {first} to {last}
        {target != null ? `, target ${target}` : ""}
      </figcaption>
    </figure>
  );
}
