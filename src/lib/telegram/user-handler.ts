import { sendMessage, sendInlineKeyboard, supabase } from './bot';

const userConversations = new Map<number, { step: string; data: Record<string, unknown> }>();

export async function handleUserCommand(chatId: number, text: string) {
  const conv = userConversations.get(chatId);

  if (text === '/start') {
    userConversations.delete(chatId);
    await sendMessage(
      chatId,
      `🎓 <b>Selamat Datang di GradeMaster Bot</b>\n\n` +
      `Bot ini dirancang khusus untuk memudahkan Anda (Siswa/Orang Tua) dalam melihat hasil nilai ujian secara mandiri.\n\n` +
      `📝 <b>Cara Penggunaan:</b>\n` +
      `1. Ketik /nilai atau klik tombol di bawah.\n` +
      `2. Pilih <b>Kelas</b> Anda (contoh: 9A).\n` +
      `3. Pilih <b>Mata Pelajaran</b>.\n` +
      `4. Pilih <b>Jenis Ujian</b> (UTS/UAS/PAS).\n` +
      `5. Pilih <b>Tahun Ajaran</b>.\n` +
      `6. Pilih <b>Nama</b> Anda dari daftar.\n\n` +
      `Sistem akan menampilkan Detail Nilai, Ranking, dan Statistik Kelas Anda secara otomatis.`
    );
    // Auto-trigger /nilai for better UX
    return handleUserCommand(chatId, '/nilai');
  }

  if (text === '/help') {
    await sendMessage(
      chatId,
      `📖 <b>Panduan Lengkap Pencarian Nilai:</b>\n\n` +
      `Pastikan Anda menyiapkan data berikut:\n` +
      `• <b>Nama Lengkap:</b> Harus sesuai dengan yang terdaftar di sekolah.\n` +
      `• <b>Kelas:</b> Pilih dari daftar yang tersedia.\n` +
      `• <b>Mata Pelajaran:</b> Pilih dari daftar sesi yang aktif.\n\n` +
      `Jika nilai belum muncul, kemungkinan Admin belum meng-upload hasil untuk sesi tersebut.\n\n` +
      `Ketik /nilai untuk memulai.`
    );
    return;
  }

  if (text === '/nilai') {
    userConversations.delete(chatId);
    const { data: sessions } = await supabase
      .from('gm_sessions')
      .select('class_name')
      .eq('is_demo', false)
      .order('class_name');

    if (!sessions || sessions.length === 0) {
      await sendMessage(chatId, '📭 <b>Maaf,</b> saat ini belum ada data kelas yang tersedia di sistem.');
      return;
    }

    const uniqueClasses = [...new Set(sessions.map(s => s.class_name).filter(Boolean))];
    if (uniqueClasses.length === 0) {
      await sendMessage(chatId, '📭 <b>Maaf,</b> saat ini belum ada data kelas yang tersedia di sistem.');
      return;
    }

    const keyboard = [];
    for (let i = 0; i < uniqueClasses.length; i += 3) {
      const row = uniqueClasses.slice(i, i + 3).map(c => ({
        text: `📍 Kelas ${c}`,
        callback_data: `user_class::${c}`,
      }));
      keyboard.push(row);
    }

    userConversations.set(chatId, { step: 'waiting_class', data: {} });
    await sendInlineKeyboard(chatId, '🏫 <b>Langkah 1:</b> Silakan pilih <b>Kelas</b> Anda:', keyboard);
    return;
  }

  if (conv) {
    await handleUserConversation(chatId, text, conv);
    return;
  }

  await sendMessage(chatId, '🤖 Maaf, saya tidak mengerti perintah tersebut. Silakan ketik /nilai untuk mencari nilai.');
}

export async function handleUserCallback(chatId: number, callbackData: string) {
  const conv = userConversations.get(chatId);
  const [action, value] = callbackData.split('::');

  if (action === 'user_class' && value) {
    const { data: sessions } = await supabase
      .from('gm_sessions')
      .select('subject')
      .eq('class_name', value)
      .eq('is_demo', false);

    const uniqueSubjects = [...new Set((sessions || []).map(s => s.subject).filter(Boolean))];
    if (uniqueSubjects.length === 0) {
      await sendMessage(chatId, `📭 Tidak ada data mata pelajaran untuk <b>Kelas ${value}</b>.`);
      userConversations.delete(chatId);
      return;
    }

    const keyboard = uniqueSubjects.map(s => [{ text: `📚 ${s}`, callback_data: `user_subject::${s}` }]);
    userConversations.set(chatId, { step: 'waiting_subject', data: { className: value } });
    await sendInlineKeyboard(chatId, '📚 <b>Langkah 2:</b> Pilih <b>Mata Pelajaran</b>:', keyboard);
    return;
  }

  if (action === 'user_subject' && value && conv) {
    conv.data.subject = value;
    const { data: sessions } = await supabase
      .from('gm_sessions')
      .select('exam_type')
      .eq('class_name', conv.data.className as string)
      .eq('subject', value)
      .eq('is_demo', false);

    const uniqueExamTypes = [...new Set((sessions || []).map(s => s.exam_type).filter(Boolean))];
    if (uniqueExamTypes.length === 0) {
      await sendMessage(chatId, '📭 Data ujian tidak ditemukan.');
      userConversations.delete(chatId);
      return;
    }

    const keyboard = uniqueExamTypes.map(e => [{ text: `📝 ${e}`, callback_data: `user_exam::${e}` }]);
    conv.step = 'waiting_exam';
    await sendInlineKeyboard(chatId, '📝 <b>Langkah 3:</b> Pilih <b>Jenis Ujian</b>:', keyboard);
    return;
  }

  if (action === 'user_exam' && value && conv) {
    conv.data.examType = value;
    const { data: sessions } = await supabase
      .from('gm_sessions')
      .select('academic_year')
      .eq('class_name', conv.data.className as string)
      .eq('subject', conv.data.subject as string)
      .eq('exam_type', value)
      .eq('is_demo', false);

    const uniqueYears = [...new Set((sessions || []).map(s => s.academic_year).filter(Boolean))];
    if (uniqueYears.length === 0) {
      await sendMessage(chatId, '📭 Data tahun ajaran tidak dtemukan.');
      userConversations.delete(chatId);
      return;
    }

    const keyboard = uniqueYears.map(y => [{ text: `📅 ${y}`, callback_data: `user_year::${y}` }]);
    conv.step = 'waiting_year';
    await sendInlineKeyboard(chatId, '📅 <b>Langkah 4:</b> Pilih <b>Tahun Ajaran</b>:', keyboard);
    return;
  }

  if (action === 'user_year' && value && conv) {
    conv.data.academicYear = value;

    const { data: session } = await supabase
      .from('gm_sessions')
      .select('id')
      .eq('class_name', conv.data.className as string)
      .eq('subject', conv.data.subject as string)
      .eq('exam_type', conv.data.examType as string)
      .eq('academic_year', value)
      .eq('is_demo', false)
      .single();

    if (!session) {
      await sendMessage(chatId, '❌ <b>Sesi tidak ditemukan.</b> Silakan ulangi pencarian.');
      userConversations.delete(chatId);
      return;
    }

    conv.data.sessionId = session.id;

    const { data: students } = await supabase
      .from('gm_students')
      .select('name')
      .eq('session_id', session.id)
      .order('name');

    if (!students || students.length === 0) {
      await sendMessage(chatId, '📭 <b>Maaf,</b> data nilai belum dimasukkan oleh admin untuk sesi ini.');
      userConversations.delete(chatId);
      return;
    }

    const keyboard = [];
    for (let i = 0; i < students.length; i += 2) {
      const row = students.slice(i, i + 2).map(s => ({
        text: `👤 ${s.name}`,
        callback_data: `user_student::${s.name}`,
      }));
      keyboard.push(row);
    }

    conv.step = 'waiting_student';
    await sendInlineKeyboard(chatId, '👤 <b>Langkah Terakhir:</b>\n\nSilakan pilih <b>Nama</b> Anda:', keyboard);
    return;
  }

  if (action === 'user_student' && value && conv) {
    const sessionId = conv.data.sessionId as string;

    const { data: sessionInfo } = await supabase
      .from('gm_sessions')
      .select('session_name, teacher, subject, class_name, exam_type, academic_year, school_level, kkm, answer_key, scoring_config')
      .eq('id', sessionId)
      .single();

    if (!sessionInfo) {
      await sendMessage(chatId, '❌ <b>Sesi tidak ditemukan.</b>');
      userConversations.delete(chatId);
      return;
    }

    const { data: students } = await supabase
      .from('gm_students')
      .select('name, final_score, mcq_score, essay_score, csi, lps, correct, wrong, essay_scores')
      .eq('session_id', sessionId)
      .order('final_score', { ascending: false });

    if (!students || students.length === 0) {
      await sendMessage(chatId, '📭 <b>Maaf,</b> data nilai tidak ditemukan.');
      userConversations.delete(chatId);
      return;
    }

    const match = students.find(s => s.name === value);
    if (!match) {
      await sendMessage(chatId, `❌ Nama "<b>${value}</b>" tidak ditemukan.`);
      userConversations.delete(chatId);
      return;
    }

    const rank = students.findIndex(s => s.name === match.name) + 1;
    const totalStudents = students.length;
    const scores = students.map(s => Number(s.final_score));
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)];
    const maxScore = sorted[sorted.length - 1];

    const finalScore = Number(match.final_score);
    const kkm = Number(sessionInfo.kkm || 70);
    const isRemedial = finalScore < kkm;
    const emoji = finalScore >= 80 ? '🟢' : finalScore >= 60 ? '🟡' : '🔴';

    const webUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://(domain-web-anda)/';

    let remedialWarning = '';
    if (isRemedial) {
      remedialWarning = 
        `\n⚠️ <b>TIDAK MEMENUHI KKM (${kkm})</b>\n` +
        `Sesuai kebijakan, Remedial diberi waktu <b>5 HARI</b> dari penginputan nilai.\n\n` +
        `🌐 <b>Lakukan melalui:</b> <a href="${webUrl}">${webUrl}</a>\n\n` +
        `❌ <b>Konsekuensi Keterlambatan:</b>\n` +
        `• Nilai otomatis diset menjadi <b>0</b>\n` +
        `• Penalti <b>-10 Poin Perilaku</b>\n`;
    }

    const totalPG = Array.isArray(sessionInfo.answer_key) ? sessionInfo.answer_key.length : 0;
    const essayMax = sessionInfo.scoring_config?.essayMaxScore || 0;
    const essayCount = sessionInfo.scoring_config?.essayCount || 0;
    const essayRaw = Array.isArray(match.essay_scores) ? match.essay_scores.reduce((a: number, b: number) => a + b, 0) : 0;

    await sendMessage(
      chatId,
      `📊 <b>HASIL NILAI EXAM</b>\n\n` +
      `🏫 <b>${sessionInfo.class_name}</b> (${sessionInfo.school_level}) • ${sessionInfo.subject}\n` +
      `📝 ${sessionInfo.exam_type} • TA ${sessionInfo.academic_year}\n` +
      `👤 Guru: ${sessionInfo.teacher}\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `👤 Nama: <b>${match.name}</b>\n` +
      `${emoji} Nilai Akhir: <b>${finalScore}</b>\n` +
      `📋 PG: <b>${match.mcq_score}</b> (✅ ${match.correct}/${totalPG})\n` +
      `📝 Essay: <b>${match.essay_score}</b> (Pts: ${essayRaw}/${essayMax})\n` +
      `✅ Benar: ${match.correct} • ❌ Salah: ${match.wrong}\n` +
      `🏆 Ranking: <b>${rank}</b> dari ${totalStudents} siswa\n` +
      remedialWarning +
      `\n━━━━━━━━━━━━━━━━\n` +
      `📈 <b>STATISTIK KELAS</b>\n` +
      `📊 Rata-rata: ${avg}\n` +
      `📊 Median: ${median}\n` +
      `📊 Tertinggi: ${maxScore}\n\n` +
      `<i>Klik tombol di bawah untuk melihat nilai lainnya.</i>`
    );

    await sendInlineKeyboard(chatId, '⬇️ <b>Navigasi:</b>', [
      [{ text: `🏫 Kembali ke Kelas ${sessionInfo.class_name}`, callback_data: `user_class::${sessionInfo.class_name}` }],
      [{ text: `🔍 Cari Nilai Lain`, callback_data: `user_restart::1` }]
    ]);

    userConversations.delete(chatId);
    return;
  }

  if (action === 'user_restart') {
    userConversations.delete(chatId);
    return handleUserCommand(chatId, '/nilai');
  }
}

async function handleUserConversation(
  chatId: number,
  text: string,
  conv: { step: string; data: Record<string, unknown> }
) {
  await sendMessage(chatId, '📊 Ketik /nilai untuk memulai pencarian nilai.');
  userConversations.delete(chatId);
}
