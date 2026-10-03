import Link from 'next/link';
import type { ReactNode } from 'react';
import { Arrow } from './icons';

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="link-arrow reveal" href={href}>{children} <Arrow /></Link>;
}

export default function SectionHead({ num, eyebrow, title, link }: {
  num?: string; eyebrow: string; title: ReactNode; link?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div className="reveal">
        <span className="eyebrow">{num && <b className="num">{num}</b>}{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {link}
    </div>
  );
}
