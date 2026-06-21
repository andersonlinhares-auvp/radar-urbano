import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? 'Radar Urbano <no-reply@radarurbano.org>';

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  if (!apiKey) {
    // Dev fallback: sem chave, NUNCA envia; loga p/ o time testar localmente.
    console.log(`[dev] código de verificação para ${email}: ${code}`);
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: email,
    subject: 'Seu código de verificação — Radar Urbano',
    text: `Seu código é ${code}. Ele expira em 15 minutos.`,
  });
}
