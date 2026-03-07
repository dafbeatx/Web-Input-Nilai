import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provinsi = searchParams.get('path') || 'dki-jakarta';
  
  const provinceMap: Record<string, string> = {
    'dki-jakarta': '31.71.01.1001',
    'jawa-barat': '32.73.04.1001',
    'jawa-tengah': '33.74.08.1006',
    'jawa-timur': '35.78.18.1003',
    'di-yogyakarta': '34.71.04.1004',
    'banten': '36.73.01.1004',
    'bali': '51.71.02.1005',
    'aceh': '11.71.03.1001',
    'sumatera-utara': '12.71.01.1001',
    'sumatera-barat': '13.71.01.1001',
    'sulawesi-selatan': '73.71.01.1001',
    'papua': '91.71.01.1001',
    'kalimantan-timur': '64.72.01.1001',
    'lampung': '18.71.01.1001',
    'riau': '14.71.01.1001',
    'sulawesi-utara': '71.71.01.1001',
  };

  const adm4 = provinceMap[provinsi.toLowerCase()] || provinceMap['dki-jakarta'];
  const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`BMKG server returned ${res.status}`);
    const data = await res.json();
    
    if (!data || !data.data || !data.data[0]) {
        throw new Error("No data found in BMKG response");
    }

    const weatherData = data.data[0];
    const result = {
      lokasi: data.lokasi,
      current: weatherData.cuaca && weatherData.cuaca[0] ? weatherData.cuaca[0][0] : null,
      forecast: weatherData.cuaca ? weatherData.cuaca.flat().slice(0, 12) : []
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
