import { sendMessage, sendInlineKeyboard, isAdmin, supabase } from './bot';
import { hashPassword } from '@/lib/grademaster/security';
import { parseAnswerKey } from '@/lib/grademaster/parser';

const adminConversations = new Map<number, { step: string; data: Record<string, unknown> }>();

export async function handleAdminCommand(chatId: number, text: string) {
  if (!isAdmin(chatId)) {
    await sendMessage(chatId, '⛔ Anda tidak memiliki akses admin.');
    return;
  }

  const conv = adminConversations.get(chatId);

  if (text === '/start') {
    adminConversations.delete(chatId);
    await sendMessage(
      chatId,
      `🎓 <b>GradeMaster Bot — Admin Panel</b>\n\n` +
      `Perintah tersedia:\n` +
      `📋 /listsessions — Lihat semua sesi\n` +
      `➕ /newsession — Buat sesi baru\n` +
      `🔑 /addkey — Input kunci jawaban\n` +
      `👥 /addstudents — Tambah daftar siswa\n` +
      `🗑 /deletesession — Hapus sesi\n` +
      `ℹ️ /help — Bantuan`
    );
    return;
  }

  if (text === '/help') {
    await sendMessage(
      chatId,
      `📖 <b>Panduan Admin GradeMaster Bot</b>\n\n` +
      `1. <b>/newsession</b> — Buat sesi kelas baru secara guided\n` +
      `2. <b>/addkey</b> — Tambah/update kunci jawaban untuk sesi\n` +
      `3. <b>/addstudents</b> — Tambah nama siswa ke sesi\n` +
      `4. <b>/listsessions</b> — Lihat daftar semua sesi kelas\n` +
      `5. <b>/deletesession</b> — Hapus sesi (butuh password)\n\n` +
      `Semua data tersinkronisasi dengan database web GradeMaster.`
    );
    return;
  }

  if (text === '/listsessions') {
    adminConversations.delete(chatId);
    const { data, error } = await supabase
      .from('gm_sessions')
      .select('session_name, teacher, subject, class_name, exam_type, academic_year, school_level, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) {
      await sendMessage(chatId, '📭 Belum ada sesi kelas tersimpan.');
      return;
    }

    let msg = '📋 <b>Daftar Sesi Kelas</b>\n\n';
    data.forEach((s, i) => {
      msg += `${i + 1}. <b>${s.session_name}</b>\n`;
      msg += `   📚 ${s.subject} • Kelas ${s.class_name} (${s.school_level})\n`;
      msg += `   📝 ${s.exam_type || 'UTS'} • TA ${s.academic_year || '-'}\n`;
      msg += `   👤 ${s.teacher}\n\n`;
    });
    await sendMessage(chatId, msg);
    return;
  }

  if (text === '/newsession') {
    adminConversations.set(chatId, { step: 'session_name', data: {} });
    await sendMessage(chatId, '📝 <b>Buat Sesi Baru</b>\n\nMasukkan <b>nama sesi</b> (contoh: UTS Matematika 10A):');
    return;
  }

  if (text === '/addkey') {
    adminConversations.set(chatId, { step: 'addkey_select', data: {} });
    await showSessionSelector(chatId, 'addkey');
    return;
  }

  if (text === '/addstudents') {
    adminConversations.set(chatId, { step: 'addstudents_select', data: {} });
    await showSessionSelector(chatId, 'addstudents');
    return;
  }

  if (text === '/deletesession') {
    adminConversations.set(chatId, { step: 'delete_select', data: {} });
    await showSessionSelector(chatId, 'delete');
    return;
  }

  if (conv) {
    await handleConversationStep(chatId, text, conv);
    return;
  }

  await sendMessage(chatId, '❓ Perintah tidak dikenal. Ketik /start untuk melihat menu.');
}

export async function handleAdminCallback(chatId: number, callbackData: string) {
  if (!isAdmin(chatId)) return;

  const [action, sessionName] = callbackData.split('::');
  const conv = adminConversations.get(chatId);

  if (action === 'addkey' && sessionName) {
    adminConversations.set(chatId, { step: 'addkey_input', data: { sessionName } });
    await sendMessage(chatId, `🔑 Masukkan kunci jawaban untuk <b>${sessionName}</b>:\n\nFormat bebas: 1.A 2.B 3.C ... atau ABCD...`);
    return;
  }

  if (action === 'addstudents' && sessionName) {
    adminConversations.set(chatId, { step: 'addstudents_input', data: { sessionName } });
    await sendMessage(chatId, `👥 Masukkan nama siswa untuk <b>${sessionName}</b>:\n\nSatu nama per baris:\n<code>1. Ahmad\n2. Budi\n3. Siti</code>`);
    return;
  }

  if (action === 'delete' && sessionName) {
    adminConversations.set(chatId, { step: 'delete_password', data: { sessionName } });
    await sendMessage(chatId, `🗑 Masukkan <b>password</b> sesi <b>${sessionName}</b> untuk menghapus:`);
    return;
  }

  if (action === 'select_exam' && conv) {
    conv.data.examType = sessionName;
    conv.step = 'academic_year';
    await sendMessage(chatId, '📅 Masukkan <b>tahun ajaran</b> (contoh: 2025/2026):');
    return;
  }
}

async function handleConversationStep(
  chatId: number,
  text: string,
  conv: { step: string; data: Record<string, unknown> }
) {
  switch (conv.step) {
    case 'session_name':
      conv.data.sessionName = text.trim();
      conv.step = 'teacher';
      await sendMessage(chatId, '👤 Masukkan <b>nama guru</b>:');
      break;

    case 'teacher':
      conv.data.teacher = text.trim();
      conv.step = 'subject';
      await sendMessage(chatId, '📚 Masukkan <b>mata pelajaran</b>:');
      break;

    case 'subject':
      conv.data.subject = text.trim();
      conv.step = 'class_name';
      await sendMessage(chatId, '🏫 Masukkan <b>kelas</b> (contoh: 10A):');
      break;

    case 'class_name':
      conv.data.className = text.trim();
      conv.step = 'school_level';
      await sendInlineKeyboard(chatId, '🎓 Pilih <b>tingkat sekolah</b>:', [
        [
          { text: 'SMP', callback_data: 'select_exam::SMP' },
          { text: 'SMA', callback_data: 'select_exam::SMA' },
        ],
      ]);
      conv.step = 'school_level_wait';
      break;

    case 'school_level_wait':
      conv.data.schoolLevel = text.trim().toUpperCase() === 'SMP' ? 'SMP' : 'SMA';
      conv.step = 'exam_type';
      await sendInlineKeyboard(chatId, '📝 Pilih <b>jenis ujian</b>:', [
        [
          { text: 'UTS', callback_data: 'select_exam::UTS' },
          { text: 'UAS', callback_data: 'select_exam::UAS' },
          { text: 'PAT', callback_data: 'select_exam::PAT' },
          { text: 'PAS', callback_data: 'select_exam::PAS' },
        ],
      ]);
      break;

    case 'academic_year':
      conv.data.academicYear = text.trim();
      conv.step = 'password';
      await sendMessage(chatId, '🔒 Masukkan <b>password</b> untuk sesi ini:');
      break;

    case 'password': {
      const pw = text.trim();
      if (pw.length < 4) {
        await sendMessage(chatId, '⚠️ Password minimal 4 karakter. Coba lagi:');
        return;
      }
      conv.data.password = pw;
      const passwordHash = await hashPassword(pw);

      const { data: newSession, error } = await supabase
        .from('gm_sessions')
        .insert({
          session_name: conv.data.sessionName as string,
          password_hash: passwordHash,
          teacher: conv.data.teacher as string || '',
          subject: conv.data.subject as string || '',
          class_name: conv.data.className as string || '',
          school_level: conv.data.schoolLevel as string || 'SMA',
          exam_type: conv.data.examType as string || 'UTS',
          academic_year: conv.data.academicYear as string || '2025/2026',
          answer_key: [],
          student_list: [],
        })
        .select('id')
        .single();

      if (error) {
        await sendMessage(chatId, `❌ Gagal membuat sesi: ${error.message}`);
      } else {
        await sendMessage(
          chatId,
          `✅ <b>Sesi berhasil dibuat!</b>\n\n` +
          `📋 ${conv.data.sessionName}\n` +
          `📚 ${conv.data.subject} • Kelas ${conv.data.className}\n` +
          `📝 ${conv.data.examType} • TA ${conv.data.academicYear}\n` +
          `🆔 ${newSession?.id}\n\n` +
          `Gunakan /addkey untuk menambahkan kunci jawaban.`
        );
      }
      adminConversations.delete(chatId);
      break;
    }

    case 'addkey_input': {
      const parsed = parseAnswerKey(text);
      if (parsed.length === 0) {
        await sendMessage(chatId, '⚠️ Kunci jawaban tidak valid. Coba lagi dengan format: 1.A 2.B 3.C ...');
        return;
      }

      const { error } = await supabase
        .from('gm_sessions')
        .update({ answer_key: parsed, updated_at: new Date().toISOString() })
        .eq('session_name', conv.data.sessionName as string);

      if (error) {
        await sendMessage(chatId, `❌ Gagal update kunci jawaban: ${error.message}`);
      } else {
        await sendMessage(chatId, `✅ Kunci jawaban berhasil diperbarui! (${parsed.length} soal)\n\n${parsed.map((a, i) => `${i + 1}.${a}`).join(' ')}`);
      }
      adminConversations.delete(chatId);
      break;
    }

    case 'addstudents_input': {
      const students = text
        .split(/\r?\n/)
        .map(line => line.trim().replace(/^[\d.\-*]+\s*/, ''))
        .filter(line => line.length > 1 && line.length < 60);

      if (students.length === 0) {
        await sendMessage(chatId, '⚠️ Tidak ada nama siswa yang valid terdeteksi. Coba lagi.');
        return;
      }

      const { data: session } = await supabase
        .from('gm_sessions')
        .select('student_list')
        .eq('session_name', conv.data.sessionName as string)
        .single();

      const existingList = (session?.student_list as string[]) || [];
      const mergedList = Array.from(new Set([...existingList, ...students]));

      const { error } = await supabase
        .from('gm_sessions')
        .update({ student_list: mergedList, updated_at: new Date().toISOString() })
        .eq('session_name', conv.data.sessionName as string);

      if (error) {
        await sendMessage(chatId, `❌ Gagal menambahkan siswa: ${error.message}`);
      } else {
        await sendMessage(chatId, `✅ ${students.length} siswa berhasil ditambahkan!\nTotal: ${mergedList.length} siswa`);
      }
      adminConversations.delete(chatId);
      break;
    }

    case 'delete_password': {
      const { data: session } = await supabase
        .from('gm_sessions')
        .select('id, password_hash')
        .eq('session_name', conv.data.sessionName as string)
        .single();

      if (!session) {
        await sendMessage(chatId, '❌ Sesi tidak ditemukan.');
        adminConversations.delete(chatId);
        return;
      }

      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(text.trim(), session.password_hash);
      if (!valid) {
        await sendMessage(chatId, '❌ Password salah. Penghapusan dibatalkan.');
        adminConversations.delete(chatId);
        return;
      }

      const { error } = await supabase
        .from('gm_sessions')
        .delete()
        .eq('id', session.id);

      if (error) {
        await sendMessage(chatId, `❌ Gagal menghapus: ${error.message}`);
      } else {
        await sendMessage(chatId, `✅ Sesi <b>${conv.data.sessionName}</b> berhasil dihapus.`);
      }
      adminConversations.delete(chatId);
      break;
    }

    default:
      await sendMessage(chatId, '❓ Sesi percakapan tidak dikenal. Ketik /start untuk kembali.');
      adminConversations.delete(chatId);
  }
}

async function showSessionSelector(chatId: number, action: string) {
  const { data } = await supabase
    .from('gm_sessions')
    .select('session_name')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) {
    await sendMessage(chatId, '📭 Belum ada sesi. Buat dulu dengan /newsession');
    adminConversations.delete(chatId);
    return;
  }

  const keyboard = data.map(s => [{ text: s.session_name, callback_data: `${action}::${s.session_name}` }]);
  await sendInlineKeyboard(chatId, '📋 Pilih sesi:', keyboard);
}
