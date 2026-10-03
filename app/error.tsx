'use client';

export default function ErrorPage({ error }: { error: Error }) {
  return <div className="empty-state"><h3>Something went <em>wrong</em></h3>{error.message}</div>;
}
