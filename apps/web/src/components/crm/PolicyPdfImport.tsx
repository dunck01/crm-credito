'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

type Props = {
  parsing: boolean;
  filename: string | null;
  filledLabels: string[];
  missingLabels: string[];
  warning: string | null;
  pendingAttach?: boolean;
  onPick: (file: File) => void;
  onReject?: (message: string) => void;
};

function isProbablyPdf(file: File) {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return true;
  if (mime.startsWith('image/')) return false;
  return mime === '' || mime === 'application/octet-stream';
}

export function PolicyPdfImport({
  parsing,
  filename,
  filledLabels,
  missingLabels,
  warning,
  pendingAttach,
  onPick,
  onReject,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const takeFile = (file?: File | null) => {
    if (!file || parsing) return;
    if (!isProbablyPdf(file)) {
      onReject?.(
        'Fotos e prints da apólice não funcionam. No WhatsApp, envie o PDF como Documento (não como imagem) e escolha esse arquivo aqui.'
      );
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    onPick(file);
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
          takeFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="policy-drop-input"
          disabled={parsing}
          onChange={(e) => takeFile(e.target.files?.[0])}
        />
        <span className="policy-drop-icon">
          {parsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
        </span>
        <span className="policy-drop-copy">
          <strong>{parsing ? 'Lendo a apólice…' : 'Inserir apólice (PDF)'}</strong>
          <span>
            {parsing
              ? 'Extraindo os dados e preparando o anexo.'
              : 'Toque para escolher o PDF no celular (WhatsApp, Arquivos ou Downloads) ou solte o arquivo aqui. Use o PDF original, não uma foto.'}
          </span>
        </span>
      </label>
      <label className="policy-anyfile">
        <input
          type="file"
          className="policy-drop-input"
          disabled={parsing}
          onChange={(e) => {
            takeFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        PDF não aparece na lista? Toque aqui para abrir todos os arquivos.
      </label>

      {filename && filledLabels.length > 0 && (
        <div className="policy-result is-ok">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <div>
            <p>
              Dados de <strong>{filename}</strong> no formulário. Confira o que está marcado como
              apólice antes de salvar.
            </p>
            {pendingAttach && (
              <p className="policy-missing">O PDF fica anexado nesta apólice ao salvar.</p>
            )}
            <p className="policy-chips">
              {filledLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </p>
            {missingLabels.length > 0 && (
              <p className="policy-missing">Complete na mão: {missingLabels.join(', ')}.</p>
            )}
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
