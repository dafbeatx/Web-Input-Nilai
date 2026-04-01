import React, { useState } from 'react';
import { 
  X, History, PlusCircle, CheckCircle2, AlertCircle, 
  Trash2, Pencil, Save, Loader2, ThumbsUp, ThumbsDown,
  Calendar, ShieldCheck
} from 'lucide-react';

interface BehaviorLog {
  id: string;
  student_id: string;
  points_delta: number;
  reason: string;
  created_at: string;
}

interface StudentDetailSheetProps {
  student: {
    id: string;
    student_name: string;
    class_name: string;
    total_points: number;
  };
  logs: BehaviorLog[];
  isLoadingLogs: boolean;
  onClose: () => void;
  onAddLog: (type: 'GOOD' | 'BAD', points: number, reason: string) => void;
  onUpdateLog: (id: string, points: number, reason: string) => void;
  onDeleteLog: (id: string) => void;
  isUpdating: boolean;
  isAdmin?: boolean;
  reasons: { good: string[], bad: string[] };
}

export default function StudentDetailSheet({
  student,
  logs,
  isLoadingLogs,
  onClose,
  onAddLog,
  onUpdateLog,
  onDeleteLog,
  isUpdating,
  isAdmin = false,
  reasons
}: StudentDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'MANAGE'>('HISTORY');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ reason: '', points: 0 });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" 
        onClick={onClose}
      />
      
      {/* Sheet / Modal */}
      <div className="
        relative w-full md:max-w-4xl h-[90dvh] md:h-auto md:max-h-[85vh]
        bg-slate-900/50 backdrop-blur-2xl border border-white/10
        rounded-t-[2.5rem] md:rounded-[4rem] shadow-2xl overflow-hidden
        flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in-95
      ">
        {/* Handle for mobile */}
        <div className="md:hidden w-12 h-1.5 bg-white/20 rounded-full mx-auto my-4 shrink-0" />
        
        {/* Header */}
        <header className="px-6 py-4 md:p-10 border-b border-white/10 flex items-center justify-between sticky top-0 z-20 bg-slate-900/80 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-4 md:gap-6">
            <div className={`
              w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] border flex flex-col items-center justify-center shadow-2xl shrink-0
              ${student.total_points >= 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/20' : 'bg-primary/10 text-primary border-primary/20 shadow-primary/20'}
            `}>
              <span className="text-xl md:text-3xl font-black">{student.total_points}</span>
              <span className="text-[6px] md:text-[8px] font-black uppercase tracking-widest opacity-60 hidden md:inline">Total</span>
            </div>
            <div className="overflow-hidden">
              <h2 className="text-lg md:text-3xl font-black text-white font-outfit uppercase tracking-tighter truncate leading-tight">
                {student.student_name}
              </h2>
              <div className="flex items-center gap-2 mt-1 md:mt-2">
                <span className="px-2 py-0.5 bg-white/5 rounded-full text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest border border-white/10">
                  {student.class_name}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 md:w-12 md:h-12 bg-white/5 text-slate-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-white/10 shadow-xl active:scale-90 shrink-0"
          >
            <X size={24} />
          </button>
        </header>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950/50 backdrop-blur-xl border-b border-white/5 h-16 shrink-0 relative z-10">
          {[
            { id: 'HISTORY', label: 'RIWAYAT', icon: History },
            { id: 'MANAGE', label: 'TAMBAH', icon: PlusCircle, adminOnly: true }
          ].map((tab) => {
            if (tab.adminOnly && !isAdmin) return null;
            const IsActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-4 text-[10px] md:text-sm font-black tracking-[0.2em] transition-all relative
                  ${IsActive ? 'text-primary bg-primary/5' : 'text-slate-500'}
                `}
              >
                <Icon size={16} /> {tab.label}
                {IsActive && <div className="absolute bottom-0 left-4 right-4 h-1 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-20">
          {activeTab === 'HISTORY' ? (
            <div className="space-y-4">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Loader2 size={32} className="animate-spin mb-3 text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sinkronisasi Riwayat...</p>
                </div>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 md:p-6 hover:border-primary/20 transition-all group relative overflow-hidden active:scale-[0.99]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 overflow-hidden">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border
                          ${log.points_delta > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}
                        `}>
                          {log.points_delta > 0 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm md:text-base font-black ${log.points_delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {log.points_delta > 0 ? '+' : ''}{log.points_delta}
                            </span>
                            <span className="text-[8px] md:text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                              <Calendar size={10} /> {formatDate(log.created_at)}
                            </span>
                          </div>
                          <h4 className="text-white font-black text-xs md:text-sm uppercase tracking-tight leading-tight">
                            {log.reason}
                          </h4>
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingLogId(log.id);
                              setEditForm({ reason: log.reason, points: log.points_delta });
                            }}
                            className="p-2 bg-white/5 text-slate-500 hover:text-primary rounded-xl border border-white/10 active:scale-90"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => onDeleteLog(log.id)}
                            className="p-2 bg-white/5 text-slate-500 hover:text-rose-500 rounded-xl border border-white/10 active:scale-90"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 opacity-40">
                  <ShieldCheck size={48} className="mx-auto text-primary mb-4" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Belum ada riwayat poin.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              {/* Positive Behaviors */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                  <PlusCircle size={14} /> Tindakan Terpuji
                </h4>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  {reasons.good.map(r => (
                    <button 
                      key={r} 
                      disabled={isUpdating}
                      onClick={() => onAddLog('GOOD', 10, r)} 
                      className="p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 rounded-[1.5rem] text-left text-[10px] font-black text-emerald-300 uppercase tracking-widest transition-all active:scale-95 leading-tight shadow-lg shadow-black/20"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Negative Behaviors */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                  <AlertCircle size={14} /> Pelanggaran & Kedisiplinan
                </h4>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  {reasons.bad.map(r => (
                    <button 
                      key={r} 
                      disabled={isUpdating}
                      onClick={() => onAddLog('BAD', 10, r)} 
                      className="p-4 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/30 rounded-[1.5rem] text-left text-[10px] font-black text-rose-300 uppercase tracking-widest transition-all active:scale-95 leading-tight shadow-lg shadow-black/20"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-10 p-6 bg-slate-950/40 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ShieldCheck size={64} className="text-primary" />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-tight mb-1">Integritas Sekolah</h4>
                <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase tracking-wider">
                  Setiap pengisian poin akan dicatat permanen dalam sistem riwayat kedisiplinan siswa.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
