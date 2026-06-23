// apps/web/src/app/(auth)/cadastrar/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthLayout,
  InputField,
  PasswordField,
  AuthButton,
  ProgressStepper,
} from '@/components/auth';

export default function CadastrarPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push(`/verificar?email=${encodeURIComponent(form.email)}`);
      } else {
        const json = await res.json().catch(() => ({}));
        setErro(json.error ?? 'Erro ao cadastrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Junte-se à comunidade de inteligência urbana colaborativa."
    >
      <div className="flex flex-col gap-6">
        <ProgressStepper currentStep={1} />

        <form onSubmit={cadastrar} className="flex flex-col gap-4">
          <InputField
            id="name"
            label="Nome"
            type="text"
            placeholder="Seu nome completo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoComplete="name"
          />
          <InputField
            id="email"
            label="E-mail"
            type="email"
            placeholder="voce@exemplo.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
            error={erro || undefined}
          />
          <PasswordField
            id="password"
            label="Senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
            autoComplete="new-password"
          />
          {/* General form error */}
          {erro && (
            <p role="alert" className="text-xs text-risco-critico">
              {erro}
            </p>
          )}
          <AuthButton variant="primary" type="submit" loading={loading} className="mt-1">
            Criar conta
          </AuthButton>
        </form>

        <p className="text-center text-sm text-ardosia">
          Já tem uma conta?{' '}
          <a
            href="/entrar"
            className="text-petroleo-600 font-semibold hover:text-petroleo-500 transition-colors"
          >
            Entrar
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
