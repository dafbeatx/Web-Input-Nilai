import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { InputManager } from '../input/InputManager';
import { InteractiveTrigger, CHARACTER_PROFILES } from '@/lib/game/types';

export type ClassroomId = 'VII' | 'VIII' | 'IX';

export interface ClassroomConfig {
  id: ClassroomId;
  title: string;
  gradeLabel: string;
  boardType: 'whiteboard' | 'blackboard';
  teacherTitle: string;
  desc: string;
  exteriorDoor: { x: number; y: number };
}

export const CLASSROOM_CONFIGS: Record<ClassroomId, ClassroomConfig> = {
  VII: {
    id: 'VII',
    title: 'Ruang Kelas 7 (Fase D)',
    gradeLabel: 'Kelas VII',
    boardType: 'whiteboard',
    teacherTitle: 'Wali Kelas VII',
    desc: 'Ruang kelas pembelajaran peserta didik baru tingkat 7 dengan modul pengenalan lingkungan dan adaptasi kurikulum merdeka.',
    exteriorDoor: { x: 268, y: 289 },
  },
  VIII: {
    id: 'VIII',
    title: 'Ruang Kelas 8',
    gradeLabel: 'Kelas VIII',
    boardType: 'blackboard',
    teacherTitle: 'Wali Kelas VIII',
    desc: 'Ruang kelas 8 fokus pada penguatan materi inti, proyek sains interaktif, dan kolaborasi kelompok P5.',
    exteriorDoor: { x: 1308, y: 289 },
  },
  IX: {
    id: 'IX',
    title: 'Ruang Kelas 9 (Fase Kelulusan)',
    gradeLabel: 'Kelas IX',
    boardType: 'whiteboard',
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
  private savedCharKey: string = 'char_teacher';
  private savedCharName: string = 'Warga Baru';
  private savedCharRole: string = 'Guru Pendidik (PID)';

  private blockers: Phaser.GameObjects.Rectangle[] = [];
  private deskSprites: Phaser.GameObjects.Sprite[] = [];
  private isNearExit: boolean = false;
  private isExiting: boolean = false;
  private exitMarkerPad?: Phaser.GameObjects.Image;
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
    const roomWidth = 640;
    const roomHeight = 448;
    this.physics.world.setBounds(0, 0, roomWidth, roomHeight);

    const config = CLASSROOM_CONFIGS[this.currentClassroomId];

    // 1. Room Background (Walls, Floor, Windows, Trim)
    const bg = this.add.image(roomWidth / 2, roomHeight / 2, 'classroom_bg');
    bg.setOrigin(0.5, 0.5);
    bg.setDepth(0);

    // 2. Class specific blackboard / whiteboard customization
    if (config.boardType === 'blackboard' && this.textures.exists('blackboard_green')) {
      const board = this.add.image(320, 155, 'blackboard_green');
      board.setOrigin(0.5, 0.5);
      board.setDepth(2);
    }

    // 3. Wall & Boundary Physics Blockers (Player cannot walk through walls)
    this.blockers = [];

    // Top wall + teaching area top bound
    this.createStaticBlocker(320, 80, 640, 160);
    // Left wall with windows
    this.createStaticBlocker(24, 224, 48, 448);
    // Right wall with windows
    this.createStaticBlocker(616, 224, 48, 448);
    // Bottom wall left segment (leaving doorway at 346..398 open)
    this.createStaticBlocker(173, 436, 346, 24);
    // Bottom wall right segment
    this.createStaticBlocker(519, 436, 242, 24);

    // Fixed Props Collision (Teacher Desk, Bookshelf)
    // Teacher Desk at top left
    this.createStaticBlocker(175, 175, 96, 44);
    if (this.textures.exists('desk_teacher_unit')) {
      const teacherDesk = this.add.sprite(175, 175, 'desk_teacher_unit');
      teacherDesk.setOrigin(0.5, 0.5);
      teacherDesk.setDepth(175);
    }

    // Bookshelf at top right
    this.createStaticBlocker(538, 170, 56, 46);

    // 4. 2.5D Depth-Sorted Student Desks (3 Columns x 3 Rows)
    this.deskSprites = [];
    const deskColumns = [160, 315, 470];
    const deskRows = [240, 305, 370];

    deskRows.forEach(rowY => {
      deskColumns.forEach(colX => {
        // Physical footprint blocker (desk + chairs)
        this.createStaticBlocker(colX, rowY - 2, 94, 38);

        // Visual sprite layered with 2.5D Y-depth sorting
        if (this.textures.exists('desk_student_pair')) {
          const desk = this.add.sprite(colX, rowY, 'desk_student_pair');
          desk.setOrigin(0.5, 0.5);
          desk.setDepth(rowY);
          this.deskSprites.push(desk);
        }
      });
    });

    // 5. Exit Door Marker at the Bottom (centered at x = 372 doorway)
    if (this.textures.exists('marker_door_pad')) {
      this.exitMarkerPad = this.add.image(372, 436, 'marker_door_pad');
      this.exitMarkerPad.setOrigin(0.5, 0.5);
      this.exitMarkerPad.setScale(0.55);
      this.exitMarkerPad.setDepth(5);

      // Subtle breathing pulse for exit pad
      this.tweens.add({
        targets: this.exitMarkerPad,
        alpha: { from: 0.8, to: 1 },
        scaleX: { from: 0.53, to: 0.57 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 6. Spawn Player inside the classroom (facing UP toward the blackboard)
    this.player = new Player(this, 372, 380, this.savedCharName, this.savedCharKey);
    this.player.setRoleTitle(this.savedCharRole);
    this.player.setFacingDirection('up');

    // Add Collisions between Player and All Static Room Blockers
    for (const blocker of this.blockers) {
      this.physics.add.collider(this.player, blocker);
    }

    // 7. Input Controller Setup
    this.inputManager = new InputManager(this);

    // 8. Camera & Viewport Setup
    this.cameras.main.setBounds(0, 0, roomWidth, roomHeight);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.35);
    this.cameras.main.fadeIn(250, 0, 0, 0);

    // 9. Floating Room Indicator Badge
    this.createRoomHeaderUI(config);

    // 10. React Event Bridge Integration
    this.setupReactEventBridge();

    // 11. Numeric hotkeys 1-8 for character switching
    this.setupKeyboardShortcuts();

    // Notify React HUD of the current classroom zone
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
    const banner = this.add.container(320, 24);
    banner.setDepth(999);

    const bgRect = this.add.graphics();
    bgRect.fillStyle(0x0f172a, 0.85);
    bgRect.lineStyle(1.5, 0x38bdf8, 0.8);
    bgRect.fillRoundedRect(-140, -14, 280, 28, 10);
    bgRect.strokeRoundedRect(-140, -14, 280, 28, 10);

    const label = this.add.text(0, 0, `🏫 ${config.title}`, {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '12px',
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

    const numCodes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
    ];

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

  update(_time: number, _delta: number): void {
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

    // 4. Proximity check to bottom exit door (doorway center: x=372, y=436)
    const exitX = 372;
    const exitY = 436;
    const distToExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, exitX, exitY);

    if (distToExit < 38) {
      if (!this.isNearExit) {
        this.isNearExit = true;
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
