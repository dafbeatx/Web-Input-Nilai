import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { InputManager } from '../input/InputManager';
import { InteractiveTrigger, CHARACTER_PROFILES, DeviceMode } from '@/lib/game/types';
import { detectDeviceMode } from '@/lib/game/deviceDetector';

export type ClassroomId = 'VII' | 'VIII' | 'IX';

export interface ClassroomLessonKeyPoint {
  title: string;
  desc: string;
}

export interface ClassroomLessonData {
  lessonTitle: string;
  subject: string;
  summary: string;
  keyPoints: ClassroomLessonKeyPoint[];
  quizSubject: string;
}

export interface ClassroomConfig {
  id: ClassroomId;
  title: string;
  gradeLabel: string;
  teacherTitle: string;
  teacherName: string;
  teacherGreeting: string;
  desc: string;
  exteriorDoor: { x: number; y: number };
  lesson: ClassroomLessonData;
}

export const CLASSROOM_CONFIGS: Record<ClassroomId, ClassroomConfig> = {
  VII: {
    id: 'VII',
    title: 'Ruang Kelas 7 (Fase D)',
    gradeLabel: 'Kelas VII',
    teacherTitle: 'Wali Kelas VII',
    teacherName: 'Bu Ratna Dewi, S.Pd.',
    teacherGreeting: "Assalamu'alaikum dan salam semangat! Selamat datang di Ruang Kelas 7 SMP Terpadu Al-Ittihadiyah. Di jenjang Fase D ini, biasakan aktif bertanya, teliti dalam berhitung, dan selalu rawat fasilitas kelas. Silakan pelajari rangkuman materi di papan tulis atau uji pemahamanmu lewat kuis di meja belajar untuk mendapatkan tambahan uang saku!",
    desc: 'Ruang kelas pembelajaran peserta didik baru tingkat 7 dengan modul pengenalan lingkungan dan adaptasi kurikulum merdeka.',
    exteriorDoor: { x: 268, y: 289 },
    lesson: {
      lessonTitle: 'Konsep Dasar Matematika & Sains Alam (Fase D)',
      subject: 'Matematika & IPA',
      summary: 'Fondasi penting berhitung aljabar, karakteristik geometri bangun datar, dan dasar metode ilmiah penyelidikan alam.',
      quizSubject: 'Matematika',
      keyPoints: [
        {
          title: 'Urutan Operasi Campuran (KABATAKU / PEMDAS)',
          desc: 'Dahulukan operasi di dalam tanda kurung, lanjutkan perkalian dan pembagian dari kiri ke kanan, baru kemudian penjumlahan dan pengurangan.',
        },
        {
          title: 'Karakteristik Bangun Datar Segiempat & Segitiga',
          desc: 'Persegi: Keliling = 4s, Luas = s². Persegi Panjang: Keliling = 2(p+l), Luas = p x l. Segitiga: Luas = 1/2 x alas x tinggi, dengan total sudut selalu 180°.',
        },
        {
          title: 'Organisasi Kehidupan & Sel',
          desc: 'Sel adalah unit struktural dan fungsional terkecil makhluk hidup. Kumpulan sel sejenis membentuk Jaringan → Organ → Sistem Organ → Organisme utuh.',
        },
        {
          title: '7 Besaran Pokok Satuan Internasional (SI)',
          desc: 'Panjang (meter), Massa (kilogram), Waktu (sekon), Suhu (Kelvin), Kuat Arus (Ampere), Intensitas Cahaya (kandela), dan Jumlah Zat (mol).',
        },
      ],
    },
  },
  VIII: {
    id: 'VIII',
    title: 'Ruang Kelas 8',
    gradeLabel: 'Kelas VIII',
    teacherTitle: 'Wali Kelas VIII',
    teacherName: 'Pak Hendra Gunawan, M.Pd.',
    teacherGreeting: 'Selamat datang di Ruang Kelas 8! Di tahun kedua ini, kalian dituntut untuk lebih kritis dalam menganalisis informasi faktual, memperkaya literasi, dan mengasah logika berpikir komputasional. Coba periksa materi di papan tulis dan uji kemampuan analisismu lewat kuis di meja belajar!',
    desc: 'Ruang kelas 8 fokus pada penguatan materi inti, proyek sains interaktif, dan kolaborasi kelompok P5.',
    exteriorDoor: { x: 1308, y: 289 },
    lesson: {
      lessonTitle: 'Literasi Teks Faktual & Berpikir Komputasional',
      subject: 'Bahasa Indonesia & Informatika',
      summary: 'Menganalisis struktur teks laporan hasil observasi, membedakan fakta dengan opini, serta menerapkan 4 pilar problem solving komputasional.',
      quizSubject: 'Bahasa Indonesia',
      keyPoints: [
        {
          title: 'Struktur Teks Laporan Hasil Observasi (LHO)',
          desc: 'Terdiri atas: (1) Pernyataan Umum / Klasifikasi sebagai pengantar, (2) Deskripsi Bagian yang merinci objek secara objektif, dan (3) Deskripsi Manfaat.',
        },
        {
          title: 'Paragraf Deduktif vs Induktif',
          desc: 'Paragraf Deduktif menempatkan gagasan utama di awal kalimat lalu dijabarkan rinciannya. Paragraf Induktif menyajikan bukti khusus terlebih dahulu dan kesimpulan berada di akhir.',
        },
        {
          title: '4 Pilar Berpikir Komputasional',
          desc: 'Dekomposisi (memecah masalah kompleks), Pengenalan Pola (mencari kesamaan data), Abstraksi (fokus inti dan abaikan detail tidak penting), dan Perancangan Algoritma.',
        },
        {
          title: 'Fakta vs Opini Objektif',
          desc: 'Fakta adalah peristiwa nyata yang kebenarannya terverifikasi dengan data atau angka empiris. Opini merupakan gagasan, prasangka, atau penilaian subjektif penulis.',
        },
      ],
    },
  },
  IX: {
    id: 'IX',
    title: 'Ruang Kelas 9 (Fase Kelulusan)',
    gradeLabel: 'Kelas IX',
    teacherTitle: 'Wali Kelas IX',
    teacherName: 'Ustadz Rahmat Hidayat, S.Ag.',
    teacherGreeting: "Assalamu'alaikum warahmatullah. Selamat datang di Ruang Kelas 9. Kalian kini melangkah di gerbang kelulusan. Mantapkan niat berprestasi, perkuat ibadah serta akhlak mulia, dan persiapkan pemahaman materi secara matang menyongsong asesmen sumatif akhir!",
    desc: 'Ruang kelas tingkat akhir pendalaman materi asesmen sumatif akhir, bimbingan minat bakat, dan persiapan kelulusan.',
    exteriorDoor: { x: 259, y: 509 },
    lesson: {
      lessonTitle: 'Pendalaman PAI, Moderasi Beragama & Asesmen Sumatif',
      subject: 'Pendidikan Agama Islam',
      summary: 'Penguatan kaidah tajwid Al-Qur’an, pemahaman takdir dan ikhtiar, serta kesiapan mental menghadapi asesmen kelulusan.',
      quizSubject: 'Pendidikan Agama Islam',
      keyPoints: [
        {
          title: 'Hukum Tajwid Nun Sukun & Tanwin',
          desc: 'Idzhar Halqi (dibaca jelas pada 6 huruf halq), Idgham Bighunnah (melebur dengan dengung pada ya, nun, mim, wau), Idgham Bilaghunnah (lebur tanpa dengung pada lam, ra), Iqlab, dan Ikhfa Haqiqi (samar).',
        },
        {
          title: 'Konsep Takdir: Qada, Qadar, dan Ikhtiar',
          desc: 'Meyakini ketetapan Allah SWT diiringi kewajiban berusaha optimal (ikhtiar), memanjatkan doa, dan berserah diri secara tulus (tawakal).',
        },
        {
          title: 'Prinsip Wasathiyah (Moderasi Beragama)',
          desc: 'Menegakkan Tasamuh (toleransi saling menghargai perbedaan), Tawazun (keseimbangan lahir batin), dan I’tidal (lurus berkeadilan) dalam pergaulan bermasyarakat.',
        },
        {
          title: 'Strategi Mengerjakan Asesmen HOTS',
          desc: 'Cermati konteks stimulus soal, eliminasi opsi yang jelas bertentangan dengan prinsip ilmiah/syar’i, dan utamakan ketelitian membaca kalimat tanya.',
        },
      ],
    },
  },
};

export interface ClassroomSceneInitData {
  classroomId?: ClassroomId;
  returnPos?: { x: number; y: number };
  characterKey?: string;
  characterName?: string;
  characterRole?: string;
}

export class ClassroomScene extends Phaser.Scene {
  public player!: Player;
  public inputManager!: InputManager;
  private currentClassroomId: ClassroomId = 'VII';
  private returnPos: { x: number; y: number } = { x: 268, y: 289 };
  private savedCharKey: string = 'char_farhan';
  private savedCharName: string = 'Farhan Sopian Sahid';
  private savedCharRole: string = 'Kepala Sekolah';

  private blockers: Phaser.GameObjects.Rectangle[] = [];
  private exitMarkerContainer?: Phaser.GameObjects.Container;
  private stationMarkers: Phaser.GameObjects.Container[] = [];
  private isNearExit: boolean = false;
  private isExiting: boolean = false;
  private canExit: boolean = false;
  private numericKeys: Phaser.Input.Keyboard.Key[] = [];
  private currentDeviceMode: DeviceMode = 'desktop';

  private currentNearTrigger: InteractiveTrigger | null = null;
  private blackboardTrigger!: InteractiveTrigger;
  private quizTrigger!: InteractiveTrigger;
  private teacherTrigger!: InteractiveTrigger;
  private exitTrigger!: InteractiveTrigger;

  // Bound handler references for clean event removal
  private boundHandlers: {
    joystick?: (data: { x: number; y: number }) => void;
    sprint?: (isSprinting: boolean) => void;
    interact?: () => void;
    changeChar?: (data: { key: string; name: string; role: string }) => void;
    deviceMode?: (mode: DeviceMode) => void;
    resize?: () => void;
  } = {};

  constructor() {
    super({ key: 'ClassroomScene' });
  }

  init(data?: ClassroomSceneInitData): void {
    if (data?.classroomId && CLASSROOM_CONFIGS[data.classroomId]) {
      this.currentClassroomId = data.classroomId;
    } else {
      this.currentClassroomId = 'VII';
    }

    const config = CLASSROOM_CONFIGS[this.currentClassroomId];
    this.returnPos = data?.returnPos ?? config.exteriorDoor;

    if (data?.characterKey) this.savedCharKey = data.characterKey;
    if (data?.characterName) this.savedCharName = data.characterName;
    if (data?.characterRole) this.savedCharRole = data.characterRole;

    this.isExiting = false;
    this.isNearExit = false;
    this.canExit = false;
    this.currentNearTrigger = null;
  }

  create(): void {
    // Exact dimensions of classroom_interior_background.png
    const roomWidth = 1672;
    const roomHeight = 941;
    this.physics.world.setBounds(0, 0, roomWidth, roomHeight);

    const config = CLASSROOM_CONFIGS[this.currentClassroomId];

    // Setup interactive triggers
    this.blackboardTrigger = {
      id: `trigger-blackboard-${config.id}`,
      name: `Papan Tulis Interaktif (${config.gradeLabel})`,
      type: 'lesson',
      promptText: `Tekan [E] atau Ketuk untuk Baca Materi Pelajaran (${config.gradeLabel})`,
      data: {
        classroomId: config.id,
        gradeLabel: config.gradeLabel,
        title: config.title,
        lesson: config.lesson,
        subject: config.lesson.subject,
      },
    };

    this.quizTrigger = {
      id: `trigger-quiz-${config.id}`,
      name: `Meja Belajar Siswa (${config.gradeLabel})`,
      type: 'quiz',
      promptText: `Tekan [E] atau Ketuk untuk Mulai Kuis Interaktif (+Hadiah Koin)`,
      data: {
        classroomId: config.id,
        gradeLabel: config.gradeLabel,
        subject: config.lesson.quizSubject,
        rewardPerQuestion: 2000,
      },
    };

    this.teacherTrigger = {
      id: `trigger-teacher-${config.id}`,
      name: `${config.teacherTitle} (${config.teacherName})`,
      type: 'npc',
      promptText: `Tekan [E] atau Ketuk untuk Bicara dengan ${config.teacherTitle}`,
      data: {
        role: config.teacherTitle,
        title: `${config.teacherTitle} - ${config.teacherName}`,
        desc: `Konsultasi & bimbingan belajar bersama ${config.teacherTitle}.`,
        quote: config.teacherGreeting,
      },
    };

    this.exitTrigger = {
      id: 'trigger-exit-classroom',
      name: 'Pintu Keluar',
      type: 'building_entrance',
      promptText: 'Tekan [E] atau Ketuk untuk Keluar Kelas',
    };

    // 1. Single Integrated Background (Walls, Floor, Windows, Blackboard, Desks, Trim)
    const bg = this.add.image(roomWidth / 2, roomHeight / 2, 'classroom_bg');
    bg.setOrigin(0.5, 0.5);
    bg.setDepth(0);

    // 2. Invisible Physics Collision Footprints
    this.blockers = [];

    // Top wall & blackboard area (y: 0 to 340)
    this.createStaticBlocker(836, 170, 1672, 340);

    // Left wall with decorative windows (x: 0 to 130)
    this.createStaticBlocker(65, 470, 130, 941);

    // Right wall with windows (x: 1540 to 1672)
    this.createStaticBlocker(1606, 470, 132, 941);

    // Bottom wall left segment (leaving exit doorway at x: 720..950 open)
    this.createStaticBlocker(425, 905, 590, 72);

    // Bottom wall right segment
    this.createStaticBlocker(1245, 905, 590, 72);

    // Teacher Desk at top left
    this.createStaticBlocker(540, 390, 190, 65);

    // Bookshelf & Storage at top right
    this.createStaticBlocker(1330, 380, 130, 75);

    // Student Desks (3 Columns x 3 Rows with comfortable walking aisles)
    const deskColumns = [490, 830, 1170];
    const deskRows = [495, 600, 705];

    deskRows.forEach(rowY => {
      deskColumns.forEach(colX => {
        // Invisible footprint blocker for desk and chairs
        this.createStaticBlocker(colX, rowY, 190, 48);
      });
    });

    // 3. Exit Door Interaction Marker Overlay (Separated from background)
    if (this.textures.exists('door_marker')) {
      this.exitMarkerContainer = this.add.container(836, 830);
      this.exitMarkerContainer.setDepth(20);
      this.exitMarkerContainer.setVisible(false);

      const markerSprite = this.add.image(0, 0, 'door_marker');
      markerSprite.setOrigin(0.5, 0.5);
      markerSprite.setScale(0.7);

      const markerLabel = this.add.text(0, -6, 'Keluar Kelas', {
        fontFamily: 'Outfit, Inter, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        stroke: '#0f172a',
        strokeThickness: 3,
        align: 'center',
      }).setOrigin(0.5, 0.5);

      this.exitMarkerContainer.add([markerSprite, markerLabel]);

      // Subtle breathing pulse for exit marker
      this.tweens.add({
        targets: this.exitMarkerContainer,
        y: 824,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 3b. Interactive Station Floating Indicators (Smart Board, Teacher Desk, Student Desks)
    this.stationMarkers = [];
    this.stationMarkers.push(
      this.createClassroomMarker(836, 310, '📺 Papan Tulis (Materi) [E]', 0x06b6d4)
    );
    this.stationMarkers.push(
      this.createClassroomMarker(540, 330, `👨‍🏫 ${config.teacherTitle} [E]`, 0x6366f1)
    );
    this.stationMarkers.push(
      this.createClassroomMarker(830, 520, '📝 Meja Belajar (Kuis & Koin) [E]', 0x10b981)
    );

    // 4. Spawn Player inside the classroom (facing UP toward blackboard)
    this.player = new Player(this, 836, 780, this.savedCharName, this.savedCharKey);
    this.player.setRoleTitle(this.savedCharRole);
    this.player.setFacingDirection('up');
    this.player.setDepth(780);

    // Add Collisions between Player and All Static Room Blockers
    for (const blocker of this.blockers) {
      this.physics.add.collider(this.player, blocker);
    }

    // 5. Input Controller Setup & Keyboard Reset
    this.inputManager = new InputManager(this);
    this.inputManager.reset();

    if (this.input.keyboard) {
      this.input.keyboard.resetKeys();
      this.input.keyboard.enabled = true;
    }

    // Grace period before player can interact with the exit doorway to prevent input carryover
    this.canExit = false;
    this.time.delayedCall(600, () => {
      this.canExit = true;
    });

    // 6. Camera & Viewport Setup with Adaptive Responsive Follow
    this.cameras.main.setBounds(0, 0, roomWidth, roomHeight);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.fadeIn(250, 0, 0, 0);

    // Apply adaptive viewport scaling for PID / Desktop / Mobile
    this.applyAdaptiveViewport();

    // Listen for resize and device mode switch events
    this.boundHandlers.resize = () => this.applyAdaptiveViewport();
    this.scale.on('resize', this.boundHandlers.resize);

    this.boundHandlers.deviceMode = (mode: DeviceMode) => {
      this.applyAdaptiveViewport(mode);
    };
    this.game.events.on('device:mode-change', this.boundHandlers.deviceMode);

    // 7. Floating Room Indicator Badge
    this.createRoomHeaderUI(config);

    // 8. React Event Bridge Integration
    this.setupReactEventBridge();

    // 9. Numeric hotkeys 1-8 for character switching
    this.setupKeyboardShortcuts();

    // 10. Notify React Layer
    this.game.events.emit('scene:ready', { zoneName: config.title });
    this.game.events.emit('town:zone-change', config.title);
  }

  /**
   * Adaptive viewport & character scaling for PID (Smart Board), Desktop, and Mobile
   */
  private applyAdaptiveViewport(mode?: DeviceMode): void {
    if (mode) {
      this.currentDeviceMode = mode;
    } else {
      this.currentDeviceMode = detectDeviceMode();
    }

    let targetZoom = 1.45;
    let charScale = 1.25;

    switch (this.currentDeviceMode) {
      case 'interactive_board':
        // PID / Smart Board (65-86" screen): Balanced overview, visible across classroom
        targetZoom = 1.28;
        charScale = 1.35;
        break;
      case 'android':
        // Mobile / Touchscreen: Closer zoom so thumbs don't obstruct character
        targetZoom = 1.75;
        charScale = 1.35;
        break;
      case 'desktop':
      default:
        // Desktop / Laptop: Crisp RPG focal zoom
        targetZoom = 1.45;
        charScale = 1.25;
        break;
    }

    if (this.player) {
      this.player.setScaleMultiplier(charScale);
    }

    if (this.cameras?.main) {
      this.cameras.main.setZoom(targetZoom);
    }
  }

  private createStaticBlocker(x: number, y: number, width: number, height: number): void {
    const blocker = this.add.rectangle(x, y, width, height, 0xff0044, 0);
    blocker.setOrigin(0.5, 0.5);
    this.physics.add.existing(blocker, true);
    this.blockers.push(blocker);
  }

  private createRoomHeaderUI(config: ClassroomConfig): void {
    const banner = this.add.container(836, 32);
    banner.setDepth(999);
    banner.setScrollFactor(0); // Pin to top of screen

    const bgRect = this.add.graphics();
    bgRect.fillStyle(0x0f172a, 0.88);
    bgRect.lineStyle(1.5, 0x38bdf8, 0.8);
    bgRect.fillRoundedRect(-150, -15, 300, 30, 10);
    bgRect.strokeRoundedRect(-150, -15, 300, 30, 10);

    const label = this.add.text(0, 0, `🏫 ${config.title}`, {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      stroke: '#0284c7',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0.5);

    banner.add([bgRect, label]);
  }

  private createClassroomMarker(
    x: number,
    y: number,
    label: string,
    colorHex: number = 0x38bdf8
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(25);

    const textWidth = Math.max(140, label.length * 7.4 + 24);
    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.92);
    bg.lineStyle(1.5, colorHex, 0.95);
    bg.fillRoundedRect(-textWidth / 2, -14, textWidth, 28, 8);
    bg.strokeRoundedRect(-textWidth / 2, -14, textWidth, 28, 8);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '11px',
      color: '#ffffff',
      align: 'center',
      stroke: '#0f172a',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    container.add([bg, text]);

    this.tweens.add({
      targets: container,
      y: y - 5,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return container;
  }

  private setupReactEventBridge(): void {
    // Virtual joystick from touch devices
    this.boundHandlers.joystick = (data: { x: number; y: number }) => {
      this.inputManager?.setVirtualMovement(data.x, data.y);
    };
    this.game.events.on('input:joystick', this.boundHandlers.joystick);

    // Sprint toggle
    this.boundHandlers.sprint = (isSprinting: boolean) => {
      this.inputManager?.setVirtualSprint(isSprinting);
    };
    this.game.events.on('input:sprint', this.boundHandlers.sprint);

    // Interact button (pressing E or tapping virtual button)
    this.boundHandlers.interact = () => {
      this.inputManager?.triggerVirtualInteract();
    };
    this.game.events.on('input:interact', this.boundHandlers.interact);

    // Character switch from HUD modal
    this.boundHandlers.changeChar = (data: { key: string; name: string; role: string }) => {
      this.savedCharKey = data.key;
      this.savedCharName = data.name;
      this.savedCharRole = data.role;
      this.player?.switchCharacter(data.key, data.name, data.role);
    };
    this.game.events.on('player:change-character', this.boundHandlers.changeChar);

    // Handle user pressing E or tapping action button
    this.inputManager.onInteract(() => {
      if (!this.currentNearTrigger) return;

      if (this.currentNearTrigger.id === 'trigger-exit-classroom') {
        if (!this.isExiting && this.canExit) {
          this.exitClassroom();
        }
        return;
      }

      // WorkAdventure-style: open interactive modal in React layer
      this.game.events.emit('town:open-modal', this.currentNearTrigger);
    });
  }

  private setupKeyboardShortcuts(): void {
    if (!this.input.keyboard) return;

    const allNumCodes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
    ];

    const numCodes = allNumCodes.slice(0, CHARACTER_PROFILES.length);
    this.numericKeys = numCodes.map(code => this.input.keyboard!.addKey(code));
  }

  private exitClassroom(): void {
    if (this.isExiting || !this.canExit || !this.cameras?.main) return;
    this.isExiting = true;

    // Clear prompt immediately to prevent double firing
    this.game.events.emit('town:interaction-prompt', null);

    // Fade out camera and return cleanly to exterior campus scene
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SchoolMapScene', {
        returnPos: this.returnPos,
        characterKey: this.player?.characterKey,
        characterName: this.player?.characterName,
        characterRole: this.savedCharRole,
      });
    });
  }

  update(): void {
    if (!this.player || !this.inputManager || this.isExiting) return;

    // 1. Numeric keys for character switcher
    this.numericKeys.forEach((key, idx) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        const profile = CHARACTER_PROFILES[idx];
        if (profile && profile.key !== this.player.characterKey) {
          this.savedCharKey = profile.key;
          this.savedCharName = profile.name;
          this.savedCharRole = profile.role;
          this.player.switchCharacter(profile.key, profile.name, profile.role);
          this.game.events.emit('scene:character-selected', profile);
        }
      }
    });

    // 2. Player movement update
    const movementVector = this.inputManager.getMovementVector();
    this.player.updateMovement(movementVector);

    // 3. 2.5D Depth Sorting: Higher Y renders in front
    this.player.setDepth(this.player.y);

    // 4. Proximity check across classroom interactive stations
    let nearTrigger: InteractiveTrigger | null = null;

    // A. Exit Doorway (centered at x = 836, y >= 820)
    if (Math.abs(this.player.x - 836) < 130 && this.player.y >= 820) {
      nearTrigger = this.exitTrigger;
    }
    // B. Smart Board / Papan Tulis (center x = 836, y between 330 and 420)
    else if (Math.abs(this.player.x - 836) < 220 && this.player.y >= 330 && this.player.y <= 420) {
      nearTrigger = this.blackboardTrigger;
    }
    // C. Teacher Desk (x between 420 and 640, y between 380 and 470)
    else if (this.player.x >= 420 && this.player.x <= 640 && this.player.y >= 380 && this.player.y <= 470) {
      nearTrigger = this.teacherTrigger;
    }
    // D. Student Desks Quiz Area (x between 580 and 1080, y between 480 and 760)
    else if (this.player.x >= 580 && this.player.x <= 1080 && this.player.y >= 480 && this.player.y <= 760) {
      nearTrigger = this.quizTrigger;
    }

    if (nearTrigger?.id !== this.currentNearTrigger?.id) {
      this.currentNearTrigger = nearTrigger;
      this.isNearExit = nearTrigger?.id === 'trigger-exit-classroom';
      this.exitMarkerContainer?.setVisible(this.isNearExit);
      this.game.events.emit('town:interaction-prompt', nearTrigger);
    }
  }

  shutdown(): void {
    this.inputManager?.destroy();
    this.stationMarkers.forEach(m => m.destroy());
    this.stationMarkers = [];
    if (this.boundHandlers.resize) this.scale.off('resize', this.boundHandlers.resize);
    if (this.boundHandlers.deviceMode) this.game.events.off('device:mode-change', this.boundHandlers.deviceMode);
    if (this.boundHandlers.joystick) this.game.events.off('input:joystick', this.boundHandlers.joystick);
    if (this.boundHandlers.sprint) this.game.events.off('input:sprint', this.boundHandlers.sprint);
    if (this.boundHandlers.interact) this.game.events.off('input:interact', this.boundHandlers.interact);
    if (this.boundHandlers.changeChar) this.game.events.off('player:change-character', this.boundHandlers.changeChar);
    this.boundHandlers = {};
    this.game.events.emit('town:interaction-prompt', null);
  }
}
