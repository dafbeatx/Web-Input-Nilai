module.exports = async function handler(request, response) {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
    const data = await res.json();
    
    const quake = data.Infogempa.gempa;
    
    // Transform to the structure expected by cuaca.js
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

    return response.status(200).json(transformed);
  } catch (error) {
    return response.status(500).json({ success: false, message: error.message });
  }
}
