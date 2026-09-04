'use client';

import React, { useEffect, useRef, useState } from 'react';
import { digitsOnly, formatMoneyCents, parseCentsFromDigits, parseMoney } from '@/lib/format';

type MoneyInputProps = {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  placeholder?: string;
  className?: string;
  accentColor?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
};

export function MoneyInput({
  value,
  onChange,
  placeholder = '0,00',
  className = '',
  accentColor,
  disabled = false,
  id,
  name,
}: MoneyInputProps) {
  const [display, setDisplay] = useState(() => formatMoneyCents(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(formatMoneyCents(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw.trim()) {
      setDisplay('');
      onChange(null);
      return;
    }

    // If display was already '0,00' and user hits backspace, reset to empty
    const digits = digitsOnly(raw);
    const cents = parseInt(digits, 10);
    if (cents === 0) {
      if (display === '0,00' && raw.length < display.length) {
        setDisplay('');
        onChange(null);
        return;
      }
      setDisplay('0,00');
      onChange(0);
      return;
    }

    const { formatted, value: numVal } = parseCentsFromDigits(raw);
    setDisplay(formatted);
    onChange(numVal);

    requestAnimationFrame(() => {
      if (inputRef.current) {
        const len = formatted.length;
        inputRef.current.setSelectionRange(len, len);
      }
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText || !pastedText.trim()) return;

    const cleaned = pastedText.trim().replace(/^R\$\s*/i, '');
    let numVal: number | null = null;

    if (cleaned.includes(',')) {
      numVal = parseMoney(cleaned);
    } else if (cleaned.includes('.')) {
      const parts = cleaned.split('.');
      if (parts.length === 2 && parts[1].length === 2) {
        numVal = parseFloat(cleaned);
      } else {
        numVal = parseFloat(cleaned.replace(/\./g, ''));
      }
    } else {
      const parsed = parseInt(digitsOnly(cleaned), 10);
      if (!isNaN(parsed)) {
        numVal = parsed;
      }
    }

    if (numVal !== null && Number.isFinite(numVal)) {
      const formatted = formatMoneyCents(numVal);
      setDisplay(formatted);
      onChange(numVal);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const len = formatted.length;
          inputRef.current.setSelectionRange(len, len);
        }
      });
    }
  };

  const isLime = accentColor?.includes('lime');
  const isTeal = accentColor?.includes('teal');
  const colorClass = isLime ? 'text-lime' : isTeal ? 'text-teal' : '';

  return (
    <div className="money-input-wrap relative flex items-center w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none select-none z-10">
        <span
          className="font-mono font-bold text-xs transition-colors leading-none"
          style={{ color: accentColor || 'var(--ink-muted)' }}
        >
          R$
        </span>
      </div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={display}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        className={`money-field-input w-full font-mono tabular-nums ${colorClass} ${className}`}
        style={{
          paddingLeft: '42px',
          ...(accentColor ? { color: accentColor } : {}),
        }}
      />
    </div>
  );
}
