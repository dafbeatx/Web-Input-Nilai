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
    if (tab === 'quake') {
        tabQuake.className = 'flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all bg-white text-slate-800 shadow-sm';
        tabWeather.className = 'flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-white/50';
        quakePanel.classList.remove('hidden');
        weatherPanel.classList.add('hidden');
        fetchQuakeData();
    } else {
        tabWeather.className = 'flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all bg-white text-slate-800 shadow-sm';
        tabQuake.className = 'flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-white/50';
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
    quakeLoader.classList.remove('hidden');
    quakeDataContainer.innerHTML = '';

    try {
        const response = await fetch('/api/quake');
        const result = await response.json();
        
        if (result.success) {
            renderQuakeData(result.data);
        } else {
            throw new Error('Gagal mengambil data gempa.');
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
 * Render Quake Data to UI
 */
function renderQuakeData(quake) {
    quakeDataContainer.innerHTML = `
        <div class="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden group">
            <div class="relative h-48 bg-slate-200 overflow-hidden">
                <img src="${quake.shakemap}" alt="Shakemap" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-end p-6 items-end">
                    <span class="px-3 py-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full ring-4 ring-rose-600/20">
                        Kejadian Terbaru
                    </span>
                </div>
            </div>
            <div class="p-8">
                <div class="grid grid-cols-2 gap-4 mb-8">
                    <div class="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
                        <p class="text-[10px] uppercase font-black text-rose-400 tracking-widest mb-1">Magnitudo</p>
                        <p class="text-3xl font-black text-rose-600">${quake.magnitude}</p>
                    </div>
                    <div class="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                        <p class="text-[10px] uppercase font-black text-orange-400 tracking-widest mb-1">Kedalaman</p>
                        <p class="text-3xl font-black text-orange-600">${quake.depth}</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                        <div>
                            <p class="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-0.5">Wilayah</p>
                            <p class="text-sm font-bold text-slate-700">${quake.region}</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div>
                            <p class="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-0.5">Waktu</p>
                            <p class="text-sm font-bold text-slate-700">${quake.date} • ${quake.time}</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                        </div>
                        <div>
                            <p class="text-[10px] uppercase font-black text-amber-500 tracking-widest mb-0.5">Potensi</p>
                            <p class="text-sm font-bold text-slate-700">${quake.potensi || quake.potentials}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
                <p class="text-[10px] text-slate-400 font-bold">Sumber: BMKG Indonesia</p>
            </div>
        </div>
    `;
}

/**
 * Fetch weather forecast data
 */
async function fetchWeatherData(provinsi) {
    weatherLoader.classList.remove('hidden');
    weatherDataContainer.innerHTML = '';

    try {
        const response = await fetch(`/api/weather?path=${provinsi}`);
        const result = await response.json();
        
        if (result.success) {
            renderWeatherData(result.data.areas);
        } else {
            throw new Error('Gagal mengambil data cuaca.');
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        weatherDataContainer.innerHTML = `
            <div class="col-span-full py-10 text-center text-rose-500 bg-white rounded-3xl border border-rose-100 shadow-sm">
                <p class="font-bold">Gagal memuat data cuaca untuk wilayah ini.</p>
                <button onclick="fetchWeatherData('${provinsi}')" class="mt-4 px-4 py-2 bg-rose-100 rounded-xl text-sm font-bold">Coba Lagi</button>
            </div>
        `;
    } finally {
        weatherLoader.classList.add('hidden');
    }
}

/**
 * Render Weather cards to UI
 */
function renderWeatherData(areas) {
    weatherDataContainer.innerHTML = '';
    
    // Take first 10 areas to keep it snappy
    areas.slice(0, 10).forEach(area => {
        // Find temperature and humidity from params
        const temp = area.params.find(p => p.id === 't')?.times[0].celcius || '--';
        const hum = area.params.find(p => p.id === 'hu')?.times[0].value || '--';
        const weatherDesc = area.params.find(p => p.id === 'weather')?.times[0].name || 'Berawan';
        
        const card = document.createElement('div');
        card.className = 'p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-sky-500 transition-all flex items-center justify-between group';
        
        card.innerHTML = `
            <div>
                <h4 class="font-bold text-slate-800 text-sm mb-1">${area.description}</h4>
                <p class="text-xs text-sky-600 font-bold">${weatherDesc}</p>
            </div>
            <div class="text-right">
                <div class="text-2xl font-black text-slate-800">${temp}°</div>
                <p class="text-[10px] font-bold text-slate-400 tracking-wider">Hum: ${hum}%</p>
            </div>
        `;
        weatherDataContainer.appendChild(card);
    });
}
