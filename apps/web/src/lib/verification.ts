import { hashPassword, verifyPassword } from './password.js';

export const CODE_TTL_MS = 15 * 60_000;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60_000;

export function generateCode(): string {
  // 6 dígitos, 000000–999999
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function hashCode(code: string): Promise<string> {
  return hashPassword(code);
}

export function verifyCode(code: string, hash: string): Promise<boolean> {
  return verifyPassword(code, hash);
}
