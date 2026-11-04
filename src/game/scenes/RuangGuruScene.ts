import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { InputManager } from '../input/InputManager';
import { InteractiveTrigger, CHARACTER_PROFILES } from '@/lib/game/types';

export interface RuangGuruSceneInitData {
  returnPos?: { x: number; y: number };
  characterKey?: string;
  characterName?: string;
  characterRole?: string;
}

export class RuangGuruScene extends Phaser.Scene {
  public player!: Player;
  public inputManager!: InputManager;
  private returnPos: { x: number; y: number } = { x: 219, y: 645 };
  private savedCharKey: string = 'char_farhan';
  private savedCharName: string = 'Farhan Sopian Sahid';
  private savedCharRole: string = 'Kepala Sekolah';

  private blockers: Phaser.GameObjects.Rectangle[] = [];
  private exitMarkerContainer?: Phaser.GameObjects.Container;
  private isNearExit: boolean = false;
  private isExiting: boolean = false;
  private numericKeys: Phaser.Input.Keyboard.Key[] = [];

  constructor() {
    super({ key: 'RuangGuruScene' });
  }

  init(data?: RuangGuruSceneInitData): void {
    if (data?.returnPos) this.returnPos = data.returnPos;
    if (data?.characterKey) this.savedCharKey = data.characterKey;
    if (data?.characterName) this.savedCharName = data.characterName;
    if (data?.characterRole) this.savedCharRole = data.characterRole;

    this.isExiting = false;
    this.isNearExit = false;
  }

  create(): void {
    // Exact dimensions of ruang_guru_background.png (1774 x 887, 2:1 aspect ratio)
    const roomWidth = 1774;
    const roomHeight = 887;
    this.physics.world.setBounds(0, 0, roomWidth, roomHeight);

    // 1. Single Integrated Background (Green-White Walls, Divided Staff Desks, Printers, Sofa, Flooring)
    const bg = this.add.image(roomWidth / 2, roomHeight / 2, 'ruang_guru_bg');
    bg.setOrigin(0.5, 0.5);
    bg.setDepth(0);

    // 2. Invisible Physics Collision Footprints
    this.blockers = [];

    // Perimeter: Top wall & background upper elements (y: 0 to 220)
    this.createStaticBlocker(887, 110, 1774, 220);

    // Perimeter: Left boundary wall (x: 0 to 75)
    this.createStaticBlocker(38, 443, 76, 887);

    // Perimeter: Right boundary wall (x: 1699 to 1774)
    this.createStaticBlocker(1736, 443, 76, 887);

    // Perimeter: Bottom wall left segment (leaving doorway open at x: 815..960)
    this.createStaticBlocker(425, 845, 770, 84);

    // Perimeter: Bottom wall right segment
    this.createStaticBlocker(1350, 845, 770, 84);

    // Center dividing partition (Sekat pemisah area guru pria & wanita)
    this.createStaticBlocker(887, 300, 24, 160);

    // Central equipment area (2 unit printer & meja layanan)
    this.createStaticBlocker(887, 445, 96, 68);

    // Central lower lounge & sofa area (Area bersama)
    this.createStaticBlocker(887, 615, 230, 86);

    // Left Side Desks — Area Guru Pria (3 cluster meja kerja & tumpukan buku)
    this.createStaticBlocker(400, 295, 260, 78);
    this.createStaticBlocker(400, 485, 260, 78);
    this.createStaticBlocker(400, 675, 260, 78);

    // Right Side Desks — Area Guru Wanita (3 cluster meja kerja & tumpukan buku)
    this.createStaticBlocker(1374, 295, 260, 78);
    this.createStaticBlocker(1374, 485, 260, 78);
    this.createStaticBlocker(1374, 675, 260, 78);

    // Perimeter Bookcases & Storage Cabinets
    this.createStaticBlocker(115, 345, 68, 210);
    this.createStaticBlocker(1659, 345, 68, 210);

    // 3. Exit Door Interaction Marker Overlay (Separated from background at x = 887 doorway)
    if (this.textures.exists('ruang_guru_door_marker')) {
      this.exitMarkerContainer = this.add.container(887, 755);
      this.exitMarkerContainer.setDepth(20);
      this.exitMarkerContainer.setVisible(false);

      const markerSprite = this.add.image(0, 0, 'ruang_guru_door_marker');
      markerSprite.setOrigin(0.5, 0.5);
      markerSprite.setScale(0.42);

      const markerLabel = this.add.text(0, -6, 'Keluar Ruang Guru', {
        fontFamily: 'Outfit, Inter, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#0f172a',
        strokeThickness: 3,
        align: 'center',
      }).setOrigin(0.5, 0.5);

      this.exitMarkerContainer.add([markerSprite, markerLabel]);

      // Subtle breathing pulse for exit pad
      this.tweens.add({
        targets: this.exitMarkerContainer,
        y: 750,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 4. Spawn Player inside Ruang Guru (facing UP into the room)
    this.player = new Player(this, 887, 720, this.savedCharName, this.savedCharKey);
    this.player.setRoleTitle(this.savedCharRole);
    this.player.setFacingDirection('up');
    this.player.setDepth(720);

    // Add Collisions between Player and All Static Room Blockers
    for (const blocker of this.blockers) {
      this.physics.add.collider(this.player, blocker);
    }

    // 5. Input Controller Setup
    this.inputManager = new InputManager(this);

    // 6. Camera & Viewport Setup (Scale-to-fit with smooth follow)
    this.cameras.main.setBounds(0, 0, roomWidth, roomHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.05);
    this.cameras.main.fadeIn(250, 0, 0, 0);

    // 7. Floating Room Header Badge
    this.createRoomHeaderUI();

    // 8. React Event Bridge Integration
    this.setupReactEventBridge();

    // 9. Numeric hotkeys 1-8 for character switching
    this.setupKeyboardShortcuts();

    // 10. Notify React Layer
    const roomTitle = 'Ruang Kerja Guru & Staf SMP Terpadu Al-Ittihadiyah';
    this.game.events.emit('scene:ready', { zoneName: roomTitle });
    this.game.events.emit('town:zone-change', roomTitle);
  }

  private createStaticBlocker(x: number, y: number, width: number, height: number): void {
    const blocker = this.add.rectangle(x, y, width, height, 0xff0044, 0);
    blocker.setOrigin(0.5, 0.5);
    this.physics.add.existing(blocker, true);
    this.blockers.push(blocker);
  }

  private createRoomHeaderUI(): void {
    const banner = this.add.container(887, 32);
    banner.setDepth(999);
    banner.setScrollFactor(0); // Pin to top of screen

    const bgRect = this.add.graphics();
    bgRect.fillStyle(0x0f172a, 0.88);
    bgRect.lineStyle(1.5, 0x10b981, 0.8);
    bgRect.fillRoundedRect(-165, -15, 330, 30, 10);
    bgRect.strokeRoundedRect(-165, -15, 330, 30, 10);

    const label = this.add.text(0, 0, '🏫 Ruang Guru & Bimbingan Konseling', {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      stroke: '#065f46',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0.5);

    banner.add([bgRect, label]);
  }

  private setupReactEventBridge(): void {
    // Virtual joystick from touch devices
    this.game.events.on('input:joystick', (data: { x: number; y: number }) => {
      this.inputManager.setVirtualMovement(data.x, data.y);
    });

    // Sprint toggle
    this.game.events.on('input:sprint', (isSprinting: boolean) => {
      this.inputManager.setVirtualSprint(isSprinting);
    });

    // Interact button (pressing E or tapping virtual button)
    this.game.events.on('input:interact', () => {
      this.inputManager.triggerVirtualInteract();
    });

    // Character switch from HUD modal
    this.game.events.on('player:change-character', (data: { key: string; name: string; role: string }) => {
      this.savedCharKey = data.key;
      this.savedCharName = data.name;
      this.savedCharRole = data.role;
      this.player.switchCharacter(data.key, data.name, data.role);
    });

    // Handle user pressing E or tapping action button
    this.inputManager.onInteract(() => {
      if (this.isNearExit && !this.isExiting) {
        this.exitRuangGuru();
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    if (!this.input.keyboard) return;

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
  }

  private exitRuangGuru(): void {
    if (this.isExiting) return;
    this.isExiting = true;

    // Clear prompt immediately to prevent double firing
    this.game.events.emit('town:interaction-prompt', null);

    // Fade out camera and return cleanly to exterior campus scene
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SchoolMapScene', {
        returnPos: this.returnPos,
        characterKey: this.player.characterKey,
        characterName: this.player.characterName,
        characterRole: this.savedCharRole,
      });
    });
  }

  update(): void {
    if (!this.player || !this.inputManager || this.isExiting) return;

    // 1. Numeric keys for character switcher
    this.numericKeys.forEach((key, idx) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        const profile = CHARACTER_PROFILES[idx];
        if (profile && profile.key !== this.player.characterKey) {
          this.savedCharKey = profile.key;
          this.savedCharName = profile.name;
          this.savedCharRole = profile.role;
          this.player.switchCharacter(profile.key, profile.name, profile.role);
          this.game.events.emit('scene:character-selected', profile);
        }
      }
    });

    // 2. Player movement update
    const movementVector = this.inputManager.getMovementVector();
    this.player.updateMovement(movementVector);

    // 3. 2.5D Depth Sorting: Higher Y renders in front
    this.player.setDepth(this.player.y);

    // 4. Proximity check to bottom exit doorway (centered at x = 887, doorway y > 690)
    const isAtDoorway = Math.abs(this.player.x - 887) < 115 && this.player.y > 690;

    if (isAtDoorway) {
      if (!this.isNearExit) {
        this.isNearExit = true;
        this.exitMarkerContainer?.setVisible(true);

        const prompt: InteractiveTrigger = {
          id: 'trigger-exit-ruang-guru',
          name: 'Pintu Keluar Ruang Guru',
          type: 'building_entrance',
          promptText: 'Tekan [E] atau Ketuk untuk Keluar Ruang Guru',
        };
        this.game.events.emit('town:interaction-prompt', prompt);
      }
    } else {
      if (this.isNearExit) {
        this.isNearExit = false;
        this.exitMarkerContainer?.setVisible(false);
        this.game.events.emit('town:interaction-prompt', null);
      }
    }
  }

  shutdown(): void {
    this.game.events.off('input:joystick');
    this.game.events.off('input:sprint');
    this.game.events.off('input:interact');
    this.game.events.off('player:change-character');
    this.game.events.emit('town:interaction-prompt', null);
  }
}

