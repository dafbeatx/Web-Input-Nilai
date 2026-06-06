"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Code, Languages, Globe2, Binary, Atom, Compass, BookOpen, FileText, Award, HelpCircle, Sparkles, Send, Bot, RotateCcw, Compass as CompassIcon, ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';
import { SessionMeta } from '@/lib/grademaster/types';
import { useGradeMaster } from '@/context/GradeMasterContext';

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
      <path fill="url(#geminiGrad1)" d="m122.062 172.77l-10.27 23.52c-3.947 9.042-16.459 9.042-20.406 0l-10.27-23.52c-9.14-20.933-25.59-37.595-46.108-46.703L6.74 113.52c-8.987-3.99-8.987-17.064 0-21.053l27.385-12.156C55.172 70.97 71.917 53.69 80.9 32.043L91.303 6.977c3.86-9.303 16.712-9.303 20.573 0l10.403 25.066c8.983 21.646 25.728 38.926 46.775 48.268l27.384 12.156c8.987 3.99 8.987 17.063 0 21.053l-28.267 12.547c-20.52 9.108-36.97 25.77-46.109 46.703" />
      <path fill="url(#geminiGrad2)" d="m217.5 246.937l-2.888 6.62c-2.114 4.845-8.824 4.845-10.937 0l-2.889-6.62c-5.148-11.803-14.42-21.2-25.992-26.34l-8.898-3.954c-4.811-2.137-4.811-9.131 0-11.269l8.4-3.733c11.87-5.273 21.308-15.017 26.368-27.22l2.966-7.154c2.067-4.985 8.96-4.985 11.027 0l2.966 7.153c5.06 12.204 14.499 21.948 26.368 27.221l8.4 3.733c4.812 2.138 4.812 9.132 0 11.27l-8.898 3.953c-11.571 5.14-20.844 14.537-25.992 26.34" />
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
}

interface ClassGroup {
  className: string;
  academicYear: string;
  schoolLevel: string;
  sessions: SessionMeta[];
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
    isStudent
  } = props;

  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [behaviorSummary, setBehaviorSummary] = useState<Record<string, { count: number; avgPoints: number }>>({});

  // AI Chat states and context
  const { setLayer, setStudentClass, studentClass, academicYear } = useGradeMaster();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<'ai' | 'classes'>('ai');
  const [showTraditionalClasses, setShowTraditionalClasses] = useState(false);
  const [showPreferencePopup, setShowPreferencePopup] = useState(false);

  // Load layout preference on mount
  useEffect(() => {
    const pref = localStorage.getItem('gm_home_layout_pref');
    if (!pref) {
      setShowPreferencePopup(true);
    } else {
      setShowTraditionalClasses(pref === 'traditional');
    }
  }, []);

  const savePreference = (choice: 'ai' | 'traditional') => {
    localStorage.setItem('gm_home_layout_pref', choice);
    setShowTraditionalClasses(choice === 'traditional');
    setShowPreferencePopup(false);
  };
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat internally (prevents outer window/body scroll jumps)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isAiResponding]);

  const getInitialMessage = () => {
    const userLabel = userData.name || (isAdmin ? 'Guru GradeMaster' : 'Siswa');
    let welcomeText = `Halo **${userLabel}**! Saya adalah **GradeMaster AI Navigator**. 🤖✨\n\nSaya di sini untuk membantu Anda mengoperasikan platform GradeMaster OS dengan asisten cerdas. Beritahu saya apa yang ingin Anda lakukan (contoh: *'absen kelas 7A'*, *'koreksi UTS Matematika'*, atau *'buka rekap sikap'*) dan saya akan mengarahkan Anda ke sana secara instan!`;

    let actions: { label: string; layer: any; description?: string }[] = [];

    if (isAdmin) {
      actions = [
        { label: "Buat Sesi Ujian Baru", layer: "setup", description: "Atur KKM & esai" },
        { label: "Cek Kehadiran", layer: "attendance", description: "Rekap presensi siswa" },
        { label: "Buka Data Sikap/Sikap", layer: "behavior", description: "Poin kedisiplinan" },
        { label: "Kelola Mata Pelajaran", layer: "lesson_management", description: "Kelola kurikulum & ujian susulan" }
      ];
    } else {
      actions = [
        { label: "Pelajaran Saya", layer: "student_lesson", description: "Akses materi & ujian" },
        { label: "Rapor Profil Saya", layer: "student_profile", description: "Detail rekap nilai" }
      ];
    }

    return {
      id: 'welcome',
      role: 'assistant',
      content: welcomeText,
      actions
    };
  };

  const getPresetChips = () => {
    if (isAdmin) {
      return [
        "Lihat Daftar Kelas Tradisional",
        "Absen kelas 7A",
        "Buat ujian susulan UTS Matematika",
        "Buka hasil nilai kelas 7B"
      ];
    }
    return [
      "Lihat Daftar Kelas Tradisional",
      "Bagaimana cara mengerjakan remedial?",
      "Tampilkan rapor nilai saya"
    ];
  };

  useEffect(() => {
    setMessages([getInitialMessage()]);
    setSuggestedQuestions(getPresetChips());
  }, [isAdmin, userData.name]);

  // Smart class resolving
  const matchAndSetClass = (text: string) => {
    const normalized = text.toUpperCase();
    const classRegex = /\b(KELAS\s*)?([789]|VII|VIII|IX)\s*[-_]?\s*([A-F])\b/i;
    const match = normalized.match(classRegex);
    if (match) {
      let levelStr = match[2];
      let charStr = match[3];
      
      if (levelStr === 'VII') levelStr = '7';
      if (levelStr === 'VIII') levelStr = '8';
      if (levelStr === 'IX') levelStr = '9';
      
      const matchedClass = `${levelStr}${charStr}`;
      // Check if this class exists in database sessions
      const exists = sessions.some(s => (s.class_name || '').toUpperCase() === matchedClass);
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
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsAiResponding(true);

    // Intercept manual class list requests directly to avoid API roundtrip
    if (text.trim() === "Lihat Daftar Kelas Tradisional" || text.trim() === "Tampilkan Daftar Kelas Manual") {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Menampilkan daftar kelas tradisional sesuai permintaan Anda. Klik tombol **Kembali ke AI Assistant** di atas untuk berinteraksi dengan asisten cerdas kembali."
          }
        ]);
        savePreference('traditional');
        setIsAiResponding(false);
      }, 400);
      return;
    }

    const matchedClass = matchAndSetClass(text);

    try {
      const historyPayload = messages
        .filter(m => !m.content.startsWith('⚡'))
        .slice(-6)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const res = await fetch('/api/grademaster/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          role: isAdmin ? 'teacher' : (isStudent ? 'student' : 'guest'),
          currentLayer: 'home',
          studentClass: matchedClass || studentClass
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan pada server AI.');

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Ada yang bisa saya bantu kembali?',
        actions: data.suggestedActions || []
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      } else {
        setSuggestedQuestions(getPresetChips());
      }

    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Maaf, layanan asisten cerdas sedang tidak tersedia. Silakan gunakan menu navigasi atau coba sesaat lagi.`
        }
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleActionClick = (targetLayer: any, label: string) => {
    if (targetLayer === 'home') {
      setShowTraditionalClasses(true);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: "Memuat daftar kelas tradisional secara manual..."
        }
      ]);
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
      data_center: "Pusat Data Terpadu"
    };

    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        role: 'assistant',
        content: `⚡ *Berhasil mengarahkan Anda ke halaman **${pageNames[targetLayer] || targetLayer}** secara otomatis!*`
      }
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
            dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s+/, '') }}
          />
        );
      }

      return (
        <p 
          key={idx} 
          className="text-xs sm:text-sm leading-relaxed mb-2"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
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

  useEffect(() => {
    const fetchAll = async () => {
      const summaryMap: Record<string, { count: number; avgPoints: number }> = {};
      await Promise.all(
        classGroups.map(async (g) => {
          try {
            const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(g.className)}&year=${encodeURIComponent(g.academicYear)}`);
            const data = await res.json();
            const students = data.students || [];
            const avg = students.length > 0
              ? Math.round(students.reduce((sum: number, s: any) => sum + (s.total_points || 0), 0) / students.length)
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

  const expandedGroup = expandedClass ? classGroups.find(g => `${g.className}__${g.academicYear}` === expandedClass) : null;

  const getSubjectIcon = (subjectName: string) => {
    const name = (subjectName || '').toLowerCase().trim();
    if (name.includes('informatika') || name.includes('komputer') || name.includes('coding') || name.includes('ict')) {
      return <Code className="text-sky-500 animate-pulse" size={20} />;
    }
    if (name.includes('arab') || name.includes('arabic')) {
      return <Languages className="text-emerald-500 animate-pulse" size={20} />;
    }
    if (name.includes('inggris') || name.includes('english')) {
      return <Globe2 className="text-indigo-500" size={20} />;
    }
    if (name.includes('matematika') || name.includes('math') || name.includes('hitung')) {
      return <Binary className="text-amber-500" size={20} />;
    }
    if (name.includes('ipa') || name.includes('sains') || name.includes('fisika') || name.includes('kimia') || name.includes('biologi')) {
      return <Atom className="text-purple-500" size={20} />;
    }
    if (name.includes('ips') || name.includes('sosial') || name.includes('sejarah') || name.includes('geografi') || name.includes('ekonomi')) {
      return <Compass className="text-orange-500" size={20} />;
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
    <main className="flex-1 min-h-screen pt-2 md:pt-[env(safe-area-inset-top,20px)] mt-2 md:mt-24 pb-4 md:pb-32 px-2 sm:px-6 flex flex-col gap-4 md:gap-8 max-w-7xl mx-auto w-full animate-in fade-in transition-all duration-300">
      
      {/* Personalized Identity Section */}
      {!expandedGroup && (
        <section className="mb-2 animate-in slide-in-from-top-4 duration-700 hidden md:block">
          <div className="bg-surface-container-low p-5 rounded-[2rem] border border-outline-variant/10 flex items-center gap-4 relative overflow-hidden premium-shadow">
             <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
               {isAdmin ? (
                 <span className="material-symbols-outlined text-2xl">shield_person</span>
               ) : (
                 <span className="material-symbols-outlined text-2xl">person_pin</span>
               )}
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 leading-none mb-1.5">
                  {isAdmin ? 'Admin / Guru' : 'Siswa Terverifikasi'}
                </p>
                <h2 className="text-lg font-black text-on-surface truncate tracking-tight leading-none">
                  {userData.name || (isAdmin ? 'Guru GradeMaster' : 'Siswa')}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                   <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-surface-container text-on-surface-variant rounded-md">
                     {isAdmin ? (userData.subject || 'Sistem') : (`Kelas ${userData.class_name || '-'}`)}
                   </span>
                   {isStudent && (
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                   )}
                </div>
             </div>
             {/* Abstract Decor */}
             <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          </div>
        </section>
      )}

      {/* Header Section */}
      <header className="flex flex-col">
        {expandedGroup ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold tracking-widest text-on-surface-variant uppercase border-t border-surface-container-high pt-4 inline-block">
              Tahun Ajaran {expandedGroup.academicYear}
            </p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setExpandedClass(null)} 
                className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center transition-all active:scale-90 border border-outline-variant/10 shadow-sm"
              >
                <span className="material-symbols-outlined text-on-surface text-xl">arrow_back</span>
              </button>
              <h1 className="font-headline text-4xl font-bold text-on-primary-fixed tracking-[-0.04em]">Kelas {expandedGroup.className}</h1>
            </div>
            <p className="text-on-surface-variant text-base leading-relaxed">Daftar sesi evaluasi dan ujian yang aktif untuk kelas ini.</p>
          </div>
        ) : (
          <div className="flex flex-col hidden md:flex">
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-4xl font-headline font-bold text-on-primary-fixed tracking-[-0.04em]">Dashboard Utama</h1>
              {isAdmin && (
                <button 
                  onClick={onCreateNew}
                  className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-surface-container-lowest shrink-0 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                  title="Buat Sesi Kelas Baru"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 600" }}>add</span>
                </button>
              )}
            </div>
            <p className="text-on-surface-variant text-base leading-relaxed w-[85%]">
              Gunakan asisten AI Navigator di bawah ini untuk berpindah halaman secara cerdas, atau pilih kelas secara manual.
            </p>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-24 gap-4">
          <Loader2 size={40} className="animate-spin text-tertiary" />
          <p className="font-label text-sm uppercase tracking-widest text-on-surface-variant animate-pulse">Menyiapkan Database...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-surface-container rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center px-6 premium-shadow">
           <div className="w-16 h-16 rounded-3xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-6">
             <span className="material-symbols-outlined text-4xl">folder_off</span>
           </div>
           <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Belum Ada Sesi Kelas</h3>
           <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6">Mulai perjalanan akademik Anda dengan membuat sesi evaluasi atau ujian untuk kelas pertama.</p>
           {isAdmin && (
            <button
             onClick={onCreateNew}
             className="px-6 py-3 bg-primary text-surface-container-lowest rounded-xl text-sm font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontVariationSettings: "'wght' 600" }}>add</span>
              Buat Evaluasi Perdana
            </button>
           )}
        </div>
      ) : expandedGroup ? (
        /* --- SESION LIST (Expanded View Grouped by Subject) --- */
        <div className="flex flex-col gap-10 animate-in slide-in-from-right-4 duration-300">
          {sessionsBySubject.map(([subjectName, subjSessions]) => (
            <div key={subjectName} className="flex flex-col gap-4">
              {/* Subject Group Title with Icon */}
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center shadow-sm border border-outline-variant/10">
                  {getSubjectIcon(subjectName)}
                </div>
                <div>
                  <h3 className="font-headline text-lg font-black text-on-surface leading-tight tracking-tight uppercase">
                    {subjectName}
                  </h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 leading-none mt-1">
                    {subjSessions.length} Sesi Evaluasi Aktif
                  </p>
                </div>
              </div>

              {/* Sessions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {subjSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSessionClick(s)}
                    className="group relative w-full text-left bg-surface-container-lowest ambient-shadow p-6 rounded-2xl transition-all duration-300 ease-out active:scale-[0.98] border border-outline-variant/10 overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="flex-1 pr-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {s.is_public ? (
                            <span className="bg-primary-container/10 text-on-primary-fixed text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">Public</span>
                          ) : (
                            <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">Private</span>
                          )}
                          {s.is_demo && (
                            <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">science</span> Demo
                            </span>
                          )}
                        </div>
                        <h3 className="font-headline text-xl font-bold text-on-surface leading-tight tracking-tight">{s.session_name}</h3>
                      </div>
                      
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300 transform group-hover:rotate-12 shadow-sm">
                        <span className="material-symbols-outlined text-xl">analytics</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between relative z-10 border-t border-surface-container-low pt-4">
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Tipe Evaluasi</p>
                        <p className="text-sm font-semibold text-on-surface">{s.exam_type || 'UJIAN'}</p>
                      </div>
                      
                      {isAdmin && (
                        <div 
                          onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id, s.session_name); }}
                          className="w-10 h-10 rounded-full hover:bg-error/10 text-on-surface-variant/40 hover:text-error flex items-center justify-center transition-all z-20 active:scale-90"
                          title="Hapus Sesi"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Highlight decorative */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors pointer-events-none"></div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : showTraditionalClasses ? (
        /* --- DAFTAR KELAS TRADISIONAL (Full Screen View) --- */
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowTraditionalClasses(false)} 
                className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center transition-all active:scale-90 border border-outline-variant/10 shadow-sm"
              >
                <span className="material-symbols-outlined text-on-surface text-xl">arrow_back</span>
              </button>
              <div>
                <h2 className="font-headline text-2xl font-bold text-on-surface">Daftar Kelas Tradisional</h2>
                <p className="text-xs text-on-surface-variant leading-none mt-1">Pilih kelas di bawah ini untuk melihat sesi evaluasi & presensi secara manual.</p>
              </div>
            </div>

            <button
              onClick={() => savePreference('ai')}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles size={14} />
              <span>Kembali ke AI Assistant</span>
            </button>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {classGroups.map((g, index) => {
              const key = `${g.className}__${g.academicYear}`;
              const bData = behaviorSummary[key] || { count: 0 };
              const isActive = index === 0;

              return (
                <button 
                  key={key} 
                  onClick={() => setExpandedClass(key)} 
                  className={`bg-surface-container-lowest ambient-shadow rounded-2xl p-6 text-left w-full group hover:bg-surface-container-low transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border border-outline-variant/10 relative overflow-hidden`}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-fixed/30 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
                  )}
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center space-x-3">
                      <h2 className={`text-3xl font-headline font-bold tracking-tight ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                        {g.className}
                      </h2>
                      {isActive ? (
                        <span className="bg-secondary-container/20 text-on-secondary-container text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider flex items-center border border-secondary-container/30">
                          <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> Aktif
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: '20px' }}>person</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/5">
                      {g.schoolLevel}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end relative z-10 border-t border-surface-container-low pt-4">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 font-semibold">Sesi Ujian</p>
                      <p className="text-sm font-extrabold text-on-surface leading-none">{g.sessions.length} Sesi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 font-semibold">Total Siswa</p>
                      <p className="text-sm font-extrabold text-on-surface leading-none">{bData.count} Siswa</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>

          {/* Info Card - Bento Style */}
          <section className="bg-surface-container-low/50 p-6 rounded-2xl flex flex-col gap-4 border border-outline-variant/10 shadow-sm mt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                <span className="material-symbols-outlined text-primary text-xl">insights</span>
              </div>
              <h4 className="font-headline font-bold text-on-surface tracking-tight">
                {isAdmin ? 'Ringkasan Sistem' : 'Info Akademik'}
              </h4>
            </div>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed opacity-80">
              {isAdmin ? (
                <>Terdeteksi <span className="text-primary font-bold">{classGroups.length} Kelas</span> aktif dengan total <span className="text-primary font-bold">{sessions.length} Sesi</span>. Sinkronisasi berjalan otomatis untuk memastikan integritas data.</>
              ) : (
                <>Terdapat <span className="text-primary font-bold">{classGroups.length} Kelas</span> terbuka dengan <span className="text-primary font-bold">{sessions.length} Sesi</span> aktif. Pilih kelas Anda untuk melihat laporan lengkap.</>
              )}
            </p>
          </section>
        </div>
      ) : (
        /* --- FULL SCREEN AI CHAT ASSISTANT (Default View) --- */
        <div className="w-full max-w-4xl mx-auto flex-1 md:flex-initial flex flex-col gap-4 animate-in fade-in duration-300 min-h-0">
          <div className="bg-slate-950/45 backdrop-blur-xl border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden h-full md:h-[650px] relative min-h-0">
            
            {/* AI Chat Header */}
            <div className="p-5 bg-gradient-to-r from-violet-950/20 via-slate-950 to-slate-950 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-violet-500/10 rounded-xl flex items-center justify-center border border-violet-500/20 shadow-[0_0_15px_rgba(155,114,203,0.2)] shrink-0">
                  <GeminiLogo className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-headline font-black text-sm sm:text-base text-slate-100 uppercase tracking-wide">Navigator Asisten AI</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[9px] font-black bg-gradient-to-r from-[#1ba1e3] via-[#9b72cb] to-[#f49c46] bg-clip-text text-transparent uppercase tracking-widest leading-none">Online & Cerdas</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => savePreference('traditional')}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 border border-white/5"
                  title="Tampilkan Daftar Kelas Tradisional"
                >
                  <span className="material-symbols-outlined text-xs">grid_view</span>
                  <span className="hidden sm:inline">Daftar Kelas Manual</span>
                </button>
                
                <button
                  onClick={() => {
                    setMessages([getInitialMessage()]);
                    setSuggestedQuestions(getPresetChips());
                  }}
                  className="p-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl text-slate-400 transition-all active:scale-95 border border-white/5"
                  title="Reset Percakapan"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            {/* Chat Message Scrollable Container */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar scroll-smooth"
            >
              {messages.map((msg) => {
                const isAI = msg.role === 'assistant';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${isAI ? 'self-start' : 'self-end ml-auto flex-row-reverse'}`}
                  >
                    {isAI && (
                      <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center border border-white/5 shrink-0 shadow-sm mt-0.5">
                        <GeminiLogo className="w-5 h-5" />
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-1.5">
                      <div className={`p-4 rounded-2xl ${
                        isAI
                          ? 'bg-slate-900/80 text-slate-200 rounded-tl-none border border-white/[0.03]'
                          : 'bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 text-white rounded-tr-none shadow-md shadow-violet-600/10 font-medium'
                      }`}>
                        {formatMessageText(msg.content)}

                        {/* Suggested Action Cards inside the bubble */}
                        {isAI && msg.actions && msg.actions.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                            <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest block mb-1">Kemudahan Akses Navigasi:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {msg.actions.map((act: any) => (
                                  <button
                                    key={act.layer}
                                    onClick={() => handleActionClick(act.layer, act.label)}
                                    className="p-3 bg-slate-950 hover:bg-violet-950/40 text-slate-100 hover:text-violet-300 text-left font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-xl transition-all duration-200 border border-white/5 hover:border-violet-500/30 flex items-center justify-between group shadow-sm hover:shadow-[0_0_12px_rgba(155,114,203,0.1)] active:scale-95"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <CompassIcon size={12} className="text-violet-400 group-hover:rotate-45 transition-transform shrink-0" />
                                      <span className="truncate">{act.label}</span>
                                    </div>
                                    <ArrowRight size={12} className="text-slate-500 group-hover:translate-x-1 transition-transform shrink-0" />
                                  </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* AI typing state */}
              {isAiResponding && (
                <div className="flex gap-3 max-w-[80%] self-start">
                  <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center border border-white/5 shrink-0 mt-0.5">
                    <GeminiLogo className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="p-3.5 bg-slate-900/80 text-slate-400 rounded-2xl rounded-tl-none border border-white/[0.03] flex items-center gap-2 shadow-sm">
                    <Loader2 size={14} className="animate-spin text-violet-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Asisten sedang memikirkan navigasi...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick suggestions chips bar */}
            <div className="px-5 py-3 bg-slate-950/50 border-t border-white/5 flex flex-col gap-1.5 shrink-0">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-semibold">Saran pertanyaan / perintah:</span>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="flex-none px-3.5 py-2 bg-white/5 hover:bg-violet-500/10 hover:text-violet-300 border border-white/5 hover:border-violet-500/30 rounded-xl text-[10px] sm:text-xs font-bold text-slate-300 transition-all whitespace-nowrap active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form Panel */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} 
              className="p-3 bg-slate-950 border-t border-white/5 flex gap-2 shrink-0 pb-safe-or-more md:pb-3"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isAiResponding ? "Sedang memproses..." : "Tanya GradeMaster AI..."}
                  disabled={isAiResponding}
                  className="w-full pl-4 pr-12 py-3.5 bg-slate-900 border border-white/5 focus:border-violet-500/50 rounded-full text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-violet-500/25"
                />
                <button
                  type="submit"
                  disabled={isAiResponding || !inputValue.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 disabled:opacity-30 text-white rounded-full transition-all flex items-center justify-center active:scale-95 shadow-md shadow-violet-600/20"
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preference Popup Modal Overlay */}
      {showPreferencePopup && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 max-w-lg w-full shadow-2xl shadow-violet-500/10 flex flex-col gap-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Background Glow */}
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-sky-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col items-center text-center gap-2 relative z-10">
              <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20 shadow-[0_0_20px_rgba(155,114,203,0.35)] mb-2">
                <GeminiLogo className="w-9 h-9 animate-pulse" />
              </div>
              <h3 className="font-headline font-black text-xl text-slate-100 uppercase tracking-wide">Pilih Tampilan Dashboard</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Selamat datang di **GradeMaster OS**. Silakan pilih gaya tampilan beranda utama yang paling nyaman untuk Anda bekerja.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
              {/* Pilihan AI Navigator */}
              <button
                onClick={() => savePreference('ai')}
                className="group flex flex-col items-center text-center p-5 bg-slate-950/40 hover:bg-violet-950/30 border border-white/5 hover:border-violet-500/40 rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-[0_0_25px_rgba(155,114,203,0.15)]"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform mb-3">
                  <Sparkles size={20} />
                </div>
                <h4 className="font-bold text-sm text-slate-200 group-hover:text-violet-300 transition-colors mb-1">AI Navigator</h4>
                <p className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors leading-relaxed">
                  Asisten Cerdas untuk mengarahkan Anda ke mana saja dengan perintah obrolan / suara.
                </p>
              </button>

              {/* Pilihan Tradisional */}
              <button
                onClick={() => savePreference('traditional')}
                className="group flex flex-col items-center text-center p-5 bg-slate-950/40 hover:bg-sky-950/30 border border-white/5 hover:border-sky-500/40 rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-[0_0_25px_rgba(14,165,233,0.15)]"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform mb-3">
                  <span className="material-symbols-outlined text-lg">grid_view</span>
                </div>
                <h4 className="font-bold text-sm text-slate-200 group-hover:text-sky-300 transition-colors mb-1">Tradisional</h4>
                <p className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors leading-relaxed">
                  Layout Grid Bento standar. Menampilkan seluruh daftar kelas dan data secara manual.
                </p>
              </button>
            </div>

            <div className="text-center relative z-10">
              <p className="text-[10px] text-slate-500">
                *Anda dapat mengubah pilihan ini kapan saja melalui tombol pintasan di bagian atas beranda.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
