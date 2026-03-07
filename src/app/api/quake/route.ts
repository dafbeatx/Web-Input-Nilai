import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { cache: 'no-store' });
    const data = await res.json();
    
    const quake = data.Infogempa.gempa;
    
    const transformed = {
      success: true,
      data: {
        tanggal: quake.Tanggal,
        jam: quake.Jam,
        datetime: quake.DateTime,
        coordinates: quake.Coordinates,
        lintang: quake.Lintang,
        bujur: quake.Bujur,
        magnitude: quake.Magnitude,
        kedalaman: quake.Kedalaman,
        wilayah: quake.Wilayah,
        potensi: quake.Potensi,
        dirasakan: quake.Dirasakan,
        shakemap: `https://data.bmkg.go.id/DataMKG/TEWS/${quake.Shakemap}`
      }
    };

    return NextResponse.json(transformed);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
