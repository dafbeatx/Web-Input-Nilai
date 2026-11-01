import * as Phaser from 'phaser';

export class InputManager {
  private scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };

  // Virtual touch vector inputs (from Android virtual stick or Interactive Board swipe/stick)
  private virtualX: number = 0;
  private virtualY: number = 0;
  private virtualSprint: boolean = false;
  private virtualInteract: boolean = false;

  private onInteractCallbacks: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
  }

  private setupKeyboard(): void {
    if (!this.scene.input.keyboard) return;

    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasdKeys = {
      w: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      shift: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      e: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      space: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };

    // Trigger interact on 'E' or Space press
    this.wasdKeys.e.on('down', () => this.dispatchInteract());
    this.wasdKeys.space.on('down', () => this.dispatchInteract());
  }

  public setVirtualMovement(x: number, y: number): void {
    this.virtualX = Math.max(-1, Math.min(1, x));
    this.virtualY = Math.max(-1, Math.min(1, y));
  }

  public setVirtualSprint(isSprinting: boolean): void {
    this.virtualSprint = isSprinting;
  }

  public triggerVirtualInteract(): void {
    this.virtualInteract = true;
    this.dispatchInteract();
    setTimeout(() => {
      this.virtualInteract = false;
    }, 200);
  }

  public onInteract(callback: () => void): () => void {
    this.onInteractCallbacks.push(callback);
    return () => {
      this.onInteractCallbacks = this.onInteractCallbacks.filter(cb => cb !== callback);
    };
  }

  private dispatchInteract(): void {
    for (const cb of this.onInteractCallbacks) {
      cb();
    }
  }

  /**
   * Returns calculated movement velocity vector normalized
   */
  public getMovementVector(): { x: number; y: number; isSprinting: boolean; isInteracting: boolean } {
    let dx = 0;
    let dy = 0;

    // Check keyboard input
    if (this.cursors && this.wasdKeys) {
      if (this.cursors.left.isDown || this.wasdKeys.a.isDown) dx -= 1;
      if (this.cursors.right.isDown || this.wasdKeys.d.isDown) dx += 1;
      if (this.cursors.up.isDown || this.wasdKeys.w.isDown) dy -= 1;
      if (this.cursors.down.isDown || this.wasdKeys.s.isDown) dy += 1;
    }

    // Blend virtual joystick input if touch is active
    if (Math.abs(this.virtualX) > 0.05 || Math.abs(this.virtualY) > 0.05) {
      dx = this.virtualX;
      dy = this.virtualY;
    }

    // Normalize diagonal velocity if magnitude > 1
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > 1) {
      dx /= magnitude;
      dy /= magnitude;
    }

    const isSprinting = (this.wasdKeys?.shift.isDown ?? false) || this.virtualSprint;
    const isInteracting = (this.wasdKeys?.e.isDown ?? false) || (this.wasdKeys?.space.isDown ?? false) || this.virtualInteract;

    return { x: dx, y: dy, isSprinting, isInteracting };
  }

  public destroy(): void {
    this.onInteractCallbacks = [];
  }
}

