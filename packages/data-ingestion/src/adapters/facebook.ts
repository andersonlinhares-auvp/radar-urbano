import type { NormalizedIncident, RawRecord, SourceAdapter, NeighborhoodRef } from '../types.js';
import { politeFetch } from '../http.js';
import { classifyCategory } from '../classifier.js';
import { matchNeighborhood } from '../neighborhood-matcher.js';

const MAX_ITEMS = 50;

/** Extrai textos de posts do HTML público (best-effort). Facebook costuma bloquear/vazar pouco. */
function extractPosts(html: string): string[] {
  const texts: string[] = [];
  // mbasic/basic costuma usar <p> dentro de divs de post; pegamos blocos de texto plausíveis.
  const matches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
  for (const m of matches) {
    const txt = m
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (txt.length >= 20) texts.push(txt);
  }
  return texts.slice(0, MAX_ITEMS);
}

interface FbConfig {
  id: string;
  sourceLabel: string;
  pageUrl: string;
}

function makeFacebookAdapter(cfg: FbConfig): SourceAdapter {
  return {
    id: cfg.id,
    sourceKind: 'NEWS',
    async fetch(params?: Record<string, unknown>) {
      const gazetteer = (params?.neighborhoods as NeighborhoodRef[] | undefined) ?? [];
      if (gazetteer.length === 0) return [];
      let html: string;
      try {
        html = await politeFetch(cfg.pageUrl, { accept: 'text/html' });
      } catch {
        return []; // bloqueio/muro de login → falha silenciosa
      }
      const posts = extractPosts(html);
      const out: RawRecord[] = [];
      let i = 0;
      for (const text of posts) {
        const category = classifyCategory(text);
        if (!category) continue;
        const nb = matchNeighborhood(text, gazetteer);
        if (!nb) continue;
        out.push({
          // sem URL por post confiável → dedup por hash do texto (gerado no normalize)
          text,
          index: i++,
          category,
          lng: nb.lng,
          lat: nb.lat,
          sourceLabel: cfg.sourceLabel,
          pageUrl: cfg.pageUrl,
        });
      }
      return out;
    },
    normalize(raw: RawRecord): NormalizedIncident {
      const text = String(raw.text);
      // external_id estável por conteúdo (sem URL por post).
      // djb2 hash simples (sem dependência).
      let h = 5381;
      for (let k = 0; k < text.length; k++) h = ((h << 5) + h + text.charCodeAt(k)) >>> 0;
      return {
        externalId: `${cfg.id}:${h}`,
        categorySlug: raw.category as NormalizedIncident['categorySlug'],
        title: text.slice(0, 120),
        description: text.slice(0, 500),
        lng: Number(raw.lng),
        lat: Number(raw.lat),
        occurredAt: new Date(),
        trustScore: 0.35,
        sourceLabel: String(raw.sourceLabel),
        rawUrl: String(raw.pageUrl),
        needsReview: true,
        status: 'PENDING',
      };
    },
  };
}

export const ottFacebookAdapter = makeFacebookAdapter({
  id: 'ott-facebook',
  sourceLabel: 'OTT (Facebook)',
  pageUrl: 'https://www.facebook.com/ott.ondetemtiroteio',
});
export const rioDeNojeiraAdapter = makeFacebookAdapter({
  id: 'rio-de-nojeira',
  sourceLabel: 'Rio de Nojeira',
  pageUrl: 'https://www.facebook.com/RiodeNojeira',
});
