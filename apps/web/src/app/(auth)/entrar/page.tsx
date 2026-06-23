// apps/web/src/app/(auth)/entrar/page.tsx
'use client';
import { signIn } from 'next-auth/react';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout, InputField, PasswordField, AuthButton } from '@/components/auth';

function EntrarForm() {
  const router = useRouter();
  const rawNext = useSearchParams().get('next') ?? '/mapa';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/mapa';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoadingCredentials(true);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) {
        setErro('E-mail/senha inválidos ou e-mail não verificado.');
      } else {
        router.push(next);
      }
    } finally {
      setLoadingCredentials(false);
    }
  }

  async function entrarGoogle() {
    setLoadingGoogle(true);
    await signIn('google', { callbackUrl: next });
    // navigation happens on redirect; no need to reset state
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Google */}
      <AuthButton
        variant="google"
        onClick={entrarGoogle}
        loading={loadingGoogle}
        disabled={loadingCredentials}
      >
        Entrar com Google
      </AuthButton>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-linha" />
        <span className="font-mono text-xs text-nevoa uppercase tracking-widest">ou</span>
        <div className="h-px flex-1 bg-linha" />
      </div>

      {/* Credentials form */}
      <form onSubmit={entrar} className="flex flex-col gap-4">
        <InputField
          id="email"
          label="E-mail"
          type="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <PasswordField
          id="password"
          label="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          error={erro || undefined}
        />
        <AuthButton
          variant="primary"
          type="submit"
          loading={loadingCredentials}
          disabled={loadingGoogle}
          className="mt-1"
        >
          Entrar
        </AuthButton>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-ardosia">
        Não tem conta?{' '}
        <a
          href="/cadastrar"
          className="text-petroleo-600 font-semibold hover:text-petroleo-500 transition-colors"
        >
          Criar conta
        </a>
      </p>
    </div>
  );
}

export default function EntrarPage() {
  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Acesse o Radar Urbano para acompanhar o que acontece na sua cidade."
    >
      <Suspense fallback={<div className="text-sm text-ardosia">Carregando...</div>}>
        <EntrarForm />
      </Suspense>
    </AuthLayout>
  );
}
