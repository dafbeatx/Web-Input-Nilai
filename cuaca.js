/**
 * Cuaca & Gempa BMKG Module for GradeMaster OS
 * Using api from renomureza/cuaca-gempa-rest-api (BMKG Data)
 */

// Use relative URLs — Vercel rewrites will proxy these to the actual BMKG API
// This avoids CORS issues since requests stay on the same origin

// Elements
const quakePanel = document.getElementById('quake-panel');
const weatherPanel = document.getElementById('weather-panel');
const quakeDataContainer = document.getElementById('quake-data');
const weatherDataContainer = document.getElementById('weather-data');
const quakeLoader = document.getElementById('quake-loader');
const weatherLoader = document.getElementById('weather-loader');
const tabQuake = document.getElementById('tab-quake');
const tabWeather = document.getElementById('tab-weather');

/**
 * Initialize Weather & Quake App
 */
async function initWeatherApp() {
    // Default to quake tab
    switchWeatherTab('quake');
}

/**
 * Switch between Quake and Weather tabs
 */
function switchWeatherTab(tab) {
    const activeClass = 'flex-1 py-3.5 px-4 rounded-[1.2em] text-[11px] font-black uppercase tracking-[0.1em] transition-all bg-white text-slate-800 shadow-xl shadow-slate-200/50';
    const inactiveClass = 'flex-1 py-3.5 px-4 rounded-[1.2em] text-[11px] font-black uppercase tracking-[0.1em] transition-all text-slate-400 hover:text-slate-600';

    if (tab === 'quake') {
        tabQuake.className = activeClass;
        tabWeather.className = inactiveClass;
        quakePanel.classList.remove('hidden');
        weatherPanel.classList.add('hidden');
        fetchQuakeData();
    } else {
        tabWeather.className = activeClass;
        tabQuake.className = inactiveClass;
        weatherPanel.classList.remove('hidden');
        quakePanel.classList.add('hidden');
        const province = document.getElementById('provinceSelect').value;
        fetchWeatherData(province);
    }
}

/**
 * Fetch weather forecast data
 */
async function fetchWeatherData(provinsi) {
    if (!weatherLoader || !weatherDataContainer) return;

    weatherLoader.classList.remove('hidden');
    weatherDataContainer.innerHTML = '';

    try {
        const response = await fetch(`/api/weather?path=${provinsi}`);
        const result = await response.json();
        
        if (result && result.success && result.data && result.data.areas) {
            renderWeatherData(result.data.areas);
        } else {
            throw new Error(result ? result.message : 'Gagal mengambil data cuaca.');
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        weatherDataContainer.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                </div>
                <p class="font-black text-slate-800 mb-2">Gagal Memuat Cuaca</p>
                <p class="text-xs text-slate-400 mb-6">Wilayah ini mungkin belum tersedia atau gangguan server.</p>
                <button onclick="fetchWeatherData('${provinsi}')" class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-xl shadow-slate-900/20 active:scale-95 transition-all">Coba Lagi</button>
            </div>
        `;
    } finally {
        weatherLoader.classList.add('hidden');
    }
}

/**
 * Fetch latest earthquake data
 */
async function fetchQuakeData() {
    quakeLoader.classList.remove('hidden');
    quakeDataContainer.innerHTML = '';

    try {
        const response = await fetch('/api/quake');
        const result = await response.json();
        
        if (result && result.success && result.data) {
            renderQuakeData(result.data);
        } else {
            throw new Error(result ? result.message : 'Gagal mengambil data gempa.');
        }
    } catch (error) {
        console.error('Error fetching quake data:', error);
        quakeDataContainer.innerHTML = `
            <div class="py-10 text-center text-rose-500 bg-white rounded-3xl border border-rose-100 shadow-sm">
                <p class="font-bold">Gagal memuat data gempa.</p>
                <p class="text-xs mt-2 opacity-70">Pastikan koneksi internet aktif atau coba lagi nanti.</p>
                <button onclick="fetchQuakeData()" class="mt-4 px-4 py-2 bg-rose-100 rounded-xl text-sm font-bold">Coba Lagi</button>
            </div>
        `;
    } finally {
        quakeLoader.classList.add('hidden');
    }
}

/**
 * Render Quake Data to UI (Minimalist & Aesthetic)
 */
function renderQuakeData(quake) {
    quakeDataContainer.innerHTML = `
        <div class="animate-in space-y-6 pb-6">
            <!-- Main Alert Card -->
            <div class="relative overflow-hidden bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-rose-500/10 transition-all">
                <div class="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                
                <div class="p-8 relative z-10">
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Gempa Bumi Terkini</span>
                        </div>
                        <div class="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400">BMKG RI</div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-8">
                        <div class="flex flex-col items-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100/50">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Magnitudo</span>
                            <span class="text-4xl font-black text-rose-500">${quake.magnitude}</span>
                        </div>
                         <div class="flex flex-col items-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100/50">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Kedalaman</span>
                            <span class="text-2xl font-black text-slate-800">${quake.kedalaman}</span>
                        </div>
                    </div>

                    <div class="space-y-5">
                        <div class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lokasi</p>
                                <p class="text-base font-bold text-slate-800 leading-tight">${quake.wilayah}</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Waktu Kejadian</p>
                                <p class="text-base font-bold text-slate-800 leading-tight">${quake.tanggal} • ${quake.jam}</p>
                            </div>
                        </div>
                        <div class="p-5 bg-rose-500/5 rounded-3xl border border-rose-500/10 flex items-center gap-4">
                            <div class="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                            </div>
                            <p class="text-xs font-bold text-rose-600">${quake.potensi || quake.potentials}</p>
                        </div>
                    </div>
                </div>

                <!-- Map Section -->
                <div class="h-64 relative bg-slate-50 border-t border-slate-100 overflow-hidden">
                    <img src="${quake.shakemap}" alt="Peta Guncangan" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Weather cards to UI (Minimalist & Aesthetic City Cards)
 */
function renderWeatherData(areas) {
    weatherDataContainer.innerHTML = '';
    
    // Grid container is already in HTML, we just need to append cards
    areas.forEach(area => {
        const weatherParam = area.params.find(p => p.id === 'weather');
        const tempParam = area.params.find(p => p.id === 't');
        const humParam = area.params.find(p => p.id === 'hu');

        if (!weatherParam || !tempParam) return;

        // Current forecast (first time range)
        const current = weatherParam.times[0];
        const temp = tempParam.times[0].celcius || '--';
        const hum = humParam.times[0].value || '--';
        const code = current.value;
        const weatherName = current.name;

        const card = document.createElement('div');
        card.className = "group relative p-6 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:scale-[1.02] active:scale-95 transition-all duration-300";
        
        const weatherTheme = getWeatherTheme(code);
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h4 class="text-base font-black text-slate-800 leading-tight mb-1">${area.description}</h4>
                    <p class="text-[10px] font-bold text-slate-400 capitalize tracking-widest">${weatherName}</p>
                </div>
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center ${weatherTheme.bg} ${weatherTheme.text} shadow-lg ${weatherTheme.shadow}">
                    ${weatherTheme.icon}
                </div>
            </div>

            <div class="flex items-end justify-between">
                <div>
                   <span class="text-4xl font-black text-slate-800">${temp}°</span>
                   <span class="text-lg font-bold text-slate-300 ml-1">C</span>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex flex-col items-end">
                        <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Kelembaban</span>
                        <span class="text-xs font-bold text-slate-500">${hum}%</span>
                    </div>
                </div>
            </div>
        `;
        weatherDataContainer.appendChild(card);
    });
}

/**
 * Weather Visual Assets
 */
function getWeatherTheme(code) {
  const c = String(code);
  
  // Sunny / Clear
  if (["0", "1", "2"].includes(c)) {
    return {
      bg: "bg-amber-100",
      text: "text-amber-600",
      shadow: "shadow-amber-500/10",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
    };
  }
  
  // Cloudy
  if (["3", "4"].includes(c)) {
    return {
      bg: "bg-slate-100",
      text: "text-slate-600",
      shadow: "shadow-slate-500/10",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a3.5 3.5 0 1 1-5.95-2.43c.12-.12.2-.28.2-.47V4s3.5 0 3.5 3.5"/><path d="M4.3 16.5a2.5 2.5 0 1 1 3.4-3.4"/><path d="M12 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M7 12c-2.2 0-4 1.8-4 4s1.8 4 4 4h4a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3 3 3 0 0 0-3 3v2"/></svg>'
    };
  }

  // Rain
  if (["60", "61", "63", "80"].includes(c)) {
    return {
      bg: "bg-sky-100",
      text: "text-sky-600",
      shadow: "shadow-sky-500/10",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>'
    };
  }

  // Thunder
  if (["95", "97"].includes(c)) {
    return {
      bg: "bg-indigo-100",
      text: "text-indigo-600",
      shadow: "shadow-indigo-500/10",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m13 16-1 2h2l-1 2"/><path d="m9 16-1 2h2l-1 2"/></svg>'
    };
  }

  return {
    bg: "bg-slate-100",
    text: "text-slate-600",
    shadow: "shadow-slate-500/10",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a3.5 3.5 0 1 1-5.95-2.43c.12-.12.2-.28.2-.47V4s3.5 0 3.5 3.5"/><path d="M4.3 16.5a2.5 2.5 0 1 1 3.4-3.4"/><path d="M12 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M7 12c-2.2 0-4 1.8-4 4s1.8 4 4 4h4a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3 3 3 0 0 0-3 3v2"/></svg>'
  };
}
