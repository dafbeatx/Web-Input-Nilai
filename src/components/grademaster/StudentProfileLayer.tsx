"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, PlusCircle, MinusCircle, Loader2, FileText, 
  Trash2, Pencil, ShieldCheck, ThumbsUp, X, Calendar, 
  Activity, History, DownloadCloud, Check, User,
  Settings, AlertCircle, LogOut
} from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';
import { 
  addBehaviorAction, 
  updateBehaviorAction, 
  deleteBehaviorAction, 
  getBehaviorLogsAction 
} from '@/lib/actions/behavior';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

interface BehaviorLog {
  id: string;
  student_id: string;
  points_delta: number;
  reason: string;
  violation_date: string;
  created_at: string;
}

interface StudentProfileLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  isAdmin?: boolean;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  initialPoints?: number;
  avatarUrl?: string | null;
  canEditPhoto?: boolean;
  onAvatarUpdate?: (newUrl: string) => void;
  onPointsUpdate?: (newPoints: number) => void;
  onLogout?: () => void;
}

export default function StudentProfileLayer({ 
  onBack, 
  setToast, 
  isAdmin = false, 
  studentId,
  studentName,
  className,
  academicYear,
  initialPoints = 0,
  avatarUrl = null,
  canEditPhoto = false,
  onAvatarUpdate,
  onPointsUpdate,
  onLogout
}: StudentProfileLayerProps) {
  const [totalPoints, setTotalPoints] = useState(initialPoints);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'ACADEMIC' | 'DOCUMENTS' | 'MANAGE'>('SUMMARY');
  const [studentLogs, setStudentLogs] = useState<BehaviorLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [studentSummary, setStudentSummary] = useState<{ attendance: any, academicHistory: any[], documents: any[] } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  
  // Management States
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ reason: '', points: 0, date: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Behavior Reasons (Matches BehaviorLayer defaults)
  const behaviorReasons = [
    { text: "Bolos PBM", weight: 20 },
    { text: "Berbicara Kasar", weight: 15 },
    { text: "Merokok/Vaping", weight: 50 },
    { text: "Membantah Guru", weight: 25 },
    { text: "Terlambat Parah", weight: 10 }
  ];

  useEffect(() => {
    fetchStudentLogs();
    fetchStudentSummary();
    setTotalPoints(initialPoints);
    setCurrentAvatarUrl(avatarUrl);
  }, [studentId, initialPoints, avatarUrl]);

  // Sync avatar url prop changes (e.g. from studentData shift)
  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  const fetchStudentSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`/api/grademaster/students/summary?name=${encodeURIComponent(studentName)}&year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (res.ok) setStudentSummary(data);
    } catch (err) {
      console.error("Failed to fetch student summary", err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const fetchStudentLogs = async () => {
    setIsLoadingLogs(true);
    const result = await getBehaviorLogsAction(studentId);
    if (result.success) setStudentLogs(result.logs || []);
    setIsLoadingLogs(false);
  };

  const handleAddBehavior = async (pointsDelta: number, reason: string) => {
    if (isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    
    const result = await addBehaviorAction({
      studentId,
      pointsDelta: Math.abs(pointsDelta),
      reason,
      violationDate: selectedDate
    });

    if (result.success) {
      setToast({ message: `Catatan "${reason}" ditambahkan`, type: "success" });
      const newPts = result.data?.new_total ?? totalPoints;
      setTotalPoints(newPts);
      onPointsUpdate?.(newPts);
      fetchStudentLogs();
      setActiveTab('SUMMARY');
    } else {
      setToast({ message: result.error || "Gagal menambah catatan", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const handleUpdateLog = async (logId: string) => {
    if (isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    const result = await updateBehaviorAction(logId, {
      pointsDelta: editForm.points,
      reason: editForm.reason,
      studentId,
      violationDate: editForm.date
    });

    if (result.success) {
      setToast({ message: "Catatan berhasil diperbarui", type: "success" });
      setTotalPoints(result.newTotal ?? totalPoints);
      onPointsUpdate?.(result.newTotal ?? totalPoints);
      setEditingLogId(null);
      fetchStudentLogs();
    } else {
      setToast({ message: result.error || "Gagal memperbarui", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const handleDeleteLog = async (logId: string) => {
    if (isUpdatingPoints) return;
    if (!confirm("Hapus catatan ini? Poin akan otomatis dikembalikan.")) return;
    setIsUpdatingPoints(true);
    const result = await deleteBehaviorAction(logId, studentId);
    if (result.success) {
      setToast({ message: "Catatan dihapus", type: "success" });
      setTotalPoints(result.newTotal ?? totalPoints);
      onPointsUpdate?.(result.newTotal ?? totalPoints);
      fetchStudentLogs();
    } else {
      setToast({ message: result.error || "Gagal menghapus", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setToast({ message: "Ukuran foto terlalu besar (Maksimal 20MB)", type: "error" });
      return;
    }

    setIsUploadingAvatar(true);
    setToast({ message: "Sedang memproses foto...", type: "success" });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('studentId', studentId);

      const res = await fetch('/api/grademaster/behaviors/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto");

      setToast({ message: "Foto profil berhasil diperbarui!", type: "success" });
      setCurrentAvatarUrl(data.avatar_url);
      onAvatarUpdate?.(data.avatar_url);
    } catch (err: any) {
      setToast({ message: err.message || "Gagal mengunggah", type: "error" });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-surface/95 backdrop-blur-2xl z-[1000] flex flex-col animate-in fade-in duration-300 overflow-y-auto no-scrollbar bg-surface-container-lowest text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg flex items-center justify-between px-6 h-16 max-w-md mx-auto left-1/2 -translate-x-1/2 border-b border-surface-container shadow-[0_10px_40px_rgba(15,23,42,0.04)]">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container transition-all text-on-surface active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-headline font-bold text-lg tracking-tight">Student Profile</h1>
        {onLogout ? (
          <button 
            onClick={onLogout}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-error/10 text-error transition-all active:scale-95"
            title="Keluar"
          >
            <LogOut size={18} />
          </button>
        ) : (
          <div className="w-10"></div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-24 px-6 pb-32 max-w-md mx-auto space-y-12 w-full">
        {/* Profile Header */}
        <section className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-primary-container text-white flex items-center justify-center text-3xl font-bold tracking-tight shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border-4 border-white">
              {currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt={studentName} className="w-full h-full object-cover" />
              ) : (
                studentName.slice(0, 2).toUpperCase()
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 size={16} className="animate-spin text-white" />
                </div>
              )}
            </div>
            
            {canEditPhoto && !isUploadingAvatar && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-on-primary-fixed text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all border-2 border-white"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
          
          <div>
            <h2 className="text-on-primary-fixed font-bold text-2xl tracking-tight leading-tight uppercase">{studentName}</h2>
            <p className="text-on-surface-variant text-sm mt-1 uppercase font-medium">Kelas {className} • {academicYear}</p>
          </div>
        </section>

        {/* Metric Cards Bento Layout */}
        <section className="grid grid-cols-1 gap-4">
          {/* Poin Demerit */}
          <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden transition-all duration-300 hover:bg-surface-container border border-surface-container">
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-on-surface-variant uppercase tracking-[0.05em] text-[10px] font-bold mb-1">Poin Demerit</p>
                <p className={`text-4xl font-semibold tracking-tight ${totalPoints > 0 ? 'text-error' : 'text-secondary'}`}>
                  {totalPoints}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
                <AlertCircle className={totalPoints > 0 ? 'text-error' : 'text-secondary'} size={24} />
              </div>
            </div>
          </div>

          {/* Kehadiran */}
          <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden transition-all duration-300 hover:bg-surface-container border border-surface-container">
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-on-surface-variant uppercase tracking-[0.05em] text-[10px] font-bold mb-1">Kehadiran</p>
                <p className="text-4xl font-semibold text-secondary tracking-tight">
                  {isLoadingSummary ? "..." : (studentSummary?.attendance?.percentage ? `${studentSummary.attendance.percentage}%` : "—")}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
                <Activity className="text-secondary" size={24} />
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <nav aria-label="Profile Tabs" className="flex border-b border-surface-container overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('SUMMARY')}
            className={`pb-3 px-4 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'SUMMARY' ? 'text-on-primary-fixed border-b-2 border-on-primary-fixed' : 'text-on-surface-variant hover:text-on-primary-fixed'
            }`}
          >
            Ringkasan
          </button>
          <button 
            onClick={() => setActiveTab('ACADEMIC')}
            className={`pb-3 px-4 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'ACADEMIC' ? 'text-on-primary-fixed border-b-2 border-on-primary-fixed' : 'text-on-surface-variant hover:text-on-primary-fixed'
            }`}
          >
            Akademik
          </button>
          <button 
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`pb-3 px-4 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'DOCUMENTS' ? 'text-on-primary-fixed border-b-2 border-on-primary-fixed' : 'text-on-surface-variant hover:text-on-primary-fixed'
            }`}
          >
            Dokumen
          </button>
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('MANAGE')}
              className={`pb-3 px-4 font-bold text-sm whitespace-nowrap transition-all ${
                activeTab === 'MANAGE' ? 'text-on-primary-fixed border-b-2 border-on-primary-fixed' : 'text-on-surface-variant hover:text-on-primary-fixed'
              }`}
            >
              Manajemen
            </button>
          )}
        </nav>

        {/* Content Section */}
        <div className="min-h-[300px]">
          {activeTab === 'SUMMARY' && (
            <section className="space-y-6 pt-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-on-primary-fixed font-bold text-lg tracking-tight">Riwayat Transparansi</h3>
                <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                  {studentLogs.length} ENTRI TERPANTAU
                </span>
              </div>

              {isLoadingLogs ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
                  <Loader2 size={32} className="animate-spin" />
                  <p className="text-xs font-bold uppercase">Memuat Riwayat...</p>
                </div>
              ) : studentLogs.length === 0 ? (
                <div className="py-20 text-center bg-surface-container-low rounded-3xl border border-dashed border-surface-container flex flex-col items-center justify-center px-6">
                  <History size={40} className="text-on-surface-variant opacity-20 mb-4" />
                  <p className="text-sm font-bold text-on-surface-variant uppercase">Belum Ada Riwayat Perilaku</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-4 group">
                      <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        log.points_delta > 0 ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'
                      }`}>
                        {log.points_delta > 0 ? <MinusCircle size={18} /> : <ThumbsUp size={18} />}
                      </div>
                      <div className="flex-1 pb-4 border-b border-surface-container">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-on-primary-fixed text-sm">{log.reason}</h4>
                          <span className={`font-bold text-sm ${log.points_delta > 0 ? 'text-error' : 'text-secondary'}`}>
                            {log.points_delta > 0 ? '+' : ''}{log.points_delta} Poin
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-on-surface-variant text-[11px] font-medium uppercase">{formatDate(log.violation_date || log.created_at)}</p>
                          {isAdmin && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => {
                                   setEditingLogId(log.id);
                                   setEditForm({ reason: log.reason, points: log.points_delta, date: (log.violation_date || log.created_at).split('T')[0] });
                                 }}
                                 className="p-1 text-on-surface-variant hover:text-on-primary-fixed transition-colors"
                               >
                                 <Pencil size={12} />
                               </button>
                               <button 
                                 onClick={() => handleDeleteLog(log.id)}
                                 className="p-1 text-on-surface-variant hover:text-error transition-colors"
                               >
                                 <Trash2 size={12} />
                               </button>
                            </div>
                          )}
                        </div>

                        {/* Inline Edit UI */}
                        {isAdmin && editingLogId === log.id && (
                          <div className="mt-4 pt-4 border-t border-surface-container space-y-4 animate-in slide-in-from-top-2">
                             <div className="grid grid-cols-1 gap-3">
                                <input 
                                  type="date" 
                                  value={editForm.date} 
                                  onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                  className="w-full bg-white border border-surface-container rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-on-primary-fixed"
                                />
                                <input 
                                  type="text" 
                                  value={editForm.reason} 
                                  onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                                  className="w-full bg-white border border-surface-container rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-on-primary-fixed"
                                />
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleUpdateLog(log.id)} className="flex-1 py-2 bg-on-primary-fixed text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Simpan</button>
                                <button onClick={() => setEditingLogId(null)} className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg text-[10px] font-bold uppercase">Batal</button>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'ACADEMIC' && (
            <section className="space-y-6 pt-4 animate-in fade-in duration-300">
               <h3 className="text-on-primary-fixed font-bold text-lg tracking-tight">Rekam Jejak Akademik</h3>
               {isLoadingSummary ? (
                 <div className="py-12 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
                   <Loader2 size={32} className="animate-spin" />
                   <p className="text-xs font-bold uppercase">Memuat Nilai...</p>
                 </div>
               ) : !studentSummary?.academicHistory?.length ? (
                 <div className="py-20 text-center bg-surface-container-low rounded-3xl border border-dashed border-surface-container flex flex-col items-center justify-center px-6">
                   <Activity size={40} className="text-on-surface-variant opacity-20 mb-4" />
                   <p className="text-sm font-bold text-on-surface-variant uppercase">Belum Ada Riwayat Nilai</p>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {studentSummary.academicHistory.map((grade: any, idx: number) => (
                     <div key={idx} className="bg-white p-4 rounded-xl border border-surface-container flex items-center justify-between shadow-sm">
                       <div className="flex flex-col gap-0.5">
                         <h4 className="text-on-primary-fixed font-bold text-sm uppercase leading-tight">{grade.sessionName}</h4>
                         <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{grade.subject} • {formatDate(grade.date)}</p>
                       </div>
                       <div className="text-right">
                         <p className={`text-xl font-black ${grade.isPassing ? 'text-secondary' : 'text-error'}`}>{grade.score}</p>
                         <p className="text-[8px] font-bold text-on-surface-variant uppercase">KKM: {grade.kkm}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </section>
          )}

          {activeTab === 'DOCUMENTS' && (
            <section className="space-y-6 pt-4 animate-in fade-in duration-300">
              <h3 className="text-on-primary-fixed font-bold text-lg tracking-tight">Dokumen Tersedia</h3>
              {isLoadingSummary ? (
                 <div className="py-12 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
                   <Loader2 size={32} className="animate-spin" />
                   <p className="text-xs font-bold uppercase">Menyiapkan...</p>
                 </div>
              ) : (
                <div className="space-y-3">
                   {studentSummary?.documents?.map((doc: any) => (
                     <div key={doc.id} className={`bg-white p-4 rounded-xl border border-surface-container flex items-center justify-between shadow-sm ${!doc.ready ? 'opacity-40' : ''}`}>
                       <div className="flex items-center gap-3">
                          <FileText className="text-on-surface-variant" size={20} />
                          <div>
                            <h4 className="text-on-primary-fixed font-bold text-sm leading-tight">{doc.name}</h4>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">{doc.size}</p>
                          </div>
                       </div>
                       {doc.ready && (
                         <button className="text-on-primary-fixed transition-colors hover:scale-110">
                           <DownloadCloud size={18} />
                         </button>
                       )}
                     </div>
                   ))}
                </div>
              )}
            </section>
          )}

          {isAdmin && activeTab === 'MANAGE' && (
            <section className="space-y-6 pt-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-white border border-surface-container rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-on-primary-fixed transition-all"
                />
                <div className="grid grid-cols-1 gap-2">
                  {behaviorReasons.map(r => (
                    <button 
                      key={r.text} 
                      disabled={isUpdatingPoints}
                      onClick={() => handleAddBehavior(r.weight, r.text)} 
                      className="p-4 bg-surface-container-low hover:bg-surface-container border border-surface-container rounded-xl text-left transition-all active:scale-95 flex items-center justify-between group"
                    >
                      <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">{r.text}</span>
                      <span className="text-[10px] font-black text-error">+ {r.weight} Pts</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleAvatarUpload} 
      />
    </div>
  );
}
