'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CadastrarPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [erro, setErro] = useState('');

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push(`/verificar?email=${encodeURIComponent(form.email)}`);
    else setErro((await res.json()).error ?? 'Erro ao cadastrar.');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-serif text-3xl text-petroleo-600">Criar conta</h1>
      <form onSubmit={cadastrar} className="flex flex-col gap-3">
        <input
          className="rounded border border-linha p-3"
          placeholder="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="rounded border border-linha p-3"
          type="email"
          placeholder="E-mail"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="rounded border border-linha p-3"
          type="password"
          placeholder="Senha (mín. 8)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={8}
        />
        {erro && <p className="text-sm text-risco-critico">{erro}</p>}
        <button className="rounded bg-petroleo-600 p-3 font-semibold text-white">Cadastrar</button>
      </form>
    </main>
  );
}
