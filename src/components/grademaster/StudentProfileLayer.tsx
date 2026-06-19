"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, PlusCircle, MinusCircle, Loader2, FileText, 
  Trash2, Pencil, ShieldCheck, ThumbsUp, X, Calendar, 
  Activity, History, DownloadCloud, Check, User,
  Settings, AlertCircle, LogOut, Share2, Trophy, TrendingUp, Target
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
  behaviorReasons = []
}: StudentProfileLayerProps) {
  const { isParent } = useGradeMaster();
  const [totalPoints, setTotalPoints] = useState(initialPoints);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'ACADEMIC' | 'DOCUMENTS' | 'MANAGE'>('SUMMARY');
  const [studentLogs, setStudentLogs] = useState<BehaviorLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [studentSummary, setStudentSummary] = useState<{ attendance: any, academicHistory: any[], documents: any[] } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  
  // Management States
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ reason: '', points: 0, date: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localReasons, setLocalReasons] = useState<{ text: string, weight: number }[]>(behaviorReasons);
  const fileInputRef = useRef<HTMLInputElement>(null);
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



  useEffect(() => {
    setLocalReasons(behaviorReasons);
  }, [behaviorReasons]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchStudentLogs();
    fetchStudentSummary();
    if (isAdmin) {
      fetchBehaviorSettings();
    }
    setTotalPoints(initialPoints);
    setCurrentAvatarUrl(avatarUrl);
  }, [studentId, initialPoints, avatarUrl, isAdmin]);

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

  // Sync avatar url prop changes (e.g. from studentData shift)
  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  const fetchStudentSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`/api/grademaster/students/summary?name=${encodeURIComponent(studentName)}&year=${encodeURIComponent(academicYear)}`);
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

  const handleAddBehavior = async (pointsDelta: number, reason: string) => {
    if (isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    
    const result = await addBehaviorAction({
      studentId,
      pointsDelta: Math.abs(pointsDelta),
      reason,
      violationDate: selectedDate
    });

    if (result.success) {
      setToast({ message: `Catatan "${reason}" ditambahkan`, type: "success" });
      const newPts = result.data?.new_total ?? totalPoints;
      setTotalPoints(newPts);
      onPointsUpdate?.(newPts);
      fetchStudentLogs();
      setActiveTab('SUMMARY');
    } else {
      setToast({ message: result.error || "Gagal menambah catatan", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const handleUpdateLog = async (logId: string) => {
    if (isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    const result = await updateBehaviorAction(logId, {
      pointsDelta: editForm.points,
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
      onAvatarUpdate?.(data.avatar_url);
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
    <div className="fixed inset-0 bg-surface/95 backdrop-blur-2xl z-[1000] flex flex-col animate-in fade-in duration-300 overflow-y-auto no-scrollbar bg-surface-container-lowest text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg flex items-center justify-between px-4 sm:px-6 h-16 max-w-4xl mx-auto left-1/2 -translate-x-1/2 border-b border-surface-container shadow-[0_10px_40px_rgba(15,23,42,0.04)]">
        {isAdmin ? (
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container transition-all text-on-surface active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <h1 className="font-headline font-bold text-lg tracking-tight">Student Profile</h1>
        {onLogout ? (
          <button 
            onClick={onLogout}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-error/10 text-error transition-all active:scale-95"
            title="Keluar"
          >
            <LogOut size={18} />
          </button>
        ) : (
          <div className="w-10"></div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-20 px-4 sm:px-6 pb-32 max-w-4xl mx-auto space-y-8 sm:space-y-12 w-full">
        {/* Profile Header */}
        <section className="flex flex-col items-center text-center space-y-4 relative py-6">
          {/* Ambient Glow behind avatar */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 bg-primary/10 rounded-full blur-[40px] pointer-events-none -z-10" />
          
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-primary-container text-white flex items-center justify-center text-3xl font-bold tracking-tight shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border-4 border-white">
              {currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt={studentName} className="w-full h-full object-cover" />
              ) : (
                studentName.slice(0, 2).toUpperCase()
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 size={16} className="animate-spin text-white" />
                </div>
              )}
            </div>
            
            {canEditPhoto && !isUploadingAvatar && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-on-primary-fixed text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all border-2 border-white"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
          
          <div className="px-4">
            <h2 className="text-on-primary-fixed font-bold text-xl sm:text-2xl tracking-tight leading-tight uppercase font-outfit break-words">{studentName}</h2>
            <p className="text-on-surface-variant text-[11px] sm:text-xs mt-1.5 uppercase font-bold tracking-widest">Kelas {className} • {academicYear}</p>
          </div>
        </section>

        {/* Achievements / Badges Section */}
        <section className="space-y-3">
          <h3 className="text-left text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest px-1">Lencana Pencapaian</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth -mx-4 px-4 sm:-mx-6 sm:px-6">
            {badges.map(b => (
              <div 
                key={b.id} 
                className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-br ${b.color} border rounded-2xl shadow-sm hover:scale-[1.03] transition-all duration-300 select-none max-w-[240px]`}
              >
                <span className="text-2xl">{b.icon}</span>
                <div className="text-left min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider truncate leading-tight">{b.label}</p>
                  <p className="text-[10px] font-medium opacity-80 truncate mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Metric Cards Bento Layout */}
        {(() => {
          const charScore = Math.max(0, 100 - totalPoints);
          return (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Poin Perilaku & Karakter (Apple Ring Style) */}
              <div className="bg-surface border border-outline-variant rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1 space-y-1.5 text-left min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider sm:tracking-widest truncate">Karakter & Kedisiplinan</p>
                  <h4 className="text-lg sm:text-xl font-extrabold text-on-surface leading-tight font-outfit truncate">Skor Perilaku</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl sm:text-2xl font-black text-on-surface">{charScore}</span>
                    <span className="text-[11px] sm:text-xs text-on-surface-variant/60 font-medium">/ 100 Poin</span>
                  </div>
                  <span className={`inline-block text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-lg border mt-1.5 max-w-full truncate ${
                    charScore >= 90 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                    charScore >= 75 ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                    charScore >= 60 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  }`}>
                    Kategori: {
                      charScore >= 90 ? 'Sangat Baik' :
                      charScore >= 75 ? 'Baik' :
                      charScore >= 60 ? 'Cukup' :
                      'Perlu Pembinaan'
                    }
                  </span>
                </div>
                
                {/* SVG Progress Ring */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="35%"
                      className="stroke-slate-100"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="35%"
                      className={`transition-all duration-500 ease-out ${
                        charScore >= 90 ? 'stroke-emerald-500' :
                        charScore >= 75 ? 'stroke-blue-500' :
                        charScore >= 60 ? 'stroke-amber-500' :
                        'stroke-rose-500'
                      }`}
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray="220"
                      strokeDashoffset={String(220 - (charScore / 100) * 220)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-[11px] sm:text-[12px] font-black font-outfit ${
                      charScore >= 90 ? 'text-emerald-600' :
                      charScore >= 75 ? 'text-blue-600' :
                      charScore >= 60 ? 'text-amber-600' :
                      'text-rose-600'
                    }`}>
                      {charScore}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Kehadiran (Apple Ring Style) */}
              <div className="bg-surface border border-outline-variant rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1 space-y-1.5 text-left min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider sm:tracking-widest truncate">Kehadiran Kelas</p>
                  <h4 className="text-lg sm:text-xl font-extrabold text-on-surface leading-tight font-outfit truncate">Persentase Presensi</h4>
                  {isLoadingSummary ? (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl sm:text-2xl font-black text-on-surface">...</span>
                    </div>
                  ) : !studentSummary?.attendance || studentSummary.attendance.total === 0 ? (
                    <p className="text-xs font-bold text-on-surface-variant/60 mt-2">Data presensi belum tersedia</p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-on-surface">
                          {studentSummary.attendance.percentage}%
                        </span>
                        <span className="text-[11px] sm:text-xs text-on-surface-variant/60 font-medium">Keaktifan</span>
                      </div>
                      <span className="inline-block text-[9px] sm:text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/20 mt-1 max-w-full truncate">
                        Hadir {studentSummary.attendance.present} dari {studentSummary.attendance.total}
                      </span>
                    </>
                  )}
                </div>
                
                {/* SVG Progress Ring */}
                {!isLoadingSummary && studentSummary?.attendance && studentSummary.attendance.total > 0 && (
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="35%"
                        className="stroke-slate-100"
                        strokeWidth="5"
                        fill="transparent"
                      />
                      <circle
                        cx="50%"
                        cy="50%"
                        r="35%"
                        className={`transition-all duration-500 ease-out ${
                          studentSummary.attendance.percentage >= 90 ? 'stroke-primary' : 'stroke-amber-500'
                        }`}
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray="220"
                        strokeDashoffset={String(220 - ((studentSummary.attendance.percentage ?? 0) / 100) * 220)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[11px] sm:text-[12px] font-black font-outfit text-on-surface-variant">
                        {studentSummary.attendance.percentage}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* Tabs */}
        <nav aria-label="Profile Tabs" className="flex border-b border-surface-container overflow-x-auto no-scrollbar sm:justify-center">
          <button 
            onClick={() => setActiveTab('SUMMARY')}
            className={`pb-3 px-4 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'SUMMARY' ? 'text-on-primary-fixed border-b-2 border-on-primary-fixed' : 'text-on-surface-variant hover:text-on-primary-fixed'
            }`}
          >
            Ringkasan
          </button>
          <button 
            onClick={() => setActiveTab('ACADEMIC')}
            className={`pb-3 px-4 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'ACADEMIC' ? 'text-on-primary-fixed border-b-2 border-on-primary-fixed' : 'text-on-surface-variant hover:text-on-primary-fixed'
            }`}
          >
            Akademik
          </button>
          <button 
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`pb-3 px-4 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'DOCUMENTS' ? 'text-on-primary-fixed border-b-2 border-on-primary-fixed' : 'text-on-surface-variant hover:text-on-primary-fixed'
            }`}
          >
            Dokumen
          </button>
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('MANAGE')}
              className={`pb-3 px-4 font-bold text-sm whitespace-nowrap transition-all ${
                activeTab === 'MANAGE' ? 'text-on-primary-fixed border-b-2 border-on-primary-fixed' : 'text-on-surface-variant hover:text-on-primary-fixed'
              }`}
            >
              Manajemen
            </button>
          )}
        </nav>

        {/* Content Section */}
        <div className="min-h-[300px]">
          {activeTab === 'SUMMARY' && (
            <section className="space-y-6 pt-4 animate-in fade-in duration-300">
              {/* Score Holdback Alert Banner */}
              {(() => {
                const heldBackGrades = studentSummary?.academicHistory?.filter((g: any) => 
                  Array.isArray(g.cheatingFlags) && g.cheatingFlags.some((f: string) => f.includes('Nilai remedial ditahan'))
                ) || [];
                
                return heldBackGrades.map((g: any, idx: number) => {
                  const deadlineText = g.remedialDeadline ? formatDate(g.remedialDeadline) : 'batas waktu sesi berakhir';
                  return (
                    <div key={idx} className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex items-start gap-4 text-left animate-in slide-in-from-top-4 duration-500">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600">
                        <AlertCircle size={20} className="animate-pulse" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h4 className="text-amber-800 font-extrabold text-[10px] uppercase tracking-wider leading-none font-outfit">Nilai Remedial Ditahan Sementara</h4>
                        <p className="text-amber-950 text-xs font-semibold leading-relaxed">
                          Nilai remedial untuk pelajaran <strong className="text-amber-950 font-black">{g.subject} ({g.sessionName})</strong> sedang ditahan sementara menunggu rekan sekelas menyelesaikan remedial, atau hingga batas waktu remedial berakhir pada <strong className="text-amber-950 font-black">{deadlineText}</strong>.
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}

              <div className="flex items-center justify-between">
                <h3 className="text-on-primary-fixed font-bold text-lg tracking-tight">Riwayat Transparansi</h3>
                <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider truncate">
                  {studentLogs.length} ENTRI TERPANTAU
                </span>
              </div>

              {isLoadingLogs ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
                  <Loader2 size={32} className="animate-spin" />
                  <p className="text-xs font-bold uppercase">Memuat Riwayat...</p>
                </div>
              ) : studentLogs.length === 0 ? (
                <div className="py-20 text-center bg-surface-container-low rounded-3xl border border-dashed border-surface-container flex flex-col items-center justify-center px-6">
                  <History size={40} className="text-on-surface-variant opacity-20 mb-4" />
                  <p className="text-sm font-bold text-on-surface-variant uppercase">Belum Ada Riwayat Perilaku</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-4 group">
                      <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        log.points_delta > 0 ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'
                      }`}>
                        {log.points_delta > 0 ? <MinusCircle size={18} /> : <ThumbsUp size={18} />}
                      </div>
                      <div className="flex-1 pb-4 border-b border-surface-container">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-on-primary-fixed text-sm">{log.reason}</h4>
                          <span className={`font-bold text-sm ${log.points_delta > 0 ? 'text-error' : 'text-secondary'}`}>
                            {log.points_delta > 0 ? '+' : ''}{log.points_delta} Poin
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-on-surface-variant text-[11px] font-medium uppercase">{formatDate(log.violation_date || log.created_at)}</p>
                          {isAdmin && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => {
                                   setEditingLogId(log.id);
                                   setEditForm({ reason: log.reason, points: log.points_delta, date: (log.violation_date || log.created_at).split('T')[0] });
                                 }}
                                 className="p-1 text-on-surface-variant hover:text-on-primary-fixed transition-colors"
                               >
                                 <Pencil size={12} />
                               </button>
                               <button 
                                 onClick={() => handleDeleteLog(log.id)}
                                 className="p-1 text-on-surface-variant hover:text-error transition-colors"
                               >
                                 <Trash2 size={12} />
                               </button>
                            </div>
                          )}
                        </div>

                        {/* Inline Edit UI */}
                        {isAdmin && editingLogId === log.id && (
                          <div className="mt-4 pt-4 border-t border-surface-container space-y-4 animate-in slide-in-from-top-2">
                             <div className="grid grid-cols-1 gap-3">
                                <input 
                                  type="date" 
                                  value={editForm.date} 
                                  onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                  className="w-full bg-white border border-surface-container rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-on-primary-fixed"
                                />
                                <input 
                                  type="text" 
                                  value={editForm.reason} 
                                  onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                                  className="w-full bg-white border border-surface-container rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-on-primary-fixed"
                                />
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleUpdateLog(log.id)} className="flex-1 py-2 bg-on-primary-fixed text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Simpan</button>
                                <button onClick={() => setEditingLogId(null)} className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg text-[10px] font-bold uppercase">Batal</button>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          {activeTab === 'ACADEMIC' && (() => {
            const academicHistory = studentSummary?.academicHistory || [];
            const totalExams = academicHistory.length;
            const passedExams = academicHistory.filter((g: any) => g.isPassing).length;
            
            // Rata-rata Akademik dengan 1 angka desimal
            const avgScore = totalExams > 0 
              ? Number((academicHistory.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) / totalExams).toFixed(1))
              : 0;

            // Rasio Kelulusan
            const passPercent = totalExams > 0 
              ? Math.round((passedExams / totalExams) * 100)
              : 0;

            // Analisis Akademik
            const highestScore = totalExams > 0 
              ? Math.max(...academicHistory.map((g: any) => Number(g.score || 0)))
              : 0;
            const lowestScore = totalExams > 0 
              ? Math.min(...academicHistory.map((g: any) => Number(g.score || 0)))
              : 0;
            
            // Pelajaran terbaik
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

            // Status Akademik
            let statusText = "Belum Diketahui";
            let statusBadgeColor = "bg-slate-500/10 text-slate-600 border-slate-500/20";
            if (totalExams > 0) {
              if (avgScore >= 85) {
                statusText = "Sangat Baik";
                statusBadgeColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
              } else if (avgScore >= 75) {
                statusText = "Baik";
                statusBadgeColor = "bg-blue-500/10 text-blue-600 border-blue-500/20";
              } else if (avgScore >= 60) {
                statusText = "Perlu Perhatian";
                statusBadgeColor = "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
              } else {
                statusText = "Memerlukan Pembinaan";
                statusBadgeColor = "bg-rose-500/10 text-rose-600 border-rose-500/20";
              }
            }

            // Tren data
            let trendText = "Tidak ada tren data";
            let trendColor = "text-on-surface-variant bg-surface-container-high border-outline-variant";
            if (totalExams >= 2) {
              const sortedHistory = [...academicHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              const lastScore = sortedHistory[sortedHistory.length - 1].score;
              const prevScore = sortedHistory[sortedHistory.length - 2].score;
              const diff = lastScore - prevScore;
              if (diff > 0) {
                trendText = `Meningkat (+${diff} poin dibanding ujian sebelumnya) 📈`;
                trendColor = "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";
              } else if (diff < 0) {
                trendText = `Menurun (${diff} poin dibanding ujian sebelumnya) 📉`;
                trendColor = "text-rose-600 bg-rose-500/10 border-rose-500/20";
              } else {
                trendText = "Stabil (sama dengan ujian sebelumnya) 📊";
                trendColor = "text-blue-600 bg-blue-500/10 border-blue-500/20";
              }
            }

            // Chart data is memoized at top level

            // Insight Otomatis
            let insightText = "";
            if (totalExams === 0) {
              insightText = "Belum ada data akademik yang tersedia untuk dianalisis.";
            } else {
              const attendanceText = studentSummary?.attendance && studentSummary.attendance.total > 0
                ? `Kehadiran belum dapat dianalisis karena data presensi belum tersedia.` 
                : "Kehadiran belum dapat dianalisis karena data presensi belum tersedia.";

              // override real attendance info if exist
              const realAttendanceText = studentSummary?.attendance && studentSummary.attendance.total > 0
                ? `Tingkat kehadiran siswa saat ini berada di angka ${studentSummary.attendance.percentage}%.`
                : "Kehadiran belum dapat dianalisis karena data presensi belum tersedia.";

              insightText = `Nilai rata-rata siswa saat ini ${avgScore.toFixed(1)}. Dari ${totalExams} ujian yang telah dikerjakan, ${passedExams} ujian telah mencapai KKM. Mata pelajaran terbaik adalah ${bestSubject} dengan nilai ${highestScore}. ${realAttendanceText}`;
            }

            return (
              <section className="space-y-6 pt-4 animate-in fade-in duration-300 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-on-primary-fixed font-bold text-lg tracking-tight font-outfit">Rekam Jejak Akademik</h3>
                  {totalExams > 0 && (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeColor}`}>
                      Status: {statusText}
                    </span>
                  )}
                </div>

                {isLoadingSummary ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
                    <Loader2 size={32} className="animate-spin" />
                    <p className="text-xs font-bold uppercase">Memuat Nilai...</p>
                  </div>
                ) : totalExams === 0 ? (
                  <div className="py-20 text-center bg-surface-container-low rounded-3xl border border-dashed border-surface-container flex flex-col items-center justify-center px-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Activity size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-on-surface uppercase tracking-wider">Belum ada data akademik.</p>
                      <p className="text-xs text-on-surface-variant">Siswa belum memiliki riwayat nilai ujian terdaftar di sistem.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Bento Academic Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Rata-rata Akademik */}
                      <div className="bg-surface border border-outline-variant rounded-3xl p-5 shadow-sm space-y-2 relative group text-left">
                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Rata-rata Akademik</p>
                        <p className="text-3xl font-black text-primary font-outfit">{avgScore.toFixed(1)}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium leading-normal">
                          Dihitung dari seluruh ujian yang telah dikerjakan.
                        </p>
                      </div>

                      {/* Rasio Kelulusan */}
                      <div className="bg-surface border border-outline-variant rounded-3xl p-5 shadow-sm space-y-2 text-left">
                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Rasio Kelulusan</p>
                        <p className="text-3xl font-black text-emerald-600 font-outfit">{passPercent}%</p>
                        <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100 font-bold inline-block">
                          {passedExams} dari {totalExams} ujian tuntas
                        </p>
                      </div>

                      {/* Total Sesi */}
                      <div className="bg-surface border border-outline-variant rounded-3xl p-5 shadow-sm space-y-2 text-left">
                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Total Sesi</p>
                        <p className="text-3xl font-black text-secondary font-outfit">{totalExams}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium">Ujian terdaftar di kelas.</p>
                      </div>
                    </div>

                    {/* Analisis Akademik */}
                    <div className="bg-surface border border-outline-variant rounded-[2rem] p-5 sm:p-6 shadow-sm space-y-4 text-left">
                      <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] flex items-center gap-2">
                        <Trophy size={14} className="text-amber-500" /> Analisis Akademik
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nilai Ujian Tertinggi</p>
                          <p className="text-lg font-black text-primary font-outfit">{highestScore}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nilai Ujian Terendah</p>
                          <p className="text-lg font-black text-rose-500 font-outfit">{lowestScore}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left col-span-2 sm:col-span-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pelajaran Terbaik</p>
                          <p className="text-xs font-black text-emerald-700 font-outfit truncate">{bestSubject}</p>
                        </div>
                      </div>
                    </div>

                    {/* Insight Otomatis */}
                    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-outline-variant p-5 rounded-[2rem] shadow-sm relative overflow-hidden text-left">
                      <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">psychology</span> Kesimpulan Akademik
                      </h4>
                      <p className="text-xs font-semibold text-primary leading-relaxed">
                        {insightText}
                      </p>
                    </div>

                    {/* Grafik Perkembangan Nilai */}
                    {isMounted && totalExams >= 1 && (
                      <div className="bg-surface border border-outline-variant rounded-[2rem] p-5 sm:p-6 shadow-sm space-y-4 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] flex items-center gap-2">
                            <TrendingUp size={14} className="text-secondary" /> Grafik Perkembangan Nilai
                          </h4>
                          {totalExams >= 2 && (
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${trendColor}`}>
                              {trendText}
                            </span>
                          )}
                        </div>
                        <div className="h-[200px] w-full pt-4">
                          <ResponsiveContainer width="99%" height={200}>
                            <LineChart data={chartData} margin={CHART_MARGIN}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={CHART_TICK_STYLE} />
                              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={CHART_TICK_STYLE} />
                              <Tooltip 
                                contentStyle={TOOLTIP_CONTENT_STYLE} 
                                formatter={(value, name, props) => [`Nilai: ${value}`, `${props.payload.subject}`]}
                              />
                              <Line type="monotone" dataKey="nilai" stroke="#3b82f6" strokeWidth={3} activeDot={ACTIVE_DOT_PROPS} dot={DOT_PROPS} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Rekam Jejak List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-on-surface-variant/60 uppercase tracking-[0.2em] px-1 text-left">Daftar Sesi Ujian</h4>
                      <div className="space-y-3">
                        {academicHistory.map((grade: any, idx: number) => (
                          <div key={idx} className="bg-white p-4 sm:p-5 rounded-2xl border border-surface-container flex items-center justify-between shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
                            <div className="flex flex-col gap-1 min-w-0 flex-1 text-left">
                              <h4 className="text-on-primary-fixed font-extrabold text-sm uppercase leading-tight truncate">{grade.sessionName}</h4>
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">{grade.subject} • {formatDate(grade.date)}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0 ml-4">
                              <p className={`text-xl sm:text-2xl font-black leading-none ${grade.isPassing ? 'text-secondary' : 'text-error'}`}>{grade.score}</p>
                              <p className="text-[8px] font-black text-on-surface-variant uppercase bg-slate-100 px-1.5 py-0.5 rounded">KKM: {grade.kkm}</p>
                              
                              {!isAdmin && grade.hasRemedialAvailable && onStartRemedial && (
                                isParent ? (
                                  <button 
                                    disabled
                                    title="Remedial hanya dapat dimulai dengan login menggunakan akun Google Siswa"
                                    className="mt-1.5 px-3 py-1.5 bg-slate-200 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-not-allowed opacity-80"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">edit_note</span>
                                    Remedial (Siswa Saja)
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => onStartRemedial(grade.sessionName)}
                                    className="mt-1.5 px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1 shadow-sm shadow-rose-500/20"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">edit_note</span>
                                    Remedial
                                  </button>
                                )
                              )}
                              {!grade.isPassing && isParent && (
                                <button 
                                  onClick={() => {
                                    const deadlineText = grade.remedialDeadline ? formatDate(grade.remedialDeadline) : 'Batas Waktu Sesi';
                                    const appUrl = typeof window !== 'undefined' ? `${window.location.origin}` : 'https://web-input-nilai.vercel.app';
                                    const message = `*GradeMaster OS - Pemberitahuan Remedial* 🔄\n\nHalo, berikut adalah informasi pengerjaan remedial:\n👤 *Nama Siswa*: ${studentName}\n🏫 *Kelas*: ${className}\n📚 *Mata Pelajaran*: ${grade.subject}\n📝 *Sesi*: ${grade.sessionName}\n📊 *Nilai Ujian*: ${grade.score} (KKM: ${grade.kkm})\n⚠️ *Alasan*: Nilai di bawah batas kelulusan KKM.\n\nSilakan kerjakan remedial secara mandiri melalui tautan resmi ini:\n🔗 *Link Remedial*: ${appUrl}\n\n*Batas Waktu*: ${deadlineText}\nMohon diselesaikan sebelum tenggat waktu. Terima kasih!`;
                                    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                                    window.open(waUrl, '_blank');
                                  }}
                                  className="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1 shadow-sm shadow-emerald-600/20"
                                  title="Bagikan informasi remedial ke WhatsApp"
                                >
                                  <Share2 size={10} />
                                  Bagikan WA
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })()}

          {activeTab === 'DOCUMENTS' && (
            <section className="space-y-6 pt-4 animate-in fade-in duration-300">
              <h3 className="text-on-primary-fixed font-bold text-lg tracking-tight">Dokumen Tersedia</h3>
              {isLoadingSummary ? (
                 <div className="py-12 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
                   <Loader2 size={32} className="animate-spin" />
                   <p className="text-xs font-bold uppercase">Menyiapkan...</p>
                 </div>
              ) : (
                <div className="space-y-3">
                   {studentSummary?.documents?.map((doc: any) => (
                     <div key={doc.id} className={`bg-white p-4 rounded-xl border border-surface-container flex items-center justify-between shadow-sm ${!doc.ready ? 'opacity-40' : ''}`}>
                       <div className="flex items-center gap-3">
                          <FileText className="text-on-surface-variant" size={20} />
                          <div>
                            <h4 className="text-on-primary-fixed font-bold text-sm leading-tight truncate">{doc.name}</h4>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider truncate">{doc.size}</p>
                          </div>
                       </div>
                       {doc.ready && (
                         <button className="text-on-primary-fixed transition-colors hover:scale-110">
                           <DownloadCloud size={18} />
                         </button>
                       )}
                     </div>
                   ))}
                </div>
              )}
            </section>
          )}

          {isAdmin && activeTab === 'MANAGE' && (
            <section className="space-y-6 pt-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-white border border-surface-container rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-on-primary-fixed transition-all"
                />
                <div className="grid grid-cols-1 gap-2">
                  {localReasons.map(r => (
                    <button 
                      key={r.text} 
                      disabled={isUpdatingPoints}
                      onClick={() => handleAddBehavior(r.weight, r.text)} 
                      className="p-4 bg-surface-container-low hover:bg-surface-container border border-surface-container rounded-xl text-left transition-all active:scale-95 flex items-center justify-between group"
                    >
                      <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider truncate">{r.text}</span>
                      <span className="text-[10px] font-black text-error">+ {r.weight} Pts</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleAvatarUpload} 
      />
    </div>
  );
}
