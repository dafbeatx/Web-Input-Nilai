import React, { useState, useEffect } from 'react';
import { 
  User, 
  Search, 
  MapPin, 
  ArrowRight, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  GraduationCap 
} from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';
import NeonGraduationCap from '@/components/grademaster/ui/NeonGraduationCap';

interface StudentClaimLayerProps {
  googleUser: {
    name: string;
    email: string;
    photo_url?: string;
  };
  onSuccess: (studentData: any) => void;
  onLogout: () => void;
  setToast: (t: ToastType) => void;
}

interface StudentOption {
  id: string;
  student_name: string;
  class_name: string;
}

export default function StudentClaimLayer({ 
  googleUser, 
  onSuccess, 
  onLogout, 
  setToast 
}: StudentClaimLayerProps) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(`/api/grademaster/student-accounts?mode=claim&t=${Date.now()}`);
        const data = await res.json();
        if (res.ok) {
          setStudents(data.students || []);
        } else {
          setToast({ message: data.error || 'Gagal memuat daftar siswa', type: 'error' });
        }
      } catch (err) {
        setToast({ message: 'Gagal memuat daftar siswa. Periksa koneksi.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, [setToast]);

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const handleSelectStudent = (student: StudentOption) => {
    setSelectedStudent(student);
    setSearchQuery(student.student_name);
    setShowDropdown(false);
  };

  const handleClaim = async () => {
    if (!selectedStudent) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/student/link-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          google_name: googleUser.name,
          studentId: selectedStudent.id,
          student_name: selectedStudent.student_name,
          class_name: selectedStudent.class_name,
          email: googleUser.email
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setToast({ message: 'Profil berhasil dikaitkan!', type: 'success' });
      onSuccess(data.student);
    } catch (err: any) {
      setToast({ message: err.message || 'Gagal mengaitkan profil', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-inter animate-in fade-in duration-500">
      {/* Top Bar */}
      <header className="w-full h-16 md:h-20 border-b border-slate-100 flex items-center justify-between px-6 md:px-12 sticky top-0 bg-white z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0F172A] text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
            <NeonGraduationCap size={24} />
          </div>
          <h1 className="text-sm font-black text-[#0F172A] tracking-tighter uppercase font-outfit">GradeMaster OS</h1>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all text-xs font-bold"
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto w-full">
        {/* User Badge */}
        <div className="mb-12 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-700">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Masuk sebagai</p>
          <div className="flex items-center gap-4 bg-slate-50 pl-2 pr-6 py-2 rounded-full border border-slate-100 shadow-sm transition-all hover:shadow-md">
            {googleUser.photo_url ? (
              <img src={googleUser.photo_url} alt="Profile" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold">
                {googleUser.name[0]}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-black text-[#0F172A] leading-none">{googleUser.name}</span>
              <span className="text-[11px] font-medium text-slate-500 mt-1">{googleUser.email}</span>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center mb-12 max-w-lg">
          <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.1] mb-5">
            Pilih Profil <br className="hidden md:block" /> Siswa Anda
          </h2>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            Cari nama lengkap Anda di bawah ini agar data rapor dan kedisiplinan muncul dengan benar.
          </p>
        </div>

        {/* Identification Form */}
        <div className="w-full max-w-md space-y-8">
          {/* Field 1: Search Name */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Nama Lengkap Siswa</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0F172A] transition-colors">
                <Search size={20} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedStudent(null);
                  setShowDropdown(true);
                }}
                placeholder="Ketik nama Anda..."
                className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-3xl text-lg font-bold text-[#0F172A] placeholder:text-slate-300 focus:outline-none focus:border-[#0F172A] focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
              />

              {/* Autocomplete Dropdown */}
              {showDropdown && searchQuery.length > 0 && !selectedStudent && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  {isLoading ? (
                    <div className="p-8 text-center text-slate-400 animate-pulse flex items-center justify-center gap-3">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-widest">Mencari Data...</span>
                    </div>
                  ) : filteredStudents.length > 0 ? (
                    <div className="py-2">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectStudent(s)}
                          className="w-full px-7 py-4 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group"
                        >
                          <div className="flex flex-col">
                            <span className="text-base font-bold text-[#0F172A] group-hover:translate-x-1 transition-transform">{s.student_name}</span>
                            <span className="text-xs font-medium text-slate-400">{s.class_name}</span>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <CheckCircle2 size={18} className="text-[#10B981]" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">
                      Nama tidak ditemukan. Silakan hubungi operator sekolah.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Field 2: Class (Auto-filled) */}
          <div className="space-y-3 animate-in fade-in duration-500" style={{ opacity: selectedStudent ? 1 : 0.5 }}>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Kelas</label>
            <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                <GraduationCap size={20} />
              </div>
              <input
                type="text"
                readOnly
                value={selectedStudent ? selectedStudent.class_name : 'Otomatis terisi...'}
                className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-lg font-bold text-[#0F172A] cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>

          {/* Primary Button */}
          <button
            onClick={handleClaim}
            disabled={!selectedStudent || isSubmitting}
            className="w-full py-6 bg-[#0F172A] text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group mt-4 disabled:opacity-30 disabled:grayscale disabled:scale-100"
          >
            {isSubmitting ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                Lanjut ke Profil Saya
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </button>
        </div>
      </main>

      {/* Footer Design Element */}
      <footer className="p-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
        GradeMaster OS System Identity v2.5
      </footer>
    </div>
  );
}
