// apps/web/src/app/(auth)/verificar/page.tsx
'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout, CodeInput, AuthButton, ProgressStepper } from '@/components/auth';

function VerificarForm() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';
  const [code, setCode] = useState('');
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setMsg('');
    setLoadingVerify(true);
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) {
        router.push('/entrar');
      } else {
        const json = await res.json().catch(() => ({}));
        setErro(json.error ?? 'Código inválido.');
      }
    } finally {
      setLoadingVerify(false);
    }
  }

  async function reenviar() {
    setMsg('');
    setErro('');
    setLoadingResend(true);
    try {
      const res = await fetch('/api/verify-email/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setMsg('Novo código enviado. Verifique seu e-mail.');
      } else {
        const json = await res.json().catch(() => ({}));
        setErro(json.error ?? 'Erro ao reenviar. Tente novamente.');
      }
    } finally {
      setLoadingResend(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ProgressStepper currentStep={2} />

      {email && (
        <p className="text-sm text-ardosia leading-relaxed">
          Enviamos um código de 6 dígitos para{' '}
          <span className="font-semibold text-tinta">{email}</span>.
        </p>
      )}

      <form onSubmit={verificar} className="flex flex-col gap-5">
        <CodeInput
          value={code}
          onChange={setCode}
          error={erro || undefined}
          disabled={loadingVerify}
        />

        {msg && (
          <p role="status" className="text-xs text-petroleo-600">
            {msg}
          </p>
        )}

        <AuthButton
          variant="primary"
          type="submit"
          loading={loadingVerify}
          disabled={loadingResend || code.length !== 6}
        >
          Verificar e-mail
        </AuthButton>
      </form>

      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-ardosia">Não recebeu o código?</span>
        <button
          type="button"
          onClick={reenviar}
          disabled={loadingResend || loadingVerify}
          className="text-sm font-semibold text-petroleo-600 hover:text-petroleo-500 transition-colors disabled:opacity-50"
        >
          {loadingResend ? 'Enviando...' : 'Reenviar'}
        </button>
      </div>
    </div>
  );
}

export default function VerificarPage() {
  return (
    <AuthLayout
      title="Verifique seu e-mail"
      subtitle="Insira o código que enviamos para confirmar sua identidade."
    >
      <Suspense fallback={<div className="text-sm text-ardosia">Carregando...</div>}>
        <VerificarForm />
      </Suspense>
    </AuthLayout>
  );
}
