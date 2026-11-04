import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NPC, NPCConfig } from '../entities/NPC';
import { InputManager } from '../input/InputManager';
import { InteractiveTrigger, CHARACTER_PROFILES } from '@/lib/game/types';

interface InteractionObjectConfig {
  id: string;
  name: string;
  type: 'building_entrance' | 'shop' | 'npc' | 'interactive_board' | 'seating';
  promptText: string;
  data: Record<string, unknown>;
}

const INTERACTION_CONFIGS: Record<string, InteractionObjectConfig> = {
  'main building': {
    id: 'trigger-gedung-utama',
    name: 'Gedung Utama (TU & Kepala Sekolah)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Gedung Utama',
    data: {
      title: 'Gedung Pusat Administrasi & Kepemimpinan',
      desc: 'Pusat layanan tata usaha (TU), ruang Kepala Sekolah, kesiswaan, dan legalisir dokumen resmi sekolah.',
    },
  },
  'computer lab': {
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
  'library': {
    id: 'trigger-perpustakaan',
    name: 'Perpustakaan Literasi Al-Ittihadiyah',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk membaca di Perpustakaan',
    data: {
      title: 'Perpustakaan Sekolah & E-Library',
      desc: 'Menyediakan ribuan buku pelajaran Kurikulum Merdeka, karya sastra, ensiklopedia, dan ruang baca hening ber-AC.',
    },
  },
  'teachers room': {
    id: 'trigger-ruang-guru',
    name: 'Ruang Guru & Bimbingan Konseling (BK)',
    type: 'npc',
    promptText: 'Tekan [E] atau Ketuk untuk konsultasi di Ruang Guru',
    data: {
      title: 'Ruang Kerja Guru & Konseling Siswa',
      desc: 'Tempat berkonsultasi dengan wali kelas, guru mata pelajaran, dan konselor BK untuk bimbingan akademik maupun pengembangan diri.',
    },
  },
  'classroom vii': {
    id: 'trigger-kelas-7',
    name: 'Ruang Kelas 7 (Fase D)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Kelas 7',
    data: {
      title: 'Ruang Kelas 7 SMP',
      desc: 'Ruang kelas pembelajaran peserta didik baru tingkat 7 dengan modul pengenalan lingkungan sekolah dan adaptasi kurikulum.',
    },
  },
  'classroom viii': {
    id: 'trigger-kelas-8',
    name: 'Ruang Kelas 8',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Kelas 8',
    data: {
      title: 'Ruang Kelas 8 SMP',
      desc: 'Ruang kelas 8 fokus pada penguatan materi inti, proyek sains interaktif, dan kolaborasi kelompok P5.',
    },
  },
  'classroom ix': {
    id: 'trigger-kelas-9',
    name: 'Ruang Kelas 9 (Fase Kelulusan)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Kelas 9',
    data: {
      title: 'Ruang Kelas 9 SMP',
      desc: 'Ruang kelas tingkat akhir pendalaman materi ujian kelulusan, asesmen sumatif akhir, dan bimbingan karir jenjang SMA/SMK.',
    },
  },
  'mosque': {
    id: 'trigger-mushola',
    name: 'Musala Sekolah Al-Ittihadiyah',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Musala',
    data: {
      title: 'Musala Sekolah Al-Ittihadiyah',
      desc: 'Pusat ibadah salat zuhur berjamaah, kegiatan rohani Islam, serta pembinaan adab santun warga sekolah.',
    },
  },
  'canteen': {
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
  'uks clinic': {
    id: 'trigger-uks',
    name: 'Unit Kesehatan Sekolah (UKS)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk periksa di UKS',
    data: {
      title: 'Unit Kesehatan Sekolah (UKS) & PMR',
      desc: 'Layanan medis pertolongan pertama, obat-obatan esensial, tempat istirahat siswa sakit, dan pemeriksaan kesehatan berkala.',
    },
  },
  'gazebo': {
    id: 'trigger-gazebo',
    name: 'Gazebo & Pojok Diskusi Taman',
    type: 'interactive_board',
    promptText: 'Tekan [E] atau Ketuk untuk santai di Gazebo',
    data: {
      title: 'Gazebo Taman Literasi',
      desc: 'Tempat teduh siswa dan guru berdiskusi santai, membaca buku, dan menikmati udara segar kampus asri.',
    },
  },
  'gerbang sekolah': {
    id: 'trigger-exit-to-town',
    name: 'Gerbang Luar Menuju Kota',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk keluar ke Jalan Raya Kota',
    data: {
      title: 'Gerbang Keluar SMP Al-Ittihadiyah',
      desc: 'Keluar menuju Jl. Merdeka dan kawasan fasilitas kota Nusantara Asri.',
      action: 'travel_to_town',
    },
  },
};

// 5 Autonomous Walking NPCs configured for 2048 x 1536 Modular World
const WALKING_NPC_CONFIGS: NPCConfig[] = [
  {
    id: 'npc-satpam',
    name: 'Pak Joko',
    role: 'Satpam Sekolah',
    characterKey: 'char_satpam',
    avatarUrl: '/assets/game/characters/avatars/pak_joko.png',
    speed: 55,
    waypoints: [
      { x: 1024, y: 1385, waitTime: 3000 },
      { x: 920, y: 1385, waitTime: 3500 },
      { x: 1120, y: 1385, waitTime: 3500 },
      { x: 1024, y: 1300, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Pak Joko menyapa Anda dengan senyum ramah di pos gerbang sekolah:',
      quote: '“Selamat pagi! Tetap jaga ketertiban, parkir kendaraan rapi di tempatnya, dan jangan lupa selalu santun kepada bapak/ibu guru ya!”',
    },
  },
  {
    id: 'npc-guru-siti',
    name: 'Bu Guru Siti',
    role: 'Guru BK / Konselor',
    characterKey: 'char_guru_wanita',
    avatarUrl: '/assets/game/characters/avatars/bu_guru_siti.png',
    speed: 60,
    waypoints: [
      { x: 1650, y: 620, waitTime: 3500 },
      { x: 1350, y: 500, waitTime: 2500 },
      { x: 1024, y: 350, waitTime: 3500 },
      { x: 1350, y: 500, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Bu Guru Siti menyapa Anda dengan hangat di koridor sekolah:',
      quote: '“Halo ananda! Semangat terus belajarnya ya. Jika ada kendala belajar atau butuh teman konsultasi, pintu ruang BK selalu terbuka untuk kalian.”',
    },
  },
  {
    id: 'npc-rian',
    name: 'Rian Pratama',
    role: 'Siswa Kelas 8',
    characterKey: 'char_student',
    avatarUrl: '/assets/game/characters/avatars/rian_pratama.png',
    speed: 70,
    waypoints: [
      { x: 650, y: 1200, waitTime: 3000 },
      { x: 420, y: 870, waitTime: 2500 },
      { x: 420, y: 620, waitTime: 3000 },
      { x: 550, y: 750, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Rian melambaikan tangan saat sedang berjalan di lorong kelas:',
      quote: '“Eh halo! Tadi habis istirahat jajan bakwan di kantin. Nanti sehabis pelajaran ada kerja kelompok sains di lab komputer, gabung yuk!”',
    },
  },
  {
    id: 'npc-aisyah',
    name: 'Aisyah Putri',
    role: 'Siswi Teladan SMP',
    characterKey: 'char_siswi_hijab',
    avatarUrl: '/assets/game/characters/avatars/aisyah_putri.png',
    speed: 65,
    waypoints: [
      { x: 1650, y: 310, waitTime: 4000 },
      { x: 1650, y: 620, waitTime: 2500 },
      { x: 1420, y: 1200, waitTime: 3000 },
      { x: 1650, y: 870, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Aisyah tersenyum santun sambil membawa buku pelajaran kurikulum:',
      quote: '“Assalamu’alaikum! Saya baru saja dari perpustakaan meminjam referensi materi baru. Nanti siang jangan lupa sholat berjamaah di musala ya.”',
    },
  },
  {
    id: 'npc-dedi',
    name: 'Dedi Santoso',
    role: 'Siswa Ekskul Olahraga',
    characterKey: 'char_student',
    avatarUrl: '/assets/game/characters/avatars/rian_pratama.png',
    speed: 80,
    waypoints: [
      { x: 880, y: 720, waitTime: 1200 },
      { x: 1160, y: 720, waitTime: 1200 },
      { x: 1160, y: 850, waitTime: 1200 },
      { x: 880, y: 850, waitTime: 1200 },
    ],
    dialogue: {
      greeting: 'Dedi menyapa Anda sambil pemanasan jogging di lapangan:',
      quote: '“Ayo lari keliling lapangan! Badan sehat bikin kita makin fokus belajar. Nanti sore ada sparing futsal antar kelas lho!”',
    },
  },
];

interface ModularObjectItem {
  name?: string;
  key: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface ModularCollisionItem {
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ModularInteractionItem {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action?: string;
  target?: string;
}

interface ModularMapObjectsData {
  world: { width: number; height: number };
  buildings: ModularObjectItem[];
  props: ModularObjectItem[];
  spawn: { x: number; y: number };
  collision: ModularCollisionItem[];
  interactions: ModularInteractionItem[];
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
  private npcsGroup!: Phaser.Physics.Arcade.Group;
  private activeTalkingNPC: NPC | null = null;

  private currentNearTrigger: InteractiveTrigger | null = null;
  private lastZoneName: string = 'Gerbang Utama SMP Al-Ittihadiyah';
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private isDebugVisible: boolean = false;
  private numericKeys: Phaser.Input.Keyboard.Key[] = [];
  private f3Key?: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'SchoolMapScene' });
  }

  create(): void {
    // 1. Create Tilemap Ground Layer (school_map_modular_phaser3)
    const map = this.make.tilemap({ key: 'school-ground' });
    const tiles = map.addTilesetImage('ground_tileset', 'ground-tiles', 32, 32, 0, 0);

    if (tiles) {
      const groundLayer = map.createLayer('Ground', tiles, 0, 0);
      if (groundLayer) groundLayer.setDepth(0);
    }

    const worldWidth = map.widthInPixels || 2048;
    const worldHeight = map.heightInPixels || 1536;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 2. Load Modular Objects JSON
    const objectsData = this.cache.json.get('school-objects') as ModularMapObjectsData;

    // 3. Place Independent Modular Buildings (origin bottom-center, depth = Y footpoint)
    if (objectsData?.buildings) {
      for (const b of objectsData.buildings) {
        this.add.image(b.x, b.y, b.key)
          .setOrigin(0.5, 1)
          .setDepth(b.y);
      }
    }

    // 4. Place Independent Modular Props (trees, lamps, benches, court, etc.)
    if (objectsData?.props) {
      for (const p of objectsData.props) {
        this.add.image(p.x, p.y, p.key)
          .setOrigin(0.5, 1)
          .setDepth(p.y);
      }
    }

    // 5. Build 62 Collision Blockers on Footprints / Walls
    this.blockers = [];
    if (objectsData?.collision) {
      for (const c of objectsData.collision) {
        const blocker = this.add.rectangle(c.x, c.y, c.width, c.height, 0xff0044, 0);
        blocker.setOrigin(0.5, 0.5);
        this.physics.add.existing(blocker, true);
        this.blockers.push(blocker);
      }
    }

    // 6. Spawn Player Entity at data.spawn (1024, 1385)
    const startX = objectsData?.spawn?.x ?? 1024;
    const startY = objectsData?.spawn?.y ?? 1385;
    const initialProfile = CHARACTER_PROFILES[0];
    this.player = new Player(this, startX, startY, initialProfile.name, initialProfile.key);

    // Add collision between player and all 62 modular blockers
    for (const blocker of this.blockers) {
      this.physics.add.collider(this.player, blocker);
    }

    // 7. Spawn Autonomous Walking NPCs
    this.npcs = [];
    this.npcsGroup = this.physics.add.group();

    for (const npcConfig of WALKING_NPC_CONFIGS) {
      const npc = new NPC(this, npcConfig);
      this.npcs.push(npc);
      this.npcsGroup.add(npc);
    }

    // Add colliders for NPCs
    this.physics.add.collider(this.npcsGroup, this.blockers);
    this.physics.add.collider(this.player, this.npcsGroup);

    // 8. Setup Interactive Triggers from data.interactions
    this.triggers = [];
    if (objectsData?.interactions) {
      for (const inter of objectsData.interactions) {
        const key = inter.label.trim().toLowerCase();
        const config = INTERACTION_CONFIGS[key];

        const triggerInfo: InteractiveTrigger = config
          ? {
              ...config,
              name: config.name || inter.label,
            }
          : {
              id: `trigger-${key.replace(/\s+/g, '-')}`,
              name: inter.label,
              type: 'building_entrance',
              promptText: `Tekan [E] atau Ketuk untuk membuka ${inter.label}`,
              data: {
                title: inter.label,
                desc: `Fasilitas ${inter.label} di lingkungan SMP Al-Ittihadiyah.`,
              },
            };

        const zone = this.add.zone(inter.x, inter.y, inter.width, inter.height);
        this.physics.add.existing(zone, true);
        this.triggers.push({ zone, info: triggerInfo });
      }
    }

    // 9. Setup Camera Tracking (Smooth follow with 2048 x 1536 bounds)
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.15);
    this.cameras.main.setRoundPixels(true);

    // 10. Input & Event Listeners
    this.inputManager = new InputManager(this);
    this.setupKeyboardShortcuts();
    this.setupReactEventBridge();

    // 11. Notify React Layer
    this.game.events.emit('scene:ready', {
      zoneName: this.lastZoneName,
      playerX: this.player.x,
      playerY: this.player.y,
    });
  }

  private setupKeyboardShortcuts(): void {
    if (!this.input.keyboard) return;

    // Keys 1 to 5 for instant character switching
    const numCodes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
    ];

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
      // 62 Modular Collision Boxes in Red
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

    // 1. Process 1-5 keys for character switching
    this.numericKeys.forEach((key, idx) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        const profile = CHARACTER_PROFILES[idx];
        if (profile && profile.key !== this.player.characterKey) {
          this.player.switchCharacter(profile.key, profile.name, profile.role);
          this.game.events.emit('scene:character-selected', profile);
        }
      }
    });

    // 2. Update player physics movement & 2.5D Depth Sorting
    const movementVector = this.inputManager.getMovementVector();
    const movementState = this.player.updateMovement(movementVector);

    // 3. Update all Autonomous Walking NPCs
    for (const npc of this.npcs) {
      npc.updateNPC(delta);
    }

    // 4. Proximity Check: First check nearby NPC, then map interaction zones
    let nearTrigger: InteractiveTrigger | null = null;
    let nearNPC: NPC | null = null;

    for (const npc of this.npcs) {
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

    // 5. Update zone name based on player coordinates in 2048 x 1536 world
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
    if (y > 1300) return 'Gerbang Utama SMP Al-Ittihadiyah';
    if (x < 800 && y > 1100) return 'Area Musala & Kantin Sekolah';
    if (x > 1200 && y > 1100) return 'Area UKS Clinic & Gazebo Taman';
    if (x >= 750 && x <= 1300 && y >= 650 && y <= 950) return 'Lapangan Utama & Tiang Bendera';
    if (y < 450 && x >= 700 && x <= 1350) return 'Pelataran Gedung Utama (TU & Kepsek)';
    if (x < 600 && y < 500) return 'Sayap Barat: Lab Komputer';
    if (x > 1450 && y < 500) return 'Sayap Timur: Perpustakaan';
    if (x < 600 && y >= 500 && y <= 1000) return 'Sayap Barat: Koridor Kelas 7 & 8';
    if (x > 1450 && y >= 500 && y <= 1000) return 'Sayap Timur: Ruang Guru & Kelas 9';
    return 'Kampus Asri SMP Al-Ittihadiyah';
  }

  shutdown(): void {
    this.inputManager?.destroy();
    this.game.events.off('input:joystick');
    this.game.events.off('input:sprint');
    this.game.events.off('input:interact');
    this.game.events.off('player:change-character');
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
