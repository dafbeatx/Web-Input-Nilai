import { Composer, Markup, Context } from 'telegraf';
import { supabase } from './bot';
import { compressUUID, decompressUUID } from './menu-builder';

interface MatchContext extends Context {
  match: RegExpExecArray;
}

/**
 * Behavior Handler for GradeMaster Admin Bot (Hierarchical Version).
 * Structure: Select Class -> Select Student -> Details/Manage.
 */
export const behaviorHandler = new Composer();

const PAGE_SIZE = 8;

// --- Keyboards & Menus ---

/**
 * Step 1: Select Class
 */
async function renderClassSelection(ctx: Context) {
  // Fetch unique class names from gm_behaviors
  const { data, error } = await supabase
    .from('gm_behaviors')
    .select('class_name');

  if (error) return ctx.answerCbQuery(`❌ Gagal: ${error.message}`);
  
  const uniqueClasses = Array.from(new Set(data?.map((d: any) => d.class_name) || [])).sort();

  if (uniqueClasses.length === 0) {
    return ctx.editMessageText('📭 <b>Belum ada data kelas.</b>', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'nav:main' }]])
    });
  }

  // Create keyboard with classes in 2-column layout (Large buttons style)
  const buttons: any[][] = [];
  for (let i = 0; i < uniqueClasses.length; i += 2) {
    const row = [
      Markup.button.callback(`🏫 Kelas ${uniqueClasses[i]}`, `stubeh:cls:${uniqueClasses[i]}`)
    ];
    if (uniqueClasses[i + 1]) {
      row.push(Markup.button.callback(`🏫 Kelas ${uniqueClasses[i + 1]}`, `stubeh:cls:${uniqueClasses[i + 1]}`));
    }
    buttons.push(row);
  }
  
  buttons.push([Markup.button.callback('🏠 Menu Utama', 'nav:main')]);

  return ctx.editMessageText(`📊 <b>KELOLA PERILAKU SISWA</b>\n\nSilakan pilih <b>KELAS</b> terlebih dahulu:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
}

/**
 * Step 2: Select Student in Class
 */
async function renderStudentSelection(ctx: Context, className: string, page: number = 1) {
  const { data: students, error } = await supabase
    .from('gm_behaviors')
    .select('id, student_name, total_points')
    .eq('class_name', className)
    .order('student_name', { ascending: true });

  if (error || !students) return ctx.answerCbQuery(`❌ Gagal: ${error.message}`);

  if (students.length === 0) {
    return ctx.editMessageText(`📭 Belum ada siswa di kelas <b>${className}</b>.`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[{ text: '🔙 Kembali ke Kelas', callback_data: 'stubeh:start' }]])
    });
  }

  const startIdx = (page - 1) * PAGE_SIZE;
  const pageItems = students.slice(startIdx, startIdx + PAGE_SIZE);
  const totalPages = Math.ceil(students.length / PAGE_SIZE);

  // Keypad style (2 per row)
  const buttons: any[][] = [];
  for (let i = 0; i < pageItems.length; i += 2) {
    const row = [
      Markup.button.callback(`${startIdx + i + 1}. ${pageItems[i].student_name}`, `stubeh:view:${className}:${page}:${compressUUID(pageItems[i].id)}`)
    ];
    if (pageItems[i + 1]) {
      row.push(Markup.button.callback(`${startIdx + i + 2}. ${pageItems[i + 1].student_name}`, `stubeh:view:${className}:${page}:${compressUUID(pageItems[i + 1].id)}`));
    }
    buttons.push(row);
  }

  // Navigation
  const navRow: any[] = [];
  if (page > 1) navRow.push(Markup.button.callback('⬅️ Prev', `stubeh:page:${className}:${page - 1}`));
  navRow.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
  if (page < totalPages) navRow.push(Markup.button.callback('Next ➡️', `stubeh:page:${className}:${page + 1}`));
  buttons.push(navRow);
  
  buttons.push([Markup.button.callback('🔙 Kembali ke Daftar Kelas', 'stubeh:start')]);
  buttons.push([Markup.button.callback('🏠 Menu Utama', 'nav:main')]);

  return ctx.editMessageText(`👥 <b>DAFTAR SISWA KELAS ${className}</b>\n\nSilakan pilih siswa:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
}

/**
 * Step 3: Student Details Dashboard
 */
async function renderStudentDashboard(ctx: Context, className: string, page: string, studentId: string) {
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
    logText = logs.map((l: any) => {
      const icon = l.points_delta > 0 ? '👍' : '👎';
      return `${icon} ${new Date(l.created_at).toLocaleDateString()} | <b>${l.points_delta > 0 ? '+' : ''}${l.points_delta}</b> | ${l.reason}`;
    }).join('\n');
  } else {
    logText = '<i>Belum ada riwayat tercatat.</i>';
  }

  const msg = `👤 <b>DETAIL PERILAKU: ${student.student_name}</b>\n\n` +
    `⭐ Poin Total: <b>${student.total_points}</b>\n` +
    `🏫 Kelas: ${student.class_name} | ${student.academic_year}\n\n` +
    `📜 <b>Log Terakhir:</b>\n${logText}\n\n` +
    `Pilih tindakan manajemen:`;

  const compId = compressUUID(studentId);
  const backToStu = `stubeh:page:${className}:${page}`;
  
  const keyboard = [
    [Markup.button.callback('➕ TAMBAH POSITIF', `stubeh:action:${className}:${page}:${compId}:add:pos`)],
    [Markup.button.callback('➖ TAMBAH NEGATIF', `stubeh:action:${className}:${page}:${compId}:add:neg`)],
    [
      Markup.button.callback('✏️ Edit Log', `stubeh:logs:${compId}`),
      Markup.button.callback('🗑️ Hapus Log', `stubeh:logs:${compId}`)
    ],
    [Markup.button.callback('🔙 Kembali ke Siswa', backToStu)],
    [Markup.button.callback('🔙 Kembali ke Kelas', 'stubeh:start')],
    [Markup.button.callback('🏠 Menu Utama', 'nav:main')]
  ];

  return ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(keyboard)
  });
}

// --- Interaction Dispatchers ---

// Callback entries for the behavior system
behaviorHandler.action('stubeh:start', async (ctx: Context) => renderClassSelection(ctx));

behaviorHandler.action(/^stubeh:cls:(.+)$/, async (ctx: MatchContext) => {
  const className = ctx.match[1];
  return renderStudentSelection(ctx, className, 1);
});

behaviorHandler.action(/^stubeh:page:(.+):(\d+)$/, async (ctx: MatchContext) => {
  const className = ctx.match[1];
  const page = parseInt(ctx.match[2]);
  return renderStudentSelection(ctx, className, page);
});

behaviorHandler.action(/^stubeh:view:(.+):(\d+):(.+)$/, async (ctx: MatchContext) => {
  const className = ctx.match[1];
  const page = ctx.match[2];
  const studentId = decompressUUID(ctx.match[3]);
  return renderStudentDashboard(ctx, className, page, studentId);
});

// Quick action shortcuts
behaviorHandler.action(/^stubeh:action:(.+):(\d+):(.+):add:(pos|neg)$/, async (ctx: MatchContext) => {
  const className = ctx.match[1];
  const page = ctx.match[2];
  const studentId = decompressUUID(ctx.match[3]);
  const type = ctx.match[4];

  const reasons = type === 'pos' 
    ? ["Membantu Teman", "Aktif Berdiskusi", "Piket Mandiri", "Jujur/Integritas"]
    : ["Bolos PBM", "Berbicara Kasar", "Merokok/Vaping", "Membantah Guru"];

  const buttons = reasons.map(r => [
    Markup.button.callback(r, `stubeh:save:${className}:${page}:${compressUUID(studentId)}:${type === 'pos' ? 10 : -10}:${encodeURIComponent(r)}`)
  ]);
  
  buttons.push([Markup.button.callback('🔙 Batal', `stubeh:view:${className}:${page}:${compressUUID(studentId)}`)]);

  return ctx.editMessageText(`📋 <b>Pilih Kategori ${type === 'pos' ? 'Terpuji' : 'Pelanggaran'}</b>\n\nKetuk alasan di bawah:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
});

behaviorHandler.action(/^stubeh:save:(.+):(\d+):(.+):(-?\d+):(.+)$/, async (ctx: MatchContext) => {
  const className = ctx.match[1];
  const page = ctx.match[2];
  const studentId = decompressUUID(ctx.match[3]);
  const points = parseInt(ctx.match[4]);
  const reason = decodeURIComponent(ctx.match[5]);

  try {
    const { error } = await supabase.rpc('add_behavior_log_entry', {
      p_student_id: studentId,
      p_category_id: null,
      p_points_delta: points,
      p_reason: reason,
      p_teacher_id: `Telegram:${ctx.from?.username || ctx.from?.id}`
    });

    if (error) throw error;
    
    await ctx.answerCbQuery(`✅ Berhasil mencatat ${reason}`);
    // Auto-return to dashboard
    return renderStudentDashboard(ctx, className, page, studentId);
  } catch (err: any) {
    return ctx.answerCbQuery(`❌ Gagal: ${err.message}`);
  }
});

/**
 * Management: Log List for Edit/Delete
 */
behaviorHandler.action(/^stubeh:logs:(.+)$/, async (ctx: MatchContext) => {
  const studentId = decompressUUID(ctx.match[1]);
  
  const { data: logs, error } = await supabase
    .from('gm_behavior_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !logs || logs.length === 0) {
    return ctx.answerCbQuery('📭 Tidak ada log untuk dikelola.');
  }

  const buttons = logs.map((l: any) => {
    const icon = l.points_delta > 0 ? '👍' : '👎';
    const dateStr = new Date(l.created_at).toLocaleDateString();
    return [Markup.button.callback(`${icon} ${dateStr} - ${l.reason}`, `stubeh:log_detail:${compressUUID(studentId)}:${compressUUID(l.id)}`)];
  });

  buttons.push([Markup.button.callback('🔙 Kembali', `stubeh:view_back:${compressUUID(studentId)}`)]);

  return ctx.editMessageText('⚙️ <b>KELOLA LOG PERILAKU</b>\n\nPilih log di bawah untuk dikelola:', {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
});

/**
 * Log Detail View & Delete
 */
behaviorHandler.action(/^stubeh:log_detail:(.+):(.+)$/, async (ctx: MatchContext) => {
  const studentId = decompressUUID(ctx.match[1]);
  const logId = decompressUUID(ctx.match[2]);

  const { data: log } = await supabase.from('gm_behavior_logs').select('*').eq('id', logId).single();
  if (!log) return ctx.answerCbQuery('❌ Log tidak ditemukan.');

  const msg = `📑 <b>DETAIL CATATAN</b>\n\n` +
    `Alasan: <b>${log.reason}</b>\n` +
    `Poin: ${log.points_delta > 0 ? '+' : ''}${log.points_delta}\n` +
    `Waktu: ${new Date(log.created_at).toLocaleString()}\n\n` +
    `<i>Poin siswa akan dikalibrasi ulang secara otomatis jika log ini dihapus.</i>`;

  return ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🗑️ HAPUS CATATAN INI', `stubeh:delete_log:${compressUUID(studentId)}:${compressUUID(logId)}`)],
      [Markup.button.callback('🔙 Kembali ke List', `stubeh:logs:${compressUUID(studentId)}`)]
    ])
  });
});

/**
 * Delete Log Action
 */
behaviorHandler.action(/^stubeh:delete_log:(.+):(.+)$/, async (ctx: MatchContext) => {
  const studentId = decompressUUID(ctx.match[1]);
  const logId = decompressUUID(ctx.match[2]);

  try {
    const { error } = await supabase.from('gm_behavior_logs').delete().eq('id', logId);
    if (error) throw error;

    // Recalculate points via RPC
    await supabase.rpc('recompute_student_behavior_points', { p_student_id: studentId });

    await ctx.answerCbQuery('✅ Berhasil dihapus.');
    return ctx.editMessageText('✅ <b>Catatan berhasil dihapus.</b>\nPoin siswa telah diperbarui secara otomatis.', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Kembali ke Dashboard', `stubeh:view_back:${compressUUID(studentId)}`)]])
    });
  } catch (err: any) {
    return ctx.answerCbQuery(`❌ Gagal: ${err.message}`);
  }
});

/**
 * Helper to return to dashboard without knowing class context
 */
behaviorHandler.action(/^stubeh:view_back:(.+)$/, async (ctx: MatchContext) => {
    const studentId = decompressUUID(ctx.match[1]);
    const { data: student } = await supabase.from('gm_behaviors').select('class_name').eq('id', studentId).single();
    if (!student) return ctx.answerCbQuery('❌ Error.');
    return renderStudentDashboard(ctx, student.class_name, '1', studentId);
});
