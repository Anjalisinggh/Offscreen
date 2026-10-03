// Passwords are stored only as scrypt hashes: "scrypt$<salt>$<hash>", both base64url.
import 'server-only';
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEYLEN = 64;

export const MIN_PASSWORD = 8;
export const passwordProblem = (pw: unknown) =>
  typeof pw !== 'string' || pw.length < MIN_PASSWORD ? `Please choose a password of at least ${MIN_PASSWORD} characters`
    : pw.length > 200 ? 'That password is too long' : null;

export async function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(pw, salt, KEYLEN);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(pw: string, stored: string | null) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scrypt(pw, Buffer.from(salt, 'base64url'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
