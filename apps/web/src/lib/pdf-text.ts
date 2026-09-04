import { extractText, getDocumentProxy } from 'unpdf';

const MAX_PAGES = 12;

export async function extractPdfText(buffer: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const extracted = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(extracted.text) ? extracted.text : [String(extracted.text || '')];
  const text = pages.slice(0, MAX_PAGES).join('\n');
  return { text, pageCount: extracted.totalPages || pages.length || 1 };
}
