import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const studentName = searchParams.get('name');
    const academicYear = searchParams.get('year') || '2025/2026';

    if (!studentName) {
      return NextResponse.json({ error: 'Nama siswa wajib diisi' }, { status: 400 });
    }

    // 1. Fetch Attendance Stats
    const { data: attData, error: attError } = await supabase
      .from('gm_attendance')
      .select('status')
      .eq('student_name', studentName)
      .eq('academic_year', academicYear);

    if (attError) throw attError;

    const totalAttendance = attData?.length || 0;
    const presentCount = attData?.filter((a: any) => a.status === 'Hadir').length || 0;
    const attendancePercent = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;

    // 2. Fetch Academic History
    // We need to join gm_students with gm_sessions to get session names
    const { data: gradeData, error: gradeError } = await supabase
      .from('gm_students')
      .select(`
        final_score,
        session_id,
        gm_sessions (
          session_name,
          subject,
          kkm,
          academic_year,
          updated_at,
          created_at,
          scoring_config
        )
      `)
      .eq('name', studentName)
      .order('created_at', { ascending: false });

    if (gradeError) throw gradeError;

    const academicHistory = gradeData?.map((g: any) => {
      const isPassing = g.final_score >= (g.gm_sessions?.kkm || 70);
      const showRemedialButton = true;
      const hasQuestions = g.gm_sessions?.scoring_config?.remedialQuestions?.length > 0;
      
      return {
        sessionName: g.gm_sessions?.session_name || 'Ujian Tanpa Nama',
        subject: g.gm_sessions?.subject || 'Umum',
        score: g.final_score,
        kkm: g.gm_sessions?.kkm || 70,
        date: g.gm_sessions?.updated_at,
        isPassing,
        hasRemedialAvailable: !isPassing && showRemedialButton && hasQuestions
      };
    }) || [];

    // 3. Mock Documents (In real app, this might pull from a storage table)
    const documents = [
      { id: 'report-1', name: 'Laporan Progres Kelakuan', type: 'PDF', size: '1.2 MB', ready: true },
      { id: 'cert-1', name: 'Sertifikat Kedisiplinan', type: 'JPG', size: '2.4 MB', ready: academicHistory.length > 0 },
      { id: 'history-1', name: 'Rekap Nilai Tahunan', type: 'XLSX', size: '0.5 MB', ready: totalAttendance > 0 }
    ];

    return NextResponse.json({
      attendance: {
        percentage: attendancePercent,
        total: totalAttendance,
        present: presentCount
      },
      academicHistory,
      documents
    });
  } catch (err: any) {
    console.error('Student summary error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat ringkasan siswa' }, { status: 500 });
  }
}
