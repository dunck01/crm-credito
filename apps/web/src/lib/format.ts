export function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

export function formatCpf(value: unknown) {
  const d = digitsOnly(value);
  if (d.length !== 11) return String(value || '');
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(value: unknown) {
  const d = digitsOnly(value);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return String(value || '');
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
