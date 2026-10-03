import Link from 'next/link';

export default function NotFound() {
  return <div className="empty-state"><h3>Page <em>not found</em></h3><Link className="btn" href="/">Return home</Link></div>;
}
