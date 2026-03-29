import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/grademaster/admin';
import { parseAdminCommand } from '@/lib/grademaster/services/admin-command-parser.service';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, sessionId } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Pesan perintah wajib diisi' }, { status: 400 });
    }

    const parsed = parseAdminCommand(message);

    if (parsed.action === 'UNKNOWN') {
      return NextResponse.json({
        parsed,
        executed: false,
        message: 'Perintah tidak dikenali. Contoh: "set nilai Ahmad jadi 80", "diskualifikasi Budi", "reset ujian Siti"'
      });
    }

    // If no sessionId, return parsed only (dry-run)
    if (!sessionId) {
      return NextResponse.json({
        parsed,
        executed: false,
        message: 'Perintah berhasil diparsing. Kirim sessionId untuk mengeksekusi.'
      });
    }

    let result: any = null;

    switch (parsed.action) {
      case 'SET_NILAI': {
        if (!parsed.params.user_id || parsed.params.nilai === undefined) {
          return NextResponse.json({ parsed, executed: false, message: 'Nama siswa atau nilai tidak lengkap' });
        }

        const { data: student } = await supabase
          .from('gm_students')
          .select('id, name, final_score')
          .eq('session_id', sessionId)
          .ilike('name', `%${parsed.params.user_id}%`)
          .eq('is_deleted', false)
          .limit(1)
          .single();

        if (!student) {
          return NextResponse.json({ parsed, executed: false, message: `Siswa "${parsed.params.user_id}" tidak ditemukan di sesi ini` });
        }

        const { error } = await supabase
          .from('gm_students')
          .update({
            final_score: parsed.params.nilai,
            remedial_status: 'NONE',
            remedial_score: 0,
            remedial_location: null,
            remedial_note: null,
            remedial_answers: null,
            is_cheated: false,
            cheating_flags: [],
            violation_count: 0,
            is_blocked: false,
            teacher_reviewed: true,
            final_score_locked: parsed.params.nilai
          })
          .eq('id', student.id);

        if (error) throw error;

        result = {
          studentName: student.name,
          previousScore: student.final_score,
          newScore: parsed.params.nilai,
        };
        break;
      }

      case 'SET_STATUS': {
        if (!parsed.params.user_id || !parsed.params.status) {
          return NextResponse.json({ parsed, executed: false, message: 'Nama siswa atau status tidak lengkap' });
        }

        const validStatuses = ['NONE', 'INITIATED', 'IN_PROGRESS', 'COMPLETED', 'CHEATED', 'TIMEOUT', 'BLOCKED', 'FAILED'];
        if (!validStatuses.includes(parsed.params.status)) {
          return NextResponse.json({ parsed, executed: false, message: `Status "${parsed.params.status}" tidak valid. Valid: ${validStatuses.join(', ')}` });
        }

        const { data: student } = await supabase
          .from('gm_students')
          .select('id, name, remedial_status')
          .eq('session_id', sessionId)
          .ilike('name', `%${parsed.params.user_id}%`)
          .eq('is_deleted', false)
          .limit(1)
          .single();

        if (!student) {
          return NextResponse.json({ parsed, executed: false, message: `Siswa "${parsed.params.user_id}" tidak ditemukan` });
        }

        const updateData: Record<string, any> = { remedial_status: parsed.params.status };
        if (parsed.params.status === 'CHEATED') {
          updateData.is_cheated = true;
        }
        if (parsed.params.status === 'BLOCKED') {
          updateData.is_blocked = true;
        }
        if (parsed.params.status === 'NONE') {
          updateData.is_cheated = false;
          updateData.is_blocked = false;
          updateData.violation_count = 0;
          updateData.cheating_flags = [];
        }

        const { error } = await supabase
          .from('gm_students')
          .update(updateData)
          .eq('id', student.id);

        if (error) throw error;

        result = {
          studentName: student.name,
          previousStatus: student.remedial_status,
          newStatus: parsed.params.status,
        };
        break;
      }

      case 'RESET_EXAM': {
        if (!parsed.params.user_id) {
          return NextResponse.json({ parsed, executed: false, message: 'Nama siswa tidak terdeteksi' });
        }

        const { data: student } = await supabase
          .from('gm_students')
          .select('id, name')
          .eq('session_id', sessionId)
          .ilike('name', `%${parsed.params.user_id}%`)
          .eq('is_deleted', false)
          .limit(1)
          .single();

        if (!student) {
          return NextResponse.json({ parsed, executed: false, message: `Siswa "${parsed.params.user_id}" tidak ditemukan` });
        }

        const { error: resetError } = await supabase
          .from('gm_students')
          .update({
            remedial_status: 'NONE',
            remedial_score: 0,
            remedial_location: null,
            remedial_note: null,
            remedial_answers: null,
            is_cheated: false,
            cheating_flags: [],
            violation_count: 0,
            is_blocked: false,
          })
          .eq('id', student.id);

        if (resetError) throw resetError;

        // Also clean up any active/initiated attempts
        await supabase
          .from('gm_remedial_attempts')
          .update({ status: 'CANCELLED' })
          .eq('student_id', student.id)
          .in('status', ['ACTIVE', 'INITIATED']);

        result = { studentName: student.name, message: 'Data remedial berhasil direset' };
        break;
      }

      case 'GET_USER': {
        if (!parsed.params.user_id) {
          return NextResponse.json({ parsed, executed: false, message: 'Nama siswa tidak terdeteksi' });
        }

        const { data: student } = await supabase
          .from('gm_students')
          .select('id, name, final_score, remedial_status, remedial_score, is_cheated, violation_count, is_blocked, cheating_flags, remedial_location')
          .eq('session_id', sessionId)
          .ilike('name', `%${parsed.params.user_id}%`)
          .eq('is_deleted', false)
          .limit(1)
          .single();

        if (!student) {
          return NextResponse.json({ parsed, executed: false, message: `Siswa "${parsed.params.user_id}" tidak ditemukan` });
        }

        result = student;
        break;
      }
    }

    return NextResponse.json({
      parsed,
      executed: true,
      result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengeksekusi perintah';
    console.error('Admin command error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
