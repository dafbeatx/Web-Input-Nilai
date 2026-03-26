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
      `6. Masukkan <b>Nama Lengkap</b> Anda sesuai absen.\n\n` +
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
      .eq('class_name', value);

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
      .eq('subject', value);

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
      .eq('exam_type', value);

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
    conv.step = 'waiting_name';
    await sendMessage(chatId, '👤 <b>Langkah Terakhir:</b>\n\nSilakan masukkan <b>Nama Lengkap Anda</b> (sesuai daftar absen):');
    return;
  }
}

async function handleUserConversation(
  chatId: number,
  text: string,
  conv: { step: string; data: Record<string, unknown> }
) {
  if (conv.step === 'waiting_name') {
    const searchName = text.trim().toLowerCase();

    const { data: session } = await supabase
      .from('gm_sessions')
      .select('id, session_name, teacher, subject, class_name, exam_type, academic_year, school_level')
      .eq('class_name', conv.data.className as string)
      .eq('subject', conv.data.subject as string)
      .eq('exam_type', conv.data.examType as string)
      .eq('academic_year', conv.data.academicYear as string)
      .single();

    if (!session) {
      await sendMessage(chatId, '❌ <b>Sesi tidak ditemukan.</b> Silakan ulangi pencarian dengan filter yang benar.');
      userConversations.delete(chatId);
      return;
    }

    const { data: students } = await supabase
      .from('gm_students')
      .select('name, final_score, mcq_score, essay_score, csi, lps, correct, wrong')
      .eq('session_id', session.id)
      .order('final_score', { ascending: false });

    if (!students || students.length === 0) {
      await sendMessage(chatId, '📭 <b>Maaf,</b> data nilai belum dimasukkan oleh admin untuk sesi ini.');
      userConversations.delete(chatId);
      return;
    }

    const match = students.find(s => s.name.toLowerCase().includes(searchName));

    if (!match) {
      await sendMessage(
        chatId,
        `❌ Nama "<b>${text.trim()}</b>" tidak ditemukan di <b>Kelas ${session.class_name}</b>.\n\nPastikan nama sesuai daftar absen.`
      );
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
    const emoji = finalScore >= 80 ? '🟢' : finalScore >= 60 ? '🟡' : '🔴';

    await sendMessage(
      chatId,
      `📊 <b>HASIL NILAI EXAM</b>\n\n` +
      `🏫 <b>${session.class_name}</b> (${session.school_level}) • ${session.subject}\n` +
      `📝 ${session.exam_type} • TA ${session.academic_year}\n` +
      `👤 Guru: ${session.teacher}\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `👤 Nama: <b>${match.name}</b>\n` +
      `${emoji} Nilai Akhir: <b>${finalScore}</b>\n` +
      `📋 PG: ${match.mcq_score} • Essay: ${match.essay_score}\n` +
      `✅ Benar: ${match.correct} • ❌ Salah: ${match.wrong}\n` +
      `🏆 Ranking: <b>${rank}</b> dari ${totalStudents} siswa\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `📈 <b>STATISTIK KELAS</b>\n` +
      `📊 Rata-rata: ${avg}\n` +
      `📊 Median: ${median}\n` +
      `📊 Tertinggi: ${maxScore}\n\n` +
      `<i>Jika ingin melihat nilai yang lain, silakan klik tombol di bawah untuk memilih kelas kembali.</i>`
    );
    
    // Suggest next actions
    await sendInlineKeyboard(chatId, '⬇️ <b>Navigasi:</b>', [
      [{ text: `🏫 Kembali ke Kelas ${session.class_name}`, callback_data: `user_class::${session.class_name}` }],
      [{ text: `🔍 Cari Nilai Lain`, callback_data: `/nilai` }]
    ]);

    userConversations.delete(chatId);
    return;
  }

  await sendMessage(chatId, '📊 Ketik /nilai untuk memulai pencarian nilai.');
  userConversations.delete(chatId);
}
