"use client";

import React from 'react';
import {
  X,
  Save,
  Trash2,
  FolderOpen,
  GraduationCap,
  Loader2,
  AlertCircle,
  FileText,
  Settings,
  User,
  Key,
  Shield,
  Activity,
  Calendar,
  Clock,
  Terminal,
  RefreshCcw,
} from 'lucide-react';
import { ModalType, ToastType, AuditLog } from '@/lib/grademaster/types';

interface ModalsProps {
  modal: ModalType;
  sessionName: string;
  setSessionName: (v: string) => void;
  sessionPassword: string;
  setSessionPassword: (v: string) => void;
  modalLoading: boolean;
  modalError: string;
  onSave: () => void;
  onLoad: () => void;
  onLoadPublic?: () => void;
  onDelete: () => void;
  onClose: () => void;
  onUpdateAdmin?: (username: string, pass: string, remedialPass?: string) => Promise<void>;
}

export default function Modals(props: ModalsProps) {
  const {
    modal, sessionName, setSessionName,
    sessionPassword, setSessionPassword,
    modalLoading, modalError,
    onSave, onLoad, onLoadPublic, onDelete, onClose, onUpdateAdmin
  } = props;

  const [newUsername, setNewUsername] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newRemedialPassword, setNewRemedialPassword] = React.useState('');
  const [isUpdatingAdmin, setIsUpdatingAdmin] = React.useState(false);
  const [adminError, setAdminError] = React.useState('');

  const [activeTab, setActiveTab] = React.useState<'profile' | 'system'>('profile');
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(false);

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      if (data.logs) setAuditLogs(data.logs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Reset local state when modal opens
  React.useEffect(() => {
    if (modal === 'adminSettings') {
      setNewUsername('');
      setNewPassword('');
      setNewRemedialPassword('');
      setAdminError('');
      setActiveTab('profile');
      setAuditLogs([]);
    }
  }, [modal]);

  React.useEffect(() => {
    if (modal === 'adminSettings' && activeTab === 'system') {
      fetchAuditLogs();
    }
  }, [modal, activeTab]);

  if (!modal) return null;

  if (modal === 'about') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-safe">
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-xl" onClick={onClose}></div>
        <div className="relative w-full max-w-lg bg-surface premium-shadow backdrop-blur-2xl border border-outline-variant rounded-[2.5rem] premium-shadow p-6 md:p-8 animate-in overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-primary/20 to-purple-600/20 pointer-events-none border-b border-outline-variant"></div>
          <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-variant backdrop-blur-md flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-surface-container-highest transition-all z-10 border border-outline-variant">
            <X size={20} />
          </button>

          <div className="relative z-10 flex flex-col items-center text-center mt-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-primary shadow-2xl shadow-primary/20 rounded-[2rem] flex items-center justify-center text-white mb-4 border border-outline-variant">
              <GraduationCap size={36} className="md:w-10 md:h-10" />
            </div>
            <h3 className="font-outfit font-black text-xl md:text-3xl text-on-surface tracking-tight uppercase">GradeMaster OS</h3>
            <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">Modern Analytics Edition</p>
            <p className="text-xs md:text-sm font-bold text-on-surface-variant mt-2 leading-relaxed">Sistem Koreksi & Analitik Performa modern yang mengutamakan validitas data melalui metrik CSI (Cognitive Skill Index) dan LPS (Learning Performance Score).</p>
          </div>

          <div className="relative z-10 mt-8 space-y-4 text-left">
            <div className="flex gap-3 p-4 rounded-[1.5rem] bg-surface-variant border border-outline-variant items-start group hover:bg-surface-container-highest transition-all">
              <div className="w-10 h-10 shrink-0 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform"><FileText size={18} /></div>
              <div>
                <h5 className="text-[11px] font-black uppercase tracking-widest text-on-surface mb-1">Parser Deterministik</h5>
                <p className="text-[10px] md:text-xs font-bold text-on-surface-variant">Regex parser cerdas — dukungan format kunci jawaban bebas tanpa ketergantungan API pihak ketiga.</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-[1.5rem] bg-surface-variant border border-outline-variant items-start group hover:bg-surface-container-highest transition-all">
              <div className="w-10 h-10 shrink-0 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform"><GraduationCap size={18} /></div>
              <div>
                <h5 className="text-[11px] font-black uppercase tracking-widest text-on-surface mb-1">Metrik Akademik Valid</h5>
                <p className="text-[10px] md:text-xs font-bold text-on-surface-variant">CSI & LPS menggantikan estimasi IQ pseudo-science dengan data nyata hasil pengerjaan siswa.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <button onClick={onClose} className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
              Tutup Informasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modal === 'error') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-safe">
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-xl" onClick={onClose}></div>
        <div className="relative w-full max-w-sm bg-slate-900/60 backdrop-blur-2xl border border-outline-variant rounded-[2.5rem] premium-shadow p-6 md:p-8 animate-in text-center">
          <div className="w-20 h-20 rounded-[2rem] bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-xl shadow-rose-500/10">
            <AlertCircle size={40} className="animate-pulse" />
          </div>
          <h3 className="font-outfit font-black text-xl text-on-surface tracking-tight uppercase">Gagal Menyimpan</h3>
          <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest mt-1 mb-4 italic">Sistem Error</p>
          <p className="text-xs md:text-sm font-bold text-on-surface-variant mb-8 leading-relaxed">
            {modalError || 'Terjadi kesalahan sistem yang tidak diketahui. Silakan periksa kembali data input Anda.'}
          </p>
          <button onClick={onClose} className="w-full py-4 bg-rose-500 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-2xl shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all border border-rose-400/20">
            Mengerti & Tutup
          </button>
        </div>
      </div>
    );
  }

  if (modal === 'adminSettings') {
    const handleAdminSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onUpdateAdmin) return;
      if (!newUsername || newUsername.length < 3) return setAdminError('Username minimal 3 karakter.');
      if (!newPassword || newPassword.length < 6) return setAdminError('Password minimal 6 karakter.');
      
      setIsUpdatingAdmin(true);
      setAdminError('');
      try {
        await onUpdateAdmin(newUsername, newPassword, newRemedialPassword);
        onClose();
      } catch (err: any) {
        setAdminError(err.message || 'Gagal mengubah profil admin.');
      } finally {
        setIsUpdatingAdmin(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-safe">
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-xl" onClick={onClose}></div>
        <div className="relative w-full max-w-sm bg-slate-900/60 backdrop-blur-2xl border border-outline-variant rounded-[2.5rem] premium-shadow p-6 md:p-8 animate-in zoom-in duration-300">
          <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:bg-rose-500/10 hover:text-rose-500 transition-all border border-outline-variant">
            <X size={18} />
          </button>

          <div className="flex flex-col items-center mb-6 pt-4">
            <div className="w-16 h-16 bg-primary shadow-2xl shadow-primary/20 text-white rounded-[1.5rem] flex items-center justify-center mb-4 border border-outline-variant">
              <Settings size={32} />
            </div>
            <h3 className="font-black text-xl text-on-surface uppercase tracking-tight">Pengaturan Sistem</h3>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-surface-variant rounded-2xl mb-6 border border-outline-variant">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'profile' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <User size={14} /> Profil
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'system' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Activity size={14} /> Sistem
            </button>
          </div>

          {activeTab === 'profile' ? (
            <form onSubmit={handleAdminSave} className="space-y-5">
              {adminError && (
                <div className="flex gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-bold animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{adminError}</p>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Username Baru</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors"><User size={18} /></div>
                  <input
                    type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="admin123"
                    className="w-full pl-12 pr-4 py-4 bg-surface-variant border border-outline-variant rounded-2xl text-sm font-bold text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-on-surface-variant"
                    disabled={isUpdatingAdmin}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Password Baru (Sistem)</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors"><Key size={18} /></div>
                  <input
                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-12 pr-4 py-4 bg-surface-variant border border-outline-variant rounded-2xl text-sm font-bold text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-on-surface-variant"
                    disabled={isUpdatingAdmin}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Password Akses Remedial</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors"><Key size={18} className="text-tertiary-dim" /></div>
                  <input
                    type="password" 
                    placeholder="Password khusus Dashboard Remedial..."
                    className="w-full pl-12 pr-4 py-4 bg-surface-variant border border-outline-variant rounded-2xl text-sm font-bold text-tertiary focus:ring-4 focus:ring-tertiary/10 focus:border-tertiary outline-none transition-all placeholder:text-on-surface-variant"
                    disabled={isUpdatingAdmin}
                    id="remedial-password-input"
                    value={newRemedialPassword}
                    onChange={(e) => setNewRemedialPassword(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit" disabled={isUpdatingAdmin}
                className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50 border border-outline-variant"
              >
                {isUpdatingAdmin ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : 'Simpan Profil'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Aktivitas Sistem Terbaru</p>
                <button 
                  onClick={fetchAuditLogs} disabled={isLoadingLogs}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCcw size={10} className={isLoadingLogs ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {isLoadingLogs && auditLogs.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant opacity-50">
                    <Loader2 size={24} className="animate-spin mb-2" />
                    <p className="text-[10px] uppercase font-black tracking-widest">Memuat Audit Logs...</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-on-surface-variant opacity-50 border border-dashed border-outline-variant rounded-3xl">
                    <Terminal size={24} className="mx-auto mb-2" />
                    <p className="text-[10px] uppercase font-black tracking-widest">Belum ada aktivitas tercatat</p>
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-surface-variant rounded-2xl border border-outline-variant group hover:border-primary/30 transition-all">
                      <div className="flex items-start justify-between mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                          log.action_type === 'DELETE' ? 'bg-rose-500/10 text-rose-400' :
                          log.action_type === 'UPDATE' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {log.action_type}
                        </span>
                        <span className="text-[8px] font-bold text-on-surface-variant flex items-center gap-1">
                          <Clock size={8} /> {new Date(log.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-on-surface leading-tight">
                        {log.admin_username || 'System'} {log.action_type === 'CREATE' ? 'membuat' : log.action_type === 'UPDATE' ? 'memperbarui' : 'menghapus'} <span className="text-primary">{log.entity_type}</span>
                      </p>
                      {log.entity_id && (
                        <p className="text-[9px] font-mono text-on-surface-variant mt-1.5 truncate opacity-60">ID: {log.entity_id}</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 px-1">
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-2xl">
                  <Shield size={16} className="text-primary shrink-0" />
                  <p className="text-[9px] font-bold text-primary/80 leading-relaxed uppercase tracking-tight">
                    Audit log bersifat permanen untuk menjamin integritas data sistem GradeMaster OS.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleAction = modal === 'save' ? onSave : modal === 'delete' ? onDelete : onLoad;
  const colors = {
    save: { bg: 'bg-indigo-600', shadow: 'shadow-indigo-600/20' },
    load: { bg: 'bg-sky-600', shadow: 'shadow-sky-600/20' },
    delete: { bg: 'bg-rose-600', shadow: 'shadow-rose-600/20' },
  };
  const c = colors[modal as 'save' | 'load' | 'delete'];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-safe">
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-outline-variant rounded-[2.5rem] premium-shadow p-6 md:p-8 animate-in duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:bg-rose-500/10 hover:text-rose-500 transition-all border border-outline-variant z-10">
          <X size={18} />
        </button>

        <div className="flex items-center gap-4 mb-8 pt-2">
          <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center text-on-surface premium-shadow ${c.bg} ${c.shadow} border border-outline-variant`}>
            {modal === 'save' ? <Save size={20} /> : modal === 'delete' ? <Trash2 size={20} /> : <FolderOpen size={20} />}
          </div>
          <div>
            <h3 className="font-black text-on-surface text-lg uppercase tracking-tight">
              {modal === 'save' ? 'Simpan Sesi' : modal === 'delete' ? 'Hapus Sesi' : 'Muat Sesi'}
            </h3>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mt-0.5">
              {modal === 'save' ? 'Simpan data ke server' : modal === 'delete' ? 'Hapus permanen' : 'Muat data tersimpan'}
            </p>
          </div>
        </div>

        <div className="space-y-5">
           <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Nama Sesi</label>
            <input
               type="text" value={sessionName}
               onChange={(e) => setSessionName(e.target.value)}
               placeholder="Contoh: UTS SMA Informatika"
               className="w-full bg-surface-variant border border-outline-variant rounded-2xl p-4 text-sm font-bold text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-on-surface-variant disabled:opacity-50"
               autoFocus
               disabled={modal === 'delete'}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Password Sesi</label>
            <input
               type="password" value={sessionPassword}
               onChange={(e) => setSessionPassword(e.target.value)}
               placeholder="Minimal 6 karakter"
               className="w-full bg-surface-variant border border-outline-variant rounded-2xl p-4 text-sm font-bold text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-on-surface-variant"
               onKeyDown={(e) => e.key === 'Enter' && handleAction()}
            />
          </div>

          {modalError && (
             <div className="flex gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-bold animate-in fade-in">
               <AlertCircle size={16} className="shrink-0 mt-0.5" />
               <p>{modalError}</p>
             </div>
          )}

          <button
             onClick={handleAction}
             disabled={modalLoading}
             className={`w-full py-4 rounded-2xl text-on-surface text-[10px] md:text-sm font-black uppercase tracking-widest premium-shadow transition-all flex items-center justify-center gap-2 border border-outline-variant disabled:opacity-50 hover:scale-[1.02] active:scale-95 mt-4 ${c.bg} ${c.shadow}`}
          >
            {modalLoading ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> :
              modal === 'save' ? <><Save size={16} /> Simpan Sesi</> :
              modal === 'delete' ? <><Trash2 size={16} /> Hapus Sesi</> :
              <><FolderOpen size={16} /> Muat Sesi</>
            }
          </button>

          {modal === 'load' && onLoadPublic && (
            <button
               onClick={onLoadPublic}
               disabled={modalLoading}
               className="w-full py-4 rounded-2xl text-on-surface-variant bg-surface-variant border border-outline-variant text-[10px] md:text-sm font-black uppercase tracking-widest hover:bg-surface-container-highest transition-all hover:scale-[1.02] active:scale-95 mt-2 shadow-xl"
            >
              <FolderOpen size={16} className="text-primary/60 inline mr-2" /> Lihat Publik (Read-Only)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
