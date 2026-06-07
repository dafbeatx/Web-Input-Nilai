/**
 * Bot WhatsAuto AI - GradeMaster OS (Ultimate Version: Token Saver + Supabase & Google Drive OCR)
 * Fitur: Respons Ringkas (Hemat Token), VIP Persona, Auto-Lunas, Smart Media, 6 API, Integrasi Supabase & OCR Drive.
 */

const scriptProperties = PropertiesService.getScriptProperties();
const SUPABASE_URL = scriptProperties.getProperty('SUPABASE_URL');
const SUPABASE_KEY = scriptProperties.getProperty('SUPABASE_KEY');
const LOG_SHEET_ID = scriptProperties.getProperty('LOG_SHEET_ID'); 
const APP_URL = scriptProperties.getProperty('APP_URL') || "https://web-input-nilai.vercel.app/"; // URL Web GradeMaster OS
const DRIVE_FOLDER_ID = "1LJQ9sf1TYFtRI_c5cCFU2dIwaoRSh_Zd"; // ID Folder Google Drive Anda
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

    // --- DEDUPLIKASI REQUEST (Anti-Duplicate & Anti-Timeout Loop) ---
    // Karena proses menunggu unggahan FolderSync bisa memakan waktu hingga belasan detik,
    // WhatsAuto di Android mungkin melakukan timeout dan mengirim ulang request yang sama (retry storm).
    // Kita filter request kembar dalam kurun waktu 20 detik untuk mencegah bot membalas berkali-kali.
    const now = new Date().getTime();
    const lastRequestKey = phone + "_last_req_time";
    const lastMsgKey = phone + "_last_req_msg";
    
    const lastReqTime = scriptProperties.getProperty(lastRequestKey);
    const lastReqMsg = scriptProperties.getProperty(lastMsgKey);
    
    if (lastReqTime && lastReqMsg === userMessage) {
      const timeDiff = now - parseInt(lastReqTime);
      if (timeDiff < 20000) { 
        // Mengembalikan balasan kosong agar WhatsAuto mengabaikan request duplikat ini
        return sendResponse(""); 
      }
    }
    // Catat waktu dan pesan request saat ini untuk filter berikutnya
    scriptProperties.setProperty(lastRequestKey, now.toString());
    scriptProperties.setProperty(lastMsgKey, userMessage);

    // --- RESET COMMAND ---
    if (msgLower.includes("/reset")) {
      scriptProperties.deleteProperty(phone);
      scriptProperties.deleteProperty(introKey);
      scriptProperties.deleteProperty(phone + "_state");
      scriptProperties.deleteProperty(phone + "_matches");
      scriptProperties.deleteProperty(phone + "_student_name");
      scriptProperties.deleteProperty(phone + "_student_cache");
      scriptProperties.deleteProperty(phone + "_student_cache_expire");
      scriptProperties.deleteProperty(phone + "_waiting_media");
      scriptProperties.deleteProperty(phone + "_waiting_media_time");
      logToSheet(phone, senderName, "User", userMessage, "Command Reset");
      return sendResponse("Sistem telah mereset memori dan tautan nama Anda. Sapa aku kembali, hehe.");
    }

    // --- DETEKSI PENGIRIMAN MEDIA & STATE DEFERRED ---
    const waitingMediaKey = phone + "_waiting_media";
    const waitingMediaTimeKey = phone + "_waiting_media_time";
    const isWaitingMedia = scriptProperties.getProperty(waitingMediaKey) === "true";
    const waitingMediaTime = parseInt(scriptProperties.getProperty(waitingMediaTimeKey) || "0");
    const isWaitingExpired = (now - waitingMediaTime) > 300000; // 5 menit

    // WhatsAuto mengirimkan teks penanda notifikasi seperti "📷 Foto", "📄 Dokumen", atau "[Pengguna mengirim...]"
    const isExplicitMedia = msgLower.indexOf("📷") !== -1 || 
                            msgLower.indexOf("🖼️") !== -1 ||
                            msgLower.indexOf("📄") !== -1 ||
                            msgLower.indexOf("📎") !== -1 ||
                            msgLower.indexOf("[pengguna mengirim") !== -1 ||
                            msgLower.indexOf("[sent a") !== -1 ||
                            (userMessage.startsWith("[") && userMessage.endsWith("]"));

    const isMediaKeyword = msgLower.indexOf("foto") !== -1 || 
                           msgLower.indexOf("photo") !== -1 ||
                           msgLower.indexOf("gambar") !== -1 || 
                           msgLower.indexOf("image") !== -1 ||
                           msgLower.indexOf("file") !== -1 || 
                           msgLower.indexOf("document") !== -1 ||
                           msgLower.indexOf("dokumen") !== -1 ||
                           /\b(bukti|transfer|bayar|lunas|ss|screenshot|kirim foto|kirim gambar)\b/i.test(userMessage);

    const isProsesKeyword = msgLower.includes("proses") || 
                            msgLower.includes("cek") || 
                            msgLower.includes("sudah") || 
                            msgLower.includes("lunas") || 
                            msgLower.includes("bukti");

    if (DRIVE_FOLDER_ID) {
      if (isExplicitMedia) {
        // 1. Kasus: Pengguna benar-benar mengirim Media fisik (WhatsAuto mengirim "📷 Foto" dsb.)
        // Lakukan pengecekan singkat sekali (max 2 detik) jika FolderSync super cepat
        let fileFound = null;
        for (let i = 0; i < 2; i++) {
          fileFound = getNewestImageFromDrive(DRIVE_FOLDER_ID, 60); // berkas max usia 60 detik
          if (fileFound) break;
          Utilities.sleep(1000);
        }

        if (fileFound) {
          // File terdeteksi instan, langsung diproses
          const ocrText = processFileWithOcrAndCleanup(fileFound);
          if (ocrText) {
            userMessage = `[Hasil pembacaan teks (OCR) otomatis dari foto/media bukti yang dikirim siswa: "${ocrText.replace(/\n/g, ' ')}"]`;
          } else {
            userMessage = `[Siswa mengirim gambar/media bukti, namun sistem gagal mendeteksi tulisan teks di dalamnya]`;
          }
        } else {
          // File belum terunggah (kasus umum FolderSync lambat ~1 menit)
          // Set status waiting agar ketika pengguna mengetik 'proses' berikutnya, kita cari berkasnya
          scriptProperties.setProperty(waitingMediaKey, "true");
          scriptProperties.setProperty(waitingMediaTimeKey, now.toString());
          
          logToSheet(phone, senderName, "User", userMessage, "Deferred Media Waiting");
          return sendResponse("📷 *Foto bukti terdeteksi!*\n\nSedang diunggah ke Google Drive (butuh sekitar 30–60 detik oleh FolderSync).\n\n👉 **Setelah 30 detik, balas chat ini dengan mengetik 'proses'** untuk memverifikasi bukti/foto Anda.");
        }
      } else if (isWaitingMedia && !isWaitingExpired) {
        // 2. Kasus: Kita sedang menunggu media, dan pengguna mengirim pesan selanjutnya
        // Coba cari berkas baru di Google Drive (maks usia 600 detik/10 menit untuk toleransi waktu)
        let fileFound = getNewestImageFromDrive(DRIVE_FOLDER_ID, 600);
        
        if (fileFound) {
          const ocrText = processFileWithOcrAndCleanup(fileFound);
          // Hapus status menunggu media karena berkas sudah ditemukan & diproses
          scriptProperties.deleteProperty(waitingMediaKey);
          scriptProperties.deleteProperty(waitingMediaTimeKey);

          if (ocrText) {
            userMessage = `[Hasil pembacaan teks (OCR) otomatis dari foto/media bukti yang dikirim siswa: "${ocrText.replace(/\n/g, ' ')}"]`;
          } else {
            userMessage = `[Siswa mengirim gambar/media bukti, namun sistem gagal mendeteksi tulisan teks di dalamnya]`;
          }
        } else {
          // Berkas belum masuk ke Drive
          if (isProsesKeyword) {
            // Jika memang mengetik proses/bukti, beri peringatan sabar
            return sendResponse("⏳ *Foto bukti belum terdeteksi di sistem.*\n\nFolderSync Anda mungkin masih proses mengunggah atau internet HP lambat. Mohon tunggu 15-30 detik lagi, lalu ketik **'proses'** kembali.");
          }
          // Jika ketik chat biasa, biarkan berjalan normal (jangan di-intersep, tapi jangan hapus status tunggu)
        }
      } else if (isMediaKeyword) {
        // 3. Kasus: Hanya kata kunci tekstual (contoh: "saya mau kirim foto bukti") tanpa pesan media asli
        // Cek cepat 2 detik barangkali file sudah di-upload sebelumnya
        let fileFound = getNewestImageFromDrive(DRIVE_FOLDER_ID, 300);
        if (fileFound) {
          const ocrText = processFileWithOcrAndCleanup(fileFound);
          if (ocrText) {
            userMessage = `[Hasil pembacaan teks (OCR) otomatis dari foto/media bukti yang dikirim siswa: "${ocrText.replace(/\n/g, ' ')}"]`;
          } else {
            userMessage = `[Siswa mengirim gambar/media bukti, namun sistem gagal mendeteksi tulisan teks di dalamnya]`;
          }
        }
      }
    }

    // --- STATE & DATA MANAGEMENT ---
    const state = scriptProperties.getProperty(phone + "_state");
    const matchesJson = scriptProperties.getProperty(phone + "_matches");
    const linkedName = scriptProperties.getProperty(phone + "_student_name");

    // Deteksi apakah user menanyakan nilai, kelakuan, atau mengeluhkan masalah/error/remedial
    const keywords = ["nilai", "raport", "remedial", "remed", "remedi", "ujian", "tes", "ulangan", "skor", "poin", "pelanggaran", "sanksi", "kelakuan", "sikap", "behavior", "kkm", "error", "masalah", "gagal", "macet", "stuck", "tidak bisa", "kendala", "link", "keluar", "buka"];
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
      const potentialName = scriptProperties.getProperty(phone + "_potential_name");
      const agreementWords = ["ya", "yes", "betul", "benar", "ok", "oke", "yup", "yo", "sip"];
      
      let matchedName = "";
      
      const isAgreeing = potentialName && (
        agreementWords.indexOf(msgLower) !== -1 || 
        msgLower === "ya" || 
        msgLower === "betul" || 
        msgLower === "benar" ||
        msgLower.startsWith("ya ") ||
        msgLower.startsWith("betul ") ||
        msgLower.startsWith("benar ")
      );

      if (isAgreeing) {
        matchedName = potentialName;
      }
      
      const matches = matchedName ? [matchedName] : findStudentName(userMessage);
      
      if (matches.length === 0) {
        // Alihkan ke AI jika tidak ada kecocokan nama, agar AI membalas secara cerdas dan ramah
        return processAIWithData(phone, senderName, userMessage, introKey, "", "AWAITING_NAME_NO_MATCH");
      } else if (matches.length === 1) {
        const matchedName = matches[0];
        scriptProperties.setProperty(phone + "_student_name", matchedName);
        scriptProperties.deleteProperty(phone + "_state");
        scriptProperties.deleteProperty(phone + "_potential_name");
        
        // Ambil data terbaru (force refresh karena baru menautkan nama)
        const studentSummary = getStudentDataSummaryWithCache(phone, matchedName, true);
        return processAIWithData(phone, senderName, userMessage, introKey, studentSummary);
      } else {
        scriptProperties.setProperty(phone + "_matches", JSON.stringify(matches));
        scriptProperties.deleteProperty(phone + "_potential_name");
        let replyMsg = `Ditemukan beberapa nama yang mirip di database:\n`;
        for (let i = 0; i < matches.length; i++) {
          replyMsg += `${i + 1}. ${matches[i]}\n`;
        }
        replyMsg += `\nTolong balas dengan mengetik angka nomor pilihanmu (contoh: 1) ya, hehe.`;
        return sendResponse(replyMsg);
      }
    }

    // --- KASUS C: Alur Normal (Belum tertaut nama, tapi menanyakan data/remedial/error) ---
    if (isQuerying && !linkedName) {
      // Cek kecocokan nama kontak WhatsApp (senderName) secara proaktif
      let contactMatchName = null;
      if (senderName && senderName !== "Sobat") {
        const contactMatches = findStudentName(senderName);
        if (contactMatches.length === 1) {
          contactMatchName = contactMatches[0];
        }
      }

      scriptProperties.setProperty(phone + "_state", "AWAITING_NAME");
      
      if (contactMatchName) {
        scriptProperties.setProperty(phone + "_potential_name", contactMatchName);
        return sendResponse(`Boleh tahu siapa nama lengkap kamu sesuai absen? (Saya mendeteksi nama kontak WhatsApp kamu "${senderName}" cocok dengan "${contactMatchName}", apakah betul itu kamu? Balas "Ya" jika benar, atau ketik nama lengkap kamu yang sesuai absen jika bukan, hehe).`);
      } else {
        return sendResponse("Boleh tahu siapa nama lengkap kamu? (Tulis nama lengkap sesuai absen ya) hehe.");
      }
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

function processAIWithData(phone, senderName, userMsg, introKey, studentSummary, nameErrorState) {
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
  2. HANYA berikan jawaban panjang & detail jika membahas JASA (Skripsi, Turnitin, dsb), TUNGGAKAN, DATA SISWA, atau PEMBUATAN DOKUMEN/FORMAT.
  
  ATURAN PEMBUATAN DOKUMEN/FORMAT (.docx):
  1. Jika user meminta dibuatkan dokumen, template, format, atau surat (misal surat izin, invoice, draf tugas, dll.), JANGAN langsung membuat dokumen atau mengirimkan link.
  2. Tanya-jawab terlebih dahulu secara bertahap untuk mengumpulkan informasi spesifik yang dibutuhkan (seperti nama lengkap, tanggal, keperluan, dll) agar dokumennya nanti lengkap dan siap pakai.
  3. Setelah semua informasi yang diperlukan telah diberikan oleh user, buat dokumen tersebut secara lengkap dan WAJIB bungkus seluruh isi dokumennya di dalam tag: [CREATE_DOCX: Judul Dokumen]Isi Dokumen Lengkap[/CREATE_DOCX]. JANGAN pernah menuliskan isi dokumen di luar tag tersebut atau langsung di chat, karena sistem memerlukan tag ini untuk memproses file Google Docs.
  
  ${perlakuanKhusus ? `[VIP ${senderName}]: ${perlakuanKhusus}` : ""}

  INFO PENTING:
  - Buku Pintar: ${bukuPintar}
  - Instruksi Tambahan: ${promptCustom}
  - Tunggakan ${senderName}: ${infoTunggakan ? infoTunggakan + " (Gunakan kode [KONFIRMASI_LUNAS] jika sudah bayar)" : "Lunas"}.
  - Layanan: Turnitin ${hargaTurnitin}, Skripsi 800k-1jt. Rek: SeaBank ${seaBankAkun}.
  ${studentSummary ? `\n- DATA SISWA TERTAUT:\n${studentSummary}` : ""}

  SOP: Ramah, Profesional, akhiri dengan "hihi" atau "hehe". Media: Jika kirim file tanpa teks, asumsikan bukti transfer jika sedang transaksi.`;

  if (nameErrorState === "AWAITING_NAME_NO_MATCH") {
    systemContent += `\n\nPENTING: Pengguna saat ini sedang diminta untuk memasukkan nama lengkap siswa, tetapi pesan terakhir mereka ("${userMsg}") tidak cocok dengan data siswa mana pun di database GradeMaster.
    Tolong bantu pengguna secara cerdas dan ramah:
    1. Jika pesan tersebut berisi pertanyaan umum, keluhan, penjelasan, atau sekadar salam, jawab pertanyaan atau tanggapi pesan mereka terlebih dahulu secara ringkas.
    2. Sampaikan secara santun dan halus bahwa nama yang dimasukkan tidak ditemukan di data GradeMaster.
    3. Ingatkan kembali pengguna dengan sopan untuk mengetikkan nama lengkap mereka yang terdaftar di absen agar data penilaian/remedial mereka bisa dicari.
    4. Beritahu mereka bahwa mereka bisa mengetik /reset kapan saja untuk membatalkan pencarian nama dan mengulang kembali.
    5. Akhiri respons dengan ciri khas "hihi" atau "hehe".`;
  }

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
  const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/gm_students?select=id,final_score,remedial_status,remedial_score,original_score,risk_level,violation_count,is_blocked,cheating_flags,gm_sessions(id,subject,exam_type,kkm)&name=eq.${encodeURIComponent(studentName)}&is_deleted=eq.false`;
  
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

function getSupabaseRemedialAttempts(studentId) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !studentId) return [];
  const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/gm_remedial_attempts?select=attempt_number,status,risk_score,risk_level,risk_flags,essay_score_auto,started_at,completed_at&student_id=eq.${studentId}&order=attempt_number.desc&limit=3`;
  
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
    logToSheet("system", "error", "getRemedialAttempts", e.toString(), "Error");
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

      // Ambil riwayat upaya remedial khusus siswa ini
      if (s.id) {
        const attempts = getSupabaseRemedialAttempts(s.id);
        if (attempts && attempts.length > 0) {
          summary += `  * RIWAYAT UPAYA REMEDIAL & KEPATUHAN PROCTORING:\n`;
          attempts.forEach(att => {
            let attDate = att.started_at ? att.started_at.split('T')[0] : "";
            if (attDate) {
              const parts = attDate.split('-');
              if (parts.length === 3) attDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            summary += `    - Upaya #${att.attempt_number} (Status: ${att.status}) tgl ${attDate || 'baru-baru ini'}:\n`;
            summary += `      > Tingkat Risiko Kecurangan: ${att.risk_level || 'LOW'} (Skor Risiko: ${att.risk_score || 0})\n`;
            
            let riskFlags = [];
            if (att.risk_flags) {
              try {
                riskFlags = typeof att.risk_flags === 'string' ? JSON.parse(att.risk_flags) : att.risk_flags;
              } catch(e) {}
            }
            if (riskFlags && riskFlags.length > 0) {
              summary += `      > Indikasi Kecurangan: ${riskFlags.join(', ')}\n`;
            }
            if (att.essay_score_auto) {
              summary += `      > Evaluasi Nilai Essay AI: ${att.essay_score_auto}\n`;
            }
          });
        }
      }
    });
  } else {
    summary += `NILAI UJIAN: Belum ada data nilai ujian.\n`;
  }
  
  return summary;
}

// --- FUNGSI PEMBUATAN DOKUMEN .DOCX GRATIS ---

function createDocxFromText(title, contentText) {
  try {
    const doc = DocumentApp.create(title);
    const body = doc.getBody();
    body.setText(contentText);
    doc.saveAndClose();
    
    const docId = doc.getId();
    const file = DriveApp.getFileById(docId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    if (DRIVE_FOLDER_ID) {
      try {
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        file.moveTo(folder);
      } catch (err) {
        logToSheet("system", "error", "moveDocToFolder", err.toString(), "Error");
      }
    }
    
    const viewUrl = "https://docs.google.com/document/d/" + docId + "/edit?usp=drivesdk";
    const downloadUrl = "https://docs.google.com/document/d/" + docId + "/export?format=docx";
    
    return {
      viewUrl: viewUrl,
      downloadUrl: downloadUrl
    };
  } catch (e) {
    logToSheet("system", "error", "createDocxFromText", e.toString(), "Error");
    return null;
  }
}

// --- FUNGSI DETEKSI & OCR DRIVE ---

// Mencari file gambar/media terbaru di folder Drive yang usianya < maxAgeSeconds (memakai searchFiles agar efisien)
function getNewestImageFromDrive(folderId, maxAgeSeconds) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    // Cari file dengan jenis gambar atau biner umum via searchFiles (sangat cepat & hemat performa)
    const files = folder.searchFiles("mimeType contains 'image/' or mimeType = 'application/octet-stream' or title contains '.jpg' or title contains '.png' or title contains '.jpeg' or title contains '.heic'");
    const now = new Date().getTime();
    
    let newestFile = null;
    let newestTime = 0;
    
    while (files.hasNext()) {
      const file = files.next();
      const createdTime = file.getDateCreated().getTime();
      const lastUpdatedTime = file.getLastUpdated().getTime();
      
      // Menggunakan waktu interaksi terbaru (karena proses sinkronisasi sering kali memperbarui tanggal modifikasi)
      const fileTime = Math.max(createdTime, lastUpdatedTime);
      const age = (now - fileTime) / 1000;
      
      // Filter file berumur baru
      if (age < maxAgeSeconds) {
        if (fileTime > newestTime) {
          newestTime = fileTime;
          newestFile = file;
        }
      }
    }
    return newestFile;
  } catch (e) {
    logToSheet("system", "error", "getNewestImageFromDrive", e.toString(), "Error");
  }
  return null;
}

// Memproses berkas gambar: memastikan unggahan selesai, melakukan OCR, dan menghapus berkas
function processFileWithOcrAndCleanup(fileFound) {
  let fileSize = 0;
  try { fileSize = fileFound.getSize(); } catch(e) {}
  
  for (let attempt = 0; attempt < 3; attempt++) {
    if (fileSize > 0) {
      break;
    }
    Utilities.sleep(1000);
    try { fileSize = fileFound.getSize(); } catch(e) {}
  }
  // Jeda ekstra 1.5 detik agar Google Drive menutup stream penulisan & menyelesaikan rendering berkas
  Utilities.sleep(1500);

  const ocrText = performOcrOnDriveFile(fileFound.getId());
  
  // Hapus file gambar asli dari Google Drive agar penyimpanan tetap lega (0 MB)
  try {
    if (typeof Drive !== 'undefined') {
      Drive.Files.remove(fileFound.getId());
    } else {
      fileFound.setTrashed(true);
    }
    Logger.log("[processFileWithOcrAndCleanup] Berhasil menghapus file asal dari Drive.");
  } catch(e) {
    Logger.log("[processFileWithOcrAndCleanup] Gagal menghapus file asal: " + e.toString());
    logToSheet("system", "error", "removeOriginalFile", e.toString(), "Error");
  }
  
  return ocrText;
}

// Mengonversi gambar menjadi Google Doc sementara untuk OCR dan mengekstrak teksnya.
// Jika Google Drive OCR gagal atau terkena pembatasan (rate limit), sistem secara otomatis
// beralih (fallback) ke multimodal Gemini API (jika kunci tersedia) atau OCR.space API.
function performOcrOnDriveFile(fileId) {
  let blob = null;
  try {
    const file = DriveApp.getFileById(fileId);
    blob = file.getBlob();
    
    // Koreksi MIME Type jika bertipe application/octet-stream tetapi berformat gambar berdasarkan nama berkas
    let mimeType = blob.getContentType();
    const fileName = file.getName().toLowerCase();
    Logger.log("[performOcrOnDriveFile] MIME asal: " + mimeType + ", Nama berkas: " + fileName);
    
    if (mimeType === "application/octet-stream" || !mimeType) {
      let correctedMime = "image/jpeg";
      if (fileName.endsWith(".png")) {
        correctedMime = "image/png";
      } else if (fileName.endsWith(".gif")) {
        correctedMime = "image/gif";
      }
      blob = blob.setContentType(correctedMime);
      Logger.log("[performOcrOnDriveFile] MIME dikoreksi menjadi: " + correctedMime);
    }
    
    let docId = null;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = "";
    
    while (attempts < maxAttempts && !docId) {
      try {
        // 1. Coba gunakan Advanced Service (Drive) jika diaktifkan oleh pengguna di Editor Google Apps Script
        if (typeof Drive !== 'undefined') {
          Logger.log("[performOcrOnDriveFile] Menggunakan Advanced Service (Drive)... (Percobaan ke-" + (attempts + 1) + ")");
          const resource = {
            title: "OCR Temp Doc"
          };
          const doc = Drive.Files.insert(resource, blob, { ocr: true, ocrLanguage: "id" });
          docId = doc.id;
          Logger.log("[performOcrOnDriveFile] Berhasil membuat Temp Doc via Advanced Service. ID: " + docId);
        } else {
          // 2. Fallback REST API: Unggah berkas menggunakan Binary Multipart Upload asli
          Logger.log("[performOcrOnDriveFile] Advanced Service dinonaktifkan. Menggunakan REST API Fallback... (Percobaan ke-" + (attempts + 1) + ")");
          const metadata = {
            title: "OCR Temp Doc"
          };
          
          const boundary = "antigravity_ocr_boundary";
          const delimiter = "\r\n--" + boundary + "\r\n";
          const closeDelimiter = "\r\n--" + boundary + "--";
          
          const header = delimiter +
            "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
            JSON.stringify(metadata) +
            delimiter +
            "Content-Type: " + blob.getContentType() + "\r\n" +
            "Content-Transfer-Encoding: binary\r\n\r\n";
            
          const headerBytes = Utilities.newBlob(header).getBytes();
          const fileBytes = blob.getBytes();
          const footerBytes = Utilities.newBlob(closeDelimiter).getBytes();
          
          // Menggabungkan byte array secara efisien tanpa manipulasi string base64 yang merusak biner
          const payloadBytes = [];
          for (let i = 0; i < headerBytes.length; i++) payloadBytes.push(headerBytes[i]);
          for (let i = 0; i < fileBytes.length; i++) payloadBytes.push(fileBytes[i]);
          for (let i = 0; i < footerBytes.length; i++) payloadBytes.push(footerBytes[i]);
          
          const url = "https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart&ocr=true&ocrLanguage=id";
          const options = {
            method: "post",
            contentType: "multipart/related; boundary=" + boundary,
            headers: {
              "Authorization": "Bearer " + ScriptApp.getOAuthToken()
            },
            payload: payloadBytes,
            muteHttpExceptions: true
          };
          
          Logger.log("[performOcrOnDriveFile] Mengirim request UrlFetchApp ke Drive API...");
          const response = UrlFetchApp.fetch(url, options);
          Logger.log("[performOcrOnDriveFile] Respon HTTP Status: " + response.getResponseCode());
          
          if (response.getResponseCode() === 200) {
            const docInfo = JSON.parse(response.getContentText());
            docId = docInfo.id;
            Logger.log("[performOcrOnDriveFile] Berhasil membuat Temp Doc via REST API. ID: " + docId);
          } else {
            throw new Error("HTTP OCR Fallback failed: [Status " + response.getResponseCode() + "] " + response.getContentText());
          }
        }
      } catch (e) {
        lastError = e.toString();
        Logger.log("[performOcrOnDriveFile] ERROR pada percobaan ke-" + (attempts + 1) + ": " + lastError);
        
        // Cek jika error merupakan rate limit / kelebihan kuota
        if (lastError.includes("rate limit") || lastError.includes("Rate Limit") || lastError.includes("exceeded") || lastError.includes("429") || lastError.includes("403")) {
          const delay = (attempts + 1) * 2000;
          Logger.log("[performOcrOnDriveFile] Terdeteksi Rate/Quota Limit. Menunggu " + delay + "ms sebelum mencoba kembali...");
          Utilities.sleep(delay);
        } else {
          // Jika error lain, tetap coba lagi dengan jeda standar (atau lempar jika sudah maksimal)
          if (attempts >= maxAttempts - 1) {
            break;
          }
          Utilities.sleep(1000);
        }
      }
      attempts++;
    }
    
    if (docId) {
      // 3. Baca konten teks hasil OCR dari berkas Google Doc yang baru terbentuk
      Logger.log("[performOcrOnDriveFile] Membuka Google Doc ID: " + docId + " untuk ekstraksi teks...");
      const docFile = DocumentApp.openById(docId);
      const extractedText = docFile.getBody().getText().trim();
      Logger.log("[performOcrOnDriveFile] Ekstraksi berhasil. Panjang teks: " + extractedText.length);
      
      // 4. Hapus dokumen Google Doc sementara agar tidak menyampah di Drive
      try {
        if (typeof Drive !== 'undefined') {
          Drive.Files.remove(docId);
        } else {
          DriveApp.getFileById(docId).setTrashed(true);
        }
        Logger.log("[performOcrOnDriveFile] Berhasil menghapus Temp Doc.");
      } catch (err) {
        Logger.log("[performOcrOnDriveFile] Gagal menghapus Temp Doc: " + err.toString());
      }
      
      return extractedText;
    }
  } catch (e) {
    Logger.log("[performOcrOnDriveFile] Gagal menggunakan Google Drive OCR: " + e.toString());
  }

  // === JALUR PIPA OCR ALTERNATIF (FALLBACK PIPELINE) ===
  Logger.log("[performOcrOnDriveFile] Memulai jalur pipa OCR alternatif (Gemini / OCR.space)...");
  if (blob) {
    // 1. Coba menggunakan Gemini API (Vision Multimodal)
    const geminiKey = scriptProperties.getProperty("GEMINI_API_KEY");
    if (geminiKey) {
      const geminiText = performOcrWithGemini(blob, geminiKey);
      if (geminiText) {
        Logger.log("[performOcrOnDriveFile] OCR alternatif SUKSES menggunakan Gemini API!");
        return geminiText;
      }
    } else {
      Logger.log("[performOcrOnDriveFile] GEMINI_API_KEY tidak disetel di Script Properties.");
    }
    
    // 2. Coba menggunakan OCR.space API
    const ocrSpaceKey = scriptProperties.getProperty("OCR_SPACE_KEY") || "helloworld";
    const ocrSpaceText = performOcrWithOcrSpace(blob, ocrSpaceKey);
    if (ocrSpaceText) {
      Logger.log("[performOcrOnDriveFile] OCR alternatif SUKSES menggunakan OCR.space API!");
      return ocrSpaceText;
    }
  }
  
  Logger.log("[performOcrOnDriveFile] ❌ SEMUA ALUR OCR GAGAL!");
  return "";
}

// Fallback OCR menggunakan Gemini API (Vision Multimodal)
function performOcrWithGemini(blob, key) {
  try {
    const base64Data = Utilities.base64Encode(blob.getBytes());
    let mimeType = blob.getContentType();
    if (!mimeType || mimeType === "application/octet-stream") {
      mimeType = "image/jpeg";
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const payload = {
      contents: [{
        parts: [
          { text: "Tolong baca dan ketik ulang semua tulisan teks yang ada di dalam gambar ini secara utuh (terutama nama siswa, nominal uang, tanggal, dan status lunas jika ada bukti pembayaran). Jangan tambahkan komentar apa pun, cukup kembalikan teks yang terbaca." },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }]
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    Logger.log("[performOcrWithGemini] Mencoba OCR menggunakan Gemini 1.5 Flash...");
    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      if (json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts[0]) {
        const text = json.candidates[0].content.parts[0].text.trim();
        Logger.log("[performOcrWithGemini] Berhasil mengekstrak teks via Gemini. Panjang: " + text.length);
        return text;
      }
    }
    Logger.log("[performOcrWithGemini] Gagal. Respon: " + response.getContentText());
  } catch (e) {
    Logger.log("[performOcrWithGemini] Eror: " + e.toString());
  }
  return "";
}

// Fallback OCR menggunakan OCR.space API
function performOcrWithOcrSpace(blob, apiKey) {
  try {
    const url = "https://api.ocr.space/Parse/Image";
    const base64Data = Utilities.base64Encode(blob.getBytes());
    let mimeType = blob.getContentType();
    if (!mimeType || mimeType === "application/octet-stream") {
      mimeType = "image/jpeg";
    }
    
    const payload = {
      apikey: apiKey,
      base64Image: "data:" + mimeType + ";base64," + base64Data,
      language: "ind",
      isOverlayRequired: "false"
    };
    
    const options = {
      method: "post",
      payload: payload,
      muteHttpExceptions: true
    };
    
    Logger.log("[performOcrWithOcrSpace] Mencoba OCR menggunakan OCR.space API...");
    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      if (json && json.ParsedResults && json.ParsedResults.length > 0) {
        const text = json.ParsedResults[0].ParsedText || "";
        Logger.log("[performOcrWithOcrSpace] Berhasil mengekstrak teks via OCR.space. Panjang: " + text.length);
        return text.trim();
      }
    }
    Logger.log("[performOcrWithOcrSpace] Gagal. Respon: " + response.getContentText());
  } catch (e) {
    Logger.log("[performOcrWithOcrSpace] Eror: " + e.toString());
  }
  return "";
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
      payload = { model: "openai", messages: [{ role: "system", content: dynamicSystem }, ...history], max_tokens: 1200 };
    } else if (current.key === 'GEMINI_API_KEY') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      payload = { contents: [{ role: "user", parts: [{ text: `SYSTEM: ${dynamicSystem}\nHISTORY: ${JSON.stringify(history)}\nUSER: ${userMsg}` }] }] };
    } else if (current.key === 'OPENROUTER_API_KEY') {
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      payload = { model: "meta-llama/llama-3.3-70b-instruct", messages: [{ role: "system", content: dynamicSystem }, ...history], max_tokens: 1200 };
    } else {
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      payload = { model: MODEL_NAME, messages: [{ role: "system", content: dynamicSystem }, ...history], max_tokens: 1200 };
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

      // Parser Pembuatan Dokumen DOCX otomatis (Robust Regex Match)
      const docxRegex = /\[CREATE_DOCX:\s*([^\]]+)\]([\s\S]*?)\[\/CREATE_DOCX\]/i;
      const matchDocx = aiResponse.match(docxRegex);
      if (matchDocx) {
        const title = matchDocx[1].trim();
        const docContent = matchDocx[2].trim();
        
        const docResult = createDocxFromText(title, docContent);
        if (docResult) {
          const replacementText = `📝 *Dokumen Telah Berhasil Dibuat!*\n` +
                                  `*Judul:* ${title}\n\n` +
                                  `👉 *Link Edit Google Docs:* ${docResult.viewUrl}\n` +
                                  `👉 *Link Download .docx:* ${docResult.downloadUrl}\n\n` +
                                  `Silakan klik salah satu link di atas untuk mengakses dokumen Anda.`;
          aiResponse = aiResponse.replace(matchDocx[0], replacementText);
        } else {
          aiResponse = aiResponse.replace(matchDocx[0], "\n*(Gagal membuat dokumen otomatis, mohon coba sesaat lagi)*\n");
        }
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

function initSetup() {
  // JALANKAN FUNGSI INI SEKALI DI EDITOR GOOGLE APPS SCRIPT
  // Ganti URL dengan URL web GradeMaster Anda yang asli jika nanti berubah.
  PropertiesService.getScriptProperties().setProperty('APP_URL', 'https://web-input-nilai.vercel.app/');
  Logger.log("APP_URL berhasil disetel!");
}

/**
 * =========================================================================
 * 🛠️ DIAGNOSTIC TOOL: UJI COBA OCR DRIVE & DIAGNOSIS OTORISASI (STEP-BY-STEP)
 * =========================================================================
 * FUNGSI INI DIGUNAKAN UNTUK MEMASTIKAN DRIVE API SUDAH DIAKTIFKAN DAN
 * GAS MEMILIKI AKSES DRIVE WRITE SECARA PENUH.
 * 
 * Cara Penggunaan:
 * 1. Unggah berkas gambar uji coba (.jpg/.png) ke folder Google Drive Anda.
 * 2. Buka Editor Google Apps Script, pilih fungsi "testOcr" di dropdown atas.
 * 3. Klik "Run" (Jalankan).
 * 4. Jika ada pop-up "Otorisasi Diperlukan", selesaikan langkah perizinan.
 * 5. Buka Execution Log (Log Eksekusi) di bagian bawah untuk membaca hasilnya.
 */
function testOcr() {
  const folderId = DRIVE_FOLDER_ID;
  Logger.log("=== MEMULAI DIAGNOSIS OCR DRIVER GRADEMASTER ===");
  Logger.log("Menghubungi Folder Drive dengan ID: " + folderId);
  
  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    let fileFound = null;
    
    while (files.hasNext()) {
      const file = files.next();
      Logger.log("👉 Berkas terdeteksi di Drive: " + file.getName() + " (MIME: " + file.getMimeType() + ")");
      fileFound = file;
      break;
    }
    
    if (!fileFound) {
      Logger.log("❌ ERROR: TIDAK MENEMUKAN BERKAS DI FOLDER DRIVE!");
      Logger.log("Solusi: Unggah satu file gambar bukti (.jpg/.png) apa saja secara manual ke folder Drive Anda terlebih dahulu, lalu jalankan ulang tes ini!");
      return;
    }
    
    Logger.log("🚀 Menjalankan proses ekstraksi OCR pada berkas: " + fileFound.getName() + " (ID: " + fileFound.getId() + ")");
    const ocrText = performOcrOnDriveFile(fileFound.getId());
    
    Logger.log("📝 HASIL OCR YANG DIDETEKSI:");
    Logger.log("=========================================");
    Logger.log(ocrText ? ocrText : "[TEKS KOSONG / DRIVE API BELUM DIAKTIFKAN]");
    Logger.log("=========================================");
    
    if (ocrText) {
      Logger.log("✅ SUKSES BESAR! Sistem Google Drive OCR Anda berfungsi dengan sempurna!");
    } else {
      Logger.log("❌ GAGAL: OCR mengembalikan teks kosong.");
      Logger.log("Rekomendasi Utama: Pastikan Anda sudah mengaktifkan 'Drive API' di menu 'Services' (+) di panel sebelah kiri!");
    }
  } catch (e) {
    Logger.log("💥 CRITICAL ERROR SAAT PENGUJIAN: " + e.toString());
    if (e.toString().includes("Drive")) {
      Logger.log("👉 Analisis: Apps Script Anda tidak diizinkan mengakses Drive. Aktifkan 'Drive API' di panel Services sebelah kiri!");
    }
  }
  Logger.log("=== DIAGNOSIS DIAGNOSTIK SELESAI ===");
}
