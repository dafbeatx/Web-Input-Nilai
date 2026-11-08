import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

async function generateAtlas() {
  const width = 2048;
  const height = 1536;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // preserve pixel art crispness

  console.log('1. Loading base textures and prop sprites...');
  const baseDir = path.join(process.cwd(), 'public/assets/game');
  const pcExtDir = path.join(baseDir, 'pixel_crawler/extracted');

  // Load existing seamless grass
  const grassImg = await loadImage(path.join(baseDir, 'tilesets/tile_grass.png'));

  // Load props
  const props = {};
  const propFiles = [
    'tree_oak_l', 'tree_oak_m', 'tree_pine_m', 'tree_pine_s',
    'farm_barn', 'farm_scarecrow', 'farm_crops', 'farm_haystack', 'farm_water_well', 'farm_crates', 'farm_barrel',
    'veg_bush_large', 'veg_bush_flowers', 'veg_shrub', 'veg_flowers',
    'rock_large', 'rock_mossy', 'furn_picnic_table',
    'station_workbench', 'station_cooking', 'station_furnace', 'station_alchemy', 'station_anvil'
  ];

  for (const name of propFiles) {
    const p = path.join(pcExtDir, `${name}.png`);
    if (fs.existsSync(p)) {
      props[name] = await loadImage(p);
    }
  }

  // -------------------------------------------------------------
  // STEP 1: BASE SEAMLESS GRASS GROUND
  // -------------------------------------------------------------
  console.log('2. Painting seamless lush grass terrain...');
  const grassPattern = ctx.createPattern(grassImg, 'repeat');
  ctx.fillStyle = grassPattern;
  ctx.fillRect(0, 0, width, height);

  // Helper: Draw soft drop shadow for props
  const drawShadow = (cx, cy, rx, ry) => {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Helper: Draw Prop with center bottom anchor
  const drawProp = (img, x, y, scale = 1, shadowRx = 0, shadowRy = 0) => {
    if (!img) return;
    const w = img.width * scale;
    const h = img.height * scale;
    if (shadowRx > 0 && shadowRy > 0) {
      drawShadow(x, y + 2, shadowRx * scale, shadowRy * scale);
    }
    ctx.drawImage(img, x - w / 2, y - h, w, h);
  };

  // -------------------------------------------------------------
  // STEP 2: ORGANIC COBBLESTONE & DIRT WALKWAY TRAILS
  // -------------------------------------------------------------
  console.log('3. Painting organic trails and walkways...');
  const paths = [
    // Main West to East trail
    [
      { x: 0, y: 768 },
      { x: 350, y: 768 },
      { x: 750, y: 768 },
      { x: 1050, y: 768 },
      { x: 1350, y: 730 },
      { x: 1550, y: 640 },
      { x: 1680, y: 560 }
    ],
    // North branch to Farm & Barn
    [
      { x: 880, y: 768 },
      { x: 880, y: 620 },
      { x: 920, y: 480 },
      { x: 950, y: 350 }
    ],
    // South-East branch to Scout Camp
    [
      { x: 1150, y: 768 },
      { x: 1300, y: 880 },
      { x: 1450, y: 1020 },
      { x: 1550, y: 1140 }
    ],
    // South-West branch to Lake Pier
    [
      { x: 620, y: 768 },
      { x: 640, y: 880 },
      { x: 660, y: 980 },
      { x: 680, y: 1060 }
    ]
  ];

  // Draw dirt outer fringe
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#c4a678';
  ctx.lineWidth = 80;
  for (const pts of paths) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }

  // Draw inner cobblestone core
  ctx.strokeStyle = '#9e896d';
  ctx.lineWidth = 56;
  for (const pts of paths) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }

  // Draw stepping stone dots along paths
  ctx.fillStyle = '#b3a085';
  for (const pts of paths) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const count = Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 28);
      for (let s = 0; s <= count; s++) {
        const t = s / count;
        const sx = p1.x + (p2.x - p1.x) * t + ((s % 3) - 1) * 8;
        const sy = p1.y + (p2.y - p1.y) * t + (((s + 1) % 3) - 1) * 8;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 7, 5, (s * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // West Gate Stone Apron
  ctx.save();
  ctx.fillStyle = '#8f7e68';
  ctx.beginPath();
  ctx.roundRect(0, 718, 140, 100, [0, 20, 20, 0]);
  ctx.fill();
  ctx.strokeStyle = '#6e5e4a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // -------------------------------------------------------------
  // STEP 3: KAWASAN TANI & KEBUN SAYUR ORGANIK P5
  // -------------------------------------------------------------
  console.log('4. Painting agricultural garden beds and barn...');
  const farmX = 520;
  const farmY = 170;
  const farmW = 660;
  const farmH = 460;

  // Farm boundary soil
  ctx.save();
  ctx.fillStyle = '#452b17';
  ctx.beginPath();
  ctx.roundRect(farmX, farmY, farmW, farmH, 24);
  ctx.fill();
  ctx.strokeStyle = '#6e4526';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Farm tilled planting beds (furrows)
  ctx.fillStyle = '#321f11';
  for (let by = farmY + 120; by < farmY + farmH - 40; by += 70) {
    for (let bx = farmX + 30; bx < farmX + 320; bx += 85) {
      ctx.beginPath();
      ctx.roundRect(bx, by, 70, 48, 8);
      ctx.fill();
    }
    for (let bx = farmX + 370; bx < farmX + farmW - 40; bx += 85) {
      ctx.beginPath();
      ctx.roundRect(bx, by, 70, 48, 8);
      ctx.fill();
    }
  }

  // Wooden fence posts along farm boundary
  ctx.fillStyle = '#855832';
  for (let fx = farmX; fx <= farmX + farmW; fx += 32) {
    if (fx >= 840 && fx <= 920) continue; // South farm gate
    ctx.fillRect(fx - 3, farmY - 6, 6, 12);
    ctx.fillRect(fx - 3, farmY + farmH - 6, 6, 12);
  }
  for (let fy = farmY; fy <= farmY + farmH; fy += 32) {
    ctx.fillRect(farmX - 6, fy - 3, 12, 6);
    ctx.fillRect(farmX + farmW - 6, fy - 3, 12, 6);
  }
  ctx.restore();

  // Farm Barn
  drawProp(props.farm_barn, 950, 260, 1.35, 60, 18);

  // Scarecrow
  drawProp(props.farm_scarecrow, 740, 440, 1.15, 14, 6);

  // Vegetable crops on beds
  const cropSpots = [
    { x: 585, y: 320 }, { x: 670, y: 320 }, { x: 755, y: 320 },
    { x: 585, y: 390 }, { x: 670, y: 390 },
    { x: 585, y: 460 }, { x: 670, y: 460 }, { x: 755, y: 460 },
    { x: 585, y: 530 }, { x: 670, y: 530 }, { x: 755, y: 530 },
    { x: 925, y: 460 }, { x: 1010, y: 460 }, { x: 1095, y: 460 },
    { x: 925, y: 530 }, { x: 1010, y: 530 }, { x: 1095, y: 530 },
  ];
  cropSpots.forEach(pt => drawProp(props.farm_crops, pt.x, pt.y, 1.05, 18, 6));

  // Farm structures & crates
  drawProp(props.farm_haystack, 1120, 275, 1.15, 20, 8);
  drawProp(props.farm_water_well, 1140, 360, 1.25, 14, 6);
  drawProp(props.farm_crates, 775, 255, 1.0, 16, 5);
  drawProp(props.farm_barrel, 815, 260, 1.0, 10, 5);
  drawProp(props.farm_crates, 1080, 395, 1.0, 16, 5);
  drawProp(props.farm_barrel, 1115, 410, 1.0, 10, 5);

  // -------------------------------------------------------------
  // STEP 4: DANAU KONSERVASI & DERMAGA IKAN NILA
  // -------------------------------------------------------------
  console.log('5. Painting natural conservation lake and pier...');
  const lakeCx = 680;
  const lakeCy = 1260;

  // Sandy shore border
  ctx.save();
  ctx.fillStyle = '#d6bc8b';
  ctx.beginPath();
  ctx.ellipse(lakeCx, lakeCy, 315, 195, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // Lake water gradient (rich clear aquatic shades)
  const waterGrad = ctx.createRadialGradient(lakeCx, lakeCy, 20, lakeCx, lakeCy, 290);
  waterGrad.addColorStop(0, '#0284c7');
  waterGrad.addColorStop(0.7, '#0369a1');
  waterGrad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.ellipse(lakeCx, lakeCy, 295, 175, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // Subtle water ripples
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  const ripples = [
    { x: 580, y: 1200, w: 30 }, { x: 740, y: 1210, w: 40 },
    { x: 650, y: 1280, w: 45 }, { x: 780, y: 1300, w: 35 },
    { x: 540, y: 1320, w: 30 }, { x: 710, y: 1350, w: 40 },
  ];
  for (const r of ripples) {
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.w, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Wooden Pier extending into lake
  const pierX = 640;
  const pierY = 1050;
  const pierW = 80;
  const pierH = 110;
  ctx.fillStyle = '#613b19'; // pilings shadow
  ctx.fillRect(pierX - 4, pierY, 6, pierH);
  ctx.fillRect(pierX + pierW - 2, pierY, 6, pierH);

  // Pier deck planks
  ctx.fillStyle = '#8f5b2d';
  ctx.fillRect(pierX, pierY, pierW, pierH);
  ctx.strokeStyle = '#523419';
  ctx.lineWidth = 2;
  for (let py = pierY; py <= pierY + pierH; py += 12) {
    ctx.beginPath();
    ctx.moveTo(pierX, py);
    ctx.lineTo(pierX + pierW, py);
    ctx.stroke();
  }
  ctx.restore();

  // Lake boulders & rocks
  drawProp(props.rock_large, 420, 1140, 1.25, 14, 6);
  drawProp(props.rock_mossy, 470, 1110, 1.2, 12, 5);
  drawProp(props.rock_large, 940, 1160, 1.25, 14, 6);
  drawProp(props.rock_mossy, 970, 1230, 1.2, 12, 5);
  drawProp(props.rock_large, 930, 1370, 1.25, 14, 6);
  drawProp(props.rock_large, 450, 1380, 1.25, 14, 6);
  drawProp(props.rock_mossy, 530, 1420, 1.2, 12, 5);
  drawProp(props.rock_large, 790, 1420, 1.25, 14, 6);

  // Picnic table by the pier
  drawProp(props.furn_picnic_table, 780, 1070, 1.15, 36, 12);

  // -------------------------------------------------------------
  // STEP 5: BALAI KRIYA & LABORATORIUM BIOFARMAKA
  // -------------------------------------------------------------
  console.log('6. Painting craftsman deck and laboratory...');
  const deckX = 1440;
  const deckY = 240;
  const deckW = 540;
  const deckH = 340;

  ctx.save();
  // Deck drop shadow
  drawShadow(deckX + deckW / 2, deckY + deckH + 8, deckW / 2 + 10, 16);

  // Polished timber wood deck
  ctx.fillStyle = '#8f5b2d';
  ctx.beginPath();
  ctx.roundRect(deckX, deckY, deckW, deckH, 16);
  ctx.fill();

  // Deck plank seams
  ctx.strokeStyle = '#613b19';
  ctx.lineWidth = 2;
  for (let dy = deckY; dy <= deckY + deckH; dy += 16) {
    ctx.beginPath();
    ctx.moveTo(deckX, dy);
    ctx.lineTo(deckX + deckW, dy);
    ctx.stroke();
  }
  ctx.strokeRect(deckX, deckY, deckW, deckH);
  ctx.restore();

  // Workshop Workstations
  drawProp(props.station_alchemy, 1540, 360, 1.25, 26, 8);
  drawProp(props.station_workbench, 1710, 360, 1.25, 26, 8);
  drawProp(props.station_furnace, 1870, 340, 1.25, 26, 8);
  drawProp(props.station_anvil, 1870, 430, 1.25, 18, 6);
  drawProp(props.furn_picnic_table, 1630, 490, 1.15, 36, 12);

  // -------------------------------------------------------------
  // STEP 6: BUMI PERKEMAHAN PRAMUKA & SENTRA KULINER
  // -------------------------------------------------------------
  console.log('7. Painting scout camp and culinary center...');
  const campCx = 1580;
  const campCy = 1150;

  // Packed dirt camp clearing
  ctx.save();
  ctx.fillStyle = '#8f7756';
  ctx.beginPath();
  ctx.ellipse(campCx, campCy, 300, 210, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6e5a3e';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Campfire stone circle & charred logs base
  ctx.fillStyle = '#423b32';
  ctx.beginPath();
  ctx.ellipse(1550, 1165, 34, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2620';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Picnic tables & benches around fire
  drawProp(props.furn_picnic_table, 1420, 1160, 1.15, 36, 12);
  drawProp(props.furn_picnic_table, 1680, 1160, 1.15, 36, 12);

  // Dapur Alam Tradisional (Cooking station)
  drawProp(props.station_cooking, 1800, 1140, 1.25, 32, 10);
  drawProp(props.farm_barrel, 1870, 1165, 1.0, 10, 5);
  drawProp(props.farm_crates, 1895, 1160, 1.0, 16, 5);

  // -------------------------------------------------------------
  // STEP 7: NATURAL FOREST PERIMETER & GROVES
  // -------------------------------------------------------------
  console.log('8. Planting lush perimeter trees and vegetation...');

  // North Perimeter Forest
  for (let tx = 40; tx < width; tx += 95) {
    const isOak = (tx % 190 === 0);
    const tree = isOak ? props.tree_oak_l : props.tree_pine_m;
    drawProp(tree, tx, 100 + ((tx * 3) % 40), 1.05, 20, 7);
  }

  // South Perimeter Forest
  for (let tx = 40; tx < width; tx += 95) {
    const isOak = (tx % 190 === 0);
    const tree = isOak ? props.tree_oak_l : props.tree_pine_m;
    drawProp(tree, tx, height - 10 - ((tx * 5) % 40), 1.05, 20, 7);
  }

  // East Perimeter Forest
  for (let ty = 80; ty < height - 60; ty += 110) {
    const isOak = (ty % 220 === 0);
    const tree = isOak ? props.tree_oak_l : props.tree_pine_m;
    drawProp(tree, width - 40 - ((ty * 2) % 35), ty, 1.05, 20, 7);
  }

  // West Perimeter Forest (leaving y: 680..860 clear for Gate)
  for (let ty = 80; ty < height - 60; ty += 110) {
    if (ty >= 660 && ty <= 880) continue;
    const isOak = (ty % 220 === 0);
    const tree = isOak ? props.tree_oak_l : props.tree_pine_m;
    drawProp(tree, 40 + ((ty * 3) % 35), ty, 1.05, 20, 7);
  }

  // Gateway flanking landmark trees
  drawProp(props.tree_oak_l, 60, 690, 1.15, 24, 8);
  drawProp(props.tree_oak_l, 60, 850, 1.15, 24, 8);

  // Interior natural tree groves
  const interiorTrees = [
    { x: 380, y: 440, type: props.tree_oak_m },
    { x: 360, y: 580, type: props.tree_pine_s },
    { x: 1380, y: 420, type: props.tree_pine_m },
    { x: 1390, y: 560, type: props.tree_oak_m },
    { x: 1100, y: 1040, type: props.tree_pine_m },
    { x: 1100, y: 1190, type: props.tree_oak_m },
    { x: 1100, y: 1340, type: props.tree_pine_s },
    { x: 1250, y: 1100, type: props.tree_oak_l },
    { x: 1250, y: 1260, type: props.tree_pine_m },
  ];
  for (const t of interiorTrees) {
    drawProp(t.type, t.x, t.y, 1.05, 20, 7);
  }

  // Bushes and flowers along paths and nature spots
  const bushes = [
    { x: 260, y: 730, img: props.veg_bush_large },
    { x: 420, y: 730, img: props.veg_bush_flowers },
    { x: 1080, y: 730, img: props.veg_bush_flowers },
    { x: 1220, y: 730, img: props.veg_bush_large },
    { x: 280, y: 810, img: props.veg_shrub },
    { x: 440, y: 810, img: props.veg_flowers },
    { x: 1100, y: 810, img: props.veg_shrub },
    { x: 1240, y: 810, img: props.veg_flowers },
    { x: 490, y: 220, img: props.veg_bush_flowers },
    { x: 1190, y: 220, img: props.veg_bush_large },
    { x: 1410, y: 1060, img: props.veg_bush_large },
    { x: 1690, y: 1060, img: props.veg_bush_flowers },
    { x: 1490, y: 1290, img: props.veg_shrub },
    { x: 1630, y: 1290, img: props.veg_flowers },
  ];
  for (const b of bushes) {
    drawProp(b.img, b.x, b.y, 1.0, 12, 4);
  }

  // -------------------------------------------------------------
  // SAVE OUTPUT ATLAS
  // -------------------------------------------------------------
  console.log('9. Encoding PNG output...');
  const outPath = path.join(process.cwd(), 'public/assets/game/pixel_crawler/outskirts_atlas.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ outskirts_atlas.png successfully generated (${(buffer.length / 1024 / 1024).toFixed(2)} MB)!`);
}

generateAtlas().catch(err => {
  console.error('Error generating atlas:', err);
  process.exit(1);
});

