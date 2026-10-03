// Line icons, stroked with currentColor (sized and styled in globals.css).
import type { SVGProps } from 'react';

const Svg = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" aria-hidden="true" {...props} />;

export const Heart = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z" /></Svg>;
export const Download = () => <Svg><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></Svg>;
export const Share = () => <Svg><path d="M12 15V4M8 8l4-4 4 4M6 12v7h12v-7" /></Svg>;
export const Arrow = () => <Svg><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const Close = () => <Svg><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const Search = () => <Svg><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></Svg>;
export const Torch = () => <Svg><path d="M9 3h6v5l-2 3v10h-2V11L9 8z" /></Svg>;
export const Camera = () => <Svg><rect x="3.5" y="7" width="17" height="12" rx="2" /><circle cx="12" cy="13" r="3.2" /><path d="M9 7l1.5-2.5h3L15 7" /></Svg>;
export const Desktop = () => <Svg><rect x="3" y="4.5" width="18" height="12" rx="1.5" /><path d="M1.5 19.5h21" /></Svg>;
export const Phone = () => <Svg><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></Svg>;
export const Moon = () => <Svg className="i-moon"><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" /></Svg>;
export const Sun = () => <Svg className="i-sun"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></Svg>;
export const GitHub = () => <Svg><path d="M9 19c-4 1.3-4-2-6-2.5m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" /></Svg>;
export const ArrowUp = () => <Svg><path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
