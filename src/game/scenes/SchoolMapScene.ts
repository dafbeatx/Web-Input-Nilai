import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { InputManager } from '../input/InputManager';
import { InteractiveTrigger, CHARACTER_PROFILES } from '@/lib/game/types';
import {
  TEACHER_CONFIGS,
  getActiveStudentNPCConfigs,
  getCurrentShiftIndex,
} from '@/lib/game/roster';

interface InteractionObjectConfig {
  id: string;
  name: string;
  type: 'building_entrance' | 'shop' | 'npc' | 'interactive_board' | 'seating';
  promptText: string;
  data: Record<string, unknown>;
}

const INTERACTION_CONFIGS: Record<string, InteractionObjectConfig> = {
  // Row 1
  kelas_7: {
    id: 'trigger-kelas-7',
    name: 'Ruang Kelas 7 (Fase D)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk Masuk Kelas VII',
    data: {
      title: 'Ruang Kelas 7 SMP',
      desc: 'Ruang kelas pembelajaran peserta didik baru tingkat 7 dengan modul pengenalan lingkungan sekolah dan adaptasi kurikulum.',
      isClassroom: true,
      classroomId: 'VII',
    },
  },
  gedung_utama: {
    id: 'trigger-gedung-utama',
    name: 'Kantor & Gedung Pusat Administrasi (TU & Kepala Sekolah)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Kantor',
    data: {
      title: 'Gedung Pusat Administrasi & Kepemimpinan',
      desc: 'Pusat layanan tata usaha (TU), ruang Kepala Sekolah, kesiswaan, dan legalisir dokumen resmi sekolah.',
    },
  },
  kelas_8: {
    id: 'trigger-kelas-8',
    name: 'Ruang Kelas 8',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk Masuk Kelas VIII',
    data: {
      title: 'Ruang Kelas 8 SMP',
      desc: 'Ruang kelas 8 fokus pada penguatan materi inti, proyek sains interaktif, dan kolaborasi kelompok P5.',
      isClassroom: true,
      classroomId: 'VIII',
    },
  },

  // Row 2
  kelas_9: {
    id: 'trigger-kelas-9',
    name: 'Ruang Kelas 9 (Fase Kelulusan)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk Masuk Kelas IX',
    data: {
      title: 'Ruang Kelas 9 SMP',
      desc: 'Ruang kelas tingkat akhir pendalaman materi ujian kelulusan, asesmen sumatif akhir, dan bimbingan karir jenjang SMA/SMK.',
      isClassroom: true,
      classroomId: 'IX',
    },
  },
  tiang_bendera: {
    id: 'trigger-tiang-bendera',
    name: 'Tiang Bendera Merah Putih',
    type: 'interactive_board',
    promptText: 'Tekan [E] atau Ketuk untuk hormat Bendera Merah Putih',
    data: {
      title: 'Monumen Bendera Merah Putih',
      desc: 'Lambang persatuan bangsa dan pusat upacara bendera hari Senin di SMP Terpadu Al-Ittihadiyah.',
    },
  },
  lab_informatika: {
    id: 'trigger-lab',
    name: 'Laboratorium Informatika & Komputer',
    type: 'interactive_board',
    promptText: 'Tekan [E] atau Ketuk untuk akses Lab Komputer',
    data: {
      title: 'Laboratorium Komputer & Informatika',
      desc: 'Fasilitas pembelajaran komputasi dengan 36 unit komputer high-speed, fiber optic LAN, dan server simulasi ANBK.',
      features: [
        'Praktikum Pemrograman Algoritma & Web',
        'Simulasi Asesmen Nasional Berbasis Komputer (ANBK)',
        'Eksplorasi AI & Pembelajaran Digital Interaktif PID',
      ],
    },
  },

  // Row 3
  ruang_guru: {
    id: 'trigger-ruang-guru',
    name: 'Ruang Guru & Bimbingan Konseling (BK)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Ruang Guru',
    data: {
      title: 'Ruang Kerja Guru & Staf SMP Terpadu Al-Ittihadiyah',
      desc: 'Fasilitas kerja dewan guru terpadu dengan area kerja guru pria, guru wanita, perangkat arsip, dan ruang bimbingan siswa.',
    },
  },
  ponpes_as_salaam: {
    id: 'trigger-ponpes',
    name: 'Pondok Pesantren As Salaam',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk berkunjung ke Pondok Pesantren',
    data: {
      title: 'Pondok Pesantren As Salaam',
      desc: 'Pusat pendidikan kepesantrenan, asrama santri, kajian kitab kuning, tahfiz Al-Quran, dan pembinaan karakter akhlakul karimah.',
    },
  },
  perpustakaan: {
    id: 'trigger-perpustakaan',
    name: 'Perpustakaan Literasi & E-Library',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk membaca di Perpustakaan',
    data: {
      title: 'Perpustakaan Sekolah & E-Library',
      desc: 'Menyediakan ribuan buku pelajaran Kurikulum Merdeka, karya sastra, ensiklopedia, dan ruang baca hening ber-AC.',
    },
  },

  // Row 4
  mushola: {
    id: 'trigger-mushola',
    name: 'Musala Sekolah Al-Ittihadiyah',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Musala',
    data: {
      title: 'Musala Sekolah Al-Ittihadiyah',
      desc: 'Pusat ibadah salat zuhur berjamaah, kegiatan rohani Islam, serta pembinaan adab santun warga sekolah.',
    },
  },
  kantin: {
    id: 'trigger-kantin',
    name: 'Kantin Sekolah Kejujuran',
    type: 'shop',
    promptText: 'Tekan [E] atau Ketuk untuk jajan di Kantin Sekolah',
    data: {
      shopName: 'Kantin Sekolah Kejujuran Al-Ittihadiyah',
      items: [
        { name: 'Teh Botol Melati Dingin', price: 4000, desc: 'Penyegar dahaga selepas olahraga (+15 Energi)' },
        { name: 'Bakwan Sayur Renyah', price: 2000, desc: 'Gorengan gurih hangat khas kantin (+10 Energi)' },
        { name: 'Nasi Uduk Komplit', price: 10000, desc: 'Nasi gurih harum dengan telur dan sambal (+45 Energi)' },
        { name: 'Susu UHT Cokelat', price: 6000, desc: 'Nutrisi kalsium sehat untuk konsentrasi belajar (+25 Energi)' },
        { name: 'Air Mineral Botol 600ml', price: 3000, desc: 'Hidrasi bersih sehat bebas dehidrasi (+10 Energi)' },
      ],
    },
  },
  lapangan: {
    id: 'trigger-lapangan',
    name: 'Lapangan Olahraga & Futsal',
    type: 'interactive_board',
    promptText: 'Tekan [E] atau Ketuk untuk olahraga di Lapangan',
    data: {
      title: 'Lapangan Olahraga Terpadu',
      desc: 'Fasilitas lapangan multifungsi untuk senam pagi, pertandingan futsal, bola basket, dan senam kebugaran jasmani.',
    },
  },
  uks: {
    id: 'trigger-uks',
    name: 'Unit Kesehatan Sekolah (UKS)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk periksa di UKS',
    data: {
      title: 'Unit Kesehatan Sekolah (UKS) & PMR',
      desc: 'Layanan medis pertolongan pertama, obat-obatan esensial, tempat istirahat siswa sakit, dan pemeriksaan kesehatan berkala.',
    },
  },
  gazebo: {
    id: 'trigger-gazebo',
    name: 'Gazebo Taman Literasi',
    type: 'interactive_board',
    promptText: 'Tekan [E] atau Ketuk untuk santai di Gazebo',
    data: {
      title: 'Gazebo Taman Literasi',
      desc: 'Tempat teduh siswa dan guru berdiskusi santai, membaca buku, dan menikmati udara segar kampus asri.',
    },
  },
  gerbang_sekolah: {
    id: 'trigger-exit-to-town',
    name: 'Gerbang Utama Menuju Kota',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk keluar ke Jalan Raya Kota',
    data: {
      title: 'Gerbang Keluar SMP Al-Ittihadiyah',
      desc: 'Keluar menuju Jl. Merdeka dan kawasan fasilitas kota Nusantara Asri.',
      action: 'travel_to_town',
    },
  },
};

export interface SchoolMapSceneInitData {
  returnPos?: { x: number; y: number };
  characterKey?: string;
  characterName?: string;
  characterRole?: string;
}

export class SchoolMapScene extends Phaser.Scene {
  public player!: Player;
  public inputManager!: InputManager;
  private blockers: Phaser.GameObjects.Rectangle[] = [];
  private triggers: Array<{
    zone: Phaser.GameObjects.Zone;
    info: InteractiveTrigger;
  }> = [];

  // Walking NPC Fleet
  private npcs: NPC[] = [];
  private studentNpcs: NPC[] = [];
  private currentShiftIndex: number = 0;
  private shiftCheckTimer: number = 0;
  private npcsGroup!: Phaser.Physics.Arcade.Group;
  private activeTalkingNPC: NPC | null = null;

  private currentNearTrigger: InteractiveTrigger | null = null;
  private lastZoneName: string = 'Gerbang Utama SMP Al-Ittihadiyah';
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private isDebugVisible: boolean = false;
  private numericKeys: Phaser.Input.Keyboard.Key[] = [];
  private f3Key?: Phaser.Input.Keyboard.Key;
  private initData?: SchoolMapSceneInitData;

  constructor() {
    super({ key: 'SchoolMapScene' });
  }

  init(data?: SchoolMapSceneInitData): void {
    this.initData = data;
  }

  create(): void {
    const worldWidth = 1536;
    const worldHeight = 1024;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 1. High-fidelity Isometric Campus Map Background
    const bg = this.add.image(0, 0, 'school_atlas');
    bg.setOrigin(0, 0);
    bg.setDepth(0);

    // 2. Load Tiled Map JSON for Collision, Interact & Spawn layers
    const map = this.make.tilemap({ key: 'school_map' });

    // 3. Build Static Collision Obstacles from Map Layer
    this.blockers = [];
    const collisionObjects = map.getObjectLayer('Collision')?.objects ?? [];
    for (const obj of collisionObjects) {
      if (!obj.width || !obj.height || obj.x === undefined || obj.y === undefined) continue;

      const centerX = obj.x + obj.width / 2;
      const centerY = obj.y + obj.height / 2;

      const blocker = this.add.rectangle(centerX, centerY, obj.width, obj.height, 0xff0044, 0);
      blocker.setOrigin(0.5, 0.5);
      this.physics.add.existing(blocker, true);
      this.blockers.push(blocker);
    }

    // 4. Resolve Player Spawn Point (or restore exterior door return position)
    const spawnObj = map.getObjectLayer('Spawn')?.objects?.find(o => o.name === 'player_spawn');
    const startX = this.initData?.returnPos ? this.initData.returnPos.x : (spawnObj?.x ?? 768);
    const startY = this.initData?.returnPos ? (this.initData.returnPos.y + 24) : (spawnObj?.y ?? 870);

    const initialProfile = this.initData?.characterKey
      ? (CHARACTER_PROFILES.find(p => p.key === this.initData!.characterKey) || CHARACTER_PROFILES[0])
      : CHARACTER_PROFILES[0];
    const charName = this.initData?.characterName || initialProfile.name;
    const charRole = this.initData?.characterRole || initialProfile.role;

    this.player = new Player(this, startX, startY, charName, initialProfile.key);
    this.player.setRoleTitle(charRole);
    this.player.setDepth(startY);

    if (this.initData?.returnPos) {
      this.player.setFacingDirection('down');
    }

    // Add colliders between Player and Blockers
    for (const blocker of this.blockers) {
      this.physics.add.collider(this.player, blocker);
    }

    // 5. Spawn Autonomous Walking NPCs
    this.npcs = [];
    this.studentNpcs = [];
    this.npcsGroup = this.physics.add.group();

    // 5a. Spawn School Staff & Teachers (Pak Asep, Farhan Sopian Sahid, Pak Dafa, Bu Septi)
    for (const teacherConfig of TEACHER_CONFIGS) {
      const npc = new NPC(this, teacherConfig);
      this.npcs.push(npc);
      this.npcsGroup.add(npc);
    }

    // 5b. Spawn 10 Active Outdoor Students (Max 10, rotates every 30 minutes)
    this.currentShiftIndex = getCurrentShiftIndex();
    const studentConfigs = getActiveStudentNPCConfigs(this.currentShiftIndex);

    for (const stdConfig of studentConfigs) {
      const npc = new NPC(this, stdConfig);
      this.npcs.push(npc);
      this.studentNpcs.push(npc);
      this.npcsGroup.add(npc);
    }

    // Add colliders between NPCs and map collision obstacles & player
    this.physics.add.collider(this.npcsGroup, this.blockers);
    this.physics.add.collider(this.player, this.npcsGroup);

    // Initial sync: hide NPC duplicate if player uses that same character
    this.syncNPCVisibilityWithPlayer();

    // 6. Setup Interactive Triggers
    this.triggers = [];
    const interactObjects = map.getObjectLayer('Interact')?.objects ?? [];
    for (const obj of interactObjects) {
      if (!obj.width || !obj.height || obj.x === undefined || obj.y === undefined) continue;

      const key = obj.name.trim().toLowerCase();
      const config = INTERACTION_CONFIGS[key];

      const triggerInfo: InteractiveTrigger = config
        ? {
            ...config,
            name: config.name || obj.name,
          }
        : {
            id: `trigger-${key.replace(/\s+/g, '-')}`,
            name: obj.name,
            type: 'building_entrance',
            promptText: `Tekan [E] atau Ketuk untuk membuka ${obj.name}`,
            data: {
              title: obj.name,
              desc: `Fasilitas ${obj.name} di lingkungan SMP Al-Ittihadiyah.`,
            },
          };

      const zone = this.add.zone(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width, obj.height);
      this.physics.add.existing(zone, true);
      this.triggers.push({ zone, info: triggerInfo });
    }

    // 6b. Setup Door Entry Markers for Classrooms & Ruang Guru
    const schoolDoors = [
      { x: 268, y: 289, label: 'Kelas VII' },
      { x: 1308, y: 289, label: 'Kelas VIII' },
      { x: 259, y: 509, label: 'Kelas IX' },
      { x: 250, y: 615, label: 'Ruang Guru' },
    ];

    for (const door of schoolDoors) {
      if (this.textures.exists('door_marker')) {
        const marker = this.add.image(door.x, door.y - 12, 'door_marker');
        marker.setOrigin(0.5, 0.5);
        marker.setScale(0.24);
        marker.setDepth(door.y + 1);

        this.tweens.add({
          targets: marker,
          y: door.y - 18,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    // 7. Setup Camera Tracking (Smooth follow with 1536 x 1024 bounds)
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.35);
    this.cameras.main.setRoundPixels(true);

    // 8. Input & Event Listeners
    this.inputManager = new InputManager(this);
    this.setupKeyboardShortcuts();
    this.setupReactEventBridge();

    // 9. Notify React Layer
    this.game.events.emit('scene:ready', {
      zoneName: this.lastZoneName,
      playerX: this.player.x,
      playerY: this.player.y,
    });
  }

  private setupKeyboardShortcuts(): void {
    if (!this.input.keyboard) return;

    // Keys 1 to 8 for instant character switching
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

    // F3 for Collision Debug visualization
    this.f3Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
    this.f3Key.on('down', () => this.toggleCollisionDebug());
  }

  private toggleCollisionDebug(): void {
    this.isDebugVisible = !this.isDebugVisible;

    if (!this.debugGraphics) {
      this.debugGraphics = this.add.graphics().setDepth(9999);
    }

    this.debugGraphics.clear();

    if (this.isDebugVisible) {
      // Collision Boxes in Red
      this.debugGraphics.lineStyle(2, 0xff0044, 0.85);
      for (const blocker of this.blockers) {
        const bounds = blocker.getBounds();
        this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }

      // Interaction Zones in Green
      this.debugGraphics.lineStyle(2, 0x00ff88, 0.85);
      for (const t of this.triggers) {
        const bounds = t.zone.getBounds();
        this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }

      // NPC Bounds in Cyan
      this.debugGraphics.lineStyle(2, 0x00d4ff, 0.9);
      for (const npc of this.npcs) {
        const bounds = npc.getBounds();
        this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
    }
  }

  private setupReactEventBridge(): void {
    // Virtual joystick input from touch screen (Android / PID)
    this.game.events.on('input:joystick', (data: { x: number; y: number }) => {
      this.inputManager.setVirtualMovement(data.x, data.y);
    });

    // Sprint button toggle
    this.game.events.on('input:sprint', (isSprinting: boolean) => {
      this.inputManager.setVirtualSprint(isSprinting);
    });

    // Interact action button
    this.game.events.on('input:interact', () => {
      this.inputManager.triggerVirtualInteract();
    });

    // Character switch from React HUD modal
    this.game.events.on('player:change-character', (data: { key: string; name: string; role: string }) => {
      this.player.switchCharacter(data.key, data.name, data.role);
      this.syncNPCVisibilityWithPlayer();
    });

    // Enter classroom scene requested from React HUD modal or direct interact
    this.game.events.on('scene:enter-classroom', (data: { classroomId: 'VII' | 'VIII' | 'IX' }) => {
      this.enterClassroom(data.classroomId);
    });

    // Enter Ruang Guru scene requested from React HUD modal or direct interact
    this.game.events.on('scene:enter-ruang-guru', () => {
      this.enterRuangGuru();
    });

    // Modal closed: resume patrol for talking NPC
    this.game.events.on('modal:closed', () => {
      if (this.activeTalkingNPC) {
        this.activeTalkingNPC.resumePatrol();
        this.activeTalkingNPC = null;
      }
    });

    // When interact trigger is fired (via keyboard 'E' or touch button)
    this.inputManager.onInteract(() => {
      if (this.currentNearTrigger) {
        // Special case: Exit to Town
        if (this.currentNearTrigger.id === 'trigger-exit-to-town') {
          this.scene.start('MainTownScene');
          return;
        }

        // Special case: Enter Ruang Guru
        if (this.currentNearTrigger.id === 'trigger-ruang-guru') {
          this.enterRuangGuru();
          return;
        }

        // If talking to an NPC, face target
        if (this.activeTalkingNPC) {
          this.activeTalkingNPC.faceTarget(this.player.x, this.player.y);
        }

        this.game.events.emit('town:open-modal', this.currentNearTrigger);
      }
    });
  }

  update(time: number, delta: number): void {
    if (!this.player || !this.inputManager) return;

    // 1. Process 1-8 keys for character switching
    this.numericKeys.forEach((key, idx) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        const profile = CHARACTER_PROFILES[idx];
        if (profile && profile.key !== this.player.characterKey) {
          this.player.switchCharacter(profile.key, profile.name, profile.role);
          this.syncNPCVisibilityWithPlayer();
          this.game.events.emit('scene:character-selected', profile);
        }
      }
    });

    // 2. Update player physics movement & 2.5D Depth Sorting
    const movementVector = this.inputManager.getMovementVector();
    const movementState = this.player.updateMovement(movementVector);

    // Dynamic depth sorting: characters with higher Y render in front
    this.player.setDepth(this.player.y);

    // 3. Update all Autonomous Walking NPCs
    for (const npc of this.npcs) {
      npc.updateNPC(delta);
      npc.setDepth(npc.y);
    }

    // 3b. 30-Minute Shift Rotation Check for Outdoor Students (Enforcing max 10 students)
    this.shiftCheckTimer += delta;
    if (this.shiftCheckTimer >= 5000) {
      this.shiftCheckTimer = 0;
      const newShiftIndex = getCurrentShiftIndex();
      if (newShiftIndex !== this.currentShiftIndex) {
        this.currentShiftIndex = newShiftIndex;
        const newStudentConfigs = getActiveStudentNPCConfigs(this.currentShiftIndex);

        for (let i = 0; i < this.studentNpcs.length; i++) {
          if (newStudentConfigs[i]) {
            this.studentNpcs[i].applyConfig(newStudentConfigs[i]);
          }
        }
        this.syncNPCVisibilityWithPlayer();

        this.game.events.emit('town:notification', {
          text: 'Pergantian Jam Istirahat (30 Menit): 10 siswa baru beraktivitas di halaman kampus!',
        });
        this.game.events.emit('town:student-shift', {
          activeCount: this.studentNpcs.length,
          shiftIndex: this.currentShiftIndex,
        });
      }
    }

    // 4. Proximity Check: First check nearby NPC (ignoring hidden/inactive ones)
    let nearTrigger: InteractiveTrigger | null = null;
    let nearNPC: NPC | null = null;

    for (const npc of this.npcs) {
      if (!npc.visible || !npc.active) continue;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (dist < 52) {
        nearNPC = npc;
        nearTrigger = {
          id: npc.npcId,
          name: npc.npcName,
          type: 'npc',
          promptText: `Tekan [E] atau Ketuk untuk bicara dengan ${npc.npcName}`,
          data: {
            title: npc.npcName,
            role: npc.npcRole,
            desc: npc.dialogue.greeting,
            quote: npc.dialogue.quote,
            avatarUrl: npc.avatarUrl,
          },
        };
        break;
      }
    }

    // If not near NPC, check map facility triggers
    if (!nearTrigger) {
      for (const t of this.triggers) {
        if (this.physics.overlap(this.player, t.zone)) {
          nearTrigger = t.info;
          break;
        }
      }
    }

    this.activeTalkingNPC = nearNPC;

    if (nearTrigger?.id !== this.currentNearTrigger?.id) {
      this.currentNearTrigger = nearTrigger;
      this.game.events.emit('town:interaction-prompt', nearTrigger);
    }

    // 5. Update zone name based on player coordinates in 1536 x 1024 campus
    const zoneName = this.determineCurrentZone(this.player.x, this.player.y);
    if (zoneName !== this.lastZoneName) {
      this.lastZoneName = zoneName;
      this.game.events.emit('town:zone-change', zoneName);
    }

    // 6. Broadcast movement state to HUD
    if (movementState.isMoving) {
      this.game.events.emit('town:player-update', movementState);
    }
  }

  private determineCurrentZone(x: number, y: number): string {
    if (y > 850) return 'Gerbang Utama & Pos Keamanan';
    if (y > 640 && x < 550) return 'Area Musala & Kantin Sekolah';
    if (y > 640 && x >= 550 && x <= 950) return 'Lapangan Olahraga & Futsal';
    if (y > 640 && x > 950) return 'Area UKS & Gazebo Taman';
    if (y >= 470 && y <= 640 && x >= 450 && x <= 1100) return 'Pondok Pesantren As Salaam';
    if (y >= 470 && y <= 640 && x < 450) return 'Ruang Guru & Bimbingan Konseling';
    if (y >= 470 && y <= 640 && x > 1100) return 'Perpustakaan Literasi & E-Library';
    if (y >= 260 && y < 470 && x >= 450 && x <= 1100) return 'Pelataran Upacara & Tiang Bendera';
    if (y >= 260 && y < 470 && x < 450) return 'Koridor Kelas IX';
    if (y >= 260 && y < 470 && x > 1100) return 'Laboratorium Komputer & Informatika';
    if (y < 260 && x >= 450 && x <= 1100) return 'Kantor & Gedung Pusat Administrasi';
    if (y < 260 && x < 450) return 'Koridor Kelas VII';
    if (y < 260 && x > 1100) return 'Koridor Kelas VIII';
    return 'Kampus Asri SMP Terpadu Al-Ittihadiyah';
  }

  /**
   * Automatically synchronizes NPC visibility so that the scene never spawns
   * or displays an NPC duplicate of the character currently controlled by the player.
   */
  private syncNPCVisibilityWithPlayer(): void {
    if (!this.player) return;
    const playerKey = this.player.characterKey;
    const playerName = this.player.characterName.trim().toLowerCase();

    for (const npc of this.npcs) {
      const isDuplicate =
        npc.characterKey === playerKey ||
        npc.npcName.trim().toLowerCase() === playerName;

      npc.setNPCVisibility(!isDuplicate);
    }
  }

  private enterClassroom(classroomId: 'VII' | 'VIII' | 'IX'): void {
    // Clear prompt immediately
    this.game.events.emit('town:interaction-prompt', null);

    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('ClassroomScene', {
        classroomId,
        returnPos: { x: this.player.x, y: this.player.y },
        characterKey: this.player.characterKey,
        characterName: this.player.characterName,
        characterRole: this.player.roleTitle || 'Siswa',
      });
    });
  }

  private enterRuangGuru(): void {
    // Clear prompt immediately
    this.game.events.emit('town:interaction-prompt', null);

    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('RuangGuruScene', {
        returnPos: { x: this.player.x, y: this.player.y },
        characterKey: this.player.characterKey,
        characterName: this.player.characterName,
        characterRole: this.player.roleTitle || 'Siswa',
      });
    });
  }

  shutdown(): void {
    this.inputManager?.destroy();
    this.game.events.off('input:joystick');
    this.game.events.off('input:sprint');
    this.game.events.off('input:interact');
    this.game.events.off('player:change-character');
    this.game.events.off('scene:enter-classroom');
    this.game.events.off('scene:enter-ruang-guru');
    this.game.events.off('modal:closed');

    for (const npc of this.npcs) {
      npc.destroy();
    }
    this.npcs = [];

    if (this.debugGraphics) {
      this.debugGraphics.destroy();
    }
  }
}
