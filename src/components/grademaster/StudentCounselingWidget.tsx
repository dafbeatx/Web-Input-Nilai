"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  HeartHandshake, 
  Calendar, 
  Clock, 
  User, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  Users, 
  Compass, 
  BookOpen, 
  UserCheck, 
  Home, 
  ArrowRight,
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
    <div className="w-full max-w-4xl mx-auto space-y-5 text-left pb-12">
      {/* ═══════════════════════════════════════════════════════════
          HEADER BANNER
         ═══════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-indigo-800/60">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                Layanan Bimbingan Konseling (BK)
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sinkron Realtime Smart-Absensi</span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-outfit text-white">
              {isParent ? 'Pendampingan & Bimbingan Konseling Siswa' : 'Catatan Bimbingan & Konseling Saya'}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/90 max-w-2xl leading-relaxed">
              Ruang komunikasi suportif dan pendampingan empatik untuk mendukung perkembangan akademik, penguatan karakter, serta solusi belajar bersama Guru BK.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => loadRecords(true)}
              disabled={isRefreshing}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl border border-white/15 backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
              title="Perbarui data"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3.5 py-2.5 bg-white text-indigo-950 hover:bg-slate-100 active:scale-95 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                Kembali
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SUMMARY STATS
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Total Bimbingan</span>
          <span className="text-2xl font-black text-slate-900 font-outfit mt-1 block">{stats.total}</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Sesi tercatat resmi</span>
        </div>

        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-xs">
          <span className="text-[10.5px] font-bold text-emerald-600 uppercase tracking-wider block">Tuntas / Selesai</span>
          <span className="text-2xl font-black text-emerald-700 font-outfit mt-1 block">{stats.resolved}</span>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Target tercapai</span>
        </div>

        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-xs">
          <span className="text-[10.5px] font-bold text-amber-600 uppercase tracking-wider block">Dalam Pendampingan</span>
          <span className="text-2xl font-black text-amber-700 font-outfit mt-1 block">{stats.inProgress}</span>
          <span className="text-[10px] text-amber-600/80 mt-0.5 block">Proses berjalan</span>
        </div>

        <div className="bg-white border border-cyan-100 rounded-2xl p-4 shadow-xs">
          <span className="text-[10.5px] font-bold text-cyan-600 uppercase tracking-wider block">Dalam Pemantauan</span>
          <span className="text-2xl font-black text-cyan-700 font-outfit mt-1 block">{stats.monitoring}</span>
          <span className="text-[10px] text-cyan-600/80 mt-0.5 block">Evaluasi berkala</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FILTER & SEARCH
         ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Pills */}
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik bimbingan..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RECORD LIST / EMPTY STATE
         ═══════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Memuat catatan bimbingan konseling...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <HeartHandshake size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-black text-slate-900 font-outfit">
              {searchQuery ? 'Tidak Ada Catatan yang Cocok' : 'Belum Ada Catatan Bimbingan Konseling'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchQuery
                ? 'Coba gunakan kata kunci pencarian lain atau pilih filter status "Semua".'
                : 'Tetap semangat belajar, mengasah potensi, dan berprestasi bersama Nawasena! Guru BK selalu siap mendampingi setiap langkah Anda.'}
            </p>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
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
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                {/* Header Row: Date, Type, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl">
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
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
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
                    className={`px-3 py-1 rounded-xl text-xs font-black border ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.badgeBorder} flex items-center gap-1`}
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
                <div className="space-y-2">
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
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {rec.background_narrative}
                    </p>
                  )}
                </div>

                {/* Main Action & Solution Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Arahan & Solusi Guru */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wide">
                      <Sparkles size={15} className="text-emerald-600" />
                      <span>Arahan & Solusi Guru BK</span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-emerald-950 font-medium leading-relaxed">
                      {rec.action_taken}
                    </p>
                  </div>

                  {/* Komitmen Siswa */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs uppercase tracking-wide">
                      <ShieldCheck size={15} className="text-amber-600" />
                      <span>Komitmen / Target Siswa</span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-amber-950 font-medium leading-relaxed">
                      {rec.student_commitment || 'Siswa berkomitmen mematuhi kesepakatan bimbingan dan berusaha sebaik-baiknya.'}
                    </p>
                  </div>
                </div>

                {/* Follow-up & Parent Involvement Details (Expandable or always visible if present) */}
                {(rec.follow_up_plan || rec.parent_involvement) && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleExpand(rec.id)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? 'Sembunyikan Rencana Tindak Lanjut' : 'Lihat Rencana Tindak Lanjut & Dukungan'}</span>
                      <ArrowRight size={13} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-200">
                        {rec.follow_up_plan && (
                          <div className="bg-purple-50/60 border border-purple-200/70 rounded-2xl p-3.5 space-y-1">
                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                              <Clock size={12} />
                              <span>Rencana Tindak Lanjut</span>
                            </span>
                            <p className="text-xs text-purple-950 leading-relaxed font-medium">
                              {rec.follow_up_plan}
                            </p>
                            {rec.follow_up_date && (
                              <span className="text-[10px] text-purple-600 block mt-1 font-bold">
                                Tanggal Evaluasi: {new Date(rec.follow_up_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        )}

                        {rec.parent_involvement && (
                          <div className="bg-sky-50/60 border border-sky-200/70 rounded-2xl p-3.5 space-y-1">
                            <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 flex items-center gap-1">
                              <Users size={12} />
                              <span>Keterlibatan Orang Tua di Rumah</span>
                            </span>
                            <p className="text-xs text-sky-950 leading-relaxed font-medium">
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
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3 text-slate-500 text-xs leading-relaxed">
        <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <p>
          Catatan bimbingan konseling ini bersifat rahasia dan hanya dapat diakses oleh siswa bersangkutan serta orang tua/wali murid melalui akun resmi Nawasena. Jika memerlukan konsultasi tatap muka lanjutan, silakan hubungi Guru BK di ruang konseling sekolah.
        </p>
      </div>
    </div>
  );
}

