import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Show a sleek progress bar on screen during boot
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1e293b, 0.8);
    progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 20, 320, 40, 10);

    const loadingText = this.add.text(width / 2, height / 2 - 40, 'Memuat Dunia Nusantara...', {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '16px',
      color: '#f8fafc',
    }).setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x6366f1, 1);
      progressBar.fillRoundedRect(width / 2 - 150, height / 2 - 10, 300 * value, 20, 6);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  create(): void {
    this.generateProceduralTextures();
    this.scene.start('MainTownScene');
  }

  /**
   * Generates crisp Indonesian-themed vector graphics textures
   * directly in memory to ensure 100% offline stability with zero asset latency.
   */
  private generateProceduralTextures(): void {
    // 1. Grass Tile (32x32)
    const grass = this.make.graphics({ x: 0, y: 0 });
    grass.fillStyle(0x2d6a4f, 1);
    grass.fillRect(0, 0, 32, 32);
    grass.fillStyle(0x40916c, 0.6);
    grass.fillCircle(8, 10, 3);
    grass.fillCircle(24, 22, 4);
    grass.fillStyle(0x1b4332, 0.4);
    grass.fillRect(14, 14, 4, 4);
    grass.generateTexture('tile_grass', 32, 32);
    grass.destroy();

    // 2. Road Asphalt (64x64)
    const road = this.make.graphics({ x: 0, y: 0 });
    road.fillStyle(0x1e293b, 1);
    road.fillRect(0, 0, 64, 64);
    road.fillStyle(0x334155, 0.4);
    road.fillRect(0, 0, 64, 2);
    road.fillRect(0, 62, 64, 2);
    // White dashed lane marking
    road.fillStyle(0xf8fafc, 0.9);
    road.fillRect(26, 8, 12, 20);
    road.fillRect(26, 36, 12, 20);
    road.generateTexture('tile_road', 64, 64);
    road.destroy();

    // 3. Sidewalk / Paving Trotoar (32x32)
    const trotoar = this.make.graphics({ x: 0, y: 0 });
    trotoar.fillStyle(0x94a3b8, 1);
    trotoar.fillRect(0, 0, 32, 32);
    trotoar.fillStyle(0x64748b, 0.6);
    trotoar.strokeRect(1, 1, 14, 14);
    trotoar.strokeRect(17, 1, 14, 14);
    trotoar.strokeRect(1, 17, 14, 14);
    trotoar.strokeRect(17, 17, 14, 14);
    trotoar.generateTexture('tile_sidewalk', 32, 32);
    trotoar.destroy();

    // 4. Zebra Cross (64x64)
    const zebra = this.make.graphics({ x: 0, y: 0 });
    zebra.fillStyle(0x1e293b, 1);
    zebra.fillRect(0, 0, 64, 64);
    zebra.fillStyle(0xf8fafc, 1);
    zebra.fillRect(6, 4, 10, 56);
    zebra.fillRect(22, 4, 10, 56);
    zebra.fillRect(38, 4, 10, 56);
    zebra.fillRect(54, 4, 10, 56);
    zebra.generateTexture('tile_crosswalk', 64, 64);
    zebra.destroy();

    // 5. Warung Makan / Kelontong Bu Siti (128x100)
    const warung = this.make.graphics({ x: 0, y: 0 });
    // Walls
    warung.fillStyle(0xd97706, 1); // warm wood/ochre
    warung.fillRect(10, 30, 108, 65);
    // Awning stripes (khas warung tenda pecel lele / indomie hijau & kuning)
    const stripeColors = [0x16a34a, 0xfacc15];
    for (let i = 0; i < 8; i++) {
      warung.fillStyle(stripeColors[i % 2], 1);
      warung.fillRect(6 + i * 14, 14, 14, 22);
    }
    // Awning roof overhang
    warung.fillStyle(0x991b1b, 1);
    warung.fillTriangle(6, 36, 118, 36, 62, 2);
    // Counter / Jendela etalase
    warung.fillStyle(0x78350f, 1);
    warung.fillRect(20, 52, 88, 36);
    warung.fillStyle(0xfef3c7, 1);
    warung.fillRect(24, 56, 80, 20);
    // Banner "WARUNG BU SITI"
    warung.fillStyle(0xb91c1c, 1);
    warung.fillRect(16, 34, 96, 14);
    warung.generateTexture('building_warung', 128, 100);
    warung.destroy();

    // 6. Gedung SD Nusantara (200x140)
    const school = this.make.graphics({ x: 0, y: 0 });
    // Main building
    school.fillStyle(0xe2e8f0, 1);
    school.fillRect(10, 40, 180, 95);
    // Red roof
    school.fillStyle(0x991b1b, 1);
    school.fillRect(4, 25, 192, 18);
    school.fillTriangle(4, 25, 100, 2, 196, 25);
    // Windows
    school.fillStyle(0x38bdf8, 0.85);
    school.fillRect(24, 52, 24, 28);
    school.fillRect(56, 52, 24, 28);
    school.fillRect(120, 52, 24, 28);
    school.fillRect(152, 52, 24, 28);
    // Main entrance door
    school.fillStyle(0x475569, 1);
    school.fillRect(86, 75, 28, 60);
    school.fillStyle(0xf1f5f9, 1);
    school.fillCircle(108, 105, 3);
    // School sign banner
    school.fillStyle(0x1e3a8a, 1);
    school.fillRect(50, 36, 100, 12);
    school.generateTexture('building_school', 200, 140);
    school.destroy();

    // 7. Balai Warga / Kelurahan (160x120)
    const balai = this.make.graphics({ x: 0, y: 0 });
    balai.fillStyle(0x0284c7, 1);
    balai.fillRect(10, 35, 140, 80);
    balai.fillStyle(0x075985, 1);
    balai.fillTriangle(0, 35, 80, 5, 160, 35);
    // Pillars
    balai.fillStyle(0xf8fafc, 1);
    balai.fillRect(20, 45, 12, 70);
    balai.fillRect(50, 45, 12, 70);
    balai.fillRect(98, 45, 12, 70);
    balai.fillRect(128, 45, 12, 70);
    balai.generateTexture('building_balai', 160, 120);
    balai.destroy();

    // 8. Indonesian Flagpole (Tiang Bendera Merah Putih) (24x72)
    const flag = this.make.graphics({ x: 0, y: 0 });
    flag.fillStyle(0x94a3b8, 1);
    flag.fillRect(10, 0, 4, 72);
    // Red stripe
    flag.fillStyle(0xef4444, 1);
    flag.fillRect(14, 4, 24, 12);
    // White stripe
    flag.fillStyle(0xf8fafc, 1);
    flag.fillRect(14, 16, 24, 12);
    flag.generateTexture('prop_flagpole', 42, 72);
    flag.destroy();

    // 9. Indonesian Banyan Tree / Pohon Beringin (80x90)
    const tree = this.make.graphics({ x: 0, y: 0 });
    // Trunk
    tree.fillStyle(0x78350f, 1);
    tree.fillRect(34, 45, 14, 45);
    // Foliage canopy (layered circles)
    tree.fillStyle(0x166534, 0.95);
    tree.fillCircle(40, 35, 34);
    tree.fillStyle(0x15803d, 0.9);
    tree.fillCircle(25, 40, 22);
    tree.fillCircle(55, 40, 22);
    tree.fillStyle(0x22c55e, 0.6);
    tree.fillCircle(38, 26, 18);
    tree.generateTexture('prop_tree_beringin', 80, 90);
    tree.destroy();

    // 10. Street Lamp / Lampu Jalan (20x64)
    const lamp = this.make.graphics({ x: 0, y: 0 });
    lamp.fillStyle(0x334155, 1);
    lamp.fillRect(8, 6, 4, 58);
    lamp.fillRect(4, 2, 12, 6);
    // Yellow glow
    lamp.fillStyle(0xfde047, 0.9);
    lamp.fillCircle(10, 8, 5);
    lamp.generateTexture('prop_lamp', 20, 64);
    lamp.destroy();

    // 11. Interactive Smart Board / Papan Informasi Digital (48x54)
    const board = this.make.graphics({ x: 0, y: 0 });
    // Frame
    board.fillStyle(0x0f172a, 1);
    board.fillRoundedRect(4, 4, 40, 32, 4);
    // Screen (cyan glow)
    board.fillStyle(0x06b6d4, 0.9);
    board.fillRect(8, 8, 32, 24);
    // Stand
    board.fillStyle(0x64748b, 1);
    board.fillRect(22, 36, 4, 16);
    board.fillRect(14, 50, 20, 4);
    board.generateTexture('prop_board', 48, 54);
    board.destroy();

    // 12. Player Character Sprite Texture (40x56)
    // We render facing front, back, and side
    this.createPlayerTexture('player_front', 'front');
    this.createPlayerTexture('player_back', 'back');
    this.createPlayerTexture('player_left', 'left');
    this.createPlayerTexture('player_right', 'right');
  }

  private createPlayerTexture(key: string, direction: 'front' | 'back' | 'left' | 'right'): void {
    const char = this.make.graphics({ x: 0, y: 0 });

    // Shadow underneath feet
    char.fillStyle(0x000000, 0.25);
    char.fillEllipse(20, 52, 24, 8);

    // Legs / Pants (Dark Navy)
    char.fillStyle(0x1e293b, 1);
    if (direction === 'left' || direction === 'right') {
      char.fillRect(16, 36, 8, 14);
    } else {
      char.fillRect(13, 36, 6, 14);
      char.fillRect(21, 36, 6, 14);
    }

    // Shoes (Black)
    char.fillStyle(0x0f172a, 1);
    if (direction === 'left' || direction === 'right') {
      char.fillRect(14, 48, 11, 4);
    } else {
      char.fillRect(12, 48, 7, 4);
      char.fillRect(21, 48, 7, 4);
    }

    // Torso / Batik Motif Shirt (Rich Blue / Gold trim)
    char.fillStyle(0x2563eb, 1);
    char.fillRoundedRect(10, 18, 20, 20, 3);
    char.fillStyle(0xf59e0b, 0.8);
    // Batik sash accent
    char.fillRect(18, 18, 4, 20);

    // Arms
    char.fillStyle(0xfbcfe8, 1); // skin tone
    if (direction === 'front') {
      char.fillRect(6, 20, 4, 14);
      char.fillRect(30, 20, 4, 14);
    } else if (direction === 'left') {
      char.fillRect(16, 20, 5, 14);
    } else if (direction === 'right') {
      char.fillRect(19, 20, 5, 14);
    }

    // Head / Face
    char.fillStyle(0xfde047, 0.4); // soft skin tone base
    char.fillStyle(0xfcd34d, 1);
    char.fillCircle(20, 12, 9);

    // Hair (Black)
    char.fillStyle(0x09090b, 1);
    if (direction === 'back') {
      char.fillCircle(20, 10, 10);
    } else {
      char.fillRect(11, 4, 18, 7);
      char.fillCircle(14, 9, 3);
      char.fillCircle(26, 9, 3);
    }

    // Eyes (for front / side)
    if (direction === 'front') {
      char.fillStyle(0x18181b, 1);
      char.fillRect(16, 11, 2, 3);
      char.fillRect(22, 11, 2, 3);
      // Smile
      char.fillRect(18, 16, 4, 1);
    } else if (direction === 'left') {
      char.fillStyle(0x18181b, 1);
      char.fillRect(14, 11, 2, 3);
    } else if (direction === 'right') {
      char.fillStyle(0x18181b, 1);
      char.fillRect(24, 11, 2, 3);
    }

    char.generateTexture(key, 40, 56);
    char.destroy();
  }
}

