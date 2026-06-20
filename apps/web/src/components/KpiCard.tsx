import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** color of the hint text */
  hintColor?: string;
  /** render the critical left border accent */
  critical?: boolean;
}

/** KPI card for the risk dashboard. */
export function KpiCard({ label, value, hint, hintColor, critical }: KpiCardProps) {
  return (
    <div
      className="rounded-lg border border-linha bg-white p-[18px]"
      style={critical ? { borderLeft: '3px solid #a8332f' } : undefined}
    >
      <div className="font-mono text-[11px] tracking-wide text-[#8a857a]">{label}</div>
      <div className="my-[6px_0_2px] text-3xl font-bold text-tinta">{value}</div>
      {hint != null && (
        <div className="text-xs" style={{ color: hintColor ?? '#5a6470' }}>
          {hint}
        </div>
      )}
    </div>
  );
}
