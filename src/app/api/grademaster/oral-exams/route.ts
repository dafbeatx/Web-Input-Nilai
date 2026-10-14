import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateOralPredicate, calculateChecklistScore, OralExamRecord } from '@/lib/grademaster/types';

function getCorsHeaders(req?: NextRequest) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-sync-key, x-api-key',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

function jsonResponse(data: unknown, status = 200, req?: NextRequest) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(req),
  });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');
    const className = searchParams.get('class_name');
    const academicYear = searchParams.get('academic_year');
    const templateType = searchParams.get('template_type');
    const studentId = searchParams.get('student_id');
    const studentName = searchParams.get('student_name');

    let query = supabaseAdmin
      .from('gm_oral_exams')
      .select('*')
      .order('student_name', { ascending: true });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    if (className) {
      query = query.eq('class_name', className);
    }
    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    if (templateType) {
      query = query.eq('template_type', templateType);
    }
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (studentName) {
      query = query.ilike('student_name', `%${studentName.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      // If table does not exist yet in Supabase, return graceful empty list with warning
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('[OralExams API] gm_oral_exams table not created yet in Supabase. Returning empty list.');
        return jsonResponse({
          success: true,
          data: [],
          tableNotMigrated: true,
          message: 'Tabel gm_oral_exams belum dibuat di database. Jalankan file sql/create_gm_oral_exams_table.sql di Supabase SQL Editor.'
        }, 200, req);
      }
      throw error;
    }

    return jsonResponse({
      success: true,
      data: data || [],
      count: data?.length || 0
    }, 200, req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil data ujian lisan';
    console.error('[OralExams GET error]:', err);
    return jsonResponse({ error: message }, 500, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawRecords: Partial<OralExamRecord>[] = Array.isArray(body?.records) 
      ? body.records 
      : body?.record 
        ? [body.record] 
        : [];

    if (rawRecords.length === 0) {
      return jsonResponse({ error: 'Data ujian lisan tidak boleh kosong' }, 400, req);
    }

    // Process and sanitize each record
    const processedRecords = rawRecords.map((r) => {
      const template = r.template_type || 'BTQ_HAFALAN';
      
      // Calculate BTQ & Hafalan
      const btqScore = r.btq_score !== undefined && r.btq_score !== null && !isNaN(Number(r.btq_score))
        ? Math.min(100, Math.max(0, Number(r.btq_score)))
        : null;
      const btqPredicate = r.btq_predicate || calculateOralPredicate(btqScore);

      const hafalanScore = r.hafalan_score !== undefined && r.hafalan_score !== null && !isNaN(Number(r.hafalan_score))
        ? Math.min(100, Math.max(0, Number(r.hafalan_score)))
        : null;
      const hafalanPredicate = r.hafalan_predicate || calculateOralPredicate(hafalanScore);

      // Calculate English Checklist
      const englishChecklist = Array.isArray(r.english_checklist) 
        ? r.english_checklist.slice(0, 15).map(Boolean)
        : null;
      const englishCorrectCount = englishChecklist 
        ? englishChecklist.filter(Boolean).length 
        : (typeof r.english_correct_count === 'number' ? r.english_correct_count : 0);
      const englishScore = englishChecklist 
        ? calculateChecklistScore(englishCorrectCount)
        : (r.english_score !== undefined && r.english_score !== null ? Number(r.english_score) : null);
      const englishPredicate = r.english_predicate || calculateOralPredicate(englishScore);

      // Calculate Arabic Checklist
      const arabicChecklist = Array.isArray(r.arabic_checklist) 
        ? r.arabic_checklist.slice(0, 15).map(Boolean)
        : null;
      const arabicCorrectCount = arabicChecklist 
        ? arabicChecklist.filter(Boolean).length 
        : (typeof r.arabic_correct_count === 'number' ? r.arabic_correct_count : 0);
      const arabicScore = arabicChecklist 
        ? calculateChecklistScore(arabicCorrectCount)
        : (r.arabic_score !== undefined && r.arabic_score !== null ? Number(r.arabic_score) : null);
      const arabicPredicate = r.arabic_predicate || calculateOralPredicate(arabicScore);

      return {
        session_id: String(r.session_id || '').trim(),
        template_type: template,
        title: String(r.title || 'Ujian Lisan').trim(),
        academic_year: String(r.academic_year || '2026/2027').trim(),
        semester: String(r.semester || 'Ganjil').trim(),
        examiner_name: String(r.examiner_name || 'Penguji Lisan').trim(),
        room_number: String(r.room_number || 'Ruang 01').trim(),
        class_name: String(r.class_name || '').trim(),
        exam_date: r.exam_date || new Date().toISOString().split('T')[0],
        student_id: String(r.student_id || '').trim(),
        student_name: String(r.student_name || '').trim(),
        nisn: r.nisn || null,
        btq_score: btqScore,
        btq_predicate: btqPredicate,
        hafalan_score: hafalanScore,
        hafalan_predicate: hafalanPredicate,
        english_checklist: englishChecklist,
        english_correct_count: englishCorrectCount,
        english_score: englishScore,
        english_predicate: englishPredicate,
        arabic_checklist: arabicChecklist,
        arabic_correct_count: arabicCorrectCount,
        arabic_score: arabicScore,
        arabic_predicate: arabicPredicate,
        notes: r.notes || null,
        updated_at: new Date().toISOString()
      };
    });

    // Validate essential keys
    for (const rec of processedRecords) {
      if (!rec.session_id) {
        return jsonResponse({ error: 'Session ID wajib diisi' }, 400, req);
      }
      if (!rec.student_id || !rec.student_name) {
        return jsonResponse({ error: 'Identitas siswa wajib diisi' }, 400, req);
      }
      if (!rec.class_name) {
        return jsonResponse({ error: 'Kelas wajib diisi' }, 400, req);
      }
    }

    // Try upsert first
    const { data: upsertData, error: upsertError } = await supabaseAdmin
      .from('gm_oral_exams')
      .upsert(processedRecords, { onConflict: 'session_id,student_id' })
      .select();

    if (upsertError) {
      // If table does not exist
      if (upsertError.code === '42P01' || upsertError.message?.includes('does not exist') || upsertError.message?.includes('schema cache')) {
        return jsonResponse({
          error: 'Tabel gm_oral_exams belum ada di database. Silakan jalankan sql/create_gm_oral_exams_table.sql di Supabase SQL Editor terlebih dahulu.'
        }, 500, req);
      }

      // Fallback: If unique constraint on (session_id, student_id) is not active yet, update or insert one by one
      console.warn('[OralExams Upsert Fallback] Attempting sequential record upsert:', upsertError.message);
      const results: OralExamRecord[] = [];
      for (const rec of processedRecords) {
        const { data: existing } = await supabaseAdmin
          .from('gm_oral_exams')
          .select('id')
          .eq('session_id', rec.session_id)
          .eq('student_id', rec.student_id)
          .maybeSingle();

        if (existing?.id) {
          const { data: updated, error: updateErr } = await supabaseAdmin
            .from('gm_oral_exams')
            .update(rec)
            .eq('id', existing.id)
            .select()
            .single();
          if (updateErr) throw updateErr;
          results.push(updated);
        } else {
          const { data: inserted, error: insertErr } = await supabaseAdmin
            .from('gm_oral_exams')
            .insert(rec)
            .select()
            .single();
          if (insertErr) throw insertErr;
          results.push(inserted);
        }
      }

      return jsonResponse({
        success: true,
        message: `Berhasil menyimpan ${results.length} data ujian lisan`,
        count: results.length,
        data: results
      }, 200, req);
    }

    return jsonResponse({
      success: true,
      message: `Berhasil menyimpan ${upsertData?.length || processedRecords.length} data ujian lisan`,
      count: upsertData?.length || processedRecords.length,
      data: upsertData
    }, 200, req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan nilai ujian lisan';
    console.error('[OralExams POST error]:', err);
    return jsonResponse({ error: message }, 500, req);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    const sessionId = searchParams.get('session_id');

    if (!id && !sessionId) {
      return jsonResponse({ error: 'Parameter id atau session_id wajib disertakan untuk menghapus' }, 400, req);
    }

    let query = supabaseAdmin.from('gm_oral_exams').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { error } = await query;
    if (error) throw error;

    return jsonResponse({
      success: true,
      message: 'Data ujian lisan berhasil dihapus'
    }, 200, req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus data ujian lisan';
    console.error('[OralExams DELETE error]:', err);
    return jsonResponse({ error: message }, 500, req);
  }
}
