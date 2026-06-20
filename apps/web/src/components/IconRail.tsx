'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RadarMark } from './RadarMark';

interface RailItem {
  href: string;
  label: string;
  glyph: string;
}

const ITEMS: RailItem[] = [
  { href: '/mapa', label: 'Mapa', glyph: '◎' },
  { href: '/painel', label: 'Painel de risco', glyph: '◆' },
  { href: '/painel', label: 'Relatórios', glyph: '▤' },
];

/** Dark icon rail shared by /mapa and /painel — radar logo on top, nav, avatar at bottom. */
export function IconRail() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="flex w-[62px] flex-none flex-col items-center gap-1.5 bg-tinta py-4"
    >
      <Link href="/" className="mb-3.5" aria-label="Início">
        <RadarMark size={26} />
      </Link>
      {ITEMS.map((item, i) => {
        const active = pathname === item.href && i < 2;
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            title={item.label}
            className={`flex h-[42px] w-[42px] items-center justify-center rounded-lg text-lg transition-colors ${
              active
                ? 'bg-grafite text-petroleo-400'
                : 'text-ardosia hover:bg-grafite/60 hover:text-nevoa'
            }`}
          >
            <span aria-hidden>{item.glyph}</span>
          </Link>
        );
      })}
      <span
        className="mt-auto flex h-[34px] w-[34px] items-center justify-center rounded-full bg-grafite font-mono text-xs text-nevoa"
        title="Conta"
      >
        MR
      </span>
    </nav>
  );
}
