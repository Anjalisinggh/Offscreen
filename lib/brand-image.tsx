// Pictures drawn from the brand itself rather than a wallpaper: the app icon (home screens,
// the web manifest) and the serif they and the share card are set in.
import 'server-only';
import { ImageResponse } from 'next/og';

// the site's serif isn't built in, so it's fetched from Google Fonts (only the letters used)
export async function serif(text: string, italic: boolean): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@${italic ? 1 : 0},500&text=${encodeURIComponent(text)}`).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null; // falls back to the default font
  }
}

// the italic "O" on blush, edge to edge (phones round the corners themselves)
export async function appIcon(size: number) {
  const font = await serif('O', true);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4c7d4', color: '#8e3456', fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: size * 0.78, paddingBottom: size * 0.06 }}>
        O
      </div>
    ),
    { width: size, height: size, fonts: font ? [{ name: 'Cormorant', data: font, style: 'italic', weight: 500 }] : [] },
  );
}
