import fs from 'fs';
import path from 'path';

const samplePath = 'C:/Users/SMATAS/AppData/Local/Programs/ldtk/extraFiles/samples/Typical_TopDown_example.ldtk';
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

// Clone sample base
const ldtk = JSON.parse(JSON.stringify(sample));

ldtk.exportTiled = true;
ldtk.imageExportMode = 'OneImagePerLevel';
ldtk.defaultGridSize = 16;
ldtk.defaultLevelWidth = 2048;
ldtk.defaultLevelHeight = 1536;

// Configure Pixel Crawler Tilesets
ldtk.defs.tilesets = [
  {
    __cWid: 25,
    __cHei: 26,
    identifier: 'Floors_Tiles',
    uid: 101,
    relPath: '../game/pixel_crawler/tilesets/floors_tiles.png',
    pxWid: 400,
    pxHei: 416,
    tileGridSize: 16,
    spacing: 0,
    padding: 0,
    tags: [],
    customData: [],
    savedSelections: []
  },
  {
    __cWid: 25,
    __cHei: 25,
    identifier: 'Wall_Tiles',
    uid: 102,
    relPath: '../game/pixel_crawler/tilesets/wall_tiles.png',
    pxWid: 400,
    pxHei: 400,
    tileGridSize: 16,
    spacing: 0,
    padding: 0,
    tags: [],
    customData: [],
    savedSelections: []
  },
  {
    __cWid: 25,
    __cHei: 25,
    identifier: 'Farm_Props',
    uid: 103,
    relPath: '../game/pixel_crawler/props/farm.png',
    pxWid: 400,
    pxHei: 400,
    tileGridSize: 16,
    spacing: 0,
    padding: 0,
    tags: [],
    customData: [],
    savedSelections: []
  },
  {
    __cWid: 25,
    __cHei: 27,
    identifier: 'Vegetation',
    uid: 104,
    relPath: '../game/pixel_crawler/props/vegetation.png',
    pxWid: 400,
    pxHei: 432,
    tileGridSize: 16,
    spacing: 0,
    padding: 0,
    tags: [],
    customData: [],
    savedSelections: []
  },
  {
    __cWid: 50,
    __cHei: 54,
    identifier: 'Furniture',
    uid: 105,
    relPath: '../game/pixel_crawler/props/furniture.png',
    pxWid: 800,
    pxHei: 864,
    tileGridSize: 16,
    spacing: 0,
    padding: 0,
    tags: [],
    customData: [],
    savedSelections: []
  }
];

// Simplify Layers:
// 1. Entities (Spawn, NPCs, Triggers)
// 2. Collisions (IntGrid 16px)
// 3. Decorations (Tiles 16px)
// 4. Ground (Tiles 16px)
ldtk.defs.layers = [
  {
    __type: 'Entities',
    identifier: 'Entities',
    type: 'Entities',
    uid: 201,
    gridSize: 16,
    guideGridWid: 0,
    guideGridHei: 0,
    displayOpacity: 1,
    inactiveOpac: 0.6,
    hideInList: false,
    hideFieldsWhenInactive: true,
    canSelectWhenInactive: true,
    renderInWorldView: true,
    pxOffsetX: 0,
    pxOffsetY: 0,
    parallaxFactorX: 0,
    parallaxFactorY: 0,
    parallaxScaling: true,
    requiredTags: [],
    excludedTags: [],
    intGridValues: [],
    autoRuleGroups: [],
    autoSourceLayerDefUid: null,
    tilesetDefUid: null,
    tilePivotX: 0,
    tilePivotY: 0
  },
  {
    __type: 'IntGrid',
    identifier: 'Collisions',
    type: 'IntGrid',
    uid: 202,
    gridSize: 16,
    guideGridWid: 0,
    guideGridHei: 0,
    displayOpacity: 0.7,
    inactiveOpac: 0.4,
    hideInList: false,
    hideFieldsWhenInactive: true,
    canSelectWhenInactive: true,
    renderInWorldView: true,
    pxOffsetX: 0,
    pxOffsetY: 0,
    parallaxFactorX: 0,
    parallaxFactorY: 0,
    parallaxScaling: true,
    requiredTags: [],
    excludedTags: [],
    intGridValues: [
      { value: 1, identifier: 'Obstacle', color: '#ff0055' }
    ],
    autoRuleGroups: [],
    autoSourceLayerDefUid: null,
    tilesetDefUid: null,
    tilePivotX: 0,
    tilePivotY: 0
  },
  {
    __type: 'Tiles',
    identifier: 'Decorations',
    type: 'Tiles',
    uid: 203,
    gridSize: 16,
    guideGridWid: 0,
    guideGridHei: 0,
    displayOpacity: 1,
    inactiveOpac: 0.6,
    hideInList: false,
    hideFieldsWhenInactive: true,
    canSelectWhenInactive: true,
    renderInWorldView: true,
    pxOffsetX: 0,
    pxOffsetY: 0,
    parallaxFactorX: 0,
    parallaxFactorY: 0,
    parallaxScaling: true,
    requiredTags: [],
    excludedTags: [],
    intGridValues: [],
    autoRuleGroups: [],
    autoSourceLayerDefUid: null,
    tilesetDefUid: 103, // Farm_Props default
    tilePivotX: 0,
    tilePivotY: 0
  },
  {
    __type: 'Tiles',
    identifier: 'Ground',
    type: 'Tiles',
    uid: 204,
    gridSize: 16,
    guideGridWid: 0,
    guideGridHei: 0,
    displayOpacity: 1,
    inactiveOpac: 0.6,
    hideInList: false,
    hideFieldsWhenInactive: true,
    canSelectWhenInactive: true,
    renderInWorldView: true,
    pxOffsetX: 0,
    pxOffsetY: 0,
    parallaxFactorX: 0,
    parallaxFactorY: 0,
    parallaxScaling: true,
    requiredTags: [],
    excludedTags: [],
    intGridValues: [],
    autoRuleGroups: [],
    autoSourceLayerDefUid: null,
    tilesetDefUid: 101, // Floors_Tiles default
    tilePivotX: 0,
    tilePivotY: 0
  }
];

// Configure Level 0
const level0 = {
  identifier: 'Kawasan_Agrowisata',
  iid: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
  uid: 301,
  worldX: 0,
  worldY: 0,
  worldDepth: 0,
  pxWid: 2048,
  pxHei: 1536,
  __bgColor: '#2f6834',
  bgColor: '#2f6834',
  useAutoIdentifier: false,
  bgRelPath: null,
  bgPos: null,
  bgPivotX: 0.5,
  bgPivotY: 0.5,
  __smartColor: '#2f6834',
  __bgPos: null,
  externalRelPath: null,
  fieldInstances: [],
  layerInstances: [
    {
      __identifier: 'Entities',
      __type: 'Entities',
      __cWid: 128,
      __cHei: 96,
      __gridSize: 16,
      __opacity: 1,
      __pxTotalOffsetX: 0,
      __pxTotalOffsetY: 0,
      __tilesetDefUid: null,
      __tilesetRelPath: null,
      iid: 'e1-iid',
      levelId: 301,
      layerDefUid: 201,
      pxOffsetX: 0,
      pxOffsetY: 0,
      visible: true,
      optionalRules: [],
      intGridCsv: [],
      autoLayerTiles: [],
      seed: 1234,
      overrideTilesetUid: null,
      gridTiles: [],
      entityInstances: []
    },
    {
      __identifier: 'Collisions',
      __type: 'IntGrid',
      __cWid: 128,
      __cHei: 96,
      __gridSize: 16,
      __opacity: 0.7,
      __pxTotalOffsetX: 0,
      __pxTotalOffsetY: 0,
      __tilesetDefUid: null,
      __tilesetRelPath: null,
      iid: 'c1-iid',
      levelId: 301,
      layerDefUid: 202,
      pxOffsetX: 0,
      pxOffsetY: 0,
      visible: true,
      optionalRules: [],
      intGridCsv: new Array(128 * 96).fill(0),
      autoLayerTiles: [],
      seed: 1234,
      overrideTilesetUid: null,
      gridTiles: [],
      entityInstances: []
    },
    {
      __identifier: 'Decorations',
      __type: 'Tiles',
      __cWid: 128,
      __cHei: 96,
      __gridSize: 16,
      __opacity: 1,
      __pxTotalOffsetX: 0,
      __pxTotalOffsetY: 0,
      __tilesetDefUid: 103,
      __tilesetRelPath: '../game/pixel_crawler/props/farm.png',
      iid: 'd1-iid',
      levelId: 301,
      layerDefUid: 203,
      pxOffsetX: 0,
      pxOffsetY: 0,
      visible: true,
      optionalRules: [],
      intGridCsv: [],
      autoLayerTiles: [],
      seed: 1234,
      overrideTilesetUid: null,
      gridTiles: [],
      entityInstances: []
    },
    {
      __identifier: 'Ground',
      __type: 'Tiles',
      __cWid: 128,
      __cHei: 96,
      __gridSize: 16,
      __opacity: 1,
      __pxTotalOffsetX: 0,
      __pxTotalOffsetY: 0,
      __tilesetDefUid: 101,
      __tilesetRelPath: '../game/pixel_crawler/tilesets/floors_tiles.png',
      iid: 'g1-iid',
      levelId: 301,
      layerDefUid: 204,
      pxOffsetX: 0,
      pxOffsetY: 0,
      visible: true,
      optionalRules: [],
      intGridCsv: [],
      autoLayerTiles: [],
      seed: 1234,
      overrideTilesetUid: null,
      gridTiles: [],
      entityInstances: []
    }
  ],
  __neighbours: []
};

ldtk.levels = [level0];
ldtk.worlds = [
  {
    identifier: 'World',
    iid: 'world-iid',
    levels: [level0],
    worldGridWidth: 2048,
    worldGridHeight: 1536,
    worldLayout: 'Free'
  }
];

const outTarget = path.join(process.cwd(), 'public/assets/maps/outskirts_project.ldtk');
fs.writeFileSync(outTarget, JSON.stringify(ldtk, null, 2), 'utf8');
console.log(`✓ LDtk project file generated at: ${outTarget}`);

