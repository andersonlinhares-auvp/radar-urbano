import type { NormalizedIncident, RawRecord, SourceAdapter, NeighborhoodRef } from '../types.js';
import { politeFetch, isAllowedByRobots } from '../http.js';
import { classifyCategory } from '../classifier.js';
import { matchNeighborhood } from '../neighborhood-matcher.js';

const MAX_ITEMS = 50;

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(m[1]!) : '';
}

/** Parser de RSS simples por regex (sem dependência). */
export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = pick(block, 'title');
    const link = pick(block, 'link');
    if (!title || !link) continue;
    items.push({
      title,
      link,
      description: pick(block, 'description'),
      pubDate: pick(block, 'pubDate') || undefined,
    });
  }
  return items;
}

interface NewsConfig {
  id: string;
  sourceLabel: string;
  rssUrl: string;
  /** Se definido, só aceita matérias cujo link casa este padrão (evita notícias de outros estados). */
  localePattern?: RegExp;
}

export function makeNewsAdapter(cfg: NewsConfig): SourceAdapter {
  return {
    id: cfg.id,
    sourceKind: 'NEWS',
    async fetch(params?: Record<string, unknown>) {
      const gazetteer = (params?.neighborhoods as NeighborhoodRef[] | undefined) ?? [];
      if (gazetteer.length === 0) return [];
      if (!(await isAllowedByRobots(cfg.rssUrl))) return [];
      const xml = await politeFetch(cfg.rssUrl, { accept: 'application/rss+xml, application/xml' });
      const items = parseRss(xml).slice(0, MAX_ITEMS);
      const out: RawRecord[] = [];
      for (const item of items) {
        // Filtro de localidade: descarta matérias de outros estados (ex.: G1 só /rj/).
        if (cfg.localePattern && !cfg.localePattern.test(item.link)) continue;
        const text = `${item.title} ${item.description}`;
        const category = classifyCategory(text);
        if (!category) continue;
        const nb = matchNeighborhood(text, gazetteer);
        if (!nb) continue;
        out.push({
          link: item.link,
          title: item.title,
          description: item.description,
          pubDate: item.pubDate ?? null,
          category,
          lng: nb.lng,
          lat: nb.lat,
          sourceLabel: cfg.sourceLabel,
        });
      }
      return out;
    },
    normalize(raw: RawRecord): NormalizedIncident {
      const link = String(raw.link);
      const pubDate = raw.pubDate ? new Date(String(raw.pubDate)) : new Date();
      const occurredAt = Number.isNaN(pubDate.getTime()) ? new Date() : pubDate;
      return {
        externalId: `${cfg.id}:${link}`,
        categorySlug: raw.category as NormalizedIncident['categorySlug'],
        title: String(raw.title),
        description: String(raw.description) || undefined,
        lng: Number(raw.lng),
        lat: Number(raw.lat),
        occurredAt,
        trustScore: 0.5,
        sourceLabel: String(raw.sourceLabel),
        rawUrl: link,
        needsReview: true,
        status: 'PENDING',
      };
    },
  };
}

export const g1RioAdapter = makeNewsAdapter({
  id: 'g1-rio',
  sourceLabel: 'G1 Rio',
  rssUrl: 'https://g1.globo.com/rss/g1/rio-de-janeiro/',
  localePattern: /\/rj\//,
});
export const oDiaAdapter = makeNewsAdapter({
  id: 'o-dia',
  sourceLabel: 'O Dia',
  rssUrl: 'https://odia.ig.com.br/rss.xml',
});
export const extraAdapter = makeNewsAdapter({
  id: 'extra',
  sourceLabel: 'Extra',
  rssUrl: 'https://extra.globo.com/rss/extra/',
});
