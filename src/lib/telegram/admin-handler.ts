import { sendMessage, sendInlineKeyboard, editMessageText, isAdmin, supabase } from './bot';
import { hashPassword } from '@/lib/grademaster/security';
import { parseAnswerKey } from '@/lib/grademaster/parser';
import { buildPaginationKeyboard, compressUUID, decompressUUID } from './menu-builder';
import { TelegramUpdate } from './bot';

const adminConversations = new Map<number, { step: string; data: Record<string, unknown> }>();

const MAIN_MENU = `🎓 <b>GradeMaster Admin Panel</b>\n\nPilih aksi:`;
const MAIN_KEYBOARD = [
  [{ text: '📊 Lihat Sesi', callback_data: 'nav:cat:sessions' }],
  [{ text: '👥 Kelola Siswa', callback_data: 'nav:cat:students' }],
  [{ text: '🚨 Pelanggaran', callback_data: 'nav:cat:violations' }],
  [{ text: '📈 Nilai (Statistik)', callback_data: 'nav:cat:grades' }],
  [{ text: '⚙️ Sistem', callback_data: 'nav:cat:system' }]
];

export async function handleAdminCommand(chatId: number, text: string, messageId?: number) {
  if (!isAdmin(chatId)) {
    await sendMessage(chatId, '⛔ Anda tidak memiliki akses admin.');
    return;
  }

  const conv = adminConversations.get(chatId);

  if (text === '/start' || text === '/menu') {
    adminConversations.delete(chatId);
    await sendInlineKeyboard(chatId, MAIN_MENU, MAIN_KEYBOARD);
    return;
  }

  // Handle Free-text Prompts (like Set Nilai, Password)
  if (conv) {
    await handleConversationStep(chatId, text, conv, messageId);
    return;
  }

  // Fallback
  await sendMessage(chatId, 'Ketik /start untuk membuka Menu Admin.');
}

async function handleConversationStep(
  chatId: number,
  text: string,
  conv: { step: string; data: Record<string, unknown> },
  messageId?: number
) {
  // Free text inputs for new session
  if (conv.step === 'session_name') {
    conv.data.sessionName = text.trim();
    conv.step = 'teacher';
    await sendMessage(chatId, '👤 Masukkan <b>nama guru</b>:');
    return;
  }
  if (conv.step === 'teacher') {
    conv.data.teacher = text.trim();
    conv.step = 'subject';
    await sendMessage(chatId, '📚 Masukkan <b>mata pelajaran</b>:');
    return;
  }
  if (conv.step === 'subject') {
    conv.data.subject = text.trim();
    conv.step = 'class_name';
    await sendMessage(chatId, '🏫 Masukkan <b>kelas</b> (contoh: 10A):');
    return;
  }
  if (conv.step === 'class_name') {
    conv.data.className = text.trim();
    conv.step = 'school_level_wait';
    await sendInlineKeyboard(chatId, '🎓 Pilih <b>tingkat sekolah</b>:', [
      [
        { text: 'SMP', callback_data: 'sys:sel_lvl:SMP' },
        { text: 'SMA', callback_data: 'sys:sel_lvl:SMA' },
      ],
    ]);
    return;
  }
  if (conv.step === 'academic_year') {
    conv.data.academicYear = text.trim();
    conv.step = 'password';
    await sendMessage(chatId, '🔒 Masukkan <b>password</b> untuk sesi ini:');
    return;
  }
  if (conv.step === 'password') {
    const pw = text.trim();
    if (pw.length < 4) {
      await sendMessage(chatId, '⚠️ Password minimal 4 karakter. Coba lagi:');
      return;
    }
    const passwordHash = await hashPassword(pw);

    const { error } = await supabase
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
      });

    if (error) {
      await sendMessage(chatId, `❌ Gagal membuat sesi: ${error.message}`);
    } else {
      await sendInlineKeyboard(
        chatId, 
        `✅ <b>Sesi berhasil dibuat!</b>\n📋 ${conv.data.sessionName}`, 
        [[{ text: '🏠 Menu Utama', callback_data: 'nav:main' }]]
      );
    }
    adminConversations.delete(chatId);
    return;
  }

  // System Actions (Add Key, Add Students)
  if (conv.step === 'sys_addkey') {
    const parsed = parseAnswerKey(text);
    if (parsed.length === 0) {
      await sendMessage(chatId, '⚠️ Kunci jawaban tidak valid. Coba lagi dengan format: 1.A 2.B 3.C ...');
      return;
    }
    const { error } = await supabase
      .from('gm_sessions')
      .update({ answer_key: parsed, updated_at: new Date().toISOString() })
      .eq('id', conv.data.sessionId as string);
      
    if (error) {
      await sendMessage(chatId, `❌ Gagal update: ${error.message}`);
    } else {
      await sendInlineKeyboard(chatId, `✅ Berhasil. (${parsed.length} soal)`, [[{ text: '🏠 Menu', callback_data: 'nav:main' }]]);
    }
    adminConversations.delete(chatId);
    return;
  }

  if (conv.step === 'sys_addstu') {
    const students = text.split(/\r?\n/).map(l => l.trim().replace(/^[\d.\-*]+\s*/, '')).filter(l => l.length > 1);
    if (students.length === 0) {
      await sendMessage(chatId, '⚠️ Tidak ada siswa valid. Coba lagi.');
      return;
    }
    const { data: session } = await supabase.from('gm_sessions').select('student_list').eq('id', conv.data.sessionId as string).single();
    const existingList = (session?.student_list as string[]) || [];
    const mergedList = Array.from(new Set([...existingList, ...students]));
    const { error } = await supabase.from('gm_sessions').update({ student_list: mergedList }).eq('id', conv.data.sessionId as string);
    if (error) {
      await sendMessage(chatId, `❌ Gagal: ${error.message}`);
    } else {
      await sendInlineKeyboard(chatId, `✅ ${students.length} siswa ditambahkan! Total: ${mergedList.length}`, [[{ text: '🏠 Menu', callback_data: 'nav:main' }]]);
    }
    adminConversations.delete(chatId);
    return;
  }

  // Set Nilai Input
  if (conv.step === 'input_nilai') {
    const nilai = parseInt(text.trim());
    if (isNaN(nilai) || nilai < 0 || nilai > 100) {
      await sendMessage(chatId, '⚠️ Masukkan angka valid (0-100).');
      return;
    }
    
    // Process score update
    const stuId = conv.data.studentId as string;
    const { error } = await supabase
      .from('gm_students')
      .update({
        final_score: nilai,
        remedial_status: 'NONE',
        remedial_score: 0,
        remedial_location: null,
        remedial_answers: null,
        is_cheated: false,
        cheating_flags: [],
        violation_count: 0,
        is_blocked: false,
        teacher_reviewed: true,
        final_score_locked: nilai
      })
      .eq('id', stuId);

    if (error) {
      await sendMessage(chatId, `❌ Gagal mengubah nilai: ${error.message}`);
    } else {
      await sendInlineKeyboard(chatId, `✅ Nilai berhasil diatur menjadi <b>${nilai}</b> dan status remedial direset.`, [
        [{ text: '🔍 Cek Siswa', callback_data: `nav:stu:${compressUUID(stuId)}:students` }],
        [{ text: '🏠 Menu Utama', callback_data: 'nav:main' }]
      ]);
    }
    adminConversations.delete(chatId);
    return;
  }
}

export async function handleAdminCallback(chatId: number, callbackData: string, messageId?: number, update?: TelegramUpdate) {
  if (!isAdmin(chatId)) return;

  const parts = callbackData.split(':');
  const action = parts[0];

  try {
    // ── Navigation routing ──
    if (action === 'nav') {
      const target = parts[1];
      
      if (target === 'main') {
        adminConversations.delete(chatId);
        await editOrSend(chatId, messageId, MAIN_MENU, MAIN_KEYBOARD);
        return;
      }
      
      if (target === 'cat') {
        adminConversations.delete(chatId);
        const category = parts[2];
        await handleCategorySelection(chatId, messageId, category);
        return;
      }

      if (target === 'sespage') {
        const category = parts[2];
        const page = parseInt(parts[3]) || 1;
        await renderSessionList(chatId, messageId, category, page);
        return;
      }

      if (target === 'ses') {
        const category = parts[2];
        const sessionId = decompressUUID(parts[3]);
        await handleSessionSelection(chatId, messageId, category, sessionId);
        return;
      }

      if (target === 'stupage') {
        const category = parts[2];
        const sessionId = decompressUUID(parts[3]);
        const page = parseInt(parts[4]) || 1;
        await renderStudentList(chatId, messageId, category, sessionId, page);
        return;
      }

      if (target === 'stu') {
        const studentId = decompressUUID(parts[2]);
        const category = parts[3]; // back path
        await renderStudentDetails(chatId, messageId, studentId, category);
        return;
      }
    }

    // ── System Form Actions ──
    if (action === 'sys') {
      const type = parts[1];
      if (type === 'newses') {
        adminConversations.set(chatId, { step: 'session_name', data: {} });
        await editOrSend(chatId, messageId, '📝 <b>Buat Sesi Baru</b>\n\nMasukkan <b>nama sesi</b> (contoh: UTS Matematika 10A):', [[{ text: '❌ Batal', callback_data: 'nav:cat:system' }]]);
        return;
      }
      if (type === 'sel_lvl') {
        const conv = adminConversations.get(chatId);
        if (conv) {
          conv.data.schoolLevel = parts[2];
          conv.step = 'exam_type_wait';
          await editOrSend(chatId, messageId, '📝 Pilih <b>jenis ujian</b>:', [
            [{ text: 'UTS', callback_data: 'sys:sel_exm:UTS' }, { text: 'UAS', callback_data: 'sys:sel_exm:UAS' }],
            [{ text: 'PAT', callback_data: 'sys:sel_exm:PAT' }, { text: 'PAS', callback_data: 'sys:sel_exm:PAS' }]
          ]);
        }
        return;
      }
      if (type === 'sel_exm') {
        const conv = adminConversations.get(chatId);
        if (conv) {
          conv.data.examType = parts[2];
          conv.step = 'academic_year';
          await editOrSend(chatId, messageId, '📅 Masukkan <b>tahun ajaran</b> (contoh: 2025/2026):', [[{ text: '❌ Batal', callback_data: 'nav:cat:system' }]]);
        }
        return;
      }
      
      // Select session for system tasks
      if (type === 'addkey' || type === 'addstu' || type === 'delses') {
        const sessionId = decompressUUID(parts[2]);
        if (type === 'addkey') {
          adminConversations.set(chatId, { step: 'sys_addkey', data: { sessionId } });
          await editOrSend(chatId, messageId, '🔑 Masukkan kunci jawaban:\nFormat: 1.A 2.B...', [[{ text: '❌ Batal', callback_data: 'nav:cat:system' }]]);
        } else if (type === 'addstu') {
          adminConversations.set(chatId, { step: 'sys_addstu', data: { sessionId } });
          await editOrSend(chatId, messageId, '👥 Masukkan nama siswa (satu per baris):', [[{ text: '❌ Batal', callback_data: 'nav:cat:system' }]]);
        } else if (type === 'delses') {
          // Direct delete confirm
          await editOrSend(chatId, messageId, '⚠️ <b>MENGHAPUS SESI?</b>\nTindakan ini permanen.', [
            [{ text: '✅ YA, HAPUS', callback_data: `act:delses_ok:${parts[2]}` }],
            [{ text: '❌ BATAL', callback_data: 'nav:cat:system' }]
          ]);
        }
        return;
      }
    }

    // ── Student / Session Actions ──
    if (action === 'act') {
      const type = parts[1];
      const targetId = decompressUUID(parts[2]); // Student or Session ID

      if (type === 'delses_ok') {
        await supabase.from('gm_sessions').delete().eq('id', targetId);
        await editOrSend(chatId, messageId, '✅ Sesi dihapus.', [[{ text: '🏠 Menu', callback_data: 'nav:main' }]]);
        return;
      }

      if (type === 'setnil') {
        adminConversations.set(chatId, { step: 'input_nilai', data: { studentId: targetId } });
        await editOrSend(chatId, messageId, '✏️ Ketik <b>nilai baru (0-100)</b> untuk siswa ini:', [
          [{ text: '❌ Batal', callback_data: `nav:stu:${compressUUID(targetId)}:students` }]
        ]);
        return;
      }

      if (type === 'setsts') {
        const status = parts[3];
        const studentId = targetId;
        const updateData: any = { remedial_status: status };
        if (status === 'CHEATED') updateData.is_cheated = true;
        if (status === 'BLOCKED') updateData.is_blocked = true;
        if (status === 'NONE') {
          updateData.is_cheated = false;
          updateData.is_blocked = false;
          updateData.violation_count = 0;
        }

        await supabase.from('gm_students').update(updateData).eq('id', studentId);
        await editOrSend(chatId, messageId, `✅ Status diubah menjadi <b>${status}</b>.`, [
          [{ text: '🔍 Cek Siswa', callback_data: `nav:stu:${compressUUID(studentId)}:students` }]
        ]);
        return;
      }

      if (type === 'rstexm') {
        await editOrSend(chatId, messageId, '⚠️ <b>Yakin mereset ujian siswa ini?</b>\nData jawaban dan skor remedial akan hilang.', [
          [{ text: '✅ YA, RESET', callback_data: `act:rstexm_ok:${compressUUID(targetId)}` }],
          [{ text: '❌ BATAL', callback_data: `nav:stu:${compressUUID(targetId)}:students` }]
        ]);
        return;
      }

      if (type === 'rstexm_ok') {
        const studentId = targetId;
        await supabase.from('gm_students').update({
          remedial_status: 'NONE',
          remedial_score: 0,
          remedial_location: null,
          remedial_answers: null,
          is_cheated: false,
          cheating_flags: [],
          violation_count: 0,
          is_blocked: false,
        }).eq('id', studentId);
        
        await supabase.from('gm_remedial_attempts').update({ status: 'CANCELLED' }).eq('student_id', studentId).in('status', ['ACTIVE', 'INITIATED']);
        
        await editOrSend(chatId, messageId, `✅ Ujian berhasil direset.`, [
          [{ text: '🔍 Cek Siswa', callback_data: `nav:stu:${compressUUID(studentId)}:students` }]
        ]);
        return;
      }
    }
  } catch (err: any) {
    console.error(err);
    await sendMessage(chatId, `❌ Error: ${err.message}`);
  }
}

// ── Helpers ──

async function editOrSend(chatId: number, messageId: number | undefined, text: string, keyboard?: any[]) {
  if (messageId) {
    await editMessageText(chatId, messageId, text, keyboard);
  } else {
    await sendInlineKeyboard(chatId, text, keyboard || []);
  }
}

// Category Dispatcher
async function handleCategorySelection(chatId: number, messageId: number | undefined, category: string) {
  if (category === 'system') {
    const sysKeyboard = [
      [{ text: '➕ Buat Sesi Baru', callback_data: 'sys:newses' }],
      [{ text: '🔑 Input Kunci Jawaban', callback_data: 'nav:sespage:sys_addkey:1' }],
      [{ text: '👥 Tambah Daftar Siswa', callback_data: 'nav:sespage:sys_addstu:1' }],
      [{ text: '🗑 Hapus Sesi', callback_data: 'nav:sespage:sys_delses:1' }],
      [{ text: '🏠 Menu Utama', callback_data: 'nav:main' }]
    ];
    await editOrSend(chatId, messageId, '⚙️ <b>Sistem & Pengaturan</b>\nPilih aksi:', sysKeyboard);
    return;
  }

  // Sub-categories routing to session list
  await renderSessionList(chatId, messageId, category, 1);
}

async function renderSessionList(chatId: number, messageId: number | undefined, category: string, page: number) {
  const { data: sessions, error } = await supabase
    .from('gm_sessions')
    .select('id, session_name')
    .order('updated_at', { ascending: false });

  if (error || !sessions || sessions.length === 0) {
    await editOrSend(chatId, messageId, '📭 Belum ada data.', [[{ text: '🔙 Kembali', callback_data: 'nav:main' }]]);
    return;
  }

  const items = sessions.map(s => ({ id: s.id, text: s.session_name }));
  const prefix = category.startsWith('sys_') ? 'sys:' + category.split('_')[1] : `nav:ses:${category}`;
  
  const keyboard = buildPaginationKeyboard(items, page, 5, prefix, `nav:sespage:${category}`, category.startsWith('sys_') ? 'nav:cat:system' : 'nav:main');
  
  const titles: Record<string, string> = {
    'sessions': '📊 <b>Lihat Sesi</b>',
    'students': '👥 <b>Kelola Siswa</b>',
    'violations': '🚨 <b>Pelanggaran</b>',
    'grades': '📈 <b>Statistik Nilai</b>',
    'sys_addkey': '🔑 <b>Pilih Sesi untuk Kunci</b>',
    'sys_addstu': '👥 <b>Pilih Sesi untuk Siswa</b>',
    'sys_delses': '🗑 <b>Pilih Sesi untuk Dihapus</b>',
  };

  await editOrSend(chatId, messageId, `${titles[category] || '📋 Sesi Kelas'}\n\nPilih sesi di bawah:`, keyboard);
}

async function handleSessionSelection(chatId: number, messageId: number | undefined, category: string, sessionId: string) {
  const { data: session } = await supabase.from('gm_sessions').select('session_name').eq('id', sessionId).single();
  if (!session) return;

  if (category === 'sessions') {
    const { count } = await supabase.from('gm_students').select('id', { count: 'exact', head: true }).eq('session_id', sessionId).eq('is_deleted', false);
    await editOrSend(chatId, messageId, `📋 <b>Informasi Sesi</b>\n\nNama: <b>${session.session_name}</b>\nTotal Siswa: ${count || 0}`, [
      [{ text: '👥 Kelola Siswa di Sesi Ini', callback_data: `nav:stupage:students:${compressUUID(sessionId)}:1` }],
      [{ text: '📈 Lihat Statistik', callback_data: `nav:ses:grades:${compressUUID(sessionId)}` }],
      [{ text: '🔙 Kembali', callback_data: 'nav:sespage:sessions:1' }]
    ]);
    return;
  }

  if (category === 'grades') {
    // Generate Dashboard
    const { data: students } = await supabase.from('gm_students').select('final_score').eq('session_id', sessionId).eq('is_deleted', false);
    const kkm = 70;
    const scores = students?.map(s => s.final_score || 0) || [];
    const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    const tuntas = scores.filter(s => s >= kkm).length;
    const msg = `📈 <b>Dashboard Sesi</b>\n\nSesi: ${session.session_name}\n\n👥 Total Siswa: ${scores.length}\n✅ Tuntas (>=${kkm}): ${tuntas}\n❌ Belum: ${scores.length - tuntas}\n📊 Rata-rata: ${avg}`;
    await editOrSend(chatId, messageId, msg, [[{ text: '🔙 Kembali', callback_data: 'nav:sespage:grades:1' }]]);
    return;
  }

  // Routing to student lists (students, violations)
  await renderStudentList(chatId, messageId, category, sessionId, 1);
}

async function renderStudentList(chatId: number, messageId: number | undefined, category: string, sessionId: string, page: number) {
  let query = supabase.from('gm_students').select('id, name, final_score, remedial_status, violation_count, is_cheated').eq('session_id', sessionId).eq('is_deleted', false).order('name');
  
  if (category === 'violations') {
    query = query.or('is_cheated.eq.true,violation_count.gt.0,remedial_status.eq.CHEATED');
  }

  const { data: students } = await query;

  if (!students || students.length === 0) {
    const msg = category === 'violations' ? '✅ Aman. Tidak ada pelanggaran.' : '📭 Belum ada siswa di sesi ini.';
    await editOrSend(chatId, messageId, msg, [[{ text: '🔙 Sesi Lain', callback_data: `nav:sespage:${category}:1` }]]);
    return;
  }

  const items = students.map(s => {
    let icon = '';
    if (s.is_cheated || s.remedial_status === 'CHEATED') icon = '🚨 ';
    else if (s.final_score && s.final_score >= 70) icon = '✅ ';
    else icon = '❌ ';
    return { id: s.id, text: `${icon}${s.name}` };
  });

  const keyboard = buildPaginationKeyboard(items, page, 8, `nav:stu`, `nav:stupage:${category}:${compressUUID(sessionId)}`, `nav:sespage:${category}:1`);
  
  // Backpath injected into nav:stu
  for(let row of keyboard) {
    for(let btn of row) {
      if(btn.callback_data.startsWith('nav:stu:')) {
         btn.callback_data += `:${category}`; 
      }
    }
  }

  await editOrSend(chatId, messageId, `👥 <b>Pilih Siswa</b>\n${category === 'violations'? '(Hanya Pelanggar)': ''}`, keyboard);
}

async function renderStudentDetails(chatId: number, messageId: number | undefined, studentId: string, backCategory: string) {
  const { data: s } = await supabase.from('gm_students').select('id, session_id, name, final_score, remedial_status, violation_count, is_cheated, cheating_flags, is_blocked, remedial_location').eq('id', studentId).single();
  if (!s) return;

  const msg = `👤 <b>${s.name}</b>\n\n` +
    `📈 Nilai Final: <b>${s.final_score}</b>\n` +
    `📌 Status: <b>${s.remedial_status || 'NONE'}</b>\n` +
    `🚨 Curang: ${s.is_cheated ? 'YA' : 'TIDAK'} (${s.violation_count}⚠️)\n` +
    `🚫 Diblokir: ${s.is_blocked ? 'YA' : 'TIDAK'}\n` +
    `🗺 Lokasi: ${s.remedial_location || '-'}\n` +
    `🏷 Flags: ${(s.cheating_flags || []).join() || '-'}`;

  const cmpId = compressUUID(studentId);
  const sesId = compressUUID(s.session_id);

  const keyboard = [
    [{ text: '✏️ Ubah Nilai', callback_data: `act:setnil:${cmpId}` }, { text: '🔄 Reset Ujian', callback_data: `act:rstexm:${cmpId}` }],
    [{ text: '✅ Set Lulus', callback_data: `act:setsts:${cmpId}:COMPLETED` }, { text: '🚨 Set Curang', callback_data: `act:setsts:${cmpId}:CHEATED` }],
    [{ text: '🚫 Blokir', callback_data: `act:setsts:${cmpId}:BLOCKED` }, { text: '🔄 Bersihkan', callback_data: `act:setsts:${cmpId}:NONE` }],
    [{ text: '🔙 List Siswa', callback_data: `nav:stupage:${backCategory}:${sesId}:1` }]
  ];

  await editOrSend(chatId, messageId, msg, keyboard);
}
