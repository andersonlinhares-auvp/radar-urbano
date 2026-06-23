import type { Metadata } from 'next';
import Link from 'next/link';
import { AnimatedRadarMark, RadarMark } from '@/components/RadarMark';
import { NavBar } from '@/components/landing/NavBar';
import { UseCases } from '@/components/landing/UseCases';
import {
  IconReport,
  IconVerify,
  IconBroadcast,
  IconSource,
  IconVoice,
  IconModeration,
} from '@/components/landing/icons';
import { getLandingStats } from '@/lib/landing-stats';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Radar Urbano — O que está acontecendo no seu bairro agora',
  description:
    'Plataforma aberta de relatos comunitários e dados públicos para o Rio de Janeiro. Saiba o que está acontecendo ao seu redor antes de sair de casa.',
};

const REPO_URL = 'https://github.com/andersonlinhares-auvp/radar-urbano';

const STEPS = [
  {
    n: '01',
    Icon: IconReport,
    title: 'A comunidade reporta',
    body: 'Alguém que mora ou trabalha no bairro viu algo e registrou no app: um acidente, uma via bloqueada, uma situação incomum. Em segundos, o relato aparece no mapa.',
  },
  {
    n: '02',
    Icon: IconVerify,
    title: 'Os dados são verificados',
    body: 'Cruzamos o relato com fontes públicas — Secretaria de Segurança, Waze, Defesa Civil — e aplicamos moderação da comunidade. O que fica no mapa passou por checagem.',
  },
  {
    n: '03',
    Icon: IconBroadcast,
    title: 'Todos ficam sabendo',
    body: 'Você acessa o mapa, vê o feed do seu bairro e toma decisões mais informadas: qual caminho seguir, quando sair, o que compartilhar com quem você gosta.',
  },
];

const SOURCES = [
  {
    Icon: IconSource,
    title: 'Fontes oficiais',
    body: 'Integramos dados das secretarias de segurança do Rio, Defesa Civil, INEA e IBGE. Quando um relato bate com uma fonte oficial, mostramos os dois — e dizemos qual é qual.',
  },
  {
    Icon: IconVoice,
    title: 'A voz de quem está lá',
    body: 'Reports feitos por moradores, trabalhadores e passantes da cidade. Cada um identificado por bairro, tipo e horário. Nenhum relato fica no mapa sem ao menos uma confirmação.',
  },
  {
    Icon: IconModeration,
    title: 'A comunidade modera',
    body: 'Relatos são avaliados por outros usuários da mesma região. Reports repetidamente incorretos são removidos automaticamente. O critério de moderação é público.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Saí do trabalho às 22h e vi no Radar que tinha relato de operação na Linha Vermelha. Fui pela Avenida Brasil e cheguei em casa sem perrengue.',
    author: 'Marcos, motorista, Bangu',
  },
  {
    quote:
      'Moro no Méier há 15 anos. Agora consigo ver o que aconteceu no bairro nas últimas horas sem depender de grupo de WhatsApp.',
    author: 'Cláudia, professora, Méier',
  },
  {
    quote:
      'Reportei um alagamento na minha rua e em 20 minutos já tinha confirmação de outros moradores. Parece bobagem, mas ajudou muita gente a desviar.',
    author: 'Renato, Jacarepaguá',
  },
];

const nf = new Intl.NumberFormat('pt-BR');
const fmt = (n: number | null) => (n == null ? '—' : nf.format(n));

export default async function Landing() {
  const stats = await getLandingStats();

  return (
    <main className="bg-papel text-tinta">
      <NavBar />

      {/* ===== [02] HERO ===== */}
      <section className="relative overflow-hidden bg-tinta pt-16 text-[#f4f1ea]">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(#1b242e 1px, transparent 1px), linear-gradient(90deg, #1b242e 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.35fr_1fr] lg:py-28">
          <div>
            <div className="mb-7 flex items-center gap-3.5">
              <span className="font-mono text-[12px] tracking-[0.2em] text-petroleo-400">
                RIO DE JANEIRO · BETA
              </span>
              <span className="h-px w-[60px] bg-grafite" />
            </div>
            <h1 className="mb-6 font-serif text-[44px] font-medium leading-[1.0] tracking-[-0.02em] sm:text-[64px] lg:text-[72px]">
              Saiba o que está
              <br />
              acontecendo ao seu
              <br />
              redor antes de sair.
            </h1>
            <p className="mb-9 max-w-[38em] text-[18px] leading-[1.55] text-[#c8cdd2] sm:text-[20px]">
              A vizinhança avisa. Os dados públicos confirmam. O Radar Urbano reúne tudo numa
              plataforma aberta e gratuita para quem quer se movimentar pela cidade com mais
              informação.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/cadastrar"
                aria-label="Criar conta gratuita no Radar Urbano"
                className="inline-flex items-center gap-2 rounded-md bg-petroleo-400 px-6 py-3.5 text-[15px] font-semibold text-tinta transition-colors hover:bg-petroleo-200"
              >
                <RadarMark size={18} dotColor="#11181f" color="#11181f" /> Acessar o mapa — é
                gratuito
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center rounded-md border border-grafite px-6 py-3.5 text-[15px] font-semibold text-[#f4f1ea] transition-colors hover:bg-grafite"
              >
                Ver como funciona ↓
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 border-t border-grafite/70 pt-6 font-mono text-[12px] text-ardosia">
              <span>✓ Sem anúncios</span>
              <span>✓ Código aberto</span>
              <span>✓ Dados verificados</span>
              <span>✓ Feito pela comunidade</span>
            </div>
          </div>
          <div className="flex justify-center">
            <AnimatedRadarMark size={320} />
          </div>
        </div>
      </section>

      {/* ===== [03] COMO FUNCIONA ===== */}
      <section id="como-funciona" className="bg-papel py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="mb-2 font-mono text-[12px] tracking-[0.16em] text-ardosia">
            COMO FUNCIONA
          </div>
          <h2 className="mb-12 font-serif text-[34px] font-medium text-tinta sm:text-[42px]">
            Três passos. Nada mais.
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-lg border border-linha bg-superficie p-7">
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-mono text-[44px] leading-none text-linha">{s.n}</span>
                  <s.Icon size={34} className="text-petroleo-600" />
                </div>
                <h3 className="mb-2.5 text-[20px] font-semibold text-tinta">{s.title}</h3>
                <p className="text-[15px] leading-[1.65] text-ardosia">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== [04] O QUE VOCÊ VÊ ===== */}
      <section className="bg-superficie py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="mb-2 font-mono text-[12px] tracking-[0.16em] text-ardosia">
            PARA QUEM USA TODO DIA
          </div>
          <h2 className="mb-3 font-serif text-[34px] font-medium text-tinta sm:text-[42px]">
            Cada vez que você sai de casa.
          </h2>
          <p className="mb-10 max-w-[40em] text-[16px] text-ardosia">
            O Radar funciona nos momentos que importam. Veja alguns deles.
          </p>
          <UseCases />
        </div>
      </section>

      {/* ===== [05] TRANSPARÊNCIA ===== */}
      <section className="bg-tinta py-20 text-[#c8cdd2] sm:py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="mb-2 font-mono text-[12px] tracking-[0.18em] text-petroleo-400">
            TRANSPARÊNCIA
          </div>
          <h2 className="mb-4 max-w-[16em] font-serif text-[32px] font-medium text-[#f4f1ea] sm:text-[40px]">
            Você sabe exatamente de onde vem cada dado.
          </h2>
          <p className="mb-12 max-w-[44em] text-[16px] leading-relaxed">
            Não trabalhamos com dados comprados, algoritmos ocultos ou fontes anônimas que você não
            pode verificar. Cada relato tem hora, bairro e número de confirmações. Cada dado público
            tem a fonte referenciada.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {SOURCES.map((c) => (
              <div key={c.title} className="rounded-lg border border-grafite bg-[#1b242e] p-7">
                <c.Icon size={32} className="mb-5 text-petroleo-400" />
                <h3 className="mb-2.5 text-[18px] font-semibold text-[#f4f1ea]">{c.title}</h3>
                <p className="text-[15px] leading-[1.65] text-[#c8cdd2]">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-r-md border-l-[3px] border-petroleo-400 bg-[#0b1116] px-7 py-6">
            <p className="text-[16px] text-[#c8cdd2]">
              O código que roda esta plataforma é completamente público. Qualquer pessoa pode ler,
              auditar, sugerir melhorias ou contribuir. Não há nada escondido aqui.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block font-medium text-petroleo-400 hover:underline"
            >
              → Ver o repositório no GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ===== [06] COMUNIDADE ===== */}
      <section id="comunidade" className="bg-papel py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="mb-2 font-mono text-[12px] tracking-[0.16em] text-ardosia">
            COMUNIDADE
          </div>
          <h2 className="mb-4 font-serif text-[34px] font-medium text-tinta sm:text-[42px]">
            Quem avisa, cuida.
          </h2>
          <p className="mb-12 max-w-[42em] text-[17px] leading-relaxed text-ardosia">
            Não somos uma empresa de segurança. Não vendemos dados. Não monitoramos ninguém. Somos
            uma rede de pessoas que acham que informação compartilhada torna a cidade melhor para
            todo mundo.
          </p>

          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.author}
                className="rounded-lg border border-linha border-l-[3px] border-l-petroleo-600 bg-superficie p-7"
              >
                <div className="mb-2 font-serif text-[40px] leading-none text-linha">“</div>
                <blockquote className="text-[15px] leading-[1.65] text-tinta">{t.quote}</blockquote>
                <figcaption className="mt-4 font-mono text-[12px] text-ardosia">
                  — {t.author}
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Stat strip */}
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-grafite bg-grafite sm:grid-cols-3">
            {[
              { value: fmt(stats.neighborhoods), label: 'bairros cobertos no Rio de Janeiro' },
              { value: fmt(stats.reportsThisMonth), label: 'relatos registrados este mês' },
              { value: fmt(stats.community), label: 'pessoas contribuindo com a comunidade' },
            ].map((s) => (
              <div key={s.label} className="bg-tinta px-7 py-8">
                <div className="font-mono text-[48px] font-medium leading-none text-petroleo-400">
                  {s.value}
                </div>
                <div className="mt-3 text-[14px] text-nevoa">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] text-ardosia">
            Números atualizados automaticamente a partir do banco de dados.
          </p>

          <Link
            href="/reportar"
            className="mt-8 inline-block font-medium text-petroleo-600 hover:underline"
          >
            Quero contribuir com um relato →
          </Link>
        </div>
      </section>

      {/* ===== [07] OPEN SOURCE ===== */}
      <section id="open-source" className="bg-superficie py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="mb-2 font-mono text-[12px] tracking-[0.16em] text-ardosia">
            OPEN SOURCE
          </div>
          <h2 className="mb-12 font-serif text-[34px] font-medium text-tinta sm:text-[42px]">
            O código é público. O projeto é de todos.
          </h2>
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h3 className="mb-2.5 text-[19px] font-semibold text-tinta">Por que open source?</h3>
              <p className="mb-7 text-[15px] leading-[1.65] text-ardosia">
                Porque transparência não é só sobre os dados — é sobre como a plataforma funciona.
                Você pode ler o código que processa os relatos, auditar as regras de moderação e
                verificar que não coletamos mais do que o necessário.
              </p>
              <h3 className="mb-2.5 text-[19px] font-semibold text-tinta">Como contribuir</h3>
              <ul className="space-y-2 text-[15px] text-ardosia">
                {[
                  'Abrir uma issue com sugestão ou bug',
                  'Contribuir com código (Pull Request)',
                  'Ajudar na moderação da comunidade',
                  'Reportar ocorrências no seu bairro',
                  'Compartilhar com quem mora perto de você',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="text-petroleo-600">→</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Repo card */}
            <div className="rounded-lg border border-grafite bg-tinta p-7 font-mono text-[#c8cdd2]">
              <div className="flex items-center gap-2 text-[14px] text-[#f4f1ea]">
                <RadarMark size={18} /> radar-urbano / radar-urbano
              </div>
              <p className="mt-3 font-sans text-[14px] leading-relaxed text-nevoa">
                Plataforma comunitária de segurança urbana. Next.js 15 · PostGIS · MapLibre · Open
                Source.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['MIT', 'Next.js 15', 'PostgreSQL'].map((b) => (
                  <span key={b} className="rounded bg-grafite px-2.5 py-1 text-[11px] text-nevoa">
                    {b}
                  </span>
                ))}
              </div>
              <div className="mt-5 overflow-x-auto rounded bg-[#0b1116] px-4 py-3 text-[13px]">
                <span className="text-ardosia">$ </span>
                <span className="text-petroleo-400">git clone {REPO_URL}</span>
              </div>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block rounded-md border border-grafite px-5 py-2.5 font-sans text-[14px] font-medium text-[#f4f1ea] transition-colors hover:bg-grafite"
              >
                → Abrir no GitHub
              </a>
            </div>
          </div>
          <p className="mt-8 max-w-[44em] text-[13px] text-ardosia">
            Licença MIT. Use, adapte e redistribua — com atribuição. Dados de usuários nunca são
            compartilhados ou vendidos.
          </p>
        </div>
      </section>

      {/* ===== [08] CTA FINAL ===== */}
      <section className="relative overflow-hidden bg-petroleo-600 py-24 text-[#f4f1ea]">
        <div className="pointer-events-none absolute -right-16 -top-10 opacity-[0.08]">
          <RadarMark size={360} color="#ffffff" dotColor="#ffffff" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-5 text-center sm:px-8">
          <h2 className="mx-auto mb-5 max-w-[12em] font-serif text-[40px] font-medium leading-tight sm:text-[56px]">
            A sua vizinhança já está aqui.
          </h2>
          <p className="mx-auto mb-9 max-w-[34em] text-[18px] text-[#f4f1ea]/80 sm:text-[20px]">
            Crie sua conta gratuita e comece a ver o que está acontecendo no seu bairro em tempo
            real.
          </p>
          <Link
            href="/cadastrar"
            aria-label="Criar conta gratuita no Radar Urbano"
            className="inline-block rounded-md bg-[#f4f1ea] px-8 py-4 text-[15px] font-bold text-petroleo-600 transition-colors hover:bg-papel"
          >
            Criar conta — é gratuito →
          </Link>
          <div className="mt-5">
            <Link href="/entrar" className="text-[15px] text-[#f4f1ea]/60 hover:text-[#f4f1ea]">
              Já tenho conta? Entrar →
            </Link>
          </div>
          <p className="mt-7 font-mono text-[12px] text-[#f4f1ea]/40">
            Sem cobrança. Sem anúncios. Sem rastreamento além do necessário.
          </p>
        </div>
      </section>

      {/* ===== [09] RODAPÉ ===== */}
      <footer className="bg-tinta py-14 text-nevoa">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <RadarMark size={22} />
              <span className="font-mono text-[13px] font-semibold tracking-[0.14em] text-[#f4f1ea]">
                RADAR<span className="text-petroleo-400">URBANO</span>
              </span>
            </div>
            <p className="mt-3 max-w-[24em] text-[13px] leading-relaxed">
              Plataforma comunitária de inteligência urbana. Rio de Janeiro, Brasil.
            </p>
          </div>
          {[
            {
              h: 'Produto',
              links: [
                ['Como funciona', '#como-funciona'],
                ['Mapa', '/mapa'],
                ['Painel de risco', '/painel'],
              ],
            },
            {
              h: 'Comunidade',
              links: [
                ['Reportar ocorrência', '/reportar'],
                ['Comunidade', '#comunidade'],
              ],
            },
            {
              h: 'Projeto',
              links: [
                ['Open Source', '#open-source'],
                ['GitHub', REPO_URL],
              ],
            },
          ].map((col) => (
            <div key={col.h}>
              <div className="mb-3 font-mono text-[11px] tracking-[0.12em] text-ardosia">
                {col.h.toUpperCase()}
              </div>
              <ul className="space-y-2 text-[13px]">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="transition-colors hover:text-[#f4f1ea]">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-[1200px] border-t border-grafite px-5 pt-6 font-mono text-[11px] text-ardosia sm:px-8">
          © 2026 Radar Urbano · Licença MIT · Dados de usuários nunca são vendidos ou
          compartilhados.
        </div>
      </footer>
    </main>
  );
}
