import Link from 'next/link';
import { dedupeSeries, filterWallpapers, loadWallpapers, publicWallpaper } from '@/lib/wallpapers';
import Grid from '@/components/grid';
import SearchForm from '@/components/search-form';

export const metadata = { title: 'Search · Offscreen' };

const SUGGESTIONS = ['dark', 'retro', 'pink', 'motivational', 'minimal', 'vintage', 'cute', 'desktop'];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || '').trim();
  const items = q ? dedupeSeries(filterWallpapers((await loadWallpapers()).map(publicWallpaper), { q })) : [];

  return (
    <>
      <div className="page-head">
        <span className="eyebrow reveal">Search</span>
        <SearchForm variant="big" initial={q} autoFocus={!q} />
        <div className="suggest reveal"><span>Try</span>{SUGGESTIONS.map((s) => <Link key={s} className="tag" href={`/search?q=${s}`}>{s}</Link>)}</div>
      </div>
      {!q ? (
        <div className="empty-state"><h3>Search by <em>feeling</em></h3>Try a mood, a colour or a style.</div>
      ) : (
        <div>
          <p className="result-count reveal">{items.length} result{items.length === 1 ? '' : 's'} for “{q}”</p>
          <Grid key={q} items={items} empty={<div className="empty-state"><h3>No <em>matches</em></h3>Nothing matched “{q}”. Try one of the suggestions above.</div>} />
        </div>
      )}
    </>
  );
}
