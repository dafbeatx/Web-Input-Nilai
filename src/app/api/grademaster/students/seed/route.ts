import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateStudentResult } from '@/lib/grademaster/scoring';
import { ScoringConfig, DEFAULT_SCORING_CONFIG } from '@/lib/grademaster/types';
import { getAdminSession } from '@/lib/grademaster/admin';

const MOCK_NAMES = [
  "Budi Santoso", "Siti Aminah", "Joko Widodo", "Rina Susanti", "Aditya Wijaya",
  "Lina Marlina", "Rizky Ramadhan", "Dewi Lestari", "Andi Pratama", "Maya Putri",
  "Hendra Wijaya", "Ani Suryani", "Bambang Pamungkas", "Eka Putri", "Fajar Ramadhan",
  "Gita Gutawa", "Indra Bruggman", "Julia Perez", "Kevin Julio", "Luna Maya"
];

const OPTIONS = ['A', 'B', 'C', 'D'];

export async function POST(req: NextRequest) {
  try {
      const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Admin session required' }, { status: 403 });
    }

    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID wajib diisi' }, { status: 400 });
    }

    const { data: session, error: sessError } = await supabase
      .from('gm_sessions')
      .select('answer_key, scoring_config, is_demo, remedial_essay_count')
      .eq('id', sessionId)
      .single();

    if (sessError || !session) {
      console.error('[POST Seed] Session not found:', sessError);
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    if (!session.is_demo) {
      return NextResponse.json({ error: 'Hanya bisa digunakan pada mode demo' }, { status: 403 });
    }

    const answerKey = session.answer_key as string[] || [];
    const scoringConfig = (session.scoring_config as any) || DEFAULT_SCORING_CONFIG;
    
    const count = Math.floor(Math.random() * 7) + 12;
    const shuffled = [...MOCK_NAMES].sort(() => 0.5 - Math.random());
    const selectedNames = shuffled.slice(0, count);

    const studentsToInsert: any[] = [];
    const allAnswers: any[] = [];

    for (const name of selectedNames) {
      const studentId = crypto.randomUUID();
      const studentAnswers: Record<number, string> = {};
      const performanceFactor = Math.random(); 
      
      answerKey.forEach((ans, idx) => {
        const qNum = idx + 1;
        if (Math.random() < (0.3 + performanceFactor * 0.6)) {
          studentAnswers[qNum] = ans; 
        } else {
          studentAnswers[qNum] = OPTIONS[Math.floor(Math.random() * OPTIONS.length)];
        }
      });

      const essayCount = session.remedial_essay_count || scoringConfig.essayCount || 5;
      const totalPotentialRaw = scoringConfig.essayMaxScore || 20;
      const pointsPerQuestion = totalPotentialRaw / essayCount;
      
      const essayScores = Array.from({ length: essayCount }, () => {
        const base = performanceFactor * pointsPerQuestion;
        const randomVariation = (Math.random() * 0.4 - 0.2) * pointsPerQuestion;
        return Math.max(0, Math.min(pointsPerQuestion, Math.round((base + randomVariation) * 10) / 10));
      });

      const result = calculateStudentResult(answerKey, studentAnswers, essayScores, scoringConfig);

      studentsToInsert.push({
        id: studentId,
        session_id: sessionId,
        name: name,
        mcq_answers: studentAnswers,
        essay_scores: essayScores,
        mcq_score: result.score,
        essay_score: result.essayScore,
        final_score: result.finalScore,
        csi: result.csi,
        lps: result.lps,
        correct: result.correct,
        wrong: result.wrong,
        original_score: result.finalScore,
      });

      Object.entries(studentAnswers).forEach(([qNum, selected]) => {
        allAnswers.push({
          student_id: studentId,
          question_number: parseInt(qNum),
          selected_answer: selected,
          is_correct: answerKey[parseInt(qNum) - 1] === selected,
        });
      });
    }

    const { error: insError } = await supabase.from('gm_students').insert(studentsToInsert);
    if (insError) {
      console.error('[POST Seed] Insert students error:', insError);
      throw insError;
    }

    if (allAnswers.length > 0) {
      const { error: ansError } = await supabase.from('gm_answers').insert(allAnswers);
      if (ansError) console.error('[POST Seed] Insert answers error:', ansError);
    }

    return NextResponse.json({ message: `Berhasil menanam ${selectedNames.length} data siswa!` });
  } catch (err: any) {
    console.error('Seeding critical failure:', err);
    return NextResponse.json({ error: err.message || 'Gagal menanam data' }, { status: 500 });
  }
}
