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
 * Fetch latest earthquake data
 */
async function fetchQuakeData() {
    if (!quakeLoader || !quakeDataContainer) return;
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
 * Fetch weather forecast data
 */
async function fetchWeatherData(provinsi) {
    if (!weatherLoader || !weatherDataContainer) return;

    weatherLoader.classList.remove('hidden');
    weatherDataContainer.innerHTML = '';

    try {
        const response = await fetch(`/api/weather?path=${provinsi}`);
        const result = await response.json();
        
        if (result && result.success && result.data) {
            renderWeatherDashboard(result.data);
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
                <p class="text-xs text-slate-400 mb-6">Wilayah ini mungkin sistem pemantauannya sedang offline.</p>
                <button onclick="fetchWeatherData('${provinsi}')" class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-xl shadow-slate-900/20 active:scale-95 transition-all">Coba Lagi</button>
            </div>
        `;
    } finally {
        weatherLoader.classList.add('hidden');
    }
}

/**
 * Render Weather Dashboard (Modern & Premium Design)
 */
function renderWeatherDashboard(data) {
    const current = data.current;
    if (!current) return;

    const weatherTheme = getWeatherTheme(current.weather);
    const lokasi = data.lokasi;
    
    weatherDataContainer.innerHTML = `
        <div class="animate-in space-y-6">
            <!-- Current Highlight Card -->
            <div class="relative overflow-hidden p-8 rounded-[3rem] text-white shadow-2xl transition-all ${weatherTheme.gradient}">
                <!-- Background Decorative Pattern -->
                <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                <div class="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full -ml-12 -mb-12 blur-2xl"></div>

                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-10">
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-1">Kondisi Terkini</p>
                            <h3 class="text-xl font-bold flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                ${lokasi.kecamatan}, ${lokasi.provinsi}
                            </h3>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-1">Update</p>
                            <p class="text-[11px] font-bold">${current.local_datetime.split(' ')[1].substring(0, 5)} WIB</p>
                        </div>
                    </div>

                    <div class="flex flex-col items-center mb-10 text-center">
                        <div class="w-32 h-32 mb-4 drop-shadow-2xl animate-float">
                            <img src="${current.image}" alt="${current.weather_desc}" class="w-full h-full object-contain">
                        </div>
                        <div class="flex items-start">
                            <span class="text-8xl font-black tracking-tighter">${current.t}</span>
                            <span class="text-3xl font-black mt-4 ml-1">°C</span>
                        </div>
                        <p class="text-lg font-bold mt-2 opacity-90">${current.weather_desc}</p>
                    </div>

                    <div class="grid grid-cols-3 gap-2 p-1.5 bg-black/10 backdrop-blur-md rounded-[2rem] border border-white/5">
                        <div class="flex flex-col items-center py-4 rounded-2xl">
                            <span class="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Lembab</span>
                            <span class="text-sm font-bold">${current.hu}%</span>
                        </div>
                        <div class="flex flex-col items-center py-4 rounded-2xl bg-white/10 shadow-sm border border-white/10">
                            <span class="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Angin</span>
                            <span class="text-sm font-bold">${current.ws} km/j</span>
                        </div>
                        <div class="flex flex-col items-center py-4 rounded-2xl">
                            <span class="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Arah</span>
                            <span class="text-sm font-bold">${current.wd}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Forecast Section -->
            <div class="space-y-4">
                <div class="flex items-center justify-between px-2">
                    <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Prakiraan Selanjutnya</h4>
                    <span class="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-bold text-slate-400 uppercase">24 Jam</span>
                </div>
                
                <div class="flex gap-4 overflow-x-auto pb-6 px-1 scroll-hide">
                    ${data.forecast.map(f => `
                        <div class="flex-shrink-0 w-28 p-5 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/30 text-center hover:scale-105 transition-transform duration-300">
                            <p class="text-[10px] font-black text-slate-300 uppercase mb-3">${f.local_datetime.split(' ')[1].substring(0, 5)}</p>
                            <img src="${f.image}" alt="${f.weather_desc}" class="w-12 h-12 mx-auto mb-3">
                            <p class="text-lg font-black text-slate-800">${f.t}°</p>
                            <p class="text-[9px] font-bold text-slate-400 truncate mt-1 px-1">${f.weather_desc}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- More Details Grid -->
            <div class="grid grid-cols-2 gap-4 pb-6">
                <div class="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/20">
                    <div class="flex items-center gap-3 mb-4">
                         <div class="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 19.07-1.41-1.41"/><path d="M12 22v2"/><path d="m6.34 17.66-1.41 1.41"/><path d="M2 12h2"/><path d="m7.76 7.76-1.41-1.41"/><circle cx="12" cy="12" r="4"/></svg>
                         </div>
                         <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Jarak Pandang</span>
                    </div>
                    <p class="text-xl font-black text-slate-800">${current.vs_text}</p>
                </div>
                <div class="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/20">
                    <div class="flex items-center gap-3 mb-4">
                         <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a3.5 3.5 0 1 1-5.95-2.43c.12-.12.2-.28.2-.47V4s3.5 0 3.5 3.5"/><path d="M4.3 16.5a2.5 2.5 0 1 1 3.4-3.4"/></svg>
                         </div>
                         <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Tutupan Awan</span>
                    </div>
                    <p class="text-xl font-black text-slate-800">${current.tcc}%</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Weather Visual Themes
 */
function getWeatherTheme(code) {
  const c = parseInt(code);
  
  // Cerah / Sunny (0, 100)
  if (c === 0 || c === 100) {
    return {
      gradient: "bg-gradient-to-br from-amber-400 to-orange-600",
      theme: "amber"
    };
  }
  
  // Cerah Berawan (1, 2, 101, 102)
  if ([1, 2, 101, 102].includes(c)) {
    return {
      gradient: "bg-gradient-to-br from-sky-400 to-blue-600",
      theme: "sky"
    };
  }
  
  // Berawan / Berawan Tebal (3, 4, 103, 104)
  if ([3, 4, 103, 104].includes(c)) {
    return {
      gradient: "bg-gradient-to-br from-slate-400 to-slate-700",
      theme: "slate"
    };
  }

  // Hujan (Semua tipe hujan) (60, 61, 63, 80, 201, 202, 203, 204)
  if ([60, 61, 63, 80, 201, 202, 203, 204].includes(c)) {
    return {
      gradient: "bg-gradient-to-br from-blue-600 to-indigo-900",
      theme: "blue"
    };
  }

  // Petir (95, 97)
  if ([95, 97].includes(c)) {
    return {
      gradient: "bg-gradient-to-br from-indigo-700 to-slate-900",
      theme: "indigo"
    };
  }

  return {
    gradient: "bg-gradient-to-br from-sky-500 to-blue-700",
    theme: "sky"
  };
}
