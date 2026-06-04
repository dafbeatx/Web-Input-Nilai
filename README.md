# GradeMaster OS - Web Input Nilai

GradeMaster OS adalah platform manajemen pendidikan generasi berikutnya (Next-Gen Education Platform). Sistem ini difokuskan sebagai pionir otomatisasi *education management*, mulai dari ekstraksi nilai, presensi, hingga sistem manajemen pembelajaran (LMS) berbasis AI dengan desain antarmuka premium.

---

## 🚀 Fitur Unggulan

1. **AI-Powered Lesson Management:**
   * Otomatisasi ringkasan materi pembelajaran dan modul kuis otomatis.
   * Tanya-jawab interaktif dengan panduan AI.

2. **Advanced Proctoring & Exam Security:**
   * Pengawasan koneksi ujian (*heartbeat monitoring*) secara real-time via Telegram.
   * Analisis tingkat kecurangan siswa (*risk score*) berbasis riwayat deteksi aktivitas browser.
   * Deteksi kesamaan jawaban essay antar siswa (*similarity check*).

3. **Auto-Provisioning & Student Identity SSO:**
   * Alur binding identitas SSO Google dengan data induk absen siswa (`gm_behaviors`).
   * Pembatasan keamanan berjenjang menggunakan Supabase Row Level Security (RLS).

4. **Mesin Ekstraksi Data (OCR & Parser):**
   * Ekstraksi template nilai otomatis dari format Excel/SPSS.
   * Konversi dokumen tulisan tangan atau gambar menggunakan pipeline OCR canggih (Tesseract.js & fallback Gemini Vision / OCR.space API).

---

## 🛠️ Stack Teknologi

* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
* **Database & Auth:** Supabase (PostgreSQL with Row Level Security)
* **AI & Integration:** Groq (Llama 3.3 70b), Gemini API, Telegram Bot Webhook
* **Deployment:** Vercel

---

## 🏗️ Struktur Direktori Proyek

```text
/src
├── app/                  # Next.js App Router (Pages & API Routes)
├── components/           # UI Components (Atomic design & Domain-specific)
├── lib/                  # Core Logic, Server Actions, & Connections
└── database/             # SQL Declarations (Schema & RLS Policies)
```

---

## 🔒 Konfigurasi Keamanan & Environment
Aplikasi ini diisolasi secara ketat menggunakan environment variables. Pastikan berkas `.env.local` Anda memiliki variabel-variabel berikut sebelum dijalankan:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

---

*GradeMaster OS - Platform Manajemen Pembelajaran Cerdas & Terintegrasi.*
