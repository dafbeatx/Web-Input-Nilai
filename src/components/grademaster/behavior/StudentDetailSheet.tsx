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

  const getStatusColor = (pts: number) => {
    if (pts >= 100) return 'emerald';
    if (pts >= 70) return '#00b4ff'; // neon blue
    if (pts >= 40) return 'amber';
    return 'rose';
  };

  const color = getStatusColor(student.total_points);
  const isBlue = color === '#00b4ff';
  const colorClassText = isBlue ? 'text-[#00b4ff]' : `text-${color}-500`;
  const colorClassBg = isBlue ? 'bg-[#00b4ff]/10' : `bg-${color}-500/10`;
  const colorClassBorder = isBlue ? 'border-[#00b4ff]/20' : `border-${color}-500/20`;

  const glowStyle = isBlue 
    ? { boxShadow: '0 0 20px rgba(0,180,255,0.4)' } 
    : {};

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Sheet / Modal */}
      <div className="
        relative w-full md:max-w-xl h-[85dvh] max-h-[85vh]
        bg-[#111113] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]
        rounded-t-3xl overflow-hidden
        flex flex-col animate-in slide-in-from-bottom-full duration-300
      ">
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mt-4 mb-2 shrink-0" />
        
        {/* Header */}
        <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className={`
              w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border
              ${colorClassBg} ${colorClassText} ${colorClassBorder}
            `} style={glowStyle}>
              <span className="text-2xl font-bold font-sans tracking-tight">{student.total_points}</span>
            </div>
            <div className="overflow-hidden">
              <h2 className="text-xl font-sans font-semibold text-white tracking-[-0.5px] truncate leading-tight">
                {student.student_name}
              </h2>
              <div className="flex items-center mt-1">
                <span className="text-[13px] font-sans text-slate-400">
                  Kelas {student.class_name}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/5 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-colors active:bg-white/10 shrink-0"
          >
            <X size={20} />
          </button>
        </header>

        {/* Tab Switcher */}
        <div className="flex bg-[#111113] border-b border-white/5 h-14 shrink-0 relative z-10 px-4">
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
                  flex-1 flex items-center justify-center gap-2 py-3 text-[14px] font-sans font-medium transition-colors relative
                  ${IsActive ? 'text-[#00b4ff]' : 'text-slate-500'}
                `}
              >
                <Icon size={16} /> {tab.label}
                {IsActive && <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-[#00b4ff] rounded-t-full" />}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          {activeTab === 'HISTORY' ? (
            <div className="space-y-3">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Loader2 size={32} className="animate-spin mb-3 text-[#00b4ff]" />
                  <p className="text-[12px] font-sans font-medium">Sinkronisasi Riwayat...</p>
                </div>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 transition-all group relative overflow-hidden active:scale-[0.98]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 overflow-hidden">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border
                          ${log.points_delta > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}
                        `}>
                          {log.points_delta > 0 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[15px] font-bold font-sans ${log.points_delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {log.points_delta > 0 ? '+' : ''}{log.points_delta}
                            </span>
                            <span className="text-[11px] font-sans text-slate-500 flex items-center gap-1">
                              • {formatDate(log.created_at)}
                            </span>
                          </div>
                          <h4 className="text-white font-sans text-[14px] leading-tight pr-2">
                            {log.reason}
                          </h4>
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center flex-col gap-2 opacity-100 transition-opacity shrink-0">
                          <button 
                            onClick={() => onDeleteLog(log.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg active:bg-white/5"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 opacity-40">
                  <ShieldCheck size={48} className="mx-auto text-slate-500 mb-4 stroke-[1.5]" />
                  <p className="text-[14px] font-sans text-slate-400">Belum ada riwayat poin.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-2">
              {/* Positive Behaviors */}
              <div className="space-y-3">
                <h4 className="text-[14px] font-sans font-semibold text-emerald-400 flex items-center gap-2 px-1">
                  <PlusCircle size={16} /> Tindakan Terpuji
                </h4>
                <div className="flex flex-col gap-2">
                  {reasons.good.map(r => (
                    <button 
                      key={r} 
                      disabled={isUpdating}
                      onClick={() => onAddLog('GOOD', 10, r)} 
                      className="px-4 h-14 bg-emerald-500/10 active:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.98]"
                    >
                      <span className="text-[14px] font-sans font-medium text-emerald-100 leading-tight">{r}</span>
                      <span className="text-[14px] font-bold text-emerald-400 shrink-0">+10</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Negative Behaviors */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <h4 className="text-[14px] font-sans font-semibold text-rose-500 flex items-center gap-2 px-1">
                  <AlertCircle size={16} /> Pelanggaran & Kedisiplinan
                </h4>
                <div className="flex flex-col gap-2">
                  {reasons.bad.map(r => (
                    <button 
                      key={r} 
                      disabled={isUpdating}
                      onClick={() => onAddLog('BAD', 10, r)} 
                      className="px-4 h-14 bg-rose-500/10 active:bg-rose-500/20 border border-rose-500/20 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.98]"
                    >
                      <span className="text-[14px] font-sans font-medium text-rose-100 leading-tight">{r}</span>
                      <span className="text-[14px] font-bold text-rose-500 shrink-0">-10</span>
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
