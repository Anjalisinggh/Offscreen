// Search that understands feelings. Wallpapers are tagged by what's in them ("rain", "pastel",
// "quote"), but people search the way they feel ("sad", "calm"). A feeling word is turned into the
// tags and titles that suit it; anything else is matched on the words themselves.
import type { PublicWallpaper } from './types';

// feeling words (and close variants) → the tags, collections and title words that suit them
const MOODS: { words: string[]; label: string; terms: string[] }[] = [
  { label: 'sad', words: ['sad', 'lonely', 'alone', 'heartbroken', 'heartbreak', 'low','melancholy', 'crying', 'cry', 'depressed', 'gloomy', 'hurt', 'empty', 'broken'],
    terms: ['moody', 'rain', 'night', 'blue', 'moon', 'silhouette', 'monochrome', 'black and white', 'shadow', 'nostalgic', 'quiet', 'nothing matters', 'life is very hard'] },
  { label: 'calm', words: ['calm', 'peace', 'peaceful', 'relax', 'relaxed', 'relaxing', 'serene', 'zen', 'quiet', 'chill', 'soothing', 'still', 'soft', 'gentle'],
    terms: ['calm', 'pastel', 'nature', 'clouds', 'water', 'lake', 'river', 'sea', 'ocean', 'minimal', 'lotus', 'cozy', 'chill', 'piano', 'sakura', 'blossom'] },
  { label: 'stressed', words: ['stress', 'stressed', 'anxious', 'anxiety', 'overwhelmed', 'panic', 'worried', 'tired', 'exhausted', 'burnout', 'burnt out'],
    terms: ['stress', 'panic', 'chill', 'calm', 'easier', 'keep going', 'clouds', 'nature', 'cozy'] },
  { label: 'happy', words: ['happy', 'joy', 'joyful', 'cheerful', 'excited', 'fun', 'good', 'great', 'playful', 'bright', 'sunny', 'smile'],
    terms: ['cute', 'funny', 'sun', 'sunlight', 'flowers', 'pink', 'pastel', 'cat', 'dog', 'puppy', 'cartoon', 'groovy', 'bows', 'cherries'] },
  { label: 'motivated', words: ['motivated', 'motivation', 'productive', 'focus', 'focused', 'determined', 'hustle', 'ambitious', 'inspired', 'inspiration', 'grind', 'confident', 'boss'],
    terms: ['motivational', 'quote', 'typography', 'make it happen', 'do it', 'keep going', 'ego'] },
  { label: 'romantic', words: ['romantic', 'love', 'loved', 'in love', 'crush', 'flirty', 'valentine', 'date'],
    terms: ['romantic', 'romance', 'couple', 'love', 'heart', 'roses', 'kisses', 'lips', 'lipstick', 'sakura', 'cherry blossom'] },
  { label: 'dreamy', words: ['dreamy', 'dream', 'nostalgic', 'nostalgia', 'wistful', 'whimsical', 'magical', 'aesthetic'],
    terms: ['dreamy', 'nostalgia', 'nostalgic', 'retro', 'vintage', 'clouds', 'sunset', 'pastel', 'y2k', 'fantasy', 'storybook', 'fireflies', 'glow'] },
  { label: 'spiritual', words: ['spiritual', 'devotional', 'blessed', 'grateful', 'gratitude', 'prayer', 'pray', 'faith', 'divine', 'god', 'holy', 'sacred', 'meditation', 'meditate'],
    terms: ['spiritual', 'devotional', 'krishna', 'shiva', 'buddha', 'temple', 'lotus', 'gita', 'goddess', 'divine feminine', 'hanuman', 'lakshmi', 'durga', 'vishnu', 'ganesha'] },
  { label: 'cozy', words: ['cozy', 'cosy', 'warm', 'comfy', 'comfort', 'homey', 'sleepy', 'lazy', 'snug', 'rainy'],
    terms: ['cozy', 'warm', 'coffee', 'cat', 'lanterns', 'lantern', 'autumn', 'sleepy', 'rain', 'piano', 'fireflies'] },
  { label: 'mysterious', words: ['mysterious', 'mystery', 'gothic', 'edgy', 'spooky', 'creepy', 'eerie', 'haunted', 'villain', 'evil'],
    terms: ['dark', 'gothic', 'night', 'moon', 'vampire', 'crows', 'shadow', 'eclipse', 'chains', 'serpent', 'red moon', 'demon slayer'] },
  { label: 'fierce', words: ['angry', 'anger', 'mad', 'rage', 'fierce', 'powerful', 'power', 'strong', 'brave', 'bold', 'savage', 'fearless', 'fight'],
    terms: ['fire', 'flame', 'red', 'dragon', 'tiger', 'lion', 'warrior', 'samurai', 'sword', 'battle', 'swordswoman', 'wolf', 'leopard'] },
  { label: 'cute', words: ['cute', 'kawaii', 'sweet', 'adorable', 'girly', 'soft girl', 'pretty'],
    terms: ['cute', 'pastel', 'pink', 'bows', 'cat', 'puppy', 'dog', 'raccoon', 'fox', 'baby', 'snorlax', 'totoro'] },
  { label: 'wild', words: ['trippy', 'weird', 'crazy', 'wild', 'chaotic', 'high', 'psychedelic', 'funky', 'surreal'],
    terms: ['psychedelic', 'neon', 'swirl', 'groovy', 'surreal', 'cyberpunk', 'glow', 'cosmic'] },
  { label: 'funny', words: ['funny', 'silly', 'goofy', 'meme', 'lol', 'humor', 'humour'],
    terms: ['funny', 'cartoon', 'monkey', 'meow', 'chill bro'] },
  { label: 'adventurous', words: ['adventurous', 'adventure', 'free', 'freedom', 'explore', 'wanderlust', 'travel', 'curious'],
    terms: ['mountains', 'canyon', 'space', 'cosmic', 'stars', 'nebula', 'ocean', 'forest', 'city', 'car', 'wanderers'] },
];

// a feeling pulls in the closest matches, not every wallpaper that shares one loose tag
const MAX_MOOD = 36;

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').trim();
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// "sadness", "calming", "stressed out" still find their feeling; very short words must match exactly
function moodFor(word: string) {
  return MOODS.find((m) => m.words.some((w) => word === w || (w.length >= 4 && word.startsWith(w))));
}

const haystack = (w: PublicWallpaper) => [norm(w.title), norm(w.category), ...w.tags.map(norm)];
const matchesAll = (w: PublicWallpaper, terms: string[]) => { const h = haystack(w); return terms.every((t) => h.some((x) => x.includes(t))); };

export type SearchResult = {
  items: PublicWallpaper[];
  // how the results were found: the words themselves, a feeling, or nothing (so popular picks)
  kind: 'match' | 'mood' | 'none';
  moods: string[];
};

// `popular` is shown when nothing matches, so the page is never empty
export function moodSearch(all: PublicWallpaper[], q: string, popular: PublicWallpaper[]): SearchResult {
  const query = norm(q);
  const qWords = words(q);
  if (!query) return { items: [], kind: 'none', moods: [] };

  // 1. the whole phrase, then every word of it, in a title, collection or tag
  let direct = all.filter((w) => haystack(w).some((x) => x.includes(query)));
  if (!direct.length && qWords.length > 1) direct = all.filter((w) => matchesAll(w, qWords));

  // 2. feelings in the query, scored by how many of the feeling's tags a wallpaper has
  const moods = [...new Set(qWords.map(moodFor).filter((m) => !!m))];
  const terms = [...new Set(moods.flatMap((m) => m.terms))];
  const byMood = terms.length
    ? all.map((w) => {
      const h = haystack(w);
      const score = terms.reduce((s, t) => s + (h.slice(2).includes(t) || h[1] === t ? 2 : h[0].includes(t) ? 1 : 0), 0);
      return { w, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.w.likes - a.w.likes).slice(0, MAX_MOOD).map((x) => x.w)
    : [];

  const seen = new Set<number>();
  const items = [...direct, ...byMood].filter((w) => !seen.has(w.id) && !!seen.add(w.id));
  if (items.length) return { items, kind: direct.length ? 'match' : 'mood', moods: moods.map((m) => m.label) };
  return { items: popular, kind: 'none', moods: [] };
}
