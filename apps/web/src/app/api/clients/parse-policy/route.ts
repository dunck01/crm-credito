import { NextResponse } from 'next/server';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';
import { extractPdfText } from '@/lib/pdf-text';
import { parsePolicyText } from '@/lib/policy-parse';
import { requireTenantUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const user = await requireTenantUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Envie o PDF da apólice.' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Arquivo acima de 4 MB. Envie o PDF original (não uma foto).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    const looksPdf =
      buffer.subarray(0, 5).toString('utf8').startsWith('%PDF') ||
      mime === 'application/pdf' ||
      name.endsWith('.pdf');
    if (!looksPdf) {
      return NextResponse.json(
        {
          error:
            'Envie o PDF da apólice. Foto ou print não funcionam — no WhatsApp, compartilhe o arquivo (Documento), não a imagem.',
        },
        { status: 400 }
      );
    }
    if (!buffer.subarray(0, 5).toString('utf8').startsWith('%PDF')) {
      return NextResponse.json({ error: 'O arquivo não parece um PDF válido.' }, { status: 400 });
    }

    const { text, pageCount } = await extractPdfText(buffer);
    const parsed = parsePolicyText(text, pageCount);
    return NextResponse.json({
      ...parsed,
      filename: file.name || 'apolice.pdf',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Não foi possível ler o PDF da apólice.' },
      { status: 500 }
    );
  }
}
