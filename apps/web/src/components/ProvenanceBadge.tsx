import { PROVENANCE_META, type ProvenanceKind } from './provenance';

interface ProvenanceBadgeProps {
  kind: ProvenanceKind;
  className?: string;
}

/** Small pill badge declaring an incident's provenance — color is always paired with a label. */
export function ProvenanceBadge({ kind, className }: ProvenanceBadgeProps) {
  const meta = PROVENANCE_META[kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] ${className ?? ''}`}
      style={{ background: `${meta.color}1a`, color: meta.color }}
    >
      <span aria-hidden className="text-[10px]">
        {meta.glyph}
      </span>
      {meta.label}
    </span>
  );
}

interface ProvenanceIconProps {
  kind: ProvenanceKind;
  size?: number;
}

/** Square provenance icon used at the head of incident list rows (matches the design). */
export function ProvenanceIcon({ kind, size = 32 }: ProvenanceIconProps) {
  const meta = PROVENANCE_META[kind];
  const common = {
    width: size,
    height: size,
  } as const;

  if (kind === 'oficial') {
    return (
      <span
        className="flex flex-none items-center justify-center rounded-md font-mono"
        style={{ ...common, background: '#11181f', color: meta.color }}
        aria-hidden
      >
        ★
      </span>
    );
  }
  if (kind === 'comunidade') {
    return (
      <span
        className="flex flex-none items-center justify-center rounded-md border-2"
        style={{ ...common, background: '#fbfaf6', borderColor: meta.color, color: meta.color }}
        aria-hidden
      >
        ●
      </span>
    );
  }
  return (
    <span
      className="flex flex-none items-center justify-center rounded-md font-bold"
      style={{
        ...common,
        background: meta.color,
        color: kind === 'atencao' ? '#11181f' : '#fff',
      }}
      aria-hidden
    >
      {meta.glyph}
    </span>
  );
}
