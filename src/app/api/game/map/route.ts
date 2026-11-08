import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin, getSupabaseFallback } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAP_PATH_1 = path.join(process.cwd(), 'public', 'assets', 'maps', 'school_map.json');
const MAP_PATH_2 = path.join(process.cwd(), 'public', 'assets', 'game', 'maps', 'school_map.json');
const OUTSKIRTS_MAP_PATH = path.join(process.cwd(), 'public', 'assets', 'maps', 'outskirts_map.json');

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

async function getAvailableSupabaseClients(): Promise<SupabaseClient[]> {
  const clients: SupabaseClient[] = [];
  try {
    clients.push(supabaseAdmin);
  } catch {}
  try {
    clients.push(getSupabaseFallback());
  } catch {}
  try {
    const serverClient = await createServerClient();
    clients.push(serverClient);
  } catch {}
  return clients;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mapKey = url.searchParams.get('map') || 'school';
    const isOutskirts = mapKey === 'outskirts';

    const settingKey = isOutskirts ? 'game_outskirts_map' : 'game_school_map';
    const className = isOutskirts ? 'GAME_MAP_OUTSKIRTS' : 'GAME_MAP_SCHOOL';
    const fallbackPath = isOutskirts ? OUTSKIRTS_MAP_PATH : MAP_PATH_1;

    const clients = await getAvailableSupabaseClients();

    // 1. Primary Cloud Storage: system_settings
    for (const client of clients) {
      try {
        const { data, error } = await client
          .from('system_settings')
          .select('value')
          .eq('key', settingKey)
          .maybeSingle();

        if (!error && data?.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (parsed && Array.isArray(parsed.layers) && parsed.layers.length > 0) {
            return NextResponse.json(parsed, { headers: NO_CACHE_HEADERS });
          }
        }
      } catch {}
    }

    // 2. Secondary Cloud Storage: gm_behavior_settings
    for (const client of clients) {
      try {
        const { data: cloudConfig, error: cloudErr } = await client
          .from('gm_behavior_settings')
          .select('reasons')
          .eq('class_name', className)
          .eq('academic_year', 'CONFIG')
          .maybeSingle();

        if (!cloudErr && cloudConfig?.reasons && typeof cloudConfig.reasons === 'object') {
          const reasonsObj = cloudConfig.reasons as { layers?: unknown[] };
          if (Array.isArray(reasonsObj.layers) && reasonsObj.layers.length > 0) {
            return NextResponse.json(reasonsObj, { headers: NO_CACHE_HEADERS });
          }
        }
      } catch {}
    }

    // 3. Fallback to local file system
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, 'utf-8');
      const data = JSON.parse(content);
      return NextResponse.json(data, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ error: 'Berkas peta tidak ditemukan' }, { status: 404, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('API Error [GET /api/game/map]:', error);
    return NextResponse.json({ error: 'Gagal membaca data peta' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const updatedMap = await req.json();

    if (!updatedMap || !Array.isArray(updatedMap.layers)) {
      return NextResponse.json(
        { error: 'Format data peta tidak valid: layers wajib berupa array' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const url = new URL(req.url);
    const mapKey = updatedMap.mapKey || updatedMap.mapId || url.searchParams.get('map') || 'school';
    const isOutskirts = mapKey === 'outskirts';

    const settingKey = isOutskirts ? 'game_outskirts_map' : 'game_school_map';
    const className = isOutskirts ? 'GAME_MAP_OUTSKIRTS' : 'GAME_MAP_SCHOOL';
    const targetFilePath = isOutskirts ? OUTSKIRTS_MAP_PATH : MAP_PATH_1;

    const clients = await getAvailableSupabaseClients();
    const mapJsonString = JSON.stringify(updatedMap);

    // 1. Primary Save: system_settings table
    let sysSaved = false;
    for (const client of clients) {
      try {
        const { error } = await client.from('system_settings').upsert({
          key: settingKey,
          value: mapJsonString,
          description: isOutskirts
            ? 'Peta Kawasan Agrowisata P5 (collision, interact, spawn layers)'
            : 'Peta virtual campus SMP Al-Ittihadiyah (collision, interact, spawn layers)',
        });
        if (!error) {
          sysSaved = true;
          break;
        }
      } catch {}
    }

    // 2. Secondary Save: gm_behavior_settings table
    let gmSaved = false;
    for (const client of clients) {
      try {
        const { error } = await client
          .from('gm_behavior_settings')
          .upsert(
            {
              class_name: className,
              academic_year: 'CONFIG',
              reasons: updatedMap,
            },
            { onConflict: 'class_name,academic_year' }
          );
        if (!error) {
          gmSaved = true;
          break;
        }
      } catch {}
    }

    // 3. Best-effort write to local filesystem
    let fsSuccess = false;
    try {
      const formattedContent = JSON.stringify(updatedMap, null, 2);
      fs.writeFileSync(targetFilePath, formattedContent, 'utf-8');
      fsSuccess = true;

      if (!isOutskirts) {
        const dir2 = path.dirname(MAP_PATH_2);
        if (fs.existsSync(dir2)) {
          fs.writeFileSync(MAP_PATH_2, formattedContent, 'utf-8');
        }
      }
    } catch {
      console.info('[POST /api/game/map] Filesystem write tidak tersedia (read-only/serverless).');
    }

    // Extract statistics
    const collLayer = updatedMap.layers?.find((l: { name?: string }) => l?.name === 'Collision');
    const interactLayer = updatedMap.layers?.find((l: { name?: string }) => l?.name === 'Interact');
    const spawnLayer = updatedMap.layers?.find((l: { name?: string }) => l?.name === 'Spawn');

    const counts = {
      collision: Array.isArray(collLayer?.objects) ? collLayer.objects.length : 0,
      interact: Array.isArray(interactLayer?.objects) ? interactLayer.objects.length : 0,
      spawn: Array.isArray(spawnLayer?.objects) ? spawnLayer.objects.length : 0,
    };

    // If all write targets failed:
    if (!sysSaved && !gmSaved && !fsSuccess) {
      console.error('[POST /api/game/map] Gagal menulis ke database maupun filesystem.');
      return NextResponse.json(
        {
          success: false,
          warning: true,
          message: 'Peta tidak dapat disimpan ke server. Unduh dan simpan file JSON secara manual.',
          objectCount: counts,
          mapData: updatedMap,
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Peta berhasil disimpan! (${counts.collision} collider, ${counts.interact} zona)`,
        storage: {
          systemSettings: sysSaved,
          gmBehavior: gmSaved,
          filesystem: fsSuccess,
        },
        objectCount: counts,
        timestamp: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('API Error [POST /api/game/map]:', error);
    const msg = error instanceof Error ? error.message : 'Gagal menyimpan perubahan peta';
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
