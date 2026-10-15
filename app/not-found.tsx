// The 404 page: "404" drawn in tiny squares of real wallpapers (components/mosaic-404.tsx), a
// plain line saying what happened; the top bar is the way back in.
import { mosaicTiles } from '@/lib/wallpapers';
import Mosaic404 from '@/components/mosaic-404';

export const metadata = { title: 'Page not found · Offscreen' };

export default function NotFound() {
  return (
    <div className="nf">
      <Mosaic404 pool={mosaicTiles()} />
      <div className="nf-foot">
        <h1>Oops! This page went <em>offscreen.</em></h1>
      </div>
    </div>
  );
}
