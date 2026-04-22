import { Composer, Markup, Context } from 'telegraf';
import { supabase } from './bot';
import { compressUUID, decompressUUID, buildDateKeyboard } from './menu-builder';

interface MatchContext extends Context {
  match: RegExpExecArray;
}

/**
 * Attendance Handler for GradeMaster Admin Bot.
 * Flow: Select Class → Select Subject → Select Date → View/Input attendance
 * Prefix: `statt:`
 */
export const attendanceHandler = new Composer();

const SUBJECTS = ['Informatika', 'Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'Bahasa Inggris', 'PAI', 'PJOK', 'Seni Budaya', 'PKn'];
const STATUS_LABELS: Record<string, string> = { Hadir: '✅', Izin: 'ℹ️', Sakit: '🤒', Alpa: '❌' };
const PAGE_SIZE = 8;

// ── Step 1: Class Selection ──
async function renderClassSelection(ctx: Context) {
  const { data } = await supabase.from('gm_behaviors').select('class_name');
  const uniqueClasses = Array.from(new Set(data?.map((d: any) => d.class_name) || [])).sort();

  if (uniqueClasses.length === 0) {
    return ctx.editMessageText('📭 <b>Belum ada data kelas.</b>', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[{ text: '🏠 Menu Utama', callback_data: 'nav:main' }]])
    });
  }

  const buttons: any[][] = [];
  for (let i = 0; i < uniqueClasses.length; i += 2) {
    const row = [Markup.button.callback(`🏫 ${uniqueClasses[i]}`, `statt:cls:${uniqueClasses[i]}`)];
    if (uniqueClasses[i + 1]) {
      row.push(Markup.button.callback(`🏫 ${uniqueClasses[i + 1]}`, `statt:cls:${uniqueClasses[i + 1]}`));
    }
    buttons.push(row);
  }
  buttons.push([Markup.button.callback('🏠 Menu Utama', 'nav:main')]);

  return ctx.editMessageText('📅 <b>KEHADIRAN</b>\n\nPilih <b>KELAS</b>:', {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ── Step 2: Subject Selection ──
async function renderSubjectSelection(ctx: Context, className: string) {
  const buttons: any[][] = [];
  for (let i = 0; i < SUBJECTS.length; i += 2) {
    const row = [Markup.button.callback(`📚 ${SUBJECTS[i]}`, `statt:sub:${className}:${encodeURIComponent(SUBJECTS[i])}`)];
    if (SUBJECTS[i + 1]) {
      row.push(Markup.button.callback(`📚 ${SUBJECTS[i + 1]}`, `statt:sub:${className}:${encodeURIComponent(SUBJECTS[i + 1])}`));
    }
    buttons.push(row);
  }
  buttons.push([Markup.button.callback('🔙 Kembali', 'statt:start')]);

  return ctx.editMessageText(`📅 <b>KEHADIRAN — Kelas ${className}</b>\n\nPilih <b>MAPEL</b>:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ── Step 3: Date Selection ──
async function renderDateSelection(ctx: Context, className: string, subject: string) {
  const dateKeyboard = buildDateKeyboard(`statt:date:${className}:${encodeURIComponent(subject)}`, 6);
  dateKeyboard.push([Markup.button.callback('🔙 Pilih Mapel', `statt:cls:${className}`)]);
  dateKeyboard.push([Markup.button.callback('🏠 Menu Utama', 'nav:main')]);

  return ctx.editMessageText(`📅 <b>KEHADIRAN</b>\n🏫 ${className} — 📚 ${subject}\n\nPilih <b>TANGGAL</b>:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(dateKeyboard)
  });
}

// ── Step 4: Attendance Dashboard ──
async function renderAttendanceDashboard(ctx: Context, className: string, subject: string, date: string) {
  // Fetch students
  const { data: students } = await supabase
    .from('gm_behaviors')
    .select('id, student_name')
    .eq('class_name', className)
    .order('student_name');

  if (!students || students.length === 0) {
    return ctx.editMessageText(`📭 Belum ada siswa di kelas <b>${className}</b>.`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[{ text: '🔙 Kembali', callback_data: 'statt:start' }]])
    });
  }

  // Fetch existing attendance
  const { data: records } = await supabase
    .from('gm_attendance')
    .select('student_name, status')
    .eq('class_name', className)
    .eq('subject', subject)
    .eq('date', date);

  const attMap: Record<string, string> = {};
  (records || []).forEach((r: any) => { attMap[r.student_name] = r.status; });

  const stats = {
    hadir: 0, izin: 0, sakit: 0, alpa: 0, belum: 0
  };
  students.forEach((s: any) => {
    const st = attMap[s.student_name];
    if (st === 'Hadir') stats.hadir++;
    else if (st === 'Izin') stats.izin++;
    else if (st === 'Sakit') stats.sakit++;
    else if (st === 'Alpa') stats.alpa++;
    else stats.belum++;
  });

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const msg = `📅 <b>REKAP KEHADIRAN</b>\n` +
    `🏫 ${className} — 📚 ${subject}\n` +
    `📆 ${dateLabel}\n\n` +
    `✅ Hadir: <b>${stats.hadir}</b>\n` +
    `ℹ️ Izin: <b>${stats.izin}</b>\n` +
    `🤒 Sakit: <b>${stats.sakit}</b>\n` +
    `❌ Alpa: <b>${stats.alpa}</b>\n` +
    `⬜ Belum: <b>${stats.belum}</b>\n` +
    `━━━━━━━━━━\n` +
    `👥 Total: <b>${students.length}</b> siswa`;

  const encSub = encodeURIComponent(subject);
  const keyboard = [
    [Markup.button.callback('👥 Input Absensi per Siswa', `statt:list:${className}:${encSub}:${date}:1`)],
  ];
  if (stats.belum > 0) {
    keyboard.push([Markup.button.callback(`✅ Tandai Semua Belum → Hadir (${stats.belum})`, `statt:bulk:${className}:${encSub}:${date}`)]);
  }
  keyboard.push([Markup.button.callback('📆 Ganti Tanggal', `statt:sub:${className}:${encSub}`)]);
  keyboard.push([Markup.button.callback('🔙 Pilih Kelas', 'statt:start')]);
  keyboard.push([Markup.button.callback('🏠 Menu Utama', 'nav:main')]);

  return ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(keyboard)
  });
}

// ── Student List for Input ──
async function renderStudentList(ctx: Context, className: string, subject: string, date: string, page: number) {
  const { data: students } = await supabase
    .from('gm_behaviors')
    .select('id, student_name')
    .eq('class_name', className)
    .order('student_name');

  if (!students || students.length === 0) return;

  const { data: records } = await supabase
    .from('gm_attendance')
    .select('student_name, status')
    .eq('class_name', className)
    .eq('subject', subject)
    .eq('date', date);

  const attMap: Record<string, string> = {};
  (records || []).forEach((r: any) => { attMap[r.student_name] = r.status; });

  const startIdx = (page - 1) * PAGE_SIZE;
  const pageItems = students.slice(startIdx, startIdx + PAGE_SIZE);
  const totalPages = Math.ceil(students.length / PAGE_SIZE);

  const encSub = encodeURIComponent(subject);
  const buttons: any[][] = [];

  for (const s of pageItems) {
    const status = attMap[s.student_name] || '—';
    const icon = STATUS_LABELS[status] || '⬜';
    buttons.push([Markup.button.callback(
      `${icon} ${s.student_name} [${status}]`,
      `statt:stu:${className}:${encSub}:${date}:${page}:${compressUUID(s.id)}`
    )]);
  }

  // Pagination
  const navRow: any[] = [];
  if (page > 1) navRow.push(Markup.button.callback('⬅️', `statt:list:${className}:${encSub}:${date}:${page - 1}`));
  navRow.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
  if (page < totalPages) navRow.push(Markup.button.callback('➡️', `statt:list:${className}:${encSub}:${date}:${page + 1}`));
  buttons.push(navRow);

  buttons.push([Markup.button.callback('📊 Kembali ke Rekap', `statt:date:${className}:${encSub}:${date}`)]);

  return ctx.editMessageText(`👥 <b>INPUT KEHADIRAN</b>\n🏫 ${className} — 📚 ${subject}\n📆 ${date}\n\nKetuk siswa untuk ubah status:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ── Student Status Selector ──
async function renderStatusSelector(ctx: Context, className: string, subject: string, date: string, page: string, studentId: string) {
  const { data: student } = await supabase
    .from('gm_behaviors')
    .select('student_name')
    .eq('id', studentId)
    .single();

  if (!student) return ctx.answerCbQuery('❌ Siswa tidak ditemukan');

  const encSub = encodeURIComponent(subject);
  const cmpId = compressUUID(studentId);

  const buttons = [
    [
      Markup.button.callback('✅ Hadir', `statt:set:${className}:${encSub}:${date}:${page}:${cmpId}:Hadir`),
      Markup.button.callback('ℹ️ Izin', `statt:set:${className}:${encSub}:${date}:${page}:${cmpId}:Izin`),
    ],
    [
      Markup.button.callback('🤒 Sakit', `statt:set:${className}:${encSub}:${date}:${page}:${cmpId}:Sakit`),
      Markup.button.callback('❌ Alpa', `statt:set:${className}:${encSub}:${date}:${page}:${cmpId}:Alpa`),
    ],
    [Markup.button.callback('🔙 Kembali', `statt:list:${className}:${encSub}:${date}:${page}`)],
  ];

  return ctx.editMessageText(`👤 <b>${student.student_name}</b>\n\nPilih status kehadiran:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ═══════════════════════════════════════
// CALLBACK DISPATCHERS
// ═══════════════════════════════════════

attendanceHandler.action('statt:start', async (ctx: Context) => renderClassSelection(ctx));

attendanceHandler.action(/^statt:cls:(.+)$/, async (ctx: MatchContext) => {
  return renderSubjectSelection(ctx, ctx.match[1]);
});

attendanceHandler.action(/^statt:sub:([^:]+):(.+)$/, async (ctx: MatchContext) => {
  return renderDateSelection(ctx, ctx.match[1], decodeURIComponent(ctx.match[2]));
});

attendanceHandler.action(/^statt:date:([^:]+):([^:]+):(.+)$/, async (ctx: MatchContext) => {
  return renderAttendanceDashboard(ctx, ctx.match[1], decodeURIComponent(ctx.match[2]), ctx.match[3]);
});

attendanceHandler.action(/^statt:list:([^:]+):([^:]+):([^:]+):(\d+)$/, async (ctx: MatchContext) => {
  return renderStudentList(ctx, ctx.match[1], decodeURIComponent(ctx.match[2]), ctx.match[3], parseInt(ctx.match[4]));
});

attendanceHandler.action(/^statt:stu:([^:]+):([^:]+):([^:]+):(\d+):(.+)$/, async (ctx: MatchContext) => {
  const studentId = decompressUUID(ctx.match[5]);
  return renderStatusSelector(ctx, ctx.match[1], decodeURIComponent(ctx.match[2]), ctx.match[3], ctx.match[4], studentId);
});

// ── Set Status ──
attendanceHandler.action(/^statt:set:([^:]+):([^:]+):([^:]+):(\d+):([^:]+):(.+)$/, async (ctx: MatchContext) => {
  const className = ctx.match[1];
  const subject = decodeURIComponent(ctx.match[2]);
  const date = ctx.match[3];
  const page = ctx.match[4];
  const studentId = decompressUUID(ctx.match[5]);
  const status = ctx.match[6];

  const { data: student } = await supabase
    .from('gm_behaviors')
    .select('student_name, academic_year')
    .eq('id', studentId)
    .single();

  if (!student) return ctx.answerCbQuery('❌ Siswa tidak ditemukan');

  const { error } = await supabase
    .from('gm_attendance')
    .upsert({
      student_name: student.student_name,
      class_name: className,
      subject,
      academic_year: student.academic_year || '2025/2026',
      status,
      date,
    }, { onConflict: 'student_name,class_name,subject,date' });

  if (error) {
    return ctx.answerCbQuery(`❌ Gagal: ${error.message}`);
  }

  await ctx.answerCbQuery(`${STATUS_LABELS[status]} ${student.student_name} → ${status}`);
  return renderStudentList(ctx, className, subject, date, parseInt(page));
});

// ── Bulk Set Hadir ──
attendanceHandler.action(/^statt:bulk:([^:]+):([^:]+):(.+)$/, async (ctx: MatchContext) => {
  const className = ctx.match[1];
  const subject = decodeURIComponent(ctx.match[2]);
  const date = ctx.match[3];

  const { data: students } = await supabase
    .from('gm_behaviors')
    .select('student_name, academic_year')
    .eq('class_name', className);

  if (!students) return ctx.answerCbQuery('❌ Gagal memuat siswa');

  const { data: existing } = await supabase
    .from('gm_attendance')
    .select('student_name')
    .eq('class_name', className)
    .eq('subject', subject)
    .eq('date', date);

  const existingSet = new Set((existing || []).map((e: any) => e.student_name));
  const toInsert = students
    .filter((s: any) => !existingSet.has(s.student_name))
    .map((s: any) => ({
      student_name: s.student_name,
      class_name: className,
      subject,
      academic_year: s.academic_year || '2025/2026',
      status: 'Hadir',
      date,
    }));

  if (toInsert.length === 0) {
    return ctx.answerCbQuery('✅ Semua sudah diset!');
  }

  const { error } = await supabase.from('gm_attendance').upsert(toInsert, { onConflict: 'student_name,class_name,subject,date' });

  if (error) return ctx.answerCbQuery(`❌ Gagal: ${error.message}`);

  await ctx.answerCbQuery(`✅ ${toInsert.length} siswa ditandai Hadir!`);
  return renderAttendanceDashboard(ctx, className, subject, date);
});
