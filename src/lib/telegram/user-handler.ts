import { sendMessage, sendInlineKeyboard, supabase } from './bot';

const userConversations = new Map<number, { step: string; data: Record<string, unknown> }>();

export async function handleUserCommand(chatId: number, text: string) {
  const conv = userConversations.get(chatId);

  if (text === '/start') {
    userConversations.delete(chatId);
    await sendMessage(
      chatId,
      `🎓 <b>GradeMaster Bot</b>\n\n` +
      `Selamat datang! Bot ini membantu Anda melihat hasil nilai ujian.\n\n` +
      `📊 /nilai — Cari nilai Anda\n` +
      `ℹ️ /help — Bantuan`
    );
    return;
  }

  if (text === '/help') {
    await sendMessage(
      chatId,
      `📖 <b>Cara Menggunakan Bot</b>\n\n` +
      `1. Ketik /nilai\n` +
      `2. Pilih kelas Anda\n` +
      `3. Pilih mata pelajaran\n` +
      `4. Pilih jenis ujian (UTS/UAS)\n` +
      `5. Pilih tahun ajaran\n` +
      `6. Masukkan nama Anda\n` +
      `7. Sistem akan menampilkan nilai Anda`
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
      await sendMessage(chatId, '📭 Belum ada data kelas tersedia.');
      return;
    }

    const uniqueClasses = [...new Set(sessions.map(s => s.class_name).filter(Boolean))];
    if (uniqueClasses.length === 0) {
      await sendMessage(chatId, '📭 Belum ada data kelas tersedia.');
      return;
    }

    const keyboard = [];
    for (let i = 0; i < uniqueClasses.length; i += 3) {
      const row = uniqueClasses.slice(i, i + 3).map(c => ({
        text: `Kelas ${c}`,
        callback_data: `user_class::${c}`,
      }));
      keyboard.push(row);
    }

    userConversations.set(chatId, { step: 'waiting_class', data: {} });
    await sendInlineKeyboard(chatId, '🏫 Pilih <b>kelas</b> Anda:', keyboard);
    return;
  }

  if (conv) {
    await handleUserConversation(chatId, text, conv);
    return;
  }

  await sendMessage(chatId, '📊 Ketik /nilai untuk mencari nilai Anda, atau /help untuk bantuan.');
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
      await sendMessage(chatId, '📭 Tidak ada data mata pelajaran untuk kelas ini.');
      userConversations.delete(chatId);
      return;
    }

    const keyboard = uniqueSubjects.map(s => [{ text: `📚 ${s}`, callback_data: `user_subject::${s}` }]);
    userConversations.set(chatId, { step: 'waiting_subject', data: { className: value } });
    await sendInlineKeyboard(chatId, '📚 Pilih <b>mata pelajaran</b>:', keyboard);
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
      await sendMessage(chatId, '📭 Tidak ada data ujian untuk filter ini.');
      userConversations.delete(chatId);
      return;
    }

    const keyboard = uniqueExamTypes.map(e => [{ text: `📝 ${e}`, callback_data: `user_exam::${e}` }]);
    conv.step = 'waiting_exam';
    await sendInlineKeyboard(chatId, '📝 Pilih <b>jenis ujian</b>:', keyboard);
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
      await sendMessage(chatId, '📭 Tidak ada data tahun ajaran untuk filter ini.');
      userConversations.delete(chatId);
      return;
    }

    const keyboard = uniqueYears.map(y => [{ text: `📅 ${y}`, callback_data: `user_year::${y}` }]);
    conv.step = 'waiting_year';
    await sendInlineKeyboard(chatId, '📅 Pilih <b>tahun ajaran</b>:', keyboard);
    return;
  }

  if (action === 'user_year' && value && conv) {
    conv.data.academicYear = value;
    conv.step = 'waiting_name';
    await sendMessage(chatId, '👤 Masukkan <b>nama Anda</b> (sesuai nama di daftar absen):');
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
      await sendMessage(chatId, '❌ Sesi tidak ditemukan dengan filter tersebut.');
      userConversations.delete(chatId);
      return;
    }

    const { data: students } = await supabase
      .from('gm_students')
      .select('name, final_score, mcq_score, essay_score, csi, lps, correct, wrong')
      .eq('session_id', session.id)
      .order('final_score', { ascending: false });

    if (!students || students.length === 0) {
      await sendMessage(chatId, '📭 Belum ada data nilai untuk sesi ini.');
      userConversations.delete(chatId);
      return;
    }

    const match = students.find(s => s.name.toLowerCase().includes(searchName));

    if (!match) {
      await sendMessage(
        chatId,
        `❌ Nama "<b>${text.trim()}</b>" tidak ditemukan.\n\nPastikan nama sesuai daftar absen.`
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
      `📊 <b>Hasil Nilai</b>\n\n` +
      `🏫 ${session.class_name} (${session.school_level}) • ${session.subject}\n` +
      `📝 ${session.exam_type} • TA ${session.academic_year}\n` +
      `👤 Guru: ${session.teacher}\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>${match.name}</b>\n` +
      `${emoji} Nilai Akhir: <b>${finalScore}</b>\n` +
      `📋 PG: ${match.mcq_score} • Essay: ${match.essay_score}\n` +
      `✅ Benar: ${match.correct} • ❌ Salah: ${match.wrong}\n` +
      `🏆 Ranking: <b>${rank}</b> dari ${totalStudents} siswa\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `📈 <b>Statistik Kelas</b>\n` +
      `📊 Rata-rata (Mean): ${avg}\n` +
      `📊 Median: ${median}\n` +
      `📊 Nilai Tertinggi: ${maxScore}\n\n` +
      `Ketik /nilai untuk mencari nilai lain.`
    );
    userConversations.delete(chatId);
    return;
  }

  await sendMessage(chatId, '📊 Ketik /nilai untuk memulai pencarian nilai.');
  userConversations.delete(chatId);
}
