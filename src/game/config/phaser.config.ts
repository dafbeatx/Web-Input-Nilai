import * as Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { SchoolMapScene } from '../scenes/SchoolMapScene';
import { MainTownScene } from '../scenes/MainTownScene';
import { ClassroomScene } from '../scenes/ClassroomScene';
import { RuangGuruScene } from '../scenes/RuangGuruScene';
import { OutskirtsScene } from '../scenes/OutskirtsScene';

export function createPhaserConfig(parentElement: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: parentElement,
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, SchoolMapScene, MainTownScene, ClassroomScene, RuangGuruScene, OutskirtsScene],
    fps: {
      target: 60,
      forceSetTimeOut: true,
    },
  };
}

