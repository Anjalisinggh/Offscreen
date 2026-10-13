// The icon an iPhone or iPad uses when the site is added to the home screen.
import { appIcon } from '@/lib/brand-image';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return appIcon(180);
}
