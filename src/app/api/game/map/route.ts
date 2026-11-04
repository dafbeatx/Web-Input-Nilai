import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAP_PATH_1 = path.join(process.cwd(), 'public', 'assets', 'maps', 'school_map.json');
const MAP_PATH_2 = path.join(process.cwd(), 'public', 'assets', 'game', 'maps', 'school_map.json');

export async function GET() {
  try {
    // 1. Try reading from Supabase Cloud Database first (persistent across all environments)
    try {
      const { data: cloudConfig, error: cloudErr } = await supabaseAdmin
        .from('gm_behavior_settings')
        .select('reasons')
        .eq('class_name', 'GAME_MAP_SCHOOL')
        .maybeSingle();

      if (!cloudErr && cloudConfig?.reasons && typeof cloudConfig.reasons === 'object') {
        const reasonsObj = cloudConfig.reasons as { layers?: unknown[] };
        if (Array.isArray(reasonsObj.layers) && reasonsObj.layers.length > 0) {
          return NextResponse.json(reasonsObj, {
            headers: {
              'Cache-Control': 'no-store, max-age=0',
            },
          });
        }
      }
    } catch (cloudReadEx) {
      console.warn('[GET /api/game/map] Cloud read exception, falling back to local file:', cloudReadEx);
    }

    // 2. Fallback to local file system
    if (fs.existsSync(MAP_PATH_1)) {
      const content = fs.readFileSync(MAP_PATH_1, 'utf-8');
      const data = JSON.parse(content);
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    return NextResponse.json({ error: 'Berkas peta tidak ditemukan' }, { status: 404 });
  } catch (error) {
    console.error('API Error [GET /api/game/map]:', error);
    try {
      if (fs.existsSync(MAP_PATH_1)) {
        const content = fs.readFileSync(MAP_PATH_1, 'utf-8');
        return NextResponse.json(JSON.parse(content));
      }
    } catch (_) {}
    return NextResponse.json({ error: 'Gagal membaca data peta' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const updatedMap = await req.json();

    if (!updatedMap || !Array.isArray(updatedMap.layers)) {
      return NextResponse.json({ error: 'Format data peta tidak valid: layers wajib berupa array' }, { status: 400 });
    }

    // 1. Save to Supabase Cloud Database (Persistent across serverless, Vercel, Docker, & local)
    let dbSuccess = false;
    try {
      const { error: dbErr } = await supabaseAdmin
        .from('gm_behavior_settings')
        .upsert(
          {
            class_name: 'GAME_MAP_SCHOOL',
            academic_year: 'CONFIG',
            reasons: updatedMap,
          },
          { onConflict: 'class_name,academic_year' }
        );

      if (dbErr) {
        console.warn('[POST /api/game/map] Database upsert warning:', dbErr.message);
      } else {
        dbSuccess = true;
      }
    } catch (dbEx) {
      console.warn('[POST /api/game/map] Database exception:', dbEx);
    }

    // 2. Best-effort write to local filesystem (works in local dev, gracefully caught in serverless read-only)
    let fsSuccess = false;
    try {
      const formattedContent = JSON.stringify(updatedMap, null, 2);
      fs.writeFileSync(MAP_PATH_1, formattedContent, 'utf-8');
      fsSuccess = true;

      const dir2 = path.dirname(MAP_PATH_2);
      if (fs.existsSync(dir2)) {
        fs.writeFileSync(MAP_PATH_2, formattedContent, 'utf-8');
      }
    } catch (fsErr: unknown) {
      console.info('[POST /api/game/map] Filesystem write skipped or read-only, cloud database persistence used.');
    }

    if (!dbSuccess && !fsSuccess) {
      return NextResponse.json(
        { error: 'Gagal menyimpan perubahan peta ke database maupun filesystem' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: dbSuccess
        ? 'Peta sekolah dan collider berhasil disimpan ke Cloud Database & File System!'
        : 'Peta sekolah berhasil disimpan ke file lokal!',
      storage: { db: dbSuccess, filesystem: fsSuccess },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error [POST /api/game/map]:', error);
    const msg = error instanceof Error ? error.message : 'Gagal menyimpan perubahan peta';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
