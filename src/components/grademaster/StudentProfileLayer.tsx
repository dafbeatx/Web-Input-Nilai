"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, PlusCircle, MinusCircle, Loader2, FileText, 
  Trash2, Pencil, ShieldCheck, ThumbsUp, X, Calendar, 
  Activity, History, DownloadCloud, Check, User,
  Settings, AlertCircle, LogOut, Share2, Trophy, TrendingUp, Target,
  Home, BookOpen, Upload, GraduationCap, Bug, ArrowRight, Info, Scroll,
  Smartphone, Laptop, Globe, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { ToastType } from '@/lib/grademaster/types';
import { 
  addBehaviorAction, 
  updateBehaviorAction, 
  deleteBehaviorAction, 
  getBehaviorLogsAction 
} from '@/lib/actions/behavior';
import { supabase } from '@/lib/supabase/client';
import { useGradeMaster } from '@/context/GradeMasterContext';
import Image from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import StudentLessonLayer from './StudentLessonLayer';

interface BehaviorLog {
  id: string;
  student_id: string;
  points_delta: number;
  reason: string;
  violation_date: string;
  created_at: string;
}

interface StudentProfileLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  isAdmin?: boolean;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  initialPoints?: number;
  avatarUrl?: string | null;
  canEditPhoto?: boolean;
  onAvatarUpdate?: (newUrl: string) => void;
  onPointsUpdate?: (newPoints: number) => void;
  onLogout?: () => void;
  onStartRemedial?: (sessionName: string) => void;
  behaviorReasons?: { text: string; weight: number }[];
  semester?: string;
}

const CHART_MARGIN = { left: -20, right: 10, top: 10, bottom: 5 };
const CHART_TICK_STYLE = { fill: '#adaaad', fontSize: 9, fontWeight: 'bold' };
const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  fontSize: '11px',
  fontWeight: 'bold',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
};
const ACTIVE_DOT_PROPS = { r: 6 };
const DOT_PROPS = { r: 4, strokeWidth: 2 };

export default function StudentProfileLayer({ 
  onBack, 
  setToast, 
  isAdmin = false, 
  studentId,
  studentName,
  className,
  academicYear,
  initialPoints = 0,
  avatarUrl = null,
  canEditPhoto = false,
  onAvatarUpdate,
  onPointsUpdate,
  onLogout,
  onStartRemedial,
  behaviorReasons = [],
  semester = 'Ganjil'
}: StudentProfileLayerProps) {
  const { isParent } = useGradeMaster();
  const [totalPoints, setTotalPoints] = useState(initialPoints);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [activeTab, setActiveTab] = useState<'HOME' | 'GRADES' | 'LESSON' | 'ATTENDANCE' | 'ACCOUNT'>('HOME');
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<{ subject: string; date: string; status: string }[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [studentLogs, setStudentLogs] = useState<BehaviorLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [studentSummary, setStudentSummary] = useState<{ attendance: any, academicHistory: any[], documents: any[], email?: string | null } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [loginLogs, setLoginLogs] = useState<{ id: string; ip_address: string; user_agent: string; created_at: string }[]>([]);
  const [isLoadingLoginLogs, setIsLoadingLoginLogs] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isSendingBug, setIsSendingBug] = useState(false);
  const [activeSessions, setActiveSessions] = useState<{ id: string; ip_address: string; user_agent: string; created_at: string; is_current: boolean }[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isEndingSessions, setIsEndingSessions] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isEquippingAvatar, setIsEquippingAvatar] = useState(false);
  
  // Management States
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ reason: '', points: 0, date: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localReasons, setLocalReasons] = useState<{ text: string, weight: number }[]>(behaviorReasons);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Dual behavior point system states and calculations
  const [inputBehaviorType, setInputBehaviorType] = useState<'BAD' | 'GOOD'>('BAD');

  // Leaderboard states
  const [classLeaderboard, setClassLeaderboard] = useState<{
    subjects: {
      id: string;
      subject: string;
      examType: string;
      academicYear: string;
      semester: string;
      ranks: { name: string; score: number }[];
    }[];
    behaviorRanks: { name: string; demerits: number; merits: number; avatarUrl?: string | null }[];
    highestDemerits: { name: string; points: number } | null;
    highestMerits: { name: string; points: number } | null;
  } | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [showGradesLeaderboard, setShowGradesLeaderboard] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showBehaviorLeaderboard, setShowBehaviorLeaderboard] = useState(false);
  const [behaviorLeaderboardTab, setBehaviorLeaderboardTab] = useState<'GOOD' | 'BAD'>('GOOD');


  const goodBehaviorPresets = useMemo(() => [
    { text: "Aktif Berdiskusi & Tanya Jawab", weight: 5 },
    { text: "Membantu Teman / Tutor Sebaya", weight: 5 },
    { text: "Menjaga Kebersihan Kelas (Piket)", weight: 5 },
    { text: "Jujur & Menjunjung Integritas", weight: 10 },
    { text: "Pencapaian Prestasi Sekolah", weight: 15 },
    { text: "Sopan Santun & Ramah pada Guru", weight: 5 },
  ], []);

  const totalDemerits = useMemo(() => {
    return studentLogs
      .filter(log => log.points_delta > 0)
      .reduce((sum, log) => sum + log.points_delta, 0);
  }, [studentLogs]);

  const totalMerits = useMemo(() => {
    return studentLogs
      .filter(log => log.points_delta < 0)
      .reduce((sum, log) => sum + Math.abs(log.points_delta), 0);
  }, [studentLogs]);

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  };

  const handleDownloadDocument = async (docId: string, docName: string) => {
    if (downloadingDocId) return;
    setDownloadingDocId(docId);
    setToast({ message: `Sedang menyiapkan unduhan ${docName}...`, type: "success" });

    try {
      if (docId === 'report-1') {
        const doc = new jsPDF();
        
        if (currentAvatarUrl) {
          try {
            const img = await loadImage(currentAvatarUrl);
            doc.addImage(img, 'JPEG', 160, 45, 26, 33);
          } catch (err) {
            console.error("Failed to load student avatar for PDF:", err);
          }
        }

        doc.setDrawColor(190, 24, 74);
        doc.setLineWidth(0.5);
        doc.rect(10, 10, 190, 277);

        const clsUpper = (className || '').toUpperCase();
        const schoolName = clsUpper.includes('SMA') || clsUpper.includes('10') || clsUpper.includes('11') || clsUpper.includes('12') || clsUpper.includes('X') || clsUpper.includes('XI') || clsUpper.includes('XII')
          ? 'SMA TERPADU AS SALAAM'
          : 'SMP TERPADU AL-ITTIHADIYAH';

        doc.setFont("Times", "bold");
        doc.setFontSize(16);
        doc.text(`OSIS ${schoolName}`, 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('Laporan Kedisiplinan dan Kepatuhan Perilaku Siswa', 105, 26, { align: 'center' });
        
        doc.setFont("Times", "normal");
        doc.setFontSize(10);
        doc.text(`Tahun Ajaran ${academicYear}`, 105, 31, { align: 'center' });
        
        doc.setLineWidth(1);
        doc.line(14, 35, 196, 35);
        doc.setLineWidth(0.5);
        doc.line(14, 36.5, 196, 36.5);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        doc.text('Nama Siswa', 15, 46);
        doc.text(`:  ${studentName}`, 58, 46);
        doc.text('Kelas', 15, 52);
        doc.text(`:  ${className}`, 58, 52);
        doc.text('Total Pengurangan Poin', 15, 58);
        doc.text(`:  ${totalPoints} Poin`, 58, 58);
        
        const charScore = Math.max(0, 100 - totalPoints);
        doc.text('Skor Perilaku Akhir', 15, 64);
        doc.text(`:  ${charScore} / 100 Poin`, 58, 64);

        doc.setFont("Helvetica", "bold");
        doc.text('Kategori Perilaku', 15, 70);
        doc.text(':', 58, 70);
        
        let statusLabel = 'Sangat Baik';
        let badgeColor: [number, number, number] = [34, 197, 94];
        
        if (charScore >= 90) {
          statusLabel = 'Sangat Baik';
          badgeColor = [34, 197, 94];
        } else if (charScore >= 75) {
          statusLabel = 'Baik';
          badgeColor = [59, 130, 246];
        } else if (charScore >= 60) {
          statusLabel = 'Cukup';
          badgeColor = [245, 158, 11];
        } else {
          statusLabel = 'Perlu Pembinaan';
          badgeColor = [239, 68, 68];
        }

        doc.setFillColor(...badgeColor);
        doc.circle(62, 69, 1.8, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.text(statusLabel, 67, 70);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.text('Catatan Perilaku Harian', 15, 82);
        
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(15, 85, 195, 85);

        const logsData = studentLogs.map((log, idx) => [
          idx + 1,
          log.reason,
          log.points_delta > 0 ? `-${log.points_delta}` : `+${Math.abs(log.points_delta)}`,
          new Date(log.violation_date || log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          log.points_delta > 0 ? 'Pelanggaran' : 'Apresiasi'
        ]);

        let behaviorTableEndY = 87;
        if (logsData.length > 0) {
          autoTable(doc, {
            startY: 87,
            head: [['No', 'Uraian Sikap / Pelanggaran', 'Dampak Poin', 'Tanggal', 'Jenis']],
            body: logsData,
            theme: 'grid',
            styles: { font: 'Helvetica', fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [190, 24, 74], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
              0: { halign: 'center', cellWidth: 10 },
              1: { halign: 'left' },
              2: { halign: 'center', cellWidth: 25 },
              3: { halign: 'center', cellWidth: 28 },
              4: { halign: 'center', cellWidth: 25 }
            }
          });
          behaviorTableEndY = (doc as any).lastAutoTable.finalY + 8;
        } else {
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text('Catatan perilaku bersih — Tidak ada pelanggaran kedisiplinan tercatat.', 15, 91);
          doc.setTextColor(0, 0, 0);
          behaviorTableEndY = 100;
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.text('Evaluasi Karakter', 15, behaviorTableEndY);
        doc.line(15, behaviorTableEndY + 2, 195, behaviorTableEndY + 2);

        let evalText = '';
        if (studentLogs.length === 0) {
          evalText = `Siswa atas nama ${studentName} menunjukkan kepatuhan dan kedisiplinan yang sangat baik selama masa pembelajaran. Catatan perilaku bersih tanpa ada pelanggaran kedisiplinan yang tercatat. Diharapkan untuk terus mempertahankan sikap positif ini sebagai teladan bagi rekan-rekan lainnya.`;
        } else {
          const uniqueViolations = Array.from(new Set(studentLogs.map(v => v.reason.trim()).filter(Boolean)));
          const violationString = uniqueViolations.join(', ');
          
          if (charScore >= 90) {
            evalText = `Siswa atas nama ${studentName} secara keseluruhan menunjukkan karakter yang Sangat Baik dengan skor kedisiplinan ${charScore}/100. Catatan keaktifan perilaku mencakup pelanggaran ringan seperti: ${violationString}. Terus pertahankan kedisiplinan ini.`;
          } else if (charScore >= 75) {
            evalText = `Siswa atas nama ${studentName} menunjukkan perilaku berkategori Baik dengan skor ${charScore}/100. Terdapat beberapa catatan yang perlu diperhatikan yaitu: ${violationString}. Disarankan untuk meningkatkan disiplin diri dan menjaga kepatuhan aturan sekolah.`;
          } else if (charScore >= 60) {
            evalText = `Siswa atas nama ${studentName} memiliki skor perilaku Cukup (${charScore}/100) dan memerlukan pembinaan terpadu. Pelanggaran yang tercatat meliputi: ${violationString}. Perlu adanya pembinaan intensif dari wali kelas dan guru BK.`;
          } else {
            evalText = `Tingkat kedisiplinan siswa atas nama ${studentName} sangat rendah dengan skor perilaku ${charScore}/100 (Perlu Pembinaan). Pelanggaran meliputi: ${violationString}. Sangat penting bagi pihak sekolah dan orang tua untuk bekerja sama memberikan bimbingan ketat agar siswa memperbaiki perilakunya.`;
          }
        }

        if (behaviorTableEndY + 5 > 240) {
          doc.addPage();
          doc.rect(10, 10, 190, 277);
          behaviorTableEndY = 20;
        }

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        const splitEval = doc.splitTextToSize(evalText, 180);
        doc.text(splitEval, 15, behaviorTableEndY + 5);

        const evalEndY = behaviorTableEndY + 5 + (splitEval.length * 4.5) + 6;
        let signatureY = evalEndY + 4;
        if (signatureY > 250) {
          doc.addPage();
          doc.rect(10, 10, 190, 277);
          signatureY = 25;
        }

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const signatureX = 135;
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`Bogor, ${dateStr}`, signatureX, signatureY);
        doc.text('Pembimbing OSIS,', signatureX, signatureY + 4);
        
        doc.setFont("Helvetica", "bold");
        doc.text('Nurholis Majid, S.Pd., G.r.', signatureX, signatureY + 22);
        doc.setLineWidth(0.2);
        doc.line(signatureX, signatureY + 23, signatureX + 50, signatureY + 23);

        const footerY = 278;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(15, footerY, 195, footerY);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Dokumen dihasilkan otomatis oleh GradeMaster OS', 15, footerY + 5);

        doc.save(`Laporan_Perilaku_${studentName.replace(/ /g, '_')}_${className}.pdf`);
        setToast({ message: "Berhasil mengunduh Laporan Progres Kelakuan", type: "success" });

      } else if (docId === 'cert-1') {
        const canvas = document.createElement('canvas');
        canvas.width = 1120;
        canvas.height = 792;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Gagal menginisialisasi canvas");

        ctx.fillStyle = '#fcfbf7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#c5a880';
        ctx.lineWidth = 8;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

        const drawCorner = (x: number, y: number, xDir: number, yDir: number) => {
          ctx.fillStyle = '#c5a880';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + xDir * 50, y);
          ctx.lineTo(x, y + yDir * 50);
          ctx.closePath();
          ctx.fill();
        };
        drawCorner(32, 32, 1, 1);
        drawCorner(canvas.width - 32, 32, -1, 1);
        drawCorner(32, canvas.height - 32, 1, -1);
        drawCorner(canvas.width - 32, canvas.height - 32, -1, -1);

        const clsUpper = (className || '').toUpperCase();
        const schoolName = clsUpper.includes('SMA') || clsUpper.includes('10') || clsUpper.includes('11') || clsUpper.includes('12') || clsUpper.includes('X') || clsUpper.includes('XI') || clsUpper.includes('XII')
          ? 'SMA TERPADU AS SALAAM'
          : 'SMP TERPADU AL-ITTIHADIYAH';

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.font = 'bold 22px Georgia, serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(schoolName.toUpperCase(), canvas.width / 2, 100);

        ctx.font = 'bold 50px Georgia, serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('SERTIFIKAT PENGHARGAAN', canvas.width / 2, 180);

        ctx.font = 'italic 20px Georgia, serif';
        ctx.fillStyle = '#c5a880';
        ctx.fillText('Piagam Kedisiplinan & Integritas Karakter', canvas.width / 2, 235);

        ctx.strokeStyle = '#c5a880';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 120, 260);
        ctx.lineTo(canvas.width / 2 + 120, 260);
        ctx.stroke();

        ctx.font = 'normal 18px Arial, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Diberikan dengan hormat kepada siswa:', canvas.width / 2, 300);

        ctx.font = 'bold 44px Georgia, serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(studentName.toUpperCase(), canvas.width / 2, 370);

        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(`Kelas ${className}  •  Tahun Ajaran ${academicYear}`, canvas.width / 2, 425);

        ctx.font = 'normal 16px Georgia, serif';
        ctx.fillStyle = '#334155';
        const citation = 'Atas dedikasi yang tinggi dalam mempertahankan kedisiplinan kelas, kelakuan terpuji,\n' +
                         'serta menunjukkan tingkat integritas akademik terbaik di lingkungan sekolah.';
        const lines = citation.split('\n');
        ctx.fillText(lines[0], canvas.width / 2, 480);
        ctx.fillText(lines[1], canvas.width / 2, 510);

        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        ctx.font = 'normal 16px Arial, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(`Bogor, ${dateStr}`, canvas.width / 2, 580);

        ctx.font = 'normal 16px Georgia, serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Kepala Sekolah,', 280, 630);
        ctx.font = 'bold 18px Georgia, serif';
        ctx.fillText('Farhan Sopian Sahid, S.Pd.I', 280, 700);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(180, 712);
        ctx.lineTo(380, 712);
        ctx.stroke();

        ctx.font = 'normal 16px Georgia, serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Pembina OSIS,', canvas.width - 280, 630);
        ctx.font = 'bold 18px Georgia, serif';
        ctx.fillText('Nurholis Majid, S.Pd., G.r.', canvas.width - 280, 700);
        ctx.beginPath();
        ctx.moveTo(canvas.width - 380, 712);
        ctx.lineTo(canvas.width - 180, 712);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(197, 168, 128, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, 650, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.fillStyle = '#c5a880';
        ctx.fillText('GRADE', canvas.width / 2, 642);
        ctx.fillText('MASTER', canvas.width / 2, 658);

        const link = document.createElement('a');
        link.download = `Sertifikat_Kedisiplinan_${studentName.replace(/ /g, '_')}_${className}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
        setToast({ message: "Berhasil mengunduh Sertifikat Kedisiplinan (JPG)", type: "success" });

      } else if (docId === 'history-1') {
        const academicHistory = studentSummary?.academicHistory || [];
        
        const rows: any[] = [
          ['REKAPITULASI NILAI AKADEMIK TAHUNAN'],
          [`NAMA SISWA: ${studentName.toUpperCase()}`],
          [`KELAS: ${className} • TAHUN AJARAN: ${academicYear}`],
          [],
          ['No', 'Mata Pelajaran', 'Ujian Sesi', 'KKM', 'Nilai Akhir', 'Status Kelulusan', 'Nilai Remedial']
        ];

        academicHistory.forEach((g, idx) => {
          rows.push([
            idx + 1,
            g.subject,
            g.sessionName,
            g.kkm,
            g.score,
            g.isPassing ? 'TUNTAS' : 'REMEDIAL',
            g.remedialScore !== null && g.remedialScore !== undefined ? g.remedialScore : '-'
          ]);
        });

        const totalExams = academicHistory.length;
        const avgScore = totalExams > 0 
          ? Number((academicHistory.reduce((sum, g) => sum + Number(g.score || 0), 0) / totalExams).toFixed(1))
          : 0;
        const passedExams = academicHistory.filter(g => g.isPassing).length;
        const passPercent = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;

        rows.push([]);
        rows.push(['RINGKASAN AKADEMIK & PRESENSI']);
        rows.push(['Rata-rata Akademik', `${avgScore} / 100`]);
        rows.push(['Rasio Kelulusan Ujian', `${passedExams} dari ${totalExams} tuntas (${passPercent}%)`]);
        
        const attendance = studentSummary?.attendance;
        if (attendance && attendance.total > 0) {
          rows.push(['Persentase Kehadiran', `${attendance.percentage}%`]);
          rows.push(['Detail Presensi', `Hadir ${attendance.present} dari ${attendance.total} pertemuan`]);
        } else {
          rows.push(['Persentase Kehadiran', 'Data presensi belum tersedia']);
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);

        const colWidths = [
          { wch: 6 },
          { wch: 25 },
          { wch: 30 },
          { wch: 10 },
          { wch: 12 },
          { wch: 18 },
          { wch: 15 }
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Akademik");
        
        XLSX.writeFile(wb, `Rekap_Nilai_${studentName.replace(/ /g, '_')}_${className}.xlsx`);
        setToast({ message: "Berhasil mengunduh Rekap Nilai Tahunan (Excel)", type: "success" });
      }
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Gagal mengunduh dokumen: ${err.message}`, type: "error" });
    } finally {
      setDownloadingDocId(null);
    }
  };

  const [isMounted, setIsMounted] = useState(false);

  // Memoize chart data to prevent Recharts rendering loop
  const chartData = React.useMemo(() => {
    const history = studentSummary?.academicHistory || [];
    return [...history]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((g: any) => ({
        name: g.sessionName.slice(0, 10),
        nilai: Number(g.score || 0),
        subject: g.subject
      }));
  }, [studentSummary?.academicHistory]);

  // Dynamic Badges
  interface BadgeItem {
    id: string;
    label: string;
    desc: string;
    icon: string;
    color: string;
  }
  const getSchoolName = (classNameStr: string) => {
    const cls = (classNameStr || '').toUpperCase();
    if (cls.includes('SMA') || cls.includes('10') || cls.includes('11') || cls.includes('12') || cls.includes('X') || cls.includes('XI') || cls.includes('XII')) {
      return 'SMA Terpadu As Salaam';
    }
    return 'SMP Terpadu Al-Ittihadiyah';
  };

  const getBadges = () => {
    const list: BadgeItem[] = [];
    const charScore = Math.max(0, 100 - totalPoints);
    
    if (charScore === 100) {
      list.push({
        id: 'gold_disc',
        label: 'Disiplin Emas',
        desc: 'Perilaku Bersih & Sempurna',
        icon: '🏆',
        color: 'from-amber-400 via-yellow-400 to-amber-500 text-yellow-950 border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
      });
    } else if (charScore >= 80) {
      list.push({
        id: 'silver_disc',
        label: 'Siswa Teladan',
        desc: 'Karakter Sangat Baik',
        icon: '⭐️',
        color: 'from-blue-500/10 to-indigo-500/20 text-indigo-800 border-indigo-500/20'
      });
    }

    const attPercent = studentSummary?.attendance?.percentage;
    if (attPercent && attPercent >= 95) {
      list.push({
        id: 'perfect_pres',
        label: 'Hadir Sempurna',
        desc: 'Presensi >= 95%',
        icon: '📅',
        color: 'from-emerald-500/10 to-teal-500/20 text-emerald-800 border-emerald-500/20'
      });
    }

    const hasAcademic = studentSummary?.academicHistory && studentSummary.academicHistory.length > 0;
    
    // Check for high academic achievements
    if (hasAcademic) {
      const maxScore = Math.max(...studentSummary.academicHistory.map((g: any) => Number(g.score) || 0));
      if (maxScore === 100) {
        list.push({
          id: 'perfect_score',
          label: 'Prestasi Emas',
          desc: 'Nilai Ujian Sempurna (100)',
          icon: '🥇',
          color: 'from-yellow-400 via-amber-400 to-yellow-500 text-amber-950 border-yellow-400/40 shadow-[0_0_15px_rgba(234,179,8,0.25)]'
        });
      } else if (maxScore >= 90) {
        list.push({
          id: 'high_score',
          label: 'Prestasi Unggul',
          desc: `Nilai Tertinggi Kelas (${maxScore})`,
          icon: '🥈',
          color: 'from-slate-200 via-slate-100 to-slate-300 text-slate-800 border-slate-300/40 shadow-[0_0_10px_rgba(203,213,225,0.2)]'
        });
      }
    }

    const allPassing = hasAcademic && studentSummary.academicHistory.every((g: any) => g.isPassing);
    if (allPassing) {
      list.push({
        id: 'academic_star',
        label: 'Bintang Kelas',
        desc: 'Semua Ujian Lulus KKM',
        icon: '✏️',
        color: 'from-violet-500/10 to-purple-500/20 text-purple-800 border-purple-500/20'
      });
    }

    if (list.length === 0) {
      list.push({
        id: 'member',
        label: 'Anggota Aktif',
        desc: `Siswa ${getSchoolName(className)}`,
        icon: '🛡️',
        color: 'from-slate-500/10 to-slate-500/20 text-slate-800 border-slate-500/20'
      });
    }
    return list;
  };

  const badges = getBadges();

  const academicHistory = studentSummary?.academicHistory || [];
  const avgScore = academicHistory.length > 0 
    ? (academicHistory.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) / academicHistory.length).toFixed(1)
    : '—';
  const attPercent = studentSummary?.attendance?.percentage !== null && studentSummary?.attendance?.percentage !== undefined 
    ? `${studentSummary.attendance.percentage}%`
    : '—';
  const badgesCount = badges.length;
  const docsCount = studentSummary?.documents?.length || 0;
  const pendingCount = academicHistory.filter((g: any) => !g.isPassing).length;  useEffect(() => {
    setLocalReasons(behaviorReasons);
  }, [behaviorReasons]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchStudentLogs();
    fetchStudentSummary();
    fetchAttendanceLogs();
    fetchLoginLogs();
    fetchActiveSessions();
    // fetchClassLeaderboard();
    if (isAdmin) {
      fetchBehaviorSettings();
    }
    setTotalPoints(initialPoints);
    setCurrentAvatarUrl(avatarUrl);
  }, [studentId, studentName, initialPoints, avatarUrl, isAdmin, className]);

  const fetchBehaviorSettings = async () => {
    try {
      const res = await fetch(`/api/grademaster/behaviors/settings?year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (res.ok && data.settings && Array.isArray(data.settings.reasons)) {
        setLocalReasons(data.settings.reasons);
      }
    } catch (err) {
      console.error("Failed to load behavior settings", err);
    }
  };

  const fetchClassLeaderboard = async () => {
    if (!className) return;
    setIsLoadingLeaderboard(true);
    try {
      // 1. Fetch class behaviors & logs
      const { data: behaviors, error: behaviorsError } = await supabase
        .from('gm_behaviors')
        .select('id, student_name, avatar_url')
        .eq('class_name', className)
        .eq('academic_year', academicYear);

      let highestDemerits: { name: string; points: number } | null = null;
      let highestMerits: { name: string; points: number } | null = null;
      let behaviorRanksData: { name: string; demerits: number; merits: number; avatarUrl?: string | null }[] = [];

      if (!behaviorsError && behaviors && behaviors.length > 0) {
        const studentIds = behaviors.map(b => b.id);
        const { data: logs, error: logsError } = await supabase
          .from('gm_behavior_logs')
          .select('student_id, points_delta')
          .in('student_id', studentIds);

        if (!logsError && logs) {
          const studentPoints = behaviors.map(b => {
            const studentLogs = logs.filter(l => l.student_id === b.id);
            const demerits = studentLogs.filter(l => l.points_delta > 0).reduce((sum, l) => sum + l.points_delta, 0);
            const merits = studentLogs.filter(l => l.points_delta < 0).reduce((sum, l) => sum + Math.abs(l.points_delta), 0);
            return {
              name: b.student_name,
              demerits,
              merits,
              avatarUrl: b.avatar_url
            };
          });

          behaviorRanksData = [...studentPoints];

          // Find highest demerits (> 0)
          const sortedDemerits = [...studentPoints].sort((a, b) => b.demerits - a.demerits);
          if (sortedDemerits.length > 0 && sortedDemerits[0].demerits > 0) {
            highestDemerits = { name: sortedDemerits[0].name, points: sortedDemerits[0].demerits };
          }

          // Find highest merits (> 0)
          const sortedMerits = [...studentPoints].sort((a, b) => b.merits - a.merits);
          if (sortedMerits.length > 0 && sortedMerits[0].merits > 0) {
            highestMerits = { name: sortedMerits[0].name, points: sortedMerits[0].merits };
          }
        }
      }

      // 2. Fetch class sessions & scores
      const { data: sessions, error: sessionsError } = await supabase
        .from('gm_sessions')
        .select('id, subject, exam_type, academic_year, semester')
        .eq('class_name', className)
        .eq('academic_year', academicYear);

      const subjectsData: {
        id: string;
        subject: string;
        examType: string;
        academicYear: string;
        semester: string;
        ranks: { name: string; score: number }[];
      }[] = [];

      if (!sessionsError && sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const { data: studentGrades, error: gradesError } = await supabase
          .from('gm_students')
          .select('session_id, name, final_score')
          .in('session_id', sessionIds)
          .eq('is_deleted', false);

        if (!gradesError && studentGrades) {
          // Map session_id to subject details
          const sessionMap = sessions.reduce((map, s) => {
            map[s.id] = {
              subject: s.subject,
              examType: s.exam_type,
              academicYear: s.academic_year,
              semester: s.semester
            };
            return map;
          }, {} as Record<string, { subject: string; examType: string; academicYear: string; semester: string }>);

          // Group scores by session_id & student name
          const sessionScores: Record<string, Record<string, number>> = {};
          studentGrades.forEach(g => {
            const meta = sessionMap[g.session_id];
            if (!meta) return;

            if (!sessionScores[g.session_id]) {
              sessionScores[g.session_id] = {};
            }
            const currentScore = Number(g.final_score) || 0;
            const existingScore = sessionScores[g.session_id][g.name] || 0;
            sessionScores[g.session_id][g.name] = Math.max(existingScore, currentScore);
          });

          // Rank students per session
          Object.keys(sessionScores).forEach(sessionId => {
            const meta = sessionMap[sessionId];
            const rankedList = Object.keys(sessionScores[sessionId]).map(name => ({
              name,
              score: sessionScores[sessionId][name]
            })).sort((a, b) => b.score - a.score);

            subjectsData.push({
              id: sessionId,
              subject: meta.subject,
              examType: meta.examType,
              academicYear: meta.academicYear,
              semester: meta.semester,
              ranks: rankedList
            });
          });
        }
      }

      setClassLeaderboard({
        subjects: subjectsData,
        behaviorRanks: behaviorRanksData,
        highestDemerits,
        highestMerits
      });
    } catch (err) {
      console.error("Failed to load class leaderboard", err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // Sync avatar url prop changes (e.g. from studentData shift)
  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  const fetchAttendanceLogs = async () => {
    if (!studentName) return;
    setIsLoadingAttendance(true);
    try {
      const res = await fetch(`/api/grademaster/students/attendance-logs?name=${encodeURIComponent(studentName)}&year=${encodeURIComponent(academicYear)}&class=${encodeURIComponent(className)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setAttendanceLogs(data.logs);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil logs kehadiran:", err);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const fetchLoginLogs = async () => {
    if (!studentName || !className) return;
    setIsLoadingLoginLogs(true);
    try {
      const res = await fetch(`/api/grademaster/students/login-logs?name=${encodeURIComponent(studentName || '')}&class=${encodeURIComponent(className || '')}`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setLoginLogs(data.logs);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil logs login:", err);
    } finally {
      setIsLoadingLoginLogs(false);
    }
  };

  const fetchActiveSessions = async () => {
    if (!studentId) return;
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/grademaster/students/sessions');
      if (res.ok) {
        const data = await res.json();
        if (data.sessions) {
          setActiveSessions(data.sessions);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil sesi aktif:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleEndOtherSessions = async (type: 'all_other' | 'specific', sessionId?: string) => {
    setIsEndingSessions(true);
    try {
      const url = type === 'all_other' 
        ? '/api/grademaster/students/sessions?type=all_other' 
        : `/api/grademaster/students/sessions?id=${sessionId}`;
        
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setToast({ message: data.message || 'Sesi berhasil diakhiri', type: 'success' });
        
        if (data.is_current) {
          window.location.reload();
        } else {
          await fetchActiveSessions();
        }
      } else {
        throw new Error(data.error || 'Gagal mengakhiri sesi');
      }
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsEndingSessions(false);
    }
  };

  const isEmojiAvatar = (url: string | null | undefined) => {
    if (!url) return false;
    return url.length <= 4 && !url.startsWith('http') && !url.startsWith('/') && !url.startsWith('data:');
  };

  const getGradientForEmoji = (emoji: string | null | undefined) => {
    switch (emoji) {
      case '🌱': return 'from-emerald-400 to-teal-500';
      case '📚': return 'from-indigo-400 to-violet-500';
      case '⚡': return 'from-amber-400 to-orange-500';
      case '🏆': return 'from-rose-400 to-pink-500';
      case '👑': return 'from-violet-500 via-fuchsia-500 to-pink-500';
      default: return 'from-slate-400 to-slate-550';
    }
  };

  const handleEquipAvatar = async (emoji: string) => {
    setIsEquippingAvatar(true);
    try {
      const res = await fetch('/api/grademaster/behaviors/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, avatarEmoji: emoji })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ message: 'Avatar berhasil diperbarui!', type: 'success' });
        setCurrentAvatarUrl(data.avatar_url);
        onAvatarUpdate?.(data.avatar_url);
        setShowAvatarModal(false);
      } else {
        throw new Error(data.error || 'Gagal mengganti avatar');
      }
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsEquippingAvatar(false);
    }
  };

  const getDeviceFromUserAgent = (ua: string) => {
    if (!ua) return "Perangkat Tidak Dikenal";
    const lower = ua.toLowerCase();
    
    let os = "OS Tidak Dikenal";
    if (lower.includes("windows")) os = "Windows";
    else if (lower.includes("macintosh") || lower.includes("mac os")) os = "macOS";
    else if (lower.includes("android")) os = "Android";
    else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
    else if (lower.includes("linux")) os = "Linux";
    
    let browser = "Browser";
    if (lower.includes("chrome") || lower.includes("chromium")) {
      if (lower.includes("edg/")) browser = "Edge";
      else if (lower.includes("opr/") || lower.includes("opera")) browser = "Opera";
      else browser = "Chrome";
    } else if (lower.includes("safari")) {
      browser = "Safari";
    } else if (lower.includes("firefox")) {
      browser = "Firefox";
    }
    
    return `${browser} (${os})`;
  };

  const fetchStudentSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`/api/grademaster/students/summary?name=${encodeURIComponent(studentName)}&year=${encodeURIComponent(academicYear)}&class=${encodeURIComponent(className)}`);
      if (res.ok) {
        const data = await res.json();
        setStudentSummary(data);
        if (data.total_points !== undefined) {
          setTotalPoints(data.total_points);
        }
      }
    } catch (err) {
      console.error("Failed to fetch student summary", err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const fetchStudentLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const result = await getBehaviorLogsAction(studentId);
      if (result.success) {
        setStudentLogs(result.logs || []);
      } else {
        console.error("Server action error:", result.error);
      }
    } catch (err) {
      console.error("Failed to fetch student logs", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSendBugReport = async () => {
    if (!bugDescription.trim() || isSendingBug) return;
    setIsSendingBug(true);
    
    try {
      const deviceInfo = typeof window !== 'undefined' ? navigator.userAgent : 'unknown';
      const res = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          className,
          event: 'BUG_REPORT',
          message: bugDescription.trim(),
          deviceInfo,
          academicYear
        })
      });
      
      if (res.ok) {
        setToast({ message: "Laporan bug berhasil dikirim ke Admin/Guru!", type: "success" });
        setShowBugModal(false);
        setBugDescription('');
      } else {
        throw new Error("Gagal mengirim laporan");
      }
    } catch (err: any) {
      console.error(err);
      setToast({ message: "Gagal mengirim laporan bug. Periksa koneksi.", type: "error" });
    } finally {
      setIsSendingBug(false);
    }
  };

  const handleAddBehavior = async (pointsDelta: number, reason: string, isGood: boolean = false) => {
    if (isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    
    const delta = isGood ? -Math.abs(pointsDelta) : Math.abs(pointsDelta);
    
    const result = await addBehaviorAction({
      studentId,
      pointsDelta: delta,
      reason,
      violationDate: selectedDate
    });

    if (result.success) {
      setToast({ message: `Catatan "${reason}" ditambahkan`, type: "success" });
      const newPts = result.data?.new_total ?? totalPoints;
      setTotalPoints(newPts);
      onPointsUpdate?.(newPts);
      fetchStudentLogs();
      fetchStudentSummary();
      setActiveTab('ACCOUNT');
    } else {
      setToast({ message: result.error || "Gagal menambah catatan", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const handleUpdateLog = async (logId: string) => {
    if (isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    
    // Pastikan tanda (+/-) poin tetap terjaga sesuai tipe log awal
    const originalLog = studentLogs.find(l => l.id === logId);
    const isGood = originalLog ? originalLog.points_delta < 0 : false;
    const signedPoints = isGood ? -Math.abs(editForm.points) : Math.abs(editForm.points);

    const result = await updateBehaviorAction(logId, {
      pointsDelta: signedPoints,
      reason: editForm.reason,
      studentId,
      violationDate: editForm.date
    });

    if (result.success) {
      setToast({ message: "Catatan berhasil diperbarui", type: "success" });
      setTotalPoints(result.newTotal ?? totalPoints);
      onPointsUpdate?.(result.newTotal ?? totalPoints);
      setEditingLogId(null);
      fetchStudentLogs();
      fetchStudentSummary();
    } else {
      setToast({ message: result.error || "Gagal memperbarui", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const handleDeleteLog = async (logId: string) => {
    if (isUpdatingPoints) return;
    if (!confirm("Hapus catatan ini? Poin akan otomatis dikembalikan.")) return;
    setIsUpdatingPoints(true);
    const result = await deleteBehaviorAction(logId, studentId);
    if (result.success) {
      setToast({ message: "Catatan dihapus", type: "success" });
      setTotalPoints(result.newTotal ?? totalPoints);
      onPointsUpdate?.(result.newTotal ?? totalPoints);
      fetchStudentLogs();
      fetchStudentSummary();
    } else {
      setToast({ message: result.error || "Gagal menghapus", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setToast({ message: "Ukuran foto terlalu besar (Maksimal 20MB)", type: "error" });
      return;
    }

    setIsUploadingAvatar(true);
    setToast({ message: "Sedang memproses foto...", type: "success" });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('studentId', studentId);

      const res = await fetch('/api/grademaster/behaviors/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto");

      setToast({ message: "Foto profil berhasil diperbarui!", type: "success" });
      setCurrentAvatarUrl(data.avatar_url);
    } catch (err: any) {
      setToast({ message: err.message || "Gagal mengunggah", type: "error" });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-slate-100/50 flex justify-center z-[1000] font-sans antialiased text-slate-800 selection:bg-indigo-500/10">
      <div className="w-full max-w-md bg-slate-50 flex flex-col relative h-full shadow-[0_0_40px_rgba(0,0,0,0.06)] border-x border-slate-200/50 overflow-hidden">
        
        {/* Top AppBar */}
        {activeTab !== 'LESSON' && (
          <header className="sticky top-0 w-full z-40 bg-white flex items-center justify-between px-4 h-14 border-b border-slate-100 shrink-0">
          {activeTab === 'HOME' ? (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {isAdmin && (
                <button 
                  onClick={onBack}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-slate-600 active:scale-95 border border-slate-100 shrink-0"
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              <div className={`w-8 h-8 rounded-full border text-slate-700 flex items-center justify-center text-[10px] font-black tracking-tight shrink-0 overflow-hidden ${
                isEmojiAvatar(currentAvatarUrl) 
                  ? `bg-gradient-to-br ${getGradientForEmoji(currentAvatarUrl)} text-white border-white/20 text-[14px]` 
                  : 'bg-slate-100 border-slate-200'
              }`}>
                {currentAvatarUrl ? (
                  isEmojiAvatar(currentAvatarUrl) ? (
                    currentAvatarUrl
                  ) : (
                    <img src={currentAvatarUrl} alt={studentName} className="w-full h-full object-cover" />
                  )
                ) : (
                  studentName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-slate-800 font-extrabold text-[11.5px] tracking-tight leading-tight uppercase font-outfit truncate">
                  {studentName} <span className="text-indigo-650 font-bold text-[9.5px] tracking-normal normal-case">({className})</span>
                </h2>
                <p className="text-slate-400 text-[8px] font-bold uppercase tracking-wider leading-none mt-0.5">Tahun Ajaran {academicYear}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button 
                onClick={() => setActiveTab('HOME')}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-slate-600 active:scale-95 border border-slate-100 shrink-0"
              >
                <ArrowLeft size={14} />
              </button>
              <h2 className="font-extrabold text-[12px] uppercase tracking-wider text-slate-850 font-outfit">
                {activeTab === 'GRADES' && "Nilai Akademik"}
                {activeTab === 'ATTENDANCE' && "Kehadiran Siswa"}
                {activeTab === 'ACCOUNT' && "Berkas & Profil"}
              </h2>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={async () => {
                setToast({ message: "Sedang menyinkronkan data...", type: "success" });
                await fetchStudentSummary();
                await fetchStudentLogs();
                await fetchAttendanceLogs();
                setToast({ message: "Data berhasil diperbarui ✨", type: "success" });
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all active:scale-95 border border-slate-100"
              title="Sinkronisasi Data"
            >
              <span className="material-symbols-outlined text-[16px]">sync</span>
            </button>
          </div>
        </header>
        )}

        {/* Main Content Area */}
        {activeTab !== 'LESSON' ? (
          <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-24">
            
               {activeTab === 'HOME' && (
            <div className="space-y-4 animate-in fade-in duration-300">

              {/* Welcome Hero Banner with Mascot */}
              <div className="relative bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-[2.2rem] p-5 overflow-hidden flex items-center justify-between gap-4 shadow-lg shadow-indigo-950/15">
                {/* Abstract light decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

                <div className="min-w-0 z-10 text-left">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white rounded-full text-[9px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Siswa Aktif
                  </span>
                  <h3 className="text-white font-black text-lg mt-2.5 leading-tight font-outfit truncate">
                    Halo, {studentName.split(' ')[0]}! 👋
                  </h3>
                  <p className="text-slate-300 text-[11px] font-semibold mt-1 leading-normal max-w-[210px]">
                    Semoga hari belajarmu menyenangkan di {getSchoolName(className)}.
                  </p>
                </div>
                
                <div className="w-20 h-20 shrink-0 relative select-none pointer-events-none -mb-5 -mr-1">
                  <img 
                    src="/student-mascot.png" 
                    alt="Waving Mascot" 
                    className="w-full h-full object-contain transform scale-125 origin-bottom" 
                  />
                </div>
              </div>

              {/* Banner Notifikasi Remedial / Sukses */}
              {(() => {
                const pendingRemedials = academicHistory.filter((g: any) => !g.isPassing && g.remedialUiState !== 'REMEDIAL_SUBMITTED_HELD_BACK');
                const heldBackGrades = academicHistory.filter((g: any) => g.remedialUiState === 'REMEDIAL_SUBMITTED_HELD_BACK');

                return (
                  <div className="space-y-2">
                    {pendingRemedials.length > 0 ? (
                      <div className="bg-rose-50/80 border border-rose-100/50 rounded-2xl p-4 text-left flex items-start gap-3 animate-in slide-in-from-top-3 duration-300">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">warning</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-rose-950 font-black text-[10.5px] uppercase tracking-wider font-outfit">Ujian Belum Tuntas</h4>
                          <p className="text-rose-800 text-[11.5px] font-semibold mt-0.5 leading-snug">
                            Kamu memiliki <strong className="font-extrabold">{pendingRemedials.length} pelajaran</strong> remedial. Yuk selesaikan sekarang!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/80 border border-emerald-100/50 rounded-2xl p-4 text-left flex items-start gap-3 animate-in slide-in-from-top-3 duration-300">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-emerald-950 font-black text-[10.5px] uppercase tracking-wider font-outfit">Status Ujian Aman</h4>
                          <p className="text-emerald-800 text-[11.5px] font-semibold mt-0.5 leading-snug">
                            Keren! Semua ujianmu berada di atas KKM. Pertahankan prestasimu ya! 🎉
                          </p>
                        </div>
                      </div>
                    )}

                    {heldBackGrades.map((g: any, idx: number) => {
                      const deadlineText = g.remedialDeadline ? formatDate(g.remedialDeadline) : 'batas waktu sesi';
                      return (
                        <div key={idx} className="bg-amber-50/80 border border-amber-100/50 rounded-2xl p-4 text-left flex items-start gap-3 animate-in slide-in-from-top-3 duration-300">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-amber-950 font-black text-[10.5px] uppercase tracking-wider font-outfit">Nilai Remedial Ditahan</h4>
                            <p className="text-amber-800 text-[11.5px] font-semibold mt-0.5 leading-snug">
                              Jawaban remedial untuk <strong>{g.subject} ({g.sessionName})</strong> sudah dikumpulkan. Nilai final masih ditahan sementara sampai teman sekelas selesai atau sampai {deadlineText}.
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Quick Action Grid (2x2) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Tombol 1: Nilai & Remedial */}
                <button
                  onClick={() => setActiveTab('GRADES')}
                  className="p-4 bg-white hover:bg-slate-50/80 active:scale-98 border border-slate-100 rounded-3xl flex flex-col items-start gap-3 text-left transition-all relative shadow-[0_2px_8px_rgba(0,0,0,0.01)] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-slate-800 tracking-tight leading-none font-outfit">Nilai Ujian</h4>
                    <p className="text-[13px] text-slate-900 font-black mt-1 font-outfit">Rata-rata: <span className="text-indigo-600">{avgScore}</span></p>
                    <p className="text-[9px] text-slate-450 font-bold mt-1.5 leading-tight">Detail nilai akademik</p>
                  </div>
                  {pendingCount > 0 && (
                    <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-4 ring-white">
                      {pendingCount}
                    </span>
                  )}
                </button>

                {/* Tombol 2: Kehadiran */}
                <button
                  onClick={() => setActiveTab('ATTENDANCE')}
                  className="p-4 bg-white hover:bg-slate-50/80 active:scale-98 border border-slate-100 rounded-3xl flex flex-col items-start gap-3 text-left transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-slate-800 tracking-tight leading-none font-outfit">Kehadiran</h4>
                    <p className="text-[13px] text-emerald-600 font-black mt-1 font-outfit">{attPercent}</p>
                    <p className="text-[9px] text-slate-455 font-bold mt-1.5 leading-tight">Log kehadiran harian</p>
                  </div>
                </button>

                {/* Tombol 3: Prestasi Siswa */}
                <button
                  onClick={() => setShowAchievementsModal(true)}
                  className="p-4 bg-white hover:bg-slate-50/80 active:scale-98 border border-slate-100 rounded-3xl flex flex-col items-start gap-3 text-left transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-slate-800 tracking-tight leading-none font-outfit">Prestasi Siswa</h4>
                    <p className="text-[13px] text-amber-600 font-black mt-1 font-outfit">{badgesCount} Lencana</p>
                    <p className="text-[9px] text-slate-455 font-bold mt-1.5 leading-tight">Piala & penghargaan</p>
                  </div>
                </button>

                {/* Tombol 4: Unduh Berkas */}
                <button
                  onClick={() => setActiveTab('ACCOUNT')}
                  className="p-4 bg-white hover:bg-slate-50/80 active:scale-98 border border-slate-100 rounded-3xl flex flex-col items-start gap-3 text-left transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-slate-800 tracking-tight leading-none font-outfit">Unduh Berkas</h4>
                    <p className="text-[13px] text-sky-600 font-black mt-1 font-outfit">{docsCount} Dokumen</p>
                    <p className="text-[9px] text-slate-455 font-bold mt-1.5 leading-tight">Rapor & sertifikat</p>
                  </div>
                </button>
              </div>

              {/* Catatan Perilaku Terbaru (Maksimal 2 log) */}
              <div className="space-y-2 pt-1 text-left">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Perilaku Terbaru</h3>
                  {studentLogs.length > 2 && (
                    <button
                      onClick={() => setActiveTab('ACCOUNT')}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider transition-all"
                    >
                      Lihat Semua
                    </button>
                  )}
                </div>

                {isLoadingLogs ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white border border-slate-100 rounded-2xl">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                    <p className="text-[9px] font-bold uppercase tracking-wider">Memuat catatan...</p>
                  </div>
                ) : studentLogs.length === 0 ? (
                  <div className="py-7 text-center bg-white border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center px-4">
                    <span className="material-symbols-outlined text-[24px] text-slate-350">sentiment_satisfied</span>
                    <p className="text-[10.5px] font-bold text-slate-400 uppercase mt-1">Perilaku bersih & tertib</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentLogs.slice(0, 2).map((log) => {
                      const isNegative = log.points_delta > 0;
                      return (
                        <div key={log.id} className="bg-white border border-slate-100 rounded-2xl p-3.5 flex items-start gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all">
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                            isNegative ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            <span className="material-symbols-outlined text-[16px]">
                              {isNegative ? 'remove_circle_outline' : 'verified'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex justify-between items-baseline gap-2">
                              <h4 className="font-extrabold text-slate-800 text-[11.5px] tracking-tight leading-snug truncate">{log.reason}</h4>
                              <span className={`font-black text-[10px] uppercase tracking-wider shrink-0 px-2 py-0.5 rounded-lg ${isNegative ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {isNegative ? `+${log.points_delta} Pelanggaran` : `+${Math.abs(log.points_delta)} Kebaikan`}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{formatDate(log.violation_date || log.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GRADES (NILAI AKADEMIK) */}
          {activeTab === 'GRADES' && (() => {
            const academicHistory = studentSummary?.academicHistory || [];
            const totalExams = academicHistory.length;
            const passedExams = academicHistory.filter((g: any) => g.isPassing).length;
            
            const avgScore = totalExams > 0 
              ? Number((academicHistory.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) / totalExams).toFixed(1))
              : 0;

            const passPercent = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;
            const highestScore = totalExams > 0 ? Math.max(...academicHistory.map((g: any) => Number(g.score || 0))) : 0;
            
            let bestSubject = "—";
            if (totalExams > 0) {
              const subjectsMap: Record<string, number[]> = {};
              academicHistory.forEach((g: any) => {
                if (!subjectsMap[g.subject]) subjectsMap[g.subject] = [];
                subjectsMap[g.subject].push(Number(g.score || 0));
              });
              let maxAvg = -1;
              Object.keys(subjectsMap).forEach(subj => {
                const avg = subjectsMap[subj].reduce((s, val) => s + val, 0) / subjectsMap[subj].length;
                if (avg > maxAvg) {
                  maxAvg = avg;
                  bestSubject = subj;
                }
              });
            }

            return (
              <div className="space-y-4 animate-in fade-in duration-300 text-left">
                
                {/* Ringkasan Nilai */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-sm">
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata</p>
                    <p className="text-xl font-black text-indigo-600 font-outfit mt-1">{avgScore.toFixed(1)}</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-sm">
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Tuntas</p>
                    <p className="text-xl font-black text-emerald-600 font-outfit mt-1">{passPercent}%</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-sm">
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Nilai Tertinggi</p>
                    <p className="text-xl font-black text-amber-500 font-outfit mt-1">{highestScore}</p>
                  </div>
                </div>

                {/* Grafik Perkembangan Nilai */}
                {isMounted && totalExams >= 1 && (
                  <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-indigo-500" /> Tren Perkembangan Nilai
                    </h4>
                    <div className="h-[160px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={CHART_MARGIN}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={CHART_TICK_STYLE} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={CHART_TICK_STYLE} />
                          <Tooltip 
                            contentStyle={TOOLTIP_CONTENT_STYLE} 
                            formatter={(value, name, props) => [`Nilai: ${value}`, `${props.payload.subject}`]}
                          />
                          <Line type="monotone" dataKey="nilai" stroke="#4f46e5" strokeWidth={2.5} activeDot={ACTIVE_DOT_PROPS} dot={DOT_PROPS} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Kesimpulan Ringkas */}
                <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-3.5">
                  <p className="text-[11px] font-semibold text-indigo-900 leading-relaxed">
                    {totalExams === 0 
                      ? "Belum ada riwayat ujian yang tercatat pada sistem." 
                      : `Siswa memperoleh rata-rata nilai sebesar ${avgScore.toFixed(1)} dari total ${totalExams} sesi ujian. Pelajaran dengan capaian terbaik diraih pada bidang ${bestSubject} dengan skor tertinggi ${highestScore}.`
                    }
                  </p>
                </div>

                {/* List Sesi Ujian */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Riwayat Sesi Ujian</h4>
                  
                  {isLoadingSummary ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white border border-slate-100 rounded-3xl">
                      <Loader2 size={24} className="animate-spin text-indigo-500" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Memuat Ujian...</p>
                    </div>
                  ) : academicHistory.length === 0 ? (
                    <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center px-4">
                      <span className="material-symbols-outlined text-[28px] text-slate-350">import_contacts</span>
                      <p className="text-[11px] font-bold text-slate-400 uppercase mt-2">Tidak ada data ujian</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {academicHistory.map((grade: any, idx: number) => {
                        const isPassing = grade.isPassing;
                        return (
                          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center justify-between transition-all hover:border-slate-200">
                            <div className="min-w-0 flex-1 pr-3">
                              <h4 className="text-slate-800 font-extrabold text-[12.5px] uppercase tracking-tight truncate leading-tight">{grade.sessionName}</h4>
                              <p className="text-[9.5px] font-bold text-slate-400 uppercase mt-1 tracking-wide truncate">
                                {grade.subject} • {formatDate(grade.date)}
                              </p>
                              
                              {/* Display remedial status text/message */}
                              {grade.remedialMessage && (
                                <div className="mt-1.5 flex items-center">
                                  <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full ${
                                    grade.remedialUiState === 'REMEDIAL_SUBMITTED_HELD_BACK' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    grade.remedialUiState === 'FAILED_EFFORT' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                    grade.remedialUiState === 'CHEATED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                    grade.remedialUiState === 'TIME_UP' ? 'bg-slate-50 text-slate-600 border border-slate-100' :
                                    grade.remedialUiState === 'PASSING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    grade.remedialUiState === 'DEADLINE_PASSED' ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                                    'bg-slate-50 text-slate-500'
                                  }`} title={grade.remedialMessage}>
                                    {grade.remedialMessage}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                              {grade.remedialUiState === 'REMEDIAL_SUBMITTED_HELD_BACK' ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Remedial: {grade.remedialScore} (Ditahan)</span>
                                  <p className="text-xs font-bold text-slate-400 leading-none">
                                    Final: {grade.score} (Sementara)
                                  </p>
                                </div>
                              ) : (
                                <p className={`text-xl font-black font-outfit leading-none ${isPassing ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {grade.score}
                                </p>
                              )}
                              <span className="text-[8px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded uppercase mt-0.5">
                                KKM: {grade.kkm}
                              </span>

                              {/* Aksi Remedial / Share WA */}
                              {!isAdmin && grade.canStartRemedial && onStartRemedial && (
                                isParent ? (
                                  <button 
                                    disabled
                                    title="Remedial harus diakses oleh Siswa dengan Google Account"
                                    className="mt-1 px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-not-allowed opacity-80"
                                  >
                                    Remedial (Siswa)
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => onStartRemedial(grade.sessionName)}
                                    className="mt-1 px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[9px] font-extrabold uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1 shadow-sm shadow-rose-500/10"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">edit</span>
                                    Mulai Remedial
                                  </button>
                                )
                              )}

                              {!isPassing && isParent && (
                                <button 
                                  onClick={() => {
                                    const deadlineText = grade.remedialDeadline ? formatDate(grade.remedialDeadline) : 'Batas Waktu Sesi';
                                    const appUrl = typeof window !== 'undefined' ? `${window.location.origin}` : 'https://web-input-nilai.vercel.app';
                                    
                                    let reasonText = 'Nilai di bawah batas kelulusan KKM.';
                                    if (grade.remedialUiState === 'REMEDIAL_SUBMITTED_HELD_BACK') {
                                      reasonText = 'Nilai remedial ditahan sementara menunggu teman sekelas selesai.';
                                    } else if (grade.remedialUiState === 'FAILED_EFFORT') {
                                      reasonText = 'Remedial gagal karena pengerjaan asal-asalan atau terlalu cepat.';
                                    } else if (grade.remedialUiState === 'TIME_UP') {
                                      reasonText = 'Batas waktu pengerjaan habis.';
                                    } else if (grade.remedialUiState === 'CHEATED') {
                                      reasonText = 'Terdeteksi indikasi kecurangan selama remedial.';
                                    } else if (grade.remedialUiState === 'DEADLINE_PASSED') {
                                      reasonText = 'Batas waktu remedial telah terlewati.';
                                    }
                                    
                                    const message = `*GradeMaster OS - Pemberitahuan Remedial* 🔄\n\nHalo, berikut adalah informasi pengerjaan remedial:\n👤 *Nama Siswa*: ${studentName}\n🏫 *Kelas*: ${className}\n📚 *Mata Pelajaran*: ${grade.subject}\n📝 *Sesi*: ${grade.sessionName}\n📊 *Nilai Ujian*: ${grade.score} (KKM: ${grade.kkm})\n⚠️ *Alasan*: ${reasonText}\n\nSilakan penuhi persyaratan ujian melalui tautan resmi ini:\n🔗 *Link Portal*: ${appUrl}\n\n*Batas Waktu*: ${deadlineText}\nMohon diselesaikan sebelum tenggat waktu. Terima kasih!`;
                                    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                                    window.open(waUrl, '_blank');
                                  }}
                                  className="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-extrabold uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1 shadow-sm shadow-emerald-600/10"
                                  title="Bagikan ke WhatsApp"
                                >
                                  <Share2 size={9} />
                                  Bagikan WA
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: ATTENDANCE (KEHADIRAN) */}
          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-left">
              
              {/* Ringkasan Presensi */}
              <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rasio Kehadiran Kelas</p>
                <div className="py-4">
                  <p className="text-4xl font-black text-emerald-600 font-outfit">{studentSummary?.attendance?.percentage ?? 0}%</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                    Hadir {studentSummary?.attendance?.present ?? 0} dari {studentSummary?.attendance?.total ?? 0} Pertemuan
                  </p>
                </div>
                
                {/* Pembagian Status */}
                {(() => {
                  const logs = attendanceLogs || [];
                  const sakit = logs.filter(l => l.status === 'Sakit').length;
                  const izin = logs.filter(l => l.status === 'Izin').length;
                  const alfa = logs.filter(l => l.status === 'Alfa').length;
                  return (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-50">
                      <div className="bg-slate-50 p-2 rounded-xl text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Sakit</p>
                        <p className="text-[13px] font-black text-amber-600 mt-0.5">{sakit}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Izin</p>
                        <p className="text-[13px] font-black text-sky-600 mt-0.5">{izin}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Alfa</p>
                        <p className="text-[13px] font-black text-rose-500 mt-0.5">{alfa}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Log Kehadiran */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Riwayat Kehadiran Harian</h4>
                
                {isLoadingAttendance ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white border border-slate-100 rounded-3xl">
                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Memuat Presensi...</p>
                  </div>
                ) : attendanceLogs.length === 0 ? (
                  <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center px-4">
                    <span className="material-symbols-outlined text-[28px] text-slate-350">event_available</span>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mt-2">Tidak ada log presensi</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attendanceLogs.map((log, idx) => {
                      let statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-100";
                      if (log.status === 'Sakit') statusBadge = "bg-amber-50 text-amber-700 border-amber-100";
                      else if (log.status === 'Izin') statusBadge = "bg-sky-50 text-sky-700 border-sky-100";
                      else if (log.status === 'Alfa') statusBadge = "bg-rose-50 text-rose-700 border-rose-100";

                      return (
                        <div key={idx} className="bg-white px-4 py-3 rounded-2xl border border-slate-100 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all">
                          <div>
                            <p className="font-extrabold text-[12px] text-slate-800 leading-tight">{log.subject}</p>
                            <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mt-1">{formatDate(log.date)}</p>
                          </div>
                          <span className={`text-[9.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadge}`}>
                            {log.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ACCOUNT' && (
            <div className="space-y-5 animate-in fade-in duration-300 text-left">
              
              {/* Profil Card Baru (Premium & Modern) */}
              <div className="relative bg-gradient-to-br from-white to-slate-50/50 border border-slate-100 rounded-[2.5rem] p-6 shadow-xl shadow-slate-100/30 overflow-hidden text-center flex flex-col items-center">
                {/* Light reflection decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Avatar with gradient border */}
                <div className="relative group">
                  <div className={`w-20 h-20 rounded-[2rem] border-4 border-white shadow-md flex items-center justify-center text-3xl font-black tracking-tight shrink-0 overflow-hidden relative ${
                    isEmojiAvatar(currentAvatarUrl) 
                      ? `bg-gradient-to-br ${getGradientForEmoji(currentAvatarUrl)} text-white` 
                      : 'bg-slate-50 border border-slate-100'
                  }`}>
                    {currentAvatarUrl ? (
                      isEmojiAvatar(currentAvatarUrl) ? (
                        currentAvatarUrl
                      ) : (
                        <img src={currentAvatarUrl} alt={studentName} className="w-full h-full object-cover" />
                      )
                    ) : (
                      studentName.slice(0, 2).toUpperCase()
                    )}
                    {isAdmin ? (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer active:opacity-100 disabled:opacity-50"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                      </button>
                    ) : (
                      <button 
                        onClick={() => setShowAvatarModal(true)}
                        className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer active:opacity-100"
                      >
                        <Settings size={16} />
                      </button>
                    )}
                  </div>
                  {/* Floating edit button for avatar */}
                  {!isAdmin && (
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="absolute -bottom-1 -right-1 w-7.5 h-7.5 bg-white hover:bg-slate-50 text-indigo-600 rounded-full border border-slate-150 shadow-md flex items-center justify-center transition-all active:scale-90"
                      title="Ganti Avatar"
                    >
                      <Settings size={13} />
                    </button>
                  )}
                </div>

                {/* Profile Details */}
                <div className="mt-4 w-full">
                  <h3 className="font-extrabold text-[15px] text-slate-800 font-outfit tracking-tight leading-snug">{studentName}</h3>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    <span className="px-3 py-1 bg-slate-100 border border-slate-200/50 text-slate-500 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                      Kelas {className}
                    </span>
                    <span className="px-3 py-1 bg-indigo-50 border border-indigo-100/50 text-indigo-700 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                      ID: #{studentId.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  
                  {studentSummary?.email && (
                    <p className="text-[10px] text-indigo-650 font-bold mt-2.5 leading-none">
                      {studentSummary.email}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">Tahun Ajaran {academicYear}</p>
                </div>

                {/* Score Grid (Pelanggaran vs Kebaikan - Big Modern Blocks) */}
                <div className="grid grid-cols-2 gap-3 w-full mt-5 border-t border-slate-100/60 pt-4.5">
                  <div className="bg-rose-50/50 border border-rose-100/70 rounded-[1.8rem] p-3.5 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-rose-50 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-1.5 shrink-0">
                      <span className="material-symbols-outlined text-[16px]">gavel</span>
                    </div>
                    <span className="text-[18px] font-black leading-none text-rose-700 font-outfit">{totalDemerits}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-rose-500 mt-1.5">Pelanggaran</span>
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100/70 rounded-[1.8rem] p-3.5 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-emerald-50 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5 shrink-0">
                      <span className="material-symbols-outlined text-[16px]">award</span>
                    </div>
                    <span className="text-[18px] font-black leading-none text-emerald-700 font-outfit">{totalMerits}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mt-1.5">Kebaikan</span>
                  </div>
                </div>
              </div>

              {/* Unduh Berkas / Rapor */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unduh Berkas & Dokumen</h4>
                
                {isLoadingSummary ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-slate-400 bg-white border border-slate-100 rounded-3xl">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                    <p className="text-[9px] font-bold uppercase tracking-wider">Menyiapkan berkas...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentSummary?.documents?.map((doc: any) => (
                      <div key={doc.id} className={`bg-white p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all ${!doc.ready ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-slate-800 font-extrabold text-[12px] leading-tight truncate">{doc.name}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{doc.type} • {doc.size}</p>
                          </div>
                        </div>

                        {doc.ready ? (
                          <button 
                            onClick={() => handleDownloadDocument(doc.id, doc.name)}
                            disabled={downloadingDocId !== null}
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-600 transition-colors active:scale-95 disabled:opacity-50"
                            title={`Unduh ${doc.name}`}
                          >
                            {downloadingDocId === doc.id ? (
                              <Loader2 size={14} className="animate-spin text-indigo-600" />
                            ) : (
                              <DownloadCloud size={14} />
                            )}
                          </button>
                        ) : (
                          <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase shrink-0">
                            Segera
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Laporkan Bug */}
              <div className="space-y-2 pt-2 border-t border-slate-150/50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dukungan & Masalah</h4>
                <button 
                  onClick={() => setShowBugModal(true)}
                  className="w-full bg-white p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:bg-slate-50 transition-all active:scale-[0.99] group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-105 transition-transform">
                      <Bug size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-slate-800 font-extrabold text-[12px] leading-tight">Laporkan Bug / Kendala</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Kirim laporan error ke Telegram Admin</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Informasi & Legalitas */}
              <div className="space-y-2 pt-2 border-t border-slate-150/50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Informasi & Legalitas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowAboutModal(true)}
                    className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-2.5 items-start shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:bg-slate-50 transition-all active:scale-[0.99] group text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 group-hover:scale-105 transition-transform">
                      <Info size={16} />
                    </div>
                    <div>
                      <h4 className="text-slate-800 font-extrabold text-[12px] leading-tight">Tentang Platform</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Mengenal GradeMaster OS</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setShowTermsModal(true)}
                    className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-2.5 items-start shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:bg-slate-50 transition-all active:scale-[0.99] group text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-650 group-hover:scale-105 transition-transform">
                      <Scroll size={16} />
                    </div>
                    <div>
                      <h4 className="text-slate-800 font-extrabold text-[12px] leading-tight">Syarat & Ketentuan</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Aturan Penggunaan Sistem</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sesi Perangkat Aktif */}
              <div className="space-y-2 pt-2 border-t border-slate-150/50">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesi Perangkat Aktif</h4>
                  <button 
                    onClick={fetchActiveSessions}
                    disabled={isLoadingSessions}
                    className="text-slate-400 hover:text-slate-650 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={isLoadingSessions ? "animate-spin" : ""} />
                  </button>
                </div>
                
                {isLoadingSessions ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                    <p className="text-[9px] font-bold uppercase">Memuat sesi aktif...</p>
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="py-8 text-center bg-white border border-slate-100 rounded-3xl flex flex-col items-center justify-center shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Belum ada sesi tercatat</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar text-left">
                      {activeSessions.map((session) => {
                        const isMobile = /mobile|android|iphone|ipad/i.test(session.user_agent);
                        return (
                          <div key={session.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                session.is_current 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                  : 'bg-slate-50 border-slate-100 text-slate-500'
                              }`}>
                                {isMobile ? <Smartphone size={16} /> : <Laptop size={16} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-slate-800 font-extrabold text-[11px] leading-tight truncate">
                                    {getDeviceFromUserAgent(session.user_agent)}
                                  </h4>
                                  {session.is_current && (
                                    <span className="text-[7.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-100">
                                      Sesi Ini
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                  IP: {session.ip_address}
                                </p>
                              </div>
                            </div>
                            
                            {!session.is_current && (
                              <button
                                onClick={() => handleEndOtherSessions('specific', session.id)}
                                disabled={isEndingSessions}
                                className="w-7 h-7 rounded-lg hover:bg-rose-50 border border-slate-100 hover:border-rose-100 text-slate-400 hover:text-rose-550 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                                title="Keluarkan Perangkat Ini"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {activeSessions.filter(s => !s.is_current).length > 0 && (
                      <button
                        onClick={() => handleEndOtherSessions('all_other')}
                        disabled={isEndingSessions}
                        className="w-full py-2.5 bg-rose-50 border border-rose-100 text-rose-650 font-black uppercase tracking-widest text-[8.5px] rounded-xl hover:bg-rose-100/70 transition-colors active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isEndingSessions ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <LogOut size={12} />
                            Keluarkan Semua Perangkat Lain
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Riwayat Login */}
              <div className="space-y-2 pt-2 border-t border-slate-150/50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Riwayat Login Terakhir</h4>
                
                {isLoadingLoginLogs ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                    <p className="text-[9px] font-bold uppercase">Memuat riwayat login...</p>
                  </div>
                ) : loginLogs.length === 0 ? (
                  <div className="py-8 text-center bg-white border border-slate-100 rounded-3xl flex flex-col items-center justify-center shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Belum ada riwayat login</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
                    {loginLogs.map((log) => (
                      <div key={log.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <span className="material-symbols-outlined text-[18px]">devices</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-slate-800 font-extrabold text-[11px] leading-tight truncate">
                              {getDeviceFromUserAgent(log.user_agent)}
                            </h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                              IP: {log.ip_address}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide block">
                            {new Date(log.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-[8.5px] font-medium text-slate-450 block mt-0.5">
                            {new Date(log.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Manajemen Perilaku (Hanya Guru/Admin) */}
              {isAdmin && (
                <div className="space-y-3 pt-2 border-t border-slate-150/50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Manajemen Perilaku Siswa (Guru)</h4>
                  
                  {/* Form input */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm space-y-3.5">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Kejadian</label>
                      <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Tipe Catatan Switch */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Jenis Catatan Sikap</label>
                      <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setInputBehaviorType('BAD')}
                          className={`flex-1 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all ${
                            inputBehaviorType === 'BAD'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🔴 Pelanggaran
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputBehaviorType('GOOD')}
                          className={`flex-1 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all ${
                            inputBehaviorType === 'GOOD'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🟢 Kebaikan
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        {inputBehaviorType === 'BAD' ? 'Pilih Alasan Cepat (Pelanggaran)' : 'Pilih Alasan Cepat (Kebaikan & Apresiasi)'}
                      </label>
                      <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
                        {inputBehaviorType === 'BAD' ? (
                          localReasons.map(r => (
                            <button 
                              key={r.text} 
                              disabled={isUpdatingPoints}
                              onClick={() => handleAddBehavior(r.weight, r.text, false)} 
                              className="p-3 bg-slate-50 hover:bg-rose-50/50 border border-slate-100 hover:border-rose-100 rounded-xl text-left transition-all active:scale-98 flex items-center justify-between group"
                            >
                              <span className="text-[10.5px] font-bold text-slate-700 truncate group-hover:text-rose-900">{r.text}</span>
                              <span className="text-[9.5px] font-black text-rose-500 shrink-0">+{r.weight} Poin</span>
                            </button>
                          ))
                        ) : (
                          goodBehaviorPresets.map(r => (
                            <button 
                              key={r.text} 
                              disabled={isUpdatingPoints}
                              onClick={() => handleAddBehavior(r.weight, r.text, true)} 
                              className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-100 rounded-xl text-left transition-all active:scale-98 flex items-center justify-between group"
                            >
                              <span className="text-[10.5px] font-bold text-slate-700 truncate group-hover:text-emerald-900">{r.text}</span>
                              <span className="text-[9.5px] font-black text-emerald-600 shrink-0">+{r.weight} Poin</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Log Perilaku Lengkap Admin */}
                  <div className="space-y-2">
                    <h5 className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest px-1">Log Kedisiplinan Lengkap</h5>
                    
                    {isLoadingLogs ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white border border-slate-100 rounded-2xl">
                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                        <p className="text-[9px] font-bold uppercase">Memuat log...</p>
                      </div>
                    ) : studentLogs.length === 0 ? (
                      <div className="py-8 text-center bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center">
                        <p className="text-[10px] font-bold text-slate-450 uppercase">Belum ada catatan kelakuan</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {studentLogs.map((log) => (
                          <div key={log.id} className="bg-white border border-slate-100 rounded-2xl p-3.5 flex flex-col shadow-sm">
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-slate-800 text-[11.5px] leading-snug break-words">{log.reason}</h4>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                    {formatDate(log.violation_date || log.created_at)}
                                  </span>
                                  <span className={`text-[9.5px] font-black ${log.points_delta > 0 ? 'text-rose-500 bg-rose-50/50 px-1.5 py-0.5 rounded-md border border-rose-100/30' : 'text-emerald-700 bg-emerald-50/50 px-1.5 py-0.5 rounded-md border border-emerald-100/30'}`}>
                                    {log.points_delta > 0 ? `+${log.points_delta} Pelanggaran` : `+${Math.abs(log.points_delta)} Kebaikan`}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button 
                                  onClick={() => {
                                    setEditingLogId(log.id);
                                    setEditForm({ reason: log.reason, points: Math.abs(log.points_delta), date: (log.violation_date || log.created_at).split('T')[0] });
                                  }}
                                  className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 border border-slate-100 transition-colors"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteLog(log.id)}
                                  className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 hover:text-rose-700 border border-rose-100/50 transition-colors"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            {/* Form Edit Inline */}
                            {editingLogId === log.id && (
                              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Tanggal</label>
                                    <input 
                                      type="date" 
                                      value={editForm.date} 
                                      onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                      className="w-full mt-0.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold text-slate-800 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Bobot Poin</label>
                                    <input 
                                      type="number" 
                                      value={editForm.points} 
                                      onChange={(e) => setEditForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                                      className="w-full mt-0.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold text-slate-800 outline-none"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[8px] font-black text-slate-400 uppercase">Alasan Sikap</label>
                                  <input 
                                    type="text" 
                                    value={editForm.reason} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full mt-0.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold text-slate-800 outline-none"
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button 
                                    onClick={() => handleUpdateLog(log.id)} 
                                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Simpan
                                  </button>
                                  <button 
                                    onClick={() => setEditingLogId(null)} 
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[9.5px] font-bold uppercase transition-all"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Logout Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-[10.5px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all mt-6 active:scale-98 border border-rose-100/50 shadow-sm"
                >
                  <LogOut size={13} />
                  Keluar dari Aplikasi
                </button>
              )}
            </div>
          )}
        </main>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <StudentLessonLayer
              onBack={() => setActiveTab('HOME')}
              setToast={setToast}
              semester={semester}
              isTab={true}
            />
          </div>
        )}

        {/* Bottom Navigation Bar (Permanen) */}
        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-150 px-4 py-2.5 flex justify-around pb-safe shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
          <button 
            onClick={() => setActiveTab('HOME')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'HOME' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home size={19} className={activeTab === 'HOME' ? 'scale-105' : ''} />
            <span className="text-[9px] font-black uppercase tracking-wider">Beranda</span>
          </button>

          <button 
            onClick={() => setActiveTab('GRADES')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'GRADES' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BookOpen size={19} className={activeTab === 'GRADES' ? 'scale-105' : ''} />
            <span className="text-[9px] font-black uppercase tracking-wider">Nilai</span>
          </button>

          <button 
            onClick={() => setActiveTab('LESSON')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'LESSON' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <GraduationCap size={19} className={activeTab === 'LESSON' ? 'scale-105' : ''} />
            <span className="text-[9px] font-black uppercase tracking-wider">Pelajaran</span>
          </button>

          <button 
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'ATTENDANCE' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar size={19} className={activeTab === 'ATTENDANCE' ? 'scale-105' : ''} />
            <span className="text-[9px] font-black uppercase tracking-wider">Kehadiran</span>
          </button>

          <button 
            onClick={() => setActiveTab('ACCOUNT')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'ACCOUNT' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User size={19} className={activeTab === 'ACCOUNT' ? 'scale-105' : ''} />
            <span className="text-[9px] font-black uppercase tracking-wider">Akun</span>
          </button>
        </nav>

        {/* Modal Prestasi Siswa */}
        {showAchievementsModal && (
          <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[6px] animate-in fade-in duration-200">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] w-full max-w-sm sm:max-w-md max-h-[80%] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-250 pb-safe border border-slate-100">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-sm">
                    <Trophy size={16} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-extrabold text-slate-850 text-[14px] uppercase tracking-wider font-outfit">
                    Lencana Prestasi
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAchievementsModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-650 active:scale-95 transition-all border border-slate-200/40"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
                
                {/* Mascot Banner inside Modal */}
                <div className="relative bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-100/40 border border-indigo-100/50 rounded-2xl p-5 overflow-hidden flex items-center justify-between gap-4">
                  <div className="min-w-0 z-10 text-left">
                    <h4 className="text-indigo-950 font-black text-[12px] uppercase tracking-wide font-outfit">Prestasi Kamu</h4>
                    <p className="text-indigo-850 text-[11px] font-semibold mt-1 leading-snug">
                      Hebat! Kamu telah mengumpulkan <span className="font-black text-indigo-650">{badges.length} lencana</span> penghargaan semester ini.
                    </p>
                  </div>
                  <div className="w-16 h-16 shrink-0 relative select-none pointer-events-none">
                    <img 
                      src="/student-mascot.png" 
                      alt="Mascot Celebration" 
                      className="w-full h-full object-contain transform scale-110 translate-y-1 scale-x-[-1]" 
                    />
                  </div>
                </div>

                <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest px-1 text-left">Lencana Penghargaan Siswa</p>
                <div className="grid grid-cols-1 gap-3">
                  {badges.map((badge) => {
                    // Modern premium color styling overrides
                    let premiumColor = badge.color;
                    if (badge.id === 'gold_disc') {
                      premiumColor = 'from-amber-400 via-yellow-300 to-amber-500 text-yellow-950 border-amber-400/40 shadow-[0_10px_25px_-5px_rgba(245,158,11,0.15)]';
                    } else if (badge.id === 'silver_disc') {
                      premiumColor = 'from-indigo-500/10 via-purple-500/5 to-indigo-500/15 text-indigo-950 border-indigo-500/20 shadow-[0_8px_20px_-6px_rgba(79,70,229,0.08)]';
                    } else if (badge.id === 'perfect_pres') {
                      premiumColor = 'from-emerald-500/10 via-teal-500/5 to-emerald-500/15 text-emerald-950 border-emerald-500/20 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.08)]';
                    } else if (badge.id === 'perfect_score') {
                      premiumColor = 'from-amber-400 via-yellow-200 to-yellow-500 text-amber-950 border-yellow-400/50 shadow-[0_10px_25px_-5px_rgba(234,179,8,0.2)]';
                    } else if (badge.id === 'high_score') {
                      premiumColor = 'from-slate-100 via-slate-50 to-slate-200 text-slate-850 border-slate-300/50 shadow-[0_8px_20px_-6px_rgba(148,163,184,0.08)]';
                    } else if (badge.id === 'academic_star') {
                      premiumColor = 'from-violet-500/10 via-fuchsia-500/5 to-purple-500/15 text-purple-950 border-purple-500/20 shadow-[0_8px_20px_-6px_rgba(139,92,246,0.08)]';
                    } else if (badge.id === 'member') {
                      premiumColor = 'from-slate-50 via-slate-100/50 to-slate-100 text-slate-800 border-slate-200/60 shadow-[0_4px_12px_rgba(0,0,0,0.01)]';
                    }

                    return (
                      <div 
                        key={badge.id} 
                        className={`p-4 rounded-[1.8rem] border bg-gradient-to-r flex items-center gap-4 transition-all hover:scale-[1.01] ${premiumColor}`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white/40 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0 border border-white/20 shadow-sm">
                          {badge.icon}
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="font-extrabold text-[12.5px] tracking-tight leading-tight uppercase font-outfit">{badge.label}</h4>
                          <p className="text-[10px] font-semibold opacity-90 mt-1 leading-snug">{badge.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bug Report Modal */}
        {showBugModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-300 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                    <Bug size={18} />
                  </div>
                  <h3 className="font-extrabold text-[13px] uppercase tracking-wider text-slate-800 font-outfit">Laporkan Bug</h3>
                </div>
                <button 
                  onClick={() => { setShowBugModal(false); setBugDescription(''); }}
                  className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <p className="text-[9.5px] font-bold text-slate-400 leading-normal uppercase tracking-wide">
                Ceritakan masalah atau kendala sistem yang Anda temui. Laporan akan dikirim langsung ke Telegram Guru/Admin.
              </p>
              
              <textarea
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                placeholder="Contoh: Fitur presensi tidak bisa dibuka atau terjadi kesalahan saat mengunduh sertifikat..."
                rows={4}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-850 placeholder:text-slate-350 focus:outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all resize-none"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowBugModal(false); setBugDescription(''); }}
                  className="flex-1 py-3 border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9.5px] rounded-full hover:bg-slate-50 transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={handleSendBugReport}
                  disabled={isSendingBug || !bugDescription.trim()}
                  className="flex-1 py-3 bg-rose-600 text-white font-black uppercase tracking-widest text-[9.5px] rounded-full hover:bg-rose-700 transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-[0_10px_20px_rgba(225,29,72,0.2)]"
                >
                  {isSendingBug ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    'Kirim Bug'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tentang Platform Modal */}
        {showAboutModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-300 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650">
                    <Info size={18} />
                  </div>
                  <h3 className="font-extrabold text-[13px] uppercase tracking-wider text-slate-800 font-outfit">Tentang Platform</h3>
                </div>
                <button 
                  onClick={() => setShowAboutModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-medium">
                <p>
                  <strong>GradeMaster OS</strong> adalah sistem informasi sekolah dan manajemen kedisiplinan yang berfokus pada transparansi dan objektivitas data akademik serta perilaku siswa.
                </p>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                  <p className="text-[10px] font-black text-indigo-650 uppercase tracking-wider">Fitur Siswa & Orang Tua</p>
                  <ul className="space-y-1.5 list-none pl-0">
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500">📊</span>
                      <span><strong>Transparansi Nilai</strong>: Evaluasi pencapaian hasil belajar secara periodik.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500">🛡️</span>
                      <span><strong>Poin Disiplin</strong>: Rekaman lencana prestasi dan poin pelanggaran yang adil.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500">🤖</span>
                      <span><strong>Saran AI</strong>: Rekomendasi belajar personal untuk perbaikan nilai.</span>
                    </li>
                  </ul>
                </div>
                <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-wider">Version 4.6.2 (Stable Edition)</p>
              </div>

              <button
                onClick={() => setShowAboutModal(false)}
                className="w-full py-3 bg-[#0F172A] text-white font-black uppercase tracking-widest text-[9.5px] rounded-full hover:bg-slate-800 transition-colors active:scale-95 shadow-lg shadow-slate-200"
              >
                Tutup Informasi
              </button>
            </div>
          </div>
        )}

        {/* Syarat & Ketentuan Modal */}
        {showTermsModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-300 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-650">
                    <Scroll size={18} />
                  </div>
                  <h3 className="font-extrabold text-[13px] uppercase tracking-wider text-slate-800 font-outfit">Syarat & Ketentuan</h3>
                </div>
                <button 
                  onClick={() => setShowTermsModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="max-h-[280px] overflow-y-auto pr-1 space-y-3.5 text-xs text-slate-600 leading-relaxed font-medium scrollbar-thin">
                <p>
                  Dengan mengakses dan menggunakan sistem <strong>GradeMaster OS</strong>, Anda menyatakan bersetuju untuk tunduk pada aturan berikut:
                </p>
                <div className="space-y-3">
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5">
                    <h4 className="font-bold text-slate-800 text-[11px] mb-1">1. Privasi & Kerahasiaan Data</h4>
                    <p className="text-[11px]">Seluruh informasi akademis, kehadiran, dan poin kedisiplinan siswa dilindungi secara ketat. Pihak sekolah hanya menggunakan data ini untuk kepentingan bimbingan dan pelaporan hasil belajar resmi.</p>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5">
                    <h4 className="font-bold text-slate-800 text-[11px] mb-1">2. Keamanan Akses Akun</h4>
                    <p className="text-[11px]">Siswa wajib menjaga kerahasiaan tautan akun Google yang terintegrasi. Tindakan membagikan kredensial atau menyalahgunakan akun pihak lain merupakan pelanggaran tata tertib.</p>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5">
                    <h4 className="font-bold text-slate-800 text-[11px] mb-1">3. Kebijakan Integritas</h4>
                    <p className="text-[11px]">Setiap upaya memanipulasi data nilai, merekayasa logs kehadiran, atau meretas kelemahan sistem (exploits) akan terekam oleh audit log sistem dan diproses hukum/akademis.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full py-3 bg-[#0F172A] text-white font-black uppercase tracking-widest text-[9.5px] rounded-full hover:bg-slate-800 transition-colors active:scale-95 shadow-lg shadow-slate-200"
              >
                Saya Memahami & Menyetujui
              </button>
            </div>
          </div>
        )}

        {/* Pilih Avatar (Gamifikasi) Modal */}
        {showAvatarModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-300 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650">
                    <Trophy size={18} />
                  </div>
                  <h3 className="font-extrabold text-[13px] uppercase tracking-wider text-slate-800 font-outfit">Pilih Avatar</h3>
                </div>
                <button 
                  onClick={() => setShowAvatarModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Current Points Display */}
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/40 rounded-2xl p-4 border border-emerald-100/50 flex justify-between items-center">
                <div>
                  <h4 className="text-[10px] font-black text-emerald-950 uppercase tracking-wider">Poin Kebaikan Kamu</h4>
                  <p className="text-[10.5px] font-semibold text-emerald-850 mt-0.5">Kumpulkan poin kebaikan dari apresiasi karakter untuk membuka avatar.</p>
                </div>
                <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-black text-sm shadow-md shrink-0">
                  {totalMerits} P
                </div>
              </div>

              {/* Avatar Tier List */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {[
                  { emoji: '🌱', label: 'Rookie Disciple', points: 0, gradient: 'from-emerald-400 to-teal-500' },
                  { emoji: '📚', label: 'Academic Scholar', points: 50, gradient: 'from-indigo-400 to-violet-500' },
                  { emoji: '⚡', label: 'Discipline Champion', points: 100, gradient: 'from-amber-400 to-orange-500' },
                  { emoji: '🏆', label: 'Elite Master', points: 150, gradient: 'from-rose-400 to-pink-500' },
                  { emoji: '👑', label: 'GradeMaster Legend', points: 250, gradient: 'from-violet-500 via-fuchsia-500 to-pink-500' },
                ].map((tier) => {
                  const isUnlocked = totalMerits >= tier.points;
                  const isEquipped = currentAvatarUrl === tier.emoji;

                  return (
                    <div 
                      key={tier.emoji} 
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isEquipped 
                          ? 'border-indigo-200 bg-indigo-50/20' 
                          : 'border-slate-100 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-gradient-to-br ${tier.gradient} text-white shadow-sm relative ${
                          !isUnlocked ? 'opacity-40 grayscale' : ''
                        }`}>
                          {tier.emoji}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-slate-800 font-extrabold text-[12px] leading-tight truncate">{tier.label}</h4>
                          <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {tier.points === 0 ? 'Bebas' : `Butuh ${tier.points} Poin`}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isEquipped ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                            Aktif
                          </span>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => handleEquipAvatar(tier.emoji)}
                            disabled={isEquippingAvatar}
                            className="text-[9px] font-black uppercase tracking-widest text-white bg-indigo-650 hover:bg-indigo-750 px-3 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                          >
                            Gunakan
                          </button>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400" title="Terkunci">
                            <span className="text-[14px]">🔒</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Modal Peringkat Nilai Akademik Kelas — rendered outside overflow-hidden container for mobile compatibility */}
      {showGradesLeaderboard && (
        <div className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[6px] animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-250 border border-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                  <Trophy size={16} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-slate-855 text-[13px] uppercase tracking-wider font-outfit leading-none">
                    Peringkat Nilai Akademik
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider leading-none">
                    Detail Nilai Kelas
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowGradesLeaderboard(false);
                  setSelectedSessionId(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-655 active:scale-95 transition-all border border-slate-200/40"
              >
                <X size={14} />
              </button>
            </div>

            {/* Selector */}
            <div className="p-5 border-b border-slate-100/50 bg-slate-50/30 flex flex-col gap-2 shrink-0">
              <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest text-left">Pilih Ujian / Sesi Ujian</label>
              {classLeaderboard?.subjects && classLeaderboard.subjects.length > 0 ? (
                <select
                  value={selectedSessionId || ''}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-extrabold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-outfit"
                >
                  {classLeaderboard.subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.subject} ({sub.examType}) — Semester {sub.semester === 'Ganjil' ? '1' : '2'} — TA {sub.academicYear}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 rounded-xl text-center">
                  Belum ada sesi ujian terdaftar
                </div>
              )}
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 no-scrollbar">
              {(() => {
                const currentSession = classLeaderboard?.subjects?.find(sub => sub.id === selectedSessionId) 
                  || classLeaderboard?.subjects?.[0];

                if (!currentSession) {
                  return (
                    <div className="py-12 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl">
                      <span className="material-symbols-outlined text-[20px] text-slate-350">school</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Belum ada peringkat ujian tercatat</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 text-left">
                    {/* Active Info Banner */}
                    <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border border-indigo-100/50 rounded-2xl p-4 space-y-2">
                      <span className="text-[8.5px] font-black text-indigo-950 uppercase tracking-widest bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md inline-block">Info Sesi</span>
                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-bold block uppercase text-[8px] tracking-wider">Mata Pelajaran</span>
                          <span className="font-extrabold text-slate-800">{currentSession.subject}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase text-[8px] tracking-wider">Evaluasi</span>
                          <span className="font-extrabold text-indigo-755 uppercase">{currentSession.examType}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase text-[8px] tracking-wider">Semester</span>
                          <span className="font-extrabold text-slate-800">
                            {currentSession.semester === 'Ganjil' ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase text-[8px] tracking-wider">Tahun Ajaran</span>
                          <span className="font-extrabold text-slate-800 font-outfit">{currentSession.academicYear}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {currentSession.ranks.map((rank, idx) => {
                        const isSelf = studentName && rank.name && rank.name.toLowerCase() === studentName.toLowerCase();
                        const isTop3 = idx < 3;
                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;

                        return (
                          <div 
                            key={idx} 
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                              isSelf 
                                ? 'border-indigo-200 bg-indigo-50/30 ring-2 ring-indigo-500/20' 
                                : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black font-outfit text-[11px] shrink-0 ${
                                idx === 0 ? 'bg-amber-100 text-amber-800' :
                                idx === 1 ? 'bg-slate-200/70 text-slate-800' :
                                idx === 2 ? 'bg-amber-550/10 text-amber-955' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {medal ? medal : `#${idx + 1}`}
                              </div>
                              <div className="min-w-0">
                                <h4 className={`text-slate-800 text-[12px] leading-tight break-words whitespace-normal ${
                                  isSelf || isTop3 ? 'font-extrabold' : 'font-semibold'
                                }`}>
                                  {rank.name}
                                </h4>
                                {isSelf && (
                                  <span className="text-[8px] font-black text-indigo-650 uppercase tracking-widest bg-indigo-50/80 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                                    Kamu
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="bg-white border border-slate-200/80 px-3 py-1 rounded-xl font-black text-[11.5px] text-slate-855 font-outfit shadow-sm shrink-0">
                              {rank.score}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal Peringkat Perilaku Kelas — rendered outside overflow-hidden container for mobile compatibility */}
      {showBehaviorLeaderboard && (
        <div className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[6px] animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-250 border border-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                  <Activity size={16} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-slate-855 text-[13px] uppercase tracking-wider font-outfit leading-none">
                    Peringkat Perilaku Kelas
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider leading-none">
                    Poin Sikap & Kedisiplinan
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowBehaviorLeaderboard(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-655 active:scale-95 transition-all border border-slate-200/40"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-5 pt-4 pb-2 flex gap-2 shrink-0 border-b border-slate-50">
              <button
                onClick={() => setBehaviorLeaderboardTab('GOOD')}
                className={`flex-1 py-2.5 rounded-2xl font-black uppercase tracking-wider text-[10px] transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  behaviorLeaderboardTab === 'GOOD'
                    ? 'bg-emerald-650 text-white shadow-md shadow-emerald-100'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-[13px] leading-none">award</span>
                Poin Kebaikan
              </button>
              <button
                onClick={() => setBehaviorLeaderboardTab('BAD')}
                className={`flex-1 py-2.5 rounded-2xl font-black uppercase tracking-wider text-[10px] transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  behaviorLeaderboardTab === 'BAD'
                    ? 'bg-rose-650 text-white shadow-md shadow-rose-100'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-[13px] leading-none">gavel</span>
                Pelanggaran
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              {(() => {
                if (!classLeaderboard?.behaviorRanks || classLeaderboard.behaviorRanks.length === 0) {
                  return (
                    <div className="py-12 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl">
                      <span className="material-symbols-outlined text-[20px] text-slate-350">sentiment_neutral</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Belum ada data perilaku terdaftar</p>
                    </div>
                  );
                }

                const isGood = behaviorLeaderboardTab === 'GOOD';
                const sortedData = [...classLeaderboard.behaviorRanks].sort((a, b) => {
                  if (isGood) {
                    return b.merits - a.merits || (a.name || '').localeCompare(b.name || '');
                  } else {
                    return b.demerits - a.demerits || (a.name || '').localeCompare(b.name || '');
                  }
                });

                const totalPoints = classLeaderboard.behaviorRanks.reduce((sum, r) => sum + (isGood ? r.merits : r.demerits), 0);

                if (totalPoints === 0) {
                  if (isGood) {
                    return (
                      <div className="py-12 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl">
                        <span className="material-symbols-outlined text-[24px] text-slate-350">award</span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mt-2">
                          Data poin kebaikan belum ada
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <div className="py-12 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-emerald-50/20 border-emerald-100">
                        <span className="material-symbols-outlined text-[24px] text-emerald-500">verified</span>
                        <p className="text-[10.5px] font-black text-emerald-700 uppercase tracking-wide mt-2">
                          Semua siswa tertib
                        </p>
                        <p className="text-[9.5px] font-semibold text-slate-400 mt-1">
                          Belum ada catatan pelanggaran kelas
                        </p>
                      </div>
                    );
                  }
                }

                return (
                  <div className="space-y-2 text-left">
                    {sortedData.map((rank, idx) => {
                      const isSelf = studentName && rank.name && rank.name.toLowerCase() === studentName.toLowerCase();
                      const isTop3 = idx < 3;
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                      const pointsVal = isGood ? rank.merits : rank.demerits;

                      return (
                        <div 
                          key={idx} 
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                            isSelf 
                              ? isGood 
                                ? 'border-emerald-200 bg-emerald-50/20 ring-2 ring-emerald-500/10'
                                : 'border-rose-200 bg-rose-50/20 ring-2 ring-rose-500/10'
                              : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Rank */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black font-outfit text-[11px] shrink-0 ${
                              idx === 0 ? 'bg-amber-100 text-amber-800' :
                              idx === 1 ? 'bg-slate-200/70 text-slate-800' :
                              idx === 2 ? 'bg-amber-550/10 text-amber-955' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {medal ? medal : `#${idx + 1}`}
                            </div>

                            {/* Avatar Emoji */}
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-150 flex items-center justify-center text-sm shrink-0 shadow-sm">
                              {rank.avatarUrl || '👤'}
                            </div>

                            {/* Student Name */}
                            <div className="min-w-0">
                              <h4 className={`text-slate-800 text-[12px] leading-tight break-words whitespace-normal ${
                                isSelf || isTop3 ? 'font-extrabold' : 'font-semibold'
                              }`}>
                                {rank.name}
                              </h4>
                              {isSelf && (
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md mt-1 inline-block ${
                                  isGood ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                                }`}>
                                  Kamu
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Point Value */}
                          <div className={`px-3 py-1.5 rounded-xl font-black text-[11.5px] font-outfit shadow-sm shrink-0 border ${
                            isGood
                              ? 'bg-emerald-50/80 border-emerald-100 text-emerald-700'
                              : 'bg-rose-50/80 border-rose-100 text-rose-700'
                          }`}>
                            {isGood ? '+' : ''}{pointsVal} P
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
