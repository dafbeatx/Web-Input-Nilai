/**
 * Types untuk Modul Bimbingan Konseling (BK) Nawasena Platform Siswa
 * Sinkronisasi otomatis dari Smart-Absensi-Guru (Dual-Write)
 */

export type CounselingType =
  | 'INDIVIDUAL'
  | 'GROUP'
  | 'PARENT_CONFERENCE'
  | 'HOME_VISIT'
  | 'ACADEMIC_GUIDANCE'
  | 'BEHAVIOR_MEDIATION'
  | 'CAREER_INTEREST';

export type CounselingStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'MONITORING'
  | 'REFERRED';

export type CounselingUrgency = 'LOW' | 'MEDIUM' | 'HIGH';

export type CounselingVisibility = 'PUBLIC_STUDENT' | 'CONFIDENTIAL_STAFF';

export interface CounselingRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_nisn?: string | null;
  class_name: string;
  counselor_id?: string;
  counselor_name: string;
  counselor_npp?: string | null;
  counseling_date: string;
  counseling_time?: string | null;
  counseling_type: CounselingType;
  urgency: CounselingUrgency;
  status: CounselingStatus;
  visibility: CounselingVisibility;
  topic: string;
  background_narrative?: string | null;
  action_taken: string;
  student_commitment?: string | null;
  parent_involvement?: string | null;
  follow_up_plan?: string | null;
  follow_up_date?: string | null;
  academic_year?: string;
  semester?: 'GANJIL' | 'GENAP';
  synced_to_nawasena?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CounselingSummaryStats {
  total: number;
  resolved: number;
  inProgress: number;
  scheduled: number;
  monitoring: number;
}

