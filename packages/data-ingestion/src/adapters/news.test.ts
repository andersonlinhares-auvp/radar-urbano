import { describe, it, expect } from 'vitest';
import { parseRss } from './news.js';

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Tiroteio em Copacabana</title><link>https://g1.example/a</link>
<description><![CDATA[Disparos na orla]]></description><pubDate>Mon, 01 Jun 2026 10:00:00 GMT</pubDate></item>
<item><title>Inauguração no Méier</title><link>https://g1.example/b</link>
<description>festa</description></item>
</channel></rss>`;

describe('parseRss', () => {
  it('extrai itens (title/link/description)', () => {
    const items = parseRss(RSS);
    expect(items.length).toBe(2);
    expect(items[0]!.title).toBe('Tiroteio em Copacabana');
    expect(items[0]!.link).toBe('https://g1.example/a');
    expect(items[0]!.description).toContain('Disparos');
  });
});
