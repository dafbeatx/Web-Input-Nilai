import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeSessionSimilarity } from '@/lib/grademaster/services/similarity.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
      const supabase = await createClient();
    const { id: sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID wajib disertakan' }, { status: 400 });
    }

    // Lakukan analisa similarity (O(N^2) pairing) dan simpan hasilnya
    const result = await analyzeSessionSimilarity(sessionId);

    return NextResponse.json({
      message: 'Analisis kemiripan jawaban berhasil dijalankan',
      count: result.reports.length,
      reports: result.reports,
      metadata: result.metadata
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal';
    console.error('Similarity detection error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
      const supabase = await createClient();
    const { id: sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID wajib disertakan' }, { status: 400 });
    }

    // Hanya mereturn data dari DB tanpa menghitung ulang
    const { data, error } = await supabase
      .from('gm_similarity_reports')
      .select('*')
      .eq('session_id', sessionId)
      .order('final_score', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reports: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal';
    console.error('Fetch similarity error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
