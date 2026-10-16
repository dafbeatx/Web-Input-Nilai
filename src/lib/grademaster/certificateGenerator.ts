import jsPDF from 'jspdf';
import { CertificateTemplate } from '@/app/api/grademaster/certificates/route';

export interface StudentCertificateInfo {
  studentName: string;
  className: string;
  academicYear?: string;
  nisn?: string;
}

export function generateLdksCertificatePdf(
  template: CertificateTemplate,
  student: StudentCertificateInfo
): jsPDF {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const centerX = pageWidth / 2;

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
