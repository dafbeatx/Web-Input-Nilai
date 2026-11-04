import * as Phaser from 'phaser';

export interface Waypoint {
  x: number;
  y: number;
  waitTime?: number; // ms to pause at waypoint (default: 2500ms)
}

export interface NPCConfig {
  id: string;
  name: string;
  role: string;
  characterKey: string;
  avatarUrl: string;
  speed?: number; // default: 60 px/s (natural walking pace)
  waypoints: Waypoint[];
  dialogue: {
    greeting: string;
    quote: string;
  };
}

export class NPC extends Phaser.Physics.Arcade.Sprite {
  public npcId: string;
  public npcName: string;
  public npcRole: string;
  public characterKey: string;
  public avatarUrl: string;
  public dialogue: { greeting: string; quote: string };

  public speed: number = 60;
  public waypoints: Waypoint[] = [];
  public currentWaypointIndex: number = 0;

  public isWaiting: boolean = false;
  public waitTimer: number = 0;
  public isTalking: boolean = false;

  // Smart Anti-Stuck & Pathing System
  private lastX: number = 0;
  private lastY: number = 0;
  private stuckTimer: number = 0;
  private progressCheckTimer: number = 0;

  private currentDirection: 'up' | 'down' | 'left' | 'right' = 'down';
  private nameTag: Phaser.GameObjects.Text;
  private roleTag: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    const startPos = config.waypoints[0] ?? { x: 768, y: 890 };
    super(scene, startPos.x, startPos.y, config.characterKey, 0);

    this.npcId = config.id;
    this.npcName = config.name;
    this.npcRole = config.role;
    this.characterKey = config.characterKey;
    this.avatarUrl = config.avatarUrl;
    this.waypoints = config.waypoints;
    this.dialogue = config.dialogue;
    this.speed = config.speed ?? 60;

    this.lastX = startPos.x;
    this.lastY = startPos.y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 2.5D RPG feet-only collision box to prevent clipping walls and roofs
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 10);
    body.setOffset(23, 50);
    body.setCollideWorldBounds(true);
    body.setImmovable(false);
    body.setBounce(0, 0);

    // Floating Nameplate
    this.nameTag = scene.add
      .text(this.x, this.y - 40, this.npcName, {
        fontFamily: 'Outfit, Inter, sans-serif',
        fontSize: '11px',
        color: '#f8fafc',
        stroke: '#0f172a',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(100);

    // Floating Role Badge
    this.roleTag = scene.add
      .text(this.x, this.y - 28, this.npcRole, {
        fontFamily: 'Outfit, Inter, sans-serif',
        fontSize: '9px',
        color: '#38bdf8',
        stroke: '#0f172a',
        strokeThickness: 2,
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(100);

    this.setDepth(this.y);
  }

  /**
   * Smoothly apply a new configuration when the 30-minute student shift rotates
   */
  public applyConfig(config: NPCConfig): void {
    this.npcId = config.id;
    this.npcName = config.name;
    this.npcRole = config.role;
    this.characterKey = config.characterKey;
    this.avatarUrl = config.avatarUrl;
    this.waypoints = config.waypoints;
    this.dialogue = config.dialogue;
    this.speed = config.speed ?? 60;

    this.nameTag.setText(this.npcName);
    this.roleTag.setText(this.npcRole);

    this.setTexture(config.characterKey, 0);
    this.currentWaypointIndex = 0;
    this.stuckTimer = 0;
    this.isWaiting = true;
    this.waitTimer = 1000;
    this.setIdleFrame();
  }

  public updateNPC(delta: number): void {
    if (this.isTalking) {
      this.setVelocity(0, 0);
      return;
    }

    // 1. Handle pause timer at waypoint
    if (this.isWaiting) {
      this.setVelocity(0, 0);
      this.waitTimer -= delta;

      if (this.waitTimer <= 0) {
        this.isWaiting = false;
        // Advance to next waypoint
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
        this.stuckTimer = 0;
      } else {
        this.setIdleFrame();
        this.updateTags();
        return;
      }
    }

    if (this.waypoints.length === 0) return;

    // 2. Waypoint Arrival Check with generous 20px radius
    const target = this.waypoints[this.currentWaypointIndex];
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    if (dist < 20) {
      // Reached waypoint!
      this.isWaiting = true;
      this.waitTimer = target.waitTime ?? 2500;
      this.setVelocity(0, 0);
      this.setIdleFrame();
      this.stuckTimer = 0;
      this.updateTags();
      return;
    }

    // 3. Smart Anti-Stuck Detection (checks progress every 350ms)
    this.progressCheckTimer += delta;
    if (this.progressCheckTimer >= 350) {
      const movedDist = Phaser.Math.Distance.Between(this.x, this.y, this.lastX, this.lastY);
      const body = this.body as Phaser.Physics.Arcade.Body;
      const isWallBlocked =
        body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down;

      if (movedDist < 4 || isWallBlocked) {
        this.stuckTimer += this.progressCheckTimer;
      } else {
        this.stuckTimer = Math.max(0, this.stuckTimer - 200);
      }

      this.lastX = this.x;
      this.lastY = this.y;
      this.progressCheckTimer = 0;
    }

    // If stuck for >= 1200ms without progress: Auto-Unstick Maneuver
    if (this.stuckTimer >= 1200) {
      this.stuckTimer = 0;
      // Skip the problematic waypoint and move to next
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
      this.isWaiting = true;
      this.waitTimer = 700; // Brief pause to recalculate and face new direction
      this.setVelocity(0, 0);
      this.setIdleFrame();
      this.updateTags();
      return;
    }

    // 4. Calculate velocity towards current waypoint
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const vx = Math.cos(angle) * this.speed;
    const vy = Math.sin(angle) * this.speed;
    this.setVelocity(vx, vy);

    // 5. Determine 4-directional walk animation
    if (Math.abs(vx) > Math.abs(vy)) {
      if (vx < 0) {
        this.currentDirection = 'left';
        this.playAnimIfNotPlaying(`${this.characterKey}_walk_left`);
      } else {
        this.currentDirection = 'right';
        this.playAnimIfNotPlaying(`${this.characterKey}_walk_right`);
      }
    } else {
      if (vy < 0) {
        this.currentDirection = 'up';
        this.playAnimIfNotPlaying(`${this.characterKey}_walk_up`);
      } else {
        this.currentDirection = 'down';
        this.playAnimIfNotPlaying(`${this.characterKey}_walk_down`);
      }
    }

    this.updateTags();
  }

  private playAnimIfNotPlaying(animKey: string): void {
    if (this.anims.currentAnim?.key !== animKey) {
      this.anims.play(animKey, true);
    }
  }

  private setIdleFrame(): void {
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

  public faceTarget(targetX: number, targetY: number): void {
    this.isTalking = true;
    this.setVelocity(0, 0);

    const dx = targetX - this.x;
    const dy = targetY - this.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.currentDirection = dx < 0 ? 'left' : 'right';
    } else {
      this.currentDirection = dy < 0 ? 'up' : 'down';
    }

    this.setIdleFrame();
  }

  public resumePatrol(): void {
    this.isTalking = false;
    this.isWaiting = true;
    this.waitTimer = 1500; // Small polite delay before resuming walk
  }

  private updateTags(): void {
    this.nameTag.setPosition(this.x, this.y - 40);
    this.roleTag.setPosition(this.x, this.y - 28);
    this.setDepth(this.y);
    this.nameTag.setDepth(this.y + 100);
    this.roleTag.setDepth(this.y + 101);
  }

  public destroy(fromScene?: boolean): void {
    this.nameTag?.destroy();
    this.roleTag?.destroy();
    super.destroy(fromScene);
  }
}
