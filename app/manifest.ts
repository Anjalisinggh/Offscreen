// Served at /manifest.webmanifest: the name, colours and icons used when the site is installed
// or added to a home screen.
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Offscreen · A collection for your screen',
    short_name: 'Offscreen',
    description: 'A collection for your screen. Wallpapers for phone and desktop, picked by mood.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf3f1',
    theme_color: '#faf3f1',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
