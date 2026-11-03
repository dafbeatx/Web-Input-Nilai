import Phaser from 'phaser';
import SchoolMapScene from './scenes/SchoolMapScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1024,
  height: 640,
  backgroundColor: '#17251e',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [SchoolMapScene],
};

new Phaser.Game(config);
