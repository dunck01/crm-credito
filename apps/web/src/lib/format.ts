export function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

export function maskCpfCnpj(value: unknown): string {
  const d = digitsOnly(value).slice(0, 14);
  if (!d) return '';
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function formatCpf(value: unknown): string {
  return maskCpfCnpj(value);
}

export const formatCpfCnpj = maskCpfCnpj;

export function maskPhone(value: unknown): string {
  const d = digitsOnly(value).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatPhone(value: unknown): string {
  return maskPhone(value);
}

export function maskCep(value: unknown): string {
  const d = digitsOnly(value).slice(0, 8);
  if (!d) return '';
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatCep(value: unknown): string {
  return maskCep(value);
}

export function formatMoneyCents(centsOrFloat: number | null | undefined): string {
  if (centsOrFloat === null || centsOrFloat === undefined || isNaN(centsOrFloat)) return '';
  return centsOrFloat.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCentsFromDigits(raw: unknown): { formatted: string; value: number | null } {
  const digits = digitsOnly(raw).slice(0, 13);
  if (!digits) {
    return { formatted: '', value: null };
  }
  const cents = parseInt(digits, 10);
  if (cents === 0) {
    return { formatted: '0,00', value: 0 };
  }
  const val = cents / 100;
  const formatted = val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return { formatted, value: val };
}

export function whatsappLink(phone: unknown) {
  const d = digitsOnly(phone);
  if (!d) return '';
  const withCountry = d.startsWith('55') ? d : `55${d}`;
  return `https://wa.me/${withCountry}`;
}

export function formatLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const todayStr = () => formatLocalIsoDate(new Date());

export function toDateKey(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  const s = String(value).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  return '';
}

export function fmtDate(iso: string) {
  if (!iso) return '';
  const key = toDateKey(iso);
  if (!key) return iso;
  const parts = key.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
}

export function fmtDateShort(iso: string) {
  if (!iso) return '';
  const key = toDateKey(iso);
  if (!key) return iso;
  const parts = key.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso;
}

export function parseMoney(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const str = String(raw).trim();
  const num = str.includes(',')
    ? parseFloat(str.replace(/\./g, '').replace(',', '.'))
    : parseFloat(str);
  return Number.isFinite(num) ? num : null;
}

export function fmtMoney(v: unknown) {
  const num = parseMoney(v);
  if (num === null) return '';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function decimalNumber(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function normalizeSearch(str: string) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
