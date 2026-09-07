"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Loader2,
  Code,
  Languages,
  Globe2,
  BookOpen,
  FileText,
  Award,
  HelpCircle,
  Sparkles,
  Send,
  RotateCcw,
  Compass as CompassIcon,
  ArrowRight,
  Plus,
  Search,
  School,
  Layers,
  Users,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { SessionMeta, Layer } from '@/lib/grademaster/types';
import { useGradeMaster } from '@/context/GradeMasterContext';
import DOMPurify from 'isomorphic-dompurify';

const GeminiLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 256 256" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="geminiGrad1" cx="78%" cy="55%" r="78%" fx="78%" fy="55%">
        <stop offset="0%" stopColor="#1ba1e3" />
        <stop offset="30%" stopColor="#5489d6" />
        <stop offset="54%" stopColor="#9b72cb" />
        <stop offset="82%" stopColor="#d96570" />
        <stop offset="100%" stopColor="#f49c46" />
      </radialGradient>
      <radialGradient id="geminiGrad2" cx="-3%" cy="-54%" r="169%" fx="-3%" fy="-54%">
        <stop offset="0%" stopColor="#1ba1e3" />
        <stop offset="30%" stopColor="#5489d6" />
        <stop offset="54%" stopColor="#9b72cb" />
        <stop offset="82%" stopColor="#d96570" />
        <stop offset="100%" stopColor="#f49c46" />
      </radialGradient>
    </defs>
    <g transform="translate(53, 53) scale(0.58)">
      <path
        fill="url(#geminiGrad1)"
        d="m122.062 172.77l-10.27 23.52c-3.947 9.042-16.459 9.042-20.406 0l-10.27-23.52c-9.14-20.933-25.59-37.595-46.108-46.703L6.74 113.52c-8.987-3.99-8.987-17.064 0-21.053l27.385-12.156C55.172 70.97 71.917 53.69 80.9 32.043L91.303 6.977c3.86-9.303 16.712-9.303 20.573 0l10.403 25.066c8.983 21.646 25.728 38.926 46.775 48.268l27.384 12.156c8.987 3.99 8.987 17.063 0 21.053l-28.267 12.547c-20.52 9.108-36.97 25.77-46.109 46.703"
      />
      <path
        fill="url(#geminiGrad2)"
        d="m217.5 246.937l-2.888 6.62c-2.114 4.845-8.824 4.845-10.937 0l-2.889-6.62c-5.148-11.803-14.42-21.2-25.992-26.34l-8.898-3.954c-4.811-2.137-4.811-9.131 0-11.269l8.4-3.733c11.87-5.273 21.308-15.017 26.368-27.22l2.966-7.154c2.067-4.985 8.96-4.985 11.027 0l2.966 7.153c5.06 12.204 14.499 21.948 26.368 27.221l8.4 3.733c4.812 2.138 4.812 9.132 0 11.27l-8.898 3.953c-11.571 5.14-20.844 14.537-25.992 26.34"
      />
    </g>
  </svg>
);

interface HomeLayerProps {
  sessions: SessionMeta[];
  isLoading: boolean;
  onCreateNew: () => void;
  onSessionClick: (session: SessionMeta) => void;
  onDeleteSession: (id: string, name: string) => void;
  onOpenAbout: () => void;
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  userData: { name?: string; class_name?: string; subject?: string };
  isStudent: boolean;
  onLayoutChange?: (view: 'ai' | 'traditional' | 'expanded') => void;
}

interface ClassGroup {
  className: string;
  academicYear: string;
  schoolLevel: string;
  sessions: SessionMeta[];
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  actions?: { label: string; layer: Layer; description?: string }[];
}

export default function HomeLayer(props: HomeLayerProps) {
  const {
    sessions,
    isLoading,
    onCreateNew,
    onSessionClick,
    onDeleteSession,
    isAdmin,
    userData,
    isStudent,
    onLayoutChange,
  } = props;

  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [behaviorSummary, setBehaviorSummary] = useState<Record<string, { count: number; avgPoints: number }>>({});
  const [classSearch, setClassSearch] = useState('');
  const [mobileTab, setMobileTab] = useState<'DASHBOARD' | 'AI'>('DASHBOARD');

  // AI Chat states and context
  const { setLayer, setStudentClass, studentClass } = useGradeMaster();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showTraditionalClasses, setShowTraditionalClasses] = useState(true);
  const [showPreferencePopup, setShowPreferencePopup] = useState(false);

  // Load layout preference on mount
  useEffect(() => {
    const pref = localStorage.getItem('gm_home_layout_pref');
    const timer = setTimeout(() => {
      if (!pref) {
        // Default to traditional/split for teachers
        setShowTraditionalClasses(true);
      } else {
        setShowTraditionalClasses(pref === 'traditional');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const savePreference = (choice: 'ai' | 'traditional') => {
    localStorage.setItem('gm_home_layout_pref', choice);
    setShowTraditionalClasses(choice === 'traditional');
    setShowPreferencePopup(false);
    if (choice === 'ai') {
      setExpandedClass(null);
    }
  };

  useEffect(() => {
    if (expandedClass) {
      onLayoutChange?.('expanded');
    } else {
      onLayoutChange?.(showTraditionalClasses ? 'traditional' : 'ai');
    }
  }, [expandedClass, showTraditionalClasses, onLayoutChange]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat internally
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isAiResponding]);

  const getInitialMessage = useCallback(() => {
    const userLabel = userData.name || (isAdmin ? 'Guru GradeMaster' : 'Siswa');
    const welcomeText = `Halo **${userLabel}**! Saya **Navigator Asisten AI**. 🤖✨\n\nSiap membantu Anda mengelola sesi KBM, penilaian, dan administrasi siswa secara cepat. Ketik perintah seperti *'absen kelas 7A'*, *'koreksi UTS Matematika'*, atau klik tombol aksi pintas di bawah:`;

    let actions: { label: string; layer: Layer; description?: string }[] = [];

    if (isAdmin) {
      actions = [
        { label: "Buat Sesi Ujian Baru", layer: "setup", description: "Atur KKM & esai" },
        { label: "Cek Kehadiran Siswa", layer: "attendance", description: "Rekap presensi siswa" },
        { label: "Data Kedisiplinan & Sikap", layer: "behavior", description: "Poin pelanggaran/prestasi" },
        { label: "Kelola Mata Pelajaran", layer: "lesson_management", description: "Jadwal & ujian susulan" },
        { label: "Akun Siswa & Kenaikan", layer: "student_accounts", description: "Kenaikan kelas & PIN" },
      ];
    } else {
      actions = [
        { label: "Pelajaran Saya", layer: "student_lesson", description: "Akses materi & ujian" },
        { label: "Rapor Profil Saya", layer: "student_profile", description: "Detail rekap nilai" },
      ];
    }

    return {
      id: 'welcome',
      role: 'assistant',
      content: welcomeText,
      actions,
    };
  }, [isAdmin, userData.name]);

  const getPresetChips = useCallback(() => {
    if (isAdmin) {
      return [
        "Buat Sesi Ujian Baru",
        "Absen kelas 7A",
        "Rekap nilai matematika",
        "Buka dashboard sikap",
      ];
    }
    return [
      "Bagaimana cara mengerjakan ujian?",
      "Tampilkan rapor nilai saya",
      "Lihat jadwal pelajaran",
    ];
  }, [isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([getInitialMessage()]);
      setSuggestedQuestions(getPresetChips());
    }, 0);
    return () => clearTimeout(timer);
  }, [getInitialMessage, getPresetChips]);

  // Smart class resolving
  const matchAndSetClass = (text: string) => {
    const normalized = text.toUpperCase();
    const classRegex = /\b(KELAS\s*)?([789]|VII|VIII|IX)\s*[-_]?\s*([A-F])\b/i;
    const match = normalized.match(classRegex);
    if (match) {
      let levelStr = match[2];
      const charStr = match[3];

      if (levelStr === 'VII') levelStr = '7';
      if (levelStr === 'VIII') levelStr = '8';
      if (levelStr === 'IX') levelStr = '9';

      const matchedClass = `${levelStr}${charStr}`;
      const exists = sessions.some((s) => (s.class_name || '').toUpperCase() === matchedClass);
      if (exists) {
        setStudentClass(matchedClass);
        return matchedClass;
      }
    }
    return null;
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isAiResponding) return;

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsAiResponding(true);

    if (text.trim() === "Lihat Daftar Kelas Tradisional" || text.trim() === "Tampilkan Daftar Kelas Manual") {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "Daftar kelas operasional selalu aktif berdampingan di panel sebelah kiri dashboard Anda.",
          },
        ]);
        setShowTraditionalClasses(true);
        setIsAiResponding(false);
      }, 300);
      return;
    }

    const matchedClass = matchAndSetClass(text);

    try {
      const historyPayload = messages
        .filter((m) => !m.content.startsWith('⚡'))
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/grademaster/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          role: isAdmin ? 'teacher' : (isStudent ? 'student' : 'guest'),
          currentLayer: 'home',
          studentClass: matchedClass || studentClass,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan pada server AI.');

      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || 'Ada yang bisa saya bantu kembali?',
        actions: data.suggestedActions || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      } else {
        setSuggestedQuestions(getPresetChips());
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Maaf, layanan asisten cerdas sedang tidak tersedia. Silakan gunakan menu navigasi atau coba sesaat lagi.`,
        },
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleActionClick = (targetLayer: Layer) => {
    if (targetLayer === 'home') {
      setShowTraditionalClasses(true);
      return;
    }

    setLayer(targetLayer);

    const pageNames: Record<string, string> = {
      home: "Beranda Utama",
      setup: "Konfigurasi Sesi Baru",
      dashboard: "Analisis Nilai Kelas",
      grading: "Input & Koreksi Nilai",
      login: "Masuk Guru/Admin",
      remedial: "Lembar Kerja Remedial",
      behavior: "Dashboard Sikap & Disiplin",
      remedial_dashboard: "Dashboard Remedial",
      attendance: "Manajemen Kehadiran",
      student_accounts: "Manajemen Akun Siswa",
      student_login: "Masuk Siswa/Orang Tua",
      student_profile: "Profil Siswa",
      lesson_management: "Kelola Mata Pelajaran",
      student_lesson: "Pelajaran Saya",
      remedial_management: "Kelola Soal Remedial",
      data_center: "Pusat Data Terpadu",
    };

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        role: 'assistant',
        content: `⚡ *Berhasil mengarahkan Anda ke halaman **${pageNames[targetLayer] || targetLayer}**.*`,
      },
    ]);
  };

  const formatMessageText = (text: string) => {
    if (!text) return '';
    return text.split('\n').map((line, idx) => {
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const italicRegex = /\*(.*?)\*/g;

      formattedLine = formattedLine.replace(boldRegex, '<strong>$1</strong>');
      formattedLine = formattedLine.replace(italicRegex, '<em>$1</em>');

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li
            key={idx}
            className="ml-4 list-disc text-xs sm:text-sm leading-relaxed py-0.5"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedLine.replace(/^[-*]\s+/, '')) }}
          />
        );
      }

      return (
        <p
          key={idx}
          className="text-xs sm:text-sm leading-relaxed mb-2"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedLine) }}
        />
      );
    });
  };

  const classGroups = useMemo(() => {
    const map: Record<string, ClassGroup> = {};
    for (const s of sessions) {
      const key = `${s.class_name || 'Umum'}__${s.academic_year || '2025/2026'}`;
      if (!map[key]) {
        map[key] = {
          className: s.class_name || 'Umum',
          academicYear: s.academic_year || '2025/2026',
          schoolLevel: s.school_level || 'SMP',
          sessions: [],
        };
      }
      map[key].sessions.push(s);
    }
    return Object.values(map).sort((a, b) => a.className.localeCompare(b.className));
  }, [sessions]);

  // Operational KPI Calculations based strictly on real state/props
  const kpiStats = useMemo(() => {
    let totalStudents = 0;
    for (const key of Object.keys(behaviorSummary)) {
      totalStudents += behaviorSummary[key]?.count || 0;
    }

    const publicSessions = sessions.filter((s) => s.is_public).length;
    const privateSessions = sessions.filter((s) => !s.is_public).length;

    return {
      totalClasses: classGroups.length,
      totalSessions: sessions.length,
      totalStudents,
      publicSessions,
      privateSessions,
    };
  }, [classGroups.length, sessions, behaviorSummary]);

  // Class Search Filter
  const filteredClassGroups = useMemo(() => {
    if (!classSearch.trim()) return classGroups;
    const q = classSearch.toLowerCase().trim();
    return classGroups.filter(
      (g) =>
        g.className.toLowerCase().includes(q) ||
        g.academicYear.toLowerCase().includes(q) ||
        g.schoolLevel.toLowerCase().includes(q)
    );
  }, [classGroups, classSearch]);

  useEffect(() => {
    const fetchAll = async () => {
      const summaryMap: Record<string, { count: number; avgPoints: number }> = {};
      await Promise.all(
        classGroups.map(async (g) => {
          try {
            const res = await fetch(
              `/api/grademaster/behaviors?class=${encodeURIComponent(g.className)}&year=${encodeURIComponent(g.academicYear)}`
            );
            const data = await res.json();
            const students = data.students || [];
            const avg =
              students.length > 0
                ? Math.round(
                    students.reduce((sum: number, s: { total_points?: number }) => sum + (s.total_points || 0), 0) /
                      students.length
                  )
                : 0;
            summaryMap[`${g.className}__${g.academicYear}`] = { count: students.length, avgPoints: avg };
          } catch {
            summaryMap[`${g.className}__${g.academicYear}`] = { count: 0, avgPoints: 0 };
          }
        })
      );
      setBehaviorSummary(summaryMap);
    };
    if (classGroups.length > 0) fetchAll();
  }, [classGroups]);

  const expandedGroup = expandedClass
    ? classGroups.find((g) => `${g.className}__${g.academicYear}` === expandedClass)
    : null;

  const getSubjectIcon = (subjectName: string) => {
    const name = (subjectName || '').toLowerCase().trim();
    if (name.includes('informatika') || name.includes('komputer') || name.includes('coding') || name.includes('ict')) {
      return <Code className="text-sky-500" size={20} />;
    }
    if (name.includes('arab') || name.includes('arabic')) {
      return <Languages className="text-emerald-500" size={20} />;
    }
    if (name.includes('inggris') || name.includes('english')) {
      return <Globe2 className="text-indigo-500" size={20} />;
    }
    if (name.includes('indonesia') || name.includes('indo')) {
      return <FileText className="text-rose-500" size={20} />;
    }
    if (name.includes('agama') || name.includes('pai') || name.includes('islam') || name.includes('fiqih')) {
      return <BookOpen className="text-teal-500" size={20} />;
    }
    if (name.includes('pkn') || name.includes('kewarganegaraan') || name.includes('pancasila')) {
      return <Award className="text-yellow-600" size={20} />;
    }
    return <HelpCircle className="text-slate-400" size={20} />;
  };

  const sessionsBySubject = useMemo(() => {
    if (!expandedGroup) return [];
    const map: Record<string, SessionMeta[]> = {};
    for (const s of expandedGroup.sessions) {
      const subj = s.subject || 'Lainnya';
      if (!map[subj]) {
        map[subj] = [];
      }
      map[subj].push(s);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [expandedGroup]);

  return (
    <main className="flex-1 min-h-screen pt-2 md:pt-[env(safe-area-inset-top,20px)] mt-2 md:mt-20 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-28 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* ── EXPANDED CLASS VIEW: DETAIL SESI PER MAPEL ───────────────────────── */}
      {expandedGroup ? (
        <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
          {/* Header Bar */}
          <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/15 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setExpandedClass(null)}
                className="w-10 h-10 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-all active:scale-95 border border-outline-variant/20 shadow-xs cursor-pointer text-on-surface"
                title="Kembali ke Dashboard Utama"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary-container/20 px-2.5 py-0.5 rounded-md inline-block mb-1">
                  Tahun Ajaran {expandedGroup.academicYear} • {expandedGroup.schoolLevel}
                </span>
                <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                  Kelas {expandedGroup.className}
                </h1>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={onCreateNew}
                className="h-11 px-4 bg-primary hover:bg-primary-dim active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Plus size={16} />
                <span>Buat Sesi Ujian Baru</span>
              </button>
            )}
          </div>

          {/* Sesi List Grouped by Subject */}
          <div className="flex flex-col gap-8">
            {sessionsBySubject.length === 0 ? (
              <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/30 p-6 space-y-2">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">folder_open</span>
                <h3 className="font-headline text-base font-bold text-on-surface">Belum Ada Sesi untuk Kelas Ini</h3>
                <p className="text-xs text-on-surface-variant">Klik tombol &ldquo;Buat Sesi Ujian Baru&rdquo; di atas untuk memulai penilaian.</p>
              </div>
            ) : (
              sessionsBySubject.map(([subjectName, subjSessions]) => (
                <div key={subjectName} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center border border-outline-variant/10 shadow-2xs">
                      {getSubjectIcon(subjectName)}
                    </div>
                    <div>
                      <h3 className="font-headline text-base font-black text-on-surface uppercase tracking-tight">
                        {subjectName}
                      </h3>
                      <p className="text-[10px] font-semibold text-on-surface-variant/70">
                        {subjSessions.length} Sesi Evaluasi Terdaftar
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjSessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onSessionClick(s)}
                        className="group relative bg-surface-container-lowest hover:bg-surface-container-low p-5 rounded-2xl border border-outline-variant/15 shadow-2xs hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container-high text-on-surface-variant">
                              {s.is_public ? 'Public' : 'Private'}
                            </span>
                            {s.is_demo && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                Demo
                              </span>
                            )}
                          </div>
                          <h4 className="font-headline text-base font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                            {s.session_name}
                          </h4>
                          <p className="text-xs text-on-surface-variant mt-1">
                            Tipe: <span className="font-semibold text-on-surface">{s.exam_type || 'UJIAN'}</span>
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-4 border-t border-outline-variant/10">
                          <span className="text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1">
                            Buka Nilai <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                          </span>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(s.id, s.session_name);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-error hover:bg-error/10 transition-colors"
                              title="Hapus Sesi"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ── DASHBOARD UTAMA OPERASIONAL + ASISTEN AI (2-KOLOM PADA DESKTOP) ── */
        <div className="flex flex-col gap-6">

          {/* Top Operational Action Bar */}
          <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-outline-variant/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                {isAdmin ? (
                  <ShieldCheck className="w-6 h-6 text-primary" />
                ) : (
                  <School className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {isAdmin ? (userData.subject || 'Admin / Pengajar') : `Siswa Kelas ${userData.class_name || '-'}`}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sistem Aktif" />
                </div>
                <h1 className="font-headline text-xl sm:text-2xl font-bold text-on-surface truncate tracking-tight mt-0.5">
                  Selamat Datang, {userData.name || (isAdmin ? 'Bapak/Ibu Guru' : 'Siswa')}
                </h1>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5 truncate">
                  Platform Penilaian & Evaluasi Pembelajaran Terpadu • GradeMaster OS
                </p>
              </div>
            </div>

            {/* Primary Action Button: Clear Desktop Text Label */}
            <div className="flex items-center gap-2.5 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="w-full sm:w-auto h-11 px-5 bg-primary hover:bg-primary-dim active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-primary/25 transition-all cursor-pointer"
                  title="Buat Sesi Kelas Baru"
                >
                  <Plus size={18} className="shrink-0" />
                  <span>Buat Sesi Kelas Baru</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Segmented Switcher (Visible only on mobile screen < lg) */}
          <div className="lg:hidden flex bg-surface-container-high p-1 rounded-xl border border-outline-variant/20">
            <button
              type="button"
              onClick={() => setMobileTab('DASHBOARD')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'DASHBOARD'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <School size={15} />
              <span>Daftar Kelas ({classGroups.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('AI')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'AI'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Sparkles size={15} />
              <span>Asisten AI</span>
            </button>
          </div>

          {/* 2-COLUMN RESPONSIVE LAYOUT (lg: 68% Main Dashboard, 32% AI Sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── LEFT COLUMN: OPERATIONAL METRICS & CLASS LIST (68%) ── */}
            <section
              className={`lg:col-span-8 flex flex-col gap-6 ${
                mobileTab === 'AI' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Operational KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/15 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Rombel Aktif</span>
                    <School className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-headline font-black text-on-surface">
                    {kpiStats.totalClasses}
                  </p>
                  <span className="text-[10px] text-on-surface-variant/70 font-semibold">Tingkat SMP & SMA</span>
                </div>

                <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/15 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Sesi Penilaian</span>
                    <Layers className="w-4 h-4 text-sky-600" />
                  </div>
                  <p className="text-2xl font-headline font-black text-on-surface">
                    {kpiStats.totalSessions}
                  </p>
                  <span className="text-[10px] text-on-surface-variant/70 font-semibold">Ujian & Tugas KBM</span>
                </div>

                <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/15 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Siswa Terdata</span>
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-headline font-black text-on-surface">
                    {kpiStats.totalStudents > 0 ? kpiStats.totalStudents : '-'}
                  </p>
                  <span className="text-[10px] text-on-surface-variant/70 font-semibold">Buku Induk & Nilai</span>
                </div>

                <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/15 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Status Akses</span>
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-2xl font-headline font-black text-on-surface">
                    {kpiStats.publicSessions}
                  </p>
                  <span className="text-[10px] text-on-surface-variant/70 font-semibold">Sesi Publik Siap</span>
                </div>
              </div>

              {/* Class Groups Directory Section */}
              <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-outline-variant/15 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/10">
                  <div>
                    <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface tracking-tight">
                      Daftar Rombongan Belajar
                    </h2>
                    <p className="text-xs text-on-surface-variant font-medium">
                      Pilih kelas untuk melihat rincian evaluasi per mata pelajaran
                    </p>
                  </div>

                  {classGroups.length > 4 && (
                    <div className="relative w-full sm:w-56 shrink-0">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                        placeholder="Cari kelas..."
                        className="w-full h-9 pl-8 pr-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-xs text-on-surface placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>

                {isLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center gap-2 text-on-surface-variant">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <p className="text-xs font-bold">Memuat data rombel & sesi...</p>
                  </div>
                ) : filteredClassGroups.length === 0 ? (
                  <div className="py-12 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-6 space-y-2">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">school</span>
                    <h3 className="font-headline text-sm font-bold text-on-surface">
                      {classSearch ? 'Kelas Tidak Ditemukan' : 'Belum Ada Sesi Kelas Terdaftar'}
                    </h3>
                    <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                      {classSearch
                        ? `Tidak ada rombel yang cocok dengan pencarian "${classSearch}".`
                        : 'Mulai dengan membuat sesi kelas atau ujian baru melalui tombol di atas.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredClassGroups.map((g, index) => {
                      const key = `${g.className}__${g.academicYear}`;
                      const bData = behaviorSummary[key] || { count: 0 };
                      const isFirst = index === 0;

                      return (
                        <div
                          key={key}
                          onClick={() => setExpandedClass(key)}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between text-left group active:scale-[0.99] shadow-2xs hover:shadow-xs ${
                            isFirst
                              ? 'bg-surface-container-lowest border-primary/30 hover:border-primary'
                              : 'bg-surface-container-lowest border-outline-variant/15 hover:border-outline-variant/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="font-headline text-2xl font-black text-on-surface group-hover:text-primary transition-colors">
                                Kelas {g.className}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/10">
                                {g.schoolLevel} • {g.academicYear}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant">
                              Tersedia <span className="font-bold text-on-surface">{g.sessions.length} Sesi Evaluasi</span> aktif.
                            </p>
                          </div>

                          <div className="pt-3.5 mt-3.5 border-t border-outline-variant/10 flex items-center justify-between">
                            <span className="text-[11px] text-on-surface-variant font-medium">
                              👥 {bData.count > 0 ? `${bData.count} Siswa` : 'Belum ada siswa'}
                            </span>
                            <span className="text-xs font-bold text-primary group-hover:underline flex items-center gap-1">
                              Buka Rombel <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* System Note Banner */}
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex items-start gap-3 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5">verified</span>
                <p className="leading-relaxed">
                  Semua data kelas dan sesi terhubung otomatis dengan database nilai. Anda dapat membuat sesi baru, mengedit bobot soal, atau mengaktifkan mode remedial kapan saja.
                </p>
              </div>
            </section>

            {/* ── RIGHT COLUMN: COMPACT AI NAVIGATOR SIDEBAR (32%) ── */}
            <aside
              className={`lg:col-span-4 flex flex-col gap-4 ${
                mobileTab === 'DASHBOARD' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-lg flex flex-col overflow-hidden h-[540px] sm:h-[600px] lg:h-[620px] relative">
                
                {/* AI Sidebar Header */}
                <div className="p-4 bg-gradient-to-r from-violet-950/40 via-slate-900 to-slate-950 border-b border-white/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center border border-violet-500/30 shrink-0">
                      <GeminiLogo className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-headline font-bold text-xs sm:text-sm text-slate-100 truncate">
                        Navigator Asisten AI
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Siap Membantu</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMessages([getInitialMessage()]);
                      setSuggestedQuestions(getPresetChips());
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Reset Percakapan"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>

                {/* AI Chat Messages Body */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 no-scrollbar scroll-smooth"
                >
                  {messages.map((msg) => {
                    const isAI = msg.role === 'assistant';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 max-w-[92%] ${isAI ? 'self-start' : 'self-end ml-auto flex-row-reverse'}`}
                      >
                        {isAI && (
                          <div className="w-6 h-6 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                            <GeminiLogo className="w-4 h-4" />
                          </div>
                        )}

                        <div
                          className={`p-3 rounded-2xl text-xs ${
                            isAI
                              ? 'bg-slate-900/90 text-slate-200 border border-white/5'
                              : 'bg-primary text-white rounded-tr-none'
                          }`}
                        >
                          <div className="leading-relaxed">
                            {formatMessageText(msg.content)}
                          </div>

                          {/* Action Shortcuts Buttons */}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                Aksi Cepat:
                              </span>
                              <div className="flex flex-col gap-1">
                                {msg.actions.map((act, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleActionClick(act.layer)}
                                    className="px-2.5 py-1.5 bg-white/5 hover:bg-violet-500/20 text-slate-200 hover:text-violet-200 rounded-lg text-[11px] font-semibold flex items-center justify-between transition-colors border border-white/5 text-left cursor-pointer"
                                  >
                                    <span className="truncate">{act.label}</span>
                                    <ArrowRight size={11} className="text-slate-400 shrink-0 ml-1" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isAiResponding && (
                    <div className="flex gap-2.5 max-w-[85%] self-start">
                      <div className="w-6 h-6 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <GeminiLogo className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="p-2.5 px-3 bg-slate-900 text-slate-400 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2 text-xs">
                        <Loader2 size={12} className="animate-spin text-violet-400" />
                        <span className="text-[10px] font-bold text-slate-300">Memproses navigasi...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggestion Chips */}
                <div className="px-3.5 py-2 bg-slate-950/80 border-t border-white/5 flex flex-col gap-1 shrink-0">
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(q)}
                        className="flex-none px-2.5 py-1 bg-white/5 hover:bg-violet-500/20 text-slate-300 hover:text-violet-200 border border-white/5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }}
                  className="p-2.5 bg-slate-950 border-t border-white/5 flex gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isAiResponding ? 'Sedang memproses...' : 'Tanya GradeMaster AI...'}
                    disabled={isAiResponding}
                    className="flex-1 h-9 px-3 bg-slate-900 border border-white/10 focus:border-violet-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isAiResponding || !inputValue.trim()}
                    className="w-9 h-9 bg-primary hover:bg-primary-dim disabled:opacity-30 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Kirim Pesan"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Preference Popup Modal Overlay (Preserved for compatibility) */}
      {showPreferencePopup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-5 relative overflow-hidden">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20 mb-1">
                <GeminiLogo className="w-7 h-7" />
              </div>
              <h3 className="font-headline font-bold text-lg text-slate-100">Selamat Datang di GradeMaster OS</h3>
              <p className="text-xs text-slate-400">
                Pilih gaya tampilan beranda yang paling nyaman untuk Anda bekerja sehari-hari.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => savePreference('traditional')}
                className="p-4 bg-slate-800 hover:bg-slate-700/80 border border-white/10 rounded-2xl text-left transition-all cursor-pointer flex items-center gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <School size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100">Dashboard Operasional 2-Kolom (Rekomendasi)</h4>
                  <p className="text-[11px] text-slate-400">Daftar kelas di kolom utama dengan Navigator Asisten AI di sidebar.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => savePreference('ai')}
                className="p-4 bg-slate-800/60 hover:bg-slate-700/80 border border-white/5 rounded-2xl text-left transition-all cursor-pointer flex items-center gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100">Mode Asisten AI Penuh</h4>
                  <p className="text-[11px] text-slate-400">Interaksi percakapan penuh dengan GradeMaster AI Navigator.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
