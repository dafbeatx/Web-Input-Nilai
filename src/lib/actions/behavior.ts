'use server';

import { supabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';

/**
 * Adds a new behavior log entry and updates the student's total points.
 */
export async function addBehaviorAction(formData: {
  studentId: string;
  categoryId?: string;
  pointsDelta: number;
  reason: string;
  teacherId?: string;
}) {
  try {
    // Ensure negative behaviors subtract points even if positive value was passed
    // (Though the RPC handles this too for safety)
    const { data, error } = await supabase.rpc('add_behavior_log_entry', {
      p_student_id: formData.studentId,
      p_category_id: formData.categoryId || null,
      p_points_delta: formData.pointsDelta,
      p_reason: formData.reason,
      p_teacher_id: formData.teacherId || null
    });

    if (error) throw error;
    
    revalidatePath('/behavior');
    return { success: true, data };
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
}) {
  try {
    const { error: updateError } = await supabase
      .from('gm_behavior_logs')
      .update({
        points_delta: formData.pointsDelta,
        reason: formData.reason
      })
      .eq('id', logId);

    if (updateError) throw updateError;

    const { data: newTotal, error: rpcError } = await supabase.rpc('recompute_student_behavior_points', {
      p_student_id: formData.studentId
    });

    if (rpcError) throw rpcError;

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
    const { error: deleteError } = await supabase
      .from('gm_behavior_logs')
      .delete()
      .eq('id', logId);

    if (deleteError) throw deleteError;

    const { data: newTotal, error: rpcError } = await supabase.rpc('recompute_student_behavior_points', {
      p_student_id: studentId
    });

    if (rpcError) throw rpcError;

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
    const { data, error } = await supabase
      .from('gm_behavior_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, logs: data };
  } catch (err: any) {
    console.error('Fetch logs error:', err);
    return { success: false, error: err.message };
  }
}
