'use client';
import { useEffect, type ReactNode } from 'react';
import { Close } from './icons';

// closes on Escape, on a click outside the dialog, and with the × button
export default function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="close-x" aria-label="Close" onClick={onClose}><Close /></button>
        {children}
      </div>
    </div>
  );
}
