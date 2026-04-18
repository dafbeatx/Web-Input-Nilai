import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: logs, error } = await supabase
      .from('gm_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error('Audit fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
