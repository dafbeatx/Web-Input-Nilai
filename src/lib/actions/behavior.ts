'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Internal helper: recalculates total_points from ALL logs (Demerit System: base 0, sum all deltas).
 * Uses admin client to bypass RLS.
 */
async function recomputePoints(studentId: string): Promise<number> {
  const { data: logs, error } = await supabaseAdmin
    .from('gm_behavior_logs')
    .select('points_delta')
    .eq('student_id', studentId);

  if (error) throw error;

  const total = (logs || []).reduce((sum: number, log: any) => sum + (log.points_delta || 0), 100);

  const { error: updateError } = await supabaseAdmin
    .from('gm_behaviors')
    .update({ total_points: total, updated_at: new Date().toISOString() })
    .eq('id', studentId);

  if (updateError) throw updateError;

  return total;
}

/**
 * Adds a new behavior log entry and updates the student's total points.
 */
export async function addBehaviorAction(formData: {
  studentId: string;
  categoryId?: string;
  pointsDelta: number;
  reason: string;
  teacherId?: string;
  violationDate?: string;
}) {
  try {
    const supabase = await createClient();
    const { error: insertError } = await supabase
      .from('gm_behavior_logs')
      .insert({
        student_id: formData.studentId,
        category_id: formData.categoryId || null,
        points_delta: formData.pointsDelta,
        reason: formData.reason,
        teacher_id: formData.teacherId || null,
        violation_date: formData.violationDate || new Date().toISOString()
      });

    if (insertError) throw insertError;

    const newTotal = await recomputePoints(formData.studentId);

    revalidatePath('/behavior');
    return { success: true, data: { new_total: newTotal } };
  } catch (err: any) {
    console.error('Add behavior error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Updates an existing behavior log and recalculates the student's total.
 */
export async function updateBehaviorAction(logId: string, formData: {
  pointsDelta: number;
  reason: string;
  studentId: string;
  violationDate?: string;
}) {
  try {
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('gm_behavior_logs')
      .update({
        points_delta: formData.pointsDelta,
        reason: formData.reason,
        violation_date: formData.violationDate
      })
      .eq('id', logId);

    if (updateError) throw updateError;

    const newTotal = await recomputePoints(formData.studentId);

    revalidatePath('/behavior');
    return { success: true, newTotal };
  } catch (err: any) {
    console.error('Update behavior error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a behavior log and recalculates the student's total.
 */
export async function deleteBehaviorAction(logId: string, studentId: string) {
  try {
    const supabase = await createClient();
    const { error: deleteError } = await supabase
      .from('gm_behavior_logs')
      .delete()
      .eq('id', logId);

    if (deleteError) throw deleteError;

    const newTotal = await recomputePoints(studentId);

    revalidatePath('/behavior');
    return { success: true, newTotal };
  } catch (err: any) {
    console.error('Delete behavior error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches all logs for a specific student.
 */
export async function getBehaviorLogsAction(studentId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('gm_behavior_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('violation_date', { ascending: false });

    if (error) throw error;
    return { success: true, logs: data };
  } catch (err: any) {
    console.error('Fetch logs error:', err);
    return { success: false, error: err.message };
  }
}
