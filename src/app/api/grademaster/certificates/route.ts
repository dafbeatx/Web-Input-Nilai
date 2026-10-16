export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/grademaster/security';

export interface CertificateTemplate {
  id?: string;
  cert_type: string;
  title: string;
  subtitle: string;
  cert_number_prefix: string;
  citation: string;
  description: string;
  city: string;
  issue_date: string;
  signer1_role: string;
  signer1_name: string;
  signer2_role: string;
  signer2_name: string;
  academic_year: string;
  target_class: string;
  is_published: boolean;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_LDKS_TEMPLATE: CertificateTemplate = {
  cert_type: 'LDKS',
  title: 'SERTIFIKAT PENGHARGAAN',
  subtitle: 'Latihan Dasar Kepemimpinan Siswa (LDKS)',
  cert_number_prefix: '042/LDKS-SMATAS/X/2026',
  citation: 'Diberikan dengan penuh hormat dan apresiasi kepada:',
  description: 'Atas partisipasi aktif, dedikasi, serta integritas tinggi dalam mengikuti dan menyelesaikan seluruh rangkaian kegiatan Latihan Dasar Kepemimpinan Siswa (LDKS) sebagai PESERTA.',
  city: 'Bogor',
  issue_date: '16 Oktober 2026',
  signer1_role: 'Ketua Panitia LDKS,',
  signer1_name: 'Ketua Panitia LDKS, S.Pd.',
  signer2_role: 'Kepala Sekolah,',
  signer2_name: 'Farhan Sopian Sahid, S.Pd.I',
  academic_year: '2026/2027',
  target_class: 'ALL_X',
  is_published: false,
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const certType = searchParams.get('type') || 'LDKS';

    const { data, error } = await supabaseAdmin
      .from('gm_certificate_templates')
      .select('*')
      .eq('cert_type', certType)
      .maybeSingle();

    if (error) {
      console.warn('[Certificate API] Table gm_certificate_templates might not exist yet, using default fallback:', error.message);
      return NextResponse.json({
        template: DEFAULT_LDKS_TEMPLATE,
        isFallback: true,
      });
    }

    if (!data) {
      return NextResponse.json({
        template: DEFAULT_LDKS_TEMPLATE,
        isFallback: false,
      });
    }

    return NextResponse.json({
      template: data,
      isFallback: false,
    });
  } catch (err) {
    console.error('[Certificate API] GET error:', err);
    return NextResponse.json({
      template: DEFAULT_LDKS_TEMPLATE,
      error: 'Terjadi kesalahan saat memuat template',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`cert_update:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan tunggu.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    const certType = body.cert_type || 'LDKS';
    const payload: Partial<CertificateTemplate> = {
      cert_type: certType,
      title: (body.title || 'SERTIFIKAT PENGHARGAAN').trim(),
      subtitle: (body.subtitle || 'Latihan Dasar Kepemimpinan Siswa (LDKS)').trim(),
      cert_number_prefix: (body.cert_number_prefix || '042/LDKS-SMATAS/X/2026').trim(),
      citation: (body.citation || 'Diberikan dengan penuh hormat dan apresiasi kepada:').trim(),
      description: (body.description || '').trim(),
      city: (body.city || 'Bogor').trim(),
      issue_date: (body.issue_date || '').trim(),
      signer1_role: (body.signer1_role || 'Ketua Panitia LDKS,').trim(),
      signer1_name: (body.signer1_name || '').trim(),
      signer2_role: (body.signer2_role || 'Kepala Sekolah,').trim(),
      signer2_name: (body.signer2_name || '').trim(),
      academic_year: (body.academic_year || '2026/2027').trim(),
      target_class: (body.target_class || 'ALL_X').trim(),
      is_published: !!body.is_published,
      published_at: body.is_published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('gm_certificate_templates')
      .upsert(payload, { onConflict: 'cert_type' })
      .select()
      .single();

    if (error) {
      console.error('[Certificate API] Error saving template to DB:', error);
      return NextResponse.json({
        error: `Gagal menyimpan template: ${error.message}. Pastikan migrasi database create_gm_certificates_table.sql telah dijalankan.`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: payload.is_published 
        ? 'Sertifikat berhasil diperbarui dan diterbitkan ke seluruh siswa!' 
        : 'Draf sertifikat berhasil disimpan.',
      template: data,
    });
  } catch (err) {
    console.error('[Certificate API] POST error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui sertifikat' }, { status: 500 });
  }
}
