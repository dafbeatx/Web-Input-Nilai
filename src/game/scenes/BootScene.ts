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
    // Modular School Map & Objects (school_map_modular_phaser3)
    this.load.tilemapTiledJSON('school-ground', '/assets/maps/school_ground.json');
    this.load.image('ground-tiles', '/assets/tilesets/ground_tileset.png');
    this.load.json('school-objects', '/assets/maps/school_objects.json');

    // 12 Modular Buildings
    const modularBuildings = [
      'main_building', 'school_gate', 'computer_lab', 'library', 'teachers_room',
      'classroom_vii', 'classroom_viii', 'classroom_ix', 'mosque', 'canteen', 'uks_clinic', 'gazebo'
    ];
    modularBuildings.forEach(b => this.load.image(b, `/assets/buildings/${b}.png`));

    // 32 Modular Props
    const modularProps = [
      'tree_round_a', 'tree_round_b', 'tree_round_c', 'tree_conifer', 'bench_long', 'bench_short',
      'table_wood', 'trash_green', 'trash_gray', 'notice_board_small', 'flower_bush', 'trash_can_small',
      'chair_bench', 'bookshelf', 'whiteboard', 'display_shelf', 'garden_bench', 'potted_plant',
      'flagpole', 'street_lamp_a', 'street_lamp_b', 'bulletin_board', 'school_sign', 'flower_pot_a',
      'flower_pot_b', 'shrub_green_a', 'shrub_green_b', 'shrub_yellow', 'shrub_pink', 'shrub_white',
      'rock_small', 'sports_court'
    ];
    modularProps.forEach(p => this.load.image(p, `/assets/props/${p}.png`));

    // Tilemap & Atlas (SMP Terpadu Al-Ittihadiyah)
    // Loads live cloud database / dynamic map from API route with timestamp cache-buster
    this.load.tilemapTiledJSON('school_map', `/api/game/map?t=${Date.now()}`);
    this.load.image('school_atlas', '/assets/maps/school_atlas.png');

    // Tilesets
    this.load.image('tile_grass', '/assets/game/tilesets/tile_grass.png');
    this.load.image('tile_road', '/assets/game/tilesets/tile_road.png');
    this.load.image('tile_sidewalk', '/assets/game/tilesets/tile_sidewalk.png');
    this.load.image('tile_crosswalk', '/assets/game/tilesets/tile_crosswalk.png');

    // Classroom Interior & Interactive Markers (classroom_design_package)
    this.load.image('classroom_bg', '/assets/classroom_interior/classroom_interior_clean.png');
    this.load.image('desk_student_pair', '/assets/classroom_interior/student_desk_pair.png');
    this.load.image('desk_teacher_unit', '/assets/classroom_interior/teacher_desk_unit.png');
    this.load.image('marker_door_arrow', '/assets/classroom_interior/door_marker_arrow.png');
    this.load.image('marker_door_pad', '/assets/classroom_interior/door_marker_pad.png');
    this.load.image('blackboard_green', '/assets/classroom_interior/blackboard_green.png');

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
    const characters = [
      { key: 'char_farhan', path: '/assets/game/characters/farhan_spritesheet.png' },
      { key: 'char_pak_dafa', path: '/assets/game/characters/pak_dafa_spritesheet.png' },
      { key: 'char_septi', path: '/assets/game/characters/septi_spritesheet.png' },
      { key: 'char_satpam', path: '/assets/game/characters/satpam_spritesheet.png' },
      { key: 'char_student', path: '/assets/game/characters/siswa_spritesheet.png' },
      { key: 'char_siswi_hijab', path: '/assets/game/characters/siswi_hijab_spritesheet.png' },
      { key: 'char_guru_pria', path: '/assets/game/characters/guru_spritesheet.png' },
      { key: 'char_guru_wanita', path: '/assets/game/characters/guru_wanita_spritesheet.png' },
    ];

    characters.forEach(char => {
      this.load.spritesheet(char.key, char.path, {
        frameWidth: 64,
        frameHeight: 64,
      });
    });

    // Aisyah Putri Individual Per-Frame Textures
    const aisyahDirs = ['down', 'left', 'right', 'up'];
    aisyahDirs.forEach(dir => {
      for (let i = 1; i <= 4; i++) {
        const frameKey = `aisyah_${dir}_${i}`;
        this.load.image(frameKey, `/assets/game/characters/aisyah_putri_perframe/${frameKey}.png`);
      }
    });
  }

  create(): void {
    this.createAllCharacterAnimations();
    this.scene.start('SchoolMapScene');
  }

  private createAllCharacterAnimations(): void {
    const characterKeys = [
      'char_farhan',
      'char_pak_dafa',
      'char_septi',
      'char_satpam',
      'char_student',
      'char_siswi_hijab',
      'char_guru_pria',
      'char_guru_wanita',
    ];

    characterKeys.forEach(charKey => {
      // Walk Down: Row 0 (frames 0, 1, 2, 3)
      const downKey = `${charKey}_walk_down`;
      if (!this.anims.exists(downKey)) {
        this.anims.create({
          key: downKey,
          frames: this.anims.generateFrameNumbers(charKey, { frames: [0, 1, 2, 3] }),
          frameRate: 8,
          repeat: -1,
        });
      }

      // Walk Left: Row 1 (frames 4, 5, 6, 7)
      const leftKey = `${charKey}_walk_left`;
      if (!this.anims.exists(leftKey)) {
        this.anims.create({
          key: leftKey,
          frames: this.anims.generateFrameNumbers(charKey, { frames: [4, 5, 6, 7] }),
          frameRate: 8,
          repeat: -1,
        });
      }

      // Walk Right: Row 2 (frames 8, 9, 10, 11)
      const rightKey = `${charKey}_walk_right`;
      if (!this.anims.exists(rightKey)) {
        this.anims.create({
          key: rightKey,
          frames: this.anims.generateFrameNumbers(charKey, { frames: [8, 9, 10, 11] }),
          frameRate: 8,
          repeat: -1,
        });
      }

      // Walk Up: Row 3 (frames 12, 13, 14, 15)
      const upKey = `${charKey}_walk_up`;
      if (!this.anims.exists(upKey)) {
        this.anims.create({
          key: upKey,
          frames: this.anims.generateFrameNumbers(charKey, { frames: [12, 13, 14, 15] }),
          frameRate: 8,
          repeat: -1,
        });
      }
    });
  }
}
