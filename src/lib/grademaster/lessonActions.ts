import { supabase } from '@/lib/supabase/client';
import { DailyLesson } from './types';
import { extractYouTubeId, injectYouTubeTag } from './youtubeHelper';

/**
 * NAWASENA - LMS & Lesson Management Actions
 * Handles data persistence, YouTube video mapping, and AI interaction.
 */

const mapLessonWithVideo = (lesson: DailyLesson): DailyLesson => {
  const extractedId = extractYouTubeId(lesson.video_url || lesson.content);
  return {
    ...lesson,
    video_url: lesson.video_url || (extractedId ? `https://www.youtube.com/watch?v=${extractedId}` : undefined)
  };
};

export const fetchLessonsByClass = async (className: string): Promise<DailyLesson[]> => {
  const { data, error } = await supabase
    .from('daily_lessons')
    .select('*')
    .eq('class_name', className)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapLessonWithVideo);
};

export const createLesson = async (lesson: Partial<DailyLesson>) => {
  // Seamlessly store YouTube URL in content if video_url is present
  const videoUrl = lesson.video_url?.trim();
  const rawContent = lesson.content || '';
  const finalContent = videoUrl ? injectYouTubeTag(rawContent, videoUrl) : rawContent;

  const payload: Record<string, unknown> = {
    class_name: lesson.class_name,
    subject: lesson.subject,
    date: lesson.date || new Date().toISOString().split('T')[0],
    content: finalContent,
    ai_reading_preview: lesson.ai_reading_preview,
    ai_chat_prompt: lesson.ai_chat_prompt,
    is_published: lesson.is_published ?? false,
    academic_year: lesson.academic_year,
    semester: lesson.semester
  };

  // If videoUrl is provided, also try including video_url field if column exists
  if (videoUrl) {
    try {
      const { data, error } = await supabase
        .from('daily_lessons')
        .insert([{ ...payload, video_url: videoUrl }])
        .select();

      if (!error && data?.[0]) {
        return mapLessonWithVideo(data[0]);
      }
    } catch {
      // Column may not exist on remote yet, continue to fallback payload
    }
  }

  // Resilient fallback (stores in content cleanly)
  const { data, error } = await supabase
    .from('daily_lessons')
    .insert([payload])
    .select();

  if (error) throw error;
  return data?.[0] ? mapLessonWithVideo(data[0]) : undefined;
};

export const publishLesson = async (lessonId: string) => {
  const { data, error } = await supabase
    .from('daily_lessons')
    .update({ is_published: true })
    .eq('id', lessonId)
    .select();

  if (error) throw error;
  return data?.[0] ? mapLessonWithVideo(data[0]) : undefined;
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
  return (data || []).map(mapLessonWithVideo);
};

export const deleteLesson = async (lessonId: string) => {
  const { error } = await supabase
    .from('daily_lessons')
    .delete()
    .eq('id', lessonId);

  if (error) throw error;
  return true;
};
