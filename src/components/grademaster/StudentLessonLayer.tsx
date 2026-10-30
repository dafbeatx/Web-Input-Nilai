"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Bot, 
  Send, 
  Loader2, 
  HelpCircle, 
  Award, 
  AlertCircle, 
  Lightbulb, 
  ChevronLeft, 
  ChevronRight,
  Play,
  Video,
  VideoOff,
  ExternalLink,
  Edit3,
  Search,
  Copy,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { DailyLesson, Quiz, ToastType } from '@/lib/grademaster/types';
import GradeMasterMascot from './ui/GradeMasterMascot';
import { addBehaviorAction } from '@/lib/actions/behavior';
import { parseLessonToSlides, BookSlide } from '@/lib/grademaster/lessonParser';
import { 
  extractYouTubeId, 
  getYouTubeEmbedUrl, 
  stripYouTubeTag 
} from '@/lib/grademaster/youtubeHelper';

interface SimplifiedSlide {
  title: string;
  content: string;
  analogy?: string;
}

interface QuizQuestion {
  type?: 'mcq' | 'essay';
  text?: string;
  question?: string;
  options?: string[];
  answer?: string;
  correctAnswer?: string;
}

interface StudentLessonLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  semester?: string;
  isTab?: boolean;
  studentClassOverride?: string;
}

type TabType = 'video' | 'materi' | 'catatan' | 'kuis' | 'chat_ai';

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
  interface ConfettiItem {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    r: number;
    rotation: number;
    rotationSpeed: number;
  }
  const confetti: ConfettiItem[] = [];
  
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
      } catch {}
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
  const { studentData, studentClass, academicYear, isParent } = useGradeMaster();
  const activeClassName = studentClassOverride || studentData?.class_name || studentClass || "";

  // Core State
  const [lessons, setLessons] = useState<DailyLesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<DailyLesson | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('video');

  // LMS Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');

  // LMS Module Completion Persistence
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  // LMS Personal Student Notepad
  const [studentNote, setStudentNote] = useState('');
  const [isCopiedNote, setIsCopiedNote] = useState(false);

  // Quiz State
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  interface QuizScoreRecord {
    score: number;
    completed_at: string;
  }
  const [quizScoreRecord, setQuizScoreRecord] = useState<QuizScoreRecord | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [isBlockedFromSusulan, setIsBlockedFromSusulan] = useState(false);

  // Chat AI State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Simplified AI Mode State
  const [learningMode, setLearningMode] = useState<'santai' | 'standar'>('santai');
  const [simplifiedSlides, setSimplifiedSlides] = useState<SimplifiedSlide[]>([]);
  const [, setIsLoadingSimplify] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [bookViewMode, setBookViewMode] = useState<'slide' | 'scroll'>('slide');

  // Extract YouTube ID & Embed URL for currently selected lesson
  const currentVideoId = useMemo(() => {
    if (!selectedLesson) return null;
    return extractYouTubeId(selectedLesson.video_url || selectedLesson.content);
  }, [selectedLesson]);

  const currentEmbedUrl = useMemo(() => {
    return currentVideoId ? getYouTubeEmbedUrl(currentVideoId) : null;
  }, [currentVideoId]);

  // Clean text content without any raw [YOUTUBE: ...] markers
  const cleanLessonContent = useMemo(() => {
    if (!selectedLesson) return '';
    return stripYouTubeTag(selectedLesson.content);
  }, [selectedLesson]);

  // Compute parsed book slides dynamically from lesson material
  const bookSlides: BookSlide[] = useMemo(() => {
    if (!selectedLesson) return [];
    const textToParse = selectedLesson.ai_reading_preview || cleanLessonContent || '';
    return parseLessonToSlides(textToParse, selectedLesson.subject);
  }, [selectedLesson, cleanLessonContent]);

  // Streak & Mascot states
  const [streakCount, setStreakCount] = useState<number>(studentData?.study_streak || 0);
  const [hasStreakUpdatedToday, setHasStreakUpdatedToday] = useState<boolean>(false);
  const [mascotState, setMascotState] = useState<'idle' | 'success' | 'sad' | 'streak'>('idle');
  const [mascotMessage, setMascotMessage] = useState<string>('Selamat datang di Nawasena LMS! Pilih salah satu modul pembelajaran untuk mulai belajar.');

  const getLocalDateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load completed lessons from localStorage
  useEffect(() => {
    if (!activeClassName || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`nawasena_lms_completed_${activeClassName}`);
      if (saved) {
        const parsed = new Set<string>(JSON.parse(saved));
        queueMicrotask(() => {
          setCompletedLessons(parsed);
        });
      }
    } catch {
      // Ignored
    }
  }, [activeClassName]);

  // Load student note for selected lesson
  useEffect(() => {
    if (!selectedLesson || typeof window === 'undefined') return;
    const studentId = studentData?.id || 'guest';
    const noteKey = `nawasena_note_${studentId}_${selectedLesson.id}`;
    const saved = localStorage.getItem(noteKey) || '';
    queueMicrotask(() => {
      setStudentNote(saved);
    });
  }, [selectedLesson, studentData?.id]);

  const handleSaveNote = (newNote: string) => {
    setStudentNote(newNote);
    if (!selectedLesson || typeof window === 'undefined') return;
    const studentId = studentData?.id || 'guest';
    const noteKey = `nawasena_note_${studentId}_${selectedLesson.id}`;
    try {
      localStorage.setItem(noteKey, newNote);
    } catch {
      // Ignored
    }
  };

  const handleCopyNote = () => {
    if (!studentNote) return;
    navigator.clipboard.writeText(studentNote);
    setIsCopiedNote(true);
    setToast({ message: "Catatan berhasil disalin ke clipboard!", type: "success" });
    setTimeout(() => setIsCopiedNote(false), 2000);
  };

  const toggleLessonCompleted = (lessonId: string) => {
    setCompletedLessons(prev => {
      const next = new Set(prev);
      const isNowCompleted = !next.has(lessonId);
      if (isNowCompleted) {
        next.add(lessonId);
        fireConfetti();
        setMascotState('success');
        setMascotMessage('Luar biasa! Modul pembelajaran berhasil kamu selesaikan. Tetap semangat!');
        setToast({ message: 'Modul ditandai selesai! 🎉', type: 'success' });
      } else {
        next.delete(lessonId);
        setToast({ message: 'Tanda penyelesaian modul dibatalkan.', type: 'success' });
      }
      try {
        localStorage.setItem(`nawasena_lms_completed_${activeClassName}`, JSON.stringify(Array.from(next)));
      } catch {
        // Ignored
      }
      return next;
    });
  };

  useEffect(() => {
    if (studentData?.study_streak !== undefined) {
      queueMicrotask(() => {
        setStreakCount(studentData.study_streak || 0);
      });
    }
  }, [studentData?.study_streak]);

  useEffect(() => {
    if (studentData?.last_active_date) {
      const todayStr = getLocalDateString();
      queueMicrotask(() => {
        setHasStreakUpdatedToday(studentData.last_active_date === todayStr);
      });
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
      }
    } catch (err) {
      console.error('Streak update network error:', err);
    }
  };

  // Coordinator Effect for Mascot dialog bubble and expressions
  useEffect(() => {
    queueMicrotask(() => {
      if (!selectedLesson) {
        setMascotState('idle');
        setMascotMessage('Halo! Yuk pilih salah satu modul pembelajaran di kurikulum sebelah kiri.');
        return;
      }

      if (activeTab === 'video') {
        if (currentVideoId) {
          setMascotState('idle');
          setMascotMessage(`Tonton video pembelajaran tentang ${selectedLesson.subject}. Catat poin-poin penting di tab Catatan ya!`);
        } else {
          setMascotState('idle');
          setMascotMessage(`Belum ada video terlampir untuk modul ini. Yuk baca rangkuman materi di tab Materi!`);
        }
      } else if (activeTab === 'materi') {
        setMascotState('idle');
        setMascotMessage(`Kamu sedang membaca slide materi ${selectedLesson.subject}. Pahami konsep utamanya perlahan ya!`);
      } else if (activeTab === 'catatan') {
        setMascotState('idle');
        setMascotMessage(`Tuliskan ringkasan pribadi atau rumus pentingmu di sini. Catatanmu tersimpan otomatis!`);
      } else if (activeTab === 'chat_ai') {
        setMascotState('idle');
        setMascotMessage(`Ada konsep yang membingungkan dari materi "${selectedLesson.subject}"? Tanyakan pada AI Tutor!`);
      } else if (activeTab === 'kuis') {
        if (showQuizResults && quizScoreRecord) {
          const score = Math.round(quizScoreRecord.score);
          if (score >= 70) {
            setMascotState('success');
            setMascotMessage(`Luar biasa! Kamu menyelesaikan kuis dengan nilai ${score}/100 dan mendapatkan +2 Poin Kebaikan! 🔥`);
          } else {
            setMascotState('sad');
            setMascotMessage(`Kuis selesai dengan nilai ${score}/100. Tetap semangat, pelajari kembali video & materinya ya!`);
          }
        } else if (isBlockedFromSusulan) {
          setMascotState('sad');
          setMascotMessage(`Ujian susulan ditutup karena kamu sudah memiliki nilai untuk mata pelajaran ini.`);
        } else {
          setMascotState('idle');
          setMascotMessage(`Siap menguji pemahamanmu tentang ${selectedLesson.subject}? Nilai >= 70 mendapatkan bonus +2 Poin Kebaikan!`);
        }
      }
    });
  }, [activeTab, selectedLesson, currentVideoId, showQuizResults, quizScoreRecord, isBlockedFromSusulan]);

  const fetchSimplifiedContent = useCallback(async (subject: string, content: string) => {
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
    } catch (err) {
      console.error(err);
      setToast({ message: "Gagal memuat mode santai, beralih ke mode standar", type: 'error' });
      setLearningMode('standar');
    } finally {
      setIsLoadingSimplify(false);
    }
  }, [setToast]);

  // Load published lessons on mount
  useEffect(() => {
    const fetchLessons = async () => {
      if (!activeClassName) {
        setIsLoadingLessons(false);
        return;
      }
      setIsLoadingLessons(true);
      try {
        const classesToSearch = [activeClassName];
        const cleaned = activeClassName.trim().toUpperCase().replace(/^KELAS\s+/i, '');
        if (/^7\b|^7[A-Z-]/i.test(cleaned) || /^VII\b|^VII[A-Z-]/i.test(cleaned)) {
          classesToSearch.push('Kelas 7', 'Kelas VII');
        } else if (/^8\b|^8[A-Z-]/i.test(cleaned) || /^VIII\b|^VIII[A-Z-]/i.test(cleaned)) {
          classesToSearch.push('Kelas 8', 'Kelas VIII');
        } else if (/^9\b|^9[A-Z-]/i.test(cleaned) || /^IX\b|^IX[A-Z-]/i.test(cleaned)) {
          classesToSearch.push('Kelas 9', 'Kelas IX');
        } else if (/^10\b|^10[A-Z-]/i.test(cleaned) || /^X\b|^X[A-Z-]/i.test(cleaned)) {
          classesToSearch.push('Kelas 10', 'Kelas X');
        } else if (/^11\b|^11[A-Z-]/i.test(cleaned) || /^XI\b|^XI[A-Z-]/i.test(cleaned)) {
          classesToSearch.push('Kelas 11', 'Kelas XI');
        } else if (/^12\b|^12[A-Z-]/i.test(cleaned) || /^XII\b|^XII[A-Z-]/i.test(cleaned)) {
          classesToSearch.push('Kelas 12', 'Kelas XII');
        }

        const { data, error } = await supabase
          .from('daily_lessons')
          .select('*')
          .in('class_name', classesToSearch)
          .eq('academic_year', academicYear)
          .eq('is_published', true)
          .order('date', { ascending: false });

        if (error) throw error;

        // Auto-extract YouTube video URL from either video_url column or tagged content
        const mappedLessons = (data || []).map(l => {
          const ytId = extractYouTubeId(l.video_url || l.content);
          return {
            ...l,
            video_url: l.video_url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : undefined)
          };
        });

        setLessons(mappedLessons);
        if (mappedLessons.length > 0) {
          setSelectedLesson(mappedLessons[0]);
          // Default tab to 'video' if video exists, else 'materi'
          const hasVideo = extractYouTubeId(mappedLessons[0].video_url || mappedLessons[0].content);
          setActiveTab(hasVideo ? 'video' : 'materi');
        } else {
          setSelectedLesson(null);
        }
      } catch (err) {
        console.error("Failed to load lessons:", err);
        setToast({ message: "Gagal memuat daftar pelajaran", type: 'error' });
      } finally {
        setIsLoadingLessons(false);
      }
    };

    fetchLessons();
  }, [activeClassName, academicYear, setToast]);

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
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('lesson_id', selectedLesson.id);

        if (quizError) throw quizError;
        setQuizzes(quizData || []);
        
        if (quizData && quizData.length > 0) {
          const firstQuiz = quizData[0];
          setSelectedQuiz(firstQuiz);

          const { data: { user } } = await supabase.auth.getUser();
          const studentId = studentData?.id || user?.id;

          if (studentId) {
            if (firstQuiz.title && firstQuiz.title.includes('Susulan')) {
              try {
                const examType = (firstQuiz.title.includes('UTS') || firstQuiz.title.includes('ASTS')) ? 'Susulan UTS' : 'Susulan UAS';
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
      } catch (err) {
        console.error("Failed to load quizzes/scores:", err);
      } finally {
        setIsLoadingQuizzes(false);
      }
    };

    fetchQuizzesAndScores();

    queueMicrotask(() => {
      setChatMessages([
        { 
          role: 'assistant', 
          content: `Halo! Saya asisten AI Nawasena LMS. Saya siap membantumu mempelajari materi **${selectedLesson?.subject || 'pelajaran'}** hari ini. Ada pertanyaan tentang konsep dalam video atau materi?` 
        }
      ]);

      setSimplifiedSlides([]);
      setCurrentSlideIdx(0);
      if (selectedLesson && learningMode === 'santai') {
        fetchSimplifiedContent(selectedLesson.subject, cleanLessonContent || selectedLesson.ai_reading_preview || "");
      }
    });
  }, [selectedLesson, activeClassName, academicYear, semester, studentData, learningMode, cleanLessonContent, fetchSimplifiedContent]);

  // Available subjects for filter pills
  const availableSubjects = useMemo(() => {
    return Array.from(new Set(lessons.map(l => l.subject)));
  }, [lessons]);

  // Filtered lessons by subject & search query
  const filteredLessons = useMemo(() => {
    return lessons.filter(l => {
      const matchSubject = selectedSubjectFilter === 'ALL' || l.subject === selectedSubjectFilter;
      const matchSearch = !searchQuery.trim() || 
        l.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchSearch;
    });
  }, [lessons, selectedSubjectFilter, searchQuery]);

  // LMS metrics calculations
  const totalModules = lessons.length;
  const completedCount = lessons.filter(l => completedLessons.has(l.id)).length;
  const videoModulesCount = lessons.filter(l => extractYouTubeId(l.video_url || l.content)).length;
  const completionPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  // Suggested questions for AI tutor
  const suggestedLessonQuestions = [
    "💡 Jelaskan inti video pembelajaran ini!",
    "🔍 Berikan contoh penerapan materi dalam kehidupan nyata",
    "📝 Buat 3 pertanyaan latihan singkat",
    "📚 Apa kesimpulan paling penting yang harus saya ingat?"
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
    } catch (err) {
      console.error("AI response error:", err);
      setChatMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `Maaf, terjadi kendala jaringan saat menghubungkan ke AI. Silakan tanyakan kembali.` }
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
    } catch (err) {
      console.error("AI response error:", err);
      setChatMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `Maaf, sedang terjadi kendala jaringan. Silakan ulangi pertanyaan Anda.` }
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz || !selectedLesson) return;

    const questionsList = (selectedQuiz.questions || []) as QuizQuestion[];
    if (questionsList.length === 0) return;

    const unansweredMCQ = questionsList.some((q, idx) => {
      return (q.type === 'mcq' || !q.type) && !userAnswers[idx];
    });

    if (unansweredMCQ) {
      setToast({ message: "Harap jawab semua soal pilihan ganda sebelum mengirimkan kuis", type: 'error' });
      return;
    }
    if (isParent) {
      setToast({
        message: "Mode Orang Tua / Wali: Kuis interaktif diselesaikan langsung oleh siswa melalui akun mereka.",
        type: "error"
      });
      return;
    }

    setIsSubmittingQuiz(true);
    try {
      let correctCount = 0;
      let mcqCount = 0;

      questionsList.forEach((q, idx) => {
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

      const isFirstAttempt = !quizScoreRecord;
      if (finalScore >= 70 && isFirstAttempt) {
        const behaviorId = studentData?.behavior_id || studentData?.student_id;
        if (behaviorId) {
          await addBehaviorAction({
            studentId: behaviorId,
            pointsDelta: -2,
            reason: `Menyelesaikan Kuis Harian: ${selectedLesson.subject} (Nilai: ${finalScore})`
          });
        }
        await triggerStreakUpdate();
        fireConfetti();
        setMascotState('success');
        setMascotMessage(`Selamat! Kamu lulus kuis dengan nilai ${finalScore}/100! +2 Poin Kebaikan telah ditambahkan ke akunmu! 🌟`);
      } else {
        await triggerStreakUpdate();
        if (finalScore < 70) {
          setMascotState('sad');
          setMascotMessage(`Kuis selesai dengan nilai ${finalScore}/100. Yuk pelajari lagi video & materinya biar nilaimu meningkat!`);
        }
      }

      setQuizScoreRecord(data);
      setShowQuizResults(true);
      setToast({ message: `Kuis berhasil dikirim! Nilaimu: ${finalScore}/100`, type: 'success' });
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setToast({ message: errMsg || "Gagal menyimpan hasil kuis", type: 'error' });
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderBookDeck = () => {
    const isSimplified = learningMode === 'santai' && simplifiedSlides.length > 0;
    
    interface DisplaySlide {
      title: string;
      paragraphs: string[];
      analogy?: string;
    }

    const currentSlides: DisplaySlide[] = isSimplified 
      ? simplifiedSlides.map((s, idx) => ({
          title: s.title || `Slide ${idx + 1}`,
          paragraphs: s.content.split('\n').filter(p => p.trim().length > 0),
          analogy: s.analogy
        }))
      : bookSlides.map((s) => ({
          title: s.title,
          paragraphs: s.paragraphs
        }));

    if (currentSlides.length === 0) {
      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400">
          Belum ada isi materi pelajaran digital untuk topik ini.
        </div>
      );
    }

    const totalSlides = currentSlides.length;
    const activeSlide = currentSlides[currentSlideIdx] || currentSlides[0];

    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
              <BookOpen size={12} className="text-emerald-600" />
              Slide {currentSlideIdx + 1} dari {totalSlides}
            </span>
            {isSimplified && (
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                <Sparkles size={10} className="text-amber-600" /> Paham Kilat AI
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setBookViewMode('slide')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                  bookViewMode === 'slide' 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Slide
              </button>
              <button
                onClick={() => setBookViewMode('scroll')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                  bookViewMode === 'scroll' 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Semua
              </button>
            </div>
          </div>
        </div>

        {bookViewMode === 'slide' ? (
          <>
            <div className="flex gap-1.5 w-full px-1">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIdx(idx)}
                  className={`h-1.5 rounded-full flex-1 transition-all duration-300 cursor-pointer ${
                    idx === currentSlideIdx 
                      ? 'bg-emerald-500 shadow-sm ring-1 ring-emerald-400' 
                      : idx < currentSlideIdx 
                      ? 'bg-emerald-400/80' 
                      : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-7 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[380px] transition-all">
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3.5 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 font-mono">
                      Halaman {currentSlideIdx + 1}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug font-outfit mt-0.5">
                      {activeSlide.title}
                    </h3>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
                    <BookOpen size={16} />
                  </div>
                </div>

                <div className="space-y-4 text-slate-700 text-sm leading-relaxed font-normal">
                  {activeSlide.paragraphs.map((para, pIdx) => {
                    const trimmed = para.trim();
                    if (!trimmed) return null;

                    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                      return (
                        <div key={pIdx} className="flex items-start gap-2.5 pl-1.5 py-0.5">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0 shadow-sm shadow-emerald-500/20" />
                          <p className="flex-1 font-medium text-slate-800 leading-relaxed">
                            {renderFormattedText(trimmed.substring(1).trim())}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <p key={pIdx} className="font-normal text-slate-800 leading-relaxed text-justify sm:text-left">
                        {renderFormattedText(trimmed)}
                      </p>
                    );
                  })}
                </div>

                {activeSlide.analogy && (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3.5 mt-3 text-left flex items-start gap-2.5 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Lightbulb size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-[10px] font-black text-amber-950 uppercase tracking-wider">💡 Gampangnya Gini:</h5>
                      <p className="text-slate-700 text-xs font-semibold mt-0.5 leading-relaxed">
                        {activeSlide.analogy}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center gap-2 pt-5 border-t border-slate-100 mt-6 shrink-0">
                <button
                  onClick={() => setCurrentSlideIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentSlideIdx === 0}
                  className="px-3.5 sm:px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-30 transition-all border border-slate-200/60 min-h-[40px] active:scale-95 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} /> <span className="hidden xs:inline">Sebelumnya</span>
                </button>

                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-[180px] sm:max-w-none">
                  {Array.from({ length: totalSlides }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIdx(idx)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                        idx === currentSlideIdx 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-105' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    if (currentSlideIdx < totalSlides - 1) {
                      setCurrentSlideIdx(prev => prev + 1);
                    } else {
                      setToast({ message: "Hebat! Kamu sudah membaca semua materi hari ini 🚀", type: "success" });
                      await triggerStreakUpdate();
                      fireConfetti();
                    }
                  }}
                  className={`px-4 sm:px-5 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all min-h-[40px] active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md ${
                    currentSlideIdx === totalSlides - 1
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  {currentSlideIdx === totalSlides - 1 ? (
                    <>Selesai <CheckCircle2 size={16} /></>
                  ) : (
                    <><span className="hidden xs:inline">Lanjut</span> <ChevronRight size={16} /></>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-7 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Daftar Seluruh Materi ({totalSlides} Slide)
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Mode Baca Gulir</span>
            </div>

            {currentSlides.map((slide, sIdx) => (
              <div key={sIdx} className="space-y-3 pb-6 border-b border-slate-100 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center shrink-0">
                    {sIdx + 1}
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 font-outfit">
                    {slide.title}
                  </h4>
                </div>

                <div className="space-y-3.5 pl-8 text-slate-700 text-sm leading-relaxed">
                  {slide.paragraphs.map((p, pIdx) => {
                    const trimmed = p.trim();
                    if (!trimmed) return null;

                    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                      return (
                        <div key={pIdx} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0" />
                          <p className="flex-1 font-medium text-slate-800">
                            {renderFormattedText(trimmed.substring(1).trim())}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <p key={pIdx} className="font-normal text-slate-800 leading-relaxed">
                        {renderFormattedText(trimmed)}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {cleanLessonContent && cleanLessonContent.trim() !== selectedLesson?.ai_reading_preview?.trim() && cleanLessonContent.length > 50 && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left space-y-2 mt-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-0.5">
              Catatan / Instruksi Guru
            </h4>
            <div className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
              {cleanLessonContent}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${isTab ? 'min-h-full px-3 sm:px-6 py-4 pb-28' : 'min-h-dvh px-3 sm:px-8 py-6 max-w-7xl mx-auto page-pt pb-28'} bg-slate-50/60 font-outfit text-slate-900`}>
      
      {/* LMS TOP HEADER & METRICS BAR */}
      <header className="mb-6 space-y-4">
        {!isTab && (
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-bold text-xs transition-all group min-h-[44px]"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Portal Utama
          </button>
        )}

        {/* Title, Class, and Badges */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Nawasena LMS
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Ruang Belajar Digital
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isParent ? 'Kurikulum & Video Pembelajaran Ananda' : 'Pusat Pembelajaran & Video Interaktif'}
            </h1>
            <p className="text-slate-500 text-xs font-medium">
              Kelas {activeClassName} • Tahun Ajaran {academicYear} • Semester {semester}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
              <BookOpen size={16} className="text-indigo-600" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Modul</p>
                <p className="font-black text-slate-800 leading-tight mt-0.5">{totalModules} Modul</p>
              </div>
            </div>

            <div className="flex-1 sm:flex-none flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
              <Video size={16} className="text-red-500" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Video Materi</p>
                <p className="font-black text-slate-800 leading-tight mt-0.5">{videoModulesCount} Video</p>
              </div>
            </div>

            <div className="flex-1 sm:flex-none flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <div>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Tuntas</p>
                <p className="font-black text-emerald-800 leading-tight mt-0.5">{completedCount} ({completionPercent}%)</p>
              </div>
            </div>

            <div className="flex-1 sm:flex-none flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs">
              <span className="text-sm">🔥</span>
              <div>
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">Streak Belajar</p>
                <p className="font-black text-amber-900 leading-tight mt-0.5">{streakCount} Hari</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar of Course Completion */}
        <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </header>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedSubjectFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedSubjectFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua ({lessons.length})
          </button>
          {availableSubjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubjectFilter(sub)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedSubjectFilter === sub
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari materi / modul..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {isLoadingLessons ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
          <Loader2 size={36} className="animate-spin text-indigo-500 mb-4" />
          <p className="text-slate-500 font-bold text-sm">Memuat kurikulum dan video LMS Anda...</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[32px] p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100">
            <BookOpen size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Belum Ada Materi LMS</h3>
          <p className="text-slate-400 text-sm font-medium max-w-sm">Guru belum mempublikasikan modul pembelajaran harian untuk kelas {activeClassName}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: LMS CURRICULUM PLAYLIST / SIDEBAR */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Daftar Modul ({filteredLessons.length})
              </h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Kelas {activeClassName}
              </span>
            </div>

            <div className="flex flex-col space-y-2.5 max-h-[720px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredLessons.map((lesson, idx) => {
                const isSelected = selectedLesson?.id === lesson.id;
                const isDone = completedLessons.has(lesson.id);
                const hasVideo = Boolean(extractYouTubeId(lesson.video_url || lesson.content));

                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setSelectedLesson(lesson);
                      if (hasVideo && activeTab === 'materi') {
                        setActiveTab('video');
                      }
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3.5 relative overflow-hidden group active:scale-[0.99] ${
                      isSelected 
                        ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {/* Completion status dot/check */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLessonCompleted(lesson.id);
                      }}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${
                        isDone 
                          ? 'bg-emerald-500 text-white shadow-sm' 
                          : isSelected 
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                          : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                      }`}
                      title={isDone ? "Tandai belum selesai" : "Tandai sudah selesai"}
                    >
                      {isDone ? <Check size={16} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 font-mono">
                          Modul {String(idx + 1).padStart(2, '0')}
                        </span>
                        {hasVideo && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                            <Play size={8} className="fill-red-600" /> Video
                          </span>
                        )}
                        {isDone && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">
                            Selesai
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate leading-snug">
                        {lesson.subject}
                      </h4>

                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {stripYouTubeTag(lesson.content || lesson.ai_reading_preview)}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-slate-400 font-semibold text-[9px] uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> {lesson.date}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: LMS CLASSROOM HUB */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[32px] p-5 sm:p-7 shadow-sm flex flex-col min-h-[600px]">
            {selectedLesson ? (
              <>
                {/* Module Header Bar */}
                <div className="pb-4 mb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                        {selectedLesson.subject}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Calendar size={11} /> {selectedLesson.date}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                      {selectedLesson.subject}
                    </h2>
                  </div>

                  {/* Mark as Completed Button */}
                  <button
                    onClick={() => toggleLessonCompleted(selectedLesson.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                      completedLessons.has(selectedLesson.id)
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>{completedLessons.has(selectedLesson.id) ? 'Selesai Dipelajari' : 'Tandai Selesai'}</span>
                  </button>
                </div>

                {/* LMS Tab Selectors */}
                <div className="flex border-b border-slate-100 mb-5 overflow-x-auto no-scrollbar gap-1">
                  {[
                    { id: 'video', label: 'Video Pembelajaran', icon: Video, badge: currentVideoId ? 'Tersedia' : null, color: 'text-red-500' },
                    { id: 'materi', label: 'Slide Materi', icon: BookOpen },
                    { id: 'catatan', label: 'Catatan Siswa', icon: Edit3 },
                    { id: 'kuis', label: 'Kuis Evaluasi', icon: Award },
                    { id: 'chat_ai', label: 'Tanya AI Tutor', icon: Bot }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 border-b-2 transition-all whitespace-nowrap text-xs font-black uppercase tracking-wider min-h-[42px] cursor-pointer ${
                        activeTab === tab.id 
                          ? 'border-indigo-600 text-indigo-700' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <tab.icon size={15} className={activeTab === tab.id ? 'text-indigo-600' : ''} />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>

                {/* GradeMaster Mascot Dialog */}
                <GradeMasterMascot 
                  state={mascotState} 
                  message={mascotMessage} 
                  className="mb-5 shadow-sm border border-slate-100/60" 
                />

                {/* TAB CONTENT CONTAINER */}
                <div className="flex-1 flex flex-col">
                  
                  {/* TAB 1: VIDEO PEMBELAJARAN (YOUTUBE CINEMA PLAYER) */}
                  {activeTab === 'video' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {currentEmbedUrl ? (
                        <div className="space-y-4">
                          {/* 16:9 Responsive Cinema Player */}
                          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-lg">
                            <iframe
                              src={currentEmbedUrl}
                              title={`Video Pembelajaran: ${selectedLesson.subject}`}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          </div>

                          {/* Video Sub-Control Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
                                <Play size={18} className="fill-red-500 ml-0.5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">Video Pembelajaran Resmi</h4>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Tonton video dengan seksama dan catat poin-poin materi di tab Catatan Siswa.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setActiveTab('catatan')}
                                className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                              >
                                <Edit3 size={13} /> Catat Materi
                              </button>
                              {selectedLesson.video_url && (
                                <a
                                  href={selectedLesson.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                >
                                  <ExternalLink size={13} /> Buka di YouTube
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Empty State if No Video Attached */
                        <div className="p-8 sm:p-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center space-y-4">
                          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                            <VideoOff size={26} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-base font-bold text-slate-900">Belum Ada Video untuk Modul Ini</h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                              Guru belum mengunggah link video YouTube pada modul pembelajaran ini. Anda dapat langsung mempelajari slide materi bacaan interaktif atau mengerjakan kuis.
                            </p>
                          </div>
                          <div className="pt-2">
                            <button
                              onClick={() => setActiveTab('materi')}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-md active:scale-95"
                            >
                              <BookOpen size={15} /> Buka Slide Materi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: SLIDE MATERI BUKU DIGITAL */}
                  {activeTab === 'materi' && (
                    <div className="space-y-5">
                      {renderBookDeck()}
                    </div>
                  )}

                  {/* TAB 3: CATATAN BELAJAR SISWA */}
                  {activeTab === 'catatan' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Buku Catatan Digital Saya</h4>
                          <p className="text-[10px] text-slate-500 font-medium">Catatan disimpan otomatis di perangkat Anda khusus untuk modul {selectedLesson.subject}.</p>
                        </div>
                        <button
                          onClick={handleCopyNote}
                          disabled={!studentNote.trim()}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          {isCopiedNote ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{isCopiedNote ? 'Tersalin' : 'Salin Catatan'}</span>
                        </button>
                      </div>

                      <div className="relative">
                        <textarea
                          rows={12}
                          value={studentNote}
                          onChange={(e) => handleSaveNote(e.target.value)}
                          placeholder="Tuliskan rangkuman, rumus, atau poin-poin penting dari video dan materi yang Anda pelajari hari ini..."
                          className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed font-sans resize-y shadow-inner"
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 mt-1 font-mono">
                          <span>{studentNote.length} karakter</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 size={11} /> Tersimpan Otomatis
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: KUIS EVALUASI */}
                  {activeTab === 'kuis' && (
                    <div className="flex-1 flex flex-col justify-between">
                      {isLoadingQuizzes ? (
                        <div className="min-h-[200px] flex flex-col items-center justify-center">
                          <Loader2 className="animate-spin text-indigo-500 mb-2" size={24} />
                          <p className="text-slate-400 text-xs font-bold">Mengecek kuis evaluasi...</p>
                        </div>
                      ) : quizzes.length === 0 ? (
                        <div className="min-h-[250px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <HelpCircle size={28} className="text-slate-300 mb-3" />
                          <h4 className="text-sm font-black text-slate-800">Kuis Belum Tersedia</h4>
                          <p className="text-slate-400 text-xs font-medium max-w-xs mt-1">Guru belum melampirkan kuis evaluasi harian untuk materi ini.</p>
                        </div>
                      ) : selectedQuiz ? (
                        <div className="space-y-6 flex-1 flex flex-col justify-between">
                          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                              <h4 className="text-slate-900 text-xs font-black uppercase tracking-wider">{selectedQuiz.title}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Tipe: {selectedQuiz.quiz_type} • Durasi: {selectedQuiz.duration_minutes} Mnt</p>
                            </div>
                            <Award className="text-indigo-500" size={20} />
                          </div>

                          {isBlockedFromSusulan ? (
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
                            </div>
                          ) : showQuizResults && quizScoreRecord ? (
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
                            <div className="space-y-6 flex-1 flex flex-col justify-between">
                              <div className="space-y-6 max-h-[350px] overflow-y-auto pr-1 no-scrollbar flex-1">
                                {(selectedQuiz.questions as QuizQuestion[]).map((q, qIdx) => {
                                  const isMcq = q.type === 'mcq' || !q.type;
                                  return (
                                    <div key={qIdx} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                      <div className="flex gap-2">
                                        <span className="w-5 h-5 bg-indigo-600 text-white rounded-md flex items-center justify-center text-[10px] font-black shrink-0">{qIdx+1}</span>
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
                                                    ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-md' 
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
                                            className="w-full min-h-[100px] p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {isParent ? (
                                <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold text-center leading-relaxed">
                                  Mode Orang Tua / Wali: Kuis interaktif diselesaikan langsung oleh siswa melalui akun mereka.
                                </div>
                              ) : (
                                <button
                                  onClick={handleSubmitQuiz}
                                  disabled={isSubmittingQuiz}
                                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all transform active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 min-h-[44px]"
                                >
                                  {isSubmittingQuiz ? (
                                    <Loader2 className="animate-spin" size={16} />
                                  ) : (
                                    <>Kirim Jawaban Kuis</>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* TAB 5: TANYA AI COPILOT */}
                  {activeTab === 'chat_ai' && (
                    <div className="flex flex-col flex-1 h-[450px]">
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin">
                        {chatMessages.map((msg, idx) => {
                          const isBot = msg.role === 'assistant';
                          return (
                            <div key={idx} className={`flex items-start gap-3 ${!isBot ? 'justify-end' : ''}`}>
                              {isBot && (
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 text-white shadow-sm">
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
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 text-white">
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

                      {!isAiResponding && (
                        <div className="flex gap-2 pb-2.5 pt-1 overflow-x-auto no-scrollbar shrink-0">
                          {suggestedLessonQuestions.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              onClick={() => handleSelectSuggestedQuestion(q)}
                              className="px-3 py-1.5 bg-slate-50 border border-slate-200/50 hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-700 rounded-full text-[10px] font-bold text-slate-500 transition-all active:scale-95 shrink-0 whitespace-nowrap"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}

                      <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder={`Tanyakan tentang materi ${selectedLesson.subject}...`}
                          disabled={isAiResponding}
                          className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50 min-h-[44px]"
                        />
                        <button
                          type="submit"
                          disabled={!inputValue.trim() || isAiResponding}
                          className="w-12 h-12 bg-[#0F172A] text-white rounded-xl flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
                        >
                          <Send size={16} />
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              </>
            ) : null}
          </div>

        </div>
      )}
    </div>
  );
}
