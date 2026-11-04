import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MAP_PATH_1 = path.join(process.cwd(), 'public', 'assets', 'maps', 'school_map.json');
const MAP_PATH_2 = path.join(process.cwd(), 'public', 'assets', 'game', 'maps', 'school_map.json');

export async function GET() {
  try {
    if (!fs.existsSync(MAP_PATH_1)) {
      return NextResponse.json({ error: 'Berkas peta tidak ditemukan' }, { status: 404 });
    }

    const content = fs.readFileSync(MAP_PATH_1, 'utf-8');
    const data = JSON.parse(content);

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error [GET /api/game/map]:', error);
    return NextResponse.json({ error: 'Gagal membaca data peta' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const updatedMap = await req.json();

    if (!updatedMap || !Array.isArray(updatedMap.layers)) {
      return NextResponse.json({ error: 'Format data peta tidak valid' }, { status: 400 });
    }

    const formattedContent = JSON.stringify(updatedMap, null, 2);

    // Save to primary map file
    fs.writeFileSync(MAP_PATH_1, formattedContent, 'utf-8');

    // Also sync to secondary game map file if directory exists
    const dir2 = path.dirname(MAP_PATH_2);
    if (fs.existsSync(dir2)) {
      fs.writeFileSync(MAP_PATH_2, formattedContent, 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: 'Peta sekolah dan collider berhasil diperbarui!',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error [POST /api/game/map]:', error);
    return NextResponse.json({ error: 'Gagal menyimpan perubahan peta' }, { status: 500 });
  }
}

