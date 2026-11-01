import * as Phaser from 'phaser';
import { PlayerMovementState } from '@/lib/game/types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public characterId: string;
  public characterName: string;
  public baseSpeed: number = 160;
  public sprintMultiplier: number = 1.6;

  private nameTag: Phaser.GameObjects.Text;
  private roleTag: Phaser.GameObjects.Text;
  private currentDirection: 'up' | 'down' | 'left' | 'right' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number, name: string = 'Warga Baru') {
    super(scene, x, y, 'player_front');

    this.characterId = 'local-player';
    this.characterName = name;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set Arcade physics body - 2.5D RPG style collision box (feet only)
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 18);
    body.setOffset(8, 36);
    body.setCollideWorldBounds(true);

    // Floating Name Tag above head
    this.nameTag = scene.add.text(x, y - 36, name, {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '11px',
      color: '#ffffff',
      stroke: '#0f172a',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(100);

    // Role badge
    this.roleTag = scene.add.text(x, y - 24, 'Warga Sipil', {
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize: '9px',
      color: '#67e8f9',
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

    // Update facing texture
    if (Math.abs(vector.x) > Math.abs(vector.y)) {
      if (vector.x < 0) {
        this.currentDirection = 'left';
        this.setTexture('player_left');
      } else if (vector.x > 0) {
        this.currentDirection = 'right';
        this.setTexture('player_right');
      }
    } else if (Math.abs(vector.y) > 0.05) {
      if (vector.y < 0) {
        this.currentDirection = 'up';
        this.setTexture('player_back');
      } else if (vector.y > 0) {
        this.currentDirection = 'down';
        this.setTexture('player_front');
      }
    }

    // Keep nameplate and role tag attached smoothly to player
    this.nameTag.setPosition(this.x, this.y - 36);
    this.roleTag.setPosition(this.x, this.y - 24);

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
      animKey: `player_${this.currentDirection}`,
    };
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

