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
  Bot,
  Send,
  Loader2,
  HelpCircle,
  Award,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { DailyLesson, Quiz, ToastType } from '@/lib/grademaster/types';

interface StudentLessonLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
}

type TabType = 'materi' | 'chat_ai' | 'kuis';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function StudentLessonLayer({ onBack, setToast }: StudentLessonLayerProps) {
  const { studentData, studentClass } = useGradeMaster();
  const activeClassName = studentData?.class_name || studentClass || "";

  // Core State
  const [lessons, setLessons] = useState<DailyLesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<DailyLesson | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('materi');

  // Quiz State
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizScoreRecord, setQuizScoreRecord] = useState<any | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Chat AI State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Load published lessons on mount
  useEffect(() => {
    const fetchLessons = async () => {
      if (!activeClassName) {
        setIsLoadingLessons(false);
        return;
      }
      setIsLoadingLessons(true);
      try {
        const baseClass = activeClassName.startsWith('7') ? 'Kelas 7' 
                        : activeClassName.startsWith('8') ? 'Kelas 8' 
                        : activeClassName.startsWith('9') ? 'Kelas 9' 
                        : activeClassName;

        const { data, error } = await supabase
          .from('daily_lessons')
          .select('*')
          .in('class_name', [activeClassName, baseClass])
          .eq('is_published', true)
          .order('date', { ascending: false });

        if (error) throw error;
        setLessons(data || []);
        if (data && data.length > 0) {
          setSelectedLesson(data[0]);
        }
      } catch (err: any) {
        console.error("Failed to load lessons:", err);
        setToast({ message: "Gagal memuat daftar pelajaran", type: 'error' });
      } finally {
        setIsLoadingLessons(false);
      }
    };

    fetchLessons();
  }, [activeClassName]);

  // Load quizzes and scores when selected lesson changes
  useEffect(() => {
    const fetchQuizzesAndScores = async () => {
      if (!selectedLesson) {
        setQuizzes([]);
        setSelectedQuiz(null);
        setQuizScoreRecord(null);
        setShowQuizResults(false);
        return;
      }

      setIsLoadingQuizzes(true);
      setSelectedQuiz(null);
      setQuizScoreRecord(null);
      setShowQuizResults(false);
      setUserAnswers({});

      try {
        // 1. Fetch quizzes linked to this lesson
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('lesson_id', selectedLesson.id);

        if (quizError) throw quizError;
        setQuizzes(quizData || []);
        
        if (quizData && quizData.length > 0) {
          const firstQuiz = quizData[0];
          setSelectedQuiz(firstQuiz);

          // Get logged in student profile UUID
          const { data: { user } } = await supabase.auth.getUser();
          const studentId = studentData?.id || user?.id;

          if (studentId) {
            // 2. Fetch existing score record
            const { data: scoreData } = await supabase
              .from('student_scores')
              .select('*')
              .eq('quiz_id', firstQuiz.id)
              .eq('student_id', studentId)
              .maybeSingle();

            if (scoreData) {
              setQuizScoreRecord(scoreData);
              setShowQuizResults(true);
              if (scoreData.answers) {
                setUserAnswers(scoreData.answers);
              }
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to load quizzes/scores:", err);
      } finally {
        setIsLoadingQuizzes(false);
      }
    };

    fetchQuizzesAndScores();

    // Reset Chat messages for the new lesson
    setChatMessages([
      { 
        role: 'assistant', 
        content: `Halo! Saya asisten AI GradeMaster OS. Saya siap membantumu mempelajari materi **${selectedLesson?.subject || 'pelajaran'}** hari ini. Ada konsep yang belum kamu pahami dari rangkuman materi?` 
      }
    ]);
  }, [selectedLesson]);

  // Send message to Copilot AI
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isAiResponding || !selectedLesson) return;

    const userText = inputValue.trim();
    setInputValue('');
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userText }];
    setChatMessages(updatedMessages);
    setIsAiResponding(true);

    try {
      const history = updatedMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const res = await fetch('/api/grademaster/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history,
          role: 'student',
          currentLayer: 'student_lesson',
          studentClass: activeClassName,
          subject: selectedLesson.subject
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal terhubung ke AI');

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      console.error("AI response error:", err);
      setChatMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `Maaf, saya sedang mengalami kendala jaringan. Pertanyaan Anda: "${userText}". Silakan coba tanyakan kembali.` }
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Submit Interactive Quiz
  const handleSubmitQuiz = async () => {
    if (!selectedQuiz || !selectedLesson) return;

    const questionsList = selectedQuiz.questions || [];
    if (questionsList.length === 0) return;

    // Ensure all MCQs are answered
    const unansweredMCQ = questionsList.some((q: any, idx: number) => {
      return (q.type === 'mcq' || !q.type) && !userAnswers[idx];
    });

    if (unansweredMCQ) {
      setToast({ message: "Harap jawab semua soal pilihan ganda sebelum mengirimkan kuis", type: 'error' });
      return;
    }

    setIsSubmittingQuiz(true);
    try {
      // Calculate Score
      let correctCount = 0;
      let mcqCount = 0;

      questionsList.forEach((q: any, idx: number) => {
        if (q.type === 'mcq' || !q.type) {
          mcqCount++;
          const correctAns = (q.answer || q.correctAnswer || '').trim().toUpperCase();
          const studentAns = (userAnswers[idx] || '').trim().toUpperCase();
          if (correctAns === studentAns) {
            correctCount++;
          }
        }
      });

      const finalScore = mcqCount > 0 ? Math.round((correctCount / mcqCount) * 100) : 100;

      const { data: { user } } = await supabase.auth.getUser();
      const studentId = studentData?.id || user?.id;

      if (!studentId) {
        throw new Error("Siswa tidak teridentifikasi.");
      }

      // Save to Supabase
      const { data, error } = await supabase
        .from('student_scores')
        .insert({
          student_id: studentId,
          quiz_id: selectedQuiz.id,
          lesson_id: selectedLesson.id,
          score: finalScore,
          answers: userAnswers,
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setQuizScoreRecord(data);
      setShowQuizResults(true);
      setToast({ message: `Kuis berhasil dikirim! Nilaimu: ${finalScore}/100`, type: 'success' });
    } catch (err: any) {
      console.error("Failed to submit quiz:", err);
      setToast({ message: err.message || "Gagal menyimpan hasil kuis", type: 'error' });
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50/50 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto page-pt md:pt-16 pb-24 font-outfit">
      {/* Header */}
      <header className="mb-8 md:mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-all mb-4 group min-h-[44px]"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Beranda
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
              Pelajaran Saya
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-medium mt-2">
              Akses ringkasan materi AI, tanya jawab interaktif, dan kuis kelas {activeClassName}.
            </p>
          </div>
          <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-xs font-black uppercase tracking-widest self-start sm:self-auto">
             Kelas {activeClassName}
          </div>
        </div>
      </header>

      {isLoadingLessons ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
          <Loader2 size={36} className="animate-spin text-emerald-500 mb-4" />
          <p className="text-slate-500 font-bold text-sm">Memuat materi pelajaran Anda...</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[32px] p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100">
            <BookOpen size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Belum Ada Pelajaran</h3>
          <p className="text-slate-400 text-sm font-medium max-w-sm">Guru belum mempublikasikan pelajaran harian untuk kelas {activeClassName} saat ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: MASTER LIST */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Materi Terbit</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
              {lessons.map((lesson) => {
                const isSelected = selectedLesson?.id === lesson.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full p-5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-4 active:scale-[0.98] ${
                      isSelected 
                        ? 'bg-white border-emerald-500 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500' 
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'
                    }`}>
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-950 text-base truncate leading-snug">{lesson.subject}</h4>
                      <div className="flex items-center gap-2 mt-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                        <Calendar size={12} />
                        <span>{lesson.date}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: DETAIL VIEW */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm flex flex-col min-h-[500px]">
            {selectedLesson && (
              <>
                {/* Subject Header */}
                <div className="border-b border-slate-100 pb-6 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{selectedLesson.subject}</h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                      <Calendar size={12} /> {selectedLesson.date}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Materi Kelas {activeClassName}</p>
                </div>

                {/* Tab selectors */}
                <div className="flex border-b border-slate-100 mb-6 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'materi', label: 'Ringkasan Materi', icon: FileText },
                    { id: 'chat_ai', label: 'Tanya AI Copilot', icon: Bot },
                    { id: 'kuis', label: 'Kuis Harian', icon: Award }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all whitespace-nowrap text-xs font-black uppercase tracking-widest min-h-[44px] ${
                        activeTab === tab.id 
                          ? 'border-emerald-500 text-emerald-600' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <tab.icon size={16} /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB CONTENT */}
                <div className="flex-1 flex flex-col">
                  
                  {/* TAB: MATERIAL */}
                  {activeTab === 'materi' && (
                    <div className="space-y-6">
                      {selectedLesson.ai_reading_preview && (
                        <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100 flex items-start gap-4">
                          <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/10">
                            <Sparkles size={18} />
                          </div>
                          <div>
                            <h4 className="text-emerald-800 text-xs font-black uppercase tracking-widest mb-1.5">Rangkuman AI</h4>
                            <p className="text-emerald-900 text-sm font-medium leading-relaxed">{selectedLesson.ai_reading_preview}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <h4 className="text-slate-400 text-xs font-black uppercase tracking-widest pl-1">Isi Materi Lengkap</h4>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                          {selectedLesson.content || "Guru belum menambahkan isi materi detail."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: AI CHAT */}
                  {activeTab === 'chat_ai' && (
                    <div className="flex flex-col flex-1 h-[450px]">
                      {/* Message History */}
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin">
                        {chatMessages.map((msg, idx) => {
                          const isBot = msg.role === 'assistant';
                          return (
                            <div key={idx} className={`flex items-start gap-3 ${!isBot ? 'justify-end' : ''}`}>
                              {isBot && (
                                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 text-white shadow-sm">
                                  <Bot size={16} />
                                </div>
                              )}
                              <div className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                                isBot 
                                  ? 'bg-slate-100 text-slate-800 rounded-tl-none font-medium' 
                                  : 'bg-[#0F172A] text-white rounded-tr-none font-bold'
                              }`}>
                                {msg.content}
                              </div>
                            </div>
                          );
                        })}
                        {isAiResponding && (
                          <div className="flex items-start gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 text-white">
                              <Bot size={16} />
                            </div>
                            <div className="bg-slate-100 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 min-w-[60px]">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input Box */}
                      <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder={`Tanyakan tentang ${selectedLesson.subject}...`}
                          disabled={isAiResponding}
                          className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-50 min-h-[44px]"
                        />
                        <button
                          type="submit"
                          disabled={!inputValue.trim() || isAiResponding}
                          className="w-12 h-12 bg-[#0F172A] text-white rounded-xl flex items-center justify-center shadow-md shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
                        >
                          <Send size={16} />
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAB: QUIZ */}
                  {activeTab === 'kuis' && (
                    <div className="flex-1 flex flex-col justify-between">
                      {isLoadingQuizzes ? (
                        <div className="min-h-[200px] flex flex-col items-center justify-center">
                          <Loader2 className="animate-spin text-emerald-500 mb-2" size={24} />
                          <p className="text-slate-400 text-xs font-bold">Mengecek kuis...</p>
                        </div>
                      ) : quizzes.length === 0 ? (
                        <div className="min-h-[250px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <HelpCircle size={28} className="text-slate-300 mb-3" />
                          <h4 className="text-sm font-black text-slate-800">Kuis Belum Tersedia</h4>
                          <p className="text-slate-400 text-xs font-medium max-w-xs mt-1">Guru belum melampirkan kuis evaluasi harian untuk materi ini.</p>
                        </div>
                      ) : selectedQuiz ? (
                        <div className="space-y-6 flex-1 flex flex-col justify-between">
                          
                          {/* Top Info bar */}
                          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                              <h4 className="text-slate-900 text-xs font-black uppercase tracking-wider">{selectedQuiz.title}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Tipe: {selectedQuiz.quiz_type} • Durasi: {selectedQuiz.duration_minutes} Mnt</p>
                            </div>
                            <Award className="text-emerald-500" size={20} />
                          </div>

                          {showQuizResults && quizScoreRecord ? (
                            /* SCORE RESULTS VIEW */
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 text-center space-y-5 flex-1 flex flex-col justify-center items-center">
                              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 size={32} />
                              </div>
                              <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Kuis Selesai</p>
                                <h3 className="text-3xl font-black text-slate-900">Hasil Evaluasi Anda</h3>
                              </div>
                              <div className="flex items-end justify-center">
                                <span className="text-6xl font-black text-emerald-500 leading-none">{Math.round(quizScoreRecord.score)}</span>
                                <span className="text-slate-400 font-bold ml-1 text-sm">/ 100</span>
                              </div>
                              <p className="text-slate-500 text-xs font-bold bg-white px-4 py-2 rounded-full border border-slate-100">
                                Dikerjakan pada: {new Date(quizScoreRecord.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          ) : (
                            /* ACTIVE QUIZ QUESTION RUNNER */
                            <div className="space-y-6 flex-1 flex flex-col justify-between">
                              <div className="space-y-6 max-h-[350px] overflow-y-auto pr-1 no-scrollbar flex-1">
                                {(selectedQuiz.questions || []).map((q: any, qIdx: number) => {
                                  const isMcq = q.type === 'mcq' || !q.type;
                                  return (
                                    <div key={qIdx} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                      <div className="flex gap-2">
                                        <span className="w-5 h-5 bg-emerald-500 text-white rounded-md flex items-center justify-center text-[10px] font-black shrink-0">{qIdx+1}</span>
                                        <p className="text-xs font-bold text-slate-900 leading-relaxed">{q.text || q.question}</p>
                                      </div>
                                      
                                      {isMcq ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 pt-1">
                                          {(q.options || ['A', 'B', 'C', 'D']).map((opt: string) => {
                                            const isSelected = userAnswers[qIdx] === opt;
                                            return (
                                              <button
                                                key={opt}
                                                type="button"
                                                onClick={() => setUserAnswers(prev => ({ ...prev, [qIdx]: opt }))}
                                                className={`px-4 py-3 rounded-xl border text-left text-xs font-bold transition-all active:scale-[0.98] min-h-[44px] flex items-center gap-3 ${
                                                  isSelected 
                                                    ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-md shadow-slate-900/10' 
                                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                                }`}
                                              >
                                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${
                                                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200'
                                                }`}>{opt[0]}</span>
                                                <span className="truncate">{opt}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="pl-7 pt-1">
                                          <textarea
                                            placeholder="Tuliskan jawaban esai Anda..."
                                            value={userAnswers[qIdx] || ''}
                                            onChange={(e) => setUserAnswers(prev => ({ ...prev, [qIdx]: e.target.value }))}
                                            className="w-full min-h-[100px] p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <button
                                onClick={handleSubmitQuiz}
                                disabled={isSubmittingQuiz}
                                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all transform active:scale-[0.98] shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 min-h-[44px]"
                              >
                                {isSubmittingQuiz ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <>Kirim Jawaban Kuis</>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
