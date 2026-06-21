'use client';
import { signOut, useSession } from 'next-auth/react';

export function SessionMenu() {
  const { data } = useSession();
  if (!data?.user)
    return (
      <a href="/entrar" className="text-sm text-petroleo-600">
        Entrar
      </a>
    );
  const initials = (data.user.name ?? 'U').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-petroleo-600 text-xs text-white">
        {initials}
      </span>
      <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-ardosia">
        Sair
      </button>
    </div>
  );
}
