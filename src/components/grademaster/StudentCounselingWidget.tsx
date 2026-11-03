"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  HeartHandshake, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  RefreshCw, 
  Users, 
  Compass, 
  BookOpen, 
  UserCheck, 
  Home, 
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Search,
  Info
} from 'lucide-react';
import type { CounselingRecord } from '@/types/counseling';
import { 
  getStudentCounselingRecords, 
  subscribeToStudentCounseling, 
  calculateCounselingStats,
  getCounselingTypeLabel,
  getCounselingStatusMeta 
} from '@/lib/grademaster/services/counseling.service';

interface StudentCounselingWidgetProps {
  studentId?: string;
  studentName?: string;
  studentNisn?: string | null;
  className?: string;
  isParent?: boolean;
  onBack?: () => void;
}

export default function StudentCounselingWidget({
  studentId,
  studentName,
  studentNisn,
  className,
  isParent = false,
  onBack,
}: StudentCounselingWidgetProps) {
  const [records, setRecords] = useState<CounselingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Fetch records
  const loadRecords = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await getStudentCounselingRecords({
        studentId,
        studentName,
        nisn: studentNisn,
        className,
      });
      setRecords(data);
    } catch (err) {
      console.error('[StudentCounselingWidget] Load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [studentId, studentName, studentNisn, className]);

  // Initial fetch and Realtime Listener
  useEffect(() => {
    queueMicrotask(() => {
      loadRecords();
    });

    // Subscribe to real-time changes from Smart-Absensi-Guru Dual-Write
    const unsubscribe = subscribeToStudentCounseling(
      { studentId, studentName, nisn: studentNisn, className },
      () => {
        loadRecords(true);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loadRecords, studentId, studentName, studentNisn, className]);

  // Statistics
  const stats = useMemo(() => calculateCounselingStats(records), [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && rec.status !== 'IN_PROGRESS' && rec.status !== 'MONITORING') {
        return false;
      }
      if (statusFilter === 'RESOLVED' && rec.status !== 'RESOLVED') {
        return false;
      }
      if (statusFilter === 'SCHEDULED' && rec.status !== 'SCHEDULED') {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTopic = rec.topic.toLowerCase().includes(q);
        const matchAction = rec.action_taken.toLowerCase().includes(q);
        const matchCounselor = rec.counselor_name.toLowerCase().includes(q);
        const matchCommitment = rec.student_commitment?.toLowerCase().includes(q) || false;
        return matchTopic || matchAction || matchCounselor || matchCommitment;
      }

      return true;
    });
  }, [records, statusFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedRecordId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 text-left pb-12 font-outfit text-slate-900">
      {/* ═══════════════════════════════════════════════════════════
          HEADER SECTION (Clean, Solid Light Theme, No AI Slop)
         ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Top: Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer mr-1 min-h-[36px]"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </button>
              )}
              <span className="text-xs font-semibold text-slate-400">
                {className ? `Kelas ${className}` : 'Portal Siswa'} • Bimbingan Konseling
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
              {isParent ? 'Catatan Pendampingan Siswa' : 'Catatan Bimbingan & Konseling'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Riwayat konsultasi, komitmen belajar, dan arahan resmi dari Guru BK.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => loadRecords(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 active:scale-95 rounded-xl border border-slate-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer min-h-[40px]"
              title="Sinkronkan catatan dari aplikasi guru"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
              <span>{isRefreshing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
            </button>
          </div>
        </div>

        {/* 4 Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Bimbingan</span>
            <span className="text-lg font-black text-slate-900 font-outfit mt-0.5 block">{stats.total} Sesi</span>
          </div>

          <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tuntas</span>
            <span className="text-lg font-black text-emerald-700 font-outfit mt-0.5 block">{stats.resolved} Selesai</span>
          </div>

          <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pendampingan</span>
            <span className="text-lg font-black text-amber-700 font-outfit mt-0.5 block">{stats.inProgress} Berjalan</span>
          </div>

          <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pemantauan</span>
            <span className="text-lg font-black text-sky-700 font-outfit mt-0.5 block">{stats.monitoring} Evaluasi</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FILTER & SEARCH
         ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'ALL', label: `Semua (${records.length})` },
              { id: 'ACTIVE', label: `Dalam Proses (${stats.inProgress + stats.monitoring})` },
              { id: 'RESOLVED', label: `Tuntas (${stats.resolved})` },
              { id: 'SCHEDULED', label: `Terjadwal (${stats.scheduled})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer min-h-[38px] ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik bimbingan..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all min-h-[40px]"
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RECORD LIST / EMPTY STATE
         ═══════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Memuat catatan bimbingan konseling...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <HeartHandshake size={24} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm sm:text-base font-black text-slate-900 font-outfit">
              {searchQuery ? 'Tidak Ada Catatan yang Cocok' : 'Belum Ada Catatan Bimbingan'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchQuery
                ? 'Tidak ditemukan catatan dengan kata kunci tersebut. Coba gunakan kata kunci lain.'
                : 'Saat Guru BK mencatat sesi konsultasi atau pendampingan di aplikasi sekolah, catatan akan muncul di sini.'}
            </p>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[40px]"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((rec) => {
            const typeInfo = getCounselingTypeLabel(rec.counseling_type);
            const statusMeta = getCounselingStatusMeta(rec.status);
            const isExpanded = expandedRecordId === rec.id;

            return (
              <div
                key={rec.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm transition-all space-y-4"
              >
                {/* Header Row: Date, Type, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                      <Calendar size={13} className="text-indigo-600" />
                      <span>{new Date(rec.counseling_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {rec.counseling_time && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-medium">{rec.counseling_time}</span>
                        </>
                      )}
                    </div>

                    {/* Type Badge */}
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                      {rec.counseling_type === 'ACADEMIC_GUIDANCE' && <BookOpen size={12} />}
                      {rec.counseling_type === 'INDIVIDUAL' && <UserCheck size={12} />}
                      {rec.counseling_type === 'BEHAVIOR_MEDIATION' && <HeartHandshake size={12} />}
                      {rec.counseling_type === 'CAREER_INTEREST' && <Compass size={12} />}
                      {rec.counseling_type === 'PARENT_CONFERENCE' && <Users size={12} />}
                      {rec.counseling_type === 'HOME_VISIT' && <Home size={12} />}
                      <span>{typeInfo.label}</span>
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.badgeBorder} flex items-center gap-1`}
                  >
                    {rec.status === 'RESOLVED' ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Clock size={13} />
                    )}
                    <span>{statusMeta.label}</span>
                  </span>
                </div>

                {/* Counselor & Topic */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User size={13} className="text-slate-400" />
                    <span>Guru Konselor:</span>
                    <strong className="text-slate-800 font-bold">{rec.counselor_name}</strong>
                    {rec.counselor_npp && (
                      <span className="text-[10px] text-slate-400 font-mono">({rec.counselor_npp})</span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug font-outfit">
                    {rec.topic}
                  </h3>

                  {rec.background_narrative && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {rec.background_narrative}
                    </p>
                  )}
                </div>

                {/* Main Action & Solution Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Arahan Guru */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1 text-left">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wide">
                      <Compass size={14} className="text-indigo-600" />
                      <span>Arahan & Solusi Guru BK</span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {rec.action_taken}
                    </p>
                  </div>

                  {/* Komitmen Siswa */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1 text-left">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wide">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Komitmen Siswa</span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {rec.student_commitment || 'Siswa berkomitmen menjalankan arahan bimbingan.'}
                    </p>
                  </div>
                </div>

                {/* Follow-up & Parent Involvement Details */}
                {(rec.follow_up_plan || rec.parent_involvement) && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleExpand(rec.id)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer min-h-[36px]"
                    >
                      <span>{isExpanded ? 'Sembunyikan Tindak Lanjut' : 'Lihat Rencana Tindak Lanjut'}</span>
                      <ArrowRight size={13} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-in fade-in duration-200">
                        {rec.follow_up_plan && (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                              <Clock size={12} />
                              <span>Rencana Tindak Lanjut</span>
                            </span>
                            <p className="text-xs text-slate-800 leading-relaxed font-medium">
                              {rec.follow_up_plan}
                            </p>
                            {rec.follow_up_date && (
                              <span className="text-[10px] text-slate-500 block mt-1 font-bold">
                                Tanggal Evaluasi: {new Date(rec.follow_up_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        )}

                        {rec.parent_involvement && (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                              <Users size={12} />
                              <span>Dukungan Orang Tua</span>
                            </span>
                            <p className="text-xs text-slate-800 leading-relaxed font-medium">
                              {rec.parent_involvement}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-slate-500 text-xs leading-relaxed">
        <Info size={15} className="text-slate-400 shrink-0 mt-0.5" />
        <p>
          Catatan bimbingan konseling ini hanya dapat diakses oleh siswa bersangkutan serta orang tua/wali murid melalui akun resmi Nawasena.
        </p>
      </div>
    </div>
  );
}

