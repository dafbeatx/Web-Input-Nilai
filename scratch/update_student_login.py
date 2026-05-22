import re

path = '/home/senku/Web-Input-Nilai/src/components/grademaster/StudentLoginLayer.tsx'
with open(path, 'r') as f:
    content = f.read()

# Add imports
imports_to_add = "import { Search, GraduationCap } from 'lucide-react';\nimport { useGradeMaster } from '@/context/GradeMasterContext';\n"
content = content.replace("import { Loader2", imports_to_add + "import { Loader2")

# Add state variables inside the component
state_vars = """
  const { setLayer, setIsParent, setStudentData } = useGradeMaster();
  const [isParentMode, setIsParentMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const isStudentSelectedRef = React.useRef(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (isStudentSelectedRef.current) return;
      if (!debouncedQuery.trim()) {
        setStudents([]);
        return;
      }
      setIsLoadingSearch(true);
      try {
        const { data } = await supabase
          .from('gm_behaviors')
          .select('id, student_name, class_name')
          .ilike('student_name', `%${debouncedQuery}%`)
          .order('student_name', { ascending: true })
          .limit(10);
        setStudents(data || []);
      } catch (err) {} finally {
        setIsLoadingSearch(false);
      }
    };
    if (isParentMode) fetchStudents();
  }, [debouncedQuery, isParentMode]);

  const handleSelectStudent = (s: any) => {
    isStudentSelectedRef.current = true;
    setIsParentMode(false);
    setIsParent(true);
    setStudentData({ 
      id: s.id, 
      name: s.student_name, 
      class_name: s.class_name, 
      isGoogleLinked: false,
      isParentView: true 
    });
    setToast({ message: `Masuk sebagai Orang Tua dari ${s.student_name}`, type: 'success' });
    setLayer('student_profile');
  };
"""

content = content.replace("  const [error, setError] = useState('');", "  const [error, setError] = useState('');\n" + state_vars)

# Add the Parent Mode UI in Hero Section
hero_replace = """          {/* Primary Action Button */}
          <div className="w-full space-y-6">
            {!isParentMode ? (
            <>
            <button
               onClick={handleGoogleLogin}
               disabled={isLoginInProgress}
               className="
                 group
                 w-full py-5 sm:py-6
                 bg-[#0F172A] text-white
                 rounded-full
                 font-black uppercase tracking-[0.25em] text-[0.7rem] sm:text-xs
                 shadow-[0_25px_60px_-10px_rgba(15,23,42,0.4)]
                 hover:shadow-[0_30px_70px_-10px_rgba(15,23,42,0.5)]
                 hover:scale-[1.02]
                 active:scale-[0.98]
                 disabled:opacity-50 disabled:grayscale disabled:scale-100
                 transition-all duration-500 ease-out
                 flex items-center justify-center gap-4
               "
            >
              {isLoginInProgress ? (
                <Loader2 size={24} className="animate-spin text-slate-400" />
              ) : (
                <>
                  <svg className="w-6 h-6 shrink-0 group-hover:scale-125 transition-transform duration-500" viewBox="0 0 24 24">
                     <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                     <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                     <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                     <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                  <ArrowRight size={18} className="opacity-0 -ml-8 group-hover:opacity-100 group-hover:ml-0 transition-all duration-500" />
                </>
              )}
            </button>
            <button
               onClick={() => setIsParentMode(true)}
               className="
                 w-full py-4 sm:py-5
                 bg-white text-slate-500 border-2 border-slate-200
                 rounded-full
                 font-black uppercase tracking-[0.15em] text-[0.7rem]
                 hover:bg-slate-50 hover:text-slate-700
                 hover:border-slate-300
                 active:scale-[0.98]
                 transition-all duration-300 ease-out
                 flex items-center justify-center gap-3
               "
            >
              Masuk Sebagai Orang Tua
            </button>
            </>
            ) : (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cari Nama Siswa</label>
              <div className="relative group z-50">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0F172A] transition-colors">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    isStudentSelectedRef.current = false;
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  placeholder="Ketik nama anak..."
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-[#0F172A] placeholder:text-slate-300 focus:outline-none focus:border-[#0F172A] focus:ring-4 focus:ring-slate-100 transition-all"
                />

                {showDropdown && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2">
                    {isLoadingSearch ? (
                      <div className="p-6 text-center">
                        <Loader2 size={20} className="animate-spin mx-auto text-slate-300" />
                      </div>
                    ) : students.length > 0 ? (
                      <ul className="max-h-[250px] overflow-y-auto">
                        {students.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSelectStudent(s)}
                            className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group/btn"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[#0F172A] group-hover/btn:translate-x-1 transition-transform">{s.student_name}</span>
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{s.class_name}</span>
                            </div>
                            <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs font-medium">
                        Nama tidak ditemukan.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                 onClick={() => setIsParentMode(false)}
                 className="w-full py-3 text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
              >
                Kembali
              </button>
            </div>
            )}
            <p className="text-center text-[0.6rem] font-bold text-slate-300 uppercase tracking-[0.4em] leading-relaxed select-none">
              Data Anda terlindungi oleh enkripsi GradeMaster OS
            </p>
          </div>
"""

# We need to carefully replace the old primary action button block
old_block_start = '          {/* Primary Action Button */}'
old_block_end = 'Data Anda terlindungi oleh enkripsi GradeMaster OS\n            </p>\n          </div>'
# Ensure we capture it exactly to replace
import re
pattern = re.compile(re.escape(old_block_start) + r'.*?' + re.escape(old_block_end), re.DOTALL)
content = pattern.sub(hero_replace, content)

with open(path, 'w') as f:
    f.write(content)

print("Updated StudentLoginLayer.tsx")
