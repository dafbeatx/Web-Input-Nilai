import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    // 1. Safe JSON parsing of request body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Format data JSON tidak valid.' }, { status: 400 });
    }

    const { subject, exam_type, academic_year, timer, questions, answer_keys, deadline } = body;

    // 2. Strict existence check (timer = 0 is valid)
    if (!subject || !exam_type || !academic_year || timer === undefined || timer === null) {
      return NextResponse.json({ error: 'Data tidak lengkap. Subject, jenis ujian, tahun ajaran, dan durasi wajib diisi.' }, { status: 400 });
    }

    // 3. Strict type validation
    if (
      typeof subject !== 'string' || 
      typeof exam_type !== 'string' || 
      typeof academic_year !== 'string' || 
      typeof timer !== 'number' || 
      isNaN(timer) || 
      timer < 0
    ) {
      return NextResponse.json({ error: 'Tipe data parameter tidak valid atau tidak aman.' }, { status: 400 });
    }

    if (!Array.isArray(questions) || !Array.isArray(answer_keys)) {
      return NextResponse.json({ error: 'Format soal atau jawaban tidak valid.' }, { status: 400 });
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: 'Jumlah soal tidak boleh kosong.' }, { status: 400 });
    }

    if (questions.length !== answer_keys.length) {
      return NextResponse.json({ error: 'Jumlah soal dan jumlah kunci jawaban harus sama persis.' }, { status: 400 });
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
        remedialAnswerKeys: answer_keys,
        ...(deadline !== undefined ? { remedialDeadline: deadline } : {})
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

    const results = await Promise.allSettled(updatePromises);
    const failedUpdates = results.filter(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
    );

    if (failedUpdates.length > 0) {
      // Log details of failures for diagnostic visibility
      failedUpdates.forEach(f => {
        if (f.status === 'rejected') {
          console.error('[Bulk Remedial Update Rejected]:', f.reason);
        } else {
          console.error('[Bulk Remedial Update DB Error]:', f.value.error);
        }
      });

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
