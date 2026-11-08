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

    // 1. Build Layered Landscape Ground
    this.createGround(worldWidth, worldHeight);

    // 2. Build Environmental Props & Stations
    this.createPropsAndStations();

    // 3. Build Colliders & Map Perimeter Bounds
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

  private createGround(worldWidth: number, worldHeight: number): void {
    // 1. Base Lush Forest Grass across entire world
    this.add.tileSprite(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 'tile_crawler_grass').setDepth(0);

    // 2. Tilled Agricultural Soil Zone (Kebun Sayur & Lahan Tani)
    // Centered around x: 820, y: 430
    this.add.tileSprite(820, 430, 800, 480, 'tile_crawler_dirt').setDepth(1);

    // 3. Natural Conservation Lake (Kolam Air Tawar & Resapan Bioretensi)
    // Centered around x: 680, y: 1240
    this.add.tileSprite(680, 1240, 620, 360, 'tile_crawler_water').setDepth(1);

    // 4. Wooden Deck Platform for Workshop & Eco-Lab (Timur-Utara)
    // Centered around x: 1720, y: 400
    this.add.tileSprite(1720, 400, 560, 340, 'tile_crawler_wood').setDepth(1);

    // 5. Wooden Pier extending into the lake
    this.add.tileSprite(680, 1100, 160, 64, 'tile_crawler_wood').setDepth(2);

    // 6. Natural Cobblestone Trails
    // Main East-West Highway connecting West gate to East workshop
    this.add.tileSprite(worldWidth / 2, 768, worldWidth, 80, 'tile_crawler_stone').setDepth(2);

    // North branch into Farm & Barn
    this.add.tileSprite(1024, 560, 80, 360, 'tile_crawler_stone').setDepth(2);

    // South branch to Campfire & Culinary Center
    this.add.tileSprite(1550, 960, 80, 320, 'tile_crawler_stone').setDepth(2);

    // South branch to Lake Pier
    this.add.tileSprite(680, 960, 80, 320, 'tile_crawler_stone').setDepth(2);
  }

  private createPropsAndStations(): void {
    // ═══════════════════════════════════════════════════════════
    // A. WEST GATE: Connection back to SMP Al-Ittihadiyah
    // ═══════════════════════════════════════════════════════════
    const gateY = 768;
    this.add.image(60, gateY - 60, 'tree_oak_l').setDepth(gateY - 60);
    this.add.image(60, gateY + 60, 'tree_oak_l').setDepth(gateY + 60);

    // Direction Signpost & Glowing Door Marker
    const marker = this.add.image(60, gateY, 'door_marker').setDepth(5).setScale(1.2);
    this.tweens.add({
      targets: marker,
      alpha: { from: 0.55, to: 1.0 },
      yoyo: true,
      repeat: -1,
      duration: 900,
    });

    this.add.text(70, gateY - 45, '← Kampus SMP', {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '11px',
      color: '#fef08a',
      stroke: '#0f172a',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setDepth(gateY + 10);

    // ═══════════════════════════════════════════════════════════
    // B. KAWASAN TANI & KEBUN SAYUR ORGANIK P5 (North-Center)
    // ═══════════════════════════════════════════════════════════
    // 1. Lumbung Pangan & Benih (Farm Barn)
    this.add.image(950, 240, 'farm_barn').setDepth(240).setScale(1.25);

    // 2. Scarecrow in middle of crop field
    this.add.image(740, 420, 'farm_scarecrow').setDepth(420);

    // 3. Crops & Garden Beds
    const cropPositions = [
      { x: 550, y: 320 }, { x: 630, y: 320 }, { x: 710, y: 320 },
      { x: 550, y: 420 }, { x: 630, y: 420 },
      { x: 550, y: 520 }, { x: 630, y: 520 }, { x: 710, y: 520 },
      { x: 840, y: 480 }, { x: 920, y: 480 }, { x: 1000, y: 480 },
      { x: 840, y: 560 }, { x: 920, y: 560 }, { x: 1000, y: 560 },
    ];
    cropPositions.forEach(pos => {
      this.add.image(pos.x, pos.y, 'farm_crops').setDepth(pos.y);
    });

    // 4. Haystack, Crates, Barrels & Water Well
    this.add.image(1120, 280, 'farm_haystack').setDepth(280);
    this.add.image(1150, 360, 'farm_water_well').setDepth(360);
    this.add.image(770, 270, 'farm_crates').setDepth(270);
    this.add.image(810, 275, 'farm_barrel').setDepth(275);
    this.add.image(1080, 480, 'farm_crates').setDepth(480);
    this.add.image(1110, 520, 'farm_barrel').setDepth(520);

    // ═══════════════════════════════════════════════════════════
    // C. BENGKEL KRIYA & LABORATORIUM BIOFARMAKA (North-East)
    // ═══════════════════════════════════════════════════════════
    // 1. Laboratorium Herbal & Biofarmaka (Meja Alkimia)
    this.add.image(1540, 360, 'station_alchemy').setDepth(360).setScale(1.15);

    // 2. Bengkel Kriya & Pertukangan Kayu (Workbench)
    this.add.image(1710, 360, 'station_workbench').setDepth(360).setScale(1.15);

    // 3. Sentra Tempa & Pengelasan Logam (Furnace & Anvil)
    this.add.image(1870, 350, 'station_furnace').setDepth(350).setScale(1.15);
    this.add.image(1870, 430, 'station_anvil').setDepth(430).setScale(1.15);

    // Picnic / Meeting Table on Wooden Deck
    this.add.image(1620, 480, 'furn_picnic_table').setDepth(480);

    // ═══════════════════════════════════════════════════════════
    // D. BUMI PERKEMAHAN PRAMUKA & SENTRA KULINER (South-East)
    // ═══════════════════════════════════════════════════════════
    // 1. Campfire Ring + Animated Flickering Flame
    this.add.sprite(1550, 1160, 'station_bonfire_wood', 0).setDepth(1160).setScale(1.25);
    this.bonfireFlame = this.add.sprite(1550, 1148, 'station_fire_flame', 0).setDepth(1165).setScale(1.15);
    if (this.anims.exists('fire_burn')) {
      this.bonfireFlame.play('fire_burn');
    }

    // Wooden Picnic Tables & Camp Seats around fire
    this.add.image(1440, 1160, 'furn_picnic_table').setDepth(1160);
    this.add.image(1660, 1160, 'furn_picnic_table').setDepth(1160);

    // 2. Dapur Alam Tradisional (Cooking Station)
    this.add.image(1780, 1150, 'station_cooking').setDepth(1150).setScale(1.2);
    this.add.image(1850, 1180, 'farm_barrel').setDepth(1180);
    this.add.image(1875, 1175, 'farm_crates').setDepth(1175);

    // ═══════════════════════════════════════════════════════════
    // E. DANAU KONSERVASI & DERMAGA IKAN (South-West)
    // ═══════════════════════════════════════════════════════════
    // Lake Shore Decor: Mossy Boulders, Reeds & Water Lilies
    const lakeDecor = [
      { x: 420, y: 1120, key: 'rock_large' },
      { x: 480, y: 1100, key: 'rock_mossy' },
      { x: 940, y: 1150, key: 'rock_large' },
      { x: 970, y: 1220, key: 'rock_mossy' },
      { x: 920, y: 1380, key: 'rock_large' },
      { x: 440, y: 1390, key: 'rock_large' },
      { x: 520, y: 1410, key: 'rock_mossy' },
      { x: 780, y: 1410, key: 'rock_large' },
    ];
    lakeDecor.forEach(d => {
      this.add.image(d.x, d.y, d.key).setDepth(d.y);
    });

    // Picnic bench beside the lake pier
    this.add.image(680, 1040, 'furn_picnic_table').setDepth(1040);

    // ═══════════════════════════════════════════════════════════
    // F. NATURAL VEGETATION, BUSHES & FLOWER CLUSTERS
    // ═══════════════════════════════════════════════════════════
    const vegPositions = [
      // Along main trail
      { x: 300, y: 720, key: 'veg_bush_large' },
      { x: 450, y: 720, key: 'veg_bush_flowers' },
      { x: 1200, y: 720, key: 'veg_bush_flowers' },
      { x: 1350, y: 720, key: 'veg_bush_large' },
      { x: 320, y: 820, key: 'veg_shrub' },
      { x: 480, y: 820, key: 'veg_flowers' },
      { x: 1220, y: 820, key: 'veg_shrub' },
      { x: 1380, y: 820, key: 'veg_flowers' },

      // Around farm
      { x: 480, y: 220, key: 'veg_bush_flowers' },
      { x: 740, y: 180, key: 'veg_flowers' },
      { x: 1180, y: 220, key: 'veg_bush_large' },

      // Around scout camp
      { x: 1420, y: 1040, key: 'veg_bush_large' },
      { x: 1680, y: 1040, key: 'veg_bush_flowers' },
      { x: 1480, y: 1270, key: 'veg_shrub' },
      { x: 1620, y: 1270, key: 'veg_flowers' },
      { x: 1900, y: 1120, key: 'veg_bush_large' },
    ];
    vegPositions.forEach(v => {
      this.add.image(v.x, v.y, v.key).setDepth(v.y);
    });
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

    // 1. NORTH PERIMETER FOREST
    for (let x = 40; x < worldWidth; x += 110) {
      this.add.image(x, 50, 'tree_pine_m').setDepth(50);
      addBlocker(x, 60, 80, 30);
    }

    // 2. SOUTH PERIMETER FOREST
    for (let x = 40; x < worldWidth; x += 110) {
      this.add.image(x, worldHeight - 50, 'tree_pine_m').setDepth(worldHeight - 50);
      addBlocker(x, worldHeight - 40, 80, 30);
    }

    // 3. EAST PERIMETER FOREST
    for (let y = 100; y < worldHeight - 50; y += 120) {
      this.add.image(worldWidth - 50, y, 'tree_oak_l').setDepth(y);
      addBlocker(worldWidth - 40, y, 40, 70);
    }

    // 4. WEST PERIMETER FOREST (with gap at y: 720..820 for Gate)
    for (let y = 100; y < worldHeight - 50; y += 120) {
      if (y >= 680 && y <= 840) continue; // leave gateway clear
      this.add.image(40, y, 'tree_oak_l').setDepth(y);
      addBlocker(35, y, 40, 70);
    }

    // 5. Farm Barn Collider
    addBlocker(950, 245, 150, 70);

    // 6. Farm Water Well Collider
    addBlocker(1150, 370, 30, 24);

    // 7. Workshop Stations Colliders
    addBlocker(1540, 370, 70, 45); // Alchemy Table
    addBlocker(1710, 370, 70, 45); // Workbench
    addBlocker(1870, 360, 70, 50); // Furnace
    addBlocker(1870, 440, 45, 30); // Anvil

    // 8. Campfire & Cooking Station Colliders
    addBlocker(1550, 1165, 36, 26); // Bonfire
    addBlocker(1780, 1160, 90, 55); // Cooking Station

    // 9. Lake Deep Water Barrier
    // Left barrier of lake
    addBlocker(400, 1260, 20, 300);
    // Right barrier of lake
    addBlocker(960, 1260, 20, 300);
    // Bottom barrier of lake
    addBlocker(680, 1420, 540, 20);
    // Top-left lake bank
    addBlocker(520, 1100, 220, 20);
    // Top-right lake bank
    addBlocker(840, 1100, 220, 20);

    // 10. Grove of Trees separating campsite from lake
    const interiorTrees = [
      { x: 1100, y: 1050, key: 'tree_pine_m' },
      { x: 1100, y: 1200, key: 'tree_pine_s' },
      { x: 1100, y: 1350, key: 'tree_pine_m' },
      { x: 1250, y: 1120, key: 'tree_oak_m' },
      { x: 1250, y: 1280, key: 'tree_oak_m' },
      { x: 1400, y: 400, key: 'tree_oak_l' },
      { x: 1400, y: 550, key: 'tree_pine_m' },
      { x: 380, y: 400, key: 'tree_oak_m' },
      { x: 380, y: 550, key: 'tree_oak_l' },
    ];
    interiorTrees.forEach(t => {
      this.add.image(t.x, t.y, t.key).setDepth(t.y);
      addBlocker(t.x, t.y + 30, 36, 20);
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
      420,
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
      1780,
      1150,
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

    // 9. Danau Konservasi & Kolam Budidaya Nila
    addTrigger(
      'trigger-outskirts-danau',
      'Dermaga Danau Konservasi & Kolam Nila',
      680,
      1090,
      140,
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
      // 1. Kang Dedi - Ketua Poktan Agrowisata
      {
        id: 'npc-kang-dedi',
        name: 'Kang Dedi',
        role: 'Fasilitator Pertanian Organik',
        characterKey: 'char_satpam',
        avatarUrl: '/assets/game/characters/farhan_spritesheet.png',
        speed: 55,
        waypoints: [
          { x: 740, y: 350, waitTime: 3500 },
          { x: 920, y: 350, waitTime: 3000 },
          { x: 920, y: 520, waitTime: 3500 },
          { x: 620, y: 520, waitTime: 3000 },
        ],
        dialogue: {
          greeting: 'Sampurasun! Selamat datang di Kebun Edukasi Al-Ittihadiyah.',
          quote: '“Semua sayuran di sini ditanam dengan pupuk kompos organik buatan santri sendiri. Tanah yang subur menghasilkan generasi yang cerdas dan mandiri!”',
        },
      },

      // 2. Kak Bima - Instruktur Pramuka Penggalang
      {
        id: 'npc-kak-bima',
        name: 'Kak Bima',
        role: 'Pembina Kepanduan & Survival Alam',
        characterKey: 'char_guru_pria',
        avatarUrl: '/assets/game/characters/guru_spritesheet.png',
        speed: 50,
        waypoints: [
          { x: 1470, y: 1160, waitTime: 4000 },
          { x: 1550, y: 1220, waitTime: 3000 },
          { x: 1630, y: 1160, waitTime: 4000 },
          { x: 1550, y: 1100, waitTime: 3000 },
        ],
        dialogue: {
          greeting: 'Salam Pramuka! Siap menjelajahi alam terbuka?',
          quote: '“Tinggalkan hanya jejak kaki, jangan tinggalkan sampah. Kemandirian dan kepedulian alam yang kita pelajari di perkemahan adalah cermin akhlak santri sejati.”',
        },
      },

      // 3. Ustadz Falak - Peneliti Biofarmaka & Falakiyah
      {
        id: 'npc-ustadz-falak',
        name: 'Ustadz Falak',
        role: 'Peneliti Herbal & Falakiyah',
        characterKey: 'char_pa_qodi',
        avatarUrl: '/assets/game/characters/pa_qodi_spritesheet.png',
        speed: 45,
        waypoints: [
          { x: 1540, y: 440, waitTime: 5000 },
          { x: 1600, y: 440, waitTime: 4000 },
        ],
        dialogue: {
          greeting: "Assalamu'alaikum wr. wb. Selamat datang di lab alam hayati.",
          quote: '“Tumbuh-tumbuhan adalah apotek hidup ciptaan Allah. Meneliti khasiat sereh, jahe merah, dan temulawak menumbuhkan rasa takzim kita pada ilmu pengetahuan.”',
        },
      },

      // 4. Mbah Sastro - Empu Kriya Tradisional
      {
        id: 'npc-mbah-sastro',
        name: 'Mbah Sastro',
        role: 'Instruktur Kriya & Perkakas',
        characterKey: 'char_pak_dafa',
        avatarUrl: '/assets/game/characters/pak_dafa_spritesheet.png',
        speed: 45,
        waypoints: [
          { x: 1710, y: 440, waitTime: 5000 },
          { x: 1770, y: 440, waitTime: 4000 },
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
