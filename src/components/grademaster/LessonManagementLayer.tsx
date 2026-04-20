"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  FileText, 
  MessageSquare, 
  Plus, 
  History, 
  Clock, 
  Loader2,
  Send,
  CloudUpload,
  Bot
} from 'lucide-react';
import { DailyLesson, Quiz, ToastType } from '@/lib/grademaster/types';
import { supabase } from '@/lib/supabase/client';
import { generateAILessonContent, createLesson } from '@/lib/grademaster/lessonActions';

interface LessonManagementLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  activeClass?: string;
}

type TabType = 'daily' | 'exams' | 'ai_materials';

export default function LessonManagementLayer({
  onBack,
  setToast,
  activeClass = '7B'
}: LessonManagementLayerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Lesson Form State
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [material, setMaterial] = useState('');
  
  // AI Output Preview State
  const [aiResult, setAiResult] = useState<{
    preview: string;
    chatPreview: string;
    questions: any[];
  } | null>(null);

  const subjects = [
    'Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 
    'Bahasa Inggris', 'PAI', 'PJOK', 'Seni Budaya', 'Informatika'
  ];

  // Placeholder AI Function
  const generateAILesson = async (content: string) => {
    setIsGenerating(true);
    try {
      const result = await generateAILessonContent(content, subject);
      // Simulate API Delay for premium feel
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setAiResult({
        preview: result.preview,
        chatPreview: result.chatPrompt,
        questions: result.questions
      });
      setToast({ message: "AI berhasil mengolah materi pelajaran!", type: 'success' });
    } catch (err: any) {
      setToast({ message: "Gagal generate AI: " + err.message, type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLesson = async (publish: boolean = false) => {
    if (!subject || !material) {
      setToast({ message: "Lengkapi data pelajaran terlebih dahulu", type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      await createLesson({
        class_name: activeClass,
        subject,
        date,
        content: material,
        ai_reading_preview: aiResult?.preview,
        ai_chat_prompt: aiResult?.chatPreview,
        is_published: publish
      });

      setToast({ 
        message: publish ? "Pelajaran berhasil dipublikasikan ke siswa!" : "Pelajaran berhasil disimpan!", 
        type: 'success' 
      });
      // Reset form if published
      if (publish) {
        setSubject('');
        setMaterial('');
        setAiResult(null);
      }
    } catch (err: any) {
      setToast({ message: "Gagal menyimpan: " + err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto page-pt md:pt-16 pb-24 font-outfit">
      
      {/* Loading Overlay */}
      {(isGenerating || isSaving) && (
        <div className="fixed inset-0 z-[1100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="text-emerald-500 animate-pulse" size={24} />
            </div>
          </div>
          <p className="mt-6 text-slate-800 font-bold text-lg animate-pulse">
            {isGenerating ? "AI sedang merumuskan materi..." : "Menyimpan data ke sistem..."}
          </p>
          <p className="text-slate-500 text-sm mt-2">Mohon tunggu sebentar, GradeMaster sedang bekerja.</p>
        </div>
      )}

      {/* Header */}
      <header className="mb-8 md:mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium text-sm transition-all mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Beranda
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
              Manajemen Pelajaran
            </h1>
            <p className="text-slate-500 text-base md:text-lg max-w-2xl font-medium leading-relaxed">
              Buat, kelola, dan pantau pelajaran harian, ulangan ASTS/ASAJ, serta materi AI untuk siswa.
            </p>
          </div>
          <div className="bg-slate-50 self-start md:self-auto p-2 rounded-2xl border border-slate-100 flex items-center gap-3">
             <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-widest">Kelas</span>
             <div className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-lg font-black text-slate-900 shadow-sm min-w-[80px] text-center">
               {activeClass}
             </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'daily', label: 'Pelajaran Harian', icon: BookOpen },
          { id: 'exams', label: 'Manajemen Ulangan', icon: Clock },
          { id: 'ai_materials', label: 'Manajemen Materi AI', icon: Bot }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2.5 px-6 py-4 border-b-2 transition-all whitespace-nowrap text-sm font-bold tracking-tight ${
              activeTab === tab.id 
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50/30' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* TAB: DAILY LESSONS */}
        {activeTab === 'daily' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Card */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Plus size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Buat Pelajaran Baru</h2>
               </div>

               <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Mata Pelajaran</label>
                     <select 
                       value={subject}
                       onChange={(e) => setSubject(e.target.value)}
                       className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                     >
                       <option value="">Pilih Pelajaran</option>
                       {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Tanggal</label>
                     <input 
                       type="date"
                       value={date}
                       onChange={(e) => setDate(e.target.value)}
                       className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
                     />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Materi Pelajaran</label>
                   <textarea 
                     placeholder="Masukkan materi pelajaran hari ini atau tempel teks panjang..."
                     value={material}
                     onChange={(e) => setMaterial(e.target.value)}
                     className="w-full min-h-[250px] bg-slate-50 border border-slate-200 rounded-2xl p-5 text-base font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none leading-relaxed"
                   ></textarea>
                 </div>

                 <button 
                   onClick={() => generateAILesson(material)}
                   disabled={!material || isGenerating}
                   className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all transform active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                   <Sparkles size={20} /> Generate AI Lesson
                 </button>
               </div>
            </div>

            {/* AI Result Card */}
            <div className="relative">
              {!aiResult ? (
                <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center p-10 text-center bg-slate-50/30">
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                    <Sparkles size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Belum ada hasil AI</h3>
                  <p className="text-slate-400 text-sm font-medium max-w-[280px]">Input materi di samping dan klik Generate untuk memulai sihir AI GradeMaster.</p>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col h-full ring-1 ring-white/10">
                  <div className="flex items-center justify-between mb-8">
                     <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30 flex items-center gap-2">
                       <Bot size={12} /> AI Engine Active
                     </span>
                     <Sparkles className="text-emerald-500" size={20} />
                  </div>

                  <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Materi Preview */}
                    <section>
                      <h4 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={14} /> Preview Materi
                      </h4>
                      <p className="text-slate-300 text-sm leading-relaxed bg-white/5 border border-white/5 p-5 rounded-2xl">
                        {aiResult.preview}
                      </p>
                    </section>

                    {/* Chat Preview */}
                    <section>
                      <h4 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MessageSquare size={14} /> AI Chat Assistant
                      </h4>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                         <div className="flex items-start gap-3">
                           <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                             <Bot size={16} className="text-white" />
                           </div>
                           <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none text-xs text-white max-w-[80%] leading-relaxed">
                             {aiResult.chatPreview}
                           </div>
                         </div>
                         <div className="flex justify-end pr-2">
                            <div className="bg-emerald-500/20 p-3 rounded-2xl rounded-tr-none text-xs text-emerald-400 max-w-[80%] border border-emerald-500/20 italic font-medium">
                              (Jawaban Siswa Akan Muncul di Sini)
                            </div>
                         </div>
                      </div>
                    </section>

                    {/* Questions Preview */}
                    <section>
                      <h4 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <History size={14} /> Daftar Soal ({aiResult.questions.length})
                      </h4>
                      <div className="space-y-3">
                        {aiResult.questions.map((q, i) => (
                          <div key={q.id} className="bg-white/5 p-4 rounded-xl flex items-start gap-3 border border-white/5 group hover:bg-white/10 transition-colors">
                            <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</span>
                            <div className="flex-1">
                              <p className="text-slate-200 text-xs font-bold leading-relaxed">{q.text}</p>
                              <span className="text-[9px] text-slate-500 uppercase font-black mt-2 block tracking-widest">{q.type === 'mcq' ? 'PILIHAN GANDA' : 'ESSAY'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
                    <button 
                      onClick={() => handleSaveLesson(false)}
                      className="h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition-all border border-white/10"
                    >
                      Simpan Draft
                    </button>
                    <button 
                      onClick={() => handleSaveLesson(true)}
                      className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                    >
                      Publish <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: EXAMS */}
        {activeTab === 'exams' && (
          <div className="max-w-2xl">
            <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                    <History size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Buat Ulangan Baru</h2>
               </div>
               
               <div className="space-y-6">
                 <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nama Ulangan</label>
                   <input type="text" placeholder="Contoh: ASTS Semester Ganjil" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Tipe</label>
                      <select className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20 transition-all">
                        <option>ASTS</option>
                        <option>ASAJ</option>
                        <option>UH</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Durasi (Menit)</label>
                      <input type="number" defaultValue={60} className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" />
                    </div>
                 </div>

                 <button className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20">
                   Buat Ulangan
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* TAB: AI MATERIALS */}
        {activeTab === 'ai_materials' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
               <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <CloudUpload size={24} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">Upload Materi</h3>
                  <p className="text-slate-400 text-xs font-medium mb-6">Upload PDF, Gambar, atau Dokumen untuk diproses AI GradeMaster.</p>
                  
                  <div className="h-40 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors cursor-pointer mb-6">
                    <Bot className="text-slate-300 group-hover:text-blue-400 transition-colors mb-2" size={32} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drop Files Here</span>
                  </div>

                  <button className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2">
                    <Sparkles size={14} className="text-blue-400" /> Proses dengan AI
                  </button>
               </div>
            </div>

            <div className="md:col-span-2 space-y-4">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-4">Materi Terdaftar</h3>
               {[1, 2, 3].map(i => (
                 <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
                   <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                     <FileText size={22} />
                   </div>
                   <div className="flex-1">
                     <h4 className="text-sm font-black text-slate-900">Materi Pelajaran #{i} - Struktur Atom</h4>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Diproses pada 20 Apr 2026</p>
                   </div>
                   <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                     <ChevronRight size={20} />
                   </button>
                 </div>
               ))}
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.4); }
      `}</style>
    </div>
  );
}
