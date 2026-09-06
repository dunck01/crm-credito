'use client';

import { useRef, type ReactNode } from 'react';

type Props = {
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function ModalOverlay({ onClose, children, className = '' }: Props) {
  const downOnBackdrop = useRef(false);

  return (
    <div
      className={`overlay ${className}`.trim()}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onPointerUp={(e) => {
        const close = downOnBackdrop.current && e.target === e.currentTarget;
        downOnBackdrop.current = false;
        if (close) onClose();
      }}
    >
      {children}
    </div>
  );
}
