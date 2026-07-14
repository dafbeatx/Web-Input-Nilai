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
  violation_date: string;
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
  onAddLog: (type: 'GOOD' | 'BAD', points: number, reason: string, date: string) => void;
  onUpdateLog: (id: string, points: number, reason: string, date: string) => void;
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
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogState, setEditLogState] = useState({ points: 0, reason: '', date: '' });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatStudentName = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 2) return name;
    const firstName = parts[0];
    const initials = parts.slice(1).map(p => p[0].toUpperCase() + ".").join(" ");
    return `${firstName} ${initials}`;
  };

  const getStatusInfo = (pts: number) => {
    if (pts >= 90) return { label: 'A', colorText: 'text-tertiary', bg: 'bg-tertiary/10' };
    if (pts >= 70) return { label: 'B', colorText: 'text-primary', bg: 'bg-primary/10' };
    if (pts >= 40) return { label: 'C', colorText: 'text-[#ffc107]', bg: 'bg-[#ffc107]/10' };
    return { label: 'D', colorText: 'text-error', bg: 'bg-error/10' };
  };

  const status = getStatusInfo(student.total_points);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Centered Modal */}
      <div className="
        relative w-full md:max-w-xl max-h-[80vh]
        bg-surface-container border border-outline-variant/20 shadow-[0_0_60px_rgba(0,0,0,0.6)]
        rounded-[2rem] overflow-hidden
        flex flex-col animate-in zoom-in-95 duration-300
      ">
        
        {/* Header */}
        <header className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className={`
              w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-outline-variant/10
              ${status.bg} ${status.colorText}
            `}>
              <span className="text-2xl font-headline font-black tracking-tight">{status.label}</span>
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-headline font-bold text-primary tracking-tight truncate leading-tight" title={student.student_name}>
                {formatStudentName(student.student_name)}
              </h2>
              <div className="flex items-center mt-1">
                <span className="text-[13px] font-sans font-medium text-on-surface-variant">
                  Kelas {student.class_name} • {student.total_points} Pts
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-surface-bright text-on-surface-variant hover:text-primary rounded-full flex items-center justify-center transition-colors active:scale-95 shrink-0"
          >
            <X size={20} />
          </button>
        </header>

        {/* Tab Switcher */}
        <div className="flex bg-surface-container border-b border-outline-variant/20 h-14 shrink-0 relative z-10 px-4">
          {[
            { id: 'HISTORY', label: 'Riwayat', icon: History },
            { id: 'MANAGE', label: 'Tambah Catatan', icon: PlusCircle, adminOnly: true }
          ].map((tab) => {
            if (tab.adminOnly && !isAdmin) return null;
            const IsActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 text-[14px] font-sans font-bold transition-colors relative
                  ${IsActive ? 'text-tertiary' : 'text-on-surface-variant'}
                `}
              >
                <Icon size={16} /> {tab.label}
                {IsActive && <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-tertiary rounded-t-full" />}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          {activeTab === 'HISTORY' ? (
            <div className="space-y-3">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-60">
                  <Loader2 size={32} className="animate-spin mb-3 text-tertiary" />
                  <p className="text-[12px] font-sans font-medium text-on-surface-variant">Sinkronisasi Riwayat...</p>
                </div>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="bg-surface-bright border border-outline-variant/10 rounded-2xl p-4 transition-all group relative overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 overflow-hidden">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border
                          ${log.points_delta > 0 ? 'bg-tertiary/10 text-tertiary border-tertiary/20' : 'bg-error/10 text-error border-error/20'}
                        `}>
                          {log.points_delta > 0 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[15px] font-bold font-sans ${log.points_delta > 0 ? 'text-tertiary' : 'text-error'}`}>
                              {log.points_delta > 0 ? '+' : ''}{log.points_delta}
                            </span>
                            <span className="text-[11px] font-sans font-medium text-on-surface-variant flex items-center gap-1">
                              • {formatDate(log.violation_date || log.created_at)}
                            </span>
                          </div>
                          <h4 className="text-primary font-sans font-medium text-[14px] leading-tight pr-2">
                            {log.reason}
                          </h4>
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => {
                              setEditingLogId(log.id);
                              setEditLogState({ 
                                points: log.points_delta, 
                                reason: log.reason, 
                                date: (log.violation_date || log.created_at).split('T')[0] 
                              });
                            }}
                            className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => onDeleteLog(log.id)}
                            className="p-1.5 text-on-surface-variant hover:text-error rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Inline Edit UI */}
                    {isAdmin && editingLogId === log.id && (
                      <div className="mt-4 pt-4 border-t border-outline-variant/10 space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Tanggal Pelanggaran</label>
                            <input 
                              type="date"
                              value={editLogState.date}
                              onChange={(e) => setEditLogState(prev => ({ ...prev, date: e.target.value }))}
                              className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2 text-sm font-medium text-primary outline-none focus:border-primary/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Keterangan / Alasan</label>
                            <input 
                              type="text"
                              value={editLogState.reason}
                              onChange={(e) => setEditLogState(prev => ({ ...prev, reason: e.target.value }))}
                              className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2 text-sm font-medium text-primary outline-none focus:border-primary/50"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              onUpdateLog(log.id, editLogState.points, editLogState.reason, editLogState.date);
                              setEditingLogId(null);
                            }}
                            disabled={isUpdating}
                            className="flex-1 bg-primary text-on-primary py-2 rounded-xl text-xs font-bold active:scale-95 transition-all premium-shadow flex items-center justify-center gap-2"
                          >
                            {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} SIMPAN PERUBAHAN
                          </button>
                          <button 
                            onClick={() => setEditingLogId(null)}
                            className="px-4 bg-surface-bright text-on-surface-variant py-2 rounded-xl text-xs font-bold"
                          >
                            BATAL
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 opacity-60">
                  <ShieldCheck size={48} className="mx-auto text-on-surface-variant mb-4 stroke-[1.5]" />
                  <p className="text-[14px] font-sans font-medium text-on-surface-variant">Belum ada riwayat poin.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-2">
              {/* Date Selector */}
              <div className="bg-surface-bright border border-outline-variant/10 rounded-2xl p-4 space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} className="text-primary" /> Tanggal Kejadian
                </label>
                <input 
                  type="date" 
                  value={newLogDate}
                  onChange={(e) => setNewLogDate(e.target.value)}
                  className="w-full h-12 bg-surface-container border border-outline-variant/10 rounded-xl px-4 text-sm font-bold text-primary outline-none focus:border-primary/50 transition-all font-outfit"
                />
                <p className="text-[10px] text-on-surface-variant font-medium italic opacity-70">
                  * Pilih tanggal saat peristiwa terjadi jika berbeda dengan hari ini.
                </p>
              </div>

              {/* Positive Behaviors */}
              <div className="space-y-3">
                <h4 className="text-[14px] font-sans font-bold text-tertiary flex items-center gap-2 px-1">
                  <PlusCircle size={16} /> Tindakan Terpuji
                </h4>
                <div className="flex flex-col gap-2">
                  {reasons.good.map(r => (
                    <button 
                      key={r} 
                      disabled={isUpdating}
                      onClick={() => onAddLog('GOOD', 10, r, newLogDate)} 
                      className="px-4 h-14 bg-tertiary/5 active:bg-tertiary/20 border border-tertiary/20 rounded-xl flex items-center justify-between text-left transition-colors"
                    >
                      <span className="text-[14px] font-sans font-semibold text-primary leading-tight">{r}</span>
                      <span className="text-[14px] font-bold text-tertiary shrink-0">+10</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Negative Behaviors */}
              <div className="space-y-3 pt-4 border-t border-outline-variant/10">
                <h4 className="text-[14px] font-sans font-bold text-error flex items-center gap-2 px-1">
                  <AlertCircle size={16} /> Pelanggaran & Kedisiplinan
                </h4>
                <div className="flex flex-col gap-2">
                  {reasons.bad.map(r => (
                    <button 
                      key={r} 
                      disabled={isUpdating}
                      onClick={() => onAddLog('BAD', 10, r, newLogDate)} 
                      className="px-4 h-14 bg-error/5 active:bg-error/20 border border-error/20 rounded-xl flex items-center justify-between text-left transition-colors"
                    >
                      <span className="text-[14px] font-sans font-semibold text-primary leading-tight">{r}</span>
                      <span className="text-[14px] font-bold text-error shrink-0">-10</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
