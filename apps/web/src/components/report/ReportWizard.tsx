'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getCategory, type CategorySlug } from '@radar-urbano/core';
import { RadarMark } from '@/components/RadarMark';

// ── Estilo do mini-mapa (mesma base raster Carto do Map.tsx) ──────────────────
const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
};

const RIO: [number, number] = [-43.1789, -22.9068];

// ── Mapeamento tipo → slugs (2 níveis) ────────────────────────────────────────
interface IncidentType {
  id: string;
  label: string;
  hint: string;
  slugs: readonly CategorySlug[];
}

const TYPES: readonly IncidentType[] = [
  {
    id: 'roubo',
    label: 'Roubo / Assalto',
    hint: 'Com violência ou ameaça',
    slugs: [
      'assalto-mao-armada',
      'tentativa-assalto',
      'arrastao',
      'roubo-celular',
      'roubo-veiculo',
      'roubo-carga',
    ],
  },
  {
    id: 'furto',
    label: 'Furto (sem violência)',
    hint: 'Descuido, sem confronto',
    slugs: ['furto-celular', 'furto-veiculo'],
  },
  {
    id: 'golpe',
    label: 'Golpe / Fraude',
    hint: 'Estelionato, digital ou presencial',
    slugs: ['golpe'],
  },
  {
    id: 'tiro',
    label: 'Tiro / Confronto',
    hint: 'Disparos ou operação',
    slugs: ['disparo-arma', 'tiroteio', 'confronto-policial'],
  },
  {
    id: 'pessoa',
    label: 'Violência contra pessoa',
    hint: 'Sequestro, assédio, agressão',
    slugs: ['sequestro-relampago', 'violencia-contra-mulher', 'assedio'],
  },
  {
    id: 'via',
    label: 'Acidente / Via',
    hint: 'Alagamento ou interdição',
    slugs: ['area-alagada', 'via-interditada'],
  },
  { id: 'vandalismo', label: 'Vandalismo', hint: 'Dano a patrimônio', slugs: ['vandalismo'] },
  { id: 'outro', label: 'Suspeita / Outro', hint: 'Não classificado', slugs: ['outro'] },
];

type RecurrenceHint = 'UNKNOWN' | 'LIKELY' | 'CERTAIN';
type WhenMode = 'now' | 'today' | 'yesterday' | 'custom';

// Passos do wizard (refino é condicional).
type Step = 'type' | 'refine' | 'location' | 'when' | 'details' | 'confirm' | 'success';

interface DraftState {
  typeId: string | null;
  slug: CategorySlug | null;
  lng: number | null;
  lat: number | null;
  whenMode: WhenMode;
  timeStr: string; // HH:MM para "hoje mais cedo"
  dateStr: string; // YYYY-MM-DD para "outra data"
  description: string;
  recurrenceHint: RecurrenceHint;
  anonymous: boolean;
}

const DRAFT_KEY = 'ru:report-draft';

function emptyDraft(): DraftState {
  return {
    typeId: null,
    slug: null,
    lng: null,
    lat: null,
    whenMode: 'now',
    timeStr: '',
    dateStr: '',
    description: '',
    recurrenceHint: 'UNKNOWN',
    anonymous: false,
  };
}

/** Calcula occurredAt a partir do modo "quando" escolhido. */
function computeOccurredAt(d: DraftState): Date {
  const now = new Date();
  switch (d.whenMode) {
    case 'now':
      return now;
    case 'today': {
      const parts = d.timeStr.split(':');
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      const dt = new Date();
      if (Number.isFinite(h) && Number.isFinite(m)) dt.setHours(h, m, 0, 0);
      // Se o horário cair no futuro, trata como agora.
      return dt.getTime() > now.getTime() ? now : dt;
    }
    case 'yesterday': {
      const dt = new Date();
      dt.setDate(dt.getDate() - 1);
      dt.setHours(12, 0, 0, 0);
      return dt;
    }
    case 'custom': {
      if (!d.dateStr) return now;
      const dt = new Date(`${d.dateStr}T12:00:00`);
      if (Number.isNaN(dt.getTime())) return now;
      return dt.getTime() > now.getTime() ? now : dt;
    }
  }
}

function whenLabel(d: DraftState): string {
  switch (d.whenMode) {
    case 'now':
      return 'Agora';
    case 'today':
      return d.timeStr ? `Hoje, ${d.timeStr}` : 'Hoje mais cedo';
    case 'yesterday':
      return 'Ontem';
    case 'custom':
      return d.dateStr || 'Data escolhida';
  }
}

// ── Componente principal ──────────────────────────────────────────────────────
export function ReportWizard() {
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [step, setStep] = useState<Step>('type');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);

  const selectedType = useMemo(
    () => TYPES.find((t) => t.id === draft.typeId) ?? null,
    [draft.typeId],
  );

  // Carrega rascunho leve do sessionStorage.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DraftState>;
        setDraft((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* rascunho inválido: ignora */
    }
  }, []);

  // Persiste rascunho (sem o passo de sucesso).
  useEffect(() => {
    if (step === 'success') return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* sem storage: ignora */
    }
  }, [draft, step]);

  const update = useCallback((patch: Partial<DraftState>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  // Ordem de passos, considerando o refino condicional.
  const steps = useMemo<Step[]>(() => {
    const needsRefine = (selectedType?.slugs.length ?? 0) > 1;
    return [
      'type',
      ...(needsRefine ? (['refine'] as Step[]) : []),
      'location',
      'when',
      'details',
      'confirm',
    ];
  }, [selectedType]);

  const currentIndex = steps.indexOf(step);
  const progress = step === 'success' ? 100 : ((currentIndex + 1) / steps.length) * 100;

  function goNext() {
    setError(null);
    const needsRefine = (selectedType?.slugs.length ?? 0) > 1;
    // Se o tipo só tem 1 slug, fixa direto.
    if (step === 'type' && selectedType && !needsRefine) {
      update({ slug: selectedType.slugs[0]! });
    }
    const idx = steps.indexOf(step);
    const next = steps[idx + 1];
    if (next) setStep(next);
  }

  function goBack() {
    setError(null);
    const idx = steps.indexOf(step);
    const prev = steps[idx - 1];
    if (prev) setStep(prev);
  }

  function resetWizard() {
    setDraft(emptyDraft());
    setRefCode(null);
    setError(null);
    setStep('type');
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignora */
    }
  }

  const canAdvance = useMemo(() => {
    switch (step) {
      case 'type':
        return draft.typeId !== null;
      case 'refine':
        return draft.slug !== null;
      case 'location':
        return draft.lng !== null && draft.lat !== null;
      case 'when':
        if (draft.whenMode === 'today') return /^\d{2}:\d{2}$/.test(draft.timeStr);
        if (draft.whenMode === 'custom') return draft.dateStr.length > 0;
        return true;
      case 'details':
        return true;
      case 'confirm':
        return draft.slug !== null && draft.lng !== null && draft.lat !== null;
      default:
        return false;
    }
  }, [step, draft]);

  async function submit() {
    if (draft.slug === null || draft.lng === null || draft.lat === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug: draft.slug,
          lng: draft.lng,
          lat: draft.lat,
          occurredAt: computeOccurredAt(draft).toISOString(),
          description: draft.description.trim() || undefined,
          anonymous: draft.anonymous,
          recurrenceHint: draft.recurrenceHint,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        id?: string;
        refCode?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? 'Não foi possível enviar o report. Tente novamente.');
        return;
      }
      setRefCode(data?.refCode ?? null);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignora */
      }
      setStep('success');
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const accentColor = draft.slug ? getCategory(draft.slug).color : '#0e5c63';

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-6">
      {/* Cabeçalho */}
      <header className="mb-5 flex items-center gap-3">
        <Link
          href="/mapa"
          aria-label="Voltar ao mapa"
          className="flex items-center gap-2 text-tinta"
        >
          <RadarMark size={28} color="#0e5c63" dotColor="#fbfaf6" />
          <span className="font-serif text-lg font-semibold">Radar Urbano</span>
        </Link>
        {step !== 'success' && (
          <Link
            href="/mapa"
            className="ml-auto rounded-md px-2 py-1 text-xs text-ardosia hover:text-tinta"
          >
            Cancelar
          </Link>
        )}
      </header>

      {/* Barra de progresso */}
      {step !== 'success' && (
        <div className="mb-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-linha">
            <div
              className="h-full rounded-full bg-petroleo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-nevoa">
            <span>
              Passo {currentIndex + 1} de {steps.length}
            </span>
            <button
              type="button"
              onClick={goBack}
              disabled={currentIndex <= 0}
              className="rounded px-1 hover:text-tinta disabled:invisible"
            >
              ← Voltar
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo do passo */}
      <div className="flex-1">
        {step === 'type' && (
          <StepType value={draft.typeId} onSelect={(typeId) => update({ typeId, slug: null })} />
        )}

        {step === 'refine' && selectedType && (
          <StepRefine
            type={selectedType}
            value={draft.slug}
            onSelect={(slug) => update({ slug })}
          />
        )}

        {step === 'location' && (
          <StepLocation
            lng={draft.lng}
            lat={draft.lat}
            onChange={(lng, lat) => update({ lng, lat })}
          />
        )}

        {step === 'when' && <StepWhen draft={draft} update={update} />}

        {step === 'details' && <StepDetails draft={draft} update={update} />}

        {step === 'confirm' && (
          <StepConfirm
            draft={draft}
            typeLabel={selectedType?.label ?? ''}
            accentColor={accentColor}
            update={update}
          />
        )}

        {step === 'success' && <StepSuccess refCode={refCode} onReset={resetWizard} />}
      </div>

      {/* Mensagem de erro */}
      {error && step !== 'success' && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-risco-critico/40 bg-risco-critico/10 px-3 py-2 text-sm text-risco-critico"
        >
          {error}
        </p>
      )}

      {/* Rodapé de navegação */}
      {step !== 'success' && (
        <footer className="sticky bottom-0 mt-6 bg-papel py-3">
          {step === 'confirm' ? (
            <button
              type="button"
              onClick={submit}
              disabled={!canAdvance || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-petroleo-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-petroleo-500 active:bg-petroleo-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Enviando…' : 'Enviar report'}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-petroleo-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-petroleo-500 active:bg-petroleo-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continuar
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

// ── Passo: Tipo ───────────────────────────────────────────────────────────────
function StepType({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (typeId: string) => void;
}) {
  return (
    <section>
      <h1 className="font-serif text-2xl font-semibold text-tinta">O que aconteceu?</h1>
      <p className="mt-1 text-sm text-ardosia">Escolha o tipo de ocorrência.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {TYPES.map((t) => {
          const active = value === t.id;
          const color = getCategory(t.slugs[0]!).color;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={active}
              className={[
                'flex min-h-[88px] flex-col justify-between rounded-xl border p-3 text-left transition-all',
                active
                  ? 'border-transparent text-white shadow-md'
                  : 'border-linha bg-superficie text-tinta hover:border-ardosia',
              ].join(' ')}
              style={active ? { background: color } : undefined}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: active ? 'rgba(255,255,255,0.85)' : color }}
              />
              <span>
                <span className="block text-sm font-semibold leading-tight">{t.label}</span>
                <span
                  className={[
                    'mt-1 block text-[11px] leading-tight',
                    active ? 'text-white/80' : 'text-nevoa',
                  ].join(' ')}
                >
                  {t.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Passo: Refino ─────────────────────────────────────────────────────────────
function StepRefine({
  type,
  value,
  onSelect,
}: {
  type: IncidentType;
  value: CategorySlug | null;
  onSelect: (slug: CategorySlug) => void;
}) {
  return (
    <section>
      <h1 className="font-serif text-2xl font-semibold text-tinta">Qual exatamente?</h1>
      <p className="mt-1 text-sm text-ardosia">{type.label}</p>
      <fieldset className="mt-5 flex flex-col gap-2.5">
        <legend className="sr-only">Escolha a categoria exata</legend>
        {type.slugs.map((slug) => {
          const cat = getCategory(slug);
          const active = value === slug;
          return (
            <label
              key={slug}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all',
                active
                  ? 'border-petroleo-600 bg-petroleo-100'
                  : 'border-linha bg-superficie hover:border-ardosia',
              ].join(' ')}
            >
              <input
                type="radio"
                name="refine"
                value={slug}
                checked={active}
                onChange={() => onSelect(slug)}
                className="mt-0.5 h-4 w-4 accent-petroleo-600"
              />
              <span className="flex items-start gap-2.5">
                <span
                  className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: cat.color }}
                />
                <span>
                  <span className="block text-sm font-semibold text-tinta">{cat.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-ardosia">
                    {cat.description}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}

// ── Passo: Localização (mini-mapa com pino arrastável) ────────────────────────
function StepLocation({
  lng,
  lat,
  onChange,
}: {
  lng: number | null;
  lat: number | null;
  onChange: (lng: number, lat: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [detectedNb, setDetectedNb] = useState<string | null>(null);
  const [nbLoading, setNbLoading] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const fetchNeighborhood = useCallback((pLng: number, pLat: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setNbLoading(true);
      fetch(`/api/neighborhoods/point?lng=${pLng}&lat=${pLat}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data: { neighborhood: string | null }) => setDetectedNb(data.neighborhood))
        .catch(() => setDetectedNb(null))
        .finally(() => setNbLoading(false));
    }, 450);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const start: [number, number] = lng !== null && lat !== null ? [lng, lat] : RIO;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: start,
      zoom: 14,
      attributionControl: { compact: true },
      // Mapa sempre "de cima", sem rotação/inclinação.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    const marker = new maplibregl.Marker({ draggable: true, color: '#0e5c63' })
      .setLngLat(start)
      .addTo(map);
    markerRef.current = marker;

    function commit(p: maplibregl.LngLat) {
      onChangeRef.current(p.lng, p.lat);
      fetchNeighborhood(p.lng, p.lat);
    }

    marker.on('dragend', () => commit(marker.getLngLat()));
    // Clicar no mapa também reposiciona o pino.
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      commit(e.lngLat);
    });

    // Se já havia coordenada (rascunho), confirma; senão tenta geolocalização.
    if (lng !== null && lat !== null) {
      commit(marker.getLngLat());
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const here: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          map.setCenter(here);
          marker.setLngLat(here);
          commit(marker.getLngLat());
        },
        () => {
          // Falha/negação: mantém o Rio como centro.
          commit(marker.getLngLat());
        },
        { timeout: 5000 },
      );
    } else {
      commit(marker.getLngLat());
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  return (
    <section>
      <h1 className="font-serif text-2xl font-semibold text-tinta">Onde foi?</h1>
      <p className="mt-1 text-sm text-ardosia">Arraste o pino ou toque no mapa para ajustar.</p>
      <div className="mt-5 overflow-hidden rounded-xl border border-linha">
        <div ref={containerRef} className="h-72 w-full" />
      </div>
      <div className="mt-3 rounded-lg bg-superficie px-3.5 py-2.5 text-sm">
        {nbLoading ? (
          <span className="text-nevoa">Detectando bairro…</span>
        ) : detectedNb ? (
          <span className="text-tinta">
            Bairro detectado: <strong>{detectedNb}</strong>
          </span>
        ) : (
          <span className="text-nevoa">Bairro não identificado nesta posição.</span>
        )}
      </div>
    </section>
  );
}

// ── Passo: Quando ─────────────────────────────────────────────────────────────
function StepWhen({
  draft,
  update,
}: {
  draft: DraftState;
  update: (patch: Partial<DraftState>) => void;
}) {
  const options: { mode: WhenMode; label: string }[] = [
    { mode: 'now', label: 'Agora (últimos 30 min)' },
    { mode: 'today', label: 'Hoje mais cedo' },
    { mode: 'yesterday', label: 'Ontem' },
    { mode: 'custom', label: 'Outra data' },
  ];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section>
      <h1 className="font-serif text-2xl font-semibold text-tinta">Quando aconteceu?</h1>
      <p className="mt-1 text-sm text-ardosia">Uma estimativa já ajuda.</p>
      <fieldset className="mt-5 flex flex-col gap-2.5">
        <legend className="sr-only">Quando aconteceu</legend>
        {options.map((opt) => {
          const active = draft.whenMode === opt.mode;
          return (
            <label
              key={opt.mode}
              className={[
                'flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 transition-all',
                active
                  ? 'border-petroleo-600 bg-petroleo-100'
                  : 'border-linha bg-superficie hover:border-ardosia',
              ].join(' ')}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="when"
                  checked={active}
                  onChange={() => update({ whenMode: opt.mode })}
                  className="h-4 w-4 accent-petroleo-600"
                />
                <span className="text-sm font-semibold text-tinta">{opt.label}</span>
              </span>
              {active && opt.mode === 'today' && (
                <input
                  type="time"
                  value={draft.timeStr}
                  onChange={(e) => update({ timeStr: e.target.value })}
                  className="ml-7 w-40 rounded-lg border border-linha bg-superficie px-3 py-2 text-sm text-tinta focus:border-petroleo-500 focus:outline-none"
                />
              )}
              {active && opt.mode === 'custom' && (
                <input
                  type="date"
                  value={draft.dateStr}
                  max={today}
                  onChange={(e) => update({ dateStr: e.target.value })}
                  className="ml-7 w-44 rounded-lg border border-linha bg-superficie px-3 py-2 text-sm text-tinta focus:border-petroleo-500 focus:outline-none"
                />
              )}
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}

// ── Passo: Detalhes ───────────────────────────────────────────────────────────
function StepDetails({
  draft,
  update,
}: {
  draft: DraftState;
  update: (patch: Partial<DraftState>) => void;
}) {
  const recurrenceOptions: { value: RecurrenceHint; label: string }[] = [
    { value: 'UNKNOWN', label: 'Não sei' },
    { value: 'LIKELY', label: 'Acho que sim' },
    { value: 'CERTAIN', label: 'Com certeza' },
  ];

  return (
    <section>
      <h1 className="font-serif text-2xl font-semibold text-tinta">Detalhes (opcional)</h1>
      <p className="mt-1 text-sm text-ardosia">Quanto mais contexto, melhor para a comunidade.</p>

      <div className="mt-5">
        <label
          htmlFor="description"
          className="font-mono text-xs font-semibold uppercase tracking-widest text-ardosia"
        >
          O que rolou
        </label>
        <textarea
          id="description"
          value={draft.description}
          maxLength={500}
          rows={4}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Ex.: dois homens em uma moto abordaram pedestres na esquina…"
          className="mt-1.5 w-full resize-none rounded-lg border border-linha bg-superficie px-4 py-3 text-sm text-tinta placeholder:text-nevoa focus:border-petroleo-500 focus:outline-none focus:ring-2 focus:ring-petroleo-500/20"
        />
        <div className="mt-1 text-right font-mono text-[11px] text-nevoa">
          {draft.description.length}/500
        </div>
      </div>

      <div className="mt-4">
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-ardosia">
          Isso já aconteceu aqui antes?
        </span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {recurrenceOptions.map((opt) => {
            const active = draft.recurrenceHint === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ recurrenceHint: opt.value })}
                aria-pressed={active}
                className={[
                  'rounded-lg border px-2 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'border-petroleo-600 bg-petroleo-600 text-white'
                    : 'border-linha bg-superficie text-tinta hover:border-ardosia',
                ].join(' ')}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aviso de foto — em breve, sem upload neste MVP */}
      <div className="mt-4 cursor-not-allowed rounded-lg border border-dashed border-linha bg-superficie/60 px-3.5 py-3 text-sm text-nevoa">
        <span className="block font-medium text-ardosia">Adicionar foto (em breve)</span>
        <span className="mt-0.5 block text-[12px]">Evite incluir rostos e placas.</span>
      </div>
    </section>
  );
}

// ── Passo: Confirmação / Privacidade ──────────────────────────────────────────
function StepConfirm({
  draft,
  typeLabel,
  accentColor,
  update,
}: {
  draft: DraftState;
  typeLabel: string;
  accentColor: string;
  update: (patch: Partial<DraftState>) => void;
}) {
  const catLabel = draft.slug ? getCategory(draft.slug).label : typeLabel;

  return (
    <section>
      <h1 className="font-serif text-2xl font-semibold text-tinta">Confira e envie</h1>
      <p className="mt-1 text-sm text-ardosia">Revise o resumo antes de enviar.</p>

      {/* Resumo */}
      <div className="mt-5 overflow-hidden rounded-xl border border-linha bg-superficie">
        <div className="h-1.5 w-full" style={{ background: accentColor }} />
        <dl className="divide-y divide-linha text-sm">
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-nevoa">Tipo</dt>
            <dd className="text-right font-medium text-tinta">{catLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-nevoa">Quando</dt>
            <dd className="text-right font-medium text-tinta">{whenLabel(draft)}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-nevoa">Local</dt>
            <dd className="text-right font-mono text-[12px] text-tinta">
              {draft.lat?.toFixed(5)}, {draft.lng?.toFixed(5)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Privacidade */}
      <div className="mt-5">
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-ardosia">
          Como enviar
        </span>
        <div className="mt-2 flex flex-col gap-2.5">
          <PrivacyOption
            active={!draft.anonymous}
            title="Identificado"
            copy="Seu nome aparece só para moderadores. No feed: 'Confirmado pela comunidade'."
            onSelect={() => update({ anonymous: false })}
          />
          <PrivacyOption
            active={draft.anonymous}
            title="Anônimo"
            copy="Nenhum dado seu é exibido publicamente. Menos peso no score."
            onSelect={() => update({ anonymous: true })}
          />
        </div>
      </div>

      <p className="mt-4 text-[12px] leading-snug text-nevoa">
        Ao enviar você concorda com os Termos. Não é boletim de ocorrência.
      </p>
    </section>
  );
}

function PrivacyOption({
  active,
  title,
  copy,
  onSelect,
}: {
  active: boolean;
  title: string;
  copy: string;
  onSelect: () => void;
}) {
  return (
    <label
      className={[
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all',
        active
          ? 'border-petroleo-600 bg-petroleo-100'
          : 'border-linha bg-superficie hover:border-ardosia',
      ].join(' ')}
    >
      <input
        type="radio"
        name="privacy"
        checked={active}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 accent-petroleo-600"
      />
      <span>
        <span className="block text-sm font-semibold text-tinta">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-ardosia">{copy}</span>
      </span>
    </label>
  );
}

// ── Passo: Sucesso ────────────────────────────────────────────────────────────
function StepSuccess({ refCode, onReset }: { refCode: string | null; onReset: () => void }) {
  return (
    <section className="flex flex-col items-center py-8 text-center">
      <RadarMark size={56} color="#0e5c63" dotColor="#fbfaf6" />
      <h1 className="mt-5 font-serif text-2xl font-semibold text-tinta">Report enviado!</h1>
      <p className="mt-2 max-w-sm text-sm text-ardosia">
        Seu report entra na fila de moderação. Aparecerá no mapa assim que confirmado.
      </p>
      {refCode && (
        <div className="mt-5 rounded-lg bg-petroleo-100 px-4 py-2 font-mono text-sm text-petroleo-600">
          Código: {refCode}
        </div>
      )}
      <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
        <Link
          href="/mapa"
          className="flex w-full items-center justify-center rounded-lg bg-petroleo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-petroleo-500"
        >
          Ver no mapa
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="flex w-full items-center justify-center rounded-lg border border-petroleo-600 px-4 py-3 text-sm font-semibold text-petroleo-600 hover:bg-petroleo-100"
        >
          Reportar outro
        </button>
      </div>
    </section>
  );
}
