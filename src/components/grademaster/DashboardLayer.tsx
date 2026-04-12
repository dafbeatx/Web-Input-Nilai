"use client";

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  Plus,
  User,
  Download,
  RefreshCcw,
  Trash2,
  Bell,
  AlertCircle,
  Eye,
  AlertOctagon,
  Users,
  Timer,
  Clock,
  Send,
  MonitorOff,
  Cpu,
  Edit2,
  Loader2,
  Globe
} from 'lucide-react';
import { GradedStudent, AnalyticsResult } from '@/lib/grademaster/types';
import { getCsiLabel, getLpsLabel } from '@/lib/grademaster/scoring';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import InsightPanel from './InsightPanel';
import { ShieldCheck, ThumbsUp, ThumbsDown, Trophy, Medal, Star, Send as SendIcon } from 'lucide-react';

interface BehaviorRecord {
  student_name: string;
  total_points: number;
  behavior_logs: { reason: string; points: number; type: string; date: string }[];
}

interface DashboardLayerProps {
  teacherName: string;
  subject: string;
  studentClass: string;
  schoolLevel: string;
  gradedStudents: GradedStudent[];
  analytics: AnalyticsResult;
  isPublicView?: boolean;
  sessionName?: string;
  kkm: number;
  remedialEssayCount: number;
  onGradeStudent: () => void;
  onStudentRemedial?: (name: string) => void;
  onBack: () => void;
  onReSync?: () => void;
  academicYear?: string;
  semester?: string;
  examType?: string;
  isDemo?: boolean;
  sessionId?: string;
  isAdmin?: boolean;
}

const CHART_COLORS = ['#e2e8f0', '#94a3b8', '#6366f1', '#818cf8', '#4f46e5'];
const PIE_COLORS = ['#10b981', '#f43f5e'];

// DEADLINE: Senin, 30 Maret 2026 Jam 07:00 WIB
const REMEDIAL_DEADLINE = new Date('2026-03-30T07:00:00+07:00').getTime();

export default function DashboardLayer({
  teacherName,
  subject,
  studentClass,
  schoolLevel,
  gradedStudents,
  analytics,
  isPublicView,
  sessionName,
  kkm,
  remedialEssayCount,
  onGradeStudent,
  onStudentRemedial,
  onBack,
  onReSync,
  academicYear,
  semester,
  examType,
  isDemo,
  sessionId,
  isAdmin = false
}: DashboardLayerProps) {
  const [behaviorMap, setBehaviorMap] = useState<Record<string, BehaviorRecord>>({});
  const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);
  const [similarityReports, setSimilarityReports] = useState<any[] | null>(null);
  const [similarityMetadata, setSimilarityMetadata] = useState<{ totalStudents: number, totalPairs: number } | null>(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [isResettingRemedial, setIsResettingRemedial] = useState(false);

  const handleStartRemedial = (name: string, currentScore: number) => {
    const isPastDeadline = Date.now() > REMEDIAL_DEADLINE;
    
    if (isPastDeadline) {
      setShowDeadlineModal(true);
      return;
    }

    fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: name,
        className: studentClass,
        subject,
        event: 'ACTIVITY',
        message: `📝 Siswa menekan tombol "Mulai Remedial" (Nilai saat ini: ${currentScore}, KKM: ${kkm})`,
        academicYear,
        examType,
      })
    }).catch(() => {});
    onStudentRemedial?.(name);
  };

  useEffect(() => {
    if (!studentClass || !isPublicView) return;
    const year = academicYear || '2025/2026';
    fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(studentClass)}&year=${encodeURIComponent(year)}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, BehaviorRecord> = {};
        (data.students || []).forEach((s: BehaviorRecord) => {
          map[s.student_name.toLowerCase()] = s;
        });
        setBehaviorMap(map);
      })
      .catch(() => {});
  }, [studentClass, academicYear, isPublicView]);

  const getBehavior = (name: string): BehaviorRecord | null => {
    return behaviorMap[name.toLowerCase()] || null;
  };

  const getBehaviorLabel = (points: number): string => {
    if (points >= 100) return 'Sangat Baik';
    if (points >= 80) return 'Baik';
    if (points >= 60) return 'Cukup';
    if (points >= 40) return 'Kurang';
    return 'Sangat Kurang';
  };

  const getBehaviorSummary = (logs: BehaviorRecord['behavior_logs']): { good: string[]; bad: string[] } => {
    const good: string[] = [];
    const bad: string[] = [];
    const seen = new Set<string>();
    for (const log of logs) {
      if (seen.has(log.reason)) continue;
      seen.add(log.reason);
      if (log.points > 0) good.push(log.reason);
      else bad.push(log.reason);
    }
    return { good: good.slice(0, 3), bad: bad.slice(0, 3) };
  };
  const handleExportXML = () => {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<Report>\n`;
    
    let xml = xmlHeader + `  <SchoolIdentity>\n`;
    xml += `    <SessionName>${sessionName || 'Sesi'}</SessionName>\n`;
    const tagMatch = (sessionName || '').match(/UTS|UAS|USBN|UN|PAT|PAS/i);
    const tag = tagMatch ? tagMatch[0].toUpperCase() : 'UJIAN';
    xml += `    <Tag>${tag}</Tag>\n`;
    xml += `    <SchoolLevel>${schoolLevel}</SchoolLevel>\n`;
    xml += `    <Teacher>${teacherName}</Teacher>\n`;
    xml += `    <Subject>${subject}</Subject>\n`;
    xml += `    <Class>${studentClass}</Class>\n`;
    xml += `  </SchoolIdentity>\n`;

    xml += `  <Statistics>\n`;
    xml += `    <Mean>${analytics.avgScore}</Mean>\n`;
    xml += `    <Median>${analytics.median}</Median>\n`;
    xml += `    <Max>${analytics.highestScore}</Max>\n`;
    xml += `    <Min>${analytics.lowestScore}</Min>\n`;
    xml += `  </Statistics>\n`;

    xml += `  <Students>\n`;
    gradedStudents.forEach(s => {
      xml += `    <Student>\n`;
      xml += `      <Name>${s.name}</Name>\n`;
      xml += `      <Score>${s.finalScore}</Score>\n`;
      xml += `    </Student>\n`;
    });
    xml += `  </Students>\n`;

    xml += `  <DistributionGraph>\n`;
    analytics.distribution.forEach(d => {
      xml += `    <Range name="${d.range}" count="${d.count}" />\n`;
    });
    xml += `  </DistributionGraph>\n`;
    
    xml += `</Report>`;

    const blob = new Blob([xml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Nilai_${tag}_${studentClass}_${subject.replace(/\\s+/g, '_')}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSemester = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('PAS') || t.includes('GANJIL') || (t.includes('UTS') && !t.includes('GENAP'))) return 'Ganjil';
    if (t.includes('PAT') || t.includes('GENAP')) return 'Genap';
    return '-';
  };
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDeleteStudent = async (name: string) => {
    const student = gradedStudents.find(s => s.name === name);
    if (!student) return;
    
    if (!window.confirm(`Yakin ingin menghapus data siswa "${name}"?\nTindakan ini tidak dapat dibatalkan (soft delete).`)) return;

    setIsDeleting(student.id);
    try {
      const res = await fetch('/api/grademaster/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id })
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      alert('Siswa berhasil dihapus');
      window.location.reload(); 
    } catch (err) {
      alert('Gagal menghapus siswa. Silakan coba lagi.');
    } finally {
      setIsDeleting(null);
    }
  };

  const [isEditingScore, setIsEditingScore] = useState<string | null>(null);
  const handleEditScore = async (studentId: string, currentScore: number) => {
    const newScoreStr = window.prompt("Ubah Nilai Akhir Siswa (0-100):\n\nCatatan: Perubahan nilai ini bersifat manual/override.", currentScore.toString());
    if (newScoreStr === null) return; // cancelled
    
    const newScore = parseInt(newScoreStr);
    if (isNaN(newScore) || newScore < 0 || newScore > 100) {
      alert("Nilai tidak valid! Harus berupa angka 0-100.");
      return;
    }

    setIsEditingScore(studentId);
    try {
      const res = await fetch('/api/grademaster/students/score', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, newScore })
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Gagal mengubah nilai');
      }
      
      window.location.reload(); 
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setIsEditingScore(null);
    }
  };

  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const handleResetDemo = async () => {
    if (!sessionId || !isDemo) return;
    if (!window.confirm("Yakin ingin menghapus SEMUA data siswa pada sesi demo ini?\nTindakan ini akan mengosongkan leaderboard dan hasil simulasi.")) return;
    
    setIsResettingDemo(true);
    try {
      const res = await fetch('/api/grademaster/students/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Gagal mereset demo');
      }
      alert('Data simulasi berhasil di-reset!');
      window.location.reload();
    } catch (err: any) {
      alert(`Gagal mereset: ${err.message}`);
    } finally {
      setIsResettingDemo(false);
    }
  };

  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedDemo = async () => {
    if (!sessionId || !isDemo) return;
    setIsSeeding(true);
    try {
      const res = await fetch('/api/grademaster/students/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Gagal menanam data');
      }
      alert('Data simulasi berhasil ditanam!');
      window.location.reload();
    } catch (err: any) {
      alert(`Gagal menanam: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCheckSimilarity = async () => {
    if (!sessionId) return;
    setIsCheckingSimilarity(true);
    try {
      const res = await fetch(`/api/grademaster/sessions/${sessionId}/similarity`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (data.reports && data.reports.length > 0) {
        setSimilarityReports(data.reports);
        setSimilarityMetadata(data.metadata || null);
      } else {
        alert('Analisis selesai. Tidak ditemukan kemiripan jawaban yang mencurigakan antar siswa (Semua berstatus SAFE).');
        setSimilarityReports([]);
      }
    } catch (err: any) {
      alert(`Gagal menganalisis kemiripan: ${err.message}`);
    } finally {
      setIsCheckingSimilarity(false);
    }
  };

  const [isReporting, setIsReporting] = useState(false);
  const handleReportToTelegram = async () => {
    const unfinished = gradedStudents.filter(s => s.finalScore < kkm);
    
    if (unfinished.length === 0) {
      alert("Semua siswa sudah tuntas (di atas KKM)!");
      return;
    }

    setIsReporting(true);
    let message = `lapor bos ini data data siswa yang belum remed\n\n`;
    message += `📚 Kelas: ${studentClass}\n`;
    message += `📅 Tahun Ajaran: ${academicYear || '2025/2026'}\n`;
    message += `📖 Mata Pelajaran: ${subject}\n\n`;
    message += `📋 Daftar Siswa (${unfinished.length} orang):\n`;
    
    unfinished.forEach((s, i) => {
      message += `${i + 1}. ${s.name} - Nilai: ${s.finalScore}\n`;
    });
    
    message += `\n⚠️ Peringatan: Batas waktu remedial segera berakhir (Batas: 30 Maret 2026, 07:00 WIB). Nilai akan menjadi 0 jika tidak segera dikerjakan!`;

    try {
      const res = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'REPORT',
          message: message,
          studentName: 'KIRIM_LAPOR_BOS',
          className: studentClass,
          subject: subject
        })
      });
      if (res.ok) alert("Laporan berhasil dikirim ke Telegram!");
      else throw new Error("Gagal mengirim");
    } catch (err) {
      alert("Gagal mengirim laporan ke Telegram.");
    } finally {
      setIsReporting(false);
    }
  };

  const handleResetRemedial = async () => {
    if (!window.confirm(`PERHATIAN: Tindakan ini akan mengubah semua nilai siswa yang di bawah KKM (${kkm}) menjadi 0.\n\nSiswa yang sudah lulus tidak akan terpengaruh.\n\nLanjutkan?`)) return;
    
    setIsResettingRemedial(true);
    try {
      const res = await fetch('/api/grademaster/students/reset-remedial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, kkm })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      
      alert("Skor remedial berhasil direset ke 0. Halaman akan dimuat ulang.");
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Gagal mereset skor");
    } finally {
      setIsResettingRemedial(false);
    }
  };

  const RemedialCountdown = ({ targetDate }: { targetDate: string }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    useEffect(() => {
      const timer = setInterval(() => {
        const diff = new Date(targetDate).getTime() - new Date().getTime();
        if (diff <= 0) {
          clearInterval(timer);
          return;
        }
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        });
      }, 1000);
      return () => clearInterval(timer);
    }, [targetDate]);
    return (
      <div className="flex gap-2">
        {[
          { label: 'Hari', val: timeLeft.days },
          { label: 'Jam', val: timeLeft.hours },
          { label: 'Menit', val: timeLeft.minutes },
          { label: 'Detik', val: timeLeft.seconds }
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center bg-slate-900/60 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10">
            <span className="text-lg font-black text-white">{item.val.toString().padStart(2, '0')}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-transparent text-white p-3 sm:p-5 lg:p-8 w-full max-w-5xl mx-auto px-4 md:px-6 animate-in fade-in min-h-screen pb-20">
      {isPublicView && (
        <div className="mb-4 flex items-center gap-2.5 px-4 py-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl animate-in fade-in duration-500">
          <Globe size={14} className="text-emerald-400 shrink-0" />
          <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Nilai ini dapat dilihat oleh umum</span>
        </div>
      )}
      <header className="mb-8 md:mb-10 text-center pt-4">
        <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1 md:px-4 md:py-1.5 bg-primary/10 text-primary rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-3 md:mb-4 border border-primary/20">
          <LayoutGrid size={12} className="md:w-3.5 md:h-3.5" /> Dashboard Analitik
        </div>
        <h1 className="text-xl md:text-4xl font-black text-white tracking-tight font-headline mb-2 md:mb-3">
          {isPublicView ? 'Hasil Evaluasi Siswa' : 'Ikhtisar Kelas'}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
           {isDemo && (
             <DarkBadge color="amber"><span className="flex items-center gap-1">🧪 DEMO MODE</span></DarkBadge>
           )}
           <DarkBadge color="emerald">Kelas {studentClass} ({schoolLevel})</DarkBadge>
           <DarkBadge color="amber">{academicYear || '2025/2026'}</DarkBadge>
           <DarkBadge color="indigo">Semester {semester || getSemester(sessionName || '')}</DarkBadge>
           <DarkBadge color="slate">{subject}</DarkBadge>
        </div>
        {!isPublicView && (
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pusat Data: {teacherName}</p>
        )}
        {!isPublicView && (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
             {isDemo && (gradedStudents.length === 0 || analytics.avgScore === 0) && (
               <button 
                 onClick={handleSeedDemo}
                 disabled={isSeeding}
                 className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
               >
                 <Plus size={14} className={isSeeding ? "animate-spin" : ""} />
                 {isSeeding ? "Menanam..." : "Tanam Data Demo"}
               </button>
             )}
             {!isPublicView && isAdmin && (
               <button 
                onClick={handleResetRemedial}
                disabled={isResettingRemedial}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-rose-500/20 disabled:opacity-50"
               >
                 {isResettingRemedial ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Reset Remedial ke 0
               </button>
             )}
          </div>
        )}
      </header>

      {/* Top 3 Siswa */}
      {gradedStudents.length >= 3 && analytics.ranking.length >= 3 && (
        <div className="mb-6 md:mb-10 animate-in slide-in-from-bottom-4 fade-in">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 md:mb-6 text-center">🏆 Bintang Kelas (Top 3)</h3>
          <div className="flex flex-col md:flex-row items-end justify-center gap-3 md:gap-6 max-w-3xl mx-auto">
            {/* Juara 2 */}
            <div className="order-2 md:order-1 flex-1 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 text-center transform md:-translate-y-4 hover:-translate-y-6 transition-transform relative w-full min-w-0 shadow-2xl">
              <div className="w-10 h-10 md:w-16 md:h-16 mx-auto bg-slate-800/50 border border-white/10 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-2 md:mb-4">🥈</div>
              <h4 className="font-bold text-slate-300 text-sm md:text-lg truncate px-1">{analytics.ranking.length > 1 ? analytics.ranking[1].name : '-'}</h4>
              <p className="text-white font-black text-lg md:text-xl mt-1">{analytics.ranking.length > 1 ? analytics.ranking[1].finalScore : 0}</p>
            </div>
            {/* Juara 1 */}
            <div className="order-1 md:order-2 flex-1 bg-gradient-to-b from-amber-500/20 to-amber-600/10 border border-amber-500/20 rounded-2xl md:rounded-3xl p-4 md:p-6 text-center transform md:-translate-y-8 hover:-translate-y-10 transition-transform relative z-10 w-full mb-2 md:mb-0 min-w-0">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center gap-1"><Trophy size={12}/> Juara 1</div>
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-2 md:mb-3">🥇</div>
              <h4 className="font-black text-amber-300 text-sm md:text-lg truncate px-1">{analytics.ranking.length > 0 ? analytics.ranking[0].name : '-'}</h4>
              <p className="text-amber-400 font-black text-xl md:text-2xl mt-1">{analytics.ranking.length > 0 ? analytics.ranking[0].finalScore : 0}</p>
            </div>
            {/* Juara 3 */}
            <div className="order-3 md:order-3 flex-1 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 text-center transform hover:-translate-y-2 transition-transform relative w-full min-w-0 shadow-2xl">
              <div className="w-10 h-10 md:w-16 md:h-16 mx-auto bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-2 md:mb-4">🥉</div>
              <h4 className="font-bold text-orange-300 text-sm md:text-lg truncate px-1">{analytics.ranking.length > 2 ? analytics.ranking[2].name : '-'}</h4>
              <p className="text-orange-400 font-black text-lg md:text-2xl mt-1">{analytics.ranking.length > 2 ? analytics.ranking[2].finalScore : 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-10">
        <DarkProgressCard label="Nilai Rata-rata Kelas" value={analytics.avgScore} max={100} />
        <DarkProgressCard label="Kemampuan Belajar" value={analytics.avgCsi} max={100} />
        <DarkProgressCard label="Tingkat Pemahaman" value={analytics.avgLps} max={100} />
        <DarkProgressCard label="Konsistensi Nilai" value={Math.max(0, 100 - (analytics.standardDeviation * 2))} max={100} isConsistency={true} realValue={analytics.standardDeviation} />
      </div>

      {/* Question Difficulty Heatmap (Public/Student View) */}
      {isPublicView && analytics.questionDifficulties.length > 0 && (
        <section className="mb-6 md:mb-10">
          <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-lg font-black font-headline leading-tight tracking-tight">Peta Kesulitan<br/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grid Soal 1-{Math.min(analytics.questionDifficulties.length, 40)}</span></h2>
            <div className="flex gap-1 items-center">
              <span className="text-[8px] text-slate-500 mr-1">Mudah</span>
              <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10"></div>
              <div className="w-3 h-3 rounded-sm bg-primary/30"></div>
              <div className="w-3 h-3 rounded-sm bg-primary/60"></div>
              <div className="w-3 h-3 rounded-sm bg-primary"></div>
              <span className="text-[8px] text-slate-500 ml-1">Sulit</span>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4">
            <div className="grid grid-cols-8 gap-2">
              {analytics.questionDifficulties.slice(0, 40).map((q, i) => {
                let intensity = 'bg-white/5';
                if (q.difficultyPercent >= 75) intensity = 'bg-primary ring-1 ring-white/20 shadow-lg shadow-primary/20';
                else if (q.difficultyPercent >= 50) intensity = 'bg-primary/80';
                else if (q.difficultyPercent >= 25) intensity = 'bg-primary/40';
                else if (q.difficultyPercent > 0) intensity = 'bg-primary/20';
                return (
                  <div key={i} className={`aspect-square rounded-lg ${intensity} flex items-center justify-center text-[8px] font-black tracking-tight ${q.difficultyPercent >= 25 ? 'text-white' : 'text-slate-500'}`}
                    title={`Soal ${q.questionNumber}: ${q.difficultyPercent}% Salah - ${q.label}`}>
                    {q.questionNumber}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* AI Auto-Insights (Public/Student View) */}
      {isPublicView && analytics.insights.length > 0 && (
        <section className="mb-6 md:mb-10">
          <h2 className="text-lg font-black font-headline mb-4 px-1 flex items-center gap-2 tracking-tight">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            AI Auto-Insights
          </h2>
          <div className="space-y-3">
            {analytics.insights.map((insight, idx) => {
              const border = insight.type === 'warning' ? 'border-l-amber-500' : insight.type === 'success' ? 'border-l-emerald-500' : 'border-l-primary';
              const icon = insight.type === 'warning' ? 'warning' : insight.type === 'success' ? 'check_circle' : 'info';
              const iconColor = insight.type === 'warning' ? 'text-amber-500' : insight.type === 'success' ? 'text-emerald-500' : 'text-primary';
              return (
                <div key={idx} className={`bg-slate-900/40 backdrop-blur-xl border border-white/10 border-l-4 ${border} p-4 rounded-2xl flex gap-3 items-start`}>
                  <span className={`material-symbols-outlined ${iconColor} text-xl mt-0.5`}>{icon}</span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest mb-1 text-white">{insight.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Insights (Admin View) */}
      {!isPublicView && analytics.insights.length > 0 && (
        <InsightPanel insights={analytics.insights} />
      )}

      {/* Charts Row */}
      {gradedStudents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-10">
          {/* Distribution Histogram */}
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 md:p-6 border border-white/10 col-span-1">
            <h4 className="text-base md:text-lg font-black text-white mb-2">Persebaran Nilai Kelas</h4>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">Jumlah siswa yang mendapatkan nilai pada rentang tertentu.</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.distribution} margin={{ left: -25, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val: string) => val.split(' ')[0]} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc', opacity: 0.1 }} contentStyle={{ fontSize: 14, borderRadius: 16, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', color: '#0f172a' }} />
                <Bar dataKey="count" name="Siswa" radius={[6, 6, 6, 6]} barSize={36}>
                  {analytics.distribution.map((d, i) => (
                    <Cell key={i} fill={d.range.includes('Sangat Baik') ? '#10b981' : d.range.includes('Baik') ? '#3b82f6' : d.range.includes('Cukup') ? '#f59e0b' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Question Difficulty / Analisis Per Soal */}
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 md:p-6 border border-white/10 col-span-1 lg:col-span-2">
            <h4 className="text-base md:text-lg font-black text-white mb-2">Tingkat Kesulitan Tiap Soal</h4>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">Grafik yang menunjukkan persentase siswa yang <b>salah menjawab</b> soal tertentu.</p>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-full md:flex-1 overflow-x-auto pb-2 custom-scrollbar">
                <div className="min-w-[400px] md:min-w-0">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.questionDifficulties} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                    <XAxis dataKey="questionNumber" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc', opacity: 0.1 }}
                      contentStyle={{ fontSize: 14, borderRadius: 16, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#0f172a' }} 
                      formatter={(value: any) => [`${value}% salah`, 'Tingkat Kesulitan']}
                      labelFormatter={(label) => `Soal Nomor ${label}`}
                    />
                    <Bar dataKey="difficultyPercent" name="% Salah" radius={[4, 4, 4, 4]}>
                      {analytics.questionDifficulties.map((d, i) => (
                        <Cell key={i} fill={d.difficultyPercent >= 75 ? '#f43f5e' : d.difficultyPercent >= 50 ? '#f59e0b' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
              
              {/* Highlight Soal Tersulit */}
              <div className="w-full md:w-64 shrink-0">
                {(() => {
                  const hardest = [...analytics.questionDifficulties].sort((a,b) => b.difficultyPercent - a.difficultyPercent)[0];
                  if (hardest && hardest.difficultyPercent > 0) {
                    return (
                      <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                        <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mb-3 text-rose-400">
                          <Star size={20} fill="currentColor" />
                        </div>
                        <h5 className="font-black text-rose-300 text-sm mb-1">Fokus Perbaikan</h5>
                        <p className="text-xs font-bold text-rose-200 leading-relaxed">
                          Soal <b>Nomor {hardest.questionNumber}</b> paling banyak dijawab salah ({hardest.difficultyPercent}% siswa).
                        </p>
                        <p className="text-[10px] text-rose-400 font-bold mt-2 leading-relaxed opacity-80">Rekomendasi: Bahas ulang materi terkait soal ini di pertemuan berikutnya agar siswa lebih paham.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mb-3 text-emerald-400">
                        <ThumbsUp size={20} />
                      </div>
                      <h5 className="font-black text-emerald-300 text-sm mb-1">Semua Terkendali</h5>
                      <p className="text-xs font-bold text-emerald-200 leading-relaxed">
                        Siswa dapat menjawab seluruh soal dengan sangat baik. Pertahankan!
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ranking Table */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 md:p-6 border border-white/10 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h3 className="text-base md:text-lg font-black text-white font-headline">Daftar Lengkap Nilai Siswa</h3>
            <p className="text-[10px] md:text-xs font-bold text-slate-400">
              Total: {gradedStudents.length} siswa terdaftar
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            <button
              onClick={handleExportXML}
              className="px-3 md:px-4 py-2 bg-white/5 text-slate-300 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 md:gap-2 border border-white/10"
            >
              <Download size={14} /> Ekspor Data
            </button>
            {!isPublicView && (
              <>
                <button
                  onClick={onReSync}
                  className="px-3 md:px-4 py-2 bg-amber-500/10 text-amber-400 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5 md:gap-2 border border-amber-500/20"
                  title="Hitung ulang semua nilai berdasarkan kunci jawaban terbaru"
                >
                  <RefreshCcw size={14} /> Sinkron Nilai
                </button>
                <button
                  onClick={handleCheckSimilarity}
                  disabled={isCheckingSimilarity}
                  className="px-3 md:px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-1.5 md:gap-2 disabled:opacity-50 border border-rose-500/20"
                  title="Deteksi Kecurangan Berjamaah (Kemiripan Jawaban)"
                >
                  {isCheckingSimilarity ? <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" /> : <Eye size={14} />} 
                  Deteksi Kemiripan
                </button>
                <button
                  onClick={handleReportToTelegram}
                  disabled={isReporting}
                  className="px-3 md:px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 md:gap-2 disabled:opacity-50 border border-emerald-500/20"
                  title="Kirim daftar siswa belum remed ke Telegram Admin"
                >
                  {isReporting ? <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Send size={14} />} 
                  Lapor Bos!
                </button>
                <button
                  onClick={onGradeStudent}
                  className="px-3 md:px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5 md:gap-2 border border-primary/20"
                >
                  <Plus size={14} /> Koreksi Manual
                </button>
              </>
            )}
          </div>
        </div>

        {/* Remedial Announcement Banner */}
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col md:flex-row items-center md:items-start gap-4 animate-in zoom-in-95 overflow-hidden group">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xl shadow-primary/20 group-hover:rotate-12 transition-transform">
            <Bell size={24} className="animate-bounce" />
          </div>
          <div className="flex-1 text-center md:text-left">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                  🚀 Pengumuman Remedial Penting!
                </h4>
                <div className="flex items-center justify-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Live Countdown</span>
                </div>
             </div>
             
             <p className="text-xs font-bold text-slate-300 leading-relaxed mb-4">
                Batas waktu pengerjaan remedial telah ditetapkan. Pastikan seluruh siswa menyelesaikan tugas sebelum waktu habis.
                Sistem akan menutup akses secara <b className="text-rose-400">permanen</b> tepat pada waktunya.
             </p>

             <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-3 mb-5">
                <RemedialCountdown targetDate="2026-03-30T07:00:00+07:00" />
             </div>

             <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-rose-500/10 backdrop-blur-md rounded-xl border border-rose-500/20">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 animate-pulse">
                   <AlertCircle size={18} />
                </div>
                <div className="flex-1 text-xs font-black text-rose-400 uppercase tracking-tight text-center sm:text-left">
                   KONSEKUENSI: NILAI AKAN <span className="underline decoration-2 underline-offset-4 decoration-rose-400">0 (NOL)</span> & <span className="underline decoration-2 underline-offset-4 decoration-rose-400">-10 POIN PERILAKU</span> TANPA TOLERANSI!
                </div>
             </div>
          </div>
        </div>

        {gradedStudents.length === 0 ? (
          <div className="text-center py-8 md:py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <User size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 font-bold text-sm">Belum ada nilai yang dimasukkan.</p>
            {!isPublicView && (
              <p className="text-slate-500 text-[10px] mt-1.5">Mulai koreksi siswa untuk melihat rekapan nilai di sini.</p>
            )}
          </div>
        ) : (
          <>
            {/* Mobile View (Card List) */}
            <div className="md:hidden space-y-3">
              {analytics.ranking.map(r => (
                <div key={r.rank} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border ${r.rank <= 3 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                        {r.rank}
                      </span>
                      <span className="text-sm font-black text-slate-200 truncate max-w-[140px] uppercase tracking-tight">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-black border ${r.finalScore >= kkm ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {r.finalScore}
                      </div>
                      {!isPublicView && (
                        <button
                          onClick={() => handleEditScore(gradedStudents.find(s => s.name === r.name)?.id as string, r.finalScore)}
                          disabled={isEditingScore === gradedStudents.find(s => s.name === r.name)?.id}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors border border-transparent hover:border-primary/20"
                        >
                          {isEditingScore === (gradedStudents.find(s => s.name === r.name)?.id) ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Edit2 size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                    {isPublicView ? (
                      r.finalScore < kkm ? (
                        ['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(r.remedialStatus || '') ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-rose-400 text-[8px] font-black uppercase tracking-widest line-through opacity-50">Perlu Bimbingan</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              r.remedialStatus === 'COMPLETED' ? 'text-indigo-500' : 
                              r.remedialStatus === 'CHEATED' ? 'text-rose-500' : 'text-amber-500'
                            }`}>
                              {r.remedialStatus === 'COMPLETED' ? 'Selesai ✨' : 
                               r.remedialStatus === 'CHEATED' ? 'Diskualifikasi 🚫' : 'Waktu Habis ⏰'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-rose-500 text-[9px] font-black uppercase tracking-widest">Perlu Bimbingan</span>
                            <button 
                              onClick={() => handleStartRemedial(r.name, r.finalScore)} 
                              className="px-3 py-2 bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm shadow-rose-200 active:scale-95 flex items-center gap-1.5 min-h-[36px]"
                            >
                              <Plus size={12} /> Mulai Remedial
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-emerald-500 text-xs font-black uppercase tracking-widest">Tuntas ✨</span>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        {r.finalScore < kkm ? (
                          ['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(r.remedialStatus || '') ? (
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              r.remedialStatus === 'COMPLETED' ? 'text-indigo-500' : 
                              r.remedialStatus === 'CHEATED' ? 'text-rose-500' : 'text-amber-500'
                            }`}>
                              {r.remedialStatus === 'COMPLETED' ? 'Selesai ✨' : 
                               r.remedialStatus === 'CHEATED' ? 'Diskualifikasi 🚫' : 'Waktu Habis ⏰'}
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleStartRemedial(r.name, r.finalScore)} 
                              className="px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-500/20 active:scale-95 flex items-center gap-1.5 hover:bg-rose-500 hover:text-white transition-all"
                            >
                              <Plus size={10} /> Mulai Remedial
                            </button>
                          )
                        ) : (
                          <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Lulus KKM</span>
                        )}
                        <button 
                          onClick={() => handleDeleteStudent(r.name)}
                          disabled={isDeleting === (gradedStudents.find(s => s.name === r.name)?.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
                          title="Hapus Data Siswa"
                        >
                          {isDeleting === (gradedStudents.find(s => s.name === r.name)?.id) ? <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-white/10">
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Rank</th>
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nama Siswa</th>
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nilai Akhir</th>
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{isPublicView ? "Status Tuntas" : "Keterangan"}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.ranking.map(r => (
                    <tr key={r.rank} className={`border-b border-white/5 hover:bg-white/5 transition-colors`}>
                      <td className="py-3.5 text-xs font-black text-slate-400 pl-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border ${r.rank <= 3 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-white/5 text-slate-600 border-white/5'}`}>{r.rank}</span>
                      </td>
                      <td className="py-3.5 text-xs font-bold text-slate-300">{r.name}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${r.finalScore >= kkm ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {r.finalScore}
                          </span>
                          {!isPublicView && (
                            <button
                              onClick={() => handleEditScore(gradedStudents.find(s => s.name === r.name)?.id as string, r.finalScore)}
                              disabled={isEditingScore === gradedStudents.find(s => s.name === r.name)?.id}
                              className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition-all border border-transparent hover:border-primary/20"
                              title="Ubah Nilai"
                            >
                              {isEditingScore === (gradedStudents.find(s => s.name === r.name)?.id) ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Edit2 size={12} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-xs font-bold">
                        {isPublicView ? (
                          r.finalScore < kkm ? (
                            ['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(r.remedialStatus || '') ? (
                              <div className="flex items-center gap-1.5 text-indigo-500">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  r.remedialStatus === 'COMPLETED' ? 'bg-indigo-500' : 
                                  r.remedialStatus === 'CHEATED' ? 'bg-rose-500' : 'bg-amber-500'
                                }`}/> {r.remedialStatus === 'COMPLETED' ? 'Selesai ✨' : 
                                       r.remedialStatus === 'CHEATED' ? 'Diskualifikasi 🚫' : 'Waktu Habis ⏰'}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 text-rose-500">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"/> Perlu Bimbingan
                                </div>
                                <button 
                                  onClick={() => handleStartRemedial(r.name, r.finalScore)} 
                                  className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-1.5 w-fit active:scale-95"
                                >
                                  <Plus size={12} /> Mulai Remedial
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Tuntas
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-3">
                            {r.finalScore < kkm ? (
                              ['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(r.remedialStatus || '') ? (
                                <span className={`text-[11px] font-black uppercase tracking-widest ${
                                  r.remedialStatus === 'COMPLETED' ? 'text-indigo-500' : 
                                  r.remedialStatus === 'CHEATED' ? 'text-rose-500' : 'text-amber-500'
                                }`}>
                                  {r.remedialStatus === 'COMPLETED' ? 'Selesai ✨' : 
                                   r.remedialStatus === 'CHEATED' ? 'Diskualifikasi 🚫' : 'Waktu Habis ⏰'}
                                </span>
                              ) : (
                                <button onClick={() => handleStartRemedial(r.name, r.finalScore)} className="px-3 py-1.5 text-[10px] bg-rose-500/10 text-rose-400 rounded-lg font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 active:scale-95 flex items-center gap-1.5">
                                  <Plus size={12} /> Mulai Remedial
                                </button>
                              )
                            ) : (
                              <span className="text-emerald-500 font-bold text-[11px]">Memenuhi KKM ({kkm})</span>
                            )}
                            <button 
                              onClick={() => handleDeleteStudent(r.name)}
                              disabled={isDeleting === (gradedStudents.find(s => s.name === r.name)?.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
                              title="Hapus Data Siswa"
                            >
                              {isDeleting === (gradedStudents.find(s => s.name === r.name)?.id) ? <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>



      {/* Deadline Warning Modal */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 max-w-sm w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95">
             <div className="bg-rose-600/20 p-8 flex flex-col items-center text-white text-center border-b border-white/10">
                <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                   <MonitorOff size={40} className="text-rose-500" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-rose-500">Sesi Remedial Selesai</h2>
                <p className="text-[10px] font-bold text-rose-400/60 uppercase tracking-[0.2em] mt-2 italic">Akses Telah Ditutup</p>
             </div>
             
             <div className="p-8 text-center flex flex-col items-center">
                <p className="text-sm font-bold text-slate-300 leading-relaxed mb-6">
                   Sesi remedial telah selesai. Nilai pengerjaan baru Anda sekarang adalah <b className="text-rose-500">0 (NOL)</b>.
                </p>
                
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-8 w-full">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">INFO PERBAIKAN:</p>
                  <p className="text-xs font-black text-slate-300 leading-snug">
                     Jika ingin perbaikan, Anda harus mendapatkan <span className="text-primary">Poin Kebaikan</span> melalui Guru.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 w-full">
                  <button
                    onClick={() => setShowDeadlineModal(false)}
                    className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
                  >
                    Saya Mengerti & Kembali
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Similarity Report Modal */}
      {similarityReports !== null && similarityReports.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-white/10">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Deteksi Kemiripan Jawaban</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-500">
                    {similarityMetadata ? (
                      <>Dianalisis: <span className="text-slate-300">{similarityMetadata.totalStudents} siswa</span> ({similarityMetadata.totalPairs} pasangan) &bull; </>
                    ) : null}
                    Ditemukan <span className="text-rose-400">{similarityReports.filter(r => r.final_score > 0).length} pasangan dengan kemiripan signifikan</span>.
                  </p>
                </div>
              </div>
              <button onClick={() => { setSimilarityReports(null); setSimilarityMetadata(null); }} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10">
                Tutup
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-900/20 flex-1 custom-scrollbar">
              <div className="space-y-4">
                {similarityReports.filter(r => r.final_score > 0).map((report, idx) => (
                  <div key={idx} className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-sm hover:border-rose-500/30 transition-all relative overflow-hidden group">
                    {/* Status Badge */}
                    <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${
                      report.risk_level === 'HIGH_RISK' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {report.risk_level === 'HIGH_RISK' ? 'RESIKO TINGGI' : 'MENCURIGAKAN'}
                    </div>

                    <div className="flex items-center gap-3 mb-4 mt-2">
                       <Users size={16} className="text-slate-600" />
                       <div className="flex-1 flex flex-wrap items-center gap-2">
                         <span className="text-sm font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5 group-hover:border-primary/30 transition-colors">{report.student_a_name}</span>
                         <span className="text-xs font-black text-slate-600">dengan</span>
                         <span className="text-sm font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5 group-hover:border-primary/30 transition-colors">{report.student_b_name}</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                       <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Kemiripan PG</p>
                         <p className="text-lg font-black text-slate-300">{((report.pg_similarity || 0) * 100).toFixed(1)}%</p>
                       </div>
                       <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Kemiripan Essay</p>
                         <p className="text-lg font-black text-slate-300">{((report.essay_similarity || 0) * 100).toFixed(1)}%</p>
                       </div>
                       <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 text-center">
                         <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/60 mb-1">Skor Akhir</p>
                         <p className="text-lg font-black text-rose-500">{((report.final_score || 0) * 100).toFixed(1)}%</p>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-white/5">
               <p className="text-[10px] font-bold text-slate-600 text-center uppercase tracking-widest">SISTEM ANALISIS KEMIRIPAN JAWABAN &bull; DOKUMEN INTERNAL GURU</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-center pb-8">
        <button onClick={onBack} className="py-3 px-6 text-slate-400 bg-white/5 rounded-xl font-bold hover:bg-white/10 hover:text-primary transition-all uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 border border-white/10">
          <ArrowLeft size={16} /> Kembali ke Menu Sebelumnya
        </button>
      </div>
    </div>
  );
}

function ProgressCard({ label, value, max = 100, isConsistency = false, realValue = 0 }: { label: string; value: number; max?: number; isConsistency?: boolean; realValue?: number }) {
  return <DarkProgressCard label={label} value={value} max={max} isConsistency={isConsistency} realValue={realValue} />;
}

function DarkProgressCard({ label, value, max = 100, isConsistency = false, realValue = 0 }: { label: string; value: number; max?: number; isConsistency?: boolean; realValue?: number }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  let colorClass = 'bg-rose-500';
  let textClass = 'text-rose-400';
  let statusText = 'Perlu Bimbingan';
  let glowClass = 'shadow-rose-500/20';

  if (percentage >= 80) {
    colorClass = 'bg-emerald-500';
    textClass = 'text-emerald-400';
    statusText = 'Sangat Baik';
    glowClass = 'shadow-emerald-500/20';
  } else if (percentage >= 60) {
    colorClass = 'bg-amber-500';
    textClass = 'text-amber-400';
    statusText = 'Cukup Baik';
    glowClass = 'shadow-amber-500/20';
  }

  const displayValue = isConsistency ? realValue : value;

  return (
    <div className={`bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 border border-white/10 relative overflow-hidden transition-all hover:-translate-y-1`}>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
        <div className="flex items-end justify-between mb-4">
          <p className={`text-3xl font-black ${textClass}`}>{displayValue}{!isConsistency && '%'}</p>
          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg bg-white/5 uppercase tracking-widest ${textClass} border border-white/10`}>
            {statusText}
          </span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full ${colorClass} rounded-full transition-all duration-1000 shadow-lg ${glowClass}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  );
}

function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' }) {
  return <DarkBadge color={color}>{children}</DarkBadge>;
}

function DarkBadge({ children, color = 'indigo' }: { children: React.ReactNode; color?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' }) {
  const colors = {
    indigo: 'bg-primary/10 text-primary border-primary/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    slate: 'bg-white/5 text-slate-300 border-white/10',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };
  return (
    <span className={`px-2 md:px-3 py-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-tight border ${colors[color]}`}>
      {children}
    </span>
  );
}

