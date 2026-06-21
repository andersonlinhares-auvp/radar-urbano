'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerificarForm() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (res.ok) router.push('/entrar');
    else setMsg((await res.json()).error ?? 'Código inválido.');
  }
  async function reenviar() {
    const res = await fetch('/api/verify-email/resend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setMsg(res.ok ? 'Novo código enviado.' : ((await res.json()).error ?? 'Erro.'));
  }

  return (
    <>
      <p className="text-sm text-ardosia">Enviamos um código de 6 dígitos para {email}.</p>
      <form onSubmit={verificar} className="flex flex-col gap-3">
        <input
          className="rounded border border-linha p-3 text-center font-mono text-xl tracking-widest"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {msg && <p className="text-sm text-ardosia">{msg}</p>}
        <button className="rounded bg-petroleo-600 p-3 font-semibold text-white">Verificar</button>
      </form>
      <button onClick={reenviar} className="text-sm text-petroleo-600">
        Reenviar código
      </button>
    </>
  );
}

export default function VerificarPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-serif text-3xl text-petroleo-600">Verificar e-mail</h1>
      <Suspense fallback={<p className="text-sm text-ardosia">Carregando...</p>}>
        <VerificarForm />
      </Suspense>
    </main>
  );
}
