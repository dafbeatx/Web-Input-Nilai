import { XMLParser } from 'fast-xml-parser';

export default async function handler(request, response) {
  const { path } = request.query;
  const provinsi = path || 'Indonesia';
  
  // Map provincial names to BMKG XML filenames
  const provinceMap = {
    'dki-jakarta': 'DKIJakarta',
    'jawa-barat': 'JawaBarat',
    'jawa-tengah': 'JawaTengah',
    'jawa-timur': 'JawaTimur',
    'di-yogyakarta': 'DIYogyakarta',
    'banten': 'Banten',
    'aceh': 'Aceh',
    'bali': 'Bali',
    'bangka-belitung': 'BangkaBelitung',
    'bengkulu': 'Bengkulu',
    'gorontalo': 'Gorontalo',
    'jambi': 'Jambi',
    'kalimantan-barat': 'KalimantanBarat',
    'kalimantan-selatan': 'KalimantanSelatan',
    'kalimantan-tengah': 'KalimantanTengah',
    'kalimantan-timur': 'KalimantanTimur',
    'kalimantan-utara': 'KalimantanUtara',
    'kepulauan-riau': 'KepulauanRiau',
    'lampung': 'Lampung',
    'maluku': 'Maluku',
    'maluku-utara': 'MalukuUtara',
    'nusa-tenggara-barat': 'NusaTenggaraBarat',
    'nusa-tenggara-timur': 'NusaTenggaraTimur',
    'papua': 'Papua',
    'papua-barat': 'PapuaBarat',
    'riau': 'Riau',
    'sulawesi-barat': 'SulawesiBarat',
    'sulawesi-selatan': 'SulawesiSelatan',
    'sulawesi-tengah': 'SulawesiTengah',
    'sulawesi-tenggara': 'SulawesiTenggara',
    'sulawesi-utara': 'SulawesiUtara',
    'sumatera-barat': 'SumateraBarat',
    'sumatera-selatan': 'SumateraSelatan',
    'sumatera-utara': 'SumateraUtara'
  };

  const fileName = provinceMap[provinsi.toLowerCase()] || 'Indonesia';
  const url = `https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/DigitalForecast-${fileName}.xml`;

  try {
    const res = await fetch(url);
    const xmlData = await res.text();
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: ""
    });
    
    const jsonObj = parser.parse(xmlData);
    const areas = jsonObj.data.forecast.area;
    
    // Transform to the structure expected by cuaca.js
    const transformedAreas = (Array.isArray(areas) ? areas : [areas]).map(area => {
      // Find relevant parameters
      const findParam = (id) => {
        const p = area.parameter.find(param => param.id === id);
        if (!p || !p.timerange) return null;
        const times = Array.isArray(p.timerange) ? p.timerange : [p.timerange];
        return {
          id: id,
          times: times.map(t => ({
            celcius: t.value && typeof t.value === 'object' ? t.value.find(v => v.unit === 'C')?.['#text'] : t.value,
            value: Array.isArray(t.value) ? t.value[0]?.['#text'] : t.value,
            name: getWeatherName(Array.isArray(t.value) ? t.value[0]?.['#text'] : t.value)
          }))
        };
      };

      return {
        description: area.description,
        params: [
          findParam('t'),
          findParam('hu'),
          findParam('weather')
        ].filter(p => p !== null)
      };
    });

    return response.status(200).json({
      success: true,
      data: {
        areas: transformedAreas
      }
    });
  } catch (error) {
    return response.status(500).json({ success: false, message: error.message });
  }
}

function getWeatherName(code) {
  const weatherCodes = {
    "0": "Cerah",
    "1": "Cerah Berawan",
    "2": "Cerah Berawan",
    "3": "Berawan",
    "4": "Berawan Tebal",
    "5": "Udara Kabur",
    "10": "Asap",
    "45": "Kabut",
    "60": "Hujan Ringan",
    "61": "Hujan Sedang",
    "63": "Hujan Lebat",
    "80": "Hujan Lokal",
    "95": "Hujan Petir",
    "97": "Hujan Petir"
  };
  return weatherCodes[code] || "Berawan";
}
