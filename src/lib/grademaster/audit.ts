import { supabase } from '@/lib/supabase/client';

export type AuditActionType = 
  | 'UPDATE_GRADE' 
  | 'DELETE_STUDENT' 
  | 'INITIALIZE_BEHAVIORS' 
  | 'UPDATE_BEHAVIOR' 
  | 'DELETE_CLASS'
  | 'UPDATE_SESSION';

export interface AuditLogOptions {
  adminId: string;
  adminUsername: string;
  actionType: AuditActionType;
  entityType: 'STUDENT' | 'BEHAVIOR' | 'SESSION' | 'CLASS';
  entityId?: string;
  payload?: any;
  ipAddress?: string;
}

/**
 * Logs an administrative activity to the gm_audit_logs table.
 * Performed asynchronously to avoid blocking the main API response.
 */
export async function logActivity(options: AuditLogOptions) {
  try {
    const { error } = await supabase
      .from('gm_audit_logs')
      .insert({
        admin_id: options.adminId,
        admin_username: options.adminUsername,
        action_type: options.actionType,
        entity_type: options.entityType,
        entity_id: options.entityId,
        payload: options.payload || {},
        ip_address: options.ipAddress || 'unknown'
      });

    if (error) {
      console.error('[AUDIT LOG] Error inserting activity:', error);
    }
  } catch (err) {
    console.error('[AUDIT LOG] Unexpected error:', err);
  }
}
