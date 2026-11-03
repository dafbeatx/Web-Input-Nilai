import Phaser from 'phaser';

const ASSET = '/assets';
const TILE_SIZE = 32;
const CHARACTERS = [
  { key: 'pak_guru_budi', label: 'Pak Guru Budi', file: 'pak_guru_budi.png' },
  { key: 'bu_guru_siti', label: 'Bu Guru Siti', file: 'bu_guru_siti.png' },
  { key: 'rian_pratama', label: 'Rian Pratama', file: 'rian_pratama.png' },
  { key: 'aisyah_putri', label: 'Aisyah Putri', file: 'aisyah_putri.png' },
  { key: 'pak_joko', label: 'Pak Joko', file: 'pak_joko.png' },
];

/**
 * Phaser 3 school campus scene. Loads a Tiled-compatible JSON map,
 * rectangle collision objects, interaction zones, a spawn point, and
 * the five previously-created 4x4 character spritesheets.
 */
export default class SchoolMapScene extends Phaser.Scene {
  constructor() {
    super('SchoolMapScene');
    this.characterIndex = 0;
    this.nearby = null;
    this.touch = { up: false, down: false, left: false, right: false };
    this.blockers = [];
  }

  preload() {
    this.load.tilemapTiledJSON('school_map', `${ASSET}/maps/school_map.json`);
    this.load.image('school_atlas', `${ASSET}/maps/school_atlas.png`);
    for (const character of CHARACTERS) {
      this.load.spritesheet(character.key, `${ASSET}/characters/${character.file}`, {
        frameWidth: 64,
        frameHeight: 64,
      });
    }
  }

  create() {
    const map = this.make.tilemap({ key: 'school_map' });
    const tileset = map.addTilesetImage('school_atlas', 'school_atlas', TILE_SIZE, TILE_SIZE, 0, 0);
    if (!tileset) throw new Error('Tileset school_atlas gagal dimuat. Periksa path asset.');
    const ground = map.createLayer('Ground', tileset, 0, 0);
    if (!ground) throw new Error('Layer Ground tidak ditemukan pada school_map.json.');
    ground.setDepth(0);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.createCharacterAnimations();
    const spawn = map.getObjectLayer('Spawn')?.objects?.find((object) => object.name === 'player_spawn');
    const startX = spawn?.x ?? 768;
    const startY = spawn?.y ?? 890;
    const character = CHARACTERS[this.characterIndex];
    this.player = this.physics.add.sprite(startX, startY, character.key, 12);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(24, 26).setOffset(20, 34);
    this.player.setMaxVelocity(150, 150);

    // Tiled object rectangles become static Arcade Physics blockers.
    const collisionObjects = map.getObjectLayer('Collision')?.objects ?? [];
    for (const object of collisionObjects) {
      if (!object.width || !object.height) continue;
      const blocker = this.add.rectangle(
        object.x + object.width / 2,
        object.y + object.height / 2,
        object.width,
        object.height,
        0xff00ff,
        0,
      );
      blocker.setOrigin(0.5, 0.5);
      this.physics.add.existing(blocker, true);
      this.physics.add.collider(this.player, blocker);
      this.blockers.push(blocker);
    }

    this.interactions = (map.getObjectLayer('Interact')?.objects ?? []).map((object) => ({
      name: object.name,
      label: object.properties?.find((property) => property.name === 'label')?.value ?? object.name,
      rect: new Phaser.Geom.Rectangle(object.x, object.y, object.width, object.height),
    }));

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D', interact: 'E',
      debug: 'F3', one: 'ONE', two: 'TWO', three: 'THREE', four: 'FOUR', five: 'FIVE',
    });
    this.cursors = this.input.keyboard.createCursorKeys();

    this.createHud();
    this.createTouchControls();
    this.physics.world.createDebugGraphic();
    this.physics.world.debugGraphic.setVisible(false);

    this.input.keyboard.on('keydown-F3', () => {
      this.physics.world.debugGraphic.setVisible(!this.physics.world.debugGraphic.visible);
    });
    this.events.emit('school-map-ready', { width: map.widthInPixels, height: map.heightInPixels });
  }

  createCharacterAnimations() {
    for (const character of CHARACTERS) {
      const rows = [
        { name: 'down', start: 0 },
        { name: 'left', start: 4 },
        { name: 'right', start: 8 },
        { name: 'up', start: 12 },
      ];
      for (const row of rows) {
        const key = `${character.key}-walk-${row.name}`;
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(character.key, { start: row.start, end: row.start + 3 }),
            frameRate: 8,
            repeat: -1,
          });
        }
      }
    }
  }

  createHud() {
    const width = this.scale.width;
    this.hudTitle = this.add.text(16, 14, 'SMP TERPADU AL-ITTIHADIYAH', {
      fontFamily: 'Arial', fontSize: '18px', color: '#ffffff',
      backgroundColor: '#173c31', padding: { x: 12, y: 8 },
    }).setScrollFactor(0).setDepth(100);
    this.hudHelp = this.add.text(16, 56, 'WASD / panah: bergerak  •  E: interaksi  •  1-5: ganti karakter  •  F3: collision', {
      fontFamily: 'Arial', fontSize: '13px', color: '#15221d',
      backgroundColor: '#ffffffdd', padding: { x: 8, y: 6 },
    }).setScrollFactor(0).setDepth(100);
    this.statusText = this.add.text(16, this.scale.height - 48, 'Jelajahi area sekolah.', {
      fontFamily: 'Arial', fontSize: '15px', color: '#ffffff',
      backgroundColor: '#173c31', padding: { x: 10, y: 7 },
    }).setScrollFactor(0).setDepth(100);
    this.charText = this.add.text(width - 16, 14, CHARACTERS[this.characterIndex].label, {
      fontFamily: 'Arial', fontSize: '15px', color: '#ffffff',
      backgroundColor: '#173c31', padding: { x: 10, y: 8 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.promptText = this.add.text(this.scale.width / 2, this.scale.height - 92, '', {
      fontFamily: 'Arial', fontSize: '17px', color: '#ffffff',
      backgroundColor: '#1d2935dd', padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
  }

  makeTouchButton(label, x, y, key) {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Arial', fontSize: '24px', color: '#ffffff',
      backgroundColor: '#173c31dd', padding: { x: 15, y: 10 },
    }).setOrigin(0.5).setInteractive().setScrollFactor(0).setDepth(110);
    button.on('pointerdown', () => { this.touch[key] = true; button.setAlpha(0.65); });
    const release = () => { this.touch[key] = false; button.setAlpha(1); };
    button.on('pointerup', release);
    button.on('pointerout', release);
    button.on('pointerupoutside', release);
    return button;
  }

  createTouchControls() {
    const right = this.scale.width - 60;
    const bottom = this.scale.height - 105;
    this.makeTouchButton('▲', right, bottom - 55, 'up');
    this.makeTouchButton('◀', right - 55, bottom, 'left');
    this.makeTouchButton('▼', right, bottom, 'down');
    this.makeTouchButton('▶', right + 55, bottom, 'right');
    const interact = this.add.text(76, this.scale.height - 100, 'INTERAKSI', {
      fontFamily: 'Arial', fontSize: '14px', color: '#ffffff',
      backgroundColor: '#9b5b16dd', padding: { x: 13, y: 13 },
    }).setOrigin(0.5).setInteractive().setScrollFactor(0).setDepth(110);
    interact.on('pointerdown', () => this.interact());
  }

  switchCharacter(index) {
    if (index < 0 || index >= CHARACTERS.length || index === this.characterIndex) return;
    const currentAnimation = this.player.anims.currentAnim?.key ?? '';
    this.characterIndex = index;
    const character = CHARACTERS[index];
    this.player.setTexture(character.key, this.directionFrame ?? 12);
    if (currentAnimation.endsWith('walk-up')) this.player.play(`${character.key}-walk-up`);
    else if (currentAnimation.endsWith('walk-down')) this.player.play(`${character.key}-walk-down`);
    else if (currentAnimation.endsWith('walk-left')) this.player.play(`${character.key}-walk-left`);
    else if (currentAnimation.endsWith('walk-right')) this.player.play(`${character.key}-walk-right`);
    this.charText.setText(character.label);
  }

  interact() {
    if (!this.nearby) {
      this.statusText.setText('Tidak ada objek interaksi di dekatmu.');
      return;
    }
    this.statusText.setText(`Kamu berinteraksi dengan: ${this.nearby.label}`);
    this.events.emit('school-interact', { id: this.nearby.name, label: this.nearby.label });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.one)) this.switchCharacter(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.two)) this.switchCharacter(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.three)) this.switchCharacter(2);
    if (Phaser.Input.Keyboard.JustDown(this.keys.four)) this.switchCharacter(3);
    if (Phaser.Input.Keyboard.JustDown(this.keys.five)) this.switchCharacter(4);
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) this.interact();

    const left = this.cursors.left.isDown || this.keys.left.isDown || this.touch.left;
    const right = this.cursors.right.isDown || this.keys.right.isDown || this.touch.right;
    const up = this.cursors.up.isDown || this.keys.up.isDown || this.touch.up;
    const down = this.cursors.down.isDown || this.keys.down.isDown || this.touch.down;
    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const length = Math.hypot(vx, vy);
      vx = (vx / length) * 125;
      vy = (vy / length) * 125;
      this.player.setVelocity(vx, vy);
      let direction;
      if (Math.abs(vx) > Math.abs(vy)) direction = vx < 0 ? 'left' : 'right';
      else direction = vy < 0 ? 'up' : 'down';
      const character = CHARACTERS[this.characterIndex];
      this.player.play(`${character.key}-walk-${direction}`, true);
      this.directionFrame = ({ down: 0, left: 4, right: 8, up: 12 })[direction];
    } else {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.directionFrame ?? 12);
    }

    this.nearby = this.interactions.find((item) => item.rect.contains(this.player.x, this.player.y)) ?? null;
    this.promptText.setText(this.nearby ? `Tekan E / INTERAKSI: ${this.nearby.label}` : '');
  }
}
