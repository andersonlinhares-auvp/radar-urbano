// apps/web/src/components/map/IncidentCard.tsx
'use client';
import type { RecentIncident } from '@/components/Map';
import { STATUS_LABELS, trustLabel, relativeTime } from '@/lib/labels';

type Props = {
  item: RecentIncident;
  onClick: () => void;
};

export function IncidentCard({ item, onClick }: Props) {
  const statusText = STATUS_LABELS[item.status] ?? item.status;
  const trust = trustLabel(item.trustScore);
  const time = relativeTime(item.occurredAt);

  const contextParts = [item.categoryLabel, time];
  if (item.neighborhood) contextParts.push(item.neighborhood);
  const contextLine = contextParts.join(' · ');

  const confirmText =
    item.confirmations === 1
      ? 'Confirmado por 1 pessoa'
      : item.confirmations > 1
        ? `Confirmado por ${item.confirmations} pessoas`
        : 'Nenhuma confirmação ainda';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 border-b border-linha px-4 py-3 text-left hover:bg-[#f5f4f2] focus:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-500"
    >
      {/* Category color dot */}
      <span
        className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ background: item.categoryColor ?? '#0e5c63' }}
      />
      <div className="min-w-0 flex-1">
        {/* Title */}
        <p className="truncate text-[13px] font-medium text-tinta">{item.title}</p>
        {/* Context line: Categoria · há X min · Bairro */}
        <p className="mt-0.5 truncate text-[11px] text-[#8a857a]">{contextLine}</p>
        {/* Confirmations */}
        <p className="mt-0.5 truncate text-[11px] text-[#5a6470]">{confirmText}</p>
        {/* Trust badge */}
        <span className="mt-1 inline-block rounded-full bg-[#e8f5f3] px-2 py-0.5 font-mono text-[10px] text-[#0e5c63]">
          {trust}
        </span>
        {/* Status */}
        <span className="ml-1.5 mt-1 inline-block rounded-full border border-linha px-2 py-0.5 font-mono text-[10px] text-[#5a6470]">
          {statusText}
        </span>
      </div>
    </button>
  );
}
