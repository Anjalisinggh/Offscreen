import type { ReactNode } from 'react';

// a template (unlike a layout) is re-created on every navigation, so each page eases in
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in">{children}</div>;
}
