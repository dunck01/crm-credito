import { catalogBank } from './bank-account';
import { digitsOnly } from './format';

export type ParsedPolicy = {
  name: string | null;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  uf: string | null;
  cep: string | null;
  policyNumber: string | null;
  insurer: string | null;
  insuranceType: string | null;
  insuranceValue: number | null;
  identifiedAt: string | null;
  policyStartAt: string | null;
  policyEndAt: string | null;
};

export type ParsedBankAccount = {
  bankName: string;
  bankCode: string | null;
  agency: string;
  account: string;
  accountDigit: string | null;
};

export type PolicyParseResult = {
  fields: ParsedPolicy;
  bankAccount: ParsedBankAccount | null;
  filled: (keyof ParsedPolicy)[];
  warning: string | null;
  pageCount: number;
};

export const POLICY_FIELD_LABELS: Record<keyof ParsedPolicy, string> = {
  name: 'Nome',
  cpf: 'CPF',
  phone: 'Telefone',
  email: 'E-mail',
  city: 'Cidade',
  uf: 'UF',
  cep: 'CEP',
  policyNumber: 'Apólice',
  insurer: 'Seguradora',
  insuranceType: 'Tipo',
  insuranceValue: 'Valor',
  identifiedAt: 'Identificado em',
  policyStartAt: 'Vigência início',
  policyEndAt: 'Vigência fim',
};

const COMPANY_CEP = new Set(['01310917', '06029900', '06472900', '01310900']);
const CALL_CENTER = /^(0800|4004|3003|0800701|7279966)/;
const NAME_NOISE =
  /BRADESCO|SEGURO|CERTIFICADO|PREVID[EÊ]NCIA|COMPANHIA|AP[OÓ]LICE|SUSEP|CORRETORA|ESTIPULANTE|COSSEGURO|P[AÁ]GINA|DADOS DO|LOGRADOURO|ENDERE[CÇ]O|CONSIGNADO|P[UÚ]BLICO|TELEFONE|NASCIMENTO/i;
const NAME_LINE_SKIP =
  /^(SEXO|FEMININO|MASCULINO|ESTADO CIVIL|SOLTEIRO|CASADO|VI[UÚ]VO|DIVORCIADO|UNI[AÃ]O EST[AÁ]VEL|CPF\/?CNPJ|DATA DE NASCIMENTO|TELEFONE|ENDERE[CÇ]O|BAIRRO|CIDADE|ESTADO|CEP|NOME DO SEGURADO|TIPO DE PESSOA|F[IÍ]SICA|JUR[IÍ]DICA|ESTIPULANTE|CREDOR|UF TELEFONE|DDD|COMPLEMENTO|N[UÚ]MERO)\b/i;
const FIELD_LABEL_NAME =
  /^(Data|Uf|Tipo|Cpf|Ddd|Cep|Sexo|Telefone|Nascimento|Nome)\b/i;

type PolicyModel =
  | 'bb-certificado'
  | 'bradesco-certificado'
  | 'bradesco-vida'
  | 'bradesco-residencial'
  | 'generic';

function detectPolicyModel(text: string): PolicyModel {
  // Layouts de referência (pasta local Modelo_Apolices/, fora do git):
  // APO_BB.pdf · Apolice_residencial.pdf · Apolice_vida.pdf ·
  // certificado-39.pdf / Apolice_Prestamista.pdf
  if (
    /CERTIFICADO INDIVIDUAL DE CONTRATA[CÇ][AÃ]O/i.test(text) ||
    (/DADOS DO SEGURADO/i.test(text) && /BRASILSEG|BANCO DO BRASIL S\.A/i.test(text))
  ) {
    return 'bb-certificado';
  }
  if (/RESIDENCIAL/i.test(text) && /Bradesco/i.test(text)) return 'bradesco-residencial';
  if (/VIDA INTEIRA/i.test(text) && /BRADESCO VIDA/i.test(text)) return 'bradesco-vida';
  if (/Certificado de Seguro/i.test(text) && /Bradesco Vida e Previd/i.test(text)) {
    return 'bradesco-certificado';
  }
  return 'generic';
}
const ADDRESS_PREFIX =
  /^(RUA|R\.|AVENIDA|AV\.?|ALAMEDA|AL\.|TRAVESSA|TV\.|PRA[CÇ]A|P[CÇ]\.?|RODOVIA|ROD\.|ESTRADA|EST\.|LARGO|VIELA|BECO|S[IÍ]TIO|FAZENDA|CONDOM[IÍ]NIO|COND\.|BLOCO|QUADRA|QD\.|LOTE|LT\.|LOGRADOURO|ENDERE[CÇ]O|COMPLEMENTO|BAIRRO|DISTRITO|SETOR|CH[AÁ]CARA|N[UÚ]MERO)\b/i;
const DATE_BR = '(\\d{2}[/.-]\\d{2}[/.-]\\d{4})';

export function isValidCpf(value: unknown) {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const nums = cpf.split('').map(Number);
  const digit = (base: number) => {
    const sum = nums.slice(0, base).reduce((acc, n, i) => acc + n * (base + 1 - i), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return digit(9) === nums[9] && digit(10) === nums[10];
}

export function isValidCnpj(value: unknown) {
  const cnpj = digitsOnly(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const nums = cnpj.split('').map(Number);
  const calc = (len: number) => {
    const weights =
      len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = nums.slice(0, len).reduce((acc, n, i) => acc + n * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return calc(12) === nums[12] && calc(13) === nums[13];
}

function normalizePdfText(raw: string) {
  return raw
    .replace(/\r/g, '\n')
    .replace(/(\d{2})[.-](\d{2})[.-](\d{4})/g, '$1/$2/$3')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function isAddressLikeName(value: string) {
  const cleaned = value.replace(/\s{2,}/g, ' ').trim();
  if (!cleaned) return true;
  if (ADDRESS_PREFIX.test(cleaned)) return true;
  if (/,?\s*\d{1,6}\b/.test(cleaned) && ADDRESS_PREFIX.test(cleaned.split(/\s+/)[0] || '')) return true;
  return false;
}

function acceptPersonName(raw: string | null | undefined) {
  if (!raw) return null;
  if (isAddressLikeName(raw)) return null;
  const named = titleCaseName(raw);
  if (!named || isAddressLikeName(named) || FIELD_LABEL_NAME.test(named)) return null;
  return named;
}

function prettyWords(raw: string, minParts = 1) {
  const cleaned = raw
    .replace(/\s{2,}/g, ' ')
    .replace(/[^A-Za-zÀ-ÿ'\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length < minParts || cleaned.length < 3 || cleaned.length > 80) return null;
  if (NAME_NOISE.test(cleaned)) return null;
  const small = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  return parts
    .map((p, i) => {
      const lower = p.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function titleCaseName(raw: string) {
  return prettyWords(raw, 2);
}

function parseMoneyToken(raw: string) {
  const cleaned = raw.replace(/\*/g, '').replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned.replace(/\./g, '').replace(',', '.'));
  if (Number.isNaN(n) || n <= 0 || n >= 100000000) return null;
  return n;
}

function findPersonCpf(text: string) {
  const hits = Array.from(text.matchAll(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g));
  const people: { digits: string; index: number }[] = [];
  for (const match of hits) {
    if (match.index == null || !isValidCpf(match[1])) continue;
    const around = text.slice(Math.max(0, match.index - 8), match.index + match[1].length + 8);
    if (/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(around)) continue;
    people.push({ digits: digitsOnly(match[1]), index: match.index });
  }
  if (!people.length) return null;
  const afterLabel = people.find((p) => /CPF\/CNPJ|CPF\b/i.test(text.slice(Math.max(0, p.index - 40), p.index + 40)));
  return (afterLabel || people[0]).digits;
}

function insuredBlock(text: string) {
  const start = text.search(/DADOS DO SEGURADO/i);
  if (start < 0) return '';
  const rest = text.slice(start);
  const end = rest.search(/\nDADOS DO ESTIPULANTE|\nDADOS DO BENEF/i);
  return (end > 0 ? rest.slice(0, end) : rest.slice(0, 1400)).trim();
}

function toIsoDate(hit: string) {
  const normalized = hit.replace(/[.-]/g, '/');
  const [dd, mm, yyyy] = normalized.split('/');
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function findNameNearCpf(text: string, cpf: string | null) {
  if (!cpf) return null;
  const masked = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  let at = text.indexOf(masked);
  if (at < 0) {
    const loose = text.search(new RegExp(cpf.split('').join('[.\\-\\s]?')));
    at = loose;
  }
  if (at < 0) return null;

  const beside = text
    .slice(Math.max(0, at - 90), at)
    .match(/([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{6,80})\s*$/);
  const fromBeside = acceptPersonName(beside?.[1]);
  if (fromBeside) return fromBeside;

  const lines = text
    .slice(Math.max(0, at - 400), at)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (NAME_LINE_SKIP.test(line)) continue;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(line)) continue;
    if (digitsOnly(line).length >= 10) continue;
    const person = acceptPersonName(line);
    if (person) return person;
  }
  return null;
}

function findBbSeguradoName(text: string) {
  const block = insuredBlock(text) || text;
  const named = block.match(
    /Nome:\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{8,80}?)(?:\s+Tipo de pessoa)/i
  );
  return acceptPersonName(named?.[1]);
}

function findName(text: string, cpf: string | null, model: PolicyModel) {
  if (model === 'bb-certificado') {
    const fromBb = findBbSeguradoName(text);
    if (fromBb) return fromBb;
  }

  if (model === 'bradesco-residencial') {
    const prezado = acceptPersonName(
      text.match(/Prezado\(a\)\s+([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{8,80}?)\s*,/i)?.[1]
    );
    if (prezado) return prezado;
    const stacked = acceptPersonName(
      text.match(/Dados do Segurado\s*\n\s*Nome\s*\n\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{8,80})/i)?.[1]
    );
    if (stacked) return stacked;
  }

  if (model === 'bradesco-vida') {
    const caro = acceptPersonName(
      text.match(/Caro\s*\(?\s*a\s*\)?\s+([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{8,80})/i)?.[1]
    );
    if (caro) return caro;
  }

  if (model === 'bradesco-certificado') {
    const near = findNameNearCpf(text, cpf);
    if (near) return near;
  }

  const fromBb = findBbSeguradoName(text);
  if (fromBb) return fromBb;

  const fromCpf = findNameNearCpf(text, cpf);
  if (fromCpf) return fromCpf;

  const block = insuredBlock(text);
  const named = block.match(
    /Nome(?:\s+completo)?(?:\s+do\s+segurado)?:\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{8,80}?)(?:\s+(?:Tipo de pessoa|Data de|CPF|Sexo|Nascimento|Endere[cç]o|Logradouro))/i
  );
  const fromBlock = acceptPersonName(named?.[1]);
  if (fromBlock) return fromBlock;

  const seguradoNome = text.match(
    /(?<!logradouro\s)(?<!rua\s)Nome(?:\s+completo|\s+do\s+segurado)?:\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{8,80}?)(?:\n|$)/i
  );
  const fromLabeled = acceptPersonName(seguradoNome?.[1]);
  if (fromLabeled) return fromLabeled;

  const caro = text.match(/Caro\s*\(?\s*a\s*\)?\s+([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{8,80})/i);
  const fromCaro = acceptPersonName(caro?.[1]);
  if (fromCaro) return fromCaro;

  const dados = text.match(/Dados do Segurado[\s\S]{0,240}?Nome\s*\n\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{8,80})/i);
  const fromDados = acceptPersonName(dados?.[1]);
  if (fromDados) return fromDados;

  const afterSegurado = text.match(
    /Nome do Segurado(?:\s+Telefone)?(?:\s+CPF\/?CNPJ)?\s*\n+\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{6,80})/i
  );
  const fromAfterLabel = acceptPersonName(afterSegurado?.[1]);
  if (fromAfterLabel) return fromAfterLabel;

  const lines = text.split('\n').slice(0, 90);
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!/^[A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{6,80}$/.test(trimmed)) continue;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 2) continue;
    const prev = (lines[i - 1] || '').trim();
    if (/^(Cidade|Bairro|Endere[cç]o|Estipulante|Credor)$/i.test(prev)) continue;
    const person = acceptPersonName(trimmed);
    if (person) return person;
  }
  return null;
}

function findPolicyNumber(text: string, model: PolicyModel) {
  if (model === 'bradesco-certificado') {
    const sucursalApolice = text.match(/Ap[oó]liceSucursal\s*\n\s*\d+\s+(\d{5,12})/i);
    if (sucursalApolice) return sucursalApolice[1];
  }

  const bbApolice = text.match(/N[ºo°]?\s*Ap[oó]lice:\s*(\d{4,12})/i);
  if (bbApolice) return bbApolice[1];

  const dashed = text.match(/\b(\d{3}-\d{6,7}-\d{4,6})\b/);
  if (dashed) return dashed[1];

  const cover = text.match(/Ap[oó]lice(?:\s+de\s+Seguro)?[:\s]+(\d{6,12})/i);
  if (cover) return cover[1];

  const labeledBlock = text.match(/Dados da Ap[oó]lice[\s\S]{0,80}?Ap[oó]lice[^\n]*\n\s*(\d{5,12})/i);
  if (labeledBlock) return labeledBlock[1];

  const afterHeaders = text.match(
    /Proposta\s+Sucursal\s+Ap[oó]lice[\s\S]{0,220}?(\d{6,12})\s+N\/A\s+\d{5}\.\d+/i
  );
  if (afterHeaders) return afterHeaders[1];

  const certificado = text.match(/\bCertificado\s*\n\s*(\d{6,12})\b/i);
  if (certificado) return certificado[1];

  const sucursalApolice = text.match(/Ap[oó]liceSucursal\s*\n\s*\d+\s+(\d{5,12})/i);
  if (sucursalApolice) return sucursalApolice[1];

  return null;
}

function isLikelyPhone(digits: string) {
  const d = digits.startsWith('0') ? digits.slice(1) : digits;
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = d.slice(0, 2);
  if (ddd[0] === '0') return false;
  if ((d.match(/0/g) || []).length >= 6) return false;
  if (CALL_CENTER.test(d) || CALL_CENTER.test(d.slice(2))) return false;
  return true;
}

function findPhone(text: string) {
  const block = insuredBlock(text);
  const bbPhone = block.match(/Telefone:\s*(\d{2})[-\s]?(\d{8,9})/i);
  if (bbPhone) {
    const combined = `${bbPhone[1]}${bbPhone[2]}`;
    if (isLikelyPhone(combined)) return combined;
  }

  const ddd = text.match(/\bDDD\s*\n\s*0?(\d{2})\b/i)?.[1];
  const afterUf = text.match(/UF Telefone\s*\n\s*[A-Z]{2}\s+(\d{8,11})/i)?.[1];
  if (ddd && afterUf) {
    const combined = digitsOnly(`${ddd}${afterUf}`);
    if (isLikelyPhone(combined)) return combined.startsWith('0') ? combined.slice(1) : combined;
  }

  const candidates = [
    ...(text.match(/\(?0?\d{2}\)?\s*9\d{4}[\s-]?\d{4}/g) || []),
    ...(text.match(/\(0?\d{2}\)\s*\d{4}[\s-]?\d{4}/g) || []),
  ];
  for (const hit of candidates) {
    const national = digitsOnly(hit).replace(/^0/, '');
    if (isLikelyPhone(national)) return national;
  }
  return null;
}

function findEmail(text: string) {
  const block = insuredBlock(text);
  const fromBlock = block.match(/E-?mail:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (fromBlock) return fromBlock[1].toLowerCase();

  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!match) return null;
  if (/bradesco|susep|segur|brasilseg/i.test(match[0])) return null;
  return match[0].toLowerCase();
}

function findCep(text: string) {
  const block = insuredBlock(text);
  const bbCep = block.match(/\bCEP:\s*(\d{5}-?\d{3})\b/i);
  if (bbCep) return digitsOnly(bbCep[1]);

  const certificado = new Set(
    Array.from(text.matchAll(/\bCertificado\s*\n\s*(\d{5,12})\b/gi)).map((m) => digitsOnly(m[1]))
  );
  const hits = Array.from(text.matchAll(/\b(\d{5}-\d{3})(?=[A-Z]{2}\b|\b)/g));
  const dadosIdx = text.search(/Dados do Segurado/i);
  const scored = hits
    .map((m) => {
      const digits = digitsOnly(m[1]);
      if (digits.length !== 8 || COMPANY_CEP.has(digits) || certificado.has(digits)) return null;
      const index = m.index || 0;
      const nearInsured = dadosIdx >= 0 && index > dadosIdx && index < dadosIdx + 800;
      return { digits, index, nearInsured };
    })
    .filter(Boolean) as { digits: string; index: number; nearInsured: boolean }[];
  return (scored.find((s) => s.nearInsured) || scored[0])?.digits || null;
}

function findCityUf(text: string) {
  const prettyCity = (raw: string) => prettyWords(raw, 1);
  const block = insuredBlock(text);
  const bbCity = block.match(/Cidade:\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{3,40})/i);
  const bbUf = block.match(/\bUF:\s*([A-Z]{2})\b/i);
  if (bbCity && bbUf) {
    return { city: prettyCity(bbCity[1]), uf: bbUf[1].toUpperCase() };
  }

  const dados = text.match(
    /Dados do Segurado[\s\S]{0,900}?Cidade\s*\n\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{3,40})\s*\n\s*UF[^\n]*\n\s*([A-Z]{2})/i
  );
  if (dados) {
    return { city: prettyCity(dados[1]), uf: dados[2] };
  }

  const stacked = text.match(/\bCidade\s*\n\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ ]{3,40})\b/i);
  const ufLine =
    text.match(/CEPEstado\s*\n\s*([A-Z]{2})\b/i) ||
    text.match(/\bEstado\s*\n\s*([A-Z]{2})\b/i) ||
    text.match(/\bUF\s*\n\s*([A-Z]{2})\b/i);
  const mashed = text.match(/\b(\d{5}-\d{3})([A-Z]{2})\b/);
  const cityLine = text.match(/\n([A-ZÁÉÍÓÚÃÕÂÊÔÇ]{4,30})\nSegurado CPF/i);

  let city = stacked ? stacked[1].trim() : cityLine ? cityLine[1].trim() : null;
  if (city && NAME_NOISE.test(city)) city = null;
  const uf = (ufLine?.[1] || mashed?.[2] || null)?.toUpperCase() || null;
  return { city: city ? prettyCity(city) : null, uf: uf && /^[A-Z]{2}$/.test(uf) ? uf : null };
}

function findInsurer(text: string) {
  if (/BRASILSEG|BB SEGUROS|BANCO DO BRASIL S\.A/i.test(text)) return 'Banco do Brasil';
  if (/BRADESCO AUTO\/RE|AUTO\/RE COMPANHIA/i.test(text)) return 'Bradesco Seguros';
  if (/Bradesco Vida e Previd[eê]ncia/i.test(text)) return 'Bradesco Vida e Previdência';
  if (/Bradesco Seguros/i.test(text)) return 'Bradesco Seguros';
  const labeled = text.match(/Seguradora\s*\n\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ0-9 /]{8,80})/i);
  if (labeled) {
    const value = labeled[1].replace(/\s{2,}/g, ' ').trim();
    if (value.length >= 8) return titleCaseName(value) || value;
  }
  return null;
}

function findType(text: string) {
  if (/prestamista|cr[eé]dito protegido|cr[eé]dito pessoal|credito pessoal|consignado/i.test(text)) {
    return 'Prestamista';
  }
  if (/residencial|compreensivo residencial/i.test(text)) return 'Residencial';
  if (/vida inteira|seguro vida/i.test(text)) return 'Vida';
  if (/\bVIDA\b/.test(text) && /BRADESCO VIDA/i.test(text)) return 'Vida';
  return null;
}

function findValue(text: string) {
  const bbBruto = text.match(/Pr[eê]mio Bruto\s*Total:\s*R\$\s*([\d.]+,\d{2})/i);
  if (bbBruto) return parseMoneyToken(bbBruto[1]);

  const demonstrativo = text.match(/TOTAL:\s*([\d.]+,\d{2})/i);
  if (demonstrativo) return parseMoneyToken(demonstrativo[1]);

  const amounts = Array.from(text.matchAll(/R\$\s*[*]*([\d.]+,\d{2})/g))
    .map((m) => parseMoneyToken(m[1]))
    .filter((n): n is number => n != null);
  for (let i = 0; i + 2 < amounts.length; i += 1) {
    const [liquido, iof, total] = amounts.slice(i, i + 3);
    if (Math.abs(liquido + iof - total) < 0.05 && total > 1) return total;
  }

  const premioTotal = text.match(/Pr[eê]mio Total\s*\n\s*R\$\s*[*]*([\d.]+,\d{2})/i);
  if (premioTotal) return parseMoneyToken(premioTotal[1]);

  const capital = text.match(/Cap(?:ital)?\.?\s*Segurado[^\n]{0,40}?R\$\s*[*]*([\d.]+,\d{2})/i);
  if (capital) return parseMoneyToken(capital[1]);

  return null;
}

function splitAccount(raw: string) {
  const cleaned = raw.replace(/\s/g, '');
  if (/^\d+-\d$/.test(cleaned)) {
    const [account, accountDigit] = cleaned.split('-');
    return { account, accountDigit };
  }
  return { account: cleaned, accountDigit: null as string | null };
}

function findBankAccount(text: string): ParsedBankAccount | null {
  const bankLine =
    text.match(/\bBanco:\s*(\d{3})\s*[-–]?\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ0-9 ]{3,40})/i) ||
    text.match(/\bBanco:\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ0-9 ]{3,40})/i);
  const agencyLine =
    text.match(/Ag[eê]ncia(?:\s+n[ºo°]?)?:\s*(\d{3,6}-?\d?)/i) ||
    text.match(/\bAg(?:\.)?:\s*(\d{3,6}-?\d?)/i);
  const accountLine =
    text.match(/Conta(?:\s+corrente)?(?:\s+n[ºo°]?)?:\s*(\d{4,12}-?\d)/i) ||
    text.match(/\bC\/C:\s*(\d{4,12}-?\d)/i);

  if (!agencyLine || !accountLine) return null;

  const { account, accountDigit } = splitAccount(accountLine[1]);
  const codeFromLine = bankLine?.[1] && /^\d{3}$/.test(bankLine[1]) ? bankLine[1] : null;
  const nameFromLine = bankLine?.[2] || (!codeFromLine ? bankLine?.[1] : null) || null;
  const catalog = catalogBank(codeFromLine || '') || catalogBank(nameFromLine || '');

  return {
    bankName: catalog?.title || (nameFromLine ? nameFromLine.replace(/\s{2,}/g, ' ').trim() : ''),
    bankCode: catalog?.code || codeFromLine,
    agency: agencyLine[1],
    account,
    accountDigit,
  };
}

function vigenciaPair(text: string, re: RegExp) {
  const match = text.match(re);
  if (!match) return null;
  const start = toIsoDate(match[1]);
  const end = toIsoDate(match[2]);
  if (start && end && end >= start) return { start, end };
  return null;
}

function findVigenciaRange(text: string, model: PolicyModel) {
  if (model === 'bb-certificado') {
    const individual = vigenciaPair(
      text,
      new RegExp(`In[ií]cio e T[ée]rmino individual[\\s\\S]{0,80}?${DATE_BR}[\\s\\S]{0,80}?${DATE_BR}`, 'i')
    );
    if (individual) return individual;
  }

  if (model === 'bradesco-certificado') {
    const stacked = vigenciaPair(
      text,
      new RegExp(`In[ií]cio de Vig[eê]ncia\\s+T[ée]rmino de Vig[eê]ncia\\s+${DATE_BR}\\s+${DATE_BR}`, 'i')
    );
    if (stacked) return stacked;
  }

  if (model === 'bradesco-residencial') {
    const clock = vigenciaPair(
      text,
      new RegExp(
        `das?\\s+24(?::00|hs?|h(?:oras)?)[\\s\\S]{0,40}?${DATE_BR}[\\s\\S]{0,80}?(?:às|as|at[eé])[\\s\\S]{0,40}?${DATE_BR}`,
        'i'
      )
    );
    if (clock) return clock;
  }

  if (model === 'bradesco-vida' && /VITALICIA/i.test(text)) {
    const startNearVitalicia = text.match(new RegExp(`${DATE_BR}[\\s\\S]{0,120}?VITALICIA`, 'i'));
    const start = startNearVitalicia?.[1] ? toIsoDate(startNearVitalicia[1]) : null;
    return { start, end: null as string | null };
  }

  const pairPatterns = [
    new RegExp(`In[ií]cio e T[ée]rmino(?:\\s+individual)?[\\s\\S]{0,120}?${DATE_BR}[\\s\\S]{0,80}?${DATE_BR}`, 'i'),
    new RegExp(
      `In[ií]cio de Vig[eê]ncia\\s+(?:Fim|T[ée]rmino) de Vig[eê]ncia\\s+${DATE_BR}\\s+${DATE_BR}`,
      'i'
    ),
    new RegExp(
      `das?\\s+24(?::00|hs?|h(?:oras)?)[\\s\\S]{0,40}?${DATE_BR}[\\s\\S]{0,80}?(?:às|as|at[eé])[\\s\\S]{0,40}?${DATE_BR}`,
      'i'
    ),
    new RegExp(
      `vig[eê]ncia(?:\\s+do\\s+seguro)?[\\s\\S]{0,60}?${DATE_BR}\\s*(?:a|at[eé]|-|/|at[eé]\\s+as)\\s*${DATE_BR}`,
      'i'
    ),
    new RegExp(`per[ií]odo\\s+de\\s+vig[eê]ncia[\\s\\S]{0,50}?${DATE_BR}[\\s\\S]{0,50}?${DATE_BR}`, 'i'),
    new RegExp(`\\bde\\s+${DATE_BR}\\s+at[eé]\\s+${DATE_BR}`, 'i'),
  ];

  for (const re of pairPatterns) {
    const pair = vigenciaPair(text, re);
    if (pair) return pair;
  }

  const startMatch =
    text.match(new RegExp(`In[ií]cio(?:\\s+de)?\\s+Vig[eê]ncia[\\s\\S]{0,160}?${DATE_BR}`, 'i')) ||
    text.match(new RegExp(`das 24:00 horas do dia ${DATE_BR}`, 'i'));
  const endMatch =
    text.match(
      new RegExp(`(?:Fim|T[ée]rmino|Encerramento)(?:\\s+da?)?\\s+Vig[eê]ncia[\\s\\S]{0,160}?${DATE_BR}`, 'i')
    ) ||
    text.match(new RegExp(`T[ée]rmino(?:\\s+individual)?[\\s\\S]{0,100}?${DATE_BR}`, 'i')) ||
    text.match(new RegExp(`(?:validade|vencimento|v[aá]lido)\\s*at[eé][\\s\\S]{0,40}?${DATE_BR}`, 'i'));

  let start = startMatch?.[1] ? toIsoDate(startMatch[1]) : null;
  let end = endMatch?.[1] ? toIsoDate(endMatch[1]) : null;

  if (start && end && end < start) {
    end = null;
  }

  if (start && (!end || end === start)) {
    const windowText = text.match(/vig[eê]ncia[\s\S]{0,280}/i)?.[0] || startMatch?.[0] || '';
    const dates = Array.from(windowText.matchAll(new RegExp(DATE_BR, 'g')))
      .map((item) => toIsoDate(item[1]))
      .filter((item): item is string => Boolean(item));
    const later = dates.find((item) => item > start);
    if (later) end = later;
    else if (end === start) end = null;
  }

  return { start, end };
}

export function parsePolicyText(raw: string, pageCount = 1): PolicyParseResult {
  const text = normalizePdfText(raw);
  const empty: ParsedPolicy = {
    name: null,
    cpf: null,
    phone: null,
    email: null,
    city: null,
    uf: null,
    cep: null,
    policyNumber: null,
    insurer: null,
    insuranceType: null,
    insuranceValue: null,
    identifiedAt: null,
    policyStartAt: null,
    policyEndAt: null,
  };

  if (text.replace(/\s/g, '').length < 40) {
    return {
      fields: empty,
      bankAccount: null,
      filled: [],
      warning:
        'Este PDF não tem texto selecionável (parece scan ou foto). Use o arquivo gerado pelo banco ou pela seguradora (PDF original, não foto).',
      pageCount,
    };
  }

  const model = detectPolicyModel(text);
  const cpf = findPersonCpf(text);
  const { city, uf } = findCityUf(text);
  const vigencia = findVigenciaRange(text, model);
  const fields: ParsedPolicy = {
    name: findName(text, cpf, model),
    cpf,
    phone: findPhone(text),
    email: findEmail(text),
    city,
    uf,
    cep: findCep(text),
    policyNumber: findPolicyNumber(text, model),
    insurer: findInsurer(text),
    insuranceType: findType(text),
    insuranceValue: findValue(text),
    identifiedAt: null,
    policyStartAt: vigencia.start,
    policyEndAt: vigencia.end,
  };

  const filled = (Object.keys(fields) as (keyof ParsedPolicy)[]).filter(
    (key) => fields[key] !== null && fields[key] !== ''
  );

  return {
    fields,
    bankAccount: findBankAccount(text),
    filled,
    warning: filled.length
      ? null
      : 'Não reconhecemos campos neste PDF. Confira se é uma apólice com texto selecionável (Bradesco, Banco do Brasil e similares).',
    pageCount,
  };
}
