import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { InputManager } from '../input/InputManager';
import { InteractiveTrigger, CHARACTER_PROFILES } from '@/lib/game/types';

export type ClassroomId = 'VII' | 'VIII' | 'IX';

export interface ClassroomConfig {
  id: ClassroomId;
  title: string;
  gradeLabel: string;
  teacherTitle: string;
  desc: string;
  exteriorDoor: { x: number; y: number };
}

export const CLASSROOM_CONFIGS: Record<ClassroomId, ClassroomConfig> = {
  VII: {
    id: 'VII',
    title: 'Ruang Kelas 7 (Fase D)',
    gradeLabel: 'Kelas VII',
    teacherTitle: 'Wali Kelas VII',
    desc: 'Ruang kelas pembelajaran peserta didik baru tingkat 7 dengan modul pengenalan lingkungan dan adaptasi kurikulum merdeka.',
    exteriorDoor: { x: 268, y: 289 },
  },
  VIII: {
    id: 'VIII',
    title: 'Ruang Kelas 8',
    gradeLabel: 'Kelas VIII',
    teacherTitle: 'Wali Kelas VIII',
    desc: 'Ruang kelas 8 fokus pada penguatan materi inti, proyek sains interaktif, dan kolaborasi kelompok P5.',
    exteriorDoor: { x: 1308, y: 289 },
  },
  IX: {
    id: 'IX',
    title: 'Ruang Kelas 9 (Fase Kelulusan)',
    gradeLabel: 'Kelas IX',
    teacherTitle: 'Wali Kelas IX',
    desc: 'Ruang kelas tingkat akhir pendalaman materi asesmen sumatif akhir, bimbingan minat bakat, dan persiapan kelulusan.',
    exteriorDoor: { x: 259, y: 509 },
  },
};

export interface ClassroomSceneInitData {
  classroomId?: ClassroomId;
  returnPos?: { x: number; y: number };
  characterKey?: string;
  characterName?: string;
  characterRole?: string;
}

export class ClassroomScene extends Phaser.Scene {
  public player!: Player;
  public inputManager!: InputManager;
  private currentClassroomId: ClassroomId = 'VII';
  private returnPos: { x: number; y: number } = { x: 268, y: 289 };
  private savedCharKey: string = 'char_farhan';
  private savedCharName: string = 'Farhan Sopian Sahid';
  private savedCharRole: string = 'Kepala Sekolah';

  private blockers: Phaser.GameObjects.Rectangle[] = [];
  private exitMarkerContainer?: Phaser.GameObjects.Container;
  private isNearExit: boolean = false;
  private isExiting: boolean = false;
  private numericKeys: Phaser.Input.Keyboard.Key[] = [];

  constructor() {
    super({ key: 'ClassroomScene' });
  }

  init(data?: ClassroomSceneInitData): void {
    if (data?.classroomId && CLASSROOM_CONFIGS[data.classroomId]) {
      this.currentClassroomId = data.classroomId;
    } else {
      this.currentClassroomId = 'VII';
    }

    const config = CLASSROOM_CONFIGS[this.currentClassroomId];
    this.returnPos = data?.returnPos ?? config.exteriorDoor;

    if (data?.characterKey) this.savedCharKey = data.characterKey;
    if (data?.characterName) this.savedCharName = data.characterName;
    if (data?.characterRole) this.savedCharRole = data.characterRole;

    this.isExiting = false;
    this.isNearExit = false;
  }

  create(): void {
    // Exact dimensions of classroom_interior_background.png
    const roomWidth = 1672;
    const roomHeight = 941;
    this.physics.world.setBounds(0, 0, roomWidth, roomHeight);

    const config = CLASSROOM_CONFIGS[this.currentClassroomId];

    // 1. Single Integrated Background (Walls, Floor, Windows, Blackboard, Desks, Trim)
    const bg = this.add.image(roomWidth / 2, roomHeight / 2, 'classroom_bg');
    bg.setOrigin(0.5, 0.5);
    bg.setDepth(0);

    // 2. Invisible Physics Collision Footprints
    this.blockers = [];

    // Top wall & blackboard area (y: 0 to 340)
    this.createStaticBlocker(836, 170, 1672, 340);

    // Left wall with decorative windows (x: 0 to 130)
    this.createStaticBlocker(65, 470, 130, 941);

    // Right wall with windows (x: 1540 to 1672)
    this.createStaticBlocker(1606, 470, 132, 941);

    // Bottom wall left segment (leaving exit doorway at x: 720..950 open)
    this.createStaticBlocker(425, 905, 590, 72);

    // Bottom wall right segment
    this.createStaticBlocker(1245, 905, 590, 72);

    // Teacher Desk at top left
    this.createStaticBlocker(540, 390, 200, 80);

    // Bookshelf & Storage at top right
    this.createStaticBlocker(1330, 380, 140, 90);

    // Student Desks (3 Columns x 3 Rows)
    const deskColumns = [490, 830, 1170];
    const deskRows = [510, 615, 720];

    deskRows.forEach(rowY => {
      deskColumns.forEach(colX => {
        // Invisible footprint blocker for desk and chairs
        this.createStaticBlocker(colX, rowY, 200, 75);
      });
    });

    // 3. Exit Door Interaction Marker Overlay (Separated from background)
    if (this.textures.exists('door_marker')) {
      this.exitMarkerContainer = this.add.container(836, 830);
      this.exitMarkerContainer.setDepth(20);
      this.exitMarkerContainer.setVisible(false);

      const markerSprite = this.add.image(0, 0, 'door_marker');
      markerSprite.setOrigin(0.5, 0.5);
      markerSprite.setScale(0.7);

      const markerLabel = this.add.text(0, -6, 'Keluar Kelas', {
        fontFamily: 'Outfit, Inter, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        stroke: '#0f172a',
        strokeThickness: 3,
        align: 'center',
      }).setOrigin(0.5, 0.5);

      this.exitMarkerContainer.add([markerSprite, markerLabel]);

      // Subtle breathing pulse for exit marker
      this.tweens.add({
        targets: this.exitMarkerContainer,
        y: 824,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 4. Spawn Player inside the classroom (facing UP toward blackboard)
    this.player = new Player(this, 836, 780, this.savedCharName, this.savedCharKey);
    this.player.setRoleTitle(this.savedCharRole);
    this.player.setFacingDirection('up');
    this.player.setDepth(780);

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

    // 7. Floating Room Indicator Badge
    this.createRoomHeaderUI(config);

    // 8. React Event Bridge Integration
    this.setupReactEventBridge();

    // 9. Numeric hotkeys 1-8 for character switching
    this.setupKeyboardShortcuts();

    // 10. Notify React Layer
    this.game.events.emit('scene:ready', { zoneName: config.title });
    this.game.events.emit('town:zone-change', config.title);
  }

  private createStaticBlocker(x: number, y: number, width: number, height: number): void {
    const blocker = this.add.rectangle(x, y, width, height, 0xff0044, 0);
    blocker.setOrigin(0.5, 0.5);
    this.physics.add.existing(blocker, true);
    this.blockers.push(blocker);
  }

  private createRoomHeaderUI(config: ClassroomConfig): void {
    const banner = this.add.container(836, 32);
    banner.setDepth(999);
    banner.setScrollFactor(0); // Pin to top of screen

    const bgRect = this.add.graphics();
    bgRect.fillStyle(0x0f172a, 0.88);
    bgRect.lineStyle(1.5, 0x38bdf8, 0.8);
    bgRect.fillRoundedRect(-150, -15, 300, 30, 10);
    bgRect.strokeRoundedRect(-150, -15, 300, 30, 10);

    const label = this.add.text(0, 0, `🏫 ${config.title}`, {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      stroke: '#0284c7',
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
        this.exitClassroom();
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

  private exitClassroom(): void {
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

    // 4. Proximity check to bottom exit doorway (centered at x = 836, doorway y > 760)
    const isAtDoorway = Math.abs(this.player.x - 836) < 125 && this.player.y > 760;

    if (isAtDoorway) {
      if (!this.isNearExit) {
        this.isNearExit = true;
        this.exitMarkerContainer?.setVisible(true);

        const prompt: InteractiveTrigger = {
          id: 'trigger-exit-classroom',
          name: 'Pintu Keluar',
          type: 'building_entrance',
          promptText: 'Tekan [E] atau Ketuk untuk Keluar Kelas',
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
