import { supabase } from '@/lib/supabase/client';
import type { 
  CounselingRecord, 
  CounselingType, 
  CounselingStatus,
  CounselingSummaryStats 
} from '@/types/counseling';

export interface GetStudentCounselingParams {
  nisn?: string | null;
  studentName?: string | null;
  className?: string | null;
  studentId?: string | null;
}

/**
 * Mengambil catatan Bimbingan Konseling (BK) yang dipublikasikan untuk siswa/ortu.
 * Query langsung ke Supabase dengan fallback aman ke API route.
 */
export async function getStudentCounselingRecords(
  params: GetStudentCounselingParams
): Promise<CounselingRecord[]> {
  try {
    let query = supabase
      .from('counseling_records')
      .select('*')
      .eq('visibility', 'PUBLIC_STUDENT')
      .order('counseling_date', { ascending: false });

    if (params.nisn && params.nisn.trim()) {
      query = query.eq('student_nisn', params.nisn.trim());
    } else if (params.studentId && params.studentId.trim()) {
      query = query.eq('student_id', params.studentId.trim());
    } else if (params.studentName && params.studentName.trim()) {
      query = query.ilike('student_name', `%${params.studentName.trim()}%`);
      if (params.className && params.className.trim()) {
        query = query.eq('class_name', params.className.trim());
      }
    }

    const { data, error } = await query;

    if (error) {
      // If table does not exist or client RLS blocks, fallback to backend API route
      console.warn('[CounselingService] Direct Supabase query error, falling back to API:', error.message);
      return await fetchFromApiFallback(params);
    }

    return (data as CounselingRecord[]) || [];
  } catch (err) {
    console.warn('[CounselingService] Supabase exception, fallback to API:', err);
    return await fetchFromApiFallback(params);
  }
}

async function fetchFromApiFallback(params: GetStudentCounselingParams): Promise<CounselingRecord[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.nisn) searchParams.set('nisn', params.nisn);
    if (params.studentId) searchParams.set('student_id', params.studentId);
    if (params.studentName) searchParams.set('student_name', params.studentName);
    if (params.className) searchParams.set('class_name', params.className);

    const res = await fetch(`/api/grademaster/counseling?${searchParams.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.records || [];
  } catch (apiErr) {
    console.error('[CounselingService] API fallback failed:', apiErr);
    return [];
  }
}

/**
 * Realtime Listener untuk mendengarkan catatan BK baru / update dari Smart-Absensi-Guru
 */
export function subscribeToStudentCounseling(
  params: GetStudentCounselingParams,
  onUpdate: () => void
): () => void {
  try {
    const channelName = `counseling_realtime_${params.nisn || params.studentId || 'all'}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'counseling_records',
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn('[CounselingService] Realtime subscription init failed:', e);
    return () => {};
  }
}

/**
 * Menghitung ringkasan statistik catatan bimbingan konseling
 */
export function calculateCounselingStats(records: CounselingRecord[]): CounselingSummaryStats {
  return {
    total: records.length,
    resolved: records.filter(r => r.status === 'RESOLVED').length,
    inProgress: records.filter(r => r.status === 'IN_PROGRESS').length,
    scheduled: records.filter(r => r.status === 'SCHEDULED').length,
    monitoring: records.filter(r => r.status === 'MONITORING').length,
  };
}

/**
 * Label Bahasa Indonesia yang ramah untuk jenis bimbingan
 */
export function getCounselingTypeLabel(type: CounselingType): { label: string; icon: string; desc: string } {
  switch (type) {
    case 'ACADEMIC_GUIDANCE':
      return { label: 'Bimbingan Belajar', icon: 'BookOpen', desc: 'Konsultasi motivasi dan strategi peningkatan nilai akademik' };
    case 'INDIVIDUAL':
      return { label: 'Bimbingan Pribadi', icon: 'UserCheck', desc: 'Konseling empatik pengembangan diri dan kepercayaan diri' };
    case 'BEHAVIOR_MEDIATION':
      return { label: 'Mediasi & Karakter', icon: 'HeartHandshake', desc: 'Penguatan adab, interaksi teman sebaya, dan pembiasaan baik' };
    case 'CAREER_INTEREST':
      return { label: 'Peminatan & Bakat', icon: 'Compass', desc: 'Eksplorasi cita-cita, minat kejuruan, dan potensi siswa' };
    case 'PARENT_CONFERENCE':
      return { label: 'Konferensi Orang Tua', icon: 'Users', desc: 'Sinergi konsultasi bersama orang tua untuk pendampingan rumah' };
    case 'HOME_VISIT':
      return { label: 'Kunjungan Rumah', icon: 'Home', desc: 'Silaturahmi guru BK ke rumah siswa untuk dukungan belajar' };
    case 'GROUP':
      return { label: 'Bimbingan Kelompok', icon: 'Users2', desc: 'Diskusi kelompok terarah bertema kerjasama dan karakter' };
    default:
      return { label: 'Bimbingan Konseling', icon: 'MessageSquare', desc: 'Sesi pendampingan suportif bersama konselor sekolah' };
  }
}

/**
 * Label status dan badge warna yang suportif
 */
export function getCounselingStatusMeta(status: CounselingStatus): {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  switch (status) {
    case 'RESOLVED':
      return {
        label: 'Tuntas / Selesai',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-700',
        badgeBorder: 'border-emerald-200',
      };
    case 'IN_PROGRESS':
      return {
        label: 'Dalam Pendampingan',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-700',
        badgeBorder: 'border-amber-200',
      };
    case 'SCHEDULED':
      return {
        label: 'Terjadwal',
        badgeBg: 'bg-purple-50',
        badgeText: 'text-purple-700',
        badgeBorder: 'border-purple-200',
      };
    case 'MONITORING':
      return {
        label: 'Dalam Pemantauan',
        badgeBg: 'bg-cyan-50',
        badgeText: 'text-cyan-700',
        badgeBorder: 'border-cyan-200',
      };
    case 'REFERRED':
      return {
        label: 'Rujukan Khusus',
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-700',
        badgeBorder: 'border-rose-200',
      };
    default:
      return {
        label: 'Proses',
        badgeBg: 'bg-slate-50',
        badgeText: 'text-slate-700',
        badgeBorder: 'border-slate-200',
      };
  }
}

