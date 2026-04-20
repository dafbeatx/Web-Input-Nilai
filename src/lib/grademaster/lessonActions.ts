import { supabase } from '@/lib/supabase/client';
import { DailyLesson, Quiz } from './types';

/**
 * GRADEMASTER OS - Lesson Management Actions
 * Handles data persistence and AI interaction placeholders.
 */

export const fetchLessonsByClass = async (className: string): Promise<DailyLesson[]> => {
  const { data, error } = await supabase
    .from('daily_lessons')
    .select('*')
    .eq('class_name', className)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createLesson = async (lesson: Partial<DailyLesson>) => {
  const { data, error } = await supabase
    .from('daily_lessons')
    .insert([lesson])
    .select();

  if (error) throw error;
  return data?.[0];
};

export const publishLesson = async (lessonId: string) => {
  const { data, error } = await supabase
    .from('daily_lessons')
    .update({ is_published: true })
    .eq('id', lessonId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Placeholder for Gemini AI Lesson Generation.
 * This should eventually call a Supabase Edge Function or direct Gemini API.
 */
export const generateAILessonContent = async (material: string, subject: string) => {
  // Simulate AI Processing
  // In reality, you'd fetch from /api/ai/generate
  console.log(`Generating AI lesson for ${subject} with content length: ${material.length}`);
  
  return {
    preview: `Berhasil merangkum materi ${subject}. Fokus utama: Implementasi dan Pemahaman Konsep Dasar.`,
    chatPrompt: `Halo! Saya asisten AI. Hari ini kita bahas ${subject}. Apa yang ingin kamu tanyakan?`,
    questions: [
      { text: "Jelaskan konsep utama dari materi ini!", type: 'essay' },
      { text: "Apa hubungan antara variabel X dan Y?", type: 'mcq', options: ['A', 'B', 'C', 'D'], answer: 'B' }
    ]
  };
};
