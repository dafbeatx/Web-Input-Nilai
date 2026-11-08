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
    this.load.tilemapTiledJSON('outskirts_map', `/api/game/map?map=outskirts&t=${Date.now()}`);
    this.load.image('school_atlas', '/assets/maps/school_atlas.png');

    // Tilesets
    this.load.image('tile_grass', '/assets/game/tilesets/tile_grass.png');
    this.load.image('tile_road', '/assets/game/tilesets/tile_road.png');
    this.load.image('tile_sidewalk', '/assets/game/tilesets/tile_sidewalk.png');
    this.load.image('tile_crosswalk', '/assets/game/tilesets/tile_crosswalk.png');

    // Single Classroom Background + Interactive Door Marker (classroom_single_background_plus_marker)
    this.load.image(
      'classroom_bg',
      '/assets/classroom_single_background_plus_marker/classroom_interior_background.png'
    );
    this.load.image(
      'door_marker',
      '/assets/classroom_single_background_plus_marker/door_interaction_marker.png'
    );

    // Ruang Guru Interior & Marker (ruang_guru_design_package)
    this.load.image(
      'ruang_guru_bg',
      '/assets/ruang_guru_design_package/assets/ruang_guru_background.png'
    );
    this.load.image(
      'ruang_guru_door_marker',
      '/assets/ruang_guru_design_package/assets/door_interaction_marker.png'
    );

    // Buildings
    this.load.image('building_school', '/assets/game/buildings/building_school.png');
    this.load.image('building_warung', '/assets/game/buildings/building_warung.png');
    this.load.image('building_balai', '/assets/game/buildings/building_balai.png');

    // Props
    this.load.image('prop_tree_beringin', '/assets/game/props/prop_tree_beringin.png');
    this.load.image('prop_flagpole', '/assets/game/props/prop_flagpole.png');
    this.load.image('prop_board', '/assets/game/props/prop_smart_board.png');
    this.load.image('prop_lamp', '/assets/game/props/prop_street_lamp.png');

    // -------------------------------------------------------------
    // PIXEL CRAWLER ADVENTURE EXPANSION (Kawasan Agrowisata P5)
    // -------------------------------------------------------------
    // Cohesive High-Fidelity Landscape Atlas (2048x1536)
    this.load.image('outskirts_atlas', '/assets/game/pixel_crawler/outskirts_atlas.png');

    // Pixel Crawler Ground Tiles (64x64)
    this.load.image('tile_crawler_grass', '/assets/game/pixel_crawler/extracted/tile_crawler_grass.png');
    this.load.image('tile_crawler_dirt', '/assets/game/pixel_crawler/extracted/tile_crawler_dirt.png');
    this.load.image('tile_crawler_stone', '/assets/game/pixel_crawler/extracted/tile_crawler_stone.png');
    this.load.image('tile_crawler_wood', '/assets/game/pixel_crawler/extracted/tile_crawler_wood.png');
    this.load.image('tile_crawler_water', '/assets/game/pixel_crawler/extracted/tile_crawler_water.png');

    // Pixel Crawler Props & Trees
    this.load.image('tree_oak_l', '/assets/game/pixel_crawler/extracted/tree_oak_l.png');
    this.load.image('tree_oak_m', '/assets/game/pixel_crawler/extracted/tree_oak_m.png');
    this.load.image('tree_pine_m', '/assets/game/pixel_crawler/extracted/tree_pine_m.png');
    this.load.image('tree_pine_s', '/assets/game/pixel_crawler/extracted/tree_pine_s.png');
    this.load.image('farm_barn', '/assets/game/pixel_crawler/extracted/farm_barn.png');
    this.load.image('farm_scarecrow', '/assets/game/pixel_crawler/extracted/farm_scarecrow.png');
    this.load.image('farm_crops', '/assets/game/pixel_crawler/extracted/farm_crops.png');
    this.load.image('farm_haystack', '/assets/game/pixel_crawler/extracted/farm_haystack.png');
    this.load.image('farm_water_well', '/assets/game/pixel_crawler/extracted/farm_water_well.png');
    this.load.image('farm_crates', '/assets/game/pixel_crawler/extracted/farm_crates.png');
    this.load.image('farm_barrel', '/assets/game/pixel_crawler/extracted/farm_barrel.png');
    this.load.image('veg_bush_large', '/assets/game/pixel_crawler/extracted/veg_bush_large.png');
    this.load.image('veg_bush_flowers', '/assets/game/pixel_crawler/extracted/veg_bush_flowers.png');
    this.load.image('veg_shrub', '/assets/game/pixel_crawler/extracted/veg_shrub.png');
    this.load.image('veg_flowers', '/assets/game/pixel_crawler/extracted/veg_flowers.png');
    this.load.image('rock_large', '/assets/game/pixel_crawler/extracted/rock_large.png');
    this.load.image('rock_mossy', '/assets/game/pixel_crawler/extracted/rock_mossy.png');
    this.load.image('furn_picnic_table', '/assets/game/pixel_crawler/extracted/furn_picnic_table.png');

    // Pixel Crawler Workstations
    this.load.image('station_workbench', '/assets/game/pixel_crawler/extracted/station_workbench.png');
    this.load.image('station_cooking', '/assets/game/pixel_crawler/extracted/station_cooking.png');
    this.load.image('station_furnace', '/assets/game/pixel_crawler/extracted/station_furnace.png');
    this.load.image('station_alchemy', '/assets/game/pixel_crawler/extracted/station_alchemy.png');
    this.load.image('station_anvil', '/assets/game/pixel_crawler/extracted/station_anvil.png');

    // Animated Station Spritesheets
    this.load.spritesheet('station_bonfire_wood', '/assets/game/pixel_crawler/stations/bonfire_sheet.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('station_fire_flame', '/assets/game/pixel_crawler/stations/fire_sheet.png', {
      frameWidth: 32,
      frameHeight: 48,
    });

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
      { key: 'char_pa_qodi', path: '/assets/game/characters/pa_qodi_spritesheet.png' },
      { key: 'char_bu_fitri', path: '/assets/game/characters/bu_fitri_spritesheet.png' },
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
    this.createEnvironmentAnimations();
    this.scene.start('SchoolMapScene');
  }

  private createEnvironmentAnimations(): void {
    if (!this.anims.exists('fire_burn')) {
      this.anims.create({
        key: 'fire_burn',
        frames: this.anims.generateFrameNumbers('station_fire_flame', { frames: [0, 1, 2, 3] }),
        frameRate: 6,
        repeat: -1,
      });
    }
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
      'char_pa_qodi',
      'char_bu_fitri',
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
