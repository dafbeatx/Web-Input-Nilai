import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { InputManager } from '../input/InputManager';
import { InteractiveTrigger } from '@/lib/game/types';

export class MainTownScene extends Phaser.Scene {
  public player!: Player;
  public inputManager!: InputManager;
  private obstaclesGroup!: Phaser.Physics.Arcade.StaticGroup;
  private triggers: Array<{
    zone: Phaser.GameObjects.Zone;
    info: InteractiveTrigger;
  }> = [];

  private currentNearTrigger: InteractiveTrigger | null = null;
  private lastZoneName: string = 'Jl. Merdeka (Pusat Kota)';

  constructor() {
    super({ key: 'MainTownScene' });
  }

  create(): void {
    const worldWidth = 2400;
    const worldHeight = 1800;

    // Configure world and physics boundaries
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Build Town Environment
    this.createGround(worldWidth, worldHeight);
    this.createObstacles();
    this.createInteractiveTriggers();

    // Create Input Manager
    this.inputManager = new InputManager(this);

    // Spawn Player in Center of Nusantara Asri
    this.player = new Player(this, 1164, 880, 'Warga Nusantara');

    // Add collision between player and all buildings / props
    this.physics.add.collider(this.player, this.obstaclesGroup);

    // Setup Camera to smoothly follow player
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.2);

    // Handle React <-> Phaser Custom Event Bus
    this.setupReactEventBridge();

    // Notify React layer that scene is ready
    this.game.events.emit('scene:ready', {
      zoneName: this.lastZoneName,
      playerX: this.player.x,
      playerY: this.player.y,
    });
  }

  private createGround(worldWidth: number, worldHeight: number): void {
    // 1. Base Grass Tiling across world
    this.add.tileSprite(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 'tile_grass');

    // 2. Main East-West Road (Jl. Merdeka)
    const roadY = 860;
    this.add.tileSprite(worldWidth / 2, roadY, worldWidth, 96, 'tile_road');

    // Trotoar / Sidewalk along Jl. Merdeka
    this.add.tileSprite(worldWidth / 2, roadY - 56, worldWidth, 24, 'tile_sidewalk');
    this.add.tileSprite(worldWidth / 2, roadY + 56, worldWidth, 24, 'tile_sidewalk');

    // 3. North-South Avenue (Jl. Pemuda)
    const roadX = 1164;
    this.add.tileSprite(roadX, worldHeight / 2, 96, worldHeight, 'tile_road');
    this.add.tileSprite(roadX - 56, worldHeight / 2, 24, worldHeight, 'tile_sidewalk');
    this.add.tileSprite(roadX + 56, worldHeight / 2, 24, worldHeight, 'tile_sidewalk');

    // 4. Zebra Crossings at Intersection
    this.add.sprite(roadX, roadY - 72, 'tile_crosswalk');
    this.add.sprite(roadX, roadY + 72, 'tile_crosswalk');
    this.add.sprite(roadX - 72, roadY, 'tile_crosswalk').setAngle(90);
    this.add.sprite(roadX + 72, roadY, 'tile_crosswalk').setAngle(90);
  }

  private createObstacles(): void {
    this.obstaclesGroup = this.physics.add.staticGroup();

    // 1. Warung Bu Siti (West side of Jl. Pemuda)
    this.add.sprite(950, 750, 'building_warung').setDepth(750);
    const warungCollider = this.add.zone(950, 765, 120, 60);
    this.physics.add.existing(warungCollider, true);
    this.obstaclesGroup.add(warungCollider);

    // 2. SD Nusantara 01 (East side of Jl. Pemuda)
    this.add.sprite(1420, 730, 'building_school').setDepth(730);
    const schoolCollider = this.add.zone(1420, 750, 190, 80);
    this.physics.add.existing(schoolCollider, true);
    this.obstaclesGroup.add(schoolCollider);

    // 3. Tiang Bendera Merah Putih in front of school
    this.add.sprite(1300, 770, 'prop_flagpole').setDepth(770);
    const flagCollider = this.add.zone(1300, 785, 20, 20);
    this.physics.add.existing(flagCollider, true);
    this.obstaclesGroup.add(flagCollider);

    // 4. Balai Warga / Kelurahan (South-West)
    this.add.sprite(920, 1050, 'building_balai').setDepth(1050);
    const balaiCollider = this.add.zone(920, 1070, 150, 70);
    this.physics.add.existing(balaiCollider, true);
    this.obstaclesGroup.add(balaiCollider);

    // 5. Digital Smart Board (Papan Pengumuman Interaktif)
    this.add.sprite(1164, 760, 'prop_board').setDepth(760);
    const boardCollider = this.add.zone(1164, 770, 44, 20);
    this.physics.add.existing(boardCollider, true);
    this.obstaclesGroup.add(boardCollider);

    // 6. Lush Banyan Trees around Alun-Alun / Park
    const treePositions = [
      { x: 1350, y: 1040 },
      { x: 1520, y: 1050 },
      { x: 1440, y: 1180 },
      { x: 820, y: 730 },
      { x: 1620, y: 740 },
    ];

    treePositions.forEach(pos => {
      this.add.sprite(pos.x, pos.y, 'prop_tree_beringin').setDepth(pos.y);
      const treeCollider = this.add.zone(pos.x, pos.y + 25, 30, 24);
      this.physics.add.existing(treeCollider, true);
      this.obstaclesGroup.add(treeCollider);
    });

    // 7. Street Lamps along sidewalk
    const lampPositions = [
      { x: 1090, y: 820 },
      { x: 1240, y: 820 },
      { x: 1090, y: 950 },
      { x: 1240, y: 950 },
    ];

    lampPositions.forEach(lamp => {
      this.add.sprite(lamp.x, lamp.y, 'prop_lamp').setDepth(lamp.y);
      const lampCollider = this.add.zone(lamp.x, lamp.y + 20, 16, 16);
      this.physics.add.existing(lampCollider, true);
      this.obstaclesGroup.add(lampCollider);
    });
  }

  private createInteractiveTriggers(): void {
    const triggerConfigs: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      info: InteractiveTrigger;
    }> = [
      {
        x: 950,
        y: 810,
        w: 110,
        h: 40,
        info: {
          id: 'trigger-warung',
          name: 'Warung Bu Siti',
          type: 'shop',
          promptText: 'Tekan [E] atau Ketuk untuk berbelanja di Warung Bu Siti',
          data: {
            shopName: 'Warung Kelontong Bu Siti',
            items: [
              { name: 'Es Teh Manis', price: 5000, desc: 'Menyegarkan dahaga (+20 Energi)' },
              { name: 'Gorengan Bakwan', price: 2000, desc: 'Camilan renyah gurih (+10 Energi)' },
              { name: 'Nasi Rames Spesial', price: 15000, desc: 'Kenyang berenergi (+50 Energi)' },
            ],
          },
        },
      },
      {
        x: 1420,
        y: 810,
        w: 120,
        h: 40,
        info: {
          id: 'trigger-school',
          name: 'SD Nusantara 01',
          type: 'building_entrance',
          promptText: 'Tekan [E] atau Ketuk untuk masuk ke Gedung Sekolah',
          data: {
            title: 'SD Nusantara 01',
            desc: 'Pusat pembelajaran dan kegiatan belajar mengajar warga Nusantara.',
          },
        },
      },
      {
        x: 1164,
        y: 800,
        w: 60,
        h: 40,
        info: {
          id: 'trigger-board',
          name: 'Papan Interaktif Digital',
          type: 'interactive_board',
          promptText: 'Tekan [E] atau Ketuk untuk melihat Papan Informasi Digital',
          data: {
            title: 'Sistem Informasi Kota Nusantara',
            desc: 'Layar interaktif warga: Pengumuman kegiatan, jadwal ronda, dan lowongan pekerjaan.',
          },
        },
      },
      {
        x: 920,
        y: 1120,
        w: 120,
        h: 40,
        info: {
          id: 'trigger-balai',
          name: 'Balai Warga',
          type: 'npc',
          promptText: 'Tekan [E] atau Ketuk untuk lapor ke Pak RT di Balai Warga',
          data: {
            title: 'Balai Warga RW 05',
            desc: 'Pusat administrasi kependudukan dan layanan warga.',
          },
        },
      },
    ];

    triggerConfigs.forEach(cfg => {
      const zone = this.add.zone(cfg.x, cfg.y, cfg.w, cfg.h);
      this.physics.add.existing(zone, true);
      this.triggers.push({ zone, info: cfg.info });
    });
  }

  private setupReactEventBridge(): void {
    // Listen for virtual joystick & button inputs sent from React VirtualControls
    this.game.events.on('input:joystick', (data: { x: number; y: number }) => {
      this.inputManager.setVirtualMovement(data.x, data.y);
    });

    this.game.events.on('input:sprint', (isSprinting: boolean) => {
      this.inputManager.setVirtualSprint(isSprinting);
    });

    this.game.events.on('input:interact', () => {
      this.inputManager.triggerVirtualInteract();
    });

    // When interact is triggered (keyboard or touch), open modal if near trigger
    this.inputManager.onInteract(() => {
      if (this.currentNearTrigger) {
        this.game.events.emit('town:open-modal', this.currentNearTrigger);
      }
    });
  }

  update(): void {
    if (!this.player || !this.inputManager) return;

    // 1. Process player movement & physics
    const vector = this.inputManager.getMovementVector();
    const movementState = this.player.updateMovement(vector);

    // 2. Check overlap with interactive triggers
    let nearTrigger: InteractiveTrigger | null = null;
    for (const t of this.triggers) {
      if (this.physics.overlap(this.player, t.zone)) {
        nearTrigger = t.info;
        break;
      }
    }

    if (nearTrigger?.id !== this.currentNearTrigger?.id) {
      this.currentNearTrigger = nearTrigger;
      this.game.events.emit('town:interaction-prompt', nearTrigger);
    }

    // 3. Determine current street / zone based on player coordinates
    let currentZone = 'Jl. Merdeka (Pusat Kota)';
    if (this.player.y < 780 && this.player.x > 1300) {
      currentZone = 'Halaman SD Nusantara 01';
    } else if (this.player.y < 800 && this.player.x < 1050) {
      currentZone = 'Pelataran Warung Bu Siti';
    } else if (this.player.y > 980 && this.player.x > 1250) {
      currentZone = 'Taman & Alun-Alun Kota';
    } else if (this.player.y > 980 && this.player.x < 1050) {
      currentZone = 'Balai Warga RW 05';
    } else if (Math.abs(this.player.x - 1164) < 70) {
      currentZone = 'Jl. Pemuda';
    }

    if (currentZone !== this.lastZoneName) {
      this.lastZoneName = currentZone;
      this.game.events.emit('town:zone-change', currentZone);
    }

    // 4. Periodically broadcast local position to React HUD
    if (movementState.isMoving) {
      this.game.events.emit('town:player-update', movementState);
    }
  }

  shutdown(): void {
    this.inputManager?.destroy();
    this.game.events.off('input:joystick');
    this.game.events.off('input:sprint');
    this.game.events.off('input:interact');
  }
}
