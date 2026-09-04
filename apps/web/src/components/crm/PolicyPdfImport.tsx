'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

type Props = {
  parsing: boolean;
  filename: string | null;
  filledLabels: string[];
  missingLabels: string[];
  warning: string | null;
  onPick: (file: File) => void;
};

export function PolicyPdfImport({
  parsing,
  filename,
  filledLabels,
  missingLabels,
  warning,
  onPick,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const takeFile = (file?: File | null) => {
    if (!file || parsing) return;
    onPick(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="policy-import">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => takeFile(e.target.files?.[0])}
      />
      <button
        type="button"
        className={`policy-drop ${drag ? 'is-drag' : ''} ${parsing ? 'is-busy' : ''}`}
        disabled={parsing}
        onClick={() => inputRef.current?.click()}
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
        <span className="policy-drop-icon">
          {parsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
        </span>
        <span className="policy-drop-copy">
          <strong>{parsing ? 'Lendo a apólice…' : 'Preencher pela apólice (PDF)'}</strong>
          <span>
            {parsing
              ? 'O arquivo não é salvo. Só extraímos o texto para o formulário.'
              : 'Solte o PDF aqui ou toque para escolher. O arquivo não fica guardado — só os dados.'}
          </span>
        </span>
      </button>

      {filename && filledLabels.length > 0 && (
        <div className="policy-result is-ok">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <div>
            <p>
              Dados de <strong>{filename}</strong> no formulário. Confira o que está marcado como
              apólice antes de salvar.
            </p>
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
