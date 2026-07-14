import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
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
    } else if (filename.endsWith('.xml')) {
      const text = buffer.toString('utf-8');
      const parser = new XMLParser();
      const jsonObj = parser.parse(text);
      rawText = extractTextFromObj(jsonObj);
    } else if (filename.endsWith('.txt') || filename.endsWith('.csv')) {
      rawText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Format file tidak didukung' }, { status: 400 });
    }

    // Split text into lines, clean up, and filter out empty or very short lines
    const lines = rawText
      .split(/\r?\n/)
      .map((line: string) => line.trim().replace(/^[\d\.\-\*]+\s*/, '')) // Remove leading numbers/bullets
      .filter(line => line.length > 2 && line.length < 50); // Valid name length heuristic

    // Remove duplicates keeping original order
    const students = Array.from(new Set(lines));

    return NextResponse.json({ students });
  } catch (err: any) {
    console.error('File parsing error:', err);
    return NextResponse.json({ error: err.message || 'Gagal membaca file' }, { status: 500 });
  }
}

function extractTextFromObj(obj: any): string {
  let text = '';
  if (typeof obj === 'string') {
    return obj + '\n';
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      text += extractTextFromObj(item);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      text += extractTextFromObj(obj[key]);
    }
  }
  return text;
}
