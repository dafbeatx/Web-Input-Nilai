"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, Loader2, Compass, MessageSquare, ArrowRight, UserCheck } from 'lucide-react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { Layer } from '@/lib/grademaster/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: { label: string; layer: Layer; description?: string }[];
}

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
  }, [isAdmin, isStudent, isParent, adminUser, studentData]);

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
      // Build conversational history
      const historyPayload = messages.map(m => ({
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
      <div className="fixed bottom-24 right-6 z-[9999]">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasNewMessage(false);
          }}
          className={`relative w-14 h-14 bg-slate-900 border border-white/10 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] text-emerald-400 rounded-2xl flex items-center justify-center active:scale-95 transition-all duration-300 group ${
            isOpen ? 'rotate-90 bg-emerald-950 text-emerald-300' : ''
          }`}
          title="GradeMaster AI Copilot"
        >
          {/* Online green indicator dot */}
          <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-emerald-500 rounded-full border border-slate-950 flex items-center justify-center">
            <span className="absolute w-full h-full bg-emerald-400 rounded-full animate-ping opacity-75"></span>
          </div>

          {/* Sparkle Glow and notification badge */}
          {hasNewMessage && !isOpen && (
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black uppercase rounded-full flex items-center justify-center animate-bounce">
              !
            </div>
          )}

          {isOpen ? <X size={22} /> : <Sparkles size={22} className="group-hover:animate-pulse" />}
        </button>
      </div>

      {/* Floating Glassmorphic Chat Box */}
      {isOpen && (
        <div className="fixed bottom-40 right-6 z-[9999] w-[350px] sm:w-[380px] h-[520px] bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300 font-sans">
          
          {/* Header Panel */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/15 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/25">
                <Bot size={20} className="animate-pulse" />
              </div>
              <div>
                <h4 className="font-headline font-black text-sm text-slate-100 uppercase tracking-wide">Navigator Copilot</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Sistem Pintas Online</span>
                </div>
              </div>
            </div>
            
            {/* Close button */}
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-1.5 bg-white/5 hover:bg-white/10 hover:text-white rounded-lg text-slate-400 transition-all"
            >
              <X size={16} />
            </button>
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
                    <div className="w-7 h-7 bg-slate-900 text-emerald-400 rounded-lg flex items-center justify-center border border-white/5 shrink-0 mt-0.5">
                      <Bot size={14} />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1.5">
                    {/* Speech Bubble */}
                    <div className={`p-3.5 rounded-2xl ${
                      isAI 
                      ? 'bg-slate-900 text-slate-200 rounded-tl-none border border-white/[0.03]' 
                      : 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/10'
                    }`}>
                      {formatMessageText(msg.content)}

                      {/* Display Suggested Navigation Buttons */}
                      {isAI && msg.actions && msg.actions.length > 0 && (
                        <div className="mt-3.5 pt-3.5 border-t border-white/5 space-y-2">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Kemudahan Akses Navigasi:</span>
                          {msg.actions.map((act) => (
                            <button
                              key={act.layer}
                              onClick={() => handleActionClick(act.layer)}
                              className="w-full p-2.5 bg-slate-950 hover:bg-emerald-950 text-slate-100 hover:text-emerald-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all duration-200 border border-white/5 hover:border-emerald-500/30 flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-2">
                                <Compass size={12} className="text-emerald-400 group-hover:rotate-45 transition-transform" />
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
                <div className="w-7 h-7 bg-slate-900 text-emerald-400 rounded-lg flex items-center justify-center border border-white/5 shrink-0 mt-0.5">
                  <Bot size={14} />
                </div>
                <div className="p-3.5 bg-slate-900 text-slate-400 rounded-2xl rounded-tl-none border border-white/[0.03] flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Memproses Navigasi Cerdas...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Preset Chip Suggestions */}
          <div className="px-4 py-2 bg-slate-950/50 border-t border-white/5">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Rekomendasi Pintasan Guru/Siswa:</span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {getPresetChips().map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip)}
                  className="flex-none px-3 py-1.5 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 rounded-xl text-[10px] font-bold text-slate-300 transition-all whitespace-nowrap active:scale-95"
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
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/5 focus:border-emerald-500/50 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-lg shadow-emerald-600/10"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
