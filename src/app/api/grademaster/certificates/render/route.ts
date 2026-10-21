import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { getFittedCertificateStudentName } from '@/lib/grademaster/certificateGenerator';

let cachedBoldFontBase64: string | null = null;
let cachedRegularFontBase64: string | null = null;

function getEmbeddedFonts(): { bold: string | null; regular: string | null } {
  if (!cachedBoldFontBase64) {
    const boldCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'LiberationSans-Bold.ttf'),
      path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts', 'LiberationSans-Bold.ttf'),
    ];
    for (const p of boldCandidates) {
      if (fs.existsSync(p)) {
        try {
          cachedBoldFontBase64 = fs.readFileSync(p).toString('base64');
          break;
        } catch (e) {
          console.warn('Failed to read bold font file:', p, e);
        }
      }
    }
  }

  if (!cachedRegularFontBase64) {
    const regularCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'LiberationSans-Regular.ttf'),
      path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts', 'LiberationSans-Regular.ttf'),
    ];
    for (const p of regularCandidates) {
      if (fs.existsSync(p)) {
        try {
          cachedRegularFontBase64 = fs.readFileSync(p).toString('base64');
          break;
        } catch (e) {
          console.warn('Failed to read regular font file:', p, e);
        }
      }
    }
  }

  return {
    bold: cachedBoldFontBase64,
    regular: cachedRegularFontBase64,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawName = searchParams.get('name') || 'Siswa Peserta LDKS';
    const className = searchParams.get('class') || 'SMP';
    const academicYear = searchParams.get('year') || '2026/2027';

    // Normalize quotes and sanitize
    const cleanRaw = rawName
      .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .trim();

    const fitted = getFittedCertificateStudentName(undefined, cleanRaw, 98);
    const displayName = fitted.displayName || cleanRaw.toUpperCase();

    // Verification URL for QR code
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const verifyUrl = `${protocol}://${host}/sertifikat/verify?name=${encodeURIComponent(cleanRaw)}&class=${encodeURIComponent(className)}&year=${encodeURIComponent(academicYear)}`;

    // Generate QR Buffer
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 170,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    // Font size in pixels for 2000 x 1414 template:
    // In PDF, 19pt font on 297mm width corresponds to ~45px on 2000px image width
    const fontPx = Math.round((fitted.fontSize * 0.3528 / 297) * 2000);

    // Escape XML characters in displayName
    const safeNameXml = displayName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const fonts = getEmbeddedFonts();

    const fontFaceDeclarations = `
      ${fonts.bold ? `
      @font-face {
        font-family: 'EmbeddedSansBold';
        src: url('data:font/truetype;charset=utf-8;base64,${fonts.bold}');
        font-weight: bold;
      }
      ` : ''}
      ${fonts.regular ? `
      @font-face {
        font-family: 'EmbeddedSans';
        src: url('data:font/truetype;charset=utf-8;base64,${fonts.regular}');
        font-weight: normal;
      }
      ` : ''}
    `;

    const svgOverlay = `
      <svg width="2000" height="1414" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            ${fontFaceDeclarations}
            .name {
              font-family: 'EmbeddedSansBold', 'Liberation Sans', 'DejaVu Sans', 'Arial', sans-serif;
              font-weight: bold;
              font-size: ${fontPx}px;
              fill: #0f172a;
              text-rendering: geometricPrecision;
            }
            .qr-title {
              font-family: 'EmbeddedSansBold', 'Liberation Sans', 'DejaVu Sans', 'Arial', sans-serif;
              font-weight: bold;
              font-size: 14px;
              fill: #0f172a;
              text-anchor: middle;
              letter-spacing: 0.5px;
            }
            .qr-sub {
              font-family: 'EmbeddedSans', 'Liberation Sans', 'DejaVu Sans', 'Arial', sans-serif;
              font-size: 11px;
              fill: #64748b;
              text-anchor: middle;
            }
          </style>
        </defs>
        <text x="175" y="747" class="name">${safeNameXml}</text>
        <text x="1215" y="1225" class="qr-title">SCAN VERIFIKASI DOKUMEN</text>
        <text x="1215" y="1245" class="qr-sub">SMP Terpadu Al-Ittihadiyah</text>
      </svg>
    `;

    const templatePath = path.join(process.cwd(), 'public', 'sertifikat-ldks.png');
    const imageBuffer = await sharp(templatePath)
      .composite([
        { input: Buffer.from(svgOverlay), top: 0, left: 0 },
        { input: qrBuffer, top: 1030, left: 1130 },
      ])
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    });
  } catch (err) {
    console.error('Failed to render certificate image:', err);
    return NextResponse.json({ error: 'Gagal membuat gambar sertifikat' }, { status: 500 });
  }
}
