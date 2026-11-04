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
  lab_informatika: {
    id: 'trigger-lab',
    name: 'Laboratorium Informatika & Komputer',
    type: 'interactive_board',
    promptText: 'Tekan [E] atau Ketuk untuk akses Lab Informatika',
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
  gedung_utama: {
    id: 'trigger-gedung-utama',
    name: 'Gedung Utama (TU & Kepala Sekolah)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Gedung Utama',
    data: {
      title: 'Gedung Pusat Administrasi & Kepemimpinan',
      desc: 'Pusat layanan tata usaha (TU), ruang Kepala Sekolah, kesiswaan, dan legalisir dokumen resmi sekolah.',
    },
  },
  perpustakaan: {
    id: 'trigger-perpustakaan',
    name: 'Perpustakaan Literasi Al-Ittihadiyah',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk membaca di Perpustakaan',
    data: {
      title: 'Perpustakaan Sekolah & E-Library',
      desc: 'Menyediakan ribuan buku pelajaran Kurikulum Merdeka, karya sastra, ensiklopedia, dan ruang baca hening ber-AC.',
    },
  },
  ruang_guru: {
    id: 'trigger-ruang-guru',
    name: 'Ruang Guru & Bimbingan Konseling (BK)',
    type: 'npc',
    promptText: 'Tekan [E] atau Ketuk untuk konsultasi di Ruang Guru',
    data: {
      title: 'Ruang Kerja Guru & Konseling Siswa',
      desc: 'Tempat berkonsultasi dengan wali kelas, guru mata pelajaran, dan konselor BK untuk bimbingan akademik maupun pengembangan diri.',
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
  kelas_7: {
    id: 'trigger-kelas-7',
    name: 'Ruang Kelas 7 (Fase D)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Kelas 7',
    data: {
      title: 'Ruang Kelas 7 SMP',
      desc: 'Ruang kelas pembelajaran peserta didik baru tingkat 7 dengan modul pengenalan lingkungan sekolah dan adaptasi kurikulum.',
    },
  },
  kelas_8: {
    id: 'trigger-kelas-8',
    name: 'Ruang Kelas 8A',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Kelas 8A',
    data: {
      title: 'Ruang Kelas 8A SMP',
      desc: 'Ruang kelas 8 fokus pada penguatan materi inti, proyek sains interaktif, dan kolaborasi kelompok P5.',
    },
  },
  kelas_8b: {
    id: 'trigger-kelas-8b',
    name: 'Ruang Kelas 8B',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Kelas 8B',
    data: {
      title: 'Ruang Kelas 8B SMP',
      desc: 'Ruang kelas 8B yang tertata asri dengan pojok baca literasi dan majalah dinding prestasi siswa.',
    },
  },
  kelas_9: {
    id: 'trigger-kelas-9',
    name: 'Ruang Kelas 9 (Fase Kelulusan)',
    type: 'building_entrance',
    promptText: 'Tekan [E] atau Ketuk untuk masuk ke Kelas 9',
    data: {
      title: 'Ruang Kelas 9 SMP',
      desc: 'Ruang kelas tingkat akhir pendalaman materi ujian kelulusan, asesmen sumatif akhir, dan bimbingan karir jenjang SMA/SMK.',
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
  lapangan: {
    id: 'trigger-lapangan',
    name: 'Lapangan Utama & Serbaguna',
    type: 'interactive_board',
    promptText: 'Tekan [E] atau Ketuk untuk aktivitas di Lapangan',
    data: {
      title: 'Lapangan Upacara & Olahraga SMP',
      desc: 'Area terbuka untuk upacara bendera hari Senin, senam kesegaran jasmani, pertandingan basket, voli, dan futsal.',
    },
  },
  tiang_bendera: {
    id: 'trigger-tiang-bendera',
    name: 'Area Tiang Bendera Merah Putih',
    type: 'interactive_board',
    promptText: 'Tekan [E] atau Ketuk untuk upacara di Tiang Bendera',
    data: {
      title: 'Tiang Bendera Sang Merah Putih',
      desc: 'Pusat pengibaran Sang Saka Merah Putih, pembacaan ikrar janji siswa, dan upacara peringatan hari pahlawan nasional.',
    },
  },
};

const WALKING_NPC_CONFIGS: NPCConfig[] = [
  {
    id: 'npc-satpam',
    name: 'Pak Joko',
    role: 'Satpam Sekolah',
    characterKey: 'char_satpam',
    avatarUrl: '/assets/game/characters/avatars/pak_joko.png',
    speed: 55,
    waypoints: [
      { x: 768, y: 890, waitTime: 3000 },
      { x: 670, y: 890, waitTime: 3500 },
      { x: 860, y: 890, waitTime: 2500 },
      { x: 768, y: 830, waitTime: 3000 },
    ],
    dialogue: {
      greeting: 'Pak Joko menyapa Anda dengan senyum ramah di pos penjagaan gerbang:',
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
      { x: 340, y: 360, waitTime: 3500 },
      { x: 550, y: 360, waitTime: 2500 },
      { x: 768, y: 300, waitTime: 3000 },
      { x: 550, y: 360, waitTime: 2500 },
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
      { x: 270, y: 720, waitTime: 3000 },
      { x: 270, y: 550, waitTime: 2500 },
      { x: 380, y: 550, waitTime: 3000 },
      { x: 380, y: 720, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Rian melambaikan tangan saat sedang berjalan di lorong:',
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
      { x: 1260, y: 760, waitTime: 3500 },
      { x: 1260, y: 520, waitTime: 2500 },
      { x: 1260, y: 350, waitTime: 3000 },
      { x: 1260, y: 210, waitTime: 4000 },
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
      { x: 600, y: 660, waitTime: 1500 },
      { x: 920, y: 660, waitTime: 1500 },
      { x: 920, y: 720, waitTime: 1500 },
      { x: 600, y: 720, waitTime: 1500 },
    ],
    dialogue: {
      greeting: 'Dedi menyapa Anda sambil pemanasan jogging di lapangan:',
      quote: '“Ayo lari keliling lapangan! Badan sehat bikin kita makin fokus belajar. Nanti sore ada sparing futsal antar kelas lho!”',
    },
  },
];

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
    // 1. Create Tilemap from preloaded JSON & Atlas (map_sekolah_revisi_bundle)
    const map = this.make.tilemap({ key: 'school_map' });
    const tileset = map.addTilesetImage('school_atlas', 'school_atlas', 32, 32, 0, 0);

    if (!tileset) {
      console.error('SchoolMapScene: Tileset "school_atlas" gagal dimuat.');
      return;
    }

    const groundLayer = map.createLayer('Ground', tileset, 0, 0);
    if (groundLayer) {
      groundLayer.setDepth(0);
    }

    // 2. Setup Physics World Boundaries
    const worldWidth = map.widthInPixels;
    const worldHeight = map.heightInPixels;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 3. Resolve Player Spawn Location
    const spawnObj = map.getObjectLayer('Spawn')?.objects?.find(o => o.name === 'player_spawn');
    const startX = spawnObj?.x ?? 768;
    const startY = spawnObj?.y ?? 890;

    // 4. Create Player Entity
    const initialProfile = CHARACTER_PROFILES[0];
    this.player = new Player(this, startX, startY, initialProfile.name, initialProfile.key);

    // 5. Build Static Collision Obstacles from Map Layer
    const collisionObjects = map.getObjectLayer('Collision')?.objects ?? [];
    for (const obj of collisionObjects) {
      if (!obj.width || !obj.height || obj.x === undefined || obj.y === undefined) continue;

      const centerX = obj.x + obj.width / 2;
      const centerY = obj.y + obj.height / 2;

      const blocker = this.add.rectangle(centerX, centerY, obj.width, obj.height, 0xff00ff, 0);
      blocker.setOrigin(0.5, 0.5);
      this.physics.add.existing(blocker, true);
      this.physics.add.collider(this.player, blocker);
      this.blockers.push(blocker);
    }

    // 6. Spawn Autonomous Walking NPCs
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

    // 7. Setup Interactive Triggers
    const interactObjects = map.getObjectLayer('Interact')?.objects ?? [];
    for (const obj of interactObjects) {
      if (!obj.width || !obj.height || obj.x === undefined || obj.y === undefined) continue;

      const labelProp = obj.properties?.find((p: { name: string; value: unknown }) => p.name === 'label')?.value as string | undefined;
      const config = INTERACTION_CONFIGS[obj.name];

      const triggerInfo: InteractiveTrigger = config
        ? {
            ...config,
            name: labelProp || config.name,
          }
        : {
            id: `trigger-${obj.name}`,
            name: labelProp || obj.name,
            type: 'building_entrance',
            promptText: `Tekan [E] atau Ketuk untuk membuka ${labelProp || obj.name}`,
            data: {
              title: labelProp || obj.name,
              desc: `Fasilitas sekolah ${labelProp || obj.name} di lingkungan SMP Al-Ittihadiyah.`,
            },
          };

      const zoneCenterX = obj.x + obj.width / 2;
      const zoneCenterY = obj.y + obj.height / 2;
      const zone = this.add.zone(zoneCenterX, zoneCenterY, obj.width, obj.height);
      this.physics.add.existing(zone, true);
      this.triggers.push({ zone, info: triggerInfo });
    }

    // 8. Add School Gate Exit to City
    const exitZone = this.add.zone(768, 1010, 180, 36);
    this.physics.add.existing(exitZone, true);
    this.triggers.push({
      zone: exitZone,
      info: {
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
    });

    // 9. Setup Camera Tracking
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);
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
      this.debugGraphics = this.add.graphics().setDepth(999);
    }

    this.debugGraphics.clear();

    if (this.isDebugVisible) {
      this.debugGraphics.lineStyle(2, 0xff0044, 0.8);
      for (const blocker of this.blockers) {
        const bounds = blocker.getBounds();
        this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }

      this.debugGraphics.lineStyle(2, 0x00ff88, 0.8);
      for (const t of this.triggers) {
        const bounds = t.zone.getBounds();
        this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }

      // Show NPC collision debug
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
          // Sync back to React UI
          this.game.events.emit('scene:character-selected', profile);
        }
      }
    });

    // 2. Update player physics movement
    const movementVector = this.inputManager.getMovementVector();
    const movementState = this.player.updateMovement(movementVector);

    // 3. Update all Autonomous Walking NPCs
    for (const npc of this.npcs) {
      npc.updateNPC(delta);
    }

    // 4. Proximity Check: First check nearby NPC, then map triggers
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

    // 5. Update zone name based on player coordinates
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
    if (y > 880) return 'Gerbang Utama SMP Al-Ittihadiyah';
    if (y > 700 && x < 450) return 'Kantin Sekolah';
    if (y > 700 && x > 1150) return 'Musala Al-Ittihadiyah';
    if (y >= 540 && y <= 770 && x >= 500 && x <= 1000) return 'Lapangan Utama Sekolah';
    if (y >= 380 && y <= 530 && x >= 650 && x <= 880) return 'Area Tiang Bendera';
    if (y < 280 && x >= 550 && x <= 950) return 'Gedung Utama (TU & Kepsek)';
    if (y < 280 && x < 450) return 'Sayap Barat: Lab Informatika';
    if (y < 280 && x > 1150) return 'Sayap Timur: Perpustakaan';
    if (y >= 280 && y < 450 && x < 450) return 'Ruang Guru & BK';
    if (y >= 280 && y < 450 && x > 1100) return 'Unit Kesehatan Sekolah (UKS)';
    if (y >= 450 && y < 580 && x < 250) return 'Sayap Kelas 7';
    if (y >= 580 && y <= 700 && x < 250) return 'Sayap Kelas 8';
    if (y >= 450 && y < 580 && x > 1250) return 'Sayap Kelas 9';
    if (y >= 580 && y <= 700 && x > 1250) return 'Sayap Kelas 8B';
    return 'Pelataran Kampus SMP Al-Ittihadiyah';
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
