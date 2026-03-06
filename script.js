// --- LAUNCHER LOGIC ---
const launcher = document.getElementById('launcher');
const homeClock = document.getElementById('home-clock');
const homeDate = document.getElementById('home-date');
const statusTime = document.getElementById('status-time');

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const timeStr = `${hours}:${minutes}`;
    if (homeClock) homeClock.textContent = timeStr;
    if (statusTime) statusTime.textContent = timeStr;

    // Update Date
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    if (homeDate) homeDate.textContent = now.toLocaleDateString('id-ID', options);
}

setInterval(updateClock, 1000);
updateClock();

function openApp(appName) {
    const win = document.getElementById(`win-${appName}`);
    if (win) {
        launcher.classList.add('blurred');
        win.classList.remove('hidden');
        setTimeout(() => win.classList.add('active'), 10);
        
        // Specific init for GradeMaster
        if (appName === 'grademaster') {
            // Re-render to ensure everything matches current state
            renderQuestions();
            renderEssayInputs();
            updateScore();
        }
    }
}

function closeApp(appName) {
    const win = document.getElementById(`win-${appName}`);
    if (win) {
        win.classList.remove('active');
        launcher.classList.remove('blurred');
        setTimeout(() => win.classList.add('hidden'), 500);
    }
}

// --- GRADEMASTER APP LOGIC ---
const defaultAnswerKey = {
    1: 'C', 2: 'B', 3: 'C', 4: 'A', 5: 'A',
    6: 'B', 7: 'B', 8: 'A', 9: 'A', 10: 'B',
    11: 'A', 12: 'B', 13: 'A', 14: 'B', 15: 'A',
    16: 'A', 17: 'A', 18: 'B', 19: 'C', 20: 'B',
    21: 'A', 22: 'B', 23: 'B', 24: 'B', 25: 'C',
    26: 'B', 27: 'B', 28: 'B', 29: 'A', 30: 'A',
    31: 'B', 32: 'A', 33: 'A', 34: 'A', 35: 'A',
    36: 'B', 37: 'B', 38: 'C', 39: 'B', 40: 'A'
};

let currentAnswerKey = {};
let totalQuestionsRendered = 40;

const form = document.getElementById('correctionForm');
const correctCountDisplay = document.getElementById('correctCountDisplay');
const incorrectCountDisplay = document.getElementById('incorrectCountDisplay');
const keyInputTextarea = document.getElementById('keyInput');
const totalEssayScoreDisplay = document.getElementById('totalEssayScore');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const qCountDisplay = document.getElementById('questionCountDisplay');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const dbStatus = document.getElementById('dbStatus');

const OPTIONS = ['A', 'B', 'C', 'D', 'E']; 
const ESSAY_COUNT = 5;
const PG_SCORE_MULTIPLIER = 2;

function handleAnswerChange(questionNumber, selectedOption) {
    updateScore();
}

/**
 * Advanced Answer Key Parser
 * Handles: 1.A 2:B 3-C 4)D, ABCDE, A,B,C,D, etc.
 */
function parseAndApplyKey() {
    if (!keyInputTextarea) return;
    const input = keyInputTextarea.value.trim();
    const newKey = {};
    
    // Attempt 1: Look for Pattern (Number followed by Delimiter and Option)
    // Matches: 1.A, 1:A, 1-A, 1)A, 1 A, 1. A, 1: A
    const patternMatches = input.match(/(\d+)\s*[.:\-)\s]\s*([A-E])/gi);
    if (patternMatches) {
        patternMatches.forEach(match => {
            const parts = match.match(/(\d+)\s*[.:\-)\s]\s*([A-E])/i);
            if (parts) {
                newKey[parseInt(parts[1])] = parts[2].toUpperCase();
            }
        });
    }

    // Attempt 2: If no patterns found, try treating as a raw sequence
    if (Object.keys(newKey).length === 0 && input.length > 0) {
        const cleanLetters = input.toUpperCase().replace(/[^A-E]/g, '');
        for (let i = 0; i < cleanLetters.length; i++) {
            newKey[i + 1] = cleanLetters[i];
        }
    }
    
    currentAnswerKey = newKey;
    const count = Object.keys(currentAnswerKey).length;
    
    // Dynamic Scaling: Update total questions based on key length (min 1, max 100)
    if (count > 0) {
        totalQuestionsRendered = count;
    } else {
        totalQuestionsRendered = 40; // Default fallback
    }

    if (qCountDisplay) qCountDisplay.textContent = `${totalQuestionsRendered} Soal`;
    renderQuestions(); 
    updateScore(); 
    
    updateKeyStatus(count);
}

function updateKeyStatus(count) {
    const keyStatusDiv = document.getElementById('keyStatus');
    if (keyStatusDiv) {
        if (count > 0) {
            keyStatusDiv.className = 'mt-4 px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100';
            keyStatusDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Kunci dikenali (${count} soal)`;
        } else {
            keyStatusDiv.className = 'mt-4 px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-100';
            keyStatusDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Belum ada kunci jawaban valid.';
        }
    }
}

// --- SUPABASE CLOUD LOGIC ---

async function saveToCloud() {
    const keyName = document.getElementById('dbKeyName').value.trim();
    const password = document.getElementById('dbKeyPassword').value.trim();
    
    if (!keyName || !password) {
        showDbStatus('Nama kunci dan password harus diisi!', 'error');
        return;
    }

    if (!Object.keys(currentAnswerKey).length) {
        showDbStatus('Isi dulu kunci jawaban di kolom input!', 'error');
        return;
    }

    if (!supabaseClient) {
        showDbStatus('Supabase belum dikonfigurasi. Hubungi Admin.', 'error');
        return;
    }

    showDbStatus('Sedang menyimpan...', 'info');

    try {
        const { data, error } = await supabaseClient
            .from('grade_keys')
            .upsert({ 
                key_name: keyName, 
                answers: currentAnswerKey, 
                password: password 
            }, { onConflict: 'key_name' });

        if (error) throw error;
        showDbStatus('Kunci jawaban berhasil disimpan!', 'success');
    } catch (err) {
        showDbStatus('Gagal menyimpan: ' + err.message, 'error');
    }
}

async function loadFromCloud() {
    const keyName = document.getElementById('dbKeyName').value.trim();
    const password = document.getElementById('dbKeyPassword').value.trim();

    if (!keyName || !password) {
        showDbStatus('Nama kunci dan password harus diisi!', 'error');
        return;
    }

    if (!supabaseClient) {
        showDbStatus('Supabase belum dikonfigurasi.', 'error');
        return;
    }

    showDbStatus('Sedang memuat...', 'info');

    try {
        const { data, error } = await supabaseClient
            .from('grade_keys')
            .select('*')
            .eq('key_name', keyName)
            .single();

        if (error) throw error;
        if (!data) {
            showDbStatus('Kunci tidak ditemukan!', 'error');
            return;
        }

        if (data.password !== password) {
            showDbStatus('Password salah!', 'error');
            return;
        }

        // Apply loaded key
        const loadedKey = data.answers;
        currentAnswerKey = loadedKey;
        keyInputTextarea.value = Object.entries(loadedKey).map(([k, v]) => `${k}.${v}`).join(' ');
        parseAndApplyKey();
        
        showDbStatus('Kunci berhasil dimuat!', 'success');
    } catch (err) {
        showDbStatus('Gagal memuat: ' + err.message, 'error');
    }
}

// --- SUPABASE CONFIG UI LOGIC ---

function toggleConfig() {
    const panel = document.getElementById('configPanel');
    if (panel) panel.classList.toggle('hidden');
}

function applySupabaseConfig() {
    const url = document.getElementById('spUrl').value.trim();
    const key = document.getElementById('spKey').value.trim();

    if (!url || !key) {
        showDbStatus('URL dan Key tidak boleh kosong!', 'error');
        return;
    }

    const success = initSupabase(url, key);
    if (success) {
        showDbStatus('Supabase terhubung!', 'success');
        setTimeout(toggleConfig, 1000);
    } else {
        showDbStatus('Gagal terhubung. Cek URL/Key.', 'error');
    }
}

function showDbStatus(msg, type) {
    if (!dbStatus) return;
    dbStatus.textContent = msg;
    dbStatus.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'bg-emerald-50', 'text-emerald-700', 'bg-slate-100', 'text-slate-600');
    
    if (type === 'error') {
        dbStatus.classList.add('bg-rose-50', 'text-rose-700');
    } else if (type === 'success') {
        dbStatus.classList.add('bg-emerald-50', 'text-emerald-700');
    } else {
        dbStatus.classList.add('bg-slate-100', 'text-slate-600');
    }
    dbStatus.classList.remove('hidden');
}

function renderQuestions() {
    if (!form) return;
    let htmlContent = '';
    for (let i = 1; i <= totalQuestionsRendered; i++) {
        const selectedVal = document.querySelector(`input[name="q${i}"]:checked`)?.value;
        const optionsHtml = OPTIONS.map(option => `
            <input type="radio" id="q${i}opt${option}" name="q${i}" value="${option}" class="hidden" onchange="handleAnswerChange(${i}, '${option}')" ${selectedVal === option ? 'checked' : ''}>
            <label for="q${i}opt${option}" class="custom-radio-label">${option}</label>
        `).join('');

        htmlContent += `
            <div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-brand-200 transition-colors">
                <div class="flex items-center gap-4">
                    <span class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm">${i}</span>
                    <div class="flex gap-2">${optionsHtml}</div>
                </div>
                <div id="statusQ${i}" class="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">PILIH</div>
            </div>
        `;
    }
    form.innerHTML = htmlContent;
}

function renderEssayInputs() {
    const wrapper = document.getElementById('essayInputsWrapper');
    if (!wrapper) return;
    let html = '';
    for(let i=1; i<=ESSAY_COUNT; i++) {
        html += `
            <div class="col-span-1">
                <label for="essayScore${i}" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Soal ${i}</label>
                <input type="number" id="essayScore${i}" min="0" max="4" value="0" oninput="updateScore()" class="w-full bg-white rounded-xl border-2 border-indigo-100 p-3 text-center font-black text-xl text-indigo-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all">
            </div>
        `;
    }
    wrapper.innerHTML = html;
}

function updateScore() {
    let correct = 0;
    let incorrect = 0;

    for (let i = 1; i <= totalQuestionsRendered; i++) {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        const status = document.getElementById(`statusQ${i}`);
        const correctAns = currentAnswerKey[i];

        if (selected && status) {
            if (!correctAns) {
                status.textContent = 'NO KEY';
                status.className = "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100";
            } else if (selected.value === correctAns) {
                correct++;
                status.textContent = 'CORRECT';
                status.className = "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20";
            } else {
                incorrect++;
                status.textContent = `WRONG (${correctAns})`;
                status.className = "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/20";
            }
        }
    }
    
    let essayScore = 0;
    for (let i = 1; i <= ESSAY_COUNT; i++) {
        const input = document.getElementById(`essayScore${i}`);
        if (input) {
            let val = parseInt(input.value) || 0;
            if (val < 0) val = 0; if (val > 4) val = 4;
            input.value = val;
            essayScore += val;
        }
    }
    
    if (totalEssayScoreDisplay) totalEssayScoreDisplay.textContent = `${essayScore} / 20`;
    if (correctCountDisplay) correctCountDisplay.textContent = correct;
    if (incorrectCountDisplay) incorrectCountDisplay.textContent = incorrect;
    
    const finalScore = (correct * PG_SCORE_MULTIPLIER) + essayScore;
    if (finalScoreDisplay) finalScoreDisplay.textContent = finalScore;
    
    const maxScore = (totalQuestionsRendered * PG_SCORE_MULTIPLIER) + 20;
    const percent = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.textContent = percent + '%';
}

function resetCorrection() {
    renderQuestions();
    renderEssayInputs();
    updateScore();
}

function resetKeyInput() {
    if (keyInputTextarea) {
        keyInputTextarea.value = '';
        parseAndApplyKey();
    }
}

// --- CALCULATOR LOGIC ---
const calculatorPanel = document.getElementById('calculator-panel');
const display = document.getElementById('display');
let curOp = '', prevOp = '', op = undefined;

const calc = {
    clear: () => { curOp = ''; prevOp = ''; op = undefined; calc.update(); },
    delete: () => { curOp = curOp.toString().slice(0, -1); calc.update(); },
    appendNumber: (num) => { if (num === '.' && curOp.includes('.')) return; curOp = curOp.toString() + num; calc.update(); },
    chooseOperation: (o) => { if (curOp === '') return; if (prevOp !== '') calc.calculate(); op = o; prevOp = curOp; curOp = ''; calc.update(); },
    calculate: () => {
        let res; const p = parseFloat(prevOp), c = parseFloat(curOp);
        if (isNaN(p) || isNaN(c)) return;
        switch (op) { case '+': res = p + c; break; case '-': res = p - c; break; case '*': res = p * c; break; case '/': res = p / c; break; default: return; }
        curOp = res; op = undefined; prevOp = ''; calc.update();
    },
    update: () => { if (display) display.innerText = curOp === '' ? '0' : curOp.toString(); }
};

// Global Initialization
window.onload = () => {
    if (keyInputTextarea) {
        keyInputTextarea.value = Object.entries(defaultAnswerKey).map(([k, v]) => `${k}.${v}`).join(' ');
    }
    renderEssayInputs();
    parseAndApplyKey();

    // Initialize Supabase if credentials are provided in the environment/config
    // For this prototype, we'll try to find them in the global scope if set
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
};
