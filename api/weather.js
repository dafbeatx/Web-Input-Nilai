const { XMLParser } = require('fast-xml-parser');

module.exports = async function handler(request, response) {
  const { path } = request.query;
  const provinsi = path || 'Indonesia';
  
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
    if (!res.ok) throw new Error(`BMKG server returned ${res.status}`);
    const xmlData = await res.text();
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: ""
    });
    
    const jsonObj = parser.parse(xmlData);
    
    if (!jsonObj.data || !jsonObj.data.forecast || !jsonObj.data.forecast.area) {
        throw new Error("Invalid XML structure from BMKG");
    }

    const areas = jsonObj.data.forecast.area;
    const arrayAreas = Array.isArray(areas) ? areas : [areas];
    
    const transformedAreas = arrayAreas.map(area => {
      const findParam = (id) => {
        if (!area.parameter) return null;
        const params = Array.isArray(area.parameter) ? area.parameter : [area.parameter];
        const p = params.find(param => param.id === id);
        if (!p || !p.timerange) return null;
        
        const times = Array.isArray(p.timerange) ? p.timerange : [p.timerange];
        return {
          id: id,
          times: times.map(t => {
            const val = Array.isArray(t.value) ? t.value[0] : t.value;
            return {
                h: t.h,
                datetime: t.datetime,
                celcius: val && typeof val === 'object' ? (val['#text'] || val.find?.(v => v.unit === 'C')?.['#text']) : val,
                value: val && typeof val === 'object' ? val['#text'] : val,
                name: id === 'weather' ? getWeatherName(val && typeof val === 'object' ? val['#text'] : val) : null
            };
          })
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
    console.error("API Weather Error:", error);
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
  return weatherCodes[String(code)] || "Berawan";
}
