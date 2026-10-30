"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  Loader2, 
  Search, 
  Trash2, 
  X, 
  Play, 
  Video, 
  VideoOff, 
  ExternalLink, 
  Plus, 
  Calendar, 
  Layers, 
  Check, 
  Eye
} from 'lucide-react';
import { DailyLesson, ToastType } from '@/lib/grademaster/types';
import { supabase } from '@/lib/supabase/client';
import { 
  createLesson, 
  fetchAllLessons, 
  deleteLesson,
  generateAILessonContent
} from '@/lib/grademaster/lessonActions';
import { 
  extractYouTubeId, 
  getYouTubeEmbedUrl, 
  getYouTubeThumbnailUrl, 
  injectYouTubeTag, 
  stripYouTubeTag 
} from '@/lib/grademaster/youtubeHelper';

interface LessonManagementLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  activeClass?: string;
  academicYear?: string;
  schoolLevel?: string;
  semester?: string;
}

const DEFAULT_SUBJECTS = [
  'Matematika', 
  'Bahasa Indonesia', 
  'IPA', 
  'IPS', 
  'Bahasa Inggris', 
  'PAI', 
  'PJOK', 
  'Seni Budaya', 
  'Informatika'
];

export default function LessonManagementLayer({
  onBack,
  setToast,
  academicYear = '2025/2026',
  schoolLevel = 'SMP',
  semester = 'Ganjil'
}: LessonManagementLayerProps) {
  // Lessons data state
  const [lessons, setLessons] = useState<DailyLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [selectedVideoFilter, setSelectedVideoFilter] = useState<'ALL' | 'WITH_VIDEO' | 'NO_VIDEO'>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<DailyLesson | null>(null);
  const [editVideoLesson, setEditVideoLesson] = useState<DailyLesson | null>(null);
  const [editVideoUrlInput, setEditVideoUrlInput] = useState('');
  const [isUpdatingVideo, setIsUpdatingVideo] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Create Form State
  const defaultClasses = schoolLevel === 'SMA' 
    ? ['Kelas 10', 'Kelas 11', 'Kelas 12'] 
    : ['Kelas 7', 'Kelas 8', 'Kelas 9'];

  const [formClass, setFormClass] = useState(defaultClasses[0]);
  const [formSubject, setFormSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [formTopic, setFormTopic] = useState('');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load lessons from DB
  const loadLessons = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllLessons();
      setLessons(data);
    } catch (err) {
      console.error("Gagal memuat modul:", err);
      setToast({ message: "Gagal memuat daftar modul pelajaran", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadLessons();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchSearch = !searchQuery.trim() || 
        lesson.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lesson.content && lesson.content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchClass = selectedClassFilter === 'ALL' || lesson.class_name === selectedClassFilter;
      const matchSubject = selectedSubjectFilter === 'ALL' || lesson.subject === selectedSubjectFilter;

      const hasVideo = Boolean(extractYouTubeId(lesson.video_url || lesson.content));
      const matchVideo = 
        selectedVideoFilter === 'ALL' || 
        (selectedVideoFilter === 'WITH_VIDEO' && hasVideo) || 
        (selectedVideoFilter === 'NO_VIDEO' && !hasVideo);

      return matchSearch && matchClass && matchSubject && matchVideo;
    });
  }, [lessons, searchQuery, selectedClassFilter, selectedSubjectFilter, selectedVideoFilter]);

  // Statistics
  const totalCount = lessons.length;
  const withVideoCount = lessons.filter(l => extractYouTubeId(l.video_url || l.content)).length;
  const publishedCount = lessons.filter(l => l.is_published).length;
  const draftCount = totalCount - publishedCount;

  // Auto-generate lesson content using AI
  const handleGenerateAI = async () => {
    if (!formTopic.trim()) {
      setToast({ message: "Silakan isi topik/materi terlebih dahulu untuk dirangkum AI", type: 'error' });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const prompt = `Topik: ${formTopic.trim()}\nMata Pelajaran: ${formSubject}\nKelas: ${formClass}`;
      const result = await generateAILessonContent(prompt, formSubject, 'daily');
      
      if (result && result.preview) {
        setFormContent(result.preview);
        setToast({ message: "Rangkuman materi berhasil dibuat oleh AI! ✨", type: 'success' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Gagal menyusun materi dengan AI", type: 'error' });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Submit new lesson
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTopic.trim() && !formContent.trim()) {
      setToast({ message: "Harap isi topik atau materi pembelajaran", type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalContent = formContent.trim() || `Pembahasan materi ${formSubject} topik: ${formTopic.trim()}`;
      
      const newLesson = await createLesson({
        class_name: formClass,
        subject: formSubject,
        date: new Date().toISOString().split('T')[0],
        content: finalContent,
        video_url: formYoutubeUrl.trim() || undefined,
        ai_reading_preview: finalContent,
        is_published: formIsPublished,
        academic_year: academicYear,
        semester: semester
      });

      if (newLesson) {
        setToast({ 
          message: formIsPublished 
            ? "Modul berhasil diterbitkan ke tampilan siswa! 🎉" 
            : "Modul berhasil disimpan sebagai draf.", 
          type: 'success' 
        });
        setIsCreateModalOpen(false);
        // Reset form
        setFormTopic('');
        setFormYoutubeUrl('');
        setFormContent('');
        loadLessons();
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Gagal membuat modul pembelajaran", type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save YouTube video link update
  const handleSaveVideoUpdate = async () => {
    if (!editVideoLesson) return;
    setIsUpdatingVideo(true);
    try {
      const cleanUrl = editVideoUrlInput.trim();
      const updatedContent = cleanUrl 
        ? injectYouTubeTag(editVideoLesson.content || '', cleanUrl)
        : stripYouTubeTag(editVideoLesson.content || '');

      const { error } = await supabase
        .from('daily_lessons')
        .update({ content: updatedContent })
        .eq('id', editVideoLesson.id);

      if (error) throw error;

      setToast({ message: "Link video pembelajaran berhasil disimpan!", type: 'success' });
      setEditVideoLesson(null);
      loadLessons();
    } catch (err) {
      console.error(err);
      setToast({ message: "Gagal memperbarui link video", type: 'error' });
    } finally {
      setIsUpdatingVideo(false);
    }
  };

  // Delete lesson
  const handleDelete = async (lesson: DailyLesson) => {
    if (!window.confirm(`Hapus modul "${lesson.subject}" (${lesson.class_name})? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    setIsDeletingId(lesson.id);
    try {
      await deleteLesson(lesson.id);
      setToast({ message: "Modul berhasil dihapus", type: 'success' });
      loadLessons();
    } catch (err) {
      console.error(err);
      setToast({ message: "Gagal menghapus modul", type: 'error' });
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50/70 font-outfit text-slate-900 selection:bg-indigo-500/20">
      
      {/* TOP EDITORIAL NAVBAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 text-xs font-bold"
            title="Kembali ke Menu Utama"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Menu Utama</span>
          </button>
          
          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Nawasena LMS
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">•</span>
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                Pusat Kurikulum & Video Pembelajaran
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-none mt-0.5">
              Manajemen Modul Pembelajaran Guru
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 hidden md:inline">
            T.A. {academicYear} • Semester {semester}
          </span>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Buat Modul Baru</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* KPI METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Modul</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{totalCount}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Modul pembelajaran tersimpan</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Video YouTube</p>
              <h3 className="text-2xl sm:text-3xl font-black text-red-600 mt-0.5">{withVideoCount}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Modul dilengkapi video interaktif</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Video size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modul Terbit</p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">{publishedCount}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Dapat diakses oleh siswa</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Draf</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-700 mt-0.5">{draftCount}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Belum dipublikasikan</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <Layers size={20} />
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan judul, topik, atau mata pelajaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Filter Group */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class filter */}
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Kelas</option>
              {defaultClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Subject filter */}
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Mata Pelajaran</option>
              {DEFAULT_SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Video filter pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setSelectedVideoFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  selectedVideoFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSelectedVideoFilter('WITH_VIDEO')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                  selectedVideoFilter === 'WITH_VIDEO'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Play size={10} className="fill-red-500 text-red-500" /> Ada Video
              </button>
            </div>
          </div>
        </div>

        {/* LESSONS GRID */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
            <p className="text-slate-500 font-bold text-sm">Memuat kurikulum dan video LMS...</p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[320px] space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center">
              <BookOpen size={30} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Belum Ada Modul Pelajaran Ditemukan</h3>
            <p className="text-slate-400 text-xs max-w-sm">
              {searchQuery || selectedClassFilter !== 'ALL' || selectedSubjectFilter !== 'ALL'
                ? "Tidak ada modul yang sesuai dengan kriteria pencarian/filter."
                : "Mulai buat modul pelajaran pertama Anda lengkap dengan video YouTube untuk siswa."}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mt-2"
            >
              <Plus size={15} /> Buat Modul Baru
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredLessons.map((lesson) => {
              const ytId = extractYouTubeId(lesson.video_url || lesson.content);
              const ytThumb = ytId ? getYouTubeThumbnailUrl(ytId) : null;
              const cleanText = stripYouTubeTag(lesson.content || lesson.ai_reading_preview);

              return (
                <div 
                  key={lesson.id}
                  className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-3xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-3.5">
                    {/* Top tags */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2.5 py-0.5 rounded-lg">
                          {lesson.class_name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {lesson.subject}
                        </span>
                      </div>

                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        lesson.is_published 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {lesson.is_published ? 'Terbit' : 'Draf'}
                      </span>
                    </div>

                    {/* YouTube Video Preview / Banner */}
                    {ytId ? (
                      <div 
                        onClick={() => setPreviewLesson(lesson)}
                        className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 cursor-pointer group/thumb"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={ytThumb || ''} 
                          alt="Video Thumbnail" 
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300 opacity-90"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                            <Play size={18} className="fill-white ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 left-2 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/70 text-white backdrop-blur-sm">
                          Video YouTube Aktif
                        </span>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditVideoLesson(lesson);
                          setEditVideoUrlInput('');
                        }}
                        className="py-4 px-3 bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer text-xs font-bold"
                      >
                        <Plus size={14} />
                        <span>Tambahkan Link Video YouTube</span>
                      </div>
                    )}

                    {/* Topic title & description */}
                    <div>
                      <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-1">
                        {lesson.subject}
                      </h3>
                      <p className="text-slate-500 text-xs line-clamp-2 mt-1 leading-relaxed">
                        {cleanText || "Pembahasan materi pelajaran interaktif."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <Calendar size={11} /> {lesson.date}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => setPreviewLesson(lesson)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye size={13} />
                      <span>Pratinjau</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditVideoLesson(lesson);
                        const existingId = extractYouTubeId(lesson.video_url || lesson.content);
                        setEditVideoUrlInput(existingId ? `https://www.youtube.com/watch?v=${existingId}` : '');
                      }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition-all"
                      title="Edit Link Video YouTube"
                    >
                      <Video size={15} />
                    </button>

                    <button
                      onClick={() => handleDelete(lesson)}
                      disabled={isDeletingId === lesson.id}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs transition-all disabled:opacity-50"
                      title="Hapus Modul"
                    >
                      {isDeletingId === lesson.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* MODAL 1: CREATE NEW LESSON MODULE */}
      {isCreateModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Modul Baru
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                  Buat Modul Pelajaran & Video LMS
                </h2>
                <p className="text-xs text-slate-500 font-medium">Lengkapi materi dan sematkan link video YouTube untuk ditampilkan di akun siswa.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Class & Subject dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkatan Kelas</label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {defaultClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {DEFAULT_SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Topic Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Topik / Judul Pembelajaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Persamaan Linear Satu Variabel / Struktur Teks Deskripsi"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* YouTube Link Input with Live Preview */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Play size={14} className="fill-red-600 text-red-600" /> Link Video Pembelajaran (YouTube)
                  </label>
                  {extractYouTubeId(formYoutubeUrl) && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Video Valid
                    </span>
                  )}
                </div>

                <input
                  type="url"
                  placeholder="Tempel link YouTube: https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                  value={formYoutubeUrl}
                  onChange={(e) => setFormYoutubeUrl(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />

                {/* Instant Live Player Preview */}
                {extractYouTubeId(formYoutubeUrl) && (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-300 shadow-md">
                      <iframe
                        src={getYouTubeEmbedUrl(formYoutubeUrl) || ''}
                        title="Live Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium italic">
                      Video ini akan otomatis muncul di bagian pemutar video LMS tampilan siswa.
                    </p>
                  </div>
                )}
              </div>

              {/* Content / Material Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Rangkuman Materi & Catatan Bahan Ajar
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI || !formTopic.trim()}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all"
                  >
                    {isGeneratingAI ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    <span>{isGeneratingAI ? 'Menyusun materi...' : '✨ Buat dengan AI'}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Tuliskan rangkuman materi pembelajaran atau klik 'Buat dengan AI' untuk merangkum secara instan..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed resize-y"
                />
              </div>

              {/* Publish Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formIsPublished}
                  onChange={(e) => setFormIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700">
                  Langsung terbitkan ke portal siswa sekarang
                </span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <span>{formIsPublished ? 'Simpan & Terbitkan' : 'Simpan Draf'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PREVIEW LESSON & VIDEO */}
      {previewLesson && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setPreviewLesson(null)}
        >
          <div 
            className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                    {previewLesson.class_name} • {previewLesson.subject}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {previewLesson.date}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {previewLesson.subject}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewLesson(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Video Player in Preview */}
            {extractYouTubeId(previewLesson.video_url || previewLesson.content) ? (
              <div className="space-y-2">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-lg">
                  <iframe
                    src={getYouTubeEmbedUrl(previewLesson.video_url || previewLesson.content) || ''}
                    title="Video LMS"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Video YouTube Tersemat & Aktif
                  </span>
                  {previewLesson.video_url && (
                    <a 
                      href={previewLesson.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Buka Tautan Asli <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                <VideoOff size={24} className="mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-700">Belum Ada Video Tersemat pada Modul Ini</p>
                <button
                  onClick={() => {
                    setEditVideoLesson(previewLesson);
                    setEditVideoUrlInput('');
                    setPreviewLesson(null);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1"
                >
                  <Plus size={13} /> Tambah Video YouTube
                </button>
              </div>
            )}

            {/* Content Slide Reader */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Isi Materi Digital
              </h4>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-medium">
                {stripYouTubeTag(previewLesson.content || previewLesson.ai_reading_preview)}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setPreviewLesson(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT VIDEO YOUTUBE LINK */}
      {editVideoLesson && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setEditVideoLesson(null)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Ubah Link Video Pembelajaran
                </h3>
                <p className="text-xs text-slate-500">
                  {editVideoLesson.subject} • {editVideoLesson.class_name}
                </p>
              </div>
              <button 
                onClick={() => setEditVideoLesson(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                URL / Link YouTube
              </label>
              <input
                type="url"
                value={editVideoUrlInput}
                onChange={(e) => setEditVideoUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />

              {extractYouTubeId(editVideoUrlInput) && (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-300">
                  <iframe
                    src={getYouTubeEmbedUrl(editVideoUrlInput) || ''}
                    title="Preview"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditVideoLesson(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleSaveVideoUpdate}
                disabled={isUpdatingVideo}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingVideo ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                <span>Simpan Link Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
