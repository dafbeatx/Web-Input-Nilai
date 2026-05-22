import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, exam_type, academic_year, timer, questions, answer_keys } = body;

    if (!subject || !exam_type || !academic_year || !timer) {
      return NextResponse.json({ error: 'Data tidak lengkap. Subject, jenis ujian, tahun ajaran, dan durasi wajib diisi.' }, { status: 400 });
    }

    if (!Array.isArray(questions) || !Array.isArray(answer_keys)) {
      return NextResponse.json({ error: 'Format soal atau jawaban tidak valid.' }, { status: 400 });
    }

    // 1. Ambil semua sesi ujian yang sesuai dengan kriteria
    const { data: sessions, error: fetchError } = await supabaseAdmin
      .from('gm_sessions')
      .select('id, scoring_config')
      .eq('subject', subject)
      .eq('exam_type', exam_type)
      .eq('academic_year', academic_year);

    if (fetchError) {
      throw fetchError;
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: `Tidak ditemukan sesi ujian untuk mata pelajaran ${subject} (${exam_type}) pada tahun ${academic_year}.` }, { status: 404 });
    }

    // 2. Lakukan update massal pada setiap sesi
    const updatePromises = sessions.map(async (session) => {
      let config = session.scoring_config;
      if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch(e) { config = {}; }
      }
      if (!config || typeof config !== 'object') config = {};

      const newConfig = {
        ...config,
        remedialQuestions: questions,
        remedialAnswerKeys: answer_keys
      };

      return supabaseAdmin
        .from('gm_sessions')
        .update({ 
          remedial_timer: timer,
          scoring_config: newConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id);
    });

    const results = await Promise.all(updatePromises);
    const failedUpdates = results.filter(r => r.error);

    if (failedUpdates.length > 0) {
      return NextResponse.json({ error: `Berhasil mengupdate beberapa kelas, namun gagal pada ${failedUpdates.length} kelas.` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil menerapkan pengaturan remedial ke ${sessions.length} kelas.`,
      updatedCount: sessions.length
    });

  } catch (err: any) {
    console.error('Bulk update remedial error:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
