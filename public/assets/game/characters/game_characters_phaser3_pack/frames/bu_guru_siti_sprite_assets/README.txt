BU GURU SITI - PHASER 3 SPRITESHEET

Spritesheet: bu_guru_siti_spritesheet_256.png
Canvas: 256 x 256 px, RGBA PNG
Frame size: 64 x 64 px
Grid: 4 columns x 4 rows

Row order from the generated design:
1. Front-facing
2. Facing left
3. Facing right
4. Back-facing

Columns contain alternate idle/walking poses. Inspect in-game and adjust animation frame rate / frame sequence to taste.

Example Phaser 3 spritesheet load:
this.load.spritesheet('bu-guru-siti', '/assets/bu_guru_siti_spritesheet_256.png', {
  frameWidth: 64,
  frameHeight: 64
});
