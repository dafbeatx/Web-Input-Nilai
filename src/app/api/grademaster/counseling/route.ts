import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CounselingRecord } from '@/types/counseling';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nisn = searchParams.get('nisn');
    const studentName = searchParams.get('student_name') || searchParams.get('studentName');
    const className = searchParams.get('class_name') || searchParams.get('className');
    const studentId = searchParams.get('student_id') || searchParams.get('studentId');

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable', records: [] }, { status: 500 });
    }

    let query = supabase
      .from('counseling_records')
      .select('*')
      .eq('visibility', 'PUBLIC_STUDENT')
      .order('counseling_date', { ascending: false });

    if (nisn && nisn.trim()) {
      query = query.eq('student_nisn', nisn.trim());
    } else if (studentId && studentId.trim()) {
      query = query.eq('student_id', studentId.trim());
    } else if (studentName && studentName.trim()) {
      query = query.ilike('student_name', `%${studentName.trim()}%`);
      if (className && className.trim()) {
        query = query.eq('class_name', className.trim());
      }
    }

    const { data, error } = await query;

    if (error) {
      // Graceful fallback if table is not yet created in Supabase
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          records: [],
          tablePending: true,
          message: 'Tabel counseling_records belum dibuat di Supabase.',
        });
      }
      console.error('[API Counseling] Query error:', error);
      return NextResponse.json({ success: false, error: error.message, records: [] }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      records: (data as CounselingRecord[]) || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API Counseling] Server exception:', err);
    return NextResponse.json({ success: false, error: msg, records: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const record: Partial<CounselingRecord> = body.record || body;

    if (!record.student_name || !record.class_name || !record.counselor_name || !record.topic || !record.action_taken) {
      return NextResponse.json(
        { success: false, error: 'Field student_name, class_name, counselor_name, topic, dan action_taken wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable' }, { status: 500 });
    }

    const payload = {
      ...record,
      synced_to_nawasena: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('counseling_records')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('[API Counseling] Upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Catatan bimbingan konseling berhasil disimpan / disinkronkan.',
      record: data,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API Counseling] POST exception:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

