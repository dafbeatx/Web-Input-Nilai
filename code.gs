/**
 * Bot WhatsAuto AI - GradeMaster OS (Ultimate Version: Token Saver + Supabase Integration)
 * Fitur: Respons Ringkas (Hemat Token), VIP Persona, Auto-Lunas, Smart Media, 6 API, Integrasi Supabase.
 */

const scriptProperties = PropertiesService.getScriptProperties();
const SUPABASE_URL = scriptProperties.getProperty('SUPABASE_URL');
const SUPABASE_KEY = scriptProperties.getProperty('SUPABASE_KEY');
const LOG_SHEET_ID = scriptProperties.getProperty('LOG_SHEET_ID'); 
const APP_URL = scriptProperties.getProperty('APP_URL') || "https://grademaster.my.id"; // URL Web GradeMaster OS
const MODEL_NAME = 'llama-3.3-70b-versatile'; 
const MAX_HISTORY = 5; 

function doPost(e) {
  try {
    const data = e.parameter || {};
    const phone = data.phone || "unknown";
    let senderName = (data.sender || "Sobat").trim();
    let userMessage = (data.message || "").trim();

    if (!userMessage) {
      userMessage = "[Pengguna mengirim File/Gambar/Voice Note tanpa keterangan teks]";
    }

    const msgLower = userMessage.toLowerCase();
    const introKey = "intro_done_" + phone;

    // --- RESET COMMAND ---
    if (msgLower.includes("/reset")) {
      scriptProperties.deleteProperty(phone);
      scriptProperties.deleteProperty(introKey);
      scriptProperties.deleteProperty(phone + "_state");
      scriptProperties.deleteProperty(phone + "_matches");
      scriptProperties.deleteProperty(phone + "_student_name");
      scriptProperties.deleteProperty(phone + "_student_cache");
      scriptProperties.deleteProperty(phone + "_student_cache_expire");
      logToSheet(phone, senderName, "User", userMessage, "Command Reset");
      return sendResponse("Sistem telah mereset memori dan tautan nama Anda. Sapa aku kembali, hehe.");
    }

    // --- STATE & DATA MANAGEMENT ---
    const state = scriptProperties.getProperty(phone + "_state");
    const matchesJson = scriptProperties.getProperty(phone + "_matches");
    const linkedName = scriptProperties.getProperty(phone + "_student_name");

    // Deteksi apakah user menanyakan nilai, ujian, atau kelakuan/poin
    const keywords = ["nilai", "raport", "remedial", "remed", "remedi", "ujian", "tes", "ulangan", "skor", "poin", "pelanggaran", "sanksi", "kelakuan", "sikap", "behavior", "kkm"];
    let isQuerying = false;
    for (let i = 0; i < keywords.length; i++) {
      if (msgLower.indexOf(keywords[i]) !== -1) {
        isQuerying = true;
        break;
      }
    }

    // --- KASUS A: Pengguna memilih nama dari daftar nama ganda (matches) ---
    if (matchesJson) {
      const namesList = JSON.parse(matchesJson);
      let selectedIndex = parseInt(userMessage) - 1;
      let matchedName = "";

      if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < namesList.length) {
        matchedName = namesList[selectedIndex];
      } else {
        // Coba cocokan secara teks persis
        for (let i = 0; i < namesList.length; i++) {
          if (namesList[i].toLowerCase() === msgLower) {
            matchedName = namesList[i];
            break;
          }
        }
      }

      if (matchedName) {
        scriptProperties.setProperty(phone + "_student_name", matchedName);
        scriptProperties.deleteProperty(phone + "_state");
        scriptProperties.deleteProperty(phone + "_matches");
        
        // Ambil data terbaru (force refresh karena baru menautkan nama)
        const studentSummary = getStudentDataSummaryWithCache(phone, matchedName, true);
        return processAIWithData(phone, senderName, userMessage, introKey, studentSummary);
      } else {
        return sendResponse("Pilihan tidak valid. Tolong balas dengan angka nomor urut (contoh: 1) atau ketik nama lengkap kamu secara persis ya, hehe.");
      }
    }

    // --- KASUS B: Pengguna dalam proses memasukkan nama (AWAITING_NAME) ---
    if (state === "AWAITING_NAME") {
      const matches = findStudentName(userMessage);
      
      if (matches.length === 0) {
        return sendResponse(`Maaf, nama "${userMessage}" tidak ditemukan di database GradeMaster. Boleh coba ketik kembali nama lengkap sesuai absen? Atau ketik /reset untuk membatalkan, hehe.`);
      } else if (matches.length === 1) {
        const matchedName = matches[0];
        scriptProperties.setProperty(phone + "_student_name", matchedName);
        scriptProperties.deleteProperty(phone + "_state");
        
        // Ambil data terbaru (force refresh karena baru menautkan nama)
        const studentSummary = getStudentDataSummaryWithCache(phone, matchedName, true);
        return processAIWithData(phone, senderName, userMessage, introKey, studentSummary);
      } else {
        scriptProperties.setProperty(phone + "_matches", JSON.stringify(matches));
        let replyMsg = `Ditemukan beberapa nama yang mirip di database:\n`;
        for (let i = 0; i < matches.length; i++) {
          replyMsg += `${i + 1}. ${matches[i]}\n`;
        }
        replyMsg += `\nTolong balas dengan mengetik angka nomor pilihanmu (contoh: 1) ya, hehe.`;
        return sendResponse(replyMsg);
      }
    }

    // --- KASUS C: Alur Normal (Belum tertaut nama, tapi menanyakan data) ---
    if (isQuerying && !linkedName) {
      scriptProperties.setProperty(phone + "_state", "AWAITING_NAME");
      return sendResponse("Boleh tahu siapa nama lengkap kamu? (Tulis nama lengkap sesuai absen ya) hehe.");
    }

    // Alur percakapan umum (bisa sudah tertaut atau belum)
    let studentSummary = "";
    if (linkedName) {
      // Menggunakan cache agar hemat koneksi ke Supabase, kecuali sedang querying data nilai/poin
      studentSummary = getStudentDataSummaryWithCache(phone, linkedName, isQuerying);
    }
    return processAIWithData(phone, senderName, userMessage, introKey, studentSummary);

  } catch (error) {
    return sendResponse("Kendala teknis sebentar hehe.");
  }
}

// --- FUNGSI UTAMA AI DENGAN DATA SUPABASE ---

function processAIWithData(phone, senderName, userMsg, introKey, studentSummary) {
  const bukuPintar = getKnowledgeBase();
  const promptCustom = getPromptManagement();
  const infoTunggakan = getTunggakanInfo(senderName);
  const perlakuanKhusus = getPerlakuanKhusus(senderName);

  const hargaTurnitin = scriptProperties.getProperty('HARGA_TURNITIN') || "Rp 10.000";
  const seaBankAkun = scriptProperties.getProperty('SEABANK_AKUN') || "[Belum diatur]";

  let history = [];
  const savedHistory = scriptProperties.getProperty(phone);
  if (savedHistory) {
    try { history = JSON.parse(savedHistory); } catch (err) { history = []; }
  }
  if (history.length === 0 && LOG_SHEET_ID) {
    history = getHistoryFromSheet(phone);
  }

  let systemContent = `Identitas: Asisten Dafa (GradeMaster). User: "${senderName}".
  
  ATURAN HEMAT TOKEN: 
  1. Jawab sangat SINGKAT & PADAT untuk obrolan umum/basa-basi. 
  2. HANYA berikan jawaban panjang & detail jika membahas JASA (Skripsi, Turnitin, dsb), TUNGGAKAN, atau DATA SISWA.
  
  ${perlakuanKhusus ? `[VIP ${senderName}]: ${perlakuanKhusus}` : ""}

  INFO PENTING:
  - Buku Pintar: ${bukuPintar}
  - Instruksi Tambahan: ${promptCustom}
  - Tunggakan ${senderName}: ${infoTunggakan ? infoTunggakan + " (Gunakan kode [KONFIRMASI_LUNAS] jika sudah bayar)" : "Lunas"}.
  - Layanan: Turnitin ${hargaTurnitin}, Skripsi 800k-1jt. Rek: SeaBank ${seaBankAkun}.
  ${studentSummary ? `\n- DATA SISWA TERTAUT:\n${studentSummary}` : ""}

  SOP: Ramah, Profesional, akhiri dengan "hihi" atau "hehe". Media: Jika kirim file tanpa teks, asumsikan bukti transfer jika sedang transaksi.`;

  return processAIRequest(history, userMsg, introKey, phone, senderName, systemContent);
}

// --- FUNGSI QUERY SUPABASE DENGAN RETRY & CACHING ---

// Helper untuk fetch data dengan retry otomatis jika gagal koneksi
function fetchWithRetry(url, options, maxRetries) {
  maxRetries = maxRetries || 2;
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        return response;
      }
    } catch (e) {
      attempts++;
      if (attempts >= maxRetries) {
        throw new Error("Koneksi Supabase gagal setelah " + maxRetries + " percobaan: " + e.toString());
      }
      Utilities.sleep(500); // Tunggu 500ms sebelum mencoba lagi
    }
  }
}

function findStudentName(name) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  let nameQuery = name.trim();
  let classQuery = "";

  // Regex untuk menangkap kelas seperti 7A, 9a, 8-B, 9 A, kls 9a, kelas 9A, dll.
  const classRegex = /\b(?:kelas|kls)?\s*(7|8|9)\s*[-_]?\s*([a-iA-I])\b/i;
  const match = nameQuery.match(classRegex);
  if (match) {
    classQuery = match[1] + match[2].toUpperCase(); // e.g. "9A"
    nameQuery = nameQuery.replace(match[0], "").trim();
  }

  nameQuery = nameQuery.replace(/\b(kelas|kls|dari|siswa|nama|saya|adalah|panggilan)\b/gi, "").replace(/\s+/g, " ").trim();

  if (!nameQuery) return [];

  const options = {
    method: "get",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Accept": "application/json"
    },
    muteHttpExceptions: true
  };

  let uniqueNames = [];

  // 1. Cari di gm_behaviors
  let urlBehaviors = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/gm_behaviors?select=student_name,class_name&student_name=ilike.*${encodeURIComponent(nameQuery)}*&limit=10`;
  if (classQuery) {
    urlBehaviors += `&class_name=ilike.*${encodeURIComponent(classQuery)}*`;
  }

  try {
    const res2 = fetchWithRetry(urlBehaviors, options);
    const behaviors = JSON.parse(res2.getContentText());
    behaviors.forEach(b => {
      if (b.student_name && uniqueNames.indexOf(b.student_name) === -1) {
        uniqueNames.push(b.student_name);
      }
    });
  } catch (e) {
    logToSheet("system", "error", "findStudentName_behaviors", e.toString(), "Error");
  }

  // 2. Cari di gm_students jika belum ditemukan atau butuh pelengkap
  if (uniqueNames.length === 0) {
    let urlStudents = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/gm_students?select=name,gm_sessions(class_name)&name=ilike.*${encodeURIComponent(nameQuery)}*&is_deleted=eq.false&limit=10`;
    try {
      const res1 = fetchWithRetry(urlStudents, options);
      const students = JSON.parse(res1.getContentText());
      students.forEach(s => {
        if (classQuery && s.gm_sessions) {
          const sessionClass = s.gm_sessions.class_name || "";
          if (sessionClass.toLowerCase().indexOf(classQuery.toLowerCase()) === -1) {
            return;
          }
        }
        if (s.name && uniqueNames.indexOf(s.name) === -1) {
          uniqueNames.push(s.name);
        }
      });
    } catch (e) {
      logToSheet("system", "error", "findStudentName_students", e.toString(), "Error");
    }
  }

  return uniqueNames;
}

function getSupabaseStudentScores(studentName) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/gm_students?select=final_score,remedial_status,remedial_score,original_score,gm_sessions(subject,exam_type,kkm)&name=eq.${encodeURIComponent(studentName)}&is_deleted=eq.false`;
  
  const options = {
    method: "get",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Accept": "application/json"
    },
    muteHttpExceptions: true
  };

  try {
    const response = fetchWithRetry(url, options);
    return JSON.parse(response.getContentText());
  } catch (e) {
    logToSheet("system", "error", "getScores", e.toString(), "Error");
  }
  return [];
}

function getSupabaseStudentBehavior(studentName) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/gm_behaviors?select=id,student_name,class_name,total_points&student_name=eq.${encodeURIComponent(studentName)}&limit=1`;
  
  const options = {
    method: "get",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Accept": "application/json"
    },
    muteHttpExceptions: true
  };

  try {
    const response = fetchWithRetry(url, options);
    const data = JSON.parse(response.getContentText());
    return data[0] || null;
  } catch (e) {
    logToSheet("system", "error", "getBehavior", e.toString(), "Error");
  }
  return null;
}

function getSupabaseStudentBehaviorLogs(behaviorId) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !behaviorId) return [];
  const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/gm_behavior_logs?select=points_delta,reason,violation_date&student_id=eq.${behaviorId}&order=violation_date.desc&limit=3`;
  
  const options = {
    method: "get",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Accept": "application/json"
    },
    muteHttpExceptions: true
  };

  try {
    const response = fetchWithRetry(url, options);
    return JSON.parse(response.getContentText());
  } catch (e) {
    logToSheet("system", "error", "getBehaviorLogs", e.toString(), "Error");
  }
  return [];
}

// Caching wrapper untuk meminimalkan beban HTTP ke Supabase
function getStudentDataSummaryWithCache(phone, studentName, forceRefresh) {
  const cacheKey = phone + "_student_cache";
  const expireKey = phone + "_student_cache_expire";
  
  const now = new Date().getTime();
  const cachedVal = scriptProperties.getProperty(cacheKey);
  const expireVal = scriptProperties.getProperty(expireKey);
  
  if (!forceRefresh && cachedVal && expireVal && parseInt(expireVal) > now) {
    return cachedVal;
  }
  
  const summary = getStudentDataSummary(studentName);
  
  // Set cache selama 5 menit (300000 ms)
  scriptProperties.setProperty(cacheKey, summary);
  scriptProperties.setProperty(expireKey, (now + 300000).toString());
  
  return summary;
}

function getStudentDataSummary(studentName) {
  const scores = getSupabaseStudentScores(studentName);
  const behavior = getSupabaseStudentBehavior(studentName);
  
  let summary = `NAMA SISWA: ${studentName}\n`;
  if (behavior) {
    summary += `KELAS: ${behavior.class_name}\n`;
    const demerits = behavior.total_points || 0;
    summary += `BEHAVIOR POIN: Sisa Poin Kelakuan ${100 - demerits}/100 (Total Poin Pelanggaran: ${demerits} Pts)\n`;
    
    const logs = getSupabaseStudentBehaviorLogs(behavior.id);
    if (logs.length > 0) {
      summary += `RIWAYAT PELANGGARAN:\n`;
      logs.forEach(log => {
        let dateStr = log.violation_date ? log.violation_date.split('T')[0] : "";
        if (dateStr) {
          const parts = dateStr.split('-');
          if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        summary += `- ${dateStr}: ${log.reason} (${log.points_delta} Pts)\n`;
      });
    } else {
      summary += `RIWAYAT PELANGGARAN: Bersih (Tidak ada catatan pelanggaran).\n`;
    }
  } else {
    summary += `KELAS: [Belum terdaftar di data behavior]\n`;
  }
  
  if (scores.length > 0) {
    summary += `NILAI UJIAN:\n`;
    scores.forEach(s => {
      const session = s.gm_sessions || {};
      const subject = session.subject || "Umum";
      const examType = session.exam_type || "Ujian";
      const kkm = session.kkm || 70;
      
      const isRemedial = s.final_score < kkm;
      const status = !isRemedial ? "Lulus KKM ✅" : "Remedial 🔄";
      
      let statusStr = `- ${subject} (${examType}): Nilai Akhir ${s.final_score} (KKM: ${kkm}) - ${status}`;
      if (isRemedial) {
        statusStr += `\n  🔗 Link Ujian Remedial: ${APP_URL}`;
      }
      summary += statusStr + `\n`;
    });
  } else {
    summary += `NILAI UJIAN: Belum ada data nilai ujian.\n`;
  }
  
  return summary;
}

// --- FUNGSI FILTRASI & VIP ---

function getPerlakuanKhusus(senderName) {
  if (!LOG_SHEET_ID || senderName === "Sobat") return null;
  try {
    const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
    const sheet = ss.getSheetByName("Pengetahuan");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let topik = data[i][0].toString().toLowerCase().trim();
      if (topik.startsWith("perlakuan khusus")) {
        let namaDiSheet = topik.replace("perlakuan khusus", "").trim();
        if (senderName.toLowerCase() === namaDiSheet || senderName.toLowerCase().includes(namaDiSheet)) return data[i][1].toString();
      }
    }
  } catch (e) { return null; }
  return null;
}

function getTunggakanInfo(senderName) {
  if (!LOG_SHEET_ID || senderName === "Sobat") return null;
  try {
    const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
    const sheet = ss.getSheetByName("Pengetahuan");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let topik = data[i][0].toString().toLowerCase().trim();
      if (topik.startsWith("tunggakan")) {
        let namaDiSheet = topik.replace("tunggakan", "").trim();
        if (senderName.toLowerCase() === namaDiSheet || senderName.toLowerCase().includes(namaDiSheet)) return data[i][1].toString();
      }
    }
  } catch (e) { return null; }
  return null;
}

function getKnowledgeBase() {
  if (!LOG_SHEET_ID) return "";
  try {
    const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
    const sheet = ss.getSheetByName("Pengetahuan") || ss.getSheets()[1];
    const data = sheet.getDataRange().getValues();
    let context = "";
    for (let i = 1; i < data.length; i++) {
      let topik = data[i][0].toString().toLowerCase();
      if (!topik.includes("tunggakan") && !topik.includes("perlakuan khusus") && data[i][0]) {
        context += `${data[i][0]}:${data[i][1]}|`;
      }
    }
    return context;
  } catch (e) { return ""; }
}

function updateTunggakanKeLunas(senderName) {
  if (!LOG_SHEET_ID) return;
  try {
    const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
    const sheet = ss.getSheetByName("Pengetahuan");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let topik = data[i][0].toString().toLowerCase().trim();
      if (topik.startsWith("tunggakan")) {
        let namaDiSheet = topik.replace("tunggakan", "").trim();
        if (senderName.toLowerCase() === namaDiSheet || senderName.toLowerCase().includes(namaDiSheet)) {
          sheet.getRange(i + 1, 1).setValue(data[i][0].toString().replace(/tunggakan/i, "Lunas"));
          return true;
        }
      }
    }
  } catch (e) {}
}

// --- FUNGSI SISTEM (OPTIMASI MEMBACA 100 BARIS TERAKHIR) ---

function getPromptManagement() {
  if (!LOG_SHEET_ID) return "";
  try {
    const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
    const sheet = ss.getSheetByName("Manajemen Prompt");
    const data = sheet.getDataRange().getValues();
    let context = "";
    for (let i = 1; i < data.length; i++) if (data[i][1]) context += data[i][1] + ". ";
    return context;
  } catch (e) { return ""; }
}

function getHistoryFromSheet(phone) {
  if (!LOG_SHEET_ID) return [];
  try {
    const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
    const sheet = ss.getSheets()[0];
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    // Hanya baca maksimal 100 baris riwayat terakhir untuk performa Apps Script
    const startRow = Math.max(2, lastRow - 100);
    const numRows = lastRow - startRow + 1;
    const data = sheet.getRange(startRow, 1, numRows, 6).getValues();
    
    let history = [];
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i][1] == phone) {
        history.unshift({ role: data[i][3] == "Assistant" ? "assistant" : "user", content: String(data[i][4]) });
        if (history.length >= MAX_HISTORY) break;
      }
    }
    return history;
  } catch (e) { return []; }
}

function logToSheet(phone, senderName, role, message, apiName) {
  if (!LOG_SHEET_ID) return;
  try {
    const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
    const sheet = ss.getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(["Waktu", "Nomor WA", "Nama Pengirim", "Role", "Pesan", "API"]);
    sheet.appendRow([new Date(), phone, senderName, role, message, apiName]);
  } catch (e) {}
}

function fetchSupabaseData(tableName, searchQuery) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return "";
  const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${tableName}?select=*&student_name=ilike.*${encodeURIComponent(searchQuery)}*&limit=1`;
  try {
    const options = { method: "get", headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY } };
    return UrlFetchApp.fetch(url, options).getContentText();
  } catch (e) { return ""; }
}

function processAIRequest(history, userMsg, introKey, phone, senderName, systemContent) {
  history.push({ role: "user", content: userMsg });
  if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

  let apiPool = [
    { key: 'GROQ_API_KEY_1', name: 'Groq 1' }, { key: 'GROQ_API_KEY_2', name: 'Groq 2' },
    { key: 'GROQ_API_KEY_3', name: 'Groq 3' }, { key: 'OPENROUTER_API_KEY', name: 'OpenRouter' },
    { key: 'GEMINI_API_KEY', name: 'Gemini' }, { key: 'POLLINATIONS_API_KEY', name: 'Pollinations' }
  ];

  if (!userMsg.toLowerCase().includes("buatkan gambar")) apiPool.sort(() => Math.random() - 0.5);
  else apiPool.sort((a, b) => a.key === 'POLLINATIONS_API_KEY' ? -1 : 1);

  logToSheet(phone, senderName, "User", userMsg, "Incoming");

  for (let i = 0; i < apiPool.length; i++) {
    const current = apiPool[i];
    const key = scriptProperties.getProperty(current.key);
    if (!key) continue;

    let dynamicSystem = systemContent + `\nAPI: ${current.name} hihi.`;
    let apiUrl, options, payload;

    if (current.key === 'POLLINATIONS_API_KEY') {
      apiUrl = "https://gen.pollinations.ai/v1/chat/completions";
      payload = { model: "openai", messages: [{ role: "system", content: dynamicSystem }, ...history], max_tokens: 300 };
    } else if (current.key === 'GEMINI_API_KEY') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      payload = { contents: [{ role: "user", parts: [{ text: `SYSTEM: ${dynamicSystem}\nHISTORY: ${JSON.stringify(history)}\nUSER: ${userMsg}` }] }] };
    } else if (current.key === 'OPENROUTER_API_KEY') {
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      payload = { model: "meta-llama/llama-3.3-70b-instruct", messages: [{ role: "system", content: dynamicSystem }, ...history], max_tokens: 300 };
    } else {
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      payload = { model: MODEL_NAME, messages: [{ role: "system", content: dynamicSystem }, ...history], max_tokens: 300 };
    }

    options = { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true };
    if (current.key !== 'GEMINI_API_KEY') options.headers = { "Authorization": "Bearer " + key };

    const response = UrlFetchApp.fetch(apiUrl, options);
    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      let aiResponse = (current.key === 'GEMINI_API_KEY') ? result.candidates[0].content.parts[0].text : result.choices[0].message.content;

      if (aiResponse.includes("[KONFIRMASI_LUNAS]")) {
        updateTunggakanKeLunas(senderName);
        aiResponse = aiResponse.replace("[KONFIRMASI_LUNAS]", "").trim();
      }

      logToSheet(phone, senderName, "Assistant", aiResponse, current.name);
      history.push({ role: "assistant", content: aiResponse });
      scriptProperties.setProperty(phone, JSON.stringify(history));
      scriptProperties.setProperty(introKey, "true");
      return sendResponse(aiResponse);
    }
  }
  return sendResponse("Jatah API penuh hehe.");
}

function sendResponse(text) {
  return ContentService.createTextOutput(JSON.stringify({ "reply": text })).setMimeType(ContentService.MimeType.JSON);
}
