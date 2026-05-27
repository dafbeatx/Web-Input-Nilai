"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, Loader2, Compass, MessageSquare, ArrowRight, UserCheck, RotateCcw } from 'lucide-react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { Layer } from '@/lib/grademaster/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: { label: string; layer: Layer; description?: string }[];
}

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

export default function AICopilot() {
  const {
    layer,
    setLayer,
    isAdmin,
    adminUser,
    isStudent,
    isParent,
    studentData,
    studentClass,
  } = useGradeMaster();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Determine current active user details
  const getActiveUserLabel = () => {
    if (isAdmin) return adminUser || 'Guru';
    if (isStudent) return studentData?.name || 'Siswa';
    if (isParent) return `Orang Tua dari ${studentData?.name || 'Siswa'}`;
    return 'Tamu';
  };

  const getActiveRoleKey = (): 'teacher' | 'student' | 'parent' | 'guest' => {
    if (isAdmin) return 'teacher';
    if (isStudent) return 'student';
    if (isParent) return 'parent';
    return 'guest';
  };

  // Generate role-specific welcome message
  const getInitialMessage = (): Message => {
    const userLabel = getActiveUserLabel();
    let welcomeText = `Halo **${userLabel}**! Saya adalah **GradeMaster Navigator**. 🤖✨\n\nSaya di sini untuk membantu Anda mengoperasikan platform ini dengan cepat. Beritahu saya apa yang ingin Anda lakukan, dan saya akan memberikan jalan pintas navigasi langsung ke halaman tujuan Anda!`;

    let actions: { label: string; layer: Layer; description?: string }[] = [];

    if (isAdmin) {
      actions = [
        { label: "Buat Sesi Ujian Baru", layer: "setup", description: "Atur KKM & esai" },
        { label: "Cek Kehadiran", layer: "attendance", description: "Rekap presensi siswa" },
        { label: "Buka Data Sikap/Sikap", layer: "behavior", description: "Poin kedisiplinan" }
      ];
    } else if (isStudent) {
      actions = [
        { label: "Mulai Remedial", layer: "remedial", description: "Kerjakan lembar remedial" },
        { label: "Rapor Profil Saya", layer: "student_profile", description: "Detail rekap nilai" }
      ];
    } else {
      actions = [
        { label: "Login Guru / Admin", layer: "login", description: "Akses panel guru" },
        { label: "Login Siswa / Orang Tua", layer: "student_login", description: "Akses nilai & remedial" }
      ];
    }

    return {
      id: 'welcome',
      role: 'assistant',
      content: welcomeText,
      actions
    };
  };

  // Initialize welcome message
  useEffect(() => {
    setMessages([getInitialMessage()]);
    setSuggestedQuestions(getPresetChips());
  }, [isAdmin, isStudent, isParent, adminUser, studentData]);

  // Reset conversation to initial state
  const handleResetChat = () => {
    setMessages([getInitialMessage()]);
    setSuggestedQuestions(getPresetChips());
  };

  // Handle suggestion chips click
  const handleChipClick = (questionText: string) => {
    sendMessage(questionText);
  };

  // Trigger page switching via context
  const handleActionClick = (targetLayer: Layer) => {
    setLayer(targetLayer);
    // Add navigation record in chat
    const pageNames: Record<Layer, string> = {
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
      student_claim: "Klaim Akun Siswa",
      teacher_claim: "Klaim Akun Guru",
      lesson_management: "Kelola Mata Pelajaran",
      remedial_management: "Kelola Soal Remedial",
      data_center: "Pusat Data Terpadu"
    };

    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        role: 'assistant',
        content: `⚡ *Berhasil mengantarkan Anda ke halaman **${pageNames[targetLayer] || targetLayer}** secara otomatis!*`
      }
    ]);
  };

  // Submit query to Groq backend
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversational history (clean, sliced, filtered of local navigation notifications)
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
          role: getActiveRoleKey(),
          currentLayer: layer,
          studentClass: studentClass
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Server error');

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Ada yang bisa saya bantu kembali?',
        actions: data.suggestedActions || []
      };

      setMessages(prev => [...prev, assistantMsg]);
      
      // Update suggested questions dynamically
      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      } else {
        setSuggestedQuestions(getPresetChips());
      }
      
      // Update visual indicator if chat closed
      if (!isOpen) {
        setHasNewMessage(true);
      }

    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Maaf, layanan asisten cerdas sedang tidak tersedia. Silakan hubungi tim IT kami atau coba gunakan navigasi manual di aplikasi.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Custom text formatter supporting basic bolding and bullet list styling
  const formatMessageText = (text: string) => {
    if (!text) return '';
    return text.split('\n').map((line, idx) => {
      // Process bold markers (**text**)
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const italicRegex = /\*(.*?)\*/g;
      
      formattedLine = formattedLine.replace(boldRegex, '<strong>$1</strong>');
      formattedLine = formattedLine.replace(italicRegex, '<em>$1</em>');

      // Check if it is a list element
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li 
            key={idx} 
            className="ml-4 list-disc text-xs leading-relaxed py-0.5"
            dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s+/, '') }}
          />
        );
      }

      return (
        <p 
          key={idx} 
          className="text-xs leading-relaxed mb-2"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  // Preset chips list based on active user context
  const getPresetChips = () => {
    if (isAdmin) {
      return [
        "Bagaimana cara menginput nilai kelas?",
        "Tolong buka rekap presensi kehadiran",
        "Di mana panel analisis sikap & kedisiplinan?",
        "Saya ingin download berkas SPSS"
      ];
    }
    if (isStudent) {
      return [
        "Bagaimana cara pengerjaan remedial?",
        "Saya ingin melihat rekap rapor nilai saya",
        "Di mana saya bisa mengganti password?"
      ];
    }
    return [
      "Bagaimana login sebagai Guru?",
      "Bagaimana masuk ke akun siswa?"
    ];
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-[9999]">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasNewMessage(false);
          }}
          className="relative flex items-center justify-center active:scale-95 transition-all duration-300 group outline-none focus:outline-none"
          title="GradeMaster AI Copilot"
        >
          {/* Sparkle Glow and notification badge */}
          {hasNewMessage && !isOpen && (
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black uppercase rounded-full flex items-center justify-center animate-bounce z-10">
              !
            </div>
          )}

          {isOpen ? (
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900 border border-white/10 hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(155,114,203,0.4)] text-violet-400 rounded-2xl flex items-center justify-center rotate-90 transition-all duration-300">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          ) : (
            <GeminiLogo className="w-14 h-14 sm:w-16 sm:h-16 transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-110 cursor-pointer" />
          )}
        </button>
      </div>

      {/* Floating Glassmorphic Chat Box */}
      {isOpen && (
        <div className="fixed bottom-[5.5rem] left-3 right-3 sm:left-auto sm:right-6 sm:bottom-40 z-[9999] w-auto sm:w-[380px] h-[440px] sm:h-[520px] max-h-[70vh] sm:max-h-none bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300 font-sans">
          
          {/* Header Panel */}
          <div className="p-4 bg-gradient-to-r from-violet-950/40 via-slate-950 to-slate-950 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-500/15 rounded-xl flex items-center justify-center border border-violet-500/25 shadow-[0_0_10px_rgba(155,114,203,0.2)]">
                <GeminiLogo className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-headline font-black text-xs sm:text-sm text-slate-100 uppercase tracking-wide">Navigator Copilot</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-black bg-gradient-to-r from-[#1ba1e3] via-[#9b72cb] to-[#f49c46] bg-clip-text text-transparent uppercase tracking-widest">Sistem Pintas Online</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Reset Chat button */}
              <button 
                onClick={handleResetChat} 
                className="p-1.5 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-slate-400 transition-all animate-in fade-in duration-200"
                title="Reset Percakapan"
              >
                <RotateCcw size={15} />
              </button>
              
              {/* Close button */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 bg-white/5 hover:bg-white/10 hover:text-white rounded-lg text-slate-400 transition-all"
                title="Tutup Chat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {messages.map((msg) => {
              const isAI = msg.role === 'assistant';
              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-[90%] ${isAI ? 'self-start' : 'self-end ml-auto flex-row-reverse'}`}
                >
                  {isAI && (
                    <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center border border-white/5 shrink-0 mt-0.5 shadow-[0_0_8px_rgba(155,114,203,0.15)]">
                      <GeminiLogo className="w-5 h-5" />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1.5">
                    {/* Speech Bubble */}
                    <div className={`p-3.5 rounded-2xl ${
                      isAI 
                      ? 'bg-slate-900 text-slate-200 rounded-tl-none border border-white/[0.03]' 
                      : 'bg-gradient-to-r from-[#1ba1e3] via-[#5489d6] to-[#9b72cb] text-white rounded-tr-none shadow-md shadow-violet-600/10 font-medium'
                    }`}>
                      {formatMessageText(msg.content)}

                      {/* Display Suggested Navigation Buttons */}
                      {isAI && msg.actions && msg.actions.length > 0 && (
                        <div className="mt-3.5 pt-3.5 border-t border-white/5 space-y-2">
                          <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest block mb-1">Kemudahan Akses Navigasi:</span>
                          {msg.actions.map((act) => (
                            <button
                              key={act.layer}
                              onClick={() => handleActionClick(act.layer)}
                              className="w-full p-2.5 bg-slate-950 hover:bg-violet-950/40 text-slate-100 hover:text-violet-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all duration-200 border border-white/5 hover:border-violet-500/30 flex items-center justify-between group shadow-sm hover:shadow-[0_0_12px_rgba(155,114,203,0.1)]"
                            >
                              <div className="flex items-center gap-2">
                                <Compass size={12} className="text-violet-400 group-hover:rotate-45 transition-transform" />
                                <span>{act.label}</span>
                              </div>
                              <ArrowRight size={12} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI thinking state */}
            {isLoading && (
              <div className="flex gap-3 max-w-[80%] self-start">
                <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center border border-white/5 shrink-0 mt-0.5">
                  <GeminiLogo className="w-5 h-5" />
                </div>
                <div className="p-3.5 bg-slate-900 text-slate-400 rounded-2xl rounded-tl-none border border-white/[0.03] flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-violet-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Memproses Navigasi Cerdas...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Preset Chip Suggestions */}
          <div className="px-4 py-2.5 bg-slate-950/50 border-t border-white/5">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              {messages.length > 1 ? "Saran Tindakan Lanjutan:" : "Rekomendasi Pintasan Guru/Siswa:"}
            </span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {suggestedQuestions.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip)}
                  className="flex-none px-3 py-1.5 bg-white/5 hover:bg-violet-500/10 hover:text-violet-300 border border-white/5 hover:border-violet-500/30 rounded-xl text-[10px] font-bold text-slate-300 transition-all whitespace-nowrap active:scale-95"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form Panel */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-slate-950 border-t border-white/5 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isLoading ? "Sedang merespons..." : "Ketik instruksi navigasi/kebutuhan Anda..."}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/5 focus:border-violet-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:text-base sm:focus:text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-lg shadow-violet-600/20"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
