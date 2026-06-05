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

export const generateAILessonContent = async (material: string, subject: string, mode: 'daily' | 'quiz' | 'notebook') => {
  console.log(`Generating AI lesson for ${subject} with mode: ${mode}, content length: ${material.length}`);
  
  const response = await fetch('/api/grademaster/lessons/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ material, subject, mode })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Gagal generate AI.');
  }

  return {
    preview: data.preview,
    chatPrompt: data.chatPrompt,
    questions: data.questions
  };
};

export const fetchAllLessons = async (): Promise<DailyLesson[]> => {
  const { data, error } = await supabase
    .from('daily_lessons')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteLesson = async (lessonId: string) => {
  const { error } = await supabase
    .from('daily_lessons')
    .delete()
    .eq('id', lessonId);

  if (error) throw error;
  return true;
};
