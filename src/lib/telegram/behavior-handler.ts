import { Composer, Markup } from 'telegraf';
import { supabase } from './bot';
import { compressUUID, decompressUUID } from './menu-builder';

/**
 * Behavior Handler for GradeMaster Admin Bot.
 * Provides a premium "XSAN STORE" style management interface.
 */
export const behaviorHandler = new Composer();

const PAGE_SIZE = 8;

// --- Keyboards & Menus ---

/**
 * Main Behavior Menu (Select Student)
 */
async function renderStudentSelection(ctx: any, page: number = 1) {
  const { data: students, error } = await supabase
    .from('gm_behaviors')
    .select('id, student_name, total_points')
    .order('student_name', { ascending: true });

  if (error || !students || students.length === 0) {
    return ctx.editMessageText('📭 <b>Belum ada data siswa.</b>', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'nav:main' }]])
    });
  }

  const startIdx = (page - 1) * PAGE_SIZE;
  const pageItems = students.slice(startIdx, startIdx + PAGE_SIZE);
  const totalPages = Math.ceil(students.length / PAGE_SIZE);

  // Build Keypad Style Buttons (2 per row)
  const buttons = [];
  for (let i = 0; i < pageItems.length; i += 2) {
    const row = [
      Markup.button.callback(`${startIdx + i + 1}. ${pageItems[i].student_name}`, `stubeh:view:${compressUUID(pageItems[i].id)}`)
    ];
    if (pageItems[i + 1]) {
      row.push(Markup.button.callback(`${startIdx + i + 2}. ${pageItems[i + 1].student_name}`, `stubeh:view:${compressUUID(pageItems[i + 1].id)}`));
    }
    buttons.push(row);
  }

  // Navigation Row
  const navRow = [];
  if (page > 1) navRow.push(Markup.button.callback('⬅️ Prev', `stubeh:page:${page - 1}`));
  navRow.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
  if (page < totalPages) navRow.push(Markup.button.callback('Next ➡️', `stubeh:page:${page + 1}`));
  buttons.push(navRow);
  
  buttons.push([Markup.button.callback('🏠 Menu Utama', 'nav:main')]);

  return ctx.editMessageText(`📊 <b>MANAJEMEN PERILAKU SISWA</b>\n\nSilakan pilih siswa untuk dikelola:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
}

/**
 * Individual Student Behavior Dashboard
 */
async function renderStudentDashboard(ctx: any, studentId: string) {
  const { data: student } = await supabase
    .from('gm_behaviors')
    .select('*')
    .eq('id', studentId)
    .single();

  if (!student) return ctx.answerCbQuery('❌ Siswa tidak ditemukan');

  const { data: logs } = await supabase
    .from('gm_behavior_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(5);

  let logText = '';
  if (logs && logs.length > 0) {
    logText = logs.map(l => {
      const icon = l.points_delta > 0 ? '👍' : '👎';
      return `${icon} ${new Date(l.created_at).toLocaleDateString()} | <b>${l.points_delta > 0 ? '+' : ''}${l.points_delta}</b> | ${l.reason}`;
    }).join('\n');
  } else {
    logText = '<i>Belum ada riwayat.</i>';
  }

  const msg = `👤 <b>PROFIL PERILAKU: ${student.student_name}</b>\n\n` +
    `⭐ Total Poin: <b>${student.total_points}</b>\n` +
    `📍 Kelas: ${student.class_name}\n\n` +
    `📜 <b>Riwayat Terakhir:</b>\n${logText}\n\n` +
    `Pilih aksi di bawah:`;

  const compId = compressUUID(studentId);
  const keyboard = [
    [Markup.button.callback('➕ Tambah Positif', `stubeh:addpos:${compId}`)],
    [Markup.button.callback('➖ Tambah Negatif', `stubeh:addneg:${compId}`)],
    [
      Markup.button.callback('✏️ Edit Log', `stubeh:logs:${compId}`),
      Markup.button.callback('🗑️ Hapus Log', `stubeh:logs:${compId}`)
    ],
    [Markup.button.callback('🔙 Kembali ke Daftar', 'stubeh:page:1')],
    [Markup.button.callback('🏠 Menu Utama', 'nav:main')]
  ];

  return ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(keyboard)
  });
}

// --- Interaction Handlers ---

behaviorHandler.action(/^stubeh:page:(\d+)$/, async (ctx: any) => {
  const page = parseInt(ctx.match[1]);
  return renderStudentSelection(ctx, page);
});

behaviorHandler.action(/^stubeh:view:(.+)$/, async (ctx: any) => {
  const studentId = decompressUUID(ctx.match[1]);
  return renderStudentDashboard(ctx, studentId);
});

// Implementation of basic actions (Add Pos/Neg)
behaviorHandler.action(/^stubeh:add(pos|neg):(.+)$/, async (ctx: any) => {
  const type = ctx.match[1];
  const studentId = decompressUUID(ctx.match[2]);

  // For simplicity, we'll suggest common reasons. In a full implementation, you can use a Scene or Wizard.
  const reasons = type === 'pos' 
    ? ["Membantu Teman", "Aktif Berdiskusi", "Piket Mandiri"]
    : ["Bolos PBM", "Berbicara Kasar", "Terlambat Parah"];

  const buttons = reasons.map(r => [
    Markup.button.callback(r, `stubeh:save:${compressUUID(studentId)}:${type === 'pos' ? 10 : -10}:${encodeURIComponent(r)}`)
  ]);
  
  buttons.push([Markup.button.callback('🔙 Kembali', `stubeh:view:${compressUUID(studentId)}`)]);

  return ctx.editMessageText(`➕ <b>Tambah Poin ${type === 'pos' ? 'Positif' : 'Negatif'}</b>\n\nPilih kategori atau alasan:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
});

// Saving the log using the Supabase RPC
behaviorHandler.action(/^stubeh:save:(.+):(-?\d+):(.+)$/, async (ctx: any) => {
  const studentId = decompressUUID(ctx.match[1]);
  const points = parseInt(ctx.match[2]);
  const reason = decodeURIComponent(ctx.match[3]);

  try {
    const { error } = await supabase.rpc('add_behavior_log_entry', {
      p_student_id: studentId,
      p_category_id: null,
      p_points_delta: points,
      p_reason: reason,
      p_teacher_id: `Telegram Bot User`
    });

    if (error) throw error;
    
    await ctx.answerCbQuery(`✅ Poin diperbarui untuk ${reason}`);
    return renderStudentDashboard(ctx, studentId);
  } catch (err: any) {
    return ctx.answerCbQuery(`❌ Gagal: ${err.message}`);
  }
});
