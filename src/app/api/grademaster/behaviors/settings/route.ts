import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');
    const academicYear = searchParams.get('year');

    if (!className || !academicYear) {
      return NextResponse.json({ error: 'Data kelas dan tahun ajaran wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gm_behavior_settings')
      .select('reasons')
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 means not found, which is fine
    return NextResponse.json({ settings: data || null });
  } catch (err: any) {
    console.error('Fetch behavior settings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`behavior_settings_post:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { className, academicYear, reasons } = body;

    if (!className || !academicYear || !reasons) {
      return NextResponse.json({ error: 'Data kelas, tahun ajaran, dan alasan wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gm_behavior_settings')
      .upsert({ class_name: className, academic_year: academicYear, reasons }, { onConflict: 'class_name, academic_year' })
      .select();

    if (error) throw error;
    return NextResponse.json({ message: 'Pengaturan perilaku berhasil disimpan', data });
  } catch (err: any) {
    console.error('Save behavior settings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
