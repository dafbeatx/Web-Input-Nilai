import Phaser from 'phaser';

const BUILDING_KEYS = [
  'main_building','school_gate','computer_lab','library','teachers_room',
  'classroom_vii','classroom_viii','classroom_ix','mosque','canteen','uks_clinic','gazebo'
];
const PROP_KEYS = [
  'tree_round_a','tree_round_b','tree_round_c','tree_conifer','bench_long','bench_short',
  'table_wood','trash_green','trash_gray','notice_board_small','flower_bush','trash_can_small',
  'chair_bench','bookshelf','whiteboard','display_shelf','garden_bench','potted_plant',
  'flagpole','street_lamp_a','street_lamp_b','bulletin_board','school_sign','flower_pot_a',
  'flower_pot_b','shrub_green_a','shrub_green_b','shrub_yellow','shrub_pink','shrub_white',
  'rock_small','sports_court'
];

export default class SchoolMapScene extends Phaser.Scene {
  constructor() { super('SchoolMapScene'); }

  preload() {
    this.load.tilemapTiledJSON('school-ground', '/assets/maps/school_ground.json');
    this.load.image('ground-tiles', '/assets/tilesets/ground_tileset.png');
    this.load.json('school-objects', '/assets/maps/school_objects.json');
    for (const key of BUILDING_KEYS) this.load.image(key, `/assets/buildings/${key}.png`);
    for (const key of PROP_KEYS) this.load.image(key, `/assets/props/${key}.png`);
  }

  create() {
    const map = this.make.tilemap({ key: 'school-ground' });
    const tiles = map.addTilesetImage('ground_tileset', 'ground-tiles', 32, 32, 0, 0);
    map.createLayer('Ground', tiles, 0, 0).setDepth(0);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const data = this.cache.json.get('school-objects');
    this.doorZones = [];

    // Independent building sprites. Y is the bottom-center footpoint, not the roof position.
    for (const item of data.buildings) {
      this.add.image(item.x, item.y, item.key)
        .setOrigin(0.5, 1)
        .setDepth(item.y);
    }

    // Independent props: render by their ground contact point as well.
    for (const item of data.props) {
      this.add.image(item.x, item.y, item.key)
        .setOrigin(0.5, 1)
        .setDepth(item.y + 1);
    }

    // Invisible collision bodies are placed on walls/footprints, not on the visual roof.
    this.blockers = [];
    for (const item of data.collision) {
      const blocker = this.add.zone(item.x, item.y, item.width, item.height).setOrigin(0.5);
      this.physics.add.existing(blocker, true);
      this.blockers.push(blocker);
    }

    for (const item of data.interactions) {
      const zone = this.add.zone(item.x, item.y, item.width, item.height).setOrigin(0.5);
      this.physics.add.existing(zone, true);
      zone.setDataEnabled();
      zone.setData('label', item.label);
      zone.setData('action', item.action);
      zone.setData('target', item.target);
      this.doorZones.push(zone);
    }

    // Placeholder only. Replace this rectangle with the selected idle/walk character sprite.
    const spawn = data.spawn;
    this.player = this.add.rectangle(spawn.x, spawn.y, 20, 26, 0xffd34e);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(18, 20);
    for (const blocker of this.blockers) this.physics.add.collider(this.player, blocker);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E');
    this.nearInteraction = null;

    this.input.keyboard.on('keydown-E', () => {
      if (!this.nearInteraction) return;
      this.events.emit('school-interaction', {
        label: this.nearInteraction.getData('label'),
        action: this.nearInteraction.getData('action'),
        target: this.nearInteraction.getData('target')
      });
    });
  }

  update() {
    const body = this.player.body;
    const speed = 170;
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    body.setVelocity((right ? speed : 0) - (left ? speed : 0), (down ? speed : 0) - (up ? speed : 0));
    body.velocity.normalize().scale(speed);

    // Sort player by footpoint. Behind a building = behind its facade; in front = in front.
    this.player.setDepth(this.player.y + 10);

    this.nearInteraction = null;
    let nearest = 58;
    for (const zone of this.doorZones) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, zone.x, zone.y);
      if (distance < nearest) { nearest = distance; this.nearInteraction = zone; }
    }
  }
}
