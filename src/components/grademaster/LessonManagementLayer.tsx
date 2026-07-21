"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Loader2,
  Send,
  CloudUpload,
  Bot,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { DailyLesson, Quiz, ToastType } from '@/lib/grademaster/types';
import { supabase } from '@/lib/supabase/client';
import { 
  generateAILessonContent, 
  createLesson, 
  fetchAllLessons, 
  deleteLesson 
} from '@/lib/grademaster/lessonActions';

const getSubjectExample = (subject: string): { daily: string; quiz: string } => {
  const examples: Record<string, { daily: string; quiz: string }> = {
    'Matematika': {
      daily: 'Aljabar dasar dan persamaan linear',
      quiz: '5 soal pilihan ganda tentang persamaan linear satu variabel'
    },
    'Bahasa Indonesia': {
      daily: 'Struktur teks deskripsi dan unsur kebahasaannya',
      quiz: '5 soal pilihan ganda mengenai struktur teks deskripsi'
    },
    'IPA': {
      daily: 'Klasifikasi makhluk hidup atau sistem tata surya',
      quiz: '5 soal pilihan ganda tentang klasifikasi makhluk hidup'
    },
    'IPS': {
      daily: 'Kondisi geografis Indonesia dan interaksi antarruang',
      quiz: '5 soal pilihan ganda tentang kondisi geografis Indonesia'
    },
    'Bahasa Inggris': {
      daily: 'Introducing oneself and greeting others in formal situations',
      quiz: '5 multiple choice questions on self-introduction greetings'
    },
    'PAI': {
      daily: 'Perilaku jujur, amanah, dan istiqamah dalam kehidupan sehari-hari',
      quiz: '5 soal pilihan ganda tentang perilaku jujur dan amanah'
    },
    'PJOK': {
      daily: 'Teknik dasar sepak bola seperti passing dan dribbling',
      quiz: '5 soal pilihan ganda tentang teknik dasar sepak bola'
    },
    'Seni Budaya': {
      daily: 'Menggambar flora, fauna, dan benda alam dengan teknik arsir',
      quiz: '5 soal pilihan ganda tentang teknik menggambar flora dan fauna'
    },
    'Informatika': {
      daily: 'Pengenalan algoritma pemrograman dan flowchart dasar',
      quiz: '5 soal pilihan ganda tentang algoritma dan flowchart dasar'
    }
  };
  return examples[subject] || {
    daily: 'Topik materi pelajaran yang ingin diajarkan hari ini',
    quiz: 'Cakupan materi soal yang ingin diujikan'
  };
};

interface LessonManagementLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  activeClass?: string;
  academicYear?: string;
  schoolLevel?: string;
  semester?: string;
}

interface QuizQuestion {
  question?: string;
  text?: string;
  options?: string[];
  correctAnswer?: string;
  answer?: string;
  type?: 'mcq' | 'essay';
}

interface AiResultData {
  preview: string;
  chatPrompt: string;
  questions: QuizQuestion[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  options?: { label: string; action?: () => void; actionType?: string; payload?: string }[];
  fileUpload?: boolean;
}

const getWelcomeMessage = (): ChatMessage => ({
  role: 'assistant',
  content: `Halo Guru/Admin! Saya adalah **Asisten Kurikulum AI GradeMaster**. 🤖🎓\n\nSaya di sini untuk membantu Anda membuat materi pelajaran harian, kuis interaktif, atau merangkum naskah dokumen menggunakan mesin cerdas Groq Llama.\n\nSilakan pilih opsi kerja yang ingin Anda lakukan hari ini:`,
  options: [
    { label: "📘 Buat Pelajaran Harian", actionType: 'START_FLOW', payload: 'daily' },
    { label: "📝 Manajemen Ulangan Harian", actionType: 'START_FLOW', payload: 'quiz' },
    { label: "📂 NotebookLM (Upload PDF/DOCX)", actionType: 'START_FLOW', payload: 'notebook' },
    { label: "🎓 Ujian Susulan UTS / UAS", actionType: 'START_FLOW', payload: 'susulan' }
  ]
});

export default function LessonManagementLayer({
  onBack,
  setToast,
  academicYear = '2025/2026',
  schoolLevel = 'SMA',
  semester = 'Ganjil'
}: LessonManagementLayerProps) {
  // Conversational Flow States
  const [messages, setMessages] = useState<ChatMessage[]>([getWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [historyLessons, setHistoryLessons] = useState<DailyLesson[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Selected config during chat
  const [flowType, setFlowType] = useState<'daily' | 'quiz' | 'notebook' | 'susulan' | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  
  // Susulan specific configuration
  const [selectedYear, setSelectedYear] = useState(academicYear);
  const [susulanType, setSusulanType] = useState<'Susulan UTS' | 'Susulan UAS' | null>(null);
  const [awaitingCustomYear, setAwaitingCustomYear] = useState(false);

  // AI Generated Results (Pending Publish/Draft)
  const [aiResult, setAiResult] = useState<AiResultData | null>(null);

  // Ref to store the latest states and avoid stale closures in saved state actions
  const chatStateRef = useRef({
    flowType: null as 'daily' | 'quiz' | 'notebook' | 'susulan' | null,
    selectedClass: '',
    selectedSubject: '',
    extractedText: '',
    aiResult: null as AiResultData | null,
    selectedYear: academicYear,
    susulanType: null as 'Susulan UTS' | 'Susulan UAS' | null
  });

  // Keep ref in sync with state
  useEffect(() => {
    chatStateRef.current = {
      flowType,
      selectedClass,
      selectedSubject,
      extractedText,
      aiResult,
      selectedYear,
      susulanType
    };
  }, [flowType, selectedClass, selectedSubject, extractedText, aiResult, selectedYear, susulanType]);

  // Lesson Preview Modal
  const [previewingLesson, setPreviewingLesson] = useState<DailyLesson | null>(null);
  const [previewingQuizzes, setPreviewingQuizzes] = useState<Quiz[]>([]);
  const [isLoadingPreviewQuizzes, setIsLoadingPreviewQuizzes] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjects = [
    'Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 
    'Bahasa Inggris', 'PAI', 'PJOK', 'Seni Budaya', 'Informatika'
  ];

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiResponding]);

  const loadHistory = async () => {
    try {
      const data = await fetchAllLessons();
      setHistoryLessons(data);
    } catch (err) {
      console.error("Gagal memuat riwayat pelajaran:", err);
    }
  };

  const resetChatToInit = () => {
    setFlowType(null);
    setSelectedClass('');
    setSelectedSubject('');
    setExtractedText('');
    setAiResult(null);
    setSelectedYear(academicYear);
    setSusulanType(null);
    setAwaitingCustomYear(false);
    chatStateRef.current = {
      flowType: null,
      selectedClass: '',
      selectedSubject: '',
      extractedText: '',
      aiResult: null,
      selectedYear: academicYear,
      susulanType: null
    };
    setMessages([getWelcomeMessage()]);
  };

  // Load history list on mount (safely using active-flag clean-up pattern)
  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        const data = await fetchAllLessons();
        if (active) {
          setHistoryLessons(data);
        }
      } catch (err) {
        console.error("Gagal memuat riwayat pelajaran:", err);
      }
    };
    fetchHistory();
    return () => {
      active = false;
    };
  }, []);

  const handleOptionClick = (actionType: string, payload: string | undefined, label: string) => {
    if (!payload && actionType !== 'RESET' && actionType !== 'CUSTOM_YEAR') return;
    switch (actionType) {
      case 'START_FLOW':
        startFlow(payload as 'daily' | 'quiz' | 'notebook' | 'susulan', label);
        break;
      case 'SELECT_CLASS':
        selectClass(payload as string);
        break;
      case 'SELECT_SUBJECT':
        selectSubject(payload as string);
        break;
      case 'SELECT_YEAR':
        selectYear(payload as string);
        break;
      case 'CUSTOM_YEAR':
        startCustomYearInput();
        break;
      case 'SELECT_SUSULAN_TYPE':
        selectSusulanType(payload as 'Susulan UTS' | 'Susulan UAS');
        break;
      case 'RESET':
        resetChatToInit();
        break;
      default:
        break;
    }
  };

  const startFlow = (type: 'daily' | 'quiz' | 'notebook' | 'susulan', label: string) => {
    setFlowType(type);
    chatStateRef.current.flowType = type;
    setMessages(prev => [
      ...prev,
      { role: 'user', content: label },
      {
        role: 'assistant',
        content: type === 'susulan' 
          ? "Baik, silakan tentukan tingkatan kelas untuk Ujian Susulan ini:" 
          : type === 'notebook'
          ? "Baik, silakan tentukan tingkatan kelas materi dokumen:"
          : type === 'quiz'
          ? "Baik, silakan tentukan tingkatan kelas kuis:"
          : "Bagus! Silakan pilih tingkatan kelas pelajaran ini:",
        options: schoolLevel === 'SMA' ? [
          { label: "Kelas 10", actionType: 'SELECT_CLASS', payload: 'Kelas 10' },
          { label: "Kelas 11", actionType: 'SELECT_CLASS', payload: 'Kelas 11' },
          { label: "Kelas 12", actionType: 'SELECT_CLASS', payload: 'Kelas 12' }
        ] : [
          { label: "Kelas 7", actionType: 'SELECT_CLASS', payload: 'Kelas 7' },
          { label: "Kelas 8", actionType: 'SELECT_CLASS', payload: 'Kelas 8' },
          { label: "Kelas 9", actionType: 'SELECT_CLASS', payload: 'Kelas 9' }
        ]
      }
    ]);
  };

  const selectClass = (cls: string) => {
    setSelectedClass(cls);
    chatStateRef.current.selectedClass = cls;
    setMessages(prev => [
      ...prev,
      { role: 'user', content: cls },
      {
        role: 'assistant',
        content: `Materi berlaku untuk semua section di **${cls}**. Sekarang, pilih mata pelajaran:`,
        options: subjects.map(sub => ({
          label: sub,
          actionType: 'SELECT_SUBJECT',
          payload: sub
        }))
      }
    ]);
  };

  const selectYear = (year: string) => {
    setSelectedYear(year);
    chatStateRef.current.selectedYear = year;
    setMessages(prev => [
      ...prev,
      { role: 'user', content: `Tahun Ajaran: ${year}` },
      {
        role: 'assistant',
        content: "Silakan pilih jenis Ujian Susulan yang ingin dibuat:",
        options: [
          { label: "Susulan UTS (Tengah Semester)", actionType: 'SELECT_SUSULAN_TYPE', payload: 'Susulan UTS' },
          { label: "Susulan UAS (Akhir Semester)", actionType: 'SELECT_SUSULAN_TYPE', payload: 'Susulan UAS' }
        ]
      }
    ]);
  };

  const startCustomYearInput = () => {
    setAwaitingCustomYear(true);
    setMessages(prev => [
      ...prev,
      { role: 'user', content: "Ketik Tahun Ajaran Lain" },
      {
        role: 'assistant',
        content: "Silakan ketik tahun ajaran baru di kolom chat di bawah ini (contoh: 2026/2027 atau 2027/2028):"
      }
    ]);
  };

  const selectSusulanType = (type: 'Susulan UTS' | 'Susulan UAS') => {
    setSusulanType(type);
    chatStateRef.current.susulanType = type;
    
    const activeSubject = chatStateRef.current.selectedSubject;
    const activeClass = chatStateRef.current.selectedClass;
    const activeYear = chatStateRef.current.selectedYear;
    const example = getSubjectExample(activeSubject);

    setMessages(prev => [
      ...prev,
      { role: 'user', content: type },
      {
        role: 'assistant',
        content: `Mata Pelajaran: ${activeSubject} • Kelas: ${activeClass} • Tahun Ajaran: ${activeYear} • Jenis Ujian: ${type}\n\nSilakan tuliskan topik, deskripsi kisi-kisi atau upload naskah dokumen soal untuk Ujian Susulan ini (contoh: ${example.quiz}):`
      }
    ]);
  };

  const selectSubject = (sub: string) => {
    setSelectedSubject(sub);
    chatStateRef.current.selectedSubject = sub;
    
    const activeFlow = chatStateRef.current.flowType;
    const activeClass = chatStateRef.current.selectedClass;
    const example = getSubjectExample(sub);

    if (activeFlow === 'susulan') {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: sub },
        {
          role: 'assistant',
          content: `Baik, Anda memilih ${sub} untuk ${activeClass}.\n\nTahun ajaran aktif saat ini adalah **${academicYear}**. Apakah Anda ingin menggunakan tahun ajaran ini atau mengubahnya?`,
          options: [
            { label: `Gunakan ${academicYear}`, actionType: 'SELECT_YEAR', payload: academicYear },
            { label: "Ketik Tahun Ajaran Lain", actionType: 'CUSTOM_YEAR' }
          ]
        }
      ]);
      return;
    }
 
    let nextContent = '';
    let fileUploadRequired = false;
 
    if (activeFlow === 'daily') {
      nextContent = `Baik, Anda memilih ${sub} untuk ${activeClass}.\n\nSilakan tuliskan topik atau deskripsi singkat materi yang ingin dibuat (contoh: ${example.daily}).`;
    } else if (activeFlow === 'quiz') {
      nextContent = `Baik, Anda memilih ${sub} untuk ${activeClass}.\n\nSilakan tuliskan cakupan topik ujian atau kisi-kisi soal yang Anda inginkan (contoh: ${example.quiz}).`;
    } else if (activeFlow === 'notebook') {
      nextContent = `Baik, Anda memilih ${sub} untuk ${activeClass}.\n\nSilakan unggah dokumen materi Anda (.pdf, .docx, atau .txt) untuk diolah AI:`;
      fileUploadRequired = true;
    }

    setMessages(prev => [
      ...prev,
      { role: 'user', content: sub },
      {
        role: 'assistant',
        content: nextContent,
        fileUpload: fileUploadRequired
      }
    ]);
  };

  // Handle standard user text submit (during prompt input)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isAiResponding) return;

    const userText = inputValue.trim();
    setInputValue('');

    if (awaitingCustomYear) {
      setAwaitingCustomYear(false);
      selectYear(userText);
      return;
    }

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userText }
    ]);

    setIsAiResponding(true);

    const activeFlow = chatStateRef.current.flowType;
    const activeSubject = chatStateRef.current.selectedSubject;

    try {
      if (activeFlow === 'daily' || activeFlow === 'quiz' || activeFlow === 'susulan') {
        const result = await generateAILessonContent(userText, activeSubject, activeFlow === 'susulan' ? 'quiz' : activeFlow);
        setAiResult(result);
        chatStateRef.current.aiResult = result;

        let successContent = '';
        if (activeFlow === 'daily') {
          successContent = `✨ **Groq AI berhasil merumuskan materi pelajaran!**\n\nSilakan tinjau draf materi di bawah ini sebelum mempublikasikannya ke siswa.`;
        } else if (activeFlow === 'quiz') {
          successContent = `✨ **Groq AI berhasil merumuskan kuis / soal evaluasi!**\n\nSilakan tinjau draf kuis di bawah ini sebelum mempublikasikannya ke siswa.`;
        } else {
          successContent = `✨ **Groq AI berhasil merumuskan materi ujian susulan!**\n\nSilakan tinjau draf kuis di bawah ini sebelum mempublikasikannya ke siswa.`;
        }

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: successContent
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Gagal memproses AI: ${errMsg}` }
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Handle Notebook File Upload & Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessages(prev => [
      ...prev,
      { role: 'user', content: `Mengunggah berkas: ${file.name}` }
    ]);

    const activeSubject = chatStateRef.current.selectedSubject;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/grademaster/lessons/parse-content', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membaca isi dokumen.');

      setExtractedText(data.text);
      chatStateRef.current.extractedText = data.text;
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: `📄 **File berhasil dibaca!**\nEkstraksi: ${data.charCount} karakter dari file *${file.name}*.\n\nSedang merangkum dan membuat kuis dengan Groq Llama AI...` 
        }
      ]);

      setIsAiResponding(true);
      const result = await generateAILessonContent(data.text.substring(0, 15000), activeSubject, 'notebook'); // Safety slice text length
      setAiResult(result);
      chatStateRef.current.aiResult = result;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `✨ **Materi berbasis dokumen berhasil disusun oleh Groq AI!**\nSilakan cek rangkuman dan kuis di bawah ini.`
        }
      ]);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Gagal mengekstrak berkas: ${errMsg}` }
      ]);
    } finally {
      setIsUploading(false);
      setIsAiResponding(false);
      // Reset file input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Publish or Save Draft Action
  const handleSaveAction = async (publish: boolean) => {
    const activeAiResult = chatStateRef.current.aiResult;
    const activeClass = chatStateRef.current.selectedClass;
    const activeSubject = chatStateRef.current.selectedSubject;
    const activeText = chatStateRef.current.extractedText;

    if (!activeAiResult || !activeClass || !activeSubject) return;

    setIsAiResponding(true);
    try {
      // 1. Create Daily Lesson Row
      const newLesson = await createLesson({
        class_name: activeClass,
        subject: activeSubject,
        date: new Date().toISOString().split('T')[0],
        content: activeText || `Pembahasan materi mata pelajaran ${activeSubject} kelas ${activeClass}`,
        ai_reading_preview: activeAiResult.preview,
        ai_chat_prompt: activeAiResult.chatPrompt,
        is_published: publish,
        academic_year: chatStateRef.current.selectedYear,
        semester: semester
      });

      // 2. Create Quizzes Row if AI returned questions
      if (newLesson && activeAiResult.questions && activeAiResult.questions.length > 0) {
        const formattedQuestions = activeAiResult.questions.map((q) => ({
          question: q.text || q.question || "",
          text: q.text || q.question || "",
          options: q.options || [],
          correctAnswer: q.answer || q.correctAnswer || "",
          answer: q.answer || q.correctAnswer || "",
          type: q.type || 'mcq'
        }));

        const isSusulan = chatStateRef.current.flowType === 'susulan';
        const targetTitle = isSusulan && chatStateRef.current.susulanType
          ? `Ujian ${chatStateRef.current.susulanType} - ${activeSubject}`
          : `Kuis Evaluasi - ${activeSubject}`;
        const targetQuizType = isSusulan && chatStateRef.current.susulanType
          ? (chatStateRef.current.susulanType === 'Susulan UTS' ? 'ASTS' : 'ASAJ')
          : 'DAILY';

        const { error: quizError } = await supabase
          .from('quizzes')
          .insert({
            lesson_id: newLesson.id,
            title: targetTitle,
            quiz_type: targetQuizType,
            duration_minutes: 15,
            questions: formattedQuestions
          });

        if (quizError) {
          throw new Error("Gagal mengaitkan Kuis AI: " + quizError.message);
        }
      }

      setToast({
        message: publish 
          ? "Pelajaran & Kuis berhasil dipublikasikan ke semua section siswa!" 
          : "Draf pelajaran berhasil disimpan!",
        type: 'success'
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ **Pelajaran berhasil ${publish ? 'diterbitkan secara live!' : 'disimpan sebagai draft.'}**\n\nRiwayat pelajaran Anda telah diperbarui. Apakah ada hal lain yang ingin Anda kerjakan?`,
          options: [
            { label: "Mulai Percakapan Baru", action: () => resetChatToInit() }
          ]
        }
      ]);

      setAiResult(null);
      chatStateRef.current.aiResult = null;
      loadHistory();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setToast({ message: "Gagal menyimpan: " + errMsg, type: 'error' });
    } finally {
      setIsAiResponding(false);
    }
  };

  // Open Preview Modal of old lesson
  const handleOpenPreview = async (lesson: DailyLesson) => {
    setPreviewingLesson(lesson);
    setIsLoadingPreviewQuizzes(true);
    setPreviewingQuizzes([]);

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lesson.id);

      if (error) throw error;
      setPreviewingQuizzes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPreviewQuizzes(false);
    }
  };

  // Delete lesson from history
  const handleDeleteLesson = async (lessonId: string, subjectName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus materi "${subjectName}" beserta kuisnya? Tindakan ini permanen.`)) return;

    try {
      await deleteLesson(lessonId);
      setToast({ message: "Materi berhasil dihapus dari sistem", type: 'success' });
      setPreviewingLesson(null);
      loadHistory();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setToast({ message: "Gagal menghapus: " + errMsg, type: 'error' });
    }
  };

  // Filter History Lessons
  const filteredHistory = historyLessons.filter(lesson => 
    lesson.subject.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
    lesson.class_name.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  return (
    <div 
      className="h-full w-full bg-[#000000] text-white flex flex-col font-sans relative overflow-hidden"
      style={{ 
        fontFamily: '-apple-system-body, ui-sans-serif, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '20px',
        fontWeight: 400
      }}
    >
      
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#d25e28]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-[#000000]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={onBack}
            className="p-2 bg-white/5 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#d25e28] text-[#afafaf] hover:text-white rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center outline-none"
            title="Kembali"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white truncate max-w-[110px] xs:max-w-none">Manajemen Pelajaran</h1>
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-[#d25e28]/10 border border-[#d25e28]/20 text-[#d25e28] px-1.5 sm:px-2 py-0.5 rounded-md shrink-0">AI Agent</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden xs:inline text-[10px] sm:text-xs font-bold text-[#afafaf] bg-white/5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/10 uppercase tracking-wider font-mono">
            {academicYear}
          </span>
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-9 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-150 active:scale-95 shadow-md shadow-rose-500/5 group focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
            title="Keluar ke Beranda"
          >
            <X size={14} className="group-hover:rotate-90 transition-transform duration-150" />
            <span className="hidden sm:inline">Keluar ke Beranda</span>
            <span className="sm:hidden">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Workspace split */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        
        {/* LEFT COLUMN: HISTORY SIDEBAR */}
        <section className="w-80 border-r border-white/10 bg-[#171717] shrink-0 hidden md:flex flex-col">
          <div className="p-4 border-b border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-[#afafaf] uppercase tracking-widest pl-1">Riwayat Pelajaran</h3>
              <button 
                onClick={resetChatToInit}
                className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white rounded-md border border-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-[#d25e28] outline-none"
                title="Mulai Percakapan Baru"
              >
                Percakapan Baru
              </button>
            </div>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#afafaf] group-focus-within:text-[#d25e28] transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Cari materi / kelas..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full h-9 bg-[#212121] border border-white/10 rounded-xl pl-9 pr-4 text-xs font-medium text-white placeholder:text-[#afafaf] focus:border-[#d25e28]/50 focus-visible:ring-2 focus-visible:ring-[#d25e28] outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-[#afafaf] text-xs font-bold">
                Tidak ada materi terbit.
              </div>
            ) : (
              filteredHistory.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => handleOpenPreview(lesson)}
                  className="w-full p-3 rounded-xl bg-transparent hover:bg-white/5 text-left transition-all duration-150 flex items-center gap-3.5 group hover:scale-[1.01] active:scale-[0.99] relative focus:outline-none focus:ring-2 focus:ring-[#d25e28]"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 text-[#afafaf] flex items-center justify-center shrink-0 group-hover:bg-[#d25e28]/10 group-hover:text-[#d25e28] transition-colors">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-[#d25e28] transition-colors truncate uppercase tracking-wide leading-normal">
                      {lesson.subject}
                    </h4>
                    <p className="text-[8px] font-bold text-[#afafaf] uppercase tracking-widest mt-1 leading-normal">
                      {lesson.class_name} • {lesson.date}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: AI CONVERSATION */}
        <section className="flex-1 flex flex-col bg-[#000000]">
          
          {/* Chat Window Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 no-scrollbar max-w-3xl mx-auto w-full flex flex-col">
            {messages.map((msg, idx) => {
              const isAI = msg.role === 'assistant';
              return (
                <div 
                  key={idx} 
                  className={`flex gap-3 sm:gap-4 max-w-[90%] sm:max-w-[85%] ${isAI ? 'self-start w-full' : 'self-end ml-auto flex-row-reverse'}`}
                >
                  {isAI ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#d25e28]/10 border border-[#d25e28]/20 text-[#d25e28] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(210,94,40,0.1)] mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#2f2f2f] border border-white/10 text-[#afafaf] flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black">
                      ME
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5 flex-1">
                    {/* Speech Bubble */}
                    <div className={`text-sm leading-relaxed whitespace-pre-line text-left transition-all ${
                      isAI 
                        ? 'text-[#ececf1] font-normal px-1'
                        : 'bg-[#212121] text-white border border-white/5 rounded-2xl rounded-tr-none font-normal px-4 py-3 shadow-md'
                    }`}>
                      {msg.content}
                    </div>

                    {/* Quick options/reply chips */}
                    {isAI && msg.options && msg.options.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {msg.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => {
                              if (opt.action) {
                                opt.action();
                              } else if (opt.actionType) {
                                handleOptionClick(opt.actionType, opt.payload, opt.label);
                              }
                            }}
                            disabled={isAiResponding}
                            className="px-3.5 py-2 bg-[#171717] hover:bg-[#d25e28]/10 hover:text-[#d25e28] border border-white/10 hover:border-[#d25e28]/30 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 disabled:opacity-40 min-h-[40px] flex items-center justify-center text-center focus-visible:ring-2 focus-visible:ring-[#d25e28] outline-none"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Document Upload Input */}
                    {isAI && msg.fileUpload && (
                      <div className="p-6 border border-dashed border-white/15 rounded-2xl bg-[#171717]/50 flex flex-col items-center justify-center text-center gap-3 hover:bg-[#171717] hover:border-[#d25e28]/50 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#d25e28] outline-none"
                           onClick={() => fileInputRef.current?.click()}>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileUpload} 
                          accept=".pdf,.docx,.txt" 
                          className="hidden" 
                        />
                        {isUploading ? (
                          <>
                            <Loader2 className="animate-spin text-[#d25e28]" size={28} />
                            <span className="text-xs font-bold text-[#afafaf]">Mengekstraksi konten file...</span>
                          </>
                        ) : (
                          <>
                            <CloudUpload className="text-[#d25e28]" size={32} />
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-white">Unggah Berkas</span>
                              <p className="text-[10px] text-[#afafaf] mt-1">Mendukung PDF, DOCX, dan TXT (Maks. 10MB)</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* AI Response Loader */}
            {isAiResponding && !isUploading && (
              <div className="flex gap-4 max-w-[80%] self-start animate-pulse w-full">
                <div className="w-8 h-8 rounded-full bg-[#d25e28]/10 border border-[#d25e28]/20 text-[#d25e28] flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="p-1 text-[#afafaf] flex items-center gap-2">
                  <Loader2 className="animate-spin text-[#d25e28]" size={14} />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#afafaf]">AI sedang memproses...</span>
                </div>
              </div>
            )}

            {/* AI Result Review Panel inside Chat */}
            {aiResult && (
              <div className="border border-white/10 bg-[#171717] rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 mt-4 relative overflow-hidden text-left">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h3 className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#d25e28]">
                    <Sparkles size={16} /> Hasil Formulasi Groq AI
                  </h3>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-[#d25e28]/15 text-[#d25e28] border border-[#d25e28]/35 rounded-md">
                    Llama 70B
                  </span>
                </div>

                <div className="space-y-5">
                  {/* Material summary preview */}
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#afafaf] mb-2">1. Preview Ringkasan</h4>
                    <p className="text-white text-xs leading-relaxed font-normal bg-[#212121] p-4 rounded-xl border border-white/5">
                      {aiResult.preview}
                    </p>
                  </div>

                  {/* MCQ & Essay Questions preview */}
                  {aiResult.questions && aiResult.questions.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#afafaf] mb-2">2. Butir Soal Kuis AI ({aiResult.questions.length})</h4>
                      <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar pr-1">
                        {aiResult.questions.map((q, qIdx) => (
                          <div key={qIdx} className="bg-[#212121] border border-white/5 p-3 rounded-xl space-y-2 text-xs">
                            <p className="font-bold text-white">{qIdx+1}. {q.text || q.question}</p>
                            {q.type === 'mcq' && q.options && (
                              <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5 pl-2 sm:pl-4">
                                {q.options.map((opt: string) => (
                                  <span key={opt} className={`text-[10px] p-2 rounded-lg border ${
                                    opt === q.answer ? 'bg-[#d25e28]/10 border-[#d25e28]/30 text-[#d25e28] font-bold' : 'bg-white/5 border-transparent text-[#afafaf]'
                                  }`}>
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Final actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleSaveAction(true)}
                    disabled={isAiResponding}
                    className="w-full sm:flex-1 h-11 bg-[#d25e28] hover:bg-[#c15321] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#d25e28]/20 flex items-center justify-center gap-2 order-1 sm:order-2 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#d25e28] outline-none"
                  >
                    <CheckCircle2 size={14} /> Terbitkan (Publish)
                  </button>
                  <button
                    onClick={() => handleSaveAction(false)}
                    disabled={isAiResponding}
                    className="w-full sm:flex-1 h-11 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border border-white/10 order-2 sm:order-1 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white outline-none"
                  >
                    Simpan Draft
                  </button>
                  <button
                    onClick={() => {
                      setAiResult(null);
                      resetChatToInit();
                    }}
                    disabled={isAiResponding}
                    className="w-full sm:w-auto sm:px-6 h-11 bg-transparent hover:bg-white/5 text-[#afafaf] hover:text-white border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors order-3 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white outline-none"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Input Bar (ChatGPT Style Capsule) */}
          <div className="p-4 bg-[#000000] border-t border-white/10 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6">
            <form onSubmit={handleFormSubmit} className="flex gap-2 max-w-3xl mx-auto w-full relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  !flowType 
                    ? "Pilih opsi di atas untuk memulai..." 
                    : isAiResponding 
                    ? "Asisten sedang memproses..." 
                    : "Ketik pesan untuk asisten kurikulum..."
                }
                disabled={!flowType || isAiResponding || !!aiResult}
                className="w-full h-12 bg-[#212121] border border-white/10 rounded-2xl pl-4 pr-14 text-sm font-medium text-white placeholder:text-[#afafaf] focus:border-[#d25e28]/50 focus-visible:ring-2 focus-visible:ring-[#d25e28] outline-none transition-all disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isAiResponding || !flowType || !!aiResult}
                className="absolute right-1.5 top-1.5 w-9 h-9 bg-[#d25e28] hover:bg-[#c15321] text-white rounded-xl flex items-center justify-center shadow-md transition-all disabled:opacity-20 disabled:bg-[#2f2f2f] focus-visible:ring-2 focus-visible:ring-[#d25e28] outline-none"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* DETAILED LESSON PREVIEW MODAL */}
      {previewingLesson && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150" onClick={() => setPreviewingLesson(null)}>
          <div 
            className="w-full max-w-2xl bg-[#171717] border border-white/10 rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto flex flex-col gap-4 sm:gap-6 custom-scrollbar relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#d25e28]">
                  {previewingLesson.class_name} • {previewingLesson.date}
                </span>
                <h3 className="font-sans font-bold text-lg sm:text-xl text-white uppercase tracking-tight mt-1">
                  {previewingLesson.subject}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewingLesson(null)} 
                className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 sm:space-y-6">
              {/* Summary */}
              {previewingLesson.ai_reading_preview && (
                <div className="bg-[#d25e28]/5 rounded-2xl p-4 sm:p-5 border border-[#d25e28]/15">
                  <h4 className="text-[#d25e28] text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={14} /> Ringkasan Materi AI
                  </h4>
                  <p className="text-white text-xs font-normal leading-relaxed">
                    {previewingLesson.ai_reading_preview}
                  </p>
                </div>
              )}

              {/* Full Content */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#afafaf]">Cakupan Isi Materi</h4>
                <div className="bg-[#212121] border border-white/5 p-4 sm:p-5 rounded-2xl text-xs leading-relaxed text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar font-medium">
                  {previewingLesson.content}
                </div>
              </div>

              {/* Quizzes list inside modal */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#afafaf]">Kuis Evaluasi AI</h4>
                
                {isLoadingPreviewQuizzes ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <Loader2 size={16} className="animate-spin text-[#d25e28]" />
                    <span className="text-[10px] font-bold text-[#afafaf] uppercase tracking-wider">Memuat kuis...</span>
                  </div>
                ) : previewingQuizzes.length === 0 ? (
                  <p className="text-[#afafaf] text-xs font-bold italic">Kuis evaluasi tidak dilampirkan pada materi ini.</p>
                ) : (
                  <div className="space-y-3">
                    {previewingQuizzes.map((quiz) => (
                      <div key={quiz.id} className="bg-[#212121] border border-white/5 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-[#afafaf] uppercase tracking-wider">
                          <span>{quiz.title}</span>
                          <span>Durasi: {quiz.duration_minutes} Menit</span>
                        </div>
                        <div className="space-y-2.5">
                          {(quiz.questions as unknown as QuizQuestion[] || []).map((q, qIdx: number) => (
                            <div key={qIdx} className="bg-white/5 p-3 rounded-lg text-xs space-y-1">
                              <p className="font-bold text-white">{qIdx+1}. {q.text || q.question}</p>
                              {q.type === 'mcq' && q.options && (
                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5 pl-2 sm:pl-4 pt-1">
                                  {q.options.map((opt: string) => (
                                    <span key={opt} className={`text-[10px] px-2 py-1 rounded border ${
                                      opt === q.answer ? 'bg-[#d25e28]/10 border-[#d25e28]/20 text-[#d25e28] font-bold' : 'bg-transparent border-transparent text-[#afafaf]'
                                    }`}>
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10 justify-between">
              <button
                onClick={() => handleDeleteLesson(previewingLesson.id, previewingLesson.subject)}
                className="px-3 sm:px-4 h-11 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-colors flex items-center gap-2 active:scale-95 duration-150 focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
              >
                <Trash2 size={14} /> Hapus Materi
              </button>
              <button
                onClick={() => setPreviewingLesson(null)}
                className="px-5 sm:px-6 h-11 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-colors border border-white/10 active:scale-95 duration-150 focus-visible:ring-2 focus-visible:ring-white outline-none"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled scrollbar classes */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
