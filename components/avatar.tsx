import { initial } from '@/lib/client';
import type { PublicUser } from '@/lib/types';

export default function Avatar({ user, className }: { user: PublicUser; className: string }) {
  return user.avatar
    // eslint-disable-next-line @next/next/no-img-element
    ? <span className={`${className} has-photo`}><img src={user.avatar} alt="" /></span>
    : <span className={className}>{initial(user.name)}</span>;
}
