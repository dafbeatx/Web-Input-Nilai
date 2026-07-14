import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { GradedStudent, AnalyticsResult } from './types';

export interface ExportData {
  sessionName: string;
  teacherName: string;
  subject: string;
  studentClass: string;
  schoolLevel: string;
  kkm: number;
  gradedStudents: GradedStudent[];
  analytics: AnalyticsResult;
  academicYear?: string;
  semester?: string;
  examType?: string;
}

/**
 * Export report to PDF format
 */
export function exportToPDF(data: ExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const {
    sessionName,
    teacherName,
    subject,
    studentClass,
    schoolLevel,
    kkm,
    gradedStudents,
    analytics,
    academicYear = '2025/2026',
    semester = 'Ganjil',
    examType = 'Ujian'
  } = data;

  const totalStudents = gradedStudents.length;
  const passCount = gradedStudents.filter(s => s.finalScore >= kkm).length;
  const remCount = totalStudents - passCount;
  const passPercent = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  // Header Title and Logo
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('GradeMaster OS', 14, 20);

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('Laporan Hasil Evaluasi Pembelajaran Resmi', 14, 25);

  // Line separator
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(14, 28, 196, 28);

  // Session Information Section
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('INFORMASI SESI', 14, 35);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate 600

  // Left Column Metadata
  doc.text('Nama Sesi', 14, 41);
  doc.text(`:  ${sessionName}`, 40, 41);
  doc.text('Mata Pelajaran', 14, 47);
  doc.text(`:  ${subject}`, 40, 47);
  doc.text('Guru Pengampu', 14, 53);
  doc.text(`:  ${teacherName}`, 40, 53);
  doc.text('Kelas', 14, 59);
  doc.text(`:  ${studentClass} (${schoolLevel})`, 40, 59);

  // Right Column Metadata
  doc.text('Kriteria Ketuntasan (KKM)', 115, 41);
  doc.text(`:  ${kkm}`, 155, 41);
  doc.text('Tahun Ajaran', 115, 47);
  doc.text(`:  ${academicYear}`, 155, 47);
  doc.text('Semester / Tipe', 115, 53);
  doc.text(`:  ${semester} / ${examType}`, 155, 53);
  doc.text('Tanggal Cetak', 115, 59);
  doc.text(`:  ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')} WIB`, 155, 59);

  // Statistics Summary Section
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('STATISTIK RINGKASAN KELAS', 14, 70);

  const statsHeaders = [['Rata-rata', 'Nilai Tertinggi', 'Nilai Terendah', 'Median', 'Deviasi Standar', 'Kelulusan']];
  const statsRows = [[
    analytics.avgScore.toFixed(2),
    analytics.highestScore.toString(),
    analytics.lowestScore.toString(),
    analytics.median.toFixed(2),
    analytics.standardDeviation.toFixed(2),
    `${passPercent}% (${passCount}/${totalStudents} Siswa)`
  ]];

  autoTable(doc, {
    startY: 73,
    head: statsHeaders,
    body: statsRows,
    theme: 'grid',
    styles: { font: 'Helvetica', fontSize: 9, cellPadding: 3, halign: 'center' },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 10;

  // Student list table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('DAFTAR NILAI SISWA', 14, nextY);

  const studentHeaders = [['No', 'Nama Siswa', 'Benar', 'Salah', 'Nilai PG', 'Nilai Essay', 'Nilai Akhir', 'CSI', 'LPS', 'Status']];
  const studentRows = gradedStudents.map((s, idx) => [
    idx + 1,
    s.name,
    s.correct,
    s.wrong,
    s.mcqScore.toFixed(1),
    s.essayScore.toFixed(1),
    s.finalScore,
    s.csi.toFixed(1),
    s.lps.toFixed(2),
    s.finalScore >= kkm ? 'TUNTAS' : 'REMEDIAL'
  ]);

  autoTable(doc, {
    startY: nextY + 3,
    head: studentHeaders,
    body: studentRows,
    theme: 'grid',
    styles: { font: 'Helvetica', fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 12 },
      8: { halign: 'center', cellWidth: 14 },
      9: { halign: 'center', cellWidth: 20, fontStyle: 'bold' }
    },
    didDrawCell: (dataCell) => {
      // Color code the status column (TUNTAS = Green, REMEDIAL = Red)
      if (dataCell.section === 'body' && dataCell.column.index === 9) {
        const text = dataCell.cell.text[0];
        if (text === 'TUNTAS') {
          doc.setTextColor(34, 197, 94); // Green 500
        } else if (text === 'REMEDIAL') {
          doc.setTextColor(239, 68, 68); // Red 500
        }
      }
    }
  });

  const finalPageCount = doc.getNumberOfPages();
  for (let i = 1; i <= finalPageCount; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    // Footer text
    doc.text(`Dicetak secara otomatis oleh GradeMaster OS pada ${new Date().toLocaleDateString('id-ID')} • Halaman ${i} dari ${finalPageCount}`, 14, 287);
  }

  const filename = `Laporan_Nilai_${studentClass.replace(/ /g, '_')}_${subject.replace(/ /g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Export report to Excel format
 */
export function exportToExcel(data: ExportData) {
  const {
    sessionName,
    teacherName,
    subject,
    studentClass,
    schoolLevel,
    kkm,
    gradedStudents,
    analytics,
    academicYear = '2025/2026',
    semester = 'Ganjil',
    examType = 'Ujian'
  } = data;

  const totalStudents = gradedStudents.length;
  const passCount = gradedStudents.filter(s => s.finalScore >= kkm).length;
  const remCount = totalStudents - passCount;
  const passPercent = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Informasi Sesi
  const infoRows = [
    ['DOKUMEN EVALUASI PEMBELAJARAN - GRADEMASTER OS'],
    [],
    ['INFORMASI UMUM'],
    ['Nama Sesi Ujian', sessionName],
    ['Mata Pelajaran', subject],
    ['Guru Pengampu', teacherName],
    ['Kelas', `${studentClass} (${schoolLevel})`],
    ['Kriteria Ketuntasan (KKM)', kkm],
    ['Tahun Ajaran', academicYear],
    ['Semester', semester],
    ['Tipe Ujian', examType],
    ['Waktu Ekspor', `${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`],
    [],
    ['RINGKASAN STATISTIK KELAS'],
    ['Rata-rata Nilai', parseFloat(analytics.avgScore.toFixed(2))],
    ['Median Nilai', parseFloat(analytics.median.toFixed(2))],
    ['Nilai Tertinggi', analytics.highestScore],
    ['Nilai Terendah', analytics.lowestScore],
    ['Standar Deviasi', parseFloat(analytics.standardDeviation.toFixed(2))],
    ['Jumlah Siswa Tuntas', passCount],
    ['Jumlah Siswa Remedial', remCount],
    ['Persentase Kelulusan Kelas', `${passPercent}%`]
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  // Auto col width for info sheet
  wsInfo['!cols'] = [{ wch: 30 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Informasi Sesi');

  // Sheet 2: Daftar Nilai Siswa
  const studentHeaders = [
    'No', 
    'Nama Siswa', 
    'Jumlah Jawaban PG Benar', 
    'Jumlah Jawaban PG Salah', 
    'Nilai Pilihan Ganda (PG)', 
    'Nilai Uraian (Essay)', 
    'Nilai Akhir', 
    'CSI (Consistency Score Index)', 
    'LPS (Learning Performance Score)', 
    'Status Kelulusan'
  ];
  
  const studentDataRows = gradedStudents.map((s, idx) => [
    idx + 1,
    s.name,
    s.correct,
    s.wrong,
    parseFloat(s.mcqScore.toFixed(1)),
    parseFloat(s.essayScore.toFixed(1)),
    s.finalScore,
    parseFloat(s.csi.toFixed(1)),
    parseFloat(s.lps.toFixed(2)),
    s.finalScore >= kkm ? 'TUNTAS' : 'REMEDIAL'
  ]);

  const wsStudents = XLSX.utils.aoa_to_sheet([studentHeaders, ...studentDataRows]);
  
  // Set Column Widths for Student Sheet
  wsStudents['!cols'] = [
    { wch: 5 },   // No
    { wch: 30 },  // Nama Siswa
    { wch: 25 },  // PG Benar
    { wch: 25 },  // PG Salah
    { wch: 22 },  // Nilai PG
    { wch: 20 },  // Nilai Essay
    { wch: 15 },  // Nilai Akhir
    { wch: 30 },  // CSI
    { wch: 30 },  // LPS
    { wch: 18 }   // Status
  ];
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Daftar Nilai');

  // Write Excel file
  const filename = `Laporan_Nilai_${studentClass.replace(/ /g, '_')}_${subject.replace(/ /g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export report to DOCX format (generates Word-compatible HTML format)
 */
export function exportToDOCX(data: ExportData) {
  const {
    sessionName,
    teacherName,
    subject,
    studentClass,
    schoolLevel,
    kkm,
    gradedStudents,
    analytics,
    academicYear = '2025/2026',
    semester = 'Ganjil',
    examType = 'Ujian'
  } = data;

  const totalStudents = gradedStudents.length;
  const passCount = gradedStudents.filter(s => s.finalScore >= kkm).length;
  const remCount = totalStudents - passCount;
  const passPercent = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  // Create student list rows HTML
  const studentRowsHtml = gradedStudents.map((s, idx) => `
    <tr>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${idx + 1}</td>
      <td style="text-align: left; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${s.name}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${s.correct}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${s.wrong}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${s.mcqScore.toFixed(1)}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${s.essayScore.toFixed(1)}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; background-color: #f8fafc;">${s.finalScore}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${s.csi.toFixed(1)}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${s.lps.toFixed(2)}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; color: ${s.finalScore >= kkm ? '#22c55e' : '#ef4444'};">
        ${s.finalScore >= kkm ? 'TUNTAS' : 'REMEDIAL'}
      </td>
    </tr>
  `).join('');

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Laporan Hasil Ujian - GradeMaster OS</title>
      <style>
        body { font-family: 'Arial', sans-serif; color: #0f172a; line-height: 1.5; }
        .title { text-align: center; font-size: 18pt; font-weight: bold; color: #1e293b; margin-top: 0; margin-bottom: 5px; }
        .subtitle { text-align: center; font-size: 11pt; color: #64748b; margin-bottom: 20px; }
        .section-header { font-size: 12pt; font-weight: bold; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px; margin-top: 25px; margin-bottom: 10px; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .meta-table td { padding: 5px; font-size: 10pt; }
        .meta-label { font-weight: bold; width: 22%; color: #475569; }
        .meta-value { width: 28%; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; margin-top: 10px; }
        .data-table th { background-color: #334155; color: #ffffff; font-weight: bold; font-size: 9.5pt; padding: 8px; border: 1px solid #cbd5e1; }
        .data-table td { font-size: 9pt; border: 1px solid #cbd5e1; padding: 6px; }
        .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="title">LAPORAN HASIL EVALUASI PEMBELAJARAN</div>
      <div class="subtitle">GradeMaster OS - Platform Manajemen Ujian & Analisis Pendidikan</div>

      <div class="section-header">A. INFORMASI SESI EVALUASI</div>
      <table class="meta-table">
        <tr>
          <td class="meta-label">Nama Sesi:</td>
          <td class="meta-value">${sessionName}</td>
          <td class="meta-label">Mata Pelajaran:</td>
          <td class="meta-value">${subject}</td>
        </tr>
        <tr>
          <td class="meta-label">Guru Pengampu:</td>
          <td class="meta-value">${teacherName}</td>
          <td class="meta-label">Kelas / Level:</td>
          <td class="meta-value">${studentClass} (${schoolLevel})</td>
        </tr>
        <tr>
          <td class="meta-label">Batas KKM:</td>
          <td class="meta-value">${kkm}</td>
          <td class="meta-label">Semester / TA:</td>
          <td class="meta-value">${semester} / ${academicYear}</td>
        </tr>
        <tr>
          <td class="meta-label">Tipe Ujian:</td>
          <td class="meta-value">${examType}</td>
          <td class="meta-label">Tanggal Cetak:</td>
          <td class="meta-value">${new Date().toLocaleDateString('id-ID')}</td>
        </tr>
      </table>

      <div class="section-header">B. RINGKASAN ANALISIS & STATISTIK KELAS</div>
      <table class="data-table">
        <thead>
          <tr style="background-color: #475569;">
            <th style="padding: 8px; text-align: center;">Rata-rata Kelas</th>
            <th style="padding: 8px; text-align: center;">Nilai Tertinggi</th>
            <th style="padding: 8px; text-align: center;">Nilai Terendah</th>
            <th style="padding: 8px; text-align: center;">Median</th>
            <th style="padding: 8px; text-align: center;">Deviasi Standar</th>
            <th style="padding: 8px; text-align: center;">Persentase Kelulusan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; padding: 8px; font-weight: bold; font-size: 11pt;">${analytics.avgScore.toFixed(2)}</td>
            <td style="text-align: center; padding: 8px; font-weight: bold; font-size: 11pt; color: #1e3a8a;">${analytics.highestScore}</td>
            <td style="text-align: center; padding: 8px; font-weight: bold; font-size: 11pt; color: #b91c1c;">${analytics.lowestScore}</td>
            <td style="text-align: center; padding: 8px; font-size: 10pt;">${analytics.median.toFixed(2)}</td>
            <td style="text-align: center; padding: 8px; font-size: 10pt;">${analytics.standardDeviation.toFixed(2)}</td>
            <td style="text-align: center; padding: 8px; font-weight: bold; font-size: 11pt; color: #22c55e;">${passPercent}% (${passCount}/${totalStudents} Siswa)</td>
          </tr>
        </tbody>
      </table>

      <div class="section-header">C. DAFTAR NILAI DAN ANALISIS PERFORMA SISWA</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%">No</th>
            <th>Nama Siswa</th>
            <th style="width: 8%">Benar</th>
            <th style="width: 8%">Salah</th>
            <th style="width: 10%">Nilai PG</th>
            <th style="width: 12%">Nilai Essay</th>
            <th style="width: 12%">Nilai Akhir</th>
            <th style="width: 8%">CSI</th>
            <th style="width: 8%">LPS</th>
            <th style="width: 12%">Status</th>
          </tr>
        </thead>
        <tbody>
          ${studentRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        Dokumen ini dihasilkan secara elektronik oleh sistem GradeMaster OS dan sah digunakan sebagai laporan pembelajaran resmi.<br/>
        GradeMaster OS © ${new Date().getFullYear()}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Laporan_Nilai_${studentClass.replace(/ /g, '_')}_${subject.replace(/ /g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
