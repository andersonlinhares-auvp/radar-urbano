'use client';
import { signIn } from 'next-auth/react';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function EntrarForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/mapa';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.error) setErro('E-mail/senha inválidos ou e-mail não verificado.');
    else router.push(next);
  }

  return (
    <>
      <button
        onClick={() => signIn('google', { callbackUrl: next })}
        className="rounded border border-linha bg-superficie p-3 font-medium"
      >
        Entrar com Google
      </button>
      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          className="rounded border border-linha p-3"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border border-linha p-3"
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {erro && <p className="text-sm text-risco-critico">{erro}</p>}
        <button className="rounded bg-petroleo-600 p-3 font-semibold text-white">Entrar</button>
      </form>
    </>
  );
}

export default function EntrarPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-serif text-3xl text-petroleo-600">Entrar</h1>
      <Suspense fallback={null}>
        <EntrarForm />
      </Suspense>
      <a className="text-sm text-petroleo-600" href="/cadastrar">
        Criar conta
      </a>
    </main>
  );
}
