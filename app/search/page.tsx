import Link from 'next/link';
import { dedupeSeries, loadWallpapers, publicWallpaper, sortWallpapers } from '@/lib/wallpapers';
import { moodSearch } from '@/lib/mood-search';
import Grid from '@/components/grid';
import SearchForm from '@/components/search-form';

export const metadata = { title: 'Search · Offscreen' };

const SUGGESTIONS = ['calm', 'sad', 'cozy', 'motivated', 'dark', 'pink', 'retro', 'desktop'];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || '').trim();
  const all = q ? dedupeSeries((await loadWallpapers()).map(publicWallpaper)) : [];
  const { items, kind, moods } = moodSearch(all, q, sortWallpapers(all, 'trending').slice(0, 12));

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
          <p className="result-count reveal">
            {kind === 'none'
              ? <>Nothing matched “{q}”, so here are this week’s favourites</>
              : <>{items.length} result{items.length === 1 ? '' : 's'} for “{q}”{kind === 'mood' && moods.length > 0 && <> · picked for feeling {moods.join(' and ')}</>}</>}
          </p>
          <Grid key={q} items={items} />
        </div>
      )}
    </>
  );
}
