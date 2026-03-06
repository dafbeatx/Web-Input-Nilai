module.exports = async function handler(request, response) {
  const { path } = request.query;
  const provinsi = path || 'dki-jakarta';
  
  // Mapping representative adm4 (village/sub-district) codes for each province
  // Using capital city areas for stability
  const provinceMap = {
    'dki-jakarta': '31.71.01.1001', // Gambir, Jakarta Pusat
    'jawa-barat': '32.73.04.1001', // Sumur Bandung, Bandung
    'jawa-tengah': '33.74.08.1006', // Mugassari, Semarang
    'jawa-timur': '35.78.18.1003', // Genteng, Surabaya
    'di-yogyakarta': '34.71.04.1004', // Sosromenduran, Yogyakarta
    'banten': '36.73.01.1004', // Kotabaru, Serang
    'bali': '51.71.02.1005', // Dangin Puri, Denpasar
    'aceh': '11.71.03.1001', // Baiturrahman, Banda Aceh
    'sumatera-utara': '12.71.01.1001', // Medan Kota
    'sumatera-barat': '13.71.01.1001', // Padang Barat
    'sulawesi-selatan': '73.71.01.1001', // Ujung Pandang, Makassar
    'papua': '91.71.01.1001', // Jayapura Utara
    'kalimantan-timur': '64.72.01.1001', // Samarinda Kota
    'lampung': '18.71.01.1001', // Tanjung Karang Pusat, Bandar Lampung
    'riau': '14.71.01.1001', // Senapelan, Pekanbaru
    'sulawesi-utara': '71.71.01.1001', // Wenang, Manado
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
    
    // Transform new JSON structure to match dashboard needs
    const result = {
      lokasi: data.lokasi,
      current: weatherData.cuaca && weatherData.cuaca[0] ? weatherData.cuaca[0][0] : null,
      forecast: weatherData.cuaca ? weatherData.cuaca.flat().slice(0, 12) : [] // Next 12 time slots
    };

    return response.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("API Weather Error:", error);
    return response.status(500).json({ success: false, message: error.message });
  }
}
