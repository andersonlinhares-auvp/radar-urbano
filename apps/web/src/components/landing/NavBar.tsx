'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { RadarMark } from '@/components/RadarMark';

const LINKS = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#comunidade', label: 'Comunidade' },
  { href: '#open-source', label: 'Open Source' },
];

export function NavBar() {
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Esconde a nav ao rolar para baixo, reaparece ao rolar para cima.
  useEffect(() => {
    let last = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      setHidden(y > 120 && y > last);
      last = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const authed = Boolean(data?.user);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-grafite/60 bg-tinta/85 backdrop-blur transition-transform duration-300 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Radar Urbano — início">
          <RadarMark size={24} />
          <span className="font-mono text-[13px] font-semibold tracking-[0.14em] text-[#f4f1ea]">
            RADAR<span className="text-petroleo-400">URBANO</span>
          </span>
        </Link>

        <div className="ml-4 hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-sans text-sm text-nevoa transition-colors hover:text-[#f4f1ea]"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {authed ? (
            <>
              <Link
                href="/mapa"
                className="rounded-md border border-grafite px-4 py-2 text-sm font-medium text-[#f4f1ea] transition-colors hover:bg-grafite"
              >
                Abrir o mapa
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm text-nevoa transition-colors hover:text-[#f4f1ea]"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                href="/entrar"
                className="rounded-md border border-grafite px-4 py-2 text-sm font-medium text-[#f4f1ea] transition-colors hover:bg-grafite"
              >
                Entrar
              </Link>
              <Link
                href="/cadastrar"
                className="rounded-md bg-petroleo-400 px-4 py-2 text-sm font-semibold text-tinta transition-colors hover:bg-petroleo-200"
              >
                Criar conta →
              </Link>
            </>
          )}
        </div>

        {/* Mobile: CTA sempre visível + hambúrguer */}
        <div className="ml-auto flex items-center gap-3 md:hidden">
          <Link
            href={authed ? '/mapa' : '/cadastrar'}
            className="rounded-md bg-petroleo-400 px-3.5 py-1.5 text-sm font-semibold text-tinta"
          >
            {authed ? 'Mapa' : 'Criar conta'}
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-grafite text-[#f4f1ea]"
          >
            <span aria-hidden>{open ? '✕' : '☰'}</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-grafite/60 bg-tinta px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-sans text-[15px] text-nevoa"
              >
                {l.label}
              </a>
            ))}
            {!authed && (
              <Link href="/entrar" className="font-sans text-[15px] text-petroleo-400">
                Entrar
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
