import type { CategorySlug } from '@radar-urbano/core';
import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';
import { USER_AGENT } from '../http.js';

const BASE = 'https://api-service.fogocruzado.org.br/api/v2';
const MAX_ITEMS = 50;

interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

async function login(): Promise<string | null> {
  const email = process.env.FOGOCRUZADO_EMAIL;
  const password = process.env.FOGOCRUZADO_PASSWORD;
  if (!email || !password) {
    throw new Error('FOGOCRUZADO_EMAIL/PASSWORD ausentes.');
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Fogo Cruzado login HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: { accessToken?: string; expiresIn?: number };
    accessToken?: string;
    expiresIn?: number;
  };
  const token = json.data?.accessToken ?? json.accessToken ?? null;
  const expiresIn = json.data?.expiresIn ?? json.expiresIn ?? 3600;
  if (!token) throw new Error('Fogo Cruzado: token ausente na resposta de login.');
  tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

async function authedGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Fogo Cruzado GET ${path} HTTP ${res.status}`);
  return res.json();
}

function sinceDate(): string {
  const fromEnv = process.env.INGESTION_SINCE;
  if (fromEnv && /^\d{4}-\d{2}-\d{2}/.test(fromEnv)) return fromEnv.slice(0, 10);
  const year = new Date().getUTCFullYear();
  return `${year}-01-01`;
}

export const fogoCruzadoAdapter: SourceAdapter = {
  id: 'fogo-cruzado',
  sourceKind: 'PARTNER',
  async fetch() {
    const token = await login();
    if (!token) return [];
    // Descobre o idState do Rio de Janeiro.
    const statesJson = (await authedGet('/states', token)) as {
      data?: Array<{ id: string; name: string }>;
    };
    const states = statesJson.data ?? [];
    const rj = states.find((s) => /rio de janeiro/i.test(s.name));
    if (!rj) throw new Error('Fogo Cruzado: estado RJ não encontrado.');
    const initialDate = sinceDate();
    const url = `/occurrences?idState=${rj.id}&initialDate=${initialDate}&take=${MAX_ITEMS}&page=1&order=DESC`;
    const occJson = (await authedGet(url, token)) as { data?: RawRecord[] };
    return occJson.data ?? [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    const lat = Number((raw as { latitude?: unknown }).latitude);
    const lng = Number((raw as { longitude?: unknown }).longitude);
    const nbRaw = (raw as { neighborhood?: unknown }).neighborhood;
    const neighborhood =
      typeof nbRaw === 'string' ? nbRaw : ((nbRaw as { name?: string } | null)?.name ?? '');
    const address = String((raw as { address?: unknown }).address ?? '');
    const policeAction = Boolean((raw as { policeAction?: unknown }).policeAction);
    const category: CategorySlug = policeAction ? 'confronto-policial' : 'disparo-arma';
    const id = String((raw as { id?: unknown }).id ?? '');
    const dateStr = String((raw as { date?: unknown }).date ?? Date.now());
    return {
      externalId: `fogocruzado:${id}`,
      categorySlug: category,
      title: `Disparo de arma de fogo${neighborhood ? ` em ${neighborhood}` : ''}`,
      description: address || undefined,
      lng,
      lat,
      occurredAt: new Date(dateStr),
      trustScore: 0.9,
      sourceLabel: 'Fogo Cruzado',
      rawUrl: `https://fogocruzado.org.br/`,
      needsReview: false,
      status: 'CONFIRMED',
    };
  },
};
