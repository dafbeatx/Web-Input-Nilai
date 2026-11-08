import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NPC, NPCConfig } from '../entities/NPC';
import { InputManager } from '../input/InputManager';
import { InteractiveTrigger, CHARACTER_PROFILES, DeviceMode } from '@/lib/game/types';
import { detectDeviceMode } from '@/lib/game/deviceDetector';

export interface OutskirtsSceneInitData {
  returnPos?: { x: number; y: number };
  characterKey?: string;
  characterName?: string;
  characterRole?: string;
}

export class OutskirtsScene extends Phaser.Scene {
  public player!: Player;
  public inputManager!: InputManager;

  private returnPos: { x: number; y: number } = { x: 120, y: 768 };
  private savedCharKey: string = 'char_farhan';
  private savedCharName: string = 'Farhan Sopian Sahid';
  private savedCharRole: string = 'Kepala Sekolah';

  private blockers: Phaser.GameObjects.Rectangle[] = [];
  private npcs: NPC[] = [];
  private npcsGroup!: Phaser.Physics.Arcade.Group;
  private activeTalkingNPC: NPC | null = null;

  private triggers: Array<{
    zone: Phaser.GameObjects.Zone;
    info: InteractiveTrigger;
  }> = [];

  private currentNearTrigger: InteractiveTrigger | null = null;
  private lastZoneName: string = 'Kawasan Agrowisata & Petualangan P5';
  private numericKeys: Phaser.Input.Keyboard.Key[] = [];
  private isExiting: boolean = false;
  private currentDeviceMode: DeviceMode = 'desktop';

  // Animated station fire
  private bonfireFlame?: Phaser.GameObjects.Sprite;

  // Bound handler references for clean event removal
  private boundHandlers: {
    joystick?: (data: { x: number; y: number }) => void;
    sprint?: (isSprinting: boolean) => void;
    interact?: () => void;
    changeChar?: (data: { key: string; name: string; role: string }) => void;
    deviceMode?: (mode: DeviceMode) => void;
    modalClosed?: () => void;
  } = {};

  constructor() {
    super({ key: 'OutskirtsScene' });
  }

  init(data?: OutskirtsSceneInitData): void {
    if (data?.returnPos) this.returnPos = data.returnPos;
    if (data?.characterKey) this.savedCharKey = data.characterKey;
    if (data?.characterName) this.savedCharName = data.characterName;
    if (data?.characterRole) this.savedCharRole = data.characterRole;

    this.isExiting = false;
    this.currentDeviceMode = detectDeviceMode();
  }

  create(): void {
    const worldWidth = 2048;
    const worldHeight = 1536;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 1. High-Fidelity Cohesive Landscape Background Atlas (Single unified pixel-art canvas)
    const bg = this.add.image(0, 0, 'outskirts_atlas');
    bg.setOrigin(0, 0);
    bg.setDepth(0);

    // 2. Animated Elements & Dynamic Markers (Door pulse, Campfire flames)
    this.createAnimatedDecor();

    // 3. Build Static Colliders & World Boundaries
    this.createObstacles(worldWidth, worldHeight);

    // 4. Create Interactive Zones
    this.createInteractiveTriggers();

    // 5. Initialize Input Manager
    this.inputManager = new InputManager(this);

    // 6. Spawn Player
    const spawnX = this.returnPos.x;
    const spawnY = this.returnPos.y;
    this.player = new Player(this, spawnX, spawnY, this.savedCharName, this.savedCharKey);
    this.player.setRoleTitle(this.savedCharRole);
    this.player.setFacingDirection('right');
    this.player.setDepth(spawnY);

    // Collision between player and obstacles
    for (const blocker of this.blockers) {
      this.physics.add.collider(this.player, blocker);
    }

    // 7. Spawn Dedicated Outskirts NPCs
    this.spawnOutskirtsNPCs();

    // 8. Configure Camera Follow & Adaptive Zoom
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.applyAdaptiveZoom(this.currentDeviceMode);

    // Camera fade in transition
    this.cameras.main.fadeIn(350, 0, 0, 0);

    // 9. Numeric keys 1-8 for quick character swapping
    this.numericKeys = [];
    if (this.input.keyboard) {
      for (let i = 1; i <= 8; i++) {
        const keyCode = Phaser.Input.Keyboard.KeyCodes[
          `NUMPAD_${i}` as keyof typeof Phaser.Input.Keyboard.KeyCodes
        ] || Phaser.Input.Keyboard.KeyCodes[`${i}` as keyof typeof Phaser.Input.Keyboard.KeyCodes];
        if (keyCode) {
          this.numericKeys.push(this.input.keyboard.addKey(keyCode));
        }
      }
    }

    // 10. React Event Bridge
    this.setupReactEventBridge();

    // Notify React layer that scene is ready
    this.game.events.emit('scene:ready', {
      zoneName: this.lastZoneName,
      playerX: this.player.x,
      playerY: this.player.y,
    });
    this.game.events.emit('town:zone-change', this.lastZoneName);
  }

  private createAnimatedDecor(): void {
    // ═══════════════════════════════════════════════════════════
    // A. WEST GATE: Glowing portal marker & signpost
    // ═══════════════════════════════════════════════════════════
    const gateY = 768;
    if (this.textures.exists('door_marker')) {
      const marker = this.add.image(60, gateY, 'door_marker').setDepth(5).setScale(1.2);
      this.tweens.add({
        targets: marker,
        alpha: { from: 0.55, to: 1.0 },
        yoyo: true,
        repeat: -1,
        duration: 900,
      });
    }

    this.add.text(70, gateY - 45, '← Kampus SMP', {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '11px',
      color: '#fef08a',
      stroke: '#0f172a',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setDepth(gateY + 10);

    // ═══════════════════════════════════════════════════════════
    // B. CAMPFIRE: Animated Flickering Flame
    // ═══════════════════════════════════════════════════════════
    this.bonfireFlame = this.add.sprite(1550, 1148, 'station_fire_flame', 0).setDepth(1165).setScale(1.2);
    if (this.anims.exists('fire_burn')) {
      this.bonfireFlame.play('fire_burn');
    }
  }

  private createObstacles(worldWidth: number, worldHeight: number): void {
    this.blockers = [];

    const addBlocker = (x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle => {
      const blocker = this.add.rectangle(x, y, w, h, 0xff0044, 0);
      blocker.setOrigin(0.5, 0.5);
      this.physics.add.existing(blocker, true);
      this.blockers.push(blocker);
      return blocker;
    };

    // 1. North Perimeter Barrier
    addBlocker(worldWidth / 2, 45, worldWidth, 70);

    // 2. South Perimeter Barrier
    addBlocker(worldWidth / 2, worldHeight - 35, worldWidth, 70);

    // 3. East Perimeter Barrier
    addBlocker(worldWidth - 35, worldHeight / 2, 70, worldHeight);

    // 4. West Perimeter Barrier (with open gap at y: 710..830 for Gate)
    addBlocker(25, 360, 50, 700);
    addBlocker(25, 1180, 50, 680);

    // 5. Farm Barn & Farm Water Well
    addBlocker(950, 240, 170, 75);
    addBlocker(1140, 360, 32, 24);

    // 6. Workshop Stations (Alchemy, Workbench, Furnace, Anvil)
    addBlocker(1540, 365, 75, 48); // Alchemy Table
    addBlocker(1710, 365, 75, 48); // Workbench
    addBlocker(1870, 345, 75, 52); // Furnace
    addBlocker(1870, 435, 48, 30); // Anvil
    addBlocker(1630, 490, 80, 40); // Picnic table

    // 7. Campfire & Cooking Station
    addBlocker(1550, 1165, 36, 26); // Bonfire
    addBlocker(1800, 1145, 85, 50); // Cooking Station
    addBlocker(1420, 1160, 80, 40); // Picnic table left
    addBlocker(1680, 1160, 80, 40); // Picnic table right

    // 8. Danau Konservasi Deep Water Barrier (Leaves Pier open for walking!)
    // Pier is located at x: 640..720, y: 1050..1160
    // West half of lake
    addBlocker(520, 1260, 240, 220);
    // East half of lake
    addBlocker(820, 1260, 220, 220);
    // Bottom center of lake
    addBlocker(680, 1370, 160, 80);

    // 9. Interior Tree Groves (Natural obstacles with soft footprints)
    const groveBlockers = [
      { x: 380, y: 440 },
      { x: 360, y: 580 },
      { x: 1380, y: 420 },
      { x: 1390, y: 560 },
      { x: 1100, y: 1040 },
      { x: 1100, y: 1190 },
      { x: 1100, y: 1340 },
      { x: 1250, y: 1100 },
      { x: 1250, y: 1260 },
    ];
    groveBlockers.forEach(g => {
      addBlocker(g.x, g.y + 20, 40, 20);
    });
  }

  private createInteractiveTriggers(): void {
    this.triggers = [];

    const addTrigger = (
      id: string,
      name: string,
      x: number,
      y: number,
      w: number,
      h: number,
      type: 'building_entrance' | 'shop' | 'npc' | 'interactive_board' | 'seating',
      promptText: string,
      data: Record<string, unknown>
    ) => {
      const info: InteractiveTrigger = {
        id,
        name,
        type,
        promptText,
        data,
      };
      const zone = this.add.zone(x, y, w, h);
      this.physics.add.existing(zone, true);
      this.triggers.push({ zone, info });
    };

    // 1. West Exit to School Campus
    addTrigger(
      'trigger-exit-to-school',
      'Gerbang Barat Menuju Kampus SMP Al-Ittihadiyah',
      60,
      768,
      90,
      100,
      'building_entrance',
      'Tekan [E] atau Ketuk untuk Kembali ke Kampus SMP Al-Ittihadiyah',
      {
        title: 'Gerbang Kampus SMP Terpadu Al-Ittihadiyah',
        desc: 'Melangkah kembali ke halaman utama kampus SMP Al-Ittihadiyah di samping Gazebo Literasi.',
        action: 'return_to_school',
      }
    );

    // 2. Sentra Agrowisata & Kebun Sayur Organik P5
    addTrigger(
      'trigger-outskirts-kebun',
      'Sentra Agrowisata & Kebun Sayur Organik P5',
      740,
      440,
      140,
      120,
      'interactive_board',
      'Tekan [E] atau Ketuk untuk Informasi Kebun Edukasi P5',
      {
        title: 'Sentra Pertanian Mandiri & Kebun Edukasi P5',
        desc: 'Wahana pembelajaran agrikultur organik ramah lingkungan. Dikelola terpadu oleh santri dan guru pembimbing projek P5 SMP Terpadu Al-Ittihadiyah.',
        features: [
          'Budidaya Sayuran Organik Bebas Pestisida Kimia (Sawi, Kangkung, Cabai Rawit)',
          'Siklus Pengolahan Pupuk Kompos Organik dari Sisa Bahan Kantin & Dedaunan',
          'Sistem Irigasi Air Resapan Berkelanjutan & Pemeliharaan Tanah Subur',
        ],
      }
    );

    // 3. Lumbung Pangan & Benih Mandiri
    addTrigger(
      'trigger-outskirts-barn',
      'Lumbung Pangan & Sentra Benih Mandiri',
      950,
      250,
      150,
      90,
      'interactive_board',
      'Tekan [E] atau Ketuk untuk Masuk ke Lumbung Pangan',
      {
        title: 'Lumbung Cadangan Pangan Al-Ittihadiyah',
        desc: 'Fasilitas lumbung penyimpanan pasokan gabah, jagung hibrida, serta bank benih tanaman pangan unggul lokal.',
        features: [
          'Kapasitas Penyimpanan Cadangan Pangan Santri Mandiri',
          'Bank Benih Unggul Sayuran dan Palawija Berkualitas',
          'Pengeringan Alami Bebas Bahan Pengawet Sintetis',
        ],
      }
    );

    // 4. Laboratorium Biofarmaka & Herbal (Alchemy Table)
    addTrigger(
      'trigger-outskirts-alchemy',
      'Laboratorium Biofarmaka & Herbal Alami (TOGA)',
      1540,
      360,
      90,
      80,
      'interactive_board',
      'Tekan [E] atau Ketuk untuk Riset Tanaman Obat Biofarmaka',
      {
        title: 'Laboratorium Biofarmaka & Ekstrak Herbal Nusantara',
        desc: 'Sentra riset siswa untuk mengeksplorasi tanaman obat keluarga (TOGA) dan pemanfaatan bahan herbal berkhasiat.',
        features: [
          'Destilasi Minyak Atsiri Sereh Wangi dan Minyak Kayu Putih Alami',
          'Formulasi Minuman Herbal Tradisional Peningkat Daya Tahan Tubuh',
          'Pembuatan Sabun Cuci Tangan Alami Ramah Lingkungan',
        ],
      }
    );

    // 5. Bengkel Kriya & Pertukangan Kayu (Workbench)
    addTrigger(
      'trigger-outskirts-workbench',
      'Bengkel Kriya & Pertukangan Kayu',
      1710,
      360,
      90,
      80,
      'interactive_board',
      'Tekan [E] atau Ketuk untuk Mengakses Bengkel Kriya',
      {
        title: 'Bengkel Kriya & Keterampilan Vokasional Kayu',
        desc: 'Fasilitas pembinaan kecakapan hidup pertukangan, rancang bangun perabot sekolah, dan daur ulang limbah kayu ramah lingkungan.',
        features: [
          'Pelatihan Pertukangan Kayu & Pahat Geometris Tradisional',
          'Perbaikan Mandiri Sarana Meja dan Kursi Kelas',
          'Pembuatan Rak Vertikal Hidroponik & Kotak Semai Bibit',
        ],
      }
    );

    // 6. Sentra Tempa & Perawatan Perkakas Tani
    addTrigger(
      'trigger-outskirts-anvil',
      'Sentra Tempa & Perawatan Perkakas Tani',
      1870,
      400,
      90,
      90,
      'interactive_board',
      'Tekan [E] atau Ketuk untuk Melihat Perkakas Pertanian',
      {
        title: 'Sentra Tempa & Perawatan Perkakas Pertanian',
        desc: 'Pusat perawatan dan penempaan alat pertanian: mata cangkul, garpu tanah, arit rumput, dan gunting pangkas ranting.',
      }
    );

    // 7. Bumi Perkemahan Pramuka & Lingkar Api Unggun
    addTrigger(
      'trigger-outskirts-bonfire',
      'Bumi Perkemahan Pramuka & Lingkar Api Unggun',
      1550,
      1160,
      110,
      100,
      'interactive_board',
      'Tekan [E] atau Ketuk untuk Bergabung di Api Unggun Pramuka',
      {
        title: 'Bumi Perkemahan Pramuka & Lingkar Api Unggun',
        desc: 'Arena terbuka kepanduan Al-Ittihadiyah untuk melatih kemandirian, kekompakan tim, dan kecintaan pada pelestarian alam.',
        features: [
          'Kegiatan Renungan Malam & Pentas Seni Api Unggun',
          'Latihan Baris-Berbaris, Pionering, dan Sandi Pramuka',
          'Pengamatan Langit Malam & Falakiyah Menggunakan Teropong',
        ],
      }
    );

    // 8. Dapur Alam & Sentra Kuliner Tradisional
    addTrigger(
      'trigger-outskirts-dapur',
      'Dapur Alam Tradisional & Sentra Kuliner Nusantara',
      1800,
      1140,
      100,
      90,
      'shop',
      'Tekan [E] atau Ketuk untuk Jajan di Dapur Alam',
      {
        shopName: 'Dapur Alam Bumi Perkemahan Al-Ittihadiyah',
        items: [
          { name: 'Nasi Liwet Kastrol Komplit', price: 12000, desc: 'Nasi gurih harum dengan ikan asin, tahu tempe, lalapan segar (+50 Energi)' },
          { name: 'Jagung Bakar Madu Hutan', price: 5000, desc: 'Jagung manis panen kebun dibakar bumbu madu lezat (+20 Energi)' },
          { name: 'Ubi Madu Cilembu Kukus', price: 4000, desc: 'Ubi manis legit hangat sumber karbohidrat sehat (+15 Energi)' },
          { name: 'Wedang Jahe Serai Hangat', price: 4000, desc: 'Rebusan jahe merah dan serai menghangatkan badan di malam hari (+15 Energi)' },
          { name: 'Air Kelapa Muda Segar', price: 7000, desc: 'Elektrolit alami menyegarkan badan setelah berkeliling kebun (+30 Energi)' },
        ],
      }
    );

    // 9. Danau Konservasi & Kolam Budidaya Nila (Dermaga Pancing)
    addTrigger(
      'trigger-outskirts-danau',
      'Dermaga Danau Konservasi & Kolam Nila',
      680,
      1090,
      120,
      80,
      'interactive_board',
      'Tekan [E] atau Ketuk untuk Menikmati Danau Konservasi',
      {
        title: 'Danau Konservasi Air Tawar & Kolam Ikan Nila',
        desc: 'Ekosistem air terpadu penampung air hujan (bioretensi) sekaligus media budidaya perikanan air tawar ramah lingkungan.',
        features: [
          'Budidaya Ikan Nila Hitam, Nila Merah, dan Gurame',
          'Kolam Resapan Alami untuk Pengendalian Erosi Tanah',
          'Spot Observasi Keanekaragaman Hayati Perairan Tawar',
        ],
      }
    );
  }

  private spawnOutskirtsNPCs(): void {
    this.npcs = [];
    this.npcsGroup = this.physics.add.group();

    const outskirtsNPCConfigs: NPCConfig[] = [
      // 1. Kang Dedi - Ketua Poktan Agrowisata (Patrolling along farm trail)
      {
        id: 'npc-kang-dedi',
        name: 'Kang Dedi',
        role: 'Fasilitator Pertanian Organik',
        characterKey: 'char_satpam',
        avatarUrl: '/assets/game/characters/farhan_spritesheet.png',
        speed: 55,
        waypoints: [
          { x: 880, y: 620, waitTime: 3500 },
          { x: 920, y: 480, waitTime: 3000 },
          { x: 950, y: 350, waitTime: 3500 },
          { x: 740, y: 440, waitTime: 3000 },
        ],
        dialogue: {
          greeting: 'Sampurasun! Selamat datang di Kebun Edukasi Al-Ittihadiyah.',
          quote: '“Semua sayuran di sini ditanam dengan pupuk kompos organik buatan santri sendiri. Tanah yang subur menghasilkan generasi yang cerdas dan mandiri!”',
        },
      },

      // 2. Kak Bima - Instruktur Pramuka Penggalang (Patrolling around campfire clearing)
      {
        id: 'npc-kak-bima',
        name: 'Kak Bima',
        role: 'Pembina Kepanduan & Survival Alam',
        characterKey: 'char_guru_pria',
        avatarUrl: '/assets/game/characters/guru_spritesheet.png',
        speed: 50,
        waypoints: [
          { x: 1450, y: 1160, waitTime: 4000 },
          { x: 1550, y: 1220, waitTime: 3000 },
          { x: 1650, y: 1160, waitTime: 4000 },
          { x: 1550, y: 1100, waitTime: 3000 },
        ],
        dialogue: {
          greeting: 'Salam Pramuka! Siap menjelajahi alam terbuka?',
          quote: '“Tinggalkan hanya jejak kaki, jangan tinggalkan sampah. Kemandirian dan kepedulian alam yang kita pelajari di perkemahan adalah cermin akhlak santri sejati.”',
        },
      },

      // 3. Ustadz Falak - Peneliti Biofarmaka & Falakiyah (At Workshop deck)
      {
        id: 'npc-ustadz-falak',
        name: 'Ustadz Falak',
        role: 'Peneliti Herbal & Falakiyah',
        characterKey: 'char_pa_qodi',
        avatarUrl: '/assets/game/characters/pa_qodi_spritesheet.png',
        speed: 45,
        waypoints: [
          { x: 1540, y: 430, waitTime: 5000 },
          { x: 1620, y: 430, waitTime: 4000 },
        ],
        dialogue: {
          greeting: "Assalamu'alaikum wr. wb. Selamat datang di lab alam hayati.",
          quote: '“Tumbuh-tumbuhan adalah apotek hidup ciptaan Allah. Meneliti khasiat sereh, jahe merah, dan temulawak menumbuhkan rasa takzim kita pada ilmu pengetahuan.”',
        },
      },

      // 4. Mbah Sastro - Empu Kriya Tradisional (At Workshop deck)
      {
        id: 'npc-mbah-sastro',
        name: 'Mbah Sastro',
        role: 'Instruktur Kriya & Perkakas',
        characterKey: 'char_pak_dafa',
        avatarUrl: '/assets/game/characters/pak_dafa_spritesheet.png',
        speed: 45,
        waypoints: [
          { x: 1710, y: 430, waitTime: 5000 },
          { x: 1780, y: 430, waitTime: 4000 },
        ],
        dialogue: {
          greeting: 'Monggo pinarak, mari belajar merawat perkakas dan kayu.',
          quote: '“Setiap kayu punya serat dan karakternya sendiri. Dengan kesabaran dan ketelitian, kayu bekas dapat menjelma menjadi karya yang berdaya guna.”',
        },
      },
    ];

    for (const config of outskirtsNPCConfigs) {
      const npc = new NPC(this, config);
      this.npcs.push(npc);
      this.npcsGroup.add(npc);
    }

    this.physics.add.collider(this.npcsGroup, this.blockers);
    this.physics.add.collider(this.player, this.npcsGroup);
  }

  private setupReactEventBridge(): void {
    this.boundHandlers.joystick = (data: { x: number; y: number }) => {
      this.inputManager?.setVirtualMovement(data.x, data.y);
    };
    this.game.events.on('input:joystick', this.boundHandlers.joystick);

    this.boundHandlers.sprint = (isSprinting: boolean) => {
      this.inputManager?.setVirtualSprint(isSprinting);
    };
    this.game.events.on('input:sprint', this.boundHandlers.sprint);

    this.boundHandlers.interact = () => {
      this.inputManager?.triggerVirtualInteract();
    };
    this.game.events.on('input:interact', this.boundHandlers.interact);

    this.boundHandlers.changeChar = (data: { key: string; name: string; role: string }) => {
      if (!this.player) return;
      this.player.switchCharacter(data.key, data.name, data.role);
    };
    this.game.events.on('player:change-character', this.boundHandlers.changeChar);

    this.boundHandlers.deviceMode = (mode: DeviceMode) => {
      this.currentDeviceMode = mode;
      this.applyAdaptiveZoom(mode);
    };
    this.game.events.on('device:mode-change', this.boundHandlers.deviceMode);

    this.boundHandlers.modalClosed = () => {
      if (this.activeTalkingNPC) {
        this.activeTalkingNPC.resumePatrol();
        this.activeTalkingNPC = null;
      }
    };
    this.game.events.on('modal:closed', this.boundHandlers.modalClosed);

    // Primary interact trigger
    this.inputManager.onInteract(() => {
      if (this.currentNearTrigger) {
        // Exit back to school campus
        if (this.currentNearTrigger.id === 'trigger-exit-to-school') {
          this.returnToSchool();
          return;
        }

        if (this.activeTalkingNPC) {
          this.activeTalkingNPC.faceTarget(this.player.x, this.player.y);
        }

        this.game.events.emit('town:open-modal', this.currentNearTrigger);
      }
    });
  }

  private applyAdaptiveZoom(mode: DeviceMode): void {
    if (!this.cameras?.main) return;
    if (mode === 'interactive_board') {
      this.cameras.main.setZoom(1.15);
    } else if (mode === 'android') {
      this.cameras.main.setZoom(1.45);
    } else {
      this.cameras.main.setZoom(1.30);
    }
  }

  public returnToSchool(): void {
    if (this.isExiting) return;
    this.isExiting = true;

    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SchoolMapScene', {
        returnPos: { x: 1400, y: 770 },
        characterKey: this.player?.characterKey || this.savedCharKey,
        characterName: this.player?.characterName || this.savedCharName,
        characterRole: this.player?.roleTitle || this.savedCharRole,
      });
    });
  }

  update(time: number, delta: number): void {
    if (!this.player || !this.inputManager || this.isExiting) return;

    // 1. Process 1-8 keys for character switching
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
    this.player.updateMovement(movementVector);
    this.player.setDepth(this.player.y);

    // 3. Update all Outskirts NPCs
    for (const npc of this.npcs) {
      npc.updateNPC(delta);
      npc.setDepth(npc.y);
    }

    // 4. Proximity Trigger Check
    let nearestTrigger: InteractiveTrigger | null = null;
    let minDistance = 64;

    for (const t of this.triggers) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        t.zone.x,
        t.zone.y
      );

      if (dist < minDistance) {
        minDistance = dist;
        nearestTrigger = t.info;
      }
    }

    // 5. NPC Proximity Check
    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (dist < 55 && dist < minDistance) {
        minDistance = dist;
        nearestTrigger = {
          id: `npc-${npc.npcId}`,
          name: `${npc.npcName} (${npc.npcRole})`,
          type: 'npc',
          promptText: `Tekan [E] atau Ketuk untuk berbicara dengan ${npc.npcName}`,
          data: {
            title: npc.npcName,
            role: npc.npcRole,
            desc: npc.dialogue.greeting,
            quote: npc.dialogue.quote,
          },
        };
        this.activeTalkingNPC = npc;
      }
    }

    if (!nearestTrigger) {
      this.activeTalkingNPC = null;
    }

    if (nearestTrigger?.id !== this.currentNearTrigger?.id) {
      this.currentNearTrigger = nearestTrigger;
      this.game.events.emit('town:interaction-prompt', nearestTrigger);
    }
  }

  shutdown(): void {
    if (this.boundHandlers.joystick) {
      this.game.events.off('input:joystick', this.boundHandlers.joystick);
    }
    if (this.boundHandlers.sprint) {
      this.game.events.off('input:sprint', this.boundHandlers.sprint);
    }
    if (this.boundHandlers.interact) {
      this.game.events.off('input:interact', this.boundHandlers.interact);
    }
    if (this.boundHandlers.changeChar) {
      this.game.events.off('player:change-character', this.boundHandlers.changeChar);
    }
    if (this.boundHandlers.deviceMode) {
      this.game.events.off('device:mode-change', this.boundHandlers.deviceMode);
    }
    if (this.boundHandlers.modalClosed) {
      this.game.events.off('modal:closed', this.boundHandlers.modalClosed);
    }
    this.numericKeys.forEach(k => k.destroy());
    this.numericKeys = [];
  }
}
