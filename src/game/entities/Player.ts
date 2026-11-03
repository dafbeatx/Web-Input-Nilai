import * as Phaser from 'phaser';
import { PlayerMovementState } from '@/lib/game/types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public characterId: string;
  public characterName: string;
  public characterKey: string = 'char_teacher';
  public baseSpeed: number = 175;
  public sprintMultiplier: number = 1.6;

  private nameTag: Phaser.GameObjects.Text;
  private roleTag: Phaser.GameObjects.Text;
  private currentDirection: 'up' | 'down' | 'left' | 'right' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number, name: string = 'Warga Baru', initialKey: string = 'char_teacher') {
    super(scene, x, y, initialKey, 0);

    this.characterId = 'local-player';
    this.characterName = name;
    this.characterKey = initialKey;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 2.5D RPG collision box - feet only for realistic obstacle collision
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 14);
    body.setOffset(21, 46);
    body.setCollideWorldBounds(true);

    // Floating Name Tag above head
    this.nameTag = scene.add.text(x, y - 40, name, {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '11px',
      color: '#ffffff',
      stroke: '#0f172a',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(100);

    // Role badge
    this.roleTag = scene.add.text(x, y - 28, 'Guru Pendidik (PID)', {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '9px',
      color: '#38bdf8',
      stroke: '#0f172a',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(100);

    this.setDepth(10);
  }

  public updateMovement(
    vector: { x: number; y: number; isSprinting: boolean; isInteracting: boolean }
  ): PlayerMovementState {
    const speed = vector.isSprinting ? this.baseSpeed * this.sprintMultiplier : this.baseSpeed;
    const body = this.body as Phaser.Physics.Arcade.Body;

    const vx = vector.x * speed;
    const vy = vector.y * speed;
    body.setVelocity(vx, vy);

    const isMoving = Math.abs(vx) > 5 || Math.abs(vy) > 5;

    // Determine direction and trigger animations
    if (isMoving) {
      if (Math.abs(vector.x) > Math.abs(vector.y)) {
        if (vector.x < 0) {
          this.currentDirection = 'left';
          this.anims.play(`${this.characterKey}_walk_left`, true);
        } else if (vector.x > 0) {
          this.currentDirection = 'right';
          this.anims.play(`${this.characterKey}_walk_right`, true);
        }
      } else {
        if (vector.y < 0) {
          this.currentDirection = 'up';
          this.anims.play(`${this.characterKey}_walk_up`, true);
        } else if (vector.y > 0) {
          this.currentDirection = 'down';
          this.anims.play(`${this.characterKey}_walk_down`, true);
        }
      }
    } else {
      // Stopped: stop animation and set idle frame
      this.anims.stop();
      switch (this.currentDirection) {
        case 'down':
          this.setFrame(0);
          break;
        case 'left':
          this.setFrame(4);
          break;
        case 'right':
          this.setFrame(8);
          break;
        case 'up':
          this.setFrame(12);
          break;
      }
    }

    // Keep nameplate and role tag attached smoothly to player
    this.nameTag.setPosition(this.x, this.y - 40);
    this.roleTag.setPosition(this.x, this.y - 28);

    // Depth sorting based on Y position for 2.5D layering
    this.setDepth(this.y);
    this.nameTag.setDepth(this.y + 100);
    this.roleTag.setDepth(this.y + 101);

    return {
      x: this.x,
      y: this.y,
      vx,
      vy,
      direction: this.currentDirection,
      isMoving,
      isSprinting: vector.isSprinting,
      animKey: `${this.characterKey}_walk_${this.currentDirection}`,
    };
  }

  public switchCharacter(newKey: string, newName: string, newRole: string): void {
    this.characterKey = newKey;
    this.setTexture(newKey, 0);
    this.setCharacterName(newName);
    this.setRoleTitle(newRole);
  }

  public setCharacterName(newName: string): void {
    this.characterName = newName;
    this.nameTag.setText(newName);
  }

  public setRoleTitle(newRole: string): void {
    this.roleTag.setText(newRole);
  }

  public destroy(fromScene?: boolean): void {
    this.nameTag.destroy();
    this.roleTag.destroy();
    super.destroy(fromScene);
  }
}
