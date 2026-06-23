import { describe, it, expect } from 'vitest';
import { parseRobots, USER_AGENT } from './http.js';

const ROBOTS = `User-agent: *
Disallow: /admin
Disallow: /private
Allow: /`;

describe('parseRobots', () => {
  it('permite caminho liberado', () => {
    expect(parseRobots(ROBOTS, '/rss/rio')).toBe(true);
  });
  it('bloqueia caminho proibido', () => {
    expect(parseRobots(ROBOTS, '/admin/x')).toBe(false);
  });
  it('robots vazio → permite', () => {
    expect(parseRobots('', '/qualquer')).toBe(true);
  });
});

it('UA identifica o bot', () => {
  expect(USER_AGENT).toMatch(/RadarUrbanoBot/);
});
