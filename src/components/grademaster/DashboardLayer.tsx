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
  Send
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
}

const CHART_COLORS = ['#e2e8f0', '#94a3b8', '#6366f1', '#818cf8', '#4f46e5'];
const PIE_COLORS = ['#10b981', '#f43f5e'];

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
}: DashboardLayerProps) {
  const [behaviorMap, setBehaviorMap] = useState<Record<string, BehaviorRecord>>({});
  const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);
  const [similarityReports, setSimilarityReports] = useState<any[] | null>(null);
  const [similarityMetadata, setSimilarityMetadata] = useState<{ totalStudents: number, totalPairs: number } | null>(null);

  const handleStartRemedial = (name: string, currentScore: number) => {
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
          <div key={i} className="flex flex-col items-center bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-indigo-100 shadow-sm">
            <span className="text-lg font-black text-indigo-900">{item.val.toString().padStart(2, '0')}</span>
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-5 lg:p-8 w-full max-w-5xl mx-auto px-4 md:px-6 animate-in">
      <header className="mb-8 md:mb-10 text-center">
        <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1 md:px-4 md:py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-3 md:mb-4 border border-indigo-200">
          <LayoutGrid size={12} className="md:w-3.5 md:h-3.5" /> Dashboard Analitik
        </div>
        <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight font-outfit mb-2 md:mb-3">
          {isPublicView ? 'Hasil Evaluasi Siswa' : 'Ikhtisar Kelas'}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
           {isDemo && (
             <Badge color="amber"><span className="flex items-center gap-1">🧪 DEMO MODE</span></Badge>
           )}
           <Badge color="emerald">Kelas {studentClass} ({schoolLevel})</Badge>
           <Badge color="amber">{academicYear || '2025/2026'}</Badge>
           <Badge color="indigo">Semester {semester || getSemester(sessionName || '')}</Badge>
           <Badge color="slate">{subject}</Badge>
        </div>
        {!isPublicView && (
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pusat Data: {teacherName}</p>
        )}
        {!isPublicView && isDemo && (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
             {(gradedStudents.length === 0 || analytics.avgScore === 0) && (
               <button 
                 onClick={handleSeedDemo}
                 disabled={isSeeding}
                 className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
               >
                 <Plus size={14} className={isSeeding ? "animate-spin" : ""} />
                 {isSeeding ? "Menanam..." : "Tanam Data Demo"}
               </button>
             )}
             <button 
               onClick={handleResetDemo}
               disabled={isResettingDemo}
               className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
             >
               <RefreshCcw size={14} className={isResettingDemo ? "animate-spin" : ""} />
               {isResettingDemo ? "Mereset..." : "Reset Data Demo"}
             </button>
          </div>
        )}
      </header>

      {/* Top 3 Siswa */}
      {gradedStudents.length >= 3 && analytics.ranking.length >= 3 && (
        <div className="mb-6 md:mb-10 animate-in slide-in-from-bottom-4 fade-in">
          <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-4 text-center">🏆 Bintang Kelas (Top 3)</h3>
          <div className="flex flex-col md:flex-row items-end justify-center gap-4 max-w-3xl mx-auto">
            {/* Juara 2 */}
            <div className="order-2 md:order-1 flex-1 bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center transform md:-translate-y-4 hover:-translate-y-6 transition-transform shadow-sm relative w-full min-w-0">
              <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-slate-200 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner">🥈</div>
              <h4 className="font-bold text-slate-700 text-sm md:text-base truncate px-2">{analytics.ranking.length > 1 ? analytics.ranking[1].name : '-'}</h4>
              <p className="text-slate-500 font-black text-xl mt-1">{analytics.ranking.length > 1 ? analytics.ranking[1].finalScore : 0}</p>
            </div>
            {/* Juara 1 */}
            <div className="order-1 md:order-2 flex-1 bg-gradient-to-b from-amber-50 to-amber-100 border border-amber-200 rounded-3xl p-6 text-center transform md:-translate-y-8 hover:-translate-y-10 transition-transform shadow-md relative z-10 w-full mb-4 md:mb-0 min-w-0">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1"><Trophy size={12}/> Juara 1</div>
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto bg-amber-200 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner">🥇</div>
              <h4 className="font-black text-amber-900 text-base md:text-lg truncate px-2">{analytics.ranking.length > 0 ? analytics.ranking[0].name : '-'}</h4>
              <p className="text-amber-600 font-black text-2xl mt-1">{analytics.ranking.length > 0 ? analytics.ranking[0].finalScore : 0}</p>
            </div>
            {/* Juara 3 */}
            <div className="order-3 md:order-3 flex-1 bg-orange-50 border border-orange-200 rounded-3xl p-5 text-center transform hover:-translate-y-2 transition-transform shadow-sm relative w-full min-w-0">
              <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-orange-200 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner">🥉</div>
              <h4 className="font-bold text-orange-900 text-sm md:text-base truncate px-2">{analytics.ranking.length > 2 ? analytics.ranking[2].name : '-'}</h4>
              <p className="text-orange-600 font-black text-xl mt-1">{analytics.ranking.length > 2 ? analytics.ranking[2].finalScore : 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-10">
        <ProgressCard label="Nilai Rata-rata Kelas" value={analytics.avgScore} max={100} />
        <ProgressCard label="Kemampuan Belajar" value={analytics.avgCsi} max={100} />
        <ProgressCard label="Tingkat Pemahaman" value={analytics.avgLps} max={100} />
        <ProgressCard label="Konsistensi Nilai" value={Math.max(0, 100 - (analytics.standardDeviation * 2))} max={100} isConsistency={true} realValue={analytics.standardDeviation} />
      </div>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <InsightPanel insights={analytics.insights} />
      )}

      {/* Charts Row */}
      {gradedStudents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-10">
          {/* Distribution Histogram */}
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm col-span-1">
            <h4 className="text-sm font-black text-slate-800 mb-1">Distribusi Nilai Siswa</h4>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 mb-6 leading-relaxed">Kelompok jumlah siswa berdasarkan rentang nilai akhir yang diperoleh.</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.distribution} margin={{ left: -25, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val: string) => val.split(' ')[0]} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: 12, borderRadius: 16, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" name="Siswa" radius={[6, 6, 6, 6]} barSize={36}>
                  {analytics.distribution.map((d, i) => (
                    <Cell key={i} fill={d.range.includes('Sangat Baik') ? '#10b981' : d.range.includes('Baik') ? '#3b82f6' : d.range.includes('Cukup') ? '#f59e0b' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Question Difficulty / Analisis Per Soal */}
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm col-span-1 lg:col-span-2">
            <h4 className="text-sm font-black text-slate-800 mb-1">Analisis Tingkat Kesulitan Soal</h4>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 mb-6 leading-relaxed">Persentase tingkat kesulitan. Semakin tinggi persentase, semakin banyak siswa yang salah menjawab soal tersebut.</p>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-full md:flex-1 overflow-x-auto pb-2 custom-scrollbar">
                <div className="min-w-[400px] md:min-w-0">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.questionDifficulties} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                    <XAxis dataKey="questionNumber" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ fontSize: 12, borderRadius: 16, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
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
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-rose-200 flex items-center justify-center shrink-0 mb-3 text-rose-600">
                          <Star size={20} fill="currentColor" />
                        </div>
                        <h5 className="font-black text-rose-900 text-sm mb-1">Fokus Perbaikan</h5>
                        <p className="text-xs font-bold text-rose-800 leading-relaxed">
                          Soal <b>Nomor {hardest.questionNumber}</b> paling banyak dijawab salah ({hardest.difficultyPercent}% siswa).
                        </p>
                        <p className="text-[10px] text-rose-600 font-bold mt-2 leading-relaxed opacity-80">Rekomendasi: Bahas ulang materi terkait soal ini di pertemuan berikutnya agar siswa lebih paham.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center shrink-0 mb-3 text-emerald-600">
                        <ThumbsUp size={20} />
                      </div>
                      <h5 className="font-black text-emerald-900 text-sm mb-1">Semua Terkendali</h5>
                      <p className="text-xs font-bold text-emerald-800 leading-relaxed">
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
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h3 className="text-base md:text-lg font-black text-slate-800 font-outfit">Daftar Lengkap Nilai Siswa</h3>
            <p className="text-[10px] md:text-xs font-bold text-slate-400">
              Total: {gradedStudents.length} siswa terdaftar
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            <button
              onClick={handleExportXML}
              className="px-3 md:px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
            >
              <Download size={14} /> Ekspor Data
            </button>
            {!isPublicView && (
              <>
                <button
                  onClick={onReSync}
                  className="px-3 md:px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                  title="Hitung ulang semua nilai berdasarkan kunci jawaban terbaru"
                >
                  <RefreshCcw size={14} /> Sinkron Nilai
                </button>
                <button
                  onClick={handleCheckSimilarity}
                  disabled={isCheckingSimilarity}
                  className="px-3 md:px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5 md:gap-2 disabled:opacity-50"
                  title="Deteksi Kecurangan Berjamaah (Kemiripan Jawaban)"
                >
                  {isCheckingSimilarity ? <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" /> : <Eye size={14} />} 
                  Deteksi Kemiripan
                </button>
                <button
                  onClick={handleReportToTelegram}
                  disabled={isReporting}
                  className="px-3 md:px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 md:gap-2 disabled:opacity-50"
                  title="Kirim daftar siswa belum remed ke Telegram Admin"
                >
                  {isReporting ? <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Send size={14} />} 
                  Lapor Bos!
                </button>
                <button
                  onClick={onGradeStudent}
                  className="px-3 md:px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                >
                  <Plus size={14} /> Koreksi Manual
                </button>
              </>
            )}
          </div>
        </div>

        {/* Remedial Announcement Banner */}
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col md:flex-row items-center md:items-start gap-4 shadow-sm animate-in zoom-in-95 overflow-hidden group">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xl shadow-indigo-200 group-hover:rotate-12 transition-transform">
            <Bell size={24} className="animate-bounce" />
          </div>
          <div className="flex-1 text-center md:text-left">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                  🚀 Pengumuman Remedial Penting!
                </h4>
                <div className="flex items-center justify-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Live Countdown</span>
                </div>
             </div>
             
             <p className="text-xs font-bold text-indigo-700 leading-relaxed mb-4">
                Batas waktu pengerjaan remedial telah ditetapkan. Pastikan seluruh siswa menyelesaikan tugas sebelum waktu habis.
                Sistem akan menutup akses secara <b className="text-rose-600">permanen</b> tepat pada waktunya.
             </p>

             <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-3 mb-5">
                <RemedialCountdown targetDate="2026-03-30T07:00:00+07:00" />
             </div>

             <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white/60 backdrop-blur-md rounded-xl border border-rose-200">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 animate-pulse">
                   <AlertCircle size={18} />
                </div>
                <div className="flex-1 text-xs font-black text-rose-600 uppercase tracking-tight text-center sm:text-left">
                   KONSEKUENSI: NILAI AKAN <span className="underline decoration-2 underline-offset-4 decoration-rose-400">0 (NOL)</span> & <span className="underline decoration-2 underline-offset-4 decoration-rose-400">-10 POIN PERILAKU</span> TANPA TOLERANSI!
                </div>
             </div>
          </div>
        </div>

        {gradedStudents.length === 0 ? (
          <div className="text-center py-8 md:py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <User size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold text-sm">Belum ada nilai yang dimasukkan.</p>
            {!isPublicView && (
              <p className="text-slate-400 text-[10px] mt-1.5">Mulai koreksi siswa untuk melihat rekapan nilai di sini.</p>
            )}
          </div>
        ) : (
          <>
            {/* Mobile View (Card List) */}
            <div className="md:hidden space-y-3">
              {analytics.ranking.map(r => (
                <div key={r.rank} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${r.rank <= 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        {r.rank}
                      </span>
                      <span className="text-xs font-black text-slate-700 truncate max-w-[140px] uppercase tracking-tight">{r.name}</span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-black ${r.finalScore >= kkm ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {r.finalScore}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Opsi / Status</span>
                    {isPublicView ? (
                      r.finalScore < kkm ? (
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-rose-500 text-[9px] font-black uppercase tracking-widest">Perlu Bimbingan</span>
                          <button 
                            onClick={() => handleStartRemedial(r.name, r.finalScore)} 
                            className="px-3 py-2 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm shadow-rose-200 active:scale-95 flex items-center gap-1.5"
                          >
                            <Plus size={10} /> Mulai Remedial
                          </button>
                        </div>
                      ) : (
                        <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Tuntas ✨</span>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        {r.finalScore < kkm ? (
                          <button 
                            onClick={() => handleStartRemedial(r.name, r.finalScore)} 
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-100 active:scale-95 flex items-center gap-1.5"
                          >
                            <Plus size={10} /> Mulai Remedial
                          </button>
                        ) : (
                          <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Lulus KKM</span>
                        )}
                        <button 
                          onClick={() => handleDeleteStudent(r.name)}
                          disabled={isDeleting === (gradedStudents.find(s => s.name === r.name)?.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                          title="Hapus Data Siswa"
                        >
                          {isDeleting === (gradedStudents.find(s => s.name === r.name)?.id) ? <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
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
                  <tr className="border-b-2 border-slate-100">
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Rank</th>
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Siswa</th>
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nilai Akhir</th>
                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{isPublicView ? "Status Tuntas" : "Keterangan"}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.ranking.map(r => (
                    <tr key={r.rank} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors`}>
                      <td className="py-3.5 text-xs font-black text-slate-400 pl-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center ${r.rank <= 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{r.rank}</span>
                      </td>
                      <td className="py-3.5 text-xs font-bold text-slate-700">{r.name}</td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${r.finalScore >= kkm ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {r.finalScore}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs font-bold">
                        {isPublicView ? (
                          r.finalScore < kkm ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1.5 text-rose-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"/> Perlu Bimbingan
                              </div>
                              <button 
                                onClick={() => handleStartRemedial(r.name, r.finalScore)} 
                                className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-rose-600 transition-all shadow-sm shadow-rose-200 flex items-center justify-center gap-1.5 w-fit active:scale-95"
                              >
                                <Plus size={12} /> Mulai Remedial
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Tuntas
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-3">
                            {r.finalScore < kkm ? (
                              <button onClick={() => handleStartRemedial(r.name, r.finalScore)} className="px-3 py-1.5 text-[10px] bg-rose-50 text-rose-600 rounded-lg font-black uppercase tracking-wider hover:bg-rose-100 transition-colors border border-rose-100 active:scale-95 flex items-center gap-1.5">
                                <Plus size={12} /> Mulai Remedial
                              </button>
                            ) : (
                              <span className="text-emerald-500 font-bold text-[11px]">Memenuhi KKM ({kkm})</span>
                            )}
                            <button 
                              onClick={() => handleDeleteStudent(r.name)}
                              disabled={isDeleting === (gradedStudents.find(s => s.name === r.name)?.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                              title="Hapus Data Siswa"
                            >
                              {isDeleting === (gradedStudents.find(s => s.name === r.name)?.id) ? <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}
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

      {/* Behavior Section (Public View Only) */}
      {isPublicView && Object.keys(behaviorMap).length > 0 && (
        <div className="mt-6 md:mt-10 bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-slate-800 font-outfit">Rapor Kedisiplinan & Perilaku</h3>
              <p className="text-[10px] md:text-xs font-bold text-slate-400">Catatan sikap siswa selama proses pembelajaran</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {analytics.ranking.map(r => {
              const b = getBehavior(r.name);
              if (!b) return null;
              const summary = getBehaviorSummary(b.behavior_logs || []);
              const label = getBehaviorLabel(b.total_points);
              return (
                <div key={r.name} className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 md:p-5 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                    <h4 className="font-black text-sm text-slate-700 truncate mr-3">{r.name}</h4>
                    <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                      <span className={`text-sm font-black ${
                        b.total_points >= 80 ? 'text-emerald-500' :
                        b.total_points >= 60 ? 'text-amber-500' :
                        'text-rose-500'
                      }`}>{b.total_points}</span>
                    </div>
                  </div>

                  {(summary.good.length > 0 || summary.bad.length > 0) && (
                    <div className="space-y-2 mt-2">
                      {summary.good.length > 0 && (
                        <div className="flex items-start gap-2">
                          <ThumbsUp size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-emerald-700 font-bold leading-relaxed">{summary.good.join(', ')}</p>
                        </div>
                      )}
                      {summary.bad.length > 0 && (
                        <div className="flex items-start gap-2">
                          <ThumbsDown size={12} className="text-rose-500 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-rose-700 font-bold leading-relaxed">{summary.bad.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {summary.good.length === 0 && summary.bad.length === 0 && (
                    <div className="text-center py-2">
                      <p className="text-[10px] text-slate-400 font-bold">Belum ada catatan sikap khusus.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Similarity Report Modal */}
      {similarityReports !== null && similarityReports.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Deteksi Kemiripan Jawaban</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-500">
                    {similarityMetadata ? (
                      <>Dianalisis: <span className="text-slate-800">{similarityMetadata.totalStudents} siswa</span> ({similarityMetadata.totalPairs} pasangan) &bull; </>
                    ) : null}
                    Ditemukan <span className="text-rose-600">{similarityReports.filter(r => r.final_score > 0).length} pasangan dengan kemiripan signifikan</span>.
                  </p>
                </div>
              </div>
              <button onClick={() => { setSimilarityReports(null); setSimilarityMetadata(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                Tutup
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1 custom-scrollbar">
              <div className="space-y-4">
                {similarityReports.filter(r => r.final_score > 0).map((report, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    {/* Status Badge */}
                    <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${
                      report.risk_level === 'HIGH_RISK' ? 'bg-rose-500 text-white' : 'bg-amber-400 text-amber-950'
                    }`}>
                      {report.risk_level === 'HIGH_RISK' ? 'RESIKO TINGGI' : 'MENCURIGAKAN'}
                    </div>

                    <div className="flex items-center gap-3 mb-4 mt-2">
                       <Users size={16} className="text-slate-400" />
                       <div className="flex-1 flex flex-wrap items-center gap-2">
                         <span className="text-sm font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{report.student_a_name}</span>
                         <span className="text-xs font-black text-slate-400">dengan</span>
                         <span className="text-sm font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{report.student_b_name}</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                       <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Kemiripan PG</p>
                         <p className="text-lg font-black text-slate-700">{((report.pg_similarity || 0) * 100).toFixed(1)}%</p>
                       </div>
                       <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Kemiripan Essay</p>
                         <p className="text-lg font-black text-slate-700">{((report.essay_similarity || 0) * 100).toFixed(1)}%</p>
                       </div>
                       <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
                         <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1">Skor Akhir</p>
                         <p className="text-lg font-black text-rose-600">{((report.final_score || 0) * 100).toFixed(1)}%</p>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white">
               <p className="text-[10px] font-bold text-slate-400 text-center">Sistem ini membandingkan exact match jawaban PG dan skor essay per soal. Gunakan data ini sebagai referensi, bukan tuduhan pasti.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-center pb-8">
        <button onClick={onBack} className="py-3 px-6 text-slate-400 bg-slate-50 rounded-xl font-bold hover:bg-slate-100 hover:text-indigo-600 transition-all uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 border border-slate-200">
          <ArrowLeft size={16} /> Kembali ke Menu Sebelumnya
        </button>
      </div>
    </div>
  );
}

function ProgressCard({ label, value, max = 100, isConsistency = false, realValue = 0 }: { label: string; value: number; max?: number; isConsistency?: boolean; realValue?: number }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  let colorClass = 'bg-rose-500';
  let bgLight = 'bg-rose-50';
  let textClass = 'text-rose-600';
  let statusText = 'Perlu Bimbingan';

  if (percentage >= 80) {
    colorClass = 'bg-emerald-500';
    bgLight = 'bg-emerald-50';
    textClass = 'text-emerald-600';
    statusText = 'Sangat Baik';
  } else if (percentage >= 60) {
    colorClass = 'bg-amber-500';
    bgLight = 'bg-amber-50';
    textClass = 'text-amber-600';
    statusText = 'Cukup Baik';
  }

  const displayValue = isConsistency ? realValue : value;

  return (
    <div className={`rounded-3xl p-5 border shadow-sm ${bgLight} border-white relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-1`}>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{label}</p>
        <div className="flex items-end justify-between mb-4">
          <p className={`text-3xl font-black ${textClass}`}>{displayValue}{!isConsistency && '%'}</p>
          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg bg-white shadow-sm uppercase tracking-widest ${textClass}`}>
            {statusText}
          </span>
        </div>
        <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
          <div className={`h-full ${colorClass} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  );
}

function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };
  return (
    <span className={`px-2 md:px-3 py-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-tight border shadow-sm ${colors[color]}`}>
      {children}
    </span>
  );
}
