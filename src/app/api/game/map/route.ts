import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

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
    } catch {}
    return NextResponse.json({ error: 'Gagal membaca data peta' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const updatedMap = await req.json();

    if (!updatedMap || !Array.isArray(updatedMap.layers)) {
      return NextResponse.json({ error: 'Format data peta tidak valid: layers wajib berupa array' }, { status: 400 });
    }

    const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

    // 1. Save to Supabase Cloud Database (requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS)
    let dbSuccess = false;
    let dbErrorMsg = '';
    if (hasServiceKey) {
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
          dbErrorMsg = dbErr.message;
          console.warn('[POST /api/game/map] Database upsert error:', dbErr.code, dbErr.message, dbErr.details);
        } else {
          dbSuccess = true;
        }
      } catch (dbEx) {
        dbErrorMsg = dbEx instanceof Error ? dbEx.message : String(dbEx);
        console.warn('[POST /api/game/map] Database exception:', dbEx);
      }
    } else {
      dbErrorMsg = 'SUPABASE_SERVICE_ROLE_KEY tidak dikonfigurasi di environment ini';
      console.warn('[POST /api/game/map]', dbErrorMsg);
    }

    // 1b. Fallback: Try with authenticated session cookie client if admin client couldn't write
    if (!dbSuccess) {
      try {
        const serverClient = await createServerClient();
        const { error: cookieDbErr } = await serverClient
          .from('gm_behavior_settings')
          .upsert(
            {
              class_name: 'GAME_MAP_SCHOOL',
              academic_year: 'CONFIG',
              reasons: updatedMap,
            },
            { onConflict: 'class_name,academic_year' }
          );
        if (!cookieDbErr) {
          dbSuccess = true;
          dbErrorMsg = '';
        }
      } catch {}
    }

    // 2. Best-effort write to local filesystem (works in local dev, skipped in serverless read-only)
    let fsSuccess = false;
    try {
      const formattedContent = JSON.stringify(updatedMap, null, 2);
      fs.writeFileSync(MAP_PATH_1, formattedContent, 'utf-8');
      fsSuccess = true;

      const dir2 = path.dirname(MAP_PATH_2);
      if (fs.existsSync(dir2)) {
        fs.writeFileSync(MAP_PATH_2, formattedContent, 'utf-8');
      }
    } catch {
      console.info('[POST /api/game/map] Filesystem write tidak tersedia (read-only/serverless).');
    }

    // 3. If both fail: return 200 with embedded map data so editor can offer a local download fallback
    if (!dbSuccess && !fsSuccess) {
      console.error('[POST /api/game/map] Both DB and FS writes failed. DB error:', dbErrorMsg);
      return NextResponse.json(
        {
          success: false,
          warning: true,
          message: 'Peta tidak dapat disimpan ke server. Unduh dan simpan file JSON secara manual.',
          dbError: dbErrorMsg,
          mapData: updatedMap,
          timestamp: new Date().toISOString(),
        },
        // Return 200 so the editor can still handle the response gracefully
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: dbSuccess
        ? 'Peta sekolah dan collider berhasil disimpan ke Cloud Database!'
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
