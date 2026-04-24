'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Pure calculator: returns computed total_points from gm_behavior_logs.
 * Negative deltas = demerits/violations, positive deltas = appreciation.
 * Formula: sum(deltas). 
 * Note: If using demerit-only system (where violations are positive), 
 * this returns the total sum of demerits.
 * Does NOT write to DB — callers are responsible for persistence.
 */
async function computePointsFromLogs(studentId: string): Promise<number> {
  const { data: logs, error } = await supabaseAdmin
    .from('gm_behavior_logs')
    .select('points_delta')
    .eq('student_id', studentId);

  if (error) throw error;

  const deltaSum = (logs || []).reduce((sum: number, log: any) => sum + (log.points_delta || 0), 0);
  return deltaSum;
}

/**
 * Recomputes and persists total_points for a student based on their log history.
 * This is the ONLY function that should write total_points to gm_behaviors.
 * It must only be called after a behavior log INSERT/UPDATE/DELETE event.
 */
async function recomputeAndPersistPoints(studentId: string): Promise<number> {
  const total = await computePointsFromLogs(studentId);

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

    const newTotal = await recomputeAndPersistPoints(formData.studentId);

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

    const newTotal = await recomputeAndPersistPoints(formData.studentId);

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

    const newTotal = await recomputeAndPersistPoints(studentId);

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
