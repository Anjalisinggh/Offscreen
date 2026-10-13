// The app icon as a PNG at the sizes the web manifest lists (/pwa-icon/192, /pwa-icon/512).
import { appIcon } from '@/lib/brand-image';

export const dynamicParams = false;
export const generateStaticParams = () => [{ size: '192' }, { size: '512' }];

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  return appIcon(Number((await params).size));
}
