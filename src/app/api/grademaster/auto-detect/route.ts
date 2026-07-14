import { NextRequest, NextResponse } from 'next/server';
import { extractEntities } from '@/lib/grademaster/matcher';
import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const studentListRaw = formData.get('studentList') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    const studentList = studentListRaw ? JSON.parse(studentListRaw) : [];
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name.toLowerCase();
    
    let rawText = '';

    if (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
        const result = await Tesseract.recognize(buffer, 'ind+eng');
        rawText = result.data.text;
    } else if (filename.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      rawText = data.text;
    } else if (filename.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (filename.endsWith('.txt') || filename.endsWith('.csv')) {
      rawText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Format file tidak didukung' }, { status: 400 });
    }

    const extracted = extractEntities(rawText, studentList);

    return NextResponse.json(extracted);

  } catch (err: any) {
    console.error('OCR/Parse error:', err);
    return NextResponse.json({ error: err.message || 'Gagal membaca file atau ekstrak data' }, { status: 500 });
  }
}
