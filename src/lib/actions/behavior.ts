'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Pure calculator: returns computed total_points from gm_behavior_logs.
 * Negative deltas = demerits/violations, positive deltas = appreciation.
 * Formula: sum(deltas). 
 * Note: If using demerit-only system (where violations are positive), 
 * this returns the total sum of demerits.
 * Does NOT write to DB — callers are responsible for persistence.
 */
async function computePointsFromLogs(studentId: string): Promise<number> {
  let logs: { points_delta?: number | null }[] | null = null;
  let error: unknown = null;

  try {
    const res = await supabaseAdmin
      .from('gm_behavior_logs')
      .select('points_delta')
      .eq('student_id', studentId);
    logs = res.data;
    error = res.error;
  } catch (err) {
    error = err;
  }

  if (error || !logs) {
    const supabase = await createClient();
    const res = await supabase
      .from('gm_behavior_logs')
      .select('points_delta')
      .eq('student_id', studentId);
    logs = res.data;
  }

  const deltaSum = (logs || []).reduce((sum: number, log: { points_delta?: number | null }) => sum + (log.points_delta || 0), 0);
  return deltaSum;
}

/**
 * Recomputes and persists total_points for a student based on their log history.
 * This is the ONLY function that should write total_points to gm_behaviors.
 * It must only be called after a behavior log INSERT/UPDATE/DELETE event.
 */
async function recomputeAndPersistPoints(studentId: string): Promise<number> {
  const total = await computePointsFromLogs(studentId);

  let updateError: unknown = null;
  try {
    const res = await supabaseAdmin
      .from('gm_behaviors')
      .update({ total_points: total, updated_at: new Date().toISOString() })
      .eq('id', studentId);
    updateError = res.error;
  } catch (err) {
    updateError = err;
  }

  if (updateError) {
    const supabase = await createClient();
    const res = await supabase
      .from('gm_behaviors')
      .update({ total_points: total, updated_at: new Date().toISOString() })
      .eq('id', studentId);
    if (res.error) throw res.error;
  }

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
  } catch (err: unknown) {
    console.error('Add behavior error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
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
  } catch (err: unknown) {
    console.error('Update behavior error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
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
  } catch (err: unknown) {
    console.error('Delete behavior error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetches all logs for a specific student.
 */
export async function getBehaviorLogsAction(studentId: string) {
  try {
    let client: SupabaseClient = supabaseAdmin;

    // 1. Dapatkan nama siswa dari gm_behaviors berdasarkan studentId
    let behRes = await client
      .from('gm_behaviors')
      .select('student_name')
      .eq('id', studentId)
      .maybeSingle();

    if (behRes.error && (behRes.error.message?.includes('Invalid API key') || behRes.error.code === 'PGRST301')) {
      client = await createClient();
      behRes = await client
        .from('gm_behaviors')
        .select('student_name')
        .eq('id', studentId)
        .maybeSingle();
    }

    let name = behRes.data?.student_name;

    // 2. Jika tidak ditemukan, coba cari di gm_student_accounts (apabila yang dikirim adalah ID akun)
    if (!name) {
      let accRes = await client
        .from('gm_student_accounts')
        .select('student_name')
        .eq('id', studentId)
        .maybeSingle();

      if (accRes.error && accRes.error.message?.includes('Invalid API key')) {
        client = await createClient();
        accRes = await client
          .from('gm_student_accounts')
          .select('student_name')
          .eq('id', studentId)
          .maybeSingle();
      }
      name = accRes.data?.student_name;
    }

    // 3. Jika nama siswa berhasil diidentifikasi, ambil semua ID perilaku miliknya lintas tahun ajaran/kelas
    if (name) {
      let allBehRes = await client
        .from('gm_behaviors')
        .select('id')
        .eq('student_name', name);

      if (allBehRes.error && allBehRes.error.message?.includes('Invalid API key')) {
        client = await createClient();
        allBehRes = await client
          .from('gm_behaviors')
          .select('id')
          .eq('student_name', name);
      }

      const behaviorIds = allBehRes.data?.map((b: { id: string }) => b.id) || [];
      if (behaviorIds.length > 0) {
        let logsRes = await client
          .from('gm_behavior_logs')
          .select('*')
          .in('student_id', behaviorIds)
          .order('violation_date', { ascending: false });

        if (logsRes.error && logsRes.error.message?.includes('Invalid API key')) {
          client = await createClient();
          logsRes = await client
            .from('gm_behavior_logs')
            .select('*')
            .in('student_id', behaviorIds)
            .order('violation_date', { ascending: false });
        }

        if (logsRes.error) throw logsRes.error;
        return { success: true, logs: logsRes.data || [] };
      }
    }

    // Fallback: Jika gagal menyelesaikan nama, kembalikan pencarian default ID saja
    let defaultRes = await client
      .from('gm_behavior_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('violation_date', { ascending: false });

    if (defaultRes.error && defaultRes.error.message?.includes('Invalid API key')) {
      client = await createClient();
      defaultRes = await client
        .from('gm_behavior_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('violation_date', { ascending: false });
    }

    if (defaultRes.error) throw defaultRes.error;
    return { success: true, logs: defaultRes.data || [] };
  } catch (err: unknown) {
    console.error('Fetch logs error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
