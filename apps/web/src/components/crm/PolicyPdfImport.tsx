'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

type Props = {
  parsing: boolean;
  filenames: string[];
  resultText: string | null;
  filledLabels: string[];
  missingLabels: string[];
  warning: string | null;
  progressLabel?: string | null;
  onPick: (files: File[], selectionWarning?: string) => void;
  onReject?: (message: string) => void;
};

const MAX_POLICY_FILES = 8;

function isProbablyPdf(file: File) {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return true;
  if (mime.startsWith('image/')) return false;
  return mime === '' || mime === 'application/octet-stream';
}

export function PolicyPdfImport({
  parsing,
  filenames,
  resultText,
  filledLabels,
  missingLabels,
  warning,
  progressLabel,
  onPick,
  onReject,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const takeFiles = (selected: FileList | File[]) => {
    if (parsing) return;
    const files = Array.from(selected);
    if (files.length === 0) return;

    const pdfs = files.filter(isProbablyPdf);
    const ignored = files.length - pdfs.length;
    if (pdfs.length === 0) {
      onReject?.(
        'Fotos e prints da apólice não funcionam. No WhatsApp, envie o PDF como Documento (não como imagem) e escolha esse arquivo aqui.'
      );
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const limited = pdfs.slice(0, MAX_POLICY_FILES);
    const notices: string[] = [];
    if (ignored > 0) notices.push(`${ignored} arquivo(s) que não são PDF foram ignorado(s).`);
    if (pdfs.length > MAX_POLICY_FILES) {
      notices.push(`Lote limitado a ${MAX_POLICY_FILES} PDFs; ${pdfs.length - MAX_POLICY_FILES} ficaram de fora.`);
    }
    onPick(limited, notices.length ? notices.join(' ') : undefined);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="policy-import">
      <label
        className={`policy-drop ${drag ? 'is-drag' : ''} ${parsing ? 'is-busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          takeFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="policy-drop-input"
          disabled={parsing}
          onChange={(e) => takeFiles(e.target.files || [])}
        />
        <span className="policy-drop-icon">
          {parsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
        </span>
        <span className="policy-drop-copy">
          <strong>{parsing ? 'Lendo apólices…' : 'Inserir apólices (PDF)'}</strong>
          <span>
            {parsing
              ? progressLabel || 'Extraindo os dados das apólices.'
              : 'Escolha um ou mais PDFs no celular (WhatsApp, Arquivos ou Downloads) ou solte os arquivos aqui. Cada PDF vira uma apólice; use o PDF original, não uma foto.'}
          </span>
        </span>
      </label>
      <label className="policy-anyfile">
        <input
          type="file"
          multiple
          className="policy-drop-input"
          disabled={parsing}
          onChange={(e) => {
            takeFiles(e.target.files || []);
            e.target.value = '';
          }}
        />
        PDF não aparece na lista? Toque aqui para abrir todos os arquivos e escolher um ou mais PDFs.
      </label>

      {filenames.length > 0 && (
        <div className="policy-result is-ok">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <div>
            {resultText && <p>{resultText}</p>}
            {filledLabels.length > 0 && (
              <p className="policy-chips">
                {filledLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </p>
            )}
            {missingLabels.length > 0 && (
              <p className="policy-missing">Complete na mão: {missingLabels.join(', ')}.</p>
            )}
            <p className="policy-missing">PDF usado somente para captura; não é salvo no CRM.</p>
            <p className="policy-missing">Arquivos: {filenames.join(', ')}</p>
          </div>
        </div>
      )}

      {warning && (
        <div className="policy-result is-warn">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p>{warning}</p>
        </div>
      )}
    </div>
  );
}
