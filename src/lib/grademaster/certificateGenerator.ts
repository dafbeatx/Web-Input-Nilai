import jsPDF from 'jspdf';
import { CertificateTemplate } from '@/app/api/grademaster/certificates/route';

export interface StudentCertificateInfo {
  studentName: string;
  className: string;
  academicYear?: string;
  nisn?: string;
}

let cachedBgDataUrl: string | null = null;

async function getCertificateBackgroundImage(): Promise<string | null> {
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

export function formatCertificateStudentName(fullName: string, _maxLength: number = 22): string {
  const fitted = getFittedCertificateStudentName(undefined, fullName, 98);
  return fitted.displayName;
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
  const bgImage = await getCertificateBackgroundImage();

  for (let i = 0; i < students.length; i++) {
    if (i > 0) {
      doc.addPage('a4', 'landscape');
    }

    const student = students[i];
    if (bgImage) {
      doc.addImage(bgImage, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      
      const fitted = getFittedCertificateStudentName(doc, student.studentName || '', 98);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fitted.fontSize);
      doc.setTextColor(15, 23, 42); // Deep navy charcoal #0f172a

      // Baseline sits right above the horizontal line (line Y = 112.28mm, text baseline = 111.0mm)
      // Strictly 1 single line, never wraps, never exceeds line length (max 98mm from X=26mm)
      doc.text(fitted.displayName, 26, 111.0);
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

  // 1. Check for custom Canva template from public/sertifikat-ldks.png
  const bgImage = await getCertificateBackgroundImage();

  if (bgImage) {
    // Draw Canva background template full-bleed across A4 Landscape
    doc.addImage(bgImage, 'PNG', 0, 0, pageWidth, pageHeight);

    // Calculate smart dynamic font size and guarantee 1 single line without exceeding the underline
    const fitted = getFittedCertificateStudentName(doc, student.studentName || '', 98);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fitted.fontSize);
    doc.setTextColor(15, 23, 42); // Deep slate-900 / dark charcoal

    // Precise placement: X = 26mm, Y = 111.0mm (baseline sits right above line at 112.28mm)
    // Guaranteed single line, no wrap, no exceeding the line
    doc.text(fitted.displayName, 26, 111.0);

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
  doc.text(student.studentName.toUpperCase(), centerX, nameY, { align: 'center' });

  // Accent line below student name
  const nameWidth = Math.min(180, Math.max(80, doc.getTextWidth(student.studentName.toUpperCase()) + 10));
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
  doc.text('Dokumen Sertifikat Resmi Digital • Sistem Terpadu GradeMaster OS', centerX, pageHeight - 16, { align: 'center' });

  return doc;
}
