/**
 * Al-Qur'an Indonesia Module for GradeMaster OS
 * Using api.quran.gading.dev (based on gadingnst/quran-api)
 */

const QURAN_API_BASE = 'https://api.quran.gading.dev';
let allSurahs = [];

// Elements
const surahListContainer = document.getElementById('surah-list');
const surahDetailView = document.getElementById('surah-detail');
const surahDetailContent = document.getElementById('surah-detail-content');
const quranSearchInput = document.getElementById('quranSearch');
const quranHeader = document.getElementById('quran-header');

/**
 * Initialize Al-Qur'an App
 */
async function initQuranApp() {
    if (allSurahs.length === 0) {
        await fetchSurahs();
    }
}

/**
 * Fetch all surahs from API
 */
async function fetchSurahs() {
    try {
        const response = await fetch(`${QURAN_API_BASE}/surah`);
        const result = await response.json();
        
        if (result.code === 200) {
            allSurahs = result.data;
            renderSurahList(allSurahs);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error fetching surahs:', error);
        surahListContainer.innerHTML = `
            <div class="col-span-full py-10 text-center text-rose-500">
                <p class="font-bold">Gagal memuat daftar surah.</p>
                <button onclick="fetchSurahs()" class="mt-4 px-4 py-2 bg-rose-100 rounded-xl text-sm font-bold">Coba Lagi</button>
            </div>
        `;
    }
}

/**
 * Render surah list to UI
 */
function renderSurahList(surahs) {
    surahListContainer.innerHTML = '';
    
    if (surahs.length === 0) {
        surahListContainer.innerHTML = '<div class="col-span-full py-10 text-center text-slate-400 font-medium">Surah tidak ditemukan.</div>';
        return;
    }

    surahs.forEach(surah => {
        const div = document.createElement('div');
        div.className = 'group p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between';
        div.onclick = () => showSurahDetail(surah.number);
        
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    ${surah.number}
                </div>
                <div>
                    <h4 class="font-bold text-slate-800">${surah.name.transliteration.id}</h4>
                    <p class="text-xs text-slate-400 font-medium">${surah.name.translation.id} • ${surah.numberOfVerses} Ayat</p>
                </div>
            </div>
            <div class="text-right">
                <div class="font-arabic text-xl text-emerald-700">${surah.name.short}</div>
                <p class="text-[10px] uppercase tracking-widest text-slate-300 font-bold">${surah.revelation.id}</p>
            </div>
        `;
        surahListContainer.appendChild(div);
    });
}

/**
 * Show surah detail (Ayahs & Audio)
 */
async function showSurahDetail(number) {
    // UI state
    surahListContainer.classList.add('hidden');
    quranHeader.classList.add('hidden');
    surahDetailView.classList.remove('hidden');
    surahDetailContent.innerHTML = `
        <div class="py-20 flex flex-col items-center justify-center text-slate-400">
            <div class="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p class="font-medium text-sm">Memuat ayat-ayat...</p>
        </div>
    `;

    try {
        const response = await fetch(`${QURAN_API_BASE}/surah/${number}`);
        const result = await response.json();
        
        if (result.code === 200) {
            const data = result.data;
            renderSurahDetail(data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error fetching surah detail:', error);
        surahDetailContent.innerHTML = `
            <div class="py-10 text-center text-rose-500">
                <p class="font-bold">Gagal memuat detail surah.</p>
                <button onclick="showSurahDetail(${number})" class="mt-4 px-4 py-2 bg-rose-100 rounded-xl text-sm font-bold">Coba Lagi</button>
            </div>
        `;
    }
}

/**
 * Render surah detail to UI
 */
function renderSurahDetail(surah) {
    let html = `
        <div class="bg-emerald-600 rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-xl shadow-emerald-900/10">
            <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div class="relative z-10 text-center">
                <h2 class="text-3xl font-bold mb-1">${surah.name.transliteration.id}</h2>
                <p class="text-emerald-100 text-sm font-medium mb-4">${surah.name.translation.id} • ${surah.numberOfVerses} Ayat</p>
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-full text-xs font-bold ring-1 ring-white/20">
                    <span class="uppercase tracking-widest">${surah.revelation.id}</span>
                </div>
            </div>
        </div>

        ${surah.preBismillah ? `
            <div class="text-center mb-10 py-6">
                <div class="font-arabic text-3xl text-slate-800">${surah.preBismillah.text.arab}</div>
            </div>
        ` : ''}

        <div class="space-y-6">
    `;

    surah.verses.forEach(verse => {
        html += `
            <div class="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div class="flex justify-between items-start mb-6">
                    <div class="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center text-xs font-bold border border-slate-100">
                        ${verse.number.inSurah}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="playVerseAudio(this, '${verse.audio.primary}')" class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>
                <div class="text-right font-arabic text-3xl leading-[2.5] text-slate-800 mb-6" dir="rtl">
                    ${verse.text.arab}
                </div>
                <div class="text-emerald-600 font-medium text-sm mb-2 italic">
                    ${verse.text.transliteration.en}
                </div>
                <div class="text-slate-600 text-sm leading-relaxed">
                    ${verse.translation.id}
                </div>
            </div>
        `;
    });

    html += `</div>`;
    surahDetailContent.innerHTML = html;
}

/**
 * Audio Player for Ayah
 */
let currentAudio = null;
let currentBtn = null;

function playVerseAudio(btn, url) {
    if (currentAudio) {
        currentAudio.pause();
        if (currentBtn) {
            currentBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
            currentBtn.classList.remove('bg-emerald-600', 'text-white');
            currentBtn.classList.add('bg-emerald-50', 'text-emerald-600');
        }
        
        if (currentAudio.src === url) {
            currentAudio = null;
            return;
        }
    }

    currentAudio = new Audio(url);
    currentBtn = btn;
    
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    btn.classList.remove('bg-emerald-50', 'text-emerald-600');
    btn.classList.add('bg-emerald-600', 'text-white');

    currentAudio.play();
    currentAudio.onended = () => {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
        btn.classList.remove('bg-emerald-600', 'text-white');
        btn.classList.add('bg-emerald-50', 'text-emerald-600');
        currentAudio = null;
    };
}

/**
 * Search Surah
 */
quranSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allSurahs.filter(s => 
        s.name.transliteration.id.toLowerCase().includes(query) || 
        s.number.toString() === query
    );
    renderSurahList(filtered);
});

/**
 * Navigation
 */
function backToSurahList() {
    if (currentAudio) currentAudio.pause();
    surahDetailView.classList.add('hidden');
    surahListContainer.classList.remove('hidden');
    quranHeader.classList.remove('hidden');
}
