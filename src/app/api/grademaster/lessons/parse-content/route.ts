import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name.toLowerCase();
    
    let rawText = '';

    if (filename.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      rawText = data.text;
    } else if (filename.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (filename.endsWith('.txt')) {
      rawText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Format file tidak didukung. Harap unggah berkas .pdf, .docx, atau .txt' }, { status: 400 });
    }

    // Clean up excessive whitespace, keeping basic formatting readable
    const cleanedText = rawText.replace(/\s+/g, ' ').trim();

    if (!cleanedText) {
      return NextResponse.json({ error: 'Dokumen kosong atau tidak ada teks yang dapat diekstrak.' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      text: cleanedText,
      filename: file.name,
      charCount: cleanedText.length
    });
  } catch (err: any) {
    console.error('File content parsing error:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengekstrak teks dari berkas.' }, { status: 500 });
  }
}
