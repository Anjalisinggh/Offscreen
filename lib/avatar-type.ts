// Tells a stored profile photo's format from its first bytes: webp ("RIFF....WEBP") or JPEG (FF D8 FF).
export function avatarType(b: Uint8Array): 'image/webp' | 'image/jpeg' | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  return null;
}
