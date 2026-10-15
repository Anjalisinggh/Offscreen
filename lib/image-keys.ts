// Where each size of a wallpaper is stored on Cloudflare R2. Shared by lib/media.ts (which builds
// the URLs) and scripts/upload-to-r2.mts (which makes and uploads the files), so the two always agree.
// No imports: the upload script runs this file directly with Node.

export type Size = 'thumb' | 'display' | 'og' | 'ogtile' | 'share' | 'tile';

// webp where browsers show it; plain JPEG where other apps take the picture (link previews, sharing)
export const SIZE_EXT: Record<Size, 'webp' | 'jpg'> = {
  thumb: 'webp', display: 'webp', tile: 'webp', og: 'jpg', ogtile: 'jpg', share: 'jpg',
};

// e.g. "offscreen/crimson-flow-abstract-17/thumb.webp" in the public bucket
export const sizeKey = (publicId: string, size: Size) => `${publicId}/${size}.${SIZE_EXT[size]}`;
// e.g. "offscreen/crimson-flow-abstract-17.png" in the private bucket
export const originalKey = (publicId: string, filename: string) => `${publicId}${filename.slice(filename.lastIndexOf('.'))}`;
