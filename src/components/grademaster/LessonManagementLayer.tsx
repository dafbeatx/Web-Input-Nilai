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
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  options?: { label: string; action: () => void }[];
  fileUpload?: boolean;
}

export default function LessonManagementLayer({
  onBack,
  setToast,
  activeClass = '7B',
  academicYear = '2025/2026',
  schoolLevel = 'SMA'
}: LessonManagementLayerProps) {
  // Conversational Flow States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [historyLessons, setHistoryLessons] = useState<DailyLesson[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Selected config during chat
  const [flowType, setFlowType] = useState<'daily' | 'quiz' | 'notebook' | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');

  // AI Generated Results (Pending Publish/Draft)
  const [aiResult, setAiResult] = useState<{
    preview: string;
    chatPrompt: string;
    questions: any[];
  } | null>(null);

  // Ref to store the latest states and avoid stale closures in saved state actions
  const chatStateRef = useRef({
    flowType: null as 'daily' | 'quiz' | 'notebook' | null,
    selectedClass: '',
    selectedSubject: '',
    extractedText: '',
    aiResult: null as any
  });

  // Keep ref in sync with state
  useEffect(() => {
    chatStateRef.current = {
      flowType,
      selectedClass,
      selectedSubject,
      extractedText,
      aiResult
    };
  }, [flowType, selectedClass, selectedSubject, extractedText, aiResult]);

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

  // Load history list on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await fetchAllLessons();
      setHistoryLessons(data);
    } catch (err) {
      console.error("Gagal memuat riwayat pelajaran:", err);
    }
  };

  // Initialize Welcome Message
  useEffect(() => {
    resetChatToInit();
  }, []);

  const resetChatToInit = () => {
    setFlowType(null);
    setSelectedClass('');
    setSelectedSubject('');
    setExtractedText('');
    setAiResult(null);
    chatStateRef.current = {
      flowType: null,
      selectedClass: '',
      selectedSubject: '',
      extractedText: '',
      aiResult: null
    };
    setMessages([
      {
        role: 'assistant',
        content: `Halo Guru/Admin! Saya adalah **Asisten Kurikulum AI GradeMaster**. 🤖🎓\n\nSaya di sini untuk membantu Anda membuat materi pelajaran harian, kuis interaktif, atau merangkum naskah dokumen menggunakan mesin cerdas Groq Llama.\n\nSilakan pilih opsi kerja yang ingin Anda lakukan hari ini:`,
        options: [
          { label: "📘 Buat Pelajaran Harian", action: () => startDailyLessonFlow() },
          { label: "📝 Manajemen Ulangan Harian", action: () => startQuizFlow() },
          { label: "📂 NotebookLM (Upload PDF/DOCX)", action: () => startNotebookFlow() }
        ]
      }
    ]);
  };

  // Option 1: Daily Lesson Flow
  const startDailyLessonFlow = () => {
    setFlowType('daily');
    chatStateRef.current.flowType = 'daily';
    setMessages(prev => [
      ...prev,
      { role: 'user', content: "Saya ingin membuat pelajaran harian." },
      {
        role: 'assistant',
        content: "Bagus! Silakan pilih tingkatan kelas pelajaran ini:",
        options: [
          { label: "Kelas 7", action: () => selectClass('Kelas 7') },
          { label: "Kelas 8", action: () => selectClass('Kelas 8') },
          { label: "Kelas 9", action: () => selectClass('Kelas 9') }
        ]
      }
    ]);
  };

  // Option 2: Quiz Flow
  const startQuizFlow = () => {
    setFlowType('quiz');
    chatStateRef.current.flowType = 'quiz';
    setMessages(prev => [
      ...prev,
      { role: 'user', content: "Saya ingin membuat ulangan/kuis harian." },
      {
        role: 'assistant',
        content: "Baik, silakan tentukan tingkatan kelas kuis:",
        options: [
          { label: "Kelas 7", action: () => selectClass('Kelas 7') },
          { label: "Kelas 8", action: () => selectClass('Kelas 8') },
          { label: "Kelas 9", action: () => selectClass('Kelas 9') }
        ]
      }
    ]);
  };

  // Option 3: NotebookLM Flow
  const startNotebookFlow = () => {
    setFlowType('notebook');
    chatStateRef.current.flowType = 'notebook';
    setMessages(prev => [
      ...prev,
      { role: 'user', content: "Saya ingin memproses dokumen pelajaran." },
      {
        role: 'assistant',
        content: "Baik, silakan tentukan tingkatan kelas materi dokumen:",
        options: [
          { label: "Kelas 7", action: () => selectClass('Kelas 7') },
          { label: "Kelas 8", action: () => selectClass('Kelas 8') },
          { label: "Kelas 9", action: () => selectClass('Kelas 9') }
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
          action: () => selectSubject(sub)
        }))
      }
    ]);
  };

  const selectSubject = (sub: string) => {
    setSelectedSubject(sub);
    chatStateRef.current.selectedSubject = sub;
    
    let nextContent = '';
    let fileUploadRequired = false;

    const activeFlow = chatStateRef.current.flowType;
    const activeClass = chatStateRef.current.selectedClass;
    const example = getSubjectExample(sub);

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

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userText }
    ]);

    setIsAiResponding(true);

    const activeFlow = chatStateRef.current.flowType;
    const activeSubject = chatStateRef.current.selectedSubject;

    try {
      if (activeFlow === 'daily' || activeFlow === 'quiz') {
        const result = await generateAILessonContent(userText, activeSubject, activeFlow);
        setAiResult(result);
        chatStateRef.current.aiResult = result;

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `✨ **Groq AI berhasil merumuskan materi pelajaran!**\n\nSilakan tinjau draf materi di bawah ini sebelum mempublikasikannya ke siswa.`
          }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Gagal memproses AI: ${err.message}` }
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
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Gagal mengekstrak berkas: ${err.message}` }
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
        is_published: publish
      });

      // 2. Create Quizzes Row if AI returned questions
      if (newLesson && activeAiResult.questions && activeAiResult.questions.length > 0) {
        const formattedQuestions = activeAiResult.questions.map((q: any) => ({
          question: q.text || q.question || "",
          text: q.text || q.question || "",
          options: q.options || [],
          correctAnswer: q.answer || q.correctAnswer || "",
          answer: q.answer || q.correctAnswer || "",
          type: q.type || 'mcq'
        }));

        const { error: quizError } = await supabase
          .from('quizzes')
          .insert({
            lesson_id: newLesson.id,
            title: `Kuis Evaluasi - ${activeSubject}`,
            quiz_type: 'DAILY',
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
    } catch (err: any) {
      setToast({ message: "Gagal menyimpan: " + err.message, type: 'error' });
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
    } catch (err: any) {
      setToast({ message: "Gagal menghapus: " + err.message, type: 'error' });
    }
  };

  // Filter History Lessons
  const filteredHistory = historyLessons.filter(lesson => 
    lesson.subject.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
    lesson.class_name.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  return (
    <div className="h-full w-full bg-[#0d0f14] text-slate-100 flex flex-col font-outfit relative overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="h-16 shrink-0 border-b border-white/5 bg-[#12161f]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={onBack}
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Kembali"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 truncate max-w-[110px] xs:max-w-none">Manajemen Pelajaran</h1>
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-violet-500/10 border border-violet-500/20 text-violet-400 px-1.5 sm:px-2 py-0.5 rounded-md shrink-0">AI Agent</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden xs:inline text-[10px] sm:text-xs font-bold text-slate-400 bg-white/5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/[0.03] uppercase tracking-wider font-mono">
            {academicYear}
          </span>
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-lg shadow-rose-500/5 group"
            title="Keluar ke Beranda"
          >
            <X size={14} className="group-hover:rotate-90 transition-transform duration-200" />
            <span className="hidden sm:inline">Keluar ke Beranda</span>
            <span className="sm:hidden">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Workspace split */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        
        {/* LEFT COLUMN: HISTORY SIDEBAR */}
        <section className="w-80 border-r border-white/5 bg-[#0f121a] flex flex-col shrink-0 hidden md:flex">
          <div className="p-4 border-b border-white/5 flex flex-col gap-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Riwayat Pelajaran</h3>
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Cari materi / kelas..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full h-10 bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 text-xs font-bold placeholder:text-slate-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-bold">
                Tidak ada materi terbit.
              </div>
            ) : (
              filteredHistory.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => handleOpenPreview(lesson)}
                  className="w-full p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] hover:border-violet-500/30 text-left transition-all duration-300 flex items-center gap-3.5 group hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_8px_30px_rgba(155,114,203,0.06)] overflow-visible relative focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-violet-500/10 group-hover:text-violet-400 transition-colors">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0 flex-1 overflow-visible">
                    <h4 className="text-xs font-black text-slate-200 group-hover:text-violet-400 transition-colors truncate uppercase tracking-wide leading-normal">
                      {lesson.subject}
                    </h4>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1.5 leading-normal pb-0.5">
                      {lesson.class_name} • {lesson.date}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: AI CONVERSATION */}
        <section className="flex-1 flex flex-col bg-[#0d0f14]/80">
          
          {/* Chat Window Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
            {messages.map((msg, idx) => {
              const isAI = msg.role === 'assistant';
              return (
                <div 
                  key={idx} 
                  className={`flex gap-2.5 sm:gap-4 max-w-[92%] sm:max-w-[85%] ${isAI ? 'self-start' : 'self-end ml-auto flex-row-reverse'}`}
                >
                  {isAI && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(155,114,203,0.15)] mt-1">
                      <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5 sm:gap-3">
                    {/* Speech Bubble */}
                    <div className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      isAI 
                        ? 'bg-[#121620] text-slate-300 border border-white/[0.03] rounded-tl-none font-medium'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none font-bold'
                    }`}>
                      {msg.content}
                    </div>

                    {/* Quick options/reply chips */}
                    {isAI && msg.options && msg.options.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        {msg.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={opt.action}
                            disabled={isAiResponding}
                            className="px-3.5 sm:px-4 py-2 bg-white/5 hover:bg-violet-500/10 hover:text-violet-300 border border-white/5 hover:border-violet-500/30 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-40 min-h-[44px] sm:min-h-0 flex items-center justify-center text-center"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Document Upload Input */}
                    {isAI && msg.fileUpload && (
                      <div className="p-5 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center text-center gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
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
                            <Loader2 className="animate-spin text-violet-400" size={32} />
                            <span className="text-xs font-bold text-slate-400">Mengekstraksi konten file...</span>
                          </>
                        ) : (
                          <>
                            <CloudUpload className="text-violet-400 animate-bounce" size={36} />
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-slate-200">Unggah Berkas</span>
                              <p className="text-[10px] text-slate-500 mt-1">Mendukung PDF, DOCX, dan TXT (Maks. 10MB)</p>
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
              <div className="flex gap-4 max-w-[80%] self-start animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-violet-600/10 text-violet-400 flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="p-4 bg-[#121620] text-slate-400 rounded-3xl rounded-tl-none border border-white/[0.03] flex items-center gap-2">
                  <Loader2 className="animate-spin text-violet-400" size={14} />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Groq AI sedang berpikir...</span>
                </div>
              </div>
            )}

            {/* AI Result Review Panel inside Chat */}
            {aiResult && (
              <div className="border border-violet-500/20 bg-gradient-to-tr from-[#121620] to-[#161a29]/95 rounded-2xl sm:rounded-[32px] p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-2xl animate-in zoom-in-95 duration-500 mt-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-bl-full pointer-events-none" />
                
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/5">
                  <h3 className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-violet-400">
                    <Sparkles size={14} className="sm:w-4 sm:h-4" /> Hasil Formulasi Groq AI
                  </h3>
                  <span className="text-[8px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-md">
                    Llama 70B
                  </span>
                </div>

                <div className="space-y-4 sm:space-y-5">
                  {/* Material summary preview */}
                  <div>
                    <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">1. Preview Ringkasan</h4>
                    <p className="text-slate-300 text-xs leading-relaxed font-medium bg-white/[0.01] p-3 sm:p-4 rounded-xl border border-white/[0.03]">
                      {aiResult.preview}
                    </p>
                  </div>

                  {/* MCQ & Essay Questions preview */}
                  {aiResult.questions && aiResult.questions.length > 0 && (
                    <div>
                      <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">2. Butir Soal Kuis AI ({aiResult.questions.length})</h4>
                      <div className="space-y-2.5 sm:space-y-3 max-h-48 overflow-y-auto no-scrollbar pr-1">
                        {aiResult.questions.map((q, qIdx) => (
                          <div key={qIdx} className="bg-white/[0.02] border border-white/[0.02] p-2.5 sm:p-3 rounded-xl space-y-2 text-xs">
                            <p className="font-bold text-slate-200">{qIdx+1}. {q.text || q.question}</p>
                            {q.type === 'mcq' && q.options && (
                              <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5 pl-2 sm:pl-4">
                                {q.options.map((opt: string) => (
                                  <span key={opt} className={`text-[10px] p-1.5 rounded-lg border ${
                                    opt === q.answer ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-white/5 border-transparent text-slate-400'
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
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleSaveAction(true)}
                    disabled={isAiResponding}
                    className="w-full sm:flex-1 h-11 sm:h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 order-1 sm:order-2 active:scale-[0.98]"
                  >
                    <CheckCircle2 size={14} /> Terbitkan (Publish)
                  </button>
                  <button
                    onClick={() => handleSaveAction(false)}
                    disabled={isAiResponding}
                    className="w-full sm:flex-1 h-11 sm:h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border border-white/5 order-2 sm:order-1 active:scale-[0.98]"
                  >
                    Simpan Draft
                  </button>
                  <button
                    onClick={() => {
                      setAiResult(null);
                      resetChatToInit();
                    }}
                    disabled={isAiResponding}
                    className="w-full sm:w-auto sm:px-6 h-11 sm:h-12 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors order-3 active:scale-[0.98]"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Input Bar (Only enabled when awaiting custom description input) */}
          <div className="p-3 sm:p-4 bg-[#0f121a] border-t border-white/5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
            <form onSubmit={handleFormSubmit} className="flex gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  !flowType 
                    ? "Pilih opsi di atas untuk memulai..." 
                    : isAiResponding 
                    ? "Asisten sedang memproses..." 
                    : "Tuliskan topik, materi..."
                }
                disabled={!flowType || isAiResponding || !!aiResult}
                className="flex-1 h-11 sm:h-12 bg-white/5 border border-white/5 rounded-xl px-3.5 sm:px-4 text-sm sm:text-xs font-bold outline-none focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-500 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isAiResponding || !flowType || !!aiResult}
                className="w-11 h-11 sm:w-12 sm:h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* DETAILED LESSON PREVIEW MODAL */}
      {previewingLesson && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300" onClick={() => setPreviewingLesson(null)}>
          <div 
            className="w-full max-w-2xl bg-[#121620] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto flex flex-col gap-4 sm:gap-6 custom-scrollbar relative"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex justify-between items-start border-b border-white/5 pb-3 sm:pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">
                  {previewingLesson.class_name} • {previewingLesson.date}
                </span>
                <h3 className="font-headline font-black text-lg sm:text-xl text-slate-100 uppercase tracking-tight mt-1">
                  {previewingLesson.subject}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewingLesson(null)} 
                className="w-11 h-11 sm:w-9 sm:h-9 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 sm:space-y-6">
              {/* Summary */}
              {previewingLesson.ai_reading_preview && (
                <div className="bg-violet-500/5 rounded-2xl p-4 sm:p-5 border border-violet-500/10">
                  <h4 className="text-violet-400 text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={14} /> Ringkasan Materi AI
                  </h4>
                  <p className="text-slate-300 text-xs font-medium leading-relaxed">
                    {previewingLesson.ai_reading_preview}
                  </p>
                </div>
              )}

              {/* Full Content */}
              <div className="space-y-2">
                <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">Cakupan Isi Materi</h4>
                <div className="bg-white/[0.01] border border-white/[0.03] p-4 sm:p-5 rounded-2xl text-xs leading-relaxed text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                  {previewingLesson.content}
                </div>
              </div>

              {/* Quizzes list inside modal */}
              <div className="space-y-3">
                <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">Kuis Evaluasi AI</h4>
                
                {isLoadingPreviewQuizzes ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <Loader2 size={16} className="animate-spin text-violet-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Memuat kuis...</span>
                  </div>
                ) : previewingQuizzes.length === 0 ? (
                  <p className="text-slate-500 text-xs font-bold italic">Kuis evaluasi tidak dilampirkan pada materi ini.</p>
                ) : (
                  <div className="space-y-3">
                    {previewingQuizzes.map((quiz) => (
                      <div key={quiz.id} className="bg-white/[0.02] border border-white/[0.03] p-3.5 sm:p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <span>{quiz.title}</span>
                          <span>Durasi: {quiz.duration_minutes} Menit</span>
                        </div>
                        <div className="space-y-2.5">
                          {(quiz.questions || []).map((q: any, qIdx: number) => (
                            <div key={qIdx} className="bg-white/[0.01] p-2.5 rounded-lg text-xs space-y-1">
                              <p className="font-bold text-slate-300">{qIdx+1}. {q.text || q.question}</p>
                              {q.type === 'mcq' && q.options && (
                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5 pl-2 sm:pl-4 pt-1">
                                  {q.options.map((opt: string) => (
                                    <span key={opt} className={`text-[10px] px-2 py-1 rounded border ${
                                      opt === q.answer ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold' : 'bg-transparent border-transparent text-slate-500'
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

            <div className="flex gap-2.5 sm:gap-3 pt-4 border-t border-white/5 justify-between">
              <button
                onClick={() => handleDeleteLesson(previewingLesson.id, previewingLesson.subject)}
                className="px-3 sm:px-4 h-11 sm:h-12 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 sm:gap-2 active:scale-95 duration-200"
              >
                <Trash2 size={14} /> Hapus Materi
              </button>
              <button
                onClick={() => setPreviewingLesson(null)}
                className="px-5 sm:px-6 h-11 sm:h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-colors border border-white/5 active:scale-95 duration-200"
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
