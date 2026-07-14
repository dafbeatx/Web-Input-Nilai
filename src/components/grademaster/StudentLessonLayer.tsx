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
  AlertCircle,
  Lightbulb,
  Brain
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { DailyLesson, Quiz, ToastType } from '@/lib/grademaster/types';
import GradeMasterMascot from './ui/GradeMasterMascot';
import { addBehaviorAction } from '@/lib/actions/behavior';

interface StudentLessonLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  semester?: string;
  isTab?: boolean;
  studentClassOverride?: string;
}

type TabType = 'materi' | 'chat_ai' | 'kuis';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function fireConfetti() {
  if (typeof window === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
  const confetti: any[] = [];
  
  for (let i = 0; i < 150; i++) {
    confetti.push({
      x: canvas.width / 2,
      y: canvas.height + 20,
      vx: (Math.random() - 0.5) * 15,
      vy: -Math.random() * 20 - 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      r: Math.random() * 6 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    });
  }
  
  const gravity = 0.5;
  let frames = 0;
  
  function update() {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    
    confetti.forEach(c => {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += gravity;
      c.vx *= 0.98;
      c.rotation += c.rotationSpeed;
      
      if (c.y < canvas.height && c.x > 0 && c.x < canvas.width) {
        active = true;
        ctx!.save();
        ctx!.translate(c.x, c.y);
        ctx!.rotate((c.rotation * Math.PI) / 180);
        ctx!.fillStyle = c.color;
        ctx!.fillRect(-c.r, -c.r, c.r * 2, c.r * 2);
        ctx!.restore();
      }
    });
    
    frames++;
    if (active && frames < 200) {
      requestAnimationFrame(update);
    } else {
      try {
        document.body.removeChild(canvas);
      } catch (e) {}
    }
  }
  
  update();
}

export default function StudentLessonLayer({ 
  onBack, 
  setToast, 
  semester = 'Ganjil', 
  isTab = false,
  studentClassOverride
}: StudentLessonLayerProps) {
  const { studentData, studentClass, academicYear } = useGradeMaster();
  const activeClassName = studentClassOverride || studentData?.class_name || studentClass || "";

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
  const [isBlockedFromSusulan, setIsBlockedFromSusulan] = useState(false);

  // Chat AI State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Simplified AI Mode State
  const [learningMode, setLearningMode] = useState<'santai' | 'standar'>('santai');
  const [simplifiedSlides, setSimplifiedSlides] = useState<any[]>([]);
  const [isLoadingSimplify, setIsLoadingSimplify] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // Streak & Mascot states
  const [streakCount, setStreakCount] = useState<number>(studentData?.study_streak || 0);
  const [hasStreakUpdatedToday, setHasStreakUpdatedToday] = useState<boolean>(false);
  const [mascotState, setMascotState] = useState<'idle' | 'success' | 'sad' | 'streak'>('idle');
  const [mascotMessage, setMascotMessage] = useState<string>('Halo! Yuk kita mulai belajar materi hari ini. Pilih salah satu materi di kiri ya!');

  const getLocalDateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (studentData?.study_streak !== undefined) {
      setStreakCount(studentData.study_streak || 0);
    }
  }, [studentData?.study_streak]);

  useEffect(() => {
    if (studentData?.last_active_date) {
      const todayStr = getLocalDateString();
      setHasStreakUpdatedToday(studentData.last_active_date === todayStr);
    }
  }, [studentData?.last_active_date]);

  const triggerStreakUpdate = async () => {
    if (!studentData?.id || hasStreakUpdatedToday) return;

    try {
      const todayStr = getLocalDateString();
      const res = await fetch('/api/grademaster/students/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: studentData.id,
          localDate: todayStr
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStreakCount(data.streak);
        setHasStreakUpdatedToday(true);
        if (data.updated) {
          setMascotState('streak');
          setMascotMessage(`Hebat! Streak belajar harianmu meningkat menjadi 🔥 ${data.streak} hari berturut-turut!`);
          fireConfetti();
        }
      } else if (data.error === 'database_migration_pending') {
        console.warn('Database streak migration pending:', data.message);
      } else {
        console.error('Failed to update streak:', data.error);
      }
    } catch (err) {
      console.error('Streak update network error:', err);
    }
  };

  // Coordinator Effect for Mascot dialog bubble and expressions
  useEffect(() => {
    if (!selectedLesson) {
      setMascotState('idle');
      setMascotMessage('Halo! Yuk kita mulai belajar materi hari ini. Pilih salah satu materi di kiri ya!');
      return;
    }

    if (activeTab === 'materi') {
      if (learningMode === 'santai') {
        if (simplifiedSlides.length === 0) {
          setMascotState('idle');
          setMascotMessage(`Yuk kita pelajari materi tentang ${selectedLesson.subject}!`);
        } else {
          const total = simplifiedSlides.length;
          if (currentSlideIdx === 0) {
            setMascotState('idle');
            setMascotMessage(`Selamat datang di Paham Kilat AI! Yuk baca perlahan slide demi slide tentang ${selectedLesson.subject}.`);
          } else if (currentSlideIdx === total - 1) {
            setMascotState('success');
            setMascotMessage(`Wah, kamu sampai di slide terakhir! Klik "Selesai" untuk melengkapi belajarmu hari ini.`);
          } else {
            setMascotState('idle');
            setMascotMessage(`Bagus! Slide ${currentSlideIdx + 1} dari ${total}. Terus baca ya, kamu hebat!`);
          }
        }
      } else {
        setMascotState('idle');
        setMascotMessage(`Kamu sedang membaca isi materi lengkap. Fokus dan serap ilmunya ya!`);
      }
    } else if (activeTab === 'chat_ai') {
      setMascotState('idle');
      setMascotMessage(`Ada bagian materi "${selectedLesson.subject}" yang kurang jelas? Tanyakan padaku! Aku siap membantu menjelaskan.`);
    } else if (activeTab === 'kuis') {
      if (showQuizResults && quizScoreRecord) {
        const score = Math.round(quizScoreRecord.score);
        if (score >= 70) {
          setMascotState('success');
          setMascotMessage(`Luar biasa! Kamu menyelesaikan kuis dengan nilai ${score}/100 dan mendapatkan +2 Poin Kebaikan! 🔥`);
        } else {
          setMascotState('sad');
          setMascotMessage(`Kuis selesai dengan nilai ${score}/100. Jangan berkecil hati, mari pelajari lagi materinya agar lebih paham!`);
        }
      } else if (isBlockedFromSusulan) {
        setMascotState('sad');
        setMascotMessage(`Ujian susulan ditutup karena kamu sudah memiliki nilai untuk mata pelajaran ini.`);
      } else {
        setMascotState('idle');
        setMascotMessage(`Siap menguji pemahamanmu tentang ${selectedLesson.subject}? Jawab kuis ini dengan nilai >= 70 untuk bonus +2 Poin Kebaikan!`);
      }
    }
  }, [activeTab, selectedLesson, learningMode, simplifiedSlides.length, currentSlideIdx, showQuizResults, quizScoreRecord, isBlockedFromSusulan]);

  const fetchSimplifiedContent = async (subject: string, content: string) => {
    if (!content) return;
    setIsLoadingSimplify(true);
    try {
      const res = await fetch('/api/grademaster/lessons/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyederhanakan materi');
      setSimplifiedSlides(data.slides || []);
      setCurrentSlideIdx(0);
    } catch (err: any) {
      console.error(err);
      setToast({ message: "Gagal memuat mode santai, beralih ke mode standar", type: 'error' });
      setLearningMode('standar');
    } finally {
      setIsLoadingSimplify(false);
    }
  };

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
          .eq('academic_year', academicYear)
          .eq('is_published', true)
          .order('date', { ascending: false });

        if (error) throw error;
        setLessons(data || []);
        if (data && data.length > 0) {
          setSelectedLesson(data[0]);
        } else {
          setSelectedLesson(null);
        }
      } catch (err: any) {
        console.error("Failed to load lessons:", err);
        setToast({ message: "Gagal memuat daftar pelajaran", type: 'error' });
      } finally {
        setIsLoadingLessons(false);
      }
    };

    fetchLessons();
  }, [activeClassName, academicYear]);

  // Load quizzes and scores when selected lesson changes
  useEffect(() => {
    const fetchQuizzesAndScores = async () => {
      if (!selectedLesson) {
        setQuizzes([]);
        setSelectedQuiz(null);
        setQuizScoreRecord(null);
        setShowQuizResults(false);
        setIsBlockedFromSusulan(false);
        return;
      }

      setIsLoadingQuizzes(true);
      setSelectedQuiz(null);
      setQuizScoreRecord(null);
      setShowQuizResults(false);
      setIsBlockedFromSusulan(false);
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
            // Check Susulan eligibility
            if (firstQuiz.title && firstQuiz.title.includes('Susulan')) {
              try {
                const examType = firstQuiz.title.includes('UTS') ? 'Susulan UTS' : 'Susulan UAS';
                const studentName = studentData?.name;
                if (studentName) {
                  const checkRes = await fetch(
                    `/api/grademaster/students/existing-scores?class=${encodeURIComponent(activeClassName)}&subject=${encodeURIComponent(selectedLesson.subject)}&year=${encodeURIComponent(academicYear)}&semester=${encodeURIComponent(semester)}&examType=${encodeURIComponent(examType)}`
                  );
                  if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    const existingSet = new Set<string>(checkData.existingStudents || []);
                    if (existingSet.has(studentName)) {
                      setIsBlockedFromSusulan(true);
                    }
                  }
                }
              } catch (checkErr) {
                console.error("Failed to verify Susulan eligibility:", checkErr);
              }
            }

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

    // Reset and trigger simplify if needed
    setSimplifiedSlides([]);
    setCurrentSlideIdx(0);
    if (selectedLesson && learningMode === 'santai') {
      fetchSimplifiedContent(selectedLesson.subject, selectedLesson.content || selectedLesson.ai_reading_preview || "");
    }
  }, [selectedLesson]);

  // Trigger auto-simplification when mode is switched to 'santai' and we have no cached slides
  useEffect(() => {
    if (learningMode === 'santai' && selectedLesson && simplifiedSlides.length === 0 && !isLoadingSimplify) {
      fetchSimplifiedContent(selectedLesson.subject, selectedLesson.content || selectedLesson.ai_reading_preview || "");
    }
  }, [learningMode, selectedLesson]);

  // Send message to Copilot AI
  const suggestedLessonQuestions = [
    "💡 Jelaskan materi gampangnya dong!",
    "🔍 Berikan contoh nyata materi ini",
    "📝 Buat 3 soal kuis latihan singkat",
    "📚 Apa kesimpulan penting hari ini?"
  ];

  const handleSelectSuggestedQuestion = async (questionText: string) => {
    if (isAiResponding || !selectedLesson) return;

    const updatedMessages = [...chatMessages, { role: 'user' as const, content: questionText }];
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
          message: questionText,
          history,
          role: 'student',
          currentLayer: 'student_lesson',
          studentClass: activeClassName,
          subject: selectedLesson.subject,
          chatPrompt: selectedLesson.ai_chat_prompt
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal terhubung ke AI');

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      console.error("AI response error:", err);
      setChatMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `Maaf, saya sedang mengalami kendala jaringan. Pertanyaan Anda: "${questionText}". Silakan coba tanyakan kembali.` }
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

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
          subject: selectedLesson.subject,
          chatPrompt: selectedLesson.ai_chat_prompt
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

      // If score is passing (>= 70) and it was not previously completed (no quizScoreRecord existed yet)
      const isFirstAttempt = !quizScoreRecord;
      if (finalScore >= 70 && isFirstAttempt) {
        // Trigger behavior action for +2 Poin Kebaikan
        const behaviorId = studentData?.behavior_id || studentData?.student_id;
        if (behaviorId) {
          const behaviorResult = await addBehaviorAction({
            studentId: behaviorId,
            pointsDelta: -2, // Positive 2 merits/appreciation = negative delta in gm_behaviors
            reason: `Menyelesaikan Kuis Harian: ${selectedLesson.subject} (Nilai: ${finalScore})`
          });
          if (behaviorResult.success) {
            console.log('Successfully rewarded +2 Poin Kebaikan');
          } else {
            console.error('Failed to reward behavior points:', behaviorResult.error);
          }
        }

        // Trigger streak update
        await triggerStreakUpdate();
        
        // Fire confetti
        fireConfetti();
        
        // Set mascot success state
        setMascotState('success');
        setMascotMessage(`Selamat! Kamu lulus kuis dengan nilai ${finalScore}/100! +2 Poin Kebaikan telah ditambahkan ke akunmu! 🌟`);
      } else {
        // Just trigger streak update if it's completed (even if they didn't pass, studying counts as streak activity!)
        await triggerStreakUpdate();
        
        if (finalScore < 70) {
          setMascotState('sad');
          setMascotMessage(`Kuis selesai dengan nilai ${finalScore}/100. Yuk pelajari lagi materinya biar bisa dapat nilai lebih tinggi lain kali!`);
        }
      }

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

  const renderSimplifySkeleton = () => (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 animate-pulse flex flex-col justify-center items-center py-12 min-h-[300px]">
      <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0 relative animate-bounce mb-3 border border-emerald-100/50">
        <Sparkles size={24} className="text-emerald-650" />
      </div>
      <div className="h-4 bg-slate-200 rounded-full w-2/3 mx-auto"></div>
      <div className="h-3 bg-slate-100 rounded-full w-1/2 mx-auto mt-2"></div>
      <div className="space-y-2.5 w-full pt-6">
        <div className="h-3 bg-slate-100 rounded-full w-full"></div>
        <div className="h-3 bg-slate-100 rounded-full w-5/6"></div>
        <div className="h-3 bg-slate-100 rounded-full w-4/5"></div>
      </div>
    </div>
  );

  const renderSlideDeck = () => {
    if (simplifiedSlides.length === 0) return null;
    const currentSlide = simplifiedSlides[currentSlideIdx];
    const totalSlides = simplifiedSlides.length;

    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
        
        {/* Slide Progress Indicator */}
        <div className="flex gap-1.5 w-full px-1">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                idx <= currentSlideIdx ? 'bg-emerald-500' : 'bg-slate-150'
              }`}
            />
          ))}
        </div>

        {/* The Card */}
        <div className="bg-gradient-to-br from-emerald-50/20 to-teal-50/5 border border-emerald-500/10 rounded-[2rem] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[340px]">
          
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-650 bg-emerald-100/50 px-2.5 py-1 rounded-full border border-emerald-500/10">
                Slide {currentSlideIdx + 1} dari {totalSlides}
              </span>
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <Sparkles size={11} className="text-emerald-500 animate-pulse" /> Paham Kilat AI
              </div>
            </div>

            <h3 className="text-base font-black text-slate-900 leading-tight font-outfit">
              {currentSlide.title}
            </h3>

            <div className="text-slate-700 text-[12.5px] leading-relaxed whitespace-pre-wrap font-medium space-y-2">
              {currentSlide.content.split('\n').map((para: string, pIdx: number) => {
                const trimmed = para.trim();
                if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                  return (
                    <div key={pIdx} className="flex items-start gap-2 pl-1 mt-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                      <p className="flex-1 text-slate-750 font-bold">{trimmed.substring(1).trim()}</p>
                    </div>
                  );
                }
                return <p key={pIdx} className="text-slate-750 font-semibold">{trimmed}</p>;
              })}
            </div>

            {/* Analogi Box */}
            {currentSlide.analogy && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3.5 mt-4 text-left flex items-start gap-2.5 animate-in slide-in-from-bottom-2 duration-300">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Lightbulb size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-[10px] font-black text-amber-950 uppercase tracking-wider">💡 Gampangnya Gini:</h5>
                  <p className="text-slate-650 text-[11.5px] font-semibold mt-0.5 leading-relaxed">
                    {currentSlide.analogy}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons inside card */}
          <div className="flex justify-between items-center gap-3 pt-5 border-t border-slate-100 mt-6 shrink-0">
            <button
              onClick={() => setCurrentSlideIdx(prev => Math.max(0, prev - 1))}
              disabled={currentSlideIdx === 0}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10.5px] font-black uppercase tracking-wider disabled:opacity-40 transition-all border border-slate-100 min-h-[38px] active:scale-95 flex items-center gap-1"
            >
              Kembali
            </button>
            <button
              onClick={async () => {
                if (currentSlideIdx < totalSlides - 1) {
                  setCurrentSlideIdx(prev => prev + 1);
                } else {
                  setToast({ message: "Hebat! Kamu sudah membaca semua materi hari ini 🚀", type: "success" });
                  await triggerStreakUpdate();
                }
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all min-h-[38px] active:scale-95 shadow-sm shadow-emerald-500/15 flex items-center gap-1"
            >
              {currentSlideIdx === totalSlides - 1 ? 'Selesai' : 'Lanjut'}
            </button>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className={`${isTab ? 'min-h-full p-4 pb-28' : 'min-h-dvh p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto page-pt md:pt-16 pb-24'} bg-slate-50/50 font-outfit`}>
      {/* Header */}
      <header className={`${isTab ? 'mb-5' : 'mb-8 md:mb-10'} animate-in fade-in slide-in-from-top-4 duration-500`}>
        {!isTab && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-all mb-4 group min-h-[44px]"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Beranda
          </button>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`${isTab ? 'text-2xl font-black text-slate-900 tracking-tight' : 'text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none'}`}>
              Pelajaran Saya
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2">
              Akses ringkasan materi AI, tanya jawab interaktif, dan kuis kelas {activeClassName}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {/* Study Streak Widget */}
            <div className="flex items-center gap-1.5 px-4.5 py-2 bg-amber-50 text-amber-700 rounded-full border border-amber-200/60 text-[10.5px] font-black uppercase tracking-wider shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
              <span className="text-sm select-none">🔥</span>
              <span>{streakCount} Hari Streak</span>
            </div>

            <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
               Kelas {activeClassName}
            </div>
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
        <div className={`grid grid-cols-1 ${isTab ? 'gap-5' : 'lg:grid-cols-12 gap-8'} items-start`}>
          
          {/* LEFT: MASTER LIST */}
          <div className={`${isTab ? '' : 'lg:col-span-4'} space-y-3`}>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Materi Terbit</h3>
            <div className={`flex ${isTab ? 'flex-row overflow-x-auto gap-3 pb-2.5 scrollbar-thin' : 'flex-col space-y-3 max-h-[600px] overflow-y-auto'} pr-1 no-scrollbar`}>
              {lessons.map((lesson) => {
                const isSelected = selectedLesson?.id === lesson.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`${isTab ? 'min-w-[200px] max-w-[220px] p-4' : 'w-full p-5'} rounded-2xl border text-left transition-all duration-300 flex items-start gap-3.5 shrink-0 active:scale-[0.98] ${
                      isSelected 
                        ? 'bg-white border-emerald-500 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500' 
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' : 'bg-slate-50 text-slate-400'
                    }`}>
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-950 text-sm truncate leading-snug">{lesson.subject}</h4>
                      <div className="flex items-center gap-1.5 mt-1.5 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                        <Calendar size={10} />
                        <span className="truncate">{lesson.date}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: DETAIL VIEW */}
          <div className={`${isTab ? 'p-5 rounded-3xl min-h-[400px]' : 'lg:col-span-8 p-6 sm:p-8 rounded-[32px] min-h-[500px]'} bg-white border border-slate-200 shadow-sm flex flex-col`}>
            {selectedLesson && (
              <>
                {/* Subject Header */}
                <div className={`${isTab ? 'pb-4 mb-4' : 'pb-6 mb-6'} border-b border-slate-100`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-1.5">
                    <h2 className={`${isTab ? 'text-xl' : 'text-2xl sm:text-3xl'} font-black text-slate-900 tracking-tight`}>{selectedLesson.subject}</h2>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                      <Calendar size={11} /> {selectedLesson.date}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Materi Kelas {activeClassName}</p>
                </div>

                {/* Tab selectors */}
                <div className="flex border-b border-slate-100 mb-6 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'materi', label: isTab ? 'Materi' : 'Ringkasan Materi', icon: FileText },
                    { id: 'chat_ai', label: isTab ? 'Tanya AI' : 'Tanya AI Copilot', icon: Bot },
                    { id: 'kuis', label: isTab ? 'Kuis' : 'Kuis Harian', icon: Award }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap text-xs font-black uppercase tracking-widest min-h-[40px] ${
                        activeTab === tab.id 
                          ? 'border-emerald-500 text-emerald-600' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <tab.icon size={14} /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* GradeMaster Mascot Dialog */}
                <GradeMasterMascot 
                  state={mascotState} 
                  message={mascotMessage} 
                  className="mb-6 shadow-sm border border-slate-100/50" 
                />

                {/* TAB CONTENT */}
                <div className="flex-1 flex flex-col">
                  
                  {/* TAB: MATERIAL */}
                  {activeTab === 'materi' && (
                    <div className="space-y-5">
                      
                      {/* Mode Belajar Toggle */}
                      <div className="bg-slate-100/80 border border-slate-200/50 rounded-2xl p-1 flex">
                        <button
                          onClick={() => setLearningMode('santai')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all min-h-[36px] ${
                            learningMode === 'santai'
                              ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/20'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Sparkles size={13} /> Paham Kilat AI
                        </button>
                        <button
                          onClick={() => setLearningMode('standar')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all min-h-[36px] ${
                            learningMode === 'standar'
                              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/20'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <BookOpen size={13} /> Buku Teks
                        </button>
                      </div>

                      {learningMode === 'santai' ? (
                        isLoadingSimplify ? (
                          renderSimplifySkeleton()
                        ) : (
                          renderSlideDeck()
                        )
                      ) : (
                        <div className="space-y-5 animate-in fade-in duration-300">
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

                      {/* Rekomendasi Pertanyaan */}
                      {!isAiResponding && (
                        <div className="flex gap-2 pb-2.5 pt-1 overflow-x-auto no-scrollbar shrink-0">
                          {suggestedLessonQuestions.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              onClick={() => handleSelectSuggestedQuestion(q)}
                              className="px-3 py-1.5 bg-slate-50 border border-slate-200/50 hover:border-emerald-200 hover:bg-emerald-50/30 hover:text-emerald-700 rounded-full text-[10px] font-bold text-slate-500 transition-all active:scale-95 shrink-0 whitespace-nowrap"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}

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

                          {isBlockedFromSusulan ? (
                            /* BLOCKED WARNING VIEW */
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 sm:p-8 text-center space-y-5 flex-1 flex flex-col justify-center items-center">
                              <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <AlertCircle size={32} />
                              </div>
                              <div className="space-y-2">
                                <p className="text-amber-600 text-[10px] font-black uppercase tracking-widest">Akses Ujian Ditutup</p>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">Ujian Susulan Tidak Tersedia</h3>
                                <p className="text-slate-500 text-xs font-semibold max-w-sm mx-auto leading-relaxed">
                                  Sistem mendeteksi Anda **sudah memiliki nilai** untuk ujian utama mata pelajaran **{selectedLesson.subject}** kelas **{activeClassName}**.
                                </p>
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                                Ujian ini khusus untuk siswa yang belum memiliki nilai.
                              </div>
                            </div>
                          ) : showQuizResults && quizScoreRecord ? (
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
