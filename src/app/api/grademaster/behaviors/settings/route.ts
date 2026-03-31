import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get('year') || '2025/2026';

    const { data, error } = await supabase
      .from('gm_behavior_settings')
      .select('reasons')
      .eq('class_name', 'GLOBAL')
      .eq('academic_year', academicYear)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ settings: data || null });
  } catch (err: any) {
    console.error('Fetch global behavior settings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`behavior_settings_post:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const { academicYear = '2025/2026', reasons } = await req.json();

    if (!reasons) {
      return NextResponse.json({ error: 'Alasan (reasons) wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gm_behavior_settings')
      .upsert({ 
        class_name: 'GLOBAL', 
        academic_year: academicYear, 
        reasons 
      }, { onConflict: 'class_name, academic_year' })
      .select();

    if (error) throw error;
    return NextResponse.json({ message: 'Pengaturan perilaku global berhasil disimpan', data });
  } catch (err: any) {
    console.error('Save global behavior settings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
