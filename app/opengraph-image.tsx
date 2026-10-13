// The picture shown when a link to the site is shared (served at /opengraph-image): the wordmark
// and headline beside three fanned wallpapers. Wallpaper pages use their own picture instead.
import { ImageResponse } from 'next/og';
import wallpapersJson from '@/data/wallpapers.json';
import { serif } from '@/lib/brand-image';
import { ogTileUrl } from '@/lib/media';
import type { Wallpaper } from '@/lib/types';

export const alt = 'Offscreen · Wallpapers for your mood';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const featured = (wallpapersJson as Wallpaper[]).filter((w) => w.featured && w.device === 'phone' && w.publicId);
  const [left, center, right] = featured.slice(0, 3).map(ogTileUrl);
  const [regular, italic] = await Promise.all([serif('Offscreen Wallpapers for your mood.', false), serif('Offmood.', true)]);
  const fonts = [
    regular && { name: 'Cormorant', data: regular, style: 'normal' as const, weight: 500 as const },
    italic && { name: 'Cormorant', data: italic, style: 'italic' as const, weight: 500 as const },
  ].filter((f) => !!f);

  const phone = (src: string | undefined, style: React.CSSProperties) => src && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={236} height={500}
      style={{ position: 'absolute', objectFit: 'cover', borderRadius: 34, border: '6px solid #fff', boxShadow: '0 30px 60px rgba(90, 30, 55, .35)', ...style }} />
  );

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#faf3f1', color: '#3b1f2c', fontFamily: 'Cormorant' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 600, paddingLeft: 72 }}>
          <div style={{ display: 'flex', fontSize: 46 }}>
            <span style={{ fontStyle: 'italic', color: '#c25a7c' }}>Off</span>screen
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 112, lineHeight: 0.92, marginTop: 34, letterSpacing: -2 }}>
            <span>Wallpapers</span>
            <span>for your</span>
            <span style={{ fontStyle: 'italic', color: '#c25a7c' }}>mood.</span>
          </div>
        </div>
        <div style={{ display: 'flex', position: 'relative', width: 600, height: 630 }}>
          {phone(left, { left: 28, top: 92, transform: 'rotate(-9deg)' })}
          {phone(right, { left: 316, top: 92, transform: 'rotate(9deg)' })}
          {phone(center, { left: 172, top: 56 })}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
