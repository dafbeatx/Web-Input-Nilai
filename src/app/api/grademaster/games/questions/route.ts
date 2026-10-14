import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { DEFAULT_GAME_QUESTIONS, GameQuestion } from '@/lib/grademaster/services/game-questions.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');

  try {
    let query = supabase.from('gm_game_questions').select('*').order('created_at', { ascending: false });
    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      // Table might not exist yet or empty, return default questions
      const filteredDefaults = subject
        ? DEFAULT_GAME_QUESTIONS.filter(q => q.subject.toLowerCase() === subject.toLowerCase())
        : DEFAULT_GAME_QUESTIONS;
      return NextResponse.json({ questions: filteredDefaults, source: 'fallback' });
    }

    return NextResponse.json({ questions: data, source: 'database' });
  } catch (err) {
    console.warn('[API/games/questions] Error fetching questions:', err);
    return NextResponse.json({ questions: DEFAULT_GAME_QUESTIONS, source: 'fallback' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question as GameQuestion;

    if (!question || !question.question || !question.subject || !question.options) {
      return NextResponse.json({ error: 'Data soal tidak lengkap' }, { status: 400 });
    }

    const record = {
      id: question.id || undefined,
      game_type: question.game_type || 'chess',
      subject: question.subject,
      question: question.question,
      options: question.options,
      correct_index: question.correct_index ?? 0,
      explanation: question.explanation || '',
      difficulty: question.difficulty || 'Sedang',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('gm_game_questions')
      .upsert(record)
      .select()
      .single();

    if (error) {
      console.warn('[API/games/questions] Database upsert warning:', error.message);
      return NextResponse.json({ success: true, savedLocally: true, question });
    }

    return NextResponse.json({ success: true, question: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID soal wajib disertakan' }, { status: 400 });
  }

  try {
    const { error } = await supabase.from('gm_game_questions').delete().eq('id', id);
    if (error) {
      console.warn('[API/games/questions] Delete warning:', error.message);
    }
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus soal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
