// Shapes shared by the server and the browser.

// A wallpaper as stored in data/wallpapers.json (server only: it carries internal fields).
export interface Wallpaper {
  id: number;
  title: string;
  filename: string;
  source: string;
  publicId?: string;
  category: string;
  tags: string[];
  likes: number;
  downloads: number;
  featured: boolean;
  createdAt: string;
  width: number;
  height: number;
  device: 'phone' | 'desktop';
  series?: string;
}

// What the browser is told about a wallpaper: signed preview URLs instead of the internal
// fields (source file name, storage id, original file name), and never a URL for the original.
export type PublicWallpaper = Omit<Wallpaper, 'filename' | 'source' | 'publicId'> & {
  thumb: string;
  display: string;
};

export interface Category {
  name: string;
  icon?: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  avatar: string | null;
}
