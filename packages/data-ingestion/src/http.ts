export const USER_AGENT =
  'RadarUrbanoBot/1.0 (+https://github.com/andersonlinhares-auvp/radar-urbano)';

/**
 * Avalia robots.txt para o nosso UA (grupo '*'): true = permitido.
 * Implementação simples: considera o grupo User-agent: * e regras Disallow por prefixo.
 */
export function parseRobots(txt: string, path: string): boolean {
  if (!txt.trim()) return true;
  const lines = txt.split(/\r?\n/);
  let inStar = false;
  const disallows: string[] = [];
  for (const raw of lines) {
    const line = raw.split('#')[0]!.trim();
    if (!line) continue;
    const [field, ...rest] = line.split(':');
    const key = (field ?? '').trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      inStar = value === '*';
    } else if (inStar && key === 'disallow') {
      if (value) disallows.push(value);
    }
  }
  return !disallows.some((d) => path.startsWith(d));
}

export async function isAllowedByRobots(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const res = await fetch(`${u.origin}/robots.txt`, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return true; // fail-open
    const txt = await res.text();
    return parseRobots(txt, u.pathname);
  } catch {
    return true;
  }
}

/** GET texto com UA. Lança se status ≥ 400. (timeout/retry ficam no runIngestion.) */
export async function politeFetch(url: string, opts?: { accept?: string }): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: opts?.accept ?? 'text/html,application/xhtml+xml,application/xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.text();
}
