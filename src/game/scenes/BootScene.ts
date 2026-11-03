import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x0f172a, 0.9);
    progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 20, 320, 40, 10);

    const loadingText = this.add.text(width / 2, height / 2 - 40, 'Memuat Dunia Indonesian Life RP...', {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '15px',
      color: '#f8fafc',
    }).setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x0284c7, 1);
      progressBar.fillRoundedRect(width / 2 - 150, height / 2 - 10, 300 * value, 20, 6);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // -------------------------------------------------------------
    // LOAD HIGH-FIDELITY ASSETS FROM /assets/game/
    // -------------------------------------------------------------
    // Tilesets
    this.load.image('tile_grass', '/assets/game/tilesets/tile_grass.png');
    this.load.image('tile_road', '/assets/game/tilesets/tile_road.png');
    this.load.image('tile_sidewalk', '/assets/game/tilesets/tile_sidewalk.png');
    this.load.image('tile_crosswalk', '/assets/game/tilesets/tile_crosswalk.png');

    // Buildings
    this.load.image('building_school', '/assets/game/buildings/building_school.png');
    this.load.image('building_warung', '/assets/game/buildings/building_warung.png');
    this.load.image('building_balai', '/assets/game/buildings/building_balai.png');

    // Props
    this.load.image('prop_tree_beringin', '/assets/game/props/prop_tree_beringin.png');
    this.load.image('prop_flagpole', '/assets/game/props/prop_flagpole.png');
    this.load.image('prop_board', '/assets/game/props/prop_smart_board.png');
    this.load.image('prop_lamp', '/assets/game/props/prop_street_lamp.png');

    // Character Spritesheets (4x4 = 16 frames, 64x64 each)
    this.load.spritesheet('char_teacher', '/assets/game/characters/guru_spritesheet.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('char_student', '/assets/game/characters/siswa_spritesheet.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create(): void {
    this.createCharacterAnimations();
    this.scene.start('MainTownScene');
  }

  private createCharacterAnimations(): void {
    // Walk Down: Row 0 (frames 0, 1, 2, 3)
    if (!this.anims.exists('walk_down')) {
      this.anims.create({
        key: 'walk_down',
        frames: this.anims.generateFrameNumbers('char_teacher', { frames: [0, 1, 2, 3] }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Walk Left: Row 1 (frames 4, 5, 6, 7)
    if (!this.anims.exists('walk_left')) {
      this.anims.create({
        key: 'walk_left',
        frames: this.anims.generateFrameNumbers('char_teacher', { frames: [4, 5, 6, 7] }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Walk Right: Row 2 (frames 8, 9, 10, 11)
    if (!this.anims.exists('walk_right')) {
      this.anims.create({
        key: 'walk_right',
        frames: this.anims.generateFrameNumbers('char_teacher', { frames: [8, 9, 10, 11] }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Walk Up: Row 3 (frames 12, 13, 14, 15)
    if (!this.anims.exists('walk_up')) {
      this.anims.create({
        key: 'walk_up',
        frames: this.anims.generateFrameNumbers('char_teacher', { frames: [12, 13, 14, 15] }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }
}
