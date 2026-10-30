import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { CertificateTemplate } from '@/app/api/grademaster/certificates/route';

export interface StudentCertificateInfo {
  studentName: string;
  className: string;
  academicYear?: string;
  nisn?: string;
}

export function extractStudentName(student: StudentCertificateInfo): string {
  const record = student as unknown as Record<string, unknown>;
  const candidate =
    (typeof record.studentName === 'string' && record.studentName) ||
    (typeof record.name === 'string' && record.name) ||
    (typeof record.displayName === 'string' && record.displayName) ||
    (typeof record.nama === 'string' && record.nama) ||
    '';
  return candidate.trim();
}

let cachedTemplateImg: HTMLImageElement | null = null;
let templateImgPromise: Promise<HTMLImageElement | null> | null = null;

export function getLoadedTemplateImage(): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (cachedTemplateImg && cachedTemplateImg.complete && cachedTemplateImg.naturalWidth > 0) {
    return Promise.resolve(cachedTemplateImg);
  }
  if (templateImgPromise) return templateImgPromise;

  templateImgPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedTemplateImg = img;
      resolve(img);
    };
    img.onerror = (e) => {
      console.warn('Failed to load /sertifikat-ldks.png:', e);
      templateImgPromise = null;
      resolve(null);
    };
    img.src = '/sertifikat-ldks.png';
    if (img.complete && img.naturalWidth > 0) {
      cachedTemplateImg = img;
      resolve(img);
    }
  });

  return templateImgPromise;
}

let cachedBgDataUrl: string | null = null;

export async function getCertificateBackgroundImage(): Promise<string | null> {
  if (cachedBgDataUrl) return cachedBgDataUrl;

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/sertifikat-ldks.png');
      if (res.ok) {
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        cachedBgDataUrl = dataUrl;
        return dataUrl;
      }
    } catch (e) {
      console.warn('Unable to load /sertifikat-ldks.png, fallback to vector template', e);
    }
  }
  return null;
}

function loadQrImage(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
    if (img.complete && img.naturalWidth > 0) {
      resolve(img);
    }
  });
}

export async function composeCertificateOnCanvas(
  canvas: HTMLCanvasElement,
  bgImg: HTMLImageElement,
  studentName: string,
  className: string = 'SMP',
  academicYear: string = '2026/2027'
): Promise<boolean> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // 1. Draw Canva background template (clears prior drawing)
  ctx.drawImage(bgImg, 0, 0, 2000, 1414);

  // 2. Resolve and fit student name
  const rawName = (studentName || '').trim();
  const fitted = getFittedCertificateStudentName(undefined, rawName, 98);
  const displayName = fitted.displayName || rawName.toUpperCase() || 'SISWA PESERTA LDKS';

  // Font size in pixels for 2000 x 1414 template:
  // In PDF, fitted.fontSize pt on 297mm width corresponds to ~45-48px on 2000px width
  const fontPx = Math.round((fitted.fontSize * 0.3528 / 297) * 2000);

  // 3. Draw student name cleanly above the Canva underline (line Y=756px, X: 170-857px)
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0f172a'; // Deep slate navy charcoal
  ctx.font = `bold ${fontPx}px "Inter", "Outfit", "Arial", sans-serif`;
  ctx.fillText(displayName, 171, 747);
  ctx.restore();

  // 4. Draw QR Code and subtitles
  try {
    const qrDataUrl = await getCertificateQrCodeDataUrl(displayName, className, academicYear);
    const qrImg = await loadQrImage(qrDataUrl);
    if (qrImg) {
      ctx.drawImage(qrImg, 1130, 1030, 170, 170);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      ctx.font = 'bold 14px "Inter", "Outfit", "Arial", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('SCAN VERIFIKASI DOKUMEN', 1215, 1225);

      ctx.font = 'normal 11px "Inter", "Outfit", "Arial", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('SMP Terpadu Al-Ittihadiyah', 1215, 1245);
      ctx.restore();
    }
  } catch (qrErr) {
    console.warn('Failed to embed QR code on certificate canvas:', qrErr);
  }

  return true;
}

export async function createComposedCertificateJpeg(
  studentName: string,
  className: string = 'SMP',
  academicYear: string = '2026/2027',
  quality: number = 0.94
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  if (document.fonts && typeof document.fonts.ready !== 'undefined') {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font loading error
    }
  }

  const bgImg = await getLoadedTemplateImage();
  if (!bgImg) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 2000;
  canvas.height = 1414;

  const ok = await composeCertificateOnCanvas(canvas, bgImg, studentName, className, academicYear);
  if (!ok) return null;

  return canvas.toDataURL('image/jpeg', quality);
}

export async function createComposedCertificatePng(
  studentName: string,
  className: string = 'SMP',
  academicYear: string = '2026/2027'
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  if (document.fonts && typeof document.fonts.ready !== 'undefined') {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font loading error
    }
  }

  const bgImg = await getLoadedTemplateImage();
  if (!bgImg) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 2000;
  canvas.height = 1414;

  const ok = await composeCertificateOnCanvas(canvas, bgImg, studentName, className, academicYear);
  if (!ok) return null;

  return canvas.toDataURL('image/png');
}

export interface FittedCertificateName {
  displayName: string;
  fontSize: number; // in pt
  widthMm: number; // in mm
  isAbbreviated: boolean;
}

let cachedMeasurementDoc: jsPDF | null = null;
function getMeasurementDoc(): jsPDF {
  if (!cachedMeasurementDoc) {
    cachedMeasurementDoc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
  }
  return cachedMeasurementDoc;
}

export function smartAbbreviateName(cleanName: string, targetMaxChars: number = 24): string {
  const parts = cleanName.split(' ');
  if (parts.length <= 1) return cleanName;

  const words = [...parts];

  // 1. Abbreviate honorific prefix Muhammad/etc to M.
  if (['MUHAMMAD', 'MOHAMMAD', 'MUHAMAD', 'MOHAMAD', 'MOCHAMMAD', 'MOCHAMAD'].includes(words[0])) {
    words[0] = 'M.';
    const candidate = words.join(' ');
    if (candidate.length <= targetMaxChars) return candidate;
  }

  // 2. Abbreviate middle words to initials
  if (words.length > 2) {
    for (let i = 1; i < words.length - 1; i++) {
      if (words[i].length > 1 && !words[i].endsWith('.')) {
        words[i] = words[i][0] + '.';
        const candidate = words.join(' ');
        if (candidate.length <= targetMaxChars) return candidate;
      }
    }
  }

  // 3. Abbreviate last word to initial if still exceeding target
  for (let i = words.length - 1; i >= 1; i--) {
    if (words[i].length > 1 && !words[i].endsWith('.')) {
      words[i] = words[i][0] + '.';
      const candidate = words.join(' ');
      if (candidate.length <= targetMaxChars) return candidate;
    }
  }

  return words.join(' ');
}

export function getFittedCertificateStudentName(
  doc?: jsPDF,
  fullName?: string,
  maxWidthMm: number = 98
): FittedCertificateName {
  const cleanName = (fullName || '')
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

  if (!cleanName) {
    return {
      displayName: '',
      fontSize: 19,
      widthMm: 0,
      isAbbreviated: false,
    };
  }

  const measurementDoc = doc || getMeasurementDoc();
  measurementDoc.setFont('helvetica', 'bold');

  // Dynamic starting font size:
  // Short names (<= 14 chars) get up to 20pt for bold visual impact.
  // Medium names start at 19.5pt.
  let targetFontSize = cleanName.length <= 14 ? 20 : 19.5;
  measurementDoc.setFontSize(targetFontSize);
  let currentWidth = measurementDoc.getTextWidth(cleanName);

  // 1. Smoothly scale down font size in 0.5pt steps down to 14.0pt
  while (currentWidth > maxWidthMm && targetFontSize > 14.0) {
    targetFontSize -= 0.5;
    measurementDoc.setFontSize(targetFontSize);
    currentWidth = measurementDoc.getTextWidth(cleanName);
  }

  // 2. If at 14.0pt it still exceeds maxWidthMm (or is extremely long >= 26 chars and touching the edge > 96mm),
  // intelligently abbreviate secondary names so it fits with dignified, bold typography (15pt-17.5pt)
  if (currentWidth > maxWidthMm || (currentWidth > 96 && cleanName.length >= 26)) {
    const abbreviated = smartAbbreviateName(cleanName, 24);
    let abbrevFontSize = 17.5;
    measurementDoc.setFontSize(abbrevFontSize);
    let abbrevWidth = measurementDoc.getTextWidth(abbreviated);

    while (abbrevWidth > maxWidthMm && abbrevFontSize > 13.0) {
      abbrevFontSize -= 0.5;
      measurementDoc.setFontSize(abbrevFontSize);
      abbrevWidth = measurementDoc.getTextWidth(abbreviated);
    }

    return {
      displayName: abbreviated,
      fontSize: abbrevFontSize,
      widthMm: abbrevWidth,
      isAbbreviated: abbreviated !== cleanName,
    };
  }

  return {
    displayName: cleanName,
    fontSize: targetFontSize,
    widthMm: currentWidth,
    isAbbreviated: false,
  };
}

export function formatCertificateStudentName(fullName: string, maxLength: number = 22): string {
  const fitted = getFittedCertificateStudentName(undefined, fullName, 98);
  if (fitted.displayName.length > maxLength) {
    return smartAbbreviateName(fitted.displayName, maxLength);
  }
  return fitted.displayName;
}

export async function getCertificateQrCodeDataUrl(
  studentName: string,
  className?: string,
  academicYear?: string
): Promise<string> {
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_SITE_URL || 'https://smpterpadualittihadiyah.sch.id');

  const params = new URLSearchParams({
    name: studentName,
    class: className || 'SMP',
    year: academicYear || '2026/2027',
  });

  const verifyUrl = `${origin}/sertifikat/verify?${params.toString()}`;

  return await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

export async function generateBatchLdksCertificatesPdf(
  template: CertificateTemplate,
  students: StudentCertificateInfo[],
  onProgress?: (current: number, total: number) => void
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // 1. High-fidelity composite canvas in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.fonts && typeof document.fonts.ready !== 'undefined') {
      try {
        await document.fonts.ready;
      } catch {
        // ignore font loading error
      }
    }

    const bgImg = await getLoadedTemplateImage();
    if (bgImg) {
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 1414;

      for (let i = 0; i < students.length; i++) {
        if (i > 0) {
          doc.addPage('a4', 'landscape');
        }

        const student = students[i];
        const studentName = extractStudentName(student);

        const className = student.className || template.target_class || 'SMP';
        const academicYear = student.academicYear || template.academic_year || '2026/2027';

        const success = await composeCertificateOnCanvas(canvas, bgImg, studentName, className, academicYear);
        if (success) {
          const jpegData = canvas.toDataURL('image/jpeg', 0.92);
          doc.addImage(jpegData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        }

        if (onProgress) {
          onProgress(i + 1, students.length);
        }
      }

      return doc;
    }
  }

  // Fallback for non-browser environment or when template image cannot be loaded
  const bgImage = await getCertificateBackgroundImage();

  for (let i = 0; i < students.length; i++) {
    if (i > 0) {
      doc.addPage('a4', 'landscape');
    }

    const student = students[i];
    const studentName = extractStudentName(student);

    const className = student.className || template.target_class || 'SMP';
    const academicYear = student.academicYear || template.academic_year || '2026/2027';

    if (bgImage) {
      doc.addImage(bgImage, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

      const fitted = getFittedCertificateStudentName(doc, studentName, 98);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fitted.fontSize);
      doc.setTextColor(15, 23, 42);
      doc.text(fitted.displayName, 26, 111.0);

      try {
        const qrDataUrl = await getCertificateQrCodeDataUrl(studentName, className, academicYear);
        doc.addImage(qrDataUrl, 'PNG', 168, 153, 24, 24, undefined, 'FAST');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        doc.text('SCAN VERIFIKASI DOKUMEN', 180, 180.5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text('SMP Terpadu Al-Ittihadiyah', 180, 183.5, { align: 'center' });
      } catch (qrErr) {
        console.warn('Failed to embed QR code in batch certificate PDF:', qrErr);
      }
    }

    if (onProgress) {
      onProgress(i + 1, students.length);
    }
  }

  return doc;
}

export async function generateLdksCertificatePdf(
  template: CertificateTemplate,
  student: StudentCertificateInfo
): Promise<jsPDF> {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const centerX = pageWidth / 2;

  // Safe student name and metadata resolution
  const resolvedStudentName = extractStudentName(student);

  const resolvedClass = student.className || template.target_class || 'SMP';
  const resolvedAcademicYear = student.academicYear || template.academic_year || '2026/2027';

  // 1. Primary: High-fidelity composite canvas JPEG
  // Bakes background template, student name, and QR code onto canvas pixels.
  // 100% immune to PDF font-clipping/layer issues and reduces file size by 96% (~320KB).
  const composedJpeg = await createComposedCertificateJpeg(
    resolvedStudentName,
    resolvedClass,
    resolvedAcademicYear,
    0.94
  );

  if (composedJpeg) {
    doc.addImage(composedJpeg, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    return doc;
  }

  // 2. Direct raster image overlay fallback
  const bgImage = await getCertificateBackgroundImage();

  if (bgImage) {
    doc.addImage(bgImage, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

    const fitted = getFittedCertificateStudentName(doc, resolvedStudentName, 98);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fitted.fontSize);
    doc.setTextColor(15, 23, 42);
    doc.text(fitted.displayName, 26, 111.0);

    try {
      const qrDataUrl = await getCertificateQrCodeDataUrl(
        resolvedStudentName,
        resolvedClass,
        resolvedAcademicYear
      );
      doc.addImage(qrDataUrl, 'PNG', 168, 153, 24, 24);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text('SCAN VERIFIKASI DOKUMEN', 180, 180.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text('SMP Terpadu Al-Ittihadiyah', 180, 183.5, { align: 'center' });
    } catch (qrErr) {
      console.warn('Failed to embed QR code in single certificate PDF:', qrErr);
    }

    return doc;
  }

  // --- Fallback Vector Template ---

  // 1. Background Parchment Color
  doc.setFillColor(252, 251, 247); // #FCFBF7
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Double Frame Borders
  // Outer Gold Border
  doc.setDrawColor(197, 168, 128); // #C5A880 Gold
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

  // Inner Deep Navy Border
  doc.setDrawColor(15, 23, 42); // #0F172A Deep Navy
  doc.setLineWidth(0.4);
  doc.rect(13.5, 13.5, pageWidth - 27, pageHeight - 27, 'S');

  // Corner Ornaments (Classic geometric corners)
  const cornerSize = 7;
  const drawCornerAccent = (x: number, y: number, xDir: number, yDir: number) => {
    doc.setFillColor(197, 168, 128);
    doc.triangle(
      x, y,
      x + xDir * cornerSize, y,
      x, y + yDir * cornerSize,
      'F'
    );
  };
  drawCornerAccent(13.5, 13.5, 1, 1);
  drawCornerAccent(pageWidth - 13.5, 13.5, -1, 1);
  drawCornerAccent(13.5, pageHeight - 13.5, 1, -1);
  drawCornerAccent(pageWidth - 13.5, pageHeight - 13.5, -1, -1);

  // 3. School & Unit Header
  const clsUpper = (student.className || '').toUpperCase();
  const schoolName = clsUpper.includes('SMA') || clsUpper.includes('10') || clsUpper.includes('11') || clsUpper.includes('12') || clsUpper.includes('X') || clsUpper.includes('XI') || clsUpper.includes('XII')
    ? 'SMA TERPADU AS SALAAM'
    : 'SMP TERPADU AL-ITTIHADIYAH';

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(schoolName.toUpperCase(), centerX, 26, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('PANITIA LATIHAN DASAR KEPEMIMPINAN SISWA (LDKS)', centerX, 31, { align: 'center' });

  if (template.cert_number_prefix) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Nomor: ${template.cert_number_prefix}`, centerX, 36.5, { align: 'center' });
  }

  // Divider Line below Header
  doc.setDrawColor(197, 168, 128);
  doc.setLineWidth(0.5);
  doc.line(centerX - 40, 39, centerX + 40, 39);

  // 4. Main Certificate Title
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42); // Deep Navy
  doc.text(template.title || 'SERTIFIKAT PENGHARGAAN', centerX, 51, { align: 'center' });

  // Subtitle
  if (template.subtitle) {
    doc.setFont('times', 'italic');
    doc.setFontSize(12.5);
    doc.setTextColor(161, 98, 7); // Warm Bronze / Amber-700
    doc.text(template.subtitle, centerX, 58, { align: 'center' });
  }

  // 5. Citation Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(template.citation || 'Diberikan dengan penuh hormat dan apresiasi kepada:', centerX, 68, { align: 'center' });

  // 6. Student Name
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // Deep Navy
  const nameY = 80;
  const printName = (resolvedStudentName || 'SISWA PESERTA LDKS').toUpperCase();
  doc.text(printName, centerX, nameY, { align: 'center' });

  // Accent line below student name
  const nameWidth = Math.min(180, Math.max(80, doc.getTextWidth(printName) + 10));
  doc.setDrawColor(197, 168, 128);
  doc.setLineWidth(0.4);
  doc.line(centerX - nameWidth / 2, nameY + 2.5, centerX + nameWidth / 2, nameY + 2.5);

  // 7. Class and Academic Year
  const yearText = student.academicYear || template.academic_year || '2026/2027';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85); // Slate-700
  doc.text(`Kelas ${student.className}   •   Tahun Ajaran ${yearText}`, centerX, 90, { align: 'center' });

  // 8. Description / Narration (Multi-line centered)
  const descriptionText = template.description || 'Atas partisipasi aktif, dedikasi, serta integritas tinggi dalam mengikuti dan menyelesaikan seluruh rangkaian kegiatan Latihan Dasar Kepemimpinan Siswa (LDKS) sebagai PESERTA.';
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85); // Slate-700

  const maxDescWidth = 205; // 205mm
  const descLines = doc.splitTextToSize(descriptionText, maxDescWidth);
  let currentDescY = 101;
  descLines.forEach((line: string) => {
    doc.text(line, centerX, currentDescY, { align: 'center' });
    currentDescY += 5.2;
  });

  // 9. Location and Date
  const dateStr = template.issue_date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const cityStr = template.city || 'Bogor';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const locationY = Math.max(126, currentDescY + 6);
  doc.text(`${cityStr}, ${dateStr}`, centerX, locationY, { align: 'center' });

  // 10. Signatures
  // Signer 1 (Left) - Panitia LDKS
  const signer1X = 68;
  const signer2X = 229;
  const signRoleY = locationY + 8;
  const signNameY = signRoleY + 28;

  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(template.signer1_role || 'Ketua Panitia LDKS,', signer1X, signRoleY, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(template.signer1_name || 'Ketua Panitia LDKS, S.Pd.', signer1X, signNameY, { align: 'center' });
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  const signer1Width = Math.max(50, doc.getTextWidth(template.signer1_name || 'Ketua Panitia LDKS, S.Pd.') + 4);
  doc.line(signer1X - signer1Width / 2, signNameY + 1.5, signer1X + signer1Width / 2, signNameY + 1.5);

  // Signer 2 (Right) - Kepala Sekolah
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(template.signer2_role || 'Kepala Sekolah,', signer2X, signRoleY, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(template.signer2_name || 'Farhan Sopian Sahid, S.Pd.I', signer2X, signNameY, { align: 'center' });
  const signer2Width = Math.max(50, doc.getTextWidth(template.signer2_name || 'Farhan Sopian Sahid, S.Pd.I') + 4);
  doc.line(signer2X - signer2Width / 2, signNameY + 1.5, signer2X + signer2Width / 2, signNameY + 1.5);

  // 11. Official Verification Seal (Center Bottom)
  const sealY = signRoleY + 14;
  doc.setDrawColor(197, 168, 128);
  doc.setLineWidth(0.6);
  doc.circle(centerX, sealY, 13, 'S');
  doc.setLineWidth(0.2);
  doc.circle(centerX, sealY, 11.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(161, 98, 7);
  doc.text('GRADE', centerX, sealY - 1.8, { align: 'center' });
  doc.text('MASTER', centerX, sealY + 2.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(148, 163, 184);
  doc.text('RESMI & TERVERIFIKASI', centerX, sealY + 6, { align: 'center' });

  // Footer tracking
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Dokumen Sertifikat Resmi Digital • Sistem Terpadu Nawasena', centerX, pageHeight - 16, { align: 'center' });

  return doc;
}
