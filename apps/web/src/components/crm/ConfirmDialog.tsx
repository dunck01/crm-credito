'use client';

import { AlertTriangle } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Voltar',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <ModalOverlay onClose={onCancel} className="overlay-front">
      <div className="modal" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
        <div className="modal-grabber" />
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
            <div>
              <h3 id="confirm-title" className="text-base font-display font-bold m-0 text-[var(--ink)]">
                {title}
              </h3>
              <p id="confirm-desc" className="m-0 mt-2 text-sm text-[var(--ink-soft)] leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <div />
          <div className="right">
            <button className="btn btn-ghost" type="button" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button className={danger ? 'btn btn-danger' : 'btn'} type="button" onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
