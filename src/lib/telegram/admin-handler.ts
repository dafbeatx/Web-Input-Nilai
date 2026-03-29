import { sendMessage, sendInlineKeyboard, isAdmin, supabase } from './bot';
import { hashPassword } from '@/lib/grademaster/security';
import { parseAnswerKey } from '@/lib/grademaster/parser';
import { parseAdminCommand } from '@/lib/grademaster/services/admin-command-parser.service';

const adminConversations = new Map<number, { step: string; data: Record<string, unknown> }>();
const pendingConfirmations = new Map<number, { action: string; params: Record<string, any>; sessionId?: string; description: string }>();

function formatTelegramResponse(action: string, result: any, success: boolean): string {
  if (!success) {
    return `❌ <b>Aksi gagal</b>\n📌 Alasan: ${result?.message || result?.error || 'Kesalahan tidak diketahui'}`;
  }

  switch (action) {
    case 'SET_NILAI':
      return (
        `✅ <b>Nilai berhasil diubah</b>\n\n` +
        `👤 Nama: <b>${result.studentName}</b>\n` +
        `📉 Nilai lama: ${result.previousScore}\n` +
        `📈 Nilai baru: <b>${result.newScore}</b>\n` +
        `📌 Status remedial: RESET`
      );
    case 'SET_STATUS':
      return (
        `✅ <b>Status berhasil diubah</b>\n\n` +
        `👤 Nama: <b>${result.studentName}</b>\n` +
        `🔄 Status lama: ${result.previousStatus || 'NONE'}\n` +
        `📌 Status baru: <b>${result.newStatus}</b>`
      );
    case 'RESET_EXAM':
      return (
        `✅ <b>Data remedial berhasil direset</b>\n\n` +
        `👤 Nama: <b>${result.studentName}</b>\n` +
        `📌 ${result.message}`
      );
    case 'GET_USER':
      return (
        `📊 <b>Data Siswa</b>\n\n` +
        `👤 Nama: <b>${result.name}</b>\n` +
        `📈 Nilai: <b>${result.final_score}</b>\n` +
        `📌 Status: <b>${result.remedial_status || 'NONE'}</b>\n` +
        `🏠 Lokasi: ${result.remedial_location || '-'}\n` +
        `🚨 Curang: ${result.is_cheated ? 'YA' : 'Tidak'}\n` +
        `⚠️ Pelanggaran: ${result.violation_count || 0}x\n` +
        `🚫 Diblokir: ${result.is_blocked ? 'YA' : 'Tidak'}\n` +
        `🏷 Flag: ${(result.cheating_flags || []).join(', ') || '-'}`
      );
    default:
      return `✅ Aksi <b>${action}</b> berhasil dieksekusi.`;
  }
}

export async function handleAdminCommand(chatId: number, text: string) {
  if (!isAdmin(chatId)) {
    await sendMessage(chatId, '⛔ Anda tidak memiliki akses admin.');
    return;
  }

  const conv = adminConversations.get(chatId);

  // ── /start ──
  if (text === '/start') {
    adminConversations.delete(chatId);
    pendingConfirmations.delete(chatId);
    await sendMessage(
      chatId,
      `🎓 <b>GradeMaster Bot — Admin Panel</b>\n\n` +
      `<b>📦 Manajemen Sesi</b>\n` +
      `📋 /listsessions — Lihat semua sesi\n` +
      `➕ /newsession — Buat sesi baru\n` +
      `🔑 /addkey — Input kunci jawaban\n` +
      `👥 /addstudents — Tambah siswa\n` +
      `🗑 /deletesession — Hapus sesi\n\n` +
      `<b>📊 Monitoring</b>\n` +
      `📊 /dashboard — Statistik sesi\n` +
      `🚨 /remedial — Siswa belum lulus\n` +
      `📡 /logs — Log aktivitas\n\n` +
      `<b>👤 Manajemen Siswa</b>\n` +
      `👤 /getuser — Detail siswa\n` +
      `✏️ /setnilai — Ubah nilai\n` +
      `🚫 /setstatus — Ubah status\n` +
      `🔄 /resetexam — Reset ujian siswa\n\n` +
      `<b>💬 Atau ketik perintah bebas</b>\n` +
      `Contoh: <i>"ubah nilai dea jadi 90"</i>\n\n` +
      `⚙️ /help — Bantuan lengkap`
    );
    return;
  }

  // ── /help ──
  if (text === '/help') {
    await sendMessage(
      chatId,
      `📖 <b>Panduan Admin GradeMaster Bot</b>\n\n` +
      `<b>Sesi:</b>\n` +
      `• /newsession — Buat sesi kelas baru\n` +
      `• /addkey — Tambah kunci jawaban\n` +
      `• /addstudents — Tambah nama siswa\n` +
      `• /deletesession — Hapus sesi\n\n` +
      `<b>Siswa:</b>\n` +
      `• /getuser [nama] — Lihat detail siswa\n` +
      `• /setnilai [nama] [nilai] — Ubah nilai\n` +
      `• /setstatus [nama] [status] — Ubah status\n` +
      `• /resetexam [nama] — Reset data remedial\n\n` +
      `<b>Status valid:</b> NONE, COMPLETED, CHEATED, TIMEOUT, BLOCKED\n\n` +
      `<b>Monitoring:</b>\n` +
      `• /dashboard — Statistik kelas\n` +
      `• /remedial — Daftar siswa belum tuntas\n` +
      `• /logs — Log aktivitas terbaru\n\n` +
      `<b>💬 Perintah Natural:</b>\n` +
      `Ketik bebas, contoh:\n` +
      `<i>"set nilai Ahmad jadi 80"</i>\n` +
      `<i>"diskualifikasi Budi"</i>\n` +
      `<i>"cek siswa Siti"</i>\n` +
      `<i>"reset ujian Dea"</i>\n\n` +
      `Semua aksi sensitif memerlukan konfirmasi.`
    );
    return;
  }

  // ── Confirmation handler (YA/TIDAK) ──
  const pending = pendingConfirmations.get(chatId);
  if (pending && (text.toUpperCase() === 'YA' || text.toUpperCase() === 'TIDAK' || text.toUpperCase() === 'BATAL')) {
    if (text.toUpperCase() === 'YA') {
      await executeConfirmedAction(chatId, pending);
    } else {
      await sendMessage(chatId, '🚫 Aksi dibatalkan.');
    }
    pendingConfirmations.delete(chatId);
    return;
  }

  // ── /listsessions ──
  if (text === '/listsessions') {
    adminConversations.delete(chatId);
    const { data, error } = await supabase
      .from('gm_sessions')
      .select('session_name, teacher, subject, class_name, exam_type, academic_year, school_level, updated_at, is_demo')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) {
      await sendMessage(chatId, '📭 Belum ada sesi kelas tersimpan.');
      return;
    }

    let msg = '📋 <b>Daftar Sesi Kelas</b>\n\n';
    data.forEach((s, i) => {
      const demoLabel = s.is_demo ? '🧪 <b>DEMO:</b> ' : '';
      msg += `${i + 1}. ${demoLabel}<b>${s.session_name}</b>\n`;
      msg += `   📚 ${s.subject} • Kelas ${s.class_name} (${s.school_level})\n`;
      msg += `   📝 ${s.exam_type || 'UTS'} • TA ${s.academic_year || '-'}\n`;
      msg += `   👤 ${s.teacher}\n\n`;
    });
    await sendMessage(chatId, msg);
    return;
  }

  // ── /newsession ──
  if (text === '/newsession') {
    adminConversations.set(chatId, { step: 'session_name', data: {} });
    await sendMessage(chatId, '📝 <b>Buat Sesi Baru</b>\n\nMasukkan <b>nama sesi</b> (contoh: UTS Matematika 10A):');
    return;
  }

  // ── /addkey ──
  if (text === '/addkey') {
    adminConversations.set(chatId, { step: 'addkey_select', data: {} });
    await showSessionSelector(chatId, 'addkey');
    return;
  }

  // ── /addstudents ──
  if (text === '/addstudents') {
    adminConversations.set(chatId, { step: 'addstudents_select', data: {} });
    await showSessionSelector(chatId, 'addstudents');
    return;
  }

  // ── /deletesession ──
  if (text === '/deletesession') {
    adminConversations.set(chatId, { step: 'delete_select', data: {} });
    await showSessionSelector(chatId, 'delete');
    return;
  }
  
  // ── /remedial ──
  if (text === '/remedial') {
    adminConversations.set(chatId, { step: 'remedial_select', data: {} });
    await showSessionSelector(chatId, 'remedial');
    return;
  }

  // ── /dashboard ──
  if (text === '/dashboard') {
    adminConversations.set(chatId, { step: 'dashboard_select', data: {} });
    await showSessionSelector(chatId, 'dashboard');
    return;
  }

  // ── /logs ──
  if (text === '/logs') {
    adminConversations.set(chatId, { step: 'logs_select', data: {} });
    await showSessionSelector(chatId, 'logs');
    return;
  }

  // ── /getuser [nama] ──
  if (text.startsWith('/getuser')) {
    const nameArg = text.replace('/getuser', '').trim();
    if (!nameArg) {
      adminConversations.set(chatId, { step: 'getuser_select', data: {} });
      await showSessionSelector(chatId, 'getuser');
      return;
    }
    adminConversations.set(chatId, { step: 'getuser_name', data: { studentName: nameArg } });
    await showSessionSelector(chatId, 'getuser_exec');
    return;
  }

  // ── /setnilai [nama] [nilai] ──
  if (text.startsWith('/setnilai')) {
    const args = text.replace('/setnilai', '').trim();
    const match = args.match(/^(.+?)\s+(\d+)$/);
    if (!match) {
      adminConversations.set(chatId, { step: 'setnilai_select', data: {} });
      await showSessionSelector(chatId, 'setnilai');
      return;
    }
    adminConversations.set(chatId, { step: 'setnilai_confirm', data: { studentName: match[1].trim(), nilai: parseInt(match[2]) } });
    await showSessionSelector(chatId, 'setnilai_exec');
    return;
  }

  // ── /setstatus [nama] [status] ──
  if (text.startsWith('/setstatus')) {
    const args = text.replace('/setstatus', '').trim();
    const match = args.match(/^(.+?)\s+(NONE|COMPLETED|CHEATED|TIMEOUT|BLOCKED)$/i);
    if (!match) {
      await sendMessage(chatId, '⚠️ Format: /setstatus [nama] [NONE|COMPLETED|CHEATED|TIMEOUT|BLOCKED]\n\nContoh: /setstatus Ahmad CHEATED');
      return;
    }
    adminConversations.set(chatId, { step: 'setstatus_confirm', data: { studentName: match[1].trim(), status: match[2].toUpperCase() } });
    await showSessionSelector(chatId, 'setstatus_exec');
    return;
  }

  // ── /resetexam [nama] ──
  if (text.startsWith('/resetexam')) {
    const nameArg = text.replace('/resetexam', '').trim();
    if (!nameArg) {
      await sendMessage(chatId, '⚠️ Format: /resetexam [nama]\n\nContoh: /resetexam Ahmad');
      return;
    }
    adminConversations.set(chatId, { step: 'resetexam_confirm', data: { studentName: nameArg } });
    await showSessionSelector(chatId, 'resetexam_exec');
    return;
  }

  // ── Active conversation flow ──
  if (conv) {
    await handleConversationStep(chatId, text, conv);
    return;
  }

  // ── Natural language parsing (fallback) ──
  const parsed = parseAdminCommand(text);
  if (parsed.action !== 'UNKNOWN') {
    // Ask which session first
    adminConversations.set(chatId, { 
      step: 'nlp_session_select', 
      data: { parsedAction: parsed.action, parsedParams: parsed.params } 
    });

    const actionLabels: Record<string, string> = {
      'SET_NILAI': `✏️ Ubah nilai <b>${parsed.params.user_id}</b> → <b>${parsed.params.nilai}</b>`,
      'SET_STATUS': `🚫 Ubah status <b>${parsed.params.user_id}</b> → <b>${parsed.params.status}</b>`,
      'RESET_EXAM': `🔄 Reset ujian <b>${parsed.params.user_id}</b>`,
      'GET_USER': `👤 Lihat data <b>${parsed.params.user_id}</b>`,
    };

    await sendMessage(chatId, 
      `🤖 <b>Perintah terdeteksi:</b>\n${actionLabels[parsed.action] || parsed.action}\n\nPilih sesi target:`
    );
    await showSessionSelector(chatId, 'nlp_exec');
    return;
  }

  await sendMessage(chatId, '❓ Perintah tidak dikenali.\n\nKetik /start untuk melihat menu atau ketik perintah bebas.\nContoh: <i>"ubah nilai Dea jadi 90"</i>');
}

export async function handleAdminCallback(chatId: number, callbackData: string) {
  if (!isAdmin(chatId)) return;

  const [action, sessionName] = callbackData.split('::');
  const conv = adminConversations.get(chatId);

  // ── Existing callbacks ──
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

  if (action === 'remedial' && sessionName) {
    await handleRemedialReport(chatId, sessionName);
    return;
  }

  // ── Dashboard callback ──
  if (action === 'dashboard' && sessionName) {
    await handleDashboardReport(chatId, sessionName);
    return;
  }

  // ── Logs callback ──
  if (action === 'logs' && sessionName) {
    await handleLogsReport(chatId, sessionName);
    return;
  }

  // ── GET_USER flow ──
  if ((action === 'getuser' || action === 'getuser_exec') && sessionName) {
    const name = conv?.data?.studentName as string;
    if (name) {
      await executeGetUser(chatId, sessionName, name);
      adminConversations.delete(chatId);
    } else {
      adminConversations.set(chatId, { step: 'getuser_input', data: { sessionName } });
      await sendMessage(chatId, `👤 Masukkan <b>nama siswa</b> yang ingin dicek:`);
    }
    return;
  }

  // ── SET_NILAI flow ──
  if (action === 'setnilai' && sessionName) {
    adminConversations.set(chatId, { step: 'setnilai_input', data: { sessionName } });
    await sendMessage(chatId, `✏️ Masukkan <b>nama siswa</b> dan <b>nilai baru</b>:\n\nFormat: <code>nama nilai</code>\nContoh: <code>Ahmad 85</code>`);
    return;
  }

  if (action === 'setnilai_exec' && sessionName) {
    const name = conv?.data?.studentName as string;
    const nilai = conv?.data?.nilai as number;
    if (name && nilai !== undefined) {
      await requestConfirmation(chatId, 'SET_NILAI', { user_id: name, nilai }, sessionName,
        `✏️ Ubah nilai <b>${name}</b> → <b>${nilai}</b>\n📋 Sesi: ${sessionName}`
      );
      adminConversations.delete(chatId);
    }
    return;
  }

  // ── SET_STATUS flow ──
  if (action === 'setstatus_exec' && sessionName) {
    const name = conv?.data?.studentName as string;
    const status = conv?.data?.status as string;
    if (name && status) {
      await requestConfirmation(chatId, 'SET_STATUS', { user_id: name, status }, sessionName,
        `🚫 Ubah status <b>${name}</b> → <b>${status}</b>\n📋 Sesi: ${sessionName}`
      );
      adminConversations.delete(chatId);
    }
    return;
  }

  // ── RESET_EXAM flow ──
  if (action === 'resetexam_exec' && sessionName) {
    const name = conv?.data?.studentName as string;
    if (name) {
      await requestConfirmation(chatId, 'RESET_EXAM', { user_id: name }, sessionName,
        `🔄 Reset data remedial <b>${name}</b>\n📋 Sesi: ${sessionName}\n\n⚠️ Data jawaban, lokasi, dan status akan dihapus.`
      );
      adminConversations.delete(chatId);
    }
    return;
  }

  // ── NLP execution flow ──
  if (action === 'nlp_exec' && sessionName && conv) {
    const parsedAction = conv.data.parsedAction as string;
    const parsedParams = conv.data.parsedParams as Record<string, any>;

    if (parsedAction === 'GET_USER') {
      await executeGetUser(chatId, sessionName, parsedParams.user_id);
      adminConversations.delete(chatId);
      return;
    }

    const actionLabels: Record<string, string> = {
      'SET_NILAI': `✏️ Ubah nilai <b>${parsedParams.user_id}</b> → <b>${parsedParams.nilai}</b>`,
      'SET_STATUS': `🚫 Ubah status <b>${parsedParams.user_id}</b> → <b>${parsedParams.status}</b>`,
      'RESET_EXAM': `🔄 Reset ujian <b>${parsedParams.user_id}</b>`,
    };

    await requestConfirmation(chatId, parsedAction, parsedParams, sessionName,
      `${actionLabels[parsedAction] || parsedAction}\n📋 Sesi: ${sessionName}`
    );
    adminConversations.delete(chatId);
    return;
  }

  if (action === 'select_exam' && conv) {
    conv.data.examType = sessionName;
    conv.step = 'academic_year';
    await sendMessage(chatId, '📅 Masukkan <b>tahun ajaran</b> (contoh: 2025/2026):');
    return;
  }

  // ── Confirmation callbacks ──
  if (action === 'confirm_yes') {
    const pending = pendingConfirmations.get(chatId);
    if (pending) {
      await executeConfirmedAction(chatId, pending);
      pendingConfirmations.delete(chatId);
    }
    return;
  }

  if (action === 'confirm_no') {
    pendingConfirmations.delete(chatId);
    await sendMessage(chatId, '🚫 Aksi dibatalkan.');
    return;
  }
}

async function requestConfirmation(
  chatId: number,
  action: string,
  params: Record<string, any>,
  sessionId: string,
  description: string
) {
  pendingConfirmations.set(chatId, { action, params, sessionId, description });

  await sendInlineKeyboard(
    chatId,
    `⚠️ <b>Konfirmasi Aksi</b>\n\n${description}\n\n<b>Lanjutkan?</b>`,
    [[
      { text: '✅ YA', callback_data: 'confirm_yes::' },
      { text: '❌ TIDAK', callback_data: 'confirm_no::' },
    ]]
  );
}

async function executeConfirmedAction(
  chatId: number,
  pending: { action: string; params: Record<string, any>; sessionId?: string; description: string }
) {
  const { action, params, sessionId } = pending;

  if (!sessionId) {
    await sendMessage(chatId, '❌ Sesi tidak ditemukan. Coba lagi.');
    return;
  }

  // Resolve session ID from session name
  const { data: session } = await supabase
    .from('gm_sessions')
    .select('id')
    .eq('session_name', sessionId)
    .single();

  if (!session) {
    await sendMessage(chatId, `❌ Sesi <b>${sessionId}</b> tidak ditemukan di database.`);
    return;
  }

  const sid = session.id;

  try {
    switch (action) {
      case 'SET_NILAI': {
        const { data: student } = await supabase
          .from('gm_students')
          .select('id, name, final_score')
          .eq('session_id', sid)
          .ilike('name', `%${params.user_id}%`)
          .eq('is_deleted', false)
          .limit(1)
          .single();

        if (!student) {
          await sendMessage(chatId, formatTelegramResponse(action, { message: `Siswa "${params.user_id}" tidak ditemukan` }, false));
          return;
        }

        const { error } = await supabase
          .from('gm_students')
          .update({
            final_score: params.nilai,
            remedial_status: 'NONE',
            remedial_score: 0,
            remedial_location: null,
            remedial_note: null,
            remedial_answers: null,
            is_cheated: false,
            cheating_flags: [],
            violation_count: 0,
            is_blocked: false,
            teacher_reviewed: true,
            final_score_locked: params.nilai
          })
          .eq('id', student.id);

        if (error) throw error;

        await sendMessage(chatId, formatTelegramResponse(action, {
          studentName: student.name,
          previousScore: student.final_score,
          newScore: params.nilai,
        }, true));
        break;
      }

      case 'SET_STATUS': {
        const validStatuses = ['NONE', 'INITIATED', 'IN_PROGRESS', 'COMPLETED', 'CHEATED', 'TIMEOUT', 'BLOCKED', 'FAILED'];
        if (!validStatuses.includes(params.status)) {
          await sendMessage(chatId, `❌ Status "${params.status}" tidak valid.\nValid: ${validStatuses.join(', ')}`);
          return;
        }

        const { data: student } = await supabase
          .from('gm_students')
          .select('id, name, remedial_status')
          .eq('session_id', sid)
          .ilike('name', `%${params.user_id}%`)
          .eq('is_deleted', false)
          .limit(1)
          .single();

        if (!student) {
          await sendMessage(chatId, formatTelegramResponse(action, { message: `Siswa "${params.user_id}" tidak ditemukan` }, false));
          return;
        }

        const updateData: Record<string, any> = { remedial_status: params.status };
        if (params.status === 'CHEATED') updateData.is_cheated = true;
        if (params.status === 'BLOCKED') updateData.is_blocked = true;
        if (params.status === 'NONE') {
          updateData.is_cheated = false;
          updateData.is_blocked = false;
          updateData.violation_count = 0;
          updateData.cheating_flags = [];
        }

        const { error } = await supabase
          .from('gm_students')
          .update(updateData)
          .eq('id', student.id);

        if (error) throw error;

        await sendMessage(chatId, formatTelegramResponse(action, {
          studentName: student.name,
          previousStatus: student.remedial_status,
          newStatus: params.status,
        }, true));
        break;
      }

      case 'RESET_EXAM': {
        const { data: student } = await supabase
          .from('gm_students')
          .select('id, name')
          .eq('session_id', sid)
          .ilike('name', `%${params.user_id}%`)
          .eq('is_deleted', false)
          .limit(1)
          .single();

        if (!student) {
          await sendMessage(chatId, formatTelegramResponse(action, { message: `Siswa "${params.user_id}" tidak ditemukan` }, false));
          return;
        }

        const { error } = await supabase
          .from('gm_students')
          .update({
            remedial_status: 'NONE',
            remedial_score: 0,
            remedial_location: null,
            remedial_note: null,
            remedial_answers: null,
            is_cheated: false,
            cheating_flags: [],
            violation_count: 0,
            is_blocked: false,
          })
          .eq('id', student.id);

        if (error) throw error;

        await supabase
          .from('gm_remedial_attempts')
          .update({ status: 'CANCELLED' })
          .eq('student_id', student.id)
          .in('status', ['ACTIVE', 'INITIATED']);

        await sendMessage(chatId, formatTelegramResponse(action, {
          studentName: student.name,
          message: 'Semua data remedial direset. Attempt aktif dibatalkan.',
        }, true));
        break;
      }
    }
  } catch (err: any) {
    await sendMessage(chatId, `❌ Error: ${err.message}`);
  }
}

async function executeGetUser(chatId: number, sessionName: string, studentName: string) {
  const { data: session } = await supabase
    .from('gm_sessions')
    .select('id')
    .eq('session_name', sessionName)
    .single();

  if (!session) {
    await sendMessage(chatId, `❌ Sesi "${sessionName}" tidak ditemukan.`);
    return;
  }

  const { data: student } = await supabase
    .from('gm_students')
    .select('id, name, final_score, remedial_status, remedial_score, is_cheated, violation_count, is_blocked, cheating_flags, remedial_location')
    .eq('session_id', session.id)
    .ilike('name', `%${studentName}%`)
    .eq('is_deleted', false)
    .limit(1)
    .single();

  if (!student) {
    await sendMessage(chatId, `❌ Siswa "<b>${studentName}</b>" tidak ditemukan di sesi ${sessionName}.`);
    return;
  }

  await sendMessage(chatId, formatTelegramResponse('GET_USER', student, true));
}

async function handleDashboardReport(chatId: number, sessionName: string) {
  const { data: session } = await supabase
    .from('gm_sessions')
    .select('id, kkm, class_name, subject, academic_year, teacher, exam_type')
    .eq('session_name', sessionName)
    .single();

  if (!session) {
    await sendMessage(chatId, '❌ Sesi tidak ditemukan.');
    adminConversations.delete(chatId);
    return;
  }

  const { data: students } = await supabase
    .from('gm_students')
    .select('name, final_score, remedial_status')
    .eq('session_id', session.id)
    .eq('is_deleted', false)
    .order('final_score', { ascending: false });

  if (!students || students.length === 0) {
    await sendMessage(chatId, `📭 Belum ada data siswa di sesi <b>${sessionName}</b>.`);
    adminConversations.delete(chatId);
    return;
  }

  const kkm = session.kkm || 70;
  const scores = students.map(s => s.final_score || 0);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const tuntas = students.filter(s => (s.final_score || 0) >= kkm).length;
  const belumTuntas = students.length - tuntas;
  const cheated = students.filter(s => s.remedial_status === 'CHEATED').length;
  const completed = students.filter(s => s.remedial_status === 'COMPLETED').length;

  let msg = `📊 <b>Dashboard — ${sessionName}</b>\n\n`;
  msg += `🏫 Kelas: <b>${session.class_name}</b>\n`;
  msg += `📚 Mapel: <b>${session.subject}</b>\n`;
  msg += `📝 Ujian: ${session.exam_type || 'UTS'}\n`;
  msg += `👤 Guru: ${session.teacher}\n`;
  msg += `📅 TA: ${session.academic_year || '-'}\n\n`;

  msg += `<b>📈 Statistik Nilai</b>\n`;
  msg += `├ Rata-rata: <b>${avg}</b>\n`;
  msg += `├ Tertinggi: <b>${max}</b>\n`;
  msg += `├ Terendah: <b>${min}</b>\n`;
  msg += `└ KKM: <b>${kkm}</b>\n\n`;

  msg += `<b>👥 Ketuntasan (${students.length} siswa)</b>\n`;
  msg += `├ ✅ Tuntas: <b>${tuntas}</b> (${Math.round(tuntas/students.length*100)}%)\n`;
  msg += `├ ❌ Belum: <b>${belumTuntas}</b> (${Math.round(belumTuntas/students.length*100)}%)\n`;
  msg += `├ 🔄 Sudah remed: <b>${completed}</b>\n`;
  msg += `└ 🚨 Diskualifikasi: <b>${cheated}</b>\n\n`;

  msg += `<b>🏆 Top 3</b>\n`;
  students.slice(0, 3).forEach((s, i) => {
    const medals = ['🥇', '🥈', '🥉'];
    msg += `${medals[i]} ${s.name} — <b>${s.final_score}</b>\n`;
  });

  await sendMessage(chatId, msg);
  adminConversations.delete(chatId);
}

async function handleLogsReport(chatId: number, sessionName: string) {
  const { data: session } = await supabase
    .from('gm_sessions')
    .select('id')
    .eq('session_name', sessionName)
    .single();

  if (!session) {
    await sendMessage(chatId, '❌ Sesi tidak ditemukan.');
    adminConversations.delete(chatId);
    return;
  }

  const { data: logs } = await supabase
    .from('gm_attempt_logs')
    .select(`
      event_type,
      severity,
      created_at,
      metadata,
      gm_remedial_attempts!inner(
        session_id,
        gm_students(name)
      )
    `)
    .eq('gm_remedial_attempts.session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(15);

  if (!logs || logs.length === 0) {
    await sendMessage(chatId, `📭 Belum ada log aktivitas di sesi <b>${sessionName}</b>.`);
    adminConversations.delete(chatId);
    return;
  }

  let msg = `📡 <b>Log Aktivitas — ${sessionName}</b>\n\n`;
  logs.forEach((log: any, i) => {
    const time = new Date(log.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
    const studentName = log.gm_remedial_attempts?.gm_students?.name || 'Siswa';
    const detail = log.metadata?.message || log.metadata?.reason || log.event_type;
    
    const icon = log.event_type === 'CHEATING' ? '🚨' : log.event_type === 'SUBMIT' ? '✅' : log.event_type === 'TAB_SWITCH' ? '⚠️' : '📌';
    msg += `${icon} <code>${time}</code> <b>${studentName}</b>\n`;
    msg += `   ${log.event_type}: ${detail.substring(0, 60)}\n\n`;
  });

  await sendMessage(chatId, msg);
  adminConversations.delete(chatId);
}

async function handleRemedialReport(chatId: number, sessionName: string) {
  const { data: session } = await supabase
    .from('gm_sessions')
    .select('id, kkm, class_name, subject, academic_year')
    .eq('session_name', sessionName)
    .single();

  if (!session) {
    await sendMessage(chatId, '❌ Sesi tidak ditemukan.');
    return;
  }

  const { data: students } = await supabase
    .from('gm_students')
    .select('name, final_score, remedial_status')
    .eq('session_id', session.id)
    .eq('is_deleted', false)
    .lt('final_score', session.kkm || 70)
    .order('name');

  if (!students || students.length === 0) {
    await sendMessage(chatId, `✅ <b>Semua siswa di ${sessionName} sudah tuntas (KKM: ${session.kkm || 70}).</b>`);
    return;
  }

  let msg = `🚨 <b>Siswa Belum Tuntas</b>\n\n`;
  msg += `📋 Sesi: <b>${sessionName}</b>\n`;
  msg += `🏫 Kelas: <b>${session.class_name}</b>\n`;
  msg += `📚 Mapel: <b>${session.subject}</b>\n`;
  msg += `📌 KKM: <b>${session.kkm || 70}</b>\n\n`;
  msg += `👥 <b>Daftar (${students.length} orang):</b>\n`;

  students.forEach((s, i) => {
    const statusIcon = s.remedial_status === 'COMPLETED' ? '🔄' : s.remedial_status === 'CHEATED' ? '🚫' : '❌';
    msg += `${i + 1}. ${statusIcon} ${s.name} — <b>${s.final_score}</b>`;
    if (s.remedial_status && s.remedial_status !== 'NONE') {
      msg += ` (${s.remedial_status})`;
    }
    msg += `\n`;
  });

  msg += `\n⚠️ <i>Pastikan siswa menyelesaikan remedial tepat waktu.</i>`;
  await sendMessage(chatId, msg);
}

async function handleConversationStep(
  chatId: number,
  text: string,
  conv: { step: string; data: Record<string, unknown> }
) {
  switch (conv.step) {
    // ── GET_USER input ──
    case 'getuser_input': {
      const sessionName = conv.data.sessionName as string;
      await executeGetUser(chatId, sessionName, text.trim());
      adminConversations.delete(chatId);
      break;
    }

    // ── SET_NILAI input ──
    case 'setnilai_input': {
      const match = text.trim().match(/^(.+?)\s+(\d+)$/);
      if (!match) {
        await sendMessage(chatId, '⚠️ Format tidak valid. Masukkan: <code>nama nilai</code>\nContoh: <code>Ahmad 85</code>');
        return;
      }
      const sessionName = conv.data.sessionName as string;
      const name = match[1].trim();
      const nilai = parseInt(match[2]);

      await requestConfirmation(chatId, 'SET_NILAI', { user_id: name, nilai }, sessionName,
        `✏️ Ubah nilai <b>${name}</b> → <b>${nilai}</b>\n📋 Sesi: ${sessionName}`
      );
      adminConversations.delete(chatId);
      break;
    }

    // ── /newsession flow ──
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
    .select('session_name, is_demo')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) {
    await sendMessage(chatId, '📭 Belum ada sesi. Buat dulu dengan /newsession');
    adminConversations.delete(chatId);
    return;
  }

  const keyboard = data.map(s => [{ 
    text: s.is_demo ? `🧪 DEMO: ${s.session_name}` : s.session_name, 
    callback_data: `${action}::${s.session_name}` 
  }]);
  await sendInlineKeyboard(chatId, '📋 Pilih sesi:', keyboard);
}
