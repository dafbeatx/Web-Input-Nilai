import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/grademaster/security';

interface SettingsCacheEntry {
  data: any;
  timestamp: number;
}
const settingsCache = new Map<string, SettingsCacheEntry>();
const SETTINGS_CACHE_TTL = 60000; // 60 seconds

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get('year') || '2026/2027';

    const now = Date.now();
    const cached = settingsCache.get(academicYear);
    if (cached && now - cached.timestamp < SETTINGS_CACHE_TTL) {
      return NextResponse.json({ settings: cached.data }, {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        }
      });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('gm_behavior_settings')
      .select('reasons')
      .eq('class_name', 'GLOBAL')
      .eq('academic_year', academicYear)
      .maybeSingle();

    if (error) throw error;

    let settings = data;
    if (!settings) {
      // Fallback: load the most recently configured academic year settings
      const { data: fallbackData } = await supabase
        .from('gm_behavior_settings')
        .select('reasons')
        .eq('class_name', 'GLOBAL')
        .order('academic_year', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallbackData) {
        settings = fallbackData;
      }
    }

    const finalResult = settings || null;
    settingsCache.set(academicYear, { data: finalResult, timestamp: now });

    return NextResponse.json({ settings: finalResult }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      }
    });
  } catch (err: unknown) {
    console.error('Fetch global behavior settings error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
      const supabase = await createClient();
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
    settingsCache.clear();
    return NextResponse.json({ message: 'Pengaturan perilaku global berhasil disimpan', data });
  } catch (err: unknown) {
    console.error('Save global behavior settings error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
