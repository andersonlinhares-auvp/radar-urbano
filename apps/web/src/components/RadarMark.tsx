interface RadarMarkProps {
  size?: number;
  /** Stroke/fill color for rings + sweep wedge */
  color?: string;
  /** Center dot color */
  dotColor?: string;
  className?: string;
}

/**
 * The Radar Urbano "varredura" mark: concentric rings + a sweep wedge.
 * Static (icon) variant used in nav rails and lockups.
 */
export function RadarMark({
  size = 26,
  color = '#3fb6a8',
  dotColor = '#f4f1ea',
  className,
}: RadarMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="1.6" opacity="0.4" />
      <circle cx="20" cy="20" r="11" stroke={color} strokeWidth="1.6" opacity="0.6" />
      <path d="M20 20 L20 2 A18 18 0 0 1 35 11 Z" fill={color} opacity="0.9" />
      <circle cx="20" cy="20" r="2.6" fill={dotColor} />
    </svg>
  );
}

interface AnimatedRadarMarkProps {
  size?: number;
}

/**
 * Large animated radar mark for the landing cover: concentric grid rings,
 * a rotating conic sweep, and pinging incident dots.
 */
export function AnimatedRadarMark({ size = 300 }: AnimatedRadarMarkProps) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 300 300" fill="none" className="block">
        <circle cx="150" cy="150" r="146" stroke="#2b343d" strokeWidth="1" />
        <circle cx="150" cy="150" r="108" stroke="#2b343d" strokeWidth="1" />
        <circle cx="150" cy="150" r="70" stroke="#2b343d" strokeWidth="1" />
        <circle cx="150" cy="150" r="32" stroke="#2b343d" strokeWidth="1" />
        <line x1="4" y1="150" x2="296" y2="150" stroke="#2b343d" strokeWidth="1" />
        <line x1="150" y1="4" x2="150" y2="296" stroke="#2b343d" strokeWidth="1" />
      </svg>
      <div className="absolute inset-1 overflow-hidden rounded-full">
        <div
          className="ru-sweep absolute inset-0"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(63,182,168,0) 0deg, rgba(63,182,168,0) 270deg, rgba(63,182,168,0.45) 360deg)',
          }}
        />
      </div>
      {/* incident dots */}
      <div className="absolute h-3 w-3" style={{ top: 92, left: 196 }}>
        <div className="ru-ping absolute inset-0 rounded-full bg-risco-medio" />
        <div className="absolute inset-[3px] rounded-full bg-risco-medio" />
      </div>
      <div className="absolute h-3 w-3" style={{ top: 188, left: 96 }}>
        <div
          className="ru-ping absolute inset-0 rounded-full bg-petroleo-400"
          style={{ animationDuration: '3.1s' }}
        />
        <div className="absolute inset-[3px] rounded-full bg-petroleo-400" />
      </div>
      <div className="absolute h-3.5 w-3.5" style={{ top: 120, left: 120 }}>
        <div
          className="absolute inset-[3px] rounded-full"
          style={{ background: '#f4f1ea', boxShadow: '0 0 0 4px rgba(244,241,234,0.15)' }}
        />
      </div>
    </div>
  );
}
